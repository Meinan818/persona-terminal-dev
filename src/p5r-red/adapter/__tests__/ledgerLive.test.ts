import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Budget, LedgerEntry, Settings } from '@/types';

const h = vi.hoisted(() => ({ entries: new Map<string, LedgerEntry>(), budgets: new Map<string, Budget>(), settings: null as Settings | null, put: vi.fn() }));
vi.mock('@/db', () => ({ db: {
  ledgerEntries: {
    put: h.put,
    toArray: async () => [...h.entries.values()],
    delete: async (id: string) => { h.entries.delete(id); },
    update: async (id: string, patch: Partial<LedgerEntry>) => { const entry = h.entries.get(id); if (entry) h.entries.set(id, { ...entry, ...patch }); },
  },
  budgets: { toArray: async () => [...h.budgets.values()], put: async (budget: Budget) => { h.budgets.set(budget.id, budget); } },
  assets: { toArray: async () => [] },
  settings: { toArray: async () => h.settings ? [h.settings] : [], put: async (settings: Settings) => { h.settings = settings; } },
  attributes: { toArray: async () => [], bulkPut: async () => {} },
  transaction: async <T>(_mode: string, _table: unknown, run: () => Promise<T>) => {
    const before = new Map(h.entries);
    try { return await run(); } catch (error) { h.entries.clear(); before.forEach((entry, id) => h.entries.set(id, entry)); throw error; }
  },
} }));
vi.mock('@/p5r-red/screens/pkg4/ledger4', () => ({ FLOW: [], connectLedgerLive: vi.fn() }));
vi.mock('@/p5r-red/screens/pkg4/d4', () => ({ connectLedgerDetails: vi.fn() }));
import { useAppStore, toLocalDateKey } from '@/store';
import { ledgerLiveBridge as bridge } from '@/p5r-red/adapter/live';

const original = useAppStore.getState();
let request = 0;
const draft = (overrides = {}) => ({ note: '咖啡', amount: 28, dir: 'expense' as const, date: toLocalDateKey(), cat: '餐饮', ch: '微信', ...overrides });
const key = () => `test-${++request}`;
beforeEach(() => {
  vi.clearAllMocks(); h.entries.clear(); h.budgets.clear();
  h.settings = { ...original.settings, ledgerEnabled: false, ledgerPayCycleEnabled: false, ledgerResetDay: 1 };
  h.put.mockImplementation(async (entry: LedgerEntry) => { h.entries.set(entry.id, entry); });
  useAppStore.setState({ ...original, settings: h.settings, ledgerEntries: [], budgets: [], assets: [], ledgerLoaded: true, battleState: null, syncNotifications: vi.fn().mockResolvedValue(undefined) });
});

describe('红色记账真实操作桥', () => {
  it('空账本显示真实零值；金额输入不截断非法内容', () => {
    expect(bridge.snapshot()).toMatchObject({ total: 0, ex: 0, inc: 0, first: true, limit: undefined });
    expect(bridge.amount('12，30')).toBe(12.3);
    expect(bridge.amount('-12.30', true)).toBe(-12.3);
    expect(bridge.amount('12abc')).toBeNaN();
    expect(bridge.amount('Infinity')).toBeNaN();
  });
  it('传完整日期、细分类和渠道；同一表单请求只落库一次', async () => {
    const id = key();
    const input = [draft({ date: '2026-10-01', subcategory: '早餐', worth: '值得' })];
    const [a, b] = await Promise.all([bridge.save(input, id), bridge.save(input, id)]);
    expect(a.rows[0].id).toBe(b.rows[0].id);
    expect(h.entries.size).toBe(1);
    expect([...h.entries.values()][0]).toMatchObject({ date: '2026-10-01', amount: 28, type: 'food', category: '早餐', channel: '微信', evalWorth: 'worth', source: 'manual' });
  });
  it('一批第二笔失败时整批回滚，重试不重复第一笔', async () => {
    const id = key();
    h.put.mockRejectedValueOnce(new Error('synthetic first write failure'));
    await expect(bridge.save([draft(), draft()], id)).rejects.toThrow('synthetic first write failure');
    expect(h.entries.size).toBe(0);
    h.put.mockImplementationOnce(async (entry: LedgerEntry) => { h.entries.set(entry.id, entry); }).mockRejectedValueOnce(new Error('synthetic second write failure'));
    await expect(bridge.save([draft(), draft()], id)).rejects.toThrow('synthetic second write failure');
    expect(h.entries.size).toBe(0);
    expect(useAppStore.getState().ledgerEntries).toHaveLength(0);
    await bridge.save([draft(), draft()], id);
    expect(h.entries.size).toBe(2);
    expect(new Set([...h.entries.keys()]).size).toBe(2);
  });
  it('无效日期与金额不写库', async () => {
    await expect(bridge.save([draft({ date: '2026-02-30' })], key())).rejects.toThrow('日期无效');
    await expect(bridge.save([draft({ amount: NaN })], key())).rejects.toThrow('金额无效');
    expect(h.put).not.toHaveBeenCalled();
  });
  it('奖励失败仍返回已保存流水，重试不再落账或重发奖励', async () => {
    const reward = vi.fn().mockRejectedValue(new Error('synthetic reward failure'));
    useAppStore.setState({ rewardForLedgerEntry: reward });
    const id = key(), input = [draft()];
    expect((await bridge.save(input, id)).warning).toBe('流水已保存，奖励处理未完成');
    await bridge.save(input, id);
    expect(h.entries.size).toBe(1);
    expect(reward).toHaveBeenCalledTimes(1);
  });
  it('同金额两笔按真实ID删除其中一笔', async () => {
    const { rows } = await bridge.save([draft(), draft()], key());
    await bridge.remove(rows[0].id!);
    expect([...h.entries.keys()]).toEqual([rows[1].id]);
  });
  it('不值评估完整保存；批量工资沿用来源判断，手动取消劳动标记仍生效', async () => {
    const { rows } = await bridge.save([
      draft({ worth: '不值' }),
      { note: '批量工资', amount: 100, dir: 'income', incomeSource: '工资', date: toLocalDateKey() },
      { note: '取消劳动', amount: 100, dir: 'income', incomeSource: '工资', labor: false, date: toLocalDateKey() },
    ], key());
    expect(h.entries.get(rows[0].id!)?.evalWorth).toBe('notWorth');
    expect(h.entries.get(rows[1].id!)?.incomeType).toBe('labor');
    expect(h.entries.get(rows[2].id!)?.incomeType).toBe('other');
  });
  it('对账调整只进总余额，不计收入和支出，三轮后拒绝', async () => {
    await bridge.reconcile([{ account: '微信', target: 100 }]);
    expect(bridge.snapshot()).toMatchObject({ total: 100, ex: 0, inc: 0, remaining: 3 });
    for (const target of [110, 120, 130]) await bridge.reconcile([{ account: '微信', target }]);
    const count = h.entries.size;
    await expect(bridge.reconcile([{ account: '微信', target: 140 }])).rejects.toThrow('本月对账已用完');
    expect(h.entries.size).toBe(count);
    expect(bridge.snapshot()).toMatchObject({ total: 130, remaining: 0 });
  });
  it('预算目标两次修改后锁定，仍可改单月上限；重试相同目标不多计次数', async () => {
    const period = toLocalDateKey().slice(0, 7);
    await bridge.budget({ period, limit: 1000, savings: 100, resetDay: 10 });
    await bridge.budget({ period, limit: 1100, savings: 100, resetDay: 10 });
    expect(h.budgets.get(period)?.savingsGoalEdits).toBe(1);
    await bridge.budget({ period, limit: 1200, savings: 200, resetDay: 10 });
    await expect(bridge.budget({ period, limit: 1300, savings: 300, resetDay: 10 })).rejects.toThrow('本月修改次数已用完');
    expect(h.budgets.get(period)).toMatchObject({ monthlyLimit: 1200, savingsGoal: 200, savingsGoalEdits: 2 });
    expect(h.settings?.ledgerResetDay).toBe(10);
  });
});
