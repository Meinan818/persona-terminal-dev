/**
 * P3R 蓝白 kit · 弹层 —— 第一参照：真实 ConfirmDialog / SheetModal / ActionSheet 的 p3 分支（结构与回调契约同名），
 * 外观按 P3R 系统框 / 子菜单抽屉重画。全部 Portal 到 body，自带 ESC、滚动锁、busy 锁。
 *   P3Dialog（系统确认框：≤3 选项、tone default/danger/warning、busy）
 *   P3Sheet（子菜单抽屉：bottom / center / screen 全屏；下滑关闭；busy；footer）
 *   P3ActionSheet（操作菜单：光标楔选项 + 取消）
 *   P3ToastProvider / useToast / showToast
 */
import { AnimatePresence, motion, useDragControls, type PanInfo } from 'framer-motion';
import { BubbleShape } from '@blue/fx/motifs/Water';
import { createContext, useCallback, useContext, useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import { Portal, useEscape, useScrollLock } from './Portal';
import { useBackHandler } from '@/utils/useBackHandler';
import { useBoldness } from '@blue/lib/prefs';
import { cx } from '@blue/lib/cx';
import { P3R, SelectWedge, sheetTopClip, slantClip, tickClip } from './base';
import { P3Button } from './controls';

const springSoft = { type: 'spring' as const, stiffness: 380, damping: 32 };

/* ───────────────────────── Dialog ───────────────────────── */
export type DialogTone = 'default' | 'danger' | 'warning';
export interface DialogAction { label: ReactNode; tone?: 'default' | 'primary' | 'danger'; onClick: () => void; disabled?: boolean }
export interface P3DialogProps {
  open: boolean;
  /** 取消 / 关闭（backdrop、ESC、取消钮都走它；busy 时三条通道全锁） */
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  /** 顶部图标（真实 ConfirmDialog icon：默认 ❓ / ⚠️，粉版换成斜片徽） */
  icon?: ReactNode;
  tone?: DialogTone;
  confirmText?: ReactNode;
  cancelText?: ReactNode;
  onConfirm?: () => void;
  /** 自定义动作（≤3，超出截断）：替代默认「取消 / 确认」双钮 */
  actions?: DialogAction[];
  /** 'card'=真实 p3 白斜卡（默认）；'system'=P3R 系统框（墨色标题条 + 选项斜条 + 光标楔，适合 3 选项） */
  variant?: 'card' | 'system';
  busy?: boolean;
  busyText?: ReactNode;
  children?: ReactNode;
}

const TONE_BG: Record<DialogTone, string> = { default: P3R.blue, danger: P3R.magenta, warning: P3R.amber };
const ToneBadge = ({ tone }: { tone: DialogTone }) => (
  <span aria-hidden className="relative mx-auto mb-3 flex h-12 w-14 items-center justify-center">
    <span className="absolute inset-0" style={{ background: TONE_BG[tone], clipPath: slantClip(12) }} />
    <span className="absolute -bottom-1 -right-2 h-[9px] w-[18px]" style={{ background: tone === 'default' ? P3R.cyan : P3R.ink, clipPath: tickClip }} />
    <span className="relative font-cond text-[26px] leading-none" style={{ color: tone === 'warning' ? 'var(--p3r-mulberry)' : '#fff' }}>{tone === 'default' ? '?' : '!'}</span>
  </span>
);

export const P3Dialog = ({ open, onClose, title, description, icon, tone = 'default', confirmText = '确认', cancelText = '取消', onConfirm, actions, variant = 'card', busy, busyText, children }: P3DialogProps) => {
  const anim = useBoldness();
  const tid = useId();
  const safeClose = useCallback(() => { if (!busy) onClose(); }, [busy, onClose]);
  useEscape(open, safeClose);
  useBackHandler(open, safeClose);
  useScrollLock(open);
  const acts = actions?.slice(0, 3);
  const [focus, setFocus] = useState(0);
  useEffect(() => { if (open) setFocus(0); }, [open]);
  const btnTone = (t?: DialogAction['tone']) => (t === 'danger' ? 'danger' : t === 'primary' ? 'primary' : 'soft') as 'danger' | 'primary' | 'soft';
  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 'var(--p3r-z-confirm)' as unknown as number, background: 'var(--p3r-scrim)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: anim ? 0.18 : 0.08 }} onClick={safeClose}>
            <motion.div role="alertdialog" aria-modal="true" aria-labelledby={tid} aria-busy={busy || undefined} onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm"
              initial={anim ? { opacity: 0, scale: 0.92, x: -12, y: 12 } : { opacity: 0 }} animate={{ opacity: 1, scale: 1, x: 0, y: 0 }} exit={anim ? { opacity: 0, scale: 0.92, x: -12, y: 12 } : { opacity: 0 }} transition={springSoft}>
              {/* 层叠错位底板（P3R 斜板后层 8px 错位） */}
              <span aria-hidden className="absolute inset-0 translate-x-[8px] translate-y-[8px]" style={{ background: tone === 'default' ? 'var(--p3r-slab-back)' : TONE_BG[tone], opacity: 1 /* 红半透叠暗幕会混成玫红，蓝版错位底板一律实色 */, clipPath: slantClip(16) }} />
              {variant === 'system' ? (
                <div className="relative" style={{ background: P3R.panel, clipPath: slantClip(16) }}>
                  <div className="relative flex items-center gap-2 px-6 py-3" style={{ background: P3R.ink }}>
                    <span aria-hidden className="h-[14px] w-[10px]" style={{ background: TONE_BG[tone], clipPath: tickClip }} />
                    <h2 id={tid} className="min-w-0 truncate font-heavy text-[19px]" style={{ color: 'var(--p3r-on-ink)' }}>{title}</h2>
                    <span className="ml-auto font-cond text-[11px] tracking-wider" style={{ color: P3R.blue }}>SYSTEM</span>
                  </div>
                  <div className="px-6 pb-6 pt-4">
                    {description && <p className="whitespace-pre-line text-[14px] leading-relaxed" style={{ color: P3R.inkSoft }}>{description}</p>}
                    {children && <div className="mt-3">{children}</div>}
                    <div className="mt-5 flex flex-col gap-1.5" role="menu">
                      {(acts ?? [{ label: cancelText, onClick: safeClose }, { label: confirmText, tone: tone === 'danger' ? 'danger' : 'primary', onClick: () => onConfirm?.() } as DialogAction]).map((a, i) => {
                        const on = focus === i;
                        return (
                          <button key={i} type="button" role="menuitem" disabled={busy || a.disabled} onPointerEnter={() => setFocus(i)} onFocus={() => setFocus(i)} onClick={a.onClick}
                            className="relative flex h-11 min-w-0 items-center px-5 text-left disabled:opacity-50">
                            <span aria-hidden className="absolute inset-0" style={{ background: on ? 'transparent' : P3R.cyanFaint, clipPath: slantClip(9) }} />
                            {on && <SelectWedge className="-left-1 -right-2 inset-y-0" />}
                            <span className="relative min-w-0 truncate font-heavy text-[17px]" style={{ color: on ? 'var(--p3r-mulberry)' : a.tone === 'danger' ? P3R.magenta : P3R.ink }}>{a.label}</span>
                            {busy && on && <span className="relative ml-auto text-[12px] font-bold" style={{ color: 'var(--p3r-mulberry)' }}>{busyText ?? '处理中…'}</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative px-6 pb-6 pt-6" style={{ background: P3R.panel, clipPath: slantClip(16) }}>
                  <div className="text-center">
                    {icon ? <div className="mb-3 flex justify-center text-4xl">{icon}</div> : <ToneBadge tone={tone} />}
                    <h2 id={tid} className="mb-2 font-heavy text-[19px] leading-tight" style={{ color: P3R.ink }}>{title}</h2>
                    {description && <p className="whitespace-pre-line text-[14px] leading-relaxed" style={{ color: P3R.inkSoft }}>{description}</p>}
                  </div>
                  {children && <div className="mt-3">{children}</div>}
                  <div className={cx('mt-6 flex gap-3', acts && acts.length === 3 && 'flex-col')}>
                    {acts ? acts.map((a, i) => (
                      <P3Button key={i} tone={btnTone(a.tone)} block disabled={busy || a.disabled} onClick={a.onClick} className="flex-1">{a.label}</P3Button>
                    )) : (<>
                      <P3Button tone="soft" className="flex-1" disabled={busy} onClick={safeClose}>{cancelText}</P3Button>
                      <P3Button tone={tone === 'danger' ? 'danger' : tone === 'warning' ? 'warning' : 'primary'} className="flex-1" busy={busy} busyText={busyText} onClick={() => onConfirm?.()}>{confirmText}</P3Button>
                    </>)}
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
};

/* ───────────────────────── Sheet ───────────────────────── */
export interface P3SheetProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  /** 标题后的窄斜体英文签 */
  en?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** bottom=底部子菜单抽屉（默认；宽屏变居中卡）；center=居中卡片 */
  position?: 'bottom' | 'center';
  /** auto | tall(88vh) | full(96vh) | screen(全屏页，带返回三角) */
  size?: 'auto' | 'tall' | 'full' | 'screen';
  /** 提交中锁：backdrop / ESC / 下滑三条关闭通道全锁，标题旁显示 BUSY */
  busy?: boolean;
  /** 下滑关闭（拖把手 / 标题区，>90px 或快甩）；默认 bottom 开 */
  swipeToClose?: boolean;
  showHandle?: boolean;
  closeOnBackdrop?: boolean;
  /** 标题行右侧附加件。未传 hideClose 时沿用旧行为（有 headerExtra 就不画关闭键）；传 hideClose={false} 则与关闭键共存 */
  headerExtra?: ReactNode;
  /** 显式控制关闭键：true 隐藏 / false 显示（可与 headerExtra 共存） */
  hideClose?: boolean;
  /** 面板最大宽度（如 720 / '64rem'）；默认 bottom 宽屏 max-w-xl、center max-w-md */
  maxWidth?: number | string;
  /** 面板外层附加 class */
  className?: string;
  bodyClassName?: string;
  /** screen 尺寸左上返回（默认 onClose） */
  onBack?: () => void;
}

export const P3Sheet = ({ open, onClose, title, en, children, footer, position = 'bottom', size = 'auto', busy, swipeToClose, showHandle, closeOnBackdrop = true, headerExtra, hideClose, maxWidth, className, bodyClassName, onBack }: P3SheetProps) => {
  const showClose = hideClose === undefined ? !headerExtra : !hideClose;
  const anim = useBoldness();
  const tid = useId();
  const drag = useDragControls();
  const safeClose = useCallback(() => { if (!busy) onClose(); }, [busy, onClose]);
  useEscape(open, safeClose);
  useScrollLock(open);
  const screen = size === 'screen';
  const bottom = position === 'bottom' && !screen;
  const canSwipe = (swipeToClose ?? bottom) && !busy && anim;
  const handle = showHandle ?? bottom;
  const maxH = screen ? 'h-[100dvh]' : size === 'full' ? 'max-h-[96dvh]' : size === 'tall' ? 'max-h-[88dvh]' : 'max-h-[82dvh]';
  const onDragEnd = (_: unknown, info: PanInfo) => { if (info.offset.y > 90 || info.velocity.y > 600) safeClose(); };
  const panelMotion = !anim ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : bottom ? { initial: { y: '100%' }, animate: { y: 0 }, exit: { y: '100%' } }
    : screen ? { initial: { x: '100%', opacity: 0.6 }, animate: { x: 0, opacity: 1 }, exit: { x: '100%', opacity: 0.6 } }
    : { initial: { opacity: 0, scale: 0.95, x: -12, y: 12 }, animate: { opacity: 1, scale: 1, x: 0, y: 0 }, exit: { opacity: 0, scale: 0.95, x: -12, y: 12 } };
  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <motion.div className={cx('fixed inset-0 flex', bottom ? 'items-end justify-center wide:items-center' : 'items-center justify-center', !screen && !bottom && 'p-4')}
            style={{ zIndex: 'var(--p3r-z-sheet)' as unknown as number, background: screen ? 'transparent' : 'var(--p3r-scrim)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: anim ? 0.2 : 0.08 }}
            onClick={() => { if (closeOnBackdrop) safeClose(); }}>
            <motion.div role="dialog" aria-modal="true" aria-labelledby={title ? tid : undefined} aria-busy={busy || undefined}
              onClick={(e) => e.stopPropagation()} {...panelMotion} transition={springSoft}
              drag={canSwipe ? 'y' : false} dragControls={drag} dragListener={false} dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.6 }} onDragEnd={onDragEnd}
              className={cx('relative flex w-full flex-col', maxH, screen ? '' : bottom ? cx('pb-[env(safe-area-inset-bottom)]', maxWidth === undefined && 'wide:max-w-xl') : maxWidth === undefined && 'max-w-md', className)}
              style={{ maxWidth: screen ? undefined : maxWidth, background: 'var(--p3r-sheet-grad)', clipPath: screen ? undefined : bottom ? sheetTopClip : slantClip(14), boxShadow: 'var(--p3r-shadow-lg)' }}>
              {/* 左缘蓝细带 + 右上臂章红刀口（子菜单抽屉签名件） */}
              <span aria-hidden className="pointer-events-none absolute left-0 top-0 h-full w-[5px]" style={{ background: P3R.blue, opacity: 0.85 }} />
              <div className="shrink-0 touch-none" onPointerDown={(e) => { if (canSwipe) drag.start(e); }} style={{ cursor: canSwipe ? 'grab' : undefined }}>
                {handle && (
                  <div aria-hidden className="relative mx-auto mt-6 flex h-[18px] w-[86px] items-center justify-center" style={{ background: P3R.cyan, clipPath: 'polygon(0 55%, 18% 0, 100% 30%, 82% 100%)' }}>
                    <span className="h-[3px] w-8 bg-white" />
                  </div>
                )}
                {(title || screen) && (
                  <div className={cx('flex min-w-0 items-end gap-2 px-6', handle ? 'pt-3' : screen ? 'pt-[calc(14px+env(safe-area-inset-top))]' : 'pt-6')}>
                    {screen && (
                      <button type="button" aria-label="返回" onClick={() => (onBack ?? safeClose)()} className="mb-1 flex h-10 w-8 shrink-0 items-center">
                        <span aria-hidden className="block h-[15px] w-[13px]" style={{ background: P3R.ink, clipPath: 'polygon(100% 0, 100% 100%, 0 50%)' }} />
                      </button>
                    )}
                    {title && (
                      <h2 id={tid} className="min-w-0 truncate pr-2 font-heavy text-[clamp(22px,6.6vw,26px)] leading-tight" style={{ color: P3R.ink }}>
                        {title}<span aria-hidden className="ml-1.5 inline-block h-[10px] w-[13px]" style={{ background: P3R.blue, clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }} />
                      </h2>
                    )}
                    {en && <span className="mb-1.5 shrink-0 font-cond text-[12px] uppercase" style={{ color: P3R.grey }}>{en}</span>}
                    {busy && <span className="mb-1.5 ml-1 shrink-0 font-cond text-[11px]" style={{ color: P3R.magenta }}>BUSY…</span>}
                    {headerExtra && <div className="mb-1 ml-auto shrink-0">{headerExtra}</div>}
                    {showClose && !screen && (
                      <button type="button" aria-label="关闭" disabled={busy} onClick={safeClose} className={`mb-1 ${headerExtra ? 'ml-1' : 'ml-auto'} flex h-8 w-8 shrink-0 items-center justify-center text-[16px] font-black disabled:opacity-30`} style={{ color: P3R.inkSoft }}>✕</button>
                    )}
                  </div>
                )}
              </div>
              <div className={cx('min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4', bodyClassName)}>{children}</div>
              {footer && <div className="shrink-0 px-6 pb-4 pt-3" style={{ borderTop: '1px solid rgb(var(--p3r-cyan-rgb) / 0.3)' }}>{footer}</div>}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
};

/* ───────────────────────── ActionSheet ───────────────────────── */
export interface SheetAction { id: string; label: ReactNode; desc?: ReactNode; icon?: ReactNode; tone?: 'default' | 'danger'; disabled?: boolean }
export interface P3ActionSheetProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  actions: SheetAction[];
  onSelect?: (id: string) => void;
  onCancel?: () => void;
  /** null = 不显示取消 */
  cancelText?: ReactNode | null;
  /** 选中后保持打开（布尔或按 id） */
  keepOpen?: boolean | ((id: string) => boolean);
  busy?: boolean;
}
export const P3ActionSheet = ({ open, onClose, title, description, actions, onSelect, onCancel, cancelText = '取消', keepOpen, busy }: P3ActionSheetProps) => {
  const anim = useBoldness();
  const [focus, setFocus] = useState<string | null>(null);
  useEffect(() => { if (open) setFocus(actions.find((a) => !a.disabled)?.id ?? null); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const safeClose = useCallback(() => { if (!busy) { onCancel?.(); onClose(); } }, [busy, onCancel, onClose]);
  useEscape(open, safeClose);
  useBackHandler(open, safeClose);
  useScrollLock(open);
  const pick = (id: string) => {
    onSelect?.(id);
    const keep = typeof keepOpen === 'function' ? keepOpen(id) : keepOpen;
    if (!keep) onClose();
  };
  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 flex items-end justify-center p-3 pb-[calc(12px+env(safe-area-inset-bottom))] wide:items-center"
            style={{ zIndex: 'var(--p3r-z-sheet)' as unknown as number, background: 'var(--p3r-scrim)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={safeClose}>
            <motion.div role="menu" onClick={(e) => e.stopPropagation()} className="relative w-full max-w-md"
              initial={anim ? { y: 60, opacity: 0 } : { opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={anim ? { y: 60, opacity: 0 } : { opacity: 0 }} transition={springSoft}>
              <span aria-hidden className="absolute inset-0 translate-x-[7px] translate-y-[7px]" style={{ background: 'var(--p3r-slab-back)', clipPath: slantClip(14) }} />
              <div className="relative px-5 pb-4 pt-5" style={{ background: P3R.panel, clipPath: slantClip(14) }}>
                {(title || description) && (
                  <div className="mb-3 px-1">
                    {title && <div className="font-heavy text-[18px] leading-tight" style={{ color: P3R.ink }}>{title}</div>}
                    {description && <div className="mt-1 text-[13px]" style={{ color: P3R.grey }}>{description}</div>}
                  </div>
                )}
                <div className="flex flex-col gap-1">
                  {actions.map((a) => {
                    const on = focus === a.id;
                    return (
                      <button key={a.id} type="button" role="menuitem" disabled={a.disabled || busy} onPointerEnter={() => setFocus(a.id)} onFocus={() => setFocus(a.id)} onClick={() => pick(a.id)}
                        className="relative flex min-h-[46px] min-w-0 items-center gap-3 px-4 text-left disabled:opacity-40">
                        {on && <SelectWedge className="-left-1 -right-2 inset-y-0" />}
                        {a.icon && <span className="relative shrink-0 text-[18px]" style={{ color: on ? 'var(--p3r-mulberry)' : P3R.blue }}>{a.icon}</span>}
                        <span className="relative min-w-0 flex-1">
                          <span className="block truncate font-heavy text-[16px]" style={{ color: on ? 'var(--p3r-mulberry)' : a.tone === 'danger' ? P3R.magenta : P3R.ink }}>{a.label}</span>
                          {a.desc && <span className="block truncate text-[12px]" style={{ color: on ? 'var(--p3r-mulberry)' : P3R.grey }}>{a.desc}</span>}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {cancelText !== null && (
                  <P3Button tone="soft" block className="mt-3" disabled={busy} onClick={safeClose}>{cancelText}</P3Button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
};

/* ───────────────────────── Toast ───────────────────────── */
export type ToastKind = 'info' | 'success' | 'error';
interface ToastItem { id: number; text: ReactNode; kind: ToastKind; duration: number }
export interface ToastOpts { kind?: ToastKind; duration?: number }
export type ToastFn = ((text: ReactNode, opts?: ToastOpts) => void) & { success: (t: ReactNode, o?: ToastOpts) => void; error: (t: ReactNode, o?: ToastOpts) => void; info: (t: ReactNode, o?: ToastOpts) => void };
const ToastCtx = createContext<ToastFn | null>(null);
let externalToast: ((text: ReactNode, opts?: ToastOpts) => void) | null = null;
/** 非组件环境调用（Provider 挂载后可用） */
export const showToast = (text: ReactNode, opts?: ToastOpts) => externalToast?.(text, opts);
const TOAST_TAG: Record<ToastKind, { label: string; bg: string; ink: string }> = {
  info: { label: 'INFO', bg: P3R.cyan, ink: 'var(--p3r-mulberry)' },
  success: { label: 'CLEAR', bg: P3R.blue, ink: 'var(--p3r-on-blue)' },
  error: { label: 'ERROR', bg: P3R.magenta, ink: '#fff' },
};

export function P3ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const anim = useBoldness();
  const push = useCallback((text: ReactNode, opts: ToastOpts = {}) => {
    const id = Date.now() + Math.random();
    setItems((xs) => [...xs.slice(-2), { id, text, kind: opts.kind ?? 'info', duration: opts.duration ?? 2200 }]);
  }, []);
  const fn = useMemo(() => {
    const f = ((t: ReactNode, o?: ToastOpts) => push(t, o)) as ToastFn;
    f.success = (t, o) => push(t, { ...o, kind: 'success' });
    f.error = (t, o) => push(t, { ...o, kind: 'error' });
    f.info = (t, o) => push(t, { ...o, kind: 'info' });
    return f;
  }, [push]);
  useEffect(() => { externalToast = push; return () => { externalToast = null; }; }, [push]);
  return (
    <ToastCtx.Provider value={fn}>
      {children}
      <Portal>
        <div className="pointer-events-none fixed inset-x-0 flex flex-col items-center gap-2 px-4 wide:bottom-8" style={{ zIndex: 'var(--p3r-z-toast)' as unknown as number, bottom: 'calc(var(--p3r-nav-h) + 64px + env(safe-area-inset-bottom))' }}>
          <AnimatePresence initial={false}>
            {items.map((t) => <ToastView key={t.id} item={t} anim={anim} onDone={() => setItems((xs) => xs.filter((x) => x.id !== t.id))} />)}
          </AnimatePresence>
        </div>
      </Portal>
    </ToastCtx.Provider>
  );
}
function ToastView({ item, anim, onDone }: { item: ToastItem; anim: boolean; onDone: () => void }) {
  useEffect(() => { const t = window.setTimeout(onDone, item.duration); return () => clearTimeout(t); }, [item.duration, onDone]);
  const tag = TOAST_TAG[item.kind];
  return (
    <motion.div layout={anim} role="status" aria-live="polite"
      initial={anim ? { y: 46, opacity: 0 } : { opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={anim ? { y: -22, opacity: 0, transition: { duration: 0.18 } } : { opacity: 0 }}
      transition={{ duration: 0.32, ease: [0.33, 0, 0.15, 1] }}
      className="pointer-events-auto relative flex min-w-0 max-w-[min(92vw,420px)] items-stretch">
      <span aria-hidden className="absolute inset-0 translate-x-[5px] translate-y-[5px]" style={{ background: tag.bg, opacity: 0.6, clipPath: slantClip(10) }} />
      <div className="relative flex min-w-0 items-stretch" style={{ background: P3R.ink, clipPath: slantClip(10) }}>
        <span className="flex shrink-0 items-center pl-4 pr-3 font-cond text-[12px] tracking-wider" style={{ background: tag.bg, color: tag.ink, clipPath: 'polygon(10px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)' }}>{tag.label}</span>
        <span className="p3r-clamp-2 min-w-0 py-2.5 pl-2 pr-5 text-[14px] font-black" style={{ color: 'var(--p3r-on-ink)' }}>{item.text}</span>
      </div>
      {/* 蓝白 B3：Toast 从底部「浮上来」，带 3 颗步进上浮的气泡（粉版对位：顶部贴纸贴上来） */}
      {anim && [0, 1, 2].map((i) => (
        <motion.span key={i} aria-hidden className="absolute bottom-0" style={{ left: `${18 + i * 28}%`, width: 7 + i * 2, height: 7 + i * 2 }}
          initial={{ y: 10, opacity: 0 }} animate={{ y: [10, -12, -30, -46], opacity: [0, 0.9, 0.7, 0] }} transition={{ duration: 0.9, delay: 0.08 + i * 0.09, ease: (t: number) => Math.floor(t * 6) / 6 }}>
          <BubbleShape fill="var(--p3r-cyan)" />
        </motion.span>
      ))}
    </motion.div>
  );
}
export function useToast(): ToastFn {
  const f = useContext(ToastCtx);
  if (!f) throw new Error('useToast 需要在 <P3ToastProvider> 内使用（App 根已挂载）');
  return f;
}
