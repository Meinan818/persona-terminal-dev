/**
 * P6 私有：ConfirmDialog 基座的 P4G 1:1 实现（真实 src/components/ConfirmDialog.tsx 的全部能力）。
 * 版式 = P4G 消息框：暗棕半透明面 + 黄 / 橙双偏移底板 + 左上黄色名牌 + "> " 起首 + 右下橙色 ◉ 指示，
 * 下方是选项列表（橙色圆头高亮 + 黑三角，↑↓/Enter）。电视开机式弹出、关机式收回。
 *
 *   tone: default | danger | warning（缺省图标 ❓ / ⚠️）
 *   choices: 自定义 1~3 个动作（取代确认/取消）
 *   busy: 锁死遮罩 / Esc / 全部按钮，确认项显示 busyText
 *   children: 富内容槽（输入框 / 列表 / 进度…）
 *   layout: 'choices'（P4G 选项，默认）| 'buttons'（底部按钮行：取消左、主操作右）
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, type ReactNode } from 'react';
import { Portal, useEscape, useScrollLock, P4ChoiceList, P4Button } from '@yellow/kit';
import { tvPowerVariants, TVFlash } from '@yellow/fx/TVPower';
import { useLowMotion } from '@yellow/lib/prefs';
import { cx } from '@yellow/lib/cx';

export interface P6Choice { id: string; label: string; danger?: boolean; primary?: boolean; disabled?: boolean; hint?: string }
export interface P6DialogProps {
  open: boolean; onClose: () => void;
  title?: ReactNode; description?: ReactNode; icon?: ReactNode; speaker?: ReactNode;
  tone?: 'default' | 'danger' | 'warning';
  confirmText?: string; cancelText?: string; onConfirm?: () => void;
  choices?: P6Choice[]; onChoice?: (id: string) => void;
  busy?: boolean; busyText?: string; children?: ReactNode; layout?: 'choices' | 'buttons'; wide?: boolean;
  closeButton?: boolean; dismissible?: boolean; z?: 'confirm' | 'sheet';
}

export function P6Dialog({ open, onClose, title, description, icon, speaker, tone = 'default', confirmText = '确认', cancelText = '取消', onConfirm, choices, onChoice, busy, busyText = '处理中…', children, layout = 'choices', wide, closeButton, dismissible = true, z = 'confirm' }: P6DialogProps) {
  const low = useLowMotion();
  useScrollLock(open);
  const close = useCallback(() => { if (!busy && dismissible) onClose(); }, [busy, dismissible, onClose]);
  useEscape(open, close);
  const items: P6Choice[] = choices ?? [{ id: '__ok', label: confirmText, danger: tone === 'danger', primary: true }, { id: '__cancel', label: cancelText }];
  const pick = (id: string) => {
    if (busy) return;
    if (choices) { onChoice?.(id); return; }
    if (id === '__ok') onConfirm?.(); else onClose();
  };
  const defIcon = icon === undefined ? (tone === 'default' ? '❓' : '⚠️') : icon;
  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <motion.div key="p6dlg" className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: `var(--p4g-z-${z})` as unknown as number }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.18, delay: 0.12 } }}>
            <div className="absolute inset-0 bg-[color:var(--p4g-scrim)]" onClick={close} />
            <motion.div role="alertdialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined} aria-busy={busy || undefined}
              className={cx('relative w-full min-w-0', wide ? 'max-w-[560px]' : 'max-w-[440px]')} variants={tvPowerVariants(low)} initial="off" animate="on" exit="off">
              <div aria-hidden className="absolute inset-0 translate-x-[10px] translate-y-[10px] rounded-[10px] bg-[color:var(--p4g-msg-plate-2)]" />
              <div aria-hidden className="absolute inset-0 translate-x-[5px] translate-y-[5px] rounded-[10px] bg-[color:var(--p4g-msg-plate)]" />
              <div className="relative flex max-h-[84vh] flex-col overflow-hidden rounded-[10px] border-3 border-p4g-black bg-[color:var(--p4g-msg)] text-[color:var(--p4g-msg-ink)] night:border-p4g-yellow">
                {speaker && <div className="absolute left-4 top-0 z-[1] -skew-x-6 rounded-b-[4px] bg-p4g-yellow px-3 py-1 font-display text-meta font-bold text-p4g-black">{speaker}</div>}
                {closeButton && (
                  <button type="button" aria-label="关闭" disabled={busy} onClick={close} className="absolute right-2 top-2 z-[1] flex h-9 w-9 items-center justify-center rounded-pill text-h3 text-p4g-yellow hover:bg-[rgb(var(--p4g-white-rgb)/0.1)] disabled:opacity-40">✕</button>
                )}
                <div className={cx('min-h-0 overflow-y-auto overscroll-contain px-5 pb-4', speaker ? 'pt-10' : 'pt-5')}>
                  {title && (
                    <h2 className={cx('flex min-w-0 items-start gap-2 pr-8 font-display text-h3 font-bold leading-snug', tone === 'danger' ? 'text-[color:var(--p4g-orange)]' : 'text-p4g-yellow')}>
                      {defIcon && <span aria-hidden className="shrink-0">{defIcon}</span>}<span className="min-w-0">{title}</span>
                    </h2>
                  )}
                  {description && <div className="mt-2 whitespace-pre-line text-body leading-relaxed"><span aria-hidden className="mr-1 text-p4g-yellow">&gt;</span>{description}</div>}
                  {children && <div className="mt-3 min-w-0">{children}</div>}
                </div>
                
                {layout === 'choices' ? (
                  <div className="relative shrink-0 border-t-2 border-dashed border-[rgb(var(--p4g-white-rgb)/0.15)] px-3 pb-3 pt-2">
                    <span aria-hidden className="p6-next-dot absolute -top-[14px] right-4 flex h-6 w-6 items-center justify-center rounded-pill border-[3px] border-p4g-orange"><span className="h-2 w-2 rounded-pill bg-p4g-orange" /></span>
                    <div className={busy ? 'pointer-events-none opacity-60' : ''}>
                      <P4ChoiceList defaultIndex={tone === 'danger' ? Math.max(0, items.length - 1) : 0}
                        items={items.map((c) => ({ id: c.id, label: c.hint ? <span className="block min-w-0 py-1"><span className="block truncate">{busy && c.primary ? busyText : c.label}</span><span className="block truncate font-body text-meta font-normal opacity-80">{c.hint}</span></span> : busy && (c.primary || c.id === '__ok') ? busyText : c.label, danger: c.danger, disabled: c.disabled || busy }))}
                        onSelect={pick} />
                    </div>
                  </div>
                ) : (
                  <div className={cx('flex shrink-0 pb-5', items.length >= 3 ? 'gap-2 px-4' : 'gap-3 px-5')}>
                    {[...items].reverse().map((c) => (
                      <P4Button key={c.id} block size={items.length >= 3 ? 'sm' : undefined} className={items.length >= 3 ? '!h-11 min-w-0 !px-1' : undefined} disabled={busy || c.disabled} variant={c.danger ? 'danger' : c.primary || c.id === '__ok' ? 'primary' : 'secondary'} onClick={() => pick(c.id)}>
                        {busy && (c.primary || c.id === '__ok') ? busyText : c.label}
                      </P4Button>
                    ))}
                  </div>
                )}
              </div>
              <TVFlash low={low} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
