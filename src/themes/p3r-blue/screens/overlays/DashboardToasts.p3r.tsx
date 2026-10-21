/**
 * DashboardToasts.p3r —— 临期 Toast（真实 DashboardP3 urgentToast：钉选宣告卡剩 ≤3 天且 >0，每卡每天首次见到时弹一次）。
 *   顶部居中蓝斜块（clip 8px）白字「⏳「标题」还剩 N 天」，opacity/y -16 → 0（.3s）入场，3600ms 后 y -8 淡出；不拦截指针。
 *   粉版 ⏳ emoji → 单色沙漏字形。演示：?days=1|2|3，&title=…；页面上由首页按 localStorage 节流自动触发（velvet_cc_urgent_<id>_<date>）。
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { OverlayProps } from '@blue/registry/types';
import { Portal, P3R, slantClip } from '@blue/kit';
import { useBoldness } from '@blue/lib/prefs';
import { MOCK_CALLING_CARD } from '@blue/adapters/pkg1';
import { HourglassGlyph } from '@blue/screens/pkg1/DashboardParts';

export const UrgentToast = ({ text }: { text: string | null }) => {
  const anim = useBoldness();
  return (
    <Portal>
      <AnimatePresence>
        {text && (
          <motion.div key={text} role="status" initial={anim ? { opacity: 0, y: -16 } : { opacity: 0 }} animate={{ opacity: 1, y: 0 }} exit={anim ? { opacity: 0, y: -8 } : { opacity: 0 }} transition={{ duration: 0.3 }}
            className="pointer-events-none fixed inset-x-0 flex justify-center px-4" style={{ top: 'calc(env(safe-area-inset-top) + 12px)', zIndex: 140 }}>
            <div className="flex max-w-full items-center gap-2 px-5 py-2.5 text-sm font-black" style={{ clipPath: slantClip(8), background: P3R.blue, color: 'var(--p3r-on-blue)', boxShadow: '0 12px 30px rgba(13,22,42,0.25)' }}>
              <HourglassGlyph color="var(--p3r-on-blue)" />
              <span className="min-w-0 truncate">{text}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
};

export default function UrgentToastOverlay({ open, onClose, params }: OverlayProps) {
  const days = Math.max(1, Math.min(3, Number(params?.get('days') ?? 3) || 3));
  const title = params?.get('title') ?? MOCK_CALLING_CARD.title;
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    setText(`「${title}」还剩 ${days} 天`);
    const t = window.setTimeout(() => { setText(null); window.setTimeout(onClose, 320); }, 3600);
    return () => clearTimeout(t);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  return <UrgentToast text={text} />;
}
