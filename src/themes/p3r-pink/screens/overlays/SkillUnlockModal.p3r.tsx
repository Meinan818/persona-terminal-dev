/**
 * SkillUnlockModal.p3r —— 技能解锁（真实 src/components/SkillUnlockModal.tsx：p3 频道走 CelebrationCutIn 基座的斜切卡形态）。
 * 真实参数：theme violet · autoCloseMs 4000 · particles 16 · 图标 scale [0,1.3,1] + rotate -180→0（.8s, delay .2, spring）·
 *   标题「技能解锁！」· 技能名 · 「新技能已激活，属性加成自动生效」。粉版：violet → 藕紫玫红渐变，⚡ emoji → 单色闪电。
 * 演示：?name=… 自定技能名。
 */
import { motion } from 'framer-motion';
import type { OverlayProps } from '@pink/registry/types';
import { useBoldness } from '@pink/lib/prefs';
import { MOCK_SKILL_UNLOCK } from '@pink/adapters/pkg1';
import { CelebrationCutInP3, BoltGlyph } from './CelebrationCutIn.p3r';

export const SkillUnlockP3 = ({ isOpen, onClose, skillName }: { isOpen: boolean; onClose: () => void; skillName: string }) => {
  const anim = useBoldness();
  return (
    <CelebrationCutInP3 isOpen={isOpen} onClose={onClose} theme="violet" autoCloseMs={4000} particles={16}
      icon={<motion.span className="inline-block" initial={anim ? { scale: 0, rotate: -180 } : false} animate={anim ? { scale: [0, 1.3, 1], rotate: 0 } : undefined} transition={{ duration: 0.8, delay: 0.2, type: 'spring' }}><BoltGlyph /></motion.span>}
      title="技能解锁！">
      <p className="text-xl font-black text-white/95">{skillName}</p>
      <p className="mt-4 text-sm text-white/75">新技能已激活，属性加成自动生效</p>
    </CelebrationCutInP3>
  );
};

export default function SkillUnlockOverlay({ open, onClose, params }: OverlayProps) {
  return <SkillUnlockP3 isOpen={open} onClose={onClose} skillName={params?.get('name') ?? MOCK_SKILL_UNLOCK.name} />;
}
