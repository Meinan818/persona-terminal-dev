import { describe, expect, it } from 'vitest';
import {
  backfillLegacyOnlineRewards,
  grantUmbraOnlineSp,
  hasUmbraOnlineReward,
  recordUmbraOnlineReward,
  spendUmbraOnlineSp,
} from '@/umbra/online';
import { createFreshUmbraProfile } from '@/umbra/state';

const now = new Date('2026-10-20T14:00:00.000Z');

describe('UMBRA 在线资源规则', () => {
  it('在线奖励同时增加可用 SP 与累计收入', () => {
    const profile = createFreshUmbraProfile(now);
    const granted = grantUmbraOnlineSp(profile, 12);
    expect(granted.economy.sp).toBe(12);
    expect(granted.economy.totalSpEarned).toBe(12);
  });

  it('SP 足够时扣费，不足时保持原资料', () => {
    const profile = createFreshUmbraProfile(now);
    const funded = { ...profile, economy: { ...profile.economy, sp: 20 } };
    const spent = spendUmbraOnlineSp(funded, 8);
    expect(spent.ok).toBe(true);
    expect(spent.profile.economy.sp).toBe(12);
    expect(spent.profile.economy.totalSpEarned).toBe(0);

    const rejected = spendUmbraOnlineSp(spent.profile, 99);
    expect(rejected.ok).toBe(false);
    expect(rejected.profile).toBe(spent.profile);
  });

  it('组织作战与团战奖励分别去重', () => {
    const profile = createFreshUmbraProfile(now);
    const op = recordUmbraOnlineReward(profile, 'orgOp', 'op-a');
    expect(op.first).toBe(true);
    expect(hasUmbraOnlineReward(op.profile, 'orgOp', 'op-a')).toBe(true);
    expect(hasUmbraOnlineReward(op.profile, 'orgRaid', 'op-a')).toBe(false);

    const duplicate = recordUmbraOnlineReward(op.profile, 'orgOp', 'op-a');
    expect(duplicate.first).toBe(false);
    expect(duplicate.profile).toBe(op.profile);

    const raid = recordUmbraOnlineReward(op.profile, 'orgRaid', 'raid-a');
    expect(raid.profile.social.orgOpRewards).toEqual(['op-a']);
    expect(raid.profile.social.orgRaidRewards).toEqual(['raid-a']);
  });

  it('旧档回填只并集在线奖励 ID，不恢复旧战斗进度', () => {
    const profile = createFreshUmbraProfile(now);
    const withRaid = {
      ...profile,
      social: { ...profile.social, orgRaidRewards: ['raid-a'] },
    };
    const backfilled = backfillLegacyOnlineRewards(withRaid, {
      orgOpRewards: ['op-a', 'op-a'],
      orgRaidRewards: ['raid-b', 'raid-a'],
    });
    expect(backfilled.changed).toBe(true);
    expect(backfilled.profile.social).toEqual({
      orgOpRewards: ['op-a'],
      orgRaidRewards: ['raid-a', 'raid-b'],
    });
    expect(backfillLegacyOnlineRewards(backfilled.profile, {
      orgOpRewards: ['op-a'],
      orgRaidRewards: ['raid-a', 'raid-b'],
    }).changed).toBe(false);
  });
});
