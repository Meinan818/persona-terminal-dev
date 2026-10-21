/**
 * CelebrationStage —— 工作包 1 的庆祝演出舞台（对应真实 P4CutInStage + CelebrationCutIn 的 P4 橙圆贴纸）。
 *
 * 时序（P4G Rank Up / LEVEL UP 节奏，快进硬停）：
 *   黑幕 0→ → 黄底彩色速度线斜带从右砸入（cutin-speedlines）→ 上下黄黑条纹扫过 →
 *   主徽（橙色大圆贴纸：奶油描边 + 同心环 + 大四角星）旋入 → 黑斜章题板（白字粗黑描边）→
 *   奶油缎带副句 → 四角星闪光 → 点击任意处 / autoCloseMs 收场；底部倒计时条走 scaleX。
 * 关闭按钮 aria「关闭」。低动效：全部改为淡入淡出、不旋转不位移。
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useId, type ReactNode } from 'react';
import { Portal, useEscape, P4Outline, IconClose } from '@yellow/kit';
import { useLowMotion } from '@yellow/lib/prefs';
import { p4gAsset } from '@yellow/lib/asset';
import { useImageOk } from '@yellow/lib/slots';
import { cx } from '@yellow/lib/cx';
import { Sparkle4 } from './bits';

export interface CelebrationStageProps {
  open: boolean;
  onClose: () => void;
  ariaLabel: string;
  eyebrow?: string;
  plate: ReactNode;
  ribbon?: ReactNode;
  badge?: ReactNode;
  badgeTone?: 'orange' | 'yellow' | 'black';
  autoCloseMs?: number;
  extra?: ReactNode;
  showClose?: boolean;
  overlay?: ReactNode;
  /** 时序（对齐真实 p4r/cutins：LevelUp 题板 .28 / 缎带 .76；今日完成 .34 / .5；成就 .34 / 蓝名板 .48 / 旗标 .62）*/
  plateDelay?: number;
  ribbonDelay?: number;
  extraDelay?: number;
  /** 题板下的第二块板（成就解锁的蓝名板） */
  subPlate?: ReactNode;
  subPlateDelay?: number;
  /** 主徽落地迸开的星与花（真实 Confetti，默认开） */
  confetti?: boolean;
}

/** 五瓣花（真实 P4Flower 的 demo 版） */
export const Flower5 = ({ size = 24, color = 'currentColor', className }: { size?: number; color?: string; className?: string }) => (
  <svg aria-hidden width={size} height={size} viewBox="0 0 100 100" className={className}>
    {[0, 72, 144, 216, 288].map((r) => <ellipse key={r} cx="50" cy="27" rx="17" ry="25" fill={color} transform={`rotate(${r} 50 50)`} />)}
    <circle cx="50" cy="50" r="13" fill="var(--p4g-cream)" />
  </svg>
);

/** 贴纸描边：底下垫一枚放大的奶油同形副本（同真实 Outlined，不走 filter） */
export const StickerGlyph = ({ size, color, kind }: { size: number; color: string; kind: 'star' | 'flower' }) => {
  const G = kind === 'star' ? Sparkle4 : Flower5;
  return (
    <span className="relative inline-block" style={{ width: size, height: size }} aria-hidden>
      <span className="absolute left-1/2 top-1/2" style={{ transform: 'translate(-50%,-50%) scale(1.34)' }}><G size={size} color="var(--p4g-cream)" /></span>
      <span className="absolute inset-0"><G size={size} color={color} /></span>
    </span>
  );
};

const CONFETTI: Array<{ dx: number; dy: number; s: number; c: string; kind: 'star' | 'flower' }> = [
  { dx: -152, dy: -74, s: 30, c: 'var(--p4g-blue)', kind: 'star' },
  { dx: 156, dy: -62, s: 24, c: 'var(--p4g-yellow)', kind: 'star' },
  { dx: -148, dy: 84, s: 34, c: 'var(--p4g-yellow)', kind: 'flower' },
  { dx: 150, dy: 92, s: 36, c: 'var(--p4g-blue)', kind: 'flower' },
  { dx: 8, dy: -136, s: 22, c: 'var(--p4g-cream)', kind: 'star' },
  { dx: -172, dy: 12, s: 18, c: 'var(--p4g-orange)', kind: 'star' },
  { dx: 176, dy: 22, s: 20, c: 'var(--p4g-orange)', kind: 'star' },
];

/** 主徽落定时一圈星花迸开（真实 Confetti：spring 260/17，delay .42 + i×.035）。低动效不渲染。 */
export function StickerBurst({ low }: { low: boolean }) {
  if (low) return null;
  const k = typeof window === 'undefined' ? 1 : Math.min(1, Math.max(0.7, window.innerWidth / 440));
  return (
    <>
      {CONFETTI.map((b, i) => (
        <motion.span key={i} aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 z-20" style={{ marginLeft: -b.s / 2, marginTop: -b.s / 2 }}
          initial={{ x: 0, y: 0, scale: 0, rotate: -40, opacity: 0 }}
          animate={{ x: b.dx * k, y: b.dy * k, scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 17, delay: 0.42 + i * 0.035 }}>
          <StickerGlyph size={b.s} color={b.c} kind={b.kind} />
        </motion.span>
      ))}
    </>
  );
}

export function CelebrationStage({ open, onClose, ariaLabel, eyebrow, plate, ribbon, badge, badgeTone = 'orange', autoCloseMs = 4200, extra, showClose = true, overlay, plateDelay = 0.32, ribbonDelay = 0.5, extraDelay = 0.7, subPlate, subPlateDelay = 0.48, confetti = true }: CelebrationStageProps) {
  const low = useLowMotion();
  const titleId = useId();
  const speed = p4gAsset('cutin-speedlines.webp');
  const speedOk = useImageOk(speed);
  useEscape(open, onClose);
  useEffect(() => {
    if (!open || !autoCloseMs) return;
    const t = window.setTimeout(onClose, autoCloseMs);
    return () => clearTimeout(t);
  }, [open, autoCloseMs, onClose]);
  const ease = [0.2, 0.9, 0.1, 1] as const;
  const T = (d: number, delay = 0) => ({ duration: low ? 0.14 : d, delay: low ? 0 : delay, ease });

  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <motion.div
            key="stage"
            role="dialog" aria-modal="true" aria-label={ariaLabel} aria-labelledby={titleId}
            className="fixed inset-0 flex items-center justify-center overflow-hidden"
            style={{ zIndex: 'var(--p4g-z-celebration)' as unknown as number }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.2 } }}
            onClick={onClose}
          >
            <div className="absolute inset-0 bg-black/[0.78]" />
            {/* 速度线斜带 */}
            <motion.div
              aria-hidden
              className="absolute left-[-25%] right-[-25%] h-[min(56vh,520px)] overflow-hidden border-y-[6px] border-p4g-black bg-p4g-yellow"
              style={{ rotate: -7, top: 'calc(50% - min(28vh, 260px))' }}
              initial={low ? { opacity: 0 } : { x: '100%' }}
              animate={low ? { opacity: 1 } : { x: '0%' }}
              exit={low ? { opacity: 0 } : { x: '-100%', transition: { duration: 0.22, ease: [0.7, 0, 0.84, 0] } }}
              transition={T(0.26)}
            >
              <motion.div
                className="absolute inset-[-8%]"
                style={{ backgroundImage: speedOk === false ? 'repeating-conic-gradient(from 0deg at 30% 60%, #111 0 3deg, transparent 3deg 11deg)' : `url(${speed})`, backgroundSize: 'cover', backgroundPosition: '30% 50%' }}
                animate={low ? undefined : { scale: [1, 1.08] }}
                transition={{ duration: 3, ease: 'linear' }}
              />
              <div className="absolute inset-x-0 top-0 h-3 p4g-candy" />
              <div className="absolute inset-x-0 bottom-0 h-3 p4g-candy" />
            </motion.div>
            {/* 黄黑条纹扫过 */}
            {[{ top: '9%', from: '-110%', rot: -7 }, { top: '88%', from: '110%', rot: -7 }].map((b, i) => (
              <motion.div key={i} aria-hidden className="absolute left-[-20%] right-[-20%] h-[18px] border-y-2 border-p4g-black p4g-hazard"
                style={{ top: b.top, rotate: b.rot }}
                initial={low ? { opacity: 0 } : { x: b.from }} animate={low ? { opacity: 1 } : { x: '0%' }} exit={{ opacity: 0 }} transition={T(0.3, 0.08 + i * 0.05)} />
            ))}
            {/* 背后巨大同心环（真实 P4CutInStage：scale .42→1 / rotate −26→0，0.9s）*/}
            <motion.svg aria-hidden viewBox="0 0 200 200" className="pointer-events-none absolute left-1/2 top-1/2 h-[min(118vw,74vh,600px)] w-[min(118vw,74vh,600px)]"
              style={{ x: '-50%', y: '-50%' }}
              initial={low ? { opacity: 0 } : { scale: 0.42, rotate: -26, opacity: 0 }} animate={low ? { opacity: 0.9 } : { scale: 1, rotate: 0, opacity: 0.9 }}
              transition={{ duration: low ? 0.14 : 0.9, ease: [0.16, 1, 0.3, 1] }}>
              {[96, 84, 72, 60].map((r, i) => <circle key={r} cx="100" cy="100" r={r} fill="none" stroke={i % 2 ? 'var(--p4g-cream)' : 'var(--p4g-orange)'} strokeWidth={i % 2 ? 2 : 5} strokeDasharray={i % 2 ? '3 7' : '46 12 10 12'} opacity={0.85} />)}
            </motion.svg>
            {overlay}

            {/* 中心列 */}
            <div className="relative flex max-h-[100dvh] w-[min(92vw,520px)] min-w-0 flex-col items-center px-3 py-4" onClick={(e) => e.stopPropagation()}>
              {eyebrow && (
                <motion.span className="relative z-20 mb-1 -rotate-3 rounded-xs bg-p4g-black px-2.5 py-0.5 font-display text-meta font-bold uppercase italic tracking-[0.28em] text-p4g-yellow shadow-[3px_3px_0_var(--p4g-orange)]"
                  initial={low ? { opacity: 0 } : { opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={T(0.2, 0.2)}>{eyebrow}</motion.span>
              )}
              {badge !== undefined && (
                <motion.div
                  className="relative z-10 flex items-center justify-center"
                  style={{ width: 'min(54vw, 40vh, 240px)', height: 'min(54vw, 40vh, 240px)' }}
                  initial={low ? { opacity: 0 } : { scale: 0.2, rotate: -40, opacity: 0 }}
                  animate={low ? { opacity: 1 } : { scale: 1, rotate: 0, opacity: 1 }}
                  transition={T(0.34, 0.14)}
                >
                  {/* 同心环 */}
                  <motion.svg aria-hidden viewBox="0 0 200 200" className="absolute inset-[-14%] h-[128%] w-[128%]"
                    animate={low ? undefined : { rotate: 360 }} transition={{ duration: 24, ease: 'linear', repeat: Infinity }}>
                    <circle cx="100" cy="100" r="96" fill="none" stroke="var(--p4g-yellow)" strokeWidth="5" strokeDasharray="40 10 8 10" />
                    <circle cx="100" cy="100" r="88" fill="none" stroke="var(--p4g-orange)" strokeWidth="3" strokeDasharray="4 8" />
                  </motion.svg>
                  <div className={cx('absolute inset-0 rounded-pill border-[6px] border-p4g-black shadow-[0_0_0_6px_var(--p4g-cream),8px_10px_0_6px_#000]',
                    badgeTone === 'orange' && 'bg-p4g-orange', badgeTone === 'yellow' && 'bg-p4g-yellow', badgeTone === 'black' && 'bg-p4g-black')} />
                  <div aria-hidden className="absolute inset-[10%] rounded-pill border-[3px] border-dashed border-p4g-black/40" />
                  <motion.div className="relative flex h-full w-full items-center justify-center"
                    animate={low ? undefined : { scale: [1, 1.05, 1] }} transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut', delay: 1.1 }}>{badge}</motion.div>
                  {confetti && <StickerBurst low={low} />}
                </motion.div>
              )}
              <motion.div className="relative z-20 -mt-4 max-w-full"
                initial={low ? { opacity: 0 } : { scale: 1.6, opacity: 0, rotate: -6 }} animate={low ? { opacity: 1 } : { scale: 1, opacity: 1, rotate: -4 }} transition={T(0.22, plateDelay)}>
                <div className="relative border-[4px] border-p4g-black bg-p4g-black px-5 py-1.5 shadow-[6px_6px_0_var(--p4g-orange)]" style={{ transform: 'skewX(-10deg)' }}>
                  <div style={{ transform: 'skewX(10deg)' }} id={titleId}>
                    <P4Outline size="clamp(28px,8.4vw,48px)" stroke={6} fill="var(--p4g-yellow)" strokeColor="#000" italic className="leading-none">{plate}</P4Outline>
                  </div>
                  <Sparkle4 size={22} color="var(--p4g-white)" className="absolute -right-3 -top-3" />
                  <Sparkle4 size={14} color="var(--p4g-yellow)" className="absolute -bottom-2 left-3" />
                </div>
              </motion.div>
              {subPlate && (
                <motion.div className="relative z-20 -mt-1 max-w-full"
                  initial={low ? { opacity: 0 } : { scaleX: 0.12, opacity: 0 }} animate={low ? { opacity: 1 } : { scaleX: 1, opacity: 1 }} transition={T(0.24, subPlateDelay)} style={{ transformOrigin: 'left center' }}>
                  <div className="max-w-full rotate-2 rounded-[12px] border-[4px] border-p4g-black bg-p4g-blue px-5 py-1 text-center font-display text-h2 font-bold text-p4g-yellow shadow-[0_0_0_4px_var(--p4g-cream),5px_6px_0_4px_#000]">
                    <span className="p4g-clamp-2">{subPlate}</span>
                  </div>
                </motion.div>
              )}
              {ribbon && (
                <motion.div className="relative z-20 mt-3 max-w-full"
                  initial={low ? { opacity: 0 } : { scaleX: 0, opacity: 0 }} animate={low ? { opacity: 1 } : { scaleX: 1, opacity: 1 }} transition={T(0.24, ribbonDelay)}>
                  <div className="max-w-full border-3 border-p4g-black bg-p4g-cream px-4 py-1.5 text-center font-display text-lead font-bold text-p4g-black shadow-hard" style={{ transform: 'rotate(-1.5deg)', clipPath: 'polygon(10px 0,100% 0,calc(100% - 10px) 100%,0 100%)' }}>
                    <span className="p4g-clamp-2 px-2">{ribbon}</span>
                  </div>
                </motion.div>
              )}
              {extra && <motion.div className="relative z-20 mt-2.5 max-w-full" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={T(0.3, extraDelay)}>{extra}</motion.div>}
              {autoCloseMs ? (
                <div className="relative z-20 mt-4 h-[5px] w-[140px] overflow-hidden rounded-pill border border-p4g-black bg-p4g-black/60">
                  <motion.div className="absolute inset-0 origin-left bg-p4g-yellow" initial={{ scaleX: 1 }} animate={{ scaleX: 0 }} transition={{ duration: autoCloseMs / 1000, ease: 'linear' }} />
                </div>
              ) : null}
            </div>
            {/* 闪光 */}
            {!low && [
              { l: '14%', t: '22%', s: 26, d: 0.5 }, { l: '82%', t: '18%', s: 20, d: 0.62 }, { l: '76%', t: '72%', s: 30, d: 0.7 }, { l: '20%', t: '76%', s: 18, d: 0.8 },
            ].map((p, i) => (
              <motion.span key={i} aria-hidden className="pointer-events-none absolute" style={{ left: p.l, top: p.t }}
                initial={{ scale: 0, opacity: 0 }} animate={{ scale: [0, 1.3, 1], opacity: [0, 1, 0.9] }} transition={{ duration: 0.4, delay: p.d }}>
                <Sparkle4 size={p.s} color={i % 2 ? 'var(--p4g-yellow)' : 'var(--p4g-white)'} />
              </motion.span>
            ))}
            {showClose && (
              <button type="button" aria-label="关闭" onClick={(e) => { e.stopPropagation(); onClose(); }}
                className="absolute right-3 top-[calc(12px+env(safe-area-inset-top))] z-30 flex h-11 w-11 items-center justify-center rounded-sm border-3 border-p4g-yellow bg-p4g-black text-p4g-yellow shadow-[3px_3px_0_var(--p4g-orange)] active:translate-x-[2px] active:translate-y-[2px]">
                <IconClose size={18} />
              </button>
            )}
            <span className="pointer-events-none absolute bottom-[calc(14px+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 whitespace-nowrap p4g-outline-sm font-display text-meta font-bold">点击任意处继续 ○</span>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}

/** 主徽里的大四角星 + 可选文字 */
export const BadgeStar = ({ children, color = 'var(--p4g-cream)' }: { children?: ReactNode; color?: string }) => (
  <div className="relative flex h-full w-full items-center justify-center">
    <svg aria-hidden viewBox="0 0 100 100" className="absolute h-[86%] w-[86%] drop-shadow-[4px_4px_0_#000]">
      <path d="M50 2 C54 34 64 44 98 50 C64 56 54 66 50 98 C46 66 36 56 2 50 C36 44 46 34 50 2Z" fill={color} stroke="#111" strokeWidth="3.5" strokeMiterlimit="12" />
    </svg>
    <div className="relative flex flex-col items-center">{children}</div>
  </div>
);
