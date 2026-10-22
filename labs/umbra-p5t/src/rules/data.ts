// 角色/敌人/测试图数据（数值为灰盒占位，非原作数值）
import type { MapDef, TileKind, UnitDef, Vec } from './types';

export const JOKER: UnitDef = {
  id: 'joker', name: 'Joker', side: 'ally', isLeader: true,
  maxHp: 60, maxSp: 40, move: 4, melee: 14,
  gun: { power: 12, range: 4 },
  skills: [{ id: 'eiha', name: 'Eiha', element: 'curse', sp: 8, power: 18, range: 4, radius: 0, status: 'despair' }],
};
export const SKULL: UnitDef = {
  id: 'skull', name: '龙司 Skull', side: 'ally',
  maxHp: 70, maxSp: 30, move: 3, melee: 18,
  gun: { power: 14, range: 3 },
  skills: [{ id: 'zio', name: 'Zio', element: 'elec', sp: 8, power: 14, range: 3, radius: 0, status: 'shock' }],
};
export const PANTHER: UnitDef = {
  id: 'panther', name: '杏 Panther', side: 'ally',
  maxHp: 50, maxSp: 48, move: 4, melee: 10,
  gun: { power: 10, range: 5 },
  skills: [
    { id: 'agi', name: 'Agi', element: 'fire', sp: 8, power: 16, range: 4, radius: 0, status: 'burn' },
    { id: 'maragi', name: 'Maragi', element: 'fire', sp: 16, power: 12, range: 4, radius: 1, status: 'burn' },
  ],
};

const shadow = (id: string, name: string, ai: 'melee' | 'ranged', hp: number): UnitDef => ({
  id, name, side: 'enemy', ai, maxHp: hp, maxSp: 0, move: ai === 'melee' ? 4 : 3,
  melee: ai === 'melee' ? 12 : 8,
  gun: ai === 'ranged' ? { power: 9, range: 4, ammo: 99 } : undefined,
  skills: [],
});

const LEGEND: Record<string, TileKind> = { '.': 'floor', '#': 'wall', h: 'half', H: 'full', E: 'exit' };

/** 用字符画定义地图：. 地面 # 墙 h 半掩体 H 全掩体 E 出口；其余字符是单位占位（脚下为地面） */
export function parseMap(rows: string[], place: Record<string, UnitDef>): Pick<MapDef, 'width' | 'height' | 'tiles' | 'units'> {
  const tiles: TileKind[][] = [];
  const units: { def: UnitDef; pos: Vec }[] = [];
  rows.forEach((row, y) => {
    const cells = row.replace(/\s+/g, '').split('');
    tiles.push(cells.map((c, x) => {
      if (LEGEND[c]) return LEGEND[c];
      const def = place[c];
      if (!def) throw new Error(`unknown map char ${c}`);
      units.push({ def, pos: { x, y } });
      return 'floor';
    }));
  });
  return { width: tiles[0].length, height: tiles.length, tiles, units };
}

/** 测试图 8×6：Joker+龙司+杏 vs 4 个 Shadow，击败全部 */
export function testMap(): MapDef {
  const rows = [
    '. . 1 . . . 2 .',
    '. h . . H . . .',
    '. . . # # . h .',
    '3 . h . . . . 4',
    '. . . . h . . .',
    '. J . S . P . .',
  ];
  return {
    id: 'test-01', name: '测试图 · 涩谷站地下通道', turnTarget: 6,
    ...parseMap(rows, {
      J: JOKER, S: SKULL, P: PANTHER,
      '1': shadow('pixie', 'Pixie', 'ranged', 34),
      '2': shadow('jack', 'Jack-o\'-Lantern', 'ranged', 34),
      '3': shadow('mandrake', 'Mandrake', 'melee', 38),
      '4': shadow('bicorn', 'Bicorn', 'melee', 40),
    }),
    win: { type: 'defeatAll' },
  };
}
