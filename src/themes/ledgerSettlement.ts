import { useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore, toLocalDateKey } from '@/store';
import { buildSettlementData, generateSettlement, offlineSettlement, settleRange, shiftSettleAnchor, type SettleScope, type SettlementResult } from '@/utils/ledgerSettlement';
import { ledgerCycle } from '@/utils/ledgerFormat';
import { getAIConfig } from '@/utils/aiClient';

let rewardQueue: Promise<unknown> = Promise.resolve();
const claimsInFlight = new Map<string, Promise<{ bonus: boolean; challenge: number | null }>>();

/** 四主题共用本地结算；读取真实预算周期，收费生成不在此入口调用。 */
export function localLedgerSettlement(scope: SettleScope, period: string, offset = 0) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period) || !Number.isInteger(offset)) throw new Error('结算月份无效');
  const s = useAppStore.getState(), today = toLocalDateKey();
  const calendar = {
    payCycle: s.settings.ledgerPayCycleEnabled === true,
    resetDay: s.settings.ledgerResetDay ?? 1,
  };
  const currentKey = ledgerCycle(calendar.payCycle, calendar.resetDay, today).key;
  const base = period === currentKey
    ? today
    : calendar.payCycle
      ? `${period}-${String(calendar.resetDay).padStart(2, '0')}`
      : settleRange('month', period + '-01', calendar)[1];
  const anchor = shiftSettleAnchor(scope, base, offset, calendar);
  const [, end] = settleRange(scope, anchor, calendar);
  const budgetPeriod = ledgerCycle(calendar.payCycle, calendar.resetDay, end).key;
  const budget = s.getBudget(budgetPeriod)?.monthlyLimit;
  const data = buildSettlementData(s.ledgerLoaded ? s.ledgerEntries : [], scope, anchor, budget, s.settings.currency, calendar);
  return {
    data, result: offlineSettlement(data), key: `${scope}:${data.rangeStart}:${data.rangeEnd}`,
    empty: data.totalExpense === 0 && data.totalIncome === 0,
    canNext: data.rangeStart < settleRange(scope, today, calendar)[0],
  };
}

export function claimLocalSettlement(snapshot: ReturnType<typeof localLedgerSettlement>) {
  const existing = claimsInFlight.get(snapshot.key);
  if (existing) return existing;
  const operation = rewardQueue.then(async () => {
    // 既有领奖 action 与本页共用真实周期；仅完整结束的月/周期可以领取。
    if (snapshot.data.scope !== 'month' || snapshot.data.rangeEnd >= toLocalDateKey()) return { bonus: false, challenge: null };
    const period = snapshot.data.rangeStart.slice(0, 7);
    const bonus = await useAppStore.getState().claimLedgerBudgetBonus(period);
    const challenge = await useAppStore.getState().claimLedgerChallengeBonus(period);
    return { bonus, challenge };
  });
  rewardQueue = operation.catch(() => {});
  // StrictMode 会挂载→清理→再挂载 effect；共享同一个在途 Promise，避免第一次真的领奖、
  // 第二次却拿到“已领取 false”而丢掉横幅。结算完成后移除，之后打开会重新核对权威状态。
  const shared = operation.finally(() => claimsInFlight.delete(snapshot.key));
  claimsInFlight.set(snapshot.key, shared);
  return shared;
}

export function useLocalLedgerSettlement(open: boolean, period: string | undefined, scope: SettleScope, offset: number) {
  const { entries, budgets, settings, loaded } = useAppStore(useShallow(s => ({ entries: s.ledgerEntries, budgets: s.budgets, settings: s.settings, loaded: s.ledgerLoaded })));
  const [readError, setReadError] = useState('');
  const [aiResult, setAiResult] = useState<SettlementResult | null>(null);
  const snapshot = useMemo(() => period ? localLedgerSettlement(scope, period, offset) : null, [period, scope, offset, entries, budgets, settings, loaded]);
  const [claim, setClaim] = useState<{ key: string; bonus: boolean; challenge: number | null; error?: string }>({ key: '', bonus: false, challenge: null });
  useEffect(() => {
    if (!open || !period) return;
    let cancelled = false; setReadError('');
    if (!loaded) void useAppStore.getState().loadLedger().catch(() => { if (!cancelled) setReadError('本地账本读取失败，请关闭后重试。'); });
    return () => { cancelled = true; };
  }, [open, period, loaded]);
  const key = snapshot?.key;
  useEffect(() => {
    if (!open || !snapshot || !loaded) return;
    let cancelled = false;
    void claimLocalSettlement(snapshot).then(outcome => { if (!cancelled) setClaim({ key: snapshot.key, ...outcome }); }, () => {
      if (!cancelled) setClaim({ key: snapshot.key, bonus: false, challenge: null, error: '账目已整理，奖励状态未能确认。' });
    });
    return () => { cancelled = true; };
    // 领奖状态写回settings不重复触发；异步旧范围的结果不覆盖新范围。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, key, loaded]);
  useEffect(() => {
    if (!open || !snapshot || !loaded || !getAIConfig(settings)) {
      setAiResult(null);
      return;
    }
    const ac = new AbortController();
    let cancelled = false;
    setAiResult(null);
    void generateSettlement(snapshot.data, settings, ac.signal).then((result) => {
      if (!cancelled) setAiResult(result);
    });
    return () => {
      cancelled = true;
      ac.abort();
    };
    // snapshot.key 已覆盖本期范围；settings 变化需要按新配置重算。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, loaded, snapshot?.key, settings]);
  if (!snapshot) return null;
  const currentClaim = claim.key === snapshot.key ? claim : { bonus: false, challenge: null, error: undefined };
  const result = aiResult ?? snapshot.result;
  const reflection = `${aiResult ? '伊戈尔回望' : '本地账目回顾（未调用 AI）'}\n\n${result.reflection.replace(/\*\*/g, '')}${currentClaim.error ? '\n\n' + currentClaim.error : ''}`;
  return { ...snapshot, ...currentClaim, result, reflection, advice: result.advice, loading: !loaded, readError, aiUsed: !!aiResult };
}
