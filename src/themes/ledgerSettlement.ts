import { useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore, toLocalDateKey } from '@/store';
import { buildSettlementData, offlineSettlement, settleRange, shiftSettleAnchor, type SettleScope } from '@/utils/ledgerSettlement';

const calendar = { payCycle: false, resetDay: 1 };
let rewardQueue: Promise<unknown> = Promise.resolve();
const claimsInFlight = new Map<string, Promise<{ bonus: boolean; challenge: number | null }>>();

/** 三主题统计页按自然月展示；结算沿用相同口径，收费生成不在此入口调用。 */
export function localLedgerSettlement(scope: SettleScope, period: string, offset = 0) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period) || !Number.isInteger(offset)) throw new Error('结算月份无效');
  const s = useAppStore.getState(), today = toLocalDateKey();
  const base = period === today.slice(0, 7) ? today : settleRange('month', period + '-01')[1];
  const anchor = shiftSettleAnchor(scope, base, offset, calendar);
  const [, end] = settleRange(scope, anchor, calendar);
  const budget = s.getBudget(end.slice(0, 7))?.monthlyLimit;
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
    // 既有领奖action按设置的周期计算；发薪日周期启用时不把自然月结算误当周期领奖。
    if (snapshot.data.scope !== 'month' || snapshot.data.rangeEnd >= toLocalDateKey() || useAppStore.getState().settings.ledgerPayCycleEnabled) return { bonus: false, challenge: null };
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
  if (!snapshot) return null;
  const currentClaim = claim.key === snapshot.key ? claim : { bonus: false, challenge: null, error: undefined };
  const reflection = `本地账目回顾（未调用 AI）\n\n${snapshot.result.reflection.replace(/\*\*/g, '')}${currentClaim.error ? '\n\n' + currentClaim.error : ''}`;
  return { ...snapshot, ...currentClaim, reflection, advice: snapshot.result.advice, loading: !loaded, readError };
}
