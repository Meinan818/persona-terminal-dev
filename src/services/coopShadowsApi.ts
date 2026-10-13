/**
 * coopShadowsApi —— 羁绊之影的自研后端数据源（社交迁移 W3 第四波）。
 *
 * 契约：后端 /api/social/shadows*（CoopShadowController）。伤害由前端算好传入，
 * 后端负责落库 + 不变量（HP 从出手日志求和、每日限速 UNIQUE、slotId 幂等）。
 *
 * 错误语义（与 PB 不同，勿照抄）：每日限速冲突 = HTTP 409 + body.code='already_attacked_today'
 * → 翻译成逐字原文案「今天你已经对这只羁绊之影出过手了，明天再来」。
 */
import { velvetRequest, VelvetApiError } from './velvetApi';
import type {
  AttributeId,
  CoopAttack,
  CoopBond,
  CoopShadow,
  CoopShadowStatus,
  SharedBuffs,
} from '@/types';

interface RawShadow {
  id: string;
  bondId: string;
  userAId: string;
  userBId: string;
  shadowId: string;
  nameOverride?: string | null;
  spawnedAt: string;
  expiresAt: string;
  hpMax: number;
  hpCurrent: number;
  status: string;
  weaknessAttribute: string;
  resonanceUntil?: string | null;
  resonanceBy?: string | null;
  comboCount?: number | null;
  allOutByA?: boolean | null;
  allOutByB?: boolean | null;
  identifiedByA?: boolean | null;
  identifiedByB?: boolean | null;
  sharedBuffs?: Record<string, unknown> | null;
  defeatedAt?: string | null;
  memorialStamp?: Record<string, unknown> | null;
  created?: boolean;
}

interface RawAttack {
  id: string;
  shadowId: string;
  attackerId: string;
  day: string;
  personaId?: string | null;
  personaName?: string | null;
  skillKind: CoopAttack['skillKind'];
  skillName: string;
  damageRaw: number;
  damageFinal: number;
  resonanceBonus?: boolean | null;
  weaknessBonus?: boolean | null;
  created: string;
}

const opt = (v: string | null | undefined): string | undefined => v || undefined;

function mapShadow(r: RawShadow): CoopShadow {
  return {
    id: r.id,
    bondId: r.bondId,
    userAId: r.userAId,
    userBId: r.userBId,
    shadowId: r.shadowId,
    nameOverride: opt(r.nameOverride),
    spawnedAt: new Date(r.spawnedAt),
    expiresAt: new Date(r.expiresAt),
    hpMax: r.hpMax,
    hpCurrent: r.hpCurrent,
    status: r.status as CoopShadowStatus,
    weaknessAttribute: r.weaknessAttribute as AttributeId,
    resonanceUntil: r.resonanceUntil ? new Date(r.resonanceUntil) : undefined,
    resonanceBy: opt(r.resonanceBy),
    comboCount: typeof r.comboCount === 'number' ? r.comboCount : 0,
    allOutByA: Boolean(r.allOutByA),
    allOutByB: Boolean(r.allOutByB),
    identifiedByA: Boolean(r.identifiedByA),
    identifiedByB: Boolean(r.identifiedByB),
    sharedBuffs: (r.sharedBuffs as SharedBuffs | null | undefined) || {},
    defeatedAt: r.defeatedAt ? new Date(r.defeatedAt) : undefined,
    memorialStamp: (r.memorialStamp as CoopShadow['memorialStamp'] | null | undefined) || undefined,
  };
}

function mapAttack(r: RawAttack): CoopAttack {
  return {
    id: r.id,
    shadowId: r.shadowId,
    attackerId: r.attackerId,
    day: r.day,
    personaId: r.personaId || '',
    personaName: r.personaName || '',
    skillKind: r.skillKind,
    skillName: r.skillName,
    damageRaw: r.damageRaw,
    damageFinal: r.damageFinal,
    resonanceBonus: Boolean(r.resonanceBonus),
    weaknessBonus: Boolean(r.weaknessBonus),
    createdAt: new Date(r.created),
  };
}

/** 把后端错误翻成前端语义：409 already_attacked_today → 逐字原文案；其余原样抛。 */
async function withDailyLimitTranslation<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof VelvetApiError && err.status === 409) {
      const code = (err.body as { code?: string } | null)?.code;
      if (code === 'already_attacked_today') {
        throw new Error('今天你已经对这只羁绊之影出过手了，明天再来');
      }
    }
    throw err;
  }
}

/** 与我相关的全部影（含已结束），按降临倒序 */
export async function listCoopShadows(): Promise<CoopShadow[]> {
  const res = await velvetRequest<{ items: RawShadow[] }>('/api/social/shadows');
  return res.items.map(mapShadow);
}

/** 单只影（出手前取最新） */
export async function getCoopShadow(id: string): Promise<CoopShadow> {
  return mapShadow(await velvetRequest<RawShadow>(`/api/social/shadows/${id}`));
}

/** 该影的全部出手记录（按时间倒序） */
export async function listAttacksFor(shadowId: string): Promise<CoopAttack[]> {
  const res = await velvetRequest<{ items: RawAttack[] }>(`/api/social/shadows/${shadowId}/attacks`);
  return res.items.map(mapAttack);
}

/** 降临（指定 slotId；冲突读回已有 → created:false） */
export async function spawnCoopShadow(input: {
  id: string;
  bondId: string;
  userAId: string;
  userBId: string;
  shadowId: string;
  nameOverride?: string;
  spawnedAt?: string;
  expiresAt: string;
  hpMax: number;
  weaknessAttribute: AttributeId;
}): Promise<{ shadow: CoopShadow; created: boolean }> {
  const raw = await velvetRequest<RawShadow>('/api/social/shadows', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return { shadow: mapShadow(raw), created: raw.created !== false };
}

/** 识破（幂等） */
export async function identifyShadow(id: string): Promise<CoopShadow> {
  return mapShadow(await velvetRequest<RawShadow>(`/api/social/shadows/${id}/identify`, {
    method: 'POST',
    body: JSON.stringify({}),
  }));
}

export interface AttackApiInput {
  day: string;
  personaId: string;
  personaName: string;
  skillKind: CoopAttack['skillKind'];
  skillName: string;
  damageRaw: number;
  damageFinal: number;
  resonanceBonus: boolean;
  weaknessBonus: boolean;
}

export interface AttackApiResult {
  attack: CoopAttack;
  updatedShadow: CoopShadow;
  weaknessBonus: boolean;
  resonanceBonus: boolean;
  isBuffCast: boolean;
  defeatedNow: boolean;
}

/** 一次攻击（每日一次；冲突 → 409 → 逐字文案） */
export async function attackCoopShadow(id: string, input: AttackApiInput): Promise<AttackApiResult> {
  return withDailyLimitTranslation(async () => {
    const raw = await velvetRequest<{
      attack: RawAttack;
      updatedShadow: RawShadow;
      weaknessBonus: boolean;
      resonanceBonus: boolean;
      isBuffCast: boolean;
      defeatedNow: boolean;
    }>(`/api/social/shadows/${id}/attack`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return {
      attack: mapAttack(raw.attack),
      updatedShadow: mapShadow(raw.updatedShadow),
      weaknessBonus: raw.weaknessBonus,
      resonanceBonus: raw.resonanceBonus,
      isBuffCast: raw.isBuffCast,
      defeatedNow: raw.defeatedNow,
    };
  });
}

/** 总攻击（day='allout'，不占当日额度） */
export async function allOutAttack(id: string, input: {
  personaId: string;
  personaName: string;
  damage: number;
}): Promise<{ attack: CoopAttack; updatedShadow: CoopShadow; defeatedNow: boolean }> {
  const raw = await velvetRequest<{
    attack: RawAttack;
    updatedShadow: RawShadow;
    defeatedNow: boolean;
  }>(`/api/social/shadows/${id}/allout`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return {
    attack: mapAttack(raw.attack),
    updatedShadow: mapShadow(raw.updatedShadow),
    defeatedNow: raw.defeatedNow,
  };
}

/** 撤退（过期才生效；未到期/非 active 原样返回） */
export async function retreatExpiredShadow(id: string): Promise<CoopShadow> {
  return mapShadow(await velvetRequest<RawShadow>(`/api/social/shadows/${id}/retreat`, {
    method: 'POST',
    body: JSON.stringify({}),
  }));
}

// 类型再导出（分流层签名引用）
export type { CoopBond };
