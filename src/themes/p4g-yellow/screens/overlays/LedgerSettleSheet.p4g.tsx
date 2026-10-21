/**
 * 心相结算（真实 src/components/ledger/LedgerStats.tsx · settleOpen SheetModal）。
 * 按月/按周 → 周期导航 → 省钱挑战达成 / 本月不超预算 · +10 SP → 支出/收入/结余 → 最贵一笔/花最多的一天/花最少的一天/日均消费
 * → 类目前五 → 伊戈尔正凝视着你的账目…… → 伊戈尔回望 + 伊戈尔的提点。?state=empty | loading
 */
import { useEffect, useState } from 'react';
import type { OverlayProps } from '@yellow/registry/types';
import { P4Sheet, P4SegmentTabs, P4Loading } from '@yellow/kit';
import { cx } from '@yellow/lib/cx';
import { BarRow, MonthNav } from '@yellow/screens/pkg5/ui';
import { CNY, SETTLE_ADVICE, SETTLE_REFLECTION, catMeta, fmtMoney, fmtSigned, ledgerDateLabel } from '@yellow/adapters/pkg5';
import { useLocalLedgerSettlement } from '@/themes/ledgerSettlement';

const Stat = ({ label, main, sub, tone }: { label: string; main: string; sub?: string; tone?: 'up' | 'down' }) => (
  <div className="min-w-0 rounded-sm border-3 border-p4g-line p-2.5" style={{ background: 'var(--p4g-surface-grad)' }}>
    <div className="truncate font-display text-2xs font-bold tracking-wider text-p4g-ink-soft">{label}</div>
    <div className={cx('mt-0.5 truncate p4g-num text-h2', tone === 'up' ? 'text-p4g-danger' : tone === 'down' ? 'text-p4g-success' : 'text-p4g-ink')}>{main}</div>
    {sub && <div className="truncate text-2xs font-bold text-p4g-ink-soft">{sub}</div>}
  </div>
);

export function LedgerSettleSheetView({ open, onClose, state, initialPeriod }: { open: boolean; onClose: () => void; state?: string; initialPeriod?: string }) {
  const [scope, setScope] = useState<'month' | 'week'>('month');
  const [offset, setOffset] = useState(0);
  const live = useLocalLedgerSettlement(open, initialPeriod, scope, offset);
  const liveMode = Boolean(initialPeriod);
  const [mockBusy, setMockBusy] = useState(true);
  useEffect(() => { if (!open || liveMode) return; setMockBusy(true); const t = window.setTimeout(() => setMockBusy(state === 'loading'), 1100); return () => clearTimeout(t); }, [open, scope, offset, state, liveMode]);
  const forcedEmpty = state === 'empty';
  const empty = forcedEmpty || (liveMode ? !live || live.empty : offset < -2);
  const label = live?.data.label ?? (scope === 'month' ? (offset === 0 ? '2026年10月' : `2026年${10 + offset}月`) : offset === 0 ? '10/19 – 10/25' : `${10 + 0}/${19 + offset * 7} – ${10}/${25 + offset * 7}`);
  const exp = live?.data.totalExpense ?? (scope === 'month' ? 4555.5 : 276.5);
  const inc = live?.data.totalIncome ?? (scope === 'month' ? 7300 : 800);
  const cats = live?.data.byCat.map(c => [c.key, c.amount] as const) ?? (scope === 'month' ? [['shopping', 2399], ['home', 1800], ['study', 129], ['food', 138.5], ['fun', 45]] as const : [['study', 129], ['food', 102.5], ['fun', 45]] as const);
  const priciestEntry = live?.data.extremes.priciestEntry;
  const priciestDay = live?.data.extremes.priciestDay;
  const cheapestDay = live?.data.extremes.cheapestDay;
  const expected = live?.data.expectedDailyAvg;
  const reflection = live?.reflection ?? SETTLE_REFLECTION;
  const advice = live?.advice ?? SETTLE_ADVICE;
  const loading = state === 'loading' || (liveMode ? !!live?.loading : mockBusy);
  return (
    <P4Sheet open={open} onClose={onClose} title="心相结算" en="SETTLEMENT · IGOR" size="tall">
      <div className="flex min-w-0 flex-col gap-3 pt-1">
        <P4SegmentTabs value={scope} onChange={(v) => { setScope(v as 'month' | 'week'); setOffset(0); }} items={[{ id: 'month', label: '按月' }, { id: 'week', label: '按周' }]} />
        <MonthNav label={label} onStage={false} onPrev={() => setOffset((o) => o - 1)} onNext={() => setOffset((o) => o + 1)} nextDisabled={liveMode ? !live?.canNext : offset >= 0} />
        {liveMode && live?.readError && <div role="alert" className="rounded-sm border-3 border-p4g-danger bg-p4g-surface-2 px-3 py-2 font-display text-meta font-bold text-p4g-danger">{live.readError}</div>}
        {!empty && offset === 0 && scope === 'month' && (!liveMode || live?.bonus || live?.challenge != null) && (
          <>
            {(liveMode ? live?.challenge != null : true) && <div className="relative overflow-hidden rounded-sm border-3 border-p4g-black bg-p4g-green px-4 py-2.5 text-center font-display text-body font-bold text-p4g-black shadow-hard-sm">🏆 省钱挑战达成！省下 {CNY}{fmtMoney(liveMode ? live?.challenge ?? 0 : 520)} · +10 SP</div>}
            {(liveMode ? live?.bonus : true) && <div className="relative overflow-hidden rounded-sm border-3 border-p4g-black bg-p4g-yellow px-4 py-2.5 text-center font-display text-body font-bold text-p4g-black shadow-hard-sm">
              <span aria-hidden className="absolute inset-y-0 left-0 w-3 p4g-hazard" /><span aria-hidden className="absolute inset-y-0 right-0 w-3 p4g-hazard" />
              🎉 本月不超预算 · +10 SP
            </div>}
          </>
        )}
        <div className="grid grid-cols-3 gap-2 text-center">
          {[['支出', fmtMoney(empty ? 0 : exp), ''], ['收入', fmtMoney(empty ? 0 : inc), 'text-p4g-success'], ['结余', fmtSigned(empty ? 0 : inc - exp).replace(CNY, ''), '']].map(([l, v, c]) => (
            <div key={l} className="min-w-0 rounded-sm bg-p4g-black px-1 py-2 night:border-thin night:border-p4g-yellow">
              <div className="font-display text-2xs font-bold text-p4g-yellow">{l}</div>
              <div className={cx('truncate p4g-num text-lead text-white', c)}>{CNY}{v}</div>
            </div>
          ))}
        </div>
        {empty ? (
          <div className="py-8 text-center font-display text-body font-bold text-p4g-ink-soft">这段时间还没有记录。</div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Stat label="最贵一笔" main={priciestEntry ? `${CNY}${fmtMoney(priciestEntry.amount)}` : liveMode ? '暂无' : `${CNY}2,399`} sub={priciestEntry?.note ?? (liveMode ? undefined : '降噪耳机')} />
              <Stat label="花最多的一天" main={priciestDay ? `${CNY}${fmtMoney(priciestDay.amount)}` : liveMode ? '暂无' : `${CNY}2,399`} sub={priciestDay ? ledgerDateLabel(priciestDay.date) : liveMode ? undefined : '10月15日'} tone="up" />
              <Stat label="花最少的一天" main={cheapestDay ? `${CNY}${fmtMoney(cheapestDay.amount)}` : liveMode ? '暂无' : `${CNY}6`} sub={cheapestDay ? ledgerDateLabel(cheapestDay.date) : liveMode ? undefined : '10月20日'} tone="down" />
              <Stat label="日均消费" main={`${CNY}${fmtMoney(live?.data.actualDailyAvg ?? (scope === 'month' ? 227.8 : 39.5))}`} sub={scope === 'month' ? (expected != null ? `预期 ${CNY}${fmtMoney(expected)} · 共 ${live?.data.days ?? 20} 天` : '未设预算') : `共 ${live?.data.days ?? 7} 天`} tone={scope === 'month' && expected != null && (live?.data.actualDailyAvg ?? 0) > expected ? 'up' : undefined} />
            </div>
            <div className="flex flex-col gap-2">
              {cats.map(([k, a]) => <BarRow key={k} label={catMeta(k).label} amount={a} max={cats[0][1]} color={catMeta(k).color} right={`${CNY}${fmtMoney(a)}`} />)}
            </div>
            {loading ? (
              <div className="flex flex-col items-center gap-2 py-6">
                <P4Loading size="sm" label="伊戈尔正凝视着你的账目……" className="[&_div]:text-p4g-ink" />
              </div>
            ) : (
              <>
                <div className="relative mt-1 rounded-sm border-3 border-p4g-black bg-[color:var(--p4g-msg)] px-4 pb-3 pt-6 text-body leading-loose text-[color:var(--p4g-msg-ink)] shadow-plate night:border-p4g-yellow">
                  <span className="absolute left-3 top-0 rounded-b-sm bg-p4g-yellow px-3 py-0.5 font-display text-meta font-bold text-p4g-black">伊戈尔</span>
                  {reflection.split('**').map((s, i) => (i % 2 ? <b key={i} className="text-p4g-yellow">{s}</b> : <span key={i}>{s}</span>))}
                </div>
                <div className="rounded-sm border-3 border-p4g-line bg-p4g-surface-2 p-3">
                  <div className="mb-1.5 font-display text-meta font-bold text-p4g-ink">伊戈尔的提点</div>
                  {advice.map((a, i) => (
                    <div key={i} className="flex gap-2 py-0.5 text-meta text-p4g-ink"><span className="shrink-0 text-p4g-orange">✦</span><span className="min-w-0">{a}</span></div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </P4Sheet>
  );
}

export default function LedgerSettleSheet({ open, onClose, params }: OverlayProps) {
  return <LedgerSettleSheetView open={open} onClose={onClose} state={params?.get('state') ?? undefined} />;
}
