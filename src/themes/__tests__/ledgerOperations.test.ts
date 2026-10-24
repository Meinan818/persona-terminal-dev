import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import type { Budget, LedgerAsset, LedgerEntry, Settings } from '@/types';

const h = vi.hoisted(() => ({
  assets: new Map<string, LedgerAsset>(), budgets: new Map<string, Budget>(), entries: [] as LedgerEntry[],
  settings: null as Settings | null, assetPut: vi.fn(), entryPut: vi.fn(), settingsPut: vi.fn(),
}));
vi.mock('@/db', () => ({ db: {
  assets: { toArray: async () => [...h.assets.values()], put: h.assetPut, delete: async (id: string) => { h.assets.delete(id); } },
  budgets: { toArray: async () => [...h.budgets.values()], put: async (b: Budget) => { h.budgets.set(b.period, b); } },
  ledgerEntries: { toArray: async () => [...h.entries], put: h.entryPut },
  settings: { toArray: async () => h.settings ? [h.settings] : [], put: h.settingsPut },
  attributes: { toArray: async () => [], bulkPut: async () => {} },
  transaction: async <T>(_mode: string, _tables: unknown, run: () => Promise<T>) => {
    const before = [...h.entries];
    try { return await run(); } catch (error) { h.entries = before; throw error; }
  },
} }));
import { useAppStore } from '@/store';
import { ledgerOps } from '@/themes/ledgerOperations';
const original = useAppStore.getState();
const asset = (name = '同名设备'): LedgerAsset => ({ id: 'draft-id', name, category: 'digital', price: 299, status: 'inuse', purchaseDate: '2026-09-01', createdAt: new Date() });
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-21T12:00:00'));
  vi.clearAllMocks(); h.assets.clear(); h.budgets.clear(); h.entries = [];
  h.settings = { ...original.settings, ledgerPayCycleEnabled: false, ledgerResetDay: 1 };
  h.assetPut.mockImplementation(async (a: LedgerAsset) => { h.assets.set(a.id, a); });
  h.entryPut.mockImplementation(async (e: LedgerEntry) => { h.entries.push(e); });
  h.settingsPut.mockImplementation(async (s: Settings) => { h.settings = s; });
  useAppStore.setState({ ...original, ledgerLoaded: true, ledgerEntries: [], budgets: [], assets: [], settings: h.settings, syncNotifications: vi.fn().mockResolvedValue(undefined) });
});
afterEach(() => { vi.useRealTimers(); });

it('预算目标只计实际变更；同值并发不多扣次数，锁定后仍能改上限和重置日', async () => {
  await Promise.all([ledgerOps.saveBudget(1200, 100, 5), ledgerOps.saveBudget(1200, 100, 5)]);
  expect(h.budgets.get('2026-10')).toMatchObject({ monthlyLimit: 1200, savingsGoal: 100, savingsGoalEdits: 1 });
  await ledgerOps.saveBudget(1400, 200, 10);
  await ledgerOps.saveBudget(1500, 300, 15);
  expect(h.budgets.get('2026-10')).toMatchObject({ monthlyLimit: 1500, savingsGoal: 200, savingsGoalEdits: 2 });
  expect(h.settings?.ledgerResetDay).toBe(15);
});
it('预算设置失败可重试，不重复消耗挑战次数；两次写入的边界如实保留', async () => {
  h.settingsPut.mockRejectedValueOnce(new Error('synthetic settings failure'));
  await expect(ledgerOps.saveBudget(1200, 100, 10)).rejects.toThrow('synthetic');
  expect(h.budgets.get('2026-10')?.savingsGoalEdits).toBe(1);
  expect(h.settings?.ledgerResetDay).toBe(1);
  await ledgerOps.saveBudget(1200, 100, 10);
  expect(h.budgets.get('2026-10')?.savingsGoalEdits).toBe(1);
  expect(h.settings?.ledgerResetDay).toBe(10);
});
it('未填写省钱目标不占用修改次数', async () => {
  await ledgerOps.saveBudget(1200, 0, 5);
  expect(h.budgets.get('2026-10')?.monthlyLimit).toBe(1200);
  expect(h.budgets.get('2026-10')?.savingsGoalEdits ?? 0).toBe(0);
  expect(h.budgets.get('2026-10')?.savingsGoal).toBeUndefined();
});
it('非法预算和资产金额拒绝落库', async () => {
  for (const n of [NaN, Infinity, 0, -1]) {
    await expect(ledgerOps.saveBudget(n, undefined, 1)).rejects.toThrow('无效');
    await expect(ledgerOps.addAsset({ ...asset(), price: n })).rejects.toThrow('有效');
  }
  await expect(ledgerOps.saveBudget(100, -1, 1)).rejects.toThrow('无效');
  await expect(ledgerOps.saveBudget(100, undefined, 29)).rejects.toThrow('无效');
  expect(h.budgets.size).toBe(0); expect(h.assets.size).toBe(0);
});
it('资产用真实ID；同名资产独立修改/删除并保留元数据', async () => {
  const a = await ledgerOps.addAsset({ ...asset(), linkedEntryId: 'linked' });
  const b = await ledgerOps.addAsset(asset());
  expect(a.id).not.toBe(b.id); expect(a.id).not.toBe('draft-id');
  await ledgerOps.updateAsset({ ...a, status: 'idle', addOns: [{ name: '配件', amount: 12 }] });
  expect(h.assets.get(a.id)).toMatchObject({ linkedEntryId: 'linked', purchaseDate: '2026-09-01', status: 'idle', addOns: [{ amount: 12 }] });
  expect(h.assets.get(b.id)?.status).toBe('inuse');
  await ledgerOps.removeAsset(a.id); expect([...h.assets.keys()]).toEqual([b.id]);
});
it('资产写入失败不造内存数据，可重试，过期ID不假成功', async () => {
  h.assetPut.mockRejectedValueOnce(new Error('synthetic asset failure'));
  await expect(ledgerOps.addAsset(asset())).rejects.toThrow('synthetic');
  expect(useAppStore.getState().assets).toEqual([]);
  await ledgerOps.addAsset(asset()); expect(h.assets.size).toBe(1);
  await expect(ledgerOps.updateAsset(asset())).rejects.toThrow('不存在');
});
it('多账户初始余额不占轮数，后续每次多账户对账只计一轮且不算收支', async () => {
  await ledgerOps.reconcile([{ account: '微信', target: 500 }, { account: '信用卡', target: -100 }]);
  expect(useAppStore.getState().getAdjustCountThisMonth()).toBe(0);
  for (let i = 1; i <= 3; i++) await ledgerOps.reconcile([{ account: '微信', target: 500 + i }, { account: '信用卡', target: -100 - i }]);
  expect(useAppStore.getState().getAdjustCountThisMonth()).toBe(3);
  expect(useAppStore.getState().getPeriodIncome('2026-10')).toBe(0);
  expect(useAppStore.getState().getPeriodExpense('2026-10')).toBe(0);
  await expect(ledgerOps.reconcile([{ account: '微信', target: 1000 }])).rejects.toThrow('3 轮');
});
it('对账第二笔失败整批回滚，内存恢复后重试只写一组', async () => {
  h.entryPut.mockImplementationOnce(async (e: LedgerEntry) => { h.entries.push(e); }).mockRejectedValueOnce(new Error('synthetic second write failure'));
  const targets = [{ account: '微信', target: 500 }, { account: '银行卡', target: 100 }];
  await expect(ledgerOps.reconcile(targets)).rejects.toThrow('synthetic');
  expect(h.entries).toEqual([]); expect(useAppStore.getState().ledgerEntries).toEqual([]);
  await ledgerOps.reconcile(targets);
  expect(h.entries).toHaveLength(2); expect(useAppStore.getState().getTotalBalance()).toBe(600);
});
it('单笔落账等待奖励与资产回链，失败不会被界面当成成功', async () => {
  const addLedgerEntry = vi.fn(async (input: Omit<LedgerEntry, 'id' | 'createdAt' | 'currency'>) => {
    const entry = { ...input, id: 'entry-1', currency: 'CNY', createdAt: new Date() } as LedgerEntry;
    h.entries.push(entry);
    return entry;
  });
  const rewardForLedgerEntry = vi.fn(async () => {});
  const addAsset = vi.fn(async (input: Omit<LedgerAsset, 'id' | 'createdAt'>) => ({ ...input, id: 'asset-1', createdAt: new Date() }));
  const updateSettings = vi.fn(async () => {});
  useAppStore.setState({ ...useAppStore.getState(), addLedgerEntry, rewardForLedgerEntry, addAsset, updateSettings });

  const saved = await ledgerOps.saveEntry({
    direction: 'expense',
    amount: 399,
    date: '2026-10-21',
    source: 'manual',
    type: 'study',
    channel: '微信',
    note: '课程',
  }, {
    attribute: 'knowledge',
    attrPoints: 2,
    evalWorth: 'worth',
    registerAsset: true,
  });

  expect(saved.id).toBe('entry-1');
  expect(rewardForLedgerEntry).toHaveBeenCalledWith(saved, {
    attribute: 'knowledge',
    attrPoints: 2,
    evalWorth: 'worth',
  });
  expect(addAsset).toHaveBeenCalledWith(expect.objectContaining({
    name: '课程',
    price: 399,
    purchaseDate: '2026-10-21',
    linkedEntryId: 'entry-1',
  }));
  expect(updateSettings).toHaveBeenCalledWith({ ledgerLastChannel: '微信' });

  rewardForLedgerEntry.mockRejectedValueOnce(new Error('synthetic reward failure'));
  const deleteLedgerEntry = vi.fn(async () => {});
  useAppStore.setState({ ...useAppStore.getState(), deleteLedgerEntry });
  await expect(ledgerOps.saveEntry({
    direction: 'expense', amount: 10, date: '2026-10-21', source: 'manual', type: 'food',
  })).rejects.toThrow('synthetic reward failure');
  expect(deleteLedgerEntry).toHaveBeenCalledWith('entry-1');
});
it('批量落账先全量校验；中途中失败会回收已写条目', async () => {
  const addLedgerEntry = vi.fn()
    .mockImplementationOnce(async (input: Omit<LedgerEntry, 'id' | 'createdAt' | 'currency'>) => {
      const entry = { ...input, id: 'entry-1', currency: 'CNY', createdAt: new Date() } as LedgerEntry;
      h.entries.push(entry);
      return entry;
    })
    .mockRejectedValueOnce(new Error('synthetic batch failure'));
  const deleteLedgerEntry = vi.fn(async (id: string) => { h.entries = h.entries.filter(e => e.id !== id); });
  const rewardForLedgerEntry = vi.fn(async () => {});
  useAppStore.setState({ ...useAppStore.getState(), addLedgerEntry, deleteLedgerEntry, rewardForLedgerEntry, updateSettings: vi.fn(async () => {}) });

  await expect(ledgerOps.saveBatch([
    { input: { direction: 'expense', amount: 10, date: '2026-10-21', source: 'manual', type: 'food' } },
    { input: { direction: 'expense', amount: 20, date: '2026-10-21', source: 'manual', type: 'food' } },
  ])).rejects.toThrow('synthetic batch failure');
  expect(deleteLedgerEntry).toHaveBeenCalledWith('entry-1');
  expect(h.entries).toEqual([]);

  addLedgerEntry.mockClear();
  await expect(ledgerOps.saveBatch([
    { input: { direction: 'expense', amount: 10, date: '2026-10-21', source: 'manual', type: 'food' } },
    { input: { direction: 'expense', amount: 0, date: '2026-10-21', source: 'manual', type: 'food' } },
  ])).rejects.toThrow('金额');
  expect(addLedgerEntry).not.toHaveBeenCalled();
});
it('账户、来源和细分类目选项持久化到真实 settings', async () => {
  const updateSettings = vi.fn(async () => {});
  useAppStore.setState({ ...useAppStore.getState(), updateSettings });
  await ledgerOps.rememberOption('channel', '新钱包');
  await ledgerOps.rememberOption('incomeSource', '稿费');
  await ledgerOps.rememberOption('category', '早餐');
  expect(updateSettings).toHaveBeenNthCalledWith(1, expect.objectContaining({ ledgerChannels: expect.arrayContaining(['新钱包']) }));
  expect(updateSettings).toHaveBeenNthCalledWith(2, expect.objectContaining({ ledgerIncomeSources: expect.arrayContaining(['稿费']) }));
  expect(updateSettings).toHaveBeenNthCalledWith(3, expect.objectContaining({ ledgerCategories: expect.arrayContaining(['早餐']) }));
});
it('发薪日周期下预算写到当前周期键，而不是日历月', async () => {
  h.settings = { ...h.settings!, ledgerPayCycleEnabled: true, ledgerResetDay: 25 };
  useAppStore.setState({ ...useAppStore.getState(), settings: h.settings });
  await ledgerOps.saveBudget(1800, 200, 25);
  expect(h.budgets.get('2026-09')).toMatchObject({ monthlyLimit: 1800, savingsGoal: 200 });
  expect(h.budgets.has('2026-10')).toBe(false);
});
