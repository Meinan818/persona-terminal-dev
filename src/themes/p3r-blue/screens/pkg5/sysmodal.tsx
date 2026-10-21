/**
 * P3R 系统大框（登录 / 云同步说明共用）：居中斜切白卡 + 墨色标题条（MASKARIA 签 + 句点）+ 层叠错位底板；
 * 入场 scale .92 + 斜向位移 springSoft（真实 SheetModal center 形态口径）；低动效淡入。
 */
import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { Portal, useEscape, useScrollLock, P3R, slantClip, tickClip } from '@blue/kit';
import { useBoldness } from '@blue/lib/prefs';

export function SysModal({ open, onBackdrop, title, subtitle, children, wide, onClose }: { open: boolean; onBackdrop?: () => void; title: ReactNode; subtitle?: ReactNode; children: ReactNode; wide?: boolean; onClose?: () => void }) {
  const anim = useBoldness();
  useEscape(open, () => onClose?.());
  useScrollLock(open);
  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 'var(--p3r-z-system)' as unknown as number }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0" style={{ background: 'var(--p3r-scrim)' }} onClick={onBackdrop} />
            <motion.div role="dialog" aria-modal="true" className={`relative w-full min-w-0 ${wide ? 'max-w-[480px]' : 'max-w-[440px]'}`}
              initial={anim ? { opacity: 0, scale: 0.92, x: -14, y: 14 } : { opacity: 0 }} animate={{ opacity: 1, scale: 1, x: 0, y: 0 }} exit={anim ? { opacity: 0, scale: 0.92, x: -14, y: 14 } : { opacity: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 32 }}>
              <span aria-hidden className="absolute inset-0 translate-x-[8px] translate-y-[8px]" style={{ background: 'var(--p3r-slab-back)', clipPath: slantClip(18) }} />
              <div className="relative flex max-h-[calc(100dvh-6rem)] flex-col overflow-hidden" style={{ background: P3R.panel, clipPath: slantClip(18) }}>
                <div className="shrink-0 px-7 pb-3 pt-4" style={{ background: P3R.ink }}>
                  <div className="flex items-center gap-2">
                    <span aria-hidden className="h-[12px] w-[9px]" style={{ background: P3R.blue, clipPath: tickClip }} />
                    <span className="font-cond text-[11px] tracking-[0.4em]" style={{ color: P3R.blue }}>MASKARIA</span>
                    <span className="ml-auto font-cond text-[10px] tracking-widest" style={{ color: 'var(--bk-bubble-b)' }}>SYSTEM</span>
                  </div>
                  <h2 className="mt-1 font-heavy text-[clamp(20px,6vw,24px)] leading-tight" style={{ color: 'var(--p3r-on-ink)' }}>{title}</h2>
                  {subtitle && <p className="mt-1 text-[12px] font-bold leading-relaxed" style={{ color: 'color-mix(in srgb, var(--p3r-on-ink) 72%, transparent)' }}>{subtitle}</p>}
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-6 pt-4">{children}</div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
