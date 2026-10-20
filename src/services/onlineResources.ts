import { useAppStore } from '@/store';
import {
  grantUmbraOnlineSp,
  hasUmbraOnlineReward,
  recordUmbraOnlineReward,
  spendUmbraOnlineSp,
  type UmbraOnlineRewardKind,
} from '@/umbra/online';

const finiteInt = (value: unknown, fallback = 0): number => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.round(number)) : fallback;
};

export const hasOnlineResources = (): boolean => {
  const state = useAppStore.getState();
  return Boolean(state.umbraProfile || state.battleState);
};

export const readOnlineSp = (): number => {
  const state = useAppStore.getState();
  return state.umbraProfile?.economy.sp ?? state.battleState?.sp ?? 0;
};

export async function grantOnlineSp(amount: number): Promise<number> {
  const gained = finiteInt(amount);
  if (gained === 0) return 0;
  const state = useAppStore.getState();
  if (state.umbraProfile) {
    await state.saveUmbraProfile(grantUmbraOnlineSp(state.umbraProfile, gained));
    return gained;
  }
  if (state.battleState) {
    await state.saveBattleState({
      ...state.battleState,
      sp: state.battleState.sp + gained,
      totalSpEarned: state.battleState.totalSpEarned + gained,
    });
    return gained;
  }
  return 0;
}

export async function spendOnlineSp(amount: number): Promise<boolean> {
  const cost = finiteInt(amount);
  if (cost === 0) return true;
  const state = useAppStore.getState();
  if (state.umbraProfile) {
    const result = spendUmbraOnlineSp(state.umbraProfile, cost);
    if (!result.ok) return false;
    await state.saveUmbraProfile(result.profile);
    return true;
  }
  if (state.battleState) {
    if (state.battleState.sp < cost) return false;
    await state.saveBattleState({
      ...state.battleState,
      sp: state.battleState.sp - cost,
    });
    return true;
  }
  return false;
}

export function hasOnlineReward(kind: UmbraOnlineRewardKind, id: string): boolean {
  const state = useAppStore.getState();
  if (state.umbraProfile) return hasUmbraOnlineReward(state.umbraProfile, kind, id);
  const ids = kind === 'orgOp'
    ? state.battleState?.orgOpRewards
    : state.battleState?.orgRaidRewards;
  return Array.isArray(ids) && ids.includes(id.trim());
}

export async function claimOnlineReward(
  kind: UmbraOnlineRewardKind,
  id: string,
  amount: number,
): Promise<number> {
  const reward = finiteInt(amount);
  const state = useAppStore.getState();
  if (state.umbraProfile) {
    const recorded = recordUmbraOnlineReward(state.umbraProfile, kind, id);
    if (!recorded.first) return 0;
    const next = reward > 0 ? grantUmbraOnlineSp(recorded.profile, reward) : recorded.profile;
    await state.saveUmbraProfile(next);
    return reward;
  }
  const battleState = state.battleState;
  if (!battleState) return 0;
  const ids = kind === 'orgOp' ? battleState.orgOpRewards : battleState.orgRaidRewards;
  if (Array.isArray(ids) && ids.includes(id.trim())) return 0;
  const clean = id.trim();
  if (!clean) return 0;
  await state.saveBattleState({
    ...battleState,
    sp: battleState.sp + reward,
    totalSpEarned: battleState.totalSpEarned + reward,
    ...(kind === 'orgOp'
      ? { orgOpRewards: [...(battleState.orgOpRewards ?? []), clean].slice(-200) }
      : { orgRaidRewards: [...(battleState.orgRaidRewards ?? []), clean].slice(-100) }),
  });
  return reward;
}
