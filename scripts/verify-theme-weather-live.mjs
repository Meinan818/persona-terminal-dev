// Isolated real-flow proof for weather settings in the three redraw themes.
// External weather traffic is fulfilled by local mocks; no charged service is used.
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from '../node_modules/playwright/index.mjs';

const base = process.env.THEME_AUDIT_BASE ?? 'http://127.0.0.1:5212';
const out = resolve(process.argv[2] ?? '');
if (!process.argv[2]) throw new Error('Pass a new evidence directory');
if (existsSync(out)) throw new Error('Evidence directory already exists; use a new directory');
mkdirSync(out, { recursive: true });

const report = {
  scope: 'Blue, pink, and yellow weather settings search a real city and fetch real weather, then persist the same settings used by the home badge.',
  base,
  ok: false,
  checks: [],
  requests: [],
  pageErrors: [],
  screenshots: {},
};

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
});
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  reducedMotion: 'no-preference',
  locale: 'zh-CN',
  timezoneId: 'Asia/Shanghai',
});

await context.route('https://geocoding-api.open-meteo.com/**', async (route) => {
  const request = route.request();
  report.requests.push({ method: request.method(), url: request.url() });
  return route.fulfill({
    status: 200,
    contentType: 'application/json',
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({
      results: [{ name: '邯郸', latitude: 36.6256, longitude: 114.5391, admin1: '河北省' }],
    }),
  });
});

await context.route('https://api.open-meteo.com/**', async (route) => {
  const request = route.request();
  report.requests.push({ method: request.method(), url: request.url() });
  return route.fulfill({
    status: 200,
    contentType: 'application/json',
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({
      current: {
        time: '2026-10-25T01:30',
        temperature_2m: 23.4,
        relative_humidity_2m: 48,
        apparent_temperature: 22.7,
        is_day: 0,
        weather_code: 0,
      },
    }),
  });
});

const page = await context.newPage();
page.on('pageerror', (error) => report.pageErrors.push(String(error)));

async function screenshot(name) {
  const path = resolve(out, `${name}.png`);
  await page.screenshot({ path, fullPage: true });
  report.screenshots[name] = path;
}

async function setTheme(theme) {
  await page.evaluate(async (theme) => {
    const { useAppStore } = await import('/src/store/index.ts');
    const state = useAppStore.getState();
    if (!state.user) await state.createUser('天气桥接检查');
    await useAppStore.getState().setTheme(theme);
    await useAppStore.getState().updateSettings({
      weatherProvider: 'openmeteo',
      weatherApiKey: '',
      weatherApiHost: '',
      weatherCity: undefined,
    });
  }, theme).catch((error) => {
    if (!/Execution context was destroyed|navigation/i.test(String(error))) throw error;
  });
}

async function waitTheme(theme, kit) {
  await page.waitForFunction(({ theme, kit }) => {
    const root = document.documentElement;
    return root.getAttribute('data-theme') === theme
      && root.getAttribute('data-kit') === kit
      && (document.querySelector('#root')?.childElementCount ?? 0) > 0;
  }, { theme, kit }, { timeout: 30000 });
  await page.waitForTimeout(500);
}

async function verifyTheme(theme, kit) {
  const requestsBefore = report.requests.length;
  await setTheme(theme);
  await waitTheme(theme, kit);
  await page.evaluate(() => { location.hash = '#/p/settings?tab=theme&block=weather'; });
  await page.getByText('WEATHER · 月相 ⇄ 天气').waitFor({ state: 'visible', timeout: 30000 });

  const openMeteo = page.getByRole('radio', { name: /Open-Meteo/ });
  if ((await openMeteo.getAttribute('aria-checked')) !== 'true') await openMeteo.click();

  const cityInput = page.getByLabel('搜索城市');
  await cityInput.fill('邯郸');
  await page.getByRole('button', { name: '搜索', exact: true }).click();
  const cityHit = page.getByRole('button', { name: /邯郸·河北省/ });
  await cityHit.waitFor({ state: 'visible', timeout: 15000 });
  await cityHit.click();
  await page.getByText(/邯郸·河北省/).first().waitFor({ state: 'visible', timeout: 5000 });

  await page.getByRole('button', { name: '测试取数', exact: true }).click();
  await page.getByText(/晴 23°C\s+体感 23°C/).waitFor({ state: 'visible', timeout: 15000 });

  const settings = await page.evaluate(async () => {
    const { useAppStore } = await import('/src/store/index.ts');
    const current = useAppStore.getState().settings;
    return {
      provider: current.weatherProvider,
      city: current.weatherCity,
    };
  });
  assert.equal(settings.provider, 'openmeteo');
  assert.equal(settings.city?.name, '邯郸·河北省');
  assert.equal(settings.city?.lat, 36.6256);
  assert.equal(settings.city?.lon, 114.5391);
  assert.ok(report.requests.slice(requestsBefore).some((request) => request.url.includes('/v1/search?')));
  assert.ok(report.requests.slice(requestsBefore).some((request) => request.url.includes('/v1/forecast?')));

  await page.evaluate(async () => {
    const { useAppStore } = await import('/src/store/index.ts');
    await useAppStore.getState().updateSettings({ homeSkyMode: 'weather' });
    location.hash = '#/p/dashboard';
  });
  await page.getByText(/23°C?\s*晴/).first().waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForTimeout(900);
  const dashboardText = await page.locator('body').textContent();
  assert.match(dashboardText ?? '', /MASKARIA/);
  assert.doesNotMatch(dashboardText ?? '', /17°\s*雨/);

  report.checks.push(`${theme}: live city search and weather fetch persisted to real settings`);
  report.checks.push(`${theme}: dashboard consumes the same live weather result as settings`);
  await screenshot(`${theme}-weather-live`);
}

try {
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => (document.querySelector('#root')?.childElementCount ?? 0) > 0, null, { timeout: 30000 });
  await verifyTheme('blue', 'p3r-blue');
  await verifyTheme('pink', 'p3r-pink');
  await verifyTheme('yellow', 'p4g-yellow');
  assert.equal(report.pageErrors.length, 0, `page errors: ${report.pageErrors.join(' | ')}`);
  report.ok = true;
} catch (error) {
  report.error = String(error?.stack ?? error);
  await page.screenshot({ path: resolve(out, '99-failure.png'), fullPage: true }).catch(() => {});
  process.exitCode = 1;
} finally {
  writeFileSync(resolve(out, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  await browser.close();
}
