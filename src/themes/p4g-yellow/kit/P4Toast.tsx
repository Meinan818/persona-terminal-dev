/**
 * P4Toast + useToast —— 轻提示：黑条从左斜切滑入，左侧黄色类型签（INFO / OK / ERROR），白字。
 * 根部已挂 <P4ToastProvider>（src/App.tsx），页面里直接：
 *   const toast = useToast();
 *   toast('已保存');                         // info
 *   toast.success('收进节目单');  toast.error('网络异常');  toast('再次点击回到现实', { duration: 1800 })
 * 也可不用 hook：import { showToast } from '@yellow/kit'; showToast('…')
 */
import { AnimatePresence, motion } from 'framer-motion';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Portal } from './Portal';
import { useLowMotion } from '@yellow/lib/prefs';
import { cx } from '@yellow/lib/cx';

export type ToastKind = 'info' | 'success' | 'error';
interface ToastItem { id: number; text: ReactNode; kind: ToastKind; duration: number }
export interface ToastOpts { kind?: ToastKind; duration?: number }
export type ToastFn = ((text: ReactNode, opts?: ToastOpts) => void) & { success: (t: ReactNode, o?: ToastOpts) => void; error: (t: ReactNode, o?: ToastOpts) => void; info: (t: ReactNode, o?: ToastOpts) => void };

const Ctx = createContext<ToastFn | null>(null);
let external: ((text: ReactNode, opts?: ToastOpts) => void) | null = null;
/** 非组件环境调用（Provider 挂载后可用）*/
export const showToast = (text: ReactNode, opts?: ToastOpts) => external?.(text, opts);

const LABEL: Record<ToastKind, string> = { info: 'INFO', success: 'OK!', error: 'ERROR' };

export function P4ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const low = useLowMotion();
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
  useEffect(() => { external = push; return () => { external = null; }; }, [push]);
  return (
    <Ctx.Provider value={fn}>
      {children}
      <Portal>
        <div className="pointer-events-none fixed inset-x-0 flex flex-col items-center gap-2 px-4" style={{ zIndex: 'var(--p4g-z-toast)' as unknown as number, bottom: 'calc(var(--p4g-nav-h) + 24px + env(safe-area-inset-bottom))' }}>
          <AnimatePresence initial={false}>
            {items.map((t) => <ToastView key={t.id} item={t} low={low} onDone={() => setItems((xs) => xs.filter((x) => x.id !== t.id))} />)}
          </AnimatePresence>
        </div>
      </Portal>
    </Ctx.Provider>
  );
}

function ToastView({ item, low, onDone }: { item: ToastItem; low: boolean; onDone: () => void }) {
  useEffect(() => { const t = window.setTimeout(onDone, item.duration); return () => clearTimeout(t); }, [item.duration, onDone]);
  const tag = item.kind === 'error' ? 'bg-p4g-red text-white' : item.kind === 'success' ? 'bg-p4g-green text-p4g-black' : 'bg-p4g-yellow text-p4g-black';
  return (
    <motion.div layout={!low} role="status" aria-live="polite"
      initial={low ? { opacity: 0 } : { x: -60, opacity: 0, skewX: -12 }} animate={low ? { opacity: 1 } : { x: 0, opacity: 1, skewX: -12 }} exit={low ? { opacity: 0 } : { x: 60, opacity: 0, transition: { duration: 0.16 } }}
      transition={{ duration: 0.2, ease: [0.2, 0.9, 0.1, 1] }}
      className="pointer-events-auto flex max-w-[min(92vw,420px)] min-w-0 items-stretch border-3 border-p4g-black bg-p4g-black shadow-[4px_4px_0_var(--p4g-yellow)]">
      <span className={cx('flex shrink-0 items-center px-2.5 font-display text-2xs font-bold tracking-wider', tag)} style={{ transform: 'skewX(12deg)' }}>{LABEL[item.kind]}</span>
      <span className="min-w-0 px-3 py-2.5 font-display text-body font-bold text-white p4g-clamp-2" style={{ transform: 'skewX(12deg)' }}>{item.text}</span>
    </motion.div>
  );
}

export function useToast(): ToastFn {
  const f = useContext(Ctx);
  if (!f) throw new Error('useToast 需要在 <P4ToastProvider> 内使用（App 根已挂载）');
  return f;
}
