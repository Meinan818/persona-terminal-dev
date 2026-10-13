/**
 * 注销的行为：登录态下删云端账号并清本地令牌；未登录直接拒绝。
 * 原缺陷：自研会话下 pb.authStore 恒空，注销直接抛「未登录」——自研用户根本注销不了。
 * PocketBase 回落已随退役删除。
 */
import { beforeEach, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  velvetAuthenticated: true,
  velvetDelete: vi.fn(),
  velvetClear: vi.fn(),
}));

vi.mock('../velvetApi', () => ({
  cloudEnabled: true,
  isAuthenticated: () => h.velvetAuthenticated,
  deleteAccount: h.velvetDelete,
  clearAuth: h.velvetClear,
  VelvetApiError: class VelvetApiError extends Error { status = 0; },
}));

import { deleteAccount } from '../auth';

beforeEach(() => {
  vi.clearAllMocks();
  h.velvetAuthenticated = true;
  h.velvetDelete.mockResolvedValue(undefined);
});

it('登录态下：调自研注销并清掉本地令牌', async () => {
  await deleteAccount();
  expect(h.velvetDelete).toHaveBeenCalledTimes(1);
  expect(h.velvetClear).toHaveBeenCalledTimes(1);
});

it('未登录时拒绝，不打后端', async () => {
  h.velvetAuthenticated = false;
  await expect(deleteAccount()).rejects.toThrow('未登录');
  expect(h.velvetDelete).not.toHaveBeenCalled();
  expect(h.velvetClear).not.toHaveBeenCalled();
});
