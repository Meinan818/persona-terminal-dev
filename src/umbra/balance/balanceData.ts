import type { BattlePolicy } from '@/umbra/engine/headless-simulator';
import { generateEncounter, type EncounterKind } from '@/umbra/rules/encounter';

export type BalanceTier = EncounterKind;

export const BALANCE_TIERS: BalanceTier[] = ['mob', 'elite', 'boss'];
export const BALANCE_BOTS: BattlePolicy[] = ['basic', 'weakness', 'advanced'];

export interface BalanceTarget {
  min: number;
  max: number;
}

export const BALANCE_TARGETS: Record<BalanceTier, Record<Exclude<BattlePolicy, 'random'>, BalanceTarget>> = {
  mob: {
    basic: { min: 0, max: 40 },
    weakness: { min: 85, max: 90 },
    advanced: { min: 95, max: 100 },
  },
  elite: {
    basic: { min: 0, max: 10 },
    weakness: { min: 60, max: 70 },
    advanced: { min: 85, max: 90 },
  },
  boss: {
    basic: { min: 0, max: 5 },
    weakness: { min: 40, max: 50 },
    advanced: { min: 75, max: 85 },
  },
};

export const BALANCE_ITERATIONS = 2000;

export interface BalanceTableData {
  floor: number;
  seedBase: number;
  table: Record<BalanceTier, Record<BattlePolicy, number | null>>;
}

export function createBalanceEnemies(
  tier: BalanceTier,
  seed: number,
  floor = 8,
): ReturnType<typeof generateEncounter> {
  let value = seed >>> 0;
  const rng = () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const specs = generateEncounter({
    kind: tier,
    floor,
    alert: tier === 'boss' ? 80 : tier === 'elite' ? 55 : 25,
    rng,
  });
  return specs.map(spec => ({
    ...spec,
    weakness: 'electric',
    resist: spec.resist === 'electric' ? 'curse' : spec.resist,
  }));
}
