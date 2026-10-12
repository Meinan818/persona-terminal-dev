/**
 * notificationsApi —— 通知中心的自研后端数据源（社交迁移 W2）。
 *
 * 契约：后端 /api/social/notifications（NotificationController），
 * 函数签名与 notifications.ts 的 PB 实现镜像；返回结构统一映射为
 * 前端 NotificationEntry 类型（types/index.ts）。
 * 前端 notifications.ts 按「是否登录自研后端」自动分流到这里（用户无感，无开关）。
 *
 * payload 键约定为 snake_case（friendship_id / pact_id …）——与 PB 时代一致，
 * 后端 NotificationService 已把早期 camelCase 写入归一化。
 */
import { velvetRequest } from './velvetApi';
import { sanitizeNotificationPayload } from './notificationPayload';
import type { CloudProfile, NotificationEntry, NotificationType } from '@/types';

/** 后端返回的通知行（NotificationService.toView 形状） */
interface RawNotification {
  id: string;
  userId: string;
  type: string;
  fromId?: string | null;
  fromProfile?: Record<string, unknown> | null;
  payload?: Record<string, unknown> | null;
  read: boolean;
  createdAt: string;
  created?: string;
}

/** 后端公开档案 → CloudProfile（字段语义与 friendsApi.mapCloudProfile 对齐） */
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

function mapNotification(raw: RawNotification): NotificationEntry {
  return {
    id: raw.id,
    userId: raw.userId,
    type: raw.type as NotificationType,
    fromId: raw.fromId ?? undefined,
    fromProfile: mapProfile(raw.fromProfile),
    // 复用 notifications.ts 的类型/长度清洗（通知是别人写来的，字段不可信）
    payload: sanitizeNotificationPayload(raw.payload),
    read: Boolean(raw.read),
    createdAt: new Date(raw.createdAt || raw.created || Date.now()),
  };
}

/** 拉当前用户的通知（后端已按 created 倒序） */
export async function listNotifications(): Promise<NotificationEntry[]> {
  const res = await velvetRequest<{ items: RawNotification[] }>('/api/social/notifications');
  return res.items.map(mapNotification);
}

/** 标记一条通知为已读（后端越权 → 404，会抛） */
export async function markNotificationRead(id: string): Promise<void> {
  await velvetRequest<unknown>(`/api/social/notifications/${id}/read`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

/** 把给定未读列表全标已读（一键清空红点），返回成功条数 */
export async function markAllNotificationsRead(unread: NotificationEntry[]): Promise<number> {
  let ok = 0;
  for (const n of unread) {
    if (n.read) continue;
    try {
      await markNotificationRead(n.id);
      ok += 1;
    } catch (err) {
      console.warn('[velvet-notifications] markRead batch item failed', n.id, err);
    }
  }
  return ok;
}

/** 删除一条通知 */
export async function deleteNotification(id: string): Promise<void> {
  try {
    await velvetRequest<unknown>(`/api/social/notifications/${id}`, { method: 'DELETE' });
  } catch (err) {
    console.warn('[velvet-notifications] delete failed', id, err);
  }
}
