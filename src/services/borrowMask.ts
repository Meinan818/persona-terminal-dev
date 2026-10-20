/**
 * 借面具（v2.7.0.6 第 8 轮 · PRD §13.5）的本机动作：借走 / 记一场。
 * 借来的面具只存在自己的战场状态里（BattleState.borrow），服务器上不多写任何东西；战场状态整行同步，换设备也在。
 */
import { useAppStore } from '@/store';
import { useCloudSocialStore } from '@/store/cloudSocial';
import { weekKeyOf } from '@/battle/tower';
import { borrowNow, sanitizePersona } from '@/utils/orgBorrow';
import { orgLevelOfView } from '@/utils/orgOps';
import { displayCodename } from '@/utils/orgLogic';
import { demoProfileSeed } from '@/umbra/demoBridge';
import type { BattleState, OrgMember, OrgPersonaSnapshot, OrgView } from '@/types';
import type { UmbraProfile } from '@/umbra/state';

export class BorrowError extends Error {}

const withBorrowedMask = (
  profile: UmbraProfile,
  borrow: NonNullable<BattleState['borrow']>,
  now: Date,
): UmbraProfile => ({
  ...profile,
  updatedAt: now,
  online: {
    ...profile.online,
    borrow,
  },
  demo: {
    ...profile.demo,
    p5r: {
      ...(profile.demo?.p5r ?? demoProfileSeed(profile)),
      borrowedMask: borrow,
    },
    updatedAt: now.toISOString(),
  },
});

/** 借走一张（替换本周借着的那张；场数不清零——换着借也还是每周 3 场） */
export async function borrowMaskFromUi(view: OrgView, member: OrgMember, persona: OrgPersonaSnapshot): Promise<void> {
  const st = useAppStore.getState();
  const profile = st.umbraProfile;
  if (!profile) throw new BorrowError('先去UMBRA（幽影协议）唤醒你自己的人格面具，才能同调别人的');
  if (member.userId === view.me.userId) throw new BorrowError('这是你自己的面具');
  const clean = sanitizePersona(persona);
  if (!clean || !clean.skills.length) throw new BorrowError('这张面具还没有能用的技能');
  const now = new Date();
  const cur = borrowNow({ borrow: profile.online?.borrow }, now);
  const borrow: NonNullable<BattleState['borrow']> = {
    weekKey: cur.weekKey,
    battles: cur.battles,
    mask: {
      orgId: view.org.id,
      orgName: view.org.name,
      ownerId: member.userId,
      ownerCodename: displayCodename(member),
      persona: clean,
      mult: orgLevelOfView(view).mult,
      at: now.toISOString(),
    },
  };
  await st.saveUmbraProfile(withBorrowedMask(profile, borrow, now));
}

/** 这一场第一次用借来的技能：本周场数 +1（读最新的战场状态再写，别把刚发的 SP 吞掉） */
export async function markBorrowBattle(now = new Date()): Promise<void> {
  const st = useAppStore.getState();
  const profile = st.umbraProfile;
  if (!profile) return;
  const wk = weekKeyOf(now);
  const current = profile.online?.borrow;
  const cur = current?.weekKey === wk ? current : { weekKey: wk, battles: 0 };
  if (!cur.mask) return;
  await st.saveUmbraProfile(withBorrowedMask(profile, {
    ...cur,
    battles: (cur.battles ?? 0) + 1,
  }, now));
}

/** 出战时用的系数：组织还在本机就按现在的据点等级算，不在了（退出 / 解散）就用借的时候记下的 */
export function borrowMultNow(orgId: string, fallback: number): number {
  const v = useCloudSocialStore.getState().orgs.find(x => x.org.id === orgId);
  return v?.ledger ? orgLevelOfView(v).mult : fallback;
}
