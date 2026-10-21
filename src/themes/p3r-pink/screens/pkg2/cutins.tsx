/**
 * 工作包 2 的演出零件（粉白 P3R），全部 1:1 复刻真实 p3 分支的时序，颜色换粉变量：
 *   BandCutIn   —— 真实 TodoCompleteModal#BandCutInP3（记录成功 / 今日完成共用）：
 *                  斜带自右 spring(24/220) 滑入 + skewX -6→0；三圈水波 ping（1.15s，delay .15+k*.26，循环）；
 *                  幽灵词 .26s 错帧滑入；任务名玫红斜块 .2s 裁切揭示；碎裂勾 spring(14/220) delay .12；
 *                  勾落地迸溅 7 片 .34+d；音符雨（数量 = 点数）；3000ms 自动关。
 *   CelebCard   —— 真实 CelebrationCutIn 的 p3 形（斜切卡 + 左上藕紫角 + 右下珊瑚角 + 粒子 + 自动关倒计时条）：
 *                  scale .5→1 + 斜向位移 springSoft；奖励已领取 / 愿望进度 / 大事推进一步共用。
 *   DarkStage   —— 抽签 / 大事收官的「水面舞台」（真实 p3 = 深海藏青；粉版 = 深莓夜 + 樱点水纹）。
 *   DanmakuLayer—— 真实 DanmakuLayer：CSS 漂移、长按 1.5s 定格 → 「反馈并隐藏」→「已反馈」，4s 无操作散去。
 * 低动效：直出终态 + 淡入淡出（不放粒子 / 水波 / 音符）。
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Portal, useEscape, P3R, slantClip, tickClip } from '@pink/kit';
import { PetalBurst } from '@pink/fx';
import { useBoldness } from '@pink/lib/prefs';
import { cx } from '@pink/lib/cx';

/* ───────────────────────── 自动关 ───────────────────────── */
export function useAutoClose(open: boolean, ms: number, onClose: () => void) {
  const cb = useRef(onClose); cb.current = onClose;
  useEffect(() => { if (!open || !ms) return; const t = window.setTimeout(() => cb.current(), ms); return () => clearTimeout(t); }, [open, ms]);
}

/* ───────────────────────── 碎裂勾 ───────────────────────── */
const ShatterCheck = () => (
  <svg viewBox="0 0 220 180" className="h-[clamp(84px,24vw,150px)] w-[clamp(100px,28vw,180px)]" aria-hidden>
    <polygon points="26,98 60,84 94,130 76,152 42,118" fill="var(--p3r-cyan)" />
    <polygon points="94,130 186,24 206,40 112,156 76,152" fill="var(--p3r-blue)" />
    <polygon points="186,6 202,0 196,22" fill="var(--p3r-cyan)" />
    <polygon points="20,70 34,64 30,82" fill="var(--p3r-magenta)" />
    <polygon points="106,164 122,154 114,176" fill="var(--p3r-blue)" opacity="0.55" />
  </svg>
);
const CHECK_BURST = [
  { dx: -44, dy: -34, rot: -40, s: 10, c: 'var(--p3r-cyan)', d: 0 },
  { dx: 52, dy: -26, rot: 60, s: 8, c: 'var(--p3r-blue)', d: 0.03 },
  { dx: -30, dy: 40, rot: -80, s: 7, c: 'var(--pk-petal-a)', d: 0.05 },
  { dx: 58, dy: 30, rot: 45, s: 9, c: 'var(--p3r-magenta)', d: 0.02 },
  { dx: 6, dy: -52, rot: 20, s: 7, c: 'var(--pk-petal-b)', d: 0.06 },
  { dx: -56, dy: 4, rot: -25, s: 8, c: 'var(--p3r-blue)', d: 0.04 },
  { dx: 30, dy: 52, rot: 70, s: 6, c: 'var(--p3r-cyan)', d: 0.07 },
];

/** 音符雨（真实 MusicalNotes：数量随加成，delay .3） */
export function NoteRain({ count, delay = 0.3 }: { count: number; delay?: number }) {
  const anim = useBoldness();
  const notes = useMemo(() => Array.from({ length: Math.min(14, Math.max(0, count)) }, (_, i) => ({
    x: 6 + ((i * 37) % 88), d: delay + (i % 7) * 0.12, dur: 1.6 + (i % 4) * 0.3, g: i % 3 === 0 ? '♫' : '♪', c: [P3R.blue, P3R.cyan, P3R.magenta][i % 3], s: 18 + (i % 3) * 6,
  })), [count, delay]);
  if (!anim || !count) return null;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {notes.map((n, i) => (
        <motion.span key={i} className="absolute top-0 font-black" style={{ left: `${n.x}%`, color: n.c, fontSize: n.s }}
          initial={{ y: '-10vh', opacity: 0, rotate: -20 }} animate={{ y: '105vh', opacity: [0, 1, 1, 0], rotate: 20 }}
          transition={{ duration: n.dur, delay: n.d, ease: 'easeIn' }}>{n.g}</motion.span>
      ))}
    </div>
  );
}

/* ───────────────────────── BandCutIn ───────────────────────── */
export interface BandCutInProps {
  open: boolean;
  onClose: () => void;
  /** 主标题（今日完成 / 记录成功） */
  eyebrow: string;
  /** 带内右下幽灵词（DONE / SAVED） */
  ghost: string;
  /** 玫红斜块里的任务名 / 记录摘要 */
  title: string;
  totalPoints?: number;
  unlockHint?: boolean;
  autoCloseMs?: number;
}
export function BandCutIn({ open, onClose, eyebrow, ghost, title, totalPoints = 0, unlockHint, autoCloseMs = 3000 }: BandCutInProps) {
  const anim = useBoldness();
  useEscape(open, onClose);
  useAutoClose(open, autoCloseMs, onClose);
  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-celebration flex flex-col items-stretch justify-center overflow-hidden" onClick={onClose}
            style={{ background: 'rgba(42, 13, 34, 0.38)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <div role="dialog" aria-modal="true" aria-label={`${eyebrow}：${title}`} className="relative">
              {/* 位移层：自右 spring 滑入（与斜切层分开，✕ 挂在外层，斜度恒定） */}
              <motion.div className="relative w-full" onClick={(e) => e.stopPropagation()}
                initial={anim ? { x: '110%' } : { opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={anim ? { x: '-110%' } : { opacity: 0 }}
                transition={anim ? { type: 'spring', damping: 24, stiffness: 220 } : { duration: 0.16 }}>
                <motion.div className="p3-dayface relative overflow-hidden px-6 pb-10 pt-9 wide:px-14"
                  initial={anim ? { skewX: -6 } : false} animate={{ skewX: 0 }} transition={{ type: 'spring', damping: 24, stiffness: 220 }}
                  style={{ background: 'var(--p3r-sheet-grad)', clipPath: 'polygon(0 12%, 100% 0, 100% 88%, 0 100%)' }}>
                  {/* 顶 / 底细色带 */}
                  <span aria-hidden className="absolute inset-x-0 top-0 h-[12%]" style={{ background: P3R.blue, clipPath: 'polygon(0 100%, 100% 0, 100% 30%, 0 100%)' }} />
                  {/* 三道水波 ping（从勾处扩散，循环保活） */}
                  {anim && [0, 1, 2].map((k) => (
                    <motion.span key={k} aria-hidden className="pointer-events-none absolute z-10 h-[240px] w-[240px] rounded-full"
                      style={{ left: 'calc(82% - 120px)', top: 'calc(50% - 120px)', border: '3px solid rgb(var(--p3r-cyan-rgb) / 0.85)' }}
                      initial={{ scale: 0.11, opacity: 0 }} animate={{ scale: 1, opacity: [0, 0.85, 0] }}
                      transition={{ duration: 1.15, delay: 0.15 + k * 0.26, ease: 'easeOut', repeat: Infinity, repeatDelay: 0.35 }} />
                  ))}
                  {/* 幽灵词：错帧从右滑入 */}
                  <motion.div aria-hidden className="pointer-events-none absolute -right-3 bottom-0 select-none font-cond uppercase leading-none"
                    style={{ fontSize: 'clamp(64px,18vw,140px)', color: 'rgb(var(--p3r-cyan-rgb) / 0.28)' }}
                    initial={anim ? { x: 46, opacity: 0 } : false} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.35, delay: 0.26, ease: [0.2, 0.8, 0.3, 1] }}>{ghost}</motion.div>
                  <div className="relative mx-auto flex max-w-[860px] items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-end gap-2">
                        <span className="relative inline-block whitespace-nowrap font-heavy leading-[0.9]" style={{ fontSize: 'min(52px, 11.5vw)' }}>
                          <span aria-hidden className="absolute inset-0" style={{ color: 'var(--p3r-panel)', WebkitTextStroke: '5px var(--p3r-panel)' }}>{eyebrow}</span>
                          <span className="relative" style={{ color: P3R.ink }}>{eyebrow}</span>
                        </span>
                        <span aria-hidden className="mb-1 flex gap-[3px]">
                          <span className="h-[10px] w-[12px]" style={{ background: P3R.magenta, clipPath: tickClip }} />
                          <span className="h-[8px] w-[9px]" style={{ background: 'rgb(var(--p3r-magenta-rgb) / 0.55)', clipPath: tickClip }} />
                        </span>
                      </div>
                      <div className="mt-2.5 flex items-center gap-2.5">
                        <span aria-hidden className="h-[4px] w-9" style={{ background: P3R.blue, transform: 'skewX(-24deg)' }} />
                        <span className="font-cond text-[18px] tracking-[0.18em]" style={{ color: P3R.roseInk }}>TODAY{totalPoints > 0 ? ` / +${totalPoints}` : ''}</span>
                      </div>
                      <motion.div className="mt-3 inline-block max-w-full align-top"
                        initial={anim ? { clipPath: 'inset(-6% 102% -6% -3%)' } : false} animate={{ clipPath: 'inset(-6% -3% -6% -3%)' }}
                        transition={{ duration: 0.38, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}>
                        <div className="inline-block max-w-full px-5 py-2.5" style={{ background: P3R.blue, clipPath: slantClip(12) }}>
                          <span className="p3r-clamp-2 block text-[clamp(16px,5vw,24px)] font-black leading-snug" style={{ color: P3R.onBlue }}>{title}</span>
                        </div>
                      </motion.div>
                      {unlockHint && (
                        <motion.div className="mt-2.5 text-[13px] font-black" style={{ color: 'var(--p3r-coral-ink)' }}
                          initial={anim ? { opacity: 0, x: -10 } : false} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.55 }}>✦ 你解锁了新成就 / 新技能！</motion.div>
                      )}
                    </div>
                    <motion.div className="relative shrink-0" initial={anim ? { scale: 0, rotate: -18 } : false} animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', damping: 14, stiffness: 220, delay: 0.12 }}>
                      <ShatterCheck />
                      {anim && CHECK_BURST.map((b, i) => (
                        <motion.span key={i} aria-hidden className="pointer-events-none absolute left-1/2 top-1/2"
                          style={{ width: b.s, height: b.s, background: b.c, clipPath: 'polygon(50% 0, 100% 100%, 0 100%)' }}
                          initial={{ x: 0, y: 0, scale: 0, opacity: 0, rotate: 0 }} animate={{ x: b.dx, y: b.dy, scale: 1, opacity: [0, 1, 0], rotate: b.rot }}
                          transition={{ duration: 0.55, delay: 0.34 + b.d, ease: 'easeOut' }} />
                      ))}
                    </motion.div>
                  </div>
                </motion.div>
                {/* 右上藕紫斜块 ✕（斜切层之外） */}
                <button type="button" onClick={onClose} aria-label="关闭" className="absolute right-3 top-0 z-20 flex h-11 w-14 items-center justify-center text-xl font-black"
                  style={{ background: P3R.cyan, color: 'var(--p3r-mulberry)', clipPath: 'polygon(14px 0, 100% 0, calc(100% - 14px) 100%, 0 100%)' }}>×</button>
              </motion.div>
              {/* 底部自动关闭提示 */}
              <div aria-hidden className="mt-5 flex items-center justify-center gap-3 text-[12px] font-black" style={{ color: 'var(--p3r-cream)' }}>
                <span className="h-px w-12" style={{ background: 'rgba(255,248,240,0.6)' }} />
                即将自动关闭 <span style={{ color: 'var(--pk-petal-a)' }}>{Math.round(autoCloseMs / 1000)}s</span>
                <span className="h-px w-12" style={{ background: 'rgba(255,248,240,0.6)' }} />
              </div>
            </div>
            <NoteRain count={totalPoints} />
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}

/* ───────────────────────── CelebCard（CelebrationCutIn p3） ───────────────────────── */
type CelebTheme = 'gold' | 'violet' | 'emerald' | 'rose';
/** 粉版四主题渐变（真实 gold / violet / emerald 语义保留，色换粉白系：金杏 / 藕紫莓 / 樱玫 / 玫红） */
const CELEB_BG: Record<CelebTheme, string> = {
  gold: 'linear-gradient(135deg, var(--p3r-gold) 0%, var(--p3r-magenta) 55%, var(--p3r-blue) 100%)',
  violet: 'linear-gradient(135deg, var(--p3r-cyan) 0%, var(--p3r-blue-deep) 60%, var(--p3r-mulberry) 100%)',
  emerald: 'linear-gradient(135deg, var(--p3r-blue) 0%, var(--p3r-blue-deep) 58%, var(--p3r-mulberry) 100%)',
  rose: 'linear-gradient(135deg, var(--p3r-magenta) 0%, var(--p3r-blue) 60%, var(--p3r-blue-deep) 100%)',
};
const PARTICLE_C = ['var(--p3r-cream)', 'var(--pk-petal-a)', 'var(--pk-petal-b)', 'var(--p3r-gold)'];
export interface CelebCardProps {
  open: boolean;
  onClose: () => void;
  theme?: CelebTheme;
  icon?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  children?: ReactNode;
  autoCloseMs?: number;
  particles?: number;
  eyebrow?: string;
}
export function CelebCard({ open, onClose, theme = 'gold', icon, title, subtitle, children, autoCloseMs = 3500, particles = 24, eyebrow }: CelebCardProps) {
  const anim = useBoldness();
  useEscape(open, onClose);
  useAutoClose(open, autoCloseMs, onClose);
  const parts = useMemo(() => Array.from({ length: particles }, (_, i) => {
    const a = (i / Math.max(1, particles)) * Math.PI * 2 + (i % 3) * 0.3;
    const r = 90 + (i % 5) * 26;
    return { x: Math.cos(a) * r, y: Math.sin(a) * r, d: (i % 6) * 0.04, s: 5 + (i % 4) * 2, c: PARTICLE_C[i % 4], rot: (i * 47) % 180 };
  }), [particles]);
  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-celebration flex items-center justify-center p-4" style={{ background: 'var(--p3r-scrim)' }} onClick={onClose}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
            <motion.div role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md overflow-hidden px-8 pb-9 pt-8 text-center"
              style={{ clipPath: 'polygon(22px 0, 100% 0, calc(100% - 22px) 100%, 0 100%)', background: CELEB_BG[theme] }}
              initial={anim ? { scale: 0.5, opacity: 0, x: -12, y: 12 } : { opacity: 0 }} animate={{ scale: 1, opacity: 1, x: 0, y: 0 }}
              exit={anim ? { scale: 0.5, opacity: 0, x: -12, y: 12 } : { opacity: 0 }}
              transition={anim ? { type: 'spring', stiffness: 260, damping: 24 } : { duration: 0.16 }}>
              <span aria-hidden className="absolute left-0 top-0 z-10 h-[14px] w-[52px]" style={{ background: P3R.cyan, clipPath: 'polygon(0 0, 100% 0, 72% 100%, 0 100%)' }} />
              <span aria-hidden className="absolute bottom-0 right-6 z-10 h-[10px] w-[26px]" style={{ background: P3R.magenta, clipPath: tickClip }} />
              {/* 装饰：纵向高光 + 斜光带（只有装饰倾斜） */}
              <div aria-hidden className="absolute inset-0" style={{ background: 'linear-gradient(0deg, transparent, rgba(255,255,255,0.15), transparent)' }} />
              <div aria-hidden className="absolute -left-10 top-8 h-14 w-[150%]" style={{ background: 'rgba(255,255,255,0.1)', transform: 'rotate(-6deg)' }} />
              {anim && (
                <motion.span aria-hidden className="absolute inset-y-0 w-[22%]" style={{ background: 'rgba(255,255,255,0.28)', skewX: -20 }}
                  initial={{ x: '-120%' }} animate={{ x: '520%' }} transition={{ duration: 0.8, delay: 0.25, ease: 'easeOut' }} />
              )}
              {anim && parts.map((p, i) => (
                <motion.span key={i} aria-hidden className="pointer-events-none absolute left-1/2 top-1/2" style={{ width: p.s, height: p.s, background: p.c, clipPath: tickClip }}
                  initial={{ x: 0, y: 0, opacity: 0, scale: 0 }} animate={{ x: p.x, y: p.y, opacity: [0, 1, 0], scale: [0, 1.2, 0.6], rotate: p.rot }}
                  transition={{ duration: 1.1, delay: 0.15 + p.d, ease: 'easeOut' }} />
              ))}
              <div className="relative z-10" style={{ color: 'var(--p3r-cream)' }}>
                {eyebrow && <div className="mb-1 font-cond text-[12px] tracking-[0.3em]" style={{ color: 'rgba(255,248,240,0.8)' }}>{eyebrow}</div>}
                {icon && (
                  <motion.div className="mb-3 flex justify-center text-[56px] leading-none" initial={anim ? { scale: 0, rotate: -30 } : false} animate={{ scale: [0, 1.3, 1], rotate: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}>{icon}</motion.div>
                )}
                <h2 className="break-words font-heavy text-[clamp(24px,7vw,30px)] leading-tight">{title}</h2>
                {subtitle && <p className="mt-2 text-[15px] font-bold" style={{ color: 'rgba(255,248,240,0.86)' }}>{subtitle}</p>}
                {children && <div className="mt-4">{children}</div>}
              </div>
              <button type="button" onClick={onClose} aria-label="关闭" className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full text-xl"
                style={{ background: 'rgba(255,255,255,0.2)', color: 'rgba(255,248,240,0.9)' }}>×</button>
              {autoCloseMs > 0 && (
                <div aria-hidden className="absolute inset-x-0 bottom-0 z-10 h-1 overflow-hidden" style={{ background: 'rgba(255,255,255,0.2)' }}>
                  <motion.div className="h-full w-full origin-left" style={{ background: 'rgba(255,248,240,0.85)' }} initial={{ scaleX: 1 }} animate={{ scaleX: 0 }} transition={{ duration: autoCloseMs / 1000, ease: 'linear' }} />
                </div>
              )}
            </motion.div>
            {anim && <PetalBurst active={open} />}
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}

/* ───────────────────────── DarkStage（抽签 / 收官的水面舞台） ───────────────────────── */
/** 真实 p3 = radial(#16294a → #060d1d) + 白点水纹 .25；粉版 = 深莓夜 radial + 樱点水纹（日夜都用暗舞台，同真实「明暗模式免疫」） */
export const STAGE_BG = 'radial-gradient(circle at 50% 16%, #4a1a3c 0%, #2a0d22 55%, #14060f 100%)';
export function DarkStage({ children, onBackdrop, className, z = 'z-sheet' }: { children: ReactNode; onBackdrop?: () => void; className?: string; z?: string }) {
  return (
    <motion.div className={cx('fixed inset-0 flex items-center justify-center overflow-hidden px-5', z, className)} style={{ background: STAGE_BG }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} onMouseDown={onBackdrop}>
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,214,230,0.24) 1px, transparent 1.5px)', backgroundSize: '14px 14px', opacity: 0.3 }} />
      {children}
    </motion.div>
  );
}

/* ───────────────────────── 弹幕层 ───────────────────────── */
export interface DanmakuItem { id: string; text: string; mine?: boolean }
const HOLD_MS = 1500;
/**
 * 真实 DanmakuLayer：CSS 漂移（transform），云端条目（id 非空）长按 1.5s → 该条定格 + 跟随胶囊「⚑ 反馈并隐藏」；
 * 点胶囊 = 举报 + 本机屏蔽、toast「已反馈」；点别处 / 4s 无操作散去。官方种子（id 空串）纯装饰。
 * demo 增补：`autoHold` 直达长按态（?fx=press）；`sendText` 一条「我的」弹幕从右侧飞入（?fx=send）。
 */
export function DanmakuLayer({ items, topBase = 14, topStep = 14, durBase = 13, durStep = 4, autoHold, onFeedback, lineClass }: {
  items: DanmakuItem[]; topBase?: number; topStep?: number; durBase?: number; durStep?: number; autoHold?: number; onFeedback?: () => void; lineClass?: string;
}) {
  const anim = useBoldness();
  const [gone, setGone] = useState<string[]>([]);
  const [hold, setHold] = useState<{ item: DanmakuItem; x: number; y: number } | null>(null);
  const [charging, setCharging] = useState<string | null>(null);
  const [toast, setToast] = useState(false);
  const timer = useRef(0);
  const origin = useRef({ x: 0, y: 0 });
  const box = useRef<HTMLDivElement>(null);
  const refs = useRef<Record<string, HTMLSpanElement | null>>({});
  useEffect(() => () => window.clearTimeout(timer.current), []);
  useEffect(() => { if (!hold) return; const t = window.setTimeout(() => setHold(null), 4000); return () => clearTimeout(t); }, [hold]);
  const visible = items.filter((it) => !(it.id && gone.includes(it.id)));
  const fire = (it: DanmakuItem, el: HTMLElement | null) => {
    setCharging(null);
    if (!el) return;
    const r = el.getBoundingClientRect(); const b = box.current?.getBoundingClientRect();
    const bw = b?.width ?? window.innerWidth;
    setHold({ item: it, x: Math.min(Math.max(r.left + r.width / 2 - (b?.left ?? 0), 86), bw - 86), y: Math.max(r.top - (b?.top ?? 0), 60) });
  };
  // 直达：?fx=press → 第 autoHold 条自动走一次「按住 1.5s → 定格 → 胶囊」
  useEffect(() => {
    if (autoHold === undefined) return;
    const it = items.filter((x) => x.id)[autoHold];
    if (!it) return;
    const a = window.setTimeout(() => setCharging(it.id), 500);
    const b = window.setTimeout(() => fire(it, refs.current[it.id]), anim ? 500 + HOLD_MS : 600);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const begin = (it: DanmakuItem) => (e: React.PointerEvent<HTMLSpanElement>) => {
    const el = e.currentTarget; origin.current = { x: e.clientX, y: e.clientY };
    window.clearTimeout(timer.current); setCharging(it.id);
    timer.current = window.setTimeout(() => fire(it, el), HOLD_MS);
  };
  const cancel = () => { window.clearTimeout(timer.current); setCharging(null); };
  const move = (e: React.PointerEvent) => { const dx = e.clientX - origin.current.x; const dy = e.clientY - origin.current.y; if (dx * dx + dy * dy > 144) cancel(); };
  const confirm = () => {
    const t = hold; setHold(null); if (!t) return;
    setGone((g) => [...g, t.item.id]); onFeedback?.();
    setToast(true); window.setTimeout(() => setToast(false), 1800);
  };
  return (
    <div ref={box} data-qa-ignore className="pointer-events-none absolute inset-0 overflow-hidden">
      {visible.map((it, i) => {
        const frozen = hold?.item.id === it.id || charging === it.id;
        const dur = durBase + (i % 4) * durStep;
        return (
          <span key={`${i}-${it.id || it.text}`} ref={(el) => { if (it.id) refs.current[it.id] = el; }}
            aria-hidden={it.id ? undefined : true} aria-label={it.id ? `弹幕：${it.text}（长按可反馈）` : undefined}
            className={cx('absolute left-0 select-none whitespace-nowrap px-2.5 py-1 text-[12px] font-bold', it.id ? 'pointer-events-auto' : 'pointer-events-none', lineClass)}
            style={{
              top: `${topBase + (i % 6) * topStep}%`,
              color: it.mine ? 'var(--p3r-cream)' : frozen ? 'var(--p3r-mulberry)' : 'rgba(255,236,244,0.42)',
              background: it.mine ? 'rgb(var(--p3r-blue-rgb) / 0.85)' : frozen ? 'var(--pk-petal-a)' : 'transparent',
              clipPath: it.mine || frozen ? slantClip(6) : undefined,
              animation: anim ? `pk2-drift ${dur}s linear ${-((i * 2.3) % dur)}s infinite` : undefined,
              animationPlayState: frozen ? 'paused' : 'running',
              transform: anim ? undefined : `translateX(${8 + ((i * 37) % 60)}vw)`,
              WebkitTouchCallout: 'none',
            }}
            onPointerDown={it.id ? begin(it) : undefined} onPointerMove={it.id ? move : undefined} onPointerUp={it.id ? cancel : undefined}
            onPointerLeave={it.id ? cancel : undefined} onPointerCancel={it.id ? cancel : undefined} onContextMenu={it.id ? (e) => e.preventDefault() : undefined}>
            {it.text}
            {charging === it.id && anim && (
              <motion.span aria-hidden className="absolute inset-x-0 bottom-0 h-[2px] origin-left" style={{ background: P3R.blue }} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: HOLD_MS / 1000, ease: 'linear' }} />
            )}
          </span>
        );
      })}
      <style>{'@keyframes pk2-drift { from { transform: translateX(100vw); } to { transform: translateX(-120%); } }'}</style>
      <AnimatePresence>
        {hold && (
          <motion.div key={`hold-${hold.item.id}`} className="pointer-events-auto absolute inset-0 z-40" initial={false} exit={{ opacity: 0 }}>
            <div className="absolute inset-0" onPointerDown={() => setHold(null)} />
            <motion.button type="button" onClick={confirm}
              initial={{ opacity: 0, scale: 0.85, y: 5, x: '-50%' }} animate={{ opacity: 1, scale: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, scale: 0.9, x: '-50%' }} transition={{ duration: 0.14 }}
              className="absolute flex items-center gap-1.5 whitespace-nowrap py-2 pl-3 pr-4 text-[12px] font-black"
              style={{ left: hold.x, top: hold.y - 46, background: 'var(--p3r-mulberry)', color: 'var(--p3r-cream)', clipPath: slantClip(8) }}>
              <svg viewBox="0 0 12 12" width="11" height="11" fill="currentColor" aria-hidden><path d="M2.5 1a.5.5 0 0 1 .5.5V11a.5.5 0 0 1-1 0V1.5a.5.5 0 0 1 .5-.5Z" /><path d="M3.8 1.9 10 3.6 3.8 6.4Z" /></svg>
              反馈并隐藏
            </motion.button>
          </motion.div>
        )}
        {toast && (
          <motion.div key="dm-toast" className="absolute inset-x-0 bottom-20 z-50 flex justify-center" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <span className="px-4 py-1.5 text-[12px] font-black" style={{ background: 'var(--p3r-mulberry)', color: 'var(--p3r-cream)', clipPath: slantClip(7) }}>已反馈</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
