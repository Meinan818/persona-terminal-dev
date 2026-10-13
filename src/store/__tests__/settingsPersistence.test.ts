import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Settings } from '@/types';

const h = vi.hoisted(() => ({ persisted: null as Settings | null, put: vi.fn(), bulkPut: vi.fn() }));
vi.mock('@/db', () => ({ db: {
  settings: { toArray: async () => h.persisted ? [h.persisted] : [], put: h.put },
  attributes: { toArray: async () => [], bulkPut: h.bulkPut },
  transaction: async <T>(_mode: string, _tables: unknown, fn: () => Promise<T>) => fn(),
} }));
import { useAppStore } from '..';

describe('设置持久化失败与重试', () => {
  const initial = useAppStore.getState().settings;
  beforeEach(() => {
    vi.clearAllMocks(); h.persisted = { ...initial };
    h.put.mockImplementation(async (settings: Settings) => { h.persisted = settings; });
    h.bulkPut.mockResolvedValue(undefined);
    useAppStore.setState({ settings: { ...initial }, syncNotifications: vi.fn().mockResolvedValue(undefined) });
  });
  it('保存失败向调用方返回失败，内存保持旧值，随后重试仍成功', async () => {
    h.put.mockRejectedValueOnce(new Error('synthetic write failure'));
    await expect(useAppStore.getState().updateSettings({ summaryModel: 'new-model' })).rejects.toThrow('synthetic write failure');
    expect(useAppStore.getState().settings.summaryModel).toBe(initial.summaryModel);
    await useAppStore.getState().updateSettings({ summaryModel: 'new-model' });
    expect(h.persisted?.summaryModel).toBe('new-model');
    expect(useAppStore.getState().settings.summaryModel).toBe('new-model');
  });
  it('并发更新不同字段保留两次修改，并采用持久层新值作为底稿', async () => {
    h.persisted = { ...initial, weatherApiHost: 'persisted-host' };
    await Promise.all([
      useAppStore.getState().updateSettings({ summaryModel: 'new-model' }),
      useAppStore.getState().updateSettings({ summaryApiBaseUrl: 'https://test.invalid' }),
    ]);
    expect(h.persisted).toMatchObject({ weatherApiHost: 'persisted-host', summaryModel: 'new-model', summaryApiBaseUrl: 'https://test.invalid' });
  });
});
