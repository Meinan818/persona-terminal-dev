/**
 * AchievementUnlockModal.p4g —— 对应真实 AchievementUnlockModal → p4r/cutins.tsx#AchievementUnlockP4。
 * 文案：「成就解锁」、成就名、「恭喜你达成新成就！继续努力解锁更多内容」、关闭。autoClose 4.5s。
 * 时序对齐真实 AchievementUnlockP4：奖杯徽 .14 → 黑题板 .34 → 蓝名板 .48（自左拉开）→ 奶油旗标 .62 → 星花迸开。
 */
import type { OverlayProps } from '@yellow/registry/types';
import { CelebrationStage } from '@yellow/screens/pkg1/CelebrationStage';

export function AchievementUnlockP4G({ open, onClose, achievementTitle = '学而不厌', icon = '🎓', message = '恭喜你达成新成就！继续努力解锁更多内容' }: OverlayProps & { achievementTitle?: string; icon?: string; message?: string }) {
  return (
    <CelebrationStage
      open={open} onClose={onClose}
      ariaLabel={`成就解锁！${achievementTitle}`}
      eyebrow="ACHIEVEMENT"
      autoCloseMs={4500}
      badgeTone="yellow"
      badge={
        <div className="relative flex flex-col items-center">
          {/* 奖杯：杯身 + 双耳 + 底座 + 杯面小星 */}
          <svg viewBox="0 0 100 100" className="h-[62%] w-[62%] drop-shadow-[4px_4px_0_#000]" aria-hidden>
            <path d="M28 14h44v18c0 16-10 28-22 28S28 48 28 32z" fill="var(--p4g-orange)" stroke="#111" strokeWidth="4" />
            <path d="M28 20H14c0 14 6 20 16 22M72 20h14c0 14-6 20-16 22" fill="none" stroke="#111" strokeWidth="4" />
            <rect x="44" y="60" width="12" height="12" fill="#111" />
            <rect x="30" y="72" width="40" height="12" rx="2" fill="var(--p4g-cream)" stroke="#111" strokeWidth="4" />
            <path d="M50 24 C51 31 53 33 60 34 C53 35 51 37 50 44 C49 37 47 35 40 34 C47 33 49 31 50 24Z" fill="var(--p4g-cream)" />
          </svg>
          <span aria-hidden className="absolute -right-1 -top-1 text-[32px] drop-shadow-[2px_2px_0_#000]">{icon}</span>
        </div>
      }
      plate="成就解锁"
      plateDelay={0.34}
      subPlate={achievementTitle}
      subPlateDelay={0.48}
      ribbon={<span className="text-body">{message}</span>}
      ribbonDelay={0.62}
    />
  );
}

export default function AchievementUnlockModal({ open, onClose, params }: OverlayProps) {
  return <AchievementUnlockP4G open={open} onClose={onClose} achievementTitle={params?.get('title') ?? '学而不厌'} />;
}
