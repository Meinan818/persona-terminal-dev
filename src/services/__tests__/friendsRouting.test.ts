/**
 * friends.ts 分流回归测试（复现 2026-10-14 缺陷）：
 *
 * 自研后端登录态下（localStorage 有 velvet.jwt），三个读/写函数
 * 必须走 friendsApi（/api/social/**），而不是掉进 PocketBase 分支。
 *
 * 原缺陷：searchUserByUserId / listFriendships / sendFriendRequest
 * 未补 useBackend() 分支，自研模式下 pb.authStore.isValid 恒 false，
 * 直接抛「未登录」——加好友整条链路第一步就断。
 */
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => {
  const api = {
    searchUserByUserId: vi.fn(),
    listFriendships: vi.fn(),
    sendFriendRequest: vi.fn(),
    acceptFriendRequest: vi.fn(),
    rejectFriendRequest: vi.fn(),
    severFriendship: vi.fn(),
    expireOutdatedPending: vi.fn(),
  };
  // PocketBase 侧：自研模式下 pb 存在但 authStore 恒空。
  // collection() 一律抛错——若被测代码走到这里，说明分流没生效。
  const pb = {
    authStore: { isValid: false, token: '', record: null },
    collection: vi.fn(() => {
      throw new Error('不应触碰 PocketBase：自研登录态下必须走 friendsApi');
    }),
  };
  return { api, pb };
});

vi.mock('../pocketbase', () => ({
  pb: h.pb,
  getUserId: () => 'user-me',
}));

vi.mock('../friendsApi', () => h.api);

import { searchUserByUserId, listFriendships, sendFriendRequest } from '../friends';

const PROFILE = { id: 'user-target', userId: 'alice', nickname: '小明' };
const FRIENDSHIP = { id: 'fid-1', status: 'pending' as const };

beforeEach(() => {
  localStorage.setItem('velvet.jwt', 'tok-abc'); // 自研登录态
  Object.values(h.api).forEach((f) => f.mockReset());
  h.pb.collection.mockClear();
});

afterEach(() => {
  localStorage.clear();
});

describe('friends.ts 分流：自研登录态（velvet.jwt 在）→ 走 friendsApi', () => {
  it('searchUserByUserId 走 friendsApi，不碰 PocketBase', async () => {
    h.api.searchUserByUserId.mockResolvedValue(PROFILE);
    const got = await searchUserByUserId('alice');
    expect(h.api.searchUserByUserId).toHaveBeenCalledWith('alice');
    expect(got).toEqual(PROFILE);
  });

  it('listFriendships 走 friendsApi，不碰 PocketBase', async () => {
    h.api.listFriendships.mockResolvedValue([FRIENDSHIP]);
    const got = await listFriendships();
    expect(h.api.listFriendships).toHaveBeenCalled();
    expect(got).toEqual([FRIENDSHIP]);
  });

  it('sendFriendRequest 走 friendsApi，不碰 PocketBase', async () => {
    h.api.sendFriendRequest.mockResolvedValue(FRIENDSHIP);
    const got = await sendFriendRequest({ targetUserId: 'user-target', message: 'hi' });
    expect(h.api.sendFriendRequest).toHaveBeenCalledWith({
      targetUserId: 'user-target',
      message: 'hi',
    });
    expect(got).toEqual(FRIENDSHIP);
  });
});
