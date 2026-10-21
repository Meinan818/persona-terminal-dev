/**
 * DashboardToasts.p4g —— 真实 Dashboard.tsx 的临期 Toast（钉选宣告卡 ≤3 天，每卡每天一次，3.6s 自动消失）。
 * 文案：⏳「「标题」还剩 N 天」。视觉：顶部黑色斜切条从左滑入 + 黄色 ⏳ 签 + CRT 扫描线一闪，自动淡出。
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';
import type { OverlayProps } from '@yellow/registry/types';
import { Portal } from '@yellow/kit';
import { useLowMotion } from '@yellow/lib/prefs';
import { MOCK_CALLING_CARD } from '@yellow/adapters/pkg1';
import { GlyphHourglass } from '@yellow/screens/pkg1/bits';

export function UrgentToastP4G({ text, onDone }: { text: string | null; onDone: () => void }) {
  const low = useLowMotion();
  useEffect(() => {
    if (!text) return;
    const t = window.setTimeout(onDone, 3600);
    return () => clearTimeout(t);
  }, [text, onDone]);
  return (
    <Portal>
      <AnimatePresence>
        {text && (
          <motion.div key={text} role="status" aria-live="polite"
            className="pointer-events-none fixed left-1/2 w-[min(92vw,460px)] -translate-x-1/2"
            style={{ top: 'calc(env(safe-area-inset-top) + 12px)', zIndex: 'var(--p4g-z-toast)' as unknown as number }}
            initial={low ? { opacity: 0 } : { opacity: 0, x: '-80%' }} animate={low ? { opacity: 1 } : { opacity: 1, x: '-50%' }}
            exit={{ opacity: 0, transition: { duration: 0.25 } }} transition={{ duration: 0.24, ease: [0.2, 0.9, 0.1, 1] }}>
            <div className="relative flex min-w-0 items-stretch overflow-hidden border-3 border-p4g-black bg-p4g-black text-white shadow-[5px_5px_0_var(--p4g-orange)]" style={{ clipPath: 'polygon(14px 0,100% 0,calc(100% - 14px) 100%,0 100%)' }}>
              <span className="flex shrink-0 items-center bg-p4g-yellow px-4"><GlyphHourglass size={18} /></span>
              <span className="min-w-0 flex-1 truncate px-3 py-2.5 font-display text-body font-bold">{text}</span>
              <span className="flex shrink-0 items-center pr-5 font-display text-2xs font-bold italic tracking-[0.2em] text-p4g-yellow">DEADLINE</span>
              {!low && <motion.span aria-hidden className="absolute inset-0 bg-white/30" initial={{ opacity: 0.9, scaleY: 0.05 }} animate={{ opacity: 0, scaleY: 1 }} transition={{ duration: 0.3, delay: 0.2 }} />}
              <span aria-hidden className="pointer-events-none absolute inset-0" style={{ backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,.06) 0 1px, transparent 1px 3px)' }} />
            </div>
            <div aria-hidden className="mx-6 h-[5px] p4g-candy" />
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}

export const urgentText = (days = 3) => `「${(MOCK_CALLING_CARD as unknown as { title: string }).title}」还剩 ${days} 天`;

export default function DashboardToasts({ open, onClose }: OverlayProps) {
  return <UrgentToastP4G text={open ? urgentText(3) : null} onDone={onClose} />;
}
