/**
 * P6 私有：SheetModal 基座的 P4G 实现（真实 src/components/SheetModal.tsx 全部能力）。
 *   position: bottom（底部抽屉，可下滑关闭）| center（居中卡片）
 *   title / en / footer（sticky）/ showHandle / busy（锁死关闭通道）/ closeOnBackdrop / size
 * 外观：S.Link 横彩条顶 + 白字黑描边标题 + 奶油纸面 + 黑粗框；电视画面式弹出（横亮线→展开→闪白），
 * 宽屏下底部抽屉自动变居中卡片（与 kit P4Sheet 一致）。下滑 > 90px 或速度够快即关闭。
 */
import { AnimatePresence, motion, useDragControls, type PanInfo } from 'framer-motion';
import { useCallback, type ReactNode } from 'react';
import { Portal, useEscape, useScrollLock, P4Outline, IconClose } from '@yellow/kit';
import { TVFlash } from '@yellow/fx/TVPower';
import { useLowMotion } from '@yellow/lib/prefs';
import { cx } from '@yellow/lib/cx';

export interface P6SheetProps {
  open: boolean; onClose: () => void; title?: ReactNode; en?: string; children?: ReactNode; footer?: ReactNode;
  position?: 'bottom' | 'center'; showHandle?: boolean; busy?: boolean; closeOnBackdrop?: boolean; size?: 'auto' | 'tall' | 'full';
  hideClose?: boolean; className?: string; bodyClassName?: string; tone?: 'paper' | 'msg'; headerExtra?: ReactNode; z?: 'sheet' | 'confirm';
}

export function P6Sheet({ open, onClose, title, en, children, footer, position = 'bottom', showHandle = true, busy, closeOnBackdrop = true, size = 'auto', hideClose, className, bodyClassName, tone = 'paper', headerExtra, z = 'sheet' }: P6SheetProps) {
  const low = useLowMotion();
  const drag = useDragControls();
  useScrollLock(open);
  const close = useCallback(() => { if (!busy) onClose(); }, [busy, onClose]);
  useEscape(open, close);
  const center = position === 'center';
  const h = size === 'full' ? 'h-[94vh]' : size === 'tall' ? 'max-h-[90vh] min-h-[62vh]' : 'max-h-[88vh]';
  const onDragEnd = (_: unknown, info: PanInfo) => { if (info.offset.y > 90 || info.velocity.y > 600) close(); };
  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <motion.div key="p6sheet" className={cx('fixed inset-0 flex justify-center', center ? 'items-center p-4' : 'items-end wide:items-center wide:p-6')} style={{ zIndex: `var(--p4g-z-${z})` as unknown as number }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.2, delay: 0.1 } }}>
            <div className="absolute inset-0 bg-[color:var(--p4g-scrim)]" onClick={() => closeOnBackdrop && close()} />
            <motion.div role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined} aria-busy={busy || undefined}
              drag={!center && !low && !busy ? 'y' : false} dragControls={drag} dragListener={false} dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.6 }} onDragEnd={onDragEnd}
              className={cx('relative flex w-full min-w-0 flex-col overflow-hidden border-3 border-p4g-black night:border-p4g-yellow',
                tone === 'msg' ? 'bg-[color:var(--p4g-msg)] text-[color:var(--p4g-msg-ink)]' : 'bg-p4g-surface-2 text-p4g-ink',
                center ? 'max-w-[480px] origin-center rounded-[6px] shadow-hard-lg' : 'max-w-[640px] origin-bottom border-b-0 shadow-[0_-6px_0_var(--p4g-yellow)] wide:origin-center wide:rounded-[6px] wide:border-b-3 wide:shadow-hard-lg', h, className)}
              initial={low ? { opacity: 0 } : { scaleY: 0.01, scaleX: 0.6, opacity: 0 }}
              animate={low ? { opacity: 1 } : { scaleY: [0.01, 0.01, 1], scaleX: [0.6, 1, 1], opacity: [0, 1, 1] }}
              exit={low ? { opacity: 0 } : { scaleY: [1, 0.01, 0.01], scaleX: [1, 1, 0.3], opacity: [1, 1, 0], transition: { duration: 0.28, times: [0, 0.6, 1] } }}
              transition={{ duration: 0.38, times: [0, 0.35, 1], ease: [0.16, 1, 0.3, 1] }}
              style={{ paddingBottom: center ? undefined : 'env(safe-area-inset-bottom)' }}>
              <div onPointerDown={(e) => !center && drag.start(e)} className={cx('shrink-0', !center && 'cursor-grab touch-none')}>
                <div aria-hidden className="h-3 p4g-candy-h" />
                {!center && showHandle && <div aria-hidden className="mx-auto mt-1.5 h-1.5 w-12 rounded-pill bg-p4g-line/50 wide:hidden" />}
                {(title || !hideClose) && (
                  <div className="flex min-w-0 items-center gap-3 px-4 pb-2 pt-2">
                    <div className="min-w-0 flex-1">
                      {en && <div className="truncate font-display text-2xs font-bold uppercase tracking-[0.24em] opacity-75">{en}</div>}
                      {title && <P4Outline size="clamp(19px, 5.4vw, 25px)" stroke={3} className="max-w-full overflow-hidden text-ellipsis">{title}</P4Outline>}
                    </div>
                    {headerExtra}
                    {!hideClose && (
                      <button type="button" aria-label="关闭" disabled={busy} onPointerDown={(e) => e.stopPropagation()} onClick={close} className="p4g-press flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border-3 border-p4g-line bg-p4g-yellow text-p4g-black shadow-hard-sm disabled:opacity-40"><IconClose size={16} /></button>
                    )}
                  </div>
                )}
              </div>
              <div className={cx('min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 pt-1', bodyClassName)}>{children}</div>
              {footer && <div className="shrink-0 border-t-3 border-p4g-line bg-p4g-surface px-4 py-3">{footer}</div>}
              <TVFlash low={low} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
