/** Portal 到 body + 弹层工具（ESC 关闭、滚动锁）。 */
import { createPortal } from 'react-dom';
import { useEffect, type ReactNode } from 'react';

export const Portal = ({ children }: { children: ReactNode }) => (typeof document === 'undefined' ? null : createPortal(children, document.body));

let locks = 0;
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    locks++;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { locks--; if (locks === 0) document.body.style.overflow = prev; };
  }, [active]);
}

export function useEscape(active: boolean, fn: () => void) {
  useEffect(() => {
    if (!active) return;
    const on = (e: KeyboardEvent) => { if (e.key === 'Escape') fn(); };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [active, fn]);
}
