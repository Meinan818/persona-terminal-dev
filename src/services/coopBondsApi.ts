/**
 * coopBondsApi —— 同伴羁绊的自研后端数据源（社交迁移 W3 第二波）。
 *
 * 契约：后端 /api/social/coop/bonds*（CoopBondController），函数签名与 coopBonds.ts 的
 * PB 实现镜像，返回结构映射为前端 CoopBond 类型（types/index.ts）。
 * coopBonds.ts 按登录态自动分流到这里（用户无感，无开关）。
 *
 * 后端已按 user_a/user_b 字典序归一化存 pair，toView 输出 camelCase；
 * 这里只做形状对齐 + otherProfile 映射。
 */
import { velvetRequest } from './velvetApi';
import type { AttributeId, CloudProfile, CoopBond, CoopBondStatus, TarotOrientation } from '@/types';

/** 后端返回的羁绊行（CoopBondService.toView 形状，camelCase） */
interface RawCoopBond {
  id: string;
  userAId: string;
  userBId: string;
  initiatorId: string;
  status: string;
  arcanaAId?: string | null;
  arcanaAOrientation?: string | null;
  arcanaBId?: string | null;
  arcanaBOrientation?: string | null;
  intimacyALevel?: number | null;
  intimacyBLevel?: number | null;
  skillAttributeA?: string | null;
  skillAttributeB?: string | null;
  decayA?: boolean | null;
  decayB?: boolean | null;
  messageA?: string | null;
  messageB?: string | null;
  expiresAt?: string | null;
  respondedAt?: string | null;
  reRequestAfter?: string | null;
  reLinkAfter?: string | null;
  created: string;
  updated: string;
  otherProfile?: Record<string, unknown> | null;
}

/** 后端公开档案 → CloudProfile（字段语义与 prayersApi.mapProfile 对齐） */
function mapProfile(raw: Record<string, unknown> | null | undefined): CloudProfile | undefined {
  if (!raw) return undefined;
  return {
    id: (raw.id as string) ?? '',
    userId: (raw.username as string | undefined) || undefined,
    nickname: (raw.nickname as string | undefined) || undefined,
    avatarUrl: raw.avatarUrl as string | undefined,
    totalLv: typeof raw.total_lv === 'number' ? raw.total_lv : undefined,
    levelDifficulty: raw.level_difficulty === 'hard' || raw.level_difficulty === 'easy'
      ? (raw.level_difficulty as 'hard' | 'easy')
      : undefined,
    attributeNames: raw.attribute_names as Record<string, string> | undefined,
    attributeLevels: raw.attribute_levels as Record<string, number> | undefined,
    attributeLevelTitles: raw.attribute_level_titles as Record<string, string[]> | undefined,
    attributePoints: raw.attribute_points as Record<string, number> | undefined,
    totalPoints: typeof raw.total_points === 'number' ? raw.total_points : undefined,
    unlockedCount: typeof raw.unlocked_count === 'number' ? raw.unlocked_count : undefined,
    status: raw.status as CloudProfile['status'],
    goal: raw.goal as CloudProfile['goal'],
    lastSyncedAt: new Date(),
  } as CloudProfile;
}

const opt = (v: string | null | undefined): string | undefined => v || undefined;

function mapBond(raw: RawCoopBond): CoopBond {
  return {
    id: raw.id,
    userAId: raw.userAId,
    userBId: raw.userBId,
    initiatorId: raw.initiatorId,
    status: raw.status as CoopBondStatus,
    arcanaAId: opt(raw.arcanaAId),
    arcanaAOrientation: (raw.arcanaAOrientation as TarotOrientation | null | undefined) || undefined,
    arcanaBId: opt(raw.arcanaBId),
    arcanaBOrientation: (raw.arcanaBOrientation as TarotOrientation | null | undefined) || undefined,
    intimacyALevel: typeof raw.intimacyALevel === 'number' ? raw.intimacyALevel : undefined,
    intimacyBLevel: typeof raw.intimacyBLevel === 'number' ? raw.intimacyBLevel : undefined,
    skillAttributeA: (raw.skillAttributeA as AttributeId | null | undefined) || undefined,
    skillAttributeB: (raw.skillAttributeB as AttributeId | null | undefined) || undefined,
    // decayA/B：后端 null（未选择）→ undefined；true/false 原样
    decayA: typeof raw.decayA === 'boolean' ? raw.decayA : undefined,
    decayB: typeof raw.decayB === 'boolean' ? raw.decayB : undefined,
    messageA: opt(raw.messageA),
    messageB: opt(raw.messageB),
    expiresAt: raw.expiresAt ? new Date(raw.expiresAt) : undefined,
    respondedAt: raw.respondedAt ? new Date(raw.respondedAt) : undefined,
    reRequestAfter: raw.reRequestAfter ? new Date(raw.reRequestAfter) : undefined,
    reLinkAfter: raw.reLinkAfter ? new Date(raw.reLinkAfter) : undefined,
    createdAt: new Date(raw.created),
    updatedAt: new Date(raw.updated),
    otherProfile: mapProfile(raw.otherProfile),
  };
}

/** 与我相关的羁绊列表 */
export async function listCoopBonds(): Promise<CoopBond[]> {
  const res = await velvetRequest<{ items: RawCoopBond[] }>('/api/social/coop/bonds');
  return res.items.map(mapBond);
}

/** 发起提议（后端会做冷却/已存在等校验，冲突抛错） */
export async function proposeCoopBond(input: {
  targetUserId: string;
  arcanaId: string;
  orientation: TarotOrientation;
  intimacyLevel: number;
  skillAttribute: AttributeId;
  message?: string;
}): Promise<CoopBond> {
  const raw = await velvetRequest<RawCoopBond>('/api/social/coop/bonds/propose', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return mapBond(raw);
}

/** 接受提议 */
export async function acceptCoopBond(input: {
  bondId: string;
  arcanaId: string;
  orientation: TarotOrientation;
  intimacyLevel: number;
  skillAttribute: AttributeId;
  message?: string;
}): Promise<CoopBond> {
  const { bondId, ...body } = input;
  const raw = await velvetRequest<RawCoopBond>(`/api/social/coop/bonds/${bondId}/accept`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return mapBond(raw);
}

/** 拒绝提议（3 天冷却） */
export async function rejectCoopBond(bondId: string): Promise<CoopBond> {
  const raw = await velvetRequest<RawCoopBond>(`/api/social/coop/bonds/${bondId}/reject`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  return mapBond(raw);
}

/** 解除已建立的 COOP（7 天冷却） */
export async function severCoopBond(bondId: string): Promise<CoopBond> {
  const raw = await velvetRequest<RawCoopBond>(`/api/social/coop/bonds/${bondId}/sever`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  return mapBond(raw);
}

/** 设置我这一侧的「逆流」开关 */
export async function setCoopDecayPreference(bondId: string, enabled: boolean): Promise<CoopBond> {
  const raw = await velvetRequest<RawCoopBond>(`/api/social/coop/bonds/${bondId}/decay`, {
    method: 'POST',
    body: JSON.stringify({ enabled }),
  });
  return mapBond(raw);
}
