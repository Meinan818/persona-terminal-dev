// 红色主题两个缺陷的真实复现与复验：只截图、量几何、读 DOM，不写任何业务数据。
//   1. 星星加号 FAB：原来被 .act-panel 的 will-change: transform 变成面板内定位，会压住内容；
//   2. 委托角标：原来读 mock 写死的演示值，现在必须等于 db.quests 本周真实未领取张数。
import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
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
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
  hasTouch: true,
  locale: 'zh-CN',
  timezoneId: 'Asia/Shanghai',
});
const page = await ctx.newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e)));

const report = { base, ok: false, checks: [], failures: [], geometry: {}, screenshots: {} };

// 路由要写进首屏 URL：红色频道读 window.location.hash，事后再赋值会被应用自己的路由逻辑清掉
await page.goto(`${base}/?__mode=day&__motion=low&__snd=0&__dev=0#/p/actions?tab=todos`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => (document.querySelector('#root')?.childElementCount ?? 0) > 0, null, { timeout: 30000 });
// 建档与切主题分开等：首帧还在挂载时连写会和重渲染竞争，主题落不到 <html> 上
await page.waitForTimeout(2000);
await page.evaluate(async () => {
  const { useAppStore } = await import('/src/store/index.ts');
  if (!useAppStore.getState().user) await useAppStore.getState().createUser('红色排版复现');
  await useAppStore.getState().setTheme('red');
}).catch((e) => report.failures.push(`seed: ${String(e).slice(0, 160)}`));
await page.waitForTimeout(2500);
await page.waitForFunction(() => document.documentElement.getAttribute('data-ui-channel') === 'p5', null, { timeout: 30000 });
await page.waitForFunction(() => !!document.querySelector('.fab5'), null, { timeout: 30000 });
await page.waitForTimeout(3000);

const geo = await page.evaluate(() => {
  const box = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { top: Math.round(b.top), bottom: Math.round(b.bottom), left: Math.round(b.left), right: Math.round(b.right), w: Math.round(b.width), h: Math.round(b.height) }; };
  const fab = box(document.querySelector('.fab5'));
  const rows = [...document.querySelectorAll('.req-rows .req')].map((el) => ({ t: (el.querySelector('b')?.textContent ?? '').slice(0, 18), ...box(el) }));
  const overlaps = fab ? rows.map((r) => ({ t: r.t, oy: Math.min(r.bottom, fab.bottom) - Math.max(r.top, fab.top), ox: Math.min(r.right, fab.right) - Math.max(r.left, fab.left) })).filter((o) => o.oy > 0 && o.ox > 0) : [];
  const badge = document.querySelector('.q-badge');
  const badgeBtn = document.querySelector('.tool.quest');
  return {
    fab, rowCount: rows.length, overlaps,
    badge: box(badge), badgeBtn: box(badgeBtn),
    badgeText: badge?.textContent?.trim() ?? null,
    badgeAria: badgeBtn?.getAttribute('aria-label') ?? null,
    reqAdd: box(document.querySelector('.req-add')),
    viewport: { w: window.innerWidth, h: window.innerHeight },
  };
});
report.geometry = geo;
report.checks.push(`FAB 与任务行几何：${JSON.stringify(geo)}`);
report.checks.push(`委托角标：badgeText=${geo.badgeText} aria=${geo.badgeAria}`);

// 本周真实未领取委托数：读委托板自己用的同一张表
report.quests = await page.evaluate(async () => {
  const { db } = await import('/src/db/index.ts');
  const { weekRangeOf } = await import('/src/utils/questBoard.ts');
  const range = weekRangeOf(new Date());
  const rows = await db.quests.where('weekKey').equals(range.weekKey).toArray();
  return {
    weekKey: range.weekKey,
    total: rows.length,
    claimed: rows.filter((q) => !!q.claimedAt).length,
    claimable: rows.filter((q) => !q.claimedAt).length,
  };
});
report.checks.push(`真实委托数据：${JSON.stringify(report.quests)}`);

await page.screenshot({ path: resolve(out, 'red-todos.png') });
report.screenshots.redTodos = resolve(out, 'red-todos.png');

// 角标必须等于 db.quests 里本周真实未领取张数，不再是 mock 写死的演示值
if (String(geo.badgeText) !== String(report.quests.claimable)) report.failures.push(`委托角标与真实可领取数不一致：显示 ${geo.badgeText}，db.quests 未领取 ${report.quests.claimable}`);
if (geo.overlaps.length) report.failures.push(`加号 FAB 压住 ${geo.overlaps.length} 个内容块`);
if (pageErrors.length) report.failures.push(`pageerror: ${pageErrors.join(' | ')}`);

report.ok = report.failures.length === 0;
writeFileSync(resolve(out, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, badge: geo.badgeText, fabTop: geo.fab?.top, fabBottom: geo.fab?.bottom, overlaps: geo.overlaps, failures: report.failures }, null, 2));
if (!report.ok) process.exitCode = 1;



