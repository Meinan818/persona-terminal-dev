export type EncounterKind = 'mob' | 'elite' | 'boss';
import { ENEMY_TIER_MULTIPLIERS, PHYS_RESIST_CHANCE } from './combatNumbers';

export interface EncounterEnemySpec {
  id: string;
  name: string;
  maxHp: number;
  attack: number;
  defense: number;
  element: string;
  weakness: string;
  resist: string;
  personality: string;
  recruitPersonaId: string;
  reward: { sp: number; item: string };
}

export interface EncounterOptions {
  kind?: EncounterKind;
  floor?: number;
  alert?: number;
  rng?: () => number;
}

const PERSONA_POOL = ['agathion', 'angel', 'pixie', 'jack-o-lantern', 'silky'];
const ELEMENT_POOL = ['fire', 'ice', 'electric', 'wind', 'psy', 'nuclear', 'bless', 'curse'];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function makeEnemySpec(
  id: string,
  floor: number,
  rng: () => number,
  elite = false,
  boss = false,
): EncounterEnemySpec {
  const element = ELEMENT_POOL[Math.floor(rng() * ELEMENT_POOL.length)];
  const weakness = ELEMENT_POOL[Math.floor(rng() * ELEMENT_POOL.length)];
  const resist = rng() < PHYS_RESIST_CHANCE
    ? 'phys'
    : ELEMENT_POOL[Math.floor(rng() * ELEMENT_POOL.length)];
  const level = clamp(floor + Math.floor(rng() * 3), 1, 99);
  const mult = ENEMY_TIER_MULTIPLIERS[boss ? 'boss' : elite ? 'elite' : 'mob'];
  return {
    id,
    name: boss ? `守门阴影 ${id}` : elite ? `精英阴影 ${id}` : `杂兵阴影 ${id}`,
    maxHp: Math.max(40, Math.round((50 + level * 3) * mult.hp)),
    attack: Math.round((14 + level * 1.5) * mult.attack),
    defense: Math.round((4 + level * 0.6) * mult.defense),
    element,
    weakness,
    resist,
    personality: ['proud', 'cowardly', 'greedy', 'calm'][Math.floor(rng() * 4)],
    recruitPersonaId: PERSONA_POOL[Math.floor(rng() * PERSONA_POOL.length)],
    reward: { sp: 20 + level, item: '阴影碎片' },
  };
}

export function generateEncounter(options: EncounterOptions = {}): EncounterEnemySpec[] {
  const rng = options.rng ?? Math.random;
  const floor = Math.max(1, Math.floor(options.floor ?? 1));
  const alert = clamp(options.alert ?? 0, 0, 100);
  const kind = options.kind ?? 'mob';

  if (kind === 'boss') {
    const summons = alert > 50 ? 2 : alert > 20 ? 1 : 0;
    return [
      makeEnemySpec('boss', floor, rng, false, true),
      ...Array.from({ length: summons }, (_, index) => makeEnemySpec(`summon-${index + 1}`, floor, rng)),
    ];
  }

  if (kind === 'elite') {
    const followers = alert > 60 ? 2 : alert > 30 ? 1 : 0;
    return [
      makeEnemySpec('elite', floor, rng, true),
      ...Array.from({ length: followers }, (_, index) => makeEnemySpec(`follower-${index + 1}`, floor, rng)),
    ];
  }

  const roll = rng();
  const count = roll < 0.12 ? 4 : roll < 0.5 ? 3 : roll < 0.85 ? 2 : 1;
  return Array.from({ length: count }, (_, index) => makeEnemySpec(`mob-${index + 1}`, floor, rng));
}

export function encounterPersonaIds(specs: EncounterEnemySpec[]): string[] {
  return [...new Set(specs.map(spec => spec.recruitPersonaId).filter(Boolean))];
}
