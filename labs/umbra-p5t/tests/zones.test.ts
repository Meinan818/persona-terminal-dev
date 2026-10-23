// Q6：区域解锁（开关开门 / 触发格 / 清区）+ 增援（按回合 / 按触发）；Q9 事件与动作
import { describe, expect, it } from 'vitest';
import { levelMap } from '../src/game/levels';
import { Battle } from '../src/rules';
import type { BattleEvent, MapDef } from '../src/rules';

function run(map: MapDef) {
  const b = new Battle(map);
  const ev: BattleEvent[] = [];
  b.on((e) => ev.push(e));
  b.start();
  return { b, ev };
}
const kill = (b: Battle, ids: string[]) => { for (const id of ids) { const u = b.unit(id); u.hp = 0; u.ko = true; } b.checkEnd(); };

describe('Q6 区域解锁', () => {
  it('未解锁区域的敌人隐藏、不能被选为目标、不行动；仍计入全灭', () => {
    const { b } = run(levelMap('L02'));
    const b1 = b.unit('b1');
    expect(b.isDormant(b1)).toBe(true);
    expect(b.isHidden(b1)).toBe(true);
    expect(b.intents.some((i) => i.enemyId === 'b1')).toBe(false);
    const before = { ...b1.pos };
    b.endPlayerPhase();
    expect(b1.pos).toEqual(before);
    kill(b, ['a1', 'a2']);
    expect(b.phase).toBe('player');
  });
  it('L02：踩开关 s1 → D1 打开 → doorOpened → 解锁 B 区，B 区敌人出现', () => {
    const { b, ev } = run(levelMap('L02'));
    expect(b.doorOpen('D1')).toBe(false);
    b.unit('joker').pos = { x: 2, y: 12 }; b.unit('joker').anchor = { x: 2, y: 12 };
    b.move('joker', { x: 2, y: 11 });
    expect(b.doorOpen('D1')).toBe(true);
    expect(b.zoneUnlocked('B')).toBe(true);
    expect(b.isDormant(b.unit('b1'))).toBe(false);
    expect(ev.some((e) => e.type === 'zoneUnlocked' && e.zone === 'B')).toBe(true);
  });
  it('L02：B 区清完 → zoneCleared → D2 自动打开 + 解锁 C 区', () => {
    const { b } = run(levelMap('L02'));
    b.unlockZone('B');
    kill(b, ['b1', 'b2', 'b3']);
    expect(b.doorOpen('D2')).toBe(true);
    expect(b.zoneUnlocked('C')).toBe(true);
  });
  it('L03：走到桥头触发格 (9,8) → 解锁 B 区', () => {
    const { b } = run(levelMap('L03'));
    expect(b.zoneUnlocked('B')).toBe(false);
    b.move('joker', { x: 9, y: 9 });
    b.unit('joker').anchor = { x: 9, y: 9 }; b.unit('joker').acted = false;
    b.move('joker', { x: 9, y: 8 });
    expect(b.zoneUnlocked('B')).toBe(true);
    expect(b.isDormant(b.unit('skull_ctrl'))).toBe(false);
  });
});

describe('Q6 增援', () => {
  it('L01：第 3 回合敌方阶段左右各来 1 个增援', () => {
    const { b, ev } = run(levelMap('L01'));
    b.endPlayerPhase(); b.endPlayerPhase();
    expect(b.units.some((u) => u.id === 'r1')).toBe(false);
    b.endPlayerPhase();
    expect(ev.some((e) => e.type === 'reinforce' && e.unitIds.includes('r1') && e.unitIds.includes('r2'))).toBe(true);
  });
  it('L02：我方进入 C 区（enterZone）→ 背后来 2 援军', () => {
    const { b } = run(levelMap('L02'));
    const j = b.unit('joker');
    j.pos = { x: 11, y: 5 }; j.anchor = { ...j.pos };
    b.setDoor('D2', true);
    expect(b.units.some((u) => u.id === 'r1')).toBe(false);
    b.move('joker', { x: 13, y: 5 });
    expect(b.units.some((u) => u.id === 'r1')).toBe(true);
    expect(b.units.some((u) => u.id === 'r2')).toBe(true);
  });
  it('L07：everyTurns{n:2, whileAlive:flag} 旗子在就每 2 回合补 1 个射手，重复 id 自动加后缀；旗倒后停', () => {
    const { b } = run(levelMap('L07'));
    for (let i = 0; i < 4; i++) b.endPlayerPhase();
    const ids = b.units.filter((u) => u.id.startsWith('rN')).map((u) => u.id);
    expect(ids).toEqual(['rN', 'rN_2']);
    b.unit('flag').ko = true;
    for (let i = 0; i < 2 && b.phase === 'player'; i++) b.endPlayerPhase();
    expect(b.units.filter((u) => u.id.startsWith('rN'))).toHaveLength(2);
  });
});

describe('Q9 事件/动作接口', () => {
  it('L10：hpBelow → 阶段 2：开门、解锁 C、moveUnit 瞬移、setWin；everyTurns{flag:phase2} 每 3 回合召 2 个', () => {
    const { b, ev } = run(levelMap('L10'));
    const boss = b.unit('boss');
    expect(boss.hpFloor).toBe(Math.floor(boss.maxHp * 0.5));
    b.applyDamage(boss, 999, 0, false, 'gun', b.unit('joker'));
    expect(boss.hp).toBe(boss.hpFloor);
    b.checkEnd();
    expect(b.rt.flags.has('phase2')).toBe(true);
    expect(b.doorOpen('D1') && b.doorOpen('D2')).toBe(true);
    expect(b.zoneUnlocked('C')).toBe(true);
    expect(boss.pos).toEqual({ x: 9, y: 1 });
    expect(boss.bossPhase).toBe(2);
    expect(ev.some((e) => e.type === 'teleport' && e.unitId === 'boss')).toBe(true);
    while (b.turn < 3 && b.phase === 'player') b.endPlayerPhase();
    if (b.phase === 'player') b.endPlayerPhase();
    expect(b.units.some((u) => u.id === 'sN') && b.units.some((u) => u.id === 'sN_2')).toBe(true);
  });
  it('moveUnit：目标格被占 → 找最近空格', () => {
    const { b } = run(levelMap('L01'));
    const e = b.units.find((u) => u.side === 'enemy')!;
    b.teleport(e, b.unit('joker').pos);
    expect(e.pos).not.toEqual(b.unit('joker').pos);
    expect(Math.abs(e.pos.x - b.unit('joker').pos.x) + Math.abs(e.pos.y - b.unit('joker').pos.y)).toBe(1);
  });
  it('宝箱：未解锁区域不可见也拿不到；解锁后走上去 = 拿到，奖励记账', () => {
    const { b, ev } = run(levelMap('L02'));
    expect(b.visibleChests()).toHaveLength(0);
    const j = b.unit('joker');
    b.unlockZone('B');
    expect(b.visibleChests().map((c) => c.id)).toEqual(['ch1']);
    j.pos = { x: 1, y: 3 }; j.anchor = { ...j.pos };
    b.move('joker', { x: 1, y: 1 });
    expect(b.loot).toEqual({ gp: 3 });
    expect(ev.some((e) => e.type === 'chest' && e.chestId === 'ch1')).toBe(true);
    expect(b.visibleChests()).toHaveLength(0);
  });
});
