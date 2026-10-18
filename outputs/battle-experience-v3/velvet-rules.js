/**
 * 天鹅绒监狱 · Persona 合成规则切片（纯逻辑，无 UI）
 *
 * P5 参考系统：双体合成、技能继承、图鉴登记/取出、绞刑（献祭）、
 * 电椅（物品化）、禁闭（属性训练）。这里是可测试的最小规则，
 * 不是完整 22 阿卡纳融合表；后续再补全配方与特殊合成。
 */

export const ARCANA = [
  'fool', 'magician', 'priestess', 'empress', 'emperor', 'hierophant',
  'lovers', 'chariot', 'strength', 'hermit', 'wheel', 'justice',
  'hanged', 'death', 'temperance', 'devil', 'tower', 'star',
  'moon', 'sun', 'judgement', 'world',
];

export const ARCANA_LABELS = {
  fool: '愚者', magician: '魔术师', priestess: '女祭司', empress: '女皇', emperor: '皇帝',
  hierophant: '教皇', lovers: '恋人', chariot: '战车', strength: '力量', hermit: '隐者',
  wheel: '命运', justice: '正义', hanged: '倒吊人', death: '死神', temperance: '节制',
  devil: '恶魔', tower: '塔', star: '星', moon: '月', sun: '太阳', judgement: '审判', world: '世界',
};

export const PERSONAS = {
  observer: {
    id: 'observer', name: '观测者', arcana: 'hermit', level: 5, element: 'knowledge',
    stats: { hp: 42, sp: 30, attack: 8, defense: 6 },
    skills: ['starfall', 'echo'],
  },
  rebel: {
    id: 'rebel', name: '反抗者', arcana: 'chariot', level: 6, element: 'guts',
    stats: { hp: 50, sp: 24, attack: 11, defense: 7 },
    skills: ['thrust', 'endure'],
  },
  weaver: {
    id: 'weaver', name: '织线者', arcana: 'magician', level: 5, element: 'dexterity',
    stats: { hp: 38, sp: 28, attack: 9, defense: 5 },
    skills: ['blade', 'charge'],
  },
  lamplighter: {
    id: 'lamplighter', name: '守灯人', arcana: 'star', level: 7, element: 'kindness',
    stats: { hp: 44, sp: 36, attack: 6, defense: 9 },
    skills: ['frost', 'heal'],
  },
  echo: {
    id: 'echo', name: '回声', arcana: 'priestess', level: 6, element: 'charm',
    stats: { hp: 40, sp: 32, attack: 8, defense: 6 },
    skills: ['echoSlash', 'inspire'],
  },
  sophist: {
    id: 'sophist', name: '诡辩的假面', arcana: 'devil', level: 8, element: 'knowledge',
    stats: { hp: 46, sp: 34, attack: 10, defense: 7 },
    skills: ['sophistry', 'starfall'],
  },
  stingy: {
    id: 'stingy', name: '刻薄的假面', arcana: 'tower', level: 7, element: 'charm',
    stats: { hp: 48, sp: 28, attack: 11, defense: 6 },
    skills: ['sting', 'echoSlash'],
  },
};

const FUSION_NAMES = {
  star: '夜航者', strength: '负重者', devil: '契约者', tower: '断塔者',
  moon: '潮汐者', sun: '燃昼者', temperance: '调停者', magician: '造物者',
  priestess: '倾听者', chariot: '破阵者', hermit: '守夜者', justice: '裁断者',
  lovers: '共鸣者', death: '送葬者', hanged: '悬停者', wheel: '转向者',
  judgement: '唤醒者', world: '收束者', fool: '无名者', empress: '孕育者',
  emperor: '统御者', hierophant: '传道者',
};

const PAIR_RECIPES = {
  'hermit+magician': 'star',
  'chariot+priestess': 'strength',
  'hermit+devil': 'moon',
  'magician+chariot': 'sun',
  'star+tower': 'judgement',
  'devil+tower': 'death',
};

export function resultArcana(a, b) {
  const key = [a.arcana, b.arcana].sort().join('+');
  if (PAIR_RECIPES[key]) return PAIR_RECIPES[key];
  const ai = ARCANA.indexOf(a.arcana);
  const bi = ARCANA.indexOf(b.arcana);
  return ARCANA[(ai + bi + 1) % ARCANA.length];
}

export function fuse(aId, bId, { inherit = [] } = {}) {
  const a = PERSONAS[aId];
  const b = PERSONAS[bId];
  if (!a || !b) return { ok: false, reason: '没有这个 Persona。' };
  if (aId === bId) return { ok: false, reason: '不能和同一个自己合成。' };
  const arcana = resultArcana(a, b);
  const level = Math.floor((a.level + b.level) / 2) + 1;
  const element = a.level >= b.level ? a.element : b.element;
  const pool = [...new Set([...a.skills, ...b.skills])];
  const skills = (inherit.length ? inherit.filter(skill => pool.includes(skill)) : pool).slice(0, 4);
  const persona = {
    id: `fusion-${arcana}-${level}`,
    name: FUSION_NAMES[arcana] ?? '无名者',
    arcana,
    level,
    element,
    stats: {
      hp: Math.round((a.stats.hp + b.stats.hp) / 2) + level,
      sp: Math.round((a.stats.sp + b.stats.sp) / 2) + Math.floor(level / 2),
      attack: Math.round((a.stats.attack + b.stats.attack) / 2) + 1,
      defense: Math.round((a.stats.defense + b.stats.defense) / 2) + 1,
    },
    skills: skills.length ? skills : [pool[0]],
    parents: [aId, bId],
  };
  return { ok: true, persona, cost: level * 500 };
}

export function createCompendium() {
  return { entries: [] };
}

export function register(compendium, persona) {
  if (!persona) return { ok: false, reason: '没有可登记的 Persona。' };
  const existing = compendium.entries.findIndex(entry => entry.id === persona.id);
  if (existing >= 0) compendium.entries[existing] = { ...persona };
  else compendium.entries.push({ ...persona });
  return { ok: true };
}

export function withdraw(compendium, id, wallet) {
  const persona = compendium.entries.find(entry => entry.id === id);
  if (!persona) return { ok: false, reason: '图鉴里没有这个 Persona。' };
  const cost = persona.level * 300;
  if (wallet && wallet.money < cost) return { ok: false, reason: `钱不够（需要 ¥${cost}）。` };
  if (wallet) wallet.money -= cost;
  return { ok: true, persona: { ...persona }, cost };
}

export function sacrifice(base, fodder) {
  if (!base || !fodder) return { ok: false, reason: '缺少献祭对象。' };
  if (base.id === fodder.id) return { ok: false, reason: '不能献祭自己。' };
  const result = {
    ...base,
    level: base.level + 1,
    stats: {
      ...base.stats,
      hp: base.stats.hp + 5,
      sp: base.stats.sp + 3,
      attack: base.stats.attack + 1,
    },
  };
  return { ok: true, persona: result, consumed: fodder.id };
}

export function itemize(persona) {
  if (!persona) return { ok: false, reason: '没有可处置的 Persona。' };
  const map = {
    knowledge: 'psyShard',
    guts: 'physShard',
    dexterity: 'windShard',
    kindness: 'frostShard',
    charm: 'emberShard',
  };
  const itemId = map[persona.element] ?? 'psyShard';
  const qty = persona.level >= 8 ? 2 : 1;
  return { ok: true, itemId, qty, message: `${persona.name} 被送上电椅，留下 ${itemId} ×${qty}。` };
}

export function lockdown(persona, stat) {
  if (!persona || !['hp', 'sp', 'attack', 'defense'].includes(stat)) {
    return { ok: false, reason: '不能训练这个属性。' };
  }
  const boost = stat === 'hp' ? 8 : stat === 'sp' ? 6 : 2;
  return {
    ok: true,
    persona: { ...persona, stats: { ...persona.stats, [stat]: persona.stats[stat] + boost } },
    message: `${persona.name} 在禁闭中熬过了训练，${stat} +${boost}。`,
  };
}
