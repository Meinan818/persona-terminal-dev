/**
 * 成就解锁 AchievementUnlockModal → UnlockCutInP5（真实 src/components/AchievementUnlockModal.tsx + p5r/cutins.tsx；p5-modal-07）。
 * 4.5s 自动关 / 点幕 / ✕。?name= 覆盖成就名。
 */
import type { OverlayProps } from '@/p5r-red/registry/types';
import { unlockCutInP5, useCutIn } from './cutins.p5r';

export default function AchievementUnlockModal({ open, onClose, params }: OverlayProps) {
  useCutIn(open, (done) => unlockCutInP5({ heading: '成就解锁！', name: params?.get('name') ?? '野生之心', lines: ['感谢您的努力，', '您是最棒的客人。'], onClose: done }), onClose);
  return null;
}
