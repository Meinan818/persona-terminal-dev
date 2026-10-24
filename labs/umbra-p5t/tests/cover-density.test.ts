// 10-25 Hark 决定：掩体密度照 P5T（道具约占可走格 25–35%，2–4 格一组）；每关有 2 层高台/墙且挂梯子（L06 小巷只给原高台补梯子）
import { describe, expect, it } from 'vitest';
import { LEVEL_IDS, levelJson } from '../src/game/levels';

describe('P5T 掩体密度（gen_levels.py densify）', () => {
  for (const id of LEVEL_IDS) {
    it(`${id} 掩体占非墙格 25–35%，梯子 ≥2`, () => {
      const j = levelJson(id);
      const all = j.tiles.join('');
      const walk = [...all].filter((c) => c !== '#').length;
      const cover = [...all].filter((c) => c === 'h' || c === 'H').length;
      expect(cover / walk).toBeGreaterThanOrEqual(0.25);
      expect(cover / walk).toBeLessThanOrEqual(0.35);
      expect((j.links ?? []).filter((l) => l.kind === 'ladder').length).toBeGreaterThanOrEqual(2);
      if (id !== 'L06') expect(j.heights!.join('')).toContain('2');
    });
  }
});
