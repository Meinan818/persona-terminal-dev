// 规则层（M3 样板用的固定杂兵战）：零 DOM、零画布。只算结果并「提交」到日志（带 action key，幂等），
// 演出层拿到的是提交后的结果拷贝（§3.1-1：先提交，再演出）。
// 第二阶段：队伍由名单驱动（主角固定 + 任选 3 名同伴），四人按顺序行动；1 MORE 可 BATON PASS（接力加成真实生效）；
// ORDER→SWITCH 与后备交换；SHOWTIME 组合按名单数据判定。玩法按 GDD/契约，不照搬 P5R 数值。
import type { HitResult } from '../umbra/skins/_contract';
import EN from './data/enemies.json';
/** M4：敌人数据驱动（data/enemies.json）；ETYPES[type] = 规则数值 + 立绘 tex id */
export const ETYPES = EN.types as Record<string, { lv: number; hp: number; atk: number; weak: string[]; exp: number; money: number; tex: string; group?: string; h?: number; tier?: string; noTalk?: boolean; phases?: { at: number; hp: number; atk: number; weak: string[]; tex: string; h?: number; actions?: number }[]; drop?: { id: string; rate: number } }>;
export interface BattleMods { dmg: number; weakDmg: number; batonK: number; talk: number; enemyAtk: number; enemyHp: number; drop: number; boss: { hp: number; atk: number } }
const NOMODS: BattleMods = { dmg: 1, weakDmg: 1, batonK: 1, talk: 0, enemyAtk: 1, enemyHp: 1, drop: 1, boss: { hp: 1, atk: 1 } };
export interface Carry { lv: number; hp: number; hpMax: number; sp: number; spMax: number; exp: number }

export interface Unit { phase?: number; acts?: number; id: string; name: string; side: 'ally' | 'enemy'; lv: number; hp: number; hpMax: number; sp: number; spMax: number;
  weak: string[]; known: string[]; down: boolean; guard: boolean; atk: number; exp: number; suffix?: string }
export interface Skill { id: string; name: string; element: string; kind: 'phys' | 'magic' | 'buff' | 'debuff' | 'heal' | 'gun'; power: number; cost: number; costKind: 'sp' | 'hp' | 'n'; desc: string }

const S = (id: string, element: string, kind: Skill['kind'], power: number, cost: number, costKind: Skill['costKind']): Skill =>
  ({ id, name: `skill.${id}.name`, element, kind, power, cost, costKind, desc: `skill.${id}.desc` });
export const SKILLS: Record<string, Skill> = {
  attack: { id: 'attack', name: 'skill.attack.name', element: 'phys', kind: 'phys', power: 70, cost: 0, costKind: 'n', desc: '' },
  gun: { id: 'gun', name: 'skill.gun.name', element: 'gun', kind: 'gun', power: 55, cost: 0, costKind: 'n', desc: '' },
  eiha: S('eiha', 'curse', 'magic', 120, 4, 'sp'), cleave: S('cleave', 'phys', 'phys', 110, 18, 'hp'), sukunda: S('sukunda', 'support', 'debuff', 0, 6, 'sp'),
  zio: S('zio', 'elec', 'magic', 120, 4, 'sp'), lunge: S('lunge', 'phys', 'phys', 115, 20, 'hp'), tarukaja: S('tarukaja', 'support', 'buff', 0, 8, 'sp'),
  garu: S('garu', 'wind', 'magic', 115, 3, 'sp'), dia: S('dia', 'heal', 'heal', 70, 3, 'sp'),
  agi: S('agi', 'fire', 'magic', 125, 4, 'sp'), tarunda: S('tarunda', 'support', 'debuff', 0, 8, 'sp'),
  bufu: S('bufu', 'ice', 'magic', 120, 4, 'sp'), frei: S('frei', 'nuke', 'magic', 125, 5, 'sp'), rakukaja: S('rakukaja', 'support', 'buff', 0, 8, 'sp'),
  psi: S('psi', 'psy', 'magic', 125, 5, 'sp'), rakunda: S('rakunda', 'support', 'debuff', 0, 8, 'sp'), kouha: S('kouha', 'bless', 'magic', 120, 5, 'sp'),
};
/** 角色名单（规则数据）：主角 + 8 名可选同伴；导航固定 oracle（不参战） */
export const ROSTER: Record<string, { lv: number; hp: number; sp: number; skills: string[] }> = {
  joker: { lv: 12, hp: 412, sp: 126, skills: ['eiha', 'cleave', 'sukunda'] },
  skull: { lv: 11, hp: 448, sp: 82, skills: ['zio', 'lunge', 'tarukaja'] },
  mona: { lv: 11, hp: 330, sp: 120, skills: ['garu', 'dia'] },
  panther: { lv: 11, hp: 342, sp: 128, skills: ['agi', 'tarunda'] },
  fox: { lv: 11, hp: 380, sp: 104, skills: ['bufu', 'cleave'] },
  queen: { lv: 11, hp: 402, sp: 110, skills: ['frei', 'rakukaja'] },
  noir: { lv: 11, hp: 396, sp: 112, skills: ['psi', 'rakunda'] },
  crow: { lv: 11, hp: 390, sp: 118, skills: ['kouha', 'dia'] },
  violet: { lv: 11, hp: 370, sp: 100, skills: ['lunge', 'dia'] },
};
export const LEAD = 'joker';
export const DEFAULT_PARTY = ['skull', 'mona', 'panther'];
export const ITEMS = [{ id: 'medicine', name: 'item.medicine.name', desc: 'item.medicine.desc', n: 3 }, { id: 'snuff', name: 'item.snuff.name', desc: 'item.snuff.desc', n: 1 }, { id: 'bead', name: 'item.bead.name', desc: 'item.bead.desc', n: 1 }];

export interface Commit { key: string; kind: string; payload: unknown }

export class Battle {
  units = new Map<string, Unit>();
  party: string[] = [LEAD, ...DEFAULT_PARTY];
  bench: string[] = [];
  enemies = ['noisy', 'echo'];
  turn = 1; id = 0; seq = 0;
  oneMore = false;
  actor = LEAD;
  acted = new Set<string>();
  baton = 0;                         // 接力层数（0 = 无）：伤害 ×(1 + 0.5·层数)，接棒者回 HP/SP
  showtimeUsed = new Set<string>();
  summoned = new Set<string>();      // 本场已召唤过的角色（之后用快速版召唤）
  log: Commit[] = [];
  private keys = new Set<string>();
  private seed = 20261022;
  items = ITEMS.map((i) => ({ ...i }));
  enemyType = new Map<string, string>();
  mods: BattleMods = NOMODS;
  carry: Record<string, Carry> | null = null;
  phaseLog: { id: string; phase: number }[] = [];
  constructor(members: string[] = DEFAULT_PARTY, enemyCount = 2) { this.setRoster(members); this.setEnemies(enemyCount); this.reset(); }
  /** M4：按遭遇表设置敌人（1–5，D-004），同种重复加后缀 */
  setEncounter(types: string[]) {
    const list = types.slice(0, 5); this.enemies = []; this.enemyType.clear();
    const seen = new Map<string, number>();
    for (const t of list) { const k = seen.get(t) ?? 0; seen.set(t, k + 1); const id = k ? `${t}${k + 1}` : t; this.enemies.push(id); this.enemyType.set(id, t); }
  }
  get boss() { return this.enemies.find((e) => ETYPES[this.enemyType.get(e)!]?.tier === 'boss') ?? null; }
  get noTalk() { return this.enemies.some((e) => ETYPES[this.enemyType.get(e)!]?.noTalk); }
  /** D-004：敌人数量 1–5，不写死；两种 Shadow 轮换，同种重复时按原作加 A/B/C 后缀 */
  setEnemies(n: number) {
    n = Math.max(1, Math.min(5, Math.round(n) || 2));
    const types = ['noisy', 'echo']; this.enemies = []; this.enemyType.clear();
    for (let i = 0; i < n; i++) { const t = types[i % 2], k = Math.floor(i / 2); const id = k ? `${t}${k + 1}` : t; this.enemies.push(id); this.enemyType.set(id, t); }
  }
  setRoster(members: string[]) {
    const ok = members.filter((m) => ROSTER[m] && m !== LEAD).slice(0, 3);
    while (ok.length < 3) { const f = DEFAULT_PARTY.find((d) => !ok.includes(d)) ?? Object.keys(ROSTER).find((k) => k !== LEAD && !ok.includes(k))!; ok.push(f); }
    this.party = [LEAD, ...ok];
    this.bench = Object.keys(ROSTER).filter((k) => k !== LEAD && !ok.includes(k));
  }
  rnd() { this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff; return this.seed / 0x7fffffff; }
  reset() {
    this.id++; this.units.clear(); this.turn = 1; this.seq = 0; this.oneMore = false; this.seed = 20261022; this.items = ITEMS.map((i) => ({ ...i }));
    this.actor = LEAD; this.acted.clear(); this.baton = 0; this.showtimeUsed.clear(); this.summoned.clear();
    for (const [id, r] of Object.entries(ROSTER)) this.units.set(id, { id, name: 'unit.' + id, side: 'ally', lv: r.lv, hp: r.hp, hpMax: r.hp, sp: r.sp, spMax: r.sp, weak: [], known: [], down: false, guard: false, atk: 0, exp: 0 });
    if (this.carry) for (const [id, c] of Object.entries(this.carry)) { const u = this.units.get(id); if (u) Object.assign(u, { lv: c.lv, hp: Math.max(1, c.hp), hpMax: c.hpMax, sp: c.sp, spMax: c.spMax, exp: c.exp }); }
    const cnt = new Map<string, number>(); this.enemies.forEach((id) => { const t = this.enemyType.get(id)!; cnt.set(t, (cnt.get(t) ?? 0) + 1); });
    const seen = new Map<string, number>(); this.phaseLog = [];
    for (const id of this.enemies) {
      const t = this.enemyType.get(id)!, d = ETYPES[t]; const k = (seen.get(t) ?? 0); seen.set(t, k + 1);
      const suffix = (cnt.get(t) ?? 1) > 1 ? ' ' + 'ABCDE'[k] : '';
      const bk = d.tier === 'boss' ? this.mods.boss : { hp: 1, atk: 1 };
      const hp = Math.round(d.hp * this.mods.enemyHp * bk.hp);
      this.units.set(id, { id, name: 'enemy.' + t, side: 'enemy', lv: d.lv, hp, hpMax: hp, sp: 0, spMax: 0, weak: d.weak.slice(), known: [], down: false, guard: false, atk: Math.round(d.atk * this.mods.enemyAtk * bk.atk), exp: 0, suffix, phase: 0, acts: 1 } as Unit);
    }
  }
  u(id: string) { return this.units.get(id)!; }
  alive(ids: string[]) { return ids.filter((i) => this.u(i).hp > 0); }
  get allDown() { return this.alive(this.enemies).every((i) => this.u(i).down); }
  get won() { return this.alive(this.enemies).length === 0; }
  /** M4b（B19）：全员倒下才失败；主角倒下可被复活（返魂香） */
  get lost() { return this.alive(this.party).length === 0; }
  get downAllies() { return this.party.filter((i) => this.u(i).hp <= 0); }
  /** 逃跑（B10）：仅可选杂兵；成功率 = 数据表（基础 0.55 + 每回合 0.1）；失败丢掉该角色行动 */
  escape(optional: boolean) {
    const ok = optional && this.rnd() < 0.55 + 0.1 * (this.turn - 1);
    if (!ok) { this.acted.add(this.actor); this.oneMore = false; this.baton = 0; }
    this.commit('escape', { result: ok ? 'success' : 'fail' }); return ok;
  }
  skillsOf(id: string) { return ROSTER[id]?.skills ?? []; }
  private commit(kind: string, payload: unknown) {
    const key = `b${this.id}-${this.turn}-${++this.seq}`;
    if (this.keys.has(key)) return null;                   // 幂等：同一 key 只结算一次
    this.keys.add(key); this.log.push({ key, kind, payload: structuredClone(payload) });
    return key;
  }
  canUse(skillId: string, actor = this.actor) {
    const s = SKILLS[skillId], j = this.u(actor);
    return s.costKind === 'sp' ? j.sp >= s.cost : s.costKind === 'hp' ? j.hp > s.cost : true;
  }
  /** 召唤版本：同场首次 full，之后 quick */
  summonVer(actor = this.actor) { return this.summoned.has(actor) ? 'quick' : 'full'; }
  /** 我方行动：返回已提交的 payload 与新倒地/1 MORE 判定 */
  act(skillId: string, targetId: string) {
    const actor = this.actor, s = SKILLS[skillId], j = this.u(actor);
    if (s.costKind === 'sp') j.sp -= s.cost; if (s.costKind === 'hp') j.hp -= s.cost;
    j.guard = false;
    if (s.costKind !== 'n') this.summoned.add(actor);
    const hits: HitResult[] = []; const newDown: string[] = [];
    let targets = [targetId];
    if (s.kind === 'heal') {
      const t = this.alive(this.party).map((i) => this.u(i)).sort((a, b) => a.hp / a.hpMax - b.hp / b.hpMax)[0];
      const amt = Math.min(t.hpMax - t.hp, Math.round(s.power * (1.4 + this.rnd() * 0.3))); t.hp += amt; targets = [t.id];
      hits.push({ targetId: t.id, dmg: amt, weak: false, crit: false, miss: false, resist: 'none', element: 'heal', down: false });
    } else if (s.kind === 'buff') {
      targets = [actor];
      hits.push({ targetId: actor, dmg: 0, weak: false, crit: false, miss: false, resist: 'none', element: s.element, down: false });
    } else if (s.kind === 'debuff') {
      hits.push({ targetId, dmg: 0, weak: false, crit: false, miss: false, resist: 'none', element: s.element, down: false });
    } else {
      const t = this.u(targetId);
      const weak = t.weak.includes(s.element), crit = !weak && s.kind !== 'magic' && this.rnd() < 0.12;
      const base = s.power * (1.6 + this.rnd() * 0.4) * (1 + 0.5 * this.baton * this.mods.batonK) * this.mods.dmg;
      const dmg = Math.round(base * (weak ? 1.5 * this.mods.weakDmg : 1) * (crit ? 1.6 : 1) * (t.down ? 1.25 : 1));
      t.hp = Math.max(0, t.hp - dmg);
      if (t.hp <= 0 && this.nextPhase(t)) { hits.push({ targetId, dmg, weak, crit, miss: false, resist: 'none', element: s.element, down: false }); const payload = { actorId: actor, skillId, targetIds: targets, hits, side: 'ally' as const, baton: this.baton }; const key = this.commit('action', payload); this.oneMore = false; this.acted.add(actor); this.baton = 0; return { key, payload, newDown, oneMore: false, holdUp: false, won: false, phase: t.phase }; }
      if (!t.known.includes(s.element)) t.known.push(s.element);
      const down = (weak || crit) && !t.down && t.hp > 0;
      if (down) { t.down = true; newDown.push(t.id); }
      hits.push({ targetId, dmg, weak, crit, miss: false, resist: 'none', element: s.element, down });
    }
    const payload = { actorId: actor, skillId, targetIds: targets, hits, side: 'ally' as const, baton: this.baton };
    const key = this.commit('action', payload);
    const gotOneMore = newDown.length > 0;
    this.oneMore = gotOneMore;
    if (!gotOneMore) { this.acted.add(actor); this.baton = 0; }
    return { key, payload, newDown, oneMore: gotOneMore, holdUp: gotOneMore && this.allDown && !this.won, won: this.won, phase: 0 };
  }
  /** BOSS 阶段：HP 归零且还有下一阶段 → 换阶段（换弱点/立绘/行动数），已知弱点清空 */
  nextPhase(t: Unit) {
    const d = ETYPES[this.enemyType.get(t.id)!]; const ph = d?.phases?.[t.phase ?? 0]; if (!ph) return false;
    t.phase = (t.phase ?? 0) + 1; const bk = this.mods.boss; t.hpMax = Math.round(ph.hp * this.mods.enemyHp * bk.hp); t.hp = t.hpMax; t.atk = Math.round(ph.atk * this.mods.enemyAtk * bk.atk);
    t.weak = ph.weak.slice(); t.known = []; t.down = false; t.acts = ph.actions ?? 1;
    this.phaseLog.push({ id: t.id, phase: t.phase }); this.commit('boss:phase', { bossId: t.id, phase: t.phase });
    return true;
  }
  /** 1 MORE 时可接力的人：本回合还没行动、活着、不是自己 */
  batonTargets() { return this.oneMore ? this.alive(this.party).filter((i) => i !== this.actor && !this.acted.has(i)) : []; }
  batonTo(to: string) {
    if (!this.batonTargets().includes(to)) return null;
    const from = this.actor;
    this.acted.add(from); this.baton = Math.min(3, this.baton + 1); this.actor = to; this.oneMore = false;
    const u = this.u(to); const hp = Math.round(u.hpMax * 0.05 * this.baton), sp = Math.round(u.spMax * 0.03 * this.baton);
    u.hp = Math.min(u.hpMax, u.hp + hp); u.sp = Math.min(u.spMax, u.sp + sp);
    const payload = { actorId: from, skillId: 'baton', targetIds: [to], hits: [], side: 'ally' as const, baton: this.baton };
    this.commit('baton', payload);
    return payload;
  }
  /** ORDER→SWITCH：当前非主角队员与后备交换，不消耗行动 */
  switchMember(out: string, inn: string) {
    const i = this.party.indexOf(out), j = this.bench.indexOf(inn);
    if (i <= 0 || j < 0) return null;
    this.party[i] = inn; this.bench[j] = out;
    if (this.actor === out) this.actor = inn;
    if (this.acted.has(out)) { this.acted.delete(out); this.acted.add(inn); }
    this.commit('switch', { out, inn });
    return { out, inn };
  }
  /** 轮到下一位（返回 null = 我方本回合结束） */
  nextActor(): string | null {
    const n = this.alive(this.party).find((i) => !this.acted.has(i));
    if (n) this.actor = n;
    return n ?? null;
  }
  showtimeFor(pairs: string[][]): string[] | null {
    if (this.turn < 1 || this.won) return null;
    const e = this.alive(this.enemies); if (!e.length) return null;
    const hurt = e.some((i) => this.u(i).hp / this.u(i).hpMax < 0.7);
    if (!hurt) return null;
    for (const p of pairs) if (p.includes(this.actor) && p.every((m) => this.party.includes(m) && this.u(m).hp > 0) && !this.showtimeUsed.has(p.join('-'))) return p;
    return null;
  }
  showtime(pair: string[]) {
    this.showtimeUsed.add(pair.join('-'));
    const hits: HitResult[] = []; let total = 0;
    for (const id of this.alive(this.enemies)) { const e = this.u(id); const isB = id === this.boss; const d = Math.round(e.hpMax * (isB ? 0.45 : 0.8 + this.rnd() * 0.3)); total += d; e.hp = Math.max(0, e.hp - d); if (e.hp <= 0) this.nextPhase(e); hits.push({ targetId: id, dmg: d, weak: false, crit: true, miss: false, resist: 'none', element: 'almighty', down: false }); }
    const payload = { actorId: this.actor, pairIds: pair, total, hits, targetIds: this.enemies.slice(), side: 'ally' as const };
    this.commit('highlight', payload); this.acted.add(this.actor); this.oneMore = false; this.baton = 0;
    return { payload, won: this.won };
  }
  useItem(itemId: string) {
    const it = this.items.find((i) => i.id === itemId)!; let j = this.u(this.actor);
    it.n--; let amt = 0;
    if (itemId === 'bead') { j = this.u(this.downAllies[0] ?? this.actor); amt = j.hp > 0 ? 0 : Math.round(j.hpMax * 0.5); j.hp += amt; j.down = false;
      const payload = { actorId: this.actor, skillId: 'item', targetIds: [j.id], hits: [{ targetId: j.id, dmg: amt, weak: false, crit: false, miss: false, resist: 'none', element: 'heal', down: false }], side: 'ally' as const, revive: j.id };
      this.commit('item', payload); this.oneMore = false; this.acted.add(this.actor); this.baton = 0; return payload; }
    if (itemId === 'medicine') { amt = Math.min(100, j.hpMax - j.hp); j.hp += amt; } else { amt = Math.min(10, j.spMax - j.sp); j.sp += amt; }
    const payload = { actorId: this.actor, skillId: 'item', targetIds: [this.actor], hits: [{ targetId: this.actor, dmg: amt, weak: false, crit: false, miss: false, resist: 'none', element: 'heal', down: false }], side: 'ally' as const };
    this.commit('item', payload); this.oneMore = false; this.acted.add(this.actor); this.baton = 0;
    return payload;
  }
  guard() { const a = this.actor; this.u(a).guard = true; this.oneMore = false; this.acted.add(a); this.baton = 0; const p = { actorId: a, skillId: 'guard', targetIds: [a], hits: [], side: 'ally' as const }; this.commit('guard', p); return p; }
  analyze() { for (const e of this.enemies) { const u = this.u(e); u.known = [...new Set([...u.known, ...u.weak])]; } }
  /** 敌方回合：倒地的起身，其余攻击 */
  enemyTurn() {
    const acts: { kind: 'getup' | 'attack'; payload: any }[] = [];
    for (const id of this.alive(this.enemies)) {
      const e = this.u(id);
      if (e.down) { e.down = false; acts.push({ kind: 'getup', payload: { unitIds: [id] } }); continue; }
      for (let n = 0; n < (e.acts ?? 1); n++) {
      const al = this.alive(this.party); if (!al.length) break;
      const tid = al[Math.floor(this.rnd() * al.length)];
      const t = this.u(tid);
      const dmg = Math.round(e.atk * (0.85 + this.rnd() * 0.3) * (t.guard ? 0.5 : 1));
      t.hp = Math.max(0, t.hp - dmg);   // M4b：去掉 1 HP 保底（B19 全灭失败）
      const ko = t.hp <= 0;
      const payload = { actorId: id, skillId: 'enemy.lunge', targetIds: [tid], hits: [{ targetId: tid, dmg, weak: false, crit: false, miss: false, resist: 'none', element: 'phys', down: ko }], side: 'enemy' as const, ko };
      this.commit('enemy', payload); acts.push({ kind: 'attack', payload });
      }
    }
    for (const p of this.party) this.u(p).guard = false;
    this.turn++; this.acted.clear(); this.baton = 0; this.actor = this.alive(this.party)[0] ?? LEAD;
    return acts;
  }
  allOut() {
    const hits: HitResult[] = []; let total = 0;
    for (const id of this.alive(this.enemies)) {
      const e = this.u(id);
      const isB = id === this.boss; let sum = 0;
      for (let i = 0; i < 4; i++) { const d = Math.round(e.hpMax * (isB ? 0.08 + this.rnd() * 0.03 : 0.28 + this.rnd() * 0.1)); total += d; sum += d; hits.push({ targetId: id, dmg: d, weak: false, crit: false, miss: false, resist: 'none', element: 'almighty', down: false }); }
      e.hp = isB ? Math.max(0, e.hp - sum) : 0; e.down = false; if (isB && e.hp <= 0) this.nextPhase(e);
    }
    hits.push({ targetId: this.enemies[0], dmg: total, weak: false, crit: true, miss: false, resist: 'none', element: 'almighty', down: false });
    const payload = { partyIds: this.party.slice(), finisherId: this.actor, total, hits, targetIds: this.enemies };
    this.commit('allout', payload);
    return payload;
  }
  release() { for (const id of this.enemies) this.u(id).hp = 0; const p = { ok: false }; this.commit('release', p); return p; }
  talkResolve(choice: number) { const ok = choice === 0 || this.rnd() < 0.5 + this.mods.talk; if (ok) for (const id of this.enemies) this.u(id).hp = 0; this.commit('talk', { ok, choice }); return ok; }
  /** 单场收获（数据驱动）；升级在宿主交给 Run.award（跨战斗持久） */
  rewards(bonus: boolean) {
    let exp = 0, money = 0; const drops: { id: string; name: string; n: number }[] = [];
    for (const id of this.enemies) {
      const d = ETYPES[this.enemyType.get(id)!]; if (!d) continue; exp += d.exp; money += d.money;
      if (d.drop && this.rnd() < d.drop.rate * this.mods.drop) { const f = drops.find((x) => x.id === d.drop!.id); if (f) f.n++; else drops.push({ id: d.drop.id, name: 'item.' + d.drop.id + '.name', n: this.mods.drop > 1 ? 2 : 1 }); }
    }
    if (bonus) { exp = Math.round(exp * 1.2); money = Math.round(money * 1.5); }
    const p = { win: true, rank: 'S', exp, money, drops, levelUps: [] as { id: string; from: number; to: number; hp: number; sp: number }[] };
    this.commit('end', p); return p;
  }
}
