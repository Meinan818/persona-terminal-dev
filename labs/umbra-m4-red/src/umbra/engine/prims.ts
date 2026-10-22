// §1 演出原语的引擎实现。每个原语把一条 Track 编译成 Clip（begin/tick/end），end 负责清场。
import { Container, Graphics, Sprite, Text, Texture } from 'pixi.js';
import type { EventName, Track, Vec, HitResult } from '../skins/_contract';
import type { Engine } from './core';
import { Clip, ease } from './timeline';
import { ransom, txt, plate } from './text';
import { setDownPose, UnitNode } from './units';
import { DW, DH } from './stage';
import { summon, personaShow, nameplate, pose, skinFilter, batonPass, showtimeLogo } from './summon';
import { blockPush, tvStatic, glassShatter, cardFlip, cardShatter, dateFlip, eyeStrip, onomatopoeia, checkerFloor, ringSplash } from './prims2';
import { comicPanels, duoEntrance, duoStrike, duoTitle, maskRip } from './p4';
import { camera, holdupRing } from './p5';
import { GRID_PRIMS } from './grid';

export interface RunCtx {
  eng: Engine; owner: number; ev: EventName; payload: any; level: 'full' | 'standard' | 'minimal';
  temps: Set<Container>; hitIdx: number; dropText: () => boolean; finishCard?: Container;
  touched: Set<UnitNode>;
}
type Prim = (t: Track, rc: RunCtx) => Clip | Clip[] | null;

const BLEED = { x: -1400, y: -900, w: DW + 2800, h: DH + 1800 };
const R = () => Math.random();
const A = (t: Track) => t.args as any;
const tmp = (rc: RunCtx, c: Container) => { rc.temps.add(c); return c; };

// ------------------------------------------------------------------ refs
function targetIds(rc: RunCtx): string[] {
  const p = rc.payload ?? {};
  return p.targetIds ?? p.unitIds ?? p.enemyIds ?? (p.hits ? [...new Set((p.hits as HitResult[]).map((h) => h.targetId))] : []);
}
function unitsOf(ref: unknown, rc: RunCtx): UnitNode[] {
  const U = rc.eng.units;
  if (ref === '$actor') { const u = U.get(rc.payload?.actorId); return u ? [u] : []; }
  if (ref === '$target') { const u = U.get(targetIds(rc)[0]); return u ? [u] : []; }
  if (ref === '$targets') return targetIds(rc).map((i) => U.get(i)!).filter(Boolean);
  if (ref === '$party') return [...U.values()].filter((u) => u.side === 'ally');
  return [];
}
export function vec(v: Vec | undefined, rc: RunCtx, def: string = '$target'): { x: number; y: number } {
  const vv: Vec = v ?? { x: def as any, y: def as any };
  const one = (r: number | string, axis: 'x' | 'y'): number => {
    if (typeof r === 'number') return r;
    if (r === '$screen') return axis === 'x' ? rc.eng.st.vis.l : DH / 2;
    if (r === '$center') return axis === 'x' ? DW / 2 : DH / 2;
    const u = unitsOf(r, rc)[0];
    if (u) return axis === 'x' ? u.root.x : u.root.y + u.hitY;
    if (typeof r === 'string' && r.startsWith('#')) { const n = rc.eng.fix.get(r.slice(1)); if (n) return axis === 'x' ? n.x : n.y; }
    return axis === 'x' ? DW / 2 : DH / 2;
  };
  return { x: one(vv.x as any, 'x') + (vv.dx ?? 0), y: one(vv.y as any, 'y') + (vv.dy ?? 0) };
}
function hitsFor(rc: RunCtx): HitResult[] { return (rc.payload?.hits ?? []) as HitResult[]; }
const layerOf = (t: Track, rc: RunCtx, def: string) => (rc.eng.st.layers as any)[t.layer ?? def] as Container;
const isText = (rc: RunCtx) => rc.dropText();

// ------------------------------------------------------------------ basics
const tween: Prim = (t, rc) => {
  const a = A(t); let nodes: Container[] = []; const from: any[] = [];
  const resolve = () => {
    if (typeof a.target === 'string' && a.target.startsWith('#layer.')) return [(rc.eng.st.layers as any)[a.target.slice(7)]];
    if (typeof a.target === 'string' && a.target.startsWith('#')) { const n = rc.eng.fix.get(a.target.slice(1)); return n ? [n] : []; }
    const us = unitsOf(a.target, rc); us.forEach((u) => rc.touched.add(u)); return us.map((u) => u.root);
  };
  return { t0: t.at, dur: t.dur ?? 0, ease: ease[t.ease ?? 'linear'],
    begin() { nodes = resolve(); nodes.forEach((n) => from.push({ x: n.x, y: n.y, s: n.scale.x, r: n.rotation, a: n.alpha })); },
    tick(p) {
      nodes.forEach((n, i) => {
        const f = from[i], to = a.to ?? {}; const u = [...rc.eng.units.values()].find((q) => q.root === n);
        const tx = to.x === 'home' ? u?.home.x ?? f.x : to.x, ty = to.y === 'home' ? u?.home.y ?? f.y : to.y;
        if (tx !== undefined) n.x = f.x + (tx - f.x) * p;
        if (ty !== undefined) n.y = f.y + (ty - f.y) * p;
        if (to.scale !== undefined) n.scale.set(f.s + (to.scale - f.s) * p);
        if (to.rotation !== undefined) n.rotation = f.r + (to.rotation - f.r) * p;
        if (to.alpha !== undefined) n.alpha = f.a + (to.alpha - f.a) * p;
      });
    },
    end() { if (a.target === '#layer.allout' || a.target === '#layer.cutin') nodes.forEach((n) => (n.alpha = 1)); } };
};
const showHide = (vis: boolean): Prim => (t, rc) => ({ t0: t.at, dur: 0, begin() { const a = A(t); const n = rc.eng.fix.get(String(a.target).replace('#', '')); if (n) n.visible = vis; } });
const sfx: Prim = (t, rc) => ({ t0: t.at, dur: 0, begin() { const id = String(A(t).id); rc.eng.sfxLog.push(id); rc.eng.audio.play(id); } });
const vibrate: Prim = (t) => ({ t0: t.at, dur: 0, begin() { try { navigator.vibrate?.(Math.min(40, A(t).ms ?? 20)); } catch { /* */ } } });

const dim: Prim = (t, rc) => {
  const a = A(t), L = layerOf(t, rc, 'fx');
  const g = tmp(rc, new Graphics().rect(BLEED.x, BLEED.y, BLEED.w, BLEED.h).fill(rc.eng.color(a.color ?? '#000'))) as Graphics;
  g.visible = false; L.addChild(g); const max = Math.min(0.7, a.alpha ?? 0.5), dur = t.dur ?? 200;
  const fin = Math.min(120, dur * 0.3), fout = a.hold ? 0 : Math.min(160, dur * 0.3);
  return { t0: t.at, dur, begin() { g.visible = true; g.alpha = 0; },
    tick(p) { const ms = p * dur; g.alpha = max * Math.min(1, ms / Math.max(1, fin), fout ? (dur - ms) / fout : 1); },
    end() { g.destroy(); rc.temps.delete(g); } };
};

const title: Prim = (t, rc) => {
  const a = A(t); if (isText(rc)) return null;
  // M4b：文案可带 {payload 字段}（如 BOSS 名按遭遇），label 查不到的 {key} 按 payload 替换
  const text = rc.eng.label(a.text).replace(/\{(\w+)\}/g, (_: string, k: string) => String(rc.payload?.[k] ?? ''));
  const c = tmp(rc, ransom(text, a.size ?? 96, rc.eng.font(a.font ?? '@font.display'), { invert: a.invert ?? [0], seed: text.length * 13 }));
  const b = c.getLocalBounds(); c.pivot.set(b.x + b.width / 2, b.y + b.height / 2);
  const L = layerOf(t, rc, 'cutin'); L.addChild(c); c.visible = false; const pos = vec(a.pos, rc, '$center'); const dur = t.dur ?? 600;
  return { t0: t.at, dur, tag: 'text',
    begin() { c.visible = true; c.position.set(pos.x, pos.y); c.rotation = a.rot ?? -0.1; },
    tick(p) { const ms = p * dur; const k = Math.min(1, ms / 140); c.scale.set(1.7 - 0.7 * ease.outBack(k)); c.alpha = Math.min(1, ms / 60, (dur - ms) / 120); c.x = pos.x + (1 - ease.outCubic(k)) * 260; },
    end() { c.destroy({ children: true }); rc.temps.delete(c); } };
};

const radialBurst: Prim = (t, rc) => {
  const a = A(t), n = Math.min(24, a.rays ?? 18) * (rc.eng.tier === 'low' ? 0.5 : 1);
  const cols = (a.colors ?? ['#fff']).map((c: string) => rc.eng.color(c));
  const g = tmp(rc, new Graphics()) as Graphics;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2, a1 = a0 + (Math.PI * 2 / n) * 0.42;
    g.poly([0, 0, Math.cos(a0) * 1800, Math.sin(a0) * 1800, Math.cos(a1) * 1800, Math.sin(a1) * 1800]).fill({ color: cols[i % cols.length], alpha: a.alpha ?? 0.5 });
  }
  const L = layerOf(t, rc, 'allout'); L.addChild(g); g.visible = false; const c = vec(a.center, rc, '$target'); const dur = t.dur ?? 1000;
  return { t0: t.at, dur, begin() { g.visible = true; g.position.set(c.x, c.y); },
    tick(p) { const ms = p * dur; g.rotation = rc.level === 'minimal' ? 0 : p * (a.spin ?? 0.6); g.alpha = Math.min(1, ms / 150, (dur - ms) / 200); },
    end() { g.destroy(); rc.temps.delete(g); } };
};

// ------------------------------------------------------------------ impact
const hitStop: Prim = (t, rc) => ({ t0: t.at, dur: 0, begin() { const ms = A(t).ms ?? 70; rc.eng.fx.hitStop(rc.level === 'minimal' ? 30 : Math.max(30, Math.min(90, ms))); } });
const shake: Prim = (t, rc) => ({ t0: t.at, dur: 0, begin() { rc.eng.fx.shake((A(t).px ?? 12) * (rc.level === 'minimal' ? 0.5 : 1)); } });
const flashSprite: Prim = (t, rc) => {
  let us: UnitNode[] = []; const ms = Math.min(60, A(t).ms ?? 50);
  return { t0: t.at, dur: ms, begin() { us = unitsOf(A(t).target ?? '$targets', rc); us.forEach((u) => (u.mesh.filters = [rc.eng.whiteFlash])); },
    end() { us.forEach((u) => (u.mesh.filters = null as any)); } };
};
const flashScreen: Prim = (t, rc) => ({ t0: t.at, dur: 0, begin() { const a = A(t); const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches; rc.eng.fx.flashScreen(rc.eng.color(a.color ?? '#fff'), reduce ? Math.min(0.4, a.alpha ?? 0.8) : (a.alpha ?? 0.8), t.dur ?? 160); } });
const squashHit: Prim = (t, rc) => {
  const a = A(t), sq = Math.min(0.22, a.squash ?? 0.2), push = a.push ?? 20, rec = Math.min(320, a.recoverMs ?? 320); let us: UnitNode[] = [];
  return { t0: t.at, dur: 50 + rec,
    begin() { us = unitsOf(a.target ?? '$targets', rc); us.forEach((u) => rc.touched.add(u)); },
    tick(p) {
      const ms = p * (50 + rec);
      for (const u of us) {
        if (ms < 50) { const k = ms / 50; u.hit.scale.set(1 + sq * 0.9 * k, 1 - sq * k); u.hit.x = push * k * (u.side === 'enemy' ? -1 : 1) * -1; }
        else { const k = (ms - 50) / rec, e = ease.outElastic(k); u.hit.scale.set(1 + sq * 0.9 * (1 - e), 1 - sq * (1 - e)); u.hit.x = -push * (1 - k) * (u.side === 'enemy' ? -1 : 1); }
      }
    },
    end() { us.forEach((u) => { u.hit.scale.set(1); u.hit.x = 0; }); } };
};
const particles: Prim = (t, rc) => {
  const a = A(t);
  return { t0: t.at, dur: 0, begin() {
    const k = rc.eng.tierK * (rc.level === 'minimal' ? 0.5 : 1);
    const at = vec(a.at, rc, '$target');
    rc.eng.ps.emit((a.count ?? 40) * k, at.x, at.y, { speed: a.speed, spread: a.spread, dir: a.dir, life: Math.min(900, a.life ?? 700), size: a.size,
      gravity: a.gravity, frames: a.frames, colors: a.colors?.map((c: string) => rc.eng.color(c)), drag: a.drag, grow: a.grow, owner: rc.owner, jitter: a.jitter });
  } };
};
const afterimage: Prim = (t, rc) => {
  const a = A(t), n = rc.level === 'minimal' ? 1 : Math.min(3, a.n ?? 3), dur = t.dur ?? 240;
  let u: UnitNode | undefined; const ghosts: Sprite[] = []; let from = { x: 0, y: 0, s: 1 }, to = { x: 0, y: 0 };
  return { t0: t.at, dur, ease: ease[t.ease ?? 'inCubic'],
    begin() {
      u = unitsOf(a.actor ?? '$actor', rc)[0]; if (!u) return; rc.touched.add(u);
      from = { x: u.root.x, y: u.root.y, s: u.root.scale.x }; to = vec(a.to, rc, '$target'); to.y = a.to?.y === '$target' ? (unitsOf('$target', rc)[0]?.root.y ?? to.y) + (a.to?.dy ?? 0) : to.y;
      const tints = (a.tints ?? ['#fff', '@color.primary', '#fff']).map((c: string) => rc.eng.color(c));
      for (let i = 0; i < n; i++) {
        const g = tmp(rc, new Sprite(u.tex)) as Sprite; g.anchor.set(0.5, 1); g.scale.set(u.s * u.facing, u.s); g.tint = tints[i % tints.length]; g.alpha = 0;
        rc.eng.st.layers.fx.addChildAt(g, 0); ghosts.push(g);
      }
    },
    tick(p) {
      if (!u) return; const sTo = a.scaleTo ?? from.s;
      u.root.position.set(from.x + (to.x - from.x) * p, from.y + (to.y - from.y) * p); u.root.scale.set(from.s + (sTo - from.s) * p);
      ghosts.forEach((g, i) => { const q = Math.max(0, p - 0.14 * (i + 1)); g.position.set(from.x + (to.x - from.x) * q, from.y + (to.y - from.y) * q); g.scale.set(u!.s * u!.facing * (from.s + (sTo - from.s) * q), u!.s * (from.s + (sTo - from.s) * q)); g.alpha = p < 1 ? 0.55 - i * 0.14 : 0; });
    },
    end() { ghosts.forEach((g) => { g.destroy(); rc.temps.delete(g); }); } };
};
const slashLine: Prim = (t, rc) => {
  const a = A(t), len = a.len ?? 700, w = a.width ?? 14, dur = t.dur ?? 160;
  const g = tmp(rc, new Graphics().poly([-len / 2, -w / 2, len / 2, -1, len / 2, 1, -len / 2, w / 2]).fill(0x0a0a0a).poly([-len / 2 + 20, -w / 4, len / 2 - 10, -0.5, len / 2 - 10, 0.5, -len / 2 + 20, w / 4]).fill(0xffffff)) as Graphics;
  const L = layerOf(t, rc, 'allout'); L.addChild(g); g.visible = false;
  return { t0: t.at, dur, begin() { const p = vec(a.pos, rc, '$target'); g.position.set(p.x + (R() - 0.5) * (a.jitter ?? 140), p.y + (R() - 0.5) * (a.jitter ?? 140)); g.rotation = a.rot ?? R() * Math.PI; g.visible = true; },
    tick(p) { g.scale.set(Math.min(1, p * 3), 1); g.alpha = p < 0.5 ? 1 : (1 - p) * 2; },
    end() { g.destroy(); rc.temps.delete(g); } };
};

function inkSplat(r: number, seed: number) {
  const g = new Graphics(); const pts: number[] = []; let s = seed;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  for (let i = 0; i < 18; i++) { const an = (i / 18) * Math.PI * 2, rr = r * (i % 2 ? 0.62 + rnd() * 0.25 : 0.95 + rnd() * 0.5); pts.push(Math.cos(an) * rr * 1.5, Math.sin(an) * rr * 0.75); }
  g.poly(pts).fill(0x0a0a0a);
  for (let i = 0; i < 5; i++) { const an = rnd() * 6.28, d = r * (1.4 + rnd() * 0.6); g.circle(Math.cos(an) * d * 1.4, Math.sin(an) * d * 0.7, 4 + rnd() * 9).fill(0x0a0a0a); }
  return g;
}
const damageNumber: Prim = (t, rc) => {
  const a = A(t); const all = hitsFor(rc); const dur = Math.min(1100, t.dur ?? (a.big ? 1000 : 650));
  const idx = a.hit === 'all' ? null : (typeof a.hit === 'number' ? a.hit : rc.hitIdx++);
  const hs = idx === null ? all : all.length ? [all[idx % all.length]] : [];
  const items: { c: Container; x: number; y: number }[] = [];
  return { t0: t.at, dur,
    begin() {
      for (const h of hs) {
        const u = rc.eng.units.get(h.targetId); if (!u) continue;
        const big = !!a.big, s = big ? 1 : 0.62;
        const c = tmp(rc, new Container());
        const label = h.miss ? 'MISS' : String(h.dmg);
        const num = txt(label, 92 * s, { font: rc.eng.font('@font.number'), fill: a.heal ? 0x37e15a : 0xffffff, stroke: { color: 0x0a0a0a, width: 10 * s, join: 'round' }, fontStyle: 'italic' });
        num.anchor.set(0.5);
        const sp = inkSplat(46 * s + label.length * 9 * s, h.dmg + 3);
        if (!a.heal && (h.weak || h.crit)) { const red = inkSplat(40 * s + label.length * 8 * s, h.dmg + 9); red.tint = 0xe5191c; red.scale.set(1.15); red.position.set(10, 6); c.addChild(red); }
        c.addChild(sp, num);
        const x = u.root.x + (a.dx ?? 70) + (R() - 0.5) * (big ? 30 : 160), y = u.root.y + u.hitY - (a.dy ?? 40) - R() * (big ? 20 : 120);
        c.position.set(x, y); c.rotation = -0.14; rc.eng.st.layers.dmg.addChild(c); items.push({ c, x, y });
      }
    },
    tick(p) {
      const ms = p * dur;
      for (const it of items) {
        const k = Math.min(1, ms / 110); it.c.scale.set(0.3 + 0.7 * ease.outBack(k) + (ms < 110 ? 0.2 * (1 - k) : 0));
        it.c.y = it.y - ms * 0.03; it.c.alpha = p > 0.78 ? (1 - p) / 0.22 : 1;
      }
    },
    end() { items.forEach((it) => { it.c.destroy({ children: true }); rc.temps.delete(it.c); }); } };
};
const TAG_STYLE: Record<string, [number, number]> = { WEAK: [0xe5191c, 0xffffff], CRIT: [0xffffff, 0xe5191c], RESIST: [0x2a2a2a, 0xffffff], MISS: [0x2a2a2a, 0xffffff], NULL: [0x2a2a2a, 0xffffff], REPEL: [0x1f3fbf, 0xffffff], DOWN: [0x0a0a0a, 0xffe14a] };
const tag: Prim = (t, rc) => {
  if (isText(rc)) return null;
  const a = A(t); const dur = Math.min(920, t.dur ?? 900); const items: Container[] = [];
  return { t0: t.at, dur, tag: 'text',
    begin() {
      const hs = hitsFor(rc);
      const list = a.kind === 'auto' || !a.kind ? hs.map((h) => [h, h.weak ? 'WEAK' : h.crit ? 'CRIT' : h.miss ? 'MISS' : h.resist === 'resist' ? 'RESIST' : h.resist === 'null' ? 'NULL' : h.resist === 'repel' ? 'REPEL' : ''] as const)
        : (a.unit ? unitsOf(a.unit, rc).map((u) => [{ targetId: u.id } as any, a.kind]) : hs.filter((h) => a.kind !== 'WEAK' || h.weak).map((h) => [h, a.kind] as const));
      const seen = new Set<string>();
      for (const [h, kind] of list) {
        if (!kind || seen.has(h.targetId + kind)) continue; seen.add(h.targetId + kind);
        const u = rc.eng.units.get(h.targetId); if (!u) continue;
        const [bg, fg] = TAG_STYLE[kind] ?? TAG_STYLE.WEAK;
        const word = rc.eng.label('tag.' + kind);
        const c = tmp(rc, new Container());
        const tx = txt(word, 54, { font: rc.eng.font('@font.display'), fill: fg, stroke: { color: 0x0a0a0a, width: 6, join: 'round' } }); tx.anchor.set(0.5);
        const w = tx.width + 40;
        const pl = plate(w, 70, { fill: bg, stroke: 0x0a0a0a, sw: 5, skew: 16, shadow: 0x0a0a0a }); pl.position.set(-w / 2, -35);
        c.addChild(pl, tx);
        const pos = a.pos ? vec(a.pos, rc) : { x: u.root.x - 120, y: u.root.y + u.headY + 10 };
        c.position.set(pos.x, pos.y); c.rotation = -0.16; rc.eng.st.layers.dmg.addChild(c); items.push(c);
      }
    },
    tick(p) { const ms = p * dur; items.forEach((c) => { const k = Math.min(1, ms / 160); c.scale.set(0.2 + 0.8 * ease.outBack(k)); c.alpha = ms > dur - 200 ? (dur - ms) / 200 : 1; }); },
    end() { items.forEach((c) => { c.destroy({ children: true }); rc.temps.delete(c); }); } };
};
const shockwave: Prim = (t, rc) => ({ t0: t.at, dur: 0, begin() { const a = A(t); const c = vec(a.center, rc, '$target'); rc.eng.fx.shockwave(c.x, c.y, a.amp ?? 40, t.dur ?? 520, rc.owner); } });
const rgbSplit: Prim = (t, rc) => ({ t0: t.at, dur: 0, begin() { rc.eng.fx.rgbSplit(A(t).offset ?? 8, t.dur ?? 120, rc.owner); } });

// ------------------------------------------------------------------ cut-in / banner / all-out
function torn(y0: number, y1: number, x0: number, x1: number, step: number, amp: number, seed: number) {
  let s = seed; const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const top: number[] = [], bot: number[] = [];
  for (let x = x0; x <= x1; x += step) { top.push(x, y0 + (rnd() - 0.5) * amp); }
  for (let x = x1; x >= x0; x -= step) { bot.push(x, y1 + (rnd() - 0.5) * amp); }
  return [...top, ...bot];
}
function buildCutin(eng: Engine, art: Texture) {
  const c = new Container();
  const band = new Container();
  const outer = torn(-150, 150, -1400, 1400, 46, 26, 11), inner = torn(-118, 118, -1400, 1400, 38, 18, 5);
  const back = new Graphics().poly(torn(-182, 182, -1400, 1400, 60, 40, 3)).fill(0xe5191c).poly(outer).fill(0xffffff);
  const black = new Graphics().poly(torn(-136, 136, -1400, 1400, 42, 20, 8)).fill(0x0a0a0a);
  const mask = new Graphics().poly(inner).fill(0xffffff);
  const content = new Container();
  const halftone = new Graphics(); for (let x = -1400; x < 1400; x += 22) for (let y = -130; y < 130; y += 22) halftone.circle(x + ((y / 22) % 2) * 11, y, 3.2).fill({ color: 0xe5191c, alpha: 0.5 });
  const lines = new Container();
  for (let L = 0; L < 2; L++) {
    const g = new Graphics();
    for (let i = 0; i < 46; i++) { const y = -130 + R() * 260, x = R() * 2800 - 1400, len = 140 + R() * 520, th = 2 + R() * 7; g.poly([x, y - th / 2, x + len, y - 0.5, x + len, y + 0.5, x, y + th / 2]).fill({ color: i % 5 === 0 ? 0x0a0a0a : 0xffffff, alpha: 0.4 + R() * 0.5 }); }
    g.label = 'speed' + L; lines.addChild(g);
  }
  const spr = new Sprite(art); spr.anchor.set(0.5); spr.scale.set(1.08); spr.label = 'art';
  content.addChild(halftone, spr, lines); content.mask = mask;
  band.addChild(back, black, content, mask); band.label = 'band';
  const name = new Container(); name.label = 'name';
  c.addChild(band, name);
  return c;
}
const cutin: Prim = (t, rc) => {
  const a = A(t), eng = rc.eng, dur = Math.min(560, t.dur ?? 560);
  const panel = (a.panels ?? [])[0] ?? {}; const artId = eng.resolve(panel.art ?? 'char.$actor#cutin', rc.payload);
  const cdir = panel.enterFrom === 'right' ? -1 : 1; const art = eng.frames[artId] ?? eng.tex[artId]; if (!art) { eng.errors.push('cutin art missing ' + artId); return null; }
  const c = eng.getFix('cutin:' + artId, () => buildCutin(eng, art), eng.st.layers.cutin);
  const band = c.getChildByLabel('band') as Container, nm = c.getChildByLabel('name') as Container;
  const lines = (band.children[2] as Container).children[2] as Container; const spr = (band.children[2] as Container).children[1] as Sprite;
  const sl = (a.speedLines?.count ?? 46) / 46 * eng.tierK; lines.children.forEach((g: any, i: number) => (g.visible = i === 0 || sl > 0.7));
  return { t0: t.at, dur, ease: ease.linear,
    begin() {
      rc.temps.add(c); c.visible = true; c.parent?.addChild(c); band.rotation = a.bandAngle ?? -0.14; band.position.set(640 - cdir * 2140, a.y ?? 330); band.scale.set(1, 0.2);
      nm.removeChildren().forEach((x) => x.destroy({ children: true }));
      if (a.nameplate) {
        const label = eng.label(a.nameplate.text);
        const tx = txt(label, 46, { font: eng.font(a.nameplate.font ?? '@font.display'), fill: 0xffffff }); tx.anchor.set(0, 0.5); tx.position.set(64, 0);
        const ico = new Graphics().circle(30, 0, 20).fill(eng.color(a.nameplate.color ?? '#7a2bd6')).stroke({ color: 0xffffff, width: 3 });
        const pl = plate(tx.width + 100, 66, { fill: 0x0a0a0a, stroke: 0xffffff, sw: 3, skew: 14, shadow: 0xe5191c }); pl.position.set(0, -33);
        nm.addChild(pl, ico, tx);
        nm.position.set(52, 78); nm.rotation = -0.05; nm.alpha = 0;
      }
    },
    tick(p) {
      const ms = p * dur;
      const kin = Math.min(1, ms / 150), kout = Math.max(0, (ms - (dur - 120)) / 120);
      band.x = 640 + cdir * (-2140 * (1 - ease.outCubic(kin)) + 1800 * ease.inCubic(kout));
      band.scale.y = 0.2 + 0.8 * ease.outBack(Math.min(1, ms / 120)) - 0.8 * kout;
      spr.x = 140 - 180 * p;
      lines.children[0].x = -2800 * ((p * 2.6) % 1); if (lines.children[1]) lines.children[1].x = -2800 * ((p * 3.4 + 0.5) % 1);
      nm.alpha = Math.min(1, ms / 100) * (1 - kout); nm.x = 52 + 40 * (1 - Math.min(1, ms / 140));
    },
    end() { c.visible = false; rc.temps.delete(c); } };
};
const speedLines: Prim = (t, rc) => {
  const a = A(t), dur = t.dur ?? 600, n = Math.round((a.count ?? 40) * rc.eng.tierK);
  const cols = (a.colors ?? ['#0a0a0a']).map((c: string) => rc.eng.color(c));
  const g = tmp(rc, new Graphics()) as Graphics;
  for (let i = 0; i < n; i++) { const y = R() * 1100 - 190, x = R() * 3000 - 1500, len = 200 + R() * 700, th = 3 + R() * 14; g.poly([x, y - th / 2, x + len, y, x, y + th / 2]).fill({ color: cols[i % cols.length], alpha: 0.5 + R() * 0.5 }); }
  const L = layerOf(t, rc, 'allout'); L.addChild(g); g.visible = false; g.rotation = a.dir ?? 0;
  return { t0: t.at, dur, begin() { g.visible = true; g.position.set(640, 0); g.pivot.set(0, 360); g.y = 360; },
    tick(p) { const ms = p * dur; g.x = 640 - ((p * (a.scrollSpeed ?? 3)) % 1) * 1500 * (a.reverse ? -1 : 1); g.alpha = Math.min(1, ms / 100, (dur - ms) / 150); },
    end() { g.destroy(); rc.temps.delete(g); } };
};

function buildOneMore(eng: Engine) {
  const c = new Container();
  const burst = new Graphics(); const pts: number[] = [];
  for (let i = 0; i < 28; i++) { const an = (i / 28) * Math.PI * 2, r = i % 2 ? 150 : 300 + (i % 4) * 30; pts.push(Math.cos(an) * r * 1.7, Math.sin(an) * r * 0.8); }
  burst.poly(pts).fill(0x0a0a0a); burst.label = 'burst';
  const strip = new Graphics().poly([-900, -70, 900, -110, 900, 70, -900, 110]).fill(0xe5191c).poly([-900, -52, 900, -92, 900, 52, -900, 92]).fill(0x0a0a0a); strip.label = 'strip';
  const one = txt('1', 300, { font: eng.fonts.display, fill: 0xffffff, stroke: { color: 0x0a0a0a, width: 18, join: 'round' }, dropShadow: { color: 0xe5191c, distance: 14, angle: 0.6, blur: 0, alpha: 1 } });
  one.anchor.set(0.5); one.position.set(-190, -10); one.rotation = -0.12;
  const more = ransom('MORE', 150, eng.fonts.display, { invert: [1, 3], seed: 21, stroke: 12 });
  const mb = more.getLocalBounds(); more.pivot.set(mb.x, mb.y + mb.height / 2); more.position.set(-80, 20); more.rotation = -0.1;
  c.addChild(strip, burst, one, more);
  return c;
}
function buildHoldUp(eng: Engine) {
  const c = new Container();
  const shards = new Graphics();
  for (let i = 0; i < 14; i++) { const an = R() * 6.28, d = 260 + R() * 260, x = Math.cos(an) * d * 1.6, y = Math.sin(an) * d * 0.8, s = 20 + R() * 40; shards.poly([x, y, x + s * 2.2, y - s * 0.6, x + s * 0.4, y + s * 0.5]).fill(0x37d6e8); }
  const hold = ransom('HOLD', 190, eng.fonts.display, { invert: [], seed: 5, stroke: 16 });
  const up = ransom('UP!', 190, eng.fonts.display, { invert: [], seed: 9, stroke: 16 });
  const hb = hold.getLocalBounds(); hold.pivot.set(hb.x + hb.width / 2, hb.y + hb.height / 2); hold.position.set(-60, -90); hold.rotation = -0.12;
  const ub = up.getLocalBounds(); up.pivot.set(ub.x + ub.width / 2, ub.y + ub.height / 2); up.position.set(120, 90); up.rotation = -0.06;
  c.addChild(shards, hold, up);
  return c;
}
const banner: Prim = (t, rc) => {
  const a = A(t), eng = rc.eng, dur = Math.min(450, t.dur ?? 450);
  const style = a.shape ?? (a.text === 'label.holdup' ? 'holdup' : 'onemore');
  const c = eng.getFix('banner:' + style, () => (style === 'holdup' ? buildHoldUp(eng) : buildOneMore(eng)), eng.st.layers.cutin);
  const from = a.enterFrom === 'left' ? -1 : 1;
  return { t0: t.at, dur,
    begin() { rc.temps.add(c); c.visible = true; c.position.set(640, a.y ?? 330); c.alpha = 1; },
    tick(p) {
      const ms = p * dur, kin = Math.min(1, ms / 100), kout = Math.max(0, (ms - (dur - 110)) / 110);
      c.scale.set(1.6 - 0.6 * ease.outBack(kin)); c.x = 640 + from * (1 - ease.outCubic(kin)) * 500 - from * ease.inCubic(kout) * 1700;
      c.rotation = -0.04 * (1 - kin);
    },
    end() { c.visible = false; rc.temps.delete(c); } };
};
const silhouetteDash: Prim = (t, rc) => {
  const a = A(t), eng = rc.eng, count = rc.level === 'minimal' ? 3 : Math.min(8, a.count ?? 8), iv = Math.max(160, a.interval ?? 210), dur = t.dur ?? 1750;
  const ids: string[] = a.units === '$party' || !a.units ? (rc.payload?.partyIds ?? []) : a.units;
  const sprites: Container[] = [];
  return { t0: t.at, dur,
    begin() {
      for (let i = 0; i < count; i++) {
        const tex = eng.frames[`char.${ids[i % ids.length]}#body`] ?? eng.frames['char.joker#body'] ?? Texture.WHITE;
        const c = tmp(rc, new Container());
        const rim = new Sprite(tex); rim.anchor.set(0.5); rim.tint = 0xe5191c; rim.position.set(6, 4);
        const s = new Sprite(tex); s.anchor.set(0.5); s.tint = 0x0a0a0a;
        c.addChild(rim, s); c.visible = false; eng.st.layers.allout.addChild(c); sprites.push(c);
      }
    },
    tick(p) {
      const ms = p * dur, tg = vec(undefined, rc, '$target');
      sprites.forEach((c, i) => {
        const t0 = i * iv, k = (ms - t0) / 200; c.visible = k > 0 && k < 1; if (!c.visible) return;
        const L = i % 2 === 0, e = ease.inOutCubic(k);
        c.position.set(tg.x + (L ? -760 + 1520 * e : 760 - 1520 * e), tg.y + (L ? 170 - 340 * e : -170 + 340 * e));
        c.scale.set((L ? 1 : -1) * 1.15, 1.15); c.rotation = L ? -0.3 : 0.3;
      });
    },
    end() { sprites.forEach((c) => { c.destroy({ children: true }); rc.temps.delete(c); }); } };
};
const freezeFrame: Prim = (t, rc) => { let on = false; return { t0: t.at, dur: Math.min(800, t.dur ?? A(t).ms ?? 780), begin() { rc.eng.fx.frozen++; on = true; }, end() { if (on) { rc.eng.fx.frozen = Math.max(0, rc.eng.fx.frozen - 1); on = false; } } }; };
function buildFinish(eng: Engine, art: Texture, shape: number[]) {
  const c = new Container();
  const grow = (k: number) => shape.map((v, i) => v * (1 + k / (i % 2 ? 400 : 760)));
  const frame = new Graphics().poly(grow(30)).fill(0xffffff).poly(grow(16)).fill(0x0a0a0a);
  const spr = new Sprite(art); spr.anchor.set(0.5); spr.label = 'art';
  const sc = Math.max(1600 / art.width, 860 / art.height); spr.scale.set(sc);
  const mask = new Graphics().poly(shape).fill(0xffffff);
  const inner = new Container(); inner.addChild(spr); inner.mask = mask;
  c.addChild(frame, inner, mask);
  (c as any).baseScale = sc;
  return c;
}
const finishCard: Prim = (t, rc) => {
  const a = A(t), eng = rc.eng, dur = Math.min(1000, t.dur ?? 970);
  const shape = a.shape ?? [-760, -330, 700, -400, 760, 330, -700, 400];
  let fid = eng.resolve(a.artId ?? 'allout.finish.default', rc.payload); if (!eng.tex[fid] && a.fallback) fid = a.fallback; const ftex = eng.tex[fid];
  if (!ftex) { eng.errors.push('finishCard art missing ' + fid); return null; }
  const c = eng.getFix('finish:' + fid, () => buildFinish(eng, ftex, shape), eng.st.layers.allout);
  const spr = (c.children[1] as Container).children[0] as Sprite, base = (c as any).baseScale as number;
  const from = a.enterFrom === 'left' ? -1 : 1, slide = Math.min(200, a.slideMs ?? 170);
  rc.finishCard = c;
  return { t0: t.at, dur,
    begin() { rc.temps.add(c); c.parent?.addChild(c); c.visible = true; c.position.set(640 + from * 1500, 360); c.rotation = -0.06; c.alpha = 1; },
    tick(p) { const ms = p * dur, k = Math.min(1, ms / slide); c.x = 640 + from * 1500 * (1 - ease.outCubic(k)); c.y = 360 + 40 * (1 - k); spr.scale.set(base * (1 + (Math.min(1.04, a.zoom ?? 1.04) - 1) * Math.max(0, (ms - slide) / (dur - slide)))); },
    end() { c.visible = false; rc.temps.delete(c); } };
};
const totalDamage: Prim = (t, rc) => {
  const a = A(t), eng = rc.eng, dur = Math.min(800, t.dur ?? 780);
  const c = tmp(rc, new Container());
  const total = String(rc.payload?.total ?? 0);
  const num = txt(total, 150, { font: eng.font('@font.number'), fill: 0xffffff, stroke: { color: 0x0a0a0a, width: 12, join: 'round' }, fontStyle: 'italic' }); num.anchor.set(0.5);
  const w = num.width + 120;
  const pl = new Graphics().poly([-w / 2, -90, w / 2 + 30, -116, w / 2, 96, -w / 2 - 30, 110]).fill(0xe5191c).stroke({ color: 0xffffff, width: 7 });
  const lab = ransom(eng.label(a.label ?? 'label.totalDamage'), 40, eng.fonts.display, { invert: [0, 6], seed: 3 });
  const lb = lab.getLocalBounds(); lab.position.set(-w / 2 + 10, -150 - lb.y);
  c.addChild(pl, num, lab); eng.st.layers.allout.addChild(c); c.visible = false;
  const pos = vec(a.pos, rc, '$center');
  return { t0: t.at, dur, tag: 'text',
    begin() { c.parent?.addChild(c); c.visible = true; c.position.set(pos.x, pos.y); },
    tick(p) { const ms = p * dur, k = Math.min(1, ms / 200); c.scale.set(2.1 - 1.1 * ease.outBack(k)); c.alpha = Math.min(1, ms / 80); c.rotation = -0.08 * k; },
    end() { c.destroy({ children: true }); rc.temps.delete(c); } };
};

// ------------------------------------------------------------------ transitions
/** 第五阶段：开战斜切面板加 P5 印刷质感 —— 网点渐变 + 速度线 + 白色切边（原作面板不是纯色块） */
function panelTexture(g: Graphics, col: number, i: number) {
  const dark = col === 0x0a0a0a || ((col >> 16) & 255) < 40, paper = ((col >> 8) & 255) > 200;
  const dot = dark ? 0xb3121a : paper ? 0xe5191c : 0x7a0a10;
  let k = 0; const rnd = () => { k = (k * 9301 + 49297 + i * 131) % 233280; return k / 233280; };
  for (let y = -260; y < 1000; y += 26) for (let x = ((y / 26) & 1) * 13; x < 1800; x += 26) {
    const r = Math.max(0, 9 - Math.hypot(x - (i % 2 ? 1500 : 200), y - (i % 2 ? -100 : 900)) / 110);
    if (r > 0.8) g.circle(x, y, r).fill({ color: dot, alpha: 0.85 });
  }
  for (let n = 0; n < 26; n++) { const y = -200 + rnd() * 1150, x = rnd() * 1500, len = 200 + rnd() * 600, th = 2 + rnd() * 7; g.poly([x, y - th / 2, x + len, y, x, y + th / 2]).fill({ color: dark ? 0xe5191c : 0x0a0a0a, alpha: 0.35 + rnd() * 0.4 }); }
  g.rect(0, -1000, 10, 2700).fill({ color: 0xffffff, alpha: 0.95 });
}
const slashPanels: Prim = (t, rc) => {
  const a = A(t), eng = rc.eng, dur = Math.min(900, t.dur ?? 800);
  const cols = (rc.level === 'minimal' ? (a.colors ?? ['#000']).slice(0, 1) : (a.colors ?? ['#0a0a0a', '#e5191c', '#f4eedd']).slice(0, 4)).map((c: string) => eng.color(c));
  const stg = Math.max(50, a.stagger ?? 70), ang = a.angle ?? 0.35, dir = a.dir === 'ltr' ? 1 : -1;
  const L = layerOf(t, rc, 'trans');
  const ps: Graphics[] = cols.map((col: number, i: number) => { const g = tmp(rc, new Graphics().poly([0, -1000, 2600, -1000, 2600, 1700, 0, 1700]).fill(col).stroke({ color: 0x0a0a0a, width: 12 })) as Graphics; g.skew.x = -ang; g.visible = false;
    if (a.texture && rc.level !== 'minimal') panelTexture(g, col, i); L.addChild(g); return g; });
  const vis = eng.st.vis, span = vis.r - vis.l + 3200;
  const inD = (dur - stg * (cols.length - 1)) * 0.45, outD = (dur - stg * (cols.length - 1)) * 0.45;
  return { t0: t.at, dur,
    begin() { ps.forEach((g) => (g.visible = true)); },
    tick(p) {
      const ms = p * dur;
      ps.forEach((g, i) => {
        const t0 = i * stg, kin = Math.min(1, Math.max(0, (ms - t0) / inD)), kout = Math.max(0, Math.min(1, (ms - t0 - inD - (dur - inD - outD - stg * (cols.length - 1))) / outD));
        const startX = dir < 0 ? vis.r + 600 : vis.l - 3200, coverX = vis.l - 300 + i * 30;
        const endX = dir < 0 ? vis.l - 3300 : vis.r + 600;
        g.x = kout > 0 ? coverX + (endX - coverX) * ease.inCubic(kout) : startX + (coverX - startX) * ease.outCubic(kin);
        g.y = -360 + 360;
      });
      void span;
    },
    end() { ps.forEach((g) => { g.destroy(); rc.temps.delete(g); }); } };
};
const maskWipe: Prim = (t, rc) => {
  const a = A(t), dur = Math.min(900, t.dur ?? 500);
  const shape: number[] = Array.isArray(a.shape) ? a.shape.slice(0, 128) : [0, -100, 30, -30, 100, 0, 30, 30, 0, 100, -30, 30, -100, 0, -30, -30];
  const g = tmp(rc, new Graphics().poly(shape).fill(rc.eng.color(a.color ?? '@color.primary'))) as Graphics;
  layerOf(t, rc, 'trans').addChild(g); g.visible = false;
  const f = a.from ?? { scale: 0 }, to = a.to ?? { scale: 14 }, pos = vec(a.pos, rc, '$center');
  return { t0: t.at, dur, ease: ease[t.ease ?? 'inCubic'],
    begin() { g.visible = true; g.position.set(pos.x, pos.y); },
    tick(p) { g.scale.set(f.scale + (to.scale - f.scale) * p); g.rotation = (a.spin ?? 0) * p; },
    end() { g.destroy(); rc.temps.delete(g); } };
};
const bakedSwap: Prim = (t, rc) => {
  const a = A(t), dur = Math.min(400, t.dur ?? 400); let ov: Sprite | null = null;
  return { t0: t.at, dur,
    begin() { const bg = rc.eng.bgSprite, tex = rc.eng.tex[a.to]; if (!bg || !tex) return; ov = new Sprite(tex); ov.anchor.copyFrom(bg.anchor); ov.position.copyFrom(bg.position); ov.scale.copyFrom(bg.scale); ov.alpha = 0; bg.parent!.addChild(ov); },
    tick(p) { if (ov) ov.alpha = p; },
    end() { if (ov && rc.eng.bgSprite) { rc.eng.bgSprite.texture = ov.texture; ov.destroy(); ov = null; } } };
};
const portraitDown: Prim = (t, rc) => {
  const a = A(t), dur = Math.min(600, rc.level === 'minimal' ? 300 : (t.dur ?? 450)); let us: UnitNode[] = [];
  return { t0: t.at, dur, ease: ease.outCubic,
    begin() { us = a.unit ? unitsOf(a.unit, rc) : targetIds(rc).map((i) => rc.eng.units.get(i)!).filter(Boolean); },
    tick(p) { us.forEach((u) => setDownPose(u, Math.min(1, p * 1.15))); },
    end() { us.forEach((u) => { setDownPose(u, 1); u.down = true; u.stars.visible = true; }); } };
};

export const PRIMS: Partial<Record<string, Prim>> = {
  tween, show: showHide(true), hide: showHide(false), sfx, vibrate, title, dim, radialBurst,
  hitStop, shake, flashSprite, flashScreen, squashHit, particles, afterimage, slashLine, damageNumber, tag, shockwave, rgbSplit,
  cutin, speedLines, banner, silhouetteDash, freezeFrame, finishCard, totalDamage, slashPanels, maskWipe, bakedSwap, portraitDown,
  summon, personaShow, nameplate, pose, skinFilter, batonPass, showtimeLogo,
  blockPush, tvStatic, glassShatter, cardFlip, cardShatter, dateFlip, eyeStrip, onomatopoeia, checkerFloor, ringSplash,
  comicPanels, duoEntrance, duoStrike, duoTitle, maskRip, camera, holdupRing,
  ...GRID_PRIMS,
};
