import indexData from './data/index.json';

export interface CompendiumPreloadRequest {
  personas?: string[];
  skills?: string[];
}

const chunkModules = import.meta.glob('./data/chunks/*.json');

export const P5R_PERSONAS: any[] = [];
export const P5R_PERSONA_BY_ID: Record<string, any> = {};
export const P5R_SKILLS: Record<string, any> = {};

const personaIndex = (indexData as any).personaIndex as Record<string, string>;
const skillIndex = (indexData as any).skillIndex as Record<string, string>;
const small = (indexData as any).small ?? {};

export const P5R_ARCANA_COMBOS = small.P5R_ARCANA_COMBOS ?? [];
export const P5R_SPECIAL_FUSIONS = small.P5R_SPECIAL_FUSIONS ?? [];
export const P5R_RARE_PERSONA_IDS = small.P5R_RARE_PERSONA_IDS ?? [];
export const P5R_RARE_COMBOS = small.P5R_RARE_COMBOS ?? {};
export const P5R_DLC_GROUPS = small.P5R_DLC_GROUPS ?? [];
export const P5R_CONFIDANT_REQUIREMENTS = small.P5R_CONFIDANT_REQUIREMENTS ?? {};
export const P5R_CONFIDANT_NAMES = small.P5R_CONFIDANT_NAMES ?? {};
export const P5R_INHERITANCE_CHART = small.P5R_INHERITANCE_CHART ?? {};
export const P5R_COMPENDIUM_META = (indexData as any).source ?? {};

const personaChunks = new Map<string, Promise<void>>();
const skillChunks = new Map<string, Promise<void>>();
const loadedPersonaChunks = new Set<string>();
const loadedSkillChunks = new Set<string>();
export let compendiumChunkImportCount = 0;

const resolveChunk = async (file: string): Promise<any> => {
  const relative = `./data/chunks/${file}`;
  const loader = chunkModules[relative];
  if (!loader) throw new Error(`缺少图鉴分片：${file}`);
  return (await loader()) as any;
};

const loadPersonaChunk = (file: string): Promise<void> => {
  if (loadedPersonaChunks.has(file)) return Promise.resolve();
  let pending = personaChunks.get(file);
  if (!pending) {
    pending = resolveChunk(file).then((module) => {
      compendiumChunkImportCount += 1;
      const personas = module?.personas ?? [];
      for (const persona of personas) {
        P5R_PERSONA_BY_ID[persona.id] = persona;
        if (!P5R_PERSONAS.includes(persona)) P5R_PERSONAS.push(persona);
      }
      loadedPersonaChunks.add(file);
    });
    personaChunks.set(file, pending);
  }
  return pending;
};

const loadSkillChunk = (file: string): Promise<void> => {
  if (loadedSkillChunks.has(file)) return Promise.resolve();
  let pending = skillChunks.get(file);
  if (!pending) {
    pending = resolveChunk(file).then((module) => {
      compendiumChunkImportCount += 1;
      Object.assign(P5R_SKILLS, module?.skills ?? {});
      loadedSkillChunks.add(file);
    });
    skillChunks.set(file, pending);
  }
  return pending;
};

export function ensureCompendium(request: CompendiumPreloadRequest = {}): Promise<void> {
  const personaFiles = new Set<string>();
  for (const id of request.personas ?? []) {
    const file = personaIndex[id];
    if (file) personaFiles.add(file);
  }
  const skillFiles = new Set<string>();
  for (const id of request.skills ?? []) {
    const file = skillIndex[id];
    if (file) skillFiles.add(file);
  }
  return Promise.all([
    ...([...personaFiles].map(loadPersonaChunk)),
    ...([...skillFiles].map(loadSkillChunk)),
  ]).then(() => undefined);
}

export function compendiumPersonaSummary(id: string): any {
  return (indexData as any).personaSummaries?.[id] ?? null;
}

export function compendiumSkillSummary(id: string): any {
  return (indexData as any).skillSummaries?.[id] ?? null;
}

export function compendiumPersonaIds(): string[] {
  return Object.keys((indexData as any).personaSummaries ?? {});
}

export function compendiumSkillIds(): string[] {
  return Object.keys((indexData as any).skillSummaries ?? {});
}

export function isCompendiumPersonaLoaded(id: string): boolean {
  return Boolean(P5R_PERSONA_BY_ID[id]);
}

export function isCompendiumSkillLoaded(id: string): boolean {
  return Boolean(P5R_SKILLS[id]);
}

export function resetCompendiumForTests(): void {
  P5R_PERSONAS.splice(0, P5R_PERSONAS.length);
  for (const key of Object.keys(P5R_PERSONA_BY_ID)) delete P5R_PERSONA_BY_ID[key];
  for (const key of Object.keys(P5R_SKILLS)) delete P5R_SKILLS[key];
  loadedPersonaChunks.clear();
  loadedSkillChunks.clear();
  personaChunks.clear();
  skillChunks.clear();
  compendiumChunkImportCount = 0;
}
