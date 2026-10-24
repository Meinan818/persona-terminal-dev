// Plan 02 R01 only: targeted, isolated timing checks for six previously-empty snapshots.
// This does not import the registry loaders or replace the existing 764-loader evidence.
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from '../node_modules/playwright/index.mjs';

const out = resolve(process.argv[2] ?? '');
if (!process.argv[2]) throw new Error('Pass a new evidence directory');
if (existsSync(out)) throw new Error('Evidence directory already exists; use a new directory');

const base = process.env.THEME_AUDIT_BASE ?? 'http://127.0.0.1:5196';
const targets = [
  { name: 'blue-dashboard', theme: 'p3r-blue', color: 'blue', key: 'dashboard', expect: /MASKARIA|PERSONA|今日任务/ },
  { name: 'blue-boot', theme: 'p3r-blue', color: 'blue', key: 'boot', hashQuery: 'state=loading', expect: /NOW LOADING|正在读取本地数据/ },
  { name: 'pink-dashboard', theme: 'p3r-pink', color: 'pink', key: 'dashboard', expect: /MASKARIA|PERSONA|今日任务/ },
  { name: 'pink-boot', theme: 'p3r-pink', color: 'pink', key: 'boot', hashQuery: 'state=loading', expect: /NOW LOADING|正在读取本地数据/ },
  { name: 'yellow-dashboard', theme: 'p4g-yellow', color: 'yellow', key: 'dashboard', expect: /MASKARIA|TODAY'S SHOW|今日任务/ },
  { name: 'red-battle-umbra', theme: 'p5r-red', color: 'red', key: 'battle', mode: 'umbra' },
  { name: 'red-battle-legacy', theme: 'p5r-red', color: 'red', key: 'battle', query: { legacy: '1' }, expect: /逆影|影时间|Persona|召唤|战场/ },
];
const sampleDelays = [0, 120, 300, 620, 900, 1500, 2500, 4000, 6500, 9000, 12000];

mkdirSync(out, { recursive: true });
const report = {
  scope: 'Plan 02 R01 only: targeted formal-page timing checks in an isolated profile. Not loader, business, visual or user acceptance.',
  base,
  createdAt: new Date().toISOString(),
  sampleDelays,
  roundsPerTarget: 3,
  results: [],
  pageerrors: [],
  localFailures: [],
  blocked: 0,
};

const context = await chromium.launchPersistentContext(resolve(out, 'profile'), {
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  viewport: { width: 390, height: 844 },
  serviceWorkers: 'block',
  reducedMotion: 'reduce',
});

try {
  await context.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== base || url.pathname.startsWith('/api/')) {
      report.blocked++;
      return route.abort();
    }
    return route.continue();
  });

  const page = context.pages()[0];
  page.on('pageerror', (error) => report.pageerrors.push({ url: page.url(), message: error.message }));
  page.on('response', (response) => {
    if (response.status() >= 400 && response.url().startsWith(base) && !new URL(response.url()).pathname.startsWith('/api/')) {
      report.localFailures.push({ url: response.url(), status: response.status() });
    }
  });

  await page.goto(`${base}/?__mode=day&__motion=low&__snd=0`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => (document.querySelector('#root')?.childElementCount ?? 0) > 0, null, { timeout: 15000 });

  for (const target of targets) {
    for (let round = 1; round <= 3; round++) {
      await page.evaluate(async ({ color }) => {
        const { db } = await import('/src/db/index.ts');
        await db.users.clear();
        await db.users.put({
          id: 'plan02-r01-isolated',
          name: `计划02 R01 隔离-${color}`,
          theme: color,
          createdAt: new Date(),
        });
        await db.settings.update('default', { openaiEnabled: false, darkMode: false });
      }, { color: target.color });

      const hashQuery = target.hashQuery ? `?${target.hashQuery}` : '';
      const navigationKey = `${round}-${Date.now()}`;
      const outerQuery = new URLSearchParams({
        __mode: 'day',
        __motion: 'low',
        __snd: '0',
        __dev: '0',
        r01: navigationKey,
        ...(target.query ?? {}),
      });
      const targetUrl = `${base}/?${outerQuery}#/p/${target.key}${hashQuery}`;
      const started = Date.now();
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });

      const samples = [];
      let previousDelay = 0;
      for (const delay of sampleDelays) {
        await page.waitForTimeout(delay - previousDelay);
        previousDelay = delay;
        samples.push(await page.evaluate(({ delay, elapsedMs }) => {
          const root = document.querySelector('#root');
          const bodyText = document.body.innerText.slice(0, 6000);
          return {
            delay,
            elapsedMs,
            href: location.href,
            search: location.search,
            hash: location.hash,
            title: document.title,
            rootChildren: root?.childElementCount ?? 0,
            bodyChildren: document.body.childElementCount,
            umbraFrame: document.querySelectorAll('.umbra-demo-frame').length,
            umbraIframes: document.querySelectorAll('.umbra-demo-frame iframe').length,
            bodyTextLength: bodyText.length,
            bodyTextHead: bodyText.slice(0, 240),
            htmlData: { ...document.documentElement.dataset },
            bodyClass: document.body.className,
          };
        }, { delay, elapsedMs: Date.now() - started }));
      }

      const isMounted = (sample) => target.mode === 'umbra'
        ? sample.umbraFrame > 0 && sample.umbraIframes > 0 && sample.bodyTextLength > 0
        : sample.rootChildren > 0 && target.expect.test(sample.bodyTextHead);
      const matching = samples.find(isMounted);
      const stable = samples.slice(-2).every(isMounted);
      const screenshot = resolve(out, `${target.name}-round${round}.png`);
      if (stable) await page.screenshot({ path: screenshot, fullPage: false });
      report.results.push({
        name: target.name,
        theme: target.theme,
        key: target.key,
        round,
        url: targetUrl,
        pass: !!matching && stable,
        firstMatchingDelay: matching?.delay ?? null,
        lastTwoStable: stable,
        screenshot: stable ? screenshot : null,
        samples,
      });
      console.log(`${target.name} round ${round}: ${matching && stable ? 'PASS' : 'FAIL'} first=${matching?.delay ?? '-'}ms`);
    }
  }
} catch (error) {
  report.error = error.stack;
  process.exitCode = 1;
} finally {
  await context.close();
  writeFileSync(resolve(out, 'r01.json'), JSON.stringify(report, null, 2));
}

if (
  report.results.length !== targets.length * 3
  || report.results.some((result) => !result.pass)
  || report.pageerrors.length
  || report.localFailures.length
) {
  process.exitCode = 1;
}
console.log(`Evidence: ${resolve(out, 'r01.json')}`);
