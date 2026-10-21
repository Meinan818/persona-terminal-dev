/**
 * P3Stagger / P3StaggerItem —— 页面主体分层入场（斜切滑入，错帧 40ms）。低动效直出。
 *   <P3Stagger className="grid grid-cols-1 gap-4"><P3StaggerItem>…</P3StaggerItem></P3Stagger>
 */
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { useBoldness } from '@pink/lib/prefs';

export const P3Stagger = ({ children, className, gap = 0.04 }: { children: ReactNode; className?: string; gap?: number }) => {
  const anim = useBoldness();
  return (
    <motion.div className={className} initial={anim ? 'hidden' : false} animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: gap } } }}>
      {children}
    </motion.div>
  );
};
export const P3StaggerItem = ({ children, className, from = 'left' }: { children: ReactNode; className?: string; from?: 'left' | 'right' | 'up' }) => (
  <motion.div className={className} variants={{
    hidden: { opacity: 0, x: from === 'left' ? -22 : from === 'right' ? 22 : 0, y: from === 'up' ? 16 : 0 },
    show: { opacity: 1, x: 0, y: 0, transition: { type: 'spring', stiffness: 420, damping: 34 } },
  }}>{children}</motion.div>
);
