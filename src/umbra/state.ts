import type { BattleState } from '@/types';

export const UMBRA_SCHEMA_VERSION = 2;
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
    equipmentBonuses: { attack: 0, defense: 0, hp: 0, sp: 0 },
  };
}

export function normalizeUmbraProfile(profile: UmbraProfile): UmbraProfile {
  if (profile.schemaVersion === UMBRA_SCHEMA_VERSION && profile.combat) return profile;
  return {
    ...profile,
    schemaVersion: UMBRA_SCHEMA_VERSION,
    combat: profile.combat ?? createDefaultUmbraCombat(),
    updatedAt: new Date(),
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
      economy: { sp, totalSpEarned },
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
    economy: { sp: 0, totalSpEarned: 0 },
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
