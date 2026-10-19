import type { BattleState } from '@/types';
import { equipItem, equipmentBonuses } from '@/umbra/engine/equipment';
import { useInventoryItem } from '@/umbra/engine/inventory';

export const UMBRA_SCHEMA_VERSION = 3;
export const UMBRA_PROFILE_ID = 'current' as const;
export const UMBRA_LEGACY_ARCHIVE_ID = 'legacy-battle-current' as const;

export interface UmbraProfile {
  id: typeof UMBRA_PROFILE_ID;
  schemaVersion: typeof UMBRA_SCHEMA_VERSION;
  createdAt: Date;
  updatedAt: Date;
  economy: {
    sp: number;
    totalSpEarned: number;
    money: number;
  };
  social: {
    orgRaidRewards: string[];
  };
  combat: UmbraCombatState;
  migration: {
    source: 'legacy-battle' | 'fresh';
    capturedAt: Date;
    discardedLegacyProgress: true;
  };
  legacySummary: {
    status?: BattleState['status'];
    shadowsDefeated?: number;
    lastBattleDate?: string;
    maxStratumLevel?: number;
  };
}

export interface UmbraCombatState {
  activePersonaId: string;
  heroPersonaIds: string[];
  allyPersonaIds: string[];
  hp: number;
  maxHp: number;
  sp: number;
  maxSp: number;
  equipment: {
    weapon: string | null;
    armor: string | null;
    accessory: string | null;
  };
  equipmentLevels: Record<string, number>;
  ownedEquipment: string[];
  battleItems: Record<string, number>;
  materials: Record<string, number>;
  equipmentBonuses: {
    attack: number;
    defense: number;
    hp: number;
    sp: number;
  };
}

export interface UmbraRunRecord {
  id: string;
  schemaVersion: typeof UMBRA_SCHEMA_VERSION;
  active: boolean;
  updatedAt: Date;
  payload: Record<string, unknown>;
}

export interface UmbraLegacyArchive {
  id: typeof UMBRA_LEGACY_ARCHIVE_ID;
  source: 'battleState';
  capturedAt: Date;
  payload: BattleState;
}

export interface UmbraMigrationPlan {
  profile: UmbraProfile;
  archive: UmbraLegacyArchive;
}

const finiteInt = (value: unknown, fallback = 0): number => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.round(number)) : fallback;
};

const uniqueStrings = (value: unknown, limit = 100): string[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item !== 'string') continue;
    const clean = item.trim();
    if (clean) seen.add(clean);
  }
  return [...seen].slice(-limit);
};

const cloneBattleState = (state: BattleState): BattleState => (
  typeof structuredClone === 'function'
    ? structuredClone(state)
    : JSON.parse(JSON.stringify(state)) as BattleState
);

export function createDefaultUmbraCombat(): UmbraCombatState {
  return {
    activePersonaId: 'arsene',
    heroPersonaIds: ['arsene', 'pixie', 'jack-o-lantern', 'angel'],
    allyPersonaIds: ['silky', 'cait-sith', 'kelpie'],
    hp: 52,
    maxHp: 52,
    sp: 34,
    maxSp: 34,
    equipment: {
      weapon: 'training-blade',
      armor: 'school-jacket',
      accessory: 'old-watch',
    },
    equipmentLevels: {},
    ownedEquipment: ['training-blade', 'school-jacket', 'old-watch'],
    battleItems: { painkiller: 1, sportsDrink: 1 },
    materials: {},
    equipmentBonuses: { attack: 2, defense: 2, hp: 4, sp: 6 },
  };
}

export function normalizeUmbraProfile(profile: UmbraProfile): UmbraProfile {
  if (
    profile.schemaVersion === UMBRA_SCHEMA_VERSION
    && profile.combat
    && profile.combat.equipment
    && Array.isArray(profile.combat.ownedEquipment)
    && profile.combat.battleItems
  ) return profile;
  const defaults = createDefaultUmbraCombat();
  return {
    ...profile,
    schemaVersion: UMBRA_SCHEMA_VERSION,
    economy: {
      ...profile.economy,
      money: finiteInt(profile.economy?.money, 1000),
    },
    combat: {
      ...defaults,
      ...profile.combat,
      equipment: { ...defaults.equipment, ...profile.combat?.equipment },
      equipmentLevels: { ...defaults.equipmentLevels, ...profile.combat?.equipmentLevels },
      ownedEquipment: Array.isArray(profile.combat?.ownedEquipment)
        ? [...new Set(profile.combat.ownedEquipment)]
        : defaults.ownedEquipment,
      battleItems: { ...defaults.battleItems, ...profile.combat?.battleItems },
      materials: { ...defaults.materials, ...profile.combat?.materials },
      equipmentBonuses: { ...defaults.equipmentBonuses, ...profile.combat?.equipmentBonuses },
    },
    updatedAt: new Date(),
  };
}

export function setUmbraActivePersona(profile: UmbraProfile, personaId: string): UmbraProfile {
  if (!profile.combat.heroPersonaIds.includes(personaId)) return profile;
  if (profile.combat.activePersonaId === personaId) return profile;
  return {
    ...profile,
    updatedAt: new Date(),
    combat: { ...profile.combat, activePersonaId: personaId },
  };
}

export function refreshUmbraEquipmentBonuses(profile: UmbraProfile): UmbraProfile {
  return {
    ...profile,
    updatedAt: new Date(),
    combat: {
      ...profile.combat,
      equipmentBonuses: equipmentBonuses(profile.combat.equipment, profile.combat.equipmentLevels),
    },
  };
}

export function equipUmbraItem(profile: UmbraProfile, itemId: string): UmbraProfile {
  const result = equipItem(profile.combat.equipment, profile.combat.ownedEquipment, itemId);
  if (!result.ok) return profile;
  return refreshUmbraEquipmentBonuses({
    ...profile,
    combat: {
      ...profile.combat,
      equipment: result.equipment,
    },
  });
}

export function useUmbraItem(profile: UmbraProfile, itemId: string): {
  profile: UmbraProfile;
  result: { ok: boolean; reason?: string; label?: string; amount?: number };
} {
  const inventory = {
    hp: profile.combat.hp,
    heroMaxHp: profile.combat.maxHp,
    sp: profile.combat.sp,
    heroMaxSp: profile.combat.maxSp,
    battleItems: { ...profile.combat.battleItems },
    materials: { ...profile.combat.materials },
    equipment: { ...profile.combat.equipment },
    equipmentLevels: { ...profile.combat.equipmentLevels },
    ownedEquipment: [...profile.combat.ownedEquipment],
  };
  const result = useInventoryItem(inventory, itemId);
  if (!result.ok) return { profile, result };
  return {
    profile: {
      ...profile,
      updatedAt: new Date(),
      combat: {
        ...profile.combat,
        hp: inventory.hp,
        sp: inventory.sp,
        battleItems: inventory.battleItems,
      },
    },
    result,
  };
}

/**
 * 旧战场只贡献永久资源与领奖去重，不把当前楼层、战斗临时状态或塔结构带进新系统。
 * 原始 battleState 完整留在归档表，迁移失败或数据核对时可以回看。
 */
export function planLegacyUmbraMigration(
  legacy: BattleState | null,
  now = new Date(),
): UmbraMigrationPlan | null {
  if (!legacy) return null;
  const sp = finiteInt(legacy.sp);
  const totalSpEarned = Math.max(sp, finiteInt(legacy.totalSpEarned, sp));
  const capturedAt = new Date(now);
  return {
    profile: {
      id: UMBRA_PROFILE_ID,
      schemaVersion: UMBRA_SCHEMA_VERSION,
      createdAt: capturedAt,
      updatedAt: capturedAt,
      economy: { sp, totalSpEarned, money: 1000 },
      social: {
        orgRaidRewards: uniqueStrings(legacy.orgRaidRewards),
      },
      combat: createDefaultUmbraCombat(),
      migration: {
        source: 'legacy-battle',
        capturedAt,
        discardedLegacyProgress: true,
      },
      legacySummary: {
        status: legacy.status,
        shadowsDefeated: finiteInt(legacy.shadowsDefeated),
        lastBattleDate: typeof legacy.lastBattleDate === 'string' ? legacy.lastBattleDate : undefined,
        maxStratumLevel: finiteInt(legacy.maxStratumLevel),
      },
    },
    archive: {
      id: UMBRA_LEGACY_ARCHIVE_ID,
      source: 'battleState',
      capturedAt,
      payload: cloneBattleState(legacy),
    },
  };
}

export function createFreshUmbraProfile(now = new Date()): UmbraProfile {
  const createdAt = new Date(now);
  return {
    id: UMBRA_PROFILE_ID,
    schemaVersion: UMBRA_SCHEMA_VERSION,
    createdAt,
    updatedAt: createdAt,
    economy: { sp: 0, totalSpEarned: 0, money: 1000 },
    social: { orgRaidRewards: [] },
    combat: createDefaultUmbraCombat(),
    migration: {
      source: 'fresh',
      capturedAt: createdAt,
      discardedLegacyProgress: true,
    },
    legacySummary: {},
  };
}
