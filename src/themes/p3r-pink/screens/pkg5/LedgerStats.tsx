/**
 * LedgerStats（真实 src/components/ledger/LedgerStats.tsx）粉白 P3R 版：
 * 月份导航 → 本月收支（支出 / 收入 / 结余）+「让伊戈尔结算（周 / 月）」（原 🔮，粉版禁蓝 → 单色水晶字形）
 * → 本月预算（已花 / 超 / 剩 + 省钱挑战 · 想省）→ 支出类目环 → 环比上月 → 月度支出趋势 → 支付渠道 → 收入构成（劳动所得 / 其它收入）；
 * 空「这个月还没有记录。」。统计口径改写自黄色版（只读参考）。
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { P3Button, P3R, slantClip } from '@pink/kit';
import { P3Stagger, P3StaggerItem } from '@pink/fx';
import { useBoldness } from '@pink/lib/prefs';
import { BarRow, GlassSlab, MiniHead, MonthNav, Ring, TrophyGlyph } from './ui';
import { LedgerSettleSheetView } from '@pink/screens/overlays/LedgerSettleSheet.p3r';
import { CNY, catMeta, fmtMoney, fmtSigned, monthLabel, shiftMonth, useLedgerData, ledgerOps } from '@pink/adapters/pkg5';
import type { LedgerEntry, LedgerExpenseType } from '@/types';

export const OrbGlyph = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden fill="currentColor" className="shrink-0"><circle cx="12" cy="10" r="7.5" opacity="0.9" /><path d="M5 20h14l-2-3H7z" /><path d="M9 7.5a3.5 3.5 0 0 1 3-2" stroke="var(--p3r-panel)" strokeWidth="1.6" fill="none" /></svg>
);

export function LedgerStats({ entries, forceEmpty, initialPeriod }: { entries: LedgerEntry[]; forceEmpty?: boolean; initialPeriod?: string }) {
  const { CURRENT_MONTH } = useLedgerData();
  const anim = useBoldness();
  const [period, setPeriod] = useState(initialPeriod ?? CURRENT_MONTH);
  const [settle, setSettle] = useState(false);
  const inP = entries.filter((e) => e.date.startsWith(period) && !forceEmpty);
  const exp = inP.filter((e) => e.direction === 'expense');
  const inc = inP.filter((e) => e.direction === 'income');
  const totalExpense = exp.reduce((s, e) => s + e.amount, 0);
  const totalIncome = inc.reduce((s, e) => s + e.amount, 0);
  const prevExpense = entries.filter((e) => e.direction === 'expense' && e.date.startsWith(shiftMonth(period, -1))).reduce((s, e) => s + e.amount, 0);
  const byCat = Object.entries(exp.reduce<Record<string, number>>((m, e) => { m[e.type ?? 'other'] = (m[e.type ?? 'other'] ?? 0) + e.amount; return m; }, {})).sort((a, b) => b[1] - a[1]) as [LedgerExpenseType, number][];
  const byCh = Object.entries(exp.reduce<Record<string, number>>((m, e) => { const k = e.channel ?? '未填'; m[k] = (m[k] ?? 0) + e.amount; return m; }, {})).sort((a, b) => b[1] - a[1]);
  const labor = inc.filter((e) => e.incomeType === 'labor').reduce((s, e) => s + e.amount, 0);
  const selectedBudget = ledgerOps.budgetFor(period);
  const budget = selectedBudget?.monthlyLimit ?? 0;
  const over = totalExpense > budget;
  const progress = budget ? totalExpense / budget : 0;
  const momPct = prevExpense > 0 ? ((totalExpense - prevExpense) / prevExpense) * 100 : null;
  const trend = [-5, -4, -3, -2, -1, 0].map((d) => { const m = shiftMonth(period, d); const v = entries.filter(e => e.direction === 'expense' && e.date.startsWith(m)).reduce((sum, e) => sum + e.amount, 0); return { m, v }; });
  const maxTrend = Math.max(1, ...trend.map((t) => t.v));
  const hasAny = totalExpense > 0 || totalIncome > 0;
  return (
    <P3Stagger className="flex min-w-0 flex-col gap-4">
      <P3StaggerItem><MonthNav label={monthLabel(period)} onPrev={() => setPeriod((p) => shiftMonth(p, -1))} onNext={() => setPeriod((p) => shiftMonth(p, 1))} nextDisabled={period >= CURRENT_MONTH} /></P3StaggerItem>
      <P3StaggerItem>
        <GlassSlab cut={16}>
          <div className="px-6 py-4">
            <MiniHead title="本月收支" en="BALANCE" className="mb-3" />
            <div className="grid grid-cols-3 gap-2">
              {([['支出', totalExpense, P3R.ink, 'var(--p3r-on-ink)'], ['收入', totalIncome, 'var(--p3r-mint)', 'var(--p3r-mulberry)'], ['结余', totalIncome - totalExpense, P3R.blue, P3R.onBlue]] as const).map(([l, v, bg, fg]) => (
                <div key={l} className="min-w-0 px-2 py-2 text-center" style={{ background: bg, color: fg, clipPath: slantClip(8) }}>
                  <div className="text-[11px] font-black opacity-85">{l}</div>
                  <div className="truncate font-cond text-[clamp(16px,4.6vw,21px)] leading-tight">{l === '结余' ? fmtSigned(v) : `${CNY}${fmtMoney(v)}`}</div>
                </div>
              ))}
            </div>
            <P3Button tone="ink" block corner className="mt-3" leading={<OrbGlyph />} onClick={() => setSettle(true)}>让伊戈尔结算（周 / 月）</P3Button>
          </div>
        </GlassSlab>
      </P3StaggerItem>
      {!hasAny && <P3StaggerItem><div className="py-8 text-center text-[15px] font-black" style={{ color: P3R.grey }}>这个月还没有记录。</div></P3StaggerItem>}
      {budget > 0 && hasAny && (
        <P3StaggerItem>
          <GlassSlab cut={16}>
            <div className="px-6 py-4">
              <MiniHead title="本月预算" en="BUDGET" className="mb-2" />
              <div className="mb-2 flex min-w-0 items-baseline justify-between gap-2 text-[13px] font-black" style={{ color: P3R.ink }}>
                <span className="min-w-0 truncate">已花 <b className="font-cond text-[16px]">{CNY}{fmtMoney(totalExpense)}</b> / {CNY}{fmtMoney(budget)}</span>
                <span className="shrink-0 px-2 py-0.5 font-cond text-[14px]" style={{ clipPath: slantClip(5), background: over ? P3R.magenta : P3R.cyan, color: over ? '#fff' : 'var(--p3r-mulberry)' }}>{over ? `超 ${CNY}${fmtMoney(totalExpense - budget)}` : `剩 ${CNY}${fmtMoney(budget - totalExpense)}`}</span>
              </div>
              <div className="relative h-[11px] w-full overflow-hidden" style={{ background: 'var(--p3r-track)', clipPath: slantClip(3) }}>
                <motion.div className="absolute inset-y-0 left-0 w-full origin-left" style={{ background: over ? P3R.magenta : `linear-gradient(90deg, ${P3R.blue}, ${P3R.cyan})` }} initial={anim ? { scaleX: 0 } : false} animate={{ scaleX: Math.min(1, progress) }} transition={{ type: 'spring', stiffness: 110, damping: 20 }} />
              </div>
              {(selectedBudget?.savingsGoal ?? 0) > 0 && (
                <div className="mt-3 flex items-baseline justify-between border-t-2 border-dotted pt-2 text-[13px] font-black" style={{ borderColor: 'rgb(var(--p3r-cyan-rgb) / 0.6)', color: P3R.ink }}>
                  <span><TrophyGlyph /> 省钱挑战 · 想省</span><span className="font-cond text-[16px]" style={{ color: P3R.roseInk }}>{CNY}{fmtMoney((selectedBudget?.savingsGoal ?? 0))}</span>
                </div>
              )}
            </div>
          </GlassSlab>
        </P3StaggerItem>
      )}
      {byCat.length > 0 && (
        <P3StaggerItem>
          <GlassSlab cut={16}>
            <div className="px-6 py-4">
              <MiniHead title="支出类目" en="CATEGORY" className="mb-3" />
              <div className="flex min-w-0 flex-col items-center gap-4 sm:flex-row">
                <Ring size={150} stroke={20} total={totalExpense} segments={byCat.map(([k, v]) => ({ value: v, color: catMeta(k).color }))}>
                  <div className="text-center"><div className="text-[11px] font-black" style={{ color: P3R.grey }}>支出</div><div className="font-cond text-[20px]" style={{ color: P3R.ink }}>{CNY}{fmtMoney(totalExpense)}</div></div>
                </Ring>
                <div className="flex w-full min-w-0 flex-1 flex-col gap-1.5">
                  {byCat.map(([k, v]) => (
                    <div key={k} className="flex min-w-0 items-center gap-2 text-[13px] font-black" style={{ color: P3R.ink }}>
                      <span className="h-3 w-3.5 shrink-0" style={{ background: catMeta(k).color, clipPath: slantClip(3) }} />
                      <span className="min-w-0 flex-1 truncate">{catMeta(k).label}</span>
                      <span className="shrink-0 font-cond text-[15px]">{CNY}{fmtMoney(v)}</span>
                      <span className="w-10 shrink-0 text-right font-cond text-[14px]" style={{ color: P3R.grey }}>{Math.round((v / totalExpense) * 100)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </GlassSlab>
        </P3StaggerItem>
      )}
      {hasAny && (
        <P3StaggerItem>
          <GlassSlab cut={16}>
            <div className="px-6 py-4">
              <MiniHead title="环比上月" en="MOM" className="mb-2" />
              <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-[13px] font-black" style={{ color: P3R.grey }}>本月支出</span>
                <span className="font-cond text-[28px] leading-none" style={{ color: P3R.blue }}>{CNY}{fmtMoney(totalExpense)}</span>
                {momPct != null && <span className="px-2 py-0.5 font-cond text-[14px]" style={{ clipPath: slantClip(5), background: momPct > 0 ? P3R.magenta : P3R.cyan, color: momPct > 0 ? '#fff' : 'var(--p3r-mulberry)' }}>{momPct > 0 ? '▲' : '▼'} {Math.abs(momPct).toFixed(0)}%</span>}
                <span className="ml-auto text-[12px] font-bold" style={{ color: P3R.grey }}>上月 {CNY}{fmtMoney(prevExpense)}</span>
              </div>
            </div>
          </GlassSlab>
        </P3StaggerItem>
      )}
      {hasAny && (
        <P3StaggerItem>
          <GlassSlab cut={16}>
            <div className="px-6 py-4">
              <MiniHead title="月度支出趋势" en="TREND" className="mb-2" />
              <div className="flex h-32 min-w-0 items-end gap-2">
                {trend.map((t, i) => {
                  const cur = t.m === period;
                  return (
                    <div key={t.m} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                      <span className="max-w-full truncate font-cond text-[11px]" style={{ color: P3R.grey }}>{t.v ? fmtMoney(Math.round(t.v)) : ''}</span>
                      <div className="relative h-20 w-full">
                        <motion.div className="absolute inset-x-1 bottom-0 h-full origin-bottom" style={{ background: cur ? P3R.blue : 'rgb(var(--p3r-cyan-rgb) / 0.75)', clipPath: 'polygon(0 6px, 100% 0, 100% 100%, 0 100%)' }}
                          initial={anim ? { scaleY: 0 } : false} animate={{ scaleY: Math.max(0.03, t.v / maxTrend) }} transition={{ duration: 0.5, delay: 0.05 * i }} />
                      </div>
                      <span className="px-1 text-[11px] font-black" style={cur ? { background: P3R.ink, color: 'var(--p3r-on-ink)', clipPath: slantClip(3) } : { color: P3R.grey }}>{Number(t.m.slice(5))}月</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </GlassSlab>
        </P3StaggerItem>
      )}
      {byCh.length > 0 && (
        <P3StaggerItem>
          <GlassSlab cut={16}>
            <div className="px-6 py-4">
              <MiniHead title="支付渠道" en="CHANNEL" className="mb-3" />
              <div className="flex flex-col gap-2">{byCh.map(([k, v]) => <BarRow key={k} label={k} amount={v} max={byCh[0][1]} color={P3R.cyan} right={`${CNY}${fmtMoney(v)}`} />)}</div>
            </div>
          </GlassSlab>
        </P3StaggerItem>
      )}
      {totalIncome > 0 && (
        <P3StaggerItem>
          <GlassSlab cut={16}>
            <div className="px-6 py-4">
              <MiniHead title="收入构成" en="INCOME" className="mb-3" />
              <div className="flex flex-col gap-2">
                <BarRow label="劳动所得" amount={labor} max={totalIncome} color="var(--p3r-mint)" right={`${CNY}${fmtMoney(labor)}`} />
                <BarRow label="其它收入" amount={totalIncome - labor} max={totalIncome} color={P3R.blueDeep} right={`${CNY}${fmtMoney(totalIncome - labor)}`} />
              </div>
            </div>
          </GlassSlab>
        </P3StaggerItem>
      )}
      <LedgerSettleSheetView open={settle} onClose={() => setSettle(false)} state={hasAny ? undefined : 'empty'} initialPeriod={period} />
    </P3Stagger>
  );
}
