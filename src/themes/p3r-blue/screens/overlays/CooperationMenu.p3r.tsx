/**
 * 同伴系统菜单（真实 Cooperation.tsx 的 ✧ 下拉 menuOpen · p3-menu-surface）。
 * P3R 子菜单：白斜卡 + 左缘蓝细带 + 光标楔选中（↑↓ / Enter）+ 右上臂章红刀口；点外部 / Esc 关闭。
 * 四项：关于同伴系统（展开 / 收起简介）/ 谏言（每 3 天一次 · 冷却禁用 · 窗口仍开着）/ 谏言归档库（N 条旧谈话）/ 通知（未登录禁用，未读角标）。
 *   #/overlay/bond-menu?counsel=available|active|cooldown&login=0
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import type { OverlayProps } from '@blue/registry/types';
import { P3R, Portal, SelectWedge, showToast, slantClip, tickClip } from '@blue/kit';
import { useBoldness } from '@blue/lib/prefs';
import { cx } from '@blue/lib/cx';

export interface CooperationMenuProps {
  open: boolean; onClose: () => void; counselState: 'available' | 'active' | 'cooldown'; cooldownDate?: string; archiveCount: number; loggedIn: boolean; unreadCount: number;
  onAbout: () => void; onCounsel: () => void; onArchive: () => void; onNotifications: () => void; floating?: boolean;
}

export function CooperationMenuPanel({ open, onClose, counselState, cooldownDate, archiveCount, loggedIn, unreadCount, onAbout, onCounsel, onArchive, onNotifications, floating }: CooperationMenuProps) {
  const bold = useBoldness();
  const ref = useRef<HTMLDivElement>(null);
  const items = [
    { id: 'about', icon: '✦', label: '关于同伴系统', sub: '展开 / 收起简介', disabled: false, run: onAbout },
    { id: 'counsel', icon: '✧', label: '谏言', sub: counselState === 'active' ? '当前窗口仍开着' : counselState === 'cooldown' ? `冷却中 · ${cooldownDate} 再开` : '每 3 天可用一次', disabled: counselState === 'cooldown', run: onCounsel },
    { id: 'archive', icon: '▤', label: '谏言归档库', sub: `${archiveCount} 条旧谈话`, disabled: false, run: onArchive },
    { id: 'notif', icon: '◈', label: '通知', sub: !loggedIn ? '登录后可查看' : unreadCount > 0 ? `${unreadCount} 条未读` : '暂无新消息', disabled: !loggedIn, run: onNotifications, badge: loggedIn ? unreadCount : 0 },
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
      if (e.key === 'Enter') { const it = items[idxRef.current]; if (it && !it.disabled) { onClose(); it.run(); } }
    };
    window.addEventListener('pointerdown', onDown); window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('pointerdown', onDown); window.removeEventListener('keydown', onKey); };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const idxRef = useRef(0); idxRef.current = idx;
  return (
    <AnimatePresence>
      {open && (
        <motion.div ref={ref} role="menu" aria-label="同伴系统菜单"
          initial={bold ? { opacity: 0, y: -4, scale: 0.96 } : { opacity: 0 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.96 }} transition={{ duration: 0.15 }}
          className={cx('z-30 w-[248px] origin-top-right', floating ? 'relative ml-auto mt-24 wide:mr-[12%]' : 'absolute right-0 top-11')}
          style={{ filter: 'drop-shadow(0 12px 22px rgb(var(--p3r-mulberry-rgb) / 0.22))' }}>
          <div className="relative overflow-hidden py-1.5" style={{ background: P3R.panel, clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%)' }}>
            <span aria-hidden className="absolute left-0 top-0 h-full w-[5px]" style={{ background: P3R.blue }} />
            <span aria-hidden className="absolute right-0 top-0 h-[16px] w-[16px]" style={{ background: P3R.magenta, clipPath: 'polygon(0 0, 100% 100%, 100% 0)' }} />
            {items.map((it, i) => {
              const on = i === idx && !it.disabled;
              return (
                <button key={it.id} role="menuitem" type="button" disabled={it.disabled} onMouseEnter={() => setIdx(i)} onFocus={() => setIdx(i)} onClick={() => { onClose(); it.run(); }}
                  className="relative flex w-full min-w-0 items-center gap-2.5 py-2.5 pl-5 pr-3 text-left disabled:opacity-40" style={{ borderTop: i ? '1px solid rgb(var(--p3r-cyan-rgb) / 0.25)' : undefined }}>
                  {on && <SelectWedge className="left-1 right-2 top-1 bottom-1" />}
                  <span className="relative flex h-7 w-7 shrink-0 items-center justify-center text-[15px]" style={{ clipPath: slantClip(5), background: on ? 'var(--p3r-mulberry)' : P3R.cyanFaint, color: on ? 'var(--bk-bubble-b)' : P3R.roseInk }}>
                    {it.icon}
                    {!!it.badge && it.badge > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-[14px] min-w-[14px] items-center justify-center rounded-full px-0.5 text-[9px] font-black leading-none text-white" style={{ background: P3R.magenta }}>{it.badge > 99 ? '99+' : it.badge}</span>}
                  </span>
                  <span className="relative min-w-0 flex-1">
                    <span className="block truncate font-heavy text-[15px] leading-tight" style={{ color: on ? 'var(--p3r-mulberry)' : P3R.ink }}>{it.label}</span>
                    <span className="block truncate text-[11px] font-bold" style={{ color: on ? 'var(--p3r-mulberry)' : P3R.grey, opacity: on ? 0.8 : 1 }}>{it.sub}</span>
                  </span>
                  {on && <span aria-hidden className="relative h-[8px] w-[12px] shrink-0" style={{ background: 'var(--p3r-mulberry)', clipPath: tickClip }} />}
                </button>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function CooperationMenu({ open, onClose, params }: OverlayProps) {
  const counsel = (params?.get('counsel') as 'available' | 'active' | 'cooldown') || 'available';
  return (
    <Portal><div className="fixed inset-x-0 top-0 px-4 pt-6" style={{ zIndex: 'var(--p3r-z-sheet)' as unknown as number }}>
      <CooperationMenuPanel floating open={open} onClose={onClose} counselState={counsel} cooldownDate="10/24" archiveCount={3} loggedIn={params?.get('login') !== '0'} unreadCount={4}
        onAbout={() => showToast('展开 / 收起简介')} onCounsel={() => { window.location.hash = '#/overlay/bond-counsel-chat'; }} onArchive={() => { window.location.hash = '#/overlay/bond-counsel-archive'; }} onNotifications={() => { window.location.hash = '#/overlay/bond-notifications'; }} />
    </div></Portal>
  );
}
