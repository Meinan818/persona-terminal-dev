// 第 1c 步新规则：Guard 时机、敌人 AI、地图机关、关卡事件、新 Unique、第二 Charge、被动框架、Triple Threat 修正、Dash 细节
import { describe, expect, it } from 'vitest';
import {
  Battle, parseMap, SKILLS, UNIQUES, FOX, ERINA, CROW, JOKER, mechMap, bossMap, enemy, CHARGES, IRONCLAD_MULT, RESIST_MULT,
  TRUMP_HEAL_POWER, HEAL_SCALE, VOLTAGE_MAX, MAPS,
} from '../src/rules';
import type { MapDef, UnitDef, BattleEvent, RuleOptions, Vec } from '../src/rules';

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
const v = (x: number, y: number): Vec => ({ x, y });
const eq = (a: Vec, b: Vec) => a.x === b.x && a.y === b.y;
const setRng = (b: Battle, x: number) => { (b as unknown as { rng: () => number }).rng = () => x; };

// =====================================================================
describe('Guard 时机（回合结束时贴掩体才获得）', () => {
  it('开场贴掩体的单位带 Guard；回合中走到掩体旁不会立刻有 Guard，回合结束才有', () => {
    const b = mk(['A . . .', '. . h .', '. . . .', '. . . 1'], { A: A('a'), '1': E('e1') });
    const a = b.unit('a');
    expect(a.guard).toBe(false);
    b.move('a', v(2, 0)); // 紧贴 (2,1) 的半掩体
    expect(b.grid.hasAnyCover(a.pos)).toBe(1);
    expect(a.guard).toBe(false);
    expect(b.hasResistance(a, v(3, 3))).toBe(false);
    const ev = b.endPlayerPhase();
    expect(pick(ev, 'guard').some((g) => g.unitId === 'a' && g.on)).toBe(true);
    expect(b.unit('a').guard).toBe(true);
    expect(b.hasResistance(b.unit('a'), v(3, 3))).toBe(true);
  });

  it('被近战/技能命中失去 Guard；被推离掩体失去 Guard；门打开让掩体消失也失去 Guard', () => {
    const b = mk(['. . h . . .', '. A 1 . . .', '. . . . . .'], { A: A('a'), '1': E('e1') });
    expect(b.unit('e1').guard).toBe(true);
    b.melee('a', 'e1');
    expect(b.unit('e1').guard).toBe(false);
    // 门：关着的门 = 墙 = 掩体；打开后贴门站的单位失去 Guard
    const b2 = mk(['. . . .', '. 1 . .', '. . . A'], { A: A('a'), '1': E('e1') }, { doors: [{ id: 'D', cells: [v(1, 0)], open: false }] });
    expect(b2.unit('e1').guard).toBe(true);
    b2.setDoor('D', true);
    expect(b2.unit('e1').guard).toBe(false);
    expect(types(b2.shoot('a', 'e1'))).toContain('down');
  });

  it('近战伤害不受 Guard 减免、枪受 ×0.7；Ironclad Guard 在掩体中再 ×0.6', () => {
    const b = mk(['. h . .', 'A 1 . .', '. . . B'], { A: A('a'), B: A('b'), '1': E('e1', { passives: ['ironcladGuard'] }) });
    const ev = b.shoot('b', 'e1');
    expect(dmgOf(ev)[0].amount).toBe(Math.round(10 * RESIST_MULT * IRONCLAD_MULT));
    expect(dmgOf(b.melee('a', 'e1'))[0].amount).toBe(10);
  });

  it('Never Say Die：Charge 中在空地也能在回合结束获得 Guard', () => {
    const b = mk(['A . . .', '. . . .', '. . . 1'], { A: A('a', { passives: ['neverSayDie'], charges: ['foresight'] }), '1': E('e1') });
    b.wait('a');
    expect(b.unit('a').charged).toBe(true);
    expect(b.unit('a').guard).toBe(true);
  });
});

// =====================================================================
describe('敌人 AI', () => {
  it('Revenger：每回合第一次被打只反击不倒地，然后失去 Resistance，下一击即可打倒；反击够不着也算用掉；下回合刷新', () => {
    const b = mk(['A . . . . . . . B', '. . . . . . . . .', '. . . . R . . . .'], { A: A('a', { gun: { power: 10, range: 9 } }), B: A('b', { gun: { power: 10, range: 9 } }), R: E('r', { role: 'revenger', melee: 20 }) });
    const ev = b.shoot('a', 'r'); // 距离 6 > 跳跃 4：够不着
    expect(types(ev)).not.toContain('down');
    expect(types(ev)).not.toContain('counter');
    expect(b.unit('r').counterReady).toBe(false);
    expect(b.unit('r').resistBroken).toBe(true);
    expect(types(b.shoot('b', 'r'))).toContain('down');
    b.endPlayerPhase();
    expect(b.unit('r').counterReady).toBe(true);
  });

  it('敌方 1 More 没有 3 次上限：空地上的 5 名我方可以被同一个敌人连锁打倒', () => {
    const b = mk([
      'A . B . C . D . F', '. . . . . . . . .', '. . . . . . . . .', '. . . . 1 . . . .',
    ], { A: A('a'), B: A('b'), C: A('c'), D: A('d'), F: A('f'), '1': E('e1', { role: 'shooter', gun: { power: 5, range: 12 } }) });
    b.unit('e1').move = 0;
    const ev = b.endPlayerPhase();
    expect(pick(ev, 'oneMore').filter((e) => e.unitId === 'e1').length).toBeGreaterThanOrEqual(4);
  });

  it('诱饵：Like a Phantom 放下 2 个诱饵、还能再行动；敌人优先打诱饵，诱饵一击消失；诱饵不算我方存活', () => {
    const b = mk(['F . . . . .', '. . . . . .', '. . . . . .', '. . . . . 1'], { F: { ...FOX, id: 'fox' }, '1': E('e1', { role: 'shooter', gun: { power: 10, range: 8 }, move: 0 }) });
    b.voltage = VOLTAGE_MAX;
    const ev = b.uniqueAt('fox', v(3, 2));
    expect(pick(ev, 'decoy').length).toBe(2);
    expect(b.unit('fox').acted).toBe(false);
    expect(b.mainAllies().map((u) => u.id)).toEqual(['fox']);
    b.wait('fox');
    const decoys = b.units.filter((u) => u.decoy);
    expect(decoys.some((d) => d.ko)).toBe(true);
    expect(b.unit('fox').hp).toBe(b.unit('fox').maxHp);
  });

  it('近战敌人优先把目标推下高台', () => {
    const b = mk(['. . . .', '. 1 A .', '. . . .'], { A: A('a'), '1': E('e1', { melee: 10, move: 0 }) }, {}, {}, ['1110', '1110', '1110']);
    const ev = b.endPlayerPhase();
    expect(types(ev)).toContain('fall');
  });

  it('射手没东西打时会停在掩体旁（回合结束拿 Guard），盾兵转向自己的目标', () => {
    const b = mk(['1 . . . . . . . . . . . . . A', '. . h . . . . . . . . . . . .'], { A: A('a', { gun: { power: 10, range: 3 } }), '1': E('e1', { role: 'shooter', gun: { power: 5, range: 3 }, move: 3 }) });
    b.unit('e1').alert = true; // ENEMY-AI.md：敌人初始 idle，8 格外不会自己醒
    b.endPlayerPhase();
    expect(b.grid.hasAnyCover(b.unit('e1').pos)).toBeGreaterThan(0);
    expect(b.unit('e1').guard).toBe(true);
    const b2 = mk(['. 1 .', '. . .', 'A . .'], { A: A('a'), '1': E('s', { role: 'shielder', facing: v(1, 0), move: 0, gun: { power: 5, range: 1 } }) });
    b2.endPlayerPhase();
    expect(b2.unit('s').facing!.y).toBe(1);
  });

  it('Launcher 一次投掷身边最多 2 个单位；Supporter 可以把我方与敌人换位', () => {
    const b = mk(['. . . . . . .', '. . V L W . .', '. . . . . . .', '. . . . . . .', '. . . . . . A'], {
      A: A('a'), L: E('l', { role: 'launcher', melee: 10, move: 0 }), V: E('vv'), W: E('ww'),
    });
    const ev = b.endPlayerPhase();
    expect(pick(ev, 'throw').length).toBe(2);
    const b2 = mk(['A . 1', '. . 2'], { A: A('a'), '1': E('s', { role: 'supporter' }), '2': E('x') });
    b2.swapUnits(b2.unit('s'), b2.unit('a'), b2.unit('x'));
    expect(b2.unit('a').pos).toEqual(v(2, 1));
    expect(b2.unit('x').pos).toEqual(v(0, 0));
  });
});

// =====================================================================
describe('地图机关', () => {
  it('hold 开关：踩着时门开、离开就关；关着的门挡路挡视线；门上有人关不上', () => {
    const b = new Battle(mechMap()); b.start();
    expect(b.doorOpen('A')).toBe(false);
    expect(b.grid.walkable(v(5, 2))).toBe(false);
    b.move('skull', v(4, 1)); // hold 开关
    expect(b.doorOpen('A')).toBe(true);
    b.move('skull', v(4, 2));
    expect(b.doorOpen('A')).toBe(false);
  });

  it('toggle 开关：踩上去切换（A 开、B 关）；定时门每 2 回合开关一次', () => {
    const b = new Battle(mechMap()); b.start();
    expect(b.doorOpen('B')).toBe(true);
    b.move('panther', v(3, 4));
    expect(b.doorOpen('A')).toBe(true);
    expect(b.doorOpen('B')).toBe(false);
    expect(b.doorOpen('T')).toBe(true);
    b.endPlayerPhase(); // → 第 2 回合
    b.endPlayerPhase(); // → 第 3 回合：(3-1)%2==0 → 切换
    expect(b.doorOpen('T')).toBe(false);
  });

  it('升降台：开关切换高低；跳台只在两端都在高处时可用（梯子连接不同高度）', () => {
    const b = new Battle(mechMap()); b.start();
    const jumpLink = b.grid.links.find((l) => l.kind === 'jump')!;
    expect(b.grid.linkUsable(jumpLink)).toBe(false); // 升降台在低位 → (0,4) 高度 0
    b.move('panther', v(2, 7)); // 升降台开关
    expect(b.grid.h(v(0, 4))).toBe(2);
    expect(b.grid.linkUsable(jumpLink)).toBe(true);
    const ladder = b.grid.links.find((l) => l.kind === 'ladder')!;
    expect(b.grid.linkUsable(ladder)).toBe(true);
  });

  it('监视摄像头：我方走进监视范围 → 警报 + 援军，只触发一次', () => {
    const b = new Battle(mechMap()); b.start();
    b.move('panther', v(3, 4)); // 切换开关：A 开 B 关
    b.wait('panther');
    b.move('joker', v(2, 6)); // 梯子下来，Dash 后移动结束
    b.wait('joker');
    b.unit('skull').pos = v(4, 5); b.unit('skull').anchor = v(4, 5);
    b.setDoor('B', true);
    const ev = b.move('skull', v(6, 5));
    expect(types(ev)).toContain('alarm');
    expect(pick(ev, 'reinforce')[0].unitIds.sort()).toEqual(['r1', 'r2']);
    expect(b.alive('enemy').length).toBe(5);
  });
});

// =====================================================================
describe('关卡事件（援军 / Boss 阶段）', () => {
  it('第 2 回合敌方阶段出现援军；Boss HP 锁在 50%，打到 50% 进入第 2 阶段（回复、变身、召唤护卫）', () => {
    const b = new Battle(bossMap()); b.start();
    const boss = b.unit('boss');
    boss.hp = 160;
    b.applyDamage(boss, 100, 0, false, 'gun', b.unit('joker'));
    expect(boss.hp).toBe(150); // hpFloor
    const ev = b.flush(); void ev;
    b.checkEnd();
    expect(boss.bossPhase).toBe(2);
    expect(boss.role).toBe('brute');
    expect(boss.hp).toBe(150 + Math.round(300 * 0.2));
    expect(b.units.some((u) => u.id === 'gd1')).toBe(true);
    const b2 = new Battle(bossMap()); b2.start();
    b2.endPlayerPhase(); // 第 1 回合敌方
    expect(b2.units.some((u) => u.id === 'w1')).toBe(false);
    b2.endPlayerPhase(); // 第 2 回合敌方阶段开始时触发
    expect(b2.units.some((u) => u.id === 'w1')).toBe(true);
  });

  it('enemiesLeft 触发下一波：最后一个敌人倒下时先刷援军，不会直接判胜', () => {
    const b = mk(['A 1 . .'], { A: A('a', { melee: 200 }), '1': E('e1', { maxHp: 10 }) }, {
      events: [{ id: 'w', when: { type: 'enemiesLeft', n: 0 }, do: [{ type: 'spawn', units: [{ def: E('e2'), pos: v(3, 0) }] }] }],
    });
    b.melee('a', 'e1');
    expect(b.phase).toBe('player');
    expect(b.alive('enemy').map((e) => e.id)).toEqual(['e2']);
  });
});

// =====================================================================
describe('新 Unique（祐介/艾丽娜/明智）', () => {
  it('Flag of Freedom：插旗 → 半径内敌人失去掩护且回合结束拿不到 Guard；我方回合结束回复', () => {
    const b = mk(['R . . . . .', '. . . . h .', '. . . . 1 .', '. . . . . .'], { R: { ...ERINA, id: 'erina' }, '1': E('e1') });
    expect(b.unit('e1').guard).toBe(true);
    b.unit('erina').hp = 100;
    b.voltage = VOLTAGE_MAX;
    const ev = b.uniqueAt('erina', v(3, 2));
    expect(types(ev)).toContain('flagPlaced');
    expect(b.unit('e1').guard).toBe(false);
    b.endPlayerPhase();
    expect(b.unit('e1').guard).toBe(false); // 敌方回合结束也拿不到
    expect(b.unit('erina').hp).toBe(100); // 不在旗子半径内（距离 > 3）
    const b2 = mk(['R . . .', '. . . 1'], { R: { ...ERINA, id: 'erina' }, '1': E('e1') });
    b2.unit('erina').hp = 100; b2.voltage = VOLTAGE_MAX;
    b2.uniqueAt('erina', v(1, 0)); // 唯一的队员行动完 → 自动结束我方回合 → 旗子回复一次
    expect(b2.unit('erina').hp).toBe(100 + Math.round(178 * 0.1));
  });

  it('Truth Seeker：其余已行动的队员再行动一次；之后 3 回合 Voltage 不涨', () => {
    const b = mk(['C . A . B', '. . . . .', '. . . . 1'], { C: { ...CROW, id: 'crow' }, A: A('a'), B: A('b'), '1': E('e1') });
    b.wait('a');
    b.voltage = VOLTAGE_MAX;
    b.unique('crow');
    expect(b.unit('a').acted).toBe(false);
    expect(b.voltage).toBe(0);
    b.shoot('b', 'e1');
    expect(b.voltage).toBe(0);
  });
});

// =====================================================================
describe('第二个 Charge 技能 / 被动框架', () => {
  it('每人两个 Charge（数据表）；换装 Clairvoyance 后 Charge 时射程 +2', () => {
    expect(CHARGES.fox).toEqual(['ferociousLion', 'clairvoyance']);
    expect(Object.keys(CHARGES).length).toBe(10);
    const b = mk(['F . . . . . . . . . . . 1'], { F: { ...FOX, id: 'fox' }, '1': E('e1') });
    b.selectCharge('fox', 'clairvoyance');
    b.unit('fox').charged = true;
    expect(b.gunRange(b.unit('fox'))).toBe(FOX.gun!.range + 2);
    expect(types(b.selectCharge('fox', 'bulletBreak'))).toContain('error');
  });

  it('Hawkeye / God-Like Speed / Pedal to the Metal / Follow-Up+ / Magical Mastery', () => {
    const b = mk(['A . . 1'], { A: A('a', { passives: ['hawkeye', 'godLikeSpeed', 'pedalToTheMetal', 'followUpPlus', 'magicalMastery'], skills: [SKILLS.zio] }), '1': E('e1') });
    const a = b.unit('a');
    expect(b.gunRange(a)).toBe(7);
    expect(b.moveRange(a)).toBe(4 + 1 + 2);
    a.hp = 50;
    expect(b.moveRange(a)).toBe(5);
    expect(a.followUps).toBe(2);
    expect(b.skillRange(a, SKILLS.zio)).toBe(SKILLS.zio.range + 1);
  });

  it('Endure（1 HP 复活一次）/ Trump Card（跌破 50% 回复、下次攻击 ×1.5）', () => {
    const b = mk(['A . 1'], { A: A('a', { passives: ['endure', 'trumpCard'] }), '1': E('e1') });
    const a = b.unit('a');
    b.applyDamage(a, 60, 0, false, 'gun', b.unit('e1'));
    expect(a.hp).toBe(40 + Math.round(TRUMP_HEAL_POWER * HEAL_SCALE));
    const ev = b.shoot('a', 'e1');
    expect(dmgOf(ev, 'e1')[0].amount).toBe(15);
    b.applyDamage(a, 999, 0, false, 'gun', b.unit('e1'));
    expect(a.hp).toBe(1);
    expect(a.ko).toBe(false);
    b.applyDamage(a, 999, 0, false, 'gun', b.unit('e1'));
    expect(a.ko).toBe(true);
  });

  it('Comandante（1 More 移动 +1）/ Unstoppable（1 More 中技能 SP 减半）/ Reverse the Scales（1 More 中开枪换位）', () => {
    const b = mk(['A . 1 . 2'], { A: A('a', { passives: ['comandante', 'unstoppable', 'reverseTheScales'], skills: [SKILLS.zio] }), '1': E('e1'), '2': E('e2') });
    b.shoot('a', 'e1');
    const a = b.unit('a');
    expect(a.oneMore).toBe(true);
    expect(b.moveRange(a)).toBe(5);
    expect(b.spCost(a, SKILLS.zio)).toBe(Math.ceil(SKILLS.zio.sp / 2));
    b.shoot('a', 'e2');
    expect(a.pos).toEqual(v(4, 0));
  });

  it('Lucky Punch / Broad Perspective：按几率打倒掩体里的目标（固定随机数）', () => {
    const b = mk(['. h .', 'A 1 .'], { A: A('a', { passives: ['luckyPunch'] }), '1': E('e1') });
    setRng(b, 0.1);
    expect(types(b.melee('a', 'e1'))).toContain('down');
    const b2 = mk(['A . .', '. h .', '. 1 .'], { A: A('a', { passives: ['broadPerspective'] }), '1': E('e1') }, {}, {}, ['100', '000', '000']);
    setRng(b2, 0.1);
    expect(types(b2.shoot('a', 'e1'))).toContain('down');
  });

  it('First Aid（附近队友受伤自动回复）/ Ailment Shield（相邻队友异常自动解除）/ Iron Body', () => {
    const b = mk(['A B . 1'], { A: A('a', { passives: ['firstAid', 'ailmentShield'] }), B: A('b', { passives: ['ironBody'] }), '1': E('e1', { melee: 10 }) });
    b.applyDamage(b.unit('b'), 50, 0, false, 'gun', b.unit('e1'));
    expect(b.unit('b').hp).toBe(50 + Math.round(65 * HEAL_SCALE));
    b.addStatus(b.unit('b'), 'shock');
    expect(b.unit('b').status.length).toBe(0);
    const bb = b.unit('b');
    bb.hitsTaken = 2;
    const hp = bb.hp;
    b.applyDamage(bb, 1, 0, false, 'gun', null);
    expect(hp - bb.hp).toBe(1);
  });
});

// =====================================================================
describe('Triple Threat 修正 / 角色数据', () => {
  it('只有打倒该敌人的角色能发动（别人打倒的不算）', () => {
    const b = mk(['. . P . 3', '. . . . .', '. . 1 . .', '. . . . .', 'J . . . S'], { J: A('j'), S: A('s'), P: A('p'), '1': E('e1'), '3': E('e3') });
    b.shoot('p', 'e3'); // P 打倒三角外的 e3，持 1 More
    expect(b.unit('p').oneMore).toBe(true);
    b.unit('e1').downed = true; // 场上有倒地的 e1，但不是 P 打倒的
    expect(b.tripleFor('p')).toBeNull();
    b.unit('e1').downed = false;
    b.shoot('j', 'e1');
    expect(b.tripleFor('j')?.targetId).toBe('e1');
    expect(b.tripleFor('p')).toBeNull();
  });

  it('祐介/艾丽娜/明智都有 Unique；明智 Charge = Phantom Step / Essence of Sorcery；地图列表含机关图与 Boss 图', () => {
    expect(FOX.unique?.id).toBe(UNIQUES.likeAPhantom.id);
    expect(ERINA.unique?.id).toBe(UNIQUES.flagOfFreedom.id);
    expect(CROW.unique?.id).toBe(UNIQUES.truthSeeker.id);
    expect(CROW.charges).toEqual(['phantomStep', 'essenceOfSorcery']);
    expect(JOKER.passives).toContain('trumpCard');
    expect(MAPS.map((m) => m.id)).toEqual(expect.arrayContaining(['mech', 'boss', 'range-c']));
    for (const m of MAPS) { const b = new Battle(m.make()); expect(() => b.start()).not.toThrow(); }
    void enemy;
  });

  it('跳台连接两处高台（中间隔空），梯子连接不同高度', () => {
    const b = mk(['A . . B', '. . . .'], { A: A('a'), B: A('b') }, { links: [{ a: v(0, 0), b: v(3, 0), kind: 'jump' }] }, {}, ['1001', '0000']);
    const l = b.grid.links[0];
    expect(b.grid.linkUsable(l)).toBe(true);
    b.unit('b').pos = v(3, 1);
    expect(b.moveTiles(b.unit('a')).some((p) => eq(p, v(3, 0)))).toBe(true);
  });
});
