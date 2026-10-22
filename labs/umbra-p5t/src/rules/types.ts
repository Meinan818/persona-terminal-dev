// 幽影协议 P5T 规则层 · 类型定义（纯逻辑：零 DOM、零画布）
// 规则依据与「与原作差异清单」见 ../../RULES-NOTES.md
export type Vec = { x: number; y: number };
export type TileKind = 'floor' | 'wall' | 'half' | 'full' | 'exit';
export type CoverLevel = 0 | 1 | 2; // 0 无 / 1 半掩体 / 2 全掩体
export type Side = 'ally' | 'enemy' | 'neutral';

/**
 * P5T 取消了属性弱点，技能按「附带效果」分类（Megami Tensei Wiki: List of P5T Effects / Cogito AAA101）：
 * burn 灼烧(Agi) freeze 冻结(Bufu) shock 感电(Zio) sweep 吹飞(Garu) hypno 催眠(Psi) vortex 漩涡(Frei)
 * dizzy 眩晕(Kouha) despair 绝望(Eiha) forget 遗忘(Partisan) sleep 睡眠
 */
export type Effect = 'burn' | 'freeze' | 'shock' | 'sweep' | 'hypno' | 'vortex' | 'dizzy' | 'despair' | 'forget' | 'sleep';
/** 持续型异常（会挂在单位身上） */
export type StatusId = 'burn' | 'freeze' | 'shock' | 'dizzy' | 'despair' | 'forget' | 'sleep';
/** 增益（-kaja） */
export type BuffId = 'atk' | 'def' | 'move';

export type SkillKind = 'attack' | 'heal' | 'buff';
/**
 * 技能形状：single 单体；area 以目标格为中心半径 radius；line 从使用者出发直线 length 格；
 * self 以自身为中心半径 radius（不需要目标）
 */
export type SkillShape = 'single' | 'area' | 'line' | 'self';

export interface SkillDef {
  id: string;
  name: string;
  kind: SkillKind;
  /** 原作 Power（公开数据，见 data.ts 出处） */
  power: number;
  sp: number;
  /** true = Unique（Voltage）技能：耗尽 Voltage 槽，不耗 SP */
  voltage?: boolean;
  range: number;
  shape: SkillShape;
  radius?: number;
  length?: number;
  effect?: Effect;
  /** 回复技能附带解除异常（Diamrita 类） */
  cure?: boolean;
  /** buff 类型 */
  buff?: BuffId;
  /** 目标为全体我方（Media / Ma-kaja） */
  allAllies?: boolean;
  /** Phantom Judge：即使在掩体中也打倒 */
  downThroughCover?: boolean;
  /** Femme Fatale / Like a Phantom / Pathway to the Ball：使用后还能再行动 */
  extraAction?: boolean;
  /** Kasumi Pathway to the Ball：本回合移动力极大 */
  moveBoost?: number;
  /** Makoto Full Throttle：直线上所有单位击退（不附带异常） */
  knockAll?: boolean;
}

/** Charge（回合内没攻击 → 下次攻击前的小增益），按原作技能树第一个免费 Charge 技能 */
export type ChargeId = 'foresight' | 'phantomStep' | 'lightningSpeed' | 'ferociousLion' | 'overPowered' | 'bulletBreak' | 'springStorm' | 'clairvoyance' | 'essenceOfSorcery';

/** 敌人类型（Cogito AAA115 MECHANIC: ENEMY TYPES） */
export type EnemyRole = 'shooter' | 'brute' | 'revenger' | 'shielder' | 'teleporter' | 'launcher' | 'supporter';
/** 地图物件（以中立单位实现，可被攻击/推动） */
export type PropKind = 'barrel' | 'box' | 'speaker';
/** 枪的打击方式：ST 单体 / AoE 散射 / EXP 爆炸（Cogito 角色表 R AoE 列） */
export type GunShape = 'single' | 'aoe' | 'explode';

export interface UnitDef {
  id: string;
  name: string;
  side: Side;
  maxHp: number;
  maxSp: number;
  move: number;
  /** 近战攻击力（Cogito 表 MEL 列） */
  melee: number;
  /** P5T 原作枪无弹数限制：ammo 缺省 = 无限；填数字则启用弹数（GDD 选项） */
  gun?: { power: number; range: number; ammo?: number; shape?: GunShape };
  skills: SkillDef[];
  /** Voltage 满时可用的专属技能 */
  unique?: SkillDef;
  /** 第一个（免费）Charge 技能 */
  charge?: ChargeId;
  /** 敌人用：AI 类型 */
  role?: EnemyRole;
  /** 兼容旧数据：'melee' = brute，'ranged' = shooter */
  ai?: 'melee' | 'ranged';
  isLeader?: boolean;
  isTarget?: boolean;
  /** 护送对象：倒下即失败，不能攻击、不能 Dash（Cogito C109） */
  escort?: boolean;
  /** 不能 Follow-Up（没有枪，如 Toshiro） */
  noFollowUp?: boolean;
  /** 地图物件 */
  prop?: PropKind;
  /** 盾兵初始朝向 */
  facing?: Vec;
  /** 喇叭：禁止的行动种类 */
  bans?: ('melee' | 'gun' | 'skill')[];
}

export interface Unit extends UnitDef {
  pos: Vec;
  hp: number;
  sp: number;
  ammo: number;
  moved: boolean;
  acted: boolean;
  downed: boolean; // 倒地（1 More / Triple Threat 的前提）
  ko: boolean; // HP 0
  /** 本次行动的起点：行动前可在移动范围内反复改位置（P5T 行动前移动可撤回） */
  anchor: Vec;
  /** 持有未用掉的 1 More（可再移动+再行动，或用来发动 Triple Threat） */
  oneMore: boolean;
  /** 被近战/技能/撞击/爆炸打破 Resistance，直到自己阵营下个阶段开始 */
  resistBroken: boolean;
  /** 额外移动力（绝望偷来的 / Sukukaja 等），在下次「行动起点」生效 */
  bonusMove: number;
  status: { id: StatusId; turns: number }[];
  buffs: { id: BuffId; turns: number }[];
  /** Charge 状态：本回合（或本次 1 More）没攻击就结束 → 下次攻击前生效 */
  charged: boolean;
  /** 本次行动（回合或 1 More）里是否攻击过（决定是否 Charge） */
  attackedThisAction: boolean;
  /** 本回合剩余 Follow-Up 次数（原作 Follow-Up 每回合 1 次，Follow-Up+ 2 次） */
  followUps: number;
  /** 本回合是否已 Dash（爬梯/跳台）——护送对象不能 Dash */
  dashed: boolean;
  /** 是否为替补（Baton Pass 换上） */
  reserve?: boolean;
}

export type WinCondition =
  | { type: 'defeatAll' }
  | { type: 'defeatAllExcept'; exceptIds: string[] }
  | { type: 'defeatTarget'; targetId?: string; targetIds?: string[] }
  | { type: 'reachExit'; unitId?: string; all?: boolean }
  | { type: 'survive'; turns: number };

/** 奖励条件（原作关卡奖励栏：Clear / Clear within N Turns / No one KO'd / Defeat all enemies / Party hurt fewer than N times） */
export type BonusDef =
  | { type: 'clear' }
  | { type: 'withinTurns'; n: number }
  | { type: 'noKo' }
  | { type: 'defeatAll' }
  | { type: 'hurtFewerThan'; n: number };

/** Dash 连接（梯子 / 跳台）：两端双向可达，路径消耗 1 格 */
export interface DashLink { a: Vec; b: Vec; kind: 'ladder' | 'jump' }

export interface MapDef {
  id: string;
  name: string;
  width: number;
  height: number;
  tiles: TileKind[][]; // [y][x]
  /** 每格地面高度（层数，0 = 地面）；缺省全 0 */
  heights?: number[][];
  links?: DashLink[];
  units: { def: UnitDef; pos: Vec }[];
  /** 替补（Baton Pass） */
  reserves?: UnitDef[];
  win: WinCondition;
  /** 主线目标描述（UI 用） */
  objective?: string;
  /** 皇冠评价：回合数 ≤ turnTarget 得一冠（bonus 缺省时用） */
  turnTarget: number;
  /** 超过即失败（P5T 部分关有回合上限，如「Defeat all enemies within 10 Turns」）；缺省不限 */
  turnLimit?: number;
  bonus?: BonusDef[];
}

export type Difficulty = 'safety' | 'easy' | 'normal' | 'hard' | 'merciless';

export interface RuleOptions {
  /**
   * 'p5t'（默认，按原作资料）：紧贴任一掩体 = Resistance，与攻击方向无关；全掩体另外让来自其正面与侧面的枪击完全落空。
   * 'directional'（GDD 草案的理解）：只有攻击来自掩体那一侧才算受掩护，包抄/侧面即可打倒。
   */
  coverModel?: 'p5t' | 'directional';
  /** Joker 倒下即失败。原作有 Baton Pass 换人且「全员+替补倒下」才失败（Cogito AAA112），默认 false */
  leaderKoLoses?: boolean;
  /** 敌人打倒我方也拿 1 More（原作如此）。默认 true */
  enemyOneMore?: boolean;
  /** 难度：影响敌人 HP/攻击倍率与 Baton Pass 次数（Cogito AAA100/AAA112）。默认 normal */
  difficulty?: Difficulty;
  /** Voltage / Unique 技能（原作第 8 关解锁）。默认 true */
  voltage?: boolean;
  /** Charge（原作第 7 关解锁）。默认 true */
  charge?: boolean;
  /** Follow-Up（原作第 18 关解锁）。默认 true；每人每回合次数 */
  followUps?: number;
  /** 随机种子（眩晕的随机移动用） */
  seed?: number;
}

export type Phase = 'player' | 'enemy' | 'won' | 'lost';
export type AttackKind = 'melee' | 'gun' | 'skill' | 'triple' | 'followUp' | 'counter' | 'unique';
export type DamageSource = AttackKind | 'status' | 'collision' | 'fall' | 'explosion' | 'penalty' | 'throw';

export interface Intent {
  enemyId: string;
  targetId: string | null;
  /** 敌人下回合能走到的格 */
  moveTiles: Vec[];
  /** 敌人下回合能打到的格（红格） */
  threatTiles: Vec[];
}

export type BattleEvent =
  | { type: 'phaseStart'; phase: Phase; turn: number }
  | { type: 'intents'; intents: Intent[] }
  | { type: 'move'; unitId: string; path: Vec[]; from: Vec }
  | { type: 'dash'; unitId: string; from: Vec; to: Vec; kind: 'ladder' | 'jump' }
  | { type: 'attack'; kind: AttackKind; attackerId: string; targetId: string; skillId?: string }
  | { type: 'damage'; unitId: string; amount: number; cover: CoverLevel; resist: boolean; hpLeft: number; source: DamageSource }
  | { type: 'heal'; unitId: string; amount: number; hpLeft: number }
  | { type: 'miss'; unitId: string; reason: 'fullCover' | 'shield' }
  | { type: 'resistBroken'; unitId: string }
  | { type: 'down'; unitId: string }
  | { type: 'standUp'; unitId: string }
  | { type: 'knockback'; unitId: string; from: Vec; to: Vec; blocked: boolean; collidedWith?: string; fly?: boolean }
  | { type: 'pull'; unitId: string; from: Vec; to: Vec; path: Vec[]; effect: 'hypno' | 'vortex' }
  | { type: 'fall'; unitId: string; from: Vec; to: Vec; height: number }
  | { type: 'followUp'; shooterId: string; targetId: string; creditId: string }
  | { type: 'meleeStep'; unitId: string; to: Vec }
  | { type: 'ko'; unitId: string }
  | { type: 'oneMore'; unitId: string }
  | { type: 'tripleThreatReady'; attackerId: string; targetId: string; victims: string[] }
  | { type: 'tripleThreat'; attackerId: string; allies: string[]; victims: string[] }
  | { type: 'status'; unitId: string; status: StatusId; turns: number }
  | { type: 'statusEnd'; unitId: string; status: StatusId; reason: 'damage' | 'expired' | 'cured' }
  | { type: 'buff'; unitId: string; buff: BuffId; turns: number }
  | { type: 'skipTurn'; unitId: string; reason: StatusId }
  | { type: 'dizzyMove'; unitId: string; from: Vec; to: Vec }
  | { type: 'wait'; unitId: string }
  | { type: 'charge'; unitId: string; charge: ChargeId }
  | { type: 'chargeUsed'; unitId: string; charge: ChargeId }
  | { type: 'voltage'; value: number; max: number }
  | { type: 'uniqueSkill'; unitId: string; skillId: string }
  | { type: 'counter'; unitId: string; targetId: string; from: Vec; to: Vec }
  | { type: 'teleportSwap'; unitId: string; withId: string }
  | { type: 'shieldTurn'; unitId: string; facing: Vec }
  | { type: 'throw'; unitId: string; targetId: string; from: Vec; to: Vec }
  | { type: 'explode'; unitId: string; at: Vec; radius: number }
  | { type: 'speakerBan'; unitId: string; bans: ('melee' | 'gun' | 'skill')[] }
  | { type: 'penalty'; unitId: string; speakerId: string; action: 'melee' | 'gun' | 'skill' }
  | { type: 'batonPassReady'; koId: string; reserves: string[]; left: number }
  | { type: 'batonPass'; outId: string; inId: string; at: Vec; left: number }
  | { type: 'enemyThink'; enemyId: string; targetId: string | null; dest: Vec }
  | { type: 'result'; outcome: 'won' | 'lost'; turn: number; crowns: CrownResult; reason?: string }
  | { type: 'error'; message: string };

export interface CrownItem { id: string; label: string; ok: boolean }
export interface CrownResult {
  clear: boolean;
  withinTurns: boolean;
  noKo: boolean;
  items: CrownItem[];
  count: number;
}
