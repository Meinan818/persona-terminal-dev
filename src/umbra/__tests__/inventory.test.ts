import { describe, expect, it } from 'vitest';
import {
  damageUmbraProfile,
  grantUmbraLoot,
  restUmbraProfile,
  sellUmbraInventoryItem,
  upgradeUmbraEquipment,
} from '@/umbra/inventory';
import { createFreshUmbraProfile } from '@/umbra/state';

const now = new Date('2026-10-20T12:00:00.000Z');

describe('UMBRA formal inventory bridge', () => {
  it('月匣与战斗掉落会拆进正式消耗品、素材和装备', () => {
    const profile = createFreshUmbraProfile(now);
    const granted = grantUmbraLoot(profile, {
      money: 900,
      items: [
        { id: 'painkiller', qty: 2 },
        { id: 'emberShard', qty: 1 },
      ],
      equipment: ['scout-knife'],
    });
    expect(granted.profile.economy.money).toBe(1900);
    expect(granted.profile.combat.battleItems.painkiller).toBe(3);
    expect(granted.profile.combat.materials.emberShard).toBe(1);
    expect(granted.profile.combat.ownedEquipment).toContain('scout-knife');
    expect(granted.text).toContain('侦察短刀');
  });

  it('装备中的物品不能卖，未装备的物品可以卖出', () => {
    const profile = createFreshUmbraProfile(now);
    const weapons = {
      ...profile,
      combat: {
        ...profile.combat,
        ownedEquipment: [...profile.combat.ownedEquipment, 'scout-knife'],
      },
    };
    expect(sellUmbraInventoryItem(weapons, 'training-blade').ok).toBe(false);
    const sold = sellUmbraInventoryItem(weapons, 'scout-knife');
    expect(sold.ok).toBe(true);
    expect(sold.gain).toBe(480);
    expect(sold.profile.combat.ownedEquipment).not.toContain('scout-knife');
  });

  it('强化会扣除金钱和强化石，并刷新装备中的加成', () => {
    const profile = createFreshUmbraProfile(now);
    const prepared = {
      ...profile,
      economy: { ...profile.economy, money: 5000 },
      combat: {
        ...profile.combat,
        equipment: { ...profile.combat.equipment, weapon: 'black-fang' },
        ownedEquipment: [...profile.combat.ownedEquipment, 'black-fang'],
        materials: { ...profile.combat.materials, enhanceStone: 2 },
      },
    };
    const upgraded = upgradeUmbraEquipment(prepared, 'black-fang');
    expect(upgraded.ok).toBe(true);
    expect(upgraded.level).toBe(1);
    expect(upgraded.profile.economy.money).toBeLessThan(5000);
    expect(upgraded.profile.combat.materials.enhanceStone).toBe(1);
    expect(upgraded.profile.combat.equipmentBonuses.attack).toBeGreaterThan(
      prepared.combat.equipmentBonuses.attack,
    );
  });

  it('安全屋休息与机关伤害会写回正式 HP', () => {
    const profile = createFreshUmbraProfile(now);
    const damaged = damageUmbraProfile(profile, 15);
    expect(damaged.combat.hp).toBe(profile.combat.hp - 15);
    const rested = restUmbraProfile(damaged);
    expect(rested.combat.hp).toBe(rested.combat.maxHp);
    expect(rested.combat.sp).toBe(rested.combat.maxSp);
  });
});
