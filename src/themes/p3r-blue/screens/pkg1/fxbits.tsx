/**
 * 工作包 1 演出共用件（蓝白重配，形制 1:1 真实 p3 分支）：
 *   useAutoClose（真实 utils/useAutoClose）· AutoCloseBar · TriBurst（落地迸溅碎三角）· MusicalNotes（音符雨，粉版单色字形）
 *   ShatterCheckP3（今日完成碎裂勾）· CrestP3（成就解锁纸鹤徽记）· tri / TRI_PATH
 */
import { motion } from 'framer-motion';
import { useEffect, useRef, type CSSProperties } from 'react';

export const TRI_CLIP = 'polygon(30% 0, 100% 0, 70% 100%, 0 100%)';
export const TRI_PATH = 'M2 32 L296 6 L70 74 Z';
/** 浅青两档（替代真实的 #5fd9ec / #8fe4f2 / #7fd8ee 浅青） */
export const LILAC_MID = 'color-mix(in srgb, var(--p3r-cyan) 72%, #ffffff)';
export const LILAC_PALE = 'color-mix(in srgb, var(--p3r-cyan) 48%, #ffffff)';
export const LILAC_DEEP = 'color-mix(in srgb, var(--p3r-cyan) 70%, var(--p3r-blue-deep))';
export const cyanA = (a: number) => `rgb(var(--p3r-cyan-rgb) / ${a})`;
export const roseA = (a: number) => `rgb(var(--p3r-blue-rgb) / ${a})`;

export function useAutoClose(open: boolean, ms: number, onClose: () => void) {
  const cb = useRef(onClose); cb.current = onClose;
  useEffect(() => {
    if (!open || ms <= 0) return;
    const t = window.setTimeout(() => cb.current(), ms);
    return () => clearTimeout(t);
  }, [open, ms]);
}

/** 时间轴：挂载即按 [ms, fn] 执行（真实 HeavyTransition#useTimeline 同法） */
export function useSteps(steps: [number, () => void][], deps: unknown[] = []) {
  const ref = useRef(steps); ref.current = steps;
  useEffect(() => {
    const ids = ref.current.map(([ms, fn]) => window.setTimeout(fn, ms));
    return () => ids.forEach(clearTimeout);
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
}

/** 自动关闭倒计时条（scaleX 退场，真实 CelebrationCutIn 同法） */
export const AutoCloseBar = ({ ms, className, color = 'rgba(255,255,255,0.8)', track = 'rgba(255,255,255,0.2)' }: { ms: number; className?: string; color?: string; track?: string }) => (
  <div aria-hidden className={`absolute z-10 overflow-hidden ${className ?? 'inset-x-0 bottom-0 h-1'}`} style={{ background: track }}>
    <motion.div className="h-full w-full" style={{ background: color, transformOrigin: 'left center' }} initial={{ scaleX: 1 }} animate={{ scaleX: 0 }} transition={{ duration: ms / 1000, ease: 'linear' }} />
  </div>
);

export interface BurstPiece { dx: number; dy: number; rot: number; s: number; c: string; d?: number }
/** 落地迸溅碎三角（真实 CHECK_BURST / CREST_BURST） */
export const TriBurst = ({ pieces, delay, dur = 0.55, step = 0 }: { pieces: BurstPiece[]; delay: number; dur?: number; step?: number }) => (
  <>
    {pieces.map((b, i) => (
      <motion.span key={i} aria-hidden className="pointer-events-none absolute left-1/2 top-1/2"
        style={{ width: b.s, height: b.s, background: b.c, clipPath: 'polygon(50% 0, 100% 100%, 0 100%)' }}
        initial={{ x: 0, y: 0, scale: 0, opacity: 0, rotate: 0 }}
        animate={{ x: b.dx, y: b.dy, scale: 1, opacity: [0, 1, 0], rotate: b.rot }}
        transition={{ duration: dur, delay: delay + (b.d ?? i * step), ease: 'easeOut' }} />
    ))}
  </>
);

/** 音符雨（真实 MusicalNotes：数量随加成，封顶）——粉版用单色字形，不用彩色 emoji */
const NOTE_GLYPHS = ['♪', '♫', '♩', '♬'];
export const MusicalNotes = ({ count, delay = 0.3 }: { count: number; delay?: number }) => {
  const n = Math.min(14, Math.max(3, count));
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: n }).map((_, i) => {
        const left = ((i * 37 + 11) % 90) + 5;
        const dur = 1.8 + (i % 4) * 0.35;
        const c = i % 3 === 0 ? 'var(--p3r-cream)' : i % 3 === 1 ? 'var(--bk-bubble-a)' : LILAC_PALE;
        return (
          <motion.span key={i} className="absolute bottom-[-30px] font-black" style={{ left: `${left}%`, fontSize: 18 + (i % 3) * 6, color: c, textShadow: '0 2px 0 rgba(13,22,42,0.35)' }}
            initial={{ y: 0, opacity: 0, rotate: -10 }}
            animate={{ y: -(260 + (i % 5) * 70), opacity: [0, 1, 1, 0], rotate: (i % 2 ? 1 : -1) * 18, x: (i % 2 ? 1 : -1) * (10 + (i % 3) * 8) }}
            transition={{ duration: dur, delay: delay + (i % 6) * 0.12, ease: 'easeOut' }}>
            {NOTE_GLYPHS[i % 4]}
          </motion.span>
        );
      })}
    </div>
  );
};

/** 巨大碎裂勾（p3-modal-06 稿右侧主视觉；青 → 青，蓝 → 蓝） */
export const ShatterCheckP3 = ({ className = 'w-[148px]' }: { className?: string }) => (
  <svg viewBox="0 0 210 176" className={className} aria-hidden>
    <polygon points="26,98 60,84 94,130 76,152 42,118" fill="var(--p3r-cyan)" />
    <polygon points="76,152 94,130 182,20 202,44 98,164" fill={LILAC_MID} />
    <polygon points="94,130 182,20 160,14 88,110" fill={LILAC_PALE} />
    <polygon points="186,6 202,0 196,22" fill="var(--p3r-cyan)" />
    <polygon points="16,82 32,72 28,94" fill={LILAC_PALE} />
    <polygon points="106,164 122,154 114,176" fill="var(--p3r-blue)" opacity="0.55" />
    <polygon points="200,54 210,48 206,64" fill={LILAC_PALE} opacity="0.8" />
  </svg>
);

/** 纸鹤徽记（p3-modal-07 面板顶部三角拼贴） */
export const CrestP3 = ({ className = 'w-[108px]' }: { className?: string }) => (
  <svg viewBox="0 0 150 110" className={className} aria-hidden>
    <polygon points="46,72 108,10 96,84" fill="var(--p3r-cyan)" />
    <polygon points="46,72 96,84 60,102" fill={LILAC_DEEP} />
    <polygon points="108,10 118,64 96,84" fill={LILAC_PALE} />
    <polygon points="96,84 132,70 122,92" fill="var(--p3r-magenta)" />
    <polygon points="28,80 44,74 38,92" fill={LILAC_PALE} />
  </svg>
);

/** 洋红（臂章红）双片 */
export const TwinTicks = ({ style }: { style?: CSSProperties }) => (
  <span aria-hidden className="mb-1 flex gap-[3px]" style={style}>
    <span className="h-[10px] w-[12px]" style={{ background: 'var(--p3r-magenta)', clipPath: TRI_CLIP }} />
    <span className="h-[8px] w-[9px]" style={{ background: 'var(--p3r-magenta)', clipPath: TRI_CLIP }} />
  </span>
);

/** 演示用：阶段 / 变体胶囊（演出右上角的小标，aria-hidden 不抢读屏）——低调地告诉看演出的人当前在哪一段 */
export const StageChip = ({ text }: { text: string }) => (
  <span aria-hidden className="pointer-events-none fixed left-2 top-[calc(8px+env(safe-area-inset-top))] font-cond text-[11px] tracking-[0.2em]" style={{ zIndex: 'var(--p3r-z-dev)' as unknown as number, color: 'var(--bk-bubble-b)', background: 'var(--p3r-mulberry)', padding: '3px 10px', clipPath: 'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)', opacity: 0.85 }}>{text}</span>
);
