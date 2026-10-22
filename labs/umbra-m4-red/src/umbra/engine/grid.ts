// M4b · 格子层原语（v1.4 提案）：探索 Q 版棋盘的演出也走 recipe + Director。
// 宿主（流程层）把棋盘注册成 eng.board（BoardAdapter），原语只通过它读写棋盘节点；规则结果在演出前已提交（§3.1-1）。
// 每个原语的 end() 都把画面落到「规则最终状态」（跳过/强制推进/正常结束一致），临时节点放 rc.temps 由 Director 清场（§0.8）。
import { Container, Graphics, Sprite, Text } from 'pixi.js';
import type { Track } from '../skins/_contract';
import type { RunCtx } from './prims';
import type { Clip } from './timeline';
import { ease } from './timeline';

export type Cell = [number, number];
export interface BoardProp { kind: 'chest' | 'hidden' | 'gate'; node: Container; ok?: boolean }
export interface BoardAdapter {
  board: Container;                 // 整个棋盘（gridShake 抖它）
  fx: Container;                    // 棋盘坐标系的特效层（在小人之上）
  unit(ref: string, payload: any): Container | null;   // '$actor' 主角；'$target' 敌人（payload.enemyId / foeId）
  followers(): Container[];
  cellPos(c: Cell): { x: number; y: number };
  z(c: Cell): number;
  prop(payload: any): BoardProp | null;
  /** 第 i 步开始：巡逻阴影走到该步快照（ms 内补间） */
  foesStep?(i: number, ms: number, payload: any): void;
  /** 落到规则最终状态（主角/同伴/阴影位置、视线锥） */
  settle(payload: any): void;
  /** explore:scan 显示段：转 HUD 覆盖层，ms 后自动撤（不阻塞） */
  scanShow(ms: number): void;
}
type Prim = (t: Track, rc: RunCtx) => Clip | Clip[] | null;
const A = (t: Track) => t.args as any;
const tmp = <T extends Container>(rc: RunCtx, c: T) => { rc.temps.add(c); return c; };
const B = (rc: RunCtx) => (rc.eng as any).board as BoardAdapter | null;

/** explore:move / explore:sneak：主角沿 payload.path 逐格小跳，同伴沿 payload.trails 跟随；整条路径占满 dur（Director 按格数伸缩） */
export const gridWalk: Prim = (t, rc) => {
  const b = B(rc); const p = rc.payload ?? {}; const path: Cell[] = p.path ?? [];
  if (!b || !path.length) return null;
  const a = A(t), dur = Math.max(1, t.dur ?? 220), n = path.length, per = dur / n, hop = a.hop ?? 10, fhop = a.followHop ?? 6;
  const lead = b.unit('$actor', p); const fol = b.followers(); const trails: Cell[][] = p.trails ?? [];
  let seg = -1; let from = { x: 0, y: 0 }; let fFrom: { x: number; y: number }[] = [];
  const startSeg = (i: number) => {
    seg = i; if (!lead) return;
    from = { x: lead.x, y: lead.y }; fFrom = fol.map((s) => ({ x: s.x, y: s.y }));
    const to = b.cellPos(path[i]); const sx = Math.abs(lead.scale.x); lead.scale.x = to.x < from.x ? -sx : sx;
    (lead as any).zIndex = b.z(path[i]) + 9;
    fol.forEach((s, j) => { const c = trails[i]?.[j]; if (c) (s as any).zIndex = b.z(c) + 8; });
    b.foesStep?.(i, Math.min(180, per), p);
  };
  return { t0: t.at, dur,
    tick(pp) {
      const ms = pp * dur; const i = Math.max(0, Math.min(n - 1, Math.floor(ms / per) || 0)); if (i !== seg) startSeg(i);
      if (!lead) return; const k = Math.min(1, (ms - i * per) / per); const to = b.cellPos(path[i]);
      lead.position.set(from.x + (to.x - from.x) * k, from.y + (to.y - from.y) * k - Math.sin(k * Math.PI) * hop);
      fol.forEach((s, j) => { const c = trails[i]?.[j]; const tg = c ? b.cellPos(c) : from; const tx = tg.x + (j - 1) * 10; s.position.set(fFrom[j].x + (tx - fFrom[j].x) * k, fFrom[j].y + (tg.y - fFrom[j].y) * k - Math.sin(k * Math.PI) * fhop); });
    },
    end() { b.settle(p); } };
};

/** 头顶/格子标记：bang「！」、cover 蓝色掩体标、ring 扩散圈、cell 落点格、star 星标 */
export const gridMark: Prim = (t, rc) => {
  const b = B(rc); if (!b) return null;
  const a = A(t), p = rc.payload ?? {}, dur = t.dur ?? 300, kind = a.kind ?? 'ring';
  const col = rc.eng.color(a.color ?? '#e5191c'); const size = a.size ?? 1;
  let node: Container;
  if (kind === 'bang') { const tx = new Text({ text: a.text ?? '!', style: { fontFamily: rc.eng.font('@font.display'), fontSize: 96 * size, fill: col, stroke: { color: 0xffffff, width: 8 } } }); tx.anchor.set(0.5, 1); node = tx; }
  else if (kind === 'cover') node = new Graphics().poly([-14, 0, 0, -14, 14, 0, 0, 8]).fill(col).stroke({ color: 0xffffff, width: 2 });
  else if (kind === 'star') node = new Graphics().star(0, 0, 5, 26 * size, 11 * size).fill(col).stroke({ color: 0x0a0a0a, width: 3 });
  else node = new Graphics();
  tmp(rc, node); node.visible = false; b.fx.addChild(node);
  const anchor = () => {
    if (kind === 'cell' && p.cell) return b.cellPos(p.cell);
    const u = b.unit(a.at ?? '$actor', p); return u ? { x: u.x, y: u.y } : { x: 640, y: 360 };
  };
  let o = { x: 0, y: 0 };
  const lift = a.lift ?? (kind === 'bang' ? 120 : kind === 'cover' ? 150 : kind === 'star' ? 110 : 0);
  return { t0: t.at, dur, tag: kind === 'bang' ? undefined : undefined,
    begin() { o = anchor(); node.visible = true; node.position.set(o.x, o.y - lift); },
    tick(pp) {
      if (kind === 'bang') { node.scale.set(pp < 0.25 ? 0.4 + pp * 4 : 1.4 - (pp - 0.25) * 0.5); }
      else if (kind === 'cover' || kind === 'star') { node.alpha = 1 - pp * 0.3; node.y = o.y - lift - pp * (a.rise ?? 12); node.rotation = kind === 'star' ? pp * 2 : 0; }
      else if (kind === 'ring') { const g = node as Graphics; g.clear().circle(0, -30, 20 + pp * (a.radius ?? 120)).stroke({ color: col, width: 8 * (1 - pp) + 2, alpha: 1 - pp }); }
      else if (kind === 'cell') { const g = node as Graphics; g.clear().poly([0, -26, 53, 0, 0, 26, -53, 0]).fill({ color: col, alpha: 0.5 * (1 - pp) }).stroke({ color: 0xffffff, width: 3, alpha: 1 - pp }); node.position.set(o.x, o.y); }
    },
    end() { node.destroy(); rc.temps.delete(node); } };
};

/** 小人挤压/放大（下蹲贴掩体、遭遇时敌人放大） */
export const gridSquash: Prim = (t, rc) => {
  const b = B(rc); if (!b) return null;
  const a = A(t), dur = t.dur ?? 280; let u: Container | null = null; let sx = 1, sy = 1;
  return { t0: t.at, dur, ease: ease[t.ease ?? 'linear'],
    begin() { u = b.unit(a.at ?? '$actor', rc.payload); if (u) { sx = u.scale.x; sy = u.scale.y; } },
    tick(p) { if (!u) return; const s = Math.sin(p * Math.PI); if (a.grow) { const k = 1 + a.grow * p; u.scale.set(sx * k, sy * k); } else u.scale.y = sy * (1 - (a.amp ?? 0.18) * s); },
    end() { if (u) u.scale.set(sx, sy); } };
};

/** 棋盘道具：宝箱开盖 / 隐藏墙下沉（ok=false 抖动）/ 铁栅升起。end 落到最终状态 */
export const gridProp: Prim = (t, rc) => {
  const b = B(rc); if (!b) return null;
  const dur = t.dur ?? 380; let pr: BoardProp | null = null; let y0 = 0;
  const apply = (k: number) => {
    if (!pr) return; const n = pr.node;
    if (pr.kind === 'chest') { const lid = n.getChildByLabel('lid'); if (lid) { lid.y = -k * 26; lid.rotation = -k * 0.5; } n.scale.set(1 + Math.sin(k * Math.PI) * 0.15); }
    else if (pr.kind === 'hidden') { if (pr.ok) { n.alpha = 1 - k; n.y = y0 + k * 20; } else n.x = Math.sin(k * 30) * 4 * (1 - k); }
    else if (pr.kind === 'gate') { n.y = y0 - k * 90; n.alpha = 1 - k * 0.85; }
  };
  return { t0: t.at, dur,
    begin() { pr = b.prop(rc.payload); if (pr) y0 = pr.node.y; },
    tick(p) { apply(p); },
    end() { apply(1); if (pr) { if (pr.kind === 'chest') pr.node.scale.set(1); if (pr.kind === 'hidden') { pr.node.x = 0; if (pr.ok) pr.node.visible = false; } } } };
};

/** 棋盘抖动（探索层没有 world 震屏） */
export const gridShake: Prim = (t, rc) => {
  const b = B(rc); if (!b) return null;
  const a = A(t), dur = t.dur ?? 400, px = (a.px ?? 8) * (rc.level === 'minimal' ? 0.5 : 1);
  return { t0: t.at, dur, tick(p) { b.board.x = Math.sin(p * 40) * px * (1 - p); }, end() { b.board.x = 0; } };
};

/** explore:scan 起效段：扩散扫描环；end → 显示段交给 HUD 覆盖层（不阻塞，2s 自动撤） */
export const gridScan: Prim = (t, rc) => {
  const b = B(rc); if (!b) return null;
  const a = A(t), dur = t.dur ?? 380, col = rc.eng.color(a.color ?? '#e5191c');
  const g = tmp(rc, new Graphics()); g.visible = false; b.fx.addChild(g); let o = { x: 640, y: 360 };
  return { t0: t.at, dur,
    begin() { const u = b.unit('$actor', rc.payload); if (u) o = { x: u.x, y: u.y - 50 }; g.visible = true; },
    tick(p) { g.clear().circle(o.x, o.y, 40 + p * (a.radius ?? 900)).stroke({ color: col, width: 10 * (1 - p) + 2, alpha: 1 - p }); },
    end() { g.destroy(); rc.temps.delete(g); b.scanShow(a.show ?? 2000); } };
};

/** 通用素材精灵：asset 支持 {payload 字段} 与 $actor 替换；from → to 补间，末段 out 毫秒淡出 */
export const sprite: Prim = (t, rc) => {
  const a = A(t), dur = t.dur ?? 600, eng = rc.eng;
  const id = String(a.asset ?? '').replace(/\{(\w+)\}/g, (_, k) => String(rc.payload?.[k] ?? ''));
  const tex = eng.frame(id, rc.payload); if (!tex) { eng.errors.push(`sprite: asset ${id} missing → skipped`); return null; }
  const s = tmp(rc, new Sprite(tex)); s.anchor.set(...((a.anchor ?? [0.5, 0.5]) as [number, number])); s.visible = false;
  const base = a.height ? a.height / tex.height : a.width ? a.width / tex.width : 1;
  if (a.tint) s.tint = eng.color(a.tint);
  const L = (eng.st.layers as any)[t.layer ?? 'cutin'] as Container; L.addChild(s);
  const f = { x: 640, y: 360, scale: 1, rot: 0, alpha: 1, ...(a.from ?? {}) }, to = { ...f, ...(a.to ?? {}) }, out = a.out ?? 0;
  const e = ease[t.ease ?? 'outCubic'];
  return { t0: t.at, dur,
    begin() { s.visible = true; },
    tick(p) {
      const ms = p * dur, k = e(Math.min(1, ms / Math.max(1, a.moveMs ?? dur)));
      s.position.set(f.x + (to.x - f.x) * k, f.y + (to.y - f.y) * k); s.scale.set(base * (f.scale + (to.scale - f.scale) * k)); s.rotation = f.rot + (to.rot - f.rot) * k;
      s.alpha = (f.alpha + (to.alpha - f.alpha) * k) * (out ? Math.min(1, (dur - ms) / out) : 1);
    },
    end() { s.destroy(); rc.temps.delete(s); } };
};

export const GRID_PRIMS = { gridWalk, gridMark, gridSquash, gridProp, gridShake, gridScan, sprite };
