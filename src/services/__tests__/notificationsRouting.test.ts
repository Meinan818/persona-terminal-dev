/**
 * notifications.ts 分流回归测试（社交迁移 W2）：
 *
 * 自研后端登录态下（localStorage 有 velvet.jwt），notifications 的四个函数
 * 必须走 notificationsApi（/api/social/notifications），而不是 PocketBase。
 * 与 friends.ts 同款自动分流策略。
 */
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => {
  const api = {
    listNotifications: vi.fn(),
    markNotificationRead: vi.fn(),
    markAllNotificationsRead: vi.fn(),
    deleteNotification: vi.fn(),
  };
  // PocketBase 侧：自研模式下 pb 存在但 authStore 恒空。collection() 一律抛错——
  // 若被测代码走到这里，说明分流没生效。
  const pb = {
    authStore: { isValid: false, token: '', record: null },
    collection: vi.fn(() => {
      throw new Error('不应触碰 PocketBase：自研登录态下必须走 notificationsApi');
    }),
  };
  return { api, pb };
});

vi.mock('../notificationsApi', () => h.api);

import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from '../notifications';

const NOTIF = {
  id: 'n-1',
  userId: 'user-me',
  type: 'friend_request' as const,
  fromId: 'user-a',
  payload: { friendship_id: 'fid-1' },
  read: false,
  createdAt: new Date(),
};

beforeEach(() => {
  localStorage.setItem('velvet.jwt', 'tok-abc'); // 自研登录态
  Object.values(h.api).forEach((f) => f.mockReset());
  h.pb.collection.mockClear();
});

afterEach(() => {
  localStorage.clear();
});

describe('notifications.ts 分流：自研登录态 → 走 notificationsApi', () => {
  it('listNotifications 走 notificationsApi，不碰 PocketBase', async () => {
    h.api.listNotifications.mockResolvedValue([NOTIF]);
    const got = await listNotifications();
    expect(h.api.listNotifications).toHaveBeenCalled();
    expect(got).toEqual([NOTIF]);
  });

  it('markNotificationRead 走 notificationsApi', async () => {
    h.api.markNotificationRead.mockResolvedValue(undefined);
    await markNotificationRead('n-1');
    expect(h.api.markNotificationRead).toHaveBeenCalledWith('n-1');
  });

  it('markAllNotificationsRead 走 notificationsApi', async () => {
    h.api.markAllNotificationsRead.mockResolvedValue(1);
    const ok = await markAllNotificationsRead([NOTIF]);
    expect(h.api.markAllNotificationsRead).toHaveBeenCalledWith([NOTIF]);
    expect(ok).toBe(1);
  });

  it('deleteNotification 走 notificationsApi', async () => {
    h.api.deleteNotification.mockResolvedValue(undefined);
    await deleteNotification('n-1');
    expect(h.api.deleteNotification).toHaveBeenCalledWith('n-1');
  });
});
