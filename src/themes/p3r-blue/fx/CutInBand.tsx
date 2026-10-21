/**
 * CutInBand —— P3R 结算 / 技能 cut-in：整宽斜边带自左横扫 + 巨字 + 光片 + 气泡上浮。
 * 对应真实 TodoCompleteModal#BandCutInP3（今日完成 / 记录成功 / 记账完成共用）、CelebrationCutIn 的 p3 形态。
 * 粉版：斜带走 --p3r-sheet-grad 浅面板（夜间也用日间浅面板，同真实 .p3-dayface），强调色蓝 / 青 / 臂章红。
 *
 *   <CutInBand open={o} onClose={…} eyebrow="TODAY CLEAR" title="今日完成！" sub="+12 PTS" ghost="CLEAR" autoCloseMs={2600}>
 *     <P3Button>继续</P3Button>        // 可选：底部动作
 *   </CutInBand>
 * 点击任意处关闭；低动效：直出终态 + 淡入淡出。
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, type ReactNode } from 'react';
import { Portal, useEscape } from '@blue/kit/Portal';
import { useBoldness } from '@blue/lib/prefs';
import { P3R, slantClip, tickClip, ShatteredStar } from '@blue/kit/base';
import { BubbleBurst, ShardCheck } from './motifs';

export interface CutInBandProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  eyebrow?: ReactNode;
  sub?: ReactNode;
  ghost?: string;
  /** 右侧主视觉：'check' 碎裂勾（默认）| 'star' 碎裂星 | 自定义节点 */
  visual?: 'check' | 'star' | ReactNode;
  autoCloseMs?: number;
  children?: ReactNode;
  /** 浅遮罩（背景页面可见，同真实 p3-modal-06）或深遮罩 */
  scrim?: 'light' | 'dark';
}

export const CutInBand = ({ open, onClose, title, eyebrow, sub, ghost, visual = 'check', autoCloseMs, children, scrim = 'light' }: CutInBandProps) => {
  const anim = useBoldness();
  useEscape(open, onClose);
  useEffect(() => { if (!open || !autoCloseMs) return; const t = window.setTimeout(onClose, autoCloseMs); return () => clearTimeout(t); }, [open, autoCloseMs, onClose]);
  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 flex items-center justify-center overflow-hidden" role="dialog" aria-modal="true"
            style={{ zIndex: 'var(--p3r-z-cutin)' as unknown as number, background: scrim === 'light' ? 'rgba(21, 32, 59, 0.22)' : 'var(--p3r-scrim)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} onClick={onClose}>
            {/* 横贯斜带（真实 BandCutInP3：整宽带 + 斜边 clip，自左横扫；字恒水平） */}
            <motion.div className="relative w-full" initial={anim ? { x: '-105%', skewX: -6 } : { opacity: 0 }} animate={{ x: 0, skewX: 0, opacity: 1 }} exit={anim ? { x: '105%' } : { opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 30 }}>
              <div className="p3-dayface relative overflow-hidden" style={{ background: 'var(--p3r-sheet-grad)', clipPath: 'polygon(0 12%, 100% 0, 100% 88%, 0 100%)', boxShadow: '0 18px 60px rgba(21,32,59,0.28)' }}>
                <span aria-hidden className="absolute inset-x-0 top-0 h-[16%]" style={{ background: P3R.blue, clipPath: 'polygon(0 75%, 100% 0, 100% 40%, 0 100%)' }} />
                <span aria-hidden className="absolute inset-x-0 bottom-0 h-[16%]" style={{ background: P3R.cyan, clipPath: 'polygon(0 60%, 100% 0, 100% 100%, 0 100%)', opacity: 0.8 }} />
                {anim && <motion.span aria-hidden className="absolute inset-y-0 w-[18%]" style={{ background: 'rgba(255,255,255,0.55)', skewX: -24 }} initial={{ x: '-40vw' }} animate={{ x: '140vw' }} transition={{ duration: 0.9, delay: 0.25, ease: 'easeOut' }} />}
                {ghost && <div aria-hidden className="pointer-events-none absolute -top-2 right-[6%] font-cond text-[clamp(80px,22vw,200px)] uppercase leading-none" style={{ color: 'var(--p3r-ghost)' }}>{ghost}</div>}
                <div className="relative mx-auto flex max-w-[860px] items-center justify-between gap-4 px-6 py-12 wide:px-12">
                  <div className="min-w-0 flex-1">
                    {eyebrow && (
                      <div className="mb-1 flex items-center gap-2">
                        <span className="truncate font-cond text-[13px] tracking-[0.2em]" style={{ color: P3R.ink }}>{eyebrow}</span>
                        <span aria-hidden className="h-[10px] w-[12px] shrink-0" style={{ background: P3R.magenta, clipPath: tickClip }} />
                      </div>
                    )}
                    <motion.div className="font-heavy text-[clamp(30px,9vw,60px)] leading-[1.04]" style={{ color: P3R.ink }}
                      initial={anim ? { clipPath: 'inset(-10% 102% -20% -3%)' } : false} animate={{ clipPath: 'inset(-10% -6% -20% -3%)' }} transition={{ duration: 0.4, delay: 0.22 }}>{title}</motion.div>
                    {sub && (
                      <div className="mt-2 inline-flex max-w-full items-center px-4 py-1.5" style={{ background: P3R.blue, clipPath: slantClip(10) }}>
                        <span className="truncate font-cond text-[clamp(15px,4.4vw,22px)] tracking-wider" style={{ color: P3R.onBlue }}>{sub}</span>
                      </div>
                    )}
                  </div>
                  <motion.div className="h-[clamp(80px,22vw,160px)] w-[clamp(96px,26vw,190px)] shrink-0"
                    initial={anim ? { scale: 0.3, opacity: 0, rotate: -30 } : false} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.3 }}>
                    {visual === 'check' ? <ShardCheck className="h-full w-full" /> : visual === 'star' ? <ShatteredStar className="h-full w-full" /> : visual}
                  </motion.div>
                </div>
              </div>
            </motion.div>
            {children && (
              <motion.div className="absolute inset-x-0 bottom-[calc(28px+env(safe-area-inset-bottom))] flex justify-center px-6" onClick={(e) => e.stopPropagation()}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: anim ? 0.55 : 0 }}>{children}</motion.div>
            )}
            <BubbleBurst active={open} />
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
};
