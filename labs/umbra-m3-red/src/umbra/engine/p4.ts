// M3 第四阶段原语：SHOWTIME 双人连携四段（comicPanels 漫画分格开场 / duoEntrance 人物入场 / duoStrike 合击 / duoTitle 定格标题）、
// maskRip（开战：怪盗扯下阴影面具）、glove2（BATON 击掌手套，按角色配色）。全部从 payload.pairIds / 队伍名单解析素材，不写死角色。
import { Container, Graphics, Sprite, Texture } from 'pixi.js';
import type { Track } from '../skins/_contract';
import type { RunCtx } from './prims';
import { Clip, ease } from './timeline';
import { txt, ransom } from './text';

type Prim = (t: Track, rc: RunCtx) => Clip | Clip[] | null;
const A = (t: Track) => t.args as any;
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const seg = (ms: number, a: number, b: number) => clamp((ms - a) / (b - a));
const mk = (rc: RunCtx, layer = 'cutin') => { const c = new Container(); c.visible = false; rc.temps.add(c); ((rc.eng.st.layers as any)[layer] as Container).addChild(c); return c; };
const kill = (rc: RunCtx, c: Container) => { c.destroy({ children: true }); rc.temps.delete(c); };
const pairOf = (rc: RunCtx): [string, string] => { const p = rc.payload?.pairIds ?? [rc.payload?.actorId ?? 'joker', 'skull']; return [p[0], p[1]]; };
const CODE: Record<string, string> = { joker: 'JOKER', skull: 'SKULL', mona: 'MONA', panther: 'PANTHER', fox: 'FOX', queen: 'QUEEN', noir: 'NOIR', crow: 'CROW', violet: 'VIOLET', oracle: 'ORACLE' };
const code = (id: string) => CODE[id] ?? id.toUpperCase();
function lcg(seed: number) { let s = seed; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }

/** 网点（P5 漫画底纹） */
function halftone(g: Graphics, x0: number, y0: number, x1: number, y1: number, step: number, r: (x: number, y: number) => number, color: number, alpha = 1) {
  for (let y = y0; y < y1; y += step) for (let x = x0 + ((Math.round(y / step) % 2) * step) / 2; x < x1; x += step) { const rr = r(x, y); if (rr > 0.5) g.circle(x, y, rr).fill({ color, alpha }); }
}
/** 速度线（单层，重复使用时平移） */
function speed(n: number, w: number, h: number, seed: number, col = 0xffffff) {
  const g = new Graphics(), rnd = lcg(seed);
  for (let i = 0; i < n; i++) { const y = rnd() * h - h / 2, x = rnd() * w * 2 - w, len = 160 + rnd() * 560, th = 2 + rnd() * 8; g.poly([x, y - th / 2, x + len, y - 0.5, x + len, y + 0.5, x, y + th / 2]).fill({ color: i % 6 === 0 ? 0x0a0a0a : col, alpha: 0.35 + rnd() * 0.5 }); }
  return g;
}
/** 放射线（以 0,0 为中心） */
function rays(n: number, r: number, c1: number, c2: number) {
  const g = new Graphics().circle(0, 0, r).fill(c1);
  for (let i = 0; i < n; i++) { const a0 = (i / n) * Math.PI * 2, a1 = a0 + Math.PI / n; g.poly([0, 0, Math.cos(a0) * r, Math.sin(a0) * r, Math.cos(a1) * r, Math.sin(a1) * r]).fill(c2); }
  return g;
}

// ------------------------------------------------------------------ 1. 漫画分格开场（P5X/P5R SHOWTIME：三格斜切漫画框依次拍入，格内是两人眼部特写 + 网点 + 速度线，最后两格向外撕开）
export const comicPanels: Prim = (t, rc) => {
  const eng = rc.eng, dur = Math.min(1100, t.dur ?? 1000), [a, b] = pairOf(rc);
  const ta = eng.frame('char.$a#cutin', rc.payload), tb = eng.frame('char.$b#cutin', rc.payload);
  if (!ta || !tb) { eng.errors.push(`comicPanels: cutin missing ${a}/${b}`); return null; }
  const c = mk(rc); const v = eng.st.vis;
  const bg = new Graphics().rect(v.l - 60, v.t - 60, v.r - v.l + 120, v.b - v.t + 120).fill(0x0a0a0a);
  halftone(bg, v.l, v.t, v.r, v.b, 20, (x, y) => 2 + 4 * ((x - v.l) / (v.r - v.l)) * ((v.b - y) / (v.b - v.t)), 0xe5191c, 0.55);
  // 三格（设计坐标，左上 / 右下 / 中斜带）
  const P1 = [-80, -80, 980, -80, 760, 330, -80, 380];
  const P2 = [300, 400, 1360, 340, 1360, 800, 80, 800];
  const P3 = [990, -80, 1360, -80, 1360, 320, 775, 345];
  const panel = (shape: number[], tex: Texture | null, fill: number, flip: boolean, seed: number) => {
    const p = new Container();
    const frame = new Graphics().poly(shape).fill(0xffffff).stroke({ color: 0x0a0a0a, width: 22, join: 'miter' });
    const inner = new Container();
    const back = new Graphics().poly(shape).fill(fill);
    halftone(back, -80, -80, 1360, 800, 16, (x) => 1 + ((x + 80) % 300) / 110, 0x0a0a0a, 0.18);
    inner.addChild(back);
    let spr: Sprite | null = null;
    if (tex) { spr = new Sprite(tex); spr.anchor.set(0.5); const xs = shape.filter((_, i) => i % 2 === 0), ys = shape.filter((_, i) => i % 2 === 1);
      const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2; spr.position.set(cx, cy);
      spr.scale.set((flip ? -1 : 1) * 1.25, 1.25); inner.addChild(spr); }
    const sl = speed(30, 1400, 500, seed); sl.position.set(640, shape[1] < 0 ? 140 : 580); sl.alpha = 0.7; inner.addChild(sl);
    const m = new Graphics().poly(shape).fill(0xffffff); inner.mask = m;
    p.addChild(frame, inner, m);
    return { p, spr, sl };
  };
  const p1 = panel(P1, ta, 0xe5191c, false, 3), p2 = panel(P2, tb, 0xf4eedd, true, 9), p3 = panel(P3, null, 0x0a0a0a, false, 5);
  // 中格：两人代号牌（剪报字）
  const nmA = ransom(code(a), 64, eng.fonts.display, { invert: [0], seed: 4, stroke: 7 }), nmB = ransom(code(b), 64, eng.fonts.display, { invert: [0], seed: 8, stroke: 7 });
  const amp = txt('&', 80, { font: eng.fonts.display, fill: 0xe5191c, stroke: { color: 0xffffff, width: 8 } }); amp.anchor.set(0.5);
  nmA.position.set(60, 270); nmA.rotation = -0.08; nmB.position.set(900, 470); nmB.rotation = -0.08; amp.position.set(1160, 150);
  c.addChild(bg, p3.p, p1.p, p2.p, nmA, nmB, amp);
  const flash = new Graphics().rect(v.l - 60, v.t - 60, v.r - v.l + 120, v.b - v.t + 120).fill(0xffffff); c.addChild(flash);
  return { t0: t.at, dur, ease: ease.linear,
    begin() { c.visible = true; },
    tick(p) {
      const ms = p * dur;
      // 拍入：P3 先（0–120）→ P1 从左（60–220）→ P2 从右（160–320）；每次拍入带 40ms 白闪 + 格子轻微回弹
      const k3 = ease.outBack(seg(ms, 0, 140)), k1 = ease.outBack(seg(ms, 60, 230)), k2 = ease.outBack(seg(ms, 170, 340));
      p3.p.position.set(500 * (1 - k3), -300 * (1 - k3));
      p1.p.position.set(-1300 * (1 - k1), 0); p1.p.rotation = -0.03 * (1 - k1);
      p2.p.position.set(1300 * (1 - k2), 0); p2.p.rotation = 0.03 * (1 - k2);
      nmA.alpha = seg(ms, 220, 300); nmA.x = 60 - 80 * (1 - seg(ms, 220, 320));
      nmB.alpha = seg(ms, 330, 410); nmB.x = 900 + 80 * (1 - seg(ms, 330, 430));
      amp.alpha = seg(ms, 380, 440); amp.scale.set(2 - ease.outBack(seg(ms, 380, 500)));
      flash.alpha = Math.max(0, 0.5 - Math.abs(ms - 70) / 80) + Math.max(0, 0.45 - Math.abs(ms - 230) / 80) + Math.max(0, 0.45 - Math.abs(ms - 340) / 80);
      // 镜头推近 + 眼部特写缓慢平移（静帧里也在动）
      const push = 1 + 0.06 * p; c.scale.set(push); c.pivot.set(640 * (push - 1) / push * 0, 0); c.position.set(-640 * (push - 1), -360 * (push - 1));
      if (p1.spr) p1.spr.x = 450 - 120 * p; if (p2.spr) p2.spr.x = 760 + 120 * p;
      p1.sl.x = 640 - ((ms / 260) % 1) * 1400; p2.sl.x = 640 + ((ms / 300) % 1) * 1400 - 1400;
      // 撕开：最后 220ms 上格飞左上、下格飞右下、中格碎开
      const ko = ease.inCubic(seg(ms, dur - 220, dur));
      if (ko > 0) { p1.p.position.set(-900 * ko, -420 * ko); p2.p.position.set(900 * ko, 420 * ko); p3.p.alpha = 1 - ko; nmA.alpha = nmB.alpha = amp.alpha = 1 - ko; bg.alpha = 1 - ko * 0.4; }
    },
    end() { kill(rc, c); } };
};

// ------------------------------------------------------------------ 2. 人物入场（红色放射线舞台 + 黑斜带；两人全身依次甩入、落地压缩回弹、代号名牌；最后蓄力下蹲）
export const duoEntrance: Prim = (t, rc) => {
  const eng = rc.eng, dur = Math.min(1100, t.dur ?? 950), [a, b] = pairOf(rc);
  const fa = eng.frame('duo.$pair#a', rc.payload) ?? eng.frame('char.$a#body', rc.payload), fb = eng.frame('duo.$pair#b', rc.payload) ?? eng.frame('char.$b#body', rc.payload);
  if (!fa || !fb) { eng.errors.push(`duoEntrance: body missing ${a}/${b}`); return null; }
  const c = mk(rc); const v = eng.st.vis;
  const bg = new Graphics().rect(v.l - 60, v.t - 60, v.r - v.l + 120, v.b - v.t + 120).fill(0xe5191c);
  const sun = rays(28, 1800, 0xe5191c, 0xb80c14); sun.position.set(640, 300);
  const band = new Graphics().poly([380, 800, 900, -80, 1100, -80, 580, 800]).fill(0xffffff).poly([410, 800, 920, -80, 1075, -80, 555, 800]).fill(0x0a0a0a);
  const dots = new Graphics(); halftone(dots, v.l, v.t, v.r, v.b, 18, (x, y) => Math.max(0, 6 - Math.hypot(x - v.l, y - v.b) / 140), 0x0a0a0a, 0.9);
  const mkBody = (tex: Texture, flip: boolean) => { const s = new Sprite(tex); s.anchor.set(0.5, 1); const k = 600 / tex.height; s.scale.set(k * (flip ? -1 : 1), k); (s as any).k = k; (s as any).f = flip ? -1 : 1; return s; };
  const A1 = mkBody(fa, false), B1 = mkBody(fb, true);
  const shA = mkBody(fa, false), shB = mkBody(fb, true); shA.tint = 0x0a0a0a; shB.tint = 0x0a0a0a; shA.alpha = shB.alpha = 0.55;
  const tagA = ransom(code(a), 54, eng.fonts.display, { invert: [0, 2], seed: 12, stroke: 6 }), tagB = ransom(code(b), 54, eng.fonts.display, { invert: [1], seed: 15, stroke: 6 });
  const lines = speed(40, 1400, 720, 21); lines.position.set(640, 360); lines.alpha = 0.5;
  c.addChild(bg, sun, dots, band, lines, shA, shB, A1, B1, tagA, tagB);
  const sq = (s: Sprite, k: number) => { const base = (s as any).k, f = (s as any).f; s.scale.set(base * f * (1 + 0.06 * k), base * (1 - 0.08 * k)); };
  return { t0: t.at, dur, ease: ease.linear,
    begin() { c.visible = true; },
    tick(p, dt) {
      const ms = p * dur;
      const kin = ease.outCubic(seg(ms, 0, 120)); c.alpha = kin;
      sun.rotation += (dt ?? 16) * 0.00025; lines.x = 640 - ((ms / 340) % 1) * 1400;
      // A：0–220 从左飞入（拉伸）→ 220 落地压缩 → 回弹；B：140–360 同理从右
      const ka = seg(ms, 40, 240), kb = seg(ms, 170, 370);
      A1.position.set(-300 + 690 * ease.outCubic(ka), 700 - 140 * Math.sin(ka * Math.PI) * 0.6); B1.position.set(1580 - 690 * ease.outCubic(kb), 700 - 140 * Math.sin(kb * Math.PI) * 0.6);
      const landA = ms > 240 ? Math.exp(-(ms - 240) / 70) * Math.cos((ms - 240) / 30) : -0.5 * (1 - ka), landB = ms > 370 ? Math.exp(-(ms - 370) / 70) * Math.cos((ms - 370) / 30) : -0.5 * (1 - kb);
      sq(A1, landA); sq(B1, landB);
      // 待机呼吸（静帧也有动势）+ 蓄力下蹲（最后 280ms）+ 冲出（最后 120ms 向画面中心/敌方压出）
      const crouch = ease.inOutCubic(seg(ms, dur - 300, dur - 120)), out = ease.inCubic(seg(ms, dur - 120, dur));
      const br = Math.sin(ms / 160) * 0.012;
      A1.scale.y = (A1 as any).k * (1 - 0.08 * Math.max(0, landA) + br - 0.07 * crouch + 0.1 * out); B1.scale.y = (B1 as any).k * (1 - 0.08 * Math.max(0, landB) - br - 0.07 * crouch + 0.1 * out);
      A1.skew.x = -0.12 * crouch + 0.25 * out; B1.skew.x = 0.12 * crouch - 0.25 * out;
      A1.x += 700 * out; B1.x -= 700 * out; A1.alpha = B1.alpha = 1 - out * 0.8;
      shA.position.set(A1.x + 14, A1.y + 6); shA.scale.copyFrom(A1.scale); shA.skew.copyFrom(A1.skew); shA.alpha = 0.5 * A1.alpha;
      shB.position.set(B1.x + 14, B1.y + 6); shB.scale.copyFrom(B1.scale); shB.skew.copyFrom(B1.skew); shB.alpha = 0.5 * B1.alpha;
      tagA.position.set(90 + 60 * (1 - seg(ms, 240, 340)), 610); tagA.alpha = seg(ms, 240, 320) * (1 - out); tagA.rotation = -0.1;
      tagB.position.set(880 - 60 * (1 - seg(ms, 370, 470)), 130); tagB.alpha = seg(ms, 370, 450) * (1 - out); tagB.rotation = -0.1;
    },
    end() { kill(rc, c); } };
};

// ------------------------------------------------------------------ 3. 合击（回到战场：两人剪影从左右对冲交叉斩过敌群 → X 形巨斩 + 星爆；命中帧在 dur 的 45%）
export const duoStrike: Prim = (t, rc) => {
  const eng = rc.eng, dur = Math.min(900, t.dur ?? 700);
  const fa = eng.frame('duo.$pair#a', rc.payload) ?? eng.frame('char.$a#body', rc.payload), fb = eng.frame('duo.$pair#b', rc.payload) ?? eng.frame('char.$b#body', rc.payload);
  if (!fa || !fb) return null;
  const c = mk(rc, 'allout');
  const ids: string[] = rc.payload?.targetIds ?? [];
  const us = ids.map((i) => eng.units.get(i)).filter((u) => u && u.root.visible) as any[];
  const cx = us.length ? us.reduce((s, u) => s + u.root.x, 0) / us.length : 420, cy = us.length ? us.reduce((s, u) => s + u.root.y + u.hitY, 0) / us.length : 360;
  const sil = (tex: Texture, flip: boolean) => { const g = new Container(); const r = new Sprite(tex); r.anchor.set(0.5); r.tint = 0xe5191c; r.position.set(8, 6); const s = new Sprite(tex); s.anchor.set(0.5); s.tint = 0x0a0a0a; g.addChild(r, s); g.scale.set((flip ? -1 : 1) * 0.9, 0.9); return g; };
  const SA = sil(fa, false), SB = sil(fb, true);
  const trail = new Graphics();
  const X = new Container();
  const slash = (rot: number, col: number) => { const g = new Graphics().poly([-900, -26, 900, -6, 900, 6, -900, 26]).fill(col).poly([-900, -10, 900, -2, 900, 2, -900, 10]).fill(0xffffff); g.rotation = rot; return g; };
  const s1 = slash(-0.55, 0x0a0a0a), s2 = slash(0.55, 0xe5191c); X.addChild(s1, s2);
  const star = new Graphics(); const pts: number[] = []; for (let i = 0; i < 24; i++) { const an = (i / 24) * Math.PI * 2, r = i % 2 ? 70 : 230; pts.push(Math.cos(an) * r, Math.sin(an) * r * 0.8); }
  star.poly(pts).fill(0xffffff).stroke({ color: 0x0a0a0a, width: 8 });
  c.addChild(trail, SA, SB, X, star);
  const hit = dur * 0.45;
  const hud = eng.st.layers.hud; const hud0 = hud.visible;   // 原作 SHOWTIME 期间不显示战斗 HUD
  return { t0: t.at, dur, ease: ease.linear,
    begin() { c.parent?.addChild(c); c.visible = true; X.position.set(cx, cy); star.position.set(cx, cy); hud.visible = false; },
    tick(p) {
      const ms = p * dur, k = ease.inOutCubic(seg(ms, 0, hit + 60));
      SA.position.set(cx - 900 + 1800 * k, cy + 220 - 440 * k); SA.rotation = -0.35; SA.visible = k > 0 && k < 1;
      SB.position.set(cx + 900 - 1800 * k, cy + 220 - 440 * k); SB.rotation = 0.35; SB.visible = SA.visible;
      trail.clear(); if (SA.visible) { trail.poly([cx - 900, cy + 220, SA.x, SA.y - 20, SA.x, SA.y + 20]).fill({ color: 0xffffff, alpha: 0.5 }); trail.poly([cx + 900, cy + 220, SB.x, SB.y - 20, SB.x, SB.y + 20]).fill({ color: 0xe5191c, alpha: 0.6 }); }
      const ks = seg(ms, hit - 30, hit + 90); X.visible = ks > 0; X.alpha = 1 - seg(ms, hit + 200, dur);
      s1.scale.set(ease.outCubic(ks), 1 + 2 * (1 - ks)); s2.scale.set(ease.outCubic(seg(ms, hit, hit + 110)), 1 + 2 * (1 - ks));
      const kst = seg(ms, hit, hit + 260); star.visible = kst > 0 && kst < 1; star.scale.set(0.3 + 1.6 * ease.outBack(clamp(kst * 2))); star.alpha = 1 - kst; star.rotation = kst * 0.5;
    },
    end() { hud.visible = hud0; kill(rc, c); } };
};

// ------------------------------------------------------------------ 4. 定格标题（定格画之上：SHOWTIME 印章 + 「A × B」剪报字 + 斜切黑条，标题逐字砸下）
export const duoTitle: Prim = (t, rc) => {
  const eng = rc.eng, dur = Math.min(1100, t.dur ?? 1000), [a, b] = pairOf(rc);
  const c = mk(rc, 'allout');
  const barW = 1500;
  const bar = new Graphics().poly([-barW / 2, -58, barW / 2, -84, barW / 2, 58, -barW / 2, 84]).fill(0x0a0a0a).stroke({ color: 0xffffff, width: 6 });
  const title = ransom(`${code(a)} × ${code(b)}`, 88, eng.fonts.display, { invert: [0, code(a).length + 3], seed: 31, stroke: 8 });
  const tb = title.getLocalBounds(); title.pivot.set(tb.x + tb.width / 2, tb.y + tb.height / 2);
  const stamp = new Container();
  const st = ransom(eng.label('label.highlight'), 70, eng.fonts.display, { invert: [1, 4, 7], seed: 44, stroke: 7 });
  const sb = st.getLocalBounds(); st.pivot.set(sb.x + sb.width / 2, sb.y + sb.height / 2);
  const sp = new Graphics().roundRect(-sb.width / 2 - 26, -sb.height / 2 - 18, sb.width + 52, sb.height + 36, 8).fill(0xe5191c).stroke({ color: 0xffffff, width: 6 });
  stamp.addChild(sp, st);
  c.addChild(bar, title, stamp);
  const letters = title.children;
  return { t0: t.at, dur, tag: 'text',
    begin() { c.parent?.addChild(c); c.visible = true; c.position.set(640, 600); c.rotation = -0.06; stamp.position.set(-330, -150); stamp.rotation = -0.18; },
    tick(p) {
      const ms = p * dur;
      bar.scale.set(ease.outCubic(seg(ms, 0, 140)), 1);
      letters.forEach((l, i) => { const k = seg(ms, 60 + i * 28, 160 + i * 28); l.alpha = k > 0 ? 1 : 0; l.scale.set(2.2 - 1.2 * ease.outBack(k)); });
      const ks = seg(ms, 260, 380); stamp.alpha = ks > 0 ? 1 : 0; stamp.scale.set(2.6 - 1.6 * ease.outBack(ks));
      c.alpha = 1 - seg(ms, dur - 120, dur);
    },
    end() { kill(rc, c); } };
};

// ------------------------------------------------------------------ 开战：扯下阴影面具（原作：Joker 扑上阴影、红手套抓住白面具扯下 → 黑红黏液爆开 → 阴影现形）
function shadowMask() {
  const g = new Graphics();
  g.ellipse(0, 0, 150, 190).fill(0xf2efe8).stroke({ color: 0x0a0a0a, width: 10 });
  g.poly([-120, -40, -30, -10, -40, 30, -125, 10]).fill(0x0a0a0a); g.poly([120, -40, 30, -10, 40, 30, 125, 10]).fill(0x0a0a0a);   // 眼洞
  g.poly([-14, 30, 14, 30, 0, 90]).fill({ color: 0x0a0a0a, alpha: 0.5 });
  g.poly([-90, 110, 90, 110, 60, 150, -60, 150]).fill(0x0a0a0a);   // 嘴
  for (let i = -70; i <= 70; i += 20) g.poly([i - 8, 112, i + 8, 112, i, 140]).fill(0xf2efe8);
  g.poly([-150, -20, -170, -120, -110, -150]).fill(0xe5191c).stroke({ color: 0x0a0a0a, width: 6 });
  g.poly([150, -20, 170, -120, 110, -150]).fill(0xe5191c).stroke({ color: 0x0a0a0a, width: 6 });
  return g;
}
export function glove2(color = 0xe5191c, open = false) {
  // 手套：掌 + 四指 + 拇指 + 袖口（open = 击掌张开）；黑描边 + 高光，P5 平涂
  const g = new Graphics();
  const ol = { color: 0x0a0a0a, width: 7, join: 'round' as const };
  const sp = open ? 0.22 : 0.08;
  for (let i = 0; i < 4; i++) {
    const an = -0.45 + i * sp * 1.4 - (open ? 0.2 : 0), len = [86, 98, 92, 74][i], w = 13;
    const bx = 10 + i * 22, by = -50, tx = bx + Math.sin(an) * len, ty = by - Math.cos(an) * len;
    g.poly([bx - w, by, tx - w * 0.9, ty, tx, ty - 10, tx + w * 0.9, ty, bx + w, by]).fill(color).stroke(ol);
  }
  g.poly([-40, -60, 100, -60, 108, 40, 60, 74, -30, 70, -50, 10]).fill(color).stroke(ol);                 // 掌
  g.poly([-40, 0, -98, -46, -110, -30, -64, 30]).fill(color).stroke(ol);                                   // 拇指
  g.poly([-20, -40, 60, -46]).stroke({ color: 0xffffff, width: 5, alpha: 0.5 });                            // 高光
  g.poly([-36, 64, 66, 70, 70, 120, -40, 116]).fill(0x0a0a0a).stroke({ color: 0xffffff, width: 4 });     // 袖口
  return g;
}
export const GLOVE: Record<string, number> = { joker: 0xe5191c, skull: 0xf2c21a, mona: 0xf4f4f4, panther: 0xe8437a, fox: 0x2b55d6, queen: 0x2a2a2a, noir: 0x8b4fc9, crow: 0xf4f4f4, violet: 0xc8102e, oracle: 0x4a8a3a };

export const maskRip: Prim = (t, rc) => {
  const eng = rc.eng, dur = Math.min(700, t.dur ?? 520);
  const c = mk(rc, 'trans'); const v = eng.st.vis;
  const bg = new Graphics().rect(v.l - 60, v.t - 60, v.r - v.l + 120, v.b - v.t + 120).fill(0x0a0a0a);
  const shade = new Graphics(); halftone(shade, v.l, v.t, v.r, v.b, 22, (x, y) => 2 + 5 * Math.max(0, 1 - Math.hypot(x - 640, y - 360) / 700), 0xe5191c, 0.6);
  const m = shadowMask(); const hand = glove2(GLOVE[rc.payload?.leadId ?? 'joker'] ?? 0xe5191c);
  const goo = new Graphics(); const rnd = lcg(77);
  const blobs = Array.from({ length: 22 }, () => ({ a: rnd() * Math.PI * 2, d: 0.4 + rnd() * 0.8, r: 40 + rnd() * 90, red: rnd() < 0.5 }));
  c.addChild(bg, shade, goo, m, hand);
  return { t0: t.at, dur, ease: ease.linear,
    begin() { c.visible = true; },
    tick(p) {
      const ms = p * dur;
      const kin = ease.outBack(seg(ms, 0, 110));
      m.position.set(640, 380); m.scale.set(0.6 + 0.5 * kin); m.rotation = -0.08;
      // 手：0–150 从右下扑上、手指扣住面具右上缘；150–300 向右下猛扯（面具翻转飞出、露出底下的黑红黏液）
      const kg = ease.outCubic(seg(ms, 20, 150)), kr = ease.inCubic(seg(ms, 150, 300));
      hand.position.set(1420 - 600 * kg + 640 * kr, 980 - 640 * kg + 260 * kr); hand.rotation = -0.95 + 0.15 * kg + 0.5 * kr; hand.scale.set(1.25);
      if (kr > 0) { m.position.set(640 + 720 * kr, 380 + 240 * kr); m.rotation = -0.08 + 2.6 * kr; m.scale.set(1.1 + 0.3 * kr, (1.1 + 0.3 * kr) * (1 - 0.5 * kr)); }
      // 黏液：扯下瞬间（220–520）从面具原位爆开，黑红团块铺满画面
      const kgo = ease.outCubic(seg(ms, 210, dur - 40));
      goo.clear();
      if (kgo > 0) for (const bl of blobs) { const d = bl.d * 900 * kgo, r = bl.r * (0.4 + 2.2 * kgo); goo.circle(640 + Math.cos(bl.a) * d, 380 + Math.sin(bl.a) * d * 0.7, r).fill(bl.red ? 0xe5191c : 0x050505); }
      if (kgo > 0) goo.circle(640, 380, 120 + 700 * kgo).fill(0x050505);
      if (kgo > 0) for (const bl of blobs) if (bl.red) { const d = bl.d * 520 * kgo; goo.circle(640 + Math.cos(bl.a + 0.5) * d, 380 + Math.sin(bl.a + 0.5) * d * 0.7, bl.r * (0.3 + 1.4 * kgo)).fill(0xb80c14); }   // 黑底上溅开的暗红黏液
      c.alpha = 1 - seg(ms, dur - 60, dur);
    },
    end() { kill(rc, c); } };
};
