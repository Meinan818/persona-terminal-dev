/** 全局弹层宿主（黄）。排队规则照旧 App.tsx：升级 > 成就 > 技能；modalBlocker 时都不弹。 */
import { useAppStore } from '@/store';
import { useCloudSocialStore } from '@/store/cloudSocial';
import { ACHIEVEMENT_UNLOCK_LINES } from '@/constants';
import { LevelUpP4G } from '@yellow/screens/overlays/LevelUpModal.p4g';
import { AchievementUnlockP4G } from '@yellow/screens/overlays/AchievementUnlockModal.p4g';
import { SkillUnlockP4G } from '@yellow/screens/overlays/SkillUnlockModal.p4g';
import { WishProgressView } from '@yellow/screens/overlays/WishProgressCutIn.p4g';
import BigDealClearCutIn from '@yellow/screens/overlays/BigDealClearCutIn.p4g';
import CallingCardCutIn from '@yellow/screens/overlays/CallingCardCutIn.p4g';
import { OrgCelebration } from '@yellow/screens/overlays/OrgCelebrationCutIn.p4g';

export function GlobalOverlayHost() {
  const levelUp = useAppStore((s) => s.levelUpNotification);
  const ach = useAppStore((s) => s.achievementNotification);
  const skill = useAppStore((s) => s.skillNotification);
  const blocker = useAppStore((s) => s.modalBlocker);
  const setLevelUp = useAppStore((s) => s.setLevelUpNotification);
  const setAch = useAppStore((s) => s.setAchievementNotification);
  const setSkill = useAppStore((s) => s.setSkillNotification);
  const wishCut = useAppStore((s) => s.wishProgressCut);
  const clearWishCut = useAppStore((s) => s.clearWishProgressCut);
  const bigDeal = useAppStore((s) => s.bigDealClear);
  const clearBigDeal = useAppStore((s) => s.clearBigDealClear);
  const cutCard = useAppStore((s) => s.callingCards.find((c) => c.archived && c.cutInShown !== true) ?? null);
  const markShown = useAppStore((s) => s.markCallingCardCutInShown);
  const orgHead = useCloudSocialStore((s) => s.orgCelebrations[0] ?? null);
  const shiftOrg = useCloudSocialStore((s) => s.shiftOrgCelebration);
  const achLines = ach ? ACHIEVEMENT_UNLOCK_LINES[ach.id] : undefined;
  const wishPayload = wishCut
    ? { title: wishCut.wishTitle, pct: wishCut.pct, delta: wishCut.delta, times: wishCut.times, source: wishCut.source === 'ai' ? 'ai' as const : 'local' as const, reason: wishCut.reason }
    : null;
  return (
    <>
      <LevelUpP4G open={!!levelUp && !blocker} onClose={() => setLevelUp(null)} attributeName={levelUp?.displayName} newLevel={levelUp?.level} masteryStars={levelUp?.masteryStars} />
      <AchievementUnlockP4G open={!!ach && !blocker && !levelUp} onClose={() => setAch(null)} achievementTitle={ach?.title} {...(achLines ? { message: achLines.join('') } : {})} />
      <SkillUnlockP4G open={!!skill && !blocker && !levelUp && !ach} onClose={() => setSkill(null)} skillName={skill?.name} />
      <WishProgressView payload={wishPayload} onClose={clearWishCut} />
      <BigDealClearCutIn open={!!bigDeal && !blocker} onClose={clearBigDeal} data={bigDeal ?? undefined} />
      <CallingCardCutIn open={!!cutCard && !blocker} onClose={() => { if (cutCard) void markShown(cutCard.id); }} params={new URLSearchParams()} card={cutCard ?? undefined} reason={cutCard?.archiveReason ?? 'manual'} />
      <OrgCelebration head={orgHead} onClose={shiftOrg} />
    </>
  );
}
