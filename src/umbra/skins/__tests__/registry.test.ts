import { beforeEach, describe, expect, it } from 'vitest';
import type { UmbraSkinPack } from '../contract';
import {
  companionPersonaFor,
  registerSkin,
  rosterAllowsPersona,
  unloadSkin,
} from '../registry';

const pack = (): UmbraSkinPack => ({
  id: 'p3-blue',
  manifest: { assets: [] },
  tokens: {},
  recipes: [],
  labels: {},
  enemyLayouts: { 1: [], 2: [], 3: [], 4: [], 5: [] },
  roster: {
    heroPersona: 'orpheus',
    companions: ['yukari'],
    companionPersonas: { yukari: 'io' },
    excludedPersonas: ['izanagi'],
  },
  compendiumArt: { pixie: 'blue-pixie.png' },
});

beforeEach(() => {
  unloadSkin('p3-blue');
});

describe('UMBRA skin roster', () => {
  it('按皮肤 roster 判断面具归属', () => {
    registerSkin('p3-blue', pack());
    expect(rosterAllowsPersona('p3-blue', 'pixie')).toBe(true);
    expect(rosterAllowsPersona('p3-blue', 'izanagi')).toBe(false);
  });

  it('同伴专属面具从 roster 读取', () => {
    registerSkin('p3-blue', pack());
    expect(companionPersonaFor('p3-blue', 'yukari')).toBe('io');
    expect(companionPersonaFor('p3-blue', 'junpei')).toBeNull();
  });
});
