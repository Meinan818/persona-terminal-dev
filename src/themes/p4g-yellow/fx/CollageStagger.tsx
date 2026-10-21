/**
 * 拼贴块分层入场：子块依次从下方带微倾斜"贴"上来（y 18→0、rotate ±2°→目标、opacity 0→1）。
 *   <CollageStagger className="grid gap-3">
 *     <CollageItem><P4Card/></CollageItem>
 *     <CollageItem tilt={-1.5}><P4Card/></CollageItem>
 *   </CollageStagger>
 * stagger 默认 0.04s（--p4g-stagger）。低动效：仅淡入，无位移。
 */
import { motion, type Variants } from 'framer-motion';
import type { ReactNode, CSSProperties } from 'react';
import { useLowMotion } from '@yellow/lib/prefs';

export interface CollageStaggerProps { children: ReactNode; className?: string; style?: CSSProperties; stagger?: number; delay?: number; as?: 'div' | 'ul' | 'section' }

export function CollageStagger({ children, className, style, stagger = 0.04, delay = 0, as = 'div' }: CollageStaggerProps) {
  const low = useLowMotion();
  const M = motion[as];
  const v: Variants = { hidden: {}, show: { transition: { staggerChildren: low ? 0 : stagger, delayChildren: delay } } };
  return <M className={className} style={style} variants={v} initial="hidden" animate="show">{children}</M>;
}

export interface CollageItemProps { children: ReactNode; className?: string; style?: CSSProperties; tilt?: number; from?: 'up' | 'left' | 'right'; as?: 'div' | 'li' }
export function CollageItem({ children, className, style, tilt = 0, from = 'up', as = 'div' }: CollageItemProps) {
  const low = useLowMotion();
  const M = motion[as];
  const off = from === 'left' ? { x: -28, y: 0 } : from === 'right' ? { x: 28, y: 0 } : { x: 0, y: 18 };
  const v: Variants = low
    ? { hidden: { opacity: 0 }, show: { opacity: 1, rotate: tilt, transition: { duration: 0.12 } } }
    : {
        hidden: { opacity: 0, ...off, rotate: tilt + (from === 'right' ? 3 : -3), scale: 0.96 },
        show: { opacity: 1, x: 0, y: 0, rotate: tilt, scale: 1, transition: { duration: 0.28, ease: [0.2, 0.9, 0.1, 1] } },
      };
  return <M className={className} style={style} variants={v}>{children}</M>;
}
