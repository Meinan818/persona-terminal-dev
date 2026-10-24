/**
 * LedgerStats（真实 src/components/ledger/LedgerStats.tsx）P4G 版：
 * 月份导航 → 本月收支（支出/收入/结余）+「🔮 让伊戈尔结算（周 / 月）」→ 本月预算（已花/超/剩 + 🏆 省钱挑战 · 想省）
 * → 支出类目环 → 环比上月 → 月度支出趋势 → 支付渠道 → 收入构成（劳动所得/其它收入）；空「这个月还没有记录。」
 */
import { useState } from 'react';
import { P4Card, P4Button, P4Progress } from '@yellow/kit';
import { CollageStagger, CollageItem } from '@yellow/fx';
import { cx } from '@yellow/lib/cx';
import { BarRow, CardHead, MonthNav, Ring } from './ui';
import { LedgerSettleSheetView } from '@yellow/screens/overlays/LedgerSettleSheet.p4g';
import { CNY, catMeta, fmtMoney, fmtSigned, monthLabel, shiftMonth } from '@yellow/mock/pkg5';
import { useAppStore, toLocalDateKey } from '@/store';
import { cycleRangeForKey, ledgerCycle } from '@/utils/ledgerFormat';
import type { LedgerEntry, LedgerExpenseType } from '@real/types';

export function LedgerStats({ entries, forceEmpty }: { entries: LedgerEntry[]; forceEmpty?: boolean }) {
  const settings = useAppStore((s) => s.settings);
  const getBudget = useAppStore((s) => s.getBudget);
  const payCycle = settings.ledgerPayCycleEnabled === true;
  const resetDay = settings.ledgerResetDay ?? 1;
  const today = toLocalDateKey();
  const currentMonth = ledgerCycle(payCycle, resetDay, today).key;
  const rangeOf = (key: string) => cycleRangeForKey(payCycle, resetDay, key);
  const rangeLabel = (key: string) => {
    if (!payCycle) return monthLabel(key);
    const [start, end] = rangeOf(key);
    return `${Number(start.slice(5, 7))}/${Number(start.slice(8, 10))} – ${Number(end.slice(5, 7))}/${Number(end.slice(8, 10))}`;
  };
  const [period, setPeriod] = useState(currentMonth);
  const [periodStart, periodEnd] = rangeOf(period);
  const [prevStart, prevEnd] = rangeOf(shiftMonth(period, -1));
  const [settle, setSettle] = useState(false);
  const inP = forceEmpty ? [] : entries.filter((e) => e.date >= periodStart && e.date <= periodEnd);
  const exp = inP.filter((e) => e.direction === 'expense');
  const inc = inP.filter((e) => e.direction === 'income');
  const totalExpense = exp.reduce((s, e) => s + e.amount, 0);
  const totalIncome = inc.reduce((s, e) => s + e.amount, 0);
  const prevExpense = entries.filter((e) => e.direction === 'expense' && e.date >= prevStart && e.date <= prevEnd).reduce((s, e) => s + e.amount, 0);
  const byCat = Object.entries(exp.reduce<Record<string, number>>((m, e) => { m[e.type ?? 'other'] = (m[e.type ?? 'other'] ?? 0) + e.amount; return m; }, {})).sort((a, b) => b[1] - a[1]) as [LedgerExpenseType, number][];
  const byCh = Object.entries(exp.reduce<Record<string, number>>((m, e) => { const k = e.channel ?? '未填'; m[k] = (m[k] ?? 0) + e.amount; return m; }, {})).sort((a, b) => b[1] - a[1]);
  const labor = inc.filter((e) => e.incomeType === 'labor').reduce((s, e) => s + e.amount, 0);
  const selectedBudget = getBudget(period);
  const budget = selectedBudget?.monthlyLimit ?? 0;
  const savingsGoal = selectedBudget?.savingsGoal ?? 0;
  const over = totalExpense > budget;
  const progress = budget ? totalExpense / budget : 0;
  const momPct = prevExpense > 0 ? ((totalExpense - prevExpense) / prevExpense) * 100 : null;
  // 趋势取真实月度汇总；没有记录的月份就是 0（原来用写死的 1820/2410/2960/2205）。
  const trend = [-5, -4, -3, -2, -1, 0].map((d) => {
    const m = shiftMonth(period, d);
    const [start, end] = rangeOf(m);
    const v = entries.filter((e) => e.direction === 'expense' && e.date >= start && e.date <= end).reduce((sum, e) => sum + e.amount, 0);
    return { m, v };
  });
  const maxTrend = Math.max(1, ...trend.map((t) => t.v));
  const hasAny = totalExpense > 0 || totalIncome > 0;

  return (
    <CollageStagger className="flex min-w-0 flex-col gap-4">
      <CollageItem><MonthNav label={rangeLabel(period)} onPrev={() => setPeriod((p) => shiftMonth(p, -1))} onNext={() => setPeriod((p) => shiftMonth(p, 1))} nextDisabled={period >= currentMonth} /></CollageItem>
      <CollageItem>
        <P4Card tone="paper" cut="br">
          <CardHead en="BALANCE">本月收支</CardHead>
          <div className="grid grid-cols-3 gap-2">
            {[['支出', totalExpense, 'bg-p4g-black text-p4g-yellow'], ['收入', totalIncome, 'bg-p4g-green text-p4g-black'], ['结余', totalIncome - totalExpense, 'bg-p4g-orange text-p4g-black']].map(([l, v, c]) => (
              <div key={l as string} className={cx('min-w-0 rounded-sm border-thin border-p4g-black px-2 py-2 text-center night:border-p4g-yellow', c as string)}>
                <div className="font-display text-2xs font-bold">{l}</div>
                <div className="truncate p4g-num text-[clamp(15px,4.4vw,20px)]">{l === '结余' ? fmtSigned(v as number) : `${CNY}${fmtMoney(v as number)}`}</div>
              </div>
            ))}
          </div>
          <P4Button variant="black" block className="mt-3" onClick={() => setSettle(true)}>🔮 让伊戈尔结算（周 / 月）</P4Button>
        </P4Card>
      </CollageItem>
      {!hasAny && <div className="py-8 text-center font-display text-body font-bold text-[color:var(--p4g-on-stage)]">这个月还没有记录。</div>}
      {budget > 0 && hasAny && (
        <CollageItem>
          <P4Card tone="surface">
            <CardHead en="BUDGET">本月预算</CardHead>
            <div className="mb-2 flex min-w-0 items-baseline justify-between gap-2 text-meta font-bold text-p4g-ink">
              <span className="min-w-0 truncate">已花 <b className="p4g-num">{CNY}{fmtMoney(totalExpense)}</b> / {CNY}{fmtMoney(budget)}</span>
              <span className={cx('shrink-0 rounded-xs px-1.5 py-0.5 p4g-num', over ? 'bg-p4g-danger text-[color:var(--p4g-danger-ink)]' : 'bg-p4g-green text-p4g-black')}>{over ? `超 ${CNY}${fmtMoney(totalExpense - budget)}` : `剩 ${CNY}${fmtMoney(budget - totalExpense)}`}</span>
            </div>
            <P4Progress value={Math.min(1, progress) * 100} max={100} variant={over ? 'hp' : 'bar'} />
            {savingsGoal > 0 && (
              <div className="mt-3 flex items-baseline justify-between border-t-2 border-dashed pt-2 text-meta font-bold text-p4g-ink" style={{ borderColor: 'var(--p4g-line-soft)' }}>
                <span>🏆 省钱挑战 · 想省</span><span className="p4g-num text-p4g-success">{CNY}{fmtMoney(savingsGoal)}</span>
              </div>
            )}
          </P4Card>
        </CollageItem>
      )}
      {byCat.length > 0 && (
        <CollageItem>
          <P4Card tone="paper">
            <CardHead en="CATEGORY">支出类目</CardHead>
            <div className="flex min-w-0 flex-col items-center gap-4 sm:flex-row">
              <Ring size={150} stroke={20} total={totalExpense} segments={byCat.map(([k, v]) => ({ value: v, color: catMeta(k).color }))}>
                <div className="text-center"><div className="font-display text-2xs font-bold text-p4g-ink-soft">支出</div><div className="p4g-num text-h3 text-p4g-ink">{CNY}{fmtMoney(totalExpense)}</div></div>
              </Ring>
              <div className="flex w-full min-w-0 flex-1 flex-col gap-1.5">
                {byCat.map(([k, v]) => (
                  <div key={k} className="flex min-w-0 items-center gap-2 text-meta font-bold text-p4g-ink">
                    <span className="h-3 w-3 shrink-0 rounded-xs border-thin border-p4g-black" style={{ background: catMeta(k).color }} />
                    <span className="min-w-0 flex-1 truncate">{catMeta(k).icon} {catMeta(k).label}</span>
                    <span className="shrink-0 p4g-num">{CNY}{fmtMoney(v)}</span>
                    <span className="w-10 shrink-0 text-right p4g-num text-p4g-ink-soft">{Math.round((v / totalExpense) * 100)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </P4Card>
        </CollageItem>
      )}
      {hasAny && (
        <CollageItem>
          <P4Card tone="surface">
            <CardHead en="MOM">环比上月</CardHead>
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-display text-meta font-bold text-p4g-ink-soft">本月支出</span>
              <span className="p4g-num text-h2 text-p4g-ink">{CNY}{fmtMoney(totalExpense)}</span>
              {momPct != null && <span className={cx('rounded-xs px-1.5 py-0.5 p4g-num text-meta', momPct > 0 ? 'bg-p4g-danger text-[color:var(--p4g-danger-ink)]' : 'bg-p4g-green text-p4g-black')}>{momPct > 0 ? '▲' : '▼'} {Math.abs(momPct).toFixed(0)}%</span>}
              <span className="ml-auto text-meta font-bold text-p4g-ink-soft">上月 {CNY}{fmtMoney(prevExpense)}</span>
            </div>
          </P4Card>
        </CollageItem>
      )}
      {hasAny && (
        <CollageItem>
          <P4Card tone="paper">
            <CardHead en="TREND">月度支出趋势</CardHead>
            <div className="flex h-32 min-w-0 items-end gap-2">
              {trend.map((t) => {
                const cur = t.m === period;
                return (
                  <div key={t.m} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                    <span className="truncate p4g-num text-2xs text-p4g-ink-soft">{t.v ? fmtMoney(Math.round(t.v)) : ''}</span>
                    <div className="relative h-20 w-full">
                      <div className={cx('absolute inset-x-1 bottom-0 origin-bottom rounded-t-xs border-thin border-p4g-black', cur ? 'bg-p4g-orange' : 'bg-p4g-yellow')} style={{ height: '100%', transform: `scaleY(${Math.max(0.03, t.v / maxTrend)})` }} />
                    </div>
                    <span className={cx('font-display text-2xs font-bold', cur ? 'rounded-xs bg-p4g-black px-1 text-p4g-yellow night:bg-p4g-yellow night:text-p4g-black' : 'text-p4g-ink-soft')}>{Number(t.m.slice(5))}月</span>
                  </div>
                );
              })}
            </div>
          </P4Card>
        </CollageItem>
      )}
      {byCh.length > 0 && (
        <CollageItem>
          <P4Card tone="surface">
            <CardHead en="CHANNEL">支付渠道</CardHead>
            <div className="flex flex-col gap-2">{byCh.map(([k, v]) => <BarRow key={k} label={k} amount={v} max={byCh[0][1]} color="var(--p4g-cyan)" right={`${CNY}${fmtMoney(v)}`} />)}</div>
          </P4Card>
        </CollageItem>
      )}
      {totalIncome > 0 && (
        <CollageItem>
          <P4Card tone="paper">
            <CardHead en="INCOME">收入构成</CardHead>
            <div className="flex flex-col gap-2">
              <BarRow label="劳动所得" amount={labor} max={totalIncome} color="var(--p4g-green)" right={`${CNY}${fmtMoney(labor)}`} />
              <BarRow label="其它收入" amount={totalIncome - labor} max={totalIncome} color="var(--p4g-purple)" right={`${CNY}${fmtMoney(totalIncome - labor)}`} />
            </div>
          </P4Card>
        </CollageItem>
      )}
      <LedgerSettleSheetView open={settle} onClose={() => setSettle(false)} state={hasAny ? undefined : 'empty'} />
    </CollageStagger>
  );
}
