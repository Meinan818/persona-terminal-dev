// Q 版格子关卡画面（P5T 式 2.5D 斜 45°）。纯画面：读 Explore 规则状态画格子/小人/视线锥。
// M4b：explore:* 演出不再由这里直接播，改为皮肤 recipe 经 Director 播；本类只把棋盘注册成 BoardAdapter（engine/grid.ts）。
import { Container, Graphics, Sprite, Text, Rectangle, Texture } from 'pixi.js';
import type { Explore, Cell, Foe } from '../game/explore';
import type { BoardAdapter } from '../umbra/engine';

const TW = 106, TH = 53, WALL = 44, COVER = 28;
const RED = 0xe5191c, INK = 0x0a0a0a;
type Tween = { t: number; d: number; f: (k: number) => void; done?: () => void };

export class ExploreView {
  root = new Container();
  bg: Sprite; board = new Container(); tiles = new Container(); cones = new Container(); marks = new Container(); units = new Container(); fx = new Container(); bfx = new Container();
  ex!: Explore; ox = 640; oy = 200;
  lead!: Sprite; follow: Sprite[] = [];
  foeS = new Map<string, Container>();
  chestS: { at: Cell; g: Container }[] = []; hiddenS: { at: Cell; g: Graphics }[] = [];
  gate!: Graphics;
  tweens: Tween[] = [];
  scanT = 0;
  onTap: ((c: Cell) => void) | null = null;
  bossTag: string | null = null;
  constructor(private tex: Record<string, Texture>, private party: string[]) {
    this.bg = new Sprite(tex['bg.explore.palace']); this.bg.anchor.set(0.5); this.bg.position.set(640, 360);
    const veil = new Graphics().rect(-500, -200, 2280, 1120).fill({ color: INK, alpha: 0.35 });
    this.root.addChild(this.bg, veil, this.board, this.fx);
    this.board.addChild(this.tiles, this.cones, this.marks, this.units, this.bfx);
    this.root.eventMode = 'static'; this.root.hitArea = new Rectangle(-600, -300, 2480, 1320);
    this.root.on('pointertap', (e) => { const p = this.board.toLocal(e.global); const c = this.pick(p.x, p.y); if (c && this.onTap) this.onTap(c); });
  }
  iso(x: number, y: number) { return { x: this.ox + (x - y) * TW / 2, y: this.oy + (x + y) * TH / 2 }; }
  pick(px: number, py: number): Cell | null {
    const a = (px - this.ox) / (TW / 2), b = (py - this.oy) / (TH / 2);
    const x = Math.floor((a + b) / 2 + 0.5), y = Math.floor((b - a) / 2 + 0.5);
    return x >= 0 && y >= 0 && x < this.ex.W && y < this.ex.H ? [x, y] : null;
  }
  diamond(g: Graphics, x: number, y: number, lift = 0) { const p = this.iso(x, y); return g.poly([p.x, p.y - TH / 2 - lift, p.x + TW / 2, p.y - lift, p.x, p.y + TH / 2 - lift, p.x - TW / 2, p.y - lift]); }
  block(x: number, y: number, h: number, top: number, side1: number, side2: number, edge = RED) {
    const p = this.iso(x, y); const g = new Graphics();
    g.poly([p.x - TW / 2, p.y, p.x, p.y + TH / 2, p.x, p.y + TH / 2 - h, p.x - TW / 2, p.y - h]).fill(side1);
    g.poly([p.x + TW / 2, p.y, p.x, p.y + TH / 2, p.x, p.y + TH / 2 - h, p.x + TW / 2, p.y - h]).fill(side2);
    this.diamond(g, x, y, h).fill(top).stroke({ color: edge, width: 2, alpha: 0.9 });
    (g as any).zIndex = (x + y) * 10 + 5; return g;
  }
  buildSteps: Record<string, number> = {};
  build(ex: Explore) {
    let tk = performance.now(); const lap = (k: string) => { const n = performance.now(); this.buildSteps[k] = Math.round(n - tk); tk = n; };
    this.ex = ex; [this.tiles, this.cones, this.marks, this.units, this.fx, this.bfx].forEach((c) => c.removeChildren().forEach((k) => k.destroy({ children: true })));
    this.foeS.clear(); this.chestS = []; this.hiddenS = [];
    // 居中：菱形包围盒中心对齐 (640, 400)
    const cx = (ex.W - ex.H) * TW / 4, cy = (ex.W + ex.H - 2) * TH / 4;
    this.ox = 640 - cx; this.oy = 428 - cy;
    this.units.sortableChildren = true;
    const floor = new Graphics();
    for (let y = 0; y < ex.H; y++) for (let x = 0; x < ex.W; x++) {
      const t = ex.tile([x, y]);
      if (t === '#') continue;
      this.diamond(floor, x, y).fill((x + y) % 2 ? 0x3b0a0d : 0x220506).stroke({ color: 0x7a1215, width: 1.5, alpha: 0.8 });
    }
    // 外缘厚度（悬空舞台感）
    const rim = new Graphics();
    for (let x = 0; x < ex.W; x++) { const p = this.iso(x, ex.H - 1); rim.poly([p.x - TW / 2, p.y, p.x, p.y + TH / 2, p.x, p.y + TH / 2 + 22, p.x - TW / 2, p.y + 22]).fill(0x14020a); }
    for (let y = 0; y < ex.H; y++) { const p = this.iso(ex.W - 1, y); rim.poly([p.x + TW / 2, p.y, p.x, p.y + TH / 2, p.x, p.y + TH / 2 + 22, p.x + TW / 2, p.y + 22]).fill(0x2a050a); }
    this.tiles.addChild(rim, floor); lap('floor');
    // 出口（红色铁栅）
    const e = this.iso(ex.exit[0], ex.exit[1]);
    const ef = new Graphics(); this.diamond(ef, ex.exit[0], ex.exit[1]).fill({ color: RED, alpha: 0.55 }).stroke({ color: 0xffffff, width: 3 });
    this.tiles.addChild(ef);
    this.gate = new Graphics(); for (let i = -2; i <= 2; i++) this.gate.rect(e.x + i * 14 - 3, e.y - 74, 6, 74).fill(INK).stroke({ color: RED, width: 1.5 });
    this.gate.rect(e.x - 36, e.y - 80, 72, 10).fill(RED); (this.gate as any).zIndex = (ex.exit[0] + ex.exit[1]) * 10 + 6; this.units.addChild(this.gate);
    const exl = new Text({ text: 'EXIT', style: { fontFamily: 'R5 Latin Display', fontSize: 26, fill: 0xffffff, stroke: { color: INK, width: 5 } } }); exl.anchor.set(0.5); exl.position.set(e.x, e.y - 96); exl.rotation = -0.12; (exl as any).zIndex = 999; this.units.addChild(exl);
    for (let y = 0; y < ex.H; y++) for (let x = 0; x < ex.W; x++) {
      const t = ex.tile([x, y]);
      if (t === '#') this.units.addChild(this.block(x, y, WALL, 0x1a1214, 0x0d0809, 0x2a1a1c));
      if (t === 'C') { const b = this.block(x, y, COVER, 0x5a3a2a, 0x3a2418, 0x2a1810, 0xffffff); const p = this.iso(x, y); b.poly([p.x - 10, p.y - COVER - 4, p.x, p.y - COVER - 14, p.x + 10, p.y - COVER - 4]).stroke({ color: 0x6fd3ff, width: 3 }); this.units.addChild(b); }
      if (t === 'H') { const g = this.block(x, y, WALL, 0x1a1214, 0x0d0809, 0x2a1a1c); const p = this.iso(x, y); g.moveTo(p.x - 18, p.y - 30).lineTo(p.x - 4, p.y - 12).lineTo(p.x - 12, p.y + 2).lineTo(p.x + 6, p.y + 16).stroke({ color: 0xffd34a, width: 3, alpha: 0.85 }); this.units.addChild(g); this.hiddenS.push({ at: [x, y], g }); }
    }
    lap('walls');
    for (const c of ex.chests) { const g = this.chest(c.at); this.chestS.push({ at: c.at, g }); }
    for (const f of ex.foes) this.foeS.set(f.id, this.foe(f)); lap('foes');
    this.lead = this.chibi('chibi.joker', 128); this.follow = this.party.slice(1, 4).map((id) => this.chibi('chibi.' + id, id === 'mona' ? 84 : 110)).filter(Boolean) as Sprite[];
    lap('party'); this.placeParty(); this.drawCones(); lap('cones');
  }
  chibi(id: string, h: number) {
    const tx = this.tex[id] ?? this.tex['chibi.joker']; const s = new Sprite(tx); s.anchor.set(0.5, 0.94); s.scale.set(h / tx.height);
    const sh = new Graphics().ellipse(0, 0, 30, 12).fill({ color: INK, alpha: 0.5 }); sh.scale.set(1 / s.scale.x); s.addChildAt(sh, 0);
    this.units.addChild(s); return s;
  }
  chest(at: Cell) {
    const p = this.iso(at[0], at[1]); const c = new Container(); c.position.set(p.x, p.y);
    const g = new Graphics();
    g.poly([-26, -8, 0, 4, 0, -26, -26, -38]).fill(0x8a1a12).stroke({ color: 0xffd34a, width: 2 });
    g.poly([26, -8, 0, 4, 0, -26, 26, -38]).fill(0x5a0e0a).stroke({ color: 0xffd34a, width: 2 });
    const lid = new Graphics().poly([-26, -38, 0, -26, 26, -38, 0, -50]).fill(0xc8281e).stroke({ color: 0xffd34a, width: 2 }); lid.label = 'lid';
    c.addChild(g, lid); (c as any).zIndex = (at[0] + at[1]) * 10 + 7; this.units.addChild(c); return c;
  }
  foe(f: Foe) {
    const c = new Container(); const id = f.kind === 'boss' ? 'enemy.boss1' : f.kind === 'elite' ? 'chibi.elite' : 'chibi.guard';
    const tx = this.tex[id] ?? this.tex['chibi.elite']; const s = new Sprite(tx); s.anchor.set(0.5, 0.94); const h = f.kind === 'boss' ? 210 : f.kind === 'elite' ? 150 : f.kind === 'gate' ? 128 : 112; s.scale.set(h / tx.height);
    if (f.kind === 'gate') s.tint = 0xffb0b0;
    const sh = new Graphics().ellipse(0, 0, f.kind === 'boss' ? 60 : f.kind === 'elite' ? 44 : 34, f.kind === 'boss' ? 20 : 14).fill({ color: RED, alpha: 0.45 });
    c.addChild(sh, s); (c as any).spr = s;
    if (f.kind !== 'patrol') { const tag = new Text({ text: f.kind === 'boss' ? (this.bossTag ?? 'BOSS') : f.kind === 'elite' ? 'ELITE' : 'GUARD', style: { fontFamily: 'R5 Latin Display', fontSize: 22, fill: 0xffffff, stroke: { color: RED, width: 5 } } }); tag.anchor.set(0.5); tag.y = -h - 14; tag.rotation = -0.1; c.addChild(tag); }
    this.units.addChild(c); this.placeFoe(f, c); return c;
  }
  placeFoe(f: Foe, c = this.foeS.get(f.id)!) { const p = this.iso(f.at[0], f.at[1]); c.position.set(p.x, p.y); (c as any).zIndex = (f.at[0] + f.at[1]) * 10 + 8; const s = (c as any).spr as Sprite; s.scale.x = Math.abs(s.scale.x) * (f.facing[0] - f.facing[1] > 0 ? -1 : 1); }
  placeParty() {
    const at = (s: Sprite, c: Cell) => { const p = this.iso(c[0], c[1]); s.position.set(p.x, p.y); (s as any).zIndex = (c[0] + c[1]) * 10 + 9; };
    at(this.lead, this.ex.pos); this.follow.forEach((s, i) => { at(s, this.ex.trail[i] ?? this.ex.pos); s.x += (i - 1) * 10; (s as any).zIndex -= 1; });
  }
  drawCones() {
    this.cones.removeChildren().forEach((k) => k.destroy()); const g = new Graphics(); const a = this.scanT > 0 ? 0.5 : 0.2;
    for (const f of this.ex.foes) if (f.alive) for (const c of this.ex.cone(f)) this.diamond(g, c[0], c[1]).fill({ color: RED, alpha: a });
    this.cones.addChild(g);
    this.marks.removeChildren().forEach((k) => k.destroy());
    const m = new Graphics(); const pc = this.ex.pos; this.diamond(m, pc[0], pc[1]).stroke({ color: 0xffffff, width: 3 });
    if (this.scanT > 0) for (const c of this.ex.interactables()) this.diamond(m, c[0], c[1]).fill({ color: 0xffd34a, alpha: 0.45 }).stroke({ color: 0xffd34a, width: 3 });
    this.marks.addChild(m);
  }
  // ------------------------------------------------------------------ 待机 + 补间（阴影走位）
  tween(d: number, f: (k: number) => void) { return new Promise<void>((res) => this.tweens.push({ t: 0, d: Math.max(1, d), f, done: res })); }
  update(dt: number) {
    for (const tw of this.tweens.slice()) { tw.t += dt; const r = Math.min(1, tw.t / tw.d); tw.f(r); if (r >= 1) { this.tweens.splice(this.tweens.indexOf(tw), 1); tw.done?.(); } }
    if (this.scanT > 0) { this.scanT -= dt; if (this.scanT <= 0) this.drawCones(); }
    const t = performance.now() / 1000;
    for (const [, c] of this.foeS) { const s = (c as any).spr as Sprite; if (c.visible) s.y = Math.sin(t * 3 + c.x) * 2; }
    if (this.lead) this.lead.skew.x = Math.sin(t * 2.4) * 0.02;
  }
  private face(c: Container, f: Cell) { const s = (c as any).spr as Sprite; s.scale.x = Math.abs(s.scale.x) * (f[0] - f[1] > 0 ? -1 : 1); }
  /** 阴影落到规则状态（瞬时） */
  syncFoes() { for (const f of this.ex.foes) { const c = this.foeS.get(f.id); if (!c) continue; if (!f.alive) { c.visible = false; continue; } const p = this.iso(f.at[0], f.at[1]); c.position.set(p.x, p.y); (c as any).zIndex = (f.at[0] + f.at[1]) * 10 + 8; this.face(c, f.facing); this.alertMark(c, f); } }
  /** 追击中的阴影头顶红色「!」常驻 */
  alertMark(c: Container, f: Foe) {
    let m = (c as any).chase as Text | undefined;
    if (f.chase && !m) { m = new Text({ text: '!', style: { fontFamily: 'R5 Latin Display', fontSize: 54, fill: RED, stroke: { color: 0xffffff, width: 6 } } }); m.anchor.set(0.5, 1); m.y = -118; c.addChild(m); (c as any).chase = m; }
    if (m) m.visible = !!f.chase;
  }
  removeFoe(id: string) { const c = this.foeS.get(id); if (c) c.visible = false; this.drawCones(); }
  /** BoardAdapter：格子层原语（gridWalk/gridMark/gridSquash/gridProp/gridShake/gridScan）通过它读写棋盘 */
  adapter(): BoardAdapter {
    return {
      board: this.board, fx: this.bfx,
      unit: (ref, p) => ref === '$actor' ? this.lead : (this.foeS.get(p?.enemyId ?? p?.foeId ?? p?.targetId) ?? null),
      followers: () => this.follow,
      cellPos: (c) => this.iso(c[0], c[1]),
      z: (c) => (c[0] + c[1]) * 10,
      prop: (p) => {
        if (p?.gateId) return { kind: 'gate', node: this.gate };
        const at = p?.cell as Cell | undefined; if (!at) return null;
        if (p.kind === 'chest') { const c = this.chestS.find((x) => x.at[0] === at[0] && x.at[1] === at[1]); return c ? { kind: 'chest', node: c.g } : null; }
        const h = this.hiddenS.find((x) => x.at[0] === at[0] && x.at[1] === at[1]); return h ? { kind: 'hidden', node: h.g, ok: !!p.ok } : null;
      },
      foesStep: (i, ms, p) => {
        const snap = p?.foes?.[i] as [string, Cell, Cell, number][] | undefined; if (!snap) return;
        for (const [id, at, facing, chase] of snap) {
          const c = this.foeS.get(id); if (!c || !c.visible) continue;
          const to = this.iso(at[0], at[1]); const from = { x: c.x, y: c.y }; this.face(c, facing); (c as any).zIndex = (at[0] + at[1]) * 10 + 8;
          this.alertMark(c, { chase: !!chase } as any);
          if (Math.hypot(to.x - from.x, to.y - from.y) > 1) this.tween(ms, (k) => c.position.set(from.x + (to.x - from.x) * k, from.y + (to.y - from.y) * k));
        }
      },
      settle: () => { this.tweens.length = 0; this.placeParty(); this.syncFoes(); this.drawCones(); },
      scanShow: (ms) => { this.scanT = ms; this.drawCones(); },
    };
  }
}
