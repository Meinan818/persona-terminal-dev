// Regression for the menu theme sheet in all four channels. The sheet must call
// the real store action and reach the selected theme after the forced reload.
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
  scope: 'Menu theme sheet in pink, red, yellow, and blue must switch the real app theme.',
  base,
  ok: false,
  checks: [],
  transitions: [],
  pageErrors: [],
  screenshots: {},
};

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
});
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  reducedMotion: 'reduce',
  locale: 'zh-CN',
  timezoneId: 'Asia/Shanghai',
});
page.on('pageerror', (error) => report.pageErrors.push(String(error)));

async function waitTheme(theme, kit) {
  const ready = ({ expected, expectedKit }) => {
    const html = document.documentElement;
    return html.getAttribute('data-theme') === expected
      && (expectedKit ? html.getAttribute('data-kit') === expectedKit : !html.getAttribute('data-kit'))
      && (document.querySelector('#root')?.childElementCount ?? 0) > 0;
  };
  await page.waitForFunction(ready, { expected: theme, expectedKit: kit }, { timeout: 30000 });
  await page.waitForTimeout(1200);
  await page.waitForFunction(ready, { expected: theme, expectedKit: kit }, { timeout: 30000 });
  await page.waitForTimeout(300);
}

async function goMenu() {
  await page.evaluate(() => { location.hash = '#/p/menu'; });
  await page.getByRole('button', { name: /^主题：当前|^主题/ }).first().waitFor({ state: 'visible', timeout: 15000 });
}

async function screenshot(name) {
  const path = resolve(out, name);
  await page.screenshot({ path });
  report.screenshots[name] = path;
}

async function switchThroughMenu(fromTheme, targetTheme, targetLabel, targetKit) {
  await waitTheme(fromTheme, fromTheme === 'red' ? null : { blue: 'p3r-blue', pink: 'p3r-pink', yellow: 'p4g-yellow' }[fromTheme]);
  await goMenu();
  await page.getByRole('button', { name: /^主题：当前|^主题/ }).first().click();
  const swatch = page.getByRole('button', { name: `切换主题：${targetLabel}` });
  await swatch.waitFor({ state: 'visible', timeout: 10000 });
  await swatch.click().catch((error) => {
    if (!/Execution context was destroyed|navigation/i.test(String(error))) throw error;
  });
  await waitTheme(targetTheme, targetKit);
  const state = await page.evaluate(() => ({
    theme: document.documentElement.getAttribute('data-theme'),
    kit: document.documentElement.getAttribute('data-kit'),
    hash: location.hash,
  }));
  report.transitions.push({ fromTheme, targetTheme, targetKit, state });
  await screenshot(`${report.transitions.length}-${targetTheme}.png`);
  assert.equal(state.theme, targetTheme, `${fromTheme} menu did not switch to ${targetTheme}`);
  if (targetKit) assert.equal(state.kit, targetKit, `${targetTheme} kit did not mount`);
}

try {
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => (document.querySelector('#root')?.childElementCount ?? 0) > 0, null, { timeout: 30000 });
  await page.evaluate(async () => {
    const { useAppStore } = await import('/src/store/index.ts');
    const state = useAppStore.getState();
    if (!state.user) await state.createUser('菜单主题复现');
    await useAppStore.getState().setTheme('pink');
  });
  await page.waitForTimeout(2600);

  await switchThroughMenu('pink', 'red', '红', null);
  await switchThroughMenu('red', 'yellow', '黄', 'p4g-yellow');
  await switchThroughMenu('yellow', 'blue', '蓝', 'p3r-blue');
  await switchThroughMenu('blue', 'pink', '粉', 'p3r-pink');

  report.checks.push('pink menu switched to red through the real store action');
  report.checks.push('red menu switched to yellow through the real store action');
  report.checks.push('yellow menu switched to blue through the real store action');
  report.checks.push('blue menu switched to pink through the real store action');
  assert.equal(report.pageErrors.length, 0, `page errors: ${report.pageErrors.join(' | ')}`);
  report.ok = true;
} catch (error) {
  report.error = String(error?.stack ?? error);
  report.failureState = await page.evaluate(() => ({
    href: location.href,
    hash: location.hash,
    theme: document.documentElement.getAttribute('data-theme'),
    kit: document.documentElement.getAttribute('data-kit'),
    bodyText: document.body.innerText.replace(/\s+/g, ' ').trim().slice(0, 1200),
  })).catch(() => null);
  await screenshot('99-failure.png').catch(() => {});
} finally {
  await browser.close().catch(() => {});
  writeFileSync(resolve(out, 'report.json'), JSON.stringify(report, null, 2));
}

console.log(JSON.stringify({
  ok: report.ok,
  checks: report.checks.length,
  transitions: report.transitions.map((item) => `${item.fromTheme}->${item.targetTheme}:${item.state.theme}`),
  pageErrors: report.pageErrors.length,
  error: report.error,
  report: resolve(out, 'report.json'),
}, null, 2));
if (!report.ok) process.exitCode = 1;
