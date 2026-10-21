import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Budget, LedgerAsset, LedgerEntry, Settings } from '@/types';
const h = vi.hoisted(() => ({ assets: new Map<string, LedgerAsset>(), entries: [] as LedgerEntry[], budgets: [] as Budget[], settings: null as Settings | null, put: vi.fn(), grant: vi.fn() }));
vi.mock('@/db', () => ({ db: {
  assets: { toArray: async () => [...h.assets.values()], put: h.put, delete: async (id: string) => { h.assets.delete(id); } },
  ledgerEntries: { toArray: async () => h.entries }, budgets: { toArray: async () => h.budgets },
  settings: { toArray: async () => h.settings ? [h.settings] : [], put: async (s: Settings) => { h.settings = s; } },
  attributes: { toArray: async () => [], bulkPut: async () => {} },
  transaction: async <T>(_mode: string, _tables: unknown, run: () => Promise<T>) => run(),
} }));
vi.mock('@/p5r-red/screens/pkg4/ledger4', () => ({ FLOW: [], connectLedgerLive: vi.fn() }));
vi.mock('@/p5r-red/screens/pkg4/d4', () => ({ connectLedgerDetails: vi.fn() }));
vi.mock('@/utils/aiClient', () => ({ chatComplete: vi.fn(() => { throw new Error('禁止收费调用'); }), getAIConfig: vi.fn(() => { throw new Error('禁止进入AI生成路径'); }) }));
import { useAppStore } from '@/store';
import { ledgerDetailsBridge as bridge } from '@/p5r-red/adapter/live';
const original = useAppStore.getState();
let sequence = 0;
const assetDraft = { name: '同名设备', price: 299, addOns: [{ name: '配件', amount: 12.5 }] };
const entry = (date: string, amount: number, direction: LedgerEntry['direction'] = 'expense', patch = {}): LedgerEntry => ({ id: String(++sequence), date, amount, direction, currency: 'CNY', source: 'manual', createdAt: new Date(), type: 'food', ...patch });
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-21T12:00:00'));
  vi.clearAllMocks(); h.assets.clear(); h.entries = []; h.budgets = [];
  h.settings = { ...original.settings, ledgerPayCycleEnabled: false, ledgerResetDay: 1, ledgerBudgetBonusMonths: [], ledgerChallengeWonMonths: [] };
  h.put.mockImplementation(async (a: LedgerAsset) => { h.assets.set(a.id, a); }); h.grant.mockResolvedValue(10);
  useAppStore.setState({ ...original, ledgerLoaded: true, ledgerEntries: [], budgets: [], assets: [], settings: h.settings, earnLedgerSp: h.grant, syncNotifications: vi.fn().mockResolvedValue(undefined) });
});
afterEach(() => { vi.useRealTimers(); });
describe('红色资产与统计接线', () => {
  it('真实空数据没有演示金额；未加载时不暴露旧资产', () => {
    expect(bridge.assets()).toMatchObject({ assets: [], liquid: 0, fixed: 0, deposit: 0, net: 0 });
    expect(bridge.stats()).toMatchObject({ ex: 0, inc: 0, cats: [], channels: [] });
    useAppStore.setState({ ledgerLoaded: false, ledgerEntries: [entry('2026-10-01', 90)] });
    expect(bridge.stats().ex).toBe(0);
  });
  it('同表单请求去重；同名资产按ID更新，保留表单未提供的元数据', async () => {
    const request = `asset-${++sequence}`;
    const [a, same] = await Promise.all([bridge.saveAsset(assetDraft, undefined, request), bridge.saveAsset(assetDraft, undefined, request)]);
    expect(a.id).toBe(same.id); expect(h.assets.size).toBe(1);
    const b = await bridge.saveAsset(assetDraft);
    await useAppStore.getState().updateAsset(a.id, { category: 'digital', purchaseDate: '2020-02-03', status: 'idle', linkedEntryId: 'linked' });
    await bridge.saveAsset({ name: '修改后的设备', price: 400, addOns: [] }, a.id);
    expect(h.assets.get(a.id)).toMatchObject({ name: '修改后的设备', price: 400, category: 'digital', purchaseDate: '2020-02-03', status: 'idle', linkedEntryId: 'linked' });
    expect(h.assets.get(b.id)?.name).toBe('同名设备');
    await bridge.deleteAsset(a.id); expect([...h.assets.keys()]).toEqual([b.id]);
  });
  it('写入失败不造内存资产，同请求重试只保存一次；非法金额不落库', async () => {
    const request = `retry-${++sequence}`;
    h.put.mockRejectedValueOnce(new Error('synthetic asset failure'));
    await expect(bridge.saveAsset(assetDraft, undefined, request)).rejects.toThrow('synthetic');
    expect(useAppStore.getState().assets).toEqual([]);
    await bridge.saveAsset(assetDraft, undefined, request); expect(h.assets.size).toBe(1);
    for (const price of [NaN, Infinity, -1]) await expect(bridge.saveAsset({ ...assetDraft, price })).rejects.toThrow('有效');
    await expect(bridge.saveAsset({ ...assetDraft, addOns: [{ name: '配件', amount: -1 }] })).rejects.toThrow('有效');
    await expect(bridge.saveAsset(assetDraft, 'missing')).rejects.toThrow('不存在');
    expect(h.assets.size).toBe(1);
  });
  it('存款只拆分流动资产；已售资产不加净值，负余额保持负号', async () => {
    const a = await bridge.saveAsset(assetDraft); const b = await bridge.saveAsset({ name: '售出', price: 1000 });
    await useAppStore.getState().updateAsset(b.id, { status: 'soldout' });
    useAppStore.setState({ ledgerEntries: [entry('2026-10-01', 500, 'income')], budgets: [{ id: 'sep', period: '2026-09', createdAt: new Date(), monthlyLimit: 100 }] });
    expect(bridge.assets()).toMatchObject({ liquid: 400, deposit: 100, fixed: 311.5, net: 811.5 });
    useAppStore.setState({ ledgerEntries: [entry('2026-10-01', 600)] });
    expect(bridge.assets()).toMatchObject({ liquid: -600, deposit: 0, fixed: 311.5, net: -288.5 });
    expect(a.id).toBeTruthy();
  });
  it('收支、渠道、收入构成与趋势来自流水，对账不算收支', () => {
    useAppStore.setState({ ledgerEntries: [entry('2026-10-01', 12.3), entry('2026-10-02', 7.7, 'expense', { type: 'study', channel: '微信' }), entry('2026-10-03', 100, 'income', { incomeType: 'labor' }), entry('2026-10-04', 50, 'income'), entry('2026-10-05', 999, 'adjust'), entry('2026-09-01', 10)] });
    const st = bridge.stats();
    expect(st).toMatchObject({ ex: 20, inc: 150, labor: 100, other: 50 });
    expect(st.cats.reduce((n, c) => n + c.value, 0)).toBe(20);
    expect(st.channels.map(c => c.name).sort()).toEqual(['微信', '未填']);
    expect(st.trend.slice(-2).map(t => t.value)).toEqual([10, 20]);
    expect(bridge.stats(-1).ex).toBe(10);
  });
  it('自然月与发薪日周期使用不同范围，跨年趋势不加虚构数据', () => {
    useAppStore.setState({ settings: { ...h.settings!, ledgerPayCycleEnabled: true, ledgerResetDay: 10 }, ledgerEntries: [entry('2026-10-09', 9), entry('2026-10-10', 10), entry('2026-09-20', 20)] });
    expect(bridge.stats().ex).toBe(10); expect(bridge.stats(0, 'month').ex).toBe(19); expect(bridge.stats(-1).ex).toBe(29);
    vi.setSystemTime(new Date('2027-01-21T12:00:00'));
    useAppStore.setState({ ledgerEntries: [entry('2026-12-20', 23), entry('2027-01-15', 42)] });
    expect(bridge.stats().trend.slice(-2)).toEqual([{ label: '12月', value: 23 }, { label: '1月', value: 42 }]);
  });
  it('本地结算只对已结束周期发实际奖励，并发和反复打开不重复发放', async () => {
    useAppStore.setState({ budgets: [{ id: 'sep', period: '2026-09', createdAt: new Date(), monthlyLimit: 100, savingsGoal: 50 }], ledgerEntries: [entry('2026-09-20', 10)] });
    const [first, second] = await Promise.all([bridge.settlement('month', -1), bridge.settlement('month', -1)]);
    expect(first).toMatchObject({ bonus: true, challenge: 90 }); expect(second).toMatchObject({ bonus: false, challenge: null });
    expect(h.grant).toHaveBeenCalledTimes(2);
    await bridge.settlement('month', -1); expect(h.grant).toHaveBeenCalledTimes(2);
    const week = await bridge.settlement('week', -1); expect(week.bonus).toBe(false); expect(week.data.totalExpense).toBe(0);
    const current = await bridge.settlement('month'); expect(current).toMatchObject({ bonus: false, challenge: null });
    expect(current.result.reflection).toBeTruthy(); expect(h.grant).toHaveBeenCalledTimes(2);
  });
  it('无实际SP发放时不显示奖励也不烧名额，订阅可释放', async () => {
    h.grant.mockResolvedValue(0); useAppStore.setState({ budgets: [{ id: 'sep', period: '2026-09', createdAt: new Date(), monthlyLimit: 100, savingsGoal: 50 }] });
    expect(await bridge.settlement('month', -1)).toMatchObject({ bonus: false, challenge: null });
    expect(useAppStore.getState().settings.ledgerBudgetBonusMonths).toEqual([]);
    const cb = vi.fn(), off = bridge.subscribe(cb); useAppStore.setState({ assets: [] }); expect(cb).toHaveBeenCalledTimes(1); off(); useAppStore.setState({ assets: [] }); expect(cb).toHaveBeenCalledTimes(1);
  });
});
