import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import vm from 'node:vm';
import ts from 'typescript';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const ROOT = path.resolve(import.meta.dirname, '..');
const SOURCE = path.join(ROOT, 'src', 'umbra', 'engine', 'p5r-compendium-data.ts');
const OUT_DIR = path.join(ROOT, 'src', 'umbra', 'engine', 'data');
const CHUNK_DIR = path.join(OUT_DIR, 'chunks');
const INDEX_FILE = path.join(OUT_DIR, 'index.json');
const MAX_GZIP = 120 * 1024;

const source = fs.readFileSync(SOURCE, 'utf8');
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;

const moduleBox = { exports: {} };
vm.runInNewContext(
  `(function(exports, module, require){${transpiled}\n})(module.exports, module, require);`,
  {
    module: moduleBox,
    require,
    exports: moduleBox.exports,
    console,
  },
  { filename: SOURCE },
);

const data = moduleBox.exports;
const personas = Array.isArray(data.P5R_PERSONAS) ? data.P5R_PERSONAS : [];
const skills = data.P5R_SKILLS ?? {};

const gzipSize = value => zlib.gzipSync(Buffer.from(JSON.stringify(value))).length;

function chunkGroups(items, groupOf, prefix) {
  const groups = new Map();
  for (const item of items) {
    const key = groupOf(item) || 'unknown';
    const bucket = groups.get(key) ?? [];
    bucket.push(item);
    groups.set(key, bucket);
  }

  const chunks = [];
  for (const [group, members] of groups) {
    let part = 0;
    let start = 0;
    while (start < members.length) {
      let end = members.length;
      while (end > start + 1 && gzipSize({ items: members.slice(start, end) }) > MAX_GZIP) {
        end -= 1;
      }
      if (gzipSize({ items: members.slice(start, end) }) > MAX_GZIP) end = start + 1;
      const safeName = String(group).replace(/[^a-zA-Z0-9_-]/g, '-');
      chunks.push({
        file: `${prefix}-${safeName}-${part}.json`,
        items: members.slice(start, end),
      });
      start = end;
      part += 1;
    }
  }
  return chunks;
}

const personaChunks = chunkGroups(personas, item => item.arcana, 'persona');
const skillEntries = Object.entries(skills).map(([id, value]) => ({ id, value }));
const skillChunks = chunkGroups(
  skillEntries,
  item => item.value?.element ?? item.value?.sourceElement ?? 'unknown',
  'skill',
);

fs.rmSync(CHUNK_DIR, { recursive: true, force: true });
fs.mkdirSync(CHUNK_DIR, { recursive: true });

const personaIndex = {};
const skillIndex = {};
const personaManifest = {};
const skillManifest = {};

for (const chunk of personaChunks) {
  const payload = { personas: chunk.items };
  fs.writeFileSync(path.join(CHUNK_DIR, chunk.file), JSON.stringify(payload));
  personaManifest[chunk.file] = chunk.items.length;
  for (const persona of chunk.items) {
    personaIndex[persona.id] = chunk.file;
  }
}

for (const chunk of skillChunks) {
  const payload = { skills: Object.fromEntries(chunk.items.map(item => [item.id, item.value])) };
  fs.writeFileSync(path.join(CHUNK_DIR, chunk.file), JSON.stringify(payload));
  skillManifest[chunk.file] = chunk.items.length;
  for (const item of chunk.items) skillIndex[item.id] = chunk.file;
}

const index = {
  version: 1,
  generatedAt: new Date().toISOString(),
  source: data.P5R_COMPENDIUM_META ?? null,
  personaIndex,
  skillIndex,
  personaSummaries: Object.fromEntries(
    personas.map(persona => [persona.id, {
      id: persona.id,
      name: persona.name,
      nameZh: persona.nameZh,
      nameEn: persona.nameEn,
      arcana: persona.arcana,
      level: persona.level,
      inherits: persona.inherits,
      elementLabel: persona.elementLabel,
    }]),
  ),
  skillSummaries: Object.fromEntries(
    Object.entries(skills).map(([id, skill]) => [id, {
      id,
      name: skill?.name,
      nameZh: skill?.nameZh,
      element: skill?.element,
      sourceElement: skill?.sourceElement,
    }]),
  ),
  small: {
    P5R_ARCANA_COMBOS: data.P5R_ARCANA_COMBOS,
    P5R_SPECIAL_FUSIONS: data.P5R_SPECIAL_FUSIONS,
    P5R_RARE_PERSONA_IDS: data.P5R_RARE_PERSONA_IDS,
    P5R_RARE_COMBOS: data.P5R_RARE_COMBOS,
    P5R_DLC_GROUPS: data.P5R_DLC_GROUPS,
    P5R_CONFIDANT_REQUIREMENTS: data.P5R_CONFIDANT_REQUIREMENTS,
    P5R_CONFIDANT_NAMES: data.P5R_CONFIDANT_NAMES,
    P5R_INHERITANCE_CHART: data.P5R_INHERITANCE_CHART,
  },
  manifests: { persona: personaManifest, skill: skillManifest },
};

fs.writeFileSync(INDEX_FILE, JSON.stringify(index));

const sizes = [];
for (const file of fs.readdirSync(CHUNK_DIR)) {
  const full = path.join(CHUNK_DIR, file);
  sizes.push({ file, bytes: fs.statSync(full).size, gzip: gzipSize(fs.readFileSync(full, 'utf8')) });
}

console.log(JSON.stringify({
  personas: personas.length,
  skills: Object.keys(skills).length,
  personaChunks: personaChunks.length,
  skillChunks: skillChunks.length,
  indexBytes: fs.statSync(INDEX_FILE).size,
  maxChunkGzip: Math.max(...sizes.map(item => item.gzip)),
  chunks: sizes,
}, null, 2));
