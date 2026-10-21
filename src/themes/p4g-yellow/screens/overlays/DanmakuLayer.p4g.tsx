/**
 * 弹幕层（DanmakuLayer）demo 宿主：午夜频道雪花电视画面上飘过鼓励弹幕；长按任一条 →「反馈并隐藏」→「已反馈」。
 */
import { AnimatePresence, motion } from 'framer-motion';
import type { OverlayProps } from '@yellow/registry/types';
import { P4Button, Portal } from '@yellow/kit';
import { NoiseLayer } from '@yellow/fx';
import { DANMAKU } from '@yellow/adapters/pkg2';
import { DanmakuStrip } from '@yellow/screens/pkg2/Danmaku';

export default function DanmakuLayer({ open, onClose }: OverlayProps) {
  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <motion.div key="dm" className="fixed inset-0 overflow-hidden bg-p4g-black" style={{ zIndex: 'var(--p4g-z-sheet)' as unknown as number }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <NoiseLayer opacity={0.18} />
            <div className="absolute inset-x-0 top-0 h-2 p4g-candy-h" />
            <DanmakuStrip items={DANMAKU.map((t, i) => ({ id: `d${i}`, text: t }))} tone="dark" topBase={14} topStep={12} />
            <div className="absolute inset-x-0 bottom-8 flex flex-col items-center gap-3 px-6 text-center">
              <p className="rounded-sm bg-p4g-yellow px-3 py-1 font-display text-meta font-bold text-p4g-black">长按任意一条弹幕可以反馈</p>
              <P4Button variant="secondary" onClick={onClose}>关闭</P4Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
