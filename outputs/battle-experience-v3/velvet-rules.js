/**
 * 天鹅绒监狱 · Persona 合成规则
 *
 * 图鉴是唯一事实源：合成结果、属性、等级、技能上限都必须来自
 * persona-compendium.js；AI 和 UI 都不能临时创造新 Persona。
 */

import {
  PERSONAS,
  SKILLS,
  fusionResult,
  getPersona,
} from './p5r-compendium.js';

export const ARCANA = [
  'fool', 'magician', 'priestess', 'empress', 'emperor', 'hierophant',
  'lovers', 'chariot', 'strength', 'hermit', 'wheel', 'justice',
  'hanged', 'death', 'temperance', 'devil', 'tower', 'star',
  'moon', 'sun', 'judgement', 'faith', 'councillor', 'world',
];

export const ARCANA_LABELS = {
  fool: '愚者', magician: '魔术师', priestess: '女祭司', empress: '女皇', emperor: '皇帝',
  hierophant: '教皇', lovers: '恋人', chariot: '战车', strength: '力量', hermit: '隐者',
  wheel: '命运', justice: '正义', hanged: '倒吊人', death: '死神', temperance: '节制',
  devil: '恶魔', tower: '塔', star: '星', moon: '月', sun: '太阳', judgement: '审判',
  faith: '信念', councillor: '顾问官', world: '世界',
};

export { PERSONAS };

export function fuse(aId, bId, { inherit = [] } = {}) {
  const a = getPersona(aId);
  const b = getPersona(bId);
  if (!a || !b) return { ok: false, reason: '图鉴里没有这个 Persona。' };
  if (aId === bId) return { ok: false, reason: '不能和同一个自己合成。' };
  const result = fusionResult(aId, bId);
  if (!result) return { ok: false, reason: '这两张面具没有合法融合结果。' };
  const persona = {
    ...result,
    stats: { ...result.stats },
    skills: [...result.skills],
  };
  const parentPool = new Set([...a.skills, ...b.skills]);
  for (const skillId of inherit) {
    if (!parentPool.has(skillId)) continue;
    if (result.inheritPool && !result.inheritPool.includes(skillId)) continue;
    if (persona.skills.includes(skillId)) continue;
    persona.skills.push(skillId);
    if (persona.skills.length >= 6) break;
  }
  return { ok: true, persona, cost: result.level * 500 };
}

export function createCompendium() {
  return { entries: [] };
}

export function register(compendium, persona) {
  if (!persona) return { ok: false, reason: '没有可登记的 Persona。' };
  const source = getPersona(persona.id);
  if (!source) return { ok: false, reason: '图鉴里没有这个 Persona。' };
  const snapshot = {
    ...source,
    stats: { ...source.stats },
    skills: [...(persona.skills ?? source.skills)],
  };
  const existing = compendium.entries.findIndex(entry => entry.id === source.id);
  if (existing >= 0) compendium.entries[existing] = snapshot;
  else compendium.entries.push(snapshot);
  return { ok: true };
}

export function withdraw(compendium, id, wallet) {
  const persona = compendium.entries.find(entry => entry.id === id);
  if (!persona) return { ok: false, reason: '图鉴里没有这个 Persona。' };
  const cost = persona.level * 300;
  if (wallet && wallet.money < cost) return { ok: false, reason: `钱不够（需要 ¥${cost}）。` };
  if (wallet) wallet.money -= cost;
  return { ok: true, persona: { ...persona, stats: { ...persona.stats }, skills: [...persona.skills] }, cost };
}

export function sacrifice(base, fodder) {
  if (!base || !fodder) return { ok: false, reason: '缺少献祭对象。' };
  if (base.id === fodder.id) return { ok: false, reason: '不能献祭自己。' };
  const source = getPersona(base.id);
  if (!source) return { ok: false, reason: '图鉴里没有这个 Persona。' };
  const result = {
    ...base,
    level: Math.min(99, base.level + 1),
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
  const source = persona ? getPersona(persona.id) : null;
  if (!source) return { ok: false, reason: '图鉴里没有这个 Persona。' };
  const itemId = source.item ?? 'psyShard';
  const itemLabel = source.itemZh ?? itemId;
  const qty = 1;
  return { ok: true, itemId, itemLabel, qty, message: `${source.name} 被送上电椅，留下 ${itemLabel} ×${qty}。` };
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

export function skillName(id) {
  return SKILLS[id]?.name ?? id;
}
