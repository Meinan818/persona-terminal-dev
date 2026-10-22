/**
 * 工作包 4 · 塔罗共用件（P4G 皮）：
 *   <TarotFace id="star" orientation="reversed" width={96} />   牌面（真实黄色牌图，逆位整张倒转 + 「逆位」角标）
 *   <TarotBack width={96} />                                    卡背（黄黑：S.Link 方块 + 中心黑星 + 斜条纹）
 *   <FlipCard flipped front back width />                       rotateY 翻面（低动效：瞬切）
 *   useHold(ms, onDone)                                         长按蓄力（pointer 事件，进度 0..1）
 *   <Markdownish text />                                        ### 小标题 / **粗体** / 段落
 *   <ThinkingTV progress label />                               「思维圈」= 雪花小电视 + 百分比 + 推演中
 */
import { motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { TarotOrientation } from '@real/types';
import { cx } from '@yellow/lib/cx';
import { useLowMotion } from '@yellow/lib/prefs';
import { NoiseLayer } from '@yellow/fx';
import { TAROT_BY_ID, tarotImg } from '@yellow/mock/pkg4-tarot';

export const cardH = (w: number) => Math.round(w * 1.6);

export function TarotFace({ id, orientation = 'upright', width = 96, showTag = true, offline, className, style }: { id: string; orientation?: TarotOrientation; width?: number; showTag?: boolean; offline?: boolean; className?: string; style?: CSSProperties }) {
  const c = TAROT_BY_ID[id];
  const rev = orientation === 'reversed';
  return (
    <div className={cx('relative shrink-0', className)} style={{ width, height: cardH(width), ...style }}>
      <div className="absolute inset-0 overflow-hidden rounded-[6px] border-3 border-p4g-black bg-p4g-black shadow-hard night:border-p4g-yellow night:shadow-[4px_4px_0_var(--p4g-orange)]">
        <img src={tarotImg(id)} alt={c ? `${c.name}${rev ? '（逆位）' : ''}` : ''} draggable={false} className="h-full w-full object-cover" style={{ transform: rev ? 'rotate(180deg)' : undefined }} />
      </div>
      {showTag && rev && width >= 56 && (
        <span className="absolute -left-1.5 top-2 -rotate-6 rounded-xs border-thin border-p4g-black bg-p4g-orange px-1 py-[1px] font-display text-2xs font-bold leading-none text-p4g-black shadow-hard-sm">逆位</span>
      )}
      {offline && width >= 56 && (
        <span className="absolute -right-1.5 top-2 rotate-6 rounded-xs border-thin border-p4g-black bg-white px-1 py-[1px] font-display text-2xs font-bold leading-none text-p4g-black shadow-hard-sm">离线</span>
      )}
    </div>
  );
}

/** 卡背：黄底 + 外黑框 + 内奶油框 + 中心黑底四角星 + 四角黑方块（P4G 菜单方块） */
export function TarotBack({ width = 96, className, glow }: { width?: number; className?: string; glow?: boolean }) {
  const h = cardH(width);
  return (
    <div className={cx('relative shrink-0 overflow-hidden rounded-[6px] border-3 border-p4g-black bg-p4g-yellow shadow-hard night:border-p4g-yellow night:shadow-[4px_4px_0_var(--p4g-orange)]', glow && 'ring-4 ring-p4g-orange', className)} style={{ width, height: h }}>
      <svg viewBox="0 0 100 160" className="absolute inset-0 h-full w-full" aria-hidden preserveAspectRatio="none">
        <rect x="6" y="6" width="88" height="148" rx="4" fill="none" stroke="#111" strokeWidth="2.5" />
        <g fill="#111" opacity=".9">
          {[[12, 12], [80, 12], [12, 140], [80, 140]].map(([x, y], i) => <rect key={i} x={x} y={y} width="8" height="8" rx="1.5" />)}
        </g>
        <g opacity=".22" fill="#111">{Array.from({ length: 9 }, (_, i) => <rect key={i} x={-40 + i * 18} y="0" width="7" height="200" transform="rotate(28 50 80)" />)}</g>
        <circle cx="50" cy="80" r="30" fill="#111" />
        <circle cx="50" cy="80" r="24" fill="none" stroke="#FFE500" strokeWidth="2" />
        <path d="M50 58 C52 74 56 78 72 80 C56 82 52 86 50 102 C48 86 44 82 28 80 C44 78 48 74 50 58Z" fill="#FFE500" />
        <path d="M50 70 C51 77 53 79 60 80 C53 81 51 83 50 90 C49 83 47 81 40 80 C47 79 49 77 50 70Z" fill="#FF5A1F" />
      </svg>
    </div>
  );
}

export function FlipCard({ flipped, front, back, width, onClick, className, ariaLabel }: { flipped: boolean; front: ReactNode; back: ReactNode; width: number; onClick?: () => void; className?: string; ariaLabel?: string }) {
  const low = useLowMotion();
  const h = cardH(width);
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag type={onClick ? 'button' : undefined} onClick={onClick} aria-label={ariaLabel} className={cx('relative shrink-0', className)} style={{ width, height: h, perspective: 900 }}>
      {low ? (
        <div className="absolute inset-0">{flipped ? front : back}</div>
      ) : (
        <motion.div className="absolute inset-0" style={{ transformStyle: 'preserve-3d' }} initial={false} animate={{ rotateY: flipped ? 180 : 0 }} transition={{ duration: 0.55, ease: [0.2, 0.9, 0.1, 1] }}>
          <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden' }}>{back}</div>
          <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>{front}</div>
        </motion.div>
      )}
    </Tag>
  );
}

/** 长按蓄力：返回 progress 0..1 与要挂在元素上的 pointer 事件。蓄满调用 onDone（只一次）。 */
export function useHold(ms: number, onDone: () => void, enabled = true) {
  const [progress, setProgress] = useState(0);
  const raf = useRef(0);
  const start = useRef(0);
  const done = useRef(false);
  const stop = useCallback((reset = true) => { cancelAnimationFrame(raf.current); if (reset && !done.current) setProgress(0); }, []);
  const tick = useCallback(() => {
    const p = Math.min(1, (performance.now() - start.current) / ms);
    setProgress(p);
    if (p >= 1) { done.current = true; onDone(); return; }
    raf.current = requestAnimationFrame(tick);
  }, [ms, onDone]);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  const reset = () => { done.current = false; setProgress(0); };
  const handlers = enabled ? {
    onPointerDown: (e: React.PointerEvent) => { if (done.current) return; try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* */ } start.current = performance.now(); raf.current = requestAnimationFrame(tick); },
    onPointerUp: () => stop(),
    onPointerCancel: () => stop(),
    onPointerLeave: () => stop(),
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    onKeyDown: (e: React.KeyboardEvent) => { if ((e.key === 'Enter' || e.key === ' ') && !done.current && !e.repeat) { e.preventDefault(); start.current = performance.now(); raf.current = requestAnimationFrame(tick); } },
    onKeyUp: () => stop(),
  } : {};
  return { progress, handlers, reset, done: done.current };
}

/** 极简 markdown：### 标题、**粗体**、空行分段 */
export function Markdownish({ text, className }: { text: string; className?: string }) {
  const blocks = text.split(/\n{2,}/);
  const inline = (s: string) => s.split(/(\*\*[^*]+\*\*)/g).map((p, i) => (p.startsWith('**') ? <b key={i} className="font-bold text-p4g-tag night:text-p4g-yellow">{p.slice(2, -2)}</b> : <span key={i}>{p}</span>));
  return (
    <div className={cx('min-w-0 space-y-2 text-body leading-relaxed', className)}>
      {blocks.map((b, i) => {
        const lines = b.split('\n');
        return (
          <div key={i} className="min-w-0">
            {lines.map((l, j) => (l.startsWith('### ') ? (
              <div key={j} className="mb-1 mt-1 flex items-center gap-1.5 font-display text-meta font-bold"><span aria-hidden className="inline-block h-3 w-1.5 -skew-x-12 bg-p4g-orange" />{l.slice(4)}</div>
            ) : <p key={j} className="break-words">{inline(l)}</p>))}
          </div>
        );
      })}
    </div>
  );
}

/** 思维圈（P4G 版）：雪花小电视里一圈分段进度 + 百分比；下方 label + 「推演中」 */
export function ThinkingTV({ progress, label, showPercent = true, size = 108 }: { progress: number; label: string; showPercent?: boolean; size?: number }) {
  const low = useLowMotion();
  const segs = 24;
  const on = Math.round(progress * segs);
  return (
    <div className="flex flex-col items-center gap-2" role="status" aria-live="polite">
      <div className="relative overflow-hidden rounded-lg border-[5px] border-p4g-black bg-[#555] shadow-hard night:border-p4g-yellow" style={{ width: size * 1.35, height: size }}>
        <NoiseLayer animate={!low} opacity={0.75} />
        <svg viewBox="0 0 100 100" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ width: size * 0.82, height: size * 0.82 }} aria-hidden>
          {Array.from({ length: segs }, (_, i) => {
            const a = (i / segs) * Math.PI * 2 - Math.PI / 2;
            const x1 = 50 + Math.cos(a) * 34, y1 = 50 + Math.sin(a) * 34, x2 = 50 + Math.cos(a) * 46, y2 = 50 + Math.sin(a) * 46;
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={i < on ? '#FFE500' : 'rgba(0,0,0,.55)'} strokeWidth="6" strokeLinecap="square" />;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {showPercent && <span className="p4g-num text-h2 leading-none text-white" style={{ textShadow: '2px 2px 0 #000' }}>{Math.round(progress * 100)}%</span>}
          <span className="mt-1 rounded-xs bg-p4g-black px-1.5 font-display text-2xs font-bold text-p4g-yellow">推演中</span>
        </div>
      </div>
      <div className="font-display text-meta font-bold text-[color:var(--p4g-on-stage)]">{label}</div>
    </div>
  );
}

/** 流式打字：把 full 文本按 speed 字/帧吐出（低动效：直接全量） */
export function useTypewriter(full: string, running: boolean, cps = 40) {
  const low = useLowMotion();
  const [n, setN] = useState(0);
  useEffect(() => { setN(0); }, [full]);
  useEffect(() => {
    if (!running) return;
    if (low) { setN(full.length); return; }
    const t = setInterval(() => setN((v) => { if (v >= full.length) { clearInterval(t); return v; } return v + 2; }), 1000 / (cps / 2));
    return () => clearInterval(t);
  }, [running, full, low, cps]);
  return { text: full.slice(0, n), done: n >= full.length };
}

/** 进度计时器（模拟思维链进度 0→1） */
export function useFakeProgress(running: boolean, ms = 2600) {
  const [p, setP] = useState(0);
  useEffect(() => {
    if (!running) { setP(0); return; }
    const t0 = performance.now();
    const t = setInterval(() => { const v = Math.min(1, (performance.now() - t0) / ms); setP(v); if (v >= 1) clearInterval(t); }, 60);
    return () => clearInterval(t);
  }, [running, ms]);
  return p;
}

/**
 * CardNameReveal（真实 src/components/astrology/CardNameReveal.tsx 的 p4 皮）：牌名逐字自下弹入（spring 460/24，每字 .07s）
 * → 逆位「· 逆位」橙签晚半拍旋入 → 一道高光横扫（真实走 left，这里改 translateX）→ 英文名淡入。低动效直接终态。
 * tone='dark' 用在黑色电视屏上（字白），'stage' 用在舞台上（字随 on-stage）。
 */
export function CardNameReveal({ name, nameEn, reversed, delay = 0, tone = 'stage', size = 34 }: { name: string; nameEn?: string; reversed: boolean; delay?: number; tone?: 'stage' | 'dark'; size?: number }) {
  const low = useLowMotion();
  const chars = Array.from(name);
  const ink = tone === 'dark' ? '#fff' : 'var(--p4g-on-stage)';
  const end = delay + chars.length * 0.07;
  return (
    <div className="relative flex min-w-0 flex-col items-center gap-1.5 px-3 text-center">
      <div className="relative flex max-w-full flex-wrap items-center justify-center overflow-hidden px-1">
        <h3 className="relative flex flex-wrap items-baseline justify-center font-display font-bold leading-none tracking-[0.04em]" style={{ color: ink, fontSize: `clamp(24px, 8vw, ${size}px)` }}>
          {chars.map((ch, i) => (
            <motion.span key={i} className="inline-block" initial={low ? false : { y: 26, opacity: 0, scale: 0.7 }} animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 460, damping: 24, delay: delay + i * 0.07 }}>{ch}</motion.span>
          ))}
        </h3>
        {reversed && (
          <motion.span className="ml-2 inline-flex shrink-0 items-center self-center rounded-[8px] border-2 border-p4g-black bg-p4g-orange px-2.5 py-1 font-display text-body font-bold leading-none text-p4g-black"
            initial={low ? false : { scale: 0, rotate: -18 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 480, damping: 18, delay: end + 0.12 }}>· 逆位</motion.span>
        )}
        {!low && (
          <motion.span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-[46%]" style={{ background: 'linear-gradient(100deg, transparent, rgba(255,255,255,0.6), transparent)' }}
            initial={{ x: '-110%', opacity: 0 }} animate={{ x: '240%', opacity: [0, 1, 0] }} transition={{ duration: 0.8, delay: end + 0.05, ease: 'easeInOut' }} />
        )}
      </div>
      {nameEn && (
        <motion.span className="font-display text-2xs font-bold uppercase italic tracking-[0.24em]" style={{ color: tone === 'dark' ? 'var(--p4g-yellow)' : 'var(--p4g-on-stage)' }}
          initial={low ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: end + 0.2 }}>{nameEn}</motion.span>
      )}
    </div>
  );
}
