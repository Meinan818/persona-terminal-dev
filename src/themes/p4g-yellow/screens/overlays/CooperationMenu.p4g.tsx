/**
 * 同伴系统菜单（真实 Cooperation.tsx 的 ✧ 下拉 menuOpen）。
 * P4G 暂停菜单式：黑底面板 + 彩虹竖条左缘 + 选中项橙色圆头高亮 + 黑三角；↑↓ 键盘可选，Enter 执行。
 * 四项：关于同伴系统 / 谏言（冷却禁用）/ 谏言归档库 / 通知（未登录禁用，未读角标）。
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import type { OverlayProps } from '@yellow/registry/types';
import { useLowMotion } from '@yellow/lib/prefs';
import { cx } from '@yellow/lib/cx';
import { Portal, showToast } from '@yellow/kit';

export interface CooperationMenuProps {
  open: boolean;
  onClose: () => void;
  counselState: 'available' | 'active' | 'cooldown';
  cooldownDate?: string;
  archiveCount: number;
  loggedIn: boolean;
  unreadCount: number;
  onAbout: () => void;
  onCounsel: () => void;
  onArchive: () => void;
  onNotifications: () => void;
  /** 定位：页面里贴着 ✧ 按钮（absolute），独立预览时居中 */
  floating?: boolean;
}

export function CooperationMenuPanel({ open, onClose, counselState, cooldownDate, archiveCount, loggedIn, unreadCount, onAbout, onCounsel, onArchive, onNotifications, floating }: CooperationMenuProps) {
  const low = useLowMotion();
  const ref = useRef<HTMLDivElement>(null);
  const items = [
    { id: 'about', icon: '✦', label: '关于同伴系统', sub: '展开 / 收起简介', disabled: false, run: onAbout },
    { id: 'counsel', icon: '✧', label: '谏言', sub: counselState === 'active' ? '当前窗口仍开着' : counselState === 'cooldown' ? `冷却中 · ${cooldownDate} 再开` : '每 3 天可用一次', disabled: counselState === 'cooldown', run: onCounsel },
    { id: 'archive', icon: '▤', label: '谏言归档库', sub: `${archiveCount} 条旧谈话`, disabled: false, run: onArchive },
    { id: 'notif', icon: '◈', label: '通知', sub: !loggedIn ? '登录后可查看' : unreadCount > 0 ? `${unreadCount} 条未读` : '暂无新消息', disabled: !loggedIn, run: onNotifications, badge: unreadCount },
  ];
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (!open) return;
    setIdx(0);
    const onDown = (e: PointerEvent) => { if (ref.current && !ref.current.contains(e.target as Node) && !(e.target as HTMLElement).closest('[data-coop-menu-trigger]')) onClose(); };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => (i + 1) % items.length); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => (i - 1 + items.length) % items.length); }
    };
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('pointerdown', onDown); window.removeEventListener('keydown', onKey); };
  }, [open]); // eslint-disable-line
  return (
    <AnimatePresence>
      {open && (
        <motion.div ref={ref} role="menu" aria-label="同伴系统菜单"
          initial={low ? { opacity: 0 } : { opacity: 0, scaleY: 0.05, scaleX: 0.8 }} animate={{ opacity: 1, scaleY: 1, scaleX: 1 }} exit={{ opacity: 0, scaleY: 0.05 }} transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className={cx('z-30 w-[244px] origin-top-right overflow-hidden rounded-sm border-3 border-p4g-black bg-p4g-black text-white shadow-[5px_5px_0_var(--p4g-orange)] night:border-p4g-yellow', floating ? 'relative ml-auto mt-28 wide:mr-[12%]' : 'absolute right-0 top-12')}
        >
          <div className="flex">
            <div aria-hidden className="w-3 shrink-0 p4g-candy-h" />
            <div className="min-w-0 flex-1 py-1.5">
              {items.map((it, i) => {
                const on = i === idx && !it.disabled;
                return (
                  <button key={it.id} role="menuitem" type="button" disabled={it.disabled}
                    onMouseEnter={() => setIdx(i)}
                    onClick={() => { onClose(); it.run(); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { onClose(); it.run(); } }}
                    className={cx('relative mx-1.5 my-0.5 flex w-[calc(100%-12px)] min-w-0 items-center gap-2 rounded-full px-3 py-2 text-left disabled:opacity-40', on ? 'bg-p4g-orange text-p4g-black' : 'text-white')}>
                    <span aria-hidden className={cx('h-0 w-0 shrink-0 border-y-[5px] border-l-[8px] border-y-transparent', on ? 'border-l-p4g-black' : 'border-l-transparent')} />
                    <span className={cx('relative w-5 shrink-0 text-center text-lead', on ? 'text-p4g-black' : 'text-p4g-yellow')}>
                      {it.icon}
                      {!!it.badge && it.badge > 0 && <span className="absolute -right-2 -top-1.5 flex h-[15px] min-w-[15px] items-center justify-center rounded-full border-2 border-p4g-black bg-p4g-red px-0.5 text-[9px] font-bold leading-none text-white">{it.badge > 99 ? '99+' : it.badge}</span>}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-display text-body font-bold leading-tight">{it.label}</span>
                      <span className={cx('block truncate text-2xs', on ? 'text-p4g-black/75' : 'text-white/65')}>{it.sub}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function CooperationMenu({ open, onClose, params }: OverlayProps) {
  const counsel = (params?.get('counsel') as 'available' | 'active' | 'cooldown') || 'available';
  return (
    <Portal><div className="fixed inset-x-0 top-0 px-4 pt-6" style={{ zIndex: 'var(--p4g-z-sheet)' as unknown as number }}>
      <CooperationMenuPanel floating open={open} onClose={onClose} counselState={counsel} cooldownDate="10/22" archiveCount={3} loggedIn={params?.get('login') !== '0'} unreadCount={4}
        onAbout={() => showToast('展开 / 收起简介')} onCounsel={() => { window.location.hash = '#/overlay/bond-counsel-chat'; }} onArchive={() => { window.location.hash = '#/overlay/bond-counsel-archive'; }} onNotifications={() => { window.location.hash = '#/overlay/bond-notifications'; }} />
    </div></Portal>
  );
}
