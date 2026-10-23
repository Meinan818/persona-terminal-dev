// 角色/技能/敌人/测试图数据
// 出处（详见 RULES-NOTES.md）：
//  - 角色 HP/SP/移动/近战/枪攻/射程/枪型：GameFAQs Cogito《P5T Guide and FAQ》角色表（Lv19/21 行）——公开数据
//  - 技能 Power/SP/效果/范围描述：Megami Tensei Wiki「List of Persona 5 Tactica Skills」——公开数据
//  - 技能射程（格）、「小/中/大范围」换算成半径、敌人数值：查不到 → 占位（标 PH）
import type { ChargeId, DashLink, MapDef, PassiveId, SkillDef, TileKind, UnitDef, Vec } from './types';

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
  zionga: atk('zionga', 'Zionga', 90, 28, 'shock', 0), // P5T 数据表 40302：4-1x1 SP28 Power90（L10 阶段2 Boss，Hark 10-23 决定）
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
  // Samurai Gamers Unique Skill Guide / ibunroku 技能表：「Summons 2 decoy units. Allows additional following action.」射程 PH
  likeAPhantom: { id: 'likeAPhantom', name: 'Like a Phantom', kind: 'buff', power: 0, sp: 0, voltage: true, range: 5, shape: 'single', decoys: 2, extraAction: true } as SkillDef,
  // 「Places flag that breaks Cover of nearby enemies and heals nearby allies at end of each turn.」射程/半径 PH
  flagOfFreedom: { id: 'flagOfFreedom', name: 'Flag of Freedom', kind: 'buff', power: 0, sp: 0, voltage: true, range: 5, shape: 'single', radius: 3, flag: true } as SkillDef,
  // 「Allies can take an additional action. After use, Voltage will not increase for 3 turns.」
  truthSeeker: { id: 'truthSeeker', name: 'Truth Seeker', kind: 'buff', power: 0, sp: 0, voltage: true, range: 0, shape: 'self', allyExtra: true } as SkillDef,
} satisfies Record<string, SkillDef>;

/**
 * 每人两个 Charge 技能 [免费, 20 GP]（Cogito：「Each Character has two Charge Skills」）。出处：
 *  Joker Foresight/Phantom Step、Ann Phantom Step/Over Powered、Ryuji Ferocious Lion/Over Powered、Haru Lightning Speed/Spring Storm、
 *  Makoto Phantom Step/Essence of Sorcery、Erina Bullet Break/Foresight —— GameFAQs 版块「Personal Character Grades」(80633069)；
 *  Yusuke Ferocious Lion/Clairvoyance —— Gamer Guides「Best Skills for Yusuke」；Akechi Phantom Step/Essence of Sorcery、
 *  Kasumi Phantom Step/Ferocious Lion —— Samurai Gamers 角色页技能树；Mona Lightning Speed/Essence of Sorcery —— Cogito 技能树摘录（角色对应为推断）。
 */
export const CHARGES: Record<string, ChargeId[]> = {
  joker: ['foresight', 'phantomStep'], skull: ['ferociousLion', 'overPowered'], panther: ['phantomStep', 'overPowered'],
  mona: ['lightningSpeed', 'essenceOfSorcery'], fox: ['ferociousLion', 'clairvoyance'], queen: ['phantomStep', 'essenceOfSorcery'],
  noir: ['lightningSpeed', 'springStorm'], erina: ['bulletBreak', 'foresight'], kasumi: ['phantomStep', 'ferociousLion'],
  crow: ['phantomStep', 'essenceOfSorcery'],
};

/**
 * 被动技能说明（描述与数值：ibunroku「All Skills - Persona 5 Tactica」conditions 字段；归属：Samurai Gamers 技能树）。
 * 角色专属被动按 ibunroku 技能 id 段推断归属（5xx=Joker、6xx=Mona、8xx=Ann、9xx=Yusuke、10xx=Makoto、12xx=Erina、15xx=Akechi），
 * 与 GameFAQs「Personal Character Grades」的 Unique passive 一栏一致（Joker Trump Card、Ryuji Endure、Yusuke Broad Perspective、Makoto Pedal to the Metal、Erina Comandante）。
 */
export const PASSIVE_INFO: Record<PassiveId, { name: string; desc: string }> = {
  followUpPlus: { name: 'Follow-Up+', desc: 'Follow-Up 每回合可触发 2 次' },
  stopAndGo: { name: 'Stop & Go', desc: 'Dash 后移动 +1' },
  hawkeye: { name: 'Hawkeye', desc: '枪射程 +1' },
  daredevil: { name: 'Daredevil', desc: '击退距离 +2' },
  godLikeSpeed: { name: 'God-Like Speed', desc: '移动 +1' },
  magicalMastery: { name: 'Magical Mastery', desc: '技能射程 +1' },
  ironcladGuard: { name: 'Ironclad Guard', desc: '在掩体中受到伤害再 -40%' },
  ironBody: { name: 'Iron Body', desc: '同一回合被攻击 2 次后，本回合受到伤害 -20%' },
  regenerate1: { name: 'Regenerate 1', desc: '回合结束回复 5% HP' },
  invigorate1: { name: 'Invigorate 1', desc: '回合结束回复 5% SP' },
  soulRepose: { name: 'Soul Repose', desc: '在掩体中（回合结束）回复 7% SP' },
  endure: { name: 'Endure', desc: '被打倒时以 1 HP 复活，每场一次' },
  trumpCard: { name: 'Trump Card', desc: 'HP 降到 50% 以下时回复（Power 80）且下次攻击 ×1.5，每场一次' },
  broadPerspective: { name: 'Broad Perspective', desc: '从高处射击有 35% 几率打倒目标' },
  luckyPunch: { name: 'Lucky Punch', desc: '近战有 25% 几率打倒目标' },
  comandante: { name: 'Comandante', desc: '获得 1 More 时移动 +1' },
  pedalToTheMetal: { name: 'Pedal to the Metal', desc: 'HP 满时移动 +2' },
  neverSayDie: { name: 'Never Say Die', desc: 'Charge 中任何位置都视为在掩体中' },
  punisherOfReckless: { name: 'Punisher of the Reckless', desc: '对不在掩体中的目标伤害 +10%' },
  sharpEyedWildcat: { name: 'Sharp-Eyed Wildcat', desc: '对掩体中的目标伤害 +10%' },
  finishingBlow: { name: 'Finishing Blow', desc: '对倒地目标伤害 +10%' },
  unstoppable: { name: 'Unstoppable', desc: '获得 1 More 后攻击技能 SP 减半' },
  breakAndRecovery: { name: 'Break & Recovery', desc: 'Triple Threat 后全员回复 5% HP' },
  firstAid: { name: 'First Aid', desc: '附近（3 格内，PH）队友受伤时自动回复（Power 65，PH），每回合 1 次' },
  ailmentShield: { name: 'Ailment Shield', desc: '相邻队友中异常时自动解除，每回合 1 次' },
  reverseTheScales: { name: 'Reverse the Scales', desc: '1 More 中开枪时与目标换位，每回合 1 次' },
};

// ---------- 我方（Cogito 角色表 Lv19/21：HP SP MOV MEL RNG R 枪型） ----------
export const JOKER: UnitDef = {
  id: 'joker', name: 'Joker', side: 'ally', isLeader: true,
  maxHp: 136, maxSp: 49, move: 6, melee: 21, gun: { power: 17, range: 8, shape: 'single' },
  skills: [SKILLS.eiha], unique: UNIQUES.phantomJudge, charges: CHARGES.joker, passives: ['trumpCard'],
};
export const SKULL: UnitDef = {
  id: 'skull', name: '龙司 Skull', side: 'ally',
  maxHp: 171, maxSp: 34, move: 6, melee: 28, gun: { power: 19, range: 5, shape: 'aoe' },
  skills: [SKILLS.zio], unique: UNIQUES.brigantine, charges: CHARGES.skull, passives: ['endure'],
};
export const PANTHER: UnitDef = {
  id: 'panther', name: '杏 Panther', side: 'ally',
  maxHp: 108, maxSp: 64, move: 5, melee: 13, gun: { power: 15, range: 7, shape: 'aoe' },
  skills: [SKILLS.agi, SKILLS.maragi], unique: UNIQUES.femmeFatale, charges: CHARGES.panther, passives: ['unstoppable'],
};
export const MONA: UnitDef = {
  id: 'mona', name: '摩尔加纳 Mona', side: 'ally',
  maxHp: 101, maxSp: 58, move: 7, melee: 20, gun: { power: 14, range: 7, shape: 'single' },
  skills: [SKILLS.garu, SKILLS.dia, SKILLS.media], unique: UNIQUES.windsOfTime, charges: CHARGES.mona, passives: ['luckyPunch'],
};
export const FOX: UnitDef = {
  id: 'fox', name: '祐介 Fox', side: 'ally',
  maxHp: 128, maxSp: 43, move: 7, melee: 25, gun: { power: 15, range: 9, shape: 'single' },
  skills: [SKILLS.bufu, SKILLS.rakukaja], unique: UNIQUES.likeAPhantom, charges: CHARGES.fox, passives: ['broadPerspective'],
};
export const QUEEN: UnitDef = {
  id: 'queen', name: '真 Queen', side: 'ally',
  maxHp: 156, maxSp: 52, move: 5, melee: 29, gun: { power: 20, range: 6, shape: 'single' },
  skills: [SKILLS.frei, SKILLS.tarukaja], unique: UNIQUES.fullThrottle, charges: CHARGES.queen, passives: ['pedalToTheMetal'],
};
export const NOIR: UnitDef = {
  id: 'noir', name: '春 Noir', side: 'ally',
  maxHp: 121, maxSp: 47, move: 4, melee: 33, gun: { power: 23, range: 6, shape: 'explode' },
  skills: [SKILLS.psi, SKILLS.diamrita], unique: UNIQUES.nobleLady, charges: CHARGES.noir,
};
export const ERINA: UnitDef = {
  id: 'erina', name: '艾丽娜 Erina', side: 'ally',
  maxHp: 178, maxSp: 65, move: 6, melee: 31, gun: { power: 20, range: 5, shape: 'aoe' },
  skills: [SKILLS.partisan, SKILLS.sukukaja], unique: UNIQUES.flagOfFreedom, charges: CHARGES.erina, passives: ['comandante'],
};
export const KASUMI: UnitDef = {
  id: 'kasumi', name: '霞 Kasumi', side: 'ally',
  maxHp: 111, maxSp: 42, move: 6, melee: 20, gun: { power: 16, range: 9, shape: 'single' },
  skills: [SKILLS.kouha, SKILLS.dormina], unique: UNIQUES.pathway, charges: CHARGES.kasumi,
};
/**
 * 明智 Crow（DLC）：初始技能 Megido、Charge Phantom Step / Essence of Sorcery、Unique Truth Seeker、被动 Reverse the Scales（Samurai Gamers 角色页 / ibunroku）。
 * HP/SP/移动/近战/枪攻/射程全部 PH（公开资料没有找到 Akechi 的数值表）。
 */
export const CROW: UnitDef = {
  id: 'crow', name: '明智 Crow', side: 'ally',
  maxHp: 130, maxSp: 50, move: 6, melee: 24, gun: { power: 18, range: 7, shape: 'single' },
  skills: [SKILLS.megido, SKILLS.tarukaja], unique: UNIQUES.truthSeeker, charges: CHARGES.crow, passives: ['reverseTheScales'],
};
/** Like a Phantom 的诱饵（HP/外观 PH） */
export const decoyDef = (id: string): UnitDef => ({ id, name: '诱饵', side: 'ally', decoy: true, maxHp: 1, maxSp: 0, move: 0, melee: 0, skills: [], noFollowUp: true });

/** 护送对象：Cogito C109「Toshiro has 85 HP 6 Move」，不能攻击、不能 Dash */
export const TOSHIRO_ESCORT: UnitDef = {
  id: 'toshiro', name: '春日部 Toshiro', side: 'ally', escort: true, noFollowUp: true,
  maxHp: 85, maxSp: 0, move: 6, melee: 0, skills: [],
};
export const ROSTER: UnitDef[] = [JOKER, SKULL, PANTHER, MONA, FOX, QUEEN, NOIR, ERINA, KASUMI, CROW];

// ---------- 敌人（类型按 Cogito AAA115；数值全部 PH） ----------
type EnemyOpts = Partial<UnitDef>;
export function enemy(id: string, name: string, role: UnitDef['role'], hp: number, o: EnemyOpts = {}): UnitDef {
  const base: UnitDef = {
    id, name, side: 'enemy', role, maxHp: hp, maxSp: 99, move: 4, melee: 14, skills: [],
  };
  if (role === 'shooter') Object.assign(base, { move: 4, melee: 8, gun: { power: 14, range: 6 } });
  if (role === 'brute') Object.assign(base, { move: 5, melee: 18 });
  if (role === 'revenger') Object.assign(base, { move: 4, melee: 22 });
  if (role === 'shielder') Object.assign(base, { move: 3, melee: 10, gun: { power: 14, range: 5 }, facing: { x: 0, y: 1 } });
  if (role === 'teleporter') Object.assign(base, { move: 4, melee: 16, gun: { power: 12, range: 5 } });
  if (role === 'launcher') Object.assign(base, { move: 3, melee: 16, gun: { power: 18, range: 5 } }); // gun = Stone Throwing
  if (role === 'supporter') Object.assign(base, { move: 3, melee: 8, skills: [SKILLS.dia, SKILLS.sukukaja, SKILLS.zio] });
  return { ...base, ...o };
}
export const dummyTarget = (id: string, name = '木人', hp = 250): UnitDef =>
  enemy(id, name, 'brute', hp, { move: 0, melee: 0 });
export const prop = (id: string, kind: 'barrel' | 'box' | 'speaker' | 'flag', o: Partial<UnitDef> = {}): UnitDef => ({
  id, name: kind === 'barrel' ? '油桶' : kind === 'box' ? '木箱' : kind === 'flag' ? '旗帜' : '喇叭', side: 'neutral', prop: kind,
  maxHp: kind === 'barrel' ? 1 : 999, maxSp: 0, move: 0, melee: 0, skills: [], ...o,
});

// ---------- 地图解析 ----------
const LEGEND: Record<string, TileKind> = { '.': 'floor', '#': 'wall', h: 'half', H: 'full', E: 'exit' };
const jump = (ax: number, ay: number, bx: number, by: number): DashLink => ({ a: { x: ax, y: ay }, b: { x: bx, y: by }, kind: 'jump' });

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

export const rangeMapC = () => rangeMap('range-c', '元素靶场 C（祐介/艾丽娜/明智 Unique）', FOX, ERINA, CROW);

/**
 * 机关图（12×8）：踩着开门的开关（hold）、切换开关（toggle，开 A 关 B）、升降台（开关切换高低）、跳台（高台↔高台）、
 * 监视摄像头（踏入黄色范围 → 警报 → 援军）、定时门（每 2 回合开关一次）。对应 Cogito/gameline/Neoseeker 的原作关卡结构。
 */
export function mechMap(): MapDef {
  const rows = [
    '. . . . . # . . . . 1 .',
    '. . . . . # . . h . . .',
    '. . . . . . . . . . . .',
    '. . . . . # # # # . . .',
    '. h . . . . . . . . 2 .',
    '. . . . . # . . # . . .',
    '. J . S . # . . . . 3 .',
    '. . . P . # . . . . . .',
  ];
  const heights = [
    '000000000000',
    '000000000000',
    '000000000000',
    '000000000000',
    '000000000000',
    '220000000000',
    '220000000000',
    '000000000000',
  ];
  return {
    id: 'mech', name: '测试图 · 机关（门/开关/升降台/摄像头/跳台）', objective: '击败全部敌人', turnTarget: 6,
    ...parseMap(rows, {
      J: JOKER, S: SKULL, P: PANTHER,
      '1': enemy('m1', 'Musketeer', 'shooter', 60),
      '2': enemy('m2', 'Grenadier', 'brute', 70),
      '3': enemy('m3', 'Musketeer', 'shooter', 60),
    }, heights),
    links: [ladder(2, 6, 1, 6), jump(0, 5, 0, 4)],
    doors: [
      { id: 'A', cells: [{ x: 5, y: 2 }], open: false },
      { id: 'B', cells: [{ x: 5, y: 4 }], open: true },
      { id: 'T', cells: [{ x: 8, y: 4 }], open: true, everyTurns: 2 },
    ],
    switches: [
      { id: 'sw-hold', pos: { x: 4, y: 1 }, kind: 'hold', doors: ['A'] },
      { id: 'sw-toggle', pos: { x: 3, y: 4 }, kind: 'toggle', doors: ['A', 'B'] },
      { id: 'sw-lift', pos: { x: 2, y: 7 }, kind: 'elevator', elevator: 'L' },
    ],
    elevators: [{ id: 'L', cells: [{ x: 0, y: 4 }, { x: 0, y: 3 }], low: 0, high: 2, up: false }],
    cameras: [{
      id: 'cam1', pos: { x: 6, y: 7 }, cells: [{ x: 6, y: 6 }, { x: 7, y: 6 }, { x: 6, y: 5 }, { x: 7, y: 5 }, { x: 7, y: 7 }],
      spawn: [{ def: enemy('r1', '援军 Musketeer', 'shooter', 50), pos: { x: 10, y: 7 } }, { def: enemy('r2', '援军 Grenadier', 'brute', 60), pos: { x: 11, y: 5 } }],
    }],
    win: { type: 'defeatAll' },
  };
}

/**
 * Boss 图（11×8）：第 2 回合敌方援军；Boss HP 锁在 50%（hpFloor），打到 50% → 进入第 2 阶段（回复、换攻击方式、
 * 召唤护卫、改目标为「击败 Boss」）。对应原作 Boss 关「阶段 1 → 阶段 2」结构（ESTNN Yoshiki 攻略 / Cogito Phase 1/2）。
 */
export function bossMap(): MapDef {
  const rows = [
    '. . . . . . . . . . .',
    '. . h . . B . . h . .',
    '. . . . . . . . . . .',
    '. H . . . . . . . H .',
    '. . . 1 . . . 2 . . .',
    '. . . . . h . . . . .',
    '. J . . . S . . . P .',
    '. . . . . . . . . . .',
  ];
  return {
    id: 'boss', name: '测试图 · Boss 阶段 + 援军', objective: '击败 Boss', turnTarget: 7,
    ...parseMap(rows, {
      J: JOKER, S: SKULL, P: PANTHER,
      B: enemy('boss', 'Boss · Marie', 'shooter', 300, { hpFloor: 150, melee: 20, gun: { power: 18, range: 7 }, move: 3, isTarget: true }),
      '1': enemy('g1', 'Musketeer', 'shooter', 60),
      '2': enemy('g2', 'Musketeer', 'shooter', 60),
    }),
    reserves: [FOX, ERINA],
    win: { type: 'defeatTarget', targetId: 'boss' },
    events: [
      { id: 'wave2', when: { type: 'turn', turn: 2, phase: 'enemy' }, do: [
        { type: 'message', text: '敌方援军出现！' },
        { type: 'spawn', units: [{ def: enemy('w1', '援军 Revenger', 'revenger', 90), pos: { x: 0, y: 0 } }, { def: enemy('w2', '援军 Supporter', 'supporter', 55), pos: { x: 10, y: 0 } }] },
      ] },
      { id: 'phase2', when: { type: 'hpBelow', unitId: 'boss', ratio: 0.5 }, do: [
        { type: 'message', text: 'Boss 进入第 2 阶段！' },
        { type: 'setUnit', unitId: 'boss', patch: { hpFloor: 0, role: 'brute', move: 5, melee: 30 }, healRatio: 0.2, bossPhase: 2 },
        { type: 'spawn', units: [{ def: enemy('gd1', '护卫 Shielder', 'shielder', 70, { facing: { x: 0, y: 1 } }), pos: { x: 4, y: 0 } }, { def: enemy('gd2', '护卫 Shielder', 'shielder', 70, { facing: { x: 0, y: 1 } }), pos: { x: 6, y: 0 } }] },
      ] },
    ],
  };
}

export const MAPS: { id: string; name: string; make: () => MapDef }[] = [
  { id: 'test-01', name: '综合测试图', make: testMap },
  { id: 'tut-followup', name: '教学·推落追击', make: followUpMap },
  { id: 'test-02', name: '特殊敌人', make: specialsMap },
  { id: 'test-03', name: '护送', make: escortMap },
  { id: 'range-a', name: '靶场 A', make: rangeMapA },
  { id: 'range-b', name: '靶场 B', make: rangeMapB },
  { id: 'range-c', name: '靶场 C（新 Unique）', make: rangeMapC },
  { id: 'mech', name: '机关图', make: mechMap },
  { id: 'boss', name: 'Boss/援军', make: bossMap },
];
