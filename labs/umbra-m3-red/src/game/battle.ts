// 规则层（M3 样板用的固定杂兵战）：零 DOM、零画布。只算结果并「提交」到日志（带 action key，幂等），
// 演出层拿到的是提交后的结果拷贝（§3.1-1：先提交，再演出）。
import type { HitResult } from '../umbra/skins/_contract';

export interface Unit { id: string; name: string; side: 'ally' | 'enemy'; lv: number; hp: number; hpMax: number; sp: number; spMax: number;
  weak: string[]; known: string[]; down: boolean; guard: boolean; atk: number }
export interface Skill { id: string; name: string; element: string; kind: 'phys' | 'magic' | 'buff' | 'gun'; power: number; cost: number; costKind: 'sp' | 'hp' | 'n'; desc: string }

export const SKILLS: Record<string, Skill> = {
  attack: { id: 'attack', name: 'skill.attack.name', element: 'phys', kind: 'phys', power: 70, cost: 0, costKind: 'n', desc: '' },
  gun: { id: 'gun', name: 'skill.gun.name', element: 'gun', kind: 'gun', power: 55, cost: 0, costKind: 'n', desc: '' },
  eiha: { id: 'eiha', name: 'skill.eiha.name', element: 'curse', kind: 'magic', power: 120, cost: 4, costKind: 'sp', desc: 'skill.eiha.desc' },
  cleave: { id: 'cleave', name: 'skill.cleave.name', element: 'phys', kind: 'phys', power: 110, cost: 18, costKind: 'hp', desc: 'skill.cleave.desc' },
  sukunda: { id: 'sukunda', name: 'skill.sukunda.name', element: 'support', kind: 'buff', power: 0, cost: 6, costKind: 'sp', desc: 'skill.sukunda.desc' },
};
export const PERSONA_SKILLS = ['eiha', 'cleave', 'sukunda'];
export const ITEMS = [{ id: 'medicine', name: 'item.medicine.name', desc: 'item.medicine.desc', n: 3 }, { id: 'snuff', name: 'item.snuff.name', desc: 'item.snuff.desc', n: 1 }];

export interface Commit { key: string; kind: string; payload: unknown }

export class Battle {
  units = new Map<string, Unit>();
  party = ['joker', 'agathion', 'caitsith', 'kelpie'];
  enemies = ['noisy', 'echo'];
  turn = 1;
  id = 0;
  seq = 0;
  oneMore = false;
  log: Commit[] = [];
  private keys = new Set<string>();
  private seed = 20261022;
  items = ITEMS.map((i) => ({ ...i }));
  constructor() { this.reset(); }
  rnd() { this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff; return this.seed / 0x7fffffff; }
  reset() {
    this.id++; this.units.clear(); this.turn = 1; this.seq = 0; this.oneMore = false; this.seed = 20261022; this.items = ITEMS.map((i) => ({ ...i }));
    const A = (id: string, lv: number, hp: number, sp: number): Unit => ({ id, name: 'unit.' + id, side: 'ally', lv, hp, hpMax: hp, sp, spMax: sp, weak: [], known: [], down: false, guard: false, atk: 0 });
    for (const u of [A('joker', 12, 412, 126), A('agathion', 11, 286, 98), A('caitsith', 11, 305, 112), A('kelpie', 10, 330, 74)]) this.units.set(u.id, u);
    this.units.set('noisy', { id: 'noisy', name: 'enemy.noisy', side: 'enemy', lv: 9, hp: 520, hpMax: 520, sp: 0, spMax: 0, weak: ['curse'], known: [], down: false, guard: false, atk: 58 });
    this.units.set('echo', { id: 'echo', name: 'enemy.echo', side: 'enemy', lv: 8, hp: 460, hpMax: 460, sp: 0, spMax: 0, weak: ['phys'], known: [], down: false, guard: false, atk: 52 });
  }
  u(id: string) { return this.units.get(id)!; }
  alive(ids: string[]) { return ids.filter((i) => this.u(i).hp > 0); }
  get allDown() { return this.alive(this.enemies).every((i) => this.u(i).down); }
  get won() { return this.alive(this.enemies).length === 0; }
  private commit(kind: string, payload: unknown) {
    const key = `b${this.turn}-${++this.seq}`;
    if (this.keys.has(key)) return null;                   // 幂等：同一 key 只结算一次
    this.keys.add(key); this.log.push({ key, kind, payload: structuredClone(payload) });
    return key;
  }
  canUse(skillId: string) {
    const s = SKILLS[skillId], j = this.u('joker');
    return s.costKind === 'sp' ? j.sp >= s.cost : s.costKind === 'hp' ? j.hp > s.cost : true;
  }
  /** 我方行动：返回已提交的 payload 与新倒地/1 MORE 判定 */
  act(skillId: string, targetId: string) {
    const s = SKILLS[skillId], j = this.u('joker'), t = this.u(targetId);
    if (s.costKind === 'sp') j.sp -= s.cost; if (s.costKind === 'hp') j.hp -= s.cost;
    j.guard = false;
    const hits: HitResult[] = [];
    const newDown: string[] = [];
    if (s.kind === 'buff') {
      hits.push({ targetId, dmg: 0, weak: false, crit: false, miss: false, resist: 'none', element: s.element, down: false });
    } else {
      const weak = t.weak.includes(s.element), crit = !weak && s.kind !== 'magic' && this.rnd() < 0.12;
      const base = s.power * (1.6 + this.rnd() * 0.4);
      const dmg = Math.round(base * (weak ? 1.5 : 1) * (crit ? 1.6 : 1) * (t.down ? 1.25 : 1));
      t.hp = Math.max(0, t.hp - dmg);
      if (!t.known.includes(s.element)) t.known.push(s.element);
      const down = (weak || crit) && !t.down && t.hp > 0;
      if (down) { t.down = true; newDown.push(t.id); }
      hits.push({ targetId, dmg, weak, crit, miss: false, resist: 'none', element: s.element, down });
    }
    const payload = { actorId: 'joker', skillId, targetIds: [targetId], hits, side: 'ally' as const };
    const key = this.commit('action', payload);
    const gotOneMore = newDown.length > 0 && !this.oneMoreUsedOn(newDown);
    this.oneMore = gotOneMore;
    return { key, payload, newDown, oneMore: gotOneMore, holdUp: gotOneMore && this.allDown && !this.won, won: this.won };
  }
  private oneMoreUsedOn(_ids: string[]) { return false; }
  useItem(itemId: string) {
    const it = this.items.find((i) => i.id === itemId)!, j = this.u('joker');
    it.n--; let amt = 0;
    if (itemId === 'medicine') { amt = Math.min(100, j.hpMax - j.hp); j.hp += amt; } else { amt = Math.min(10, j.spMax - j.sp); j.sp += amt; }
    const payload = { actorId: 'joker', skillId: 'item', targetIds: ['joker'], hits: [{ targetId: 'joker', dmg: amt, weak: false, crit: false, miss: false, resist: 'none', element: 'heal', down: false }], side: 'ally' as const };
    this.commit('item', payload); this.oneMore = false;
    return payload;
  }
  guard() { this.u('joker').guard = true; this.oneMore = false; const p = { actorId: 'joker', skillId: 'guard', targetIds: ['joker'], hits: [], side: 'ally' as const }; this.commit('guard', p); return p; }
  analyze() { for (const e of this.enemies) { const u = this.u(e); u.known = [...new Set([...u.known, ...u.weak])]; } }
  /** 敌方回合：倒地的起身，其余攻击 */
  enemyTurn() {
    const acts: { kind: 'getup' | 'attack'; payload: any }[] = [];
    for (const id of this.alive(this.enemies)) {
      const e = this.u(id);
      if (e.down) { e.down = false; acts.push({ kind: 'getup', payload: { unitIds: [id] } }); continue; }
      const tid = this.rnd() < 0.7 ? 'joker' : this.party[1 + Math.floor(this.rnd() * 3)];
      const t = this.u(tid);
      const dmg = Math.round(e.atk * (0.85 + this.rnd() * 0.3) * (t.guard ? 0.5 : 1));
      t.hp = Math.max(1, t.hp - dmg);
      const payload = { actorId: id, skillId: 'enemy.lunge', targetIds: [tid], hits: [{ targetId: tid, dmg, weak: false, crit: false, miss: false, resist: 'none', element: 'phys', down: false }], side: 'enemy' as const };
      this.commit('enemy', payload); acts.push({ kind: 'attack', payload });
    }
    this.u('joker').guard = false;
    this.turn++;
    return acts;
  }
  allOut() {
    const hits: HitResult[] = []; let total = 0;
    for (const id of this.alive(this.enemies)) {
      const e = this.u(id);
      for (let i = 0; i < 4; i++) { const d = Math.round(e.hpMax * (0.28 + this.rnd() * 0.1)); total += d; hits.push({ targetId: id, dmg: d, weak: false, crit: false, miss: false, resist: 'none', element: 'almighty', down: false }); }
      e.hp = 0; e.down = false;
    }
    hits.push({ targetId: this.enemies[0], dmg: total, weak: false, crit: true, miss: false, resist: 'none', element: 'almighty', down: false });
    const payload = { partyIds: this.party, finisherId: 'joker', total, hits, targetIds: this.enemies };
    this.commit('allout', payload);
    return payload;
  }
  release() { for (const id of this.enemies) this.u(id).hp = 0; const p = { ok: false }; this.commit('release', p); return p; }
  talkResolve(choice: number) { const ok = choice === 0 || this.rnd() < 0.5; if (ok) for (const id of this.enemies) this.u(id).hp = 0; this.commit('talk', { ok, choice }); return ok; }
  rewards(bonus: boolean) {
    const p = { win: true, rank: 'S', exp: bonus ? 1276 : 640, money: bonus ? 4522 : 2100, drops: bonus ? [{ id: 'medicine', name: 'Medicine', n: 1 }] : [] };
    this.commit('end', p); return p;
  }
}
