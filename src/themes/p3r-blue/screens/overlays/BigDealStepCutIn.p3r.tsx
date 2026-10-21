/**
 * BIG DEAL 推进一步 Cut-in（真实 src/components/bigdeal/BigDealStepCutIn.tsx → CelebrationCutIn theme=violet，p3 斜切卡）：
 *   不显示 LV；icon ◆；标题 = 刚完成的子步；副题「大事「X」」；「整件事的进度」+「第 N / M 步」+ 进度条；粒子 12（减半）；2200ms 自动关。
 *   粉版进度条：上一步的长度先在，再 scaleX 推进到这一步（只动 transform）。
 * ?remaining=1 → 只差最后一步（第 4/5 步 + 「只差最后一步」签）；?done=&total= 自定。
 */
import { motion } from 'framer-motion';
import type { OverlayProps } from '@blue/registry/types';
import { CelebCard } from '@blue/screens/pkg2/cutins';
import { useBoldness } from '@blue/lib/prefs';
import { slantClip } from '@blue/kit';

export interface BigDealStepPayload { dealTitle: string; step: string; done: number; total: number; next?: string }
export default function BigDealStepCutIn({ open, onClose, params, payload }: OverlayProps & { payload?: BigDealStepPayload }) {
  const anim = useBoldness();
  const last = params?.get('remaining') === '1';
  const p: BigDealStepPayload = payload ?? (last
    ? { dealTitle: '期中考试', step: '做两套往年真题', done: 4, total: 5, next: '错题过一遍' }
    : { dealTitle: '期中考试', step: '整理期中复习提纲', done: Number(params?.get('done') ?? 3), total: Number(params?.get('total') ?? 5) });
  const remaining = p.total - p.done;
  const from = Math.max(0, p.done - 1) / Math.max(1, p.total);
  const to = p.done / Math.max(1, p.total);
  return (
    <CelebCard open={open} onClose={onClose} theme="violet" autoCloseMs={2200} particles={12} eyebrow={remaining === 1 ? 'ONE MORE STEP' : 'STEP CLEAR'}
      icon={<span className="font-heavy text-[44px] leading-none">◆</span>} title={p.step} subtitle={`大事「${p.dealTitle}」`}>
      <div className="w-full text-left">
        <div className="flex items-baseline justify-between text-[12px] font-bold" style={{ color: 'rgba(255,248,240,0.8)' }}>
          <span>整件事的进度</span>
          <span className="font-cond text-[14px] tabular">第 {p.done} / {p.total} 步</span>
        </div>
        <div className="relative mt-1.5 h-2 w-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.25)', clipPath: slantClip(3) }}>
          <motion.div className="absolute inset-0 origin-left" style={{ background: 'var(--p3r-cream)' }}
            initial={anim ? { scaleX: from } : false} animate={{ scaleX: to }} transition={{ duration: 0.5, delay: 0.35, ease: [0.2, 0.8, 0.2, 1] }} />
        </div>
        {remaining === 1 && (
          <motion.div className="mt-3 inline-block px-3 py-1 text-[13px] font-black" style={{ background: 'var(--p3r-cream)', color: 'var(--p3r-mulberry)', clipPath: slantClip(6) }}
            initial={anim ? { scale: 1.6, opacity: 0, rotate: -6 } : false} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 420, damping: 20, delay: 0.75 }}>
            只差最后一步{p.next ? `——「${p.next}」` : ''}
          </motion.div>
        )}
      </div>
    </CelebCard>
  );
}
