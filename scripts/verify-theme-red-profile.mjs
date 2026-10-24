// Focused regression for the red menu profile: real avatar upload/crop/remove,
// persistence, menu avatar sync, non-overlapping avatar menu, and menu theme switch.
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
  scope: 'Red menu profile: real avatar upload/crop/removal, persistence, menu avatar sync, menu overlap, and menu theme switching.',
  base,
  ok: false,
  checks: [],
  pageErrors: [],
  consoleErrors: [],
  screenshots: {},
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
});
const page = await context.newPage();
page.on('pageerror', (error) => report.pageErrors.push(String(error)));
page.on('console', (message) => {
  if (message.type() === 'error') report.consoleErrors.push(message.text());
});

async function waitApp(theme) {
  await page.waitForFunction(
    (expected) => document.documentElement.getAttribute('data-theme') === expected
      && (document.querySelector('#root')?.childElementCount ?? 0) > 0,
    theme,
    { timeout: 30000 },
  );
  await page.waitForTimeout(600);
}

async function goMenu() {
  await page.evaluate(() => { location.hash = '#/p/menu'; });
  await page.getByRole('button', { name: /用户资料：/ }).waitFor({ state: 'visible', timeout: 15000 });
}

async function menuOverlap() {
  return page.evaluate(() => {
    const menu = document.querySelector('.ob-avmenu')?.getBoundingClientRect();
    const fold = document.querySelector('.ob-fold-h')?.getBoundingClientRect();
    return menu && fold
      ? { menuBottom: menu.bottom, foldTop: fold.top, overlap: menu.bottom > fold.top }
      : null;
  });
}

async function storeAvatar() {
  return page.evaluate(async () => {
    const { useAppStore } = await import('/src/store/index.ts');
    return useAppStore.getState().user?.avatarDataUrl ?? null;
  });
}

async function screenshot(name) {
  const path = resolve(out, name);
  await page.screenshot({ path });
  report.screenshots[name] = path;
}

try {
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => (document.querySelector('#root')?.childElementCount ?? 0) > 0, null, { timeout: 30000 });
  await page.evaluate(async () => {
    const { useAppStore } = await import('/src/store/index.ts');
    const state = useAppStore.getState();
    if (!state.user) await state.createUser('头像复现');
    await useAppStore.getState().setTheme('red');
  });
  await page.waitForTimeout(2600);
  await waitApp('red');
  await goMenu();

  await page.getByRole('button', { name: /用户资料：/ }).click();
  await page.getByRole('button', { name: '头像菜单' }).click();
  await page.getByRole('menu').waitFor({ state: 'visible' });
  report.overlapBefore = await menuOverlap();
  assert.equal(report.overlapBefore?.overlap, false, 'avatar menu overlaps profile content before upload');
  await screenshot('01-avatar-menu-no-overlap.png');

  await page.locator('input[type=file]').last().setInputFiles(resolve('icon.png'));
  const dialog = page.getByRole('dialog').filter({ hasText: '调整我的头像' });
  await dialog.waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForFunction(() => {
    const button = [...document.querySelectorAll('button')].find((item) => item.textContent?.includes('完成裁切'));
    return button && !button.disabled;
  }, null, { timeout: 15000 });
  await page.getByRole('button', { name: '完成裁切' }).click();
  await dialog.waitFor({ state: 'hidden', timeout: 20000 });
  await page.waitForSelector('.ob-av-img img', { state: 'visible', timeout: 15000 });
  report.uploadedAvatar = (await storeAvatar())?.slice(0, 32) ?? null;
  assert.ok(report.uploadedAvatar?.startsWith('data:image/'), 'avatar was not written to the real store');
  await screenshot('02-avatar-updated.png');

  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitApp('red');
  await goMenu();
  await page.waitForSelector('.mn2-av-face img', { state: 'visible', timeout: 15000 });
  report.menuAvatar = (await page.locator('.mn2-av-face img').getAttribute('src'))?.slice(0, 32) ?? null;
  assert.ok(report.menuAvatar?.startsWith('data:image/'), 'menu avatar did not update');

  await page.getByRole('button', { name: /用户资料：/ }).click();
  await page.getByRole('button', { name: '头像菜单' }).click();
  report.overlapAfter = await menuOverlap();
  assert.equal(report.overlapAfter?.overlap, false, 'avatar menu overlaps profile content after refresh');
  await screenshot('03-persisted-after-refresh.png');

  await page.getByRole('menuitem', { name: '移除头像' }).click();
  await page.waitForSelector('.ob-av-img img', { state: 'detached', timeout: 15000 });
  report.removedAvatar = await storeAvatar();
  assert.equal(report.removedAvatar, null, 'avatar removal did not clear the real store');
  await page.getByRole('button', { name: '关闭' }).click();
  await page.waitForTimeout(500);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitApp('red');
  await goMenu();
  assert.equal(await page.locator('.mn2-av-face img').count(), 0, 'menu avatar still exists after removal');

  await page.getByRole('button', { name: '主题：当前 红' }).click();
  await page.getByRole('button', { name: '切换主题：蓝' }).click();
  await page.waitForFunction(
    () => document.documentElement.getAttribute('data-theme') === 'blue'
      && document.documentElement.getAttribute('data-kit') === 'p3r-blue',
    null,
    { timeout: 30000 },
  );
  report.themeAfter = await page.evaluate(() => ({
    theme: document.documentElement.getAttribute('data-theme'),
    kit: document.documentElement.getAttribute('data-kit'),
  }));
  await screenshot('04-menu-theme-blue.png');

  assert.equal(report.pageErrors.length, 0, `page errors: ${report.pageErrors.join(' | ')}`);
  report.checks.push('avatar menu stays in normal flow and does not cover profile content');
  report.checks.push('real image crop updates user.avatarDataUrl and menu avatar after refresh');
  report.checks.push('remove avatar clears the real store and stays cleared after refresh');
  report.checks.push('red menu theme switch reaches blue / p3r-blue');
  report.ok = true;
} catch (error) {
  report.error = String(error?.stack ?? error);
  report.failureState = await page.evaluate(() => ({
    href: location.href,
    hash: location.hash,
    theme: document.documentElement.getAttribute('data-theme'),
    kit: document.documentElement.getAttribute('data-kit'),
    rootChildren: document.querySelector('#root')?.childElementCount ?? 0,
    bodyText: document.body.innerText.replace(/\s+/g, ' ').trim().slice(0, 1200),
  })).catch(() => null);
  await screenshot('99-failure.png').catch(() => {});
} finally {
  await context.close().catch(() => {});
  await browser.close().catch(() => {});
  writeFileSync(resolve(out, 'report.json'), JSON.stringify(report, null, 2));
}

console.log(JSON.stringify({
  ok: report.ok,
  checks: report.checks.length,
  overlapBefore: report.overlapBefore,
  overlapAfter: report.overlapAfter,
  uploadedAvatar: report.uploadedAvatar,
  menuAvatar: report.menuAvatar,
  removedAvatar: report.removedAvatar,
  themeAfter: report.themeAfter,
  pageErrors: report.pageErrors.length,
  error: report.error,
  report: resolve(out, 'report.json'),
}, null, 2));
if (!report.ok) process.exitCode = 1;
