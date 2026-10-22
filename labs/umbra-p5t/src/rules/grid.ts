// 网格工具：高低差、Dash 连接（梯子/跳台）、可走格、寻路、视线、掩体判定、三角判定
import type { CoverLevel, DashLink, MapDef, TileKind, Vec } from './types';

export const DIRS: Vec[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

export const key = (p: Vec) => `${p.x},${p.y}`;
export const eq = (a: Vec, b: Vec) => a.x === b.x && a.y === b.y;
export const manhattan = (a: Vec, b: Vec) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
export const add = (a: Vec, b: Vec, k = 1): Vec => ({ x: a.x + b.x * k, y: a.y + b.y * k });

export interface ReachNode { pos: Vec; dist: number; prev: string | null; dash: boolean; path?: Vec[]; dashed?: boolean }

export class Grid {
  /** 由 Battle 注入：物件（木箱/油桶）提供的掩体 */
  coverHook: ((p: Vec) => CoverLevel) | null = null;
  readonly links: DashLink[];
  /** 机关造成的动态地形（关着的门 = 墙） */
  tileOverride = new Map<string, TileKind>();
  /** 机关造成的动态高度（升降台） */
  heightOverride = new Map<string, number>();

  constructor(public readonly map: Pick<MapDef, 'width' | 'height' | 'tiles' | 'heights' | 'links'>) {
    this.links = map.links ?? [];
  }

  inBounds(p: Vec) {
    return p.x >= 0 && p.y >= 0 && p.x < this.map.width && p.y < this.map.height;
  }
  tile(p: Vec): TileKind {
    if (!this.inBounds(p)) return 'wall';
    return this.tileOverride.get(key(p)) ?? this.map.tiles[p.y][p.x];
  }
  /** 地面高度（层） */
  h(p: Vec): number {
    if (!this.inBounds(p)) return 0;
    return this.heightOverride.get(key(p)) ?? this.map.heights?.[p.y]?.[p.x] ?? 0;
  }
  walkable(p: Vec) {
    const t = this.tile(p);
    return t === 'floor' || t === 'exit';
  }
  coverAt(p: Vec): CoverLevel {
    if (!this.inBounds(p)) return 0; // 地图边界不算掩体
    const t = this.tile(p);
    // Cogito AAA104「躲在墙或障碍物后」：墙按全掩体（高大物体）算
    const base: CoverLevel = t === 'full' || t === 'wall' ? 2 : t === 'half' ? 1 : 0;
    const extra = this.coverHook?.(p) ?? 0;
    return (base > extra ? base : extra) as CoverLevel;
  }
  /** 掩体格对站在 p 的单位是否有效：掩体须与单位同层（高台边缘的低处掩体不算） */
  private coverFor(p: Vec, c: Vec): CoverLevel {
    if (!this.inBounds(c)) return 0;
    // 高台侧壁：紧贴比自己高的地形 = 贴墙（全掩体）
    if (this.h(c) > this.h(p)) return 2;
    const lv = this.coverAt(c);
    if (!lv) return 0;
    return this.h(c) === this.h(p) ? lv : 0;
  }

  /**
   * 梯子与跳台的区别（Samurai Gamers Stage Elements）：梯子「在高台下方，爬上去够到高处的敌人」= 连接不同高度；
   * Dash 格（跳台）「从一个高处跳到另一个高处」= 连接两处都高于地面的格（高度可以相同），中间可隔空。
   * 升降台改变高度后，不再满足条件的连接暂时不能用。
   */
  linkUsable(l: DashLink) {
    const ha = this.h(l.a), hb = this.h(l.b);
    return l.kind === 'ladder' ? ha !== hb : ha > 0 && hb > 0;
  }
  /** 两格之间的 Dash 连接 */
  linkBetween(a: Vec, b: Vec): DashLink | undefined {
    return this.links.find((l) => (eq(l.a, a) && eq(l.b, b)) || (eq(l.a, b) && eq(l.b, a)));
  }
  /** 从 p 出发的相邻步（同层相邻格 + Dash 连接） */
  neighbors(p: Vec, allowDash = true): { pos: Vec; dash: boolean }[] {
    const out: { pos: Vec; dash: boolean }[] = [];
    for (const d of DIRS) {
      const n = add(p, d);
      if (this.walkable(n) && this.h(n) === this.h(p)) out.push({ pos: n, dash: false });
    }
    if (allowDash) for (const l of this.links) {
      const other = eq(l.a, p) ? l.b : eq(l.b, p) ? l.a : null;
      if (!other || !this.walkable(other) || !this.linkUsable(l)) continue;
      out.push({ pos: other, dash: true });
    }
    return out;
  }

  /**
   * 目标 target 相对攻击者 from 的掩体等级（directional 模式用）。
   * 目标四邻有掩体格 C，且攻击者位于掩体那一侧，即受掩护。
   */
  coverAgainst(target: Vec, from: Vec): CoverLevel {
    let best: CoverLevel = 0;
    for (const d of DIRS) {
      const lv = this.coverFor(target, add(target, d));
      if (!lv) continue;
      const dot = (from.x - target.x) * d.x + (from.y - target.y) * d.y;
      if (dot >= 1 && lv > best) best = lv as CoverLevel;
    }
    return best;
  }

  /**
   * 全掩体挡枪：Cogito AAA104「躲在大型物体后，来自正面和侧面的远程攻击全部被挡、不受伤」。
   * 只有从背面（攻击者在掩体的反方向一侧）打才不挡。
   */
  fullCoverBlocks(target: Vec, from: Vec): boolean {
    if (eq(target, from)) return false;
    for (const d of DIRS) {
      if (this.coverFor(target, add(target, d)) !== 2) continue;
      if ((from.x - target.x) * d.x + (from.y - target.y) * d.y >= 0) return true;
    }
    return false;
  }
  /** 兼容旧名 */
  fullCoverFacing(target: Vec, from: Vec): boolean {
    return this.fullCoverBlocks(target, from);
  }

  /** 单位是否紧贴任一（同层）掩体（不论方向） */
  hasAnyCover(p: Vec): CoverLevel {
    let best: CoverLevel = 0;
    for (const d of DIRS) {
      const lv = this.coverFor(p, add(p, d));
      if (lv > best) best = lv as CoverLevel;
    }
    return best;
  }

  /**
   * 视线：取两格中心连线经过的格（supercover）。墙挡；全掩体除非紧贴任一端（探身射击）也挡；
   * 比两端都高的地形（高台侧壁）挡。半掩体不挡视线。
   */
  lineOfSight(a: Vec, b: Vec): boolean {
    const top = Math.max(this.h(a), this.h(b));
    for (const c of supercover(a, b)) {
      if (eq(c, a) || eq(c, b)) continue;
      const t = this.tile(c);
      if (t === 'wall') return false;
      if (this.h(c) > top) return false;
      if (t === 'full' && this.h(c) >= top && manhattan(c, a) > 1 && manhattan(c, b) > 1) return false;
    }
    return true;
  }

  /**
   * BFS 可达格（含高低差与 Dash）。blocked = 不能经过的格（敌方单位），occupied = 不能停留的格（所有单位）。
   * Dash（梯子/跳台）：原作 Dash 后本次移动结束——Pathway to the Ball「无限移动直到使用 Dash」、
   * Stop & Go「Dash 后移动 +1」（ibunroku / Samurai Gamers 技能表）→ Dash 之后只能再走 afterDash 格；一次移动只能 Dash 一次。
   */
  reachable(start: Vec, move: number, blocked: Set<string>, occupied: Set<string>, allowDash = true, afterDash = 0) {
    type S = { pos: Vec; dist: number; dashed: boolean; left: number; path: Vec[] };
    const best = new Map<string, S>();
    const seen = new Set<string>();
    const q: S[] = [{ pos: start, dist: 0, dashed: false, left: move, path: [start] }];
    seen.add(key(start) + '|0');
    while (q.length) {
      const cur = q.shift()!;
      const k = key(cur.pos);
      const b = best.get(k);
      if (!b || cur.dist < b.dist) best.set(k, cur);
      if (cur.left <= 0) continue;
      for (const n of this.neighbors(cur.pos, allowDash && !cur.dashed)) {
        const nk = key(n.pos);
        if (blocked.has(nk)) continue;
        const dashed = cur.dashed || n.dash;
        const left = n.dash ? Math.min(cur.left - 1, afterDash) : cur.left - 1;
        const sk = nk + (dashed ? '|1' : '|0');
        if (seen.has(sk)) continue;
        seen.add(sk);
        q.push({ pos: n.pos, dist: cur.dist + 1, dashed, left, path: [...cur.path, n.pos] });
      }
    }
    const out = new Map<string, ReachNode>();
    for (const [k, st] of best) {
      const prev = st.path.length > 1 ? key(st.path[st.path.length - 2]) : null;
      out.set(k, { pos: st.pos, dist: st.dist, prev, dash: st.dashed, dashed: st.dashed, path: st.path });
    }
    for (const [k, n] of out) if (k !== key(start) && occupied.has(k)) n.dist = -1;
    return out;
  }

  /** 无步数上限的路径距离（AI 用），不可达返回 Infinity */
  pathDistance(a: Vec, b: Vec, blocked: Set<string>, allowDash = true): number {
    const r = this.reachable(a, 999, blocked, new Set(), allowDash, 999);
    const direct = r.get(key(b));
    if (direct) return direct.dist;
    let best = Infinity;
    for (const d of DIRS) {
      const n = r.get(key(add(b, d)));
      if (n && n.dist >= 0) best = Math.min(best, n.dist + 1);
    }
    return best;
  }
}

export function pathTo(reach: Map<string, { pos: Vec; prev: string | null; path?: Vec[] }>, dest: Vec): Vec[] {
  const direct = reach.get(key(dest));
  if (direct?.path) return direct.path.map((p) => ({ ...p }));
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
