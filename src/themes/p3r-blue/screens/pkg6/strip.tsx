/**
 * P6 私有：P3R 系统提示条（同步浮标 / 返回键提示 / PWA 更新）——
 * 墨色斜条自左横扫进入 + 类型签斜片 + 白色光片掠过一次，退场向右滑出。只动 transform / opacity。
 */
import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { Portal, P3R, slantClip } from '@blue/kit';
import { useLowMotion } from '@blue/lib/prefs';
import { cx } from '@blue/lib/cx';

const TAG_BG = { yellow: P3R.blue, orange: P3R.cyan, red: P3R.magenta, green: 'var(--p3r-mint)' } as const;

export function P6Strip({ show, tag, tagTone = 'yellow', children, actions, position = 'top', role = 'status' }: { show: boolean; tag?: ReactNode; tagTone?: 'yellow' | 'orange' | 'red' | 'green'; children: ReactNode; actions?: ReactNode; position?: 'top' | 'bottom' | 'bottom-high'; role?: 'status' | 'alert' }) {
  const low = useLowMotion();
  return (
    <Portal>
      <AnimatePresence>
        {show && (
          <motion.div key="strip" role={role} aria-live="polite"
            className={cx('pointer-events-none fixed inset-x-0 mx-auto flex w-[min(92vw,460px)] justify-center',
              position === 'top' ? 'top-[calc(env(safe-area-inset-top)+64px)]' : position === 'bottom-high' ? 'bottom-32' : 'bottom-[calc(var(--p3r-nav-h)+24px+env(safe-area-inset-bottom))] wide:bottom-8')}
            style={{ zIndex: 'var(--p3r-z-toast)' as unknown as number }}
            initial={low ? { opacity: 0 } : { opacity: 0, x: -80 }} animate={low ? { opacity: 1 } : { opacity: 1, x: 0 }} exit={low ? { opacity: 0 } : { opacity: 0, x: 80 }}
            transition={{ duration: 0.26, ease: [0.2, 0.9, 0.1, 1] }}>
            <div className="pointer-events-auto relative flex min-w-0 max-w-full pb-[5px] pr-[5px]">
              <span aria-hidden className="absolute bottom-0 left-[5px] right-0 top-[5px]" style={{ background: TAG_BG[tagTone], opacity: 0.7, clipPath: slantClip(10) }} />
              <div className="relative flex min-w-0 max-w-full items-stretch overflow-hidden" style={{ background: P3R.ink, clipPath: slantClip(10) }}>
                {tag && <span className="flex shrink-0 items-center px-3 font-cond text-[13px] tracking-wider" style={{ background: TAG_BG[tagTone], color: tagTone === 'yellow' ? P3R.onBlue : 'var(--p3r-mulberry)', clipPath: 'polygon(0 0, 100% 0, calc(100% - 8px) 100%, 0 100%)', paddingRight: 16 }}>{tag}</span>}
                <div className="flex min-w-0 flex-1 items-center gap-2 py-2.5 pl-3 pr-5">
                  <span className="min-w-0 flex-1 truncate text-[14px] font-black" style={{ color: 'var(--p3r-on-ink)' }}>{children}</span>
                  {actions}
                </div>
                {!low && <motion.span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-[30%]" style={{ background: 'rgba(255,255,255,0.35)', skewX: -18 }} initial={{ x: '-140%' }} animate={{ x: '420%' }} transition={{ duration: 0.55, delay: 0.15, ease: 'easeOut' }} />}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
