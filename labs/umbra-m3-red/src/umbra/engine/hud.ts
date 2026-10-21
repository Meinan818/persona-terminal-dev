// P5 HUD（引擎默认 HUD，形状/位置全部读皮肤 slots.json + tokens + labels；皮肤不写代码）。
// 指令簇（原作放射布局）、队伍斜卡、左上名牌条（含行动顺序）、导航气泡、系统键、敌人头顶、技能列表、HOLD UP 选项、RESULT。
import { Container, Graphics, Rectangle, Sprite, Text, Texture } from 'pixi.js';
import type { CommandItem, CommandSet, Rect } from '../skins/_contract';
import type { Engine } from './core';
import { ransom, txt, plate, hex } from './text';
import { ease } from './timeline';

export interface PartyState { id: string; name: string; hp: number; hpMax: number; sp: number; spMax: number; active?: boolean }
export interface EnemyState { id: string; name: string; hp: number; hpMax: number; lv: number; known: string[]; weak: string[]; down: boolean; alive: boolean }
export interface ListRow { id: string; name: string; desc: string; cost?: string; costKind?: 'sp' | 'hp' | 'n'; element?: string; disabled?: boolean }
export interface ResultData { exp: number; money: number; items: { name: string; n: number }[]; bonus: boolean }

const ELEM: Record<string, [number, string]> = {
  phys: [0xf08a1c, 'slash'], gun: [0x9a9a9a, 'bullet'], curse: [0x7a2bd6, 'curse'], bless: [0xffe14a, 'bless'], fire: [0xff4b1f, 'flame'],
  support: [0x2fb35a, 'up'], heal: [0x37e15a, 'plus'], item: [0xf4eedd, 'box'], order: [0x2a2a2a, 'flag'], back: [0x444444, 'back'], almighty: [0xcccccc, 'star'],
};
function elemIcon(kind: string, r = 18) {
  const [col, glyph] = ELEM[kind] ?? ELEM.almighty;
  const g = new Graphics().circle(0, 0, r + 3).fill(0x0a0a0a).circle(0, 0, r).fill(col);
  const w = 0xffffff, k = r / 18;
  if (glyph === 'slash') g.poly([-9 * k, 9 * k, 7 * k, -11 * k, 10 * k, -8 * k, -6 * k, 11 * k]).fill(w);
  else if (glyph === 'curse') g.poly([0, -11 * k, 8 * k, 2 * k, 0, 11 * k, -8 * k, 2 * k]).fill(0x0a0a0a).circle(0, 1 * k, 4 * k).fill(0xe5191c);
  else if (glyph === 'bullet') g.roundRect(-4 * k, -10 * k, 8 * k, 20 * k, 4 * k).fill(w);
  else if (glyph === 'up') g.poly([0, -11 * k, 9 * k, 0, 3 * k, 0, 3 * k, 10 * k, -3 * k, 10 * k, -3 * k, 0, -9 * k, 0]).fill(w);
  else if (glyph === 'plus') g.rect(-3 * k, -10 * k, 6 * k, 20 * k).fill(w).rect(-10 * k, -3 * k, 20 * k, 6 * k).fill(w);
  else if (glyph === 'box') g.rect(-9 * k, -7 * k, 18 * k, 14 * k).fill(0xe5191c);
  else if (glyph === 'back') g.poly([-10 * k, 0, 2 * k, -9 * k, 2 * k, 9 * k]).fill(w);
  else if (glyph === 'flag') g.poly([-6 * k, -10 * k, 9 * k, -5 * k, -6 * k, 1 * k]).fill(w).rect(-8 * k, -10 * k, 3 * k, 20 * k).fill(w);
  else g.poly([0, -10 * k, 3 * k, -3 * k, 10 * k, 0, 3 * k, 3 * k, 0, 10 * k, -3 * k, 3 * k, -10 * k, 0, -3 * k, -3 * k]).fill(w);
  return g;
}
function keyIcon(key: string, r = 17) {
  const g = new Graphics();
  if (key.startsWith('r') || key.startsWith('l')) {
    g.roundRect(-r * 1.25, -r * 0.8, r * 2.5, r * 1.6, r * 0.7).fill(0x0a0a0a).stroke({ color: 0xffffff, width: 2.5 });
    return { g, label: key.toUpperCase() };
  }
  g.circle(0, 0, r).fill(0x0a0a0a).stroke({ color: 0xffffff, width: 2.5 });
  const s = r * 0.5;
  if (key === 'cross') g.poly([-s, -s * 0.7, -s * 0.7, -s, 0, -s * 0.3, s * 0.7, -s, s, -s * 0.7, s * 0.3, 0, s, s * 0.7, s * 0.7, s, 0, s * 0.3, -s * 0.7, s, -s, s * 0.7, -s * 0.3, 0]).fill(0x8ab4ff);
  if (key === 'circle') g.circle(0, 0, s).stroke({ color: 0xff5a6e, width: 3.5 });
  if (key === 'square') g.rect(-s * 0.85, -s * 0.85, s * 1.7, s * 1.7).stroke({ color: 0xff86d6, width: 3.5 });
  if (key === 'triangle') g.poly([0, -s, s, s * 0.75, -s, s * 0.75]).stroke({ color: 0x3fe0b0, width: 3.5 });
  return { g, label: '' };
}

export class P5Hud {
  root = new Container();
  private sets = new Map<string, { c: Container; items: { def: CommandItem; node: Container; hit: Container; ph: number }[]; burst: Container }>();
  private mode = 'hidden';
  private openT = 0;
  oneMore = false;
  busy = false;
  party = new Container(); partyCards = new Map<string, { c: Container; hp: Graphics; sp: Graphics; hpT: Text; spT: Text; st: PartyState; shown: { hp: number; sp: number }; shake: number; base: { x: number; y: number } }>();
  order = new Container(); top = new Container(); sys = new Container(); over = new Container(); list = new Container(); result = new Container(); holdLogo = new Container();
  overs = new Map<string, Container>();
  reticle = new Container();
  targetId = '';
  naviText!: Text;
  onCommand: (id: string) => void = () => {};
  onRow: (id: string) => void = () => {};
  onEnemy: (id: string) => void = () => {};
  onSystem: (id: string) => void = () => {};
  listRows: { row: ListRow; c: Container; bg: Graphics; w: number }[] = [];
  listSel = 0;
  private listDesc!: Text;
  private listTitle = new Container();
  private t = 0;
  private resultAnim: { t: number; data?: ResultData; nums: { t: Text; v: number; fmt: (n: number) => string }[]; blocks: Container[] } = { t: 0, nums: [], blocks: [] };
  debugHits = false;

  constructor(private eng: Engine) {
    const L = eng.st.layers.hud;
    L.addChild(this.over, this.reticle, this.party, this.order, this.top, this.sys, this.list, this.holdLogo, this.result);
    const slots = eng.skin.slots;
    for (const [name, set] of Object.entries(slots['hud.command'].sets)) this.buildSet(name, set as CommandSet);
    this.buildParty(); this.buildTop(); this.buildSystem(); this.buildReticle(); this.buildHoldLogo();
    this.list.visible = false; this.result.visible = false; this.holdLogo.visible = false;
    this.debugHits = new URLSearchParams(location.search).get('hit') === '1';
    if (this.debugHits) this.drawDebug();
  }
  private get C() { return this.eng.skin.tokens.color; }
  private lab(k: string) { return this.eng.label(k); }
  private hitBox(r: Rect, on: () => void) {
    const h = new Container(); h.eventMode = 'static'; h.cursor = 'pointer'; h.hitArea = new Rectangle(r[0], r[1], r[2], r[3]);
    h.on('pointertap', on); return h;
  }

  // ------------------------------------------------------------------ command cluster
  private buildSet(name: string, set: CommandSet) {
    const eng = this.eng, c = new Container(); c.visible = false;
    const burst = new Container();
    if (name !== 'result') {
      // P5R 指令簇背后的红色锯齿放射 + 黑色碎片
      const g = new Graphics(); const hub = set.hub; let s = 3; const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
      for (const it of set.items) {
        const dx = it.x - hub.x, dy = it.y - hub.y, len = Math.hypot(dx, dy) + 120, a = Math.atan2(dy, dx);
        const w = 26 + rnd() * 18, nx = -Math.sin(a), ny = Math.cos(a);
        g.poly([hub.x + nx * w * 0.3, hub.y + ny * w * 0.3, hub.x + Math.cos(a) * len + nx * w, hub.y + Math.sin(a) * len + ny * w,
          hub.x + Math.cos(a) * (len + 50), hub.y + Math.sin(a) * (len + 50), hub.x + Math.cos(a) * len - nx * w * 0.6, hub.y + Math.sin(a) * len - ny * w * 0.6]).fill({ color: hex(this.C.primary), alpha: 0.9 });
      }
      for (let i = 0; i < 9; i++) { const a = rnd() * 6.28, d = 60 + rnd() * 120, x = hub.x + Math.cos(a) * d, y = hub.y + Math.sin(a) * d, k = 14 + rnd() * 22; g.poly([x, y, x + k * 2, y - k * 0.5, x + k * 0.5, y + k]).fill(0x0a0a0a); }
      burst.addChild(g);
    }
    c.addChild(burst);
    const items: { def: CommandItem; node: Container; hit: Container; ph: number }[] = [];
    set.items.forEach((it, i) => {
      const node = this.buildItem(it);
      const hit = this.hitBox(it.hit, () => { if (this.mode === name || (name === 'main' && this.mode === 'command')) { this.press(node); this.onCommand(it.id); } });
      c.addChild(node); c.addChild(hit);
      items.push({ def: it, node, hit, ph: i * 0.9 });
    });
    void eng;
    this.eng.st.layers.hud.addChildAt(c, 0);
    this.sets.set(name, { c, items, burst });
  }
  private buildItem(it: CommandItem) {
    const eng = this.eng, node = new Container();
    const word = ransom(this.lab(it.label), it.size, eng.fonts.display, { invert: it.invert, seed: it.label.length * 7 + it.size, stroke: Math.max(4, it.size * 0.1) });
    const b = word.getLocalBounds();
    word.pivot.set(b.x + b.width / 2, b.y + b.height / 2);
    // 红色楔形底（原作每个标签下的红块）+ 黑色牌
    const w = b.width + 34, h = it.size * 0.95;
    const back = new Graphics().poly([-w / 2 - 10, -h / 2 + 4, w / 2 + 16, -h / 2 - 6, w / 2 + 6, h / 2 + 6, -w / 2 - 18, h / 2 + 10]).fill(it.main ? hex(this.C.primary) : 0x0a0a0a).stroke({ color: 0xffffff, width: it.main ? 0 : 3 });
    if (it.main) back.poly([-w / 2 - 4, -h / 2 + 10, w / 2 + 8, -h / 2 + 2, w / 2, h / 2, -w / 2 - 12, h / 2 + 4]).stroke({ color: 0x0a0a0a, width: 4 });
    node.addChild(back, word);
    if (it.key) {
      const k = keyIcon(it.key, it.main ? 20 : 16); k.g.position.set(-w / 2 - 20, -h * 0.05);
      node.addChild(k.g);
      if (k.label) { const kt = txt(k.label, 14, { font: eng.fonts.display, fill: 0xffffff }); kt.anchor.set(0.5); kt.position.copyFrom(k.g.position); node.addChild(kt); }
    }
    if (it.sub) {
      const st = txt(this.lab(it.sub), Math.max(15, it.size * 0.3), { font: eng.fonts.body, fill: 0xffffff, fontWeight: '700' });
      st.anchor.set(0, 0.5);
      const sw = st.width + 18, sh = st.height + 4;
      const sp = new Graphics().poly([0, 0, sw, -2, sw - 6, sh, -4, sh + 2]).fill(0x0a0a0a);
      const sc = new Container(); sc.addChild(sp, st); st.position.set(9, sh / 2);
      sc.position.set(-w / 2 + 6, h / 2 + 2);
      node.addChild(sc);
    }
    node.position.set(it.x, it.y); node.rotation = it.rot;
    (node as any).base = { x: it.x, y: it.y };
    return node;
  }
  private press(n: Container) { (n as any).pressed = true; n.scale.set(this.eng.skin.tokens.motion.press); setTimeout(() => { (n as any).pressed = false; }, 90); }
  /** ui:open/close 不进 Director：自身过渡 ≤280ms，可被打断，动画中可点 */
  setMode(m: string) {
    this.mode = m; this.openT = 0;
    const show = (name: string, on: boolean) => { const s = this.sets.get(name); if (s) s.c.visible = on; };
    show('main', m === 'command'); show('holdup', m === 'holdup'); show('result', m === 'result');
    this.list.visible = m === 'list';
    this.result.visible = m === 'result';
    this.holdLogo.visible = m === 'holdup';
    this.order.visible = m === 'command' || m === 'list';
    this.party.visible = m !== 'result';
    this.top.visible = m !== 'result';
    this.over.visible = m !== 'result';
    this.reticle.visible = m === 'command' || m === 'list';
    const joker = this.eng.units.get('joker'); if (joker) joker.root.alpha = m === 'list' ? 0.55 : 1;
    if (m === 'result') { this.resultAnim.t = 0; const rs = this.sets.get('result'); if (rs) this.eng.st.layers.hud.addChild(rs.c); }
  }
  getMode() { return this.mode; }
  setBusy(b: boolean) { this.busy = b; }

  // ------------------------------------------------------------------ party cards
  private buildParty() {
    const sl = this.eng.skin.slots['hud.party'];
    const [x0, y0] = sl.rect; const { w, h, gap, rot } = sl.card;
    sl.units.forEach((id, i) => {
      const c = new Container(); c.position.set(x0 + 8 + i * (w + gap), y0 + 18); c.rotation = rot;
      const bg = plate(w, h, { fill: 0x0a0a0a, stroke: 0xffffff, sw: 2.5, skew: 12, shadow: 0x0a0a0a, sx: 4, sy: 4 }); bg.label = 'bg';
      const head = new Sprite(this.eng.frames[`atlas.hud#${id}`] ?? Texture.WHITE); head.anchor.set(0.5, 1); head.scale.set(0.62); head.position.set(30, h - 2);
      const hpL = txt('HP', 13, { font: this.eng.fonts.display, fill: 0xffffff }); hpL.position.set(66, 8);
      const spL = txt('SP', 13, { font: this.eng.fonts.display, fill: 0xffffff }); spL.position.set(66, 38);
      const hpT = txt('0', 28, { font: this.eng.fonts.number, fill: hex(this.C.hp), fontStyle: 'italic' }); hpT.anchor.set(1, 0); hpT.position.set(w - 14, 0);
      const spT = txt('0', 28, { font: this.eng.fonts.number, fill: hex(this.C.sp), fontStyle: 'italic' }); spT.anchor.set(1, 0); spT.position.set(w - 18, 30);
      const hp = new Graphics(), sp = new Graphics();
      c.addChild(bg, hp, sp, head, hpL, spL, hpT, spT);
      this.party.addChild(c);
      this.partyCards.set(id, { c, hp, sp, hpT, spT, st: { id, name: id, hp: 1, hpMax: 1, sp: 1, spMax: 1 }, shown: { hp: 1, sp: 1 }, shake: 0, base: { x: c.x, y: c.y } });
    });
  }
  updateParty(states: PartyState[]) {
    for (const s of states) {
      const pc = this.partyCards.get(s.id); if (!pc) continue;
      if (s.hp < pc.st.hp) pc.shake = 260;
      pc.st = { ...s };
      const bg = pc.c.getChildByLabel('bg') as Graphics;
      bg.tint = s.active ? hex(this.C.primary) : 0xffffff;
      pc.c.y = pc.base.y - (s.active ? 10 : 0);
    }
  }
  private drawParty(dt: number) {
    const w = this.eng.skin.slots['hud.party'].card.w;
    for (const pc of this.partyCards.values()) {
      const k = Math.min(1, dt / 110);
      pc.shown.hp += (pc.st.hp - pc.shown.hp) * k; pc.shown.sp += (pc.st.sp - pc.shown.sp) * k;
      if (Math.abs(pc.st.hp - pc.shown.hp) < 0.5) pc.shown.hp = pc.st.hp; if (Math.abs(pc.st.sp - pc.shown.sp) < 0.5) pc.shown.sp = pc.st.sp;
      pc.hpT.text = String(Math.round(pc.shown.hp)); pc.spT.text = String(Math.round(pc.shown.sp));
      const bw = w - 78, r1 = Math.max(0, pc.shown.hp / pc.st.hpMax), r2 = Math.max(0, pc.shown.sp / pc.st.spMax);
      pc.hp.clear().poly([64, 30, 64 + bw, 29, 62 + bw, 34, 62, 35]).fill(0x333333).poly([64, 30, 64 + bw * r1, 29.5, 62 + bw * r1, 34, 62, 35]).fill(hex(this.C.hp));
      pc.sp.clear().poly([60, 62, 60 + bw, 61, 58 + bw, 66, 58, 67]).fill(0x333333).poly([60, 62, 60 + bw * r2, 61.5, 58 + bw * r2, 66, 58, 67]).fill(hex(this.C.sp));
      if (pc.shake > 0) { pc.shake -= dt; pc.c.x = pc.base.x + (Math.random() - 0.5) * 10 * (pc.shake / 260); } else pc.c.x = pc.base.x;
    }
  }

  // ------------------------------------------------------------------ top-left strip / navigator / system
  private orderStrip = new Container(); private orderChips = new Container(); private turnText!: Text;
  private buildTop() {
    const [x, y, w] = this.eng.skin.slots['hud.order'].rect;
    this.order.position.set(x, y);
    this.order.addChild(this.orderStrip, this.orderChips);
    // navigator bubble
    const [tx, ty, tw, th] = this.eng.skin.slots['hud.topInfo'].rect;
    const b = new Graphics().poly([tx + 10, ty + 6, tx + tw - 70, ty, tx + tw - 80, ty + th - 14, tx + tw - 100, ty + th - 14, tx + tw - 118, ty + th + 8, tx + tw - 130, ty + th - 12, tx, ty + th - 6]).fill(0xffffff).stroke({ color: 0x0a0a0a, width: 4 });
    const head = new Sprite(this.eng.frames['atlas.hud#navi'] ?? Texture.WHITE); head.anchor.set(0.5, 1); head.scale.set(0.72); head.position.set(tx + tw - 34, ty + th + 4);
    const hb = new Graphics().circle(tx + tw - 34, ty + th / 2 + 2, 40).fill(0x0a0a0a).stroke({ color: 0xffffff, width: 3 });
    const m = new Graphics().circle(tx + tw - 34, ty + th / 2 + 2, 37).fill(0xffffff); head.mask = m;
    this.naviText = txt('', 20, { font: this.eng.fonts.body, fill: 0x0a0a0a, fontWeight: '700', wordWrap: true, wordWrapWidth: tw - 150, breakWords: true, lineHeight: 28 });
    this.naviText.position.set(tx + 22, ty + 14);
    this.top.addChild(b, hb, head, m, this.naviText);
    void w;
  }
  navi(key: string) { this.naviText.text = this.lab(key); }
  setStrip(o: { lv: number; name: string; weak: string[]; known: boolean; turn: number; order: string[]; enemyTurn?: boolean }) {
    const eng = this.eng; const s = this.orderStrip; s.removeChildren().forEach((c) => c.destroy({ children: true }));
    const w = 470;
    s.addChild(new Graphics().poly([0, 10, w, 0, w - 14, 56, -10, 62]).fill(0x0a0a0a).stroke({ color: 0xffffff, width: 3 }));
    const lvb = new Graphics().poly([8, 14, 74, 12, 68, 54, 2, 56]).fill(hex(this.C.primary));
    const lv = txt('Lv', 16, { font: eng.fonts.display, fill: 0xffffff }); lv.position.set(12, 15);
    const lvn = txt(String(o.lv), 30, { font: eng.fonts.number, fill: 0xffffff, fontStyle: 'italic' }); lvn.position.set(34, 16);
    const nm = txt(o.name.split('').join(' '), 30, { font: eng.fonts.display, fill: 0xffffff }); nm.position.set(88, 14);
    s.addChild(lvb, lv, lvn, nm);
    let ix = 100 + nm.width;
    for (const e of o.weak) { const ic = elemIcon(e, 14); ic.position.set(ix, 34); s.addChild(ic); const wk = txt('WEAK', 12, { font: eng.fonts.display, fill: hex(this.C.primary) }); wk.anchor.set(0.5, 0); wk.position.set(ix, 48); s.addChild(wk); ix += 40; }
    if (!o.known) { const q = txt('?', 26, { font: eng.fonts.display, fill: 0x888888 }); q.position.set(ix - 8, 16); s.addChild(q); }
    // 行动顺序（原创补充：P5X 式）
    const ch = this.orderChips; ch.removeChildren().forEach((c) => c.destroy({ children: true }));
    const tb = new Graphics().poly([0, 0, 92, -3, 86, 22, -4, 25]).fill(o.enemyTurn ? 0xffffff : hex(this.C.primary));
    this.turnText = txt(`${o.enemyTurn ? 'ENEMY' : 'TURN'} ${String(o.turn).padStart(2, '0')}`, 18, { font: eng.fonts.display, fill: o.enemyTurn ? 0x0a0a0a : 0xffffff });
    this.turnText.position.set(8, 1);
    ch.addChild(tb, this.turnText);
    o.order.slice(0, 6).forEach((id, i) => {
      const x = 104 + i * 40, g = new Graphics().poly([x, 0, x + 34, -2, x + 30, 24, x - 4, 26]).fill(i === 0 ? 0xffffff : 0x0a0a0a).stroke({ color: 0xffffff, width: 2 });
      ch.addChild(g);
      const tex = eng.frames[`atlas.hud#${id}`];
      if (tex) { const sp = new Sprite(tex); sp.width = sp.height = 30; sp.position.set(x, -4); ch.addChild(sp); }
      else { const e = txt(id === 'noisy' ? '聒' : '游', 16, { font: eng.fonts.display, fill: i === 0 ? 0x0a0a0a : hex(this.C.primary) }); e.anchor.set(0.5); e.position.set(x + 15, 12); ch.addChild(e); }
    });
    ch.position.set(6, 70);
  }
  private buildSystem() {
    for (const b of this.eng.skin.slots['hud.system'].buttons) {
      const [x, y, w, h] = b.hit, cx = x + w / 2, cy = y + 34;
      const g = new Graphics().poly([cx - 34, cy - 22, cx + 36, cy - 26, cx + 32, cy + 22, cx - 38, cy + 26]).fill(0x0a0a0a).stroke({ color: 0xffffff, width: 2.5 });
      const t = txt(this.lab(b.label), 22, { font: this.eng.fonts.display, fill: 0xffffff }); t.anchor.set(0.5); t.position.set(cx, cy);
      t.label = 'sys.' + b.id;
      this.sys.addChild(g, t, this.hitBox(b.hit, () => this.onSystem(b.id)));
    }
  }
  setSys(id: string, text: string, on: boolean) {
    const t = this.sys.getChildByLabel('sys.' + id) as Text; if (t) { t.text = text; t.style.fill = on ? hex(this.C.primary) : 0xffffff; }
  }

  // ------------------------------------------------------------------ enemies over-head + target reticle
  private buildReticle() {
    const g = new Graphics(); const pts: number[] = [];
    for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2, r = i % 2 ? 46 : 62; pts.push(Math.cos(a) * r, Math.sin(a) * r * 0.9); }
    g.poly(pts).fill({ color: hex(this.C.primary), alpha: 0.95 }).stroke({ color: 0x0a0a0a, width: 3 });
    g.circle(0, 0, 36).fill(0x0a0a0a);
    const heart = new Graphics(); heart.label = 'heart';
    const arrow = new Graphics().poly([-16, -100, 16, -100, 0, -76]).fill(hex(this.C.primary)).stroke({ color: 0xffffff, width: 3 });
    this.reticle.addChild(g, heart, arrow);
    this.reticle.visible = false; this.reticle.scale.set(0.8);
  }
  private heartPoly(s: number) { return [0, 18 * s, -22 * s, -2 * s, -22 * s, -14 * s, -12 * s, -22 * s, 0, -14 * s, 12 * s, -22 * s, 22 * s, -14 * s, 22 * s, -2 * s]; }
  setTarget(id: string) { this.targetId = id; }
  updateEnemies(es: EnemyState[]) {
    for (const e of es) {
      let c = this.overs.get(e.id);
      const u = this.eng.units.get(e.id); if (!u) continue;
      if (!c) {
        c = new Container(); this.over.addChild(c); this.overs.set(e.id, c);
        // tap target
        u.root.eventMode = 'static'; u.root.cursor = 'pointer';
        u.root.hitArea = new Rectangle(-Math.max(70, u.tex.width * u.s * 0.45), -u.h, Math.max(140, u.tex.width * u.s * 0.9), u.h + 20);
        u.root.on('pointertap', () => this.onEnemy(e.id));
      }
      c.removeChildren().forEach((x) => x.destroy({ children: true }));
      c.visible = e.alive;
      const nm = txt(e.name, 20, { font: this.eng.fonts.display, fill: 0xffffff });
      const w = nm.width + 26;
      const bg = new Graphics().poly([0, 2, w, 0, w - 8, 28, -6, 30]).fill(0x0a0a0a).stroke({ color: 0xffffff, width: 2 });
      nm.position.set(10, 3);
      c.addChild(bg, nm);
      let ix = w + 18;
      for (const k of e.known) { const ic = elemIcon(k, 12); ic.position.set(ix, 15); c.addChild(ic); if (e.weak.includes(k)) { const wk = txt('WK', 11, { font: this.eng.fonts.display, fill: 0xffffff, stroke: { color: hex(this.C.primary), width: 4 } }); wk.anchor.set(0.5); wk.position.set(ix, 32); c.addChild(wk); } ix += 30; }
      const hpw = 110, r = Math.max(0, e.hp / e.hpMax);
      c.addChild(new Graphics().poly([0, 36, hpw, 35, hpw - 3, 42, -3, 43]).fill(0x0a0a0a).poly([0, 36, hpw * r, 35.5, hpw * r - 3, 42, -3, 43]).fill(hex(this.C.primary)));
      c.position.set(u.home.x - w / 2, u.home.y + u.headY + this.eng.skin.slots['hud.enemyOver'].dy - 30);
      (c as any).hpR = r;
    }
  }

  // ------------------------------------------------------------------ list (skills / items / order)
  openList(kind: 'persona' | 'item' | 'order', rows: ListRow[], sub: string) {
    const eng = this.eng, sl = eng.skin.slots['hud.command'].list;
    this.list.removeChildren().forEach((c) => c.destroy({ children: true }));
    this.listRows = [];
    // title: PERSONA 剪报字 + 面具名斜条
    const [tx, ty, tw] = sl.title;
    const tt = ransom(this.lab('list.' + kind), 62, eng.fonts.display, { invert: kind === 'persona' ? [0, 5] : [0], seed: 31, stroke: 7 });
    const tb = tt.getLocalBounds(); tt.position.set(tx + 10 - tb.x, ty + 36); tt.rotation = -0.06;
    const nb = new Graphics().poly([tx + tb.width + 30, ty + 26, tx + tw, ty + 18, tx + tw - 10, ty + 66, tx + tb.width + 22, ty + 72]).fill(hex(this.C.primary)).stroke({ color: 0x0a0a0a, width: 3 });
    const nt = txt(sub, 34, { font: eng.fonts.display, fill: 0xffffff, stroke: { color: 0x0a0a0a, width: 5 } }); nt.position.set(tx + tb.width + 44, ty + 26);
    this.list.addChild(nb, tt, nt);
    // desc
    const [dx, dy, dw, dh] = sl.desc;
    const db = new Graphics().poly([dx + 4, dy + 6, dx + dw, dy, dx + dw - 10, dy + dh, dx - 6, dy + dh - 4]).fill(0xf4eedd).stroke({ color: 0x0a0a0a, width: 4 });
    this.listDesc = txt('', 22, { font: eng.fonts.body, fill: 0x0a0a0a, fontWeight: '700', wordWrap: true, wordWrapWidth: dw - 40, breakWords: true, lineHeight: 30 });
    this.listDesc.position.set(dx + 18, dy + 14);
    this.list.addChild(db, this.listDesc);
    // rows (+ back)
    const all = [...rows, { id: 'back', name: this.lab('cmd.back'), desc: '', element: 'back', cost: this.lab('cmd.back.sub') } as ListRow];
    const [rx, ry, rw] = sl.rect; const rh = sl.rowH;
    all.forEach((row, i) => {
      const c = new Container(); const y = ry + i * rh;
      const w = rw - 18 - ((i * 37) % 3) * 14;   // 锯齿右缘
      const bg = new Graphics();
      const ic = elemIcon(row.element ?? 'almighty', 20); ic.position.set(rx + 40, y + rh / 2);
      const name = txt(row.name, 40, { font: eng.fonts.display, fill: row.disabled ? 0x777777 : 0xffffff }); name.anchor.set(0, 0.5); name.position.set(rx + 72, y + rh / 2);
      c.addChild(bg, ic, name);
      if (row.cost) {
        const col = row.costKind === 'sp' ? hex(this.C.sp) : row.costKind === 'hp' ? hex(this.C.hp) : 0xffffff;
        const ct = txt(row.cost, row.id === 'back' ? 22 : 32, { font: row.id === 'back' ? eng.fonts.body : eng.fonts.number, fill: row.disabled ? 0x777777 : col, fontStyle: row.id === 'back' ? 'normal' : 'italic', fontWeight: '700' });
        ct.anchor.set(1, 0.5); ct.position.set(rx + w - 30, y + rh / 2); c.addChild(ct);
      }
      c.addChild(this.hitBox([rx, y, rw, rh], () => this.tapRow(i)));
      this.list.addChild(c);
      this.listRows.push({ row, c, bg, w });
    });
    this.listSel = 0; this.paintRows();
    this.list.pivot.set(1018, 470); this.list.position.set(1018, 470); this.list.rotation = -0.035;
  }
  private paintRows() {
    const sl = this.eng.skin.slots['hud.command'].list; const [rx, ry] = sl.rect; const rh = sl.rowH;
    this.listRows.forEach((r, i) => {
      const y = ry + i * rh, sel = i === this.listSel, ext = sel ? 18 : 0;
      r.bg.clear().poly([rx - ext, y + 10, rx + r.w + ext, y + 4, rx + r.w - 10 + ext, y + rh - 6, rx - 8 - ext, y + rh - 2]).fill(sel ? hex(this.C.primary) : 0x0a0a0a).stroke({ color: sel ? 0xffffff : 0x0a0a0a, width: sel ? 4 : 2 });
      if (sel) r.bg.poly([rx - 34 - ext, y + rh / 2 - 12, rx - 12 - ext, y + rh / 2, rx - 34 - ext, y + rh / 2 + 12]).fill(0xffffff);
      r.c.scale.set(1);
    });
    const row = this.listRows[this.listSel]?.row; if (row) this.listDesc.text = row.desc || this.lab('cmd.back.sub');
  }
  /** 第一次点选中（显示说明），再点同一行确认（触屏版的「○确认」） */
  tapRow(i: number) {
    if (this.mode !== 'list') return;
    const r = this.listRows[i]; if (!r) return;
    if (r.row.id === 'back') { this.onRow('back'); return; }
    if (this.listSel !== i) { this.listSel = i; this.paintRows(); return; }
    if (r.row.disabled) return;
    this.onRow(r.row.id);
  }

  // ------------------------------------------------------------------ hold up
  private holdRing = new Container();
  private buildHoldLogo() {
    const t = ransom(this.lab('label.holdup'), 64, this.eng.fonts.display, { invert: [0, 5], seed: 4, stroke: 7 });
    const b = t.getLocalBounds(); t.position.set(40 - b.x, 60); t.rotation = -0.08;
    this.holdLogo.addChild(t);
    this.eng.st.layers.ally.addChild(this.holdRing);
  }
  setHoldRing(on: boolean, enemyIds: string[] = [], party: string[] = []) {
    this.holdRing.removeChildren().forEach((c) => c.destroy({ children: true }));
    this.holdRing.visible = on; if (!on) return;
    const es = enemyIds.map((i) => this.eng.units.get(i)!).filter(Boolean);
    const cx = es.reduce((a, u) => a + u.home.x, 0) / Math.max(1, es.length), cy = es.reduce((a, u) => a + u.home.y, 0) / Math.max(1, es.length);
    const spots = [[-300, 30, 0.8], [300, 40, 0.82], [-170, 150, 0.95], [190, 160, 0.98]];
    party.forEach((id, i) => {
      const tex = this.eng.frames[`atlas.party#${id}`]; if (!tex) return;
      const s = new Sprite(tex); s.anchor.set(0.5, 1); s.tint = hex(this.C.primary); s.alpha = 0.92;
      const [dx, dy, sc] = spots[i % 4]; s.position.set(cx + dx, cy + dy); s.scale.set((dx < 0 ? 1 : -1) * sc, sc);
      const o = new Sprite(tex); o.anchor.set(0.5, 1); o.tint = 0x0a0a0a; o.position.set(s.x + 6, s.y + 4); o.scale.copyFrom(s.scale);
      this.holdRing.addChild(o, s);
    });
  }

  // ------------------------------------------------------------------ result
  showResult(d: ResultData) {
    const eng = this.eng, R = this.result; R.removeChildren().forEach((c) => c.destroy({ children: true }));
    const v = eng.st.vis;
    const bg = new Graphics().rect(v.l - 20, v.t - 20, v.r - v.l + 40, v.b - v.t + 40).fill(0x3a3a3a);
    for (let y = v.t; y < v.b; y += 18) for (let x = v.l + ((y / 18) % 2) * 9; x < v.r; x += 18) bg.circle(x, y, 2.2).fill({ color: 0x555555, alpha: 0.8 });
    const art = new Sprite(eng.tex['result.hero.grey']); art.anchor.set(0.5, 1); art.scale.set(1.18); art.position.set(1010, 760);
    // 红色闪电折线
    const z = new Graphics().poly([v.l - 20, 560, 330, 470, 290, 540, 700, 330, 620, 420, 1060, 110, 1000, 230, v.r + 20, -40, v.r + 20, 40, 1080, 300, 1140, 220, 760, 520, 830, 450, 420, 650, 470, 600, v.l - 20, 720]).fill(0xb10f15).stroke({ color: 0x0a0a0a, width: 6 });
    const z2 = new Graphics().poly([v.l - 20, 720, 400, 600, 360, 680, 820, 500, 760, 600, v.r + 20, 400, v.r + 20, 480, 900, 640, 940, 580, v.l - 20, v.b + 20]).fill(0x7a0a0e);
    R.addChild(bg, art, z2, z);
    this.resultAnim = { t: 0, data: d, nums: [], blocks: [] };
    // EXP burst
    const exp = new Container(); exp.position.set(460, 250);
    const sp: number[] = []; for (let i = 0; i < 26; i++) { const a = (i / 26) * Math.PI * 2, r = i % 2 ? 70 : 128 + (i % 3) * 14; sp.push(Math.cos(a) * r * 1.4, Math.sin(a) * r * 0.75); }
    exp.addChild(new Graphics().poly(sp).fill(0x0a0a0a).stroke({ color: 0xffffff, width: 4 }));
    const en = txt('0', 76, { font: eng.fonts.number, fill: 0xffe14a, fontStyle: 'italic', stroke: { color: 0x0a0a0a, width: 6 } }); en.anchor.set(0.5); exp.addChild(en);
    const el = txt(this.lab('result.exp'), 40, { font: eng.fonts.display, fill: 0xffe14a, stroke: { color: 0x0a0a0a, width: 6 } }); el.position.set(110, 30); el.rotation = 0.2; exp.addChild(el);
    if (d.bonus) { const b = this.sticker(this.lab('result.bonus')); b.position.set(10, -120); exp.addChild(b); }
    R.addChild(exp); this.resultAnim.nums.push({ t: en, v: d.exp, fmt: (n) => n.toLocaleString('en-US') }); this.resultAnim.blocks.push(exp);
    // MONEY
    const mo = new Container(); mo.position.set(820, 470);
    mo.addChild(new Graphics().poly([-200, -50, 220, -80, 200, 60, -220, 80]).fill(0xb10f15).stroke({ color: 0x0a0a0a, width: 5 }));
    const mn = txt('¥0', 72, { font: eng.fonts.number, fill: 0xffe14a, fontStyle: 'italic', stroke: { color: 0x0a0a0a, width: 6 } }); mn.anchor.set(0.5); mn.position.set(0, -6); mo.addChild(mn);
    const ml = txt(this.lab('result.money'), 46, { font: eng.fonts.display, fill: 0xffe14a, stroke: { color: 0x0a0a0a, width: 6 } }); ml.position.set(-120, 46); ml.rotation = -0.08; mo.addChild(ml);
    R.addChild(mo); this.resultAnim.nums.push({ t: mn, v: d.money, fmt: (n) => '¥' + n.toLocaleString('en-US') }); this.resultAnim.blocks.push(mo);
    // ITEM
    const itc = new Container(); itc.position.set(60, 470);
    itc.addChild(new Graphics().poly([0, 0, 520, 30, 510, 110, -10, 80]).fill(0x0a0a0a).poly([10, 10, 505, 38, 497, 100, 2, 72]).fill(0x4a4a4a));
    const names = d.items.length ? d.items.map((i) => `${i.name} ×${i.n}`).join('  ') : this.lab('result.none');
    const itn = txt(names, d.items.length ? 34 : 46, { font: eng.fonts.display, fill: d.items.length ? 0xffffff : 0x9a9a9a }); itn.position.set(40, 28); itn.rotation = 0.05; itc.addChild(itn);
    const itl = txt(this.lab('result.item'), 52, { font: eng.fonts.display, fill: 0xffffff, stroke: { color: 0x0a0a0a, width: 7 } }); itl.position.set(150, 110); itl.rotation = -0.06; itc.addChild(itl);
    R.addChild(itc); this.resultAnim.blocks.push(itc);
    const title = ransom(this.lab('result.title'), 70, eng.fonts.display, { invert: [0, 3], seed: 2, stroke: 7 }); title.position.set(60, 90); title.rotation = -0.08;
    R.addChild(title); this.resultAnim.blocks.push(title);
    this.resultAnim.blocks.forEach((b) => ((b as any).bx = b.x));
    this.setMode('result');
  }
  private sticker(s: string) {
    const c = new Container(); const t = txt(s, 46, { font: this.eng.fonts.display, fill: 0x0a0a0a }); t.anchor.set(0.5);
    const w = t.width + 30; c.addChild(new Graphics().poly([-w / 2, -30, w / 2, -38, w / 2 - 6, 30, -w / 2 - 6, 36]).fill(0xffe14a).stroke({ color: 0x0a0a0a, width: 5 }), t); c.rotation = -0.14; return c;
  }

  // ------------------------------------------------------------------ per-frame
  update(dt: number) {
    this.t += dt; this.openT += dt;
    // command sets: open pop from hub (≤220ms, staggered), idle breathing, hidden while busy
    for (const [name, s] of this.sets) {
      if (!s.c.visible) continue;
      const set = this.eng.skin.slots['hud.command'].sets[name] as CommandSet;
      s.c.alpha = this.busy ? 0 : 1;
      s.items.forEach((it, i) => {
        const vis = !it.def.when || (it.def.when === 'onemore' && this.oneMore);
        it.node.visible = vis; it.hit.eventMode = vis && !this.busy ? 'static' : 'none';
        const k = ease.outBack(Math.min(1, Math.max(0, (this.openT - i * 22) / 180)));
        const b = (it.node as any).base;
        it.node.x = set.hub.x + (b.x - set.hub.x) * k; it.node.y = set.hub.y + (b.y - set.hub.y) * k;
        if (!(it.node as any).pressed) it.node.scale.set((0.4 + 0.6 * k) * (1 + 0.012 * Math.sin(this.t / 420 + it.ph)));
      });
      s.burst.alpha = Math.min(1, this.openT / 160);
      s.burst.scale.set(1);
    }
    if (this.list.visible) { const k = Math.min(1, this.openT / 200); this.list.x = 1018 + (1 - ease.outBack(k)) * 260; this.list.alpha = this.busy ? 0 : k; }
    this.drawParty(dt);
    // reticle on target
    const u = this.eng.units.get(this.targetId);
    if (u && this.reticle.visible && !this.busy) {
      this.reticle.alpha = 1;
      this.reticle.position.set(u.root.x, u.root.y + u.hitY + Math.sin(this.t / 160) * 5);
      this.reticle.rotation = Math.sin(this.t / 600) * 0.05;
      const r = (this.overs.get(this.targetId) as any)?.hpR ?? 1;
      const h = this.reticle.getChildByLabel('heart') as Graphics;
      if ((h as any).lastR !== r) {
        (h as any).lastR = r;
        // 心形 HP：深色心底 + 按 HP 比例的青色水位（用多边形与水平线求交，不用遮罩）
        const hp = this.heartPoly(1.15), top = -25, bot = 21, lvl = bot - (bot - top) * r;
        const clip: number[] = [];
        for (let i = 0; i < hp.length; i += 2) {
          const x1 = hp[i], y1 = hp[i + 1], x2 = hp[(i + 2) % hp.length], y2 = hp[(i + 3) % hp.length];
          if (y1 >= lvl) clip.push(x1, y1);
          if ((y1 - lvl) * (y2 - lvl) < 0) { const k = (lvl - y1) / (y2 - y1); clip.push(x1 + (x2 - x1) * k, lvl); }
        }
        h.clear().poly(hp).fill(0x222222);
        if (clip.length >= 6) h.poly(clip).fill(0x37d6e8);
        h.poly(hp).stroke({ color: 0xffffff, width: 3 });
      }
    } else this.reticle.alpha = 0;
    this.over.alpha = this.busy ? 0.0 : 1;
    // result count-up + block slide
    if (this.result.visible && this.resultAnim.data) {
      const A = this.resultAnim; A.t += dt;
      A.blocks.forEach((b, i) => { const k = ease.outCubic(Math.min(1, Math.max(0, (A.t - i * 80) / 220))); b.x = (b as any).bx - (1 - k) * 600; b.alpha = k; });
      A.nums.forEach((n) => { const k = Math.min(1, Math.max(0, (A.t - 200) / 900)); n.t.text = n.fmt(Math.round(n.v * ease.outCubic(k))); });
    }
  }
  private drawDebug() {
    const g = new Graphics();
    for (const set of Object.values(this.eng.skin.slots['hud.command'].sets) as CommandSet[]) for (const it of set.items) g.rect(...it.hit).stroke({ color: 0x00ff00, width: 2 });
    for (const b of this.eng.skin.slots['hud.system'].buttons) g.rect(...b.hit).stroke({ color: 0x00ffff, width: 2 });
    const sl = this.eng.skin.slots['hud.command'];
    g.rect(...sl.rect).stroke({ color: 0xffff00, width: 2 });
    g.rect(0, 0, 1280, 720).stroke({ color: 0xff00ff, width: 3 });
    this.eng.st.layers.hud.addChild(g);
  }
  /** 测试：所有命中区（设计坐标） */
  hitRects() {
    const out: { id: string; set: string; rect: Rect; main: boolean }[] = [];
    for (const [n, set] of Object.entries(this.eng.skin.slots['hud.command'].sets) as [string, CommandSet][]) for (const it of set.items) out.push({ id: it.id, set: n, rect: it.hit, main: !!it.main });
    return out;
  }
}
