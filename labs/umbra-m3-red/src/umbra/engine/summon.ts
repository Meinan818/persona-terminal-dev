// M3 第二阶段原语：人格面具召唤（summon）、场上人格面具显形（personaShow）、技能名牌（nameplate）、
// 2D 骨骼式姿态（pose）、皮肤滤镜（skinFilter：1 MORE 去色等）。全部按「$actor」从队伍名单解析素材，不写死角色。
import { Container, Graphics, MeshPlane, Sprite, Texture, ColorMatrixFilter } from 'pixi.js';
import type { Track } from '../skins/_contract';
import type { RunCtx } from './prims';
import { Clip, ease } from './timeline';
import { txt, plate, ransom } from './text';
import type { UnitNode, Pose } from './units';
import { DW } from './stage';
import { glove2, GLOVE } from './p4';

type Prim = (t: Track, rc: RunCtx) => Clip | Clip[] | null;
const A = (t: Track) => t.args as any;
const R = Math.random;
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const seg = (ms: number, a: number, b: number) => clamp((ms - a) / (b - a));
const actorOf = (rc: RunCtx): string => rc.payload?.actorId ?? rc.payload?.unitId ?? rc.eng.actor;

/** 人格面具网格：外侧（翅膀/披风/火焰）按到中轴距离加权飘动 */
export function personaMesh(tex: Texture) {
  const m = new MeshPlane({ texture: tex, verticesX: 10, verticesY: 10 });
  const buf = m.geometry.getBuffer('aPosition'); const base = new Float32Array(buf.data as Float32Array);
  const W = tex.width, H = tex.height;
  const flutter = (t: number, amp: number) => {
    const d = buf.data as Float32Array;
    for (let i = 0; i < d.length; i += 2) {
      const x = base[i], y = base[i + 1], ox = (x - W / 2) / (W / 2), oy = y / H;
      const wgt = Math.abs(ox) ** 1.6 * (0.4 + 0.6 * (1 - oy)) + (oy > 0.75 ? (oy - 0.75) * 2 : 0);
      d[i] = x + Math.sin(t / 170 + oy * 5 + ox * 2) * amp * wgt * W * 0.03;
      d[i + 1] = y + Math.cos(t / 210 + ox * 4) * amp * wgt * H * 0.02;
    }
    buf.update();
  };
  return { m, flutter };
}

/** 蓝焰（程序生成的火舌多边形，逐帧重绘；不吃滤镜名额） */
function drawFlames(g: Graphics, t: number, cx: number, cy: number, r: number, k: number, n = 14) {
  g.clear(); if (k <= 0) return;
  const layer = (col: number, alpha: number, sc: number, ph: number) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + ph, w = 0.38;
      const base = r * 0.85 * sc, len = r * sc * (0.9 + 0.6 * Math.sin(t / 60 + i * 2.3)) * k;
      const up = -Math.PI / 2, dir = up + (a - Math.PI) * 0.22;    // 火舌整体往上卷
      const bx = cx + Math.cos(a) * base, by = cy + Math.sin(a) * base * 0.8;
      const tx = bx + Math.cos(dir) * len + Math.sin(t / 90 + i) * 14, ty = by + Math.sin(dir) * len;
      g.poly([bx + Math.cos(a + w) * base * 0.5, by + Math.sin(a + w) * base * 0.4,
        (bx + tx) / 2 + Math.cos(dir + 1.2) * 18 * sc, (by + ty) / 2, tx, ty,
        (bx + tx) / 2 + Math.cos(dir - 1.2) * 18 * sc, (by + ty) / 2,
        bx + Math.cos(a - w) * base * 0.5, by + Math.sin(a - w) * base * 0.4]).fill({ color: col, alpha });
    }
  };
  layer(0x1238d8, 0.38 * k, 1.5, 0.2); layer(0x2f7bff, 0.45 * k, 1.15, 0.0); layer(0x8fd2ff, 0.32 * k, 0.8, 0.4); layer(0xe6f6ff, 0.22 * k, 0.5, 0.7);
}

// ------------------------------------------------------------------ summon
export const summon: Prim = (t, rc) => {
  const eng = rc.eng, a = A(t), dur = Math.min(900, t.dur ?? 820), id = actorOf(rc);
  const bustT = eng.frame('char.$actor#bust', id), nomT = eng.frame('char.$actor#nomask', id), maskT = eng.frame('char.$actor#mask', id), perT = eng.frame('persona.$actor', id);
  if (!bustT) { eng.errors.push(`summon: char.${id} not loaded`); return null; }
  const fr = (eng.skin.manifest.assets.find((x) => x.id === 'char.' + id)?.frames as any)?.maskAt as number[] | undefined;
  const c = new Container(); rc.temps.add(c); c.visible = false; eng.st.layers.cutin.addChild(c);
  const v = eng.st.vis;
  const bg = new Graphics().rect(v.l - 40, v.t - 40, v.r - v.l + 80, v.b - v.t + 80).fill(0x040818);
  const rays = new Graphics();
  for (let i = 0; i < 40; i++) { const an = (i / 40) * Math.PI * 2, w = 0.035 + R() * 0.05; rays.poly([0, 0, Math.cos(an - w) * 1600, Math.sin(an - w) * 1600, Math.cos(an + w) * 1600, Math.sin(an + w) * 1600]).fill({ color: i % 3 ? 0x0c2a8a : 0x2457ff, alpha: 0.55 }); }
  const S = 1.45, bx = a.x ?? 420, by = a.y ?? 380;
  const pm = perT ? personaMesh(perT) : null;
  if (pm) { pm.m.pivot.set(perT!.width / 2, perT!.height); }
  const bust = new Container(); const bs = new Sprite(bustT); bs.anchor.set(0.5); bust.addChild(bs);
  const nom = nomT ? new Sprite(nomT) : null; if (nom) { nom.anchor.set(0.5); nom.alpha = 0; bust.addChild(nom); }
  const piece = maskT && fr ? new Sprite(maskT) : null;
  const pc0 = fr ? { x: fr[0] + fr[2] / 2 - 200, y: fr[1] + fr[3] / 2 - 200 } : { x: 0, y: -40 };
  if (piece) { piece.anchor.set(0.5); piece.position.set(pc0.x, pc0.y); bust.addChild(piece); }
  const flames = new Graphics(); bust.addChild(flames);
  const hand = glove2(GLOVE[id] ?? 0xe5191c); hand.scale.set(0.42); hand.visible = !!piece; bust.addChild(hand);
  const flash = new Graphics().rect(v.l - 40, v.t - 40, v.r - v.l + 80, v.b - v.t + 80).fill(0xbfe6ff);
  const lines = new Graphics();
  for (let i = 0; i < 26; i++) { const y = -360 + R() * 720, x = R() * 1400 - 700, len = 200 + R() * 500; lines.poly([x, y - 2, x + len, y, x, y + 2]).fill({ color: 0x9fdcff, alpha: 0.35 + R() * 0.4 }); }
  c.addChild(bg, rays, lines); if (pm) c.addChild(pm.m); c.addChild(bust, flash);
  const quick = dur < 600;
  return { t0: t.at, dur, ease: ease.linear,
    begin() { c.visible = true; c.alpha = 1; rays.position.set(bx, by - 40); lines.position.set(DW / 2, 360); },
    tick(p, dt) {
      const ms = p * dur, f = ms / dur, T = performance.now();
      // 0 入场（bust 从左甩入，背景压暗）
      const kin = ease.outCubic(seg(f, 0, quick ? 0.1 : 0.15));
      bg.alpha = 0.9 * kin; rays.alpha = kin; rays.rotation += (dt ?? 16) * 0.0004;
      lines.x = DW / 2 - ((T / 3) % 1400); lines.alpha = 0.8 * kin;
      bust.position.set(bx - 520 * (1 - kin), by + 30 * (1 - kin)); bust.scale.set(S * (1.12 - 0.12 * kin));
      // 1 手按面具（重心后移：bust 轻微后仰）
      const kh = ease.outBack(seg(f, quick ? 0.05 : 0.08, quick ? 0.25 : 0.32));
      const kr = ease.inCubic(seg(f, quick ? 0.25 : 0.32, quick ? 0.42 : 0.48));    // 2 扯下
      bust.rotation = -0.05 * kh + 0.09 * kr - 0.04 * seg(f, 0.5, 0.9);
      if (piece) {
        const mw = fr ? fr[2] : 120, hx0 = 230, hy0 = 300, hx1 = pc0.x + mw * 0.42, hy1 = pc0.y + 30;   // 手指扣住面具右缘（不再整只手盖住面具）
        hand.position.set(hx0 + (hx1 - hx0) * kh + 420 * kr, hy0 + (hy1 - hy0) * kh - 260 * kr); hand.rotation = -0.2 - 0.5 * kh - 0.6 * kr;
        hand.alpha = 1 - seg(f, 0.5, 0.6);
        piece.position.set(pc0.x + 420 * kr, pc0.y - 260 * kr); piece.rotation = 1.4 * kr; piece.scale.set(1 + 0.25 * kr);
        piece.alpha = 1 - seg(f, 0.5, 0.62);
      }
      if (!piece) {
        // 无面具可撕（Mona）：原作做法是不扯面具 —— 原地转身一圈蓄力，蓝焰从脚下卷起成柱，召唤出人格面具（待对录像逐帧核对）
        const ksp = ease.inOutCubic(seg(f, 0.06, quick ? 0.3 : 0.36));
        bust.scale.x = bust.scale.y * Math.cos(ksp * Math.PI * 2); bust.rotation = 0;
        bust.y += -26 * Math.sin(ksp * Math.PI);
      }
      if (nom) nom.alpha = f > (quick ? 0.33 : 0.4) ? 1 : 0;
      // 3 蓝焰从脸上爆出
      const kf = seg(f, quick ? 0.3 : 0.38, quick ? 0.5 : 0.56);
      const fade = 1 - seg(f, 0.82, 1);
      if (piece) drawFlames(flames, T, pc0.x, pc0.y + 10, 110, ease.outBack(kf) * fade * (nom ? 1 : 1.25), eng.tierK > 0.7 ? 14 : 9);
      else drawFlames(flames, T, 0, 150 - 120 * ease.outCubic(kf), 90 + 90 * kf, ease.outBack(kf) * fade * 1.3, eng.tierK > 0.7 ? 16 : 10);   // 脚下起焰、上卷成柱
      flash.alpha = Math.max(0, 1 - Math.abs(f - (quick ? 0.36 : 0.42)) * 22) * 0.55 + Math.max(0, 1 - Math.abs(f - 0.9) * 25) * 0.35;
      // 4 人格面具在身后升起显形
      if (pm) {
        const kp = ease.outCubic(seg(f, quick ? 0.36 : 0.44, quick ? 0.8 : 0.84));
        pm.m.position.set(bx + 420, by + 340 + 160 * (1 - kp)); pm.m.scale.set(0.9 + 0.25 * kp);
        pm.m.alpha = kp * fade; pm.flutter(T, 0.6 + 0.6 * kp);
      }
      c.alpha = 1 - seg(f, 0.9, 1);
    },
    end() { c.destroy({ children: true }); rc.temps.delete(c); } };
};

// ------------------------------------------------------------------ persona on field (behind actor, cast pose, dissolve)
export const personaShow: Prim = (t, rc) => {
  const eng = rc.eng, a = A(t), dur = Math.min(1100, t.dur ?? 700), id = actorOf(rc);
  const tex = eng.frame('persona.$actor', id); if (!tex) return null;
  const u = eng.units.get(id) ?? [...eng.units.values()].find((x) => x.side === 'ally');
  const pm = personaMesh(tex); pm.m.pivot.set(tex.width / 2, tex.height); rc.temps.add(pm.m);
  eng.st.layers.ally.addChildAt(pm.m, 0); pm.m.visible = false;
  return { t0: t.at, dur,
    begin() { pm.m.visible = true; },
    tick(p) {
      const ms = p * dur, T = performance.now();
      const kin = ease.outCubic(clamp(ms / 160)), kout = ease.inCubic(clamp((ms - (dur - 220)) / 220));
      const hx = (u?.root.x ?? 1060) + (a.dx ?? -120), hy = (u?.root.y ?? 700) + (a.dy ?? -40);
      pm.m.position.set(hx, hy - 40 * kin - 60 * kout); pm.m.scale.set((a.scale ?? 0.95) * (0.9 + 0.1 * kin));
      pm.m.alpha = kin * (1 - kout) * 0.95; pm.flutter(T, 1);
      // 施法前探：最后段向敌人方向前倾
      pm.m.skew.x = -0.08 * clamp((ms - dur * 0.3) / (dur * 0.3)) * (1 - kout);
    },
    end() { pm.m.destroy(); rc.temps.delete(pm.m); } };
};

// ------------------------------------------------------------------ skill nameplate (原作左上技能名黑条 + 属性圆标)
const ELC: Record<string, number> = { phys: 0xf08a1c, gun: 0x9a9a9a, curse: 0x7a2bd6, bless: 0xffe14a, fire: 0xff4b1f, ice: 0x5fd4ff, elec: 0xffe600,
  wind: 0x37e15a, psy: 0xff5ad2, nuke: 0x3fd0ff, heal: 0x37e15a, support: 0x2fb35a, almighty: 0xcccccc };
export const nameplate: Prim = (t, rc) => {
  const eng = rc.eng, a = A(t), dur = Math.min(1200, t.dur ?? 800);
  const c = new Container(); rc.temps.add(c); eng.st.layers.cutin.addChild(c); c.visible = false;
  const label = eng.label(a.text ?? ('skill.' + (rc.payload?.skillId ?? '') + '.name'));
  const enemy = a.side === 'enemy';
  const tx = txt(label, 40, { font: eng.font('@font.display'), fill: 0xffffff }); tx.anchor.set(0, 0.5); tx.position.set(70, 0);
  const el = a.element ?? rc.payload?.hits?.[0]?.element ?? 'almighty';
  const col = ELC[el] ?? 0xcccccc;
  const ico = new Graphics().circle(34, 0, 21).fill(0x0a0a0a).circle(34, 0, 17).fill(col).stroke({ color: 0xffffff, width: 3 });
  // 敌方行动：原作左上行动名条 = 黑底红描边斜条 + 红色投影，上方小号敌人名（红底白字剪报块）
  const pl = plate(tx.width + 110, 60, enemy ? { fill: 0x0a0a0a, stroke: 0xe5191c, sw: 4, skew: 14, shadow: 0xffffff, sx: -6, sy: 6 } : { fill: 0x0a0a0a, stroke: 0xffffff, sw: 3, skew: 14, shadow: 0xe5191c }); pl.position.set(0, -30);
  c.addChild(pl, ico, tx);
  if (enemy) {
    const en: string = rc.payload?.actorName ?? '';
    const nm = txt(en || eng.label('enemyTurn'), 22, { font: eng.font('@font.display'), fill: 0xffffff }); nm.anchor.set(0, 0.5);
    const np = plate(nm.width + 34, 30, { fill: 0xe5191c, stroke: 0x0a0a0a, sw: 3, skew: 8 }); np.position.set(18, -66); nm.position.set(32, -51);
    c.addChild(np, nm);
  }
  return { t0: t.at, dur, tag: 'text',
    begin() { c.visible = true; c.position.set(eng.st.safe.l + 40, eng.st.safe.t + 150); c.rotation = -0.04; },
    tick(p) { const ms = p * dur; const k = ease.outCubic(clamp(ms / 140)); c.x = eng.st.safe.l + 40 - 300 * (1 - k); c.alpha = Math.min(k, clamp((dur - ms) / 120)); },
    end() { c.destroy({ children: true }); rc.temps.delete(c); } };
};

// ------------------------------------------------------------------ pose：关键姿态之间按缓动连续插值（60fps，非关键图硬切）
const POSES: Record<string, Partial<Pose>> = {
  idle: {}, windup: { lean: -18, crouch: 0.04, raise: 26, twist: 0.04 }, grab: { lean: -24, crouch: 0.05, raise: 46, twist: 0.08 },
  rip: { lean: 20, raise: 34, twist: -0.12, dx: 10 }, cast: { lean: 34, crouch: 0.02, raise: 18, twist: -0.05, dx: 26, dy: -4 },
  settle: { lean: 4, crouch: 0.02 }, dash: { lean: 46, crouch: 0.06, dx: -80 }, slash: { lean: 30, raise: -20, twist: -0.16, dx: -160 },
  recoil: { lean: -30, crouch: 0.05, dx: 22 }, sink: { crouch: 0.12, lean: -10 }, guard: { crouch: 0.07, lean: -10, raise: 16, twist: 0.1 },
};
export const pose: Prim = (t, rc) => {
  const a = A(t), dur = Math.min(1800, t.dur ?? 600);
  const keys: { at: number; pose: string; ease?: string }[] = a.keys ?? [{ at: 0, pose: 'idle' }, { at: 1, pose: a.pose ?? 'cast' }];
  let us: UnitNode[] = [];
  const P = (k: string) => ({ lean: 0, crouch: 0, twist: 0, raise: 0, dx: 0, dy: 0, ...POSES[k] });
  return { t0: t.at, dur,
    begin() {
      const ref = a.target ?? '$actor';
      if (ref === '$actor') { const u = rc.eng.units.get(actorOf(rc)); us = u ? [u] : []; }
      else us = (rc.payload?.targetIds ?? []).map((i: string) => rc.eng.units.get(i)).filter(Boolean);
      us.forEach((u) => rc.touched.add(u));
    },
    tick(p) {
      let i = 0; while (i < keys.length - 2 && p > keys[i + 1].at) i++;
      const k0 = keys[i], k1 = keys[Math.min(i + 1, keys.length - 1)];
      const span = Math.max(1e-6, k1.at - k0.at), q = (ease as any)[k1.ease ?? 'inOutCubic'](clamp((p - k0.at) / span));
      const A0 = P(k0.pose), A1 = P(k1.pose);
      for (const u of us) for (const key of Object.keys(A0) as (keyof Pose)[]) u.pose[key] = A0[key] + (A1[key] - A0[key]) * q;
    },
    end() { us.forEach((u) => { const last = P(keys[keys.length - 1].pose); Object.assign(u.pose, last); if (a.reset !== false) Object.assign(u.pose, P('idle')); }); } };
};

// ------------------------------------------------------------------ skinFilter（manifest.filters 申报的名额；红色皮只用 ColorMatrix 去色）
let cm: ColorMatrixFilter | null = null;
export const skinFilter: Prim = (t, rc) => {
  const eng = rc.eng, a = A(t), dur = Math.min(1200, t.dur ?? 400);
  if (!eng.skin.manifest.filters.includes('ColorMatrix')) { eng.errors.push('skinFilter: ColorMatrix 未在 manifest.filters 申报'); return null; }
  if (!cm) cm = new ColorMatrixFilter();
  let on = false;
  return { t0: t.at, dur,
    begin() { eng.fx.setSkin(cm!, true); on = true; },
    tick(p) {
      const ms = p * dur, k = Math.min(1, ms / 60, (dur - ms) / 90);
      cm!.reset();
      if ((a.kind ?? 'desaturate') === 'desaturate') { cm!.desaturate(); cm!.alpha = k * (a.amount ?? 1); cm!.contrast(0.25 * k, true); }
      else if (a.kind === 'grey') { cm!.desaturate(); cm!.alpha = k * (a.amount ?? 1); cm!.brightness(1 + 0.18 * k, true); cm!.contrast(-0.22 * k, true); }   // 原作 1 MORE：世界变中灰（不是压黑）
      else if (a.kind === 'tint') { cm!.tint(eng.color(a.color ?? '#3f8bff'), false); cm!.alpha = k * (a.amount ?? 0.5); }
      else if (a.kind === 'sepia') { cm!.sepia(false); cm!.alpha = k; }
    },
    end() { if (on) { eng.fx.setSkin(cm!, false); on = false; } } };
};

// ------------------------------------------------------------------ BATON PASS（击掌交接：两人半身从两侧甩入 → 手套相击星爆 → 剪报字）
export const batonPass: Prim = (t, rc) => {
  const eng = rc.eng, dur = Math.min(800, t.dur ?? 720);
  const from = rc.payload?.actorId as string, to = (rc.payload?.targetIds ?? [])[0] as string;
  const tf = eng.frame('char.$actor#bust', from), tt = eng.frame('char.$actor#bust', to);
  const c = new Container(); rc.temps.add(c); c.visible = false; eng.st.layers.cutin.addChild(c);
  const v = eng.st.vis;
  const bg = new Graphics().poly([v.l - 40, v.t - 40, 760, v.t - 40, 520, v.b + 40, v.l - 40, v.b + 40]).fill(0xe5191c)
    .poly([760, v.t - 40, v.r + 40, v.t - 40, v.r + 40, v.b + 40, 520, v.b + 40]).fill(0x0a0a0a);
  for (let y = v.t; y < v.b; y += 22) for (let x = v.l + ((y / 22) % 2) * 11; x < 640; x += 22) bg.circle(x, y, 3).fill({ color: 0x0a0a0a, alpha: 0.25 });
  const L = new Container(), Rt = new Container();
  if (tf) { const s = new Sprite(tf); s.anchor.set(0.5); L.addChild(s); }
  if (tt) { const s = new Sprite(tt); s.anchor.set(0.5); s.scale.x = -1; Rt.addChild(s); }
  const g1 = glove2(GLOVE[from] ?? 0xe5191c, true), g2 = glove2(GLOVE[to] ?? 0xe5191c, true); g1.scale.set(1.15); g2.scale.set(-1.15, 1.15);   // 第四阶段：按角色手套配色的张开手掌（击掌）
  const star = new Graphics(); const pts: number[] = [];
  for (let i = 0; i < 20; i++) { const a = (i / 20) * Math.PI * 2, r = i % 2 ? 60 : 170; pts.push(Math.cos(a) * r, Math.sin(a) * r); }
  star.poly(pts).fill(0xffffff).stroke({ color: 0x0a0a0a, width: 6 });
  const word = ransom(eng.label('label.baton'), 96, eng.fonts.display, { invert: [0, 6], seed: 17, stroke: 9 });
  const wb = word.getLocalBounds(); word.pivot.set(wb.x + wb.width / 2, wb.y + wb.height / 2);
  c.addChild(bg, L, Rt, star, g1, g2, word);   // 星爆在手套之下：击掌那一下看得到两只手
  return { t0: t.at, dur,
    begin() { c.visible = true; },
    tick(p) {
      const ms = p * dur, k = ease.outCubic(clamp(ms / 160)), out = ease.inCubic(clamp((ms - (dur - 140)) / 140));
      bg.alpha = k * (1 - out); bg.x = -200 * (1 - k);
      L.position.set(330 - 600 * (1 - k) - 500 * out, 400); L.scale.set(1.25);
      Rt.position.set(960 + 600 * (1 - k) + 300 * clamp((ms - 380) / 300) * 0 , 400); Rt.scale.set(1.25 * (1 + 0.15 * clamp((ms - 380) / 300)));
      const kh = ease.inCubic(clamp((ms - 120) / 160));                // 两手相向 → 280ms 相击
      g1.position.set(160 + 400 * kh, 470 - 90 * kh); g1.rotation = 0.5 - 0.15 * kh;
      g2.position.set(1120 - 400 * kh, 470 - 90 * kh); g2.rotation = -0.5 + 0.15 * kh;
      const hit = clamp((ms - 280) / 120); g1.x -= 18 * Math.sin(hit * Math.PI); g2.x += 18 * Math.sin(hit * Math.PI);   // 相击反弹
      const ks = clamp((ms - 280) / 220);
      star.position.set(640, 360); star.visible = ms > 270; star.scale.set(0.3 + 1.2 * ease.outBack(clamp(ks * 2))); star.alpha = 1 - ks; star.rotation = ks * 0.6;
      word.position.set(640, 600); word.visible = ms > 300; word.scale.set(1.6 - 0.6 * ease.outBack(clamp((ms - 300) / 140))); word.rotation = -0.08;
      c.alpha = 1 - out;
    },
    end() { c.destroy({ children: true }); rc.temps.delete(c); } };
};

// ------------------------------------------------------------------ SHOWTIME 标题字（原作：红黑立体剪报字逐个砸下）
export const showtimeLogo: Prim = (t, rc) => {
  const eng = rc.eng, dur = Math.min(900, t.dur ?? 800);
  const c = new Container(); rc.temps.add(c); c.visible = false; eng.st.layers.cutin.addChild(c);
  const word = eng.label('label.highlight'); const letters: Container[] = [];
  let x = 0; let seed = 11; const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  for (let i = 0; i < word.length; i++) {
    const ch = word[i], s = 150 * (0.85 + rnd() * 0.35), red = i % 2 === 0;
    const lc = new Container();
    const ext = txt(ch, s, { font: eng.fonts.display, fill: 0x0a0a0a }); ext.anchor.set(0.5); ext.position.set(10, 12);
    const face = txt(ch, s, { font: eng.fonts.display, fill: red ? 0xe5191c : 0x0a0a0a, stroke: { color: red ? 0x0a0a0a : 0xffffff, width: 10, join: 'round' } }); face.anchor.set(0.5);
    lc.addChild(ext, face); lc.position.set(x, (rnd() - 0.5) * 60); lc.rotation = (rnd() - 0.5) * 0.5; (lc as any).r0 = lc.rotation;
    x += face.width * 0.86; letters.push(lc); c.addChild(lc);
  }
  c.pivot.set(x / 2, 0);
  return { t0: t.at, dur, tag: 'text',
    begin() { c.visible = true; c.position.set(640, 330); c.rotation = -0.12; },
    tick(p) {
      const ms = p * dur;
      letters.forEach((l, i) => { const k = clamp((ms - i * 45) / 140); l.alpha = k > 0 ? 1 : 0; l.scale.set(2.4 - 1.4 * ease.outBack(k)); l.rotation = (l as any).r0 * (2 - k); });
      c.alpha = clamp((dur - ms) / 140); c.scale.set(1 + 0.08 * p);
    },
    end() { c.destroy({ children: true }); rc.temps.delete(c); } };
};
