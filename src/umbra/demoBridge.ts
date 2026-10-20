import { EQUIPMENT, equipmentBonuses } from '@/umbra/engine/equipment';
import { createUmbraRunRecord } from '@/umbra/runtime';
import type { UmbraProfile, UmbraRunRecord } from '@/umbra/state';
import type { BattleState } from '@/types';

const equipmentById = EQUIPMENT as Record<string, any>;

export const DEMO_STORAGE_KEYS = Object.freeze({
  p5r: 'maskaria.p5r.rebuild.v1',
  run: 'maskaria.p5r.run.v1',
  slice: 'maskaria.p5r.slice.v1',
});

export interface DemoLocalState {
  p5r: Record<string, unknown> | null;
  run: Record<string, unknown> | null;
  slice: Record<string, unknown> | null;
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const cloneRecord = (value: Record<string, unknown>): Record<string, unknown> => (
  typeof structuredClone === 'function'
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value)) as Record<string, unknown>
);

const parseRecord = (value: string | null): Record<string, unknown> | null => {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const finiteInt = (value: unknown, fallback = 0): number => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.round(number)) : fallback;
};

const recordOfNumbers = (value: unknown): Record<string, number> | null => {
  if (!isRecord(value)) return null;
  const entries = Object.entries(value)
    .map(([id, count]) => [id, finiteInt(count)] as const)
    .filter(([id, count]) => Boolean(id) && count > 0);
  return Object.fromEntries(entries);
};

const recordOfLevels = (value: unknown): Record<string, number> | null => {
  if (!isRecord(value)) return null;
  const entries = Object.entries(value)
    .filter(([id]) => Boolean(equipmentById[id]))
    .map(([id, level]) => [id, Math.min(5, finiteInt(level))] as const);
  return Object.fromEntries(entries);
};

const borrowedMaskOf = (value: unknown): NonNullable<BattleState['borrow']> | null => {
  if (!isRecord(value) || typeof value.weekKey !== 'string') return null;
  const battles = finiteInt(value.battles);
  if (!value.mask || !isRecord(value.mask)) return { weekKey: value.weekKey, battles };
  return {
    weekKey: value.weekKey,
    battles,
    mask: cloneRecord(value.mask) as unknown as NonNullable<BattleState['borrow']>['mask'],
  };
};

const stringList = (value: unknown): string[] | null => {
  if (!Array.isArray(value)) return null;
  return [...new Set(value.filter(item => typeof item === 'string').map(item => item.trim()).filter(Boolean))];
};

const ownedEquipment = (value: unknown): string[] | null => {
  const ids = stringList(value);
  return ids ? ids.filter(id => Boolean(equipmentById[id])) : null;
};

const equippedSlots = (value: unknown): UmbraProfile['combat']['equipment'] | null => {
  if (!isRecord(value)) return null;
  const slot = (id: unknown): string | null => (
    typeof id === 'string' && equipmentById[id] ? id : null
  );
  return {
    weapon: slot(value.weapon),
    armor: slot(value.armor),
    accessory: slot(value.accessory),
  };
};

export function demoProfileSeed(profile: UmbraProfile): Record<string, unknown> {
  return {
    activePersonaId: profile.combat.activePersonaId,
    allyPersonaIds: [...profile.combat.allyPersonaIds],
    personaRoster: [...profile.combat.heroPersonaIds],
    battleItems: { ...profile.combat.battleItems },
    money: profile.economy.money,
    materials: { ...profile.combat.materials },
    equipment: { ...profile.combat.equipment },
    ownedEquipment: [...profile.combat.ownedEquipment],
    equipmentLevels: { ...profile.combat.equipmentLevels },
    borrowedMask: profile.online?.borrow ?? null,
  };
}

export function readDemoLocalState(storage: Pick<Storage, 'getItem'>): DemoLocalState {
  return {
    p5r: parseRecord(storage.getItem(DEMO_STORAGE_KEYS.p5r)),
    run: parseRecord(storage.getItem(DEMO_STORAGE_KEYS.run)),
    slice: parseRecord(storage.getItem(DEMO_STORAGE_KEYS.slice)),
  };
}

export function mergeDemoP5rState(
  profile: UmbraProfile,
  raw: Record<string, unknown>,
  now = new Date(),
): UmbraProfile {
  const snapshot = cloneRecord(raw);
  const roster = stringList(snapshot.personaRoster);
  const allies = stringList(snapshot.allyPersonaIds);
  const activePersonaId = typeof snapshot.activePersonaId === 'string'
    ? snapshot.activePersonaId.trim()
    : '';
  const equipment = equippedSlots(snapshot.equipment);
  const owned = ownedEquipment(snapshot.ownedEquipment);
  const levels = recordOfLevels(snapshot.equipmentLevels);
  const battleItems = recordOfNumbers(snapshot.battleItems);
  const materials = recordOfNumbers(snapshot.materials);
  const hasBorrowedMask = Object.prototype.hasOwnProperty.call(snapshot, 'borrowedMask');
  const borrowedMask = borrowedMaskOf(snapshot.borrowedMask);
  const nextEquipment = equipment ?? profile.combat.equipment;
  const nextLevels = levels ?? profile.combat.equipmentLevels;
  const nextRoster = roster?.length ? roster : profile.combat.heroPersonaIds;
  const nextActive = activePersonaId && (
    nextRoster.includes(activePersonaId)
    || profile.combat.heroPersonaIds.includes(activePersonaId)
  )
    ? activePersonaId
    : profile.combat.activePersonaId;

  return {
    ...profile,
    updatedAt: new Date(now),
    economy: {
      ...profile.economy,
      money: Number.isFinite(Number(snapshot.money))
        ? finiteInt(snapshot.money)
        : profile.economy.money,
    },
    combat: {
      ...profile.combat,
      activePersonaId: nextActive,
      heroPersonaIds: [...new Set([...nextRoster, nextActive])],
      allyPersonaIds: allies?.length === 3 ? allies : profile.combat.allyPersonaIds,
      battleItems: battleItems ?? profile.combat.battleItems,
      materials: materials ?? profile.combat.materials,
      equipment: nextEquipment,
      equipmentLevels: nextLevels,
      ownedEquipment: owned ?? profile.combat.ownedEquipment,
      equipmentBonuses: equipmentBonuses(nextEquipment, nextLevels),
    },
    demo: {
      ...profile.demo,
      p5r: snapshot,
      updatedAt: new Date(now).toISOString(),
    },
    online: hasBorrowedMask
      ? (borrowedMask ? { ...profile.online, borrow: borrowedMask } : undefined)
      : profile.online,
  };
}

export function mergeDemoSliceState(
  profile: UmbraProfile,
  raw: Record<string, unknown>,
  now = new Date(),
): UmbraProfile {
  return {
    ...profile,
    updatedAt: new Date(now),
    demo: {
      ...profile.demo,
      slice: cloneRecord(raw),
      updatedAt: new Date(now).toISOString(),
    },
  };
}

export function mergeDemoRunState(
  current: UmbraRunRecord | null,
  raw: Record<string, unknown>,
  now = new Date(),
): UmbraRunRecord {
  return createUmbraRunRecord(
    current?.id ?? 'current',
    {
      ...(current?.payload ?? {}),
      source: 'demo',
      demoRun: cloneRecord(raw),
    },
    now,
  );
}

export function seedDemoStorage(
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  profile: UmbraProfile,
  run: UmbraRunRecord | null,
): { p5r: 'profile' | 'local' | 'derived'; run: 'profile' | 'local'; slice: 'profile' | 'local' } {
  let p5r: 'profile' | 'local' | 'derived';
  if (profile.demo?.p5r) {
    storage.setItem(DEMO_STORAGE_KEYS.p5r, JSON.stringify(profile.demo.p5r));
    p5r = 'profile';
  } else if (!storage.getItem(DEMO_STORAGE_KEYS.p5r)) {
    storage.setItem(DEMO_STORAGE_KEYS.p5r, JSON.stringify(demoProfileSeed(profile)));
    p5r = 'derived';
  } else {
    p5r = 'local';
  }

  const demoRun = run?.payload?.demoRun;
  if (isRecord(demoRun)) {
    storage.setItem(DEMO_STORAGE_KEYS.run, JSON.stringify(demoRun));
  }

  if (profile.demo?.slice) {
    storage.setItem(DEMO_STORAGE_KEYS.slice, JSON.stringify(profile.demo.slice));
  }

  return {
    p5r,
    run: isRecord(demoRun) ? 'profile' : 'local',
    slice: profile.demo?.slice ? 'profile' : 'local',
  };
}

export function parseStorageRecord(value: string | null): Record<string, unknown> | null {
  return parseRecord(value);
}

export function demoRunSeed(run: UmbraRunRecord | null): Record<string, unknown> | null {
  const value = run?.payload?.demoRun;
  return isRecord(value) ? value : null;
}

export function isDemoStorageKey(key: string | null): boolean {
  return key === DEMO_STORAGE_KEYS.p5r
    || key === DEMO_STORAGE_KEYS.run
    || key === DEMO_STORAGE_KEYS.slice;
}
