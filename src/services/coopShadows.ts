/**
 * 羁绊之影 · 联机暗影狩猎服务层
 *
 * 负责：
 *   - 按月相降临规则自动 spawn（或手动触发）
 *   - 列表 / 读取 / 攻击 / 结算
 *   - 配合 loadSocial 消费 coop_shadow_* 通知
 *
 * 关键不变量：
 *   - 每对 COOP 同一时刻最多 1 个 active coop_shadow
 *   - 每个 user × 每个 coop_shadow × 每个本地日最多 1 次 attack
 *     （PB 唯一索引 (shadow_id, attacker, day) 硬性拦截）
 *   - 共鸣印记 resonance_until / resonance_by 以最后一次 update 为准
 *     （二人同秒攻击的 race 只影响一次加成，不影响正确性）
 *
 * Phase 1：客户端驱动所有业务逻辑；反作弊靠 PB access rules + unique index 兜底。
 */

import * as velvetApi from './velvetApi';
import * as coopShadowsApi from './coopShadowsApi';
import { pickArchetypeForBond } from '@/constants/coopShadowPool';
import type {
  AttributeId,
  CoopAttack,
  CoopBond,
  CoopShadow,
} from '@/types';
import { isMoonPhaseNight, moonPhaseSlot } from '@/utils/moonPhase';

// ── 参数区 ────────────────────────────────────────────────

/** 总攻击的 COMBO 门槛（战斗面板与服务同一份，第 6 轮合一） */
export const ALL_OUT_COMBO = 5;

/** 羁绊之影存活天数 —— 超时自动撤退 */
export const SHADOW_LIFETIME_DAYS = 10;

/** 两次降临之间的冷却（防止每天一只） */
const SPAWN_COOLDOWN_DAYS = 14;

/** COOP 缔结后多少天才能降临第一次 —— 给新 COOP 一个缓冲期 */
const BOND_WARMUP_DAYS = 7;

/** 弱点属性加成 */
const WEAKNESS_DMG_MULTIPLIER = 1.3;

/** 共鸣接力加成 */
const RESONANCE_DMG_MULTIPLIER = 1.5;

/** 奖励常量（直接吃死 user 的需求） */
export const REWARD_ATTR_CAP = 5;       // 属性奖励硬顶
export const REWARD_INTIMACY_CAP = 4;   // 亲密度硬顶
export const REWARD_SP_VICTORY = 10;    // 胜利 SP
export const REWARD_SP_FINISHER = 2;    // 终结者追加 SP
export const REWARD_SP_RETREAT = 3;     // 撤退慰问 SP
/** 连胜三只起亲密度 +5（第 6 轮） */
export const REWARD_INTIMACY_STREAK = 5;
/** 总攻击的 COMBO 倍率封顶（第 6 轮） */
export const ALL_OUT_COMBO_CAP = 10;

// ── 奖励成长（第 6 轮 · PRD §11.9）─────────────────────────────

/**
 * 这对 COOP 连着封印了几只（含 currentId 这一只）：按降临时间顺着数，撤退归零。
 * 不改表——历史就是 coop_shadows 本身。
 */
export function bondStreak(history: CoopShadow[], bondId: string, currentId: string): number {
  const list = history.filter(s => s.bondId === bondId).sort((a, b) => a.spawnedAt.getTime() - b.spawnedAt.getTime());
  let streak = 0;
  let sawCurrent = false;
  for (const s of list) {
    if (s.id === currentId) { streak += 1; sawCurrent = true; break; }
    if (s.status === 'defeated') streak += 1;
    else if (s.status === 'retreated') streak = 0;
  }
  return sawCurrent ? streak : streak + 1;
}

export interface CoopVictoryReward {
  attr: number;
  intimacy: number;
  sp: number;
  spBase: number;
  spStreak: number;
  spBond: number;
  spFinisher: number;
  streak: number;
  isFinisher: boolean;
}

/**
 * 胜利奖励：SP = 10 + 5 × min(连胜 − 1, 4)（这两项合计封顶 30）+ floor(羁绊等级 / 2)（封顶 5）+ 终结者 2；
 * 连胜 ≥ 3 亲密度 +5，否则 +4；属性 +5 不变。结算与结算屏共用这一份，数字不会对不上。
 */
export function coopVictoryReward(opts: { streak: number; bondLevel: number; isFinisher: boolean }): CoopVictoryReward {
  const streak = Math.max(1, Math.floor(opts.streak));
  const spStreak = 5 * Math.min(streak - 1, 4);
  const spBond = Math.min(5, Math.floor(Math.max(0, opts.bondLevel) / 2));
  const spFinisher = opts.isFinisher ? REWARD_SP_FINISHER : 0;
  return {
    attr: REWARD_ATTR_CAP,
    intimacy: streak >= 3 ? REWARD_INTIMACY_STREAK : REWARD_INTIMACY_CAP,
    spBase: REWARD_SP_VICTORY,
    spStreak,
    spBond,
    spFinisher,
    sp: REWARD_SP_VICTORY + spStreak + spBond + spFinisher,
    streak,
    isFinisher: opts.isFinisher,
  };
}

/** 总攻击伤害 = (我方等级和 + 对方等级和) × min(COMBO, 10) */
export function allOutDamage(myTotalLevels: number, partnerTotalLevels: number, combo: number): number {
  return Math.max(1, Math.floor((Math.max(0, myTotalLevels) + Math.max(0, partnerTotalLevels)) * Math.min(Math.max(0, combo), ALL_OUT_COMBO_CAP)));
}

/**
 * 按双方 LV 总和阶梯决定 Boss HP。
 *
 * 数值回算逻辑（方便后续调）：
 *   常规命中（弱点 + 共鸣，无暴击，单次 ≈ 50 × 1.3 × 1.5 ≈ 98 伤害）
 *   10 天窗口双方共 ~20 次常规攻击 → 总伤害约 1250
 *   HP 设在"打 6–10 天能结束"的区间
 */
export function computeShadowHpMax(totalSumLevels: number): number {
  if (totalSumLevels <= 15) return 200;
  if (totalSumLevels <= 20) return 300;
  if (totalSumLevels <= 30) return 450;
  return 650;
}

// ── 查询 ───────────────────────────────────────────────────

/** 拉取当前登录用户相关的所有 coop_shadows（含 active / defeated / retreated）*/
export const listCoopShadows = async (): Promise<CoopShadow[]> => {
  try {
    return await coopShadowsApi.listCoopShadows();
  } catch (err) {
    console.warn('[velvet-coopShadows] listCoopShadows failed', err);
    return [];
  }
};

/** 拉一只 shadow 的全部攻击事件（按时间倒序） */
export const listAttacksFor = async (shadowId: string): Promise<CoopAttack[]> => {
  try {
    return await coopShadowsApi.listAttacksFor(shadowId);
  } catch (err) {
    console.warn('[velvet-coopShadows] listAttacksFor failed', err);
    return [];
  }
};

/**
 * 血量的事实源是出手日志，不是 hp_current。
 * 两端各自拿缓存里的 hp_current 减完整值写回，谁后写谁覆盖：对方那一下就被抹掉、血条还会回涨。
 * 日志是只追加的，按它求和永远一致——写回和读取都从这里算。
 */
export const hpFromAttackLog = (hpMax: number, attacks: CoopAttack[]): number =>
  Math.max(0, hpMax - attacks.reduce((sum, a) => sum + Math.max(0, a.damageFinal || 0), 0));

/**
 * 读侧纠偏：进行中的影按出手日志重算血量。
 * 算出来还有血 → 只改本地显示；算到归零而记录还是 active（对方击杀的那一下被本机的写回抹掉了）→
 * 再取一次最新记录，仍是 active 就补记击败，终结者 = 日志里最后出手的人。
 */
export const reconcileActiveShadow = async (shadow: CoopShadow): Promise<CoopShadow> => {
  if (shadow.status !== 'active') return shadow;
  const attacks = await listAttacksFor(shadow.id);
  const hp = hpFromAttackLog(shadow.hpMax, attacks);
  if (hp === shadow.hpCurrent) return shadow;
  if (hp > 0) return { ...shadow, hpCurrent: hp };
  const fresh = await coopShadowsApi.getCoopShadow(shadow.id);
  if (fresh.status !== 'active') return fresh;
  // 补记击败由后端读取侧（listFor 前的纠偏）与下次写回完成；这里保守返回 fresh
  return fresh;
};

// ── 降临 ───────────────────────────────────────────────────

/**
 * 判断"这个时间点是否应该给这个 bond 降临一只羁绊之影"。
 *
 * 规则：
 *   - 当天必须是月相之夜（isMoonPhaseNight）
 *   - bond 必须 linked 且已过 BOND_WARMUP_DAYS
 *   - bond 没有 active coop_shadow
 *   - 距离最近一次 coop_shadow（任意状态）≥ SPAWN_COOLDOWN_DAYS
 */
function shouldSpawn(
  bond: CoopBond,
  existingShadows: CoopShadow[],
  now: Date,
): boolean {
  if (bond.status !== 'linked') return false;
  const bondShadows = existingShadows.filter(s => s.bondId === bond.id);
  const hasActive = bondShadows.some(s => s.status === 'active');
  if (hasActive) return false;

  // 月相之夜 + cooldown + warmup
  if (!isMoonPhaseNight(now)) return false;
  if (bond.createdAt) {
    const ageMs = now.getTime() - bond.createdAt.getTime();
    if (ageMs < BOND_WARMUP_DAYS * 86400 * 1000) return false;
  }
  if (bondShadows.length > 0) {
    const latest = bondShadows[0]; // sort -spawned_at
    const elapsed = now.getTime() - latest.spawnedAt.getTime();
    if (elapsed < SPAWN_COOLDOWN_DAYS * 86400 * 1000) return false;
  }
  return true;
}

/**
 * 一对 COOP 在一个月夜里的那只影的记录 id（15 位小写字母数字，服务端允许创建时自带 id）。
 *
 * 用户上报「SHADOW RETREATED 偶现重复弹两次」的根因：同一个月夜降临了不止一只。
 * 冷启动时 App 与同伴衰减维护会各发一次同步、两台设备也可能同时同步，每一路都读到
 * 「还没有进行中的影」就各建一只；页面只露出其中一只，另一只没人打，十天后照样撤退、
 * 照样弹结算屏——打没打都会弹。现在同一对、同一个月夜算出同一个 id，
 * 第二个人再建会被服务端的主键唯一性挡回，转而读已有的那只。
 */
export function shadowSlotId(bondId: string, slot: number): string {
  const src = `${bondId}:${slot}`;
  let out = '';
  for (let seed = 0; out.length < 15; seed++) {
    // FNV-1a（32 位），换种子拼够 15 位
    let h = (0x811c9dc5 ^ Math.imul(seed + 1, 0x9e3779b1)) >>> 0;
    for (let i = 0; i < src.length; i++) {
      h ^= src.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    out += h.toString(36).padStart(7, '0');
  }
  return out.slice(0, 15);
}

/**
 * 降临一只新羁绊之影。slotId / hp / 名字在前端算好传过去，服务端落库并写降临通知。
 * 失败抛错；上层（social pipeline）会 catch + 下次 loadSocial 重试。
 * 这个月夜对方（或本机另一路同步）已经建过 → 服务端按主键唯一性挡住，返回已有的那只，created = false。
 *
 * hp_max 由双方属性等级之和分档（见 computeShadowHpMax）；spawn 时不一定能拿到对方的属性，
 * 用 bond.otherProfile.totalLv + 我方的 totalLv。
 */
export const spawnCoopShadow = async (
  bond: CoopBond,
  mySumLevels: number,
): Promise<{ shadow: CoopShadow; created: boolean }> => {
  if (!velvetApi.isAuthenticated()) throw new Error('未登录');

  const archetype = pickArchetypeForBond(bond.id);
  const partnerSumLevels = bond.otherProfile?.totalLv ?? 10; // 兜底
  const hpMax = computeShadowHpMax(mySumLevels + partnerSumLevels);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SHADOW_LIFETIME_DAYS * 86400 * 1000);
  // 同一个 archetype 从两个候选名里随机抽一个 —— 同对 COOP 每次降临可能是不同名字
  const pickedName = archetype.names[Math.floor(Math.random() * archetype.names.length)];

  return await coopShadowsApi.spawnCoopShadow({
    id: shadowSlotId(bond.id, moonPhaseSlot(now)),
    bondId: bond.id,
    userAId: bond.userAId,
    userBId: bond.userBId,
    shadowId: archetype.id,
    nameOverride: pickedName,
    spawnedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    hpMax,
    weaknessAttribute: archetype.weakness,
  });
};

/**
 * 同一对 COOP、同一个月夜只认一只影。修复之前（见 shadowSlotId）已经重复降临的，
 * 在这里挑一只当真：打过的优先（已击败 > 有伤害 / 连击 / 总攻击 > 已识破），
 * 都没动过就认最早降临的那只（同时刻再比 id，两台设备挑得一样）；其余整只忽略——
 * 不显示、不撤退、不结算、不弹结算屏。保持原有顺序。
 */
export function dedupeShadows(list: CoopShadow[]): CoopShadow[] {
  const progress = (s: CoopShadow): number =>
    s.status === 'defeated' ? 3
      : (s.hpCurrent < s.hpMax || s.comboCount > 0 || s.allOutByA || s.allOutByB) ? 2
        : (s.identifiedByA || s.identifiedByB) ? 1
          : 0;
  const better = (a: CoopShadow, b: CoopShadow): boolean => {
    const pa = progress(a), pb2 = progress(b);
    if (pa !== pb2) return pa > pb2;
    const ta = a.spawnedAt.getTime(), tb = b.spawnedAt.getTime();
    if (ta !== tb) return ta < tb;
    return a.id < b.id;
  };
  const pick = new Map<string, CoopShadow>();
  for (const s of list) {
    const key = `${s.bondId}:${moonPhaseSlot(s.spawnedAt)}`;
    const cur = pick.get(key);
    if (!cur || better(s, cur)) pick.set(key, s);
  }
  const keep = new Set([...pick.values()].map(s => s.id));
  return list.filter(s => keep.has(s.id));
}

/**
 * 为所有 linked 的 bond 逐一检查是否需要降临。
 * 通常在 loadSocial 的 coop pipeline 里调用。
 */
export const maybeSpawnForBonds = async (
  bonds: CoopBond[],
  existingShadows: CoopShadow[],
  mySumLevels: number,
): Promise<CoopShadow[]> => {
  const now = new Date();
  const newShadows: CoopShadow[] = [];
  for (const bond of bonds) {
    if (!shouldSpawn(bond, existingShadows, now)) continue;
    try {
      const { shadow } = await spawnCoopShadow(bond, mySumLevels);
      newShadows.push(shadow);
    } catch (err) {
      console.warn('[velvet-coopShadows] spawn failed for bond', bond.id, err);
    }
  }
  return newShadows;
};

// ── 识破 ───────────────────────────────────────────────────

/**
 * 登记一次"识破"。
 * - 如果自己已经识破过了 → 幂等（静默返回当前记录）
 * - 识破后同时发通知给对方（让对方的红点更新）
 * - 双方都识破后，攻击路径才会真正可用（由前端面板判定）
 */
export const identifyShadow = async (shadow: CoopShadow): Promise<CoopShadow> => {
  if (!velvetApi.isAuthenticated()) throw new Error('未登录');
  return await coopShadowsApi.identifyShadow(shadow.id);
};

// ── 攻击 ───────────────────────────────────────────────────

export interface AttackInput {
  shadow: CoopShadow;
  personaId: string;
  personaName: string;
  skillKind: CoopAttack['skillKind'];
  skillName: string;
  skillAttribute: AttributeId;
  damageRaw: number;
  /** 这对 COOP 的降临史（算连胜用；击杀时冻进纪念图章） */
  history?: CoopShadow[];
}

export interface AttackResult {
  attack: CoopAttack;
  updatedShadow: CoopShadow;
  /** 本次攻击是否命中弱点 */
  weaknessBonus: boolean;
  /** 本次攻击是否吃到共鸣接力加成 */
  resonanceBonus: boolean;
  /** crit 类技能本次是否触发暴击（×2） */
  critTriggered: boolean;
  /** 是 buff / debuff 类 —— 本次不造成伤害，只修改 sharedBuffs */
  isBuffCast: boolean;
  /** 击杀者 = true（hp<=0 且是这次攻击造成的） */
  defeatedNow: boolean;
}

/** attack_up / vulnerability 倍率 */
const BUFF_ATTACK_UP_MULT = 1.2;
const BUFF_VULNERABILITY_MULT = 1.15;

function isDamagingKind(kind: CoopAttack['skillKind']): boolean {
  // damage / crit / charge / attack_boost 走伤害路径
  // heal 在联机模式里没有血条可回，也不转成伤害 —— 直接在 UI 侧隐藏，不让用户点
  return (
    kind === 'damage'
    || kind === 'crit'
    || kind === 'charge'
    || kind === 'attack_boost'
  );
}

function isUtilityKind(kind: CoopAttack['skillKind']): boolean {
  // buff / debuff → 施加共享 buff；不造成伤害
  return kind === 'buff' || kind === 'debuff';
}

/**
 * 对 Boss 发起一次攻击。负责：
 *   1. 计算最终伤害（弱点 × 共鸣加成）
 *   2. 交给服务端落库：出手日志、血量/共鸣/连击的更新、通知对方都由后端写；
 *      每日一次的限制由后端判定（409 → 转成中文提示）
 *
 * 失败抛错；上层展示 toast + 不回滚本地 battleState（因为攻击记录是否落盘未知）。
 */
export const attackCoopShadow = async (input: AttackInput): Promise<AttackResult> => {
  if (!velvetApi.isAuthenticated()) throw new Error('未登录');

  const { damageRaw, skillAttribute, skillKind } = input;
  const now = new Date();

  // 伤害在前端算好（依赖本地 persona 数据），服务端落库并保证不变量
  const day = toLocalDateKey(now);
  const isUtility = isUtilityKind(skillKind);
  const isDamaging = isDamagingKind(skillKind);
  const weaknessBonus = isDamaging && skillAttribute === input.shadow.weaknessAttribute;
  const resonanceActive = !!(
    isDamaging
    && input.shadow.resonanceUntil
    && input.shadow.resonanceUntil.getTime() > now.getTime()
    && input.shadow.resonanceBy
    && input.shadow.resonanceBy !== (velvetApi.getUserId() ?? '')
  );
  const critTriggered = skillKind === 'crit' && Math.random() < 0.5;
  const curBuffs = input.shadow.sharedBuffs ?? {};
  const attackUpActive = (curBuffs.attack_up?.remainingTurns ?? 0) > 0;
  const vulnerabilityActive = (curBuffs.vulnerability?.remainingTurns ?? 0) > 0;

  let damageFinal = 0;
  if (isDamaging) {
    let multiplier = 1;
    if (weaknessBonus)       multiplier *= WEAKNESS_DMG_MULTIPLIER;
    if (resonanceActive)     multiplier *= RESONANCE_DMG_MULTIPLIER;
    if (critTriggered)       multiplier *= 2;
    if (attackUpActive)      multiplier *= BUFF_ATTACK_UP_MULT;
    if (vulnerabilityActive) multiplier *= BUFF_VULNERABILITY_MULT;
    damageFinal = Math.round(damageRaw * multiplier);
  }

  const r = await coopShadowsApi.attackCoopShadow(input.shadow.id, {
    day,
    personaId: input.personaId,
    personaName: input.personaName,
    skillKind,
    skillName: input.skillName,
    damageRaw: isDamaging ? damageRaw : 0,
    damageFinal,
    resonanceBonus: resonanceActive,
    weaknessBonus,
  }).catch((err) => {
    // 每日限速：后端 409 + code
    if (err instanceof velvetApi.VelvetApiError && err.status === 409
      && (err.body as { code?: string } | null)?.code === 'already_attacked_today') {
      throw new Error('今天你已经对这只羁绊之影出过手了，明天再来');
    }
    throw err;
  });
  return {
    attack: r.attack,
    updatedShadow: r.updatedShadow,
    weaknessBonus,
    resonanceBonus: resonanceActive,
    critTriggered,
    isBuffCast: isUtility,
    defeatedNow: r.defeatedNow,
  };
};

// ── 撤退 ───────────────────────────────────────────────────

/**
 * 把已过期但还是 active 的 shadow 转成 retreated。
 * 两端都可能各调一次；服务端按状态与过期时间判定，重复调用幂等。
 */
export const retreatExpiredShadow = async (shadow: CoopShadow): Promise<CoopShadow> => {
  if (!velvetApi.isAuthenticated()) throw new Error('未登录');
  return await coopShadowsApi.retreatExpiredShadow(shadow.id);
};

// ── 总攻击（All-Out） ─────────────────────────────────────

export interface AllOutAttackInput {
  shadow: CoopShadow;
  personaId: string;
  personaName: string;
  /** 攻击者本地的属性 level 之和 */
  myTotalLevels: number;
  /** 对方的属性 level 之和（名片快照；拿不到就按我方算） */
  partnerTotalLevels: number;
  /** 这对 COOP 的降临史（算连胜用） */
  history?: CoopShadow[];
}

export interface AllOutAttackResult {
  attack: CoopAttack;
  updatedShadow: CoopShadow;
  defeatedNow: boolean;
}

/**
 * 释放总攻击（All-Out）。
 *
 * 前提：
 *   - shadow.comboCount ≥ 5
 *   - 我还没用过（allOutByA / allOutByB 对应我的）
 *   - shadow.status = 'active'
 *
 * 规则（第 6 轮重做）：
 *   - 伤害 = (我方等级和 + 对方等级和) × min(COMBO, 10)——两个人的力量叠在一起，COMBO 越高越重
 *   - 不吃共鸣、不吃弱点加成（已经是一次大招）；不重置 COMBO
 *   - **不占用当日回合数** —— coop_attacks 用 day='allout' 绕开唯一索引
 *   - 用完就把 all_out_by_{a|b} 翻成 true（一位玩家对一只 Boss 只能一次）
 */
export const allOutAttack = async (input: AllOutAttackInput): Promise<AllOutAttackResult> => {
  if (!velvetApi.isAuthenticated()) throw new Error('未登录');

  const { myTotalLevels, partnerTotalLevels } = input;

  // 前置校验（后端也会再校验）
  if (input.shadow.comboCount < ALL_OUT_COMBO) throw new Error(`COMBO 未到 ${ALL_OUT_COMBO}，还不能释放总攻击`);
  const iAmA = input.shadow.userAId === velvetApi.getUserId();
  if (iAmA ? input.shadow.allOutByA : input.shadow.allOutByB) {
    throw new Error('你已经对这只羁绊之影释放过总攻击了');
  }
  const damage = allOutDamage(myTotalLevels, partnerTotalLevels, input.shadow.comboCount);
  return await coopShadowsApi.allOutAttack(input.shadow.id, {
    personaId: input.personaId,
    personaName: input.personaName,
    damage,
  });
};

// ── helper ────────────────────────────────────────────────

function toLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
