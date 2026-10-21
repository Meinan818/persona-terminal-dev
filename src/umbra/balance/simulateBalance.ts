import {
  runHeadlessBattle,
  type BattlePolicy,
} from '@/umbra/engine/headless-simulator';
import {
  BALANCE_BOTS,
  BALANCE_ITERATIONS,
  BALANCE_TIERS,
  createBalanceEnemies,
  type BalanceTableData,
  type BalanceTier,
} from './balanceData';

export interface SimulateBalanceOptions {
  iterations?: number;
  seedBase?: number;
  floor?: number;
}

export function simulateBalance(options: SimulateBalanceOptions = {}): BalanceTableData {
  const iterations = Math.max(1, options.iterations ?? BALANCE_ITERATIONS);
  const seedBase = options.seedBase ?? 12345;
  const floor = options.floor ?? 8;
  const table = {} as BalanceTableData['table'];

  for (const tier of BALANCE_TIERS) {
    table[tier] = { basic: null, weakness: null, advanced: null, random: null } as any;
    for (let index = 0; index < iterations; index += 1) {
      const enemySpecs = createBalanceEnemies(
        tier,
        seedBase + BALANCE_TIERS.indexOf(tier) * 10000 + index,
        floor,
      );
      for (const bot of BALANCE_BOTS) {
      let wins = 0;
        const seed = seedBase + BALANCE_TIERS.indexOf(tier) * 10000 + BALANCE_BOTS.indexOf(bot) * 1000 + index;
        const result = runHeadlessBattle({
          seed,
          policy: bot,
          enemySpecs,
          activePersonaId: 'pixie',
        });
        if (result.victory) wins += 1;
        table[tier][bot] = ((table[tier][bot] as number) ?? 0) + (result.victory ? 1 / iterations : 0);
      }
    }
  }

  return { floor, seedBase, table };
}
