/**
 * 奖励已领取！（真实 src/components/weeklyGoal/ClaimedModal.tsx → CelebrationCutIn theme=gold，p3 斜切卡）：
 * icon spring 弹入（scale 0→1.3→1，rotate -30→0，delay .1）+ 粒子 20 + 2600ms 自动关（倒计时条 scaleX）；「知识 +7」。
 */
import type { OverlayProps } from '@blue/registry/types';
import { CelebCard } from '@blue/screens/pkg2/cutins';
import { ShatteredStar } from '@blue/kit';

export default function ClaimedModal({ open, onClose, attrName = '知识', pts = 7 }: OverlayProps & { attrName?: string; pts?: number }) {
  return (
    <CelebCard open={open} onClose={onClose} theme="gold" autoCloseMs={2600} particles={20} eyebrow="REWARD CLAIMED" icon={<ShatteredStar className="h-[84px] w-[84px]" />} title="奖励已领取！">
      <p className="text-[16px] font-bold" style={{ color: 'rgba(255,248,240,0.92)' }}>{attrName} <span className="font-cond text-[30px]">+{pts}</span></p>
    </CelebCard>
  );
}
