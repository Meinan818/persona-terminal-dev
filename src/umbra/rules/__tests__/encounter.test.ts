import { describe, expect, it } from 'vitest';
import {
  encounterPersonaIds,
  generateEncounter,
} from '@/umbra/rules/encounter';

describe('UMBRA encounter', () => {
  it('生成 1–5 只敌人', () => {
    const enemies = generateEncounter({ kind: 'mob', floor: 8, rng: () => 0.2 });
    expect(enemies.length).toBeGreaterThanOrEqual(1);
    expect(enemies.length).toBeLessThanOrEqual(4);
  });

  it('从遭遇提取唯一预载 Persona id', () => {
    const enemies = generateEncounter({ kind: 'boss', floor: 8, rng: () => 0.4 });
    const ids = encounterPersonaIds(enemies);
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
