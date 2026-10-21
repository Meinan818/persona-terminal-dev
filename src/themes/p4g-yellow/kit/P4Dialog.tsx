/**
 * P4Dialog —— 确认框：CRT 开机式弹出（横线 → 展开 + 闪白），P4G 消息框版式：
 * 暗棕半透明面 + 黄色偏移底板 + 橙第二底板；正文白字；选项用 P4ChoiceList（橙色圆头高亮）。
 *   <P4Dialog open={o} onClose={()=>setO(false)} title="删除这条记录？" message="删除后无法恢复。"
 *     confirmText="删除" cancelText="取消" danger onConfirm={…} />
 *   actions="buttons" 改为底部按钮行（表单型对话框）；children 可放任意内容（输入框等）。
 *   speaker="系统" 显示消息框左上角名牌（P4G 对话名牌）。
 *
 * 集成期提升的能力（与 pkg6 ConfirmDialog 基座对齐，旧调用不受影响）：
 *   tone        'default' | 'danger' | 'warning'（danger 布尔仍可用 = tone 'danger'）；warning 标题橙色
 *   choices     自定义 1~3 个动作（超过 3 个只取前 3 个），配 onChoice(id)；会取代 确认/取消
 *   busy        锁死遮罩 / Esc / 全部按钮；确认项（或 primary 项）显示 busyText
 *   icon        标题前图标
 *   keepOpen    onConfirm 后不自动关闭（异步确认：先 busy，再由调用方关闭）
 */
import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { useCallback } from 'react';
import { Portal, useEscape, useScrollLock } from './Portal';
import { tvPowerVariants, TVFlash } from '@yellow/fx/TVPower';
import { useLowMotion } from '@yellow/lib/prefs';
import { P4ChoiceList } from './P4ChoiceList';
import { P4Button } from './P4Button';
import { cx } from '@yellow/lib/cx';

export interface P4DialogChoice { id: string; label: ReactNode; danger?: boolean; primary?: boolean; disabled?: boolean; hint?: ReactNode }

export interface P4DialogProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  message?: ReactNode;
  speaker?: ReactNode;
  confirmText?: string;
  cancelText?: string | null;
  onConfirm?: () => void;
  danger?: boolean;
  tone?: 'default' | 'danger' | 'warning';
  actions?: 'choices' | 'buttons' | 'none';
  choices?: P4DialogChoice[];
  onChoice?: (id: string) => void;
  busy?: boolean;
  busyText?: ReactNode;
  icon?: ReactNode;
  keepOpen?: boolean;
  children?: ReactNode;
  dismissible?: boolean;
  className?: string;
  role?: 'dialog' | 'alertdialog';
}

export function P4Dialog({ open, onClose, title, message, speaker, confirmText = '确定', cancelText = '取消', onConfirm, danger, tone: toneProp, actions = 'choices', choices, onChoice, busy, busyText = '处理中…', icon, keepOpen, children, dismissible = true, className, role = 'alertdialog' }: P4DialogProps) {
  const low = useLowMotion();
  const tone = toneProp ?? (danger ? 'danger' : 'default');
  const isDanger = tone === 'danger';
  useScrollLock(open);
  const close = useCallback(() => { if (dismissible && !busy) onClose(); }, [dismissible, busy, onClose]);
  useEscape(open, close);
  const items: P4DialogChoice[] = choices
    ? choices.slice(0, 3)
    : [{ id: '__ok', label: confirmText, danger: isDanger, primary: true }, ...(cancelText ? [{ id: '__cancel', label: cancelText }] : [])];
  const pick = (id: string) => {
    if (busy) return;
    if (choices) { onChoice?.(id); return; }
    if (id === '__ok') { onConfirm?.(); if (!keepOpen) onClose(); } else onClose();
  };
  const labelOf = (c: P4DialogChoice) => (busy && (c.primary || c.id === '__ok') ? busyText : c.label);
  const titleColor = isDanger ? 'text-[color:var(--p4g-danger-on-msg)]' : tone === 'warning' ? 'text-p4g-orange' : 'text-p4g-yellow';
  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <motion.div key="dlg" className="fixed inset-0 flex items-center justify-center p-5" style={{ zIndex: 'var(--p4g-z-confirm)' as unknown as number }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.18, delay: 0.12 } }}>
            <div className="absolute inset-0 bg-[color:var(--p4g-scrim)]" onClick={close} />
            <motion.div role={role} aria-modal="true" aria-busy={busy || undefined} aria-label={typeof title === 'string' ? title : undefined}
              className={cx('relative w-full max-w-[440px] min-w-0', className)} variants={tvPowerVariants(low)} initial="off" animate="on" exit="off">
              {/* 偏移底板（橙 → 黄）*/}
              <div aria-hidden className="absolute inset-0 translate-x-[10px] translate-y-[10px] rounded-sm bg-[color:var(--p4g-msg-plate-2)]" />
              <div aria-hidden className="absolute inset-0 translate-x-[5px] translate-y-[5px] rounded-sm bg-[color:var(--p4g-msg-plate)]" />
              <div className="relative flex max-h-[86vh] flex-col overflow-hidden rounded-sm border-3 border-p4g-black bg-[color:var(--p4g-msg)] text-[color:var(--p4g-msg-ink)] night:border-p4g-yellow">
                <div aria-hidden className="h-[6px] shrink-0 p4g-candy" />
                {speaker && <div className="absolute left-3 top-[6px] z-[1] rounded-b-sm bg-p4g-yellow px-3 py-1 font-display text-meta font-bold text-p4g-black">{speaker}</div>}
                <div className={cx('min-h-0 overflow-y-auto overscroll-contain px-5 pb-4', speaker ? 'pt-10' : 'pt-5')}>
                  {title && (
                    <h2 className={cx('flex min-w-0 items-start gap-2 font-display text-h3 font-bold leading-snug', titleColor)}>
                      {icon && <span aria-hidden className="shrink-0">{icon}</span>}<span className="min-w-0">{title}</span>
                    </h2>
                  )}
                  {message && <div className="mt-2 text-body leading-relaxed text-[color:var(--p4g-msg-ink)]/90"><span aria-hidden className="mr-1 text-p4g-yellow">&gt;</span>{message}</div>}
                  {children && <div className="mt-3 min-w-0">{children}</div>}
                </div>
                {actions === 'choices' && (
                  <div className={cx('shrink-0 border-t-2 border-dashed border-white/15 px-3 pb-3 pt-2', busy && 'pointer-events-none opacity-70')}>
                    <P4ChoiceList
                      defaultIndex={isDanger && !choices ? Math.min(1, items.length - 1) : 0}
                      items={items.map((c) => ({ id: c.id, label: labelOf(c), danger: c.danger, disabled: c.disabled || busy, hint: c.hint }))}
                      onSelect={pick}
                    />
                  </div>
                )}
                {actions === 'buttons' && (
                  <div className="flex shrink-0 flex-wrap gap-3 px-5 pb-5">
                    {[...items].reverse().map((c) => (
                      <P4Button key={c.id} block className="min-w-[30%] flex-1" disabled={busy || c.disabled} busy={busy && (c.primary || c.id === '__ok')}
                        variant={c.danger ? 'danger' : c.primary || c.id === '__ok' ? 'primary' : 'secondary'} onClick={() => pick(c.id)}>
                        {labelOf(c)}
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
