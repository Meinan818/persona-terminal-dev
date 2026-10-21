/**
 * SkillUnlockModal.p4g —— 对应真实 SkillUnlockModal（P4：CelebrationCutIn 橙圆贴纸）。
 * 文案：「技能解锁！」、技能名、「新技能已激活」「属性加成自动生效」、关闭。
 */
import type { OverlayProps } from '@yellow/registry/types';
import { P4Outline } from '@yellow/kit';
import { CelebrationStage, BadgeStar } from '@yellow/screens/pkg1/CelebrationStage';

export function SkillUnlockP4G({ open, onClose, skillName = '博闻强识 · 速读' }: OverlayProps & { skillName?: string }) {
  return (
    <CelebrationStage
      open={open} onClose={onClose}
      ariaLabel={`技能解锁！${skillName}`}
      eyebrow="SKILL GET!"
      autoCloseMs={4000}
      badge={<BadgeStar><P4Outline size="clamp(22px,6vw,30px)" stroke={5} italic>SKILL</P4Outline></BadgeStar>}
      plate="技能解锁！"
      ribbon={<span className="text-h3">{skillName}</span>}
      extra={
        <div className="flex flex-wrap justify-center gap-1.5">
          {['新技能已激活', '属性加成自动生效'].map((l) => <span key={l} className="rounded-xs bg-p4g-black px-2.5 py-1 font-display text-meta font-bold text-p4g-yellow">{l}</span>)}
        </div>
      }
    />
  );
}

export default function SkillUnlockModal({ open, onClose, params }: OverlayProps) {
  return <SkillUnlockP4G open={open} onClose={onClose} skillName={params?.get('name') ?? '博闻强识 · 速读'} />;
}
