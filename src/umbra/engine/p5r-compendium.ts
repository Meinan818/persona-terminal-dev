/**
 * P5R compendium adapter and pure query logic.
 *
 * Canonical game values retained from the P5R source:
 * - level
 * - five base stats (strength / magic / endurance / agility / luck)
 * - ten affinity/resistance slots
 * - per-skill learn levels
 *
 * Prototype-only values remain explicit compatibility fields; HP/SP are not
 * presented as canonical P5R data.
 */
import {
  P5R_ARCANA_COMBOS,
  P5R_COMPENDIUM_META,
  P5R_CONFIDANT_REQUIREMENTS,
  P5R_DLC_GROUPS,
  P5R_PERSONA_BY_ID,
  P5R_PERSONAS,
  P5R_RARE_COMBOS,
  P5R_RARE_PERSONA_IDS,
  P5R_SKILLS,
  P5R_SPECIAL_FUSIONS,
  ensureCompendium as ensureCompendiumRaw,
} from './compendiumPreload';
import { rosterAllowsPersona } from '../skins/registry';
import type { UmbraSkinId } from '../skins/contract';

export {
  P5R_COMPENDIUM_META,
  P5R_CONFIDANT_REQUIREMENTS,
  P5R_DLC_GROUPS,
  P5R_PERSONA_BY_ID,
  P5R_PERSONAS,
  P5R_RARE_COMBOS,
  P5R_RARE_PERSONA_IDS,
  P5R_SKILLS,
  P5R_SPECIAL_FUSIONS,
};

export const PERSONAS = P5R_PERSONA_BY_ID;
export const SKILLS = P5R_SKILLS;

const SKILLS_BY_NAME = SKILLS as Record<string, any>;
const PERSONA_BY_ID = P5R_PERSONA_BY_ID as Record<string, any>;
const RARE_COMBOS = P5R_RARE_COMBOS as Record<string, number[] | undefined>;

let derivedReady = false;
let ARCANA_RESULTS = new Map<string, string>();
let SPECIAL_BY_SOURCE_KEY = new Map<string, string>();
let PERSONAS_BY_ARCANA = new Map<string, any[]>();
let RARE_INDEX = new Map<string, number>();

function rebuildDerivedIndexes(): void {
  ARCANA_RESULTS = new Map<string, string>();
  for (const combo of P5R_ARCANA_COMBOS) {
    ARCANA_RESULTS.set(`${combo.a}\u0000${combo.b}`, combo.result);
    ARCANA_RESULTS.set(`${combo.b}\u0000${combo.a}`, combo.result);
  }

  SPECIAL_BY_SOURCE_KEY = new Map<string, string>();
  for (const recipe of P5R_SPECIAL_FUSIONS) {
    if (!recipe.resultId || recipe.sources.some((source: string) => !source)) continue;
    SPECIAL_BY_SOURCE_KEY.set(sortedKey(recipe.sources), recipe.resultId);
  }

  PERSONAS_BY_ARCANA = new Map<string, any[]>();
  for (const persona of P5R_PERSONAS) {
    const bucket = PERSONAS_BY_ARCANA.get(persona.arcana) ?? [];
    bucket.push(persona);
    PERSONAS_BY_ARCANA.set(persona.arcana, bucket);
  }
  for (const bucket of PERSONAS_BY_ARCANA.values()) {
    bucket.sort((a, b) => a.level - b.level || a.nameEn.localeCompare(b.nameEn));
  }

  RARE_INDEX = new Map<string, number>(
    P5R_RARE_PERSONA_IDS.map((id: string, index: number) => [id, index] as const),
  );
  derivedReady = true;
}

export async function ensureCompendium(
  request: { personas?: string[]; skills?: string[] } = {},
): Promise<void> {
  await ensureCompendiumRaw(request);
  rebuildDerivedIndexes();
}

const requireDerived = (): void => {
  if (!derivedReady) {
    if (import.meta.env.DEV) {
      throw new Error('UMBRA 图鉴尚未预载，不能执行图鉴查询。');
    }
    console.warn('UMBRA 图鉴尚未预载。');
  }
};

function sortedKey(values: string[]): string {
  return [...values].sort().join('\u0000');
}

function allowsDlc(persona: any, allowDlc: boolean): boolean {
  return allowDlc || !persona.dlc;
}

export function getPersona(idOrName: string | null | undefined): any {
  if (!idOrName) return null;
  const loaded = PERSONA_BY_ID[idOrName]
    ?? P5R_PERSONAS.find(
      persona => persona.nameEn === idOrName || persona.nameZh === idOrName,
    )
    ?? null;
  if (!loaded && !derivedReady) {
    if (import.meta.env.DEV) {
      throw new Error(`UMBRA 图鉴未预载 Persona：${idOrName}`);
    }
    console.warn(`UMBRA 图鉴未预载 Persona：${idOrName}`);
    return undefined;
  }
  return loaded;
}

export function getSkill(name: string): any {
  const loaded = SKILLS_BY_NAME[name] ?? null;
  if (!loaded && !derivedReady) {
    if (import.meta.env.DEV) {
      throw new Error(`UMBRA 图鉴未预载技能：${name}`);
    }
    console.warn(`UMBRA 图鉴未预载技能：${name}`);
    return undefined;
  }
  return loaded;
}

export function skillName(name: string): string {
  return SKILLS_BY_NAME[name]?.name ?? name;
}

export function specialFusionResult(
  sourceIds: string[],
  { allowDlc = true }: { allowDlc?: boolean } = {},
): any {
  if (!Array.isArray(sourceIds) || sourceIds.length < 2) return null;
  if (sourceIds.some(id => !PERSONA_BY_ID[id])) return null;
  const result = PERSONA_BY_ID[SPECIAL_BY_SOURCE_KEY.get(sortedKey(sourceIds)) ?? ''];
  return result && allowsDlc(result, allowDlc) ? result : null;
}

function rareFusion(
  rare: any,
  normal: any,
  { allowDlc = true }: { allowDlc?: boolean } = {},
): any {
  const rareIndex = RARE_INDEX.get(rare.id);
  if (rareIndex == null) return null;
  const modifiers = RARE_COMBOS[normal.arcana];
  if (!modifiers) return null;
  const pool = PERSONAS_BY_ARCANA.get(normal.arcana) ?? [];
  const mainIndex = pool.findIndex(persona => persona.id === normal.id);
  if (mainIndex < 0) return null;
  let offset = modifiers[rareIndex];
  let candidate = pool[mainIndex + offset];
  while (candidate && (candidate.special || candidate.rare || !allowsDlc(candidate, allowDlc))) {
    offset += offset < 0 ? -1 : 1;
    candidate = pool[mainIndex + offset];
  }
  return candidate ?? null;
}

function normalFusion(
  a: any,
  b: any,
  { allowDlc = true }: { allowDlc?: boolean } = {},
): any {
  if ((a.rare && !b.rare) || (b.rare && !a.rare)) return null;
  const targetArcana = ARCANA_RESULTS.get(`${a.arcana}\u0000${b.arcana}`);
  if (!targetArcana) return null;
  const targetLevel = 1 + Math.floor((a.level + b.level) / 2);
  const pool = (PERSONAS_BY_ARCANA.get(targetArcana) ?? [])
    .filter(persona => !persona.special && !persona.rare && allowsDlc(persona, allowDlc));

  if (a.arcana === b.arcana) {
    for (let i = pool.length - 1; i >= 0; i -= 1) {
      const persona = pool[i];
      if (persona.level <= targetLevel && persona.id !== a.id && persona.id !== b.id) {
        return persona;
      }
    }
    return null;
  }
  return pool.find(persona => persona.level >= targetLevel) ?? null;
}

export function resolveFusion(
  aId: string,
  bId: string,
  options: { allowDlc?: boolean } = {},
): any {
  const a = getPersona(aId);
  const b = getPersona(bId);
  if (!a || !b || a.id === b.id) return null;

  const special = specialFusionResult([a.id, b.id], options);
  if (special) return { result: special, kind: 'special', targetLevel: null };

  if ((a.rare && !b.rare) || (b.rare && !a.rare)) {
    const result = rareFusion(a.rare ? a : b, a.rare ? b : a, options);
    return result ? { result, kind: 'rare', targetLevel: null } : null;
  }

  const targetLevel = 1 + Math.floor((a.level + b.level) / 2);
  const result = normalFusion(a, b, options);
  return result ? { result, kind: 'normal', targetLevel } : null;
}

export function fusionResult(
  aId: string,
  bId: string,
  options: { allowDlc?: boolean } = {},
): any {
  return resolveFusion(aId, bId, options)?.result ?? null;
}

export function resolveFusionForSkin(
  aId: string,
  bId: string,
  skinId: UmbraSkinId,
  options: { allowDlc?: boolean } = {},
): any {
  const resolved = resolveFusion(aId, bId, options);
  if (!resolved?.result) return null;
  return rosterAllowsPersona(skinId, resolved.result.id) ? resolved : null;
}

export function fusionResultForSkin(
  aId: string,
  bId: string,
  skinId: UmbraSkinId,
  options: { allowDlc?: boolean } = {},
): any {
  return resolveFusionForSkin(aId, bId, skinId, options)?.result ?? null;
}

export function recipesForTarget(targetId: string): any[] {
  const target = getPersona(targetId);
  if (!target) return [];
  return P5R_SPECIAL_FUSIONS
    .filter((recipe: any) => recipe.resultId === target.id)
    .map((recipe: any) => ({
      kind: 'special',
      sources: recipe.sources.map((id: string) => P5R_PERSONA_BY_ID[id]).filter(Boolean),
    }));
}

export function recruitCandidates(element: string | null, level = 1): any[] {
  return P5R_PERSONAS
    .filter(persona => {
      if (persona.special || persona.rare) return false;
      return !element
        || persona.element === element
        || persona.inherits === element
        || persona.elementLabel === element;
    })
    .sort((a, b) =>
      Math.abs(a.level - level) - Math.abs(b.level - level)
      || a.level - b.level);
}

export function validateP5RCompendium(): string[] {
  const errors: string[] = [];
  const ids = new Set();
  const names = new Set();
  const arcana = new Set(P5R_PERSONAS.map(persona => persona.arcana));
  for (const persona of P5R_PERSONAS) {
    if (ids.has(persona.id)) errors.push(`duplicate id: ${persona.id}`);
    if (names.has(persona.nameEn)) errors.push(`duplicate name: ${persona.nameEn}`);
    ids.add(persona.id);
    names.add(persona.nameEn);
    if (!arcana.has(persona.arcana)) errors.push(`bad arcana: ${persona.id}`);
    if (!Number.isInteger(persona.level)) errors.push(`bad level: ${persona.id}`);
    if (!Array.isArray(persona.sourceStats) || persona.sourceStats.length !== 5) {
      errors.push(`bad source stats: ${persona.id}`);
    }
    if (!Array.isArray(persona.resistances) || persona.resistances.length !== 10) {
      errors.push(`bad resistances: ${persona.id}`);
    }
    for (const [skill, level] of Object.entries(persona.skillLevels as Record<string, number>)) {
      if (!SKILLS_BY_NAME[skill]) errors.push(`missing skill ${skill} on ${persona.id}`);
      if (!Number.isInteger(level) || level < 0 || level > 99) {
        errors.push(`bad skill learn level ${persona.id}:${skill}`);
      }
    }
  }
  for (const combo of P5R_ARCANA_COMBOS) {
    for (const key of [combo.a, combo.b, combo.result]) {
      if (!arcana.has(key)) errors.push(`bad arcana combo: ${key}`);
    }
  }
  for (const recipe of P5R_SPECIAL_FUSIONS) {
    if (!recipe.resultId || !PERSONA_BY_ID[recipe.resultId]) {
      errors.push(`bad special result: ${recipe.result}`);
    }
    if (recipe.sources.length < 2) errors.push(`short special recipe: ${recipe.result}`);
    for (const source of recipe.sources) {
      if (!source || !PERSONA_BY_ID[source]) {
        errors.push(`bad special source on ${recipe.result}`);
      }
    }
  }
  for (const group of P5R_DLC_GROUPS) {
    for (const id of group.personaIds) {
      if (!id || !PERSONA_BY_ID[id]) errors.push(`bad DLC persona: ${group.id}`);
    }
  }
  for (const [id, requirement] of Object.entries(P5R_CONFIDANT_REQUIREMENTS) as [string, any][]) {
    if (!PERSONA_BY_ID[id]) errors.push(`bad confidant persona: ${id}`);
    if (!arcana.has(requirement.arcana)) errors.push(`bad confidant arcana: ${id}`);
  }
  return errors;
}

export function compendiumSummary() {
  return {
    personas: P5R_PERSONAS.length,
    skills: Object.keys(SKILLS).length,
    arcanaCombos: P5R_ARCANA_COMBOS.length,
    specialFusions: P5R_SPECIAL_FUSIONS.length,
    rarePersonas: P5R_RARE_PERSONA_IDS.length,
    dlcGroups: P5R_DLC_GROUPS.length,
    dlcPersonas: P5R_DLC_GROUPS.reduce((sum: number, group: any) => sum + group.personaIds.length, 0),
    confidantRequirements: Object.keys(P5R_CONFIDANT_REQUIREMENTS).length,
  };
}
