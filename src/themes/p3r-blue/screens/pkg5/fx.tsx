/**
 * 工作包 5 演出件（复刻真实 p3 时序，蓝白重配）：
 *   BandCutInPink        ← src/components/TodoCompleteModal.tsx#BandCutInP3（记账完成 = eyebrow「记账完成」ghost「SAVED」）
 *                          入场：带体 x 110%→0 spring(d24,s220) + skewX -6→0；勾 scale0→1 spring(d14,s220) delay .12；
 *                          任务名斜块 clip 揭示 .38s delay .2；幽灵词 x46→0 .35s delay .26；迸溅碎片 .55s delay .34+；
 *                          三圈波纹 1.15s delay .15+k*.26 循环；useAutoClose 3000；退场 x→-110%。
 *   CelebrationCardPink  ← src/components/CelebrationCutIn.tsx（p3 形态：斜切卡 + 左上青贴角 + 右下臂章红片 + 纵向高光 + 斜光带
 *                          + 粒子 1.2s + 自动关闭进度条 scaleX 1→0 线性）入场 scale .5→1 springSoft(d28,s300)。
 *   AchievementUnlockPink← src/components/AchievementUnlockModal.tsx#AchievementUnlockP3（三圈水波 1.2s、UNLOCK 幽灵字揭示 .5s、
 *                          菱形面板 spring(d19,s230)、徽记 .7s delay .15、碎三角 .6s delay .42+i*.03、斜带 scaleX .4s delay .24、
 *                          标题逐字 spring delay .3+i*.055、成就名浮入 delay .6、useAutoClose 4500）。
 * 低动效：initial=false 直出终态，只留遮罩淡入淡出。startAt='hold' 用于阶段直达（直接停在主演出终态 + 倒计时）。
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Portal, useEscape, P3R, slantClip, tickClip } from '@blue/kit';
import { useBoldness } from '@blue/lib/prefs';

export type FxStart = 'enter' | 'hold';

/** useAutoClose 同口径（ms<=0 不自动关） */
export function useAutoCloseP5(open: boolean, ms: number, onClose: () => void, key?: unknown) {
  const ref = useRef(onClose); ref.current = onClose;
  useEffect(() => { if (!open || ms <= 0) return; const t = window.setTimeout(() => ref.current(), ms); return () => clearTimeout(t); }, [open, ms, key]);
}

/* ───────────────────────── 记账完成 / 今日完成 斜带 ───────────────────────── */
const ShatterCheckPink = () => (
  <svg viewBox="0 0 210 176" className="w-[clamp(96px,30vw,148px)]" aria-hidden>
    <polygon points="26,98 60,84 94,130 76,152 42,118" fill="var(--p3r-cyan)" />
    <polygon points="76,152 94,130 182,20 202,44 98,164" fill="var(--p3r-blue)" />
    <polygon points="94,130 182,20 160,14 88,110" fill="var(--bk-bubble-a)" />
    <polygon points="186,6 202,0 196,22" fill="var(--p3r-cyan)" />
    <polygon points="16,82 32,72 28,94" fill="var(--bk-bubble-b)" />
    <polygon points="106,164 122,154 114,176" fill="var(--p3r-blue-deep)" opacity="0.55" />
    <polygon points="200,54 210,48 206,64" fill="var(--p3r-magenta)" opacity="0.8" />
  </svg>
);
const CHECK_BURST = [
  { dx: -44, dy: -34, rot: -40, s: 10, c: 'var(--p3r-cyan)', d: 0 },
  { dx: 52, dy: -26, rot: 60, s: 8, c: 'var(--p3r-blue)', d: 0.03 },
  { dx: -30, dy: 40, rot: -80, s: 7, c: 'var(--bk-bubble-a)', d: 0.05 },
  { dx: 58, dy: 30, rot: 45, s: 9, c: 'var(--p3r-magenta)', d: 0.02 },
  { dx: 6, dy: -52, rot: 20, s: 7, c: 'var(--bk-bubble-b)', d: 0.06 },
  { dx: -56, dy: 4, rot: -25, s: 8, c: 'var(--p3r-blue)', d: 0.04 },
  { dx: 30, dy: 52, rot: 70, s: 6, c: 'var(--p3r-cyan)', d: 0.07 },
];

export function BandCutInPink({ open, onClose, title, eyebrow, ghost, line = 'TODAY', extra, autoCloseMs = 3000, startAt = 'enter' }: {
  open: boolean; onClose: () => void; title: string; eyebrow: string; ghost: string; line?: string; extra?: ReactNode; autoCloseMs?: number; startAt?: FxStart;
}) {
  const bold = useBoldness();
  const anim = bold && startAt === 'enter';
  useEscape(open, onClose);
  useAutoCloseP5(open, autoCloseMs, onClose);
  const [left, setLeft] = useState(Math.round(autoCloseMs / 1000));
  useEffect(() => { if (!open) return; setLeft(Math.round(autoCloseMs / 1000)); const iv = window.setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000); return () => clearInterval(iv); }, [open, autoCloseMs]);
  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 flex flex-col items-stretch justify-center overflow-hidden" style={{ zIndex: 'var(--p3r-z-celebration)' as unknown as number, background: 'rgb(var(--p3r-mulberry-rgb) / 0.35)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: bold ? 0.2 : 0.12 }} onClick={onClose}>
            <div role="dialog" aria-modal="true" aria-label={`${eyebrow}：${title}`} className="relative">
              <motion.div className="relative w-full" onClick={(e) => e.stopPropagation()}
                initial={anim ? { x: '110%' } : false} animate={{ x: 0 }} exit={bold ? { x: '-110%' } : { opacity: 0 }} transition={{ type: 'spring', damping: 24, stiffness: 220 }}>
                <motion.div className="relative overflow-hidden px-6 pb-10 pt-9 wide:px-12"
                  initial={anim ? { skewX: -6 } : false} animate={{ skewX: 0 }} transition={{ type: 'spring', damping: 24, stiffness: 220 }}
                  style={{ background: 'linear-gradient(172deg, var(--p3r-cream) 0%, #f4faff 70%, #e6f3fd 100%)', clipPath: 'polygon(0 12%, 100% 0, 100% 88%, 0 100%)' }}>
                  {/* 三道圆形波纹（从勾处 ping ×3，循环保活） */}
                  {bold && [0, 1, 2].map((k) => (
                    <motion.span key={k} aria-hidden className="pointer-events-none absolute z-10 rounded-full" style={{ left: '82%', top: '50%', x: '-50%', y: '-50%', border: '3px solid rgb(var(--p3r-blue-rgb) / 0.7)' }}
                      initial={{ width: 26, height: 26, opacity: 0 }} animate={{ width: 240, height: 240, opacity: [0, 0.85, 0] }}
                      transition={{ duration: 1.15, delay: (anim ? 0.15 : 0) + k * 0.26, ease: 'easeOut', repeat: Infinity, repeatDelay: 0.35 }} />
                  ))}
                  {/* 幽灵词（带内右下） */}
                  <motion.div aria-hidden className="pointer-events-none absolute -right-3 bottom-0 select-none font-cond uppercase leading-none" style={{ fontSize: 'clamp(64px,18vw,96px)', color: 'rgb(var(--p3r-cyan-rgb) / 0.3)' }}
                    initial={anim ? { x: 46, opacity: 0 } : false} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.35, delay: 0.26, ease: [0.2, 0.8, 0.3, 1] }}>{ghost}</motion.div>
                  <div className="relative mx-auto flex max-w-[860px] items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-end gap-2">
                        <span className="relative inline-block whitespace-nowrap font-heavy leading-[0.9]" style={{ fontSize: 'min(52px, 11.5vw)' }}>
                          <span aria-hidden className="absolute inset-0" style={{ color: '#fff', WebkitTextStroke: '5px #fff' }}>{eyebrow}</span>
                          <span className="relative" style={{ color: 'var(--p3r-mulberry)' }}>{eyebrow}</span>
                        </span>
                        <span aria-hidden className="mb-1 flex gap-[3px]">
                          <span className="h-[10px] w-[12px]" style={{ background: P3R.magenta, clipPath: tickClip }} />
                          <span className="h-[8px] w-[9px]" style={{ background: 'var(--p3r-magenta)', clipPath: tickClip }} />
                        </span>
                      </div>
                      <div className="mt-2.5 flex items-center gap-2.5">
                        <span aria-hidden className="h-[4px] w-9" style={{ background: '#4a79e6', transform: 'skewX(-24deg)' }} />
                        <span className="font-cond text-[18px] tracking-[0.18em]" style={{ color: '#335bb8' }}>{line}</span>
                      </div>
                      <motion.div className="mt-3 inline-block max-w-full align-top" initial={anim ? { clipPath: 'inset(-6% 102% -6% -3%)' } : false} animate={{ clipPath: 'inset(-6% -3% -6% -3%)' }} transition={{ duration: 0.38, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}>
                        <div className="inline-block max-w-full px-5 py-2.5" style={{ background: '#4a79e6', clipPath: slantClip(12) }}>
                          <span className={`p3r-clamp-2 block font-black leading-snug text-white ${title.length > 9 ? 'text-[clamp(16px,4.6vw,22px)]' : 'text-[clamp(18px,5.6vw,24px)]'}`}>{title}</span>
                        </div>
                      </motion.div>
                      {extra}
                    </div>
                    <motion.div className="relative shrink-0" initial={anim ? { scale: 0, rotate: -18 } : false} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', damping: 14, stiffness: 220, delay: 0.12 }}>
                      <ShatterCheckPink />
                      {anim && CHECK_BURST.map((b, i) => (
                        <motion.span key={i} aria-hidden className="pointer-events-none absolute left-1/2 top-1/2" style={{ width: b.s, height: b.s, background: b.c, clipPath: 'polygon(50% 0, 100% 100%, 0 100%)' }}
                          initial={{ x: 0, y: 0, scale: 0, opacity: 0, rotate: 0 }} animate={{ x: b.dx, y: b.dy, scale: 1, opacity: [0, 1, 0], rotate: b.rot }} transition={{ duration: 0.55, delay: 0.34 + b.d, ease: 'easeOut' }} />
                      ))}
                    </motion.div>
                  </div>
                </motion.div>
                <motion.button type="button" whileTap={{ scale: 0.9 }} onClick={onClose} aria-label="关闭" className="absolute right-3 top-0 z-20 flex h-11 w-14 items-center justify-center text-xl font-black"
                  style={{ background: P3R.cyan, color: 'var(--p3r-mulberry)', clipPath: slantClip(14) }}>×</motion.button>
              </motion.div>
              <div aria-hidden className="mt-5 flex items-center justify-center gap-3 text-[12px] font-black" style={{ color: 'rgba(255,255,255,0.92)' }}>
                <span className="h-px w-12 bg-white/60" />即将自动关闭 <span className="font-cond" style={{ color: 'var(--bk-bubble-a)' }}>{left}s</span><span className="h-px w-12 bg-white/60" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}

/* ───────────────────────── 庆祝基座（CelebrationCutIn · p3 形态） ───────────────────────── */
export type CelebTheme = 'violet' | 'gold' | 'emerald';
/** 粉版主题渐变（原紫→靛→蓝 / 黄→橙→红；禁蓝 → 深蓝→深蓝→樱玫 / 金→臂章红→蓝） */
const THEME_BG: Record<CelebTheme, string> = {
  violet: 'linear-gradient(135deg, #2a427a 0%, #3255a8 52%, #4a79e6 100%)',
  gold: 'linear-gradient(135deg, #ffc531 0%, #f5a614 30%, #05070f 64%, #2a52d6 100%)',
  emerald: 'linear-gradient(135deg, #3fae8c 0%, #8bd4e6 60%, #4a79e6 100%)',
};
const THEME_PARTS: Record<CelebTheme, string[]> = {
  violet: ['#d0deff', '#a6edff', '#9cbaff', '#ffffff'],
  gold: ['#ffe6a8', '#b5e6ff', '#9cbaff', '#ffffff'],
  emerald: ['#c8f2e0', '#d0f6ff', '#c2d4ff', '#ffffff'],
};

function Particles({ count, colors, play }: { count: number; colors: string[]; play: boolean }) {
  const [ps] = useState(() => Array.from({ length: count }, (_, i) => { const a = Math.random() * Math.PI * 2; const d = 60 + Math.random() * 90; return { i, x: Math.cos(a) * d, y: Math.sin(a) * d, delay: Math.random() * 0.4, size: 6 + Math.random() * 6, c: colors[i % colors.length], petal: i % 3 === 0 }; }));
  if (!play) return null;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {ps.map((p) => (
        <motion.span key={p.i} className="absolute left-1/2 top-1/2" style={{ width: p.size, height: p.size, marginLeft: -p.size / 2, marginTop: -p.size / 2, background: p.c, borderRadius: p.petal ? '80% 0 80% 0' : '50%' }}
          initial={{ x: 0, y: 0, scale: 0, opacity: 0 }} animate={{ x: p.x, y: p.y, scale: [0, 1, 0.5], opacity: [0, 1, 0] }} transition={{ duration: 1.2, delay: p.delay, ease: 'easeOut' }} />
      ))}
    </div>
  );
}

export function CelebrationCardPink({ open, onClose, theme = 'violet', icon, title, subtitle, children, autoCloseMs = 3500, particles = 18, startAt = 'enter', exitKey }: {
  open: boolean; onClose: () => void; theme?: CelebTheme; icon?: ReactNode; title: ReactNode; subtitle?: ReactNode; children?: ReactNode; autoCloseMs?: number; particles?: number; startAt?: FxStart; exitKey?: string | number;
}) {
  const bold = useBoldness();
  const anim = bold && startAt === 'enter';
  useEscape(open, onClose);
  useAutoCloseP5(open, autoCloseMs, onClose, exitKey);
  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <motion.div key="celeb-bd" className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 'var(--p3r-z-celebration)' as unknown as number, background: 'rgb(var(--p3r-mulberry-rgb) / 0.6)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} onClick={onClose}>
            <AnimatePresence mode="wait">
              <motion.div key={exitKey ?? 'card'} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-md overflow-hidden p-8"
                style={{ background: THEME_BG[theme], clipPath: slantClip(22) }}
                initial={anim ? { scale: 0.5, opacity: 0, x: -12, y: 12 } : { opacity: 0 }} animate={{ scale: 1, opacity: 1, x: 0, y: 0 }} exit={bold ? { scale: 0.5, opacity: 0, x: -12, y: 12 } : { opacity: 0 }}
                transition={{ type: 'spring', damping: 28, stiffness: 300 }}>
                <span aria-hidden className="absolute left-0 top-0 z-10 h-[14px] w-[52px]" style={{ background: P3R.cyan, clipPath: 'polygon(0 0, 100% 0, 72% 100%, 0 100%)' }} />
                <span aria-hidden className="absolute bottom-0 right-6 z-10 h-[10px] w-[26px]" style={{ background: 'var(--p3r-gold)', clipPath: tickClip }} />
                <div aria-hidden className="absolute inset-0" style={{ background: 'linear-gradient(to top, transparent, rgba(255,255,255,0.15), transparent)' }} />
                <div aria-hidden className="absolute -left-10 top-8 h-14 w-[150%]" style={{ background: 'rgba(255,255,255,0.1)', transform: bold ? 'rotate(-6deg)' : undefined }} />
                {particles > 0 && <Particles count={particles} colors={THEME_PARTS[theme]} play={bold} />}
                <div className="relative z-10 text-center">
                  {icon && (
                    <motion.div className="mb-4 flex justify-center" initial={anim ? { scale: 0, rotate: -30 } : false} animate={{ scale: [0, 1.2, 1], rotate: 0 }} transition={{ duration: 0.6, delay: 0.12 }}>{icon}</motion.div>
                  )}
                  <motion.h2 className="font-heavy text-[clamp(24px,7.4vw,30px)] leading-tight text-white" initial={anim ? { clipPath: 'inset(-10% 102% -20% -3%)' } : false} animate={{ clipPath: 'inset(-10% -6% -20% -3%)' }} transition={{ duration: 0.4, delay: 0.2 }}>{title}</motion.h2>
                  {subtitle && <motion.p className="mt-2 text-[16px] font-bold" style={{ color: 'rgba(255,255,255,0.88)' }} initial={anim ? { opacity: 0, y: 8 } : false} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}>{subtitle}</motion.p>}
                  {children && <motion.div className="mt-4" initial={anim ? { opacity: 0, y: 10 } : false} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>{children}</motion.div>}
                </div>
                <motion.button type="button" whileTap={{ scale: 0.9 }} onClick={onClose} aria-label="关闭" className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full text-xl" style={{ background: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.85)' }}>×</motion.button>
                {autoCloseMs > 0 && (
                  <div aria-hidden className="absolute inset-x-0 bottom-0 z-10 h-1 overflow-hidden" style={{ background: 'rgba(255,255,255,0.2)' }}>
                    <motion.div className="h-full w-full" style={{ background: 'rgba(255,255,255,0.8)', transformOrigin: 'left center' }} initial={{ scaleX: 1 }} animate={{ scaleX: 0 }} transition={{ duration: autoCloseMs / 1000, ease: 'linear' }} />
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}

/* ───────────────────────── 成就解锁（AchievementUnlockP3） ───────────────────────── */
const Crest = () => (
  <svg viewBox="0 0 150 110" className="w-[108px]" aria-hidden>
    <polygon points="46,72 108,10 96,84" fill="var(--p3r-cyan)" />
    <polygon points="46,72 96,84 60,102" fill="var(--p3r-blue)" />
    <polygon points="108,10 118,64 96,84" fill="var(--bk-bubble-a)" />
    <polygon points="96,84 132,70 122,92" fill="var(--p3r-magenta)" />
    <polygon points="28,80 44,74 38,92" fill="var(--bk-bubble-b)" />
  </svg>
);
const CREST_BURST = [
  { dx: -62, dy: -30, rot: -40, s: 11, c: 'var(--p3r-cyan)' }, { dx: 66, dy: -22, rot: 60, s: 9, c: 'var(--p3r-blue)' },
  { dx: -44, dy: 44, rot: -80, s: 8, c: 'var(--bk-bubble-a)' }, { dx: 72, dy: 36, rot: 45, s: 10, c: 'var(--p3r-magenta)' },
  { dx: 8, dy: -62, rot: 20, s: 8, c: 'var(--bk-bubble-b)' }, { dx: -78, dy: 8, rot: -25, s: 9, c: 'var(--p3r-blue)' },
];
export const DEFAULT_ACH_LINES: [string, string] = ['你的坚持被看见了，', '这份荣誉属于你。'];

export function AchievementUnlockPink({ open, onClose, achievementTitle, lines = DEFAULT_ACH_LINES, autoCloseMs = 4500, startAt = 'enter', heading = '成就解锁！', ghost = 'UNLOCK' }: {
  open: boolean; onClose: () => void; achievementTitle: string; lines?: [string, string]; autoCloseMs?: number; startAt?: FxStart; heading?: string; ghost?: string;
}) {
  const bold = useBoldness();
  const anim = bold && startAt === 'enter';
  useEscape(open, onClose);
  useAutoCloseP5(open, autoCloseMs, onClose);
  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 flex items-center justify-center overflow-hidden p-5" style={{ zIndex: 'var(--p3r-z-celebration)' as unknown as number, background: 'rgba(226, 234, 252, 0.94)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} onClick={onClose}>
            {anim && (
              <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full">
                {[0, 1, 2].map((k) => (
                  <motion.circle key={k} cx="50%" cy="50%" fill="none" stroke={k === 1 ? '#4a79e6' : '#8bd4e6'} strokeWidth={k === 1 ? 14 : 9}
                    initial={{ r: 24, opacity: 0 }} animate={{ r: 300 + k * 110, opacity: [0, 0.55, 0.3, 0] }}
                    transition={{ duration: 1.2, delay: 0.04 + k * 0.13, ease: [0.16, 0.7, 0.35, 1], opacity: { duration: 1.2, delay: 0.04 + k * 0.13, times: [0, 0.12, 0.6, 1] } }} />
                ))}
              </svg>
            )}
            <motion.div aria-hidden className="pointer-events-none absolute left-[-24px] top-[4%] select-none font-cond leading-none" style={{ fontSize: 'clamp(80px,26vw,140px)', color: 'rgba(255,255,255,0.7)', rotate: -9 }}
              initial={anim ? { clipPath: 'inset(-12% 103% -12% -3%)', x: -34 } : false} animate={{ clipPath: 'inset(-12% -6% -12% -3%)', x: 0 }} transition={{ duration: 0.5, delay: 0.06, ease: [0.22, 0.9, 0.3, 1] }}>{ghost}</motion.div>
            <span aria-hidden className="absolute right-0 top-0 h-[120px] w-[140px]" style={{ background: '#4a79e6', clipPath: 'polygon(100% 0, 0 0, 100% 100%)' }} />
            <motion.button type="button" whileTap={{ scale: 0.9 }} onClick={onClose} aria-label="关闭" className="absolute right-3 top-3 z-20 flex h-11 w-11 items-center justify-center text-2xl font-black text-white">×</motion.button>
            <motion.div role="dialog" aria-modal="true" aria-label={`${heading}${achievementTitle}`} onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md overflow-hidden pb-10 pt-6 text-center"
              style={{ background: 'rgba(255,253,252,0.97)', clipPath: 'polygon(7% 9%, 96% 0, 100% 88%, 3% 100%)' }}
              initial={anim ? { scale: 0.55, opacity: 0, rotate: -5 } : { opacity: 0 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} exit={bold ? { scale: 0.75, opacity: 0 } : { opacity: 0 }} transition={{ type: 'spring', damping: 19, stiffness: 230 }}>
              <span aria-hidden className="absolute bottom-1 left-2 h-0 w-0 border-b-[26px] border-r-[38px] border-r-transparent" style={{ borderBottomColor: 'rgba(139,212,230,0.8)' }} />
              <div className="relative z-10 flex flex-col items-center px-6">
                <motion.div className="relative" initial={anim ? { scale: 0, rotate: -24 } : false} animate={{ scale: anim ? [0, 1.25, 1] : 1, rotate: 0 }} transition={{ duration: 0.7, delay: 0.15 }}>
                  <Crest />
                  {anim && CREST_BURST.map((b, i) => (
                    <motion.span key={i} aria-hidden className="pointer-events-none absolute left-1/2 top-1/2" style={{ width: b.s, height: b.s, background: b.c, clipPath: 'polygon(50% 0, 100% 100%, 0 100%)' }}
                      initial={{ x: 0, y: 0, scale: 0, opacity: 0, rotate: 0 }} animate={{ x: b.dx, y: b.dy, scale: 1, opacity: [0, 1, 0], rotate: b.rot }} transition={{ duration: 0.6, delay: 0.42 + i * 0.03, ease: 'easeOut' }} />
                  ))}
                </motion.div>
                <div className="relative mt-1 w-full">
                  <motion.span aria-hidden className="absolute left-[-15%] right-[-15%] top-1/2 h-[62px]" style={{ background: '#4a79e6', y: '-50%', rotate: -7, originX: 0 }}
                    initial={anim ? { scaleX: 0, opacity: 0 } : false} animate={{ scaleX: 1, opacity: 1 }} transition={{ duration: 0.4, delay: 0.24, ease: [0.16, 1, 0.3, 1] }} />
                  <motion.span aria-hidden className="absolute right-[3%] top-[-16px] h-[16px] w-[26px]" initial={anim ? { scale: 0 } : false} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 20, delay: 0.52 }}>
                    <span className="p3-corner-blink absolute inset-0" style={{ background: '#ff3347', clipPath: tickClip }} />
                  </motion.span>
                  <div aria-hidden className="relative whitespace-nowrap text-center font-heavy leading-none" style={{ fontSize: 'min(44px, 10.5vw)' }}>
                    {heading.split('').map((ch, i) => (
                      <motion.span key={`h-${i}`} className="relative inline-block" initial={anim ? { y: 22, opacity: 0, scale: 0.5 } : false} animate={{ y: 0, opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 480, damping: 24, delay: 0.3 + i * 0.055 }}>
                        <span className="absolute inset-0" style={{ color: '#fff', WebkitTextStroke: '7px #fff' }}>{ch}</span>
                        <span className="relative" style={{ color: '#1f3a7a' }}>{ch}</span>
                      </motion.span>
                    ))}
                  </div>
                </div>
                <motion.div className="mt-7 flex w-full min-w-0 items-center justify-center gap-3" initial={anim ? { y: 16, opacity: 0 } : false} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 340, damping: 26, delay: 0.6 }}>
                  <span aria-hidden className="flex shrink-0 gap-1"><Tk o={0.8} /><Tk o={0.45} /></span>
                  <span className="min-w-0 max-w-[70%] truncate font-heavy text-[clamp(22px,7vw,30px)] leading-none" style={{ color: '#4a79e6' }}>{achievementTitle}</span>
                  <span aria-hidden className="flex shrink-0 gap-1"><Tk o={0.45} /><Tk o={0.8} /></span>
                </motion.div>
                <p className="mt-3 text-[14px] font-black" style={{ color: '#15203b' }}>{lines.join('')}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
const Tk = ({ o }: { o: number }) => <span className="h-[12px] w-[10px]" style={{ background: `rgba(139,212,230,${o})`, clipPath: 'polygon(38% 0, 100% 0, 62% 100%, 0 100%)' }} />;
