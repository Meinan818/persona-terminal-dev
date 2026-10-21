// M3 第五阶段原语：camera（伪 3D 镜头推拉摇滚，图层视差）、holdupRing（HOLD UP 环绕镜头 + 队员包围构图）。
import { Container, Sprite, Texture } from 'pixi.js';
import type { Track } from '../skins/_contract';
import type { RunCtx } from './prims';
import { vec } from './prims';
import { Clip, ease } from './timeline';
import type { CamKey } from './camera';
import { HOLD_SPOTS } from './hud';

type Prim = (t: Track, rc: RunCtx) => Clip | Clip[] | null;
const A = (t: Track) => t.args as any;
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));

function sampleKeys(keys: CamKey[], p: number) {
  const o = { x: 0, y: 0, zoom: 0, rot: 0 };
  if (!keys.length) return o;
  let i = 0; while (i < keys.length - 1 && keys[i + 1].at <= p) i++;
  const a = keys[i], b = keys[Math.min(i + 1, keys.length - 1)];
  const span = b.at - a.at, k0 = span > 0 ? clamp((p - a.at) / span) : 1;
  const k = (ease as any)[b.ease ?? 'inOutCubic']?.(k0) ?? k0;
  for (const n of ['x', 'y', 'zoom', 'rot'] as const) o[n] = (a[n] ?? 0) + ((b[n] ?? 0) - (a[n] ?? 0)) * k;
  return o;
}

/** 镜头：keys[{at:0..1, x, y, zoom, rot, ease}]，focus 为推拉中心（默认 $target）。结束后镜头自动回落到待机环绕。 */
export const camera: Prim = (t, rc) => {
  const a = A(t), eng = rc.eng, dur = t.dur ?? 600, keys: CamKey[] = a.keys ?? [];
  let on = false, foc = { x: 640, y: 400 };
  return { t0: t.at, dur, ease: ease.linear,
    begin() { on = true; eng.cam.active++; foc = a.focus === '$enemies' ? enemyCenter(rc) : vec(typeof a.focus === 'string' ? { x: a.focus, y: a.focus } : a.focus, rc, '$target'); },
    tick(p) {
      const o = sampleKeys(keys, p); const c = eng.cam;
      c.ov.x = o.x; c.ov.y = o.y; c.ov.zoom = o.zoom; c.ov.rot = o.rot;
      const f = p < 0.02 && !a.snapFocus ? 0.35 : 1;
      c.focus.x += (foc.x - c.focus.x) * f; c.focus.y += (foc.y - c.focus.y) * f;
    },
    end() { if (on) { eng.cam.active = Math.max(0, eng.cam.active - 1); on = false; } } };
};

function enemyCenter(rc: RunCtx) {
  const ids: string[] = rc.payload?.enemyIds ?? rc.payload?.targetIds ?? [];
  const es = ids.map((i) => rc.eng.units.get(i)!).filter(Boolean);
  if (!es.length) return { x: 520, y: 470 };
  return { x: es.reduce((s, u) => s + u.home.x, 0) / es.length, y: es.reduce((s, u) => s + u.home.y, 0) / es.length - 60 };
}

/** HOLD UP：队员从四方跃入包围倒地敌群，镜头绕敌群转 ~70° 后停在包围构图（终点与 HUD 包围站位一致，交接无跳变）。
 *  每人：官方全身图（本色）+ 黑色投影 + 敌方向红色轮廓光；后排压暗、缩小、排在敌人身后。 */
export const holdupRing: Prim = (t, rc) => {
  const a = A(t), eng = rc.eng, dur = Math.min(1000, t.dur ?? 900);
  const ids: string[] = (rc.payload?.partyIds ?? [...eng.units.values()].filter((u) => u.side === 'ally').map((u) => u.id)).slice(0, 4);
  const ids2: string[] = rc.payload?.enemyIds ?? [];
  const es = ids2.map((i) => eng.units.get(i)!).filter(Boolean);
  const cx = es.length ? es.reduce((s, u) => s + u.home.x, 0) / es.length : 520, cy = es.length ? es.reduce((s, u) => s + u.home.y, 0) / es.length : 520;
  const span = es.length ? Math.max(...es.map((u) => u.home.x)) - Math.min(...es.map((u) => u.home.x)) : 0;
  const spread = Math.max(1, (span / 2 + 170) / 300);
  const spots = HOLD_SPOTS;   // 与 hud.setHoldRing 一致
  const RX = 330 * spread, RY = 110, YC = 50;
  const partyTop = (eng.skin.slots as any)['hud.party'].rect[1] - 10;          // 包围椭圆（地面透视）
  const orbit = a.orbit ?? 1.2;
  const L = eng.st.layers.enemy;
  const mem: { c: Container; u: number; v: number; sc: number; d: number }[] = [];
  let wasSort = false;
  return { t0: t.at, dur, ease: ease.linear,
    begin() {
      wasSort = L.sortableChildren; L.sortableChildren = true;
      ids.forEach((id, i) => {
        const tex = eng.frames[`char.${id}#body`]; if (!tex || tex === Texture.WHITE) return;
        const [dx, dy, sc] = spots[i % 4];
        const c = new Container(); rc.temps.add(c);
        const sh = new Sprite(tex); sh.anchor.set(0.5, 1); sh.tint = 0x0a0a0a; sh.position.set(7, 4);
        const rim = new Sprite(tex); rim.anchor.set(0.5, 1); rim.tint = 0xff1a2a; rim.blendMode = 'add'; rim.position.set(dx < 0 ? 4 : -4, -2); rim.alpha = 0.9;
        const s = new Sprite(tex); s.anchor.set(0.5, 1); s.label = 'body';
        c.addChild(sh, rim, s); c.scale.set((dx < 0 ? 1 : -1) * sc, sc); c.visible = false; L.addChild(c);
        mem.push({ c, u: (dx * spread) / RX, v: (dy - YC) / RY, sc, d: i * 0.07 });
      });
    },
    tick(p) {
      const k = ease.outCubic(clamp(p / 0.85)), ph = orbit * (1 - k);
      for (const uu of eng.units.values()) if (uu.side === 'ally') uu.root.alpha = 1 - clamp(p / 0.25);   // 场上背影让位给包围队员
      for (const m of mem) {
        const cs = Math.cos(ph), sn = Math.sin(ph);
        const u = m.u * cs - m.v * sn, v = m.u * sn + m.v * cs;   // 椭圆空间旋转 = 镜头绕敌群
        const kin = ease.outBack(clamp((p - m.d) / 0.28));
        const depth = 1 + 0.22 * (v - m.v);
        m.c.visible = p >= m.d;
        m.c.position.set(cx + u * RX, Math.min(cy + YC + v * RY, partyTop) - 260 * (1 - kin));
        const face = u < 0 ? 1 : -1;
        m.c.scale.set(face * m.sc * depth * (0.85 + 0.15 * kin), m.sc * depth * (1.1 - 0.1 * kin));
        m.c.zIndex = v > -0.05 ? 50 + v * 10 : -50 + v * 10;
        const dim = v < -0.05 ? 0.62 : 1, g = Math.round(255 * dim);
        (m.c.getChildByLabel('body') as Sprite).tint = (g << 16) | (g << 8) | g;
        m.c.alpha = 1 - clamp((p - 0.9) / 0.1);
      }
    },
    end() { mem.forEach((m) => { m.c.destroy({ children: true }); rc.temps.delete(m.c); }); mem.length = 0; L.sortableChildren = wasSort; for (const uu of eng.units.values()) if (uu.side === 'ally') uu.root.alpha = 1; } };
};
