/**
 * 中长期占卜（真实 src/components/astrology/LongReadingFlow.tsx p3 分支 + ReadingDetail + FollowUpPanel；ReadingArchive.tsx），粉白重画。
 * 时序（真实）：form →（长远档）base 长按注入 1500ms → 抽底色牌 → 停 900ms → picking 六选三 → revealing（三张依次翻：delay pos×0.35s，0.9s）
 *              → 1500ms 后 reading（ThinkingCircle hexagram 140 → 逐字，useAIStream）→ done（ReadingDetail，可追问一次）
 * 追问：form → picking（三选一）→ reading（hexagram 96 正在思索 / 正在回应 → 逐字）→ 记录。
 */
import { motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { LongReading, LongReadingPeriod, TarotOrientation, DrawnCard } from '@real/types';
import { P3R, P3Button, P3Tag, P3Textarea, P3Field, P3Empty, P3Dialog, P3ListRow, slantClip } from '@pink/kit';
import { useAIStream, AIText, type AIFail, type AIPhase } from '@pink/fx';
import { useLowMotion } from '@pink/lib/prefs';
import { TAROT_BY_ID, ORI_LABEL, PERIOD_LABELS, spreadPositionsFor, periodHasBase, BASE_POSITION, drawRandom } from '@pink/mock/pkg4-tarot';
import { TODAY, shiftKey } from '@pink/mock/pkg4-astro';
import { Arcana, PinkBack, FlipCard, Markdownish, ThinkingCircle, useHold, useFakeProgress, cardH } from './tarot';
import { PhaseTitle, HintStrip, ErrStrip, Label, SlantAction, StateFade } from './ui';

export type LongStep = 'form' | 'base' | 'picking' | 'revealing' | 'reading' | 'done';
export type FollowPhase = 'form' | 'picking' | 'reading';
interface Cand { id: string; orientation: TarotOrientation }
const PERIODS: LongReadingPeriod[] = ['recent', 'midterm', 'longterm'];
const AI_PENDING = '星象 AI 接入等待确认；本次没有发起模型请求，也不会生成占位解读。';
const sec = (style: React.CSSProperties = {}) => ({ background: P3R.panel, clipPath: slantClip(14), boxShadow: 'var(--p3r-shadow)', ...style });

export interface LongInit { step: LongStep; ai?: AIPhase; fail?: AIFail; noApiKey?: boolean; cap?: boolean; resume?: boolean; follow?: FollowPhase; autoHold?: boolean }

export function LongReadingFlow({ init, activeCount, onSaved, onBack }: { init: LongInit; activeCount: number; onSaved: (r: LongReading) => void; onBack: () => void }) {
  const low = useLowMotion();
  const [phase, setPhase] = useState<LongStep>(init.step === 'done' ? 'reading' : init.step);
  const [question, setQuestion] = useState('');
  const [period, setPeriod] = useState<LongReadingPeriod>(init.step === 'base' ? 'longterm' : 'midterm');
  const [cands, setCands] = useState<Cand[]>([]);
  const [picks, setPicks] = useState<number[]>([]);
  const [base, setBase] = useState<Cand | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(!!init.resume);
  const [saved, setSaved] = useState<LongReading | null>(null);
  const cap = !!init.cap || activeCount >= 2;
  const hasBase = periodHasBase(period);
  const positions = spreadPositionsFor(period, 3);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); };

  const ai = useAIStream({ text: '', fail: init.fail, failAt: 0.5, initialPhase: 'idle', cps: 40 });

  const buildReading = (content: string): LongReading => {
    const picked: DrawnCard[] = [...(base ? [{ cardId: base.id, orientation: base.orientation }] : []), ...picks.map((i) => ({ cardId: cands[i].id, orientation: cands[i].orientation }))];
    return { id: `lr-${Date.now()}`, question: question.trim(), period, drawnFrom: cands.map((c) => c.id), picked, content, followUps: [], archived: false, createdAt: new Date(), expiresAt: shiftKey(14) };
  };
  const accept = (content = ai.full) => { if (!content.trim()) { setError(AI_PENDING); return; } const r = buildReading(content); setSaved(r); onSaved(r); setPhase('done'); };
  // AI 完成 → 600ms 后存档并转详情（真实：job done → 写入 store → done）
  useEffect(() => { if (phase === 'reading' && ai.phase === 'done' && init.step !== 'done') later(() => accept(), low ? 0 : 600); }, [ai.phase, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const start = () => {
    if (!question.trim() || cap || init.noApiKey) return;
    setPicks([]); setBase(null); setError(null);
    if (hasBase) { setPhase('base'); return; }
    setCands(drawRandom(6).map((id, i) => ({ id, orientation: i % 3 === 2 ? 'reversed' : 'upright' })));
    setPhase('picking');
  };
  const onBaseDone = () => {
    const id = drawRandom(1, cands.map((c) => c.id))[0];
    setBase({ id, orientation: 'upright' });
    later(() => { setCands(drawRandom(6, [id]).map((x, i) => ({ id: x, orientation: i % 3 === 2 ? 'reversed' : 'upright' }))); setPhase('picking'); }, low ? 200 : 900);
  };
  const reveal = () => {
    if (picks.length !== 3) return;
    if (init.noApiKey) { setError('请先在「设置 → AI 服务」中配置 API 密钥。中长期占卜无法离线完成。'); return; }
    setError(AI_PENDING);
  };
  useEffect(() => {
    if (init.step === 'revealing' || init.step === 'done' || (init.step === 'reading' && (init.ai ?? 'done') === 'done')) {
      setError(AI_PENDING);
      setPhase('form');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (phase === 'done' && saved) return <ReadingDetail reading={saved} canFollowUp follow={init.follow} onBack={onBack} onArchive={(a) => setSaved({ ...saved, archived: a })} onDelete={onBack} onFollowSaved={(f) => setSaved({ ...saved, followUps: [f] })} />;

  const revealCards = [...(base ? [base] : []), ...picks.map((i) => cands[i])];
  const revealPos = spreadPositionsFor(period, base ? 4 : 3);

  return (
    <StateFade k={phase}>
      {phase === 'form' && (
        <div className="space-y-4">
          {pending && (
            <div className="relative px-5 py-4" style={sec()}>
              <Label en="RESUME">上次的占卜没有生成完</Label>
              <div className="text-[12.5px] font-bold" style={{ color: P3R.inkSoft }}>上次的牌阵仍然保留；AI 解读尚未接入。</div>
              <div className="mt-3 flex gap-2">
                <SlantAction onClick={() => { setPending(false); setError(AI_PENDING); }}>用同一副牌继续</SlantAction>
                <SlantAction tone="soft" onClick={() => setPending(false)}>放弃</SlantAction>
              </div>
            </div>
          )}
          {cap && <HintStrip>当前已有 {Math.max(2, activeCount)} 条活跃占卜（上限 2）。请先归档或等已有占卜过期（14 天）后再发起新的。</HintStrip>}
          {init.noApiKey && <HintStrip>中长期占卜需要 AI 解读，请先在「设置 → AI 服务」中配置 API 密钥。</HintStrip>}
          <div className="px-5 py-4" style={sec()}>
            <P3Field label="你想要询问什么？" count={`${question.length}/300`}>
              <P3Textarea aria-label="你想要询问什么？" rows={4} maxLength={300} value={question} onChange={(e) => setQuestion(e.target.value.slice(0, 300))} placeholder="例：我最近对工作的方向感到迷茫，接下来该如何取舍？" />
            </P3Field>
          </div>
          <div className="px-5 py-4" style={sec()}>
            <Label en="PERIOD">时间周期</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {PERIODS.map((p) => {
                const on = p === period;
                return (
                  <button key={p} type="button" onClick={() => setPeriod(p)} aria-pressed={on} className="relative min-w-0 px-1 py-2.5 text-center" style={{ clipPath: slantClip(10), background: on ? P3R.blue : 'var(--p3r-row)' }}>
                    <div className="truncate text-[14px] font-black" style={{ color: on ? P3R.onBlue : P3R.ink }}>{PERIOD_LABELS[p].label}</div>
                    <div className="mt-0.5 truncate text-[10.5px] font-bold" style={{ color: on ? 'color-mix(in srgb, var(--p3r-on-blue) 85%, transparent)' : P3R.grey }}>{PERIOD_LABELS[p].days}</div>
                    {on && <span aria-hidden className="absolute bottom-0 right-3 h-[7px] w-[18px]" style={{ background: P3R.magenta, clipPath: 'polygon(30% 0, 100% 0, 70% 100%, 0 100%)' }} />}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex min-w-0 items-end gap-2 overflow-hidden">
              {spreadPositionsFor(period, hasBase ? 4 : 3).map((pos, i) => (
                <div key={pos} className="flex min-w-0 flex-col items-center gap-1">
                  <div style={{ transform: `rotate(${(i - 1.5) * 3}deg)` }}><PinkBack width={40} /></div>
                  <span className="text-[10px] font-black" style={{ color: pos === BASE_POSITION ? P3R.roseInk : P3R.grey }}>{pos}</span>
                </div>
              ))}
              <div className="ml-auto min-w-0 pb-5 text-right text-[10.5px] font-bold" style={{ color: P3R.grey }}>{PERIOD_LABELS[period].hint}</div>
            </div>
          </div>
          <P3Button block size="lg" corner disabled={!question.trim() || cap || !!init.noApiKey} onClick={start} leading={<span aria-hidden className="font-cond">✦</span>}>开始洗牌</P3Button>
          {error && <ErrStrip>{error}</ErrStrip>}
        </div>
      )}

      {phase === 'base' && (
        <div className="space-y-6 pt-2">
          <PhaseTitle title={base ? '命运的波纹已注入' : '请您注入命运的波纹'} sub={base ? `${BASE_POSITION}已定，稍后与三张牌一起翻开` : '长按牌堆，直到波纹注满'} />
          <div className="flex justify-center"><HoldDeck done={!!base} onDone={onBaseDone} autoHold={init.autoHold} /></div>
          {!base && <div className="flex justify-center"><P3Button tone="ghost" onClick={() => setPhase('form')}>返回</P3Button></div>}
        </div>
      )}

      {phase === 'picking' && (
        <div className="space-y-4">
          {base && <HintStrip>{BASE_POSITION}已注入，尚未翻开 · 会与三张牌一起揭示</HintStrip>}
          <PhaseTitle title="从六张牌中选出三张" sub={`依次点击 = 依次进入牌阵：${positions.join(' → ')}`} />
          <div className="mx-auto grid max-w-[420px] grid-cols-3 justify-items-center gap-x-3 gap-y-4">
            {cands.map((c, i) => {
              const order = picks.indexOf(i); const on = order >= 0;
              return (
                <motion.button key={`lc-${i}`} type="button" aria-pressed={on} aria-label={`第 ${i + 1} 张${on ? `（${positions[order]}）` : ''}`}
                  onClick={() => setPicks((p) => (on ? p.filter((x) => x !== i) : p.length < 3 ? [...p, i] : p))}
                  className="relative" initial={low ? { opacity: 0 } : { opacity: 0, y: 24 }} animate={{ opacity: 1, y: on && !low ? -10 : 0 }} transition={{ duration: 0.22, delay: low ? 0 : i * 0.05 }}>
                  <PinkBack width={84} selected={on} />
                  {on && <span className="absolute -right-2 -top-2 flex h-7 min-w-[30px] items-center justify-center px-2 text-[12px] font-black" style={{ background: P3R.ink, color: 'var(--p3r-on-ink)', clipPath: slantClip(5) }}>{positions[order]}</span>}
                </motion.button>
              );
            })}
          </div>
          <div className="flex gap-2">
            <SlantAction tone="soft" onClick={() => setPhase('form')}>返回</SlantAction>
            <SlantAction disabled={picks.length !== 3} onClick={reveal}>揭示牌阵（{picks.length}/3）</SlantAction>
          </div>
          {error && <ErrStrip>{error}</ErrStrip>}
        </div>
      )}

      {phase === 'revealing' && (
        <div className="space-y-6 pt-2">
          <PhaseTitle title="揭示牌阵…" sub="三张牌依次翻开，等候星象的解读" />
          <div className="flex justify-center gap-3">
            {revealCards.map((c, pos) => <FlippingCard key={`rv-${pos}`} c={c} width={revealCards.length > 3 ? 72 : 96} delay={pos * 0.35} position={revealPos[pos] ?? ''} />)}
          </div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: low ? 0 : 1.4 }} className="flex items-center justify-center gap-2 text-[11px] font-bold tracking-widest" style={{ color: P3R.grey }}>
            <motion.span aria-hidden animate={low ? undefined : { rotate: 360 }} transition={{ repeat: Infinity, duration: 1.1, ease: 'linear' }} style={{ color: P3R.blue }}>✦</motion.span>正在展开牌阵
          </motion.div>
        </div>
      )}

      {phase === 'reading' && (
        <ReadingStream ai={ai} cards={revealCards} positions={revealPos} onAccept={() => accept(ai.text)} onRetryPick={() => { ai.reset(); setPhase('picking'); }} />
      )}
    </StateFade>
  );
}

function ReadingStream({ ai, cards, positions, onAccept, onRetryPick }: { ai: ReturnType<typeof useAIStream>; cards: Cand[]; positions: string[]; onAccept: () => void; onRetryPick: () => void }) {
  const low = useLowMotion();
  const thinking = ai.phase === 'thinking' || ai.phase === 'idle';
  const prog = useFakeProgress(ai.phase === 'thinking', 2400);
  const failed = ai.phase === 'error' || ai.phase === 'truncated';
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: low ? 0.12 : 0.5, ease: 'easeOut' }} className="space-y-5">
      <div className="flex justify-center gap-3">
        {cards.map((c, pos) => (
          <motion.div key={`rd-${pos}`} initial={low ? false : { opacity: 0, scale: 1.15 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: pos * 0.08, duration: 0.4 }} className="flex flex-col items-center gap-1.5">
            <Arcana id={c.id} orientation={c.orientation} width={cards.length > 3 ? 62 : 72} />
            <span className="mt-1 text-[10px] font-black" style={{ color: P3R.grey }}>{positions[pos]}</span>
          </motion.div>
        ))}
      </div>
      <div className="relative min-h-[120px] px-5 py-4" style={sec()}>
        {ai.text ? (ai.phase === 'done' ? <Markdownish text={ai.text} /> : <AIText ai={ai} className="text-[14.5px]" />) : (
          <div className="flex justify-center py-3"><ThinkingCircle variant="hexagram" progress={prog} size={140} label={thinking ? '三张牌正在被放在一起推演' : '正在展开牌阵'} showPercent={thinking} /></div>
        )}
      </div>
      {failed && (
        <ErrStrip>
          {ai.phase === 'truncated' ? '解读被截断了：已经写下的部分都还在。' : `解读失败：${ai.error?.message ?? '请求超时'}`}
          <div className="mt-2 flex flex-wrap items-center gap-4">
            {ai.phase === 'truncated' && <button type="button" onClick={() => ai.resume()} className="text-[12px] font-black underline">接着写</button>}
            {ai.phase === 'truncated' && !!ai.text && <button type="button" onClick={onAccept} className="text-[12px] font-black underline">就用这些</button>}
            {ai.phase === 'error' && <button type="button" onClick={() => ai.retry()} className="text-[12px] font-black underline">重试</button>}
            <button type="button" onClick={onRetryPick} className="text-[12px] font-black underline">返回抽卡重试</button>
          </div>
        </ErrStrip>
      )}
      <div className="text-center text-[11px] font-bold" style={{ color: P3R.grey }}>离开这页也不会中断，回来接着看。</div>
    </motion.div>
  );
}

function FlippingCard({ c, width, delay, position }: { c: Cand; width: number; delay: number; position: string }) {
  const low = useLowMotion();
  return (
    <div className="flex flex-col items-center gap-1.5" style={{ perspective: 1200 }}>
      {low ? <Arcana id={c.id} orientation={c.orientation} width={width} /> : (
        <motion.div initial={{ rotateY: 0, y: -4 }} animate={{ rotateY: 180, y: 0 }} transition={{ duration: 0.9, delay, ease: [0.45, 0, 0.55, 1] }} style={{ transformStyle: 'preserve-3d', width, height: cardH(width) }} className="relative">
          <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden' }}><PinkBack width={width} /></div>
          <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}><Arcana id={c.id} orientation={c.orientation} width={width} /></div>
        </motion.div>
      )}
      <span className="mt-1 px-2 py-[1px] text-[10.5px] font-black" style={{ background: position === BASE_POSITION ? P3R.magenta : P3R.ink, color: position === BASE_POSITION ? '#fff' : 'var(--p3r-on-ink)', clipPath: slantClip(4) }}>{position}</span>
    </div>
  );
}

/** 长按注入命运的波纹（真实 HOLD_MS 1500 / D0 500）：牌堆 + 40 格蓄力环 + 三层波纹（scale） */
function HoldDeck({ done, onDone, autoHold }: { done: boolean; onDone: () => void; autoHold?: boolean }) {
  const low = useLowMotion();
  const ms = low ? 500 : 1500;
  const hold = useHold(ms, onDone, !done);
  const [auto, setAuto] = useState(0);
  const fired = useRef(false);
  useEffect(() => {
    if (!autoHold || done) return;
    const t0 = performance.now(); let raf = 0;
    const run = () => { const p = Math.max(0, Math.min(1, (performance.now() - t0 - 500) / ms)); setAuto(p); if (p >= 1) { if (!fired.current) { fired.current = true; onDone(); } return; } raf = requestAnimationFrame(run); };
    raf = requestAnimationFrame(run);
    return () => cancelAnimationFrame(raf);
  }, [autoHold, done]); // eslint-disable-line react-hooks/exhaustive-deps
  const p = done ? 1 : Math.max(hold.progress, auto);
  return (
    <div className="relative flex h-[240px] w-[240px] items-center justify-center">
      {[0, 1, 2].map((i) => (
        <motion.span key={`rp-${i}`} aria-hidden className="absolute rounded-full" style={{ width: 210, height: 210, boxShadow: `inset 0 0 0 ${3 - i}px var(--p3r-blue)` }}
          animate={{ scale: 0.3 + p * (0.5 + i * 0.22), opacity: p > 0 ? 0.85 - i * 0.25 : 0 }} transition={{ duration: low ? 0 : 0.12 }} />
      ))}
      <svg aria-hidden viewBox="0 0 100 100" className="absolute h-full w-full">
        {Array.from({ length: 40 }, (_, i) => { const a = (i / 40) * Math.PI * 2 - Math.PI / 2; const lit = i / 40 < p; return <line key={`hd${i}`} x1={50 + Math.cos(a) * 43} y1={50 + Math.sin(a) * 43} x2={50 + Math.cos(a) * 49} y2={50 + Math.sin(a) * 49} stroke={lit ? 'var(--p3r-blue)' : 'var(--p3r-track)'} strokeWidth="2.6" />; })}
      </svg>
      <button type="button" {...hold.handlers} aria-label="长按注入命运的波纹" className="relative touch-none select-none" style={{ width: 92, height: cardH(92) + 10 }} disabled={done}>
        {[0, 1, 2].map((i) => <div key={`dk-${i}`} className="absolute left-0" style={{ top: i * 4, transform: `rotate(${(i - 1) * 3}deg)` }}><PinkBack width={92} selected={done && i === 2} /></div>)}
      </button>
    </div>
  );
}

// ───────────────────────── 档案详情 ─────────────────────────
export function ReadingDetail({ reading, canFollowUp, follow, onBack, onArchive, onDelete, onFollowSaved }: {
  reading: LongReading; canFollowUp: boolean; follow?: FollowPhase; onBack: () => void; onArchive: (archived: boolean) => void; onDelete: () => void; onFollowSaved: (f: LongReading['followUps'][number]) => void;
}) {
  const low = useLowMotion();
  const positions = spreadPositionsFor(reading.period, reading.picked.length);
  const expired = reading.expiresAt < TODAY;
  const remaining = Math.max(0, Math.ceil((new Date(reading.expiresAt).getTime() - Date.now()) / 86400_000));
  const [confirmDel, setConfirmDel] = useState(false);
  const [followOpen, setFollowOpen] = useState(!!follow);
  const canAsk = canFollowUp && reading.followUps.length === 0 && !reading.archived && !expired;
  const item = (i: number) => ({ initial: low ? { opacity: 0 } : { opacity: 0, x: -18 }, animate: { opacity: 1, x: 0 }, transition: { delay: low ? 0 : i * 0.05, duration: 0.24 } });
  return (
    <div className="space-y-4">
      <motion.div {...item(0)} className="flex items-start gap-3">
        <button type="button" onClick={onBack} aria-label="返回" className="flex h-10 w-10 shrink-0 items-center justify-center" style={{ background: P3R.panel, clipPath: slantClip(6) }}>
          <span aria-hidden className="block h-[14px] w-[12px]" style={{ background: P3R.ink, clipPath: 'polygon(100% 0, 100% 100%, 0 50%)' }} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <P3Tag tone="ink">{PERIOD_LABELS[reading.period].label}</P3Tag>
            {reading.archived ? <P3Tag tone="outline">已归档</P3Tag> : expired ? <P3Tag tone="coral">已到期</P3Tag> : <P3Tag tone="rose">活跃 · 剩 {remaining} 天</P3Tag>}
          </div>
          <div className="mt-1.5 p3r-clamp-2 font-heavy text-[17px] leading-snug" style={{ color: P3R.ink }}>{reading.question}</div>
          <div className="mt-0.5 text-[11px] font-bold" style={{ color: P3R.grey }}>{new Date(reading.createdAt).toLocaleDateString('zh-CN')} · 到期 {reading.expiresAt}</div>
        </div>
      </motion.div>
      <motion.div {...item(1)} className="flex justify-center gap-2.5">
        {reading.picked.map((p, i) => (
          <div key={`dp-${i}`} className="flex flex-col items-center gap-1.5">
            <Arcana id={p.cardId} orientation={p.orientation} width={reading.picked.length > 3 ? 64 : 80} />
            <span className="mt-1 px-2 py-[1px] text-[10.5px] font-black" style={{ background: positions[i] === BASE_POSITION ? P3R.magenta : P3R.ink, color: positions[i] === BASE_POSITION ? '#fff' : 'var(--p3r-on-ink)', clipPath: slantClip(4) }}>{positions[i]}</span>
          </div>
        ))}
      </motion.div>
      <motion.div {...item(2)} className="px-5 py-4" style={sec()}><Label en="READING">解读</Label><Markdownish text={reading.content} /></motion.div>
      {reading.followUps.map((f) => (
        <motion.div key={f.id} {...item(3)} className="px-5 py-4" style={sec()}>
          <Label en="FOLLOW-UP">追问（1/1）</Label>
          <div className="flex gap-3">
            <Arcana id={f.cardId} orientation={f.orientation} width={56} />
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-black" style={{ color: P3R.ink }}>「{f.question}」</div>
              <p className="mt-1 text-[12.5px] leading-relaxed" style={{ color: P3R.inkSoft }}>{f.content}</p>
            </div>
          </div>
        </motion.div>
      ))}
      <motion.div {...item(4)} className="px-5 py-4" style={sec()}>
        <div className="mb-3 pb-2" style={{ borderBottom: '1.5px dashed var(--p3r-track)' }}>
          <div className="font-heavy text-[15px] tracking-[0.3em]" style={{ color: P3R.roseInk }}>窥探命运</div>
          <div className="mt-0.5 text-[10.5px] font-bold tracking-wider" style={{ color: P3R.grey }}>{positions.join(' · ')}</div>
        </div>
        <div className="space-y-3">
          {[...reading.picked.map((p, i) => ({ k: `m${i}`, pos: positions[i], p })), ...reading.followUps.map((f, i) => ({ k: `f${i}`, pos: '追问', p: { cardId: f.cardId, orientation: f.orientation } }))].map(({ k, pos, p }) => {
            const c = TAROT_BY_ID[p.cardId]; const m = c[p.orientation];
            return (
              <div key={k} className="space-y-1.5 pb-3" style={{ borderBottom: '1.5px dashed var(--p3r-track)' }}>
                <div className="flex flex-wrap items-center gap-2"><span className="font-heavy text-[16px]" style={{ color: P3R.ink }}>{c.name}</span><P3Tag tone="lilac">{pos}</P3Tag><span className="text-[11px] font-bold" style={{ color: P3R.grey }}>{ORI_LABEL[p.orientation]}</span></div>
                <div className="flex flex-wrap gap-1">{m.keywords.map((kw) => <P3Tag key={kw} tone="soft">{kw}</P3Tag>)}</div>
                <p className="text-[12.5px] leading-relaxed" style={{ color: P3R.inkSoft }}>{m.meaning}</p>
                <p className="text-[13px] leading-relaxed" style={{ color: P3R.ink }}>{m.reflection}</p>
              </div>
            );
          })}
        </div>
      </motion.div>
      {followOpen && canAsk && <FollowUpPanel initial={follow ?? 'form'} onClose={() => setFollowOpen(false)} onSaved={onFollowSaved} />}
      <motion.div {...item(5)} className="flex flex-wrap gap-2 pt-1">
        {canAsk && !followOpen && <P3Button className="flex-1" corner onClick={() => setFollowOpen(true)}>追问（1/1）</P3Button>}
        <P3Button className="flex-1" tone="soft" onClick={() => onArchive(!reading.archived)}>{reading.archived ? '取消归档' : '归档'}</P3Button>
        <P3Button tone="ghost" onClick={() => setConfirmDel(true)}>删除</P3Button>
      </motion.div>
      <P3Dialog open={confirmDel} onClose={() => setConfirmDel(false)} tone="danger" title="删除这条占卜？" description="牌阵、解读与追问都会一起删除，无法恢复。" confirmText="确认删除" onConfirm={() => { setConfirmDel(false); onDelete(); }} />
    </div>
  );
}

function FollowUpPanel({ initial, onClose, onSaved }: { initial: FollowPhase; onClose: () => void; onSaved: (f: LongReading['followUps'][number]) => void }) {
  const [phase, setPhase] = useState<FollowPhase | 'done'>(initial);
  const [q, setQ] = useState('');
  const cands = useMemo<Cand[]>(() => drawRandom(3).map((id, i) => ({ id, orientation: i === 1 ? 'reversed' : 'upright' })), []);
  const [idx, setIdx] = useState<number | null>(initial === 'reading' ? 0 : null);
  return (
    <div className="px-5 py-4" style={sec({ background: 'var(--p3r-cyan-pale)' })}>
      <Label en="ONE MORE" right={phase !== 'done' && <button type="button" onClick={onClose} className="text-[12px] font-black underline" style={{ color: P3R.grey }}>收起</button>}>追问（仅一次）</Label>
      {phase === 'form' && (
        <div className="space-y-2.5">
          <P3Textarea aria-label="追问" rows={3} maxLength={200} value={q} onChange={(e) => setQ(e.target.value)} placeholder="想对先前的解读再深入问什么？" />
          <P3Button block disabled={!q.trim()} onClick={() => setPhase('picking')}>抽一张牌</P3Button>
        </div>
      )}
      {phase === 'picking' && (
        <div>
          <div className="mb-3 text-center font-heavy text-[15px]" style={{ color: P3R.blueDeep }}>从三张中选一张</div>
          <div className="flex justify-center gap-3">{cands.map((_, i) => <motion.button key={`fc-${i}`} type="button" aria-label={`第 ${i + 1} 张`} onClick={() => { setIdx(i); setPhase('reading'); }} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} whileTap={{ scale: 0.96 }}><PinkBack width={72} /></motion.button>)}</div>
        </div>
      )}
      {(phase === 'reading' || phase === 'done') && idx !== null && (
        <div className="flex gap-3">
          <Arcana id={cands[idx].id} orientation={cands[idx].orientation} width={64} />
          <div className="min-w-0 flex-1">
            <div className="text-[12.5px] font-bold leading-relaxed" style={{ color: P3R.inkSoft }}>{AI_PENDING}</div>
          </div>
        </div>
      )}
      {phase === 'done' && <div className="mt-3 text-center text-[12px] font-bold" style={{ color: P3R.grey }}>追问已记录，可在档案中回看。</div>}
    </div>
  );
}

// ───────────────────────── 档案列表 ─────────────────────────
export function ReadingArchive({ readings, onOpen }: { readings: LongReading[]; onOpen: (r: LongReading) => void }) {
  const low = useLowMotion();
  const active = readings.filter((r) => !r.archived && r.expiresAt >= TODAY);
  const archived = readings.filter((r) => r.archived || r.expiresAt < TODAY);
  if (!readings.length) return <P3Empty text="尚未有中长期占卜记录" sub="发起一次占卜后，此处会保留全部档案" ghost="ARCHIVE" />;
  const Row = ({ r, state, i }: { r: LongReading; state: 'active' | 'archived'; i: number }) => {
    const first = r.picked[0];
    return (
      <motion.div initial={low ? { opacity: 0 } : { opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: low ? 0 : i * 0.05 }}>
        <P3ListRow onClick={() => onOpen(r)} trailing="chevron" accent={state === 'active' ? P3R.blue : 'var(--p3r-grey)'}
          leading={first ? <Arcana id={first.cardId} orientation={first.orientation} width={38} tag={false} /> : undefined}
          eyebrow={`${state === 'active' ? '活跃' : '已归档'} · ${PERIOD_LABELS[r.period].label}${r.followUps.length ? ` · +${r.followUps.length} 追问` : ''}`}
          title={r.question} meta={`${new Date(r.createdAt).toLocaleDateString('zh-CN')} · 到期 ${r.expiresAt} · ${r.picked.map((p) => TAROT_BY_ID[p.cardId].name).join(' / ')}`} />
      </motion.div>
    );
  };
  return (
    <div className="space-y-5">
      <div>
        <div className="mb-2 flex items-center gap-2 text-[12px] font-black" style={{ color: P3R.ink }}>活跃 <span className="font-cond text-[16px]" style={{ color: P3R.blue }}>{active.length} / 2</span></div>
        <div className="space-y-2">{active.map((r, i) => <Row key={r.id} r={r} state="active" i={i} />)}{!active.length && <div className="text-[12px] font-bold" style={{ color: P3R.grey }}>—</div>}</div>
      </div>
      {archived.length > 0 && (
        <div>
          <div className="mb-2 flex items-center gap-2 text-[12px] font-black" style={{ color: P3R.inkSoft }}>归档 <span className="font-cond text-[16px]" style={{ color: P3R.grey }}>{archived.length}</span></div>
          <div className="space-y-2">{archived.map((r, i) => <Row key={r.id} r={r} state="archived" i={i + active.length} />)}</div>
        </div>
      )}
    </div>
  );
}
