import { describe, expect, it } from 'vitest';
import { loadLevel, validateLevel, cellAt, PH_HP, MAX_W, MAX_H, type LevelJson } from '../src/game/level';
import { LEVEL_JSON, levelMap, levelJson } from '../src/game/levels';
import { Battle } from '../src/rules';
import { legacyMap } from './legacyLevels';

const tiny = (o: Partial<LevelJson> = {}): LevelJson => ({
  id: 'T', name: 't', width: 3, height: 2, win: { type: 'defeatAll' }, turnTarget: 3,
  party: [['joker', 0, 1]], enemies: [{ id: 'e', name: 'Pixie', role: 'shooter', hp: 'PH', pos: [2, 0] }],
  tiles: ['..h', 'E.#'], heights: ['001', '000'], zones: ['AAB', 'AAA'], ...o,
});

describe('Q4 关卡 JSON 读取器', () => {
  it('L01–L10 全部通过结构校验并能转成 MapDef 开局', () => {
    expect(LEVEL_JSON).toHaveLength(10);
    for (const j of LEVEL_JSON) {
      expect(validateLevel(j)).toEqual([]);
      const b = new Battle(loadLevel(j));
      b.start();
      expect(b.phase).toBe('player');
    }
  });
  it('tiles/heights/zones 按 [y] 行字符串读取；cellAt 给出 {height,cover,zone}', () => {
    const j = tiny();
    const m = loadLevel(j);
    expect(m.tiles[0][2]).toBe('half');
    expect(m.tiles[1][0]).toBe('exit');
    expect(m.tiles[1][2]).toBe('wall');
    expect(m.heights![0][2]).toBe(1);
    expect(m.zones![0][2]).toBe('B');
    expect(m.unlockedZones).toEqual(['A']);
    expect(cellAt(j, 2, 0)).toEqual({ kind: 'half', height: 1, cover: 'half', zone: 'B' });
  });
  it('hp=PH 用同 role 默认值；hpFloor 比例换成绝对值；gunRange 覆盖；facing 转向量', () => {
    const m = loadLevel(tiny({ enemies: [
      { id: 'b', name: 'Boss', role: 'brute', hp: 'PH', pos: [2, 0], hpFloor: 0.5, isTarget: true },
      { id: 's', name: 'Pix', role: 'shooter', hp: 'PH', pos: [1, 0], gunRange: 7, facing: [0, 1] },
    ] }));
    const boss = m.units.find((u) => u.def.id === 'b')!.def;
    const s = m.units.find((u) => u.def.id === 's')!.def;
    expect(boss.maxHp).toBe(PH_HP.brute);
    expect(boss.hpFloor).toBe(Math.floor(PH_HP.brute * 0.5));
    expect(s.gun!.range).toBe(7);
    expect(s.facing).toEqual({ x: 0, y: 1 });
    expect(s.name).toBe('Pix');
  });
  it('party_extra（护送 Toshiro）、reserves、lose、chests、doors 照录', () => {
    const m = levelMap('L06');
    expect(m.units.find((u) => u.def.id === 'toshiro')?.def.escort).toBe(true);
    expect(m.lose).toEqual([{ type: 'allKo' }, { type: 'unitKo', unitId: 'toshiro' }]);
    const l2 = legacyMap('L02'); // 宝箱/门：10-25 自编图纸（冻结副本）；原版 M2 没有
    expect(l2.chests).toEqual([{ id: 'ch1', pos: { x: 1, y: 1 }, reward: { gp: 3 } }]);
    expect(l2.doors![0]).toMatchObject({ id: 'D1', open: false, cells: [{ x: 6, y: 9 }, { x: 7, y: 9 }] });
    expect(levelMap('L05').reserves!.map((r) => r.id)).toEqual(['skull', 'mona']);
    expect(levelMap('L06').units.find((u) => u.def.id === 'toshiro')!.pos).toEqual({ x: 4, y: 32 }); // 原版 M9 PartyIndex 3 出生格 (4,2)
  });
  it('reinforcements[{turn|trigger, units}] 转成事件', () => {
    const m = loadLevel(tiny({ reinforcements: [
      { turn: 2, units: [{ id: 'r1', name: 'Pixie', role: 'shooter', hp: 'PH', pos: [1, 0] }] },
      { trigger: { type: 'reach', pos: [1, 1] }, units: [{ id: 'r2', name: 'Kelpie', role: 'brute', hp: 'PH', pos: [2, 0] }] },
    ] }));
    expect(m.events!.map((e) => e.when)).toEqual([{ type: 'turn', turn: 2, phase: 'enemy' }, { type: 'reach', pos: { x: 1, y: 1 } }]);
  });
  it('校验：超出 32×40、行长不符、高度 >3、非法字符 都报错', () => {
    expect(validateLevel(tiny({ width: MAX_W + 1 })).length).toBeGreaterThan(0);
    expect(validateLevel(tiny({ height: MAX_H + 1 })).length).toBeGreaterThan(0);
    expect(validateLevel(tiny({ heights: ['004', '000'] }))).toEqual(['heights (2,0) 非法字符 \'4\'']);
    expect(validateLevel(tiny({ tiles: ['..x', 'E.#'] }))).toEqual(['tiles (2,0) 非法字符 \'x\'']);
    expect(() => loadLevel(tiny({ tiles: ['..', 'E.#'] }))).toThrow();
  });
  it('JSON 原样复制：敌人名照抄（原版 M3 单位 2052「举止异常的SKULL」）', () => {
    expect(levelJson('L03').enemies[0].name).toBe('举止异常的SKULL');
    expect(levelMap('L03').units.find((u) => u.def.id === 'skull_ctrl')!.def.name).toBe('举止异常的SKULL');
  });
  it('10-26 原版布局：L01–L06/L08 来自 P5T StageSettingData，尺寸/敌兵/回合照原版', () => {
    for (const id of ['L01', 'L02', 'L03', 'L04', 'L05', 'L06', 'L08']) expect(levelJson(id).source).toMatch(/missions\/M\d\d\.json/);
    expect([levelJson('L01').width, levelJson('L01').height]).toEqual([9, 18]);
    expect([levelJson('L04').width, levelJson('L04').height]).toEqual([13, 30]);
    expect([levelJson('L06').width, levelJson('L06').height]).toEqual([20, 35]);
    expect([levelJson('L08').width, levelJson('L08').height]).toEqual([23, 28]);
    // M4：6 个火枪手 10001010（HP 60 / 移动 3 / 枪伤 13–18 / 射程 6）
    const m4 = levelMap('L04').units.filter((u) => u.def.side === 'enemy');
    expect(m4.length).toBe(6);
    for (const u of m4) expect([u.def.maxHp, u.def.move, u.def.gun!.power, u.def.gun!.powerMax, u.def.gun!.range]).toEqual([60, 3, 13, 18, 6]);
    // M17：三星 5 回合（m_TurnLimit），败北 7 回合（m_EnemyJudgeData TurnCount）
    expect(levelJson('L08').turnTarget).toBe(5);
    expect(levelMap('L08').turnLimit).toBe(7);
    expect(levelJson('L05').turnTarget).toBe(5);
    expect(levelJson('L06').turnTarget).toBe(8);
  });
});
