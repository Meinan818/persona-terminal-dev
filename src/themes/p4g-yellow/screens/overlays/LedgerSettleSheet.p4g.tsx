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
import { CNY, SETTLE_ADVICE, SETTLE_REFLECTION, catMeta, fmtMoney, fmtSigned } from '@yellow/mock/pkg5';

const Stat = ({ label, main, sub, tone }: { label: string; main: string; sub?: string; tone?: 'up' | 'down' }) => (
  <div className="min-w-0 rounded-sm border-3 border-p4g-line p-2.5" style={{ background: 'var(--p4g-surface-grad)' }}>
    <div className="truncate font-display text-2xs font-bold tracking-wider text-p4g-ink-soft">{label}</div>
    <div className={cx('mt-0.5 truncate p4g-num text-h2', tone === 'up' ? 'text-p4g-danger' : tone === 'down' ? 'text-p4g-success' : 'text-p4g-ink')}>{main}</div>
    {sub && <div className="truncate text-2xs font-bold text-p4g-ink-soft">{sub}</div>}
  </div>
);

export function LedgerSettleSheetView({ open, onClose, state }: { open: boolean; onClose: () => void; state?: string }) {
  const [scope, setScope] = useState<'month' | 'week'>('month');
  const [offset, setOffset] = useState(0);
  const [busy, setBusy] = useState(true);
  useEffect(() => { if (!open) return; setBusy(true); const t = window.setTimeout(() => setBusy(state === 'loading'), 1100); return () => clearTimeout(t); }, [open, scope, offset, state]);
  const empty = state === 'empty' || offset < -2;
  const label = scope === 'month' ? (offset === 0 ? '2026年10月' : `2026年${10 + offset}月`) : offset === 0 ? '10/19 – 10/25' : `${10 + 0}/${19 + offset * 7} – ${10}/${25 + offset * 7}`;
  const exp = scope === 'month' ? 4555.5 : 276.5;
  const inc = scope === 'month' ? 7300 : 800;
  const cats = scope === 'month' ? [['shopping', 2399], ['home', 1800], ['study', 129], ['food', 138.5], ['fun', 45]] as const : [['study', 129], ['food', 102.5], ['fun', 45]] as const;
  return (
    <P4Sheet open={open} onClose={onClose} title="心相结算" en="SETTLEMENT · IGOR" size="tall">
      <div className="flex min-w-0 flex-col gap-3 pt-1">
        <P4SegmentTabs value={scope} onChange={(v) => { setScope(v as 'month' | 'week'); setOffset(0); }} items={[{ id: 'month', label: '按月' }, { id: 'week', label: '按周' }]} />
        <MonthNav label={label} onStage={false} onPrev={() => setOffset((o) => o - 1)} onNext={() => setOffset((o) => o + 1)} nextDisabled={offset >= 0} />
        {!empty && offset === 0 && scope === 'month' && (
          <>
            <div className="relative overflow-hidden rounded-sm border-3 border-p4g-black bg-p4g-green px-4 py-2.5 text-center font-display text-body font-bold text-p4g-black shadow-hard-sm">🏆 省钱挑战达成！省下 {CNY}520 · +10 SP</div>
            <div className="relative overflow-hidden rounded-sm border-3 border-p4g-black bg-p4g-yellow px-4 py-2.5 text-center font-display text-body font-bold text-p4g-black shadow-hard-sm">
              <span aria-hidden className="absolute inset-y-0 left-0 w-3 p4g-hazard" /><span aria-hidden className="absolute inset-y-0 right-0 w-3 p4g-hazard" />
              🎉 本月不超预算 · +10 SP
            </div>
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
              <Stat label="最贵一笔" main={`${CNY}2,399`} sub="降噪耳机" />
              <Stat label="花最多的一天" main={`${CNY}2,399`} sub="10月15日" tone="up" />
              <Stat label="花最少的一天" main={`${CNY}6`} sub="10月20日" tone="down" />
              <Stat label="日均消费" main={`${CNY}${scope === 'month' ? '227.8' : '39.5'}`} sub={scope === 'month' ? `预期 ${CNY}96.8 · 超 ${CNY}131` : '共 7 天'} tone={scope === 'month' ? 'up' : undefined} />
            </div>
            <div className="flex flex-col gap-2">
              {cats.map(([k, a]) => <BarRow key={k} label={catMeta(k).label} amount={a} max={cats[0][1]} color={catMeta(k).color} right={`${CNY}${fmtMoney(a)}`} />)}
            </div>
            {busy ? (
              <div className="flex flex-col items-center gap-2 py-6">
                <P4Loading size="sm" label="伊戈尔正凝视着你的账目……" className="[&_div]:text-p4g-ink" />
              </div>
            ) : (
              <>
                <div className="relative mt-1 rounded-sm border-3 border-p4g-black bg-[color:var(--p4g-msg)] px-4 pb-3 pt-6 text-body leading-loose text-[color:var(--p4g-msg-ink)] shadow-plate night:border-p4g-yellow">
                  <span className="absolute left-3 top-0 rounded-b-sm bg-p4g-yellow px-3 py-0.5 font-display text-meta font-bold text-p4g-black">伊戈尔</span>
                  {SETTLE_REFLECTION.split('**').map((s, i) => (i % 2 ? <b key={i} className="text-p4g-yellow">{s}</b> : <span key={i}>{s}</span>))}
                </div>
                <div className="rounded-sm border-3 border-p4g-line bg-p4g-surface-2 p-3">
                  <div className="mb-1.5 font-display text-meta font-bold text-p4g-ink">伊戈尔的提点</div>
                  {SETTLE_ADVICE.map((a, i) => (
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
