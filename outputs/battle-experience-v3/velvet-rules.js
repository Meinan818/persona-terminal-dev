/**
 * 天鹅绒监狱 · Persona 合成规则
 *
 * 图鉴是唯一事实源：合成结果、属性、等级、技能上限都必须来自
 * persona-compendium.js；AI 和 UI 都不能临时创造新 Persona。
 */

import {
  PERSONAS,
  P5R_SPECIAL_FUSIONS,
  SKILLS,
  fusionResult,
  getPersona,
  specialFusionResult,
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

export function specialFuse(sourceIds, { inherit = [] } = {}) {
  if (!Array.isArray(sourceIds) || sourceIds.length < 2) {
    return { ok: false, reason: '特殊融合至少需要两张面具。' };
  }
  if (new Set(sourceIds).size !== sourceIds.length) {
    return { ok: false, reason: '特殊融合的素材不能重复。' };
  }
  const sources = sourceIds.map(id => getPersona(id));
  if (sources.some(persona => !persona)) {
    return { ok: false, reason: '图鉴里没有这个 Persona。' };
  }
  const result = specialFusionResult(sourceIds);
  if (!result) return { ok: false, reason: '这组面具没有特殊融合配方。' };
  const persona = {
    ...result,
    stats: { ...result.stats },
    skills: [...result.skills],
  };
  const parentPool = new Set(sources.flatMap(source => source.skills));
  for (const skillId of inherit) {
    if (!parentPool.has(skillId)) continue;
    if (result.inheritPool && !result.inheritPool.includes(skillId)) continue;
    if (persona.skills.includes(skillId)) continue;
    persona.skills.push(skillId);
    if (persona.skills.length >= 6) break;
  }
  return { ok: true, persona, cost: result.level * 500, sourceIds: [...sourceIds] };
}

export function specialRecipes(ownedIds = []) {
  const owned = new Set(ownedIds);
  return P5R_SPECIAL_FUSIONS
    .map(recipe => {
      const result = getPersona(recipe.resultId);
      if (!result) return null;
      const sources = recipe.sources
        .map(id => getPersona(id))
        .filter(Boolean)
        .map(persona => ({
          id: persona.id,
          name: persona.name,
          level: persona.level,
          owned: owned.has(persona.id),
        }));
      if (sources.length !== recipe.sources.length) return null;
      const missing = sources.filter(source => !source.owned).length;
      return {
        resultId: result.id,
        result,
        resultOwned: owned.has(result.id),
        sources,
        sourceIds: sources.map(source => source.id),
        ownedCount: sources.length - missing,
        missing,
        ready: missing === 0,
        cost: result.level * 500,
      };
    })
    .filter(Boolean)
    .sort((a, b) =>
      Number(b.ready && !b.resultOwned) - Number(a.ready && !a.resultOwned)
      || (b.ownedCount / b.sources.length) - (a.ownedCount / a.sources.length)
      || a.missing - b.missing
      || a.result.level - b.result.level);
}

export function networkFusion(ownedIds = [], { rng = Math.random } = {}) {
  const owned = new Set(ownedIds);
  const ids = [...owned].filter(id => Boolean(getPersona(id)));
  const candidates = [];
  for (let i = 0; i < ids.length; i += 1) {
    for (let j = i + 1; j < ids.length; j += 1) {
      const result = fusionResult(ids[i], ids[j]);
      if (!result || owned.has(result.id)) continue;
      candidates.push({
        a: getPersona(ids[i]),
        b: getPersona(ids[j]),
        result,
      });
    }
  }
  if (!candidates.length) return { ok: false, reason: '网络没有找到新的名字。' };
  const picked = candidates[Math.min(candidates.length - 1, Math.floor(rng() * candidates.length))];
  return {
    ok: true,
    persona: {
      ...picked.result,
      stats: { ...picked.result.stats },
      skills: [...picked.result.skills],
    },
    sources: [picked.a.id, picked.b.id],
    sourceNames: [picked.a.name, picked.b.name],
    cost: picked.result.level * 500 + 1000,
  };
}

let materialCatalogCache = null;

function materialCatalog() {
  if (materialCatalogCache) return materialCatalogCache;
  const catalog = new Map();
  for (const persona of Object.values(PERSONAS)) {
    for (const [id, label, upgradedLabel] of [
      [persona.item, persona.itemZh, persona.itemRZh],
      [persona.itemR, persona.itemRZh, persona.itemZh],
    ]) {
      if (!id) continue;
      const existing = catalog.get(id);
      if (existing) {
        existing.sourceIds.push(persona.id);
        existing.sourceNames.push(persona.name);
        continue;
      }
      catalog.set(id, {
        id,
        label: label || id,
        upgradedLabel: upgradedLabel || null,
        category: persona.skillCard ? 'skill-card' : 'equipment',
        sourceIds: [persona.id],
        sourceNames: [persona.name],
      });
    }
  }
  catalog.set('psyShard', {
    id: 'psyShard',
    label: '心灵碎片',
    upgradedLabel: null,
    category: 'material',
    sourceIds: [],
    sourceNames: [],
  });
  materialCatalogCache = catalog;
  return catalog;
}

export function materialEntries(materials = {}) {
  const catalog = materialCatalog();
  return Object.entries(materials)
    .map(([id, qty]) => ({ id, qty: Math.max(0, Math.floor(Number(qty) || 0)) }))
    .filter(entry => entry.qty > 0)
    .map(entry => ({
      ...entry,
      ...(catalog.get(entry.id) ?? {
        label: entry.id,
        upgradedLabel: null,
        category: 'material',
        sourceIds: [],
        sourceNames: [],
      }),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'zh-Hans-CN'));
}

export function createCompendium() {
  return { entries: [] };
}

export function register(compendium, persona) {
  if (!persona) return { ok: false, reason: '没有可登记的 Persona。' };
  const source = getPersona(persona.id);
  if (!source) return { ok: false, reason: '图鉴里没有这个 Persona。' };
  const snapshot = {
    id: source.id,
    name: source.name,
    nameEn: source.nameEn,
    level: Number.isFinite(Number(persona.level)) ? Number(persona.level) : source.level,
    arcana: source.arcana,
    element: source.element,
    elementLabel: source.elementLabel,
    sourceStats: [...(source.sourceStats ?? [])],
    stats: { ...source.stats, ...(persona.stats ?? {}) },
    resistance: { ...(source.resistance ?? {}) },
    skills: [...(persona.skills ?? source.skills)],
    skillLevels: { ...(source.skillLevels ?? {}) },
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
  return SKILLS[id]?.nameZh ?? SKILLS[id]?.name ?? id;
}
