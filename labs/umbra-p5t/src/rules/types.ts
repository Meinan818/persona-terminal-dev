// 幽影协议 P5T 规则层 · 类型定义（纯逻辑：零 DOM、零画布）
export type Vec = { x: number; y: number };
export type TileKind = 'floor' | 'wall' | 'half' | 'full' | 'exit';
export type CoverLevel = 0 | 1 | 2; // 0 无 / 1 半掩体 / 2 全掩体
export type Side = 'ally' | 'enemy';
export type Element = 'phys' | 'gun' | 'fire' | 'elec' | 'curse' | 'heal';
/** P5T 元素异常：burn=灼烧(击退+下回合掉血) shock=感电(下回合不能移动) despair=绝望(下回合不能移动，移动力加给施法者) */
export type StatusId = 'burn' | 'shock' | 'despair';

export interface SkillDef {
  id: string;
  name: string;
  element: Element;
  sp: number;
  power: number;
  range: number; // 曼哈顿射程
  /** 0 = 单体；>=1 = 以目标为中心的曼哈顿半径范围 */
  radius: number;
  status?: StatusId;
}

export interface UnitDef {
  id: string;
  name: string;
  side: Side;
  maxHp: number;
  maxSp: number;
  move: number;
  melee: number;
  /** P5T 原作枪无弹数限制：ammo 缺省 = 无限；填数字则启用弹数（GDD 选项） */
  gun?: { power: number; range: number; ammo?: number };
  skills: SkillDef[];
  /** 敌人用：AI 优先近战还是远程 */
  ai?: 'melee' | 'ranged';
  isLeader?: boolean; // Joker：倒下即失败
  isTarget?: boolean; // 「击败目标」胜利条件的目标
}

export interface Unit extends UnitDef {
  pos: Vec;
  hp: number;
  sp: number;
  ammo: number;
  moved: boolean;
  acted: boolean;
  downed: boolean; // 倒地（1 More / 总攻的前提）
  ko: boolean; // HP 0
  /** 本次行动的起点：行动前可在移动范围内反复改位置（P5T 行动前移动可撤回） */
  anchor: Vec;
  /** 持有未用掉的 1 More（可再移动+再行动，或用来发动 Triple Threat） */
  oneMore: boolean;
  /** 被近战/技能/异常打破 Resistance，直到自己下次行动开始 */
  resistBroken: boolean;
  /** 绝望偷来的额外移动力（下回合生效） */
  bonusMove: number;
  status: { id: StatusId; turns: number }[];
}

export type WinCondition =
  | { type: 'defeatAll' }
  | { type: 'reachExit'; unitId?: string } // 缺省 = 任一我方
  | { type: 'defeatTarget'; targetId: string };

export interface MapDef {
  id: string;
  name: string;
  width: number;
  height: number;
  tiles: TileKind[][]; // [y][x]
  units: { def: UnitDef; pos: Vec }[];
  win: WinCondition;
  /** 皇冠评价：回合数 ≤ turnTarget 得一冠 */
  turnTarget: number;
  /** 超过即失败（P5T 部分关有回合上限）；缺省不限 */
  turnLimit?: number;
}

export interface RuleOptions {
  /**
   * 'p5t'（默认，按原作资料）：紧贴任一掩体 = Resistance，与攻击方向无关；全掩体另外让来自其正面的枪击完全落空。
   * 'directional'（GDD 草案的理解）：只有攻击来自掩体那一侧才算受掩护，包抄/侧面即可打倒。
   */
  coverModel?: 'p5t' | 'directional';
  /** Joker 倒下即失败（P5T 前期剧情关如此；后期 Joker 可不上场）。默认 true */
  leaderKoLoses?: boolean;
  /** 敌人打倒我方也拿 1 More（原作如此）。默认 true */
  enemyOneMore?: boolean;
}

export type Phase = 'player' | 'enemy' | 'won' | 'lost';
export type AttackKind = 'melee' | 'gun' | 'skill' | 'triple';

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
  | { type: 'attack'; kind: AttackKind; attackerId: string; targetId: string; skillId?: string }
  | { type: 'damage'; unitId: string; amount: number; cover: CoverLevel; resist: boolean; hpLeft: number; source: AttackKind | 'status' | 'collision' }
  | { type: 'miss'; unitId: string; reason: 'fullCover' }
  | { type: 'resistBroken'; unitId: string }
  | { type: 'down'; unitId: string }
  | { type: 'standUp'; unitId: string }
  | { type: 'knockback'; unitId: string; from: Vec; to: Vec; blocked: boolean; collidedWith?: string }
  | { type: 'meleeStep'; unitId: string; to: Vec }
  | { type: 'ko'; unitId: string }
  | { type: 'oneMore'; unitId: string }
  | { type: 'tripleThreatReady'; attackerId: string; targetId: string; victims: string[] }
  | { type: 'tripleThreat'; attackerId: string; allies: string[]; victims: string[] }
  | { type: 'status'; unitId: string; status: StatusId; turns: number }
  | { type: 'skipTurn'; unitId: string; reason: StatusId }
  | { type: 'wait'; unitId: string }
  | { type: 'enemyThink'; enemyId: string; targetId: string | null; dest: Vec }
  | { type: 'result'; outcome: 'won' | 'lost'; turn: number; crowns: CrownResult }
  | { type: 'error'; message: string };

export interface CrownResult {
  clear: boolean;
  withinTurns: boolean;
  noKo: boolean;
  count: number;
}
