// Exhaustive route smoke for the four integrated themes.
// Renders every registry page/overlay plus every Inventory state route in an isolated profile.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from '../node_modules/playwright/index.mjs';

const base = process.env.THEME_AUDIT_BASE ?? 'http://127.0.0.1:5212';
const themeFilter = process.env.THEME_AUDIT_THEMES?.split(',').map((value) => value.trim()).filter(Boolean);
const routeFilter = process.env.THEME_AUDIT_ROUTES ? new RegExp(process.env.THEME_AUDIT_ROUTES) : null;
const out = resolve(process.argv[2] ?? '');
if (!process.argv[2]) throw new Error('Pass a new evidence directory');
if (existsSync(out)) throw new Error('Evidence directory already exists; use a new directory');
mkdirSync(out, { recursive: true });

const themes = [
  { id: 'blue', key: 'p3r-blue', prefix: '/src/themes/p3r-blue' },
  { id: 'pink', key: 'p3r-pink', prefix: '/src/themes/p3r-pink' },
  { id: 'yellow', key: 'p4g-yellow', prefix: '/src/themes/p4g-yellow' },
  { id: 'red', key: null, prefix: '/src/p5r-red' },
];

const withAuditFlags = (route) => {
  const path = route.replace(/^#/, '').replace(/^\/*/, '/');
  const [pathname, rawQuery = ''] = path.split('?');
  const query = new URLSearchParams(rawQuery);
  query.set('__motion', 'low');
  query.set('__snd', '0');
  return `#${pathname}?${query.toString()}`;
};

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
});
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  reducedMotion: 'reduce',
  locale: 'zh-CN',
  timezoneId: 'Asia/Shanghai',
  serviceWorkers: 'block',
});
await context.route('**/*', async (route) => {
  const url = new URL(route.request().url());
  if (url.origin !== base) return route.abort();
  return route.continue();
});
const page = await context.newPage();
let activeRoute = '';
const report = {
  scope: 'Every theme registry page/overlay and every Inventory state route is rendered. This checks load, blank/error boundaries, local resource failures, and visible control inventory; it does not prove business semantics or physical-device feel.',
  base,
  ok: false,
  themes: [],
  pageErrors: [],
  localFailures: [],
};
page.on('pageerror', (error) => report.pageErrors.push({ route: activeRoute, message: String(error) }));
page.on('response', (response) => {
  if (response.status() >= 400 && response.url().startsWith(base) && !new URL(response.url()).pathname.startsWith('/api/')) {
    report.localFailures.push({ route: activeRoute, status: response.status(), url: response.url() });
  }
});

async function setTheme(theme) {
  await page.evaluate(async ({ theme }) => {
    const { useAppStore } = await import('/src/store/index.ts');
    const store = useAppStore.getState();
    if (!store.user) await store.createUser('全量路由核对');
    await useAppStore.getState().setTheme(theme);
  }, { theme: theme.id }).catch((error) => {
    if (!/Execution context was destroyed|navigation/i.test(String(error))) throw error;
  });
  await page.waitForFunction(({ theme, kit }) => {
    const root = document.documentElement;
    return root.getAttribute('data-theme') === theme
      && (kit ? root.getAttribute('data-kit') === kit : !root.getAttribute('data-kit'))
      && (document.querySelector('#root')?.childElementCount ?? 0) > 0;
  }, { theme: theme.id, kit: theme.key }, { timeout: 30000 });
  await page.waitForTimeout(500);
}

async function routeRows(theme) {
  return page.evaluate(async ({ prefix }) => {
    const [{ PAGES }, { OVERLAYS }, inventoryModule] = await Promise.all([
      import(`${prefix}/registry/pages.ts`),
      import(`${prefix}/registry/overlays.ts`),
      import(`${prefix}/inventory.ts`),
    ]);
    const rows = [];
    for (const [key, entry] of Object.entries(PAGES)) {
      rows.push({ source: 'registry-page', key, title: entry.title, route: `#/p/${key}` });
    }
    for (const [key, entry] of Object.entries(OVERLAYS)) {
      rows.push({ source: 'registry-overlay', key, title: entry.title, route: `#/overlay/${key}` });
    }
    for (const item of inventoryModule.INVENTORY) {
      if (typeof item.route === 'string' && item.route.startsWith('#/')) {
        rows.push({ source: 'inventory', key: item.id, title: item.title, route: item.route, kind: item.kind });
      }
    }
    return rows;
  }, { prefix: theme.prefix });
}

async function inspectRoute(row) {
  activeRoute = row.route;
  const errorStart = report.pageErrors.length;
  const localFailStart = report.localFailures.length;
  await page.evaluate((hash) => { location.hash = hash; }, withAuditFlags(row.route));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(({ boot }) => {
    const root = document.querySelector('#root');
    const text = (document.body.innerText ?? '').replace(/\s+/g, ' ').trim();
    if (!root || root.childElementCount === 0) return false;
    if (boot) return text.length > 0 || !!document.querySelector('main');
    return text.length > 10 && !/^(LOADING|加载中…?)$/.test(text);
  }, { boot: /#\/p\/boot(?:\?|$)/.test(row.route) }, { timeout: 12000 }).catch(() => {});
  await page.waitForTimeout(180);
  const state = await page.evaluate(() => {
    const root = document.querySelector('#root');
    const bodyText = (document.body.innerText ?? '').replace(/\s+/g, ' ').trim();
    const controls = Array.from(document.querySelectorAll('button,a[href],input,select,textarea,[role="button"],[role="switch"],[role="tab"]'))
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
      });
    const dialogs = document.querySelectorAll('[role="dialog"],[aria-modal="true"]').length;
    const fixedLayers = Array.from(document.body.querySelectorAll('*')).filter((element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.position === 'fixed' && style.display !== 'none' && style.visibility !== 'hidden' && rect.width * rect.height >= innerWidth * innerHeight * 0.5;
    }).length;
    return {
      hash: location.hash,
      rootChildren: root?.childElementCount ?? 0,
      bodyTextLength: bodyText.length,
      bodyTextStart: bodyText.slice(0, 280),
      dialogs,
      fixedLayers,
      controls: controls.length,
      disabledControls: controls.filter((element) => element.matches(':disabled,[aria-disabled="true"]')).length,
      controlLabels: controls.slice(0, 24).map((element) => (
        element.getAttribute('aria-label')
        || element.textContent
        || element.getAttribute('placeholder')
        || element.tagName
      ).replace(/\s+/g, ' ').trim().slice(0, 80)),
      errorBoundary: /出错了|应用发生错误|Something went wrong/.test(bodyText),
      loadingOnly: /加载中|正在加载/.test(bodyText) && controls.length === 0,
    };
  });
  const pageErrors = report.pageErrors.slice(errorStart);
  const localFailures = report.localFailures.slice(localFailStart);
  let status = 'ok';
  const reasons = [];
  if (state.rootChildren === 0) { status = 'fail'; reasons.push('root-empty'); }
  if (state.bodyTextLength < 10) { status = 'fail'; reasons.push('blank'); }
  if (state.errorBoundary) { status = 'fail'; reasons.push('error-boundary'); }
  if (pageErrors.length) { status = 'fail'; reasons.push('pageerror'); }
  if (localFailures.length) { status = 'fail'; reasons.push('local-resource-failure'); }
  if (state.loadingOnly) { status = status === 'ok' ? 'warn' : status; reasons.push('loading-only'); }
  if (row.source === 'registry-overlay' && state.dialogs === 0 && state.fixedLayers === 0) {
    status = status === 'ok' ? 'warn' : status;
    reasons.push('overlay-not-visible');
  }
  const expectedState = /#\/p\/boot(?:\?|$)/.test(row.route)
    || row.route.startsWith('#/overlay/boot-splash')
    || (activeRoute.startsWith('#/p/battle') && row.route === '#/p/battle');
  if (expectedState) status = 'expected';
  return {
    ...row,
    status,
    reasons,
    expectedState,
    expectedRoute: withAuditFlags(row.route),
    ...state,
    pageErrors,
    localFailures,
  };
}

try {
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => (document.querySelector('#root')?.childElementCount ?? 0) > 0, null, { timeout: 30000 });
  for (const theme of themes.filter((item) => !themeFilter?.length || themeFilter.includes(item.id))) {
    await setTheme(theme);
    const rows = await routeRows(theme);
    const unique = Array.from(new Map(rows.map((row) => [row.route, row])).values())
      .filter((row) => !routeFilter || routeFilter.test(row.route));
    const results = [];
    for (let index = 0; index < unique.length; index++) {
      const row = unique[index];
      const result = await inspectRoute(row);
      results.push(result);
      if (index % 25 === 0) console.log(`${theme.id}: ${index + 1}/${unique.length}`);
    }
    report.themes.push({
      theme: theme.id,
      routeCount: results.length,
      okCount: results.filter((row) => row.status === 'ok').length,
      expectedCount: results.filter((row) => row.status === 'expected').length,
      warnCount: results.filter((row) => row.status === 'warn').length,
      failCount: results.filter((row) => row.status === 'fail').length,
      routes: results,
    });
  }
  report.ok = report.themes.every((theme) => theme.failCount === 0) && report.pageErrors.length === 0 && report.localFailures.length === 0;
} catch (error) {
  report.error = String(error?.stack ?? error);
  process.exitCode = 1;
} finally {
  await browser.close();
  writeFileSync(resolve(out, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
}

const summary = {
  ok: report.ok,
  themes: report.themes.map((theme) => ({
    theme: theme.theme,
    routeCount: theme.routeCount,
    ok: theme.okCount,
    expected: theme.expectedCount,
    warn: theme.warnCount,
    fail: theme.failCount,
    failures: theme.routes.filter((route) => route.status === 'fail').map((route) => ({ route: route.route, reasons: route.reasons })),
    warnings: theme.routes.filter((route) => route.status === 'warn').map((route) => ({ route: route.route, reasons: route.reasons })),
  })),
  pageErrors: report.pageErrors.length,
  localFailures: report.localFailures.length,
  error: report.error,
};
console.log(JSON.stringify(summary, null, 2));
if (!report.ok || report.error) process.exitCode = 1;
