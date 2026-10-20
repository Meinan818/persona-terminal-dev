import { addUmbraSp } from '@/umbra/inventory';
import type { UmbraProfile } from '@/umbra/state';
import type { BattleState } from '@/types';

export type UmbraOnlineRewardKind = 'orgOp' | 'orgRaid';

export interface UmbraOnlineRewardResult {
  profile: UmbraProfile;
  first: boolean;
}

export interface UmbraOnlineSpendResult {
  profile: UmbraProfile;
  ok: boolean;
  reason?: string;
}

export interface UmbraOnlineRewardBackfill {
  profile: UmbraProfile;
  changed: boolean;
}

const finiteInt = (value: unknown, fallback = 0): number => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.round(number)) : fallback;
};

const rewardIdsOf = (
  profile: UmbraProfile,
  kind: UmbraOnlineRewardKind,
): string[] => (
  kind === 'orgOp'
    ? profile.social?.orgOpRewards ?? []
    : profile.social?.orgRaidRewards ?? []
);

export function hasUmbraOnlineReward(
  profile: UmbraProfile,
  kind: UmbraOnlineRewardKind,
  id: string,
): boolean {
  const clean = id.trim();
  return Boolean(clean) && rewardIdsOf(profile, kind).includes(clean);
}

export function grantUmbraOnlineSp(profile: UmbraProfile, amount: number): UmbraProfile {
  return addUmbraSp(profile, amount);
}

export function spendUmbraOnlineSp(profile: UmbraProfile, amount: number): UmbraOnlineSpendResult {
  const cost = finiteInt(amount);
  if (cost === 0) return { profile, ok: true };
  if (profile.economy.sp < cost) {
    return {
      profile,
      ok: false,
      reason: `SP 不足（需 ${cost}）`,
    };
  }
  return {
    profile: {
      ...profile,
      updatedAt: new Date(),
      economy: {
        ...profile.economy,
        sp: profile.economy.sp - cost,
      },
    },
    ok: true,
  };
}

export function recordUmbraOnlineReward(
  profile: UmbraProfile,
  kind: UmbraOnlineRewardKind,
  id: string,
): UmbraOnlineRewardResult {
  const clean = id.trim();
  if (!clean || hasUmbraOnlineReward(profile, kind, clean)) {
    return { profile, first: false };
  }
  const field = kind === 'orgOp' ? 'orgOpRewards' : 'orgRaidRewards';
  const limit = kind === 'orgOp' ? 200 : 100;
  const nextIds = [...rewardIdsOf(profile, kind), clean].slice(-limit);
  return {
    first: true,
    profile: {
      ...profile,
      updatedAt: new Date(),
      social: {
        orgOpRewards: profile.social?.orgOpRewards ?? [],
        orgRaidRewards: profile.social?.orgRaidRewards ?? [],
        [field]: nextIds,
      },
    },
  };
}

export function backfillLegacyOnlineRewards(
  profile: UmbraProfile,
  legacy: Pick<BattleState, 'orgOpRewards' | 'orgRaidRewards'> | null | undefined,
): UmbraOnlineRewardBackfill {
  if (!legacy) return { profile, changed: false };
  const currentOp = profile.social?.orgOpRewards ?? [];
  const currentRaid = profile.social?.orgRaidRewards ?? [];
  const orgOpRewards = [...new Set([
    ...currentOp,
    ...(Array.isArray(legacy.orgOpRewards) ? legacy.orgOpRewards : []),
  ])].slice(-200);
  const orgRaidRewards = [...new Set([
    ...currentRaid,
    ...(Array.isArray(legacy.orgRaidRewards) ? legacy.orgRaidRewards : []),
  ])].slice(-100);
  if (
    orgOpRewards.length === currentOp.length
    && orgRaidRewards.length === currentRaid.length
    && orgOpRewards.every((id, index) => id === currentOp[index])
    && orgRaidRewards.every((id, index) => id === currentRaid[index])
  ) return { profile, changed: false };
  return {
    changed: true,
    profile: {
      ...profile,
      updatedAt: new Date(),
      social: {
        orgOpRewards,
        orgRaidRewards,
      },
    },
  };
}
