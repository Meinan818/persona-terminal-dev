// Hark 10-23 决定（umbra-assets/HARK-NOTES-ENGINE.md）：敌人推进、关卡喇叭硬禁用技能、Zionga、PH-tuned HP
import { describe, expect, it } from 'vitest';
import { loadLevel, type LevelJson } from '../src/game/level';
import { levelMap } from '../src/game/levels';
import { legacyMap } from './legacyLevels';
import { Battle, parseMap, W, SKILLS } from '../src/rules';
import type { MapDef, UnitDef } from '../src/rules';
import { manhattan } from '../src/rules/grid';

const A = (id: string, o: Partial<UnitDef> = {}): UnitDef => ({ id, name: id, side: 'ally', maxHp: 100, maxSp: 100, move: 4, melee: 10, gun: { power: 10, range: 3 }, skills: [], ...o });
const E = (id: string, o: Partial<UnitDef> = {}): UnitDef => ({ id, name: id, side: 'enemy', role: 'brute', maxHp: 100, maxSp: 0, move: 4, melee: 20, skills: [], ...o });
function mk(rows: string[], place: Record<string, UnitDef>, extra: Partial<MapDef> = {}) {
  const b = new Battle({ id: 't', name: 't', turnTarget: 3, win: { type: 'defeatAll' }, ...parseMap(rows, place), ...extra } as MapDef);
  b.start();
  for (const u of b.alive('enemy')) u.alert = true;
  return b;
}

describe('Hark 决定 #12 敌人推进', () => {
  it('权重：+0.3/步，掩体上限 +1.0', () => {
    expect(W.approachPerTile).toBe(0.3);
    expect(W.approachCoverCap).toBe(1.0);
  });
  it('打不到人的近战敌人朝最近的可见我方走（不再原地不动）', () => {
    const b = mk(['1 . . . . . . . . . . . . . A'], { A: A('a'), '1': E('e1') });
    const d0 = manhattan(b.unit('e1').pos, b.unit('a').pos);
    b.endPlayerPhase();
    expect(manhattan(b.unit('e1').pos, b.unit('a').pos)).toBe(d0 - 4);
  });
  it('看不见（墙挡视线）就不推进', () => {
    const b = mk(['1 . . . . . # . . . . . . A', '. . . . . . # . . . . . . .'], { A: A('a'), '1': E('e1') });
    b.endPlayerPhase();
    expect(b.unit('e1').pos).toEqual({ x: 0, y: 0 });
  });
  it('staysInZone 的敌人推进也不出区', () => {
    const b = mk(['1 . . . . . . . . . . . . . A'], { A: A('a'), '1': E('e1', { staysInZone: 'A' }) }, {
      zones: [[...'AAABBBBBBBBBBBB']], unlockedZones: ['A', 'B'],
    });
    b.endPlayerPhase();
    expect(b.zoneOf(b.unit('e1').pos)).toBe('A');
    expect(b.unit('e1').pos.x).toBe(2);
  });
});

const base = (o: Partial<LevelJson> = {}): LevelJson => ({
  id: 'I', name: 'i', width: 8, height: 4, win: { type: 'defeatAll' }, turnTarget: 3,
  party: [['joker', 0, 3]], enemies: [{ id: 'e1', name: 'e1', role: 'brute', hp: 200, pos: [2, 3] }],
  tiles: ['........', '........', '........', '........'], ...o,
});

describe('Hark 决定 #9 关卡喇叭 = 硬禁用技能', () => {
  it('喇叭活着：半径 3 内不能用技能，枪/近战照常；打掉后解禁；不扣血', () => {
    const b = new Battle(loadLevel(base({ props: [{ id: 'sp1', kind: 'speaker', pos: [0, 1], hp: 30, bans: ['skill'] }] })));
    b.start();
    const j = b.unit('joker'), e = b.unit('e1');
    const sk = j.skills[0];
    expect(b.skillBanned(j)).toBe(true);
    expect(b.canSkill(j, sk, e)).toBe(false);
    expect(b.canShoot(j, e)).toBe(true);
    expect(b.skillBanned(j, { x: 7, y: 0 })).toBe(false); // 半径外可以
    const hp = j.hp;
    b.shoot('joker', 'e1');
    expect(j.hp).toBe(hp);
    b.unit('sp1').ko = true;
    expect(b.canSkill(j, sk, e)).toBe(true);
  });
  it('L07 的喇叭 30 HP、红旗 60 HP（PH-tuned）、喇叭为硬禁用（r8 L07 换原版 M08 后改用自编图纸冻结副本）', () => {
    const b = new Battle(legacyMap('L07'));
    expect(b.unit('sp1').maxHp).toBe(30);
    expect(b.unit('sp1').hardBan).toBe(true);
    expect(b.unit('flag').maxHp).toBe(60);
  });
});

describe('Hark 决定 #1/#2 Boss HP 与 Zionga', () => {
  it('L08 看守长回 PH（10-24 改照原版 M17 限时全灭，不再是 Boss）；L10 Boss 阶段1 260（锁 130）', () => {
    expect(new Battle(levelMap('L08')).unit('boss').maxHp).toBeLessThan(180);
    const b = new Battle(levelMap('L10'));
    expect(b.unit('boss').maxHp).toBe(260);
    expect(b.unit('boss').hpFloor).toBe(130);
  });
  it('L10 阶段2：Boss HP 200，技能 Maragi + Zionga（P5T 表：SP28 / Power90 / 射程4）', () => {
    const b = new Battle(levelMap('L10'));
    b.start();
    const boss = b.unit('boss');
    boss.hp = boss.hpFloor!;
    b.checkEnd();
    expect(boss.bossPhase).toBe(2);
    expect(boss.maxHp).toBe(200);
    expect(boss.hp).toBe(200);
    expect(boss.skills.map((s) => s.id)).toEqual(['maragi', 'zionga']);
    expect(SKILLS.zionga).toMatchObject({ sp: 28, power: 90, shape: 'single', effect: 'shock' });
  });
  it('easy 难度：锁血线跟着 HP 倍率缩放，阶段 2 能触发', () => {
    const b = new Battle(levelMap('L10'), { difficulty: 'easy' });
    b.start();
    const boss = b.unit('boss');
    expect(boss.hpFloor! <= boss.maxHp * 0.5).toBe(true);
    boss.hp = boss.hpFloor!;
    b.checkEnd();
    expect(boss.bossPhase).toBe(2);
    expect(boss.maxHp).toBe(150);
  });
});
