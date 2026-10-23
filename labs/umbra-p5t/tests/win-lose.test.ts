// Q5：P5T 7 种胜利 + 4 种败北条件（p5t/0_list/mission-types.md），每种一个测试关 JSON（tests/fixtures/levels/）
import { describe, expect, it } from 'vitest';
import { loadLevel, type LevelJson } from '../src/game/level';
import { Battle } from '../src/rules';
import type { BattleEvent } from '../src/rules';

const FX = import.meta.glob('./fixtures/levels/*.json', { eager: true, import: 'default' }) as Record<string, LevelJson>;
const fx = (name: string): LevelJson => structuredClone(FX[`./fixtures/levels/${name}.json`]);
function start(name: string) {
  const b = new Battle(loadLevel(fx(name)));
  const ev: BattleEvent[] = [];
  b.on((e) => ev.push(e));
  b.start();
  return { b, ev, result: () => ev.find((e) => e.type === 'result') as Extract<BattleEvent, { type: 'result' }> | undefined };
}
const endTurns = (b: Battle, max = 30) => { for (let i = 0; i < max && b.phase === 'player'; i++) b.endPlayerPhase(); };

describe('Q5 胜利条件（7 类）', () => {
  it('1 全灭：打倒最后一个敌人 → 胜利', () => {
    const { b } = start('W1-defeatAll');
    b.shoot('joker', 'e1');
    expect(b.phase).toBe('won');
  });
  it('2 限时全灭：超过 2 回合没清场 → 失败（超过回合上限）', () => {
    const { b, result } = start('W2-defeatAllWithin');
    endTurns(b);
    expect(b.phase).toBe('lost');
    expect(b.turn).toBe(3);
    expect(result()?.reason).toBe('超过回合上限');
  });
  it('3 击破指定 Boss：杂兵还在也胜利', () => {
    const { b } = start('W3-defeatTarget');
    b.shoot('joker', 'boss');
    expect(b.phase).toBe('won');
    expect(b.unit('e2').ko).toBe(false);
  });
  it('4a 全队抵达：所有我方都站上出口才胜利', () => {
    const { b } = start('W4-reachExitAll');
    b.move('joker', { x: 0, y: 0 });
    expect(b.phase).toBe('player');
    b.move('skull', { x: 1, y: 0 });
    expect(b.phase).toBe('won');
  });
  it('4b 护送：护送 NPC 抵达出口 → 胜利', () => {
    const { b } = start('W4-escort');
    b.move('toshiro', { x: 0, y: 5 });
    expect(b.phase).toBe('won');
  });
  it('5 破坏物体：打掉敌方红旗 → 胜利；敌人不会把红旗当目标', () => {
    const { b } = start('W5-destroyFlag');
    expect(b.canShoot(b.unit('e1'), b.unit('flag'), b.unit('e1').pos)).toBe(false);
    b.shoot('joker', 'flag');
    expect(b.unit('flag').ko).toBe(true);
    expect(b.phase).toBe('won');
  });
  it('6 生存 N 回合：撑过 2 回合自动胜利', () => {
    const { b } = start('W6-survive');
    b.endPlayerPhase();
    expect(b.phase).toBe('player');
    b.endPlayerPhase();
    expect(b.phase).toBe('won');
    expect(b.turn).toBe(3);
  });
  it('7 保护式全灭：受保护单位 HP 停在 1、不倒地；清掉其余敌人 → 胜利', () => {
    const { b } = start('W7-defeatAllExcept');
    const ctrl = b.unit('ctrl');
    ctrl.hp = 2;
    b.applyDamage(ctrl, 999, 0, false, 'gun', b.unit('joker'));
    expect(ctrl.hp).toBe(1);
    expect(ctrl.ko).toBe(false);
    expect(b.markDowns([{ t: ctrl, resist: false }])).toBe(false);
    b.shoot('joker', 'e1');
    expect(b.phase).toBe('won');
  });
});

describe('Q5 败北条件（4 类）', () => {
  it('我方全灭 → 失败', () => {
    const { b, result } = start('X1-allKo');
    endTurns(b);
    expect(b.phase).toBe('lost');
    expect(result()?.reason).toBe('全员倒下');
  });
  it('关键 NPC 倒下 → 失败', () => {
    const { b } = start('X2-escortKo');
    endTurns(b);
    expect(b.phase).toBe('lost');
    expect(b.unit('toshiro').ko).toBe(true);
    expect(b.unit('joker').ko).toBe(false);
  });
  it('超过指定回合数 → 失败', () => {
    const { b, result } = start('X3-turnLimit');
    expect(b.turnLimit()).toBe(1);
    b.endPlayerPhase();
    expect(b.phase).toBe('lost');
    expect(result()?.reason).toBe('超过回合上限');
  });
  it('保护式全灭里击倒受保护单位 → 失败', () => {
    const { b } = start('X4-protectedKo');
    b.shoot('joker', 'ctrl');
    expect(b.unit('ctrl').ko).toBe(true);
    expect(b.phase).toBe('lost');
  });
});
