/**
 * COOP 契约（CoopBond）—— 把一对已 linked 好友升级为"在线同伴"的羁绊。
 *
 * 数据面走自研后端 /api/social/coop/bonds*；状态机（已 linked / pending / 拒绝 3 天 /
 * 解除 7 天冷却）与通知都由服务端负责，前端只在需要即时反馈的地方保留各自的纯函数。
 */

import * as coopBondsApi from './coopBondsApi';
import type { AttributeId, CoopBond, TarotOrientation } from '@/types';

export const COOP_PROPOSAL_TTL_DAYS = 14;
export const COOP_REJECT_COOLDOWN_DAYS = 3;
export const COOP_SEVER_COOLDOWN_DAYS = 7;

// ── 读 ────────────────────────────────────────────────────────────

export const listCoopBonds = async (): Promise<CoopBond[]> => {
  try {
    return await coopBondsApi.listCoopBonds();
  } catch (err) {
    console.warn('[velvet-coop] listCoopBonds failed', err);
    return [];
  }
};

// ── 写 ────────────────────────────────────────────────────────────

export interface ProposeCoopBondInput {
  targetUserId: string;
  arcanaId: string;
  orientation: TarotOrientation;
  /** 发起方期望的初始亲密度（1-10） */
  intimacyLevel: number;
  /** 发起方希望的能力加成属性 */
  skillAttribute: AttributeId;
  message?: string;
}

/**
 * 发起 COOP 契约提议。
 *
 * - 已经 linked  → 抛错
 * - 已有 pending → 抛错
 * - rejected / severed 且冷却未过 → 抛错
 * - 其他 → update 现有记录回 pending / 新建记录
 */
export const proposeCoopBond = async (input: ProposeCoopBondInput): Promise<CoopBond> => {
  // 状态机校验（已 linked / 已有 pending / 拒绝 3 天 / 解除 7 天冷却）在服务端做，冲突返回 400。
  return await coopBondsApi.proposeCoopBond(input);
};

export interface AcceptCoopBondInput {
  bondId: string;
  arcanaId: string;
  orientation: TarotOrientation;
  intimacyLevel: number;
  skillAttribute: AttributeId;
  message?: string;
}

/** 对方接受 COOP 提议：写入接受方的 arcana，并转为 linked */
export const acceptCoopBond = async (input: AcceptCoopBondInput): Promise<CoopBond> => {
  return await coopBondsApi.acceptCoopBond(input);
};

/**
 * 拒绝 COOP 提议（3 天冷却）
 *
 * 服务端二次校验：只有 status='pending' 才能被拒，避免 accept 后误操作让 bond 退回 rejected。
 */
export const rejectCoopBond = async (bondId: string): Promise<CoopBond> => {
  return await coopBondsApi.rejectCoopBond(bondId);
};

/** 解除已建立的 COOP（7 天冷却） */
export const severCoopBond = async (bondId: string): Promise<CoopBond> => {
  return await coopBondsApi.severCoopBond(bondId);
};

// ── 过期兜底 ─────────────────────────────────────────────────

/**
 * 服务端 listFor 已自动把过期 pending 置 expired（对齐 friendsApi.expireOutdatedPending 语义），
 * 这里只统计前端列表里已过期的条数。
 */
export const expireOutdatedCoopPending = async (bonds: CoopBond[]): Promise<number> => {
  const now = Date.now();
  return bonds.filter(b => b.status === 'pending' && b.expiresAt && b.expiresAt.getTime() < now).length;
};

// ── 工具：给定一方视角取出 "我" / "对方" 的 arcana ───────────

export interface MySideView {
  myArcanaId?: string;
  myArcanaOrientation?: TarotOrientation;
  myMessage?: string;
  myIntimacy?: number;
  mySkillAttribute?: AttributeId;
  theirArcanaId?: string;
  theirArcanaOrientation?: TarotOrientation;
  theirMessage?: string;
  theirIntimacy?: number;
  theirSkillAttribute?: AttributeId;
  iAmInitiator: boolean;
}

export const viewFromMySide = (bond: CoopBond, me: string): MySideView => {
  const iAmA = bond.userAId === me;
  return {
    myArcanaId: iAmA ? bond.arcanaAId : bond.arcanaBId,
    myArcanaOrientation: iAmA ? bond.arcanaAOrientation : bond.arcanaBOrientation,
    myMessage: iAmA ? bond.messageA : bond.messageB,
    myIntimacy: iAmA ? bond.intimacyALevel : bond.intimacyBLevel,
    mySkillAttribute: iAmA ? bond.skillAttributeA : bond.skillAttributeB,
    theirArcanaId: iAmA ? bond.arcanaBId : bond.arcanaAId,
    theirArcanaOrientation: iAmA ? bond.arcanaBOrientation : bond.arcanaAOrientation,
    theirMessage: iAmA ? bond.messageB : bond.messageA,
    theirIntimacy: iAmA ? bond.intimacyBLevel : bond.intimacyALevel,
    theirSkillAttribute: iAmA ? bond.skillAttributeB : bond.skillAttributeA,
    iAmInitiator: bond.initiatorId === me,
  };
};

/**
 * 设置我这一侧对此 COOP 的"逆流"开关 —— 写到 bond.decay_a 或 decay_b。
 * 任何状态都允许写（pending / linked 都可以）；
 * 真正决定衰减是否发生看 bothSidesAgreeOnDecay()
 */
export const setCoopDecayPreference = async (bondId: string, enabled: boolean): Promise<CoopBond> => {
  return await coopBondsApi.setCoopDecayPreference(bondId, enabled);
};

/** 双方是否都开启了"逆流"。任意一方未开 → false */
export const bothSidesAgreeOnDecay = (bond: CoopBond): boolean => {
  return bond.decayA === true && bond.decayB === true;
};

/**
 * 聚合两侧的初始 LV：都有 → 取 floor((a+b)/2)；只有一侧 → 取那侧；都没 → 1。
 */
/**
 * 关系描述的本地暂存（紧急修复 #5「关系描述变成了想说的话」）。
 * 星象匹配第一页写的「你眼中的 Ta」只是给 AI 参考，云端 coop_bonds 只有 message_a / message_b（写给对方的话），
 * 没有关系描述字段；提议发出时先按对方云端 id 记在本机，契约建立、物化成本地同伴卡时取走它当「关系描述」。
 * 以前物化时拿的是 message（我写给对方的话），用户看到自己的「关系描述」变成了那句话。
 */
const PENDING_DESC_KEY = 'velvet:coop.pendingDescription.v1';
type PendingDescMap = Record<string, { text: string; at: number }>;
const readPendingDesc = (): PendingDescMap => {
  try { const v = JSON.parse(localStorage.getItem(PENDING_DESC_KEY) || '{}'); return v && typeof v === 'object' ? v as PendingDescMap : {}; } catch { return {}; }
};
const writePendingDesc = (m: PendingDescMap): void => {
  try { localStorage.setItem(PENDING_DESC_KEY, JSON.stringify(m)); } catch { /* 隐私模式写不进就算了 */ }
};
export const rememberPendingBondDescription = (targetUserId: string, description: string): void => {
  const text = description.trim();
  if (!targetUserId || !text) return;
  const m = readPendingDesc();
  // 顺手清掉 90 天前的旧条目（提议被拒 / 过期后不会再物化）
  const cutoff = Date.now() - 90 * 86400000;
  for (const [k, v] of Object.entries(m)) if (!v || v.at < cutoff) delete m[k];
  m[targetUserId] = { text, at: Date.now() };
  writePendingDesc(m);
};
/** 取走并删除（物化只发生一次） */
export const takePendingBondDescription = (targetUserId: string): string | null => {
  const m = readPendingDesc();
  const hit = m[targetUserId];
  if (!hit) return null;
  delete m[targetUserId];
  writePendingDesc(m);
  return hit.text || null;
};

export const resolveCoopInitialIntimacy = (bond: CoopBond): number => {
  const a = bond.intimacyALevel;
  const b = bond.intimacyBLevel;
  if (a && b) return Math.max(1, Math.min(10, Math.floor((a + b) / 2)));
  if (a) return Math.max(1, Math.min(10, a));
  if (b) return Math.max(1, Math.min(10, b));
  return 1;
};
