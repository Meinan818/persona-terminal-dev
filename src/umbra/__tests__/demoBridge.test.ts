import { describe, expect, it } from 'vitest';
import {
  DEMO_STORAGE_KEYS,
  demoProfileSeed,
  demoRunSeed,
  mergeDemoP5rState,
  mergeDemoRunState,
  mergeDemoSliceState,
  readDemoLocalState,
  seedDemoStorage,
} from '@/umbra/demoBridge';
import { createUmbraRunRecord } from '@/umbra/runtime';
import { createFreshUmbraProfile, normalizeUmbraProfile } from '@/umbra/state';

const now = new Date('2026-10-20T14:00:00.000Z');

const createStorage = (initial: Record<string, string> = {}) => {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
    clear: () => values.clear(),
    key: (index: number) => [...values.keys()][index] ?? null,
    get length() { return values.size; },
  } as Storage;
};

describe('UMBRA Demo storage bridge', () => {
  it('正式 profile 可以生成 Demo 首次载入所需的初始档', () => {
    const profile = createFreshUmbraProfile(now);
    const seed = demoProfileSeed(profile);
    expect(seed.money).toBe(profile.economy.money);
    expect(seed.activePersonaId).toBe(profile.combat.activePersonaId);
    expect(seed.personaRoster).toEqual(profile.combat.heroPersonaIds);
    expect(seed.ownedEquipment).toEqual(profile.combat.ownedEquipment);
  });

  it('Demo 永久状态会合并金币、Persona、装备、背包与素材', () => {
    const profile = createFreshUmbraProfile(now);
    const raw = {
      activePersonaId: 'pixie',
      allyPersonaIds: ['silky', 'cait-sith', 'kelpie'],
      personaRoster: ['arsene', 'pixie', 'angel'],
      battleItems: { painkiller: 3, sportsDrink: 2 },
      materials: { emberShard: 4 },
      money: 7777,
      equipment: { weapon: 'black-fang', armor: 'school-jacket', accessory: 'old-watch' },
      ownedEquipment: ['training-blade', 'school-jacket', 'black-fang', 'bad-id'],
      equipmentLevels: { 'black-fang': 2, 'bad-id': 5 },
    };
    const merged = mergeDemoP5rState(profile, raw, now);
    expect(merged.economy.money).toBe(7777);
    expect(merged.combat.activePersonaId).toBe('pixie');
    expect(merged.combat.battleItems.painkiller).toBe(3);
    expect(merged.combat.materials.emberShard).toBe(4);
    expect(merged.combat.equipment.weapon).toBe('black-fang');
    expect(merged.combat.ownedEquipment).not.toContain('bad-id');
    expect(merged.combat.equipmentLevels['black-fang']).toBe(2);
    expect(merged.combat.equipmentBonuses.attack).toBeGreaterThan(profile.combat.equipmentBonuses.attack);
    expect(merged.demo?.p5r).toEqual(raw);
    expect(merged.demo?.p5r).not.toBe(raw);
  });

  it('非法 Demo 字段不会污染正式数量或使出战 Persona 越界', () => {
    const profile = createFreshUmbraProfile(now);
    const merged = mergeDemoP5rState(profile, {
      activePersonaId: 'not-owned',
      personaRoster: ['pixie', null, '  '],
      battleItems: { painkiller: -3, sportsDrink: Number.NaN },
      materials: { emberShard: -1 },
      money: -50,
      equipment: { weapon: 'missing-item', armor: 'school-jacket', accessory: 'old-watch' },
      ownedEquipment: ['training-blade', 'missing-item'],
    }, now);
    expect(merged.combat.activePersonaId).toBe(profile.combat.activePersonaId);
    expect(merged.combat.battleItems).toEqual({});
    expect(merged.combat.materials).toEqual({});
    expect(merged.economy.money).toBe(0);
    expect(merged.combat.equipment.weapon).toBeNull();
    expect(merged.combat.ownedEquipment).toEqual(['training-blade']);
  });

  it('Demo 塔行程与 AI LAB 切片会分别进入正式 run 和 profile 原档', () => {
    const profile = createFreshUmbraProfile(now);
    const slice = { record: { day: '2026-10-20' }, run: { active: true }, history: [] };
    const withSlice = mergeDemoSliceState(profile, slice, now);
    expect(withSlice.demo?.slice).toEqual(slice);

    const existing = createUmbraRunRecord('current', { formalMap: { floor: 2 } }, now);
    const run = mergeDemoRunState(existing, { journey: { active: true, floor: 3 } }, now);
    expect(run.payload.formalMap).toEqual({ floor: 2 });
    expect(run.payload.source).toBe('demo');
    expect(demoRunSeed(run)).toEqual({ journey: { active: true, floor: 3 } });
  });

  it('有正式 Demo 存档时覆盖旧本地键，没有时保留已有本地进度', () => {
    const empty = createFreshUmbraProfile(now);
    const localOnly = createStorage({
      [DEMO_STORAGE_KEYS.p5r]: JSON.stringify({ money: 321 }),
    });
    seedDemoStorage(localOnly, empty, null);
    expect(JSON.parse(localOnly.getItem(DEMO_STORAGE_KEYS.p5r) ?? '{}')).toEqual({ money: 321 });

    const archived = {
      ...empty,
      demo: { p5r: { money: 654 }, updatedAt: now.toISOString() },
    };
    seedDemoStorage(localOnly, archived, null);
    expect(JSON.parse(localOnly.getItem(DEMO_STORAGE_KEYS.p5r) ?? '{}')).toEqual({ money: 654 });
  });

  it('损坏 JSON 会被拒绝读取，不抛异常', () => {
    const storage = createStorage({
      [DEMO_STORAGE_KEYS.p5r]: '{bad',
      [DEMO_STORAGE_KEYS.run]: '[]',
    });
    expect(readDemoLocalState(storage)).toEqual({ p5r: null, run: null, slice: null });
  });

  it('天鹅绒图鉴与 Persona 覆盖保存在正式原档并可重新写入 Demo', () => {
    const profile = createFreshUmbraProfile(now);
    const raw = {
      money: 200,
      compendium: {
        entries: [{
          id: 'arsene',
          name: '亚森',
          level: 2,
          stats: { hp: 52, sp: 34, attack: 14, defense: 6 },
          skills: ['eiha'],
        }],
      },
      personaOverrides: {
        arsene: {
          level: 2,
          stats: { hp: 52, sp: 34, attack: 14, defense: 6 },
        },
      },
    };

    const merged = mergeDemoP5rState(profile, raw, now);
    expect(merged.demo?.p5r).toEqual(raw);
    expect(normalizeUmbraProfile(merged).demo?.p5r).toEqual(raw);

    const storage = createStorage();
    expect(seedDemoStorage(storage, merged, null).p5r).toBe('profile');
    expect(JSON.parse(storage.getItem(DEMO_STORAGE_KEYS.p5r) ?? '{}')).toEqual(raw);
  });

  it('同调面具在正式资料与 Demo 原档之间双向保持', () => {
    const profile = createFreshUmbraProfile(now);
    const borrowedMask = {
      weekKey: '2026-10-19',
      battles: 2,
      mask: {
        orgId: 'org-a',
        orgName: '观测站',
        ownerId: 'friend-a',
        ownerCodename: '旅人',
        persona: {
          name: '旅人之面',
          attribute: 'knowledge',
          level: 12,
          skills: [{ name: '星尘', type: 'damage', power: 24, level: 2 }],
        },
        mult: 1.2,
        at: '2026-10-20T14:00:00.000Z',
      },
    };
    const merged = mergeDemoP5rState(profile, {
      money: 1000,
      borrowedMask,
    }, now);
    expect(merged.online?.borrow).toEqual(borrowedMask);

    const storage = createStorage();
    seedDemoStorage(storage, merged, null);
    expect(JSON.parse(storage.getItem(DEMO_STORAGE_KEYS.p5r) ?? '{}').borrowedMask).toEqual(borrowedMask);

    const cleared = mergeDemoP5rState(merged, {
      money: 1000,
      borrowedMask: null,
    }, now);
    expect(cleared.online).toBeUndefined();
  });
});
