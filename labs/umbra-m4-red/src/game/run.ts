// 一局（委托 → 潜入 → BOSS → 结算）的规则状态：零 DOM。存档形状参考 UmbraSaveV4（只放内存 + localStorage 简版）。
import ROOMS from './data/rooms.json';
import REQ from './data/requests.json';
import ECO from './data/economy.json';
import { Explore, type Room } from './explore';
import { ROSTER, LEAD, DEFAULT_PARTY } from './battle';

export interface Member { id: string; lv: number; hp: number; hpMax: number; sp: number; spMax: number; exp: number }
export interface Card { id: string; series: 'atk' | 'weak' | 'baton' | 'talk'; rarity: 'normal' | 'rare' }
export interface NodeDef { kind: string; room?: Room; mirror?: boolean; choice?: 'safe' | 'risk' }

/** mulberry32（32 位整数运算），种子可复现（同一委托 = 同一张图） */
export class Rng { constructor(public s: number) {} next() { let t = (this.s = (this.s + 0x6d2b79f5) | 0); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  pick<T>(a: T[]) { return a[Math.floor(this.next() * a.length)]; } }
export const expNext = (lv: number) => ECO.exp.base + lv * ECO.exp.per;

/** 跨局存档（据点）：队伍等级/经验、金钱、道具 */
export class Save {
  money = 12000;
  items: Record<string, number> = { medicine: 3, snuff: 1 };
  party: string[] = [LEAD, ...DEFAULT_PARTY];
  members: Record<string, Member> = {};
  cleared: string[] = [];
  stats = { ...ECO.stats } as Record<string, number>;
  constructor() {
    for (const [id, r] of Object.entries(ROSTER)) this.members[id] = { id, lv: r.lv, hp: r.hp, hpMax: r.hp, sp: r.sp, spMax: r.sp, exp: 0 };
    try { const j = JSON.parse(localStorage.getItem('umbra.m4.save') ?? 'null'); if (j && j.v === 1) Object.assign(this, j.d); } catch { /* */ }
  }
  persist() { try { localStorage.setItem('umbra.m4.save', JSON.stringify({ v: 1, d: { money: this.money, items: this.items, party: this.party, members: this.members, cleared: this.cleared } })); } catch { /* */ } }
  restAll() { for (const m of Object.values(this.members)) { m.hp = m.hpMax; m.sp = m.spMax; } }
}

export class Run {
  req: (typeof REQ.requests)[number];
  rng: Rng;
  nodes: NodeDef[] = [];
  idx = 0;
  alert = 0;
  callingCard = false;
  cards: Card[] = [];
  battles = 0; turns = 0; spotted = 0;
  gain = { exp: 0, money: 0, items: {} as Record<string, number>, levelUps: [] as { id: string; from: number; to: number }[] };
  startLv: Record<string, number> = {};
  explore: Explore | null = null;
  forkChoice: 'safe' | 'risk' | null = null;
  treasure = false;
  constructor(public save: Save, reqId: string) {
    this.req = REQ.requests.find((r) => r.id === reqId) ?? REQ.requests[0];
    this.rng = new Rng(this.req.seed);
    // 按种子抽模板 + 镜像（GDD §20）。fork 节点在玩家选路时再定房间。
    for (const k of REQ.route) {
      if (k === 'gate') this.nodes.push({ kind: 'gate', room: { ...this.rng.pick((ROOMS as any).gate as Room[]), kind: 'gate' }, mirror: this.rng.next() < 0.5 });
      else this.nodes.push({ kind: k });
    }
    for (const id of save.party) this.startLv[id] = save.members[id].lv;
  }
  get node() { return this.nodes[this.idx]; }
  get alertMax() { return this.alert >= 100; }
  addAlert(d: number) { this.alert = Math.max(0, Math.min(100, this.alert + d)); return this.alert; }
  choose(c: 'safe' | 'risk') {
    this.forkChoice = c; const kind = (REQ.fork as any)[c] as string;
    this.node.room = { ...this.rng.pick((ROOMS as any)[kind] as Room[]), kind }; this.node.choice = c; this.node.mirror = false;
  }
  enterNode() { const n = this.node; this.explore = n.room ? new Explore(n.room, !!n.mirror) : null; return this.explore; }
  next() { this.idx++; this.explore = null; return this.node; }
  /** 心之卡：战后三选一（§17）。四系，同系 3 张触发套装 */
  cardOffer(rare = false): Card[] {
    const S: Card['series'][] = ['atk', 'weak', 'baton', 'talk'];
    const out: Card[] = []; const used = new Set<string>();
    let guard = 0;
    while (out.length < 3 && guard++ < 200) { const s = this.rng.pick(S); const r = rare && out.length === 0 ? 'rare' : 'normal'; const id = `${s}.${r}`; if (used.has(s)) continue; used.add(s); out.push({ id, series: s, rarity: r }); }
    return out;
  }
  count(series: string) { return this.cards.filter((c) => c.series === series).length; }
  setOn(series: string) { return this.count(series) >= 3; }
  /** 给战斗规则层的修正（只读数据表） */
  mods() {
    const C = ECO.cards as any;
    const rareK = (s: string) => this.cards.filter((c) => c.series === s).reduce((a, c) => a + (c.rarity === 'rare' ? 2 : 1), 0);
    return {
      dmg: 1 + rareK('atk') * C.atk.dmg + (this.setOn('atk') ? C.atk.set : 0),
      weakDmg: 1 + rareK('weak') * C.weak.weakDmg + (this.setOn('weak') ? C.weak.set : 0),
      batonK: this.setOn('baton') ? C.baton.set : 1,
      talk: rareK('talk') * C.talk.talk + (this.setOn('talk') ? C.talk.set : 0),
      enemyAtk: this.alertMax ? 1.3 : 1, enemyHp: this.alertMax ? 1.2 : 1, drop: this.alertMax ? 2 : 1,
      boss: this.callingCard ? { hp: REQ.callingCard.bossHp, atk: REQ.callingCard.bossAtk } : { hp: 1, atk: 1 },
    };
  }
  /** 战后：经验/金钱/掉落入账，返回升级列表（规则先提交） */
  award(exp: number, money: number, drops: { id: string; n: number }[]) {
    const ups: { id: string; from: number; to: number; hp: number; sp: number }[] = [];
    for (const id of this.save.party) {
      const m = this.save.members[id]; m.exp += exp; const from = m.lv; let hp = 0, sp = 0;
      while (m.exp >= expNext(m.lv)) { m.exp -= expNext(m.lv); m.lv++; const dh = ECO.levelGain.hp[0] + (m.lv + id.length) % (ECO.levelGain.hp[1] - ECO.levelGain.hp[0] + 1); const ds = ECO.levelGain.sp[0] + (m.lv * 3 + id.length) % (ECO.levelGain.sp[1] - ECO.levelGain.sp[0] + 1); m.hpMax += dh; m.spMax += ds; m.hp += dh; m.sp += ds; hp += dh; sp += ds; }
      if (m.lv > from) { ups.push({ id, from, to: m.lv, hp, sp }); const g = this.gain.levelUps.find((l) => l.id === id); if (g) g.to = m.lv; else this.gain.levelUps.push({ id, from, to: m.lv }); }
    }
    this.gain.exp += exp; this.gain.money += money; this.save.money += money;
    for (const d of drops) { this.gain.items[d.id] = (this.gain.items[d.id] ?? 0) + d.n; this.save.items[d.id] = (this.save.items[d.id] ?? 0) + d.n; }
    return ups;
  }
  loot(l: { money?: number; item?: string; n?: number; card?: string }) {
    if (l.money) { this.gain.money += l.money; this.save.money += l.money; }
    if (l.item) { this.gain.items[l.item] = (this.gain.items[l.item] ?? 0) + (l.n ?? 1); this.save.items[l.item] = (this.save.items[l.item] ?? 0) + (l.n ?? 1); }
  }
  safeRest() { this.save.restAll(); return this.addAlert(ECO.alert.safe); }
  rank() { const s = (this.spotted === 0 ? 2 : this.spotted === 1 ? 1 : 0) + (this.alert < 40 ? 1 : 0) + (this.turns / Math.max(1, this.battles) <= 3 ? 1 : 0); return s >= 4 ? 'S' : s >= 2 ? 'A' : 'B'; }
  finish() { const r = this.req.reward; this.save.money += r.money; this.gain.money += r.money; if (!this.save.cleared.includes(this.req.id)) this.save.cleared.push(this.req.id); this.save.persist(); }
}
export { REQ, ECO };
