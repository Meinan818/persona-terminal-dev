/**
 * prayers.ts 分流回归测试（社交迁移 W3 第一波）：
 *
 * 自研后端登录态下（isAuthenticated()=true / velvet.jwt 在），祈愿的读与写
 * 必须走 prayersApi（/api/social/prayers*），而不是 PocketBase。
 * 与 friends / notifications 同款自动分流。
 */
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => {
  const api = {
    listTodayPrayers: vi.fn(),
    sendPrayer: vi.fn(),
  };
  const pb = {
    authStore: { isValid: false, token: '', record: null },
    collection: vi.fn(() => {
      throw new Error('不应触碰 PocketBase：自研登录态下必须走 prayersApi');
    }),
  };
  return { api, pb };
});

// velvetApi.isAuthenticated 决定分流（自研登录态）；mock 成已登录
vi.mock('../velvetApi', () => ({
  isAuthenticated: () => true,
  getUserId: () => 'user-me',
}));

vi.mock('../prayersApi', () => h.api);

import { listTodayPrayers, sendPrayer } from '../prayers';

const PRAYER = {
  id: 'p-1',
  fromId: 'user-me',
  toId: 'user-b',
  day: '2026-10-14',
  createdAt: new Date(),
};

beforeEach(() => {
  localStorage.setItem('velvet.jwt', 'tok-abc');
  Object.values(h.api).forEach((f) => f.mockReset());
  h.pb.collection.mockClear();
});

afterEach(() => {
  localStorage.clear();
});

describe('prayers.ts 分流：自研登录态 → 走 prayersApi', () => {
  it('listTodayPrayers 走 prayersApi，不碰 PocketBase', async () => {
    h.api.listTodayPrayers.mockResolvedValue([PRAYER]);
    const got = await listTodayPrayers();
    expect(h.api.listTodayPrayers).toHaveBeenCalled();
    expect(got).toEqual([PRAYER]);
  });

  it('sendPrayer 走 prayersApi，不碰 PocketBase', async () => {
    h.api.sendPrayer.mockResolvedValue({ prayer: PRAYER, reciprocal: false });
    const got = await sendPrayer('user-b', []);
    // 后端需要 day 参数（前端按本地 04:00 日界算好）
    expect(h.api.sendPrayer).toHaveBeenCalledWith('user-b', [], expect.any(String));
    expect(got.prayer).toEqual(PRAYER);
  });

  it('不能对自己祈愿：前端仍拦下，不发请求', async () => {
    await expect(sendPrayer('user-me', [])).rejects.toThrow('不能对自己祈愿');
    expect(h.api.sendPrayer).not.toHaveBeenCalled();
  });
});
