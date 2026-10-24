// Plan 02 evidence only: never changes application state outside an isolated profile.
// First run audit-theme-demos.mjs into a new evidence directory, then pass that directory.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { chromium } from '../node_modules/playwright/index.mjs';

const root = process.cwd();
const out = resolve(process.argv[2] ?? '');
if (!process.argv[2] || !existsSync(`${out}/files/report.json`)) throw new Error('Pass evidence directory containing files/report.json');
if (existsSync(`${out}/runtime.json`)) throw new Error('Evidence already exists; use a new directory');
const files = JSON.parse(readFileSync(`${out}/files/report.json`, 'utf8'));
const base = process.env.THEME_AUDIT_BASE ?? 'http://127.0.0.1:5196';
const protectedPath = p => /(?:^|[/\\])\.env(?:[./\\]|$)|credentials\.|private.*key|token|secret/i.test(p);
mkdirSync(`${out}/diffs`, { recursive: true });
const changes = [];
for (const theme of files.themes) {
  for (const file of theme.files.filter(f => f.state === 'changed')) {
    if (!file.cacheOK || protectedPath(file.source) || protectedPath(file.path)) throw new Error('Unverified or protected input');
    const original = resolve('E:/MASKARIA/.cache/demo-packages', `${theme.theme}-demo`, file.source);
    const result = spawnSync('git', ['diff', '--no-index', '--no-ext-diff', '--unified=2', original, resolve(root, file.path)], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024, windowsHide: true });
    if (result.status !== 1) throw new Error(`Unexpected diff status ${result.status}: ${file.path}`);
    const id = `D${String(changes.length + 1).padStart(3, '0')}`;
    writeFileSync(`${out}/diffs/${id}.patch`, result.stdout, { flag: 'wx' });
    changes.push({ id, theme: theme.theme, path: file.path, originalHash: file.hash, currentHash: file.targetHash, evidence: `diffs/${id}.patch` });
  }
}
writeFileSync(`${out}/changes.json`, JSON.stringify(changes, null, 2), { flag: 'wx' });
const report = { head: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), base, createdAt: new Date().toISOString(), scope: 'Isolated imports of every registry loader; formal page mounts with empty synthetic local user. No overlay rendering, business writes, real login or visual acceptance.', themes: [], pageerrors: [], localFailures: [], blocked: 0 };
const context = await chromium.launchPersistentContext(`${out}/profile`, { executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, viewport: { width: 390, height: 844 }, serviceWorkers: 'block', reducedMotion: 'reduce' });
try {
  await context.route('**/*', route => {
    const u = new URL(route.request().url());
    if (u.origin !== base || u.pathname.startsWith('/api/')) { report.blocked++; return route.abort(); }
    return route.continue();
  });
  const page = context.pages()[0];
  page.on('pageerror', e => report.pageerrors.push({ url: page.url(), message: e.message }));
  page.on('response', r => { if (r.status() >= 400 && r.url().startsWith(base) && !new URL(r.url()).pathname.startsWith('/api/')) report.localFailures.push({ url: r.url(), status: r.status() }); });
  await page.goto(base);
  await page.waitForFunction(() => document.querySelector('#root')?.childElementCount > 0);
  for (const [theme, color] of [['p3r-blue', 'blue'], ['p3r-pink', 'pink'], ['p4g-yellow', 'yellow'], ['p5r-red', 'red']]) {
    const prefix = theme === 'p5r-red' ? '/src/p5r-red' : `/src/themes/${theme}`;
    const loaders = await page.evaluate(async prefix => {
      const { PAGES } = await import(`${prefix}/registry/pages.ts`);
      const { OVERLAYS } = await import(`${prefix}/registry/overlays.ts`);
      const result = [];
      for (const [kind, entries] of [['page', PAGES], ['overlay', OVERLAYS]]) {
        for (const [key, entry] of Object.entries(entries)) {
          try { const m = await entry.load(); result.push({ kind, key, title: entry.title, params: entry.params ?? {}, ok: typeof m.default === 'function', exportType: typeof m.default }); }
          catch (e) { result.push({ kind, key, ok: false, error: String(e) }); }
        }
      }
      return result;
    }, prefix);
    const entry = { theme, loaders, pages: [] };
    report.themes.push(entry);
    await page.evaluate(async color => {
      const { db } = await import('/src/db/index.ts');
      await db.users.put({ id: 'plan02-isolated', name: '计划02隔离核对', theme: color, createdAt: new Date() });
      await db.settings.update('default', { openaiEnabled: false, darkMode: false });
    }, color);
    await page.goto(`${base}/#/p/dashboard?__motion=low&__snd=0`);
    await page.reload();
    await page.waitForTimeout(1500);
    for (const row of loaders.filter(r => r.kind === 'page')) {
      await page.evaluate(key => { location.hash = `/p/${key}?__motion=low&__snd=0`; }, row.key);
      await page.waitForTimeout(600);
      const snapshot = await page.evaluate(() => ({ hash: location.hash, text: document.body.innerText.slice(0, 6000), rootChildren: document.querySelector('#root')?.childElementCount ?? 0 }));
      entry.pages.push({ key: row.key, ...snapshot });
    }
    console.log(`${theme}: ${loaders.length} loaders (${loaders.filter(r => !r.ok).length} failed), ${entry.pages.length} page snapshots`);
  }
} catch (e) { report.error = e.stack; process.exitCode = 1; }
finally { await context.close(); writeFileSync(`${out}/runtime.json`, JSON.stringify(report, null, 2), { flag: 'wx' }); }
if (report.themes.some(t => t.loaders.some(r => !r.ok)) || report.pageerrors.length || report.localFailures.length) process.exitCode = 1;
console.log(`Evidence: ${out}/runtime.json`);
