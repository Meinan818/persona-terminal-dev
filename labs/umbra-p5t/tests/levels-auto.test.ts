// Q10：L01–L10 用自动对战跑通——每关能赢、能输（src/game/autoplay.ts，确定性：同种子同结果）
// 赢用的难度 = 现有贪心 bot 能赢的最高难度（bot 不是高手，不代表关卡难度；见 umbra-assets/HARK-NOTES-ENGINE.md）
import { describe, expect, it } from 'vitest';
import { LEVEL_IDS, levelMap } from '../src/game/levels';
import { autoBattle } from '../src/game/autoplay';
import { Battle } from '../src/rules';
import type { Difficulty } from '../src/rules';

const WIN_DIFF: Record<string, Difficulty> = {
  L01: 'easy', L02: 'easy', L03: 'easy', L04: 'normal', L05: 'easy',
  L06: 'safety', L07: 'normal', L08: 'easy', L09: 'normal', L10: 'normal',
};
/** L09（生存 5 回合）normal 下我方站着不打也撑得过 5 回合 → 用 merciless 验证「能输」 */
const LOSE_DIFF: Record<string, Difficulty> = { L09: 'merciless' };

function play(id: string, mode: 'win' | 'lose', difficulty: Difficulty) {
  const b = new Battle(levelMap(id), { difficulty });
  const errors: string[] = [];
  let reason = '';
  b.on((e) => { if (e.type === 'error') errors.push(e.message); if (e.type === 'result') reason = e.reason ?? ''; });
  b.start();
  autoBattle(b, { mode, maxTurns: 30 });
  return { b, errors, reason };
}

describe('Q10 L01–L10 自动对战', () => {
  it('10 关都在', () => expect(LEVEL_IDS).toEqual(['L01', 'L02', 'L03', 'L04', 'L05', 'L06', 'L07', 'L08', 'L09', 'L10']));
  for (const id of LEVEL_IDS) {
    it(`${id} 能赢（难度 ${WIN_DIFF[id]}）`, () => {
      const { b, errors } = play(id, 'win', WIN_DIFF[id]);
      expect(errors).toEqual([]);
      expect(b.phase).toBe('won');
    });
    it(`${id} 能输（难度 ${LOSE_DIFF[id] ?? 'normal'}）`, () => {
      const { b, errors, reason } = play(id, 'lose', LOSE_DIFF[id] ?? 'normal');
      expect(errors).toEqual([]);
      expect(b.phase).toBe('lost');
      expect(reason.length).toBeGreaterThan(0);
    });
  }
  it('L03 赢的时候被操控的龙司没被打倒（保护式全灭）', () => {
    const { b } = play('L03', 'win', WIN_DIFF.L03);
    expect(b.unit('skull_ctrl').ko).toBe(false);
  });
  it('L06 赢 = Toshiro 站在出口', () => {
    const { b } = play('L06', 'win', WIN_DIFF.L06);
    expect(b.grid.tile(b.unit('toshiro').pos)).toBe('exit');
  });
});
