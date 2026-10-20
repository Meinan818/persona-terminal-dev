import type { AttributeId, Persona, PersonaSkill } from '@/types';
import { buildBattlePersona, setPersonaOverride } from '@/umbra/engine/p5r-battle-adapter';
import type { UmbraProfile } from '@/umbra/state';

const ATTRIBUTES: AttributeId[] = ['knowledge', 'guts', 'dexterity', 'kindness', 'charm'];

/**
 * 联机旧协议仍以五维作为弱点与技能页签。这里只做战斗适配，不修改服务器契约：
 * P5R 元素在 UI 中映射到一个稳定的人格指数页签，技能本身仍使用 P5R 名称与数值。
 */
const ELEMENT_ATTRIBUTE: Record<string, AttributeId> = {
  phys: 'guts',
  gun: 'dexterity',
  fire: 'guts',
  ice: 'kindness',
  electric: 'dexterity',
  wind: 'dexterity',
  psy: 'charm',
  nuclear: 'knowledge',
  bless: 'kindness',
  curse: 'charm',
  almighty: 'knowledge',
  healing: 'kindness',
  support: 'kindness',
  ailment: 'charm',
};

type BattleSkill = {
  id: string;
  name: string;
  element: string;
  sourceElement?: string;
  sp: number;
  power: number;
  target?: string;
  description?: string;
  [key: string]: unknown;
};

type BattlePersona = {
  id: string;
  name: string;
  level: number;
  element?: string;
  elementLabel?: string;
  skills: BattleSkill[];
};

const asRecord = (value: unknown): Record<string, unknown> | null => (
  value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
);

const skillLevel = (spCost: number): number => {
  if (spCost <= 8) return 1;
  if (spCost <= 12) return 2;
  if (spCost <= 18) return 3;
  if (spCost <= 25) return 4;
  return 5;
};

const skillType = (skill: BattleSkill): PersonaSkill['type'] => {
  if (skill.element === 'healing' || skill.target === 'ally' || skill.target === 'allAllies') return 'heal';
  if (skill.element === 'support') {
    return /蓄力|charge/i.test(`${skill.name} ${skill.description ?? ''}`) ? 'charge' : 'buff';
  }
  if (skill.element === 'ailment') return 'debuff';
  if (skill.element === 'gun' || /暴击|critical/i.test(`${skill.name} ${skill.description ?? ''}`)) return 'crit';
  return 'damage';
};

export const onlineAttributeForElement = (element: unknown): AttributeId => (
  ELEMENT_ATTRIBUTE[String(element ?? '')] ?? 'knowledge'
);

export function buildOnlinePersona(profile: UmbraProfile | null | undefined): Persona | null {
  if (!profile) return null;
  const personaId = profile.combat.activePersonaId;
  const raw = asRecord(profile.demo?.p5r);
  const overrides = asRecord(raw?.personaOverrides);
  const override = asRecord(overrides?.[personaId]);
  setPersonaOverride(personaId, override ?? null);
  const built = buildBattlePersona(personaId) as BattlePersona | null;
  if (!built) return null;

  const groups = Object.fromEntries(
    ATTRIBUTES.map(attribute => [attribute, [] as PersonaSkill[]]),
  ) as Record<AttributeId, PersonaSkill[]>;

  for (const skill of built.skills ?? []) {
    if (!skill?.name || skill.element === 'passive' || skill.element === 'trait') continue;
    const attribute = onlineAttributeForElement(skill.sourceElement ?? skill.element);
    const type = skillType(skill);
    const spCost = Math.max(0, Math.round(Number(skill.sp) || 0));
    groups[attribute].push({
      level: skillLevel(spCost),
      name: skill.name,
      description: skill.description || `${built.name} 的同调技能`,
      type,
      power: Math.max(0, Math.round(Number(skill.power) || 0)),
      spCost,
    });
  }

  const equippedMaskAttribute = ATTRIBUTES.find(attribute => groups[attribute].length > 0) ?? 'knowledge';
  return {
    id: built.id,
    name: built.name,
    description: `${built.name} · Lv.${built.level}`,
    attributePersonas: Object.fromEntries(
      ATTRIBUTES.map(attribute => [
        attribute,
        { name: built.name, description: `UMBRA 当前 Persona · ${built.elementLabel ?? built.element ?? attribute}` },
      ]),
    ) as Record<AttributeId, { name: string; description: string }>,
    equippedMaskAttribute,
    createdViaAI: false,
    createdAt: new Date(),
    skills: groups,
  };
}
