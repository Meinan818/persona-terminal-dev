export const BASIC_ATTACK_POWER = 8;

export const ENEMY_TIER_MULTIPLIERS = {
  mob: { hp: 0.7, attack: 0.35, defense: 0.7 },
  elite: { hp: 1.3, attack: 0.6, defense: 0.9 },
  boss: { hp: 2.2, attack: 1.0, defense: 1.2 },
} as const;

export const PHYS_RESIST_CHANCE = 0.3;
