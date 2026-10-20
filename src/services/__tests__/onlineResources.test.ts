import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createFreshUmbraProfile } from '@/umbra/state';
import type { BattleState } from '@/types';

const h = vi.hoisted(() => ({
  state: {
    umbraProfile: null as ReturnType<typeof createFreshUmbraProfile> | null,
    battleState: null as BattleState | null,
    saveUmbraProfile: vi.fn(),
    saveBattleState: vi.fn(),
  },
}));

vi.mock('@/store', () => ({
  useAppStore: {
    getState: () => h.state,
  },
}));

import {
  claimOnlineReward,
  grantOnlineSp,
  hasOnlineReward,
  readOnlineSp,
  spendOnlineSp,
} from '../onlineResources';

const now = new Date('2026-10-20T14:00:00.000Z');

const legacyState = (sp = 0): BattleState => ({
  id: 'current',
  playerHp: 52,
  playerMaxHp: 52,
  sp,
  totalSpEarned: 0,
  status: 'idle',
  shadowsDefeated: 0,
});

describe('在线资源适配器', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.state.umbraProfile = createFreshUmbraProfile(now);
    h.state.battleState = legacyState(99);
    h.state.saveUmbraProfile.mockImplementation(async profile => {
      h.state.umbraProfile = profile;
    });
    h.state.saveBattleState.mockImplementation(async battleState => {
      h.state.battleState = battleState;
    });
  });

  it('存在 UMBRA 时优先读写正式资料，不改旧战场副本', async () => {
    h.state.umbraProfile = {
      ...h.state.umbraProfile!,
      economy: { ...h.state.umbraProfile!.economy, sp: 3 },
    };
    expect(readOnlineSp()).toBe(3);
    await grantOnlineSp(4);
    expect(h.state.umbraProfile?.economy.sp).toBe(7);
    expect(h.state.umbraProfile?.economy.totalSpEarned).toBe(4);
    expect(h.state.battleState?.sp).toBe(99);
    expect(h.state.saveBattleState).not.toHaveBeenCalled();
  });

  it('SP 不足不扣款，足够时只扣可用值', async () => {
    h.state.umbraProfile = {
      ...h.state.umbraProfile!,
      economy: { ...h.state.umbraProfile!.economy, sp: 8, totalSpEarned: 30 },
    };
    expect(await spendOnlineSp(9)).toBe(false);
    expect(h.state.saveUmbraProfile).not.toHaveBeenCalled();
    expect(await spendOnlineSp(5)).toBe(true);
    expect(h.state.umbraProfile?.economy.sp).toBe(3);
    expect(h.state.umbraProfile?.economy.totalSpEarned).toBe(30);
  });

  it('组织奖励幂等发放到 UMBRA，并保留旧战场兜底', async () => {
    expect(await claimOnlineReward('orgOp', 'op-a', 6)).toBe(6);
    expect(h.state.umbraProfile?.economy.sp).toBe(6);
    expect(hasOnlineReward('orgOp', 'op-a')).toBe(true);
    expect(await claimOnlineReward('orgOp', 'op-a', 6)).toBe(0);
    expect(h.state.umbraProfile?.economy.sp).toBe(6);

    h.state.umbraProfile = null;
    h.state.battleState = legacyState(5);
    expect(await claimOnlineReward('orgRaid', 'raid-a', 7)).toBe(7);
    expect(h.state.battleState?.sp).toBe(12);
    expect(h.state.battleState?.orgRaidRewards).toEqual(['raid-a']);
    expect(await claimOnlineReward('orgRaid', 'raid-a', 7)).toBe(0);
  });
});
