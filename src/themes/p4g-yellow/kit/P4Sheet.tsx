/**
 * P4Sheet —— 底部抽屉，"电视画面式"弹出：面板先以横亮线出现再纵向展开（scaleY），带闪白。
 * 顶部横向彩条（S.Link 页头），标题白字黑描边 + 英文小标；内容区可滚动；宽屏变居中卡片。
 *   <P4Sheet open={o} onClose={()=>setO(false)} title="新建任务" en="NEW QUEST" footer={<P4Button block>保存</P4Button>}>
 *     …表单…
 *   </P4Sheet>
 *   size="auto"|"tall"|"full"|"screen"；hideClose；dismissible=false 禁止点遮罩关闭
 *
 * 集成期提升的能力（与 pkg6 SheetModal 基座对齐，旧调用不受影响）：
 *   position     'bottom'（默认，底部抽屉；宽屏自动居中卡片）| 'center'（任何宽度都居中卡片）
 *   swipeToClose 底部抽屉按住顶部（彩条/把手/标题区）下滑 >90px 或快速下甩即关闭（默认开；低动效 / busy 时停用）
 *   showHandle   顶部把手（默认 = 可下滑时显示，宽屏隐藏）
 *   size="screen" 全屏变体：铺满视口（100dvh），无圆角无投影，顶部留安全区——用于聊天/编辑器类全屏弹层
 *   busy         锁死遮罩 / Esc / 关闭按钮 / 下滑
 *   tone         'paper'（奶油纸，默认）| 'msg'（P4G 消息框暗棕）
 *   headerExtra / bodyClassName
 */
import { AnimatePresence, motion, useDragControls, type PanInfo } from 'framer-motion';
import { useCallback, type ReactNode } from 'react';
import { Portal, useEscape, useScrollLock } from './Portal';
import { useBackHandler } from '@/utils/useBackHandler';
import { useLowMotion } from '@yellow/lib/prefs';
import { TVFlash } from '@yellow/fx/TVPower';
import { P4Outline } from './P4Outline';
import { IconClose } from './icons';
import { cx } from '@yellow/lib/cx';

export interface P4SheetProps {
  open: boolean; onClose: () => void; title?: ReactNode; en?: string; children?: ReactNode; footer?: ReactNode;
  size?: 'auto' | 'tall' | 'full' | 'screen'; hideClose?: boolean; dismissible?: boolean; className?: string;
  position?: 'bottom' | 'center'; swipeToClose?: boolean; showHandle?: boolean; busy?: boolean;
  tone?: 'paper' | 'msg'; headerExtra?: ReactNode; bodyClassName?: string;
}

export function P4Sheet({ open, onClose, title, en, children, footer, size = 'auto', hideClose, dismissible = true, className, position = 'bottom', swipeToClose = true, showHandle, busy, tone = 'paper', headerExtra, bodyClassName }: P4SheetProps) {
  const low = useLowMotion();
  const drag = useDragControls();
  useScrollLock(open);
  const close = useCallback(() => { if (dismissible && !busy) onClose(); }, [dismissible, busy, onClose]);
  const closeBtn = useCallback(() => { if (!busy) onClose(); }, [busy, onClose]);
  useEscape(open, close);
  useBackHandler(open, close);
  const screen = size === 'screen';
  const center = position === 'center' && !screen;
  const canSwipe = swipeToClose && !center && !screen && !low && !busy;
  const handle = showHandle ?? (swipeToClose && !center && !screen);
  const h = screen ? 'h-[100dvh]' : size === 'full' ? 'h-[94vh]' : size === 'tall' ? 'max-h-[88vh] min-h-[60vh]' : 'max-h-[88vh]';
  const onDragEnd = (_: unknown, info: PanInfo) => { if (info.offset.y > 90 || info.velocity.y > 600) closeBtn(); };
  const frame = screen
    ? 'max-w-none origin-center border-0'
    : center
      ? 'max-w-[480px] origin-center rounded-sm border-3 shadow-hard-lg'
      : 'max-w-[640px] origin-bottom border-3 border-b-0 shadow-[0_-6px_0_var(--p4g-yellow)] wide:origin-center wide:rounded-sm wide:border-b-3 wide:shadow-hard-lg';
  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <motion.div key="sheet" className={cx('fixed inset-0 flex justify-center', screen ? 'items-stretch' : center ? 'items-center p-4' : 'items-end wide:items-center wide:p-6')} style={{ zIndex: 'var(--p4g-z-sheet)' as unknown as number }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.2, delay: 0.1 } }}>
            <div className="absolute inset-0 bg-[color:var(--p4g-scrim)]" onClick={close} />
            <motion.div
              role="dialog" aria-modal="true" aria-busy={busy || undefined} aria-label={typeof title === 'string' ? title : undefined}
              drag={canSwipe ? 'y' : false} dragControls={drag} dragListener={false} dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.6 }} onDragEnd={onDragEnd}
              className={cx('relative flex w-full min-w-0 flex-col overflow-hidden border-p4g-black night:border-p4g-yellow', tone === 'msg' ? 'bg-[color:var(--p4g-msg)] text-[color:var(--p4g-msg-ink)]' : 'bg-p4g-surface-2 text-p4g-ink', frame, h, className)}
              initial={low ? { opacity: 0 } : { scaleY: 0.01, scaleX: 0.6, opacity: 0 }}
              animate={low ? { opacity: 1 } : { scaleY: [0.01, 0.01, 1], scaleX: [0.6, 1, 1], opacity: [0, 1, 1] }}
              exit={low ? { opacity: 0 } : { scaleY: [1, 0.01, 0.01], scaleX: [1, 1, 0.3], opacity: [1, 1, 0], transition: { duration: 0.28, times: [0, 0.6, 1] } }}
              transition={{ duration: 0.38, times: [0, 0.35, 1], ease: [0.16, 1, 0.3, 1] }}
              style={{ paddingBottom: center ? undefined : 'env(safe-area-inset-bottom)', paddingTop: screen ? 'env(safe-area-inset-top)' : undefined }}
            >
              <div onPointerDown={(e) => { if (canSwipe) drag.start(e); }} className={cx('shrink-0', canSwipe && 'cursor-grab touch-none')}>
                <div aria-hidden className="h-3 p4g-candy-h" />
                {handle && <div aria-hidden className="mx-auto mt-1.5 h-1.5 w-12 rounded-pill bg-p4g-line/50 wide:hidden" />}
                {(title || !hideClose || headerExtra) && (
                  <div className={cx('flex min-w-0 items-center gap-3 px-4 pb-2', handle ? 'pt-2' : 'pt-3')}>
                    <div className="min-w-0 flex-1">
                      {en && <div className="truncate font-display text-2xs font-bold uppercase tracking-[0.24em] opacity-75">{en}</div>}
                      {title && <P4Outline size="clamp(20px, 5.6vw, 26px)" stroke={4} className="max-w-full overflow-hidden text-ellipsis">{title}</P4Outline>}
                    </div>
                    {headerExtra}
                    {!hideClose && (
                      <button type="button" aria-label="关闭" disabled={busy} onPointerDown={(e) => e.stopPropagation()} onClick={closeBtn} className="p4g-press flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border-3 border-p4g-line bg-p4g-yellow text-p4g-black shadow-hard-sm disabled:opacity-40"><IconClose size={16} /></button>
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
