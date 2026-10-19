import { equipmentBonuses } from '@/umbra/engine/equipment';
import {
  grantLoot,
  inventoryEntries,
  sellInventoryItem,
  upgradeEquipment,
} from '@/umbra/engine/inventory';
import type { UmbraProfile } from '@/umbra/state';

export interface UmbraLoot {
  money?: number;
  items?: Array<{ id: string; qty?: number }>;
  equipment?: string[];
}

export interface UmbraInventoryMutation {
  profile: UmbraProfile;
  ok: boolean;
  reason?: string;
  lines?: string[];
  text?: string;
  gain?: number;
  level?: number;
  label?: string;
}

const finiteInt = (value: unknown, fallback = 0): number => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.round(number)) : fallback;
};

const copyNumbers = (value: Record<string, number> | undefined): Record<string, number> => (
  Object.fromEntries(
    Object.entries(value ?? {})
      .map(([id, qty]) => [id, finiteInt(qty)] as const)
      .filter(([, qty]) => qty > 0),
  )
);

const inventoryStateOf = (profile: UmbraProfile): Record<string, any> => ({
  money: profile.economy.money,
  hp: profile.combat.hp,
  heroMaxHp: profile.combat.maxHp + profile.combat.equipmentBonuses.hp,
  sp: profile.combat.sp,
  heroMaxSp: profile.combat.maxSp + profile.combat.equipmentBonuses.sp,
  battleItems: copyNumbers(profile.combat.battleItems),
  materials: copyNumbers(profile.combat.materials),
  ownedEquipment: [...new Set(profile.combat.ownedEquipment)],
  equipment: { ...profile.combat.equipment },
  equipmentLevels: copyNumbers(profile.combat.equipmentLevels),
});

const profileWithInventory = (profile: UmbraProfile, state: Record<string, any>): UmbraProfile => ({
  ...profile,
  updatedAt: new Date(),
  economy: {
    ...profile.economy,
    money: finiteInt(state.money),
  },
  combat: {
    ...profile.combat,
    hp: finiteInt(state.hp, profile.combat.hp),
    sp: finiteInt(state.sp, profile.combat.sp),
    battleItems: copyNumbers(state.battleItems),
    materials: copyNumbers(state.materials),
    ownedEquipment: [...new Set(Array.isArray(state.ownedEquipment) ? state.ownedEquipment : [])],
    equipment: { ...profile.combat.equipment, ...state.equipment },
    equipmentLevels: copyNumbers(state.equipmentLevels),
    equipmentBonuses: equipmentBonuses(state.equipment, state.equipmentLevels),
  },
});

export function grantUmbraLoot(profile: UmbraProfile, loot: UmbraLoot = {}): UmbraInventoryMutation {
  const state = inventoryStateOf(profile);
  const granted = grantLoot(state, loot);
  return {
    ok: true,
    profile: profileWithInventory(profile, state),
    lines: granted.lines,
    text: granted.text,
  };
}

export function sellUmbraInventoryItem(
  profile: UmbraProfile,
  itemId: string,
  qty = 1,
): UmbraInventoryMutation {
  const state = inventoryStateOf(profile);
  const sold = sellInventoryItem(state, itemId, qty);
  if (!sold.ok) return { ok: false, reason: sold.reason, profile };
  return {
    ok: true,
    profile: profileWithInventory(profile, state),
    gain: sold.gain,
    label: sold.label,
  };
}

export function upgradeUmbraEquipment(profile: UmbraProfile, itemId: string): UmbraInventoryMutation {
  const state = inventoryStateOf(profile);
  const upgraded = upgradeEquipment(state, itemId);
  if (!upgraded.ok) return { ok: false, reason: upgraded.reason, profile };
  return {
    ok: true,
    profile: profileWithInventory(profile, state),
    level: upgraded.level,
    label: upgraded.label,
  };
}

export function restUmbraProfile(profile: UmbraProfile): UmbraProfile {
  return {
    ...profile,
    updatedAt: new Date(),
    combat: {
      ...profile.combat,
      hp: profile.combat.maxHp,
      sp: profile.combat.maxSp,
    },
  };
}

export function damageUmbraProfile(profile: UmbraProfile, amount: number): UmbraProfile {
  const damage = Math.max(0, Math.round(Number(amount) || 0));
  return {
    ...profile,
    updatedAt: new Date(),
    combat: {
      ...profile.combat,
      hp: Math.max(1, profile.combat.hp - damage),
    },
  };
}

export function addUmbraSp(profile: UmbraProfile, amount: number): UmbraProfile {
  const gained = Math.max(0, Math.round(Number(amount) || 0));
  if (gained === 0) return profile;
  return {
    ...profile,
    updatedAt: new Date(),
    economy: {
      ...profile.economy,
      sp: profile.economy.sp + gained,
      totalSpEarned: profile.economy.totalSpEarned + gained,
    },
  };
}

export function umbraInventoryEntries(profile: UmbraProfile): {
  consumables: any[];
  materials: any[];
  equipment: any[];
} {
  return inventoryEntries(inventoryStateOf(profile));
}
