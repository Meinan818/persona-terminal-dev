import fs from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  compendiumPersonaIds,
  compendiumSkillIds,
} from '@/umbra/engine/compendiumPreload';
import { ensureCompendium } from '@/umbra/engine/p5r-compendium';
import {
  BALANCE_TARGETS,
  BALANCE_TIERS,
} from '../balanceData';
import { simulateBalance } from '../simulateBalance';

beforeAll(async () => {
  await ensureCompendium({
    personas: compendiumPersonaIds(),
    skills: compendiumSkillIds(),
  });
});

describe('UMBRA balance simulator', () => {
  it('三种打法×三档敌人胜率达到 D-006 目标', () => {
    const result = simulateBalance({
      iterations: Number(process.env.SIM_ITERATIONS ?? 2000),
    });
    if (process.env.SIM_WRITE_ONLY !== '1') {
      for (const tier of BALANCE_TIERS) {
        for (const [bot, target] of Object.entries(BALANCE_TARGETS[tier])) {
          const rate = result.table[tier][bot as 'basic' | 'weakness' | 'advanced'];
          expect(rate).not.toBeNull();
          expect((rate ?? 0) * 100).toBeGreaterThanOrEqual(target.min);
          expect((rate ?? 0) * 100).toBeLessThanOrEqual(target.max);
        }
      }
    }

    const rows = [
      '| 打法 | 杂兵 | 精英 | BOSS |',
      '| --- | ---: | ---: | ---: |',
      ...['basic', 'weakness', 'advanced'].map((bot) => (
        `| ${bot} | ${BALANCE_TIERS.map(tier => `${(((result.table[tier] as any)[bot] ?? 0) * 100).toFixed(1)}%`).join(' | ')} |`
      )),
    ];
    const report = `# UMBRA Balance\n\n${rows.join('\n')}\n`;
    const dir = path.resolve(process.cwd(), 'docs', 'umbra-progress');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'balance.md'), report);
  });
});
