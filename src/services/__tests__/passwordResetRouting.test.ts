/**
 * 「忘记密码」的行为：身份规范化后交给自研接口；冷却与服务器错误翻译成人话。
 * PocketBase 回落已随退役删除——没配云端地址时直接报「云同步未配置」，不再悄悄走旧后端。
 */
import { beforeEach, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  velvetConfigured: true,
  requestReset: vi.fn(),
}));

vi.mock('../velvetApi', () => ({
  get cloudEnabled() { return h.velvetConfigured; },
  requestPasswordReset: h.requestReset,
  VelvetApiError: class VelvetApiError extends Error {
    status: number;
    constructor(status: number) { super('velvet error ' + status); this.status = status; }
  },
}));

import { requestPasswordReset } from '../auth';
import { VelvetApiError } from '../velvetApi';

beforeEach(() => {
  vi.clearAllMocks();
  h.velvetConfigured = true;
  h.requestReset.mockResolvedValue(undefined);
});

it('走自研接口，并把身份规范化', async () => {
  await requestPasswordReset('  Alice@Example.invalid ');
  expect(h.requestReset).toHaveBeenCalledWith('alice@example.invalid');
});

it('身份为空时提前拦住，不打后端', async () => {
  await expect(requestPasswordReset('   ')).rejects.toThrow('请输入 UserID 或邮箱');
  expect(h.requestReset).not.toHaveBeenCalled();
});

it('冷却期内被拒时给出人话提示', async () => {
  h.requestReset.mockRejectedValueOnce(new VelvetApiError(429, null));
  await expect(requestPasswordReset('alice@example.invalid')).rejects.toThrow('操作太频繁');
});

it('没配云端地址时明确报错', async () => {
  h.velvetConfigured = false;
  await expect(requestPasswordReset('alice@example.invalid')).rejects.toThrow('云同步未配置');
  expect(h.requestReset).not.toHaveBeenCalled();
});
