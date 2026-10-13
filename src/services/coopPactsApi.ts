/**
 * coopPactsApi —— 一起进步（打卡约定）的自研后端数据源（社交迁移 W3 第三波）。
 *
 * 契约：后端 /api/social/pacts*（CoopPactController），函数签名与 coopPacts.ts 的
 * PB 实现镜像，返回结构映射为前端 CoopPact 类型。
 * coopPacts.ts 按登录态自动分流到这里（用户无感，无开关）。
 *
 * 与 coopBondsApi 的差异：pact 的 from/to 有方向语义（不归一化），
 * done_* 是日期数组（后端 JSON 列）。
 */
import { velvetRequest } from './velvetApi';
import type { AttributeId, CloudProfile, CoopPact, PactKind, PactMode, PactStatus } from '@/types';

/** 后端返回的约定行（CoopPactService.toView 形状，camelCase） */
interface RawCoopPact {
  id: string;
  fromId: string;
  toId: string;
  kind: string;
  mode: string;
  titleFrom: string;
  titleTo?: string | null;
  days: number;
  deadline?: string | null;
  startDay?: string | null;
  status: string;
  doneFrom: string[];
  doneTo: string[];
  nudgeFromDay?: string | null;
  nudgeToDay?: string | null;
  message?: string | null;
  endedBy?: string | null;
  created: string;
  updated: string;
  otherProfile?: Record<string, unknown> | null;
}

/** 后端公开档案 → CloudProfile（与 coopBondsApi.mapProfile 同款） */
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

const PACT_STATUSES: readonly PactStatus[] = ['pending', 'active', 'finished', 'cancelled', 'declined', 'expired'];
const opt = (v: string | null | undefined): string | undefined => v || undefined;

function mapPact(raw: RawCoopPact): CoopPact {
  return {
    id: raw.id,
    fromId: raw.fromId,
    toId: raw.toId,
    kind: raw.kind === 'once' ? 'once' : 'daily' as PactKind,
    mode: raw.mode === 'different' ? 'different' : 'same' as PactMode,
    titleFrom: raw.titleFrom || '',
    titleTo: opt(raw.titleTo),
    days: typeof raw.days === 'number' ? raw.days : 0,
    deadline: opt(raw.deadline),
    startDay: opt(raw.startDay),
    status: PACT_STATUSES.includes(raw.status as PactStatus) ? (raw.status as PactStatus) : 'pending',
    doneFrom: Array.isArray(raw.doneFrom) ? raw.doneFrom : [],
    doneTo: Array.isArray(raw.doneTo) ? raw.doneTo : [],
    nudgeFromDay: opt(raw.nudgeFromDay),
    nudgeToDay: opt(raw.nudgeToDay),
    message: opt(raw.message),
    endedBy: opt(raw.endedBy),
    createdAt: new Date(raw.created),
    updatedAt: new Date(raw.updated),
    otherProfile: mapProfile(raw.otherProfile),
  };
}

/** 与我相关的约定（pending/active 全部 + 结束的留 45 天） */
export async function listMyPacts(): Promise<CoopPact[]> {
  const res = await velvetRequest<{ items: RawCoopPact[] }>('/api/social/pacts');
  return res.items.map(mapPact);
}

export interface CreatePactApiInput {
  toId: string;
  kind: PactKind;
  mode: PactMode;
  title: string;
  days: number;
  deadline?: string;
  message?: string;
  today: string;
}

/** 发起约定 */
export async function createPact(input: CreatePactApiInput): Promise<CoopPact> {
  const raw = await velvetRequest<RawCoopPact>('/api/social/pacts', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return mapPact(raw);
}

/** 回应邀请：接受 / 婉拒 */
export async function respondPact(
  pactId: string,
  accept: boolean,
  opts: { today: string; titleTo?: string },
): Promise<CoopPact> {
  const raw = await velvetRequest<RawCoopPact>(`/api/social/pacts/${pactId}/respond`, {
    method: 'POST',
    body: JSON.stringify({ accept, today: opts.today, titleTo: opts.titleTo ?? '' }),
  });
  return mapPact(raw);
}

/** 打卡 / 撤回打卡：只改自己那一栏 */
export async function setMyDone(pactId: string, day: string, done: boolean): Promise<CoopPact> {
  const raw = await velvetRequest<RawCoopPact>(`/api/social/pacts/${pactId}/done`, {
    method: 'POST',
    body: JSON.stringify({ day, done }),
  });
  return mapPact(raw);
}

/** 催一下 */
export async function nudgePact(pactId: string, today: string): Promise<CoopPact> {
  const raw = await velvetRequest<RawCoopPact>(`/api/social/pacts/${pactId}/nudge`, {
    method: 'POST',
    body: JSON.stringify({ today }),
  });
  return mapPact(raw);
}

/** 结束约定（撤回邀请也走这里） */
export async function endPact(pactId: string): Promise<CoopPact> {
  const raw = await velvetRequest<RawCoopPact>(`/api/social/pacts/${pactId}/end`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  return mapPact(raw);
}

/** 到期收尾（达成 / 过期）——对账层调用 */
export async function closePact(pactId: string, status: 'finished' | 'expired'): Promise<CoopPact> {
  const raw = await velvetRequest<RawCoopPact>(`/api/social/pacts/${pactId}/close`, {
    method: 'POST',
    body: JSON.stringify({ status }),
  });
  return mapPact(raw);
}

// re-export 供上层类型推断（AttributeId 常用于 prefs，这里仅为避免未使用告警）
export type { AttributeId };
