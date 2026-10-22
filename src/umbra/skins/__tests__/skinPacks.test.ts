/**
 * 四皮皮肤包（skins v1）数据契约测试：只读 skins/<id>/pack.json 与素材文件，不依赖引擎。
 * 覆盖：id/目录一致、roster（D-005）、labels 必填（契约 v1.2 §4.2 + v1.3 §8）、
 * enemyLayouts 1–5（D-004，不压指令区）、manifest 素材存在、首包 ≤1MB、音频三 json。
 */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const SKINS_DIR = path.resolve(process.cwd(), 'src/umbra/skins');
const SKIN_IDS = ['p5r-red', 'p3-blue', 'p3r-pink', 'p4-yellow'] as const;
const PERSONA_CHUNKS = path.resolve(process.cwd(), 'src/umbra/engine/data/chunks');

const REQUIRED_LABELS = [
  'label.requestBoard', 'label.heartCard', 'label.holdup', 'label.allout', 'label.onemore',
  'label.highlight', 'label.rank', 'label.world', 'label.dive', 'label.totalDamage', 'label.more',
  'label.darkHour', 'label.baton', 'label.battleStart', 'label.finish', 'result.levelup',
  'tag.WEAK', 'tag.CRIT', 'tag.RESIST', 'tag.MISS', 'tag.NULL', 'tag.REPEL', 'tag.DOWN',
];

const readJson = (file: string): any => JSON.parse(fs.readFileSync(file, 'utf8'));

const compendiumIds = (): Set<string> | null => {
  if (!fs.existsSync(PERSONA_CHUNKS)) return null;
  const ids = new Set<string>();
  for (const file of fs.readdirSync(PERSONA_CHUNKS)) {
    if (!file.startsWith('persona-')) continue;
    for (const persona of readJson(path.join(PERSONA_CHUNKS, file)).personas ?? []) ids.add(persona.id);
  }
  return ids;
};

describe.each(SKIN_IDS)('UMBRA skin pack %s', (skinId) => {
  const dir = path.join(SKINS_DIR, skinId);
  const pack = readJson(path.join(dir, 'pack.json'));

  it('入口与 id 一致，无 handlers', () => {
    expect(fs.existsSync(path.join(dir, 'index.ts'))).toBe(true);
    expect(pack.id).toBe(skinId);
    expect(pack.handlers).toBeUndefined();
    expect(Array.isArray(pack.recipes)).toBe(true);
    expect(pack.recipes.length).toBeGreaterThan(0);
  });

  it('roster：主角初始面具、同伴专属面具、排除名单（D-005）', () => {
    const { roster } = pack;
    expect(typeof roster.heroPersona).toBe('string');
    expect(roster.heroPersona.length).toBeGreaterThan(0);
    expect(roster.excludedPersonas).not.toContain(roster.heroPersona);
    expect(roster.companions.length).toBeGreaterThanOrEqual(3);
    for (const id of roster.companions) {
      expect(roster.companionPersonas[id], `companionPersonas.${id}`).toBeTruthy();
    }
    const ids = compendiumIds();
    if (ids) {
      expect(ids.has(roster.heroPersona), `heroPersona ${roster.heroPersona} 在共享图鉴中`).toBe(true);
      for (const excluded of roster.excludedPersonas) expect(ids.has(excluded), excluded).toBe(true);
    }
  });

  it('labels 必填键齐全（含每名成员 unit.<id> / persona.<id>）', () => {
    for (const key of REQUIRED_LABELS) expect(pack.labels[key], key).toBeTruthy();
    for (const id of Object.keys(pack.roster.members)) {
      expect(pack.labels[`unit.${id}`], `unit.${id}`).toBeTruthy();
      expect(pack.labels[`persona.${id}`], `persona.${id}`).toBeTruthy();
    }
  });

  it('enemyLayouts 1–5 只，且不压右下指令区（D-004）', () => {
    for (const count of [1, 2, 3, 4, 5]) {
      const row = pack.enemyLayouts[count];
      expect(row).toHaveLength(count);
      for (const p of row) {
        expect(p.scale).toBeGreaterThan(0);
        expect(typeof p.layer).toBe('string');
        expect(p.x < 780 || p.y < 220).toBe(true);
      }
    }
  });

  it('manifest 素材文件存在、source 合法', () => {
    for (const asset of pack.manifest.assets) {
      expect(['official', 'generated']).toContain(asset.source);
      expect(fs.existsSync(path.join(dir, asset.file)), asset.file).toBe(true);
    }
    for (const art of Object.values(pack.compendiumArt) as string[]) {
      expect(fs.existsSync(path.join(dir, art)), art).toBe(true);
    }
  });

  it('首包 ≤1MB、字体 ≤120KB', () => {
    expect(pack.budget.firstPackTotalBytes).toBeLessThanOrEqual(1024 * 1024);
    expect(pack.budget.fontBytes).toBeLessThanOrEqual(120 * 1024);
  });

  it('音频清单三份 json（契约 v1.3 §7）', () => {
    for (const name of ['playlist', 'sfx', 'voice']) {
      const audio = readJson(path.join(dir, 'audio', `${name}.json`));
      expect(audio.skin).toBe(skinId);
    }
  });
});
