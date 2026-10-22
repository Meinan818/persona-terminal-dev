// 战斗状态机：我方回合 → 敌方回合。所有指令返回本次产生的事件，同时推给订阅者。
// 规则依据与不确定处见 ../../RULES-NOTES.md
import { Grid, DIRS, eq, key, manhattan, pathTo, pointInTriangle } from './grid';
import type {
  AttackKind, BattleEvent, CoverLevel, CrownResult, Intent, MapDef, Phase, RuleOptions, SkillDef, Unit, Vec,
} from './types';
import { runEnemyTurn, computeIntents } from './ai';

/** Resistance 状态下受到的伤害倍率（原作数值未公开，见 RULES-NOTES §2） */
export const RESIST_MULT = 0.5;
/** 兼容旧接口：按掩体等级的倍率（p5t 模式下半/全掩体同为 Resistance） */
export const COVER_MULT: Record<CoverLevel, number> = { 0: 1, 1: RESIST_MULT, 2: RESIST_MULT };
export const BURN_DAMAGE = 5;
export const TRIPLE_THREAT_MULT = 1.0; // 三人近战力之和 × 倍率（原作：「全队合计伤害的一定比例」）

export interface TriplePending { attackerId: string; targetId: string; victims: string[] }
type Hit = { t: Unit; resist: boolean; missed?: boolean };

export class Battle {
  readonly grid: Grid;
  readonly opts: Required<RuleOptions>;
  units: Unit[];
  phase: Phase = 'player';
  turn = 0;
  everKo = false;
  intents: Intent[] = [];
  /** 本阶段不能移动的单位（感电/绝望） */
  immobile = new Set<string>();
  private pendingBonus = new Map<string, number>();
  private listeners: ((e: BattleEvent) => void)[] = [];
  private buf: BattleEvent[] = [];

  constructor(public readonly map: MapDef, opts: RuleOptions = {}) {
    this.opts = { coverModel: 'p5t', leaderKoLoses: true, enemyOneMore: true, ...opts };
    this.grid = new Grid(map);
    this.units = map.units.map(({ def, pos }) => ({
      ...def,
      skills: def.skills.map((s) => ({ ...s })),
      pos: { ...pos },
      anchor: { ...pos },
      hp: def.maxHp,
      sp: def.maxSp,
      ammo: def.gun ? def.gun.ammo ?? Infinity : 0,
      moved: false,
      acted: false,
      downed: false,
      ko: false,
      oneMore: false,
      resistBroken: false,
      bonusMove: 0,
      status: [],
    }));
  }

  on(fn: (e: BattleEvent) => void) {
    this.listeners.push(fn);
    return () => { this.listeners = this.listeners.filter((f) => f !== fn); };
  }
  emit(e: BattleEvent) {
    this.buf.push(e);
    for (const l of this.listeners) l(e);
  }
  private flush(): BattleEvent[] {
    const out = this.buf;
    this.buf = [];
    return out;
  }

  // ---------- 查询 ----------
  unit(id: string) {
    const u = this.units.find((x) => x.id === id);
    if (!u) throw new Error(`no unit ${id}`);
    return u;
  }
  alive(side?: 'ally' | 'enemy') {
    return this.units.filter((u) => !u.ko && (!side || u.side === side));
  }
  unitAt(p: Vec) {
    return this.units.find((u) => !u.ko && eq(u.pos, p));
  }
  occupiedSet(except?: Unit) {
    return new Set(this.alive().filter((u) => u !== except).map((u) => key(u.pos)));
  }
  blockedFor(u: Unit) {
    // 可穿过友方，不可穿过敌方
    return new Set(this.alive().filter((o) => o.side !== u.side).map((o) => key(o.pos)));
  }
  moveRange(u: Unit) {
    return this.immobile.has(u.id) ? 0 : u.move + u.bonusMove;
  }
  private reach(u: Unit) {
    return this.grid.reachable(u.anchor, this.moveRange(u), this.blockedFor(u), this.occupiedSet(u));
  }
  /** 可移动到的格（从本次行动起点算；行动前可反复改位置），不含当前所在格 */
  moveTiles(u: Unit): Vec[] {
    if (u.acted || u.ko) return [];
    return [...this.reach(u).values()].filter((n) => n.dist >= 0 && !eq(n.pos, u.pos)).map((n) => n.pos);
  }
  pathFor(u: Unit, dest: Vec): Vec[] {
    const r = this.reach(u);
    const n = r.get(key(dest));
    if (!n || n.dist < 0) return [];
    return pathTo(r, dest);
  }

  /** 目标对来自 from 的攻击是否处于 Resistance（不能被打倒、伤害降低） */
  hasResistance(t: Unit, from: Vec): boolean {
    if (t.resistBroken || t.status.length > 0) return false; // 异常状态中的单位任何攻击都能打倒
    return this.opts.coverModel === 'p5t'
      ? this.grid.hasAnyCover(t.pos) > 0
      : this.grid.coverAgainst(t.pos, from) > 0;
  }
  /** 显示用掩体等级：有 Resistance 时为其掩体等级，否则 0 */
  coverOf(t: Unit, from: Vec): CoverLevel {
    if (!this.hasResistance(t, from)) return 0;
    return this.opts.coverModel === 'p5t' ? this.grid.hasAnyCover(t.pos) : this.grid.coverAgainst(t.pos, from);
  }
  canMelee(a: Unit, t: Unit, from: Vec = a.pos) {
    return a.side !== t.side && !t.ko && manhattan(from, t.pos) === 1;
  }
  canShoot(a: Unit, t: Unit, from: Vec = a.pos) {
    return !!a.gun && a.ammo > 0 && a.side !== t.side && !t.ko &&
      manhattan(from, t.pos) <= a.gun.range && this.grid.lineOfSight(from, t.pos);
  }
  /** 技能无视墙体/障碍（原作：Skills bypass obstacles），只看射程与 SP */
  canSkill(a: Unit, s: SkillDef, t: Unit, from: Vec = a.pos) {
    return a.sp >= s.sp && a.side !== t.side && !t.ko && manhattan(from, t.pos) <= s.range;
  }
  /** 预估（UI 预览，「GET EM!!」提示 = willDown） */
  previewDamage(a: Unit, t: Unit, kind: 'melee' | 'gun' | 'skill', skill?: SkillDef, from: Vec = a.pos) {
    const resist = this.hasResistance(t, from);
    const miss = kind === 'gun' && this.grid.fullCoverFacing(t.pos, from);
    const base = kind === 'melee' ? a.melee : kind === 'gun' ? a.gun!.power : skill!.power;
    const amount = miss ? 0 : Math.max(1, Math.round(base * (resist ? RESIST_MULT : 1)));
    return { amount, cover: this.coverOf(t, from), resist, miss, willDown: !miss && !resist && !t.downed };
  }
  /** 三名我方围成的三角内的敌人 */
  triangleVictims(): string[] {
    const allies = this.alive('ally');
    if (allies.length < 3) return [];
    const [a, b, c] = allies.map((u) => u.pos);
    return this.alive('enemy').filter((e) => pointInTriangle(e.pos, a, b, c)).map((e) => e.id);
  }
  /** 当前可否发动 Triple Threat：有人持 1 More，三角内至少有一个倒地敌人 */
  get pendingTriple(): TriplePending | null {
    if (this.phase !== 'player') return null;
    const holder = this.alive('ally').find((a) => a.oneMore && !a.acted);
    if (!holder) return null;
    const victims = this.triangleVictims();
    const downed = victims.find((id) => this.unit(id).downed);
    return downed ? { attackerId: holder.id, targetId: downed, victims } : null;
  }

  // ---------- 流程 ----------
  start(): BattleEvent[] {
    this.startPlayerPhase();
    return this.flush();
  }

  /** 一方阶段开始：起身、恢复 Resistance、异常结算、确定不能移动者 */
  beginSidePhase(side: 'ally' | 'enemy') {
    for (const u of this.alive(side)) {
      u.moved = false; u.acted = false; u.oneMore = false; u.resistBroken = false;
      u.anchor = { ...u.pos };
      u.bonusMove = this.pendingBonus.get(u.id) ?? 0;
      this.pendingBonus.delete(u.id);
      if (u.downed) { u.downed = false; this.emit({ type: 'standUp', unitId: u.id }); }
      this.immobile.delete(u.id);
      for (const s of u.status) {
        if (s.id === 'burn') this.applyDamage(u, BURN_DAMAGE, 0, false, 'status');
        if (s.id === 'shock' || s.id === 'despair') {
          this.immobile.add(u.id);
          this.emit({ type: 'skipTurn', unitId: u.id, reason: s.id });
        }
        s.turns--;
      }
      u.status = u.status.filter((s) => s.turns > 0);
    }
  }

  private startPlayerPhase() {
    this.turn++;
    this.phase = 'player';
    this.emit({ type: 'phaseStart', phase: 'player', turn: this.turn });
    if (this.map.turnLimit && this.turn > this.map.turnLimit) return this.finish('lost');
    this.beginSidePhase('ally');
    if (this.checkEnd()) return;
    this.intents = computeIntents(this);
    this.emit({ type: 'intents', intents: this.intents });
  }

  private guard(u: Unit, needAction = true): string | null {
    if (this.phase !== 'player') return '不是我方回合';
    if (u.side !== 'ally') return '不能操作敌方';
    if (u.ko) return '已倒下';
    if (needAction && u.acted) return '已行动';
    return null;
  }
  private err(message: string): BattleEvent[] {
    this.emit({ type: 'error', message });
    return this.flush();
  }

  /** 移动：行动前可在范围内反复改位置（从 anchor 算） */
  move(unitId: string, dest: Vec): BattleEvent[] {
    const u = this.unit(unitId);
    const g = this.guard(u);
    if (g) return this.err(g);
    if (eq(dest, u.pos)) return this.flush();
    const path = this.pathFor(u, dest);
    if (!path.length) return this.err('到不了那里');
    const from = { ...u.pos };
    u.pos = { ...dest };
    u.moved = !eq(dest, u.anchor);
    this.emit({ type: 'move', unitId, path, from });
    if (this.map.win.type === 'reachExit' && this.grid.tile(dest) === 'exit' &&
      (!this.map.win.unitId || this.map.win.unitId === unitId)) this.finish('won');
    return this.flush();
  }

  melee(unitId: string, targetId: string): BattleEvent[] {
    const u = this.unit(unitId), t = this.unit(targetId);
    const g = this.guard(u) ?? (this.canMelee(u, t) ? null : '不在近战距离');
    if (g) return this.err(g);
    u.oneMore = false;
    this.emit({ type: 'attack', kind: 'melee', attackerId: u.id, targetId: t.id });
    const resist = this.hasResistance(t, u.pos);
    this.applyDamage(t, Math.max(1, Math.round(u.melee * (resist ? RESIST_MULT : 1))), this.coverOf(t, u.pos), resist, 'melee');
    if (!t.ko) {
      // 近战：把敌人推出所在格、攻击者占据其位置，并打破 Resistance
      const dir = this.dirFrom(u.pos, t.pos);
      const old = { ...t.pos };
      const moved = this.push(t, dir);
      if (moved) { u.pos = old; this.emit({ type: 'meleeStep', unitId: u.id, to: old }); }
      this.breakResist(t);
    }
    this.afterHit(u, [{ t, resist }]);
    return this.flush();
  }

  shoot(unitId: string, targetId: string): BattleEvent[] {
    const u = this.unit(unitId), t = this.unit(targetId);
    const g = this.guard(u) ?? (this.canShoot(u, t) ? null : '打不到（射程/视线/弹数）');
    if (g) return this.err(g);
    u.oneMore = false;
    u.ammo--;
    this.emit({ type: 'attack', kind: 'gun', attackerId: u.id, targetId: t.id });
    if (this.grid.fullCoverFacing(t.pos, u.pos)) {
      this.emit({ type: 'miss', unitId: t.id, reason: 'fullCover' });
      this.afterHit(u, [{ t, resist: true, missed: true }]);
      return this.flush();
    }
    const resist = this.hasResistance(t, u.pos);
    this.applyDamage(t, Math.max(1, Math.round(u.gun!.power * (resist ? RESIST_MULT : 1))), this.coverOf(t, u.pos), resist, 'gun');
    this.afterHit(u, [{ t, resist }]);
    return this.flush();
  }

  skill(unitId: string, skillId: string, targetId: string): BattleEvent[] {
    const u = this.unit(unitId), t = this.unit(targetId);
    const s = u.skills.find((x) => x.id === skillId);
    if (!s) return this.err('没有这个技能');
    const g = this.guard(u) ?? (this.canSkill(u, s, t) ? null : 'SP 不足或超出射程');
    if (g) return this.err(g);
    u.oneMore = false;
    u.sp -= s.sp;
    this.emit({ type: 'attack', kind: 'skill', attackerId: u.id, targetId: t.id, skillId: s.id });
    const targets = s.radius > 0 ? this.alive(t.side).filter((o) => manhattan(o.pos, t.pos) <= s.radius) : [t];
    const hits: Hit[] = targets.map((o) => {
      const resist = this.hasResistance(o, u.pos);
      this.applyDamage(o, Math.max(1, Math.round(s.power * (resist ? RESIST_MULT : 1))), this.coverOf(o, u.pos), resist, 'skill');
      if (!o.ko) {
        this.breakResist(o); // 任何攻击技能都会打破 Resistance
        if (s.status) {
          o.status = o.status.filter((x) => x.id !== s.status);
          o.status.push({ id: s.status, turns: 1 });
          this.emit({ type: 'status', unitId: o.id, status: s.status, turns: 1 });
          if (s.status === 'burn') this.push(o, this.dirFrom(u.pos, o.pos)); // 灼烧：轻微击退
          if (s.status === 'despair') this.pendingBonus.set(u.id, (this.pendingBonus.get(u.id) ?? 0) + o.move);
        }
      }
      return { t: o, resist };
    });
    this.afterHit(u, hits);
    return this.flush();
  }

  wait(unitId: string): BattleEvent[] {
    const u = this.unit(unitId);
    const g = this.guard(u, false);
    if (g) return this.err(g);
    u.acted = true; u.oneMore = false;
    this.emit({ type: 'wait', unitId });
    this.autoEndIfDone();
    return this.flush();
  }

  /** 发动 Triple Threat：用掉持有者的 1 More；三角内所有敌人受伤（无视 Resistance） */
  tripleThreat(attackerId?: string): BattleEvent[] {
    const p = this.pendingTriple;
    if (!p) return this.err('现在不能总攻');
    const attacker = this.unit(attackerId && this.unit(attackerId).oneMore ? attackerId : p.attackerId);
    attacker.acted = true; attacker.oneMore = false;
    const allies = this.alive('ally');
    this.emit({ type: 'tripleThreat', attackerId: attacker.id, allies: allies.map((a) => a.id), victims: p.victims });
    const dmg = Math.round(allies.reduce((s, a) => s + a.melee, 0) * TRIPLE_THREAT_MULT);
    for (const id of p.victims) {
      const v = this.unit(id);
      if (!v.ko) this.applyDamage(v, dmg, 0, false, 'triple');
    }
    if (!this.checkEnd()) this.autoEndIfDone();
    return this.flush();
  }

  /** 放弃总攻（保留 1 More）——规则上无副作用，留给 UI 调用 */
  declineTriple(): BattleEvent[] {
    return this.flush();
  }

  endPlayerPhase(): BattleEvent[] {
    if (this.phase !== 'player') return this.err('不是我方回合');
    this.runEnemyPhase();
    return this.flush();
  }

  // ---------- 内部 ----------
  dirFrom(a: Vec, b: Vec): Vec {
    const dx = b.x - a.x, dy = b.y - a.y;
    return Math.abs(dx) >= Math.abs(dy) ? { x: Math.sign(dx), y: 0 } : { x: 0, y: Math.sign(dy) };
  }

  /** 推 1 格；撞到其他单位则双方都失去 Resistance。返回是否真的移动了 */
  push(t: Unit, d: Vec): boolean {
    const from = { ...t.pos };
    const to = { x: t.pos.x + d.x, y: t.pos.y + d.y };
    const other = this.unitAt(to);
    if (this.grid.walkable(to) && !other) {
      t.pos = to;
      this.emit({ type: 'knockback', unitId: t.id, from, to, blocked: false });
      return true;
    }
    this.emit({ type: 'knockback', unitId: t.id, from, to: from, blocked: true, collidedWith: other?.id });
    if (other) { this.breakResist(other); this.breakResist(t); }
    return false;
  }

  breakResist(u: Unit) {
    if (u.resistBroken || u.ko) return;
    u.resistBroken = true;
    this.emit({ type: 'resistBroken', unitId: u.id });
  }

  applyDamage(t: Unit, amount: number, cover: CoverLevel, resist: boolean, source: AttackKind | 'status' | 'collision') {
    t.hp = Math.max(0, t.hp - amount);
    this.emit({ type: 'damage', unitId: t.id, amount, cover, resist, hpLeft: t.hp, source });
    if (t.hp === 0 && !t.ko) {
      t.ko = true; t.downed = false;
      if (t.side === 'ally') this.everKo = true;
      this.emit({ type: 'ko', unitId: t.id });
    }
  }

  /**
   * 命中结算：命中时没有 Resistance 且未倒地的目标 → 倒地 → 攻击者 1 More（可再移动+再行动）。
   * 1 More 可无限连锁，只要每次打倒的是不同敌人（已倒地的敌人不会再被打倒）。
   * 范围攻击打倒多个也只给一次 1 More。
   */
  private afterHit(u: Unit, hits: Hit[]) {
    let downedAny = false;
    for (const h of hits) {
      if (h.missed || h.t.ko || h.t.downed || h.resist) continue;
      h.t.downed = true;
      downedAny = true;
      this.emit({ type: 'down', unitId: h.t.id });
    }
    u.acted = true;
    if (this.checkEnd()) return;
    if (downedAny) {
      u.oneMore = true;
      u.acted = false; u.moved = false;
      u.anchor = { ...u.pos };
      this.emit({ type: 'oneMore', unitId: u.id });
      const p = this.pendingTriple;
      if (p) this.emit({ type: 'tripleThreatReady', attackerId: u.id, targetId: p.targetId, victims: p.victims });
      return;
    }
    this.autoEndIfDone();
  }

  private autoEndIfDone() {
    if (this.phase !== 'player') return;
    if (this.alive('ally').every((a) => a.acted)) this.runEnemyPhase();
  }

  private runEnemyPhase() {
    for (const a of this.alive('ally')) { a.oneMore = false; }
    this.phase = 'enemy';
    this.emit({ type: 'phaseStart', phase: 'enemy', turn: this.turn });
    this.beginSidePhase('enemy');
    if (this.checkEnd()) return;
    runEnemyTurn(this);
    if (this.checkEnd()) return;
    this.startPlayerPhase();
  }

  /** 胜负判定；结束返回 true */
  checkEnd(): boolean {
    if (this.phase === 'won' || this.phase === 'lost') return true;
    const allies = this.alive('ally');
    if (!allies.length || (this.opts.leaderKoLoses && this.units.some((u) => u.isLeader && u.ko))) { this.finish('lost'); return true; }
    const w = this.map.win;
    if (w.type === 'defeatAll' && !this.alive('enemy').length) { this.finish('won'); return true; }
    if (w.type === 'defeatTarget' && this.unit(w.targetId).ko) { this.finish('won'); return true; }
    return false;
  }

  private finish(outcome: 'won' | 'lost') {
    this.phase = outcome;
    this.emit({ type: 'result', outcome, turn: this.turn, crowns: this.crowns(outcome) });
  }

  /** 原作三项奖励条件：通关 / N 回合内通关 / 无人 KO */
  crowns(outcome: 'won' | 'lost' = this.phase === 'won' ? 'won' : 'lost'): CrownResult {
    const clear = outcome === 'won';
    const withinTurns = clear && this.turn <= this.map.turnTarget;
    const noKo = clear && !this.everKo;
    return { clear, withinTurns, noKo, count: [clear, withinTurns, noKo].filter(Boolean).length };
  }
}

export { DIRS };
