// 战斗状态机：我方回合 → 敌方回合。所有指令返回本次产生的事件，同时推给订阅者。
// 规则依据与不确定处见 ../../RULES-NOTES.md（「PH」= 原作数值查不到的占位）
import { Grid, DIRS, add, eq, key, manhattan, pathTo, pointInTriangle } from './grid';
import type {
  AttackKind, BattleEvent, BonusDef, BuffId, CameraDef, ChargeId, CoverLevel, CrownItem, CrownResult, DamageSource, Difficulty,
  Effect, EventAction, Intent, MapDef, MapEvent, PassiveId, Phase, RuleOptions, SkillDef, StatusId, Unit, UnitDef, Vec,
} from './types';
import { runEnemyTurn, computeIntents } from './ai';
import { decoyDef } from './data';

// ---------- 规则常量 ----------
/** Resistance（贴掩体 / 高台受下方枪击）伤害倍率：Cogito AAA104 实测「Basic cover 70% (rough estimate)」 */
export const RESIST_MULT = 0.7;
export const COVER_MULT: Record<CoverLevel, number> = { 0: 1, 1: RESIST_MULT, 2: RESIST_MULT };
/** 近战击退 4 格（Cogito AAA103 / BBB200「Melee Attack knocks an enemy back by 4 Spaces」） */
export const MELEE_KNOCKBACK = 4;
/** 灼烧：击退 1 格 + 20% MaxHP 伤害，不会致死（Cogito AAA101） */
export const BURN_RATIO = 0.2;
export const BURN_DAMAGE = BURN_RATIO; // 兼容旧导出名（现在是比例）
/** 吹飞 4 格、越过障碍；催眠拉近 4 格（Cogito AAA101） */
export const SWEEP_DIST = 4;
export const HYPNO_DIST = 4;
/** 油桶：2 格内全部吹飞、受伤、失去 Resistance（Cogito Map objects）；吹飞距离与伤害 PH */
export const BARREL_RADIUS = 2;
export const BARREL_KNOCK = 2; // PH
export const BARREL_DAMAGE = 20; // PH
/** 技能伤害 = Power × SKILL_SCALE（PH：原作伤害公式未公开） */
export const SKILL_SCALE = 0.45;
/** 回复量 = Power × HEAL_SCALE（PH） */
export const HEAL_SCALE = 0.5;
/** 推落高台伤害比例（PH；wikiwiki「落下させるとダメージ」）；Launcher 推落即死（Cogito AAA115） */
export const FALL_RATIO = 0.1;
/** Triple Threat 伤害 = 三人（近战 + 枪攻）之和 × 倍率（Cogito AAA107「Damage is based on Melee and Ranged Attack Stat」；倍率 PH） */
export const TRIPLE_THREAT_MULT = 0.5;
/** Voltage 槽（PH：上限与增长率） */
export const VOLTAGE_MAX = 100;
export const VOLTAGE_RATE = 0.5;
/** 绝望：每个中招目标给施法者 +2 移动（PH；原作「目标越多加得越多」） */
export const DESPAIR_MOVE = 2;
/** Charge：Over Powered ×1.2（Cogito），射程/移动加成见 chargeBonus */
export const OVER_POWERED = 1.2;
/** Buff（-kaja）：Sukukaja +3 移动（Cogito AAA115）；攻/防倍率与持续回合 PH */
export const BUFF_ATK = 1.25;
export const BUFF_DEF = 0.8;
export const BUFF_MOVE = 3;
export const BUFF_TURNS = 3;
/** Revenger 反击跳跃距离（PH；Gamer Guides：被击退后反击「多半只是跳回原位」→ 至少覆盖近战击退 4 格） */
export const REVENGER_LEAP = 4;
// ---------- 被动数值（ibunroku conditions 字段） ----------
export const IRONCLAD_MULT = 0.6; // Ironclad Guard：掩体中再 -40%
export const IRON_BODY_MULT = 0.8; // Iron Body：被打 2 次后 -20%
export const REGEN_RATIO = 0.05; // Regenerate 1
export const INVIG_RATIO = 0.05; // Invigorate 1
export const SOUL_REPOSE_RATIO = 0.07; // Soul Repose
export const TRUMP_HEAL_POWER = 80; // Trump Card：Power 80 回复
export const TRUMP_MULT = 1.5; // Trump Card：下次攻击 ×1.5
export const BROAD_CHANCE = 0.35; // Broad Perspective
export const LUCKY_CHANCE = 0.25; // Lucky Punch
export const PEDAL_MOVE = 2; // Pedal to the Metal
export const DAREDEVIL_KNOCK = 2; // Daredevil
export const DMG_UP_SMALL = 1.1; // Punisher of the Reckless / Sharp-Eyed Wildcat / Finishing Blow
export const BREAK_RECOVERY_RATIO = 0.05; // Break & Recovery
export const FIRST_AID_POWER = 65; // First Aid（PH：按 Dia 的 Power）
export const FIRST_AID_RANGE = 3; // PH
/** Flag of Freedom 回合结束回复比例（PH） */
export const FLAG_HEAL_RATIO = 0.1;
/** Truth Seeker 之后 Voltage 不涨的回合数（ibunroku：3 回合） */
export const TRUTH_SEEKER_LOCK = 3;
/** 喇叭作用半径与违规惩罚（PH） */
export const SPEAKER_RADIUS = 3;
export const SPEAKER_PENALTY = 0.2;
/** 睡眠中回合结束回复比例（PH） */
export const SLEEP_REGEN = 0.1;
/** 难度表（Cogito AAA100 EPOW/EHP；AAA112 Baton Pass 次数） */
export const DIFFICULTY: Record<Difficulty, { epow: number; ehp: number; baton: number }> = {
  safety: { epow: 0.25, ehp: 0.5, baton: Infinity },
  easy: { epow: 0.5, ehp: 0.75, baton: 3 },
  normal: { epow: 1, ehp: 1, baton: 3 },
  hard: { epow: 1.2, ehp: 1, baton: 2 },
  merciless: { epow: 1.5, ehp: 1.5, baton: 1 },
};

const STATUS_TURNS: Record<StatusId, number> = { burn: 1, freeze: 1, shock: 1, dizzy: 1, despair: 1, forget: 1, sleep: 2 };
const STATUS_OF: Partial<Record<Effect, StatusId>> = { burn: 'burn', freeze: 'freeze', shock: 'shock', dizzy: 'dizzy', despair: 'despair', forget: 'forget', sleep: 'sleep' };

export interface TriplePending { attackerId: string; targetId: string; victims: string[] }
export interface Hit { t: Unit; resist: boolean; missed?: boolean; forceDown?: boolean; noDown?: boolean }
type Runtime = { doors: Map<string, boolean>; elevators: Map<string, boolean>; switchOcc: Map<string, string | null>; cameras: Set<string>; events: Set<string>; flags: Set<string> };
type ActKind = 'melee' | 'gun' | 'skill';

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Battle {
  readonly grid: Grid;
  readonly opts: Required<RuleOptions>;
  units: Unit[];
  reserves: Unit[];
  phase: Phase = 'player';
  turn = 0;
  everKo = false;
  hurtCount = 0;
  voltage = 0;
  batonLeft: number;
  intents: Intent[] = [];
  /** 本阶段不能移动（感电/绝望/眩晕已随机移动） */
  immobile = new Set<string>();
  /** 本阶段不能行动（冻结/睡眠） */
  noAction = new Set<string>();
  /** 本阶段不能攻击（遗忘） */
  noAttack = new Set<string>();
  private pendingBonus = new Map<string, number>();
  /** 本回合谁打倒了谁（Triple Threat：只有打倒该敌人的那名角色能发动，Gamer Guides Triple Threat 页） */
  downedBy = new Map<string, string>();
  /** 本回合正处于 1 More 中的单位（Unstoppable / Reverse the Scales） */
  inOneMore = new Set<string>();
  /** 每回合一次的被动已用记录 `${id}:${passive}` */
  private turnUsed = new Set<string>();
  /** Truth Seeker：到这个回合（含）为止 Voltage 不涨 */
  voltageLockUntil = 0;
  /** 机关/事件运行时状态 */
  rt: Runtime = { doors: new Map(), elevators: new Map(), switchOcc: new Map(), cameras: new Set(), events: new Set(), flags: new Set() };
  private inEvents = false;
  private seq = 0;
  private pathway = new Set<string>();
  /** 本次指令里要拿 1 More 的单位（Follow-Up 记功） */
  private credit = new Set<string>();
  private rng: () => number;
  private listeners: ((e: BattleEvent) => void)[] = [];
  private buf: BattleEvent[] = [];

  constructor(public readonly map: MapDef, opts: RuleOptions = {}) {
    this.opts = {
      coverModel: 'p5t', leaderKoLoses: false, enemyOneMore: true, difficulty: 'normal',
      voltage: true, charge: true, followUps: 1, seed: 1, enemyChainCap: Infinity, ...opts,
    };
    this.grid = new Grid(map);
    this.rng = mulberry32(this.opts.seed);
    const diff = DIFFICULTY[this.opts.difficulty];
    this.batonLeft = diff.baton;
    this.units = map.units.map(({ def, pos }) => this.makeUnit(def, pos));
    this.reserves = (map.reserves ?? []).map((d) => ({ ...this.makeUnit(d, { x: -1, y: -1 }), reserve: true }));
    this.grid.coverHook = (p) => {
      const u = this.unitAt(p);
      return u?.prop === 'box' ? 2 : u?.prop === 'barrel' ? 1 : 0;
    };
    for (const d of map.doors ?? []) { this.rt.doors.set(d.id, d.open); this.paintDoor(d.id); }
    for (const e of map.elevators ?? []) { this.rt.elevators.set(e.id, e.up); this.paintElevator(e.id); }
    for (const sw of map.switches ?? []) this.rt.switchOcc.set(sw.id, this.unitAt(sw.pos)?.id ?? null);
  }

  private makeUnit(def: UnitDef, pos: Vec): Unit {
    const diff = DIFFICULTY[this.opts?.difficulty ?? 'normal'];
    const isEnemy = def.side === 'enemy';
    const maxHp = isEnemy ? Math.max(1, Math.round(def.maxHp * diff.ehp)) : def.maxHp;
    const scale = (n: number) => (isEnemy ? Math.max(1, Math.round(n * diff.epow)) : n);
    const role = def.role ?? (def.ai === 'ranged' ? 'shooter' : def.ai === 'melee' ? 'brute' : undefined);
    return {
      ...def,
      role,
      maxHp,
      melee: def.melee ? scale(def.melee) : 0,
      gun: def.gun ? { ...def.gun, power: scale(def.gun.power) } : undefined,
      skills: def.skills.map((s) => ({ ...s, power: isEnemy && s.kind === 'attack' ? scale(s.power) : s.power })),
      facing: def.facing ? { ...def.facing } : undefined,
      pos: { ...pos },
      anchor: { ...pos },
      hp: maxHp,
      sp: def.maxSp,
      ammo: def.gun ? def.gun.ammo ?? Infinity : 0,
      moved: false, downed: false, ko: false, oneMore: false, resistBroken: false,
      bonusMove: 0, status: [], buffs: [], charged: false, attackedThisAction: false,
      followUps: (this.opts?.followUps ?? 1) + (def.passives?.includes('followUpPlus') ? 1 : 0), dashed: false,
      charge: def.charge ?? def.charges?.[0], charges: def.charges ? [...def.charges] : undefined, passives: def.passives ? [...def.passives] : [],
      guard: false, counterReady: role === 'revenger', hitsTaken: 0, used: [], dashedAction: false,
      acted: !!def.decoy,
    } as Unit;
  }

  on(fn: (e: BattleEvent) => void) {
    this.listeners.push(fn);
    return () => { this.listeners = this.listeners.filter((f) => f !== fn); };
  }
  emit(e: BattleEvent) {
    this.buf.push(e);
    for (const l of this.listeners) l(e);
  }
  flush(): BattleEvent[] {
    const out = this.buf;
    this.buf = [];
    return out;
  }

  // ---------- 查询 ----------
  unit(id: string) {
    const u = this.units.find((x) => x.id === id) ?? this.reserves.find((x) => x.id === id);
    if (!u) throw new Error(`no unit ${id}`);
    return u;
  }
  /** 存活单位；side 缺省 = 我方 + 敌方（不含物件） */
  alive(side?: 'ally' | 'enemy' | 'neutral') {
    return this.units.filter((u) => !u.ko && (side ? u.side === side : u.side !== 'neutral'));
  }
  /** 三名主力（不含护送对象与诱饵），Triple Threat 与「全员倒下」用 */
  mainAllies() {
    return this.alive('ally').filter((u) => !u.escort && !u.decoy);
  }
  has(u: Unit, p: PassiveId) { return !!u.passives?.includes(p); }
  unitAt(p: Vec) {
    return this.units.find((u) => !u.ko && eq(u.pos, p));
  }
  occupiedSet(except?: Unit) {
    return new Set(this.units.filter((u) => !u.ko && u !== except).map((u) => key(u.pos)));
  }
  blockedFor(u: Unit) {
    // 可穿过友方，不可穿过敌方与物件
    return new Set(this.units.filter((o) => !o.ko && o !== u && (o.side !== u.side)).map((o) => key(o.pos)));
  }
  hasStatus(u: Unit, id: StatusId) { return u.status.some((s) => s.id === id); }
  hasBuff(u: Unit, id: BuffId) { return u.buffs.some((b) => b.id === id); }
  /** 当前 Charge 效果（未 Charge 或关闭时为 null） */
  activeCharge(u: Unit): ChargeId | null { return this.opts.charge && u.charged && u.charge ? u.charge : null; }
  chargeBonus(u: Unit) {
    const c = this.activeCharge(u);
    return {
      move: c === 'phantomStep' ? 1 : c === 'lightningSpeed' ? 2 : 0,
      gunRange: c === 'foresight' || c === 'springStorm' ? 1 : c === 'clairvoyance' ? 2 : 0,
      knock: c === 'ferociousLion' ? 1 : 0,
      pow: c === 'overPowered' ? OVER_POWERED : 1,
      skillArea: c === 'essenceOfSorcery' ? 1 : 0,
      bulletBreak: c === 'bulletBreak',
    };
  }
  moveRange(u: Unit) {
    if (this.immobile.has(u.id) || this.noAction.has(u.id) || u.move === 0) return 0;
    return u.move + u.bonusMove + (this.hasBuff(u, 'move') ? BUFF_MOVE : 0) + this.chargeBonus(u).move + (this.pathway.has(u.id) ? 99 : 0) +
      (this.has(u, 'godLikeSpeed') ? 1 : 0) + (this.has(u, 'pedalToTheMetal') && u.hp >= u.maxHp ? PEDAL_MOVE : 0);
  }
  gunRange(u: Unit) { return u.gun ? u.gun.range + this.chargeBonus(u).gunRange + (this.has(u, 'hawkeye') ? 1 : 0) : 0; }
  /** Dash 后还能走的格数（Stop & Go +1） */
  afterDash(u: Unit) { return this.has(u, 'stopAndGo') ? 1 : 0; }
  private reach(u: Unit) {
    return this.grid.reachable(u.anchor, this.moveRange(u), this.blockedFor(u), this.occupiedSet(u), !u.escort, this.afterDash(u));
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

  /**
   * 目标对来自 from 的攻击是否处于 Resistance（不能被打倒、伤害降低）。
   * 掩体（P5T：紧贴即算，与方向无关）；高台（Cogito AAA111：高处单位抵抗来自低处的远程攻击）。
   * 被近战/技能/撞击/爆炸打破，或身上有异常 → 无 Resistance。
   */
  hasResistance(t: Unit, from: Vec, kind: AttackKind | ActKind = 'gun'): boolean {
    if (t.side === 'neutral' || t.decoy) return false;
    if (t.resistBroken || t.status.length > 0) return false;
    // p5t：Guard 在「回合结束时贴掩体」获得（见 Unit.guard）；directional：GDD 草案的实时方向判定
    const cover = this.opts.coverModel === 'p5t' ? t.guard : this.grid.coverAgainst(t.pos, from) > 0;
    if (cover) return true;
    return kind === 'gun' && this.grid.h(t.pos) > this.grid.h(from);
  }
  /** 此刻是否满足获得 Guard 的条件（贴掩体；Never Say Die + Charge 任何地方都算；插旗附近的敌人不能获得） */
  coverNow(u: Unit): boolean {
    if (u.side === 'neutral' || u.decoy || u.ko) return false;
    if (u.side === 'enemy' && this.flagCovers(u.pos)) return false;
    if (this.has(u, 'neverSayDie') && u.charged) return true;
    return this.grid.hasAnyCover(u.pos) > 0;
  }
  private flagCovers(p: Vec) {
    return this.units.some((f) => !f.ko && f.prop === 'flag' && manhattan(f.pos, p) <= (f.aura ?? 3));
  }
  /** 一方回合结束：贴掩体的获得 Guard（Samurai Gamers Guard Guide：End a character's turn while being covered），回合结束类被动 */
  updateGuards(side: 'ally' | 'enemy') {
    for (const u of this.alive(side)) {
      if (u.decoy) continue;
      const g = this.coverNow(u);
      if (g !== u.guard) { u.guard = g; this.emit({ type: 'guard', unitId: u.id, on: g }); }
      if (this.has(u, 'regenerate1') && u.hp < u.maxHp) this.healUnit(u, Math.max(1, Math.round(u.maxHp * REGEN_RATIO)));
      if (this.has(u, 'invigorate1')) u.sp = Math.min(u.maxSp, u.sp + Math.max(1, Math.round(u.maxSp * INVIG_RATIO)));
      if (this.has(u, 'soulRepose') && u.guard) u.sp = Math.min(u.maxSp, u.sp + Math.max(1, Math.round(u.maxSp * SOUL_REPOSE_RATIO)));
    }
  }
  /** 掩体消失（被推走、门打开、升降台移动、插旗）→ 失去 Guard */
  recheckGuards() {
    for (const u of this.units) if (u.guard && !u.ko && !this.coverNow(u)) { u.guard = false; this.emit({ type: 'guard', unitId: u.id, on: false }); }
  }
  healUnit(u: Unit, amount: number) {
    const amt = Math.max(0, Math.min(u.maxHp - u.hp, amount));
    u.hp += amt;
    this.emit({ type: 'heal', unitId: u.id, amount: amt, hpLeft: u.hp });
  }
  /** 显示用掩体等级 */
  coverOf(t: Unit, from: Vec): CoverLevel {
    if (!this.hasResistance(t, from)) return 0;
    return this.opts.coverModel === 'p5t' ? this.grid.hasAnyCover(t.pos) : this.grid.coverAgainst(t.pos, from);
  }
  /** 盾兵：攻击来自正面 */
  private shieldFront(t: Unit, from: Vec) {
    if (t.role !== 'shielder' || !t.facing) return false;
    return (from.x - t.pos.x) * t.facing.x + (from.y - t.pos.y) * t.facing.y > 0;
  }
  private targetable(a: Unit, t: Unit) {
    return !t.ko && a !== t && a.side !== t.side && t.prop !== 'speaker' && t.prop !== 'flag';
  }
  canMelee(a: Unit, t: Unit, from: Vec = a.pos) {
    return !a.escort && a.melee > 0 && this.targetable(a, t) && manhattan(from, t.pos) === 1 && this.grid.h(from) === this.grid.h(t.pos);
  }
  canShoot(a: Unit, t: Unit, from: Vec = a.pos) {
    return !!a.gun && !a.escort && a.ammo > 0 && this.targetable(a, t) &&
      manhattan(from, t.pos) <= this.gunRange(a) && this.grid.lineOfSight(from, t.pos);
  }
  /** 技能无视墙体/障碍（原作：Skills bypass obstacles），只看射程与 SP；回复/辅助对友方 */
  canSkill(a: Unit, s: SkillDef, t: Unit, from: Vec = a.pos) {
    if (a.escort || t.ko) return false;
    if (s.voltage ? this.voltage < VOLTAGE_MAX || !this.opts.voltage : a.sp < this.spCost(a, s)) return false;
    const friendly = s.kind !== 'attack';
    if (friendly ? t.side !== a.side : !this.targetable(a, t)) return false;
    if (s.shape === 'self') return friendly ? true : manhattan(from, t.pos) <= (s.radius ?? 0) + this.chargeBonus(a).skillArea;
    if (s.shape === 'line') return manhattan(from, t.pos) <= (s.length ?? 1) && (from.x === t.pos.x || from.y === t.pos.y);
    return manhattan(from, t.pos) <= this.skillRange(a, s);
  }
  skillRange(a: Unit, s: SkillDef) { return s.range + (this.has(a, 'magicalMastery') && s.range > 0 ? 1 : 0); }
  /** Unstoppable：1 More 中攻击技能 SP 减半 */
  spCost(a: Unit, s: SkillDef) { return s.kind === 'attack' && this.inOneMore.has(a.id) && this.has(a, 'unstoppable') ? Math.ceil(s.sp / 2) : s.sp; }
  /** 以格子为目标的技能（Like a Phantom / Flag of Freedom） */
  canSkillAt(a: Unit, s: SkillDef, p: Vec, from: Vec = a.pos) {
    if (a.escort || a.decoy) return false;
    if (s.voltage ? this.voltage < VOLTAGE_MAX || !this.opts.voltage : a.sp < s.sp) return false;
    return this.grid.inBounds(p) && manhattan(from, p) <= this.skillRange(a, s);
  }
  /** 预估（UI 预览，「GET EM!!」提示 = willDown） */
  previewDamage(a: Unit, t: Unit, kind: ActKind, skill?: SkillDef, from: Vec = a.pos) {
    const resist = this.hasResistance(t, from, kind);
    const cb = this.chargeBonus(a);
    const miss = kind === 'gun' && (this.grid.fullCoverBlocks(t.pos, from) || this.shieldFront(t, from));
    const base = kind === 'melee' ? a.melee : kind === 'gun' ? a.gun!.power : Math.round(skill!.power * SKILL_SCALE);
    // 近战伤害不受 Guard 减免（Samurai Gamers Guard Guide），仍不能打倒
    const amount = miss ? 0 : this.calcDamage(a, t, base * cb.pow * this.trumpMult(a), kind === 'melee' ? false : resist);
    const forced = (kind === 'gun' && cb.bulletBreak) || !!skill?.downThroughCover;
    const noDown = t.side === 'neutral' || t.role === 'launcher' || (t.role === 'shielder' && kind !== 'gun') || (t.role === 'revenger' && t.counterReady);
    return { amount, cover: this.coverOf(t, from), resist, miss, willDown: !miss && (!resist || forced) && !t.downed && !noDown };
  }
  private trumpMult(a: Unit) { return a.used.includes('trumpReady') ? TRUMP_MULT : 1; }
  private calcDamage(a: Unit | null, t: Unit, base: number, resist: boolean) {
    if (base <= 0) return 0;
    let d = base;
    if (a && this.hasBuff(a, 'atk')) d *= BUFF_ATK;
    if (this.hasBuff(t, 'def')) d *= BUFF_DEF;
    if (a) {
      if (this.has(a, 'punisherOfReckless') && !t.guard) d *= DMG_UP_SMALL;
      if (this.has(a, 'sharpEyedWildcat') && t.guard) d *= DMG_UP_SMALL;
      if (this.has(a, 'finishingBlow') && t.downed) d *= DMG_UP_SMALL;
    }
    if (this.has(t, 'ironBody') && t.hitsTaken >= 2) d *= IRON_BODY_MULT;
    if (resist) { d *= RESIST_MULT; if (this.has(t, 'ironcladGuard') && t.guard) d *= IRONCLAD_MULT; }
    return Math.max(1, Math.round(d));
  }
  /** 三名我方围成的三角内的敌人（Triple Threat 无距离限制：RPG Site 评测更正） */
  triangleVictims(): string[] {
    const allies = this.mainAllies();
    if (allies.length !== 3) return [];
    const [a, b, c] = allies.map((u) => u.pos);
    return this.alive('enemy').filter((e) => pointInTriangle(e.pos, a, b, c)).map((e) => e.id);
  }
  /**
   * 当前可否发动 Triple Threat（Cogito AAA107 + Gamer Guides Triple Threat 页）：持 1 More 的角色，**它自己打倒的那个敌人**
   * 在三名主力围成的三角里（别人打倒的不算）；我方有除灼烧/绝望外的异常则不行。护送对象可以发动但不构成三角。
   */
  get pendingTriple(): TriplePending | null { return this.tripleFor(); }
  tripleFor(attackerId?: string): TriplePending | null {
    if (this.phase !== 'player') return null;
    const main = this.mainAllies();
    if (main.some((u) => u.status.some((s) => s.id !== 'burn' && s.id !== 'despair'))) return null;
    const victims = this.triangleVictims();
    if (!victims.length) return null;
    for (const holder of this.alive('ally')) {
      if (!holder.oneMore || holder.acted || (attackerId && holder.id !== attackerId)) continue;
      const mine = victims.find((id) => this.unit(id).downed && this.downedBy.get(id) === holder.id);
      if (mine) return { attackerId: holder.id, targetId: mine, victims };
    }
    return null;
  }
  /** 喇叭当前禁止的行动 */
  speakerBans(): { id: string; pos: Vec; ban: ActKind }[] {
    return this.alive('neutral').filter((u) => u.prop === 'speaker' && u.bans?.length)
      .map((u) => ({ id: u.id, pos: u.pos, ban: u.bans![(Math.max(1, this.turn) - 1) % u.bans!.length] }));
  }

  // ---------- 流程 ----------
  start(): BattleEvent[] {
    // 开场：已经贴着掩体的单位视为上回合结束时就位 → 带 Guard
    for (const u of this.units) if (!u.ko && u.side !== 'neutral') u.guard = this.coverNow(u);
    this.startPlayerPhase();
    return this.flush();
  }

  /** 换装 Charge 技能（原作在技能树里二选一；这里只允许在还没 Charge 时切换） */
  selectCharge(unitId: string, charge: ChargeId): BattleEvent[] {
    const u = this.unit(unitId);
    if (!u.charges?.includes(charge)) return this.err('这名角色没有这个 Charge 技能');
    if (u.charged) return this.err('Charge 中不能换');
    u.charge = charge;
    this.emit({ type: 'message', text: `${u.name} 装备 Charge：${charge}` });
    return this.flush();
  }

  /** 一方阶段开始：起身、恢复 Resistance、异常/增益结算 */
  beginSidePhase(side: 'ally' | 'enemy') {
    this.pathway.clear();
    this.inOneMore.clear();
    if (side === 'ally') {
      this.turnUsed.clear();
      this.downedBy.clear();
      // Revenger 的反击每回合刷新（Gamer Guides One More 表）
      for (const e of this.alive('enemy')) if (e.role === 'revenger') e.counterReady = true;
    }
    for (const u of this.units) if (!u.ko) u.hitsTaken = 0;
    for (const u of this.alive(side)) {
      u.moved = false; u.acted = !!u.decoy; u.oneMore = false; u.resistBroken = false; u.attackedThisAction = false; u.dashed = false; u.dashedAction = false;
      u.followUps = this.opts.followUps + (this.has(u, 'followUpPlus') ? 1 : 0);
      u.anchor = { ...u.pos };
      u.bonusMove = this.pendingBonus.get(u.id) ?? 0;
      this.pendingBonus.delete(u.id);
      if (u.downed) { u.downed = false; this.emit({ type: 'standUp', unitId: u.id }); }
      this.immobile.delete(u.id); this.noAction.delete(u.id); this.noAttack.delete(u.id);
      for (const s of [...u.status]) {
        if (s.id === 'burn') {
          // 灼烧不会致死（Cogito AAA101）
          const dmg = Math.min(u.hp - 1, Math.max(1, Math.round(u.maxHp * BURN_RATIO)));
          if (dmg > 0) this.applyDamage(u, dmg, 0, false, 'status', null);
        }
        if (s.id === 'shock' || s.id === 'despair') { this.immobile.add(u.id); this.emit({ type: 'skipTurn', unitId: u.id, reason: s.id }); }
        if (s.id === 'freeze' || s.id === 'sleep') { this.noAction.add(u.id); this.emit({ type: 'skipTurn', unitId: u.id, reason: s.id }); }
        if (s.id === 'forget') { this.noAttack.add(u.id); this.emit({ type: 'skipTurn', unitId: u.id, reason: s.id }); }
        if (s.id === 'dizzy') this.dizzyMove(u);
        if (s.id === 'sleep') {
          const hp = Math.round(u.maxHp * SLEEP_REGEN), sp = Math.round(u.maxSp * SLEEP_REGEN);
          u.hp = Math.min(u.maxHp, u.hp + hp); u.sp = Math.min(u.maxSp, u.sp + sp);
          this.emit({ type: 'heal', unitId: u.id, amount: hp, hpLeft: u.hp });
        }
        s.turns--;
        if (s.turns <= 0) this.emit({ type: 'statusEnd', unitId: u.id, status: s.id, reason: 'expired' });
      }
      u.status = u.status.filter((s) => s.turns > 0);
      for (const b of u.buffs) b.turns--;
      u.buffs = u.buffs.filter((b) => b.turns > 0);
    }
    if (side === 'ally') {
      for (const s of this.speakerBans()) this.emit({ type: 'speakerBan', unitId: s.id, bans: [s.ban] });
    }
  }

  /** 眩晕：随机移动（仍可正常攻击）——Megami Tensei Wiki / Cogito AAA101 */
  private dizzyMove(u: Unit) {
    const r = this.grid.reachable(u.pos, u.move + u.bonusMove, this.blockedFor(u), this.occupiedSet(u), false);
    const opts = [...r.values()].filter((n) => n.dist >= 0);
    const pick = opts[Math.floor(this.rng() * opts.length)];
    const from = { ...u.pos };
    if (pick && !eq(pick.pos, u.pos)) {
      u.pos = { ...pick.pos };
      this.emit({ type: 'dizzyMove', unitId: u.id, from, to: pick.pos });
      this.afterLand(u, null);
    }
    u.anchor = { ...u.pos };
    this.immobile.add(u.id);
  }

  private startPlayerPhase() {
    this.turn++;
    this.phase = 'player';
    this.emit({ type: 'phaseStart', phase: 'player', turn: this.turn });
    const w = this.map.win;
    if (w.type === 'survive' && this.turn > w.turns) return this.finish('won');
    if (this.map.turnLimit && this.turn > this.map.turnLimit) return this.finish('lost', '超过回合上限');
    // 定时门：每 everyTurns 回合开关一次（Neoseeker M24/M25「doors opening every other turn」）
    for (const d of this.map.doors ?? []) if (d.everyTurns && this.turn > 1 && (this.turn - 1) % d.everyTurns === 0) this.setDoor(d.id, !this.rt.doors.get(d.id));
    this.beginSidePhase('ally');
    if (this.checkEnd()) return;
    for (const u of this.units) if (u.side === 'ally' && u.ko && !u.reserve) this.offerBaton(u);
    this.intents = computeIntents(this);
    this.emit({ type: 'intents', intents: this.intents });
  }

  private guard(u: Unit, needAction = true): string | null {
    if (this.phase !== 'player') return '不是我方回合';
    if (u.side !== 'ally') return '不能操作敌方';
    if (u.ko) return '已倒下';
    if (needAction && u.acted) return '已行动';
    if (needAction && this.noAction.has(u.id)) return '冻结/睡眠中，不能行动';
    if (u.decoy) return '诱饵不能行动';
    return null;
  }
  private attackGuard(u: Unit): string | null {
    if (u.escort) return '护送对象不能攻击';
    if (this.noAttack.has(u.id)) return '遗忘中，不能攻击';
    return null;
  }
  private err(message: string): BattleEvent[] {
    this.emit({ type: 'error', message });
    return this.flush();
  }

  /** 移动：行动前可在范围内反复改位置（从 anchor 算）；经过梯子/跳台 = Dash */
  move(unitId: string, dest: Vec): BattleEvent[] {
    const u = this.unit(unitId);
    const g = this.guard(u);
    if (g) return this.err(g);
    if (eq(dest, u.pos)) return this.flush();
    if (this.immobile.has(u.id)) return this.err('本回合不能移动');
    const path = this.pathFor(u, dest);
    if (!path.length) return this.err('到不了那里');
    this.moveAlong(u, path);
    u.moved = !eq(dest, u.anchor);
    this.checkReach();
    this.checkEnd();
    return this.flush();
  }

  /** 沿路径移动（我方/敌方共用）：Dash 事件、摄像头、开关、出口 */
  moveAlong(u: Unit, path: Vec[]) {
    const from = { ...u.pos };
    const dest = path[path.length - 1];
    u.pos = { ...dest };
    this.emit({ type: 'move', unitId: u.id, path, from });
    u.dashedAction = false;
    for (let i = 1; i < path.length; i++) {
      const l = this.grid.linkBetween(path[i - 1], path[i]);
      if (l) { u.dashed = true; u.dashedAction = true; this.emit({ type: 'dash', unitId: u.id, from: path[i - 1], to: path[i], kind: l.kind }); this.pathway.delete(u.id); }
    }
    if (u.side === 'ally') this.checkCameras(u, path);
    this.applyMechanisms();
  }

  melee(unitId: string, targetId: string): BattleEvent[] {
    const u = this.unit(unitId), t = this.unit(targetId);
    const g = this.guard(u) ?? this.attackGuard(u) ?? (this.canMelee(u, t) ? null : '不在近战距离（需同一高度相邻）');
    if (g) return this.err(g);
    this.beginAct(u, 'melee');
    const hits = this.doMelee(u, t);
    this.finishAct(u, hits);
    return this.flush();
  }

  shoot(unitId: string, targetId: string): BattleEvent[] {
    const u = this.unit(unitId), t = this.unit(targetId);
    const g = this.guard(u) ?? this.attackGuard(u) ?? (this.canShoot(u, t) ? null : '打不到（射程/视线）');
    if (g) return this.err(g);
    this.beginAct(u, 'gun');
    const hits = this.doShoot(u, t);
    this.finishAct(u, hits);
    return this.flush();
  }

  skill(unitId: string, skillId: string, targetId: string): BattleEvent[] {
    const u = this.unit(unitId), t = this.unit(targetId);
    const s = u.skills.find((x) => x.id === skillId) ?? (u.unique?.id === skillId ? u.unique : undefined);
    if (!s) return this.err('没有这个技能');
    const g = this.guard(u) ?? (s.kind === 'attack' ? this.attackGuard(u) : u.escort ? '护送对象不能行动' : null) ??
      (this.canSkill(u, s, t) ? null : s.voltage ? 'Voltage 未满或超出射程' : 'SP 不足或超出射程');
    if (g) return this.err(g);
    this.beginAct(u, 'skill');
    const hits = this.doSkill(u, s, t.pos);
    if (s.extraAction) { this.finishExtra(u); return this.flush(); }
    this.finishAct(u, hits);
    return this.flush();
  }

  /** 以格子为目标的 Unique（Like a Phantom 放诱饵 / Flag of Freedom 插旗） */
  uniqueAt(unitId: string, at: Vec): BattleEvent[] {
    const u = this.unit(unitId);
    const s = u.unique;
    if (!s) return this.err('没有专属技能');
    const g = this.guard(u) ?? (this.canSkillAt(u, s, at) ? null : 'Voltage 未满或超出射程');
    if (g) return this.err(g);
    this.beginAct(u, 'skill');
    const hits = this.doSkill(u, s, at);
    if (s.extraAction) { this.finishExtra(u); return this.flush(); }
    this.finishAct(u, hits);
    return this.flush();
  }

  /** Unique（Voltage）技能：self 型无需目标 */
  unique(unitId: string, targetId?: string): BattleEvent[] {
    const u = this.unit(unitId);
    if (!u.unique) return this.err('没有专属技能');
    if (u.unique.shape === 'self' && !targetId) {
      const g = this.guard(u) ?? (this.opts.voltage && this.voltage >= VOLTAGE_MAX ? null : 'Voltage 未满');
      if (g) return this.err(g);
      this.beginAct(u, 'skill');
      const hits = this.doSkill(u, u.unique, u.pos);
      if (u.unique.extraAction) { this.finishExtra(u); return this.flush(); }
      this.finishAct(u, hits);
      return this.flush();
    }
    if (!targetId) return this.err('请选择目标');
    return this.skill(unitId, u.unique.id, targetId);
  }

  /** Launcher 投掷（Cogito AAA115：可投掷附近的敌我单位）：把 v 扔到 dest；扔的是对手则受伤并失去 Resistance */
  heave(l: Unit, v: Unit, dest: Vec) {
    const from = { ...v.pos };
    const h0 = this.grid.h(from);
    v.pos = { ...dest };
    this.emit({ type: 'throw', unitId: l.id, targetId: v.id, from, to: dest });
    if (v.side !== l.side) {
      this.applyDamage(v, this.calcDamage(l, v, l.melee, false), 0, false, 'throw', l);
      if (!v.ko) this.breakResist(v);
    }
    if (!v.ko) this.afterLand(v, l, h0);
    this.applyMechanisms();
  }

  /** 支援者：把我方一名单位与一名敌人换位（Cogito AAA115 Supporter：「swap the position of an ally with a random enemy」） */
  swapUnits(by: Unit, a: Unit, b: Unit) {
    const pa = { ...a.pos };
    a.pos = { ...b.pos }; b.pos = pa;
    this.emit({ type: 'swap', unitId: a.id, withId: b.id });
    this.afterLand(a, null); this.afterLand(b, null);
    this.applyMechanisms();
    void by;
  }

  /** 待机：不攻击就结束 → Charge（Fandom P5T Gameplay / Cogito AAA108） */
  wait(unitId: string): BattleEvent[] {
    const u = this.unit(unitId);
    const g = this.guard(u, false);
    if (g) return this.err(g);
    this.maybeCharge(u);
    u.acted = true; u.oneMore = false;
    this.emit({ type: 'wait', unitId });
    this.autoEndIfDone();
    return this.flush();
  }

  /** 发动 Triple Threat：用掉持有者的 1 More；三角内所有敌人受伤（无视 Resistance） */
  tripleThreat(attackerId?: string): BattleEvent[] {
    const p = this.tripleFor(attackerId) ?? (attackerId ? null : this.pendingTriple);
    if (!p) return this.err('现在不能总攻（需要持 1 More 的角色把它自己打倒的敌人围进三角）');
    const attacker = this.unit(p.attackerId);
    attacker.acted = true; attacker.oneMore = false; attacker.attackedThisAction = true;
    const allies = this.mainAllies();
    this.emit({ type: 'tripleThreat', attackerId: attacker.id, allies: allies.map((a) => a.id), victims: p.victims });
    const dmg = Math.round(allies.reduce((s, a) => s + a.melee + (a.gun?.power ?? 0), 0) * TRIPLE_THREAT_MULT);
    for (const id of p.victims) {
      const v = this.unit(id);
      if (!v.ko) this.applyDamage(v, dmg, 0, false, 'triple', attacker);
    }
    // Break & Recovery：总攻后全员回复
    if (allies.some((a) => this.has(a, 'breakAndRecovery'))) for (const a of allies) this.healUnit(a, Math.round(a.maxHp * BREAK_RECOVERY_RATIO));
    if (!this.checkEnd()) this.autoEndIfDone();
    return this.flush();
  }

  /** 放弃总攻（保留 1 More）——规则上无副作用，留给 UI 调用 */
  declineTriple(): BattleEvent[] {
    return this.flush();
  }

  /** Baton Pass：倒下的队员换替补上场（Cogito AAA112），次数按难度；替补出现在倒下位置（或最近空格） */
  batonPass(koId: string, reserveId: string): BattleEvent[] {
    if (this.phase !== 'player') return this.err('不是我方回合');
    const out = this.units.find((u) => u.id === koId);
    const inn = this.reserves.find((u) => u.id === reserveId);
    if (!out || !out.ko || out.side !== 'ally' || out.escort) return this.err('只能替换倒下的队员');
    if (!inn) return this.err('没有这名替补');
    if (this.batonLeft <= 0) return this.err('Baton Pass 次数用完');
    const at = this.nearestFree(out.pos);
    if (!at) return this.err('没有空位');
    this.reserves = this.reserves.filter((u) => u !== inn);
    this.units = this.units.filter((u) => u !== out);
    inn.pos = { ...at }; inn.anchor = { ...at }; inn.reserve = false;
    this.units.push(inn);
    this.batonLeft--;
    this.emit({ type: 'batonPass', outId: out.id, inId: inn.id, at, left: this.batonLeft });
    this.intents = computeIntents(this);
    this.emit({ type: 'intents', intents: this.intents });
    return this.flush();
  }

  endPlayerPhase(): BattleEvent[] {
    if (this.phase !== 'player') return this.err('不是我方回合');
    this.runEnemyPhase();
    return this.flush();
  }

  // ---------- 行动内部 ----------
  private beginAct(u: Unit, kind: ActKind) {
    u.oneMore = false;
    // 喇叭：在作用范围内做了被禁止的行动 → 惩罚（Cogito AAA115 Loudspeaker）
    for (const s of this.speakerBans()) {
      if (s.ban === kind && manhattan(s.pos, u.pos) <= SPEAKER_RADIUS && u.side === 'ally') {
        this.emit({ type: 'penalty', unitId: u.id, speakerId: s.id, action: kind });
        this.applyDamage(u, Math.max(1, Math.round(u.maxHp * SPEAKER_PENALTY)), 0, false, 'penalty', null);
        this.breakResist(u);
      }
    }
  }
  /** 用掉 Charge：返回本次攻击生效的加成 */
  private useCharge(u: Unit) {
    const cb = this.chargeBonus(u);
    const c = this.activeCharge(u);
    if (c) { u.charged = false; this.emit({ type: 'chargeUsed', unitId: u.id, charge: c }); }
    u.attackedThisAction = true;
    // Trump Card 的「下次攻击 ×1.5」在这次攻击用掉；Daredevil 击退 +2
    const pow = cb.pow * this.trumpMult(u);
    u.used = u.used.filter((x) => x !== 'trumpReady');
    return { ...cb, pow, knock: cb.knock + (this.has(u, 'daredevil') ? DAREDEVIL_KNOCK : 0) };
  }
  private maybeCharge(u: Unit) {
    if (!this.opts.charge || !u.charge || u.attackedThisAction || u.charged || u.ko || this.noAction.has(u.id) || u.side !== 'ally') return;
    u.charged = true;
    this.emit({ type: 'charge', unitId: u.id, charge: u.charge });
  }

  /** 近战：伤害 → 击退 4 格（攻击者占据原位）→ 打破 Resistance（Cogito AAA103） */
  doMelee(u: Unit, t: Unit): Hit[] {
    const cb = this.useCharge(u);
    this.emit({ type: 'attack', kind: 'melee', attackerId: u.id, targetId: t.id });
    if (t.prop === 'barrel') { this.explode(t, u); return []; }
    const resist = this.hasResistance(t, u.pos, 'melee');
    const noDown = t.role === 'shielder' || t.role === 'launcher' || (t.role === 'revenger' && t.counterReady);
    // 近战伤害不受 Guard 减免（Samurai Gamers Guard Guide），但掩体中的目标不会被打倒
    if (t.prop !== 'box') this.applyDamage(t, this.calcDamage(u, t, u.melee * cb.pow, false), this.coverOf(t, u.pos), resist, 'melee', u);
    const lucky = this.has(u, 'luckyPunch') && this.rng() < LUCKY_CHANCE;
    if (lucky) this.emit({ type: 'passive', unitId: u.id, passive: 'luckyPunch' });
    const hit: Hit = { t, resist, noDown, forceDown: lucky };
    if (!t.ko) {
      const old = { ...t.pos };
      const moved = this.push(t, this.dirFrom(u.pos, t.pos), MELEE_KNOCKBACK + cb.knock, u, false);
      if (moved && !this.unitAt(old)) { u.pos = old; this.emit({ type: 'meleeStep', unitId: u.id, to: old }); }
      this.breakResist(t);
      this.shieldTurn(t, u);
      this.onHitReaction(t, u);
    }
    return [hit];
  }

  doShoot(u: Unit, t: Unit): Hit[] {
    const cb = this.useCharge(u);
    if (u.ammo !== Infinity) u.ammo--;
    this.emit({ type: 'attack', kind: 'gun', attackerId: u.id, targetId: t.id });
    const shape = u.gun!.shape ?? 'single';
    const victims = shape === 'single' ? [t] : [t, ...this.units.filter((o) => o !== t && !o.ko && this.targetable(u, o) && manhattan(o.pos, t.pos) <= 1 && (shape === 'explode' || this.grid.lineOfSight(u.pos, o.pos)))];
    const hits: Hit[] = [];
    for (const v of victims) {
      if (v.ko) continue;
      if (v.prop === 'barrel') { this.explode(v, u); continue; }
      if (v.prop === 'box') continue;
      if (this.grid.fullCoverBlocks(v.pos, u.pos)) { this.emit({ type: 'miss', unitId: v.id, reason: 'fullCover' }); hits.push({ t: v, resist: true, missed: true }); continue; }
      if (this.shieldFront(v, u.pos)) { this.emit({ type: 'miss', unitId: v.id, reason: 'shield' }); hits.push({ t: v, resist: true, missed: true }); continue; }
      const resist = this.hasResistance(v, u.pos, 'gun');
      const noDown = v.role === 'launcher' || (v.role === 'revenger' && v.counterReady);
      this.applyDamage(v, this.calcDamage(u, v, u.gun!.power * cb.pow, resist), this.coverOf(v, u.pos), resist, 'gun', u);
      // Broad Perspective：从高处射击有几率打倒
      const broad = this.has(u, 'broadPerspective') && this.grid.h(u.pos) > this.grid.h(v.pos) && this.rng() < BROAD_CHANCE;
      if (broad) this.emit({ type: 'passive', unitId: u.id, passive: 'broadPerspective' });
      hits.push({ t: v, resist, forceDown: cb.bulletBreak || broad, noDown });
      if (!v.ko) this.onHitReaction(v, u);
    }
    // Reverse the Scales：1 More 中开枪 → 与目标换位，每回合一次
    if (this.has(u, 'reverseTheScales') && this.inOneMore.has(u.id) && !t.ko && !u.ko && !t.prop && t.role !== 'shielder' && !this.turnUsed.has(`${u.id}:rts`)) {
      this.turnUsed.add(`${u.id}:rts`);
      this.emit({ type: 'passive', unitId: u.id, passive: 'reverseTheScales' });
      const a = { ...u.pos }; u.pos = { ...t.pos }; t.pos = a;
      this.emit({ type: 'swap', unitId: u.id, withId: t.id });
      this.afterLand(u, null); this.afterLand(t, null);
    }
    return hits;
  }

  /** 技能结算（攻击/回复/辅助；Unique 同走这里） */
  doSkill(u: Unit, s: SkillDef, center: Vec): Hit[] {
    const cb = this.useCharge(u);
    if (s.voltage) {
      this.voltage = 0;
      this.emit({ type: 'uniqueSkill', unitId: u.id, skillId: s.id });
      this.emit({ type: 'voltage', value: 0, max: VOLTAGE_MAX });
    } else u.sp -= this.spCost(u, s);
    const primary = this.unitAt(center);
    this.emit({ type: 'attack', kind: s.voltage ? 'unique' : 'skill', attackerId: u.id, targetId: primary?.id ?? u.id, skillId: s.id });
    const area = (s.radius ?? 0) + (s.kind === 'attack' ? cb.skillArea : 0);
    // 受影响单位
    let tiles: Vec[] | null = null;
    if (s.shape === 'line') {
      const d = this.dirFrom(u.pos, center);
      tiles = Array.from({ length: s.length ?? 1 }, (_, i) => add(u.pos, d, i + 1));
    }
    const inShape = (o: Unit) =>
      s.shape === 'single' ? eq(o.pos, center)
        : s.shape === 'area' ? manhattan(o.pos, center) <= area
          : s.shape === 'self' ? (s.allAllies ? true : manhattan(o.pos, u.pos) <= area)
            : tiles!.some((p) => eq(p, o.pos));
    if (s.kind !== 'attack') {
      if (s.moveBoost) { this.pathway.add(u.id); this.emit({ type: 'buff', unitId: u.id, buff: 'move', turns: 1 }); return []; }
      if (s.decoys) { this.summonDecoys(u, center, s.decoys); return []; }
      if (s.flag) { this.placeFlag(u, center, s.radius ?? 3); return []; }
      if (s.allyExtra) {
        for (const a of this.mainAllies()) if (a !== u && a.acted) {
          a.acted = false; a.moved = false; a.anchor = { ...a.pos }; a.attackedThisAction = false;
          this.emit({ type: 'oneMore', unitId: a.id });
        }
        this.voltageLockUntil = this.turn + TRUTH_SEEKER_LOCK - 1;
        this.emit({ type: 'message', text: `其余队员可再行动一次；第 ${this.voltageLockUntil} 回合前 Voltage 不涨` });
        return [];
      }
      const targets = this.alive(u.side as 'ally' | 'enemy').filter(inShape);
      for (const o of targets) {
        if (s.kind === 'heal') {
          const amt = Math.min(o.maxHp - o.hp, Math.round(s.power * HEAL_SCALE));
          o.hp += amt;
          this.emit({ type: 'heal', unitId: o.id, amount: amt, hpLeft: o.hp });
          if (s.cure && o.status.length) {
            for (const st of o.status) this.emit({ type: 'statusEnd', unitId: o.id, status: st.id, reason: 'cured' });
            o.status = [];
          }
        } else if (s.buff) {
          o.buffs = o.buffs.filter((b) => b.id !== s.buff);
          o.buffs.push({ id: s.buff, turns: BUFF_TURNS });
          this.emit({ type: 'buff', unitId: o.id, buff: s.buff, turns: BUFF_TURNS });
        }
      }
      return [];
    }
    const victims = this.units.filter((o) => !o.ko && this.targetable(u, o) && inShape(o));
    const hits: Hit[] = [];
    let despairCount = 0;
    const base = Math.round(s.power * SKILL_SCALE) * cb.pow;
    for (const o of victims) {
      if (o.ko) continue;
      if (o.prop === 'barrel') { this.explode(o, u); continue; }
      if (o.prop === 'box') continue;
      const resist = this.hasResistance(o, u.pos, 'skill');
      this.applyDamage(o, this.calcDamage(u, o, base, resist), this.coverOf(o, u.pos), resist, s.voltage ? 'unique' : 'skill', u);
      hits.push({ t: o, resist, forceDown: s.downThroughCover, noDown: o.role === 'shielder' || o.role === 'launcher' || (o.role === 'revenger' && o.counterReady) });
      if (o.ko) continue;
      this.breakResist(o); // 任何攻击技能都会打破 Resistance
      const st = s.effect ? STATUS_OF[s.effect] : undefined;
      if (st) this.addStatus(o, st);
      if (s.effect === 'despair') despairCount++;
      // 位移效果
      const away = this.dirFrom(s.shape === 'line' || s.shape === 'self' ? u.pos : u.pos, o.pos);
      if (s.effect === 'burn') this.push(o, away, 1, u, false);
      if (s.effect === 'sweep') this.push(o, away, SWEEP_DIST, u, true);
      if (s.knockAll) this.push(o, this.dirFrom(u.pos, center), MELEE_KNOCKBACK, u, false);
      if (s.effect === 'hypno') this.pull(o, s.voltage && s.shape === 'area' ? center : u.pos, HYPNO_DIST, u, 'hypno');
      this.shieldTurn(o, u);
      if (!o.ko) this.onHitReaction(o, u);
    }
    if (s.effect === 'vortex') {
      // 漩涡：把范围内的敌方单位拉向中心（Megami Tensei Wiki: Vortex）
      const pulled = victims.filter((o) => !o.ko && o.prop !== 'barrel').sort((a, b) => manhattan(a.pos, center) - manhattan(b.pos, center));
      for (const o of pulled) this.pull(o, center, area, u, 'vortex');
    }
    if (despairCount) this.pendingBonus.set(u.id, (this.pendingBonus.get(u.id) ?? 0) + DESPAIR_MOVE * despairCount);
    return hits;
  }

  /** Like a Phantom：在目标格附近放诱饵（敌人优先攻击，被打一下消失） */
  summonDecoys(owner: Unit, at: Vec, n: number) {
    for (let i = 0; i < n; i++) {
      const p = this.nearestFree(at);
      if (!p) break;
      const d = this.makeUnit({ ...decoyDef(`decoy${++this.seq}`), ownerId: owner.id }, p);
      d.acted = true;
      this.units.push(d);
      this.emit({ type: 'decoy', unitId: d.id, ownerId: owner.id, at: p });
    }
  }
  /** Flag of Freedom：插旗；旗子半径内敌人失去掩护且不能获得 Guard，我方回合结束回复 */
  placeFlag(owner: Unit, at: Vec, radius: number) {
    const p = this.unitAt(at) ? this.nearestFree(at) : at;
    if (!p) return;
    const f = this.makeUnit({ id: `flag${++this.seq}`, name: '自由之旗', side: 'neutral', prop: 'flag', maxHp: 999, maxSp: 0, move: 0, melee: 0, skills: [], aura: radius, ownerId: owner.id }, p);
    this.units.push(f);
    this.emit({ type: 'flagPlaced', unitId: f.id, ownerId: owner.id, at: p });
    for (const e of this.alive('enemy')) if (manhattan(e.pos, p) <= radius) this.breakResist(e);
    this.recheckGuards();
  }

  addStatus(o: Unit, st: StatusId) {
    if (o.side === 'neutral') return;
    // Ailment Shield：相邻队友自动解除异常，每回合一次
    if (o.side === 'ally') {
      const sh = this.alive('ally').find((a) => a !== o && this.has(a, 'ailmentShield') && manhattan(a.pos, o.pos) === 1 && !this.turnUsed.has(`${a.id}:as`));
      if (sh) { this.turnUsed.add(`${sh.id}:as`); this.emit({ type: 'passive', unitId: sh.id, passive: 'ailmentShield' }); return; }
    }
    o.status = o.status.filter((x) => x.id !== st);
    o.status.push({ id: st, turns: STATUS_TURNS[st] });
    this.emit({ type: 'status', unitId: o.id, status: st, turns: STATUS_TURNS[st] });
  }

  /** 被打后的特殊反应：Revenger 跳过来反击；Teleporter 与攻击者换位（Cogito AAA115） */
  private onHitReaction(t: Unit, by: Unit) {
    if (t.ko || by.ko || t.side === by.side || t.side === 'neutral') return;
    if (this.hasStatus(t, 'freeze') || this.hasStatus(t, 'sleep')) return;
    if (t.role === 'teleporter') {
      const a = { ...t.pos };
      t.pos = { ...by.pos }; by.pos = a;
      this.emit({ type: 'teleportSwap', unitId: t.id, withId: by.id });
      this.afterLand(by, null); this.afterLand(t, null);
    }
    // Revenger：每回合第一次被打就跳过去反击，然后失去 Resistance（Cogito AAA115 / Twinfinite / Gamer Guides One More 表）
    if (t.role === 'revenger' && t.counterReady) {
      t.counterReady = false;
      this.counterAttack(t, by);
      if (!t.ko) this.breakResist(t);
    }
  }
  private counterAttack(t: Unit, by: Unit) {
    {
      const spots = DIRS.map((d) => add(by.pos, d))
        .filter((p) => this.grid.walkable(p) && !this.unitAt(p) && this.grid.h(p) === this.grid.h(by.pos) && manhattan(p, t.pos) <= REVENGER_LEAP)
        .sort((a, b) => manhattan(a, t.pos) - manhattan(b, t.pos));
      const spot = manhattan(t.pos, by.pos) === 1 && this.grid.h(t.pos) === this.grid.h(by.pos) ? t.pos : spots[0];
      if (!spot) return;
      const from = { ...t.pos };
      t.pos = { ...spot };
      this.emit({ type: 'counter', unitId: t.id, targetId: by.id, from, to: spot });
      this.emit({ type: 'attack', kind: 'counter', attackerId: t.id, targetId: by.id });
      const resist = this.hasResistance(by, t.pos, 'melee');
      this.applyDamage(by, this.calcDamage(t, by, t.melee, false), this.coverOf(by, t.pos), resist, 'counter', t);
      if (!by.ko) {
        const old = { ...by.pos };
        if (this.push(by, this.dirFrom(t.pos, by.pos), MELEE_KNOCKBACK, t, false) && !this.unitAt(old)) {
          t.pos = old; this.emit({ type: 'meleeStep', unitId: t.id, to: old });
        }
        this.breakResist(by);
        if (!resist && !by.downed && !by.ko) { by.downed = true; this.emit({ type: 'down', unitId: by.id }); }
      }
    }
  }

  /** 盾兵被近战/技能命中：转向攻击者 */
  private shieldTurn(t: Unit, by: Unit) {
    if (t.role !== 'shielder' || t.ko) return;
    t.facing = this.dirFrom(t.pos, by.pos);
    this.emit({ type: 'shieldTurn', unitId: t.id, facing: t.facing });
  }

  /** 额外行动型 Unique（Femme Fatale 等）：不消耗行动，从当前位置重新开始一段移动+行动 */
  private finishExtra(u: Unit) {
    u.acted = false; u.moved = false; u.anchor = { ...u.pos };
    if (this.checkEnd()) return;
  }

  /** 我方行动结算：倒地 → 1 More；Follow-Up 记功也给 1 More */
  private finishAct(u: Unit, hits: Hit[]) {
    const downedAny = this.markDowns(hits, u);
    const credited = this.credit.delete(u.id);
    u.acted = true;
    if (this.checkEnd()) return;
    if (u.ko) { this.autoEndIfDone(); return; }
    if (downedAny || credited) {
      this.grantOneMore(u);
      const p = this.pendingTriple;
      if (p) this.emit({ type: 'tripleThreatReady', attackerId: u.id, targetId: p.targetId, victims: p.victims });
      return;
    }
    this.autoEndIfDone();
  }
  grantOneMore(u: Unit) {
    u.oneMore = true;
    u.acted = false; u.moved = false; u.attackedThisAction = false; u.dashedAction = false;
    u.anchor = { ...u.pos };
    this.inOneMore.add(u.id);
    // 绝望偷来的移动力在「下一次移动」生效（可以是这次 1 More）；Comandante：1 More 时移动 +1
    u.bonusMove = (this.pendingBonus.get(u.id) ?? 0) + (this.has(u, 'comandante') ? 1 : 0);
    this.pendingBonus.delete(u.id);
    this.emit({ type: 'oneMore', unitId: u.id });
  }
  /**
   * 命中结算：没有 Resistance（或强制打倒）且未倒地的目标 → 倒地。返回是否打倒了任何目标。
   * 1 More 可无限连锁，只要每次打倒的是不同敌人；范围攻击打倒多个也只给一次 1 More。
   */
  markDowns(hits: Hit[], by?: Unit): boolean {
    let downedAny = false;
    for (const h of hits) {
      if (h.missed || h.t.ko || h.t.downed || h.t.side === 'neutral' || h.t.decoy) continue;
      // forceDown（Phantom Judge / Bullet Break / Broad Perspective / Lucky Punch）无视掩体；Launcher 永远不能被打倒
      if (h.noDown && !(h.forceDown && h.t.role !== 'launcher' && h.t.role !== 'shielder')) continue;
      if (h.resist && !h.forceDown) continue;
      h.t.downed = true;
      downedAny = true;
      if (by) this.downedBy.set(h.t.id, by.id);
      this.emit({ type: 'down', unitId: h.t.id });
    }
    return downedAny;
  }
  /** 敌人用：拿到本次指令里的 Follow-Up 记功（敌方无 Follow-Up，恒 false） */
  takeCredit(u: Unit) { return this.credit.delete(u.id); }

  dirFrom(a: Vec, b: Vec): Vec {
    const dx = b.x - a.x, dy = b.y - a.y;
    if (dx === 0 && dy === 0) return { x: 0, y: 1 };
    return Math.abs(dx) >= Math.abs(dy) ? { x: Math.sign(dx), y: 0 } : { x: 0, y: Math.sign(dy) };
  }

  /**
   * 击退 dist 格。逐格：被墙/掩体/更高地形挡住就停；撞到单位则双方失去 Resistance；
   * 走到更低的格 = 从高台坠落（停在落点）。fly = 吹飞（越过障碍，落在最远的合法格）。
   * 盾兵不会被移动；Launcher 击退距离减半（Cogito AAA115）。返回是否真的移动了。
   */
  push(t: Unit, d: Vec, dist: number, by: Unit | null, fly: boolean): boolean {
    if (t.role === 'shielder') { this.emit({ type: 'knockback', unitId: t.id, from: t.pos, to: t.pos, blocked: true }); return false; }
    if (t.role === 'launcher') dist = Math.floor(dist / 2);
    const from = { ...t.pos };
    const h0 = this.grid.h(from);
    if (fly) {
      for (let k = dist; k >= 1; k--) {
        const p = add(from, d, k);
        if (!this.grid.walkable(p) || this.unitAt(p) || this.grid.h(p) > h0) continue;
        t.pos = p;
        this.emit({ type: 'knockback', unitId: t.id, from, to: p, blocked: false, fly: true });
        this.afterLand(t, by, h0);
        return true;
      }
      this.emit({ type: 'knockback', unitId: t.id, from, to: from, blocked: true, fly: true });
      return false;
    }
    let cur = { ...from };
    let collided: Unit | undefined;
    let fell = false;
    for (let i = 0; i < dist; i++) {
      const n = add(cur, d);
      const other = this.unitAt(n);
      if (other) { collided = other; break; }
      if (!this.grid.walkable(n) || this.grid.h(n) > this.grid.h(cur)) break;
      const drop = this.grid.h(n) < this.grid.h(cur);
      cur = n;
      if (drop) { fell = true; break; }
    }
    const moved = !eq(cur, from);
    t.pos = cur;
    this.emit({ type: 'knockback', unitId: t.id, from, to: cur, blocked: !moved || !!collided || (!fell && manhattan(from, cur) < dist), collidedWith: collided?.id });
    if (collided) {
      if (collided.prop === 'barrel') this.explode(collided, by);
      else { this.breakResist(collided); this.breakResist(t); }
    }
    if (moved) this.afterLand(t, by, h0);
    return moved;
  }

  /** 拉向 to（催眠绕开障碍走过去 / 漩涡往中心收拢），最多 steps 步 */
  pull(t: Unit, to: Vec, steps: number, by: Unit | null, effect: 'hypno' | 'vortex') {
    if (t.role === 'shielder' || t.prop || steps <= 0) return;
    const from = { ...t.pos };
    const r = this.grid.reachable(t.pos, 999, this.blockedFor(t), this.occupiedSet(t), false);
    let best: Vec = t.pos, bd = manhattan(t.pos, to), bdist = 0;
    for (const n of r.values()) {
      if (n.dist < 0 || n.dist > steps) continue;
      const md = manhattan(n.pos, to);
      if (md < bd || (md === bd && n.dist < bdist)) { best = n.pos; bd = md; bdist = n.dist; }
    }
    if (eq(best, from)) return;
    const path = pathTo(r, best);
    t.pos = { ...best };
    this.emit({ type: 'pull', unitId: t.id, from, to: best, path, effect });
    this.afterLand(t, by);
  }

  /** 位置改变后：坠落伤害、Follow-Up、掩体变化、摄像头 */
  private afterLand(t: Unit, by: Unit | null, fromH = this.grid.h(t.pos)) {
    if (t.guard && !this.coverNow(t)) { t.guard = false; this.emit({ type: 'guard', unitId: t.id, on: false }); }
    if (t.side === 'ally' && !t.ko) this.checkCameras(t, [t.pos]);
    const h1 = this.grid.h(t.pos);
    if (h1 < fromH && !t.ko) {
      this.emit({ type: 'fall', unitId: t.id, from: t.pos, to: t.pos, height: fromH - h1 });
      if (t.side !== 'neutral') {
        const dmg = t.role === 'launcher' ? t.hp : Math.max(1, Math.round(t.maxHp * FALL_RATIO * (fromH - h1)));
        this.applyDamage(t, dmg, 0, false, 'fall', by);
        if (!t.ko && by) this.followUp(t, by, fromH);
      }
    }
  }

  /**
   * Follow-Up：把敌人从高处打落、落点在下方队友枪的射程内 → 该队友开枪追击，攻击者拿 1 More。
   * （Megami Tensei Wiki: Follow Up；Cogito AAA111；altema 高台）。每人每回合 followUps 次。
   */
  private followUp(t: Unit, by: Unit, fromH: number) {
    if (by.side !== 'ally' || t.side === by.side || this.opts.followUps <= 0) return;
    const shooter = this.alive(by.side).find((a) => a !== by && a.gun && !a.noFollowUp && !a.escort && a.followUps > 0 &&
      this.grid.h(a.pos) < fromH && !this.noAction.has(a.id) && !this.hasStatus(a, 'freeze') && !this.hasStatus(a, 'sleep') &&
      manhattan(a.pos, t.pos) <= this.gunRange(a) && this.grid.lineOfSight(a.pos, t.pos));
    if (!shooter) return;
    shooter.followUps--;
    this.emit({ type: 'followUp', shooterId: shooter.id, targetId: t.id, creditId: by.id });
    this.emit({ type: 'attack', kind: 'followUp', attackerId: shooter.id, targetId: t.id });
    this.applyDamage(t, this.calcDamage(shooter, t, shooter.gun!.power, false), 0, false, 'followUp', shooter);
    if (!t.ko && !t.downed && t.role !== 'launcher') { t.downed = true; this.downedBy.set(t.id, by.id); this.emit({ type: 'down', unitId: t.id }); }
    this.credit.add(by.id);
  }

  /** 油桶爆炸：2 格内全部吹飞、受伤、失去 Resistance；连锁引爆 */
  explode(barrel: Unit, by: Unit | null) {
    if (barrel.ko) return;
    barrel.ko = true; barrel.hp = 0;
    this.emit({ type: 'explode', unitId: barrel.id, at: { ...barrel.pos }, radius: BARREL_RADIUS });
    const caught = this.units.filter((o) => !o.ko && o !== barrel && manhattan(o.pos, barrel.pos) <= BARREL_RADIUS)
      .sort((a, b) => manhattan(b.pos, barrel.pos) - manhattan(a.pos, barrel.pos));
    for (const o of caught) {
      if (o.ko) continue;
      if (o.prop === 'barrel') { this.explode(o, by); continue; }
      if (o.prop) continue;
      this.applyDamage(o, BARREL_DAMAGE, 0, false, 'explosion', by);
      if (o.ko) continue;
      this.breakResist(o);
      this.push(o, this.dirFrom(barrel.pos, o.pos), BARREL_KNOCK, by, true);
    }
  }

  breakResist(u: Unit) {
    if (u.ko || u.side === 'neutral') return;
    if (u.guard) { u.guard = false; this.emit({ type: 'guard', unitId: u.id, on: false }); }
    if (u.resistBroken) return;
    u.resistBroken = true;
    this.emit({ type: 'resistBroken', unitId: u.id });
  }

  applyDamage(t: Unit, amount: number, cover: CoverLevel, resist: boolean, source: DamageSource, by: Unit | null) {
    const before = t.hp;
    t.hp = Math.max(t.hpFloor && t.hpFloor > 0 ? Math.min(t.hpFloor, before) : 0, t.hp - amount);
    if (by && source !== 'status' && source !== 'penalty') t.hitsTaken++;
    this.emit({ type: 'damage', unitId: t.id, amount, cover, resist, hpLeft: t.hp, source });
    if (t.decoy && amount > 0) {
      t.hp = 0; t.ko = true;
      this.emit({ type: 'ko', unitId: t.id });
      return;
    }
    if (t.side === 'ally' && amount > 0) this.hurtCount++;
    // Endure：被打倒时以 1 HP 复活，每场一次
    if (t.hp === 0 && this.has(t, 'endure') && !t.used.includes('endure')) {
      t.used.push('endure'); t.hp = 1;
      this.emit({ type: 'passive', unitId: t.id, passive: 'endure' });
    }
    // Trump Card：HP 跌破 50% → 回复并让下次攻击 ×1.5，每场一次
    if (t.hp > 0 && before >= t.maxHp / 2 && t.hp < t.maxHp / 2 && this.has(t, 'trumpCard') && !t.used.includes('trumpCard')) {
      t.used.push('trumpCard', 'trumpReady');
      this.emit({ type: 'passive', unitId: t.id, passive: 'trumpCard' });
      this.healUnit(t, Math.round(TRUMP_HEAL_POWER * HEAL_SCALE));
    }
    // First Aid：附近队友受伤时自动回复，每回合一次
    if (t.side === 'ally' && t.hp > 0 && amount > 0) {
      const fa = this.alive('ally').find((a) => a !== t && this.has(a, 'firstAid') && manhattan(a.pos, t.pos) <= FIRST_AID_RANGE && !this.turnUsed.has(`${a.id}:fa`));
      if (fa) { this.turnUsed.add(`${fa.id}:fa`); this.emit({ type: 'passive', unitId: fa.id, passive: 'firstAid' }); this.healUnit(t, Math.round(FIRST_AID_POWER * HEAL_SCALE)); }
    }
    // 受伤解除冻结/睡眠（Cogito AAA101）
    if (source !== 'status' && amount > 0) for (const id of ['freeze', 'sleep'] as const) {
      if (this.hasStatus(t, id)) {
        t.status = t.status.filter((s) => s.id !== id);
        this.noAction.delete(t.id);
        this.emit({ type: 'statusEnd', unitId: t.id, status: id, reason: 'damage' });
      }
    }
    // Voltage：我方造成或受到伤害都会涨（Cogito AAA109）
    if (this.opts.voltage && amount > 0 && (t.side === 'ally' || by?.side === 'ally') && this.voltage < VOLTAGE_MAX && this.turn > this.voltageLockUntil) {
      this.voltage = Math.min(VOLTAGE_MAX, this.voltage + Math.round(amount * VOLTAGE_RATE));
      this.emit({ type: 'voltage', value: this.voltage, max: VOLTAGE_MAX });
    }
    if (t.hp === 0 && !t.ko) {
      t.ko = true; t.downed = false;
      if (t.side === 'ally' && !t.decoy) { this.everKo = true; this.offerBaton(t); }
      this.emit({ type: 'ko', unitId: t.id });
    }
  }

  private offerBaton(t: Unit) {
    if (t.escort || !this.reserves.length || this.batonLeft <= 0) return;
    this.emit({ type: 'batonPassReady', koId: t.id, reserves: this.reserves.map((r) => r.id), left: this.batonLeft });
  }
  private nearestFree(p: Vec): Vec | null {
    const r = this.grid.reachable(p, 99, new Set(), new Set(), true);
    let best: Vec | null = null, bd = Infinity;
    for (const n of r.values()) {
      if (this.unitAt(n.pos)) continue;
      if (n.dist < bd) { bd = n.dist; best = n.pos; }
    }
    return best;
  }

  private autoEndIfDone() {
    if (this.phase !== 'player') return;
    const allies = this.alive('ally');
    if (allies.length && allies.every((a) => a.acted)) this.runEnemyPhase();
  }

  private runEnemyPhase() {
    for (const a of this.alive('ally')) { if (!a.acted) this.maybeCharge(a); a.oneMore = false; }
    // 我方回合结束：贴掩体 → Guard；回合结束类被动；旗子回复
    this.updateGuards('ally');
    for (const f of this.units) if (!f.ko && f.prop === 'flag') {
      for (const a of this.alive('ally')) if (!a.decoy && manhattan(a.pos, f.pos) <= (f.aura ?? 3) && a.hp < a.maxHp) this.healUnit(a, Math.round(a.maxHp * FLAG_HEAL_RATIO));
    }
    this.phase = 'enemy';
    this.emit({ type: 'phaseStart', phase: 'enemy', turn: this.turn });
    this.beginSidePhase('enemy');
    if (this.checkEnd()) return;
    runEnemyTurn(this);
    if (this.checkEnd()) return;
    this.updateGuards('enemy');
    this.startPlayerPhase();
  }

  // ---------- 地图机关 ----------
  private paintDoor(id: string) {
    const d = this.map.doors?.find((x) => x.id === id);
    if (!d) return;
    const open = this.rt.doors.get(id);
    for (const c of d.cells) { if (open) this.grid.tileOverride.delete(key(c)); else this.grid.tileOverride.set(key(c), 'wall'); }
  }
  private paintElevator(id: string) {
    const e = this.map.elevators?.find((x) => x.id === id);
    if (!e) return;
    const h = this.rt.elevators.get(id) ? e.high : e.low;
    for (const c of e.cells) this.grid.heightOverride.set(key(c), h);
  }
  doorOpen(id: string) { return !!this.rt.doors.get(id); }
  /** 开/关门；门格上有单位时关不上 */
  setDoor(id: string, open: boolean) {
    const d = this.map.doors?.find((x) => x.id === id);
    if (!d || this.rt.doors.get(id) === open) return;
    if (!open && d.cells.some((c) => this.unitAt(c))) return;
    this.rt.doors.set(id, open);
    this.paintDoor(id);
    this.emit({ type: 'door', id, open });
    this.recheckGuards();
  }
  /** 升降台上下：上面的单位跟着走（不算坠落）；高度变化会让周围单位失去/改变掩体 */
  setElevator(id: string, up: boolean) {
    const e = this.map.elevators?.find((x) => x.id === id);
    if (!e || this.rt.elevators.get(id) === up) return;
    this.rt.elevators.set(id, up);
    this.paintElevator(id);
    this.emit({ type: 'elevator', id, up, height: up ? e.high : e.low });
    this.recheckGuards();
  }
  /** 开关检测：hold = 有人踩着时开门、离开时关；toggle/elevator = 踩上去的那一刻切换 */
  applyMechanisms() {
    for (const sw of this.map.switches ?? []) {
      const occ = this.units.find((u) => !u.ko && u.side !== 'neutral' && !u.decoy && eq(u.pos, sw.pos))?.id ?? null;
      const prev = this.rt.switchOcc.get(sw.id) ?? null;
      if (occ === prev) continue;
      this.rt.switchOcc.set(sw.id, occ);
      if (occ) this.emit({ type: 'switch', id: sw.id, unitId: occ });
      if (sw.kind === 'hold') for (const d of sw.doors ?? []) this.setDoor(d, !!occ);
      else if (occ && sw.kind === 'toggle') for (const d of sw.doors ?? []) this.setDoor(d, !this.rt.doors.get(d));
      else if (occ && sw.kind === 'elevator' && sw.elevator) this.setElevator(sw.elevator, !this.rt.elevators.get(sw.elevator));
    }
  }
  /** 我方单位经过/停在摄像头监视范围 → 警报、召唤援军（每台摄像头一次） */
  checkCameras(u: Unit, path: Vec[]) {
    if (u.decoy) return;
    for (const cam of this.map.cameras ?? []) {
      if (this.rt.cameras.has(cam.id)) continue;
      if (path.some((p) => cam.cells.some((c) => eq(c, p)))) this.triggerCamera(cam, u);
    }
  }
  private triggerCamera(cam: CameraDef, u: Unit) {
    this.rt.cameras.add(cam.id);
    this.emit({ type: 'alarm', cameraId: cam.id, unitId: u.id });
    if (cam.damage) this.applyDamage(u, cam.damage, 0, false, 'penalty', null);
    this.spawnUnits(cam.spawn, `camera:${cam.id}`);
  }
  spawnUnits(list: { def: UnitDef; pos: Vec }[], source: string) {
    const ids: string[] = [];
    for (const { def, pos } of list) {
      const p = this.unitAt(pos) || !this.grid.walkable(pos) ? this.nearestFree(pos) : pos;
      if (!p) continue;
      const nu = this.makeUnit(def, p);
      nu.guard = this.coverNow(nu);
      this.units.push(nu);
      ids.push(nu.id);
    }
    if (ids.length) this.emit({ type: 'reinforce', unitIds: ids, source });
    if (this.phase === 'player') { this.intents = computeIntents(this); this.emit({ type: 'intents', intents: this.intents }); }
  }

  // ---------- 关卡事件（中途援军 / Boss 阶段 / 开门 / 改目标） ----------
  private eventFires(ev: MapEvent): boolean {
    const w = ev.when;
    switch (w.type) {
      case 'turn': return this.turn === w.turn && (!w.phase || w.phase === this.phase);
      case 'hpBelow': { const u = this.units.find((x) => x.id === w.unitId); return !!u && !u.ko && u.hp <= u.maxHp * w.ratio; }
      case 'enemiesLeft': return this.alive('enemy').length <= w.n;
      case 'unitKo': return !!this.units.find((x) => x.id === w.unitId)?.ko;
      case 'reach': return this.units.some((u) => !u.ko && u.side === (w.side ?? 'ally') && eq(u.pos, w.pos));
      case 'flag': return this.rt.flags.has(w.flag);
      default: return false;
    }
  }
  runEvents() {
    if (this.inEvents || !this.map.events?.length) return;
    this.inEvents = true;
    try {
      for (let guard = 0; guard < 20; guard++) {
        const ev = this.map.events.find((e) => !this.rt.events.has(e.id) && this.eventFires(e));
        if (!ev) break;
        if (!ev.repeat) this.rt.events.add(ev.id);
        for (const a of ev.do) this.doEventAction(a);
        if (ev.repeat) break;
      }
    } finally { this.inEvents = false; }
  }
  private doEventAction(a: EventAction) {
    switch (a.type) {
      case 'spawn': this.spawnUnits(a.units, 'event'); break;
      case 'message': this.emit({ type: 'message', text: a.text }); break;
      case 'door': this.setDoor(a.id, a.open); break;
      case 'setFlag': this.rt.flags.add(a.flag); break;
      case 'setWin': (this.map as MapDef).win = a.win; if (a.objective) (this.map as MapDef).objective = a.objective; break;
      case 'end': this.finish(a.outcome, a.reason); break;
      case 'setUnit': {
        const u = this.units.find((x) => x.id === a.unitId);
        if (!u || u.ko) break;
        Object.assign(u, a.patch);
        if (a.patch.role) u.counterReady = a.patch.role === 'revenger';
        if (a.healRatio) this.healUnit(u, Math.round(u.maxHp * a.healRatio));
        if (a.bossPhase) { u.bossPhase = a.bossPhase; this.emit({ type: 'bossPhase', unitId: u.id, phase: a.bossPhase }); }
        break;
      }
    }
  }

  /** 到达出口判定 */
  private checkReach() {
    const w = this.map.win;
    if (w.type !== 'reachExit' || this.phase === 'won' || this.phase === 'lost') return;
    const onExit = (u: Unit) => this.grid.tile(u.pos) === 'exit';
    const ok = w.unitId ? onExit(this.unit(w.unitId)) && !this.unit(w.unitId).ko
      : w.all ? this.alive('ally').every(onExit)
        : this.alive('ally').some(onExit);
    if (ok) this.finish('won');
  }

  /** 胜负判定；结束返回 true */
  checkEnd(): boolean {
    if (this.phase === 'won' || this.phase === 'lost') return true;
    this.runEvents();
    if ((this.phase as Phase) === 'won' || (this.phase as Phase) === 'lost') return true;
    if (this.units.some((u) => u.escort && u.ko)) { this.finish('lost', '护送对象倒下'); return true; }
    if (this.opts.leaderKoLoses && this.units.some((u) => u.isLeader && u.ko)) { this.finish('lost', 'Joker 倒下'); return true; }
    const canBaton = this.reserves.length > 0 && this.batonLeft > 0;
    if (!this.mainAllies().length && !canBaton) { this.finish('lost', '全员倒下'); return true; }
    const w = this.map.win;
    const enemies = this.alive('enemy');
    if (w.type === 'defeatAll' && !enemies.length) { this.finish('won'); return true; }
    if (w.type === 'defeatAllExcept') {
      if (w.exceptIds.some((id) => this.unit(id).ko)) { this.finish('lost', '误伤了不该打倒的目标'); return true; }
      if (!enemies.some((e) => !w.exceptIds.includes(e.id))) { this.finish('won'); return true; }
    }
    if (w.type === 'defeatTarget') {
      const ids = w.targetIds ?? (w.targetId ? [w.targetId] : []);
      if (ids.length && ids.every((id) => this.unit(id).ko)) { this.finish('won'); return true; }
    }
    this.checkReach();
    const ph = this.phase as Phase;
    return ph === 'won' || ph === 'lost';
  }

  private finish(outcome: 'won' | 'lost', reason?: string) {
    this.phase = outcome;
    this.emit({ type: 'result', outcome, turn: this.turn, crowns: this.crowns(outcome), reason });
  }

  /** 奖励条件（原作：Clear / Clear within N Turns / No one KO'd / Defeat all enemies / Party hurt fewer than N times） */
  crowns(outcome: 'won' | 'lost' = this.phase === 'won' ? 'won' : 'lost'): CrownResult {
    const clear = outcome === 'won';
    const defs: BonusDef[] = this.map.bonus ?? [{ type: 'clear' }, { type: 'withinTurns', n: this.map.turnTarget }, { type: 'noKo' }];
    const items: CrownItem[] = defs.map((d) => {
      switch (d.type) {
        case 'clear': return { id: 'clear', label: '通关', ok: clear };
        case 'withinTurns': return { id: 'withinTurns', label: `${d.n} 回合内通关`, ok: clear && this.turn <= d.n };
        case 'noKo': return { id: 'noKo', label: '无人 KO', ok: clear && !this.everKo };
        case 'defeatAll': return { id: 'defeatAll', label: '击败全部敌人', ok: clear && !this.alive('enemy').length };
        case 'hurtFewerThan': return { id: 'hurtFewerThan', label: `我方受伤少于 ${d.n} 次`, ok: clear && this.hurtCount < d.n };
      }
    });
    const get = (id: string) => items.find((i) => i.id === id)?.ok ?? false;
    return { clear, withinTurns: get('withinTurns'), noKo: get('noKo'), items, count: items.filter((i) => i.ok).length };
  }
}

export { DIRS };
