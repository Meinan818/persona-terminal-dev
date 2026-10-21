// M3 第二阶段：给 P3（蓝/粉）、P4（黄）皮肤准备的演出原语。红色皮不用，只保证可用 + 有最小演示 recipe（tools/gen_recipes.py → demo.*）。
// 全部用 Graphics/Sprite 程序生成，不占引擎滤镜名额；每个原语 end() 负责清场。
// blockPush 方块推屏 / tvStatic 电视雪花 / glassShatter 玻璃碎裂(+可选人格面具显形) / cardFlip 卡片翻转 / cardShatter 卡片碎裂 / dateFlip 日期翻页
// eyeStrip 眼部横条(+中央小全身像+脚下冰晶) / onomatopoeia 剪影拟声字 / checkerFloor 棋盘地面 / ringSplash 色块+同心圆弧+台词+描边大字
import { Container, Graphics, Sprite, Texture } from 'pixi.js';
import type { Track } from '../skins/_contract';
import type { RunCtx } from './prims';
import { Clip, ease } from './timeline';
import { txt } from './text';
import { DW, DH } from './stage';

type Prim = (t: Track, rc: RunCtx) => Clip | Clip[] | null;
const A = (t: Track) => t.args as any;
const R = Math.random;
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const mk = (rc: RunCtx, layer = 'trans') => { const c = new Container(); c.visible = false; rc.temps.add(c); ((rc.eng.st.layers as any)[layer] as Container).addChild(c); return c; };
const kill = (rc: RunCtx, c: Container) => { c.destroy({ children: true }); rc.temps.delete(c); };
const col = (rc: RunCtx, v: any, d: string) => rc.eng.color(v ?? d);

/** P4 式方块推屏：网格方块按对角线顺序翻入覆盖，再翻出 */
export const blockPush: Prim = (t, rc) => {
  const a = A(t), dur = Math.min(900, t.dur ?? 700), c = mk(rc, t.layer ?? 'trans'), v = rc.eng.st.vis;
  const n = a.cols ?? 10, size = (v.r - v.l) / n, rows = Math.ceil((v.b - v.t) / size) + 1;
  const cols = (a.colors ?? ['#ffe14a', '#0a0a0a']).map((x: string) => rc.eng.color(x));
  const cells: Graphics[] = [];
  for (let y = 0; y < rows; y++) for (let x = 0; x < n; x++) { const g = new Graphics().rect(-size / 2, -size / 2, size + 1, size + 1).fill(cols[(x + y) % cols.length]); g.position.set(v.l + x * size + size / 2, v.t + y * size + size / 2); (g as any).d = (x + y) / (n + rows); c.addChild(g); cells.push(g); }
  return { t0: t.at, dur, begin() { c.visible = true; },
    tick(p) { for (const g of cells) { const d = (g as any).d * 0.5, k = clamp((p - d) / 0.25), o = clamp((p - 0.5 - d) / 0.25); const s = ease.outBack(k) * (1 - ease.inCubic(o)); g.scale.set(s, s); g.rotation = (1 - k) * 0.8; } },
    end() { kill(rc, c); } };
};

/** 电视雪花（P4 电视世界）：随机噪点块 + 扫描线 + 横向撕裂条 */
export const tvStatic: Prim = (t, rc) => {
  const a = A(t), dur = Math.min(600, t.dur ?? 450), c = mk(rc, t.layer ?? 'trans'), v = rc.eng.st.vis;
  const g = new Graphics(); c.addChild(g); const amt = a.alpha ?? 0.85;
  return { t0: t.at, dur, begin() { c.visible = true; },
    tick(p) {
      g.clear(); const k = Math.sin(p * Math.PI) * amt, cell = 12 / Math.max(0.5, rc.eng.tierK);
      for (let y = v.t; y < v.b; y += cell) for (let x = v.l; x < v.r; x += cell * 3) { const l = R(); g.rect(x, y, cell * 3, cell).fill({ color: l > 0.5 ? 0xffffff : 0x111111, alpha: k * (0.4 + l * 0.6) }); }
      for (let y = v.t; y < v.b; y += 6) g.rect(v.l, y, v.r - v.l, 2).fill({ color: 0x000000, alpha: 0.25 * k });
      const ty = v.t + R() * (v.b - v.t); g.rect(v.l, ty, v.r - v.l, 18 + R() * 30).fill({ color: rc.eng.color(a.tint ?? '#ffe14a'), alpha: 0.35 * k });
    },
    end() { kill(rc, c); } };
};

/** 玻璃碎裂（P3 召唤：扣扳机前一帧）：大片蓝白三角碎片从中心炸开；art 给出时人格面具从碎片后显形 */
export const glassShatter: Prim = (t, rc) => {
  const a = A(t), eng = rc.eng, dur = Math.min(700, t.dur ?? 600), c = mk(rc, t.layer ?? 'cutin'), v = eng.st.vis;
  const cx = a.x ?? DW / 2, cy = a.y ?? DH / 2;
  const tex = a.art ? eng.frame(a.art, rc.payload) : undefined;
  const per = tex ? new Sprite(tex) : null; if (per) { per.anchor.set(0.5, 0.9); per.position.set(cx, cy + 300); c.addChild(per); }
  const shards: { g: Graphics; vx: number; vy: number; vr: number }[] = [];
  const n = Math.round((a.count ?? 34) * eng.tierK), c1 = col(rc, a.color, '#bfe6ff'), c2 = col(rc, a.color2, '#2a6bff');
  for (let i = 0; i < n; i++) {
    const an = (i / n) * Math.PI * 2 + R() * 0.2, r0 = 30 + R() * 80, r1 = 260 + R() * 520, w = 0.12 + R() * 0.2;
    const g = new Graphics().poly([Math.cos(an - w) * r0, Math.sin(an - w) * r0, Math.cos(an) * r1, Math.sin(an) * r1, Math.cos(an + w) * r0 * 1.6, Math.sin(an + w) * r0 * 1.6])
      .fill({ color: i % 3 ? c1 : c2, alpha: 0.9 }).stroke({ color: 0xffffff, width: 2 });
    g.position.set(cx, cy); c.addChild(g); shards.push({ g, vx: Math.cos(an) * (400 + R() * 900), vy: Math.sin(an) * (400 + R() * 900) - 200, vr: (R() - 0.5) * 6 });
  }
  const flash = new Graphics().rect(v.l - 40, v.t - 40, v.r - v.l + 80, v.b - v.t + 80).fill(0xffffff); c.addChild(flash);
  return { t0: t.at, dur, begin() { c.visible = true; },
    tick(p) {
      const s = p * dur / 1000, hold = clamp(p / 0.12);
      flash.alpha = Math.max(0, 1 - p * 6) * 0.8;
      for (const sh of shards) { const m = Math.max(0, s - 0.06); sh.g.position.set(cx + sh.vx * m, cy + sh.vy * m + 900 * m * m); sh.g.rotation = sh.vr * m; sh.g.alpha = (1 - clamp((p - 0.6) / 0.4)) * hold; }
      if (per) { const k = ease.outCubic(clamp((p - 0.1) / 0.5)); per.alpha = k * (1 - clamp((p - 0.85) / 0.15)); per.y = cy + 300 - 60 * k; per.scale.set(0.9 + 0.1 * k); }
    },
    end() { kill(rc, c); } };
};

function cardFace(w: number, h: number, fill: number, ink: number, label: string, font: string) {
  const g = new Container();
  g.addChild(new Graphics().roundRect(-w / 2, -h / 2, w, h, 10).fill(fill).stroke({ color: ink, width: 6 }).roundRect(-w / 2 + 14, -h / 2 + 14, w - 28, h - 28, 6).stroke({ color: ink, width: 2 }));
  const t = txt(label, Math.min(64, w * 0.3), { font, fill: ink }); t.anchor.set(0.5); g.addChild(t); return g;
}
/** 卡片翻转（P3/P4 塔罗/心之卡）：沿 Y 轴压扁换面 */
export const cardFlip: Prim = (t, rc) => {
  const a = A(t), eng = rc.eng, dur = Math.min(500, t.dur ?? 420), c = mk(rc, t.layer ?? 'cutin');
  const w = a.w ?? 220, h = a.h ?? 340;
  const back = cardFace(w, h, col(rc, a.back, '#1f3fbf'), 0xffffff, a.backLabel ?? '?', eng.fonts.display);
  const front = cardFace(w, h, col(rc, a.front, '#f4eedd'), 0x0a0a0a, eng.label(a.label ?? 'label.heartCard'), eng.fonts.display);
  c.addChild(back, front); const pos = { x: a.x ?? DW / 2, y: a.y ?? DH / 2 };
  return { t0: t.at, dur, begin() { c.visible = true; c.position.set(pos.x, pos.y); },
    tick(p) { const k = ease.inOutCubic(p), sx = Math.abs(Math.cos(k * Math.PI)); back.visible = k < 0.5; front.visible = k >= 0.5; c.scale.set(Math.max(0.02, sx) * (1 + 0.15 * Math.sin(k * Math.PI)), 1 + 0.15 * Math.sin(k * Math.PI)); c.rotation = -0.06 * Math.sin(k * Math.PI); },
    end() { kill(rc, c); } };
};
/** 卡片碎裂（P3 塔罗捏碎 / P4 卡片击碎）：卡面切成网格碎片四散 */
export const cardShatter: Prim = (t, rc) => {
  const a = A(t), eng = rc.eng, dur = Math.min(600, t.dur ?? 520), c = mk(rc, t.layer ?? 'cutin');
  const w = a.w ?? 220, h = a.h ?? 340, nx = 4, ny = 6, fill = col(rc, a.front, '#1f3fbf');
  const parts: { g: Graphics; vx: number; vy: number; vr: number }[] = [];
  for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
    const pw = w / nx, ph = h / ny, x0 = -w / 2 + x * pw, y0 = -h / 2 + y * ph;
    const g = new Graphics().poly([x0, y0, x0 + pw + R() * 6, y0 + R() * 4, x0 + pw, y0 + ph + R() * 6, x0 - R() * 4, y0 + ph]).fill(fill).stroke({ color: 0xffffff, width: 2 });
    c.addChild(g); parts.push({ g, vx: (x0 + pw / 2) * 4 + (R() - 0.5) * 300, vy: (y0 + ph / 2) * 3 - 200 - R() * 300, vr: (R() - 0.5) * 8 });
  }
  void eng; const pos = { x: a.x ?? DW / 2, y: a.y ?? DH / 2 };
  return { t0: t.at, dur, begin() { c.visible = true; c.position.set(pos.x, pos.y); },
    tick(p) { const s = Math.max(0, p - 0.15) * dur / 1000; for (const q of parts) { q.g.position.set(q.vx * s, q.vy * s + 1400 * s * s); q.g.rotation = q.vr * s; q.g.alpha = 1 - clamp((p - 0.6) / 0.4); } c.scale.set(p < 0.15 ? 1 + 0.08 * Math.sin(p / 0.15 * Math.PI * 4) : 1); },
    end() { kill(rc, c); } };
};
/** 日期翻页（P3/P4 日历）：旧日期页向上翻折离开，新日期从下方落位 */
export const dateFlip: Prim = (t, rc) => {
  const a = A(t), eng = rc.eng, dur = Math.min(900, t.dur ?? 800), c = mk(rc, t.layer ?? 'cutin');
  const page = (s: string, wd: string) => { const g = new Container(); g.addChild(new Graphics().rect(-170, -120, 340, 240).fill(0xf4eedd).stroke({ color: 0x0a0a0a, width: 6 }).rect(-170, -120, 340, 46).fill(col(rc, a.color, '#1f3fbf')));
    const n = txt(s, 120, { font: eng.fonts.number, fill: 0x0a0a0a }); n.anchor.set(0.5); n.y = 22; const w = txt(wd, 30, { font: eng.fonts.display, fill: 0xffffff }); w.anchor.set(0.5); w.y = -97; g.addChild(n, w); return g; };
  const from = page(a.from ?? '4/12', a.fromDay ?? 'SUN'), to = page(a.to ?? '4/13', a.toDay ?? 'MON');
  c.addChild(to, from); const pos = { x: a.x ?? DW / 2, y: a.y ?? DH / 2 };
  return { t0: t.at, dur, begin() { c.visible = true; c.position.set(pos.x, pos.y); },
    tick(p) { const k = ease.inCubic(clamp(p / 0.6)), j = ease.outBack(clamp((p - 0.35) / 0.5)); from.scale.y = Math.max(0.01, 1 - k); from.y = -120 * k; from.alpha = 1 - k * 0.3; to.y = 200 * (1 - j); to.alpha = clamp(p / 0.3); c.alpha = 1 - clamp((p - 0.85) / 0.15); },
    end() { kill(rc, c); } };
};

/** 眼部横条（P3 暴击/击倒 cut-in）：横贯眼部特写 + 中央小全身像 + 脚下冰晶 + 左上名牌 */
export const eyeStrip: Prim = (t, rc) => {
  const a = A(t), eng = rc.eng, dur = Math.min(700, t.dur ?? 600), c = mk(rc, t.layer ?? 'cutin');
  const band = new Container(), bg = new Graphics().poly([-1500, -110, 1500, -130, 1500, 110, -1500, 130]).fill(col(rc, a.color, '#0b2a6b')).stroke({ color: 0xffffff, width: 6 });
  band.addChild(bg);
  const eyes = a.art ? eng.frame(a.art, rc.payload) : undefined;
  if (eyes) { const s = new Sprite(eyes); s.anchor.set(0.5); s.height = 230; s.scale.x = s.scale.y; s.alpha = 0.95; band.addChild(s); }
  for (let i = 0; i < (a.p5 ? 0 : 24); i++) { const b = new Graphics().circle(0, 0, 4 + R() * 10).fill({ color: 0x9fdcff, alpha: 0.5 }); b.position.set(-700 + R() * 1400, -100 + R() * 200); band.addChild(b); }
  const fig = a.figure ? eng.frame(a.figure, rc.payload) : undefined; let fs: Sprite | null = null;
  if (fig) { fs = new Sprite(fig); fs.anchor.set(0.5, 1); fs.height = 200; fs.scale.x = fs.scale.y; fs.position.set(a.figureX ?? 120, 110); band.addChild(fs); }
  const ice = new Graphics(); for (let i = 0; i < (a.p5 ? 0 : 12); i++) { const x = (a.figureX ?? 120) + (R() - 0.5) * 160; ice.poly([x, 110, x + 8 + R() * 10, 110 - 20 - R() * 40, x + 20, 110]).fill({ color: 0xdff6ff, alpha: 0.9 }); } band.addChild(ice);
  const plate = new Container(); const nm = txt(eng.label(a.name ?? ('unit.' + (rc.payload?.actorId ?? ''))), 34, { font: eng.fonts.display, fill: 0xffffff });
  plate.addChild(new Graphics().poly([0, 0, nm.width + 60, -4, nm.width + 46, 50, -10, 54]).fill(col(rc, a.plate, '#1f3fbf')).stroke({ color: 0xffffff, width: 3 }), nm); nm.position.set(20, 6);
  c.addChild(band); if (!a.noPlate) c.addChild(plate);
  return { t0: t.at, dur, begin() { c.visible = true; band.position.set(DW / 2, a.y ?? 330); band.rotation = a.angle ?? -0.06; plate.position.set(eng.st.safe.l + 30, eng.st.safe.t + 120); },
    tick(p) { const ms = p * dur, kin = ease.outCubic(clamp(ms / 140)), kout = ease.inCubic(clamp((ms - dur + 130) / 130)); band.scale.set(1, kin * (1 - kout) + 0.001); band.x = DW / 2 - 60 * p; plate.alpha = kin * (1 - kout); plate.x = eng.st.safe.l + 30 - 200 * (1 - kin); if (fs) fs.x = (a.figureX ?? 120) + 30 * p; },
    end() { kill(rc, c); } };
};

/** 剪影拟声字（P3「咔」）：巨大黑剪影字 + 白描边，砸入后抖动 */
export const onomatopoeia: Prim = (t, rc) => {
  const a = A(t), eng = rc.eng, dur = Math.min(600, t.dur ?? 500), c = mk(rc, t.layer ?? 'cutin');
  const s = txt(eng.label(a.text ?? 'sfx.kacha'), a.size ?? 240, { font: eng.fonts.display, fill: col(rc, a.fill, '#0a0a0a'), stroke: { color: col(rc, a.stroke, '#ffffff'), width: 12, join: 'round' } });
  s.anchor.set(0.5); c.addChild(s);
  return { t0: t.at, dur, tag: 'text', begin() { c.visible = true; c.position.set(a.x ?? 1000, a.y ?? 330); c.rotation = a.rot ?? 0.12; },
    tick(p) { const ms = p * dur, k = clamp(ms / 90); c.scale.set(2 - ease.outBack(k)); c.x = (a.x ?? 1000) + (ms > 90 && ms < 260 ? (R() - 0.5) * 10 : 0); c.alpha = 1 - clamp((ms - dur + 120) / 120); },
    end() { kill(rc, c); } };
};

/** 棋盘地面（P3 总攻收尾 pose 镜头）：透视棋盘格从地平线铺开 */
export const checkerFloor: Prim = (t, rc) => {
  const a = A(t), dur = Math.min(1200, t.dur ?? 900), c = mk(rc, t.layer ?? 'allout'), v = rc.eng.st.vis;
  const g = new Graphics(); c.addChild(g); const c1 = col(rc, a.color, '#1f3fbf'), c2 = col(rc, a.color2, '#0b1e6b'), hz = a.horizon ?? 380;
  const sky = new Graphics().rect(v.l - 20, v.t - 20, v.r - v.l + 40, hz - v.t + 20).fill(col(rc, a.sky, '#050a1e')); c.addChildAt(sky, 0);
  return { t0: t.at, dur, begin() { c.visible = true; },
    tick(p) {
      g.clear(); const k = ease.outCubic(clamp(p / 0.4)), scroll = (p * 2) % 1, rows = 14, colsN = 16;
      for (let r = 0; r < rows; r++) {
        const z0 = (r + scroll) / rows, z1 = (r + 1 + scroll) / rows; const y0 = hz + (v.b + 40 - hz) * z0 ** 2 * k, y1 = hz + (v.b + 40 - hz) * z1 ** 2 * k;
        for (let i = -colsN; i < colsN; i++) { const xs = (q: number, z: number) => DW / 2 + q * 90 * (0.15 + z * 2.4); g.poly([xs(i, z0), y0, xs(i + 1, z0), y0, xs(i + 1, z1), y1, xs(i, z1), y1]).fill((i + r) % 2 ? c1 : c2); }
      }
      c.alpha = 1 - clamp((p - 0.9) / 0.1);
    },
    end() { kill(rc, c); } };
};

/** 色块 + 同心圆弧 + 白色粗体台词 + 背景描边大字（P3 总攻收尾定格） */
export const ringSplash: Prim = (t, rc) => {
  const a = A(t), eng = rc.eng, dur = Math.min(1000, t.dur ?? 900), c = mk(rc, t.layer ?? 'allout'), v = eng.st.vis;
  const fill = col(rc, a.color, '#e83a8a');
  const bg = new Graphics().rect(v.l - 20, v.t - 20, v.r - v.l + 40, v.b - v.t + 40).fill(fill); c.addChild(bg);
  const big = txt(eng.label(a.bigText ?? 'label.massDestruction'), 150, { font: eng.fonts.display, fill: fill, stroke: { color: 0xffffff, width: 4 } }); big.anchor.set(0.5); big.alpha = 0.5; big.position.set(DW / 2, DH / 2); big.rotation = -0.08; c.addChild(big);
  const rings = new Graphics(); for (let i = 0; i < 6; i++) rings.circle(0, 0, 120 + i * 70).stroke({ color: 0xffffff, width: 10 - i, alpha: 0.6 - i * 0.08 }); rings.position.set(a.rx ?? 900, a.ry ?? 380); c.addChild(rings);
  const art = a.art ? eng.frame(a.art, rc.payload) : undefined; let sp: Sprite | null = null;
  if (art) { sp = new Sprite(art); sp.anchor.set(0.5, 1); sp.height = 620; sp.scale.x = sp.scale.y; sp.position.set(a.rx ?? 900, DH + 20); c.addChild(sp); }
  const line = txt(eng.label(a.text ?? 'label.finish'), 64, { font: eng.fonts.display, fill: 0xffffff, stroke: { color: 0x0a0a0a, width: 8, join: 'round' }, wordWrap: true, wordWrapWidth: 560 });
  line.position.set(eng.st.safe.l + 60, 220); line.rotation = -0.05; c.addChild(line);
  return { t0: t.at, dur, begin() { c.visible = true; },
    tick(p) { const ms = p * dur, k = ease.outCubic(clamp(ms / 200)); rings.scale.set(0.6 + 0.4 * k + 0.03 * p); rings.rotation = 0.2 * p; line.x = eng.st.safe.l + 60 - 300 * (1 - k); line.alpha = k; if (sp) sp.x = (a.rx ?? 900) + 200 * (1 - k); big.x = DW / 2 - 60 * p; c.alpha = 1 - clamp((p - 0.92) / 0.08); },
    end() { kill(rc, c); } };
};
void Texture;
