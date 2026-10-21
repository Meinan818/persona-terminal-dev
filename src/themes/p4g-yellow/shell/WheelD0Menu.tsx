/**
 * 轮盘 D0 降级（真实 RadialQuickNav 的 useBoldness()=false 分支）：普通垂直菜单，点选跳转、无手势联动、无演出（仅透明度）。
 * 原 pkg1 实现，已提升进外壳：低动效档下外壳的长按轮盘直接渲染本组件。
 */
import { AnimatePresence, motion } from 'framer-motion';
import { Portal } from '@yellow/kit/Portal';
import { WHEEL_ITEMS } from './RadialWheelP4.p4g';
import { navigate } from './shellBus';

export function WheelD0Menu({ open, origin, onClose }: { open: boolean; origin: { x: number; y: number }; onClose: () => void }) {
  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <motion.div key="d0" className="fixed inset-0" style={{ zIndex: 'var(--p4g-z-cutin)' as unknown as number }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
            <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-label="关闭" />
            <div role="menu" aria-label="快捷跳转轮盘" className="absolute w-[212px] -translate-x-1/2 overflow-hidden rounded-sm border-3 border-p4g-yellow bg-p4g-black shadow-[5px_5px_0_var(--p4g-orange)]"
              style={{ left: Math.min(Math.max(origin.x, 116), window.innerWidth - 116), bottom: Math.max(8, window.innerHeight - origin.y + 44) }}>
              <div aria-hidden className="h-1.5 p4g-candy" />
              {WHEEL_ITEMS.map((it) => (
                <button key={it.id} type="button" role="menuitem" className="flex w-full items-center gap-3 border-b border-white/10 px-3 py-2.5 text-left font-display text-body font-bold text-white last:border-b-0 hover:bg-p4g-yellow hover:text-p4g-black focus:bg-p4g-yellow focus:text-p4g-black focus:outline-none"
                  onClick={() => { onClose(); navigate(it.id, undefined, { transition: 'none' }); }}>
                  <span aria-hidden className="w-6 text-center">{it.icon}</span>
                  <span className="min-w-0 flex-1 truncate">{it.label}</span>
                  <span className="font-display text-2xs italic tracking-[0.2em] opacity-60">{it.en}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}

