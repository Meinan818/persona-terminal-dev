#!/usr/bin/env node
/**
 * Convert the Apache-2.0 P5R Fusion Planner data into the local compendium format.
 *
 * Required:
 *   --planner-dir <path>  P5R-Fusion-Planner checkout
 *
 * Optional:
 *   --megaten-dir <path>  aqiu384/megaten-fusion-tool checkout for cross-checking
 *   --wiki-url <url>      P5R wiki page used for non-authoritative cross-checking
 *   --out <path>          generated JS data module
 *
 * The generated module contains only structural game facts from the licensed
 * planner data. Wiki text, images, prose and templates are not copied.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { JSDOM } from 'jsdom';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..');
const DEFAULT_OUT = path.join(
  REPO_ROOT,
  'outputs',
  'battle-experience-v3',
  'p5r-compendium-data.js',
);

const PLANNER_URL = 'https://github.com/AemiliusXIV/P5R-Fusion-Planner';
const MEGATEN_URL = 'https://github.com/aqiu384/megaten-fusion-tool';
const DEFAULT_WIKI_URL =
  'https://wiki.biligame.com/persona/P5R/%E4%BA%BA%E6%A0%BC%E9%9D%A2%E5%85%B7%E5%9B%BE%E9%89%B4';

const RESIST_NAMES = [
  'phys',
  'gun',
  'fire',
  'ice',
  'electric',
  'wind',
  'psy',
  'nuclear',
  'bless',
  'curse',
];
const RESIST_CODES = new Set(['wk', 'rs', 'nu', 'ab', 'rp', '-']);
const INHERIT_COLUMNS = [
  'phys',
  'gun',
  'fire',
  'ice',
  'electric',
  'wind',
  'psy',
  'nuclear',
  'bless',
  'curse',
  'healing',
  'ailment',
];

const ARCANA_BY_LABEL = new Map([
  ['Fool', 'fool'],
  ['Magician', 'magician'],
  ['Priestess', 'priestess'],
  ['Empress', 'empress'],
  ['Emperor', 'emperor'],
  ['Hierophant', 'hierophant'],
  ['Lovers', 'lovers'],
  ['Chariot', 'chariot'],
  ['Justice', 'justice'],
  ['Hermit', 'hermit'],
  ['Fortune', 'wheel'],
  ['Strength', 'strength'],
  ['Hanged', 'hanged'],
  ['Death', 'death'],
  ['Temperance', 'temperance'],
  ['Devil', 'devil'],
  ['Tower', 'tower'],
  ['Star', 'star'],
  ['Moon', 'moon'],
  ['Sun', 'sun'],
  ['Judgement', 'judgement'],
  ['Faith', 'faith'],
  ['Councillor', 'councillor'],
  ['World', 'world'],
]);
const ARCANA_BY_WIKI_LABEL = new Map([
  ['愚者', 'fool'],
  ['魔术师', 'magician'],
  ['女教皇', 'priestess'],
  ['女皇', 'empress'],
  ['皇帝', 'emperor'],
  ['教皇', 'hierophant'],
  ['恋人', 'lovers'],
  ['战车', 'chariot'],
  ['正义', 'justice'],
  ['隐士', 'hermit'],
  ['命运', 'wheel'],
  ['力量', 'strength'],
  ['倒悬者', 'hanged'],
  ['死神', 'death'],
  ['节制', 'temperance'],
  ['恶魔', 'devil'],
  ['塔', 'tower'],
  ['星星', 'star'],
  ['月亮', 'moon'],
  ['太阳', 'sun'],
  ['审判', 'judgement'],
  ['信念', 'faith'],
  ['顾问官', 'councillor'],
  ['世界', 'world'],
]);
const INHERIT_BY_LABEL = new Map([
  ['Phys', 'phys'],
  ['Physical', 'phys'],
  ['Gun', 'gun'],
  ['Fire', 'fire'],
  ['Ice', 'ice'],
  ['Electric', 'electric'],
  ['Electricity', 'electric'],
  ['Elec', 'electric'],
  ['Wind', 'wind'],
  ['Psy', 'psy'],
  ['Nuclear', 'nuclear'],
  ['Nuke', 'nuclear'],
  ['Bless', 'bless'],
  ['Curse', 'curse'],
  ['Healing', 'healing'],
  ['Ailment', 'ailment'],
  ['Almighty', 'almighty'],
]);
const MEGATEN_RESIST_CODES = new Map([
  ['w', 'wk'],
  ['s', 'rs'],
  ['n', 'nu'],
  ['r', 'rp'],
  ['d', 'ab'],
  ['-', '-'],
  ['_', '-'],
]);
const WIKI_RESIST_CODES = new Map([
  ['弱', 'wk'],
  ['耐', 'rs'],
  ['无', 'nu'],
  ['反', 'rp'],
  ['吸', 'ab'],
  ['-', '-'],
]);
const ELEMENT_LABELS_ZH = {
  phys: '物理',
  gun: '枪击',
  fire: '火焰',
  ice: '冰冻',
  electric: '电击',
  wind: '疾风',
  psy: '念动',
  nuclear: '核热',
  bless: '祝福',
  curse: '咒怨',
  almighty: '万能',
  healing: '恢复',
  ailment: '异常',
  support: '辅助',
  passive: '被动',
  trait: '特性',
  rare: '稀有',
};
const NAME_ALIASES = new Map([
  ['kusi mitama', 'kushi mitama'],
  ['mithra', 'mitra'],
]);
const SKILL_NAME_ALIASES = new Map([
  ['drain bless', 'absorb bless'],
  ['drain curse', 'absorb curse'],
  ['drain fire', 'absorb fire'],
  ['drain ice', 'absorb ice'],
  ['drain nuke', 'absorb nuke'],
  ['drain phys', 'absorb phys'],
  ['drain psy', 'absorb psy'],
  ['drain wind', 'absorb wind'],
  ['gattling blows', 'gatling blows'],
]);
const MANUAL_SKILL_NAMES_ZH = {
  'Akashic Arts': '虚无艺术',
  'Bloodstained Eyes': '沾满鲜血的双瞳',
};
const EXPECTED_COUNTS = {
  personas: 232,
  skills: 525,
  arcanaCombos: 273,
  specialFusions: 24,
  rarePersonas: 9,
  dlcGroups: 13,
  dlcPersonas: 25,
  confidantRequirements: 23,
};

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith('--')) throw new Error(`Unknown argument: ${key}`);
    const value = argv[i + 1];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${key}`);
    args[key.slice(2)] = value;
    i += 1;
  }
  if (!args['planner-dir']) {
    throw new Error('Missing --planner-dir <P5R-Fusion-Planner checkout>');
  }
  return args;
}

async function exists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

function gitRevision(dir) {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: dir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

function normalizeName(value) {
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u2019/g, "'")
    .toLowerCase()
    .trim();
  return NAME_ALIASES.get(normalized) ?? normalized;
}

function normalizeSkillName(value) {
  const normalized = normalizeName(value);
  return SKILL_NAME_ALIASES.get(normalized) ?? normalized;
}

function slugify(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/['\u2019]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function arcanaKey(label) {
  const key = ARCANA_BY_LABEL.get(label);
  if (!key) throw new Error(`Unknown arcana label: ${label}`);
  return key;
}

function inheritKey(label) {
  const key = INHERIT_BY_LABEL.get(label) ?? label.toLowerCase();
  if (
    !INHERIT_COLUMNS.includes(key)
    && key !== 'almighty'
    && key !== 'passive'
    && key !== 'support'
  ) {
    throw new Error(`Unknown inheritance label: ${label}`);
  }
  return key;
}

async function loadTsExports(file) {
  const source = await fs.readFile(file, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2021,
    },
    fileName: file,
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(
    output,
    {
      module,
      exports: module.exports,
      require: () => {
        throw new Error(`Runtime import is not supported while parsing ${file}`);
      },
      __filename: file,
      __dirname: path.dirname(file),
      console,
    },
    { filename: file },
  );
  return module.exports;
}

function sortedPairKey(a, b) {
  return [a, b].sort().join('\u0000');
}

function sortedSourcesKey(values) {
  return [...values].sort().join('\u0000');
}

function skillCanInherit(skill, inherits) {
  if (skill.element === 'trait' || skill.unique) return false;
  if (
    skill.element === 'passive'
    || skill.element === 'support'
    || skill.element === 'almighty'
  ) {
    return true;
  }
  const row = inherits[inherits.owner];
  if (!row) return false;
  return row[skill.element] === true;
}

function resistanceObject(elems) {
  return Object.fromEntries(RESIST_NAMES.map((name, index) => [name, elems[index]]));
}

function compatibilityStats(level, sourceStats) {
  return {
    // These four fields already backed the prototype's synthesis/result panel.
    // They are application compatibility values, not canonical P5R HP/SP data.
    hp: 30 + level,
    sp: 20 + level,
    attack: sourceStats[0],
    defense: sourceStats[2],
    strength: sourceStats[0],
    magic: sourceStats[1],
    endurance: sourceStats[2],
    agility: sourceStats[3],
    luck: sourceStats[4],
  };
}

function readMegatenData(dir) {
  const json = async name =>
    JSON.parse(
      (await fs.readFile(path.join(dir, 'src', 'app', 'p5', 'data', name), 'utf8')).replace(
        /^\uFEFF/,
        '',
      ),
    );
  return Promise.all([
    json('roy-demon-data.json'),
    json('roy-skill-data.json'),
    json('roy-special-recipes.json'),
    json('roy-demon-unlocks.json'),
  ]).then(([personas, skills, specialRecipes, unlocks]) => ({
    personas,
    skills,
    specialRecipes,
    unlocks,
  }));
}

function compareWithMegaten(personas, planner, specialFusions, megaten) {
  if (!megaten) return null;
  const megatenPersonas = new Map(
    Object.entries(megaten.personas).map(([name, value]) => [normalizeName(name), value]),
  );
  const plannerByName = new Map(personas.map(persona => [normalizeName(persona.nameEn), persona]));
  const differences = [];
  const onlyPlanner = [];
  const onlyMegaten = [];

  for (const [name, persona] of plannerByName) {
    const other = megatenPersonas.get(normalizeName(name));
    if (!other) {
      onlyPlanner.push(persona.nameEn);
      continue;
    }
    if (persona.level !== other.lvl) {
      differences.push(`${persona.nameEn}: level ${persona.level} != ${other.lvl}`);
    }
    if (persona.arcana !== arcanaKey(other.race)) {
      differences.push(`${persona.nameEn}: arcana ${persona.arcana} != ${other.race}`);
    }
    if (persona.sourceStats.join(',') !== other.stats.join(',')) {
      differences.push(`${persona.nameEn}: stats ${persona.sourceStats} != ${other.stats}`);
    }
    const otherRes = [...other.resists].map(code => MEGATEN_RESIST_CODES.get(code) ?? code);
    if (persona.resistances.join(',') !== otherRes.join(',')) {
      differences.push(
        `${persona.nameEn}: resistances ${persona.resistances.join(',')} != ${otherRes.join(',')}`,
      );
    }
    const otherSkills = new Set(Object.keys(other.skills).map(normalizeSkillName));
    const plannerSkills = new Set(persona.skills.map(normalizeSkillName));
    const missingHere = [...otherSkills].filter(skill => !plannerSkills.has(skill));
    const missingThere = [...plannerSkills].filter(skill => !otherSkills.has(skill));
    if (missingHere.length || missingThere.length) {
      differences.push(
        `${persona.nameEn}: skills +${missingHere.join('|')} -${missingThere.join('|')}`,
      );
    }
  }
  for (const [name, value] of megatenPersonas) {
    if (!plannerByName.has(normalizeName(name))) onlyMegaten.push(value.race ? name : name);
  }

  const plannerSpecial = new Map(
    specialFusions.map(recipe => [
      sortedSourcesKey(recipe.sourceNames.map(normalizeName)),
      normalizeName(recipe.result),
    ]),
  );
  const megatenSpecial = Object.entries(megaten.specialRecipes)
    .filter(([, sources]) => sources.length > 0)
    .map(([result, sources]) => [sortedSourcesKey(sources.map(normalizeName)), result]);
  const specialDifferences = [];
  for (const [sources, result] of megatenSpecial) {
    const counterpart = plannerSpecial.get(sources);
    if (!counterpart || counterpart !== normalizeName(result)) {
      specialDifferences.push(`${sources} -> ${counterpart ?? '(missing)'} / ${result}`);
    }
  }

  return {
    source: MEGATEN_URL,
    counts: {
      personas: Object.keys(megaten.personas).length,
      skills: Object.keys(megaten.skills).length,
      specialRecipes: megatenSpecial.length,
    },
    onlyPlanner,
    onlyMegaten,
    differences,
    specialDifferences,
  };
}

async function fetchWikiCrossCheck(url, personas) {
  if (!url) return null;
  const api = new URL('https://wiki.biligame.com/persona/api.php');
  const pagePath = new URL(url).pathname.replace(/^\/persona\//, '');
  api.searchParams.set('action', 'parse');
  api.searchParams.set('page', decodeURIComponent(pagePath));
  api.searchParams.set('prop', 'revid|text');
  api.searchParams.set('format', 'json');
  api.searchParams.set('formatversion', '2');
  const response = await fetch(api, {
    headers: {
      'user-agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36',
      accept: 'application/json,text/plain,*/*',
      'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
      referer: url,
    },
  });
  if (!response.ok) throw new Error(`Wiki request failed: HTTP ${response.status}`);
  const payload = await response.json();
  if (payload.error) throw new Error(`Wiki API error: ${payload.error.info}`);
  const dom = new JSDOM(payload.parse.text);
  const rows = [...dom.window.document.querySelectorAll('#CardSelectTr tbody tr')]
    .map(row => [...row.querySelectorAll(':scope > td')].map(cell => cell.textContent.trim()))
    .filter(cells => cells.length >= 16);
  const byEnglishName = new Map(
    personas.map(persona => [normalizeName(persona.nameEn), persona]),
  );
  const wikiRows = new Map();
  const localization = new Map();
  const wikiOnly = [];
  for (const cells of rows) {
    const [, nameZh, level, nameEn, nameJa, arcanaZh, ...resistTexts] = cells;
    const normalized = normalizeName(nameEn);
    const persona = byEnglishName.get(normalized);
    if (!persona) {
      wikiOnly.push({ nameEn, nameZh, level: Number(level), nameJa, arcanaZh });
      continue;
    }
    wikiRows.set(normalized, {
      nameZh,
      nameJa,
      level: Number(level),
      arcana: ARCANA_BY_WIKI_LABEL.get(arcanaZh),
      resistances: resistTexts.slice(0, 10).map(value => WIKI_RESIST_CODES.get(value) ?? value),
    });
    localization.set(normalized, { nameZh, nameJa });
  }

  const differences = [];
  for (const [name, persona] of byEnglishName) {
    const wiki = wikiRows.get(name);
    if (!wiki) continue;
    if (wiki.level !== persona.level) {
      differences.push(`${persona.nameEn}: level ${persona.level} != ${wiki.level}`);
    }
    if (wiki.arcana !== persona.arcana) {
      differences.push(`${persona.nameEn}: arcana ${persona.arcana} != ${wiki.arcana}`);
    }
    if (wiki.resistances.join(',') !== persona.resistances.join(',')) {
      differences.push(
        `${persona.nameEn}: resistances ${persona.resistances.join(',')} != ${wiki.resistances.join(',')}`,
      );
    }
  }

  return {
    localization,
    check: {
      source: url,
      revisionId: payload.parse.revid ?? null,
      declaredLicense: null,
      licenseNote:
        'The wiki exposes no open-content license fields and its footer says all rights reserved. It is used for cross-checking and short display-name localization only.',
      usage:
        'cross-check and Persona display-name labels only; no wiki prose, templates, images, skills or game-stat tables were copied into the catalog.',
      counts: {
        rows: rows.length,
        matched: wikiRows.size,
        localizedNames: localization.size,
        wikiOnly: wikiOnly.length,
      },
      wikiOnly,
      differences,
    },
  };
}

async function wikiApiRequest(params, referer) {
  const body = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    ...params,
  });
  let lastError = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch('https://wiki.biligame.com/persona/api.php', {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          'user-agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36',
          accept: 'application/json,text/plain,*/*',
          'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
          referer,
        },
        body,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      if (payload.error) throw new Error(`${payload.error.code}: ${payload.error.info}`);
      return payload;
    } catch (error) {
      lastError = error;
      await new Promise(resolve => setTimeout(resolve, 350 * (attempt + 1)));
    }
  }
  throw lastError;
}

function wikiApiPost(params, referer) {
  return wikiApiRequest(
    {
      prop: 'revisions',
      rvprop: 'ids|content',
      rvslots: 'main',
      ...params,
    },
    referer,
  );
}

function wikiTemplateParams(wikitext) {
  const params = {};
  for (const match of wikitext.matchAll(/^\|([^=\n]+)=([^\n]*)$/gm)) {
    params[match[1].trim()] = match[2].trim();
  }
  return params;
}

function comparisonKey(value) {
  return normalizeSkillName(value).replace(/[^a-z0-9]+/g, ' ').trim();
}

async function fetchWikiSkillDictionary(url, skills) {
  if (!url) return null;
  const titles = [];
  let continueToken = null;
  do {
    const payload = await wikiApiRequest(
      {
        list: 'allpages',
        apprefix: 'P5R/技能',
        aplimit: '500',
        ...(continueToken ? { apcontinue: continueToken } : {}),
      },
      url,
    );
    for (const page of payload.query?.allpages ?? []) {
      if (page.title.startsWith('P5R/技能 ')) titles.push(page.title);
    }
    continueToken = payload.continue?.apcontinue ?? null;
  } while (continueToken);

  const canonicalByKey = new Map(
    Object.keys(skills).map(skill => [comparisonKey(skill), skill]),
  );
  const names = new Map();
  const contentParts = [];
  let pagesRead = 0;
  let unmatchedPages = 0;
  for (let offset = 0; offset < titles.length; offset += 40) {
    const batch = titles.slice(offset, offset + 40);
    const payload = await wikiApiPost({ titles: batch.join('|') }, url);
    for (const page of payload.query?.pages ?? []) {
      const content = page.revisions?.[0]?.slots?.main?.content;
      if (!content) continue;
      pagesRead += 1;
      contentParts.push(`${page.title}\u0000${page.revisions?.[0]?.revid ?? ''}\u0000${content}`);
      const params = wikiTemplateParams(content);
      const english = params['英文名'];
      const chinese = params['中文名'];
      if (!english || !chinese) {
        unmatchedPages += 1;
        continue;
      }
      const canonical = canonicalByKey.get(comparisonKey(english));
      if (!canonical) {
        unmatchedPages += 1;
        continue;
      }
      names.set(canonical, chinese);
    }
  }
  for (const [skill, nameZh] of Object.entries(MANUAL_SKILL_NAMES_ZH)) {
    if (skills[skill]) names.set(skill, nameZh);
  }

  const missingSkills = Object.keys(skills)
    .filter(skill => !names.has(skill))
    .sort((a, b) => a.localeCompare(b));
  const hash = createHash('sha256');
  for (const part of contentParts.sort()) hash.update(part);
  return {
    names,
    check: {
      source: url,
      declaredLicense: null,
      usage:
        'Skill display-name and short template labels only; no prose, images or numeric tables copied from wiki.',
      counts: {
        skillPages: titles.length,
        pagesRead,
        localizedSkills: names.size,
        missingSkills: missingSkills.length,
        unmatchedPages,
      },
      contentSha256: hash.digest('hex'),
      missingSkills,
    },
  };
}

async function fetchWikiPersonaDetails(url, personas) {
  if (!url) return null;
  const byEnglishName = new Map(
    personas.map(persona => [normalizeName(persona.nameEn), persona]),
  );
  const personaMismatches = [];
  const missingPages = [];
  const hashParts = [];
  let detailedPages = 0;
  let localizedPersonas = 0;

  const targets = personas
    .filter(persona => persona.nameZh)
    .sort((a, b) => a.nameZh.localeCompare(b.nameZh, 'zh-CN'));
  for (let offset = 0; offset < targets.length; offset += 40) {
    const batch = targets.slice(offset, offset + 40);
    const payload = await wikiApiPost(
      { titles: batch.map(persona => `P5R/${persona.nameZh}`).join('|') },
      url,
    );
    const pages = payload.query?.pages ?? [];
    const returned = new Set();
    for (const page of pages) {
      const content = page.revisions?.[0]?.slots?.main?.content;
      if (!content) {
        missingPages.push(page.title);
        continue;
      }
      detailedPages += 1;
      returned.add(page.title);
      hashParts.push(`${page.title}\u0000${page.revisions?.[0]?.revid ?? ''}\u0000${content}`);
      const params = wikiTemplateParams(content);
      const persona = byEnglishName.get(normalizeName(params['英文名'] ?? ''));
      if (!persona) {
        personaMismatches.push(`unknown English name on ${page.title}: ${params['英文名'] ?? ''}`);
        continue;
      }

      const wikiSkills = [];
      for (let index = 1; index <= 23; index += 1) {
        const name = params[`技能${index}名称`];
        if (!name) continue;
        wikiSkills.push(name);
      }
      if (wikiSkills.length !== persona.skills.length) {
        personaMismatches.push(
          `${persona.nameEn}: ${persona.skills.length} source skills vs ${wikiSkills.length} wiki skills`,
        );
      }
      persona.traitZh = params['特性'] || null;
      persona.itemZh = params['电刑名'] || null;
      persona.itemRZh = params['警报电刑名'] || null;
      localizedPersonas += 1;
    }
    for (const persona of batch) {
      const title = `P5R/${persona.nameZh}`;
      if (!returned.has(title) && !pages.some(page => page.title === title)) {
        missingPages.push(title);
      }
    }
  }

  const hash = createHash('sha256');
  for (const part of hashParts.sort()) hash.update(part);
  return {
    check: {
      source: url,
      declaredLicense: null,
      usage:
        'Persona, trait and item display-name labels and page coverage only; no prose, templates, images, descriptions or numeric tables copied from wiki.',
      counts: {
        requestedPages: targets.length,
        detailedPages,
        localizedPersonas,
      },
      contentSha256: hash.digest('hex'),
      missingPages,
      personaMismatches,
    },
  };
}

function makeData({ planner, data5, skills, plannerDir, megatenDir, wikiUrl }) {
  const plannerRevision = gitRevision(plannerDir);
  const megatenRevision = megatenDir ? gitRevision(megatenDir) : null;
  const idsByName = new Map();
  const idSet = new Set();
  const personas = [];
  const skillEntries = {};

  for (const [name, value] of Object.entries(skills)) {
    skillEntries[name] = {
      name,
      ...value,
      personas: value.personas ? { ...value.personas } : undefined,
    };
  }

  const inherits = {};
  for (const [owner, cells] of Object.entries(data5.inheritanceChart)) {
    const key = inheritKey(owner);
    inherits[key] = Object.fromEntries(
      INHERIT_COLUMNS.map((column, index) => [column, cells[index] === '✓']),
    );
    inherits[key].owner = key;
  }

  const allowedByInherits = Object.fromEntries(
    Object.entries(inherits).map(([owner, row]) => [
      owner,
      INHERIT_COLUMNS.filter(column => row[column]),
    ]),
  );

  for (const [name, value] of Object.entries(planner)) {
    const id = slugify(name);
    if (idSet.has(id)) throw new Error(`Duplicate slug: ${name} -> ${id}`);
    idSet.add(id);
    idsByName.set(name, id);
    const sourceStats = [...value.stats];
    const element = value.inherits ? inheritKey(value.inherits) : 'rare';
    const personaSkills = Object.keys(value.skills);
    const skillLevels = Object.fromEntries(
      Object.entries(value.skills).map(([skill, level]) => [skill, level < 1 ? 0 : level]),
    );
    const allowed = element === 'rare'
      ? []
      : [...(allowedByInherits[element] ?? []), 'almighty'];
    const inheritPool = element === 'rare'
      ? []
      : Object.entries(skillEntries)
          .filter(([, skill]) => skillCanInherit(skill, { owner: element, ...inherits }))
          .map(([skillName]) => skillName);
    personas.push({
      id,
      nameEn: name,
      name,
      arcana: arcanaKey(value.arcana),
      level: value.level,
      element,
      sourceStats,
      stats: compatibilityStats(value.level, sourceStats),
      resistances: [...value.elems],
      resistance: resistanceObject(value.elems),
      skills: personaSkills,
      skillLevels,
      inheritPool,
      special: !!value.special,
      rare: !!value.rare,
      max: !!value.max,
      dlc: !!value.dlc,
      fusionOnly: !!value.special || !!value.rare,
      trait: value.trait ?? null,
      item: value.item ?? null,
      itemR: value.itemr ?? null,
      skillCard: !!value.skillCard,
      note: value.note ?? null,
      area: value.area ?? null,
      floor: value.floor ?? null,
      inherits: value.inherits ? element : null,
      inheritAllowedElements: allowed,
      plannerFlags: {
        special: !!value.special,
        rare: !!value.rare,
        max: !!value.max,
        dlc: !!value.dlc,
      },
    });
  }

  const arcanaCombos = data5.arcana2Combos.map(combo => ({
    a: arcanaKey(combo.source[0]),
    b: arcanaKey(combo.source[1]),
    result: arcanaKey(combo.result),
  }));
  const rareCombos = Object.fromEntries(
    Object.entries(data5.rareCombos).map(([arcana, values]) => [arcanaKey(arcana), values]),
  );
  const specialFusions = data5.specialCombos.map(combo => ({
    resultId: idsByName.get(combo.result) ?? null,
    result: combo.result,
    sources: combo.sources.map(source => idsByName.get(source) ?? null),
    sourceNames: [...combo.sources],
  }));
  const dlcGroups = data5.dlcPersona.map(group => ({
    id: slugify(group[0].replace(/ Picaro$/, '')),
    label: `${group[0].replace(/ Picaro$/, '')} DLC`,
    personaIds: group.map(name => idsByName.get(name) ?? null),
    personaNames: [...group],
  }));
  const confidantRequirements = Object.fromEntries(
    Object.entries(data5.confidantRequirements).map(([name, requirement]) => [
      idsByName.get(name) ?? slugify(name),
      { arcana: arcanaKey(requirement.arcana), rank: requirement.rank },
    ]),
  );
  const confidantNames = Object.fromEntries(
    Object.entries(data5.confidantNames).map(([arcana, name]) => [arcanaKey(arcana), name]),
  );

  return {
    planner,
    data5,
    skills: skillEntries,
    personas,
    arcanaCombos,
    rareCombos,
    specialFusions,
    dlcGroups,
    confidantRequirements,
    confidantNames,
    inherits,
    plannerRevision,
    megatenRevision,
    wikiUrl,
  };
}

function validateBuiltData(data) {
  const errors = [];
  const personaIds = new Set();
  const personaNames = new Set();
  const skillNames = new Set(Object.keys(data.skills));
  const arcana = new Set(ARCANA_BY_LABEL.values());

  for (const persona of data.personas) {
    if (personaIds.has(persona.id)) errors.push(`duplicate persona id: ${persona.id}`);
    if (personaNames.has(persona.nameEn)) errors.push(`duplicate persona name: ${persona.nameEn}`);
    if (persona.nameZh && personaNames.has(persona.nameZh)) {
      errors.push(`duplicate localized persona name: ${persona.nameZh}`);
    }
    personaIds.add(persona.id);
    personaNames.add(persona.nameEn);
    if (persona.nameZh) personaNames.add(persona.nameZh);
    if (!arcana.has(persona.arcana)) errors.push(`bad arcana: ${persona.id} ${persona.arcana}`);
    if (!Number.isInteger(persona.level) || persona.level < 1 || persona.level > 99) {
      errors.push(`bad level: ${persona.id} ${persona.level}`);
    }
    if (!Array.isArray(persona.sourceStats) || persona.sourceStats.length !== 5) {
      errors.push(`bad source stats length: ${persona.id}`);
    }
    if (persona.sourceStats.some(value => !Number.isInteger(value) || value < 1 || value > 99)) {
      errors.push(`bad source stats value: ${persona.id}`);
    }
    if (!Array.isArray(persona.resistances) || persona.resistances.length !== RESIST_NAMES.length) {
      errors.push(`bad resistance count: ${persona.id}`);
    }
    if (persona.resistances.some(code => !RESIST_CODES.has(code))) {
      errors.push(`bad resistance code: ${persona.id}`);
    }
    if (!persona.skills.length) errors.push(`persona has no skills: ${persona.id}`);
    for (const skill of persona.skills) {
      if (!skillNames.has(skill)) errors.push(`missing skill ${skill} on ${persona.id}`);
    }
  }

  for (const combo of data.arcanaCombos) {
    for (const key of [combo.a, combo.b, combo.result]) {
      if (!arcana.has(key)) errors.push(`bad arcana combo key: ${key}`);
    }
  }
  for (const recipe of data.specialFusions) {
    if (!recipe.resultId) errors.push(`missing special fusion result: ${recipe.result}`);
    if (recipe.sources.length < 2) errors.push(`special fusion needs 2+ sources: ${recipe.result}`);
    for (const source of recipe.sources) {
      if (!source) errors.push(`missing special fusion source for ${recipe.result}`);
    }
  }
  for (const group of data.dlcGroups) {
    if (!group.personaIds.length) errors.push(`empty DLC group: ${group.id}`);
    for (const id of group.personaIds) {
      if (!id) errors.push(`missing DLC persona in ${group.id}`);
    }
  }
  for (const [id, requirement] of Object.entries(data.confidantRequirements)) {
    if (!personaIds.has(id)) errors.push(`unknown confidant requirement persona: ${id}`);
    if (!arcana.has(requirement.arcana)) errors.push(`bad confidant arcana: ${id}`);
  }
  return errors;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const plannerDir = path.resolve(args['planner-dir']);
  const megatenDir = args['megaten-dir'] ? path.resolve(args['megaten-dir']) : null;
  const outFile = args.out ? path.resolve(args.out) : DEFAULT_OUT;
  const wikiUrl = args['wiki-url'] === 'none' ? null : args['wiki-url'] || DEFAULT_WIKI_URL;

  if (!(await exists(path.join(plannerDir, 'src', 'data', 'PersonaDataRoyal.ts')))) {
    throw new Error(`Not a P5R Fusion Planner checkout: ${plannerDir}`);
  }
  if (megatenDir && !(await exists(path.join(megatenDir, 'src', 'app', 'p5', 'data')))) {
    throw new Error(`Not a megaten-fusion-tool checkout: ${megatenDir}`);
  }

  const [plannerExports, skillExports, dataExports] = await Promise.all([
    loadTsExports(path.join(plannerDir, 'src', 'data', 'PersonaDataRoyal.ts')),
    loadTsExports(path.join(plannerDir, 'src', 'data', 'SkillDataRoyal.ts')),
    loadTsExports(path.join(plannerDir, 'src', 'data', 'Data5Royal.ts')),
  ]);
  const planner = plannerExports.personaMapRoyal;
  const skills = skillExports.skillMapRoyal;
  const data5 = dataExports;
  if (!planner || !skills || !data5.arcana2Combos) {
    throw new Error('Planner source exports were not found in the expected shape.');
  }

  const data = makeData({
    planner,
    data5,
    skills,
    plannerDir,
    megatenDir,
    wikiUrl,
  });

  if (megatenDir) {
    data.megaten = readMegatenData(megatenDir);
  }
  const megaten = data.megaten ? await data.megaten : null;
  const megatenCheck = compareWithMegaten(
    data.personas,
    planner,
    data.specialFusions,
    megaten,
  );
  const wikiResult = await fetchWikiCrossCheck(wikiUrl, data.personas);
  if (wikiResult) {
    for (const persona of data.personas) {
      const localized = wikiResult.localization.get(normalizeName(persona.nameEn));
      if (!localized) continue;
      persona.nameZh = localized.nameZh;
      persona.nameJa = localized.nameJa;
      persona.name = localized.nameZh;
    }
  }
  for (const persona of data.personas) {
    persona.skillNames = [...persona.skills];
    persona.elementLabel = ELEMENT_LABELS_ZH[persona.element] ?? persona.element;
    persona.traitZh = null;
    persona.itemZh = null;
    persona.itemRZh = null;
  }
  const wikiSkillDictionary = await fetchWikiSkillDictionary(wikiUrl, data.skills);
  if (wikiSkillDictionary) {
    for (const [skill, nameZh] of wikiSkillDictionary.names) {
      if (data.skills[skill]) data.skills[skill].nameZh = nameZh;
    }
    for (const persona of data.personas) {
      persona.skillNames = persona.skills.map(
        skill => wikiSkillDictionary.names.get(skill) ?? skill,
      );
    }
  }
  const wikiDetails = await fetchWikiPersonaDetails(wikiUrl, data.personas);
  const wikiCheck = wikiResult?.check ?? null;

  const counts = {
    personas: data.personas.length,
    skills: Object.keys(data.skills).length,
    arcanaCombos: data.arcanaCombos.length,
    specialFusions: data.specialFusions.length,
    rarePersonas: data.personas.filter(persona => persona.rare).length,
    dlcGroups: data.dlcGroups.length,
    dlcPersonas: data.dlcGroups.reduce((sum, group) => sum + group.personaIds.length, 0),
    confidantRequirements: Object.keys(data.confidantRequirements).length,
  };
  const validationErrors = validateBuiltData(data);
  for (const [key, expected] of Object.entries(EXPECTED_COUNTS)) {
    if (counts[key] !== expected) {
      validationErrors.push(`count mismatch: ${key} expected ${expected}, got ${counts[key]}`);
    }
  }
  if (validationErrors.length) {
    throw new Error(`Generated data failed validation:\n${validationErrors.join('\n')}`);
  }
  const meta = {
    version: 1,
    game: 'Persona 5 Royal',
    generatedAt: new Date().toISOString(),
    source: {
      name: 'P5R Fusion Planner',
      url: PLANNER_URL,
      revision: data.plannerRevision,
      files: [
        'src/data/PersonaDataRoyal.ts',
        'src/data/SkillDataRoyal.ts',
        'src/data/Data5Royal.ts',
      ],
      license: 'Apache-2.0',
      licenseUrl: 'https://www.apache.org/licenses/LICENSE-2.0',
      notice:
        'Data adapted from persona5_calculator by chinhodado, which derives from persona-fusion-calculator by Anthony Lieuallen. See the upstream LICENSE and NOTICE.',
      localization: wikiCheck
        ? {
            source: wikiCheck.source,
            revision: wikiCheck.revisionId,
            declaredLicense: null,
            usage:
              'Short Chinese/Japanese Persona, skill, trait and item display-name labels from the user-provided P5R wiki pages. No prose, images, templates or numeric tables are included; the wiki declares no open-content license.',
            details: wikiDetails?.check ?? null,
            skillDictionary: wikiSkillDictionary?.check ?? null,
          }
        : null,
    },
    copyrightBoundary: {
      trademark: 'PERSONA 5 ROYAL is a trademark of Atlus Co., Ltd. / SEGA.',
      scope: 'Personal, non-commercial prototype data import.',
      gameAssetsIncluded: false,
      names: 'Chinese/Japanese Persona, skill, trait and item labels are display-name facts used for the local prototype; wiki content is not under an open-content license.',
    },
    counts,
    gameValues: {
      fromP5R: [
        'level',
        'five base stats (strength / magic / endurance / agility / luck)',
        'ten affinity/resistance slots',
        'skill learn levels',
      ],
      selfDesigned: [
        'compatibility HP and SP',
        'skill damage application in the demo battle rules',
        'fusion/withdraw UI pricing',
      ],
    },
    compatibility: {
      stats:
        'stats.hp/sp are prototype compatibility fields; stats.attack/defense mirror P5R Strength/Endurance for the old result panel. Canonical five stats are retained in sourceStats.',
      skills:
        'skills are stored by their canonical English skill names and use the P5R skill map; no HP/SP/power values are invented.',
    },
    crossChecks: {
      megaten: megatenCheck,
      wiki: wikiCheck,
      wikiDetails: wikiDetails?.check ?? null,
      wikiSkillDictionary: wikiSkillDictionary?.check ?? null,
    },
  };

  const moduleText = `/**
 * GENERATED FILE. Do not edit by hand.
 * Source: ${PLANNER_URL} @ ${data.plannerRevision ?? 'unknown'}
 * SPDX-License-Identifier: Apache-2.0
 */
export const P5R_COMPENDIUM_META = ${JSON.stringify(meta, null, 2)};

export const P5R_SKILLS = ${JSON.stringify(data.skills, null, 2)};

export const P5R_PERSONAS = ${JSON.stringify(data.personas, null, 2)};

export const P5R_PERSONA_BY_ID = Object.fromEntries(P5R_PERSONAS.map(persona => [persona.id, persona]));

export const P5R_ARCANA_COMBOS = ${JSON.stringify(data.arcanaCombos, null, 2)};

export const P5R_SPECIAL_FUSIONS = ${JSON.stringify(data.specialFusions, null, 2)};

export const P5R_RARE_PERSONA_IDS = ${JSON.stringify(
    data.personas.filter(persona => persona.rare).map(persona => persona.id),
    null,
    2,
  )};

export const P5R_RARE_COMBOS = ${JSON.stringify(data.rareCombos, null, 2)};

export const P5R_DLC_GROUPS = ${JSON.stringify(data.dlcGroups, null, 2)};

export const P5R_CONFIDANT_REQUIREMENTS = ${JSON.stringify(data.confidantRequirements, null, 2)};

export const P5R_CONFIDANT_NAMES = ${JSON.stringify(data.confidantNames, null, 2)};

export const P5R_INHERITANCE_CHART = ${JSON.stringify(data.inherits, null, 2)};
`;

  await fs.mkdir(path.dirname(outFile), { recursive: true });
  await fs.writeFile(outFile, moduleText, 'utf8');

  const summary = {
    outFile,
    counts,
    plannerRevision: data.plannerRevision,
    megatenRevision: data.megatenRevision,
    megatenDifferences: megatenCheck?.differences.length ?? null,
    megatenSpecialDifferences: megatenCheck?.specialDifferences.length ?? null,
    wikiRows: wikiCheck?.counts.rows ?? null,
    wikiMatched: wikiCheck?.counts.matched ?? null,
    wikiOnly: wikiCheck?.wikiOnly?.length ?? null,
    wikiDifferences: wikiCheck?.differences.length ?? null,
    localizedSkills: wikiSkillDictionary?.check.counts.localizedSkills ?? null,
    missingLocalizedSkills: wikiSkillDictionary?.check.counts.missingSkills ?? null,
  };
  console.log(JSON.stringify(summary, null, 2));
}

main().catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
