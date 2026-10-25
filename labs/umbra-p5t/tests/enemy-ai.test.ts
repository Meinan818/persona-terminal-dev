// Q11：specs/ENEMY-AI.md §4 的 9 条测试（权重见 src/rules/ai.ts 的 W，不改数）
import { describe, expect, it } from 'vitest';
import { Battle, parseMap, W } from '../src/rules';
import type { BattleEvent, MapDef, RuleOptions, UnitDef, Vec } from '../src/rules';
import { levelMap } from '../src/game/levels';
import { legacyMap } from './legacyLevels';
import { autoBattle } from '../src/game/autoplay';

const A = (id: string, o: Partial<UnitDef> = {}): UnitDef => ({ id, name: id, side: 'ally', maxHp: 100, maxSp: 100, move: 4, melee: 10, gun: { power: 10, range: 6 }, skills: [], ...o });
const E = (id: string, o: Partial<UnitDef> = {}): UnitDef => ({ id, name: id, side: 'enemy', role: 'brute', maxHp: 100, maxSp: 0, move: 4, melee: 20, skills: [], ...o });
function mk(rows: string[], place: Record<string, UnitDef>, opts: RuleOptions = {}, extra: Partial<MapDef> = {}) {
  const b = new Battle({ id: 't', name: 't', turnTarget: 3, win: { type: 'defeatAll' }, ...parseMap(rows, place), ...extra } as MapDef, opts);
  b.start();
  for (const u of b.alive('enemy')) u.alert = true;
  return b;
}
type Ev<T extends BattleEvent['type']> = Extract<BattleEvent, { type: T }>;
const pick = <T extends BattleEvent['type']>(ev: BattleEvent[], t: T) => ev.filter((e) => e.type === t) as Ev<T>[];
const attacksBy = (ev: BattleEvent[], id: string) => pick(ev, 'attack').filter((a) => a.attackerId === id);
const v = (x: number, y: number): Vec => ({ x, y });

describe('Q11 敌人 AI（ENEMY-AI.md）', () => {
  it('1 有能打倒的目标时一定打它（不去打满血的）', () => {
    const b = mk(['. . . . . .', '. X 1 Y . .', '. . . . . .'], { X: A('full'), Y: A('weak'), '1': E('e1', { move: 0 }) }, { enemyOneMore: false });
    b.unit('weak').hp = 10;
    const ev = b.endPlayerPhase();
    expect(attacksBy(ev, 'e1').map((a) => a.targetId)).toEqual(['weak']);
    expect(b.unit('weak').ko).toBe(true);
  });
  it('2 射手没目标时站到掩体旁', () => {
    const b = mk(['1 . . . . . . . . . . . . . A', '. . h . . . . . . . . . . . .'], { A: A('a', { gun: { power: 10, range: 3 } }), '1': E('e1', { role: 'shooter', gun: { power: 5, range: 3 }, move: 3 }) });
    b.endPlayerPhase();
    expect(b.grid.hasAnyCover(b.unit('e1').pos)).toBeGreaterThan(0);
  });
  it('3 近战会绕到半掩体后目标的侧面（包抄 +15）', () => {
    const b = mk(['. . . . . . .', '. . . h . . .', '. . . A . . .', '. . . . . . .', '1 . . . . . .'], { A: A('a', { gun: undefined }), '1': E('e1', { move: 6 }) }, { enemyOneMore: false });
    const ev = b.endPlayerPhase();
    const think = pick(ev, 'enemyThink').find((t) => t.enemyId === 'e1')!;
    expect(think.plan).toBe('melee');
    // 掩体在目标北侧 → 攻击位置不在北侧
    expect(think.dest.y).toBeGreaterThanOrEqual(2);
    expect(W.flank).toBe(15);
  });
  it('4 两个敌人同回合集火同一个已受伤的目标（都在掩体里打不倒 → 集火 +15 决定）', () => {
    const b = mk(['. . . 2 . . . . . .', '. . . . . . . . . .', '. . . . . . . . . .', '. . . . . . . . . .', '. . . . . . . . . .', 'X h . . . . Y h . 1'], {
      X: A('x'), Y: A('y'), '1': E('s1', { role: 'shooter', move: 0, gun: { power: 10, range: 4 } }), '2': E('s2', { role: 'shooter', move: 0, gun: { power: 10, range: 8 } }),
    }, { enemyOneMore: false });
    const ev = b.endPlayerPhase();
    expect(attacksBy(ev, 's1').map((a) => a.targetId)).toEqual(['y']);
    expect(attacksBy(ev, 's2').map((a) => a.targetId)).toEqual(['y']);
  });
  it('5 supporter 优先奶 HP 30% 的同伴而不是攻击', () => {
    const b = mk(['. . . . .', '. A S 1 .', '. . . . .'], { A: A('a'), S: E('s', { role: 'supporter', move: 0, melee: 8, maxSp: 99, skills: [{ id: 'dia', name: 'Dia', kind: 'heal', power: 65, sp: 4, range: 3, shape: 'single' }] }), '1': E('e1', { move: 0, melee: 0 }) });
    b.unit('e1').hp = 30;
    const ev = b.endPlayerPhase();
    expect(pick(ev, 'heal').map((h) => h.unitId)).toContain('e1');
    expect(attacksBy(ev, 's').filter((a) => a.kind !== 'skill')).toHaveLength(0);
  });
  it('6 未解锁区域的敌人不动；解锁后下一个敌方回合才动', () => {
    const b = new Battle({ id: 't', name: 't', turnTarget: 3, win: { type: 'defeatAll' }, ...parseMap(['A . . . . 1'], { A: A('a', { move: 0 }), '1': E('e1', { zone: 'B' }) }), zones: [['A', 'A', 'A', 'B', 'B', 'B']], unlockedZones: ['A'] } as MapDef);
    b.start();
    b.endPlayerPhase();
    expect(b.unit('e1').pos).toEqual(v(5, 0));
    b.unlockZone('B');
    expect(b.unit('e1').alert).toBe(true);
    expect(b.unit('e1').pos).toEqual(v(5, 0));
    b.endPlayerPhase();
    expect(b.unit('e1').pos).not.toEqual(v(5, 0));
  });
  it('7 staysInZone 的 Boss 永不离开 C 区（L08 自动战斗 7 回合）', () => {
    const b = new Battle(legacyMap('L08'));
    const zones: (string | null)[] = [];
    b.on((e) => { if ((e.type === 'move' || e.type === 'teleport' || e.type === 'knockback') && e.unitId === 'boss') zones.push(b.zoneOf(b.unit('boss').pos)); });
    b.start();
    autoBattle(b, { mode: 'win', maxTurns: 7 });
    expect(b.turn).toBeGreaterThanOrEqual(1);
    expect(b.zoneOf(b.unit('boss').pos)).toBe('C');
    // 被我方近战击退不算 AI 移动；AI 自己的移动全在 C 区
    expect(zones.every((z) => z === 'C') || zones.length === 0).toBe(true);
  });
  it('8 aiTarget=toshiro 的增援优先打 Toshiro（L06）', () => {
    const b = new Battle(legacyMap('L06'));
    b.start();
    b.turn = 5; // 跳到第 5 回合：敌方阶段刷 r3/r4（aiTarget: toshiro）
    const ev = b.endPlayerPhase();
    const thinks = pick(ev, 'enemyThink').filter((t) => t.enemyId === 'r3' || t.enemyId === 'r4');
    expect(thinks.length).toBeGreaterThan(0);
    expect(thinks.every((t) => t.targetId === 'toshiro')).toBe(true);
  });
  it('9 同分时结果可复现（固定种子跑两遍完全相同）', () => {
    const log = () => {
      const b = new Battle(levelMap('L01'), { seed: 7 });
      const ev: string[] = [];
      b.on((e) => ev.push(JSON.stringify(e)));
      b.start();
      autoBattle(b, { mode: 'win', maxTurns: 6 });
      return ev.join('\n');
    };
    expect(log()).toBe(log());
  });
});
