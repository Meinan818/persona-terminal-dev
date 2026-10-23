/**
 * 回归面板（真实 src/components/return/ReturnPanel.tsx + ReturnBackfillCalendar.tsx · p3 分支）粉白 P3R 版。
 *   ?step=welcome|summary|backfill · ?tier=recent|long · ?outro=1（直达收场演出）
 *   welcome：欢迎回来（居中斜卡）/ 两句欢迎（「N 天」玫红大字弹入）/ 上次 · 日期 · 第 N 次回来（樱粉斜签）
 *            footer：说明 + 「补记这几天」（recent 才有）+「用一句话概括」——首屏不放「我回来了」（真实用户定稿）
 *   summary：这段时间过得怎么样 + ← 算了 + 一句话输入 + 记在哪一天的说明 → 「我回来了」
 *   backfill：日期格（周几 + 日 + 条数点，周末玫红）→ 展开当天：已记 chips（点即删）+ 常做的事 chips（＋ 一点即记）+ 自由输入「记下」+「那天在休息」
 *   底部恒有：补记不加点数、不修复连续天数的说明。
 * 收场「返场印章 · 三幕」（2.6s，真实 OUTRO_MS）：WELCOME / BACK 巨字对推 → 8 条藕紫速度线向心 → 星章「归来」2.4× 砸落 + 双冲击环 + 震屏 + 星屑爆射 → 余烬上浮；低动效直接关闭。
 */
import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { OverlayProps } from '@pink/registry/types';
import { P6Sheet } from '@pink/screens/pkg6/sheet';
import { CfgInput } from '@pink/screens/pkg6/cfg';
import { Portal, P3R, slantClip } from '@pink/kit';
import { useLowMotion } from '@pink/lib/prefs';
import { useAppStore } from '@/store';

type Mode = 'welcome' | 'summary' | 'calendar';
type Entry = { dateKey: string; text: string };
const WEEK = ['日', '一', '二', '三', '四', '五', '六'];
const RESTING = '那几天在休息';
const OUTRO_MS = 2600;
const starPts = (cx: number, cy: number, r: number) => Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / 5; const rr = i % 2 ? r * 0.45 : r; return `${cx + Math.cos(a) * rr},${cy + Math.sin(a) * rr}`; }).join(' ');

function ReturnButton({ label, ghost, disabled, onPress }: { label: string; ghost?: boolean; disabled?: boolean; onPress: () => void }) {
  return (
    <motion.button type="button" whileTap={disabled ? undefined : { scale: 0.97 }} onClick={onPress} disabled={disabled} className="relative w-full disabled:opacity-60">
      <span className="block py-3.5 text-center text-[15px] font-black tracking-[0.14em]" style={{ background: ghost ? 'var(--p3r-ink-soft)' : P3R.blue, color: ghost ? 'var(--p3r-on-ink)' : P3R.onBlue, clipPath: slantClip(12) }}>{label}</span>
      {!ghost && <span aria-hidden className="absolute bottom-0 right-5 h-[6px] w-[16px]" style={{ background: P3R.magenta, clipPath: 'polygon(30% 0, 100% 0, 70% 100%, 0 100%)' }} />}
    </motion.button>
  );
}
const MetaBadge = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-block px-3 py-1 text-[11px] font-black" style={{ background: 'var(--p3r-cyan-faint)', color: P3R.ink, clipPath: slantClip(6) }}>{children}</span>
);

function Outro() {
  const rays = useMemo(() => Array.from({ length: 8 }, (_, i) => ({ angle: i * 45 + 12, delay: 0.02 + (i % 4) * 0.028 })), []);
  const burst = useMemo(() => Array.from({ length: 9 }, (_, i) => { const a = (i / 9) * Math.PI * 2 + 0.35; const dist = 125 + (i % 3) * 46; return { x: Math.cos(a) * dist, y: Math.sin(a) * dist, size: 10 + (i % 3) * 5, delay: 0.56 + (i % 4) * 0.03 }; }), []);
  const embers = useMemo(() => Array.from({ length: 5 }, (_, i) => ({ x: -70 + i * 35 + (i % 2) * 9, size: 7 + (i % 3) * 3, delay: 0.95 + i * 0.1 })), []);
  const big = { fontSize: 'clamp(64px, 23vw, 190px)', color: 'rgba(255,255,255,0.15)' };
  return (
    <motion.div aria-hidden className="pointer-events-none fixed inset-0 flex items-center justify-center overflow-hidden" style={{ zIndex: 'var(--p3r-z-cutin)' as unknown as number, background: 'rgba(42,13,34,0.72)' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}>
      <div className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden">
        <motion.span className="whitespace-nowrap font-cond uppercase leading-[0.8]" style={big} initial={{ x: '-115%', opacity: 0 }} animate={{ x: '-6%', opacity: 1 }} transition={{ delay: 0.06, type: 'spring', stiffness: 120, damping: 20, mass: 0.9 }}>Welcome</motion.span>
        <motion.span className="whitespace-nowrap font-cond uppercase leading-[0.8]" style={big} initial={{ x: '115%', opacity: 0 }} animate={{ x: '6%', opacity: 1 }} transition={{ delay: 0.16, type: 'spring', stiffness: 120, damping: 20, mass: 0.9 }}>Back</motion.span>
      </div>
      <motion.div className="relative flex flex-col items-center" animate={{ x: [0, 0, -4, 3, -2, 0] }} transition={{ delay: 0.5, duration: 0.3, times: [0, 0.05, 0.3, 0.55, 0.8, 1] }}>
        {rays.map((r, i) => (
          <div key={`r${i}`} className="absolute left-1/2 top-1/2" style={{ transform: `rotate(${r.angle}deg)` }}>
            <motion.div className="h-[3px] w-[92px]" style={{ background: `linear-gradient(to left, ${P3R.cyan}, transparent)` }} initial={{ x: 250, opacity: 0 }} animate={{ x: 70, opacity: [0, 0.9, 0] }} transition={{ delay: r.delay, duration: 0.32, ease: 'easeIn' }} />
          </div>
        ))}
        <div className="relative flex h-[200px] w-[200px] items-center justify-center">
          {[{ d: 0.52, to: 2 }, { d: 0.64, to: 2.6 }].map((s, i) => (
            <motion.div key={`s${i}`} className="absolute h-[170px] w-[170px] rounded-full" style={{ border: `3px solid ${P3R.cyan}` }} initial={{ scale: 0.45, opacity: 0 }} animate={{ scale: s.to, opacity: [0, 0.75, 0] }} transition={{ delay: s.d, duration: 0.55, ease: 'easeOut' }} />
          ))}
          <motion.div className="relative flex h-full w-full items-center justify-center" initial={{ scale: 2.4, rotate: -24, opacity: 0 }} animate={{ scale: 1, rotate: -8, opacity: 1 }} transition={{ delay: 0.24, type: 'spring', stiffness: 380, damping: 20 }}>
            <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
              <polygon points={starPts(50, 50, 49)} fill="rgba(0,0,0,0.28)" transform="translate(2.6 3.2)" />
              <polygon points={starPts(50, 50, 49)} fill={P3R.blue} />
              <polygon points={starPts(50, 50, 49)} fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="1.8" />
            </svg>
            <motion.span className="relative font-heavy text-[36px] leading-none" style={{ color: '#fff', transform: 'rotate(8deg)' }} initial={{ scale: 1.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.42, type: 'spring', stiffness: 420, damping: 24 }}>归来</motion.span>
          </motion.div>
          {burst.map((s, i) => (
            <motion.svg key={`b${i}`} viewBox="0 0 100 100" className="absolute left-1/2 top-1/2" style={{ width: s.size, height: s.size, marginLeft: -s.size / 2, marginTop: -s.size / 2 }} initial={{ x: 0, y: 0, opacity: 0 }} animate={{ x: s.x, y: s.y, opacity: [0, 1, 0], scale: 0.4 }} transition={{ duration: 0.72, delay: s.delay, ease: 'easeOut' }}>
              <polygon points={starPts(50, 50, 48)} fill="#fff" />
            </motion.svg>
          ))}
          {embers.map((e, i) => (
            <motion.svg key={`e${i}`} viewBox="0 0 100 100" className="absolute left-1/2 top-1/2" style={{ width: e.size, height: e.size, marginLeft: e.x, marginTop: 30 }} initial={{ y: 40, opacity: 0 }} animate={{ y: -95, opacity: [0, 0.85, 0], scale: 0.5 }} transition={{ delay: e.delay, duration: 1.05, ease: 'easeOut' }}>
              <polygon points={starPts(50, 50, 48)} fill="#fff" />
            </motion.svg>
          ))}
        </div>
        <motion.div className="mt-2 font-cond text-[13px] tracking-[0.4em]" style={{ color: 'rgba(255,225,240,0.8)' }} initial={{ opacity: 0, letterSpacing: '0.1em' }} animate={{ opacity: 1, letterSpacing: '0.4em' }} transition={{ delay: 1.0, duration: 0.6 }}>WELCOME BACK</motion.div>
      </motion.div>
    </motion.div>
  );
}

function Backfill({ days, entries, onChange, onBack }: { days: string[]; entries: Entry[]; onChange: (e: Entry[]) => void; onBack: () => void }) {
  const getBackfillSuggestions = useAppStore((state) => state.getBackfillSuggestions);
  const suggestions = useMemo(() => getBackfillSuggestions(8).map((item) => item.text), [getBackfillSuggestions]);
  const [openDay, setOpenDay] = useState<string | null>(days[days.length - 1] ?? null);
  const [draft, setDraft] = useState('');
  const countOf = (k: string) => entries.filter((e) => e.dateKey === k).length;
  const add = (k: string, t: string) => { if (!t.trim() || entries.some((e) => e.dateKey === k && e.text === t)) return; onChange([...entries, { dateKey: k, text: t }]); };
  const removeAt = (k: string, t: string) => onChange(entries.filter((e) => !(e.dateKey === k && e.text === t)));
  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <span className="text-[12px] font-black" style={{ color: P3R.inkSoft }}>补记 · 已记 {entries.length} 条</span>
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-[11px] font-bold" style={{ color: P3R.grey }}><span aria-hidden>←</span>算了</button>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((k) => {
          const d = new Date(`${k}T00:00:00`); const n = countOf(k); const isOpen = openDay === k; const weekend = d.getDay() === 0 || d.getDay() === 6;
          return (
            <button key={k} type="button" aria-pressed={isOpen} onClick={() => { setOpenDay(isOpen ? null : k); setDraft(''); }}
              className="relative flex flex-col items-center py-1.5" style={{ clipPath: slantClip(5), background: isOpen ? P3R.blue : n > 0 ? 'rgb(var(--p3r-blue-rgb) / 0.16)' : 'var(--p3r-row)' }}>
              <span className="text-[9px] font-bold leading-none" style={{ color: isOpen ? P3R.onBlue : weekend ? 'var(--p3r-rose-ink)' : P3R.grey }}>{WEEK[d.getDay()]}</span>
              <span className="mt-0.5 font-cond text-[15px] leading-none tabular" style={{ color: isOpen ? P3R.onBlue : P3R.ink }}>{d.getDate()}</span>
              <span className="mt-1 flex h-1.5 items-center gap-[2px]">{Array.from({ length: Math.min(3, n) }).map((_, i) => <span key={i} className="h-1 w-1 rounded-full" style={{ background: isOpen ? P3R.onBlue : P3R.blue }} />)}</span>
            </button>
          );
        })}
      </div>
      <AnimatePresence mode="wait">
        {openDay && (
          <motion.div key={openDay} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
            <div className="space-y-2 px-4 py-3" style={{ background: 'var(--p3r-panel-glass)', clipPath: slantClip(10) }}>
              <div className="font-heavy text-[14px]" style={{ color: P3R.ink }}>{openDay.slice(5).replace('-', '/')} 的记录</div>
              {countOf(openDay) > 0 && (
                <div className="flex flex-wrap gap-1.5">{entries.filter((e) => e.dateKey === openDay).map((e) => (
                  <button key={e.text} type="button" onClick={() => removeAt(openDay, e.text)} className="px-3 py-1 text-[11px] font-black" style={{ background: P3R.blue, color: P3R.onBlue, clipPath: slantClip(4) }}>{e.text} ×</button>
                ))}</div>
              )}
              <div className="flex flex-wrap gap-1.5">{suggestions.filter((s) => !entries.some((e) => e.dateKey === openDay && e.text === s)).map((s) => (
                <button key={s} type="button" onClick={() => add(openDay, s)} className="px-3 py-1 text-[11px] font-bold" style={{ color: P3R.inkSoft, boxShadow: 'inset 0 0 0 1.5px rgb(var(--p3r-cyan-rgb) / 0.6)', clipPath: slantClip(4) }}>＋ {s}</button>
              ))}</div>
              <div className="flex gap-1.5">
                <CfgInput value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="那天还做了什么…" aria-label={`${openDay} 的记录`} className="h-9 flex-1 text-[13px]" />
                <button type="button" disabled={!draft.trim()} onClick={() => { add(openDay, draft.trim()); setDraft(''); }} className="shrink-0 px-3.5 text-[12px] font-black disabled:opacity-40" style={{ background: P3R.blue, color: P3R.onBlue, clipPath: slantClip(5) }}>记下</button>
              </div>
              <button type="button" onClick={() => add(openDay, RESTING)} disabled={entries.some((e) => e.dateKey === openDay && e.text === RESTING)} className="w-full py-1.5 text-[11px] font-bold disabled:opacity-40" style={{ color: P3R.grey, boxShadow: 'inset 0 0 0 1.5px rgb(var(--p3r-grey-rgb) / 0.5)', clipPath: slantClip(5) }}>那天在休息</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ReturnPanel({ open, onClose, params }: OverlayProps) {
  const low = useLowMotion();
  const step = params?.get('step');
  const p = useAppStore((state) => state.pendingReturnPayload);
  const commitReturn = useAppStore((state) => state.commitReturn);
  const clearPendingReturnPayload = useAppStore((state) => state.clearPendingReturnPayload);
  const init: Mode = step === 'summary' ? 'summary' : step === 'backfill' && p?.tier === 'recent' ? 'calendar' : 'welcome';
  const [mode, setMode] = useState<Mode>(init);
  const [summary, setSummary] = useState('');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [busy, setBusy] = useState(false);
  const [outro, setOutro] = useState(params?.get('outro') === '1');
  const [shown, setShown] = useState(open && params?.get('outro') !== '1');
  useEffect(() => { if (open) { setMode(init); setEntries([]); setSummary(''); setBusy(false); setShown(params?.get('outro') !== '1'); } else setShown(false); }, [open, p?.tier, step]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!outro) return; const t = setTimeout(() => { setOutro(false); setShown(false); clearPendingReturnPayload(); onClose(); }, OUTRO_MS); return () => clearTimeout(t); }, [outro]); // eslint-disable-line react-hooks/exhaustive-deps

  const days = useMemo(() => {
    return p?.backfillDays.slice(0, 14) ?? [];
  }, [p?.backfillDays]);

  if (!p) return (
    <>
      {outro && <Portal><AnimatePresence><Outro key="outro" /></AnimatePresence></Portal>}
      {!outro && (
        <P6Sheet open={open && shown} onClose={onClose} position="center" title="欢迎回来" en="WELCOME BACK">
          <div className="py-8 text-center text-[13px] font-bold" style={{ color: P3R.inkSoft }}>现在没有待处理的回归。</div>
        </P6Sheet>
      )}
    </>
  );

  const finish = () => {
    if (busy) return;
    setBusy(true);
    void commitReturn(p, entries, mode === 'summary' ? summary : undefined).then(() => {
      if (low) { clearPendingReturnPayload(); setShown(false); onClose(); return; }
      setShown(false);
      setOutro(true);
    }).catch(() => setBusy(false));
  };
  const lines = [[{ t: '你不在的 ' }, { t: `${p.daysAway} 天`, em: true }, { t: ' 里' }], [{ t: '流转的岁月并未削减你的勇气' }]];
  const footer = mode === 'welcome' ? (
    <div className="space-y-2.5">
      <p className="text-center text-[11px] leading-relaxed" style={{ color: P3R.grey }}>{p.tier === 'recent' ? '想补上这几天也行，不补也行，空着的日子也是日子。' : '隔了有一阵子了。逐日回忆多半不准，不如用一句话说说这段时间。'}</p>
      {p.tier === 'recent' && <ReturnButton label="补记这几天" onPress={() => setMode('calendar')} />}
      <ReturnButton label="用一句话概括" ghost={p.tier === 'recent'} onPress={() => setMode('summary')} />
    </div>
  ) : <ReturnButton label={busy ? '…' : '我回来了'} disabled={busy} onPress={finish} />;

  return (
    <>
      <P6Sheet open={open && shown} onClose={onClose} position="center" title="欢迎回来" en="WELCOME BACK" busy={busy} footer={footer}>
        <div className="space-y-4">
          <div className="text-[15px] font-bold leading-[1.7]" style={{ color: P3R.ink }}>
            {lines.map((line, li) => (
              <motion.p key={`l${li}`} className={li > 0 ? 'mt-1.5' : undefined} initial={low ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.38, delay: low ? 0 : li * 0.12 }}>
                {line.map((s, i) => ('em' in s && s.em ? (
                  <motion.em key={`s${i}`} className="mx-0.5 inline-block align-baseline font-cond text-[28px] not-italic leading-none tabular" style={{ color: P3R.blue }}
                    initial={low ? false : { opacity: 0, scale: 1.35 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 380, damping: 22, delay: 0.2 + li * 0.12 + i * 0.05 }}>{s.t}</motion.em>
                ) : <span key={`s${i}`}>{s.t}</span>))}
              </motion.p>
            ))}
          </div>
          <motion.div className="flex flex-wrap items-center gap-2" initial={low ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: low ? 0 : 0.16 }}>
            <MetaBadge>上次 · {p.lastSeenKey}</MetaBadge>
            <MetaBadge>第 {p.returnCount} 次回来</MetaBadge>
          </motion.div>

          {mode === 'calendar' && <Backfill days={days} entries={entries} onChange={setEntries} onBack={() => { setEntries([]); setMode('welcome'); }} />}
          {mode === 'summary' && (
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <label htmlFor="ret-sum" className="text-[12px] font-black" style={{ color: P3R.ink }}>这段时间过得怎么样</label>
                <button type="button" onClick={() => { setSummary(''); setMode('welcome'); }} className="inline-flex items-center gap-1 text-[11px] font-bold" style={{ color: P3R.grey }}><span aria-hidden>←</span>算了</button>
              </div>
              <CfgInput id="ret-sum" value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="一句话就够，比如：忙完了一个大项目" aria-label="这段时间的一句话概括" />
              <p className="text-[10px] leading-relaxed" style={{ color: P3R.grey }}>会记在 {p.lastSeenKey} 那一天，讲的是那段时间的事，不是今天的。</p>
            </div>
          )}
          <p className="pt-3 text-[10px] leading-relaxed" style={{ color: P3R.grey, borderTop: '1px solid rgb(var(--p3r-cyan-rgb) / 0.35)' }}>
            补记的条目<b>不加点数</b>，也<b>不会修复连续天数</b>。那个数字记的是「没有断过」，补得回来它就不再代表任何东西了。回来这件事，本来就该有自己的名字。
          </p>
        </div>
      </P6Sheet>
      <Portal><AnimatePresence>{outro && <Outro key="outro" />}</AnimatePresence></Portal>
    </>
  );
}
