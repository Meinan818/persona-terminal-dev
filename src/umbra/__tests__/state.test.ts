import { describe, expect, it } from 'vitest';
import type { BattleState } from '@/types';
import {
  UMBRA_LEGACY_ARCHIVE_ID,
  UMBRA_PROFILE_ID,
  UMBRA_SCHEMA_VERSION,
  createFreshUmbraProfile,
  equipUmbraItem,
  planLegacyUmbraMigration,
  setUmbraActivePersona,
  useUmbraItem,
} from '@/umbra/state';
import { createUmbraRunRecord, isUmbraRunCompatible } from '@/umbra/runtime';
import { createRuntimePayload, restoreExploration } from '@/umbra/run';
import { buyUmbraShopItem } from '@/umbra/shop';

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
    expect(plan?.profile.economy).toEqual({ sp: 41, totalSpEarned: 230, money: 1000 });
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
    expect(plan?.profile.economy).toEqual({ sp: 0, totalSpEarned: 0, money: 1000 });
    expect(plan?.profile.social.orgRaidRewards).toEqual(['raid-c']);
  });

  it('没有旧战场时不伪造迁移资料', () => {
    expect(planLegacyUmbraMigration(null, now)).toBeNull();
  });

  it('新玩家生成干净的 UMBRA 永久资料', () => {
    const profile = createFreshUmbraProfile(now);
    expect(profile.economy).toEqual({ sp: 0, totalSpEarned: 0, money: 1000 });
    expect(profile.social.orgRaidRewards).toEqual([]);
    expect(profile.combat.activePersonaId).toBe('arsene');
    expect(profile.combat.hp).toBe(52);
    expect(profile.migration.source).toBe('fresh');
  });

  it('只能切换正式名录内的出战 Persona', () => {
    const profile = createFreshUmbraProfile(now);
    const switched = setUmbraActivePersona(profile, 'pixie');
    expect(switched.combat.activePersonaId).toBe('pixie');
    expect(setUmbraActivePersona(profile, 'not-in-roster')).toBe(profile);
  });

  it('拥有装备后才能装上，并重算战斗加成', () => {
    const profile = createFreshUmbraProfile(now);
    expect(equipUmbraItem(profile, 'black-fang')).toBe(profile);
    const owned = {
      ...profile,
      combat: {
        ...profile.combat,
        ownedEquipment: [...profile.combat.ownedEquipment, 'black-fang'],
      },
    };
    const equipped = equipUmbraItem(owned, 'black-fang');
    expect(equipped.combat.equipment.weapon).toBe('black-fang');
    expect(equipped.combat.equipmentBonuses.attack).toBeGreaterThan(profile.combat.equipmentBonuses.attack);
  });

  it('战斗消耗品会回复资源并扣除背包数量', () => {
    const profile = createFreshUmbraProfile(now);
    const injured = {
      ...profile,
      combat: { ...profile.combat, hp: 10 },
    };
    const used = useUmbraItem(injured, 'painkiller');
    expect(used.result.ok).toBe(true);
    expect(used.profile.combat.hp).toBeGreaterThan(10);
    expect(used.profile.combat.battleItems.painkiller ?? 0).toBe(0);
  });

  it('商店购买会扣钱并写入装备或补给', () => {
    const profile = createFreshUmbraProfile(now);
    const nourished = {
      ...profile,
      economy: { ...profile.economy, money: 5000 },
    };
    const bought = buyUmbraShopItem(nourished, 'arms', 'iron-knife');
    expect(bought.ok).toBe(true);
    expect(bought.profile.economy.money).toBe(3200);
    expect(bought.profile.combat.ownedEquipment).toContain('iron-knife');
    const duplicate = buyUmbraShopItem(bought.profile, 'arms', 'iron-knife');
    expect(duplicate.ok).toBe(false);
    expect(duplicate.profile.economy.money).toBe(3200);
    expect(duplicate.profile.combat.ownedEquipment.filter(id => id === 'iron-knife')).toHaveLength(1);
  });
});

describe('UMBRA runtime records', () => {
  it('行程记录带版本、时间并复制 payload', () => {
    const payload = { floor: 1, nested: { hp: 52 } };
    const run = createUmbraRunRecord('run-a', payload, now);
    expect(run).toEqual({
      id: 'run-a',
      schemaVersion: UMBRA_SCHEMA_VERSION,
      active: true,
      updatedAt: now,
      payload,
    });
    expect(run.payload).not.toBe(payload);
    expect(isUmbraRunCompatible(run)).toBe(true);
  });

  it('空 id、数组 payload 和旧版本不能进入正式行程', () => {
    expect(() => createUmbraRunRecord('', {})).toThrow();
    expect(() => createUmbraRunRecord('run-a', [] as unknown as Record<string, unknown>)).toThrow();
    expect(isUmbraRunCompatible({
      id: 'run-a',
      schemaVersion: 0 as typeof UMBRA_SCHEMA_VERSION,
      active: true,
      updatedAt: now,
      payload: {},
    })).toBe(false);
  });
});

describe('UMBRA runtime map persistence', () => {
  it('地图与探索状态可序列化后恢复', () => {
    const exploration = {
      map: {
        rooms: { '0,0': { id: '0,0', type: 'start' } },
        start: { x: 0, y: 0 },
        exit: { x: 1, y: 0 },
      },
      player: { x: 0, y: 0 },
      listened: new Set(['0,0']),
      history: [],
      time: 12,
    };
    const payload = createRuntimePayload({ seed: 7, exploration });
    const restored = restoreExploration(payload);
    expect(restored.map).toEqual(exploration.map);
    expect(restored.player).toEqual({ x: 0, y: 0 });
    expect([...restored.listened]).toEqual(['0,0']);
    expect(restored.time).toBe(12);
  });

  it('缺地图的坏 payload 不会被当成可恢复行程', () => {
    expect(restoreExploration(null)).toBeNull();
    expect(restoreExploration({})).toBeNull();
    expect(restoreExploration({ map: {}, exploration: {} })).toBeNull();
  });
});
