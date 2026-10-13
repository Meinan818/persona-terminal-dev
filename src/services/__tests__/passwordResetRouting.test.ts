/**
 * 「忘记密码」的分流：配置了自研后端就走自研（PB 那条已发不出邮件），
 * 没配置才回落 PocketBase。用 mock 把两条路都钉住，避免"看起来调了"的假通过。
 */
import { beforeEach, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  velvetConfigured: true,
  requestReset: vi.fn(),
  pbRequestReset: vi.fn(),
}));

vi.mock('../velvetApi', () => ({
  get cloudEnabled() { return h.velvetConfigured; },
  requestPasswordReset: h.requestReset,
  VelvetApiError: class VelvetApiError extends Error {
    status: number;
    constructor(status: number) { super('velvet error ' + status); this.status = status; }
  },
}));

vi.mock('../pocketbase', () => ({
  cloudEnabled: true,
  pb: { collection: () => ({ requestPasswordReset: h.pbRequestReset }) },
  getUserId: () => 'me',
}));

import { requestPasswordReset } from '../auth';
import { VelvetApiError } from '../velvetApi';

beforeEach(() => {
  vi.clearAllMocks();
  h.velvetConfigured = true;
  h.requestReset.mockResolvedValue(undefined);
  h.pbRequestReset.mockResolvedValue(undefined);
});

it('配置了自研后端时走自研接口，并把身份规范化', async () => {
  await requestPasswordReset('  Alice@Example.invalid ');
  expect(h.requestReset).toHaveBeenCalledWith('alice@example.invalid');
  expect(h.pbRequestReset).not.toHaveBeenCalled();
});

it('同一个身份在冷却期内被拒时给出人话提示', async () => {
  h.requestReset.mockRejectedValueOnce(new VelvetApiError(429, null));
  await expect(requestPasswordReset('alice@example.invalid')).rejects.toThrow('操作太频繁');
});

it('未配置自研后端时才回落 PocketBase', async () => {
  h.velvetConfigured = false;
  await requestPasswordReset('Alice@Example.invalid');
  expect(h.pbRequestReset).toHaveBeenCalledWith('alice@example.invalid');
  expect(h.requestReset).not.toHaveBeenCalled();
});
