/**
 * 技能解锁 SkillUnlockModal（真实 src/components/SkillUnlockModal.tsx，红频道走 UnlockCutInP5 版式，heading「技能解锁！」）。
 * 4.5s 自动关 / 点幕 / ✕。?name= 覆盖技能名。
 */
import type { OverlayProps } from '@/p5r-red/registry/types';
import { unlockCutInP5, useCutIn } from './cutins.p5r';

export default function SkillUnlockModal({ open, onClose, params }: OverlayProps) {
  useCutIn(open, (done) => unlockCutInP5({ heading: '技能解锁！', name: params?.get('name') ?? '博闻强识', lines: ['新技能已激活', '属性加成自动生效'], onClose: done }), onClose);
  return null;
}
