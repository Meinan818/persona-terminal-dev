import { describe, expect, it } from 'vitest';
import {
  Battle, parseMap, pointInTriangle, testMap, followUpMap, specialsMap, escortMap, rangeMapA, rangeMapB, SKILLS, UNIQUES, prop,
  RESIST_MULT, SKILL_SCALE, TRIPLE_THREAT_MULT, VOLTAGE_MAX, DESPAIR_MOVE, JOKER,
} from '../src/rules';
import type { MapDef, UnitDef, BattleEvent, RuleOptions, SkillDef, Vec } from '../src/rules';

// ---------- 测试辅助 ----------
const A = (id: string, o: Partial<UnitDef> = {}): UnitDef => ({
  id, name: id, side: 'ally', maxHp: 100, maxSp: 100, move: 4, melee: 10, gun: { power: 10, range: 6 }, skills: [], ...o,
});
const E = (id: string, o: Partial<UnitDef> = {}): UnitDef => ({
  id, name: id, side: 'enemy', role: 'brute', maxHp: 100, maxSp: 0, move: 0, melee: 0, skills: [], ...o,
});
function mk(rows: string[], place: Record<string, UnitDef>, extra: Partial<MapDef> = {}, opts: RuleOptions = {}, heights?: string[]): Battle {
  const b = new Battle({ id: 't', name: 't', turnTarget: 3, win: { type: 'defeatAll' }, ...parseMap(rows, place, heights), ...extra }, opts);
  b.start();
  return b;
}
const types = (ev: BattleEvent[]) => ev.map((e) => e.type);
type Ev<T extends BattleEvent['type']> = Extract<BattleEvent, { type: T }>;
const pick = <T extends BattleEvent['type']>(ev: BattleEvent[], t: T) => ev.filter((e) => e.type === t) as Ev<T>[];
const dmgOf = (ev: BattleEvent[], id?: string) => pick(ev, 'damage').filter((e) => !id || e.unitId === id);
const sk = (o: Partial<SkillDef>): SkillDef => ({ id: 'test', name: 'test', kind: 'attack', power: 20, sp: 5, range: 6, shape: 'single', ...o });
const v = (x: number, y: number): Vec => ({ x, y });
const eq2 = (a: Vec, b: Vec) => a.x === b.x && a.y === b.y;

// =====================================================================
describe('掩体 / Resistance', () => {
  it('半掩体：伤害 ×0.7、不倒地、不给 1 More', () => {
    const b = mk(['A . . . .', '. h . . .', '. 1 . . .'], { A: A('a'), '1': E('e1') });
    const ev = b.shoot('a', 'e1');
    expect(dmgOf(ev)[0].amount).toBe(Math.round(10 * RESIST_MULT));
    expect(dmgOf(ev)[0].resist).toBe(true);
    expect(b.unit('e1').downed).toBe(false);
    expect(types(ev)).not.toContain('oneMore');
  });

  it('全掩体：正面与侧面的枪击全部落空，只有背面能打中（仍有 Resistance）', () => {
    const b = mk([
      '. . F . .',
      '. . H . .',
      '. . 1 . S',
      '. . . . .',
      '. . B . .',
    ], { F: A('front'), S: A('side'), B: A('back'), '1': E('e1') });
    expect(types(b.shoot('front', 'e1'))).toContain('miss');
    expect(types(b.shoot('side', 'e1'))).toContain('miss');
    expect(b.unit('e1').hp).toBe(100);
    const ev = b.shoot('back', 'e1');
    expect(types(ev)).not.toContain('miss');
    expect(dmgOf(ev)[0].amount).toBe(7);
    expect(b.unit('e1').downed).toBe(false);
  });

  it('p5t 模式：贴着掩体即 Resistance，与方向无关；directional 模式：侧面可打倒', () => {
    const rows = ['. h . .', '. 1 . A', '. . . .'];
    const p5t = mk(rows, { A: A('a'), '1': E('e1') });
    expect(p5t.hasResistance(p5t.unit('e1'), p5t.unit('a').pos)).toBe(true);
    const dir = mk(rows, { A: A('a'), '1': E('e1') }, {}, { coverModel: 'directional' });
    expect(dir.hasResistance(dir.unit('e1'), dir.unit('a').pos)).toBe(false);
    expect(dir.hasResistance(dir.unit('e1'), v(1, -2))).toBe(true);
    expect(types(dir.shoot('a', 'e1'))).toContain('oneMore');
  });

  it('墙算掩体（Cogito：躲在墙或障碍物后），地图边界不算', () => {
    const b = mk(['# . 2', '1 . .', '. . A'], { A: A('a'), '1': E('e1'), '2': E('e2') });
    expect(b.grid.hasAnyCover(b.unit('e1').pos)).toBe(2);
    expect(b.hasResistance(b.unit('e2'), b.unit('a').pos)).toBe(false);
  });

  it('攻击技能打破 Resistance（本次不倒地），下一击即可打倒；技能无视墙体视线', () => {
    const b = mk(['. h . .', '. 1 # A', '. . . .', 'B . . .'], { A: A('a', { skills: [sk({})] }), B: A('b'), '1': E('e1') });
    expect(b.grid.lineOfSight(b.unit('a').pos, b.unit('e1').pos)).toBe(false);
    const ev = b.skill('a', 'test', 'e1');
    expect(dmgOf(ev)[0].amount).toBe(Math.round(Math.round(20 * SKILL_SCALE) * RESIST_MULT));
    expect(types(ev)).toContain('resistBroken');
    expect(types(ev)).not.toContain('down');
    expect(types(b.shoot('b', 'e1'))).toEqual(expect.arrayContaining(['down', 'oneMore']));
  });
});

// =====================================================================
describe('1 More 与回合', () => {
  it('打倒 → 1 More（再移动+再行动）→ 对不同敌人连锁；打已倒地的不再给', () => {
    const b = mk(['. . . . .', '. 1 . 2 .', '. . . . .', 'A . . . .'], { A: A('a'), '1': E('e1'), '2': E('e2') });
    const a = b.unit('a');
    b.move('a', v(1, 3));
    expect(types(b.shoot('a', 'e1'))).toEqual(expect.arrayContaining(['down', 'oneMore']));
    expect(a.oneMore && !a.acted).toBe(true);
    expect(a.anchor).toEqual(v(1, 3));
    b.move('a', v(3, 3));
    expect(types(b.shoot('a', 'e2'))).toContain('oneMore');
    expect(types(b.shoot('a', 'e1'))).not.toContain('oneMore');
    expect(b.turn).toBe(2);
  });

  it('行动前可反复改位置（从起点算范围）', () => {
    const b = mk(['A . . . . .', '1 . . . . .'], { A: A('a', { move: 3 }), '1': E('e1') });
    b.move('a', v(3, 0));
    expect(types(b.move('a', v(2, 0)))).toContain('move');
    expect(types(b.move('a', v(5, 0)))).toContain('error');
    b.move('a', v(0, 0));
    expect(b.unit('a').moved).toBe(false);
  });

  it('倒地的敌人在敌方回合开始时起身', () => {
    const b = mk(['. 1 .', '. . .', 'A . .'], { A: A('a'), '1': E('e1') });
    b.shoot('a', 'e1');
    const ev = b.endPlayerPhase();
    expect(types(ev)).toContain('standUp');
    expect(b.unit('e1').downed).toBe(false);
    expect(b.turn).toBe(2);
  });
});

// =====================================================================
describe('近战（击退 4 格）', () => {
  it('近战掩体里的敌人：伤害不受 Guard 减免（Samurai Gamers Guard Guide）、不倒地，击退 4 格、攻击者占据原位、打破 Resistance', () => {
    const b = mk(['. . h . . . . . .', '. A 1 . . . . . .', '. . . . . B . . .'], { A: A('a'), B: A('b'), '1': E('e1') });
    const ev = b.melee('a', 'e1');
    expect(dmgOf(ev)[0].amount).toBe(10);
    expect(dmgOf(ev)[0].resist).toBe(true);
    expect(types(ev)).toEqual(expect.arrayContaining(['knockback', 'meleeStep', 'resistBroken']));
    expect(types(ev)).not.toContain('down');
    expect(b.unit('e1').pos).toEqual(v(6, 1));
    expect(b.unit('a').pos).toEqual(v(2, 1));
    expect(types(b.shoot('b', 'e1'))).toEqual(expect.arrayContaining(['down', 'oneMore']));
  });

  it('近战空地上的敌人：倒地 + 1 More', () => {
    const b = mk(['. . . . . . .', '. 1 A . . . .', '. . . . . . .'], { A: A('a'), '1': E('e1') });
    expect(types(b.melee('a', 'e1'))).toEqual(expect.arrayContaining(['down', 'oneMore']));
  });

  it('击退途中被墙挡住：停在墙前；紧贴墙则原地不动、攻击者也不前进', () => {
    const b = mk(['. A 1 . # .'], { A: A('a'), '1': E('e1') });
    b.melee('a', 'e1');
    expect(b.unit('e1').pos).toEqual(v(3, 0));
    expect(b.unit('a').pos).toEqual(v(2, 0));
    const b2 = mk(['#', '1', 'A'], { A: A('a'), '1': E('e1') });
    const ev = b2.melee('a', 'e1');
    expect(pick(ev, 'knockback')[0].blocked).toBe(true);
    expect(b2.unit('e1').pos).toEqual(v(0, 1));
    expect(b2.unit('a').pos).toEqual(v(0, 2));
  });

  it('把敌人推向另一个敌人：两者都失去 Resistance', () => {
    const b = mk(['h h . .', '2 1 A B'], { A: A('a'), B: A('b'), '1': E('e1'), '2': E('e2') });
    const ev = b.melee('a', 'e1');
    expect(pick(ev, 'knockback')[0].collidedWith).toBe('e2');
    expect(b.unit('e2').resistBroken && b.unit('e1').resistBroken).toBe(true);
  });

  it('近战要求同一高度相邻', () => {
    const b = mk(['A 1'], { A: A('a'), '1': E('e1') }, {}, {}, ['01']);
    expect(b.canMelee(b.unit('a'), b.unit('e1'))).toBe(false);
  });
});

// =====================================================================
describe('高低差 / 推落 / Follow-Up', () => {
  it('高处单位抵抗来自低处的枪击（Resistance）；从高处打低处正常打倒', () => {
    const b = mk(['. 1 . .', '. . . .', 'A . . .'], { A: A('a'), '1': E('e1') }, {}, {}, ['0100', '0000', '0000']);
    const ev = b.shoot('a', 'e1');
    expect(dmgOf(ev)[0].resist).toBe(true);
    expect(b.unit('e1').downed).toBe(false);
    const b2 = mk(['A . .', '. . 1'], { A: A('a'), '1': E('e1') }, {}, {}, ['100', '000']);
    expect(types(b2.shoot('a', 'e1'))).toContain('down');
  });

  it('不能直接走上高台；梯子（Dash）可上下，发 dash 事件；护送对象不能 Dash；贴高台侧壁算掩体', () => {
    const rows = ['A . .', '. . 1'];
    const hs = ['011', '011'];
    const b0 = mk(rows, { A: A('a'), '1': E('far') }, {}, {}, hs);
    expect(b0.moveTiles(b0.unit('a')).some((p) => b0.grid.h(p) === 1)).toBe(false);
    expect(b0.grid.hasAnyCover(v(0, 0))).toBe(2);
    const links = [{ a: v(0, 1), b: v(1, 1), kind: 'ladder' as const }];
    const b = mk(rows, { A: A('a'), '1': E('far') }, { links }, {}, hs);
    const ev = b.move('a', v(1, 1));
    expect(types(ev)).toContain('dash');
    expect(b.unit('a').pos).toEqual(v(1, 1));
    // Dash 后本次移动结束（Pathway「直到使用 Dash」/ Stop & Go「Dash 后 +1」）
    expect(b.moveTiles(b.unit('a')).some((p) => eq2(p, v(2, 1)))).toBe(false);
    const bs = mk(rows, { A: A('a', { passives: ['stopAndGo'] }), '1': E('far') }, { links }, {}, hs);
    expect(bs.moveTiles(bs.unit('a')).some((p) => eq2(p, v(1, 0)))).toBe(true);
    expect(bs.moveTiles(bs.unit('a')).some((p) => eq2(p, v(2, 0)))).toBe(false);
    const b2 = mk(rows, { A: A('a', { escort: true }), '1': E('far') }, { links }, {}, hs);
    expect(b2.moveTiles(b2.unit('a')).some((p) => b2.grid.h(p) === 1)).toBe(false);
  });

  it('把掩体里的敌人从高台推落 → 坠落伤害 → 下方队友 Follow-Up → 敌人倒地、攻击者 1 More；Follow-Up 每回合次数用完就不再触发', () => {
    const b = mk([
      '. A . B',
      'h 1 . 2',
      '. . . .',
      '. . . .',
      '. S . .',
    ], { A: A('a'), B: A('b'), S: A('s'), '1': E('e1'), '2': E('e2') }, {}, {}, ['1111', '1111', '0000', '0000', '0000']);
    const ev = b.melee('a', 'e1');
    expect(dmgOf(ev, 'e1')[0].resist).toBe(true); // 近战本身被掩体抵抗
    expect(b.unit('e1').pos).toEqual(v(1, 2));
    expect(types(ev)).toEqual(expect.arrayContaining(['fall', 'followUp', 'down', 'oneMore']));
    expect(dmgOf(ev, 'e1').map((d) => d.source)).toEqual(['melee', 'fall', 'followUp']);
    expect(pick(ev, 'followUp')[0]).toMatchObject({ shooterId: 's', creditId: 'a' });
    expect(b.unit('a').oneMore).toBe(true);
    expect(b.unit('s').followUps).toBe(0);
    const ev2 = b.melee('b', 'e2');
    expect(types(ev2)).toContain('fall');
    expect(types(ev2)).not.toContain('followUp');
  });

  it('落点不在下方队友射程内：只有坠落伤害，不给 1 More', () => {
    const b = mk(['. A . B', 'h 1 . .', '. . . .'], { A: A('a'), B: A('b'), '1': E('e1') }, {}, {}, ['1111', '1111', '0000']);
    const ev = b.melee('a', 'e1');
    expect(types(ev)).toContain('fall');
    expect(types(ev)).not.toContain('followUp');
    expect(types(ev)).not.toContain('oneMore');
    expect(dmgOf(ev, 'e1')[1].amount).toBe(10); // 10% MaxHP（PH）
  });

  it('Launcher：不会倒地、击退距离减半、被推下高台即死', () => {
    const b = mk(['. . . . . . . .', 'A L . . . . . .', '. . . . . . . B'], { A: A('a'), B: A('b'), L: E('l', { role: 'launcher' }) });
    const ev = b.melee('a', 'l');
    expect(types(ev)).not.toContain('down');
    expect(b.unit('l').pos).toEqual(v(3, 1)); // 击退 4 → 2 格
    const b2 = mk(['. A . B', '. L . .', '. . . .'], { A: A('a'), B: A('b'), L: E('l', { role: 'launcher' }) }, {}, {}, ['1111', '1111', '0000']);
    b2.melee('a', 'l');
    expect(b2.unit('l').ko).toBe(true);
  });
});

// =====================================================================
describe('Charge（不攻击就结束 → 下次攻击前的增益）', () => {
  it('待机 → Charge；下回合 Foresight 射程 +1，攻击后用掉', () => {
    const b = mk(['A . . . . . . 1', 'B . . . . . . .'], { A: A('a', { charge: 'foresight' }), B: A('b'), '1': E('e1') });
    expect(b.canShoot(b.unit('a'), b.unit('e1'))).toBe(false); // 距离 7 > 6
    expect(types(b.wait('a'))).toContain('charge');
    b.endPlayerPhase();
    expect(b.unit('a').charged).toBe(true);
    expect(b.gunRange(b.unit('a'))).toBe(7);
    const ev = b.shoot('a', 'e1');
    expect(types(ev)).toContain('chargeUsed');
    expect(b.unit('a').charged).toBe(false);
  });

  it('1 More 后不攻击结束也会 Charge；本回合攻击过的人不会 Charge；只移动后结束回合也会 Charge', () => {
    const b = mk(['. 1 . h . .', '. . . 2 . .', 'A . . B . C'], {
      A: A('a', { charge: 'phantomStep' }), B: A('b', { charge: 'phantomStep' }), C: A('c', { charge: 'phantomStep' }), '1': E('e1'), '2': E('e2'),
    });
    b.shoot('a', 'e1'); // 打倒 → 1 More
    expect(types(b.wait('a'))).toContain('charge');
    b.shoot('b', 'e2'); // 被掩体抵抗，攻击过
    b.move('c', v(5, 1));
    const ev = b.endPlayerPhase();
    const charged = pick(ev, 'charge').map((e) => e.unitId);
    expect(charged).toContain('c');
    expect(charged).not.toContain('b');
    expect(b.moveRange(b.unit('a'))).toBe(5); // Phantom Step +1
  });

  it('Ferocious Lion 击退 +1；Over Powered ×1.2；Bullet Break 枪击打倒掩体里的目标；关闭 charge 选项则不生效', () => {
    const b = mk(['A 1 . . . . . . .', '. . . . . . . . .'], { A: A('a', { charge: 'ferociousLion' }), '1': E('e1') });
    b.unit('a').charged = true;
    b.melee('a', 'e1');
    expect(b.unit('e1').pos).toEqual(v(6, 0));
    const b2 = mk(['A 1 . .'], { A: A('a', { charge: 'overPowered' }), '1': E('e1') });
    b2.unit('a').charged = true;
    expect(dmgOf(b2.shoot('a', 'e1'))[0].amount).toBe(12);
    const b3 = mk(['A . h .', '. . 1 .'], { A: A('a', { charge: 'bulletBreak' }), '1': E('e1') });
    b3.unit('a').charged = true;
    const ev3 = b3.shoot('a', 'e1');
    expect(dmgOf(ev3)[0].resist).toBe(true);
    expect(types(ev3)).toEqual(expect.arrayContaining(['down', 'oneMore']));
    const b4 = mk(['A . . .', 'B . . .'], { A: A('a', { charge: 'foresight' }), B: A('b') }, {}, { charge: false });
    expect(types(b4.wait('a'))).not.toContain('charge');
  });
});

// =====================================================================
describe('Voltage / Unique 技能', () => {
  it('我方造成/受到伤害都涨 Voltage；未满不能用；Phantom Judge 打倒掩体里的目标并清空槽', () => {
    const b = mk(['A . h . .', '. . 1 2 .', '. . . . .', 'B . . . .'], { A: A('a', { unique: UNIQUES.phantomJudge }), B: A('b'), '1': E('e1'), '2': E('e2') });
    expect(b.canSkill(b.unit('a'), UNIQUES.phantomJudge, b.unit('e1'))).toBe(false);
    b.shoot('b', 'e2');
    expect(b.voltage).toBeGreaterThan(0);
    b.voltage = VOLTAGE_MAX;
    const ev = b.skill('a', 'phantomJudge', 'e1');
    expect(types(ev)).toContain('uniqueSkill');
    expect(b.unit('e1').downed).toBe(true); // 在掩体里也被打倒
    expect(b.voltage).toBeLessThan(VOLTAGE_MAX);
    expect(b.unit('a').sp).toBe(100); // 不耗 SP
  });

  it('Brigantine Blitzkrieg：直线上所有敌人受伤并感电', () => {
    const b = mk(['A 1 2 . 3 . 4', 'B . . . . . .'], { A: A('a', { unique: UNIQUES.brigantine }), B: A('b'), '1': E('e1'), '2': E('e2'), '3': E('e3'), '4': E('e4') });
    b.voltage = VOLTAGE_MAX;
    const ev = b.skill('a', 'brigantine', 'e1');
    expect(pick(ev, 'status').map((s) => s.unitId).sort()).toEqual(['e1', 'e2', 'e3']); // 长度 5：e4 在第 6 格
  });

  it('Femme Fatale / Pathway to the Ball：用完还能再行动；Pathway 本回合移动力 +99', () => {
    const b = mk(['A . . 1 . .', 'B . . . . .'], { A: A('a', { unique: UNIQUES.femmeFatale }), B: A('b', { unique: UNIQUES.pathway }), '1': E('e1') });
    b.voltage = VOLTAGE_MAX;
    b.skill('a', 'femmeFatale', 'e1');
    expect(b.unit('a').acted).toBe(false);
    b.voltage = VOLTAGE_MAX;
    b.unique('b');
    expect(b.unit('b').acted).toBe(false);
    expect(b.moveRange(b.unit('b'))).toBeGreaterThan(90);
  });

  it('Winds of Time 吹飞周围敌人；Full Throttle 直线击退；Noble Lady 把范围内敌人拉向目标', () => {
    const b = mk(['. . . . . . . . .', '. . . . 1 . . . .', '. . . 2 A . . . .', '. . . . . . . . .', '. . . . . . . . .', 'B . . . . . . . .'], { A: A('a', { unique: UNIQUES.windsOfTime }), B: A('b'), '1': E('e1'), '2': E('e2') });
    b.voltage = VOLTAGE_MAX;
    b.unique('a');
    expect(b.unit('e2').pos.x).toBeLessThan(3);
    const b2 = mk(['A 1 . . . . . .', 'B . . . . . . .'], { A: A('a', { unique: UNIQUES.fullThrottle }), B: A('b'), '1': E('e1') });
    b2.voltage = VOLTAGE_MAX;
    b2.skill('a', 'fullThrottle', 'e1');
    expect(b2.unit('e1').pos).toEqual(v(5, 0));
    const b3 = mk(['A . . . . . .', '. . . . . . .', '. . . 1 . 2 .', 'B . . . . . .'], { A: A('a', { unique: UNIQUES.nobleLady }), B: A('b'), '1': E('e1'), '2': E('e2') });
    b3.voltage = VOLTAGE_MAX;
    b3.skill('a', 'nobleLady', 'e1');
    expect(b3.unit('e2').pos).toEqual(v(4, 2));
  });
});

// =====================================================================
describe('元素效果（P5T 按效果分类）', () => {
  it('Agi 灼烧：击退 1 格；对方阶段开始掉 20% MaxHP，不会致死', () => {
    const b = mk(['A 1 . .', 'B . . .'], { A: A('a', { skills: [SKILLS.agi] }), B: A('b'), '1': E('e1') });
    b.skill('a', 'agi', 'e1');
    expect(b.unit('e1').pos).toEqual(v(2, 0));
    b.unit('e1').hp = 10;
    const ev = b.endPlayerPhase();
    expect(dmgOf(ev, 'e1')[0]).toMatchObject({ amount: 9, source: 'status' });
    expect(b.unit('e1').hp).toBe(1);
  });

  it('Bufu 冻结：下回合不能行动；受伤即解冻；带异常的单位无 Resistance → 可打倒', () => {
    const b = mk(['A h . .', 'B 1 . .', '. . . C'], { A: A('a', { skills: [SKILLS.bufu] }), B: A('b'), C: A('c'), '1': E('e1', { melee: 30 }) });
    b.skill('a', 'bufu', 'e1');
    expect(b.unit('e1').downed).toBe(false); // 掩体里：本次不倒
    const ev = b.shoot('c', 'e1');
    expect(types(ev)).toEqual(expect.arrayContaining(['statusEnd', 'down']));
    const b2 = mk(['A h . .', 'B 1 . .'], { A: A('a', { skills: [SKILLS.bufu] }), B: A('b'), '1': E('e1', { melee: 30 }) });
    b2.skill('a', 'bufu', 'e1');
    const ev2 = b2.endPlayerPhase();
    expect(pick(ev2, 'skipTurn')[0]).toMatchObject({ unitId: 'e1', reason: 'freeze' });
    expect(pick(ev2, 'attack').filter((e) => e.attackerId === 'e1')).toHaveLength(0);
  });

  it('Zio 感电：不能移动；Partisan 遗忘：不能攻击', () => {
    // P5T 表：Zio 射程 3（10-23 数据导入后），目标放在 3 格处
    const b = mk(['A . . 1 .', 'B . . . .'], { A: A('a', { skills: [SKILLS.zio] }), B: A('b'), '1': E('e1', { move: 3, melee: 5 }) });
    b.skill('a', 'zio', 'e1');
    b.endPlayerPhase();
    expect(b.unit('e1').pos).toEqual(v(3, 0));
    const b2 = mk(['A 1 . .', 'B . . .'], { A: A('a', { skills: [SKILLS.partisan] }), B: A('b'), '1': E('e1', { melee: 30 }) });
    b2.skill('a', 'partisan', 'e1');
    const ev2 = b2.endPlayerPhase();
    expect(pick(ev2, 'attack').filter((e) => e.attackerId === 'e1')).toHaveLength(0);
    expect(b2.unit('a').hp).toBe(100);
  });

  it('Garu 吹飞：沿攻击方向飞 4 格、越过障碍', () => {
    const b = mk(['A 1 # # . . .', 'B . . . . . .'], { A: A('a', { skills: [SKILLS.garu] }), B: A('b'), '1': E('e1') });
    b.skill('a', 'garu', 'e1');
    expect(b.unit('e1').pos).toEqual(v(5, 0));
  });

  it('Psi 催眠：拉近 4 格，会绕开障碍', () => {
    const b = mk(['A . . . . .', '# # # # 1 .', 'B . . . . .'], { A: A('a', { skills: [SKILLS.psi] }), B: A('b'), '1': E('e1') });
    const ev = b.skill('a', 'psi', 'e1');
    expect(types(ev)).toContain('pull');
    expect(b.unit('e1').pos).toEqual(v(1, 0));
  });

  it('Frei 漩涡：范围内的敌人被拉向中心', () => {
    // P5T 表：Frei 射程 3（10-23 数据导入后），A 站 (1,4)
    const b = mk(['. . . . . . .', '. . . 3 . . .', '. . . . . . .', '. . . 1 . 2 .', '. A . . . . .', 'B . . . . . .'], { A: A('a', { skills: [SKILLS.frei] }), B: A('b'), '1': E('e1'), '2': E('e2'), '3': E('e3') });
    b.skill('a', 'frei', 'e1');
    expect(b.unit('e2').pos).toEqual(v(4, 3));
    expect(b.unit('e3').pos).toEqual(v(3, 2));
  });

  it('Kouha 眩晕：阶段开始随机移动，之后不能自主移动', () => {
    const b = mk(['A . . . . .', '. . . 1 . .', 'B . . . . .'], { A: A('a', { skills: [SKILLS.kouha] }), B: A('b'), '1': E('e1', { move: 3 }) });
    b.skill('a', 'kouha', 'e1');
    const ev = b.endPlayerPhase();
    expect(pick(ev, 'move').filter((e) => e.unitId === 'e1')).toHaveLength(0);
    expect(types(ev).includes('dizzyMove') || eqPos(b.unit('e1').pos, v(3, 1))).toBe(true);
  });

  it('Eiha 绝望：目标下回合不能移动；施法者下一次移动 +2/目标（拿到 1 More 时立刻生效）', () => {
    const b = mk(['. . . . . .', '. . 1 2 . .', 'A . . . . .', 'B . . . . .'], { A: A('a', { skills: [SKILLS.eiha] }), B: A('b'), '1': E('e1', { move: 3 }), '2': E('e2', { move: 3 }) });
    const ev = b.skill('a', 'eiha', 'e1');
    expect(types(ev)).toContain('oneMore');
    expect(b.moveRange(b.unit('a'))).toBe(4 + DESPAIR_MOVE * 2);
    const ev2 = b.endPlayerPhase();
    expect(pick(ev2, 'skipTurn').map((s) => s.reason)).toContain('despair');
  });

  it('睡眠：2 回合不能行动、阶段开始回复，受伤即醒', () => {
    const b = mk(['A . . . 1', 'B . . . .'], { A: A('a', { skills: [SKILLS.dormina] }), B: A('b'), '1': E('e1', { maxHp: 100, melee: 5, move: 4 }) });
    b.skill('a', 'dormina', 'e1');
    b.unit('e1').hp = 50;
    const ev = b.endPlayerPhase();
    expect(pick(ev, 'skipTurn')[0].reason).toBe('sleep');
    expect(b.unit('e1').hp).toBe(60);
    const ev2 = b.shoot('b', 'e1');
    expect(pick(ev2, 'statusEnd')[0]).toMatchObject({ status: 'sleep', reason: 'damage' });
  });

  it('回复与辅助：Dia / Diamrita 解异常 / Media 全体；Tarukaja 攻↑、Rakukaja 防↑、Sukukaja 移动 +3', () => {
    const b = mk(['A B C . . . 1'], { A: A('a', { skills: [SKILLS.dia, SKILLS.diamrita, SKILLS.media, SKILLS.tarukaja, SKILLS.rakukaja, SKILLS.sukukaja] }), B: A('b'), C: A('c'), '1': E('e1') });
    b.unit('b').hp = 50;
    b.skill('a', 'dia', 'b');
    expect(b.unit('b').hp).toBe(50 + Math.round(65 * 0.5));
    const a = b.unit('a');
    b.unit('c').status.push({ id: 'shock', turns: 1 });
    a.acted = false; b.skill('a', 'diamrita', 'c');
    expect(b.unit('c').status).toHaveLength(0);
    b.unit('b').hp = 10; b.unit('c').hp = 10;
    a.acted = false; b.skill('a', 'media', 'a');
    expect(b.unit('b').hp).toBeGreaterThan(10);
    expect(b.unit('c').hp).toBeGreaterThan(10);
    a.acted = false; b.skill('a', 'sukukaja', 'b');
    expect(b.moveRange(b.unit('b'))).toBe(4 + 3);
    a.acted = false; b.skill('a', 'tarukaja', 'c');
    b.unit('c').acted = false;
    expect(dmgOf(b.shoot('c', 'e1'))[0].amount).toBe(13);
  });
});

function eqPos(a: Vec, b2: Vec) { return a.x === b2.x && a.y === b2.y; }

// =====================================================================
describe('Triple Threat', () => {
  it('倒地敌人在三名我方的三角内 → 可总攻；伤害 = 三人（近战+枪攻）之和 × 倍率', () => {
    const b = mk(['. . P . 3', '. . . . .', '. . 1 . .', '. . 2 . .', 'J . . . S'], {
      J: A('j'), S: A('s'), P: A('p'), '1': E('e1'), '2': E('e2'), '3': E('e3'),
    });
    expect(b.triangleVictims().sort()).toEqual(['e1', 'e2']);
    expect(types(b.shoot('j', 'e1'))).toContain('tripleThreatReady');
    const ev2 = b.tripleThreat();
    expect(pick(ev2, 'tripleThreat')[0].victims.sort()).toEqual(['e1', 'e2']);
    expect(dmgOf(ev2)[0].amount).toBe(Math.round(3 * 20 * TRIPLE_THREAT_MULT));
    expect(b.unit('e3').hp).toBe(100);
    expect(b.unit('j').acted).toBe(true);
  });

  it('我方有除灼烧/绝望外的异常时不能总攻', () => {
    const b = mk(['. . P . .', '. . . . .', '. . 1 . .', '. . . . .', 'J . . . S'], { J: A('j'), S: A('s'), P: A('p'), '1': E('e1') });
    b.shoot('j', 'e1');
    b.unit('s').status.push({ id: 'shock', turns: 1 });
    expect(b.pendingTriple).toBeNull();
    b.unit('s').status = [{ id: 'burn', turns: 1 }];
    expect(b.pendingTriple).not.toBeNull();
  });

  it('打倒后让未行动的队友走位围出三角，再发动；不在三角内则只给 1 More', () => {
    const b = mk(['. . 1 . .', '. . . . .', 'J . S P .', '. . . . .'], { J: A('j'), S: A('s'), P: A('p'), '1': E('e1') });
    expect(types(b.shoot('j', 'e1'))).not.toContain('tripleThreatReady');
    b.move('p', v(4, 0));
    b.move('s', v(1, 0));
    expect(b.pendingTriple?.victims).toContain('e1');
    expect(types(b.tripleThreat())).toContain('tripleThreat');
    expect(pointInTriangle(v(1, 0), v(0, 0), v(2, 0), v(1, 2))).toBe(true);
    expect(pointInTriangle(v(1, 0), v(0, 0), v(1, 0), v(2, 0))).toBe(false);
  });
});

// =====================================================================
describe('特殊敌人（Cogito AAA115）', () => {
  it('Revenger：被打后跳到攻击者身边近战反击，空地上的攻击者被打倒', () => {
    const b = mk(['. . . h . .', 'A . . R . .', 'B . . . . .'], { A: A('a'), B: A('b'), R: E('r', { role: 'revenger', melee: 20 }) });
    const ev = b.shoot('a', 'r');
    expect(types(ev)).toContain('counter');
    expect(dmgOf(ev, 'a')[0]).toMatchObject({ amount: 20, source: 'counter' });
    expect(b.unit('a').downed).toBe(true);
    expect(eqPos(b.unit('r').pos, v(1, 1))).toBe(true);
  });

  it('Shielder：正面枪击被挡；侧面可打倒；近战/技能只造成伤害、不倒地、转向攻击者、不被击退', () => {
    const b = mk(['. . N . .', '. . 1 . W', '. . F . .'], { N: A('n'), W: A('w'), F: A('f'), '1': E('sh', { role: 'shielder', facing: v(0, 1) }) });
    expect(pick(b.shoot('f', 'sh'), 'miss')[0].reason).toBe('shield');
    const ev = b.melee('n', 'sh');
    expect(types(ev)).not.toContain('down');
    expect(b.unit('sh').pos).toEqual(v(2, 1));
    expect(b.unit('sh').facing).toEqual(v(0, -1));
    const b2 = mk(['. . . . .', '. . 1 . W', '. . . . .'], { W: A('w'), '1': E('sh', { role: 'shielder', facing: v(0, 1) }) });
    expect(types(b2.shoot('w', 'sh'))).toContain('down');
  });

  it('Teleporter：被打后与攻击者换位', () => {
    const b = mk(['A . . T', 'B . . .'], { A: A('a'), B: A('b'), T: E('t', { role: 'teleporter' }) });
    b.shoot('a', 't');
    expect(b.unit('a').pos).toEqual(v(3, 0));
    expect(b.unit('t').pos).toEqual(v(0, 0));
  });

  it('Launcher：把身边的同伴扔到我方身边；把身边的我方扔下高台', () => {
    const b = mk(['. . L V . . .', '. . . . . . .', '. . . . . . .', '. . . . . A .'], { A: A('a'), L: E('l', { role: 'launcher', melee: 10 }), V: E('vv') });
    const ev = b.endPlayerPhase();
    expect(types(ev)).toContain('throw');
    expect(Math.abs(b.unit('vv').pos.x - 5) + Math.abs(b.unit('vv').pos.y - 3)).toBe(1);
    const b2 = mk(['. L .', '. A .', '. . .', '. . .', '. . .', '. . .'], { A: A('a'), L: E('l', { role: 'launcher', melee: 10 }) }, {}, {}, ['111', '111', '000', '000', '000', '000']);
    const ev2 = b2.endPlayerPhase();
    expect(types(ev2)).toEqual(expect.arrayContaining(['throw', 'fall']));
    expect(b2.grid.h(b2.unit('a').pos)).toBe(0);
  });

  it('Supporter：给受伤的同伴回复', () => {
    const b = mk(['A . . . . . . . . . .', '. . . . . . . . 1 . S'], { A: A('a'), '1': E('e1'), S: E('s', { role: 'supporter', maxSp: 99, skills: [SKILLS.dia] }) });
    b.unit('e1').hp = 30;
    b.unit('s').alert = true; // ENEMY-AI.md：敌人初始 idle，8 格外不会自己醒
    const ev = b.endPlayerPhase();
    expect(pick(ev, 'heal')[0].unitId).toBe('e1');
  });

  it('Loudspeaker：范围内做被禁止的行动 → 受惩罚并失去 Resistance', () => {
    const b = mk(['. . A . 1', '. . . . .', '. . s . .'], { A: A('a'), '1': E('e1'), s: prop('sp', 'speaker', { bans: ['gun'] }) });
    const ev = b.shoot('a', 'e1');
    expect(types(ev)).toContain('penalty');
    expect(b.unit('a').hp).toBe(80);
  });
});

// =====================================================================
describe('地图物件', () => {
  it('油桶：被打爆炸，2 格内单位受伤、被吹飞、失去 Resistance，并连锁引爆', () => {
    const b = mk(['A . . . . . .', '. . X 1 . . .', '. . . . . . .', '. . Y . . . .', 'B . . . . 2 .'], {
      A: A('a'), B: A('b'), X: prop('b1', 'barrel'), Y: prop('b2', 'barrel'), '1': E('e1'), '2': E('e2'),
    });
    const ev = b.shoot('a', 'b1');
    expect(pick(ev, 'explode').map((e) => e.unitId)).toEqual(['b1', 'b2']);
    expect(dmgOf(ev, 'e1')[0].source).toBe('explosion');
    expect(b.unit('e1').resistBroken).toBe(true);
    expect(b.unit('e1').pos.x).toBeGreaterThan(3);
  });

  it('木箱：提供掩体；近战可以把它推飞', () => {
    const b = mk(['. . . . . . .', '. A X . . . .', '. . 1 . . . .'], { A: A('a'), X: prop('box', 'box'), '1': E('e1') });
    expect(b.grid.hasAnyCover(b.unit('e1').pos)).toBe(2);
    b.melee('a', 'box');
    expect(b.unit('box').pos).toEqual(v(6, 1));
    expect(b.grid.hasAnyCover(b.unit('e1').pos)).toBe(0);
  });
});

// =====================================================================
describe('关卡目标与奖励', () => {
  it('护送：护送对象到达出口即胜；护送对象倒下即败；护送对象不能攻击', () => {
    const b = mk(['T . E', 'A . .', '. . 1'], { T: A('t', { escort: true, melee: 0, gun: undefined }), A: A('a'), '1': E('e1') }, { win: { type: 'reachExit', unitId: 't' } });
    expect(types(b.melee('t', 'e1'))).toContain('error');
    b.move('a', v(2, 0)); // 别人先到出口不算
    expect(b.phase).toBe('player');
    b.move('a', v(1, 1));
    b.move('t', v(2, 0));
    expect(b.phase).toBe('won');
    const b2 = mk(['T 1', 'A .'], { T: A('t', { escort: true, maxHp: 5 }), A: A('a'), '1': E('e1', { melee: 30 }) }, { win: { type: 'reachExit', unitId: 't' } });
    const ev = b2.endPlayerPhase();
    expect(pick(ev, 'result')[0].reason).toBe('护送对象倒下');
  });

  it('全员到达 / 除指定敌人外全灭（误伤即败）/ 击败多个目标 / 坚持 N 回合 / 回合上限', () => {
    const all = mk(['A E', 'B E', '. 1'], { A: A('a'), B: A('b'), '1': E('e1') }, { win: { type: 'reachExit', all: true } });
    all.move('a', v(1, 0));
    expect(all.phase).toBe('player');
    all.move('b', v(1, 1));
    expect(all.phase).toBe('won');
    const ex = mk(['A 1 2 .'], { A: A('a'), '1': E('e1', { maxHp: 5 }), '2': E('skullx', { maxHp: 5 }) }, { win: { type: 'defeatAllExcept', exceptIds: ['skullx'] } });
    ex.shoot('a', 'e1');
    expect(ex.phase).toBe('won');
    const ex2 = mk(['A 2 1 .'], { A: A('a'), '1': E('e1', { maxHp: 5 }), '2': E('skullx', { maxHp: 5 }) }, { win: { type: 'defeatAllExcept', exceptIds: ['skullx'] } });
    ex2.shoot('a', 'skullx');
    expect(ex2.phase).toBe('lost');
    const tg = mk(['A 1 2 3'], { A: A('a'), '1': E('t1', { maxHp: 5 }), '2': E('t2', { maxHp: 5 }), '3': E('e3') }, { win: { type: 'defeatTarget', targetIds: ['t1', 't2'] } });
    tg.shoot('a', 't1');
    expect(tg.phase).toBe('player');
    tg.unit('a').acted = false;
    tg.shoot('a', 't2');
    expect(tg.phase).toBe('won');
    const sv = mk(['A . . 1'], { A: A('a'), '1': E('e1') }, { win: { type: 'survive', turns: 2 } });
    sv.endPlayerPhase();
    expect(sv.phase).toBe('player');
    sv.endPlayerPhase();
    expect(sv.phase).toBe('won');
    const tl = mk(['A . . 1'], { A: A('a'), '1': E('e1') }, { turnLimit: 1 });
    tl.endPlayerPhase();
    expect(tl.phase).toBe('lost');
  });

  it('奖励栏：通关 / N 回合内 / 无人 KO / 击败全部 / 受伤少于 N 次', () => {
    const b = mk(['A 1', '. .'], { A: A('a'), '1': E('e1', { maxHp: 5 }) }, {
      bonus: [{ type: 'clear' }, { type: 'withinTurns', n: 1 }, { type: 'noKo' }, { type: 'defeatAll' }, { type: 'hurtFewerThan', n: 1 }],
    });
    const r = pick(b.shoot('a', 'e1'), 'result')[0];
    expect(r.outcome).toBe('won');
    expect(r.crowns.count).toBe(5);
    expect(r.crowns.items.map((i) => i.id)).toEqual(['clear', 'withinTurns', 'noKo', 'defeatAll', 'hurtFewerThan']);
  });
});

// =====================================================================
describe('Baton Pass / 难度', () => {
  it('队员倒下 → 可换替补上场（出现在倒下位置），次数按难度扣', () => {
    const b = mk(['A 1 . .', '. . . B'], { A: A('a', { maxHp: 5 }), B: A('b'), '1': E('e1', { melee: 30 }) }, { reserves: [A('r')] });
    const ev = b.endPlayerPhase();
    expect(types(ev)).toContain('batonPassReady');
    expect(b.phase).toBe('player');
    const ev2 = b.batonPass('a', 'r');
    expect(pick(ev2, 'batonPass')[0]).toMatchObject({ outId: 'a', inId: 'r', left: 2 });
    expect(b.unit('r').pos).toEqual(v(0, 0));
    expect(b.alive('ally').map((u) => u.id).sort()).toEqual(['b', 'r']);
    const m = mk(['A .'], { A: A('a') }, { reserves: [A('r')] }, { difficulty: 'merciless' });
    expect(m.batonLeft).toBe(1);
  });

  it('全员倒下且没有替补 → 失败；默认 Joker 倒下不直接失败（leaderKoLoses 可开）', () => {
    const b = mk(['A 1'], { A: A('a', { maxHp: 5 }), '1': E('e1', { melee: 30 }) });
    b.endPlayerPhase();
    expect(b.phase).toBe('lost');
    const j = mk(['J 1 . .', '. . . B'], { J: A('j', { maxHp: 5, isLeader: true }), B: A('b'), '1': E('e1', { melee: 30 }) });
    j.endPlayerPhase();
    expect(j.phase).toBe('player');
    const j2 = mk(['J 1 . .', '. . . B'], { J: A('j', { maxHp: 5, isLeader: true }), B: A('b'), '1': E('e1', { melee: 30 }) }, {}, { leaderKoLoses: true });
    j2.endPlayerPhase();
    expect(j2.phase).toBe('lost');
  });

  it('难度倍率作用于敌人 HP/攻击（Cogito AAA100）', () => {
    const b = mk(['A 1'], { A: A('a'), '1': E('e1', { melee: 20 }) }, {}, { difficulty: 'merciless' });
    expect(b.unit('e1').maxHp).toBe(150);
    expect(b.unit('e1').melee).toBe(30);
    const s = mk(['A 1'], { A: A('a'), '1': E('e1', { melee: 20 }) }, {}, { difficulty: 'safety' });
    expect(s.unit('e1').maxHp).toBe(50);
    expect(s.batonLeft).toBe(Infinity);
  });
});

// =====================================================================
describe('敌方回合 AI', () => {
  it('敌人显示意图，会移动并攻击最近的我方', () => {
    const b = mk(['. . . . . .', '. . . . . 1', 'A . . . . .'], { A: A('a'), '1': E('e1', { move: 5, melee: 10, maxHp: 50 }) });
    expect(b.intents[0].targetId).toBe('a');
    expect(b.intents[0].threatTiles.length).toBeGreaterThan(0);
    const ev = b.endPlayerPhase();
    expect(types(ev)).toEqual(expect.arrayContaining(['enemyThink', 'move', 'attack', 'damage']));
    expect(b.unit('a').hp).toBeLessThan(100);
  });

  it('敌人打倒空地上的我方也获得 1 More；我方在掩体旁则不会被打倒', () => {
    const b = mk(['A . 1 . B', '. . . . h'], { A: A('a'), B: A('b'), '1': E('e1', { role: 'shooter', gun: { power: 4, range: 5 } }) });
    const ev = b.endPlayerPhase();
    expect(types(ev)).toContain('oneMore');
    const downs = pick(ev, 'down').map((d) => d.unitId);
    expect(downs).toContain('a');
    expect(downs).not.toContain('b');
  });

  it('Shooter 只开枪、倾向站到掩体后', () => {
    const b = mk(['A . . . . .', '. . . . . .', '. . . h . .', '. . . . . 1'], { A: A('a'), '1': E('e1', { role: 'shooter', move: 3, melee: 30, gun: { power: 8, range: 7 } }) });
    const ev = b.endPlayerPhase();
    expect(b.grid.hasAnyCover(b.unit('e1').pos)).toBeGreaterThan(0);
    expect(pick(ev, 'attack').filter((e) => e.attackerId === 'e1').every((e) => e.kind === 'gun')).toBe(true);
  });
});

// =====================================================================
type Choice = { dest: Vec | null; target: string; kind: 'melee' | 'gun' | 'skill'; skill?: string; score: number };
/** 贪心自动玩家（测试用）：优先打出倒地，其次伤害最高；用 Triple Threat；倒人就 Baton Pass */
function autoplay(b: Battle, maxSteps = 400) {
  let guard = 0;
  while (b.phase === 'player' && guard++ < maxSteps) {
    const ko = b.units.find((u) => u.side === 'ally' && u.ko && !u.escort);
    if (ko && b.reserves.length && b.batonLeft > 0) { b.batonPass(ko.id, b.reserves[0].id); continue; }
    if (b.pendingTriple) { b.tripleThreat(); continue; }
    const u = b.alive('ally').find((a) => !a.acted);
    if (!u) { b.endPlayerPhase(); continue; }
    if (u.escort || b.noAction.has(u.id)) {
      const ex = b.moveTiles(u).filter((p) => b.grid.tile(p) === 'exit');
      if (ex.length) { b.move(u.id, ex[0]); continue; }
      const goal = { x: b.map.width - 1, y: 0 };
      const tiles = b.moveTiles(u).sort((p, q) => Math.abs(p.x - goal.x) + Math.abs(p.y - goal.y) - Math.abs(q.x - goal.x) - Math.abs(q.y - goal.y));
      const safe = tiles.find((p) => b.grid.hasAnyCover(p)) ?? tiles[0];
      if (safe && !u.moved) b.move(u.id, safe);
      b.wait(u.id);
      continue;
    }
    let best: Choice | null = null;
    const dests = u.moved ? [u.pos] : [u.pos, ...b.moveTiles(u)];
    for (const d of dests) for (const e of b.alive('enemy')) {
      const opts: { kind: 'melee' | 'gun' | 'skill'; skill?: string; ok: boolean }[] = [
        { kind: 'melee', ok: b.canMelee(u, e, d) },
        { kind: 'gun', ok: b.canShoot(u, e, d) },
        ...u.skills.filter((s) => s.kind === 'attack').map((s) => ({ kind: 'skill' as const, skill: s.id, ok: b.canSkill(u, s, e, d) })),
      ];
      for (const o of opts) {
        if (!o.ok) continue;
        const pv = b.previewDamage(u, e, o.kind, o.skill ? u.skills.find((s) => s.id === o.skill) : undefined, d);
        const score = (pv.willDown ? 50 : 0) + pv.amount - (o.kind === 'skill' ? 4 : 0) + b.grid.hasAnyCover(d) * 3;
        if (!best || score > best.score) best = { dest: eqPos(d, u.pos) ? null : d, target: e.id, kind: o.kind, skill: o.skill, score };
      }
    }
    if (!best) {
      const e = b.alive('enemy')[0];
      const tiles = b.moveTiles(u).sort((p, q) => Math.abs(p.x - e.pos.x) + Math.abs(p.y - e.pos.y) - Math.abs(q.x - e.pos.x) - Math.abs(q.y - e.pos.y));
      if (tiles[0] && !u.moved) b.move(u.id, tiles[0]);
      b.wait(u.id);
      continue;
    }
    if (best.dest) b.move(u.id, best.dest);
    if (best.kind === 'melee') b.melee(u.id, best.target);
    else if (best.kind === 'gun') b.shoot(u.id, best.target);
    else b.skill(u.id, best.skill!, best.target);
  }
}

describe('测试图整关（贪心自动玩家）', () => {
  it('测试图 1（高台与追击）能打完', () => {
    const b = new Battle(testMap());
    b.start();
    autoplay(b);
    expect(b.phase).toBe('won');
    expect(b.turn).toBeLessThanOrEqual(12);
  });

  it('其余测试图都能跑到结束且不报错', () => {
    for (const make of [followUpMap, specialsMap, escortMap, rangeMapA, rangeMapB]) {
      const b = new Battle(make());
      const errors: string[] = [];
      b.on((e) => { if (e.type === 'error') errors.push(e.message); });
      b.start();
      autoplay(b, 600);
      expect(['won', 'lost', 'player']).toContain(b.phase);
      expect(errors).toEqual([]);
    }
  });

  it('教学图：Joker 把掩体里的 Pixie 推下高台 → 龙司 Follow-Up → 1 More；龙司打油桶 → 两个敌人被吹飞', () => {
    const b = new Battle(followUpMap());
    b.start();
    const ev = b.melee('joker', 'pixie2');
    expect(types(ev)).toEqual(expect.arrayContaining(['fall', 'followUp', 'down', 'oneMore']));
    const ev2 = b.shoot('panther', 'barrel2');
    expect(pick(ev2, 'explode')).toHaveLength(1);
    expect(dmgOf(ev2).filter((d) => d.source === 'explosion').map((d) => d.unitId).sort()).toEqual(['bicorn2', 'jack2']);
  });

  it('公开数据：Joker Lv19 HP136 / SP49 / 移动 6 / 近战 21 / 枪攻 17 / 射程 8', () => {
    expect([JOKER.maxHp, JOKER.maxSp, JOKER.move, JOKER.melee, JOKER.gun!.power, JOKER.gun!.range]).toEqual([136, 49, 6, 21, 17, 8]);
    expect([SKILLS.agi.power, SKILLS.agi.sp, SKILLS.zio.power, SKILLS.eiha.power]).toEqual([45, 14, 45, 35]);
  });
});
