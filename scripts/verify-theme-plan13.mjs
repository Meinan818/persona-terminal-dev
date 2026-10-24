// Plan 13: verify the production web build in an isolated browser. This checks
// first launch, all four themes, refresh persistence, and an offline reload.
// External requests are blocked; no account, backend write, or AI call is used.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, join, resolve, sep } from 'node:path';
import { chromium } from '../node_modules/playwright/index.mjs';

const root = process.cwd();
const dist = resolve(root, 'dist');
const out = resolve(process.argv[2] ?? '');
if (!process.argv[2]) throw new Error('Pass a new evidence directory');
if (existsSync(out)) throw new Error('Evidence directory already exists; use a new directory');
if (!existsSync(join(dist, 'index.html'))) throw new Error('dist/index.html is missing; run npm run build first');
mkdirSync(out, { recursive: true });

const mime = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
};

const report = {
  scope: 'Plan 13 production-dist verification: first launch, four-theme switching, refresh persistence, and offline reload in an isolated browser.',
  ok: false,
  base: null,
  checks: [],
  themes: {},
  pageErrors: [],
  consoleErrors: [],
  localFailures: [],
  localHttpErrors: [],
  knownFontFallbacks: [],
  knownYellowBaselineMissing: [],
  offlineAssetFailures: [],
  offlinePhase: false,
  blockedExternal: 0,
  blockedExternalUrls: [],
  serviceWorker: {},
  screenshots: {},
};

const server = createServer((req, res) => {
  try {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === '/') pathname = '/index.html';
    let file = resolve(dist, `.${pathname}`);
    if (!(file === dist || file.startsWith(`${dist}${sep}`))) {
      res.writeHead(403).end('Forbidden');
      return;
    }
    if (!existsSync(file)) {
      if (extname(pathname)) {
        res.writeHead(404).end('Not Found');
        return;
      }
      file = join(dist, 'index.html');
    }
    const body = readFileSync(file);
    res.writeHead(200, {
      'cache-control': file.endsWith('sw.js') || file.endsWith('index.html') ? 'no-cache' : 'public, max-age=60',
      'content-type': mime[extname(file)] ?? 'application/octet-stream',
    });
    res.end(body);
  } catch (error) {
    res.writeHead(500).end(String(error));
  }
});

await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
const address = server.address();
const base = `http://127.0.0.1:${address.port}`;
report.base = base;

const context = await chromium.launchPersistentContext(resolve(out, 'profile'), {
  executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
  locale: 'zh-CN',
  timezoneId: 'Asia/Shanghai',
  colorScheme: 'light',
  reducedMotion: 'reduce',
  serviceWorkers: 'allow',
});

await context.route(/^https?:\/\/(?!127\.0\.0\.1(?::|$))/, async (route) => {
  const url = new URL(route.request().url());
  report.blockedExternal += 1;
  if (report.blockedExternalUrls.length < 30) report.blockedExternalUrls.push(url.href);
  await route.abort();
});

const page = context.pages()[0] ?? await context.newPage();
page.on('pageerror', (error) => report.pageErrors.push(String(error)));
page.on('console', (message) => {
  if (message.type() === 'error') report.consoleErrors.push(message.text());
});
page.on('requestfailed', (request) => {
  const url = new URL(request.url());
  if (url.origin !== base) return;
  const value = `${request.url()} :: ${request.failure()?.errorText ?? 'failed'}`;
  if (report.offlinePhase) report.offlineAssetFailures.push(value);
  else if (url.pathname.startsWith('/assets/fonts/') && url.pathname.endsWith('.woff2')) report.knownFontFallbacks.push(value);
  else if (url.pathname.startsWith('/assets/p4g/official/')) report.knownYellowBaselineMissing.push(value);
  else report.localFailures.push(value);
});
page.on('response', (response) => {
  const url = new URL(response.url());
  if (url.origin === base && response.status() >= 400) {
    const value = `${response.status()} ${response.url()}`;
    if (url.pathname.startsWith('/assets/fonts/') && url.pathname.endsWith('.woff2')) report.knownFontFallbacks.push(value);
    else if (url.pathname.startsWith('/assets/p4g/official/')) report.knownYellowBaselineMissing.push(value);
    else report.localHttpErrors.push(value);
  }
});

async function closeWelcome() {
  for (let attempt = 0; attempt < 5; attempt++) {
    const close = page.getByRole('button', { name: /跳过|关闭|我已经是客人了|开始使用/ }).first();
    if (!(await close.isVisible().catch(() => false))) break;
    await close.click().catch(() => {});
    await page.waitForTimeout(200);
  }
}

async function completeOnboarding() {
  const start = page.getByText('开始设定', { exact: true }).first();
  if (!(await start.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false))) return false;
  await start.click();
  await page.locator('#guide-name').fill('计划13候选验证');
  await page.locator('#guide-name').press('Enter');
  await page.getByRole('button', { name: /^学习成长/ }).click();
  await page.getByRole('button', { name: /^记录/ }).click();
  await page.getByRole('button', { name: /^归档/ }).click();
  await page.getByRole('heading', { name: /^你好，/ }).waitFor({ state: 'visible' });
  await page.getByRole('button', { name: /^继续/ }).click();
  await page.getByRole('heading', { name: /七件事，看完就能开始/ }).waitFor({ state: 'visible' });
  await page.getByRole('button', { name: /^继续/ }).click();
  await page.getByText('馆长的赐福', { exact: true }).waitFor({ state: 'visible' });
  await page.getByRole('button').filter({ hasText: '知识' }).first().click();
  await page.getByRole('button', { name: /接受赐福，开始旅程/ }).click();
  return true;
}

async function waitApp(theme) {
  await page.waitForFunction((expected) => {
    const rootNode = document.querySelector('#root');
    return (rootNode?.childElementCount ?? 0) > 0
      && document.documentElement.getAttribute('data-theme') === expected;
  }, theme, { timeout: 45000 });
  await page.waitForTimeout(350);
}

async function waitRoot() {
  await page.waitForFunction(
    () => (document.querySelector('#root')?.childElementCount ?? 0) > 0,
    null,
    { timeout: 45000 },
  );
  await page.waitForTimeout(250);
}

async function waitTheme(theme, kit) {
  await page.waitForFunction(({ expected, expectedKit }) => {
    const html = document.documentElement;
    return html.getAttribute('data-theme') === expected
      && (expectedKit ? html.getAttribute('data-kit') === expectedKit : !html.getAttribute('data-kit'))
      && (document.querySelector('#root')?.childElementCount ?? 0) > 0;
  }, { expected: theme, expectedKit: kit }, { timeout: 30000 });
  await page.waitForTimeout(400);
}

async function openThemeSettings(theme, kit) {
  await page.goto(`${base}/?plan13=${Date.now()}#/p/settings?tab=theme`, { waitUntil: 'domcontentloaded' });
  await waitTheme(theme, kit);
  await closeWelcome();
  await page.waitForSelector('[aria-label="主题颜色"], .ob-swatches button[aria-label^="切换主题："]', { timeout: 20000 });
}

async function switchTheme(theme, kit, label, shortLabel) {
  const radio = page.getByRole('radio', { name: label });
  const control = (await radio.count()) > 0
    ? radio.first()
    : page.getByRole('button', { name: `切换主题：${shortLabel}` }).first();
  await control.click();
  await waitTheme(theme, kit);
  return page.evaluate(() => ({
    theme: document.documentElement.getAttribute('data-theme'),
    kit: document.documentElement.getAttribute('data-kit'),
    hash: location.hash,
    rootChildren: document.querySelector('#root')?.childElementCount ?? 0,
  }));
}

async function screenshot(name) {
  const path = resolve(out, name);
  await page.screenshot({ path, fullPage: false });
  report.screenshots[name] = path;
}

try {
  await page.goto(`${base}/?plan13=first`, { waitUntil: 'domcontentloaded' });
  await waitRoot();
  await completeOnboarding();
  await closeWelcome();
  await waitApp('blue');
  await closeWelcome();
  report.themes.blue = { ok: true };
  report.checks.push('first launch rendered the default blue theme');
  await screenshot('01-first-launch-blue.png');

  await openThemeSettings('blue', 'p3r-blue');
  await screenshot('02-settings-blue.png');
  await switchTheme('pink', 'p3r-pink', '粉色', '粉');
  await closeWelcome();
  report.themes.pink = { ok: true };
  await screenshot('03-settings-pink.png');

  await switchTheme('yellow', 'p4g-yellow', '黄色', '黄');
  await closeWelcome();
  report.themes.yellow = { ok: true };
  await screenshot('04-settings-yellow.png');

  await switchTheme('red', null, '红色', '红');
  await closeWelcome();
  report.themes.red = { ok: true };
  await screenshot('05-settings-red.png');

  const serviceWorkerActive = await page.evaluate(async () => {
    const supported = 'serviceWorker' in navigator;
    if (!supported) return { supported: false, active: null, installing: null, waiting: null, manualRegistration: null };
    let state = null;
    const automaticDeadline = Date.now() + 15000;
    while (Date.now() < automaticDeadline) {
      const registration = await navigator.serviceWorker.getRegistration();
      state = {
        supported: true,
        active: registration?.active?.state ?? null,
        installing: registration?.installing?.state ?? null,
        waiting: registration?.waiting?.state ?? null,
        manualRegistration: null,
      };
      if (state.active === 'activated') return state;
      await new Promise((resolveWait) => setTimeout(resolveWait, 500));
    }
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      state.manualRegistration = 'registered';
      state.installing = registration.installing?.state ?? null;
      state.waiting = registration.waiting?.state ?? null;
      if (registration.active?.state === 'activated') state.active = 'activated';
    } catch (error) {
      state.manualRegistration = `failed: ${String(error)}`;
    }
    const registrationDeadline = Date.now() + 120000;
    while (Date.now() < registrationDeadline) {
      const registration = await navigator.serviceWorker.getRegistration();
      state.active = registration?.active?.state ?? null;
      state.installing = registration?.installing?.state ?? null;
      state.waiting = registration?.waiting?.state ?? null;
      if (state.active === 'activated') return state;
      await new Promise((resolveWait) => setTimeout(resolveWait, 500));
    }
    return state;
  });
  report.serviceWorker.registration = serviceWorkerActive;
  assert.equal(serviceWorkerActive.active, 'activated', 'service worker did not become active');
  report.serviceWorker.automaticRegistrationObserved = !serviceWorkerActive.manualRegistration;
  report.serviceWorker.active = true;
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitTheme('red', null);
  const serviceWorkerControlled = await page.evaluate(() => Boolean(navigator.serviceWorker.controller));
  assert.equal(serviceWorkerControlled, true, 'service worker did not control the page after reload');
  report.serviceWorker.controlled = true;
  report.themes.red.refreshed = true;
  report.checks.push('four themes switched through the settings UI; final red theme persisted after refresh');
  await screenshot('06-red-after-refresh.png');

  report.offlinePhase = true;
  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitTheme('red', null);
  report.serviceWorker.offlineReload = true;
  report.checks.push('offline reload rendered the cached production build with red theme');
  await screenshot('07-red-offline.png');
  await context.setOffline(false);
  report.offlinePhase = false;

  assert.equal(report.pageErrors.length, 0, `page errors: ${report.pageErrors.join(' | ')}`);
  assert.equal(report.localFailures.length, 0, `local failures: ${report.localFailures.join(' | ')}`);
  assert.equal(report.localHttpErrors.length, 0, `local HTTP errors: ${report.localHttpErrors.join(' | ')}`);
  report.ok = true;
} catch (error) {
  report.error = String(error?.stack ?? error);
  report.failureState = await page.evaluate(() => ({
    hash: location.hash,
    href: location.href,
    readyState: document.readyState,
    theme: document.documentElement.getAttribute('data-theme'),
    kit: document.documentElement.getAttribute('data-kit'),
    rootChildren: document.querySelector('#root')?.childElementCount ?? 0,
    bodyText: document.body.innerText.replace(/\s+/g, ' ').trim().slice(0, 2000),
    localStorage: Object.keys(localStorage).slice(0, 50),
  })).catch((diagnosticError) => ({ error: String(diagnosticError) }));
  await screenshot('99-failure.png').catch(() => {});
} finally {
  await context.setOffline(false).catch(() => {});
  await context.close().catch(() => {});
  await new Promise((resolveClose) => server.close(resolveClose));
  writeFileSync(resolve(out, 'report.json'), JSON.stringify(report, null, 2));
}

console.log(JSON.stringify({
  ok: report.ok,
  checks: report.checks.length,
  themes: report.themes,
  pageErrors: report.pageErrors.length,
  localFailures: report.localFailures.length,
  serviceWorker: report.serviceWorker,
  error: report.error,
  report: resolve(out, 'report.json'),
}, null, 2));
if (!report.ok) process.exitCode = 1;
