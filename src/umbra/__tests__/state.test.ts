import { describe, expect, it } from 'vitest';
import type { BattleState } from '@/types';
import {
  UMBRA_LEGACY_ARCHIVE_ID,
  UMBRA_PROFILE_ID,
  UMBRA_SCHEMA_VERSION,
  planLegacyUmbraMigration,
} from '@/umbra/state';

const now = new Date('2026-10-19T12:00:00.000Z');

function legacyState(patch: Partial<BattleState> = {}): BattleState {
  return {
    id: 'current',
    playerHp: 17,
    playerMaxHp: 84,
    sp: 41,
    totalSpEarned: 230,
    status: 'in_battle',
    shadowsDefeated: 12,
    lastBattleDate: '2026-10-18',
    maxStratumLevel: 3,
    orgRaidRewards: ['raid-a', 'raid-a', 'raid-b'],
    ...patch,
  };
}

describe('legacy UMBRA migration plan', () => {
  it('保留永久 SP、组织领奖记录和旧档摘要', () => {
    const plan = planLegacyUmbraMigration(legacyState(), now);
    expect(plan?.profile.id).toBe(UMBRA_PROFILE_ID);
    expect(plan?.profile.schemaVersion).toBe(UMBRA_SCHEMA_VERSION);
    expect(plan?.profile.economy).toEqual({ sp: 41, totalSpEarned: 230 });
    expect(plan?.profile.social.orgRaidRewards).toEqual(['raid-a', 'raid-b']);
    expect(plan?.profile.legacySummary).toEqual({
      status: 'in_battle',
      shadowsDefeated: 12,
      lastBattleDate: '2026-10-18',
      maxStratumLevel: 3,
    });
  });

  it('不把旧楼层、战斗状态或塔结构复制进新资料', () => {
    const plan = planLegacyUmbraMigration(legacyState(), now);
    expect(plan?.profile).not.toHaveProperty('playerHp');
    expect(plan?.profile).not.toHaveProperty('towerSession');
    expect(plan?.profile).not.toHaveProperty('status');
    expect(plan?.profile.migration.discardedLegacyProgress).toBe(true);
  });

  it('原始旧档完整复制到归档，不修改输入对象', () => {
    const legacy = legacyState();
    const plan = planLegacyUmbraMigration(legacy, now);
    expect(plan?.archive.id).toBe(UMBRA_LEGACY_ARCHIVE_ID);
    expect(plan?.archive.payload).toEqual(legacy);
    expect(plan?.archive.payload).not.toBe(legacy);
    expect(legacy.sp).toBe(41);
  });

  it('非法资源和空奖励不会污染新资料', () => {
    const plan = planLegacyUmbraMigration(legacyState({
      sp: Number.NaN,
      totalSpEarned: -10,
      orgRaidRewards: [null, '  ', 'raid-c'] as unknown as string[],
    }), now);
    expect(plan?.profile.economy).toEqual({ sp: 0, totalSpEarned: 0 });
    expect(plan?.profile.social.orgRaidRewards).toEqual(['raid-c']);
  });

  it('没有旧战场时不伪造迁移资料', () => {
    expect(planLegacyUmbraMigration(null, now)).toBeNull();
  });
});
