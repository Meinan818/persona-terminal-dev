/**
 * 工作包 4 · 塔罗共用件（粉白 P3R 皮）——逻辑改写自黄色版 pkg4/tarot.tsx，时序以真实 src/components/astrology/* 为准：
 *   <Arcana id orientation width offline />   牌面：粉套大阿卡纳仓库无图 → kit TarotFace 程序卡面（罗马数 + 牌名 + 八芒星）
 *   <PinkBack width selected />                卡背：真实 CardBack.tsx skin==='pink'（玫红渐变 + 斜亮带 + 白细框四角斜切 + 双环 + 细长四角星）
 *   <FlipCard flipped front back width />      rotateY 翻面（真实 FlipReveal 0.7s easeInOut；低动效瞬切）
 *   <ShuffleDeck duration onComplete />        真实 ShuffleAnim：前 70% 五张交错 0.9s×repeat1 → 后 30% 收成一叠停住（定长，不循环）
 *   <CardNameReveal />                         真实 CardNameReveal p3 皮：逐字 spring 460/24 每字 .07s → 逆位珊瑚签 → 高光横扫 → 英文名
 *   <ThinkingCircle progress variant />        真实 ThinkingCircle：spokes / hexagram / pentagram 三种阵图按进度生长
 *   useHold(ms, onDone)                        长按蓄力（pointer / 键盘）
 *   useFakeProgress(running, ms)               思维链预估进度 0→1
 *   <Markdownish text />                       ### 小标题 / **粗体** / 段落
 */
import { motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { TarotOrientation } from '@real/types';
import { ArcanaFace, PinkBack, P3R, slantClip, cardH } from '@pink/kit';
import { useLowMotion } from '@pink/lib/prefs';
import { cx } from '@pink/lib/cx';
import { TAROT_BY_ID } from '@pink/mock/pkg4-tarot';

/** 与 kit TarotFace 同比例（1.66），卡背 / 翻面容器一律用它，翻面不跳尺寸 */
export { cardH } from '@pink/kit';

/** 大阿卡纳牌面：kit ArcanaFace（按 id 查 mock） */
export function Arcana({ id, orientation = 'upright', width = 96, offline, glow, className, tag = true }: { id: string; orientation?: TarotOrientation; width?: number; offline?: boolean; glow?: boolean; className?: string; tag?: boolean }) {
  const c = TAROT_BY_ID[id];
  return <ArcanaFace name={c?.name} number={c?.number} roman={c?.roman} nameEn={c?.nameEn} orientation={orientation} width={width} offline={offline} glow={glow} className={className} tag={tag} />;
}
export { PinkBack };

export function FlipCard({ flipped, front, back, width, onClick, className, ariaLabel, duration = 0.7 }: { flipped: boolean; front: ReactNode; back: ReactNode; width: number; onClick?: () => void; className?: string; ariaLabel?: string; duration?: number }) {
  const low = useLowMotion();
  const h = cardH(width);
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag type={onClick ? 'button' : undefined} onClick={onClick} aria-label={ariaLabel} className={cx('relative shrink-0', className)} style={{ width, height: h, perspective: 1200 }}>
      {low ? (
        <motion.div key={flipped ? 'f' : 'b'} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.16 }}>{flipped ? front : back}</motion.div>
      ) : (
        <motion.div className="absolute inset-0" style={{ transformStyle: 'preserve-3d' }} initial={false} animate={{ rotateY: flipped ? 180 : 0 }} transition={{ duration, ease: 'easeInOut' }}>
          <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden' }}>{back}</div>
          <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>{front}</div>
        </motion.div>
      )}
    </Tag>
  );
}

/**
 * 洗牌（真实 ShuffleAnim）：shuffle（duration×0.7，五张左右交错 x:[0,o·60,o·-40,0] 0.9s × repeat 1）→ stack（收成一叠 0.4s 停住）→ onComplete。
 * 只播一次（定长），回调后停在 stack 态。低动效：直接一叠 + 600ms 后回调。
 */
export function ShuffleDeck({ duration = 1800, cardWidth = 92, onComplete, onStage, replay = 0 }: { duration?: number; cardWidth?: number; onComplete?: () => void; onStage?: (s: 'shuffle' | 'stack' | 'done') => void; replay?: number }) {
  const low = useLowMotion();
  const [phase, setPhase] = useState<'shuffle' | 'stack' | 'done'>(low ? 'stack' : 'shuffle');
  const cb = useRef(onComplete); cb.current = onComplete;
  const sb = useRef(onStage); sb.current = onStage;
  useEffect(() => {
    const D = low ? 600 : duration;
    setPhase(low ? 'stack' : 'shuffle'); sb.current?.(low ? 'stack' : 'shuffle');
    const shuffleMs = Math.floor(D * 0.7);
    const t1 = window.setTimeout(() => { setPhase('stack'); sb.current?.('stack'); }, low ? 0 : shuffleMs);
    const t2 = window.setTimeout(() => { setPhase('done'); sb.current?.('done'); cb.current?.(); }, D);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [duration, low, replay]);
  const N = 5;
  const spread = Math.min(60, cardWidth * 0.62);
  return (
    <div className="relative flex w-full items-center justify-center" style={{ height: Math.round(cardWidth * 1.8) }} aria-label="正在洗牌" role="img">
      {Array.from({ length: N }).map((_, i) => {
        const o = i - (N - 1) / 2;
        return (
          <motion.div key={`sh-${replay}-${i}`} className="absolute" style={{ zIndex: i }}
            initial={{ x: 0, y: 0, rotate: 0, scale: 0.92 }}
            animate={phase === 'shuffle'
              ? { x: [0, o * spread, o * -spread * 0.66, 0], y: [0, -10, 8, 0], rotate: [0, o * 8, o * -6, 0], scale: 0.92 }
              : { x: o * 1.5, y: o * -1.5, rotate: o * 0.6, scale: 0.96 }}
            transition={low ? { duration: 0 } : { duration: phase === 'shuffle' ? 0.9 : 0.4, repeat: phase === 'shuffle' ? 1 : 0, ease: 'easeInOut' }}>
            <PinkBack width={cardWidth} />
          </motion.div>
        );
      })}
    </div>
  );
}

/** 牌名揭晓（真实 CardNameReveal p3 皮：墨 = blueDeep，签 = magenta 白字，圆角 3） */
export function CardNameReveal({ name, nameEn, reversed, delay = 0, size = 34 }: { name: string; nameEn?: string; reversed: boolean; delay?: number; size?: number }) {
  const low = useLowMotion();
  const chars = Array.from(name);
  const end = delay + chars.length * 0.07;
  return (
    <div className="relative flex min-w-0 max-w-full flex-col items-center gap-1.5 px-3 text-center">
      <div className="relative flex max-w-full flex-wrap items-center justify-center overflow-hidden px-1 py-1">
        <h3 className="relative flex flex-wrap items-baseline justify-center font-heavy leading-none tracking-[0.04em]" style={{ color: P3R.blueDeep, fontSize: `clamp(26px, 8.5vw, ${size}px)` }}>
          {chars.map((ch, i) => (
            <motion.span key={`cn-${i}`} className="inline-block" initial={low ? false : { y: 26, opacity: 0, scale: 0.7 }} animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 460, damping: 24, delay: delay + i * 0.07 }}>{ch}</motion.span>
          ))}
        </h3>
        {reversed && (
          <motion.span className="ml-2 inline-flex shrink-0 items-center self-center px-2.5 py-1 text-[14px] font-black leading-none" style={{ background: P3R.magenta, color: '#fff', borderRadius: 3 }}
            initial={low ? false : { scale: 0, rotate: -18 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 480, damping: 18, delay: end + 0.12 }}>· 逆位</motion.span>
        )}
        {!low && (
          <motion.span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-[46%]" style={{ background: 'linear-gradient(100deg, transparent, rgba(255,255,255,0.6), transparent)' }}
            initial={{ x: '-110%', opacity: 0 }} animate={{ x: '240%', opacity: [0, 1, 0] }} transition={{ duration: 0.8, delay: end + 0.05, ease: 'easeInOut' }} />
        )}
      </div>
      {nameEn && (
        <motion.span className="font-cond text-[12px] uppercase tracking-[0.22em]" style={{ color: P3R.grey }}
          initial={low ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: end + 0.2 }}>{nameEn}</motion.span>
      )}
    </div>
  );
}

/* ───────────── ThinkingCircle（真实 ThinkingCircle.tsx 几何 1:1，颜色走 --p3r-blue） ───────────── */
const fourStar = (cx: number, cy: number, r: number) => {
  const k = r * 0.32;
  return `M${cx} ${cy - r} C${cx + k * 0.3} ${cy - k} ${cx + k} ${cy - k * 0.3} ${cx + r} ${cy} C${cx + k} ${cy + k * 0.3} ${cx + k * 0.3} ${cy + k} ${cx} ${cy + r} C${cx - k * 0.3} ${cy + k} ${cx - k} ${cy + k * 0.3} ${cx - r} ${cy} C${cx - k} ${cy - k * 0.3} ${cx - k * 0.3} ${cy - k} ${cx} ${cy - r}Z`;
};
const c01 = (v: number) => Math.max(0, Math.min(1, v));
const mix = (a: number) => `color-mix(in srgb, var(--p3r-blue) ${Math.round(a * 100)}%, transparent)`;

export function ThinkingCircle({ progress, size = 124, label, showPercent = true, variant = 'pentagram' }: { progress: number; size?: number; label?: string; showPercent?: boolean; variant?: 'spokes' | 'hexagram' | 'pentagram' }) {
  const low = useLowMotion();
  const p = c01(Number.isFinite(progress) ? progress : 0);
  const c = size / 2, R = size * 0.46, circ = 2 * Math.PI * R;
  const color = 'var(--p3r-blue)';
  const rH = size * 0.34;
  const star = variant !== 'spokes';
  const ticks = Array.from({ length: 24 }, (_, i) => (i / 24) * Math.PI * 2);
  const pt = (deg: number) => [c + Math.cos((deg * Math.PI) / 180) * rH, c + Math.sin((deg * Math.PI) / 180) * rH] as const;
  const hexEdges = (() => { const up = [pt(-90), pt(30), pt(150)], dn = [pt(90), pt(210), pt(330)]; const tri = (v: (readonly [number, number])[]) => [0, 1, 2].map((i) => [v[i], v[(i + 1) % 3]] as const); return [...tri(up), ...tri(dn)]; })();
  const pentaEdges = (() => { const v = [0, 1, 2, 3, 4].map((k) => pt(-90 + k * 72)); const o = [0, 2, 4, 1, 3, 0]; return o.slice(0, 5).map((f, i) => [v[f], v[o[i + 1]]] as const); })();
  const edges = variant === 'hexagram' ? hexEdges : pentaEdges;
  const edgeLen = variant === 'hexagram' ? 2 * rH * Math.sin(Math.PI / 3) : 2 * rH * Math.sin((2 * Math.PI) / 5);
  const rIn = size * 0.14, rOut = size * 0.36, spokeLen = rOut - rIn;
  const sa = (i: number) => (i / 8) * Math.PI * 2 - Math.PI / 2;
  const sf = (i: number) => c01(p * 8 - i);
  return (
    <div className="flex flex-col items-center gap-1.5" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(p * 100)} aria-label={label ?? '推演中'}>
      <div className="relative" style={{ width: size, height: size }}>
        {/* 光晕：随进度变亮（实心圆 + opacity，不用大面积 blur） */}
        <span aria-hidden className="absolute inset-[8%] rounded-full" style={{ background: mix(0.14), opacity: 0.35 + p * 0.65, transform: `scale(${0.9 + p * 0.16})` }} />
        <motion.svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden className="relative"
          animate={low ? undefined : { rotate: 360 }} transition={low ? undefined : { repeat: Infinity, duration: 28, ease: 'linear' }}
          style={{ scale: star ? 0.72 + p * 0.28 : 1 }}>
          <circle cx={c} cy={c} r={R} fill="none" stroke={mix(0.18)} strokeWidth={1.5} />
          <circle cx={c} cy={c} r={R} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeDasharray={`${p * circ} ${circ}`} transform={`rotate(-90 ${c} ${c})`} />
          {ticks.map((a, i) => { const major = i % 6 === 0; const r1 = R - 7, r2 = R - (major ? 15 : 11); return <line key={`t${i}`} x1={c + Math.cos(a) * r1} y1={c + Math.sin(a) * r1} x2={c + Math.cos(a) * r2} y2={c + Math.sin(a) * r2} stroke={i / 24 <= p ? color : mix(0.25)} strokeWidth={major ? 2 : 1} />; })}
          {star ? edges.map(([a, b], k) => {
            const f = c01((p / 0.9) * edges.length - k);
            return <line key={`e${k}`} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeDasharray={edgeLen} strokeDashoffset={edgeLen * (1 - f)} opacity={0.3 + f * 0.7} />;
          }) : (
            <>
              <circle cx={c} cy={c} r={size * 0.3} fill="none" stroke={mix(0.5)} strokeWidth={1} strokeDasharray="3 6" />
              {Array.from({ length: 8 }, (_, i) => { const a = sa(i), f = sf(i); return <line key={`s${i}`} x1={c + Math.cos(a) * rIn} y1={c + Math.sin(a) * rIn} x2={c + Math.cos(a) * rOut} y2={c + Math.sin(a) * rOut} stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeDasharray={spokeLen} strokeDashoffset={spokeLen * (1 - f)} opacity={0.35 + f * 0.65} />; })}
              {Array.from({ length: 8 }, (_, i) => { const j = (i + 1) % 8; if (sf(i) < 1 || sf(j) < 1) return null; return <line key={`c${i}`} x1={c + Math.cos(sa(i)) * rOut} y1={c + Math.sin(sa(i)) * rOut} x2={c + Math.cos(sa(j)) * rOut} y2={c + Math.sin(sa(j)) * rOut} stroke={mix(0.7)} strokeWidth={1} />; })}
            </>
          )}
          {variant !== 'pentagram' && (
            <motion.path d={fourStar(c, c, size * (variant === 'hexagram' ? 0.07 : 0.085))} fill={color} initial={false}
              animate={low ? { opacity: 0.5 + p * 0.5 } : { opacity: [0.45 + p * 0.4, 0.7 + p * 0.3, 0.45 + p * 0.4] }} transition={low ? undefined : { repeat: Infinity, duration: 1.8, ease: 'easeInOut' }} />
          )}
        </motion.svg>
      </div>
      {(label || showPercent) && (
        <div className="text-[12px] font-black tabular-nums" style={{ color: P3R.roseInk }}>
          {label}{label && showPercent ? ' · ' : ''}{showPercent ? `${Math.round(p * 100)}%` : ''}
        </div>
      )}
    </div>
  );
}

/** 长按蓄力：progress 0..1 + 挂到元素上的 pointer / 键盘事件；蓄满调用 onDone（一次） */
export function useHold(ms: number, onDone: () => void, enabled = true) {
  const [progress, setProgress] = useState(0);
  const raf = useRef(0);
  const start = useRef(0);
  const done = useRef(false);
  const cb = useRef(onDone); cb.current = onDone;
  const stop = useCallback(() => { cancelAnimationFrame(raf.current); if (!done.current) setProgress(0); }, []);
  const tick = useCallback(() => {
    const p = Math.min(1, (performance.now() - start.current) / ms);
    setProgress(p);
    if (p >= 1) { done.current = true; cb.current(); return; }
    raf.current = requestAnimationFrame(tick);
  }, [ms]);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  const begin = () => { if (done.current) return; cancelAnimationFrame(raf.current); start.current = performance.now(); raf.current = requestAnimationFrame(tick); };
  const reset = () => { done.current = false; setProgress(0); };
  const handlers = enabled ? {
    onPointerDown: (e: React.PointerEvent) => { try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* */ } begin(); },
    onPointerUp: () => stop(),
    onPointerCancel: () => stop(),
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    onKeyDown: (e: React.KeyboardEvent) => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) { e.preventDefault(); begin(); } },
    onKeyUp: () => stop(),
  } : {};
  return { progress, handlers, reset };
}

/** 思维链预估进度（真实 useThinkProgress 的演示版）：running 时 0→1 */
export function useFakeProgress(running: boolean, ms = 2400) {
  const [p, setP] = useState(0);
  const low = useLowMotion();
  useEffect(() => {
    if (!running) { setP(0); return; }
    if (low) { setP(1); return; }
    const t0 = performance.now();
    const t = window.setInterval(() => { const v = Math.min(1, (performance.now() - t0) / ms); setP(v); if (v >= 1) clearInterval(t); }, 60);
    return () => clearInterval(t);
  }, [running, ms, low]);
  return p;
}

/** 极简 markdown：### 标题、**粗体**、空行分段 */
export function Markdownish({ text, className }: { text: string; className?: string }) {
  const blocks = text.split(/\n{2,}/);
  const inline = (s: string) => s.split(/(\*\*[^*]+\*\*)/g).map((p, i) => (p.startsWith('**') && p.endsWith('**') ? <b key={`b${i}`} className="font-black" style={{ color: P3R.roseInk }}>{p.slice(2, -2)}</b> : <span key={`s${i}`}>{p}</span>));
  return (
    <div className={cx('min-w-0 space-y-2 text-[14.5px] leading-[1.8]', className)} style={{ color: P3R.ink }}>
      {blocks.map((b, i) => (
        <div key={`blk${i}`} className="min-w-0">
          {b.split('\n').map((l, j) => (l.startsWith('### ') ? (
            <div key={`l${j}`} className="mb-1 mt-1 flex items-center gap-1.5 font-heavy text-[15px]"><span aria-hidden className="inline-block h-[13px] w-[9px] shrink-0" style={{ background: P3R.blue, clipPath: 'polygon(32% 0, 100% 0, 68% 100%, 0 100%)' }} />{l.slice(4)}</div>
          ) : <p key={`l${j}`} className="break-words">{inline(l)}</p>))}
        </div>
      ))}
    </div>
  );
}
