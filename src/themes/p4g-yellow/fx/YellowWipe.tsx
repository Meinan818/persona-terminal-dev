/**
 * 黄色方块推屏转场（P4G 菜单切换：黄底方块阵从右推入盖满 → 切页 → 向左推出）。
 *   <YellowWipe active={on} onCovered={() => navigate()} onDone={() => setOn(false)} />
 * 结构：主黄幕（带方块像素阵）+ 前缘黑斜边 + 彩虹细条；后随一块橙色追帧。只动 translateX。
 * 低动效：改为 120ms 黄幕淡入淡出。
 */
import { AnimatePresence, motion, useAnimationControls } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { useLowMotion } from '@yellow/lib/prefs';

export interface YellowWipeProps { active: boolean; onCovered?: () => void; onDone?: () => void; direction?: 'left' | 'right' }

export function YellowWipe({ active, onCovered, onDone, direction = 'left' }: YellowWipeProps) {
  const low = useLowMotion();
  const cb = useRef({ onCovered, onDone });
  cb.current = { onCovered, onDone };
  const ctl = useAnimationControls();
  const ctl2 = useAnimationControls();
  const sign = direction === 'left' ? 1 : -1;

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    (async () => {
      if (low) {
        await ctl.start({ opacity: 1, x: '0%', transition: { duration: 0.08 } });
        if (cancelled) return;
        cb.current.onCovered?.();
        await ctl.start({ opacity: 0, transition: { duration: 0.12 } });
      } else {
        ctl.set({ x: `${110 * sign}%`, opacity: 1 });
        ctl2.set({ x: `${120 * sign}%` });
        ctl2.start({ x: '0%', transition: { duration: 0.24, ease: [0.7, 0, 0.3, 1] } });
        await ctl.start({ x: '0%', transition: { duration: 0.26, delay: 0.04, ease: [0.7, 0, 0.3, 1] } });
        if (cancelled) return;
        cb.current.onCovered?.();
        await new Promise((r) => setTimeout(r, 60));
        if (cancelled) return;
        ctl2.set({ x: `${-120 * sign}%` });
        await ctl.start({ x: `${-110 * sign}%`, transition: { duration: 0.26, ease: [0.7, 0, 0.3, 1] } });
      }
      if (!cancelled) cb.current.onDone?.();
    })();
    return () => { cancelled = true; };
  }, [active, low, ctl, ctl2, sign]);

  return (
    <AnimatePresence>
      {active && (
        <div key="wipe" className="pointer-events-none fixed inset-0 overflow-hidden" style={{ zIndex: 'var(--p4g-z-transition)' as unknown as number }}>
          {!low && <motion.div className="absolute inset-y-0 -left-[10%] w-[120%] bg-p4g-orange" style={{ skewX: -12 }} animate={ctl2} initial={{ x: `${120 * sign}%` }} />}
          <motion.div className="absolute inset-y-0 -left-[15%] w-[130%]" style={{ skewX: low ? 0 : -12 }} animate={ctl} initial={low ? { opacity: 0 } : { x: `${110 * sign}%` }}>
            <div className="p4g-stage absolute inset-0" style={{ backgroundColor: 'var(--p4g-yellow)' }} />
            {/* 前缘：黑粗边 + 彩虹细条 */}
            <div className="absolute inset-y-0 left-0 w-[10px] bg-p4g-black" />
            <div className="absolute inset-y-0 left-[10px] w-[18px]" style={{ background: 'linear-gradient(90deg,#fff 0 20%,#e2231a 20% 40%,#f39800 40% 60%,#3cb04a 60% 80%,#33c2ee 80% 100%)' }} />
            <div className="absolute inset-y-0 right-0 w-[10px] bg-p4g-black" />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
