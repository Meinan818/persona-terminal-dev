// Q7：最大 32×40、高度 0–3；高处打低处命中+；低处不能越过 2 层
import { describe, expect, it } from 'vitest';
import { loadLevel, type LevelJson } from '../src/game/level';
import { Battle, parseMap, enemy, JOKER, HIGH_GROUND_HIT, MAX_WALK_STEP } from '../src/rules';
import type { MapDef, RuleOptions, UnitDef } from '../src/rules';

const mk = (rows: string[], place: Record<string, UnitDef>, heights: string[], opts: RuleOptions = {}) => {
  const b = new Battle({ id: 't', name: 't', turnTarget: 3, win: { type: 'defeatAll' }, ...parseMap(rows, place, heights) } as MapDef, opts);
  b.start();
  return b;
};
const J = { ...JOKER, move: 6 };

describe('Q7 大地图与高度', () => {
  it('32×40 地图、高度 0–3：能读、能开局、敌方回合跑得完', () => {
    const W = 32, H = 40;
    const heights = Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => String(Math.min(3, Math.floor(x / 8)))).join(''));
    const j: LevelJson = {
      id: 'BIG', name: 'big', width: W, height: H, win: { type: 'defeatAll' }, turnTarget: 10,
      party: [['joker', 1, 38], ['skull', 2, 38], ['mona', 3, 38]],
      enemies: Array.from({ length: 10 }, (_, i) => ({ id: `e${i}`, name: 'Pixie', role: i % 2 ? 'shooter' : 'brute', hp: 'PH', pos: [(i * 3) % 8, 2 + i] as [number, number] })),
      tiles: Array.from({ length: H }, () => '.'.repeat(W)), heights,
    };
    const b = new Battle(loadLevel(j));
    b.start();
    const t0 = Date.now();
    b.endPlayerPhase();
    expect(Date.now() - t0).toBeLessThan(15000);
    expect(['player', 'lost']).toContain(b.phase);
    expect(b.grid.h({ x: 31, y: 0 })).toBe(3);
  });
  it('缺省（原作）：没有梯子不能走上 1 层台阶', () => {
    const b = mk(['A . .'], { A: J }, ['0 1 1']);
    expect(b.moveTiles(b.unit('joker'))).toEqual([]);
  });
  it('maxStep=1：1 层台阶能直接走；2 层台阶永远走不上去（低处不能越过 2 层）', () => {
    const b = mk(['A . . .'], { A: J }, ['0 1 3 3'], { maxStep: 1 });
    const tiles = b.moveTiles(b.unit('joker')).map((p) => p.x);
    expect(tiles).toEqual([1]);
    const b2 = mk(['A . .'], { A: J }, ['0 2 2'], { maxStep: 5 });
    expect(b2.moveTiles(b2.unit('joker'))).toEqual([]);
    expect(MAX_WALK_STEP).toBe(1);
  });
  it('梯子不受台阶限制（L05 塔 0→2 层）', () => {
    const b = new Battle({ id: 't', name: 't', turnTarget: 3, win: { type: 'defeatAll' }, ...parseMap(['A .'], { A: J }, ['0 2']), links: [{ a: { x: 0, y: 0 }, b: { x: 1, y: 0 }, kind: 'ladder' }] } as MapDef);
    b.start();
    expect(b.moveTiles(b.unit('joker'))).toEqual([{ x: 1, y: 0 }]);
  });
  it('高处打低处命中+：同层打全掩体后的敌人会落空，从高 1 层打就能打中', () => {
    const e = enemy('e1', 'Pixie', 'shooter', 60);
    const low = mk(['. . . . .', 'A . H 1 .', '. . . . .'], { A: J, '1': e }, ['0 0 0 0 0', '0 0 0 0 0', '0 0 0 0 0']);
    expect(low.previewDamage(low.unit('joker'), low.unit('e1'), 'gun').miss).toBe(true);
    const high = mk(['. . . . .', 'A . H 1 .', '. . . . .'], { A: J, '1': e }, ['0 0 0 0 0', '1 0 0 0 0', '0 0 0 0 0']);
    expect(high.previewDamage(high.unit('joker'), high.unit('e1'), 'gun').miss).toBe(false);
    expect(high.hitBonus(high.unit('joker'), high.unit('e1'))).toBeCloseTo(HIGH_GROUND_HIT);
    expect(high.hitBonus(high.unit('e1'), high.unit('joker'))).toBe(0);
  });
});
