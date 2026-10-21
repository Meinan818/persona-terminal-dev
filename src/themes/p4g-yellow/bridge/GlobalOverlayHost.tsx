/** 全局弹层宿主（黄）。排队规则照旧 App.tsx：升级 > 成就 > 技能；modalBlocker 时都不弹。 */
import { useAppStore } from '@/store';
import { ACHIEVEMENT_UNLOCK_LINES } from '@/constants';
import { LevelUpP4G } from '@yellow/screens/overlays/LevelUpModal.p4g';
import { AchievementUnlockP4G } from '@yellow/screens/overlays/AchievementUnlockModal.p4g';
import { SkillUnlockP4G } from '@yellow/screens/overlays/SkillUnlockModal.p4g';

export function GlobalOverlayHost() {
  const levelUp = useAppStore((s) => s.levelUpNotification);
  const ach = useAppStore((s) => s.achievementNotification);
  const skill = useAppStore((s) => s.skillNotification);
  const blocker = useAppStore((s) => s.modalBlocker);
  const setLevelUp = useAppStore((s) => s.setLevelUpNotification);
  const setAch = useAppStore((s) => s.setAchievementNotification);
  const setSkill = useAppStore((s) => s.setSkillNotification);
  const achLines = ach ? ACHIEVEMENT_UNLOCK_LINES[ach.id] : undefined;
  return (
    <>
      <LevelUpP4G open={!!levelUp && !blocker} onClose={() => setLevelUp(null)} attributeName={levelUp?.displayName} newLevel={levelUp?.level} masteryStars={levelUp?.masteryStars} />
      <AchievementUnlockP4G open={!!ach && !blocker && !levelUp} onClose={() => setAch(null)} achievementTitle={ach?.title} {...(achLines ? { message: achLines.join('') } : {})} />
      <SkillUnlockP4G open={!!skill && !blocker && !levelUp && !ach} onClose={() => setSkill(null)} skillName={skill?.name} />
      {/* 其余照上表逐个加 */}
    </>
  );
}
