/**
 * P5R catalog -> battle actor adapter.
 *
 * Canonical from the catalog:
 * - Persona level, arcana, inheritance element, five stats and ten affinities
 * - skill names, elements and learn levels
 *
 * Prototype battle balance:
 * - HP/SP scale from level
 * - damage/heal numbers are derived from the P5R skill effect tier
 * - support/ailment effects are normalized to the demo's small effect whitelist
 */
import { P5R_SKILLS, P5R_PERSONA_BY_ID, getPersona, getSkill } from './p5r-compendium.js';

const personaOverrides = new Map();

export function setPersonaOverride(personaId, override) {
  if (!personaId) return;
  if (!override) {
    personaOverrides.delete(personaId);
    return;
  }
  personaOverrides.set(personaId, {
    level: Number.isFinite(Number(override.level)) ? Number(override.level) : undefined,
    stats: override.stats ? { ...override.stats } : undefined,
    skills: Array.isArray(override.skills) ? [...new Set(override.skills)] : undefined,
  });
}

export const P5_ELEMENTS = {
  phys: { label: '物理', en: 'PHYS' },
  gun: { label: '枪击', en: 'GUN' },
  fire: { label: '火焰', en: 'FIRE' },
  ice: { label: '冰冻', en: 'ICE' },
  electric: { label: '电击', en: 'ELEC' },
  wind: { label: '疾风', en: 'WIND' },
  psy: { label: '念动', en: 'PSY' },
  nuclear: { label: '核热', en: 'NUCLEAR' },
  bless: { label: '祝福', en: 'BLESS' },
  curse: { label: '咒怨', en: 'CURSE' },
  almighty: { label: '万能', en: 'ALMIGHTY' },
  healing: { label: '恢复', en: 'HEALING' },
  support: { label: '辅助', en: 'SUPPORT' },
  ailment: { label: '异常', en: 'AILMENT' },
  passive: { label: '被动', en: 'PASSIVE' },
  trait: { label: '特性', en: 'TRAIT' },
};

export const P5_STATUS = {
  burn: { label: '燃烧', technicalWith: ['wind', 'nuclear'] },
  freeze: { label: '冰冻', technicalWith: ['phys', 'nuclear'] },
  shock: { label: '触电', technicalWith: ['phys', 'nuclear'] },
  confuse: { label: '混乱', technicalWith: ['psy', 'gun'] },
  fear: { label: '恐惧', technicalWith: ['psy', 'gun'] },
  sleep: { label: '睡眠', technicalWith: ['phys', 'gun'] },
  rage: { label: '暴怒', technicalWith: ['psy', 'nuclear'] },
  despair: { label: '绝望', technicalWith: ['psy', 'nuclear'] },
  dizzy: { label: '眩晕', technicalWith: ['gun', 'phys'] },
  brainwash: { label: '洗脑', technicalWith: ['psy', 'nuclear'] },
  forget: { label: '遗忘', technicalWith: ['psy', 'gun'] },
};

const PASSIVE_ELEMENTS = new Set(['passive', 'trait']);
const SUPPORT_ELEMENTS = new Set(['support', 'ailment', 'healing']);

function normalizedCost(definition) {
  const raw = Number(definition?.cost) || 0;
  if (raw <= 0) return 0;
  return raw >= 100 ? Math.round(raw / 100) : Math.round(raw);
}

function effectTier(effect) {
  const text = String(effect ?? '').toLowerCase();
  if (text.includes('severe')) return 'severe';
  if (text.includes('heavy')) return 'heavy';
  if (text.includes('medium')) return 'medium';
  if (text.includes('slightly') || text.includes('light')) return 'light';
  return 'medium';
}

function parsedPower(definition) {
  if (/instantly killing|instant death/i.test(definition.effect ?? '')) return 0;
  const tier = effectTier(definition.effect);
  const base = { light: 24, medium: 36, heavy: 52, severe: 72 }[tier];
  const allFoes = /all foes|all enemies/i.test(definition.effect ?? '');
  return Math.max(1, Math.round(base * (allFoes ? 0.78 : 1)));
}

function parsedHeal(definition) {
  const tier = effectTier(definition.effect);
  return { light: 30, medium: 55, heavy: 85, severe: 120 }[tier];
}

function parsedInstantKillChance(definition) {
  const text = String(definition.effect ?? '').toLowerCase();
  if (!/instantly killing|instant death/.test(text)) return null;
  if (text.includes('high')) return 0.5;
  if (text.includes('medium')) return 0.3;
  return 0.15;
}

function parsedStatus(definition) {
  const text = `${definition.effect ?? ''} ${definition.name ?? ''} ${definition.nameZh ?? ''}`.toLowerCase();
  if (text.includes('burn') || text.includes('燃烧')) return 'burn';
  if (text.includes('freeze') || text.includes('冻结')) return 'freeze';
  if (text.includes('shock') || text.includes('触电')) return 'shock';
  if (text.includes('confuse') || text.includes('混乱')) return 'confuse';
  if (text.includes('fear') || text.includes('恐惧')) return 'fear';
  if (text.includes('sleep') || text.includes('睡眠') || text.includes('永眠')) return 'sleep';
  if (text.includes('rage') || text.includes('暴怒') || text.includes('激怒')) return 'rage';
  if (text.includes('despair') || text.includes('绝望')) return 'despair';
  if (text.includes('dizzy') || text.includes('眩晕')) return 'dizzy';
  if (text.includes('brainwash') || text.includes('洗脑')) return 'brainwash';
  if (text.includes('forget') || text.includes('遗忘') || text.includes('玛卡加玛')) return 'forget';
  return null;
}

function parsedTarget(definition) {
  const text = String(definition.effect ?? '');
  if (definition.element === 'healing') {
    return /party|all allies/i.test(text) ? 'allAllies' : 'ally';
  }
  if (definition.element === 'support' || definition.element === 'ailment') {
    return /all foes|all enemies|party/i.test(text) ? 'allEnemies' : 'enemy';
  }
  return /all foes|all enemies/i.test(text) ? 'allEnemies' : 'enemy';
}

function supportEffect(definition) {
  const text = String(definition.effect ?? '').toLowerCase();
  if (definition.element === 'ailment') {
    return { status: parsedStatus(definition), ignoreAffinity: true };
  }
  if (definition.element === 'healing') {
    return {
      heal: true,
      power: parsedHeal(definition),
      cure: text.includes('cure'),
      revive: text.includes('revive'),
      revivePct: text.includes('all hp') ? 1 : 0.5,
      ignoreAffinity: true,
    };
  }
  if (text.includes('next') && text.includes('attack')) {
    return { target: 'self', attackUp: 2.5, ignoreAffinity: true };
  }
  if (text.includes('shield') || text.includes('barrier')) {
    return { target: 'ally', guard: true, barrier: true, ignoreAffinity: true };
  }
  if (text.includes('negate all -kaja')) {
    return { target: 'allEnemies', cleanseBuffs: true, ignoreAffinity: true };
  }
  if (text.includes('negate all -nda')) {
    return { target: 'allAllies', cleanseDebuffs: true, ignoreAffinity: true };
  }
  if (text.includes('decrease') && text.includes('defense')) {
    return { debuff: 'defense', ignoreAffinity: true };
  }
  if (text.includes('increase') && text.includes('attack')) {
    return { target: 'ally', attackUp: 1.3, ignoreAffinity: true };
  }
  if (text.includes('increase') && text.includes('defense')) {
    return { target: 'ally', guard: true, ignoreAffinity: true };
  }
  if (text.includes('decrease') && text.includes('agility')) {
    return { debuff: 'accuracy', ignoreAffinity: true };
  }
  return { ignoreAffinity: true };
}

function activeElement(definition) {
  if (SUPPORT_ELEMENTS.has(definition.element)) return 'almighty';
  return P5_ELEMENTS[definition.element] ? definition.element : 'almighty';
}

export function buildBattleSkill(skillName) {
  const definition = getSkill(skillName);
  if (!definition || PASSIVE_ELEMENTS.has(definition.element)) return null;
  const status = parsedStatus(definition);
  const base = {
    id: definition.name,
    name: definition.nameZh ?? definition.name,
    element: activeElement(definition),
    sourceElement: definition.element,
    sp: normalizedCost(definition),
    power: SUPPORT_ELEMENTS.has(definition.element) ? 0 : parsedPower(definition),
    target: parsedTarget(definition),
    description: definition.effect ?? '',
  };
  const instantKillChance = parsedInstantKillChance(definition);
  if (instantKillChance != null) {
    base.instantKill = true;
    base.instantKillChance = instantKillChance;
  }
  if (status) base.status = status;
  const extra = SUPPORT_ELEMENTS.has(definition.element) ? supportEffect(definition) : {};
  if (extra.target) base.target = extra.target;
  if (definition.element === 'healing') base.power = parsedHeal(definition);
  return { ...base, ...extra };
}

export function buildBattlePersona(personaId, { level } = {}) {
  const persona = getPersona(personaId);
  if (!persona) return null;
  const override = personaOverrides.get(personaId);
  const requestedLevel = Number.isFinite(level) ? level : persona.level;
  const currentLevel = Math.max(1, Math.round(override?.level ?? requestedLevel));
  const unlocked = persona.skills.filter(
    skill => (persona.skillLevels[skill] ?? 0) <= currentLevel,
  );
  const available = unlocked.length ? unlocked : persona.skills;
  const learned = Array.isArray(override?.skills) ? override.skills : [];
  const skillPool = [...new Set([...available, ...learned])];
  const active = skillPool
    .map(buildBattleSkill)
    .filter(Boolean)
    .slice(0, 6);
  if (!active.length) {
    active.push({
      id: 'basic-phys',
      name: '普通攻击',
      element: 'phys',
      sourceElement: 'phys',
      sp: 0,
      power: 18,
      target: 'enemy',
      description: '没有可用主动技能时的普通攻击。',
    });
  }
  const [strength, magic, endurance, agility, luck] = persona.sourceStats;
  const built = {
    id: persona.id,
    name: persona.name,
    nameEn: persona.nameEn,
    arcana: persona.arcana,
    level: currentLevel,
    element: persona.inherits ?? 'rare',
    elementLabel: persona.elementLabel,
    strength,
    magic,
    endurance,
    agility,
    luck,
    maxHp: 48 + currentLevel * 4,
    maxSp: 32 + currentLevel * 2,
    attack: 8 + strength * 2,
    defense: 5 + endurance,
    resistances: { ...persona.resistance },
    skills: active,
    skillLevels: { ...persona.skillLevels },
    item: persona.item,
    itemZh: persona.itemZh,
    special: persona.special,
    rare: persona.rare,
    dlc: persona.dlc,
  };
  const stats = override?.stats;
  if (stats) {
    if (Number.isFinite(stats.hp)) built.maxHp = stats.hp;
    if (Number.isFinite(stats.sp)) built.maxSp = stats.sp;
    if (Number.isFinite(stats.attack)) built.attack = stats.attack;
    if (Number.isFinite(stats.defense)) built.defense = stats.defense;
  }
  return built;
}

export function recruitDataForPersona(personaId) {
  const persona = getPersona(personaId);
  if (!persona) return null;
  const skill = persona.skills
    .map(skillName => P5R_SKILLS[skillName])
    .find(Boolean);
  return {
    personaId: persona.id,
    name: persona.name,
    element: persona.elementLabel ?? persona.inherits,
    skillName: skill?.nameZh ?? skill?.name ?? persona.skills[0],
    skillDesc: skill ? `图鉴技能：${skill.nameZh ?? skill.name}（${P5_ELEMENTS[skill.element]?.label ?? skill.element}）。` : '图鉴技能。',
  };
}

export function buildPersonaLoadout(personaIds, options = {}) {
  return Object.fromEntries(
    personaIds
      .map(id => buildBattlePersona(id, options))
      .filter(Boolean)
      .map(persona => [persona.id, persona]),
  );
}

export function catalogPersonaChoices() {
  return Object.values(P5R_PERSONA_BY_ID)
    .map(persona => ({
      id: persona.id,
      name: persona.name,
      level: persona.level,
      arcana: persona.arcana,
      element: persona.elementLabel ?? persona.element,
    }))
    .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name, 'zh-CN'));
}
