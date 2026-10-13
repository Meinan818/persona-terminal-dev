/**
 * 通知列表 API —— 只走自研后端 /api/social/notifications。
 *
 * 每条通知只对收件人可见；收件人可以读 / 标记已读 / 删除。
 * 发送通知的创建逻辑在 `services/friends.ts` 等业务流程里，不在这里暴露。
 */

import * as notificationsApi from './notificationsApi';
import { sanitizeNotificationPayload } from './notificationPayload';
import type { NotificationEntry } from '@/types';

// 清洗函数放在 notificationPayload.ts（避免循环依赖）；这里再导出一次保持既有 import 路径可用。
export { sanitizeNotificationPayload };

/** 拉当前用户的通知（后端返回最新 100 条 + 全部未读，已按时间倒序） */
export const listNotifications = (): Promise<NotificationEntry[]> => notificationsApi.listNotifications();

/**
 * 标记一条通知为已读。
 *
 * **会抛** —— 之前版本是静默吞掉错误，结果 consumer 以为标记成功、
 * 但 PB 上还是 `read=false`，下次 loadSocial 会把同一条事件再消费一遍
 * （重复 +SP / +亲密度）。现在由调用方决定：
 *   - 如果消费方需要 at-most-once，应该先 markRead 成功再发奖励
 *   - 如果只是 "一键全读" 这类批量操作，用 try/catch 忽略单条失败即可
 */
export const markNotificationRead = async (id: string): Promise<void> => {
  await notificationsApi.markNotificationRead(id);
};

/** 把当前用户所有未读标成已读（一键清空红点） */
export const markAllNotificationsRead = (unread: NotificationEntry[]): Promise<number> =>
  notificationsApi.markAllNotificationsRead(unread);

/** 删除一条通知（对自己不可见） */
export const deleteNotification = (id: string): Promise<void> => notificationsApi.deleteNotification(id);
