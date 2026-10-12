/**
 * friendsApi —— 好友模块的自研后端数据源（社交迁移第一阶段）。
 *
 * 契约：后端 /api/social/**（FriendController），函数签名与 friends.ts 的 PB 实现镜像，
 * 返回结构统一映射为前端 Friendship / CloudProfile 类型（types/index.ts）。
 * 前端 friends.ts 按 settings.socialUseBackend 分流到这里或 PB 实现。
 */
import { velvetRequest } from './velvetApi';
import type { CloudProfile, Friendship, FriendshipStatus } from '@/types';
import type { SendFriendRequestInput } from './friends';

/** 后端返回的关系行（FriendService.toView 形状） */
interface RawFriendship {
  id: string;
  userAId: string;
  userBId: string;
  initiatorId: string;
  status: 'pending' | 'accepted' | 'declined';
  message?: string | null;
  expiresAt?: string | null;
  created: string;
  updated: string;
  expand?: { other: Record<string, unknown> };
}

/** 后端公开档案 → CloudProfile（字段语义与 friends.ts profileFromExpand 对齐） */
function mapCloudProfile(raw: Record<string, unknown>): CloudProfile {
  const r = raw as Record<string, unknown> & {
    id?: string; username?: string; nickname?: string; avatarUrl?: string;
    total_lv?: number; level_difficulty?: string;
    attribute_names?: Record<string, string>; attribute_levels?: Record<string, number>;
    attribute_level_titles?: Record<string, string[]>; attribute_points?: Record<string, number>;
    total_points?: number; unlocked_count?: number;
    status?: string; goal?: unknown; lastSyncedAt?: unknown;
  };
  return {
    id: r.id ?? '',
    userId: (r.username as string | undefined) || undefined,
    nickname: (r.nickname as string | undefined) || undefined,
    // email 从不出现在后端公开档案（SocialUserService.publicProfile 保证）
    avatarUrl: r.avatarUrl,
    totalLv: typeof r.total_lv === 'number' ? r.total_lv : undefined,
    levelDifficulty: r.level_difficulty === 'hard' || r.level_difficulty === 'easy'
      ? (r.level_difficulty as 'hard' | 'easy')
      : undefined,
    attributeNames: r.attribute_names,
    attributeLevels: r.attribute_levels,
    attributeLevelTitles: r.attribute_level_titles,
    attributePoints: r.attribute_points,
    totalPoints: typeof r.total_points === 'number' ? r.total_points : undefined,
    unlockedCount: typeof r.unlocked_count === 'number' ? r.unlocked_count : undefined,
    status: (r.status as CloudProfile['status']) ?? undefined,
    goal: (r.goal as CloudProfile['goal']) ?? undefined,
    lastSyncedAt: new Date(),
  } as CloudProfile;
}

/** 后端关系行 → 前端 Friendship（状态映射 accepted→linked，declined→rejected） */
function mapFriendship(raw: RawFriendship): Friendship {
  const status: FriendshipStatus =
    raw.status === 'accepted' ? 'linked'
    : raw.status === 'declined' ? 'rejected'
    : 'pending';
  const other = raw.expand?.other;
  return {
    id: raw.id,
    userAId: raw.userAId,
    userBId: raw.userBId,
    initiatorId: raw.initiatorId,
    status,
    message: raw.message ?? undefined,
    expiresAt: raw.expiresAt ? new Date(raw.expiresAt) : undefined,
    respondedAt: status !== 'pending' ? new Date(raw.updated) : undefined,
    createdAt: new Date(raw.created),
    updatedAt: new Date(raw.updated),
    otherProfile: other ? mapCloudProfile(other) : undefined,
  };
}

const requireViewer = (): string => {
  const me = velvetRequestUserId();
  if (!me) throw new Error('用户信息缺失');
  return me;
};

/** 从 velvetApi 拿当前用户 id（避免循环依赖直接 import getUserId 也可以，这里复用导出） */
import { getUserId as velvetRequestUserId } from './velvetApi';

/** 按社交 ID 查人（不存在返回 null）。404 = 不存在 */
export async function searchUserByUserId(userId: string): Promise<CloudProfile | null> {
  const normalized = userId.trim().toLowerCase();
  if (!normalized) return null;
  try {
    const raw = await velvetRequest<Record<string, unknown>>(
      `/api/social/users?userId=${encodeURIComponent(normalized)}`);
    return mapCloudProfile(raw);
  } catch (err) {
    if ((err as { status?: number })?.status === 404) return null;
    throw err;
  }
}

/** 我的好友与申请列表 */
export async function listFriendships(): Promise<Friendship[]> {
  requireViewer();
  const res = await velvetRequest<{ items: RawFriendship[] }>('/api/social/friends');
  return res.items.map(r => mapFriendship(r));
}

/** 发好友申请（后端幂等：重复申请返回同一关系行） */
export async function sendFriendRequest(input: SendFriendRequestInput): Promise<Friendship> {
  const me = requireViewer();
  const target = input.targetUserId.trim();
  if (!target) throw new Error('对方信息缺失');
  if (target === me) throw new Error('不能向自己发起申请');
  const raw = await velvetRequest<RawFriendship>('/api/social/friends/request', {
    method: 'POST',
    body: JSON.stringify({ targetId: target, message: input.message }),
  });
  return mapFriendship(raw);
}

/** 接受申请 */
export async function acceptFriendRequest(friendshipId: string): Promise<Friendship> {
  requireViewer();
  const raw = await velvetRequest<RawFriendship>(`/api/social/friends/${friendshipId}/accept`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  return mapFriendship(raw);
}

/** 拒绝申请 */
export async function rejectFriendRequest(friendshipId: string): Promise<Friendship> {
  requireViewer();
  const raw = await velvetRequest<RawFriendship>(`/api/social/friends/${friendshipId}/decline`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  return mapFriendship(raw);
}

/** 解除好友 */
export async function severFriendship(friendshipId: string): Promise<Friendship> {
  const me = requireViewer();
  await velvetRequest<{ ok: boolean }>(`/api/social/friends/${friendshipId}`, {
    method: 'DELETE',
  });
  // 后端删除即消失；前端语义要求返回 severed 状态行——本地合成
  return {
    id: friendshipId,
    userAId: '',
    userBId: '',
    initiatorId: me,
    status: 'severed',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Friendship;
}

/**
 * 过期 pending 清扫：后端在 listFor 时已自动把过期 pending 置 declined，
 * 这里只统计前端列表里 pending 且已过期的条数（对齐 PB 实现的返回语义）。
 */
export async function expireOutdatedPending(friendships: Friendship[]): Promise<number> {
  const now = Date.now();
  return friendships.filter(f => f.status === 'pending' && f.expiresAt && f.expiresAt.getTime() < now).length;
}
