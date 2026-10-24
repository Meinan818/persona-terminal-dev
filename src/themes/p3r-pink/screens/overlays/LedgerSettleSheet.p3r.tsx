/**
 * 心相结算（真实 src/components/ledger/LedgerStats.tsx · settleOpen SheetModal）。
 * 按月 / 按周 → 周期导航 → 省钱挑战达成 / 本月不超预算 · +10 SP → 支出 / 收入 / 结余 → 最贵一笔 / 花最多的一天 / 花最少的一天 / 日均消费（预期 / 共 N 天）
 * → 类目前五 → 「伊戈尔正凝视着你的账目……」（AI 推理中，useAIStream 思考 2.4s）→ 伊戈尔回望逐字 + 伊戈尔的提点。
 * 路由：?state=empty（这段时间还没有记录。）| ?phase=thinking|streaming|done|error|truncated|aborted|nokey | ?fail=error|midError|truncate|offline|nokey
 */
import { useEffect, useState } from 'react';
import type { OverlayProps } from '@pink/registry/types';
import { P3Sheet, P3Segment, P3Button, P3R, slantClip, P3Speech } from '@pink/kit';
import { useAIStream, AIThinking, AIText, type AIFail, type AIPhase } from '@pink/fx';
import { BarRow, MonthNav, TrophyGlyph } from '@pink/screens/pkg5/ui';
import { CNY, catMeta, fmtMoney, fmtSigned } from '@pink/mock/pkg5';
import { useLocalLedgerSettlement } from '@/themes/ledgerSettlement';
import { toLocalDateKey } from '@/store';

const Stat = ({ label, main, sub, tone }: { label: string; main: string; sub?: string; tone?: 'up' | 'down' }) => (
  <div className="min-w-0 px-4 py-2.5" style={{ clipPath: slantClip(10), background: 'var(--p3r-row)' }}>
    <div className="truncate text-[11px] font-black tracking-wider" style={{ color: P3R.grey }}>{label}</div>
    <div className="mt-0.5 truncate font-cond text-[24px] leading-none" style={{ color: tone === 'up' ? 'var(--p3r-coral-ink)' : tone === 'down' ? 'var(--p3r-lilac-ink)' : P3R.blue }}>{main}</div>
    {sub && <div className="mt-0.5 truncate text-[11px] font-bold" style={{ color: P3R.grey }}>{sub}</div>}
  </div>
);

function IgorReading({ fail, phase, k, text, advice }: { fail?: AIFail; phase?: AIPhase; k: string; text: string; advice: string[] }) {
  const ai = useAIStream({ text: `${text}\n\n伊戈尔的提点：\n${advice.map((a) => `✦ ${a}`).join('\n')}`, fail, initialPhase: phase ?? 'idle', auto: !phase || phase === 'idle' });
  useEffect(() => () => ai.abort(), []); // eslint-disable-line react-hooks/exhaustive-deps
  if (ai.phase === 'idle' || ai.phase === 'thinking') {
    return <div className="flex justify-center py-6" key={k}><AIThinking label="伊戈尔正凝视着你的账目……" sub="THINKING · 心相结算" /></div>;
  }
  if (ai.phase === 'nokey') {
    return (
      <div className="flex flex-col items-center gap-2 py-4 text-center">
        <span className="text-[14px] font-black" style={{ color: P3R.ink }}>还没有配置 AI 密钥</span>
        <span className="text-[12px] font-bold" style={{ color: P3R.grey }}>伊戈尔需要一把钥匙才能开口——去「设置 · AI 模型」填一个，账目数字照常显示。</span>
        <P3Button size="sm" tone="outline">去设置 AI 密钥 ›</P3Button>
      </div>
    );
  }
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <P3Speech speaker="伊戈尔" more={ai.phase === 'done'}>
        <AIText ai={ai} className="text-[14px]" />
      </P3Speech>
      {ai.phase === 'error' && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2" style={{ background: 'rgb(var(--p3r-magenta-rgb) / 0.12)', clipPath: slantClip(8) }}>
          <span className="text-[12px] font-black" style={{ color: 'var(--p3r-coral-ink)' }}>{ai.error?.code === 'offline' ? '离线中：伊戈尔的话先存在心里，联网后再听。' : `伊戈尔沉默了：${ai.error?.message ?? '出错了'}`}</span>
          <P3Button size="sm" tone="danger" onClick={ai.retry}>重试</P3Button>
        </div>
      )}
      {ai.phase === 'truncated' && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2" style={{ background: P3R.cyanPale, clipPath: slantClip(8) }}>
          <span className="text-[12px] font-black" style={{ color: P3R.ink }}>话说到一半被截断了</span>
          <P3Button size="sm" onClick={ai.resume}>接着说 ›</P3Button>
        </div>
      )}
      {ai.phase === 'aborted' && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2" style={{ background: P3R.cyanPale, clipPath: slantClip(8) }}>
          <span className="text-[12px] font-black" style={{ color: P3R.ink }}>刚才离开了，结算停在半路</span>
          <P3Button size="sm" onClick={ai.resume}>继续 ›</P3Button>
        </div>
      )}
    </div>
  );
}

export function LedgerSettleSheetView({ open, onClose, state, fail, phase }: { open: boolean; onClose: () => void; state?: string; fail?: AIFail; phase?: AIPhase }) {
  const [scope, setScope] = useState<'month' | 'week'>('month');
  const [offset, setOffset] = useState(0);
  const snapshot = useLocalLedgerSettlement(open, toLocalDateKey().slice(0, 7), scope, offset);
  const data = snapshot?.data;
  const empty = state === 'empty' || !data || (data.totalExpense === 0 && data.totalIncome === 0);
  const label = data?.label ?? '';
  const exp = data?.totalExpense ?? 0;
  const inc = data?.totalIncome ?? 0;
  const cats = data?.byCat.slice(0, 5) ?? [];
  const priciestEntry = data?.extremes.priciestEntry;
  const priciestDay = data?.extremes.priciestDay;
  const cheapestDay = data?.extremes.cheapestDay;
  const reflection = snapshot?.readError || snapshot?.reflection || '';
  const advice = snapshot?.advice ?? [];
  return (
    <P3Sheet open={open} onClose={onClose} title="心相结算" en="SETTLEMENT" size="tall">
      <div className="flex min-w-0 flex-col gap-3 pt-1">
        <P3Segment value={scope} onChange={(v) => { setScope(v as 'month' | 'week'); setOffset(0); }} items={[{ id: 'month', label: '按月' }, { id: 'week', label: '按周' }]} />
        <MonthNav label={label} onPrev={() => setOffset((o) => o - 1)} onNext={() => setOffset((o) => o + 1)} nextDisabled={offset >= 0} />
        {!empty && scope === 'month' && (snapshot?.challenge != null || snapshot?.bonus) && (
          <div className="flex flex-col gap-2">
            {snapshot?.challenge != null && <div className="px-4 py-2.5 text-center text-[14px] font-black" style={{ background: 'var(--p3r-claim)', color: 'var(--p3r-mulberry)', clipPath: slantClip(10) }}><TrophyGlyph /> 省钱挑战达成！省下 {CNY}{fmtMoney(snapshot.challenge)} · +10 SP</div>}
            {snapshot?.bonus && <div className="relative px-4 py-2.5 text-center text-[14px] font-black" style={{ background: P3R.blue, color: P3R.onBlue, clipPath: slantClip(10) }}>✦ 本月不超预算 · +10 SP</div>}
          </div>
        )}
        <div className="grid grid-cols-3 gap-2 text-center">
          {[['支出', `${CNY}${fmtMoney(empty ? 0 : exp)}`], ['收入', `${CNY}${fmtMoney(empty ? 0 : inc)}`], ['结余', fmtSigned(empty ? 0 : inc - exp)]].map(([l, v]) => (
            <div key={l} className="min-w-0 px-1 py-2" style={{ background: P3R.ink, clipPath: slantClip(8) }}>
              <div className="text-[11px] font-black" style={{ color: 'var(--pk-petal-a)' }}>{l}</div>
              <div className="truncate font-cond text-[18px]" style={{ color: 'var(--p3r-on-ink)' }}>{v}</div>
            </div>
          ))}
        </div>
        {empty ? (
          <div className="py-8 text-center text-[14px] font-black" style={{ color: P3R.grey }}>这段时间还没有记录。</div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Stat label="最贵一笔" main={priciestEntry ? `${CNY}${fmtMoney(priciestEntry.amount)}` : '—'} sub={priciestEntry?.note} />
              <Stat label="花最多的一天" main={priciestDay ? `${CNY}${fmtMoney(priciestDay.amount)}` : '—'} sub={priciestDay?.date} tone="up" />
              <Stat label="花最少的一天" main={cheapestDay ? `${CNY}${fmtMoney(cheapestDay.amount)}` : '—'} sub={cheapestDay?.date} tone="down" />
              <Stat label="日均消费" main={`${CNY}${fmtMoney(data?.actualDailyAvg ?? 0)}`} sub={`${data?.expectedDailyAvg != null ? `预期 ${CNY}${fmtMoney(data.expectedDailyAvg)} · ` : ''}共 ${data?.days ?? 0} 天`} tone={data?.expectedDailyAvg != null && (data.actualDailyAvg > data.expectedDailyAvg) ? 'up' : undefined} />
            </div>
            <div className="flex flex-col gap-2">
              {cats.map((c) => <BarRow key={c.key} label={catMeta(c.key).label} amount={c.amount} max={cats[0]?.amount ?? 1} color={catMeta(c.key).color} right={`${CNY}${fmtMoney(c.amount)}`} />)}
            </div>
            <IgorReading key={`${scope}-${offset}`} k={`${scope}-${offset}`} fail={fail} phase={phase} text={reflection} advice={advice} />
          </>
        )}
      </div>
    </P3Sheet>
  );
}

export default function LedgerSettleSheet({ open, onClose, params }: OverlayProps) {
  return <LedgerSettleSheetView open={open} onClose={onClose} state={params?.get('state') ?? undefined} fail={(params?.get('fail') as AIFail) ?? undefined} phase={(params?.get('phase') as AIPhase) ?? undefined} />;
}
