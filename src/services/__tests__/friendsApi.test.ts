import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * friendsApi 契约测试：mock 全局 fetch（velvetRequest 底层），
 * 断言 URL / 方法 / 请求体 / 响应映射 —— 钉住与后端 FriendController 的契约。
 */
const fetchMock = vi.fn();

vi.mock('../velvetApi', () => ({
  velvetRequest: (...args: unknown[]) => fetchMock(...args),
  getUserId: () => 'user-me',
  isAuthenticated: () => true,
}));

import {
  searchUserByUserId,
  listFriendships,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  severFriendship,
} from '../friendsApi';

const PROFILE = {
  id: 'user-target', username: 'user-target', nickname: '小明',
  total_lv: 5, level_difficulty: 'hard',
  attribute_names: {体能: '体能'}, attribute_levels: {体能: 3},
};
const RAW_PENDING = {
  id: 'fid-1', userAId: 'user-me', userBId: 'user-target',
  initiatorId: 'user-me', status: 'pending', message: 'hi',
  created: '2026-10-13T00:00:00Z', updated: '2026-10-13T00:00:00Z',
  expiresAt: '2026-10-20T00:00:00Z',
  expand: {other: PROFILE},
};

beforeEach(() => { fetchMock.mockReset(); });
afterEach(() => { vi.restoreAllMocks(); });

describe('friendsApi 契约（/api/social/**）', () => {
  it('查人：GET /api/social/users?userId=，404 → null，不露 email', async () => {
    fetchMock.mockResolvedValueOnce(PROFILE);
    const p = await searchUserByUserId('user-target');
    expect(fetchMock).toHaveBeenCalledWith('/api/social/users?userId=user-target');
    expect(p?.id).toBe('user-target');
    expect((p as unknown as Record<string, unknown>).email).toBeUndefined();

    fetchMock.mockRejectedValueOnce({status: 404});
    await expect(searchUserByUserId('ghost')).resolves.toBeNull();
  });

  it('列表：GET /api/social/friends，accepted→linked 状态映射', async () => {
    fetchMock.mockResolvedValueOnce({items: [{...RAW_PENDING, status: 'accepted'}]});
    const list = await listFriendships();
    expect(fetchMock).toHaveBeenCalledWith('/api/social/friends');
    expect(list[0].status).toBe('linked');
    expect(list[0].otherProfile?.nickname).toBe('小明');
  });

  it('申请：POST /api/social/friends/request，体含 targetId/message', async () => {
    fetchMock.mockResolvedValueOnce(RAW_PENDING);
    const f = await sendFriendRequest({targetUserId: 'user-target', message: 'hi'});
    expect(fetchMock).toHaveBeenCalledWith('/api/social/friends/request', {
      method: 'POST',
      body: JSON.stringify({targetId: 'user-target', message: 'hi'}),
    });
    expect(f.status).toBe('pending');
    expect(f.otherProfile?.totalLv).toBe(5);
  });

  it('接受/拒绝：POST …/{id}/accept|decline，体为空 JSON', async () => {
    fetchMock.mockResolvedValue({...RAW_PENDING, status: 'accepted'});
    await acceptFriendRequest('fid-1');
    expect(fetchMock).toHaveBeenLastCalledWith('/api/social/friends/fid-1/accept', {
      method: 'POST', body: JSON.stringify({}),
    });
    fetchMock.mockResolvedValueOnce({...RAW_PENDING, status: 'declined'});
    const f = await rejectFriendRequest('fid-1');
    expect(fetchMock).toHaveBeenLastCalledWith('/api/social/friends/fid-1/decline', {
      method: 'POST', body: JSON.stringify({}),
    });
    expect(f.status).toBe('rejected');
  });

  it('解除：DELETE …/{id}，返回 severed 合成行', async () => {
    fetchMock.mockResolvedValue({ok: true});
    const f = await severFriendship('fid-1');
    expect(fetchMock).toHaveBeenCalledWith('/api/social/friends/fid-1', {method: 'DELETE'});
    expect(f.status).toBe('severed');
    expect(f.id).toBe('fid-1');
  });

  it('不能向自己发起申请（前端守卫在调用后端前）', async () => {
    await expect(sendFriendRequest({targetUserId: 'user-me'})).rejects.toThrow('不能向自己');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
