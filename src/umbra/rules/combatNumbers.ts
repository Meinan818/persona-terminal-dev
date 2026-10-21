export const BASIC_ATTACK_POWER = 8;

export const ENEMY_TIER_MULTIPLIERS = {
  mob: { hp: 1.2, attack: 0.9, defense: 1.0 },
  elite: { hp: 3.4, attack: 1.8, defense: 1.7 },
  boss: { hp: 3.0, attack: 1.8, defense: 1.6 },
} as const;

export const PHYS_RESIST_CHANCE = 0.3;
