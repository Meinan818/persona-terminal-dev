/**
 * 奖励已领取！（真实 src/components/weeklyGoal/ClaimedModal.tsx → CelebrationCutIn 基座；p4 频道 = 橙色贴纸圆）：
 * ✨ 主徽 + 「奖励已领取！」题板 + 「属性 +N」；autoClose 2.6s（同真实）；点击任意处 / ✕ 收场。
 */
import type { OverlayProps } from '@yellow/registry/types';
import { CelebrationCutInP4G } from './CelebrationCutIn.p4g';

export default function ClaimedModal({ open, onClose, attrName = '知识', pts = 7 }: OverlayProps & { attrName?: string; pts?: number }) {
  return (
    <CelebrationCutInP4G open={open} onClose={onClose} icon="✨" title="奖励已领取！" eyebrow="REWARD GET!" autoCloseMs={2600}>
      <p className="rounded-xs bg-p4g-black px-3 py-1 text-center font-display text-body font-bold text-p4g-cream">{attrName} <span className="p4g-num text-h2 text-p4g-yellow">+{pts}</span></p>
    </CelebrationCutInP4G>
  );
}
