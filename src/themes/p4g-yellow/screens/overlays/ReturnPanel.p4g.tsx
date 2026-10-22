/**
 * 回归面板（真实 src/components/return/ReturnPanel.tsx + ReturnBackfillCalendar.tsx）。?step=welcome|summary|backfill&tier=recent|long
 *   welcome：欢迎回来 / 你不在的 N 天 里 / 流转的岁月并未削减你的勇气 / 归来 + 上次 · 日期 + 第 N 次回来 + 说明；补记这几天 · 用一句话概括
 *   summary：这段时间过得怎么样（一句话）+ 不加点数说明 + ← 算了；我回来了
 *   backfill：日历（日一二三四五六）→ 点日「X 的记录」+ 记下 / 那天在休息；补记 · 已记 N 条；← 算了；我回来了
 * 转场：拼贴块分层入场 + 黄黑条纹扫过；子页同页横推 + 跳台噪点 1 帧；收场 = 「归来」大字 Cut-in。
 */
import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { OverlayProps } from '@yellow/registry/types';
import { P6Sheet } from '@yellow/screens/pkg6/sheet';
import { CfgInput } from '@yellow/screens/pkg6/cfg';
import { RETURN_PAYLOAD } from '@yellow/mock/pkg6';
import { ChannelNoise } from '@yellow/fx';
import { P4Button, P4Outline, P4Stripe, Portal } from '@yellow/kit';
import { useLowMotion } from '@yellow/lib/prefs';
import { cx } from '@yellow/lib/cx';

type Mode = 'welcome' | 'summary' | 'calendar';
const WEEK = ['日', '一', '二', '三', '四', '五', '六'];
const RESTING = '那几天在休息';

export default function ReturnPanel({ open, onClose, params }: OverlayProps) {
  const low = useLowMotion();
  const step = params?.get('step');
  const tier = (params?.get('tier') as 'recent' | 'long') || RETURN_PAYLOAD.tier;
  const p = { ...RETURN_PAYLOAD, tier, daysAway: tier === 'long' ? 46 : RETURN_PAYLOAD.daysAway };
  const [mode, setMode] = useState<Mode>(step === 'summary' ? 'summary' : step === 'backfill' ? 'calendar' : 'welcome');
  const [summary, setSummary] = useState('');
  const [entries, setEntries] = useState<Record<string, string>>({});
  const [openDay, setOpenDay] = useState<string | null>(null);
  const [dayText, setDayText] = useState('');
  const [noise, setNoise] = useState(false);
  const [busy, setBusy] = useState(false);
  const [outro, setOutro] = useState(false);
  useEffect(() => { if (open) { setMode(step === 'summary' ? 'summary' : step === 'backfill' ? 'calendar' : 'welcome'); setEntries({}); setSummary(''); setOpenDay(null); } }, [open, step]);
  const go = (m: Mode) => { setNoise(true); setMode(m); };

  const days = useMemo(() => {
    const start = new Date(`${p.lastSeenKey}T00:00:00`); const out: string[] = [];
    for (let i = 1; i <= p.daysAway && i <= 14; i++) { const d = new Date(start); d.setDate(start.getDate() + i); out.push(d.toISOString().slice(0, 10)); }
    return out;
  }, [p.lastSeenKey, p.daysAway]);
  const lead = new Date(`${days[0]}T00:00:00`).getDay();

  const finish = () => { setBusy(true); setTimeout(() => { setBusy(false); onClose(); setOutro(true); setTimeout(() => setOutro(false), low ? 600 : 1500); }, 500); };
  const footer = mode === 'welcome'
    ? <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{p.tier === 'recent' && <P4Button block onClick={() => go('calendar')}>补记这几天</P4Button>}<P4Button block variant={p.tier === 'recent' ? 'secondary' : 'primary'} onClick={() => go('summary')}>用一句话概括</P4Button></div>
    : <P4Button block size="lg" variant="black" disabled={busy} onClick={finish}>{busy ? '…' : '我回来了'}</P4Button>;

  return (
    <>
      <P6Sheet open={open} onClose={onClose} title="欢迎回来" en="WELCOME BACK" size="tall" footer={footer} bodyClassName="relative overflow-x-hidden">
        <ChannelNoise active={noise} duration={160} bars={false} onDone={() => setNoise(false)} />
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={mode} initial={low ? { opacity: 0 } : { x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={low ? { opacity: 0 } : { x: -40, opacity: 0 }} transition={{ duration: 0.2, ease: [0.2, 0.9, 0.1, 1] }} className="min-w-0 space-y-4 pt-1">
            {mode === 'welcome' && (
              <>
                <div className="relative overflow-hidden rounded-[4px] border-3 border-p4g-black bg-p4g-black px-4 pb-5 pt-4 text-p4g-white night:border-p4g-yellow">
                  <motion.div aria-hidden className="absolute -left-6 -right-6 top-3" style={{ rotate: -4 }} initial={low ? false : { x: '-110%' }} animate={{ x: 0 }} transition={{ duration: 0.4 }}><P4Stripe variant="hazard" height={10} /></motion.div>
                  <div className="relative mt-5 space-y-1">
                    <motion.p initial={low ? false : { opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }} className="font-display text-h3 font-bold">你不在的 <span className="p4g-num text-mega text-p4g-yellow">{p.daysAway}</span> <span className="text-p4g-yellow">天</span> 里</motion.p>
                    <motion.p initial={low ? false : { opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }} className="font-display text-lead font-bold text-p4g-white/90">流转的岁月并未削减你的勇气</motion.p>
                  </div>
                  <motion.div className="absolute bottom-2 right-3" style={{ rotate: -10 }} initial={low ? false : { opacity: 0, scale: 2.2 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.45, duration: 0.18 }}>
                    <P4Outline size={40} stroke={5} fill="var(--p4g-orange)" strokeColor="var(--p4g-white)">归来</P4Outline>
                  </motion.div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="-rotate-1 rounded-[3px] bg-p4g-yellow px-2 py-0.5 font-display text-meta font-bold text-p4g-black shadow-hard-sm">上次 · {p.lastSeenKey}</span>
                  <span className="rotate-1 rounded-[3px] bg-p4g-black px-2 py-0.5 font-display text-meta font-bold text-p4g-yellow shadow-hard-sm night:bg-p4g-yellow night:text-p4g-black">第 {p.returnCount} 次回来</span>
                </div>
                <p className="text-body leading-relaxed text-p4g-ink"><span className="text-p4g-tag">&gt; </span>{p.tier === 'recent' ? '想补上这几天也行，不补也行，空着的日子也是日子。' : '隔了有一阵子了。逐日回忆多半不准，不如用一句话说说这段时间。'}</p>
              </>
            )}
            {mode === 'summary' && (
              <>
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor="ret-sum" className="font-display text-meta font-bold">这段时间过得怎么样</label>
                  <button type="button" onClick={() => { setSummary(''); go('welcome'); }} className="inline-flex items-center gap-1 text-cap font-bold text-p4g-ink-soft"><span aria-hidden>←</span>算了</button>
                </div>
                <CfgInput id="ret-sum" autoFocus value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="一句话就够，比如：忙完了一个大项目" aria-label="这段时间的一句话概括" />
                <p className="text-meta text-p4g-ink-soft">会记在 {p.lastSeenKey} 那一天，讲的是那段时间的事，不是今天的。</p>
                <p className="rounded-[4px] border-l-4 border-p4g-orange bg-p4g-surface px-3 py-2 text-meta leading-relaxed">补记的条目<b>不加点数</b>，也<b>不会修复连续天数</b>。那个数字记的是「没有断过」，补得回来它就不再代表任何东西了。回来这件事，本来就该有自己的名字。</p>
              </>
            )}
            {mode === 'calendar' && (
              <>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display text-meta font-bold">补记 · 已记 {Object.keys(entries).length} 条</span>
                  <button type="button" onClick={() => go('welcome')} className="inline-flex items-center gap-1 text-cap font-bold text-p4g-ink-soft"><span aria-hidden>←</span>算了</button>
                </div>
                <div className="overflow-hidden rounded-[4px] border-3 border-p4g-black night:border-p4g-yellow">
                  <div className="grid grid-cols-7 bg-p4g-black text-center font-display text-meta font-bold text-p4g-yellow">{WEEK.map((w, i) => <span key={w} className={cx('py-1', i === 0 && 'text-p4g-orange')}>{w}</span>)}</div>
                  <div className="grid grid-cols-7 gap-px bg-p4g-line/20 p-px">
                    {Array.from({ length: lead }).map((_, i) => <span key={`b${i}`} className="aspect-square bg-p4g-surface-2" />)}
                    {days.map((d) => {
                      const has = entries[d]; const on = openDay === d; const dt = new Date(`${d}T00:00:00`);
                      return (
                        <button key={d} type="button" onClick={() => { setOpenDay(d); setDayText(entries[d] && entries[d] !== RESTING ? entries[d] : ''); }}
                          className={cx('relative flex aspect-square flex-col items-center justify-center', on ? 'bg-p4g-select text-[color:var(--p4g-select-ink)]' : has ? 'bg-p4g-yellow text-p4g-black' : 'bg-p4g-surface-2 text-p4g-ink')}>
                          <span className="p4g-num text-h3 leading-none">{dt.getDate()}</span>
                          {has && <span className="mt-0.5 text-2xs">{has === RESTING ? '休' : '✓'}</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {openDay && (
                  <div className="space-y-2 rounded-[4px] border-2 border-p4g-black bg-p4g-surface p-3 night:border-p4g-yellow">
                    <div className="font-display text-body font-bold">{openDay.slice(5).replace('-', '/')} 的记录</div>
                    <CfgInput autoFocus value={dayText} onChange={(e) => setDayText(e.target.value)} placeholder="那天还做了什么…" aria-label={`${openDay} 的记录`} />
                    <div className="grid grid-cols-2 gap-2">
                      <P4Button size="sm" disabled={!dayText.trim()} onClick={() => { setEntries({ ...entries, [openDay]: dayText.trim() }); setOpenDay(null); }}>记下</P4Button>
                      <P4Button size="sm" variant="secondary" onClick={() => { setEntries({ ...entries, [openDay]: RESTING }); setOpenDay(null); }}>那天在休息</P4Button>
                    </div>
                  </div>
                )}
                <p className="text-2xs text-p4g-muted">补记的条目不加点数，也不会修复连续天数。</p>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </P6Sheet>
      <Portal>
        <AnimatePresence>
          {outro && (
            <motion.div key="outro" className="pointer-events-none fixed inset-0 flex items-center justify-center bg-p4g-yellow" style={{ zIndex: 'var(--p4g-z-cutin)' as unknown as number }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <motion.div className="absolute inset-x-0 top-1/2 -mt-10" style={{ rotate: -5 }} initial={low ? false : { x: '-100%' }} animate={{ x: 0 }} transition={{ duration: 0.3 }}><P4Stripe variant="ribbon" height={80} /></motion.div>
              <motion.div initial={low ? false : { scale: 2.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2, duration: 0.2 }}><P4Outline size="clamp(64px,20vw,140px)" stroke={8}>归来</P4Outline></motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </Portal>
    </>
  );
}
