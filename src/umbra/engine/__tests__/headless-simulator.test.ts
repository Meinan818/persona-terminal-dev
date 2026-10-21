import { beforeAll, describe, expect, it } from 'vitest';
import {
  mulberry32,
  runHeadlessBattle,
  type HeadlessBattleResult,
} from '@/umbra/engine/headless-simulator';
import {
  compendiumPersonaIds,
  compendiumSkillIds,
} from '@/umbra/engine/compendiumPreload';
import { ensureCompendium } from '@/umbra/engine/p5r-compendium';

const terminal = (result: HeadlessBattleResult) => (
  result.victory || result.defeated
);

beforeAll(async () => {
  await ensureCompendium({
    personas: compendiumPersonaIds(),
    skills: compendiumSkillIds(),
  });
});

describe('UMBRA headless battle simulator', () => {
  it('同一随机种子产生完全一致的战斗轨迹', () => {
    const a = runHeadlessBattle({ seed: 7, policy: 'basic' });
    const b = runHeadlessBattle({ seed: 7, policy: 'basic' });
    expect(a).toEqual(b);
  });

  it('纯普攻策略能在有界回合内结束', () => {
    const result = runHeadlessBattle({
      seed: 11,
      policy: 'basic',
      maxRounds: 80,
    });
    expect(terminal(result)).toBe(true);
    expect(result.actionCount).toBeLessThanOrEqual(120);
    expect(result.phase).toMatch(/victory|defeat|result/);
  });

  it('弱点策略会优先使用克制技能', () => {
    const result = runHeadlessBattle({
      seed: 19,
      policy: 'weakness',
      activePersonaId: 'pixie',
    });
    expect(result.actions).toContain('skill');
    expect(terminal(result)).toBe(true);
  });

  it('PRNG 可复现且输出落在 [0,1)', () => {
    const rng = mulberry32(1234);
    const values = Array.from({ length: 8 }, () => rng());
    expect(values).toEqual([
      0.07329497812315822,
      0.7034119898453355,
      0.9028560190927237,
      0.9705493662040681,
      0.04096397617831826,
      0.11776310740970075,
      0.1617849813774228,
      0.8027570187114179,
    ]);
    expect(values.every(value => value >= 0 && value < 1)).toBe(true);
  });
});
