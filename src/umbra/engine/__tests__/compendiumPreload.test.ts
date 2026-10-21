import { beforeEach, describe, expect, it } from 'vitest';
import {
  compendiumChunkImportCount,
  resetCompendiumForTests,
} from '@/umbra/engine/compendiumPreload';
import {
  ensureCompendium,
  getPersona,
  getSkill,
} from '@/umbra/engine/p5r-compendium';

beforeEach(() => {
  resetCompendiumForTests();
});

describe('UMBRA compendium preload', () => {
  it('未预载就同步读取时开发环境抛错', () => {
    expect(() => getPersona('arsene')).toThrow(/未预载 Persona/);
    expect(() => getSkill('Eiha')).toThrow(/未预载技能/);
  });

  it('同一分片并发预载只 import 一次', async () => {
    await Promise.all([
      ensureCompendium({ personas: ['arsene'], skills: ['Eiha'] }),
      ensureCompendium({ personas: ['arsene'], skills: ['Eiha'] }),
      ensureCompendium({ personas: ['arsene'], skills: ['Eiha'] }),
    ]);
    expect(compendiumChunkImportCount).toBe(2);
    expect(getPersona('arsene').id).toBe('arsene');
    expect(getSkill('Eiha').name).toBe('Eiha');
  });

  it('预载后同步读取可用', async () => {
    await ensureCompendium({ personas: ['pixie'], skills: ['Zio'] });
    expect(getPersona('pixie').id).toBe('pixie');
    expect(getSkill('Zio').name).toBe('Zio');
  });
});
