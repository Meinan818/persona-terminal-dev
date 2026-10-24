/** 全局弹层宿主（pink/blue）。排队规则照旧 App.tsx：升级 > 成就 > 技能；modalBlocker 时都不弹。 */
import { useAppStore } from '@/store';
import { useCloudSocialStore } from '@/store/cloudSocial';
import { ACHIEVEMENT_UNLOCK_LINES } from '@/constants';
import { P3ToastProvider } from '@pink/kit';
import { ConfidantRankUpCutIn, ConfidantStarShiftInvite } from '@/components/cooperation/ConfidantRankUpCutIn';
import { SyncStatusBadge } from '@/components/auth/SyncStatusBadge';
import { SyncMergeSheet } from '@/components/auth/SyncMergeSheet';
import { GlobalConflictDialog, GlobalDiffDialog } from '@/components/auth/GlobalSyncDialogs';
import { LevelUpP3 } from '@pink/screens/overlays/LevelUpModal.p3r';
import { AchievementUnlockP3 } from '@pink/screens/overlays/AchievementUnlockModal.p3r';
import { SkillUnlockP3 } from '@pink/screens/overlays/SkillUnlockModal.p3r';
import BigDealClearCutIn from '@pink/screens/overlays/BigDealClearCutIn.p3r';
import { OrgCelebrationView } from '@pink/screens/overlays/OrgCelebrationCutIn.p3r';
import WishProposalDialog from '@pink/screens/overlays/WishProposalDialog.p3r';
import OrphanImagesPrompt from '@pink/screens/overlays/OrphanImagesPrompt.p3r';

export function GlobalOverlayHost() {
  const levelUp = useAppStore((s) => s.levelUpNotification);
  const ach = useAppStore((s) => s.achievementNotification);
  const skill = useAppStore((s) => s.skillNotification);
  const blocker = useAppStore((s) => s.modalBlocker);
  const setLevelUp = useAppStore((s) => s.setLevelUpNotification);
  const setAch = useAppStore((s) => s.setAchievementNotification);
  const setSkill = useAppStore((s) => s.setSkillNotification);
  const bigDeal = useAppStore((s) => s.bigDealClear);
  const clearBigDeal = useAppStore((s) => s.clearBigDealClear);
  const orgHead = useCloudSocialStore((s) => s.orgCelebrations[0] ?? null);
  const shiftOrg = useCloudSocialStore((s) => s.shiftOrgCelebration);
  const wishProposal = useAppStore((s) => s.wishProposal);
  const setWishProposal = useAppStore((s) => s.setWishProposal);
  const setWishProgress = useAppStore((s) => s.setWishProgress);
  const orphan = useAppStore((s) => s.orphanImagesPrompt);
  const dismissOrphan = useAppStore((s) => s.dismissOrphanImagesPrompt);
  const pruneOrphan = useAppStore((s) => s.pruneOrphanImages);
  const lines = ach ? ACHIEVEMENT_UNLOCK_LINES[ach.id] : undefined;
  return (
    <P3ToastProvider>
      <LevelUpP3 isOpen={!!levelUp && !blocker} onClose={() => setLevelUp(null)} attributeName={levelUp?.displayName ?? ''} newLevel={levelUp?.level ?? 1} masteryStars={levelUp?.masteryStars} />
      <AchievementUnlockP3 isOpen={!!ach && !blocker && !levelUp} onClose={() => setAch(null)} achievementTitle={ach?.title ?? ''} {...(lines ? { lines } : {})} />
      <SkillUnlockP3 isOpen={!!skill && !blocker && !levelUp && !ach} onClose={() => setSkill(null)} skillName={skill?.name ?? ''} />
      <BigDealClearCutIn open={!!bigDeal && !blocker} onClose={clearBigDeal} params={new URLSearchParams()} data={bigDeal ?? undefined} />
      {orgHead && <OrgCelebrationView open={!blocker} onClose={shiftOrg} head={orgHead as Parameters<typeof OrgCelebrationView>[0]['head']} />}
      <WishProposalDialog open={!!wishProposal && !blocker} onClose={() => setWishProposal(null)} params={new URLSearchParams()} wishTitle={wishProposal?.wishTitle} fromPct={wishProposal?.fromPct} toPct={wishProposal?.toPct} reason={wishProposal?.reason}
        onConfirm={() => { const proposal = wishProposal; if (!proposal) return; void setWishProgress(proposal.wishId, proposal.toPct, { reason: proposal.reason }).then(() => setWishProposal(null)).catch(() => { /* 失败保留提议，避免假成功 */ }); }} />
      <OrphanImagesPrompt open={!!orphan && !blocker} onClose={dismissOrphan} params={new URLSearchParams()} count={orphan?.count} bytes={orphan?.bytes} onConfirm={() => { void pruneOrphan(); dismissOrphan(); }} />
      <ConfidantRankUpCutIn />
      <ConfidantStarShiftInvite />
      <SyncStatusBadge />
      <SyncMergeSheet />
      <GlobalConflictDialog />
      <GlobalDiffDialog />
    </P3ToastProvider>
  );
}
