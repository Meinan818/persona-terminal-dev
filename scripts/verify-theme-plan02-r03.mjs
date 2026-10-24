// Plan 02 R03 only: targeted, isolated store-event probes for formal overlay hosts.
// Synthetic in-memory payloads verify mount/consumer chains, not business writes or visual acceptance.
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from '../node_modules/playwright/index.mjs';

const out = resolve(process.argv[2] ?? '');
if (!process.argv[2]) throw new Error('Pass a new evidence directory');
if (existsSync(out)) throw new Error('Evidence directory already exists; use a new directory');

const base = process.env.THEME_AUDIT_BASE ?? 'http://127.0.0.1:5196';
mkdirSync(out, { recursive: true });
const report = {
  scope: 'Plan 02 R03 only: synthetic store payloads in an isolated profile to identify formal overlay consumers and close paths. No business writes, model calls, real login or visual acceptance.',
  base,
  createdAt: new Date().toISOString(),
  checks: [],
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

  const loadTheme = async (theme, color, pageKey = 'dashboard') => {
    await page.evaluate(async ({ color }) => {
      const { db } = await import('/src/db/index.ts');
      await db.users.clear();
      await db.users.put({
        id: 'plan02-r03-isolated',
        name: `计划02 R03 隔离-${color}`,
        theme: color,
        createdAt: new Date(),
      });
      await db.settings.update('default', { openaiEnabled: false, darkMode: false });
    }, { color });
    const query = new URLSearchParams({
      __mode: 'day',
      __motion: 'low',
      __snd: '0',
      __dev: '0',
      r03: `${theme}-${Date.now()}`,
    });
    await page.goto(`${base}/?${query}#/p/${pageKey}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(7000);
  };

  const clearEvents = async () => {
    await page.evaluate(async () => {
      const { useAppStore } = await import('/src/store/index.ts');
      useAppStore.setState({
        modalBlocker: false,
        levelUpNotification: null,
        achievementNotification: null,
        skillNotification: null,
        wishProposal: null,
        wishProgressCut: null,
        bigDealClear: null,
        pendingReturnPayload: null,
        callingCards: [],
      });
    });
    await page.waitForTimeout(500);
  };

  const check = async ({ theme, name, setup, marker, expectedVisible, expectedMinOccurrences = 1 }) => {
    await clearEvents();
    await page.evaluate(async ({ setup }) => {
      const { useAppStore } = await import('/src/store/index.ts');
      const payload = Function('return (' + setup + ')')()();
      useAppStore.setState({ modalBlocker: false, ...payload });
    }, { setup: `(${setup.toString()})` });
    await page.waitForTimeout(1000);
    const observed = await page.evaluate(({ marker }) => {
      const text = document.body.innerText;
      return {
        marker,
        occurrences: text.split(marker).length - 1,
        bodyTextHead: text.slice(0, 1000),
        rootChildren: document.querySelector('#root')?.childElementCount ?? 0,
        htmlData: { ...document.documentElement.dataset },
      };
    }, { marker });
    const pass = expectedVisible
      ? observed.occurrences >= expectedMinOccurrences
      : observed.occurrences === 0;
    report.checks.push({ theme, name, expectedVisible, expectedMinOccurrences, pass, ...observed });
    console.log(`${theme} ${name}: ${pass ? 'PASS' : 'FAIL'} occurrences=${observed.occurrences}`);
  };

  await loadTheme('p3r-blue', 'blue');
  await check({
    theme: 'p3r-blue',
    name: 'level-up global consumer',
    marker: 'R03蓝升级',
    expectedVisible: true,
    setup: () => ({ levelUpNotification: { id: 'knowledge', displayName: 'R03蓝升级', level: 7 } }),
  });
  await check({
    theme: 'p3r-blue',
    name: 'wish proposal global consumer',
    marker: 'R03蓝提案愿望',
    expectedVisible: true,
    setup: () => ({ wishProposal: { wishId: 'wish-r03', wishTitle: 'R03蓝提案愿望', fromPct: 20, toPct: 28, reason: 'R03 synthetic' } }),
  });
  await check({
    theme: 'p3r-blue',
    name: 'wish progress cut-in consumer',
    marker: 'R03蓝愿望',
    expectedVisible: false,
    setup: () => ({ wishProgressCut: { wishId: 'wish-r03', wishTitle: 'R03蓝愿望', pct: 28, delta: 8, times: 3, reason: 'R03 synthetic', source: 'local' } }),
  });
  await check({
    theme: 'p3r-blue',
    name: 'return panel automatic consumer',
    marker: '欢迎回来',
    expectedVisible: false,
    setup: () => ({ pendingReturnPayload: { daysAway: 3, tier: 'recent', returnCount: 2, lastSeenKey: '2026-10-20', backfillDays: ['2026-10-21'], totalRecords: 0, topAttribute: null } }),
  });
  await check({
    theme: 'p3r-blue',
    name: 'calling-card archived consumer count',
    marker: '宣告 · 已收',
    expectedVisible: true,
    setup: () => ({ callingCards: [{ id: 'cc-r03', title: 'R03蓝宣告卡', icon: '★', texture: 'lines', mode: 'deadline', startDate: '2026-10-20', targetDate: '2026-10-30', pinned: false, archived: true, archiveReason: 'manual', cutInShown: false, terminal: false, createdAt: new Date(), archivedAt: new Date() }] }),
  });

  await loadTheme('p4g-yellow', 'yellow');
  await check({
    theme: 'p4g-yellow',
    name: 'wish progress cut-in consumer',
    marker: 'R03黄愿望',
    expectedVisible: true,
    setup: () => ({ wishProgressCut: { wishId: 'wish-r03', wishTitle: 'R03黄愿望', pct: 28, delta: 8, times: 3, reason: 'R03 synthetic', source: 'local' } }),
  });
  await check({
    theme: 'p4g-yellow',
    name: 'calling-card archived consumer count',
    marker: 'R03黄宣告卡',
    expectedVisible: true,
    setup: () => ({ callingCards: [{ id: 'cc-r03', title: 'R03黄宣告卡', icon: '★', texture: 'lines', mode: 'deadline', startDate: '2026-10-20', targetDate: '2026-10-30', pinned: false, archived: true, archiveReason: 'manual', cutInShown: false, terminal: false, createdAt: new Date(), archivedAt: new Date() }] }),
  });

  await loadTheme('p5r-red', 'red');
  await check({
    theme: 'p5r-red',
    name: 'level-up global consumer',
    marker: 'R03红升级',
    expectedVisible: false,
    setup: () => ({ levelUpNotification: { id: 'knowledge', displayName: 'R03红升级', level: 7 } }),
  });
  await check({
    theme: 'p5r-red',
    name: 'wish progress cut-in consumer',
    marker: 'R03红愿望',
    expectedVisible: false,
    setup: () => ({ wishProgressCut: { wishId: 'wish-r03', wishTitle: 'R03红愿望', pct: 28, delta: 8, times: 3, reason: 'R03 synthetic', source: 'local' } }),
  });
  await check({
    theme: 'p5r-red',
    name: 'BIG DEAL clear global consumer',
    marker: 'R03红大事',
    expectedVisible: false,
    setup: () => ({ bigDealClear: { todoId: 'todo-r03', title: 'R03红大事', stepsCount: 2, sp: 6, attrs: ['knowledge'] } }),
  });
} catch (error) {
  report.error = error.stack;
  process.exitCode = 1;
} finally {
  await context.close();
  writeFileSync(resolve(out, 'r03.json'), JSON.stringify(report, null, 2));
}

if (report.checks.some((check) => !check.pass) || report.pageerrors.length || report.localFailures.length) {
  process.exitCode = 1;
}
console.log(`Evidence: ${resolve(out, 'r03.json')}`);
