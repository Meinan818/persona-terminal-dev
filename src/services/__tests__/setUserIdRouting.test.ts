/**
 * auth.setOrChangeUserId 分流回归测试（复现 2026-10-14 用户报告的真机 bug）：
 *
 * 用户已登录（自研后端），在「账号管理」里设置 UserID，界面却报「未登录」。
 *
 * 原缺陷：setOrChangeUserId 首行 `if (!pb || !pb.authStore.isValid) throw new Error('未登录')`
 * ——自研模式下 pb.authStore 恒空，直接抛「未登录」。属 §十八 那族「仍用 PB 判据」的又一实例。
 * 修复：登录自研后端时（velvet.jwt 在 / cloudEnabled）走 velvetApi.updateProfile({ username })。
 */
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => {
  const velvetApi = {
    updateProfile: vi.fn(),
    isAuthenticated: vi.fn(() => true),
    getUserId: vi.fn(() => 'user-me'),
  };
  const pb = {
    authStore: { isValid: false, token: '', record: null, save: vi.fn() },
    collection: vi.fn(() => {
      throw new Error('不应触碰 PocketBase：自研登录态下必须走 velvetApi');
    }),
  };
  return { velvetApi, pb };
});


vi.mock('../velvetApi', () => ({
  ...h.velvetApi,
  VelvetApiError: class VelvetApiError extends Error {
    status: number;
    constructor(status: number, message?: string) { super(message); this.status = status; }
  },
}));

vi.mock('../pactBackground', () => ({ clearPactRunner: vi.fn() }));

import { setOrChangeUserId } from '../auth';

beforeEach(() => {
  Object.values(h.velvetApi).forEach((f) => f.mockReset());
  h.velvetApi.isAuthenticated.mockReturnValue(true);
  h.velvetApi.getUserId.mockReturnValue('user-me');
  h.pb.collection.mockClear();
});

afterEach(() => {
  localStorage.clear();
});

describe('setOrChangeUserId：自研登录态 → 走 velvetApi', () => {
  it('设置 UserID 时不抛「未登录」，改调 velvetApi.updateProfile', async () => {
    h.velvetApi.updateProfile.mockResolvedValue({ id: 'user-me', username: 'alice01' });
    const got = await setOrChangeUserId('Alice01');
    // 归一化小写后传下去
    expect(h.velvetApi.updateProfile).toHaveBeenCalledWith({ username: 'alice01' });
    expect(got).toEqual({ id: 'user-me', username: 'alice01' });
  });

  it('格式不合法时仍在前端拦下，不发请求', async () => {
    await expect(setOrChangeUserId('ab')).rejects.toThrow('UserID 应为 3-18 位');
    expect(h.velvetApi.updateProfile).not.toHaveBeenCalled();
  });
});
