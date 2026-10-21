/**
 * P6 私有：ConfirmDialog 基座（真实 src/components/ConfirmDialog.tsx 全部能力）的 P3R 系统框实现。
 * 版式 = P3R SYSTEM 框：层叠错位斜板 + 墨色标题条（tone 斜片 + SYSTEM 签）+ 正文 + 光标楔选项条（↑↓ / Enter）。
 * 入场：斜向弹入（scale .92 + 左下位移），退场反向；低动效直接淡入淡出。
 *
 *   tone: default | danger | warning
 *   choices: 自定义 1~3 个动作（取代确认 / 取消）
 *   busy: 锁死遮罩 / Esc / 全部选项，确认项显示 busyText
 *   children: 富内容槽
 *   layout: 'choices'（系统框选项条，默认）| 'buttons'（底部斜钮行：取消左、主操作右 = 真实 p3 白斜卡）
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useId, useState, type ReactNode } from 'react';
import { Portal, useEscape, useScrollLock, P3Button, P3R, SelectWedge, slantClip, tickClip } from '@pink/kit';
import { useLowMotion } from '@pink/lib/prefs';
import { cx } from '@pink/lib/cx';

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

const TONE_BG = { default: P3R.blue, danger: P3R.magenta, warning: P3R.amber } as const;

export function P6Dialog({ open, onClose, title, description, icon, speaker, tone = 'default', confirmText = '确认', cancelText = '取消', onConfirm, choices, onChoice, busy, busyText = '处理中…', children, layout = 'choices', wide, closeButton, dismissible = true, z = 'confirm' }: P6DialogProps) {
  const low = useLowMotion();
  const tid = useId();
  useScrollLock(open);
  const close = useCallback(() => { if (!busy && dismissible) onClose(); }, [busy, dismissible, onClose]);
  useEscape(open, close);
  const items: P6Choice[] = choices ?? [{ id: '__ok', label: confirmText, danger: tone === 'danger', primary: true }, { id: '__cancel', label: cancelText }];
  const defFocus = tone === 'danger' ? Math.max(0, items.length - 1) : 0;
  const [focus, setFocus] = useState(defFocus);
  useEffect(() => { if (open) setFocus(defFocus); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const pick = (id: string) => {
    if (busy) return;
    if (choices) { onChoice?.(id); return; }
    if (id === '__ok') onConfirm?.(); else onClose();
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (layout !== 'choices' || busy) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setFocus((f) => (f + 1) % items.length); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setFocus((f) => (f - 1 + items.length) % items.length); }
    if (e.key === 'Enter') { const c = items[focus]; if (c && !c.disabled) { e.preventDefault(); pick(c.id); } }
  };
  const isBusyItem = (c: P6Choice) => busy && (c.primary || c.id === '__ok');
  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <motion.div key="p6dlg" className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: `var(--p3r-z-${z})` as unknown as number }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.16, delay: 0.06 } }} onKeyDown={onKey}>
            <div className="absolute inset-0" style={{ background: 'var(--p3r-scrim)' }} onClick={close} />
            <motion.div role="alertdialog" aria-modal="true" aria-labelledby={title ? tid : undefined} aria-busy={busy || undefined} tabIndex={-1}
              className={cx('relative w-full min-w-0 pb-[8px] pr-[8px] outline-none', wide ? 'max-w-[560px]' : 'max-w-[440px]')}
              initial={low ? { opacity: 0 } : { opacity: 0, scale: 0.92, x: -14, y: 14 }} animate={{ opacity: 1, scale: 1, x: 0, y: 0 }} exit={low ? { opacity: 0 } : { opacity: 0, scale: 0.94, x: -10, y: 10 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}>
              {/* 错位后板（内收，不伸出盒外） */}
              <span aria-hidden className="absolute bottom-0 left-[8px] right-0 top-[8px]" style={{ background: tone === 'default' ? 'var(--p3r-slab-back)' : TONE_BG[tone], opacity: tone === 'default' ? 1 : 0.5, clipPath: slantClip(16) }} />
              <div className="relative flex max-h-[84vh] min-w-0 flex-col" style={{ background: P3R.panel, clipPath: slantClip(16) }}>
                {/* 墨色标题条 */}
                <div className="relative flex min-w-0 shrink-0 items-center gap-2 px-5 py-3" style={{ background: P3R.ink }}>
                  <span aria-hidden className="h-[15px] w-[11px] shrink-0" style={{ background: TONE_BG[tone], clipPath: tickClip }} />
                  {icon && <span aria-hidden className="shrink-0 text-[17px]" style={{ color: 'var(--p3r-on-ink)' }}>{icon}</span>}
                  <h2 id={tid} className="min-w-0 flex-1 truncate font-heavy text-[18px]" style={{ color: 'var(--p3r-on-ink)' }}>{title ?? speaker ?? 'SYSTEM'}</h2>
                  {speaker && title && <span className="hidden shrink-0 truncate text-[11px] font-bold sm:block" style={{ color: P3R.cyan }}>{speaker}</span>}
                  <span className="shrink-0 font-cond text-[11px] tracking-wider" style={{ color: tone === 'default' ? P3R.blue : TONE_BG[tone] }}>{tone === 'danger' ? 'WARNING' : 'SYSTEM'}</span>
                  {closeButton && (
                    <button type="button" aria-label="关闭" disabled={busy} onClick={close} className="ml-1 flex h-8 w-8 shrink-0 items-center justify-center text-[15px] font-black disabled:opacity-40" style={{ color: 'var(--p3r-on-ink)' }}>✕</button>
                  )}
                </div>
                <div className="min-h-0 overflow-y-auto overscroll-contain px-5 pb-3 pt-4">
                  {description && <div className="whitespace-pre-line text-[14px] leading-relaxed" style={{ color: P3R.inkSoft }}>{description}</div>}
                  {children && <div className={cx('min-w-0', description && 'mt-3')}>{children}</div>}
                </div>
                {layout === 'choices' ? (
                  <div className="relative shrink-0 px-5 pb-5 pt-2">
                    <span aria-hidden className="p6-next-dot absolute -top-1 right-6 h-0 w-0 border-x-[6px] border-t-[8px] border-x-transparent" style={{ borderTopColor: P3R.blue }} />
                    <div role="menu" className="flex flex-col gap-1.5">
                      {items.map((c, i) => {
                        const on = focus === i;
                        return (
                          <button key={c.id} type="button" role="menuitem" disabled={busy || c.disabled} onPointerEnter={() => setFocus(i)} onFocus={() => setFocus(i)} onClick={() => pick(c.id)}
                            className="relative flex min-h-[44px] min-w-0 items-center pl-7 pr-5 py-1 text-left disabled:opacity-50">
                            <span aria-hidden className="absolute inset-0" style={{ background: on ? P3R.blue : P3R.cyanFaint, clipPath: slantClip(9) }} />
                            {on && <SelectWedge className="-left-3 top-1/2 h-[26px] w-[30px] -translate-y-1/2" />}
                            <span className="relative min-w-0 flex-1">
                              <span className="block truncate font-heavy text-[16px]" style={{ color: on ? P3R.onBlue : c.danger ? 'var(--p3r-coral-ink)' : P3R.ink }}>{isBusyItem(c) ? busyText : c.label}</span>
                              {c.hint && <span className="block truncate text-[12px] font-bold" style={{ color: on ? P3R.onBlue : P3R.grey, opacity: on ? 0.85 : 1 }}>{c.hint}</span>}
                            </span>
                            {isBusyItem(c) && <span aria-hidden className="pk-spin relative ml-2 h-4 w-4 shrink-0 rounded-full border-2 border-current border-t-transparent" style={{ color: P3R.onBlue }} />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="flex shrink-0 gap-3 px-5 pb-5 pt-2">
                    {[...items].reverse().map((c) => (
                      <P3Button key={c.id} block disabled={busy || c.disabled} busy={isBusyItem(c) || undefined} busyText={busyText}
                        tone={c.danger ? 'danger' : c.primary || c.id === '__ok' ? 'primary' : 'soft'} onClick={() => pick(c.id)} className="flex-1">
                        {c.label}
                      </P3Button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
