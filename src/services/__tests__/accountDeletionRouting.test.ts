/**
 * 注销的分流：自研会话走自研接口并清掉本地令牌；只有历史 PocketBase 会话才走 PB。
 * 原缺陷：自研会话下 pb.authStore 恒空，注销直接抛「未登录」——自研用户根本注销不了。
 */
import { beforeEach, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  velvetAuthenticated: true,
  velvetDelete: vi.fn(),
  velvetClear: vi.fn(),
  pbDelete: vi.fn(),
  pbClear: vi.fn(),
}));

vi.mock('../velvetApi', () => ({
  cloudEnabled: true,
  isAuthenticated: () => h.velvetAuthenticated,
  deleteAccount: h.velvetDelete,
  clearAuth: h.velvetClear,
  VelvetApiError: class VelvetApiError extends Error { status = 0; },
}));

vi.mock('../pocketbase', () => ({
  cloudEnabled: true,
  pb: {
    authStore: { isValid: true, token: 'pb-token', clear: h.pbClear },
    collection: () => ({ delete: h.pbDelete }),
  },
  getUserId: () => 'pb-user',
}));

import { deleteAccount } from '../auth';

beforeEach(() => {
  vi.clearAllMocks();
  h.velvetAuthenticated = true;
  h.velvetDelete.mockResolvedValue(undefined);
  h.pbDelete.mockResolvedValue(undefined);
});

it('自研会话：调自研注销并清掉本地令牌，不碰 PocketBase', async () => {
  await deleteAccount();
  expect(h.velvetDelete).toHaveBeenCalledTimes(1);
  expect(h.velvetClear).toHaveBeenCalledTimes(1);
  expect(h.pbDelete).not.toHaveBeenCalled();
  expect(h.pbClear).not.toHaveBeenCalled();
});

it('未登录自研时：回落 PocketBase 删除历史账号', async () => {
  h.velvetAuthenticated = false;
  await deleteAccount();
  expect(h.pbDelete).toHaveBeenCalledWith('pb-user');
  expect(h.pbClear).toHaveBeenCalledTimes(1);
  expect(h.velvetDelete).not.toHaveBeenCalled();
});
