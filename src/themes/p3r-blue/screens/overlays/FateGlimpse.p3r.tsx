/**
 * 真实：src/components/astrology/FateGlimpse.tsx 的两个弹层（蓝白 P3R 重画）
 *   DayReviewSheet —— 当日塔罗回看（点七日连星某天）：P3Sheet 底部抽屉（顶缘单斜）/ 宽屏居中卡
 *   GlimpseRitual  —— 窥探命运仪式：gather（七牌依次飞入 1150ms）→ await（长按中央命运之牌 2200ms，蓄力环 + 气泡上升 + 星爆）
 *                     → flipping（rotateY 0.85s）→ revealed：pending（ThinkingCircle spokes 136）→ 逐字（useAIStream）→ 总结 / 展望 / 建议 + 命运的祝福 · 三日
 *                     → 「收下命运的低语」
 * 路由：#/overlay/astro-day-review（?day=0..6）、#/overlay/astro-glimpse-flow?state=gather|await|flipping|pending|revealed|error|offline（?view=review 回看）
 *       演出总览连播（__reel=1）或 ?demo=1 时 await 自动蓄力。
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DailyDivination } from '@/types';
import type { OverlayProps } from '@blue/registry/types';
import { P3R, P3Sheet, P3Button, P3Tag, Portal, useEscape, useScrollLock, slantClip, chamferClip } from '@blue/kit';
import { useAIStream, AIText, BubbleBurst, type AIFail, type AIPhase } from '@blue/fx';
import { useLowMotion } from '@blue/lib/prefs';
import { TAROT_BY_ID, ATTR_NAMES, FORTUNE_LABEL } from '@blue/adapters/pkg4-tarot';
import { WINDOW_DAYS, LAST_GLIMPSE, WEEKDAY_CN } from '@blue/adapters/pkg4-astro';
import { Arcana, PinkBack, ThinkingCircle, Markdownish, useHold, useFakeProgress, cardH } from '@blue/screens/pkg4/tarot';

// ───────────────────────── 当日塔罗回看 ─────────────────────────
export function DayReviewSheet({ d, open, onClose }: { d: DailyDivination | null; open: boolean; onClose: () => void }) {
  const card = d ? TAROT_BY_ID[d.cardId] : null;
  const date = d ? new Date(d.date) : new Date();
  const f = d ? FORTUNE_LABEL[d.fortune ?? 'good'] : null;
  return (
    <P3Sheet open={open && !!d} onClose={onClose} title={card ? `${card.name} · ${d!.orientation === 'reversed' ? '逆位' : '正位'}` : ''} en={`${date.getMonth() + 1}/${date.getDate()} · 周${WEEKDAY_CN[date.getDay()]}`}
      footer={<P3Button block tone="soft" onClick={onClose}>关闭</P3Button>}>
      {d && card && f && (
        <div aria-label="当日塔罗回看" className="flex min-w-0 gap-4">
          <Arcana id={d.cardId} orientation={d.orientation} width={86} offline={d.source === 'offline'} />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap gap-1.5">
              <P3Tag tone="soft">{f.icon} {f.label}</P3Tag>
              <P3Tag tone="rose">{ATTR_NAMES[d.effect.attribute]} × {d.effect.multiplier}</P3Tag>
            </div>
            <p className="text-[12.5px] leading-relaxed" style={{ color: P3R.ink }}>{d.advice}</p>
            <div className="pt-1 font-cond text-[11px] uppercase tracking-[0.2em]" style={{ color: P3R.grey }}>当日解读</div>
            <div className="max-h-[36vh] overflow-y-auto pr-1"><Markdownish text={d.narration} className="text-[13px]" /></div>
          </div>
        </div>
      )}
    </P3Sheet>
  );
}

// ───────────────────────── 窥探命运 ─────────────────────────
export type RitualStage = 'gather' | 'await' | 'flipping' | 'revealed';
const STAGE_BG = 'linear-gradient(170deg, #0d162a 0%, #0a0f1b 55%, #101d3a 100%)';
const CREAM = 'var(--p3r-cream)';
const CREAM_SOFT = 'rgba(236, 247, 255, 0.62)';

function FateCardFace({ verdict, width }: { verdict: string | null; width: number }) {
  return (
    <span className="relative block" style={{ width, height: cardH(width) }}>
      <span className="absolute inset-0" style={{ background: P3R.blue, clipPath: chamferClip(12, 12) }} />
      <span className="absolute inset-[3px] flex flex-col items-center justify-between px-2 py-3" style={{ clipPath: chamferClip(10, 10), background: '#0d162a' }}>
        <span className="font-cond text-[10px] tracking-[0.4em]" style={{ color: 'var(--p3r-gold)' }}>FATE</span>
        <svg viewBox="0 0 40 40" width={width * 0.4} height={width * 0.4} aria-hidden><path d="M20 2 C22 15 25 18 38 20 C25 22 22 25 20 38 C18 25 15 22 2 20 C15 18 18 15 20 2Z" fill="var(--p3r-gold)" /></svg>
        <span className="min-h-[34px] px-0.5 text-center font-heavy leading-tight" style={{ color: CREAM, fontSize: width < 100 ? 11 : 13 }}>{verdict ?? '……'}</span>
        <span className="font-cond text-[8px] tracking-[0.3em]" style={{ color: 'rgba(236,247,255,0.45)' }}>MASKARIA</span>
      </span>
    </span>
  );
}

function ReadingBlock({ label, en, children, delay = 0 }: { label: string; en: string; children: React.ReactNode; delay?: number }) {
  const low = useLowMotion();
  return (
    <motion.div initial={{ opacity: 0, y: low ? 0 : 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: low ? 0 : delay, duration: 0.3 }} className="relative pt-3">
      <span className="absolute left-5 top-0 z-10 flex items-baseline gap-1.5 px-3 py-1 font-heavy text-[13px]" style={{ background: P3R.blue, color: P3R.onBlue, clipPath: slantClip(6) }}>{label}<span className="font-cond text-[10px] tracking-[0.18em]">{en}</span></span>
      <div className="px-5 pb-4 pt-5 text-[14px] leading-[1.8]" style={{ background: 'var(--p3r-panel)', color: P3R.ink, clipPath: slantClip(14) }}>{children}</div>
    </motion.div>
  );
}

/** 魔法阵：分段蓄力环（36 格）+ 外圈虚线；locked（蓄满）后慢转 */
function MagicCircle({ progress, locked }: { progress: number; locked: boolean }) {
  const low = useLowMotion();
  return (
    <motion.svg aria-hidden viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 h-full w-full" animate={low || !locked ? undefined : { rotate: 360 }} transition={{ repeat: Infinity, duration: 24, ease: 'linear' }}>
      <circle cx="50" cy="50" r="49" fill="none" stroke="rgba(111,154,255,0.25)" strokeWidth="0.6" strokeDasharray="1.5 2.5" />
      <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(255,211,107,0.25)" strokeWidth="0.5" />
      {Array.from({ length: 36 }, (_, i) => {
        const a = (i / 36) * Math.PI * 2 - Math.PI / 2; const lit = i / 36 < progress;
        return <line key={`mc${i}`} x1={50 + Math.cos(a) * 41} y1={50 + Math.sin(a) * 41} x2={50 + Math.cos(a) * 47} y2={50 + Math.sin(a) * 47} stroke={lit ? '#6f9aff' : 'rgba(111,154,255,0.18)'} strokeWidth="2.2" />;
      })}
    </motion.svg>
  );
}

/** 蓄力时气泡 / 光点自下而上浮起（transform-only） */
function RisingMotes({ intensity }: { intensity: number }) {
  const motes = useMemo(() => Array.from({ length: 10 }, (_, i) => ({ x: 12 + ((i * 37) % 76), d: 1.4 + (i % 4) * 0.3, delay: (i * 0.17) % 1.2, s: 4 + (i % 3) * 2 })), []);
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden" style={{ opacity: 0.4 + intensity * 0.6 }}>
      {motes.map((m, i) => (
        <motion.span key={`mt${i}`} className="absolute bottom-[10%] block" style={{ left: `${m.x}%`, width: m.s, height: m.s, background: i % 2 ? '#ffd36b' : '#9cbaff', clipPath: 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)' }}
          animate={{ y: [0, -140], opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: m.d, delay: m.delay, ease: 'easeOut' }} />
      ))}
    </div>
  );
}

export function GlimpseRitual({ open, onClose, mode = 'new', initialStage, fail, autoHold, aiStart }: { open: boolean; onClose: () => void; mode?: 'new' | 'review'; initialStage?: RitualStage; fail?: AIFail; autoHold?: boolean; aiStart?: AIPhase }) {
  const low = useLowMotion();
  useScrollLock(open);
  useEscape(open, onClose);
  return (
    <Portal>
      <AnimatePresence>
        {open && <RitualBody key="fate" onClose={onClose} mode={mode} initialStage={initialStage} fail={fail} autoHold={autoHold} low={low} aiStart={aiStart} />}
      </AnimatePresence>
    </Portal>
  );
}

function RitualBody({ onClose, mode, initialStage, fail, autoHold, low, aiStart }: { onClose: () => void; mode: 'new' | 'review'; initialStage?: RitualStage; fail?: AIFail; autoHold?: boolean; low: boolean; aiStart?: AIPhase }) {
  const glimpse = LAST_GLIMPSE;
  const days = WINDOW_DAYS.map((d) => d.drawn!).filter(Boolean);
  const start: RitualStage = mode === 'review' ? 'revealed' : initialStage ?? 'gather';
  const [stage, setStage] = useState<RitualStage>(start);
  const [offline, setOffline] = useState(fail === 'offline');
  const [burst, setBurst] = useState(false);
  const aiInit: AIPhase = mode === 'review' ? 'done' : aiStart ?? 'idle';
  const ai = useAIStream({ text: glimpse.summary, fail, failAt: 0.42, initialPhase: aiInit, cps: 36 });
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); };

  useEffect(() => {
    if (stage === 'gather') later(() => setStage('await'), low ? 100 : 1150);
    if (stage === 'flipping' && low) later(() => setStage('revealed'), 150);
    if (stage === 'revealed' && ai.phase === 'idle') later(() => ai.start(), low ? 0 : 650);
  }, [stage]); // eslint-disable-line react-hooks/exhaustive-deps

  const onCharged = useCallback(() => { setBurst(true); setStage('flipping'); }, []);
  const endBurst = useCallback(() => setBurst(false), []);
  const hold = useHold(low ? 600 : 2200, onCharged, stage === 'await');
  // 自动蓄力（演出连播 / ?demo=1）：模拟按住
  const [auto, setAuto] = useState(0);
  useEffect(() => {
    if (!autoHold || stage !== 'await') return;
    const t0 = performance.now(); let raf = 0;
    const D = low ? 600 : 2200;
    const run = () => { const p = Math.min(1, (performance.now() - t0 - 400) / D); setAuto(Math.max(0, p)); if (p >= 1) { onCharged(); return; } raf = requestAnimationFrame(run); };
    raf = requestAnimationFrame(run);
    return () => cancelAnimationFrame(raf);
  }, [autoHold, stage, low, onCharged]);
  const progress = stage === 'await' ? Math.max(hold.progress, auto) : stage === 'gather' ? 0 : 1;
  const revealed = stage === 'revealed';
  const thinking = revealed && ai.phase === 'thinking';
  const prog = useFakeProgress(thinking, 2400);
  const pending = revealed && (ai.phase === 'idle' || ai.phase === 'thinking');
  const failed = ai.phase === 'error' || ai.phase === 'truncated';
  const done = ai.phase === 'done';
  const cw = revealed ? 108 : 126;
  const top = days.slice(0, 4), bottom = days.slice(4, 7);

  return (
    <motion.div role="dialog" aria-modal="true" aria-label="窥探命运" className="fixed inset-0 overflow-y-auto overscroll-contain" style={{ zIndex: 'var(--p3r-z-sheet)' as unknown as number, background: STAGE_BG }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.24 }}>
      {/* 背景：幽灵大字 + 斜色带 */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-10 top-[12%] h-24 w-[140%] -rotate-[12deg]" style={{ background: 'linear-gradient(90deg, rgba(111,154,255,0.0), rgba(111,154,255,0.16), rgba(166,237,255,0.1), rgba(111,154,255,0))' }} />
        <div className="absolute -right-6 bottom-[8%] select-none font-cond text-[clamp(70px,24vw,170px)] uppercase leading-none" style={{ color: 'rgba(111,154,255,0.07)', transform: 'rotate(-12deg)' }}>FATE</div>
      </div>
      <button type="button" onClick={onClose} aria-label="关闭" className="fixed right-4 z-20 flex h-10 w-10 items-center justify-center text-[18px] font-black" style={{ top: 'calc(env(safe-area-inset-top, 0px) + 12px)', color: CREAM, background: 'rgba(111,154,255,0.22)', clipPath: slantClip(6) }}>✕</button>

      <div className="relative mx-auto flex min-h-full w-full max-w-md flex-col items-center px-4 pb-10" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 40px)' }}>
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-1 text-center">
          <div className="font-heavy text-[22px] tracking-[0.5em]" style={{ color: CREAM }}>窥探命运</div>
          <div className="mt-1 font-cond text-[11px] tracking-[0.3em]" style={{ color: 'rgba(156,186,255,0.75)' }}>SEVEN STARS · ONE THREAD</div>
        </motion.div>
        <div className="mb-3 h-4 text-[12px] font-bold" style={{ color: CREAM_SOFT }} aria-live="polite">
          {stage === 'gather' && '七日的牌正在聚拢……'}
          {stage === 'await' && (progress > 0.04 ? '别松手——命运正在显形' : '长按中央的命运之牌')}
          {stage === 'flipping' && '……'}
          {revealed && (pending ? '命运正在凝聚成文字……' : ' ')}
        </div>

        <motion.div animate={{ scale: revealed ? 0.86 : 1 }} transition={{ type: 'spring', damping: 22, stiffness: 180 }} className="relative flex flex-col items-center">
          <div className="flex items-center justify-center gap-2">{top.map((d, i) => <SpreadCard key={d.id} d={d} index={i} charged={progress} low={low} />)}</div>
          <div className="relative my-2 flex items-center justify-center" style={{ width: 240, height: 216 }}>
            <MagicCircle progress={mode === 'review' ? 1 : progress} locked={stage !== 'gather' && stage !== 'await'} />
            {!low && stage === 'await' && progress > 0.05 && <RisingMotes intensity={progress} />}
            <div style={{ perspective: 1100 }} className="relative z-10">
              <motion.div {...hold.handlers} role={stage === 'await' ? 'button' : undefined} tabIndex={stage === 'await' ? 0 : -1} aria-label={stage === 'await' ? '长按中央的命运之牌' : '命运之牌'}
                initial={{ rotateY: 0, scale: 1 }} animate={{ rotateY: low ? 0 : stage === 'flipping' || revealed ? 180 : 0, scale: stage === 'await' && progress > 0 ? 1 + progress * 0.06 : 1 }}
                transition={{ rotateY: { duration: 0.85, ease: 'easeInOut' }, scale: { duration: 0.1 } }}
                onAnimationComplete={() => { if (stage === 'flipping') setStage('revealed'); }}
                style={{ transformStyle: 'preserve-3d', width: cw, height: cardH(cw) }}
                className={stage === 'await' ? 'relative cursor-pointer touch-none select-none' : 'relative select-none'}>
                {low ? (revealed ? <FateCardFace verdict={glimpse.verdict} width={cw} /> : <PinkBack width={cw} />) : (
                  <>
                    <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden' }}>
                      <span aria-hidden className="absolute -inset-3 rounded-[18px]" style={{ background: 'rgba(111,154,255,0.35)', opacity: progress, transform: `scale(${0.92 + progress * 0.12})` }} />
                      <PinkBack width={cw} />
                    </div>
                    <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}><FateCardFace verdict={revealed || stage === 'flipping' ? glimpse.verdict : null} width={cw} /></div>
                  </>
                )}
              </motion.div>
            </div>
            <BubbleBurst active={burst} onDone={endBurst} />
          </div>
          <div className="flex items-center justify-center gap-2">{bottom.map((d, i) => <SpreadCard key={d.id} d={d} index={i + 4} charged={progress} low={low} />)}</div>
        </motion.div>

        <AnimatePresence>
          {revealed && (
            <motion.div initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: low ? 0 : 0.15, duration: 0.5, ease: [0.16, 1, 0.3, 1] }} className="mt-4 w-full space-y-3">
              {pending && (
                <div className="flex justify-center py-3" style={{ background: 'rgba(111,154,255,0.08)', clipPath: slantClip(14) }}>
                  <ThinkingCircle variant="spokes" progress={prog} size={136} label={prog < 0.6 ? '七张牌正在被逐一推演' : '七张牌的线索正在汇成一段命运'} showPercent />
                </div>
              )}
              {ai.phase === 'streaming' && (
                <>
                  <ReadingBlock label="总结" en="RETROSPECT"><AIText ai={ai} className="text-[14px]" /></ReadingBlock>
                  <div className="flex items-center justify-center gap-2 py-1 text-[12px] font-bold" style={{ color: CREAM_SOFT }}>
                    <motion.span aria-hidden animate={low ? undefined : { rotate: 360 }} transition={{ repeat: Infinity, duration: 1.4, ease: 'linear' }} style={{ color: 'var(--p3r-gold)' }}>✦</motion.span>命运仍在落笔……
                  </div>
                </>
              )}
              {failed && (
                <>
                  {ai.text && <ReadingBlock label="总结" en="RETROSPECT"><div className="whitespace-pre-wrap">{ai.text}…</div></ReadingBlock>}
                  <div className="px-4 py-3.5" style={{ background: 'rgba(236,247,255,0.08)', boxShadow: 'inset 3px 0 0 #e8283c', clipPath: slantClip(12) }}>
                    <p className="whitespace-pre-wrap text-[12.5px] font-bold leading-relaxed" style={{ color: '#9cdeff' }}>
                      {ai.phase === 'truncated' ? '命运写到一半停住了——已经写下的部分都留着，可以让它从断处接着写。' : offline ? '当前离线：七张牌的推演连不上解读服务。' : `解读失败：${ai.error?.message ?? '连接超时'}`}
                    </p>
                    <div className="mt-3 flex gap-2">
                      {ai.phase === 'truncated' && <button type="button" onClick={() => ai.resume()} className="min-w-0 flex-1 py-2.5 text-[13px] font-black" style={{ background: P3R.blue, color: P3R.onBlue, clipPath: slantClip(8) }}>接着写</button>}
                      <button type="button" onClick={() => ai.start()} className="min-w-0 flex-1 py-2.5 text-[13px] font-black" style={ai.phase === 'truncated' ? { background: 'rgba(236,247,255,0.12)', color: CREAM, clipPath: slantClip(8) } : { background: P3R.blue, color: P3R.onBlue, clipPath: slantClip(8) }}>{ai.phase === 'truncated' ? '重新解读' : '重试 AI 解读'}</button>
                      <button type="button" onClick={() => { setOffline(true); ai.skip(); }} className="min-w-0 flex-1 py-2.5 text-[13px] font-black" style={{ background: 'rgba(236,247,255,0.12)', color: CREAM, clipPath: slantClip(8) }}>使用离线兜底</button>
                    </div>
                  </div>
                </>
              )}
              {done && (
                <>
                  <ReadingBlock label="总结" en="RETROSPECT" delay={0}>{glimpse.summary}</ReadingBlock>
                  <ReadingBlock label="展望" en="OUTLOOK" delay={0.12}>{glimpse.outlook}</ReadingBlock>
                  <ReadingBlock label="建议" en="GUIDANCE" delay={0.24}><div className="whitespace-pre-line">{glimpse.advice}</div></ReadingBlock>
                  <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: low ? 0 : 0.4 }} className="relative overflow-hidden px-5 py-3.5" style={{ background: 'linear-gradient(120deg, rgba(255,211,107,0.22), rgba(111,154,255,0.16))', clipPath: slantClip(14) }}>
                    <div className="flex items-center gap-2">
                      <span aria-hidden style={{ color: 'var(--p3r-gold)' }}>✦</span>
                      <span className="font-heavy text-[13px] tracking-[0.14em]" style={{ color: CREAM }}>命运的祝福 · 三日</span>
                      {offline && <span className="px-1.5 py-0.5 text-[10px] font-black" style={{ color: CREAM, background: 'rgba(236,247,255,0.16)', clipPath: slantClip(3) }}>离线</span>}
                    </div>
                    <p className="mt-1.5 text-[12px] leading-relaxed" style={{ color: 'rgba(236,247,255,0.88)' }}>逆影战场伤害 <b style={{ color: 'var(--p3r-gold)' }}>+10%</b> · 每日首次记录，最高的那项属性加点额外 <b style={{ color: 'var(--p3r-gold)' }}>+1</b></p>
                  </motion.div>
                  <div className="flex justify-center pt-1"><P3Button size="lg" corner onClick={onClose}>收下命运的低语</P3Button></div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function SpreadCard({ d, index, charged, low }: { d: DailyDivination; index: number; charged: number; low: boolean }) {
  const rot = [-5, -2, 2, 5, -4, 0, 4][index % 7];
  return (
    <motion.div initial={low ? false : { opacity: 0, y: index < 4 ? -60 : 60, rotate: rot * 3, scale: 0.6 }} animate={{ opacity: 1, y: 0, rotate: rot, scale: 1 }}
      transition={{ delay: low ? 0 : 0.1 + index * 0.09, type: 'spring', damping: 16, stiffness: 160 }} className="relative">
      {charged > 0 && <span aria-hidden className="absolute -inset-[3px]" style={{ background: 'rgba(111,154,255,0.55)', opacity: charged, clipPath: chamferClip(12, 12) }} />}
      <Arcana id={d.cardId} orientation={d.orientation} width={56} tag={false} />
    </motion.div>
  );
}

// ───────────────────────── Harness 默认导出 ─────────────────────────
export function DayReview({ open, onClose, params }: OverlayProps) {
  const i = Number(params?.get('day') ?? 4);
  const d = WINDOW_DAYS[Math.max(0, Math.min(6, Number.isFinite(i) ? i : 4))].drawn ?? WINDOW_DAYS[6].drawn;
  return <DayReviewSheet d={d} open={open} onClose={onClose} />;
}

const STATE_MAP: Record<string, { stage: RitualStage; fail?: AIFail; ai?: AIPhase }> = {
  gather: { stage: 'gather' }, await: { stage: 'await' }, flipping: { stage: 'flipping' },
  pending: { stage: 'revealed', ai: 'idle' }, revealed: { stage: 'revealed', ai: 'done' },
  error: { stage: 'revealed', fail: 'truncate', ai: 'truncated' }, offline: { stage: 'revealed', fail: 'offline', ai: 'error' },
};

export default function GlimpseFlow({ open, onClose, params }: OverlayProps) {
  const st = params?.get('state') ?? 'gather';
  const m = STATE_MAP[st] ?? STATE_MAP.gather;
  const review = params?.get('view') === 'review';
  const autoHold = params?.get('__reel') === '1' || params?.get('demo') === '1';
  return <GlimpseRitual open={open} onClose={onClose} mode={review ? 'review' : 'new'} initialStage={m.stage} fail={m.fail} aiStart={m.ai} autoHold={autoHold} />;
}
