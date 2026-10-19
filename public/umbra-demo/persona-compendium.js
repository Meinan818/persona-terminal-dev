/**
 * Persona 图鉴 · 唯一事实源
 *
 * 规则：
 *  - Persona 的 id / 名字 / 阿卡纳 / 等级 / 属性 / 基础数值 / 技能 / 融合配方全部预先定义。
 *  - AI 只能从图鉴里选择 Persona、生成台词/人格/事件，不能创造新 Persona 或改定义。
 *  - 交涉收服必须落到图鉴里已有的 Persona；融合结果也必须来自图鉴。
 *  - 敌人 Shadow 可以和 Persona 分开命名；收服时才归到图鉴 Persona。
 */

export const SKILLS = {
  starfall: { id: 'starfall', name: '星落', element: 'knowledge', power: 36, sp: 18, status: 'confuse', target: 'enemy' },
  echo: { id: 'echo', name: '回响', element: 'knowledge', power: 20, sp: 8, target: 'enemy' },
  allsee: { id: 'allsee', name: '全知之眼', element: 'knowledge', power: 0, sp: 12, target: 'self', analyze: true },
  thrust: { id: 'thrust', name: '疾风刺', element: 'guts', power: 34, sp: 12, target: 'enemy' },
  endure: { id: 'endure', name: '不屈', element: 'guts', power: 0, sp: 10, target: 'self', guard: true },
  stormSlash: { id: 'stormSlash', name: '暴风斩', element: 'guts', power: 40, sp: 16, target: 'enemy' },
  blade: { id: 'blade', name: '飞刃', element: 'dexterity', power: 32, sp: 12, target: 'enemy' },
  charge: { id: 'charge', name: '蓄力', element: 'dexterity', power: 0, sp: 8, target: 'self', attackUp: 1.3 },
  chaosWord: { id: 'chaosWord', name: '乱语', element: 'dexterity', power: 26, sp: 12, status: 'confuse', target: 'enemy' },
  frost: { id: 'frost', name: '霜环', element: 'kindness', power: 24, sp: 10, status: 'freeze', target: 'enemy' },
  heal: { id: 'heal', name: '微光', element: 'kindness', power: 30, sp: 8, target: 'ally', heal: true },
  sunMirror: { id: 'sunMirror', name: '日镜', element: 'kindness', power: 40, sp: 14, target: 'ally', heal: true },
  echoSlash: { id: 'echoSlash', name: '回音斩', element: 'charm', power: 30, sp: 12, status: 'burn', target: 'enemy' },
  inspire: { id: 'inspire', name: '鼓舞', element: 'charm', power: 0, sp: 8, target: 'ally', attackUp: 1.3 },
  carmenSong: { id: 'carmenSong', name: '卡门之歌', element: 'charm', power: 34, sp: 14, status: 'confuse', target: 'enemy' },
  sunDisk: { id: 'sunDisk', name: '日轮', element: 'charm', power: 42, sp: 18, target: 'enemy' },
  heavyPress: { id: 'heavyPress', name: '重压', element: 'guts', power: 44, sp: 18, target: 'enemy' },
  nightVeil: { id: 'nightVeil', name: '夜帷', element: 'knowledge', power: 34, sp: 14, status: 'confuse', target: 'enemy' },
  contract: { id: 'contract', name: '契约', element: 'knowledge', power: 0, sp: 10, target: 'enemy', debuff: 'defense' },
  judgement: { id: 'judgement', name: '裁断', element: 'knowledge', power: 46, sp: 20, target: 'enemy' },
  craft: { id: 'craft', name: '造物', element: 'dexterity', power: 0, sp: 8, target: 'self', attackUp: 1.3 },
  prophecy: { id: 'prophecy', name: '预言', element: 'knowledge', power: 0, sp: 8, target: 'self', analyze: true },
  worldEdge: { id: 'worldEdge', name: '世界尽头', element: 'knowledge', power: 56, sp: 26, target: 'enemy', unique: true },
};

const ATTRS = ['knowledge', 'guts', 'dexterity', 'kindness', 'charm'];

function makePersona(data) {
  const hp = 30 + data.level;
  const sp = 20 + data.level;
  const attack = 6 + Math.floor(data.level / 2);
  const defense = 4 + Math.floor(data.level / 3);
  return {
    ...data,
    stats: { hp, sp, attack, defense },
    inheritPool: data.inheritPool ?? Object.keys(SKILLS),
  };
}

export const COMPENDIUM = [
  makePersona({ id: 'observer', name: '奥丁·全知', arcana: 'hermit', level: 5, element: 'knowledge', skills: ['starfall', 'echo', 'allsee'], recruitFrom: 'knowledge' }),
  makePersona({ id: 'rebel', name: '须佐之男·斩蛇', arcana: 'chariot', level: 6, element: 'guts', skills: ['thrust', 'endure', 'stormSlash'], recruitFrom: 'guts' }),
  makePersona({ id: 'weaver', name: '赫尔墨斯·疾风', arcana: 'magician', level: 5, element: 'dexterity', skills: ['blade', 'charge', 'chaosWord'], recruitFrom: 'dexterity' }),
  makePersona({ id: 'lamplighter', name: '天照·守灯', arcana: 'star', level: 7, element: 'kindness', skills: ['frost', 'heal', 'sunMirror'], recruitFrom: 'kindness' }),
  makePersona({ id: 'echo', name: '卡门·回响', arcana: 'priestess', level: 6, element: 'charm', skills: ['echoSlash', 'inspire', 'carmenSong'], recruitFrom: 'charm' }),
  makePersona({ id: 'sophist', name: '普罗米修斯·诡辩', arcana: 'devil', level: 8, element: 'knowledge', skills: ['starfall', 'allsee', 'contract'], recruitFrom: 'knowledge' }),
  makePersona({ id: 'stingy', name: '厄里斯·刻薄', arcana: 'tower', level: 7, element: 'charm', skills: ['echoSlash', 'chaosWord', 'carmenSong'], recruitFrom: 'charm' }),
  makePersona({ id: 'pleiades', name: '普勒阿得斯·星航', arcana: 'star', level: 6, element: 'kindness', skills: ['starfall'], fusionOnly: true }),
  makePersona({ id: 'achilles', name: '阿喀琉斯·不屈', arcana: 'strength', level: 8, element: 'guts', skills: ['thrust', 'endure', 'stormSlash'], recruitFrom: 'guts' }),
  makePersona({ id: 'sunwukong', name: '孙悟空·错拍', arcana: 'tower', level: 9, element: 'dexterity', skills: ['blade', 'charge', 'chaosWord'], recruitFrom: 'dexterity' }),
  makePersona({ id: 'kaguya', name: '辉夜姬·带刺', arcana: 'moon', level: 8, element: 'kindness', skills: ['frost', 'heal', 'sunMirror'], recruitFrom: 'kindness' }),
  makePersona({ id: 'aphrodite', name: '阿佛洛狄忒·魅影', arcana: 'lovers', level: 8, element: 'charm', skills: ['echoSlash', 'inspire', 'carmenSong'], recruitFrom: 'charm' }),
  makePersona({ id: 'atlas', name: '阿特拉斯·负重', arcana: 'strength', level: 12, element: 'guts', skills: ['thrust', 'heavyPress', 'endure'], fusionOnly: true }),
  makePersona({ id: 'loki', name: '洛基·无名', arcana: 'fool', level: 10, element: 'dexterity', skills: ['blade', 'chaosWord', 'craft'], fusionOnly: true }),
  makePersona({ id: 'nyx', name: '倪克斯·潮汐', arcana: 'moon', level: 14, element: 'knowledge', skills: ['nightVeil', 'starfall', 'allsee'], fusionOnly: true }),
  makePersona({ id: 'charon', name: '卡戎·夜航', arcana: 'death', level: 12, element: 'knowledge', skills: ['nightVeil', 'echo', 'contract'], fusionOnly: true }),
  makePersona({ id: 'helios', name: '赫利俄斯·燃昼', arcana: 'sun', level: 10, element: 'charm', skills: ['echoSlash', 'sunDisk', 'inspire'], fusionOnly: true }),
  makePersona({ id: 'themis', name: '阿斯翠亚·裁断', arcana: 'justice', level: 11, element: 'knowledge', skills: ['allsee', 'contract', 'judgement'], fusionOnly: true }),
  makePersona({ id: 'daedalus', name: '代达罗斯·造物', arcana: 'magician', level: 10, element: 'dexterity', skills: ['blade', 'charge', 'craft'], fusionOnly: true }),
  makePersona({ id: 'pythia', name: '皮提亚·倾听', arcana: 'priestess', level: 8, element: 'knowledge', skills: ['allsee', 'echo', 'prophecy'], recruitFrom: 'knowledge' }),
  makePersona({ id: 'izanagi', name: '伊邪那岐·大神', arcana: 'fool', level: 18, element: 'knowledge', skills: ['starfall', 'thrust', 'allsee', 'worldEdge'], fusionOnly: true }),
  makePersona({ id: 'izanami', name: '伊邪那美·黄泉', arcana: 'empress', level: 18, element: 'kindness', skills: ['frost', 'heal', 'nightVeil', 'worldEdge'], fusionOnly: true }),
  makePersona({ id: 'zeus', name: '宙斯·统御', arcana: 'emperor', level: 16, element: 'guts', skills: ['thrust', 'stormSlash', 'judgement'], fusionOnly: true }),
  makePersona({ id: 'solomon', name: '所罗门·智慧', arcana: 'hierophant', level: 12, element: 'knowledge', skills: ['allsee', 'contract', 'judgement'], recruitFrom: 'knowledge' }),
  makePersona({ id: 'moses', name: '摩西·传道', arcana: 'hierophant', level: 13, element: 'knowledge', skills: ['allsee', 'judgement', 'prophecy'], fusionOnly: true }),
  makePersona({ id: 'fortuna', name: '福尔图娜·转向', arcana: 'wheel', level: 11, element: 'charm', skills: ['chaosWord', 'inspire', 'sunDisk'], recruitFrom: 'charm' }),
  makePersona({ id: 'moirai', name: '命运三女神·纺线', arcana: 'wheel', level: 14, element: 'knowledge', skills: ['nightVeil', 'contract', 'prophecy'], fusionOnly: true }),
  makePersona({ id: 'icarus', name: '伊卡洛斯·坠日', arcana: 'hanged', level: 9, element: 'dexterity', skills: ['blade', 'charge', 'sunDisk'], recruitFrom: 'dexterity' }),
  makePersona({ id: 'odinHanged', name: '奥丁·悬吊', arcana: 'hanged', level: 15, element: 'knowledge', skills: ['starfall', 'allsee', 'worldEdge'], fusionOnly: true }),
  makePersona({ id: 'hestia', name: '赫斯提亚·炉火', arcana: 'temperance', level: 10, element: 'kindness', skills: ['heal', 'sunMirror', 'frost'], recruitFrom: 'kindness' }),
  makePersona({ id: 'iris', name: '伊里斯·虹桥', arcana: 'temperance', level: 9, element: 'charm', skills: ['inspire', 'echoSlash', 'carmenSong'], recruitFrom: 'charm' }),
  makePersona({ id: 'gabriel', name: '加百列·唤醒', arcana: 'judgement', level: 15, element: 'kindness', skills: ['sunMirror', 'heal', 'judgement'], fusionOnly: true }),
  makePersona({ id: 'michael', name: '米迦勒·裁军', arcana: 'judgement', level: 16, element: 'guts', skills: ['stormSlash', 'thrust', 'judgement'], fusionOnly: true }),
  makePersona({ id: 'gaia', name: '盖亚·收束', arcana: 'world', level: 17, element: 'kindness', skills: ['frost', 'heal', 'worldEdge'], fusionOnly: true }),
  makePersona({ id: 'ymir', name: '尤弥尔·原初', arcana: 'world', level: 17, element: 'guts', skills: ['heavyPress', 'endure', 'worldEdge'], fusionOnly: true }),
  makePersona({ id: 'athena', name: '雅典娜·明眸', arcana: 'justice', level: 10, element: 'knowledge', skills: ['allsee', 'starfall', 'judgement'], recruitFrom: 'knowledge' }),
  makePersona({ id: 'artemis', name: '阿尔忒弥斯·月矢', arcana: 'moon', level: 9, element: 'kindness', skills: ['frost', 'heal', 'sunMirror'], recruitFrom: 'kindness' }),
  makePersona({ id: 'gilgamesh', name: '吉尔伽美什·王之财宝', arcana: 'emperor', level: 16, element: 'guts', skills: ['thrust', 'heavyPress', 'stormSlash'], fusionOnly: true }),
  makePersona({ id: 'beowulf', name: '贝奥武夫·屠龙', arcana: 'strength', level: 11, element: 'guts', skills: ['thrust', 'heavyPress', 'endure'], recruitFrom: 'guts' }),
  makePersona({ id: 'nezha', name: '哪吒·莲火', arcana: 'chariot', level: 9, element: 'charm', skills: ['blade', 'charge', 'sunDisk'], recruitFrom: 'charm' }),
  makePersona({ id: 'nuwa', name: '女娲·补天', arcana: 'empress', level: 16, element: 'kindness', skills: ['heal', 'sunMirror', 'frost'], fusionOnly: true }),
  makePersona({ id: 'shuten', name: '酒吞童子·鬼王', arcana: 'tower', level: 12, element: 'charm', skills: ['echoSlash', 'chaosWord', 'carmenSong'], recruitFrom: 'charm' }),
  makePersona({ id: 'tamamo', name: '玉藻前·九尾', arcana: 'devil', level: 13, element: 'charm', skills: ['echoSlash', 'carmenSong', 'chaosWord'], fusionOnly: true }),
  makePersona({ id: 'tengu', name: '天狗·风刃', arcana: 'hermit', level: 9, element: 'dexterity', skills: ['blade', 'charge', 'chaosWord'], recruitFrom: 'dexterity' }),
  makePersona({ id: 'indra', name: '因陀罗·雷杵', arcana: 'emperor', level: 14, element: 'guts', skills: ['thrust', 'stormSlash', 'judgement'], fusionOnly: true }),
  makePersona({ id: 'shiva', name: '湿婆·舞灭', arcana: 'death', level: 18, element: 'guts', skills: ['heavyPress', 'stormSlash', 'worldEdge'], fusionOnly: true }),
  makePersona({ id: 'phoenix', name: '凤凰·涅槃', arcana: 'sun', level: 13, element: 'charm', skills: ['sunDisk', 'heal', 'sunMirror'], recruitFrom: 'charm' }),
  makePersona({ id: 'baize', name: '白泽·知万物', arcana: 'hermit', level: 11, element: 'knowledge', skills: ['allsee', 'prophecy', 'contract'], recruitFrom: 'knowledge' }),
  makePersona({ id: 'orochi', name: '八岐大蛇·尾羽', arcana: 'tower', level: 15, element: 'guts', skills: ['heavyPress', 'nightVeil', 'stormSlash'], fusionOnly: true }),
];

export const COMPENDIUM_BY_ID = Object.fromEntries(COMPENDIUM.map(persona => [persona.id, persona]));

export const FUSION_RECIPES = [
  { a: 'observer', b: 'rebel', result: 'pleiades' },
  { a: 'weaver', b: 'echo', result: 'loki' },
  { a: 'lamplighter', b: 'sophist', result: 'izanami' },
  { a: 'rebel', b: 'stingy', result: 'atlas' },
  { a: 'pythia', b: 'daedalus', result: 'observer' },
  { a: 'nyx', b: 'helios', result: 'izanagi' },
  { a: 'themis', b: 'atlas', result: 'zeus' },
  { a: 'kaguya', b: 'aphrodite', result: 'lamplighter' },
];

export function getPersona(id) {
  return COMPENDIUM_BY_ID[id] ?? null;
}

export function recruitCandidates(element, level = 1) {
  return COMPENDIUM
    .filter(persona => !persona.fusionOnly && (!element || persona.recruitFrom === element))
    .sort((a, b) => Math.abs(a.level - level) - Math.abs(b.level - level) || a.level - b.level);
}

export function fusionResult(aId, bId) {
  const a = getPersona(aId);
  const b = getPersona(bId);
  if (!a || !b || aId === bId) return null;
  const keyA = [a.arcana, b.arcana].sort().join('+');
  const direct = FUSION_RECIPES.find(recipe => {
    const key = [getPersona(recipe.a)?.arcana, getPersona(recipe.b)?.arcana].sort().join('+');
    return key === keyA || (recipe.a === aId && recipe.b === bId) || (recipe.a === bId && recipe.b === aId);
  });
  if (direct) return getPersona(direct.result);
  const resultArcana = a.arcana === b.arcana ? a.arcana : [a.arcana, b.arcana].sort()[0];
  const pool = COMPENDIUM.filter(persona => persona.arcana === resultArcana && persona.id !== aId && persona.id !== bId);
  return pool.sort((x, y) => Math.abs(x.level - (a.level + b.level) / 2) - Math.abs(y.level - (a.level + b.level) / 2))[0]
    ?? COMPENDIUM.find(persona => persona.fusionOnly) ?? null;
}

export function validateCompendium() {
  const errors = [];
  const ids = new Set();
  const names = new Set();
  for (const persona of COMPENDIUM) {
    if (ids.has(persona.id)) errors.push(`duplicate id: ${persona.id}`);
    if (names.has(persona.name)) errors.push(`duplicate name: ${persona.name}`);
    ids.add(persona.id);
    names.add(persona.name);
    if (!ATTRS.includes(persona.element)) errors.push(`bad element: ${persona.id}`);
    for (const skillId of persona.skills) {
      if (!SKILLS[skillId]) errors.push(`missing skill ${skillId} on ${persona.id}`);
    }
    if (!persona.fusionOnly && !persona.recruitFrom) errors.push(`recruitable without source: ${persona.id}`);
  }
  for (const recipe of FUSION_RECIPES) {
    if (!getPersona(recipe.a) || !getPersona(recipe.b) || !getPersona(recipe.result)) {
      errors.push(`bad fusion recipe: ${recipe.a}+${recipe.b}=${recipe.result}`);
    }
  }
  return errors;
}
