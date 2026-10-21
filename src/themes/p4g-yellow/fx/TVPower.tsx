/**
 * 电视开/关机（光点展开 / 收缩）。
 *
 * 1) 作为弹窗面板的进出场：把 variants 交给 motion 元素（放在 <AnimatePresence> 里）
 *      <motion.div variants={tvPowerVariants(low)} initial="off" animate="on" exit="off" />
 *    或直接用包裹组件：
 *      <AnimatePresence>{open && <TVPowerOn key="x"><Panel/></TVPowerOn>}</AnimatePresence>
 *    开机：中心一条白亮横线（scaleY≈0.01）→ 横向拉满 → 纵向展开；关机反向收成光点。
 * 2) 全屏关机演出：<TVPowerOff active onDone={()=>...} />（黑幕从上下合拢成横线 → 光点 → 消失）
 *
 * 低动效：只做 opacity 淡入淡出。只动 transform/opacity。
 */
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import type { CSSProperties, ReactNode } from 'react';
import { useEffect } from 'react';
import { useLowMotion } from '@yellow/lib/prefs';
import { cx } from '@yellow/lib/cx';

export const tvPowerVariants = (low = false): Variants =>
  low
    ? { off: { opacity: 0, transition: { duration: 0.12 } }, on: { opacity: 1, transition: { duration: 0.12 } } }
    : {
        off: {
          scaleX: [1, 1, 0.02], scaleY: [1, 0.012, 0.012], opacity: [1, 1, 0],
          transition: { duration: 0.32, times: [0, 0.55, 1], ease: [0.7, 0, 0.3, 1] },
        },
        on: {
          scaleX: [0.02, 1, 1], scaleY: [0.012, 0.012, 1], opacity: [0, 1, 1],
          transition: { duration: 0.42, times: [0, 0.38, 1], ease: [0.16, 1, 0.3, 1] },
        },
      };

/** 开机闪白（叠在面板上方，开机瞬间白亮→淡出）*/
export const TVFlash = ({ low }: { low?: boolean }) =>
  low ? null : (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute inset-0 bg-white"
      initial={{ opacity: 0.95 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 0.38, delay: 0.16, ease: 'easeOut' }}
    />
  );

export interface TVPowerOnProps { children: ReactNode; className?: string; style?: CSSProperties; flash?: boolean }
/** 包裹组件：挂载 = 开机，卸载（AnimatePresence 内）= 关机 */
export function TVPowerOn({ children, className, style, flash = true }: TVPowerOnProps) {
  const low = useLowMotion();
  return (
    <motion.div className={cx('relative origin-center', className)} style={style} variants={tvPowerVariants(low)} initial="off" animate="on" exit="off">
      {children}
      {flash && <TVFlash low={low} />}
    </motion.div>
  );
}

export interface TVPowerOffProps { active: boolean; onDone?: () => void; color?: string }
/** 全屏关机：上下黑幕合拢 → 白色横线 → 光点 → 消失 */
export function TVPowerOff({ active, onDone, color = '#000' }: TVPowerOffProps) {
  const low = useLowMotion();
  useEffect(() => {
    if (!active) return;
    const t = window.setTimeout(() => onDone?.(), low ? 160 : 620);
    return () => clearTimeout(t);
  }, [active, low, onDone]);
  return (
    <AnimatePresence>
      {active && (
        <motion.div key="tvoff" className="pointer-events-none fixed inset-0" style={{ zIndex: 'var(--p4g-z-transition)' as unknown as number }} initial={{ opacity: low ? 0 : 1 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          {low ? <div className="absolute inset-0" style={{ background: color }} /> : (<>
            <motion.div className="absolute inset-x-0 top-0 h-1/2 origin-top" style={{ background: color }} initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 0.22, ease: [0.7, 0, 0.84, 0] }} />
            <motion.div className="absolute inset-x-0 bottom-0 h-1/2 origin-bottom" style={{ background: color }} initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 0.22, ease: [0.7, 0, 0.84, 0] }} />
            <motion.div className="absolute left-0 right-0 top-1/2 h-[3px] -mt-[1.5px] bg-white" initial={{ scaleX: 1, opacity: 0 }} animate={{ scaleX: [1, 1, 0.004], opacity: [0, 1, 1] }} transition={{ duration: 0.36, delay: 0.2, times: [0, 0.2, 1], ease: [0.7, 0, 0.3, 1] }} />
            <motion.div className="absolute left-1/2 top-1/2 -ml-[5px] -mt-[5px] h-[10px] w-[10px] rounded-full bg-white" initial={{ scale: 0, opacity: 0 }} animate={{ scale: [0, 1.4, 0], opacity: [0, 1, 0] }} transition={{ duration: 0.26, delay: 0.5 }} />
          </>)}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
