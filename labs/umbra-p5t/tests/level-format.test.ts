import { describe, expect, it } from 'vitest';
import { loadLevel, validateLevel, cellAt, PH_HP, MAX_W, MAX_H, type LevelJson } from '../src/game/level';
import { LEVEL_JSON, levelMap, levelJson } from '../src/game/levels';
import { Battle } from '../src/rules';

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
    const l2 = levelMap('L02');
    expect(l2.chests).toEqual([{ id: 'ch1', pos: { x: 1, y: 1 }, reward: { gp: 3 } }]);
    expect(l2.doors![0]).toMatchObject({ id: 'D1', open: false, cells: [{ x: 6, y: 9 }, { x: 7, y: 9 }] });
    expect(levelMap('L05').reserves!.map((r) => r.id)).toEqual(['skull', 'mona']);
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
  it('JSON 原样复制：敌人名照抄', () => {
    expect(levelJson('L03').enemies[0].name).toBe('被操控的龙司');
    expect(levelMap('L03').units.find((u) => u.def.id === 'skull_ctrl')!.def.name).toBe('被操控的龙司');
  });
});
