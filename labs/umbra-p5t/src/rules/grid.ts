// 网格工具：可走格、寻路、视线、掩体判定、三角判定
import type { CoverLevel, MapDef, TileKind, Vec } from './types';

export const DIRS: Vec[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

export const key = (p: Vec) => `${p.x},${p.y}`;
export const eq = (a: Vec, b: Vec) => a.x === b.x && a.y === b.y;
export const manhattan = (a: Vec, b: Vec) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

export class Grid {
  constructor(public readonly map: Pick<MapDef, 'width' | 'height' | 'tiles'>) {}

  inBounds(p: Vec) {
    return p.x >= 0 && p.y >= 0 && p.x < this.map.width && p.y < this.map.height;
  }
  tile(p: Vec): TileKind {
    return this.inBounds(p) ? this.map.tiles[p.y][p.x] : 'wall';
  }
  walkable(p: Vec) {
    const t = this.tile(p);
    return t === 'floor' || t === 'exit';
  }
  coverAt(p: Vec): CoverLevel {
    const t = this.tile(p);
    return t === 'full' ? 2 : t === 'half' ? 1 : 0;
  }

  /**
   * 目标 target 相对攻击者 from 的掩体等级。
   * 目标四邻有掩体格 C，且攻击者位于掩体那一侧（沿 C-target 方向至少 1 格），即受掩护；
   * 绕到侧面/背后（包抄）则无掩护。取最高等级。
   */
  coverAgainst(target: Vec, from: Vec): CoverLevel {
    let best: CoverLevel = 0;
    for (const d of DIRS) {
      const c = { x: target.x + d.x, y: target.y + d.y };
      const lv = this.coverAt(c);
      if (!lv) continue;
      const dot = (from.x - target.x) * d.x + (from.y - target.y) * d.y;
      if (dot >= 1 && lv > best) best = lv as CoverLevel;
    }
    return best;
  }

  /** 目标紧贴的全掩体是否正对攻击者（是则枪击完全落空） */
  fullCoverFacing(target: Vec, from: Vec): boolean {
    for (const d of DIRS) {
      const c = { x: target.x + d.x, y: target.y + d.y };
      if (this.coverAt(c) !== 2) continue;
      if ((from.x - target.x) * d.x + (from.y - target.y) * d.y >= 1) return true;
    }
    return false;
  }

  /** 单位是否紧贴任一掩体（不论方向）——用于 AI 估分与 UI 盾牌图标 */
  hasAnyCover(p: Vec): CoverLevel {
    let best: CoverLevel = 0;
    for (const d of DIRS) {
      const lv = this.coverAt({ x: p.x + d.x, y: p.y + d.y });
      if (lv > best) best = lv as CoverLevel;
    }
    return best;
  }

  /**
   * 视线：取两格中心连线经过的格（supercover）。墙挡；全掩体除非紧贴任一端（探身射击）也挡。
   * 半掩体不挡视线。
   */
  lineOfSight(a: Vec, b: Vec): boolean {
    for (const c of supercover(a, b)) {
      if (eq(c, a) || eq(c, b)) continue;
      const t = this.tile(c);
      if (t === 'wall') return false;
      if (t === 'full' && manhattan(c, a) > 1 && manhattan(c, b) > 1) return false;
    }
    return true;
  }

  /**
   * BFS 可达格。blocked = 不能经过的格（敌方单位），occupied = 不能停留的格（所有单位）。
   * 返回 key → {pos, dist, prev}
   */
  reachable(start: Vec, move: number, blocked: Set<string>, occupied: Set<string>) {
    const out = new Map<string, { pos: Vec; dist: number; prev: string | null }>();
    out.set(key(start), { pos: start, dist: 0, prev: null });
    const q: Vec[] = [start];
    while (q.length) {
      const cur = q.shift()!;
      const cd = out.get(key(cur))!.dist;
      if (cd >= move) continue;
      for (const d of DIRS) {
        const n = { x: cur.x + d.x, y: cur.y + d.y };
        const k = key(n);
        if (out.has(k) || !this.walkable(n) || blocked.has(k)) continue;
        out.set(k, { pos: n, dist: cd + 1, prev: key(cur) });
        q.push(n);
      }
    }
    // 不能停在有人的格（起点除外）
    for (const [k] of out) if (k !== key(start) && occupied.has(k)) out.get(k)!.dist = -1;
    return out;
  }

  /** 无步数上限的路径距离（AI 用），不可达返回 Infinity */
  pathDistance(a: Vec, b: Vec, blocked: Set<string>): number {
    const r = this.reachable(a, 999, blocked, new Set());
    // 终点可能被单位占据：取其四邻最小 +1
    const direct = r.get(key(b));
    if (direct) return direct.dist;
    let best = Infinity;
    for (const d of DIRS) {
      const n = r.get(key({ x: b.x + d.x, y: b.y + d.y }));
      if (n && n.dist >= 0) best = Math.min(best, n.dist + 1);
    }
    return best;
  }
}

export function pathTo(reach: Map<string, { pos: Vec; prev: string | null }>, dest: Vec): Vec[] {
  const path: Vec[] = [];
  let k: string | null = key(dest);
  while (k) {
    const n = reach.get(k);
    if (!n) return [];
    path.unshift(n.pos);
    k = n.prev;
  }
  return path;
}

/** 两格中心连线经过的所有格（含两端），对角穿角时两边格都算 */
export function supercover(a: Vec, b: Vec): Vec[] {
  const out: Vec[] = [];
  const dx = b.x - a.x, dy = b.y - a.y;
  const steps = Math.max(Math.abs(dx), Math.abs(dy)) * 4 || 1;
  const seen = new Set<string>();
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const fx = a.x + dx * t, fy = a.y + dy * t;
    // 恰好落在格边界上时两侧都算（保守）
    const xs = Math.abs(fx - Math.round(fx) - 0.5) < 1e-9 || Math.abs(fx - Math.round(fx) + 0.5) < 1e-9 ? [Math.floor(fx), Math.ceil(fx)] : [Math.round(fx)];
    const ys = Math.abs(fy - Math.round(fy) - 0.5) < 1e-9 || Math.abs(fy - Math.round(fy) + 0.5) < 1e-9 ? [Math.floor(fy), Math.ceil(fy)] : [Math.round(fy)];
    for (const x of xs) for (const y of ys) {
      const k = `${x},${y}`;
      if (!seen.has(k)) { seen.add(k); out.push({ x, y }); }
    }
  }
  return out;
}

/** 点是否在三角形内（含边）；三点共线视为无三角 */
export function pointInTriangle(p: Vec, a: Vec, b: Vec, c: Vec): boolean {
  const area = (b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y);
  if (area === 0) return false;
  const s1 = (b.x - a.x) * (p.y - a.y) - (p.x - a.x) * (b.y - a.y);
  const s2 = (c.x - b.x) * (p.y - b.y) - (p.x - b.x) * (c.y - b.y);
  const s3 = (a.x - c.x) * (p.y - c.y) - (p.x - c.x) * (a.y - c.y);
  const hasNeg = s1 < 0 || s2 < 0 || s3 < 0;
  const hasPos = s1 > 0 || s2 > 0 || s3 > 0;
  return !(hasNeg && hasPos);
}
