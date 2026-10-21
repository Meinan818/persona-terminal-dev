/**
 * 大事推进一步 Cut-in（真实 src/components/bigdeal/BigDealStepCutIn.tsx；p4 频道 = CelebrationCutIn 橙色贴纸圆，内容层墨色）：
 * ◆ 主徽 → 题板「刚完成的子步」→ 旗标「大事「X」」→「整件事的进度 · 第 N / M 步」+ 进度条（从上一步推进到这一步）；
 * 过程反馈：短（autoClose 2.2s，同真实）、不显示 LV。
 */
import { motion } from 'framer-motion';
import type { OverlayProps } from '@yellow/registry/types';
import { useLowMotion } from '@yellow/lib/prefs';
import { CelebrationCutInP4G } from './CelebrationCutIn.p4g';

export default function BigDealStepCutIn({ open, onClose, payload }: OverlayProps & { payload?: { dealTitle: string; done: number; total: number; step?: string } }) {
  const low = useLowMotion();
  const p = payload ?? { dealTitle: '期中考试', done: 4, total: 5, step: '做两套往年真题' };
  const from = Math.max(0, p.done - 1) / Math.max(1, p.total);
  const to = p.done / Math.max(1, p.total);
  return (
    <CelebrationCutInP4G open={open} onClose={onClose} icon="◆" title={p.step ?? `第 ${p.done} 步`} subtitle={`大事「${p.dealTitle}」`} eyebrow="BIG DEAL" autoCloseMs={2200}>
      <div className="w-[min(290px,74vw)] rounded-sm border-3 border-p4g-black bg-p4g-orange px-3 py-2 text-p4g-black shadow-hard">
        <div className="mb-1.5 flex items-baseline justify-between font-display text-meta font-bold" style={{ color: 'rgba(19,19,19,0.78)' }}><span>整件事的进度</span><span className="p4g-num">第 {p.done} / {p.total} 步</span></div>
        <div className="relative h-2.5 w-full overflow-hidden rounded-pill" style={{ background: 'rgba(19,19,19,0.18)' }}>
          <motion.div className="absolute inset-0 origin-left rounded-pill bg-p4g-black" initial={{ scaleX: low ? to : from }} animate={{ scaleX: to }} transition={{ duration: low ? 0 : 0.5, delay: low ? 0 : 0.7, ease: [0.2, 0.9, 0.1, 1] }} />
        </div>
      </div>
    </CelebrationCutInP4G>
  );
}
