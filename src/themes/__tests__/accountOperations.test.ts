import { beforeEach, describe, expect, it, vi } from 'vitest';

type SyncDiff = {
  cloudExceedsLocal: boolean;
};

const h = vi.hoisted(() => ({
  computeSyncDiff: vi.fn(),
  pullAll: vi.fn(),
  pushAll: vi.fn(),
  syncOnLogin: vi.fn(),
  logout: vi.fn(),
  deleteAccount: vi.fn(),
  setDiffWarning: vi.fn(),
  openMerge: vi.fn(),
  setConflictPending: vi.fn(),
  conflictTables: [] as string[],
}));

vi.mock('@/services/auth', () => ({
  logout: h.logout,
  deleteAccount: h.deleteAccount,
}));

vi.mock('@/services/sync', () => {
  class SyncConflictError extends Error {
    tables: string[];
    constructor(tables: string[]) {
      super('conflict');
      this.tables = tables;
      h.conflictTables = tables;
    }
  }
  return {
    computeSyncDiff: h.computeSyncDiff,
    pullAll: h.pullAll,
    pushAll: h.pushAll,
    syncOnLogin: h.syncOnLogin,
    SyncConflictError,
  };
});

vi.mock('@/store/cloud', () => ({
  useCloudStore: {
    getState: () => ({
      setDiffWarning: h.setDiffWarning,
      openMerge: h.openMerge,
      setConflictPending: h.setConflictPending,
    }),
  },
}));

import { accountOps } from '../accountOperations';

const diff = (cloudExceedsLocal: boolean): SyncDiff => ({ cloudExceedsLocal });

describe('四主题账号操作适配', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.computeSyncDiff.mockResolvedValue(diff(false));
    h.pushAll.mockResolvedValue(undefined);
    h.pullAll.mockResolvedValue(undefined);
    h.syncOnLogin.mockResolvedValue('skip');
    h.deleteAccount.mockResolvedValue(undefined);
  });

  it('云端条目更多时不推送，改为打开真实差异确认', async () => {
    const warning = diff(true);
    h.computeSyncDiff.mockResolvedValue(warning);

    await expect(accountOps.push()).resolves.toBe('diff');
    expect(h.setDiffWarning).toHaveBeenCalledWith(warning);
    expect(h.pushAll).not.toHaveBeenCalled();
  });

  it('推送发现云端已变化时不覆盖，转交真实合并弹层', async () => {
    h.pushAll.mockImplementation(async () => {
      const { SyncConflictError } = await import('@/services/sync');
      throw new SyncConflictError(['activities', 'todos']);
    });

    await expect(accountOps.push()).resolves.toBe('conflict');
    expect(h.openMerge).toHaveBeenCalledWith(['activities', 'todos']);
  });

  it('推送网络失败原样抛给页面，不伪造成功', async () => {
    h.pushAll.mockRejectedValue(new Error('Failed to fetch'));
    await expect(accountOps.push()).rejects.toThrow('Failed to fetch');
    expect(h.openMerge).not.toHaveBeenCalled();
  });

  it('登录后同步冲突交给全局选择，不自动覆盖任一侧', async () => {
    h.syncOnLogin.mockResolvedValue('conflict');
    await expect(accountOps.afterLogin()).resolves.toBe('conflict');
    expect(h.setConflictPending).toHaveBeenCalledWith(true);
  });

  it('退出与删号复用现有 auth 服务', async () => {
    accountOps.logout();
    await accountOps.deleteAccount();
    expect(h.logout).toHaveBeenCalledTimes(1);
    expect(h.deleteAccount).toHaveBeenCalledTimes(1);
  });
});
