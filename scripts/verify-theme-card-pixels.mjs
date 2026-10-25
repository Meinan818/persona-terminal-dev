// 四主题羁绊 / 星象 / 图鉴：验证页面上真正渲染出来的卡面是不是真素材。
// 判据：<img> 的 naturalWidth（真素材 560 宽，占位图 ~300 或更小）+ 逐页截图。
// 隔离浏览器档案里会造 2 个同伴、并把星象翻到已揭示状态，以便有卡可测。
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
const report = { base, ok: false, checks: [], failures: [], pages: [] };

const THEMES = [
  { id: 'blue', codex: '#/p/achievements?tab=codex&sub=tarot', astro: '#/p/astrology?phase=reading', astroMode: 'url' },
  { id: 'pink', codex: '#/p/achievements?tab=codex&sub=tarot', astro: '#/p/astrology?phase=reading', astroMode: 'url' },
  { id: 'yellow', codex: '#/p/achievements?tab=codex&sub=tarot', astro: '#/p/astrology?state=reading', astroMode: 'url' },
  { id: 'red', codex: '#/overlay/achv-codex', astro: '#/p/astrology', astroMode: 'click' },
];

const measure = async (page) => page.evaluate(() => {
  const imgs = [...document.querySelectorAll('img')]
    .filter((i) => /tarot\/|season\//.test(i.getAttribute('src') ?? ''))
    .map((i) => ({ src: i.getAttribute('src') ?? '', w: i.naturalWidth }));
  const widths = {};
  for (const i of imgs) widths[i.w] = (widths[i.w] ?? 0) + 1;
  return {
    count: imgs.length,
    tiny: imgs.filter((i) => i.w > 0 && i.w < 400).length,
    broken: imgs.filter((i) => !i.w).length,
    widthHistogram: widths,
    sample: imgs.slice(0, 3).map((x) => x.src),
  };
});

for (const theme of THEMES) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true, locale: 'zh-CN', timezoneId: 'Asia/Shanghai' });
  const page = await ctx.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  await page.goto(`${base}/?__mode=day&__motion=low&__snd=0&__dev=0`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => (document.querySelector('#root')?.childElementCount ?? 0) > 0, null, { timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.evaluate(async (themeId) => {
    const { useAppStore } = await import('/src/store/index.ts');
    const { db } = await import('/src/db/index.ts');
    let st = useAppStore.getState();
    if (!st.user) { await st.createUser('卡面渲染核对'); st = useAppStore.getState(); }
    const now = new Date();  // 必须是 Date 对象，黄主题会调 createdAt.getTime()
    const mk = (i, arcanaId, name) => ({
      id: `probe-cf-${i}`, userId: st.user.id, source: 'offline', name, arcanaId,
      orientation: 'upright', description: '隔离核对的同伴', aiInterpretation: '', aiAdvice: '',
      intimacy: 5, intimacyPoints: 0, buffs: [], decayEnabled: false,
      createdAt: now, updatedAt: now,
    });
    await db.confidants.bulkPut([mk(1, 'fool', '核对甲'), mk(2, 'star', '核对乙')]);
    await useAppStore.getState().loadConfidants?.();
    await useAppStore.getState().setTheme(themeId);
  }, theme.id).catch((e) => report.failures.push(`${theme.id} seed: ${String(e).slice(0, 160)}`));
  await page.waitForTimeout(2500);

  // 羁绊
  await page.evaluate(() => { location.hash = '#/p/cooperation'; }).catch(() => {});
  await page.waitForTimeout(4000);
  let m = await measure(page);
  report.pages.push({ theme: theme.id, label: '羁绊', ...m });
  report.checks.push(`${theme.id} 羁绊: ${m.count} 张，宽<400 的 ${m.tiny}，坏图 ${m.broken}，宽度分布 ${JSON.stringify(m.widthHistogram)}`);
  if (m.count === 0) report.failures.push(`${theme.id} 羁绊: 一张卡面都没渲染出来`);
  if (m.tiny > 0) report.failures.push(`${theme.id} 羁绊: ${m.tiny} 张是小尺寸占位图`);
  if (m.broken > 0) report.failures.push(`${theme.id} 羁绊: ${m.broken} 张图加载失败`);
  await page.screenshot({ path: resolve(out, `${theme.id}-羁绊.png`), fullPage: true }).catch(() => {});

  // 星象
  await page.evaluate((r) => { location.hash = r; }, theme.astro).catch(() => {});
  await page.waitForTimeout(4000);
  if (theme.astroMode === 'click') {
    await page.evaluate(() => { document.querySelector('.as-card')?.click(); }).catch(() => {});
    await page.waitForTimeout(2500);
  }
  m = await measure(page);
  report.pages.push({ theme: theme.id, label: '星象', ...m });
  report.checks.push(`${theme.id} 星象: ${m.count} 张，宽<400 的 ${m.tiny}，坏图 ${m.broken}，宽度分布 ${JSON.stringify(m.widthHistogram)}`);
  if (m.count === 0) report.failures.push(`${theme.id} 星象: 一张卡面都没渲染出来`);
  if (m.tiny > 0) report.failures.push(`${theme.id} 星象: ${m.tiny} 张是小尺寸占位图`);
  if (m.broken > 0) report.failures.push(`${theme.id} 星象: ${m.broken} 张图加载失败`);
  await page.screenshot({ path: resolve(out, `${theme.id}-星象.png`), fullPage: true }).catch(() => {});

  // 图鉴
  await page.evaluate((r) => { location.hash = r; }, theme.codex).catch(() => {});
  await page.waitForTimeout(4500);
  m = await measure(page);
  report.pages.push({ theme: theme.id, label: '图鉴', ...m });
  report.checks.push(`${theme.id} 图鉴: ${m.count} 张，宽<400 的 ${m.tiny}，坏图 ${m.broken}，宽度分布 ${JSON.stringify(m.widthHistogram)}`);
  if (m.count === 0) report.failures.push(`${theme.id} 图鉴: 一张卡面都没渲染出来`);
  if (m.tiny > 0) report.failures.push(`${theme.id} 图鉴: ${m.tiny} 张是小尺寸占位图`);
  if (m.broken > 0) report.failures.push(`${theme.id} 图鉴: ${m.broken} 张图加载失败`);
  await page.screenshot({ path: resolve(out, `${theme.id}-图鉴.png`), fullPage: true }).catch(() => {});

  if (pageErrors.length) report.failures.push(`${theme.id} pageerror: ${pageErrors.join(' | ')}`);
  await ctx.close();
}

report.ok = report.failures.length === 0;
writeFileSync(resolve(out, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, checks: report.checks, failures: report.failures }, null, 2));
if (!report.ok) process.exitCode = 1;

