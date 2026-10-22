// 角色/技能/敌人/测试图数据
// 出处（详见 RULES-NOTES.md）：
//  - 角色 HP/SP/移动/近战/枪攻/射程/枪型：GameFAQs Cogito《P5T Guide and FAQ》角色表（Lv19/21 行）——公开数据
//  - 技能 Power/SP/效果/范围描述：Megami Tensei Wiki「List of Persona 5 Tactica Skills」——公开数据
//  - 技能射程（格）、「小/中/大范围」换算成半径、敌人数值：查不到 → 占位（标 PH）
import type { DashLink, MapDef, SkillDef, TileKind, UnitDef, Vec } from './types';

// ---------- 技能（Power / SP 为原作公开数据；range/radius 为占位 PH） ----------
const R_SINGLE = 5; // PH：单体技能射程
const R_AREA = 4; // PH：范围技能射程
// PH：原作「small / medium / large / huge area」→ 曼哈顿半径 1 / 2 / 3 / 4
export const AREA = { small: 1, medium: 2, large: 3, huge: 4 } as const;

const atk = (id: string, name: string, power: number, sp: number, effect: SkillDef['effect'], area: number): SkillDef => ({
  id, name, kind: 'attack', power, sp, effect,
  range: area ? R_AREA : R_SINGLE, shape: area ? 'area' : 'single', radius: area || undefined,
});

export const SKILLS = {
  agi: atk('agi', 'Agi', 45, 14, 'burn', AREA.small), // Deals light damage in a small area. Inflicts Burn.
  maragi: atk('maragi', 'Maragi', 45, 24, 'burn', AREA.medium),
  bufu: atk('bufu', 'Bufu', 35, 14, 'freeze', AREA.small), // small area. Inflicts Freeze.
  zio: atk('zio', 'Zio', 45, 12, 'shock', 0), // Deals light damage. Inflicts Shock.
  garu: atk('garu', 'Garu', 25, 8, 'sweep', 0), // Deals light damage. Sweeps away target.
  psi: atk('psi', 'Psi', 25, 12, 'hypno', 0), // Deals light damage. Hypnotizes target.
  frei: atk('frei', 'Frei', 25, 14, 'vortex', AREA.medium), // medium area. Creates a Vortex.
  kouha: atk('kouha', 'Kouha', 40, 12, 'dizzy', AREA.small), // small area. Inflicts Dizzy.
  eiha: atk('eiha', 'Eiha', 35, 12, 'despair', AREA.small), // small area. Inflicts Despair.
  partisan: atk('partisan', 'Partisan', 25, 12, 'forget', 0), // Deals light damage to target. Inflicts Forget.
  megido: atk('megido', 'Megido', 75, 35, undefined, AREA.large), // Almighty, large area
  dormina: atk('dormina', 'Dormina(测试用)', 0, 8, 'sleep', 0), // 原作 Sleep 来源技能 wiki 未列出 → 测试用占位
  dia: { id: 'dia', name: 'Dia', kind: 'heal', power: 65, sp: 10, range: R_SINGLE, shape: 'single' } as SkillDef,
  diamrita: { id: 'diamrita', name: 'Diamrita', kind: 'heal', power: 65, sp: 16, range: R_SINGLE, shape: 'single', cure: true } as SkillDef,
  media: { id: 'media', name: 'Media', kind: 'heal', power: 65, sp: 34, range: 0, shape: 'self', allAllies: true } as SkillDef,
  tarukaja: { id: 'tarukaja', name: 'Tarukaja', kind: 'buff', power: 0, sp: 12, range: R_SINGLE, shape: 'single', buff: 'atk' } as SkillDef,
  rakukaja: { id: 'rakukaja', name: 'Rakukaja', kind: 'buff', power: 0, sp: 12, range: R_SINGLE, shape: 'single', buff: 'def' } as SkillDef,
  sukukaja: { id: 'sukukaja', name: 'Sukukaja', kind: 'buff', power: 0, sp: 12, range: R_SINGLE, shape: 'single', buff: 'move' } as SkillDef,
} satisfies Record<string, SkillDef>;

// ---------- Unique（Voltage）技能：Power 为原作初始级；射程/范围 PH ----------
export const UNIQUES = {
  phantomJudge: { id: 'phantomJudge', name: 'Phantom Judge', kind: 'attack', power: 41, sp: 0, voltage: true, range: 4, shape: 'area', radius: AREA.small, downThroughCover: true } as SkillDef,
  brigantine: { id: 'brigantine', name: 'Brigantine Blitzkrieg', kind: 'attack', power: 41, sp: 0, voltage: true, range: 1, shape: 'line', length: 5, effect: 'shock' } as SkillDef,
  femmeFatale: { id: 'femmeFatale', name: 'Femme Fatale', kind: 'attack', power: 58, sp: 0, voltage: true, range: 5, shape: 'area', radius: AREA.small, extraAction: true } as SkillDef,
  windsOfTime: { id: 'windsOfTime', name: 'Winds of Time', kind: 'attack', power: 29, sp: 0, voltage: true, range: 0, shape: 'self', radius: 3, effect: 'sweep' } as SkillDef,
  fullThrottle: { id: 'fullThrottle', name: 'Full Throttle', kind: 'attack', power: 30, sp: 0, voltage: true, range: 1, shape: 'line', length: 4, knockAll: true } as SkillDef,
  nobleLady: { id: 'nobleLady', name: "Noble Lady's Invitation", kind: 'attack', power: 23, sp: 0, voltage: true, range: 5, shape: 'area', radius: AREA.medium, effect: 'hypno' } as SkillDef,
  pathway: { id: 'pathway', name: 'Pathway to the Ball', kind: 'buff', power: 0, sp: 0, voltage: true, range: 0, shape: 'self', moveBoost: 99, extraAction: true } as SkillDef,
} satisfies Record<string, SkillDef>;

// ---------- 我方（Cogito 角色表 Lv19/21：HP SP MOV MEL RNG R 枪型） ----------
export const JOKER: UnitDef = {
  id: 'joker', name: 'Joker', side: 'ally', isLeader: true,
  maxHp: 136, maxSp: 49, move: 6, melee: 21, gun: { power: 17, range: 8, shape: 'single' },
  skills: [SKILLS.eiha], unique: UNIQUES.phantomJudge, charge: 'foresight',
};
export const SKULL: UnitDef = {
  id: 'skull', name: '龙司 Skull', side: 'ally',
  maxHp: 171, maxSp: 34, move: 6, melee: 28, gun: { power: 19, range: 5, shape: 'aoe' },
  skills: [SKILLS.zio], unique: UNIQUES.brigantine, charge: 'ferociousLion',
};
export const PANTHER: UnitDef = {
  id: 'panther', name: '杏 Panther', side: 'ally',
  maxHp: 108, maxSp: 64, move: 5, melee: 13, gun: { power: 15, range: 7, shape: 'aoe' },
  skills: [SKILLS.agi, SKILLS.maragi], unique: UNIQUES.femmeFatale, charge: 'phantomStep',
};
export const MONA: UnitDef = {
  id: 'mona', name: '摩尔加纳 Mona', side: 'ally',
  maxHp: 101, maxSp: 58, move: 7, melee: 20, gun: { power: 14, range: 7, shape: 'single' },
  skills: [SKILLS.garu, SKILLS.dia, SKILLS.media], unique: UNIQUES.windsOfTime, charge: 'lightningSpeed',
};
export const FOX: UnitDef = {
  id: 'fox', name: '祐介 Fox', side: 'ally',
  maxHp: 128, maxSp: 43, move: 7, melee: 25, gun: { power: 15, range: 9, shape: 'single' },
  skills: [SKILLS.bufu, SKILLS.rakukaja], charge: 'ferociousLion', // Like a Phantom（召唤诱饵）未做
};
export const QUEEN: UnitDef = {
  id: 'queen', name: '真 Queen', side: 'ally',
  maxHp: 156, maxSp: 52, move: 5, melee: 29, gun: { power: 20, range: 6, shape: 'single' },
  skills: [SKILLS.frei, SKILLS.tarukaja], unique: UNIQUES.fullThrottle, charge: 'phantomStep',
};
export const NOIR: UnitDef = {
  id: 'noir', name: '春 Noir', side: 'ally',
  maxHp: 121, maxSp: 47, move: 4, melee: 33, gun: { power: 23, range: 6, shape: 'explode' },
  skills: [SKILLS.psi, SKILLS.diamrita], unique: UNIQUES.nobleLady, charge: 'lightningSpeed',
};
export const ERINA: UnitDef = {
  id: 'erina', name: '艾丽娜 Erina', side: 'ally',
  maxHp: 178, maxSp: 65, move: 6, melee: 31, gun: { power: 20, range: 5, shape: 'aoe' },
  skills: [SKILLS.partisan, SKILLS.sukukaja], charge: 'bulletBreak', // Flag of Freedom（插旗）未做
};
export const KASUMI: UnitDef = {
  id: 'kasumi', name: '霞 Kasumi', side: 'ally',
  maxHp: 111, maxSp: 42, move: 6, melee: 20, gun: { power: 16, range: 9, shape: 'single' },
  skills: [SKILLS.kouha, SKILLS.dormina], unique: UNIQUES.pathway, charge: 'phantomStep',
};
/** 护送对象：Cogito C109「Toshiro has 85 HP 6 Move」，不能攻击、不能 Dash */
export const TOSHIRO_ESCORT: UnitDef = {
  id: 'toshiro', name: '春日部 Toshiro', side: 'ally', escort: true, noFollowUp: true,
  maxHp: 85, maxSp: 0, move: 6, melee: 0, skills: [],
};
export const ROSTER: UnitDef[] = [JOKER, SKULL, PANTHER, MONA, FOX, QUEEN, NOIR, ERINA, KASUMI];

// ---------- 敌人（类型按 Cogito AAA115；数值全部 PH） ----------
type EnemyOpts = Partial<UnitDef>;
export function enemy(id: string, name: string, role: UnitDef['role'], hp: number, o: EnemyOpts = {}): UnitDef {
  const base: UnitDef = {
    id, name, side: 'enemy', role, maxHp: hp, maxSp: 99, move: 4, melee: 14, skills: [],
  };
  if (role === 'shooter') Object.assign(base, { move: 4, melee: 8, gun: { power: 14, range: 6 } });
  if (role === 'brute') Object.assign(base, { move: 5, melee: 18 });
  if (role === 'revenger') Object.assign(base, { move: 4, melee: 22 });
  if (role === 'shielder') Object.assign(base, { move: 0, melee: 10, gun: { power: 14, range: 5 }, facing: { x: 0, y: 1 } });
  if (role === 'teleporter') Object.assign(base, { move: 4, melee: 16, gun: { power: 12, range: 5 } });
  if (role === 'launcher') Object.assign(base, { move: 3, melee: 16, gun: { power: 18, range: 5 } }); // gun = Stone Throwing
  if (role === 'supporter') Object.assign(base, { move: 3, melee: 8, skills: [SKILLS.dia, SKILLS.sukukaja, SKILLS.zio] });
  return { ...base, ...o };
}
export const dummyTarget = (id: string, name = '木人', hp = 250): UnitDef =>
  enemy(id, name, 'brute', hp, { move: 0, melee: 0 });
export const prop = (id: string, kind: 'barrel' | 'box' | 'speaker', o: Partial<UnitDef> = {}): UnitDef => ({
  id, name: kind === 'barrel' ? '油桶' : kind === 'box' ? '木箱' : '喇叭', side: 'neutral', prop: kind,
  maxHp: kind === 'barrel' ? 1 : 999, maxSp: 0, move: 0, melee: 0, skills: [], ...o,
});

// ---------- 地图解析 ----------
const LEGEND: Record<string, TileKind> = { '.': 'floor', '#': 'wall', h: 'half', H: 'full', E: 'exit' };

/**
 * 用字符画定义地图：. 地面 # 墙 h 半掩体 H 全掩体 E 出口；其余字符是单位占位（脚下为地面）。
 * heights：每行一串数字（层数），缺省全 0。
 */
export function parseMap(rows: string[], place: Record<string, UnitDef>, heights?: string[]): Pick<MapDef, 'width' | 'height' | 'tiles' | 'units' | 'heights'> {
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
  const hs = heights?.map((r) => r.replace(/\s+/g, '').split('').map(Number));
  return { width: tiles[0].length, height: tiles.length, tiles, units, heights: hs };
}
const ladder = (ax: number, ay: number, bx: number, by: number): DashLink => ({ a: { x: ax, y: ay }, b: { x: bx, y: by }, kind: 'ladder' });

// ---------- 测试图 ----------
/** 测试图 1（12×8）：高台 + 梯子 + 追击 + 油桶 + Revenger。Joker/龙司/杏，替补 Mona/Fox（Baton Pass） */
export function testMap(): MapDef {
  const rows = [
    '. . . . . . . . 1 . . .',
    '. h . . H . . . . . 2 .',
    '. . . . . . . # . . . .',
    '3 . . h . . . . . . . .',
    '. . . . . . B 4 . h . .',
    '. . h . . . . . . . . .',
    '. J . . S . . . P . . .',
    '. . . . . . . . . . . .',
  ];
  const heights = [
    '000000011111',
    '000000011111',
    '000000000000',
    '000000000000',
    '000000000000',
    '000000000000',
    '000000000000',
    '000000000000',
  ];
  return {
    id: 'test-01', name: '测试图 · 涩谷站高架', objective: '击败全部敌人', turnTarget: 6,
    ...parseMap(rows, {
      J: JOKER, S: SKULL, P: PANTHER,
      '1': enemy('pixie', 'Pixie', 'shooter', 60),
      '2': enemy('jack', "Jack-o'-Lantern", 'shooter', 60),
      '3': enemy('mandrake', 'Mandrake', 'brute', 70),
      '4': enemy('bicorn', 'Bicorn', 'revenger', 80),
      B: prop('barrel1', 'barrel'),
    }, heights),
    links: [ladder(6, 1, 7, 1), ladder(8, 2, 8, 1)],
    reserves: [MONA, FOX],
    win: { type: 'defeatAll' },
  };
}

/** 教学图（8×7）：Joker 站在高台上，把掩体里的敌人推下去 → 下方龙司 Follow-Up；油桶夹在两个敌人之间（对应原作第 18 关的高台教学） */
export function followUpMap(): MapDef {
  const rows = [
    '. . . . . . . .',
    '. J . . . . . .',
    'h 1 . h . . . .',
    '. . . . . . . .',
    '. . . . 2 . . .',
    '. S . . . . P .',
    '. . . . B . 3 .',
  ];
  const heights = [
    '11111000',
    '11111000',
    '11111000',
    '00000000',
    '00000000',
    '00000000',
    '00000000',
  ];
  return {
    id: 'tut-followup', name: '教学 · 推落与追击', objective: '击败全部敌人', turnTarget: 4,
    ...parseMap(rows, {
      J: JOKER, S: SKULL, P: PANTHER,
      '1': enemy('pixie2', 'Pixie', 'shooter', 60),
      '2': enemy('jack2', "Jack-o'-Lantern", 'shooter', 60),
      '3': enemy('bicorn2', 'Bicorn', 'revenger', 80),
      B: prop('barrel2', 'barrel'),
    }, heights),
    links: [ladder(5, 1, 4, 1)],
    reserves: [MONA],
    win: { type: 'defeatAll' },
  };
}

/** 测试图 2（11×8）：特殊敌人——盾兵、传送者、投掷者（高台上，推落即死）、支援者、喇叭、木箱 */
export function specialsMap(): MapDef {
  const rows = [
    '. . . . . . . . . . .',
    '. . 1 . . . . L . . .',
    '. . . . . . . . . . .',
    '. h . . X . . 2 . . .',
    '. . . . . . . . . s .',
    '. . . . . . 3 . . . .',
    '. J . . S . . . P . .',
    '. . . . . . . . . . .',
  ];
  const heights = [
    '00000011110',
    '00000011110',
    '00000011110',
    '00000000000',
    '00000000000',
    '00000000000',
    '00000000000',
    '00000000000',
  ];
  return {
    id: 'test-02', name: '测试图 · 特殊敌人', objective: '击败全部敌人', turnTarget: 7,
    ...parseMap(rows, {
      J: JOKER, S: SKULL, P: PANTHER,
      '1': enemy('shielder', 'Shield Bearer', 'shielder', 70, { facing: { x: 0, y: 1 } }),
      L: enemy('launcher', 'Sumo-maton', 'launcher', 80),
      '2': enemy('teleporter', 'Ninja', 'teleporter', 60),
      '3': enemy('supporter', 'Supporter', 'supporter', 55),
      X: prop('box1', 'box'),
      s: prop('speaker1', 'speaker', { bans: ['gun'] }),
    }, heights),
    links: [ladder(5, 2, 6, 2)],
    reserves: [MONA],
    win: { type: 'defeatAll' },
  };
}

/** 测试图 3（12×7）：护送——Toshiro 到达出口（Cogito C109 Armory Raid 结构），8 回合内 */
export function escortMap(): MapDef {
  const rows = [
    '. . . . . . . . . . E E',
    '. h . . H . . 1 . . . .',
    '. . . . . . . . . h . .',
    'T . . h . . # # . . 2 .',
    '. . . . . . . . . . . .',
    '. J . . S . 3 . h . . .',
    '. . P . . . . . . . . .',
  ];
  return {
    id: 'test-03', name: '测试图 · 军械库突袭（护送）', objective: '让 Toshiro 到达出口（8 回合内）', turnTarget: 6, turnLimit: 8,
    ...parseMap(rows, {
      J: JOKER, S: SKULL, P: PANTHER, T: TOSHIRO_ESCORT,
      '1': enemy('guard1', 'Guard', 'shooter', 60),
      '2': enemy('guard2', 'Guard', 'shooter', 60),
      '3': enemy('brute1', 'Brute', 'brute', 70),
    }),
    win: { type: 'reachExit', unitId: 'toshiro' },
    bonus: [{ type: 'clear' }, { type: 'withinTurns', n: 6 }, { type: 'defeatAll' }],
  };
}

function rangeMap(id: string, name: string, a: UnitDef, b: UnitDef, c: UnitDef): MapDef {
  const rows = [
    '. . . . . . . . . . .',
    '. . . 1 . . . 2 . . .',
    '. . . . . h . . . . .',
    '. . 3 . . . . . 4 . .',
    '. . . . . . . . . . .',
    '. . . . . . . . . . .',
    '. A . . . B . . . C .',
  ];
  return {
    id, name, objective: '元素靶场：随便打', turnTarget: 9,
    ...parseMap(rows, {
      A: a, B: b, C: c,
      '1': dummyTarget('t1', '木人 1'), '2': dummyTarget('t2', '木人 2'), '3': dummyTarget('t3', '木人 3'), '4': dummyTarget('t4', '木人 4'),
    }),
    win: { type: 'defeatAll' },
  };
}
export const rangeMapA = () => rangeMap('range-a', '元素靶场 A（风/冰/核）', MONA, FOX, QUEEN);
export const rangeMapB = () => rangeMap('range-b', '元素靶场 B（念/祝/遗忘）', NOIR, ERINA, KASUMI);

export const MAPS: { id: string; name: string; make: () => MapDef }[] = [
  { id: 'test-01', name: '综合测试图', make: testMap },
  { id: 'tut-followup', name: '教学·推落追击', make: followUpMap },
  { id: 'test-02', name: '特殊敌人', make: specialsMap },
  { id: 'test-03', name: '护送', make: escortMap },
  { id: 'range-a', name: '靶场 A', make: rangeMapA },
  { id: 'range-b', name: '靶场 B', make: rangeMapB },
];
