/**
 * P6 私有：P4G 斜切通知条（同步浮标 / 返回键提示 / PWA 更新）——
 * 黑条从左斜切滑入 + 黄色类型签 + CRT 扫描线一闪，自动淡出。只动 transform/opacity。
 */
import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { Portal } from '@yellow/kit';
import { useLowMotion } from '@yellow/lib/prefs';
import { cx } from '@yellow/lib/cx';

export function P6Strip({ show, tag, tagTone = 'yellow', children, actions, position = 'top', role = 'status' }: { show: boolean; tag?: ReactNode; tagTone?: 'yellow' | 'orange' | 'red' | 'green'; children: ReactNode; actions?: ReactNode; position?: 'top' | 'bottom' | 'bottom-high'; role?: 'status' | 'alert' }) {
  const low = useLowMotion();
  return (
    <Portal>
      <AnimatePresence>
        {show && (
          <motion.div key="strip" role={role} aria-live="polite"
            className={cx('pointer-events-none fixed inset-x-0 mx-auto flex w-[min(92vw,460px)] justify-center',
              position === 'top' ? 'top-[calc(env(safe-area-inset-top)+64px)]' : position === 'bottom-high' ? 'bottom-32' : 'bottom-[calc(var(--p4g-nav-h)+24px+env(safe-area-inset-bottom))] wide:bottom-8')}
            style={{ zIndex: 'var(--p4g-z-toast)' as unknown as number }}
            initial={low ? { opacity: 0 } : { opacity: 0, x: -60, skewX: -12 }} animate={low ? { opacity: 1 } : { opacity: 1, x: 0, skewX: 0 }} exit={low ? { opacity: 0 } : { opacity: 0, x: 60 }}
            transition={{ duration: 0.24, ease: [0.2, 0.9, 0.1, 1] }}>
            <div className="pointer-events-auto relative flex min-w-0 max-w-full items-stretch overflow-hidden border-3 border-p4g-black bg-p4g-black text-p4g-white shadow-[5px_5px_0_var(--p4g-yellow)] night:border-p4g-yellow night:shadow-[5px_5px_0_var(--p4g-orange)]">
              {tag && <span className={cx('flex shrink-0 items-center px-2.5 font-display text-meta font-bold text-p4g-black', tagTone === 'yellow' ? 'bg-p4g-yellow' : tagTone === 'orange' ? 'bg-p4g-orange' : tagTone === 'green' ? 'bg-p4g-green' : 'bg-p4g-red text-p4g-white')}>{tag}</span>}
              <div className="flex min-w-0 flex-1 items-center gap-2 py-2 pl-3 pr-6">
                <span className="min-w-0 flex-1 truncate font-display text-body font-bold">{children}</span>
                {actions}
              </div>
              {!low && <motion.span aria-hidden className="pointer-events-none absolute inset-0 p4g-scanlines" initial={{ opacity: 0.9 }} animate={{ opacity: [0.9, 0.1, 0.6, 0] }} transition={{ duration: 0.5 }} />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
