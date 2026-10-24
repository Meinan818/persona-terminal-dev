// Capture navigation frames in an isolated browser and quantify full-screen
// luminance spikes. This is a regression aid for user-visible white flashes.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { chromium } from '../node_modules/playwright/index.mjs';

const base = process.env.THEME_AUDIT_BASE ?? 'http://127.0.0.1:5212';
const out = resolve(process.argv[2] ?? '');
if (!process.argv[2]) throw new Error('Pass a new evidence directory');
if (existsSync(out)) throw new Error('Evidence directory already exists; use a new directory');
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
});
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  reducedMotion: 'no-preference',
  locale: 'zh-CN',
  timezoneId: 'Asia/Shanghai',
});
const report = { base, themes: {}, pageErrors: [] };
page.on('pageerror', (error) => report.pageErrors.push(String(error)));

const themeInfo = {
  blue: 'p3r-blue',
  pink: 'p3r-pink',
  yellow: 'p4g-yellow',
  red: null,
};

async function setTheme(theme) {
  await page.evaluate(async (next) => {
    const { useAppStore } = await import('/src/store/index.ts');
    const state = useAppStore.getState();
    if (!state.user) await state.createUser('闪屏检查');
    await useAppStore.getState().setTheme(next);
  }, theme).catch((error) => {
    if (!/Execution context was destroyed|navigation/i.test(String(error))) throw error;
  });
  await page.waitForFunction(({ theme, kit }) => {
    const root = document.documentElement;
    return root.getAttribute('data-theme') === theme
      && (kit ? root.getAttribute('data-kit') === kit : !root.getAttribute('data-kit'))
      && (document.querySelector('#root')?.childElementCount ?? 0) > 0;
  }, { theme, kit: themeInfo[theme] }, { timeout: 30000 });
  await page.waitForTimeout(800);
}

try {
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => (document.querySelector('#root')?.childElementCount ?? 0) > 0, null, { timeout: 30000 });

  for (const theme of Object.keys(themeInfo)) {
    await setTheme(theme);
    await page.evaluate(() => { location.hash = '#/p/dashboard'; });
    await page.waitForTimeout(500);
    const nav = page.locator('nav[aria-label="底部导航"], nav[aria-label="主导航"]').first();
    const action = nav.locator('button, a').filter({ hasText: '行动' }).first();
    await action.waitFor({ state: 'visible', timeout: 15000 });
    await action.click();

    const frames = [];
    for (let index = 0; index < 14; index++) {
      const path = resolve(out, `${theme}-${String(index).padStart(2, '0')}.jpg`);
      await page.screenshot({ path, type: 'jpeg', quality: 55 });
      frames.push(path);
      await page.waitForTimeout(35);
    }
    const analysis = spawnSync('python', [resolve('scripts/analyze-flash-frames.py'), out, theme], { encoding: 'utf8' });
    if (analysis.status !== 0) throw new Error(analysis.stderr || analysis.stdout);
    report.themes[theme] = JSON.parse(analysis.stdout.trim());
  }
} catch (error) {
  report.error = String(error?.stack ?? error);
} finally {
  await browser.close().catch(() => {});
  writeFileSync(resolve(out, 'report.json'), JSON.stringify(report, null, 2));
}

console.log(JSON.stringify({
  ok: !report.error && report.pageErrors.length === 0,
  themes: report.themes,
  pageErrors: report.pageErrors,
  error: report.error,
  report: resolve(out, 'report.json'),
}, null, 2));
if (report.error || report.pageErrors.length) process.exitCode = 1;
