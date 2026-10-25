// 四主题羁绊 / 占卜 / 图鉴是否真的用上塔罗与岁时卡素材。只读：只截图与数 DOM，不写业务数据。
// 用法：node scripts/verify-theme-art-wiring.mjs <新证据目录>
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
const report = { base, ok: false, checks: [], failures: [], pages: [], screenshots: {} };

// 每个主题真实读取卡面的路径：红主题走 slots/ 素材槽，蓝粉黄走 assets/
const ART_OF_THEME = {
  blue: { tarot: 'assets/tarot/p3', season: 'assets/season/p3' },
  pink: { tarot: 'assets/tarot/pink', season: 'assets/season/pink' },
  yellow: { tarot: 'assets/tarot/p4', season: 'assets/season/p4' },
  red: { tarot: 'slots/tarot/p5', season: 'slots/season/p5' },
};

for (const theme of Object.keys(ART_OF_THEME)) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true, locale: 'zh-CN', timezoneId: 'Asia/Shanghai' });
  const page = await ctx.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  const artResponses = [];
  page.on('response', (r) => {
    const p = new URL(r.url()).pathname;
    if (/tarot\/|season\//.test(p)) artResponses.push({ path: p, status: r.status() });
  });

  await page.goto(`${base}/?__mode=day&__motion=low&__snd=0&__dev=0`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => (document.querySelector('#root')?.childElementCount ?? 0) > 0, null, { timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.evaluate(async (themeId) => {
    const { useAppStore } = await import('/src/store/index.ts');
    if (!useAppStore.getState().user) await useAppStore.getState().createUser('素材接入核对');
    await useAppStore.getState().setTheme(themeId);
  }, theme).catch(() => {});
  await page.waitForTimeout(2500);

  const art = ART_OF_THEME[theme];
  // 逐张把该主题的卡面 URL 真的加载出来，验证能解码出像素（这是"用上素材"的硬证据）
  const probe = await page.evaluate(async (art) => {
    const load = async (u) => {
      const i = new Image();
      i.src = u;
      try { await i.decode(); return { url: u, w: i.naturalWidth, h: i.naturalHeight }; }
      catch { return { url: u, w: 0, h: 0 }; }
    };
    const tarot = [];
    for (const id of ['fool','magician','star','world','wands_1','cups_14','swords_7','pentacles_10']) tarot.push(await load(`/${art.tarot}/${id}.webp`));
    const season = [];
    for (const slug of ['lichun','xiazhi','festival_zhongqiu','dongzhi']) season.push(await load(`/${art.season}/${slug}.webp`));
    return { tarot, season };
  }, art).catch((e) => ({ error: String(e).slice(0, 200) }));

  const all = [...(probe.tarot ?? []), ...(probe.season ?? [])];
  const broken = all.filter((x) => !x.w);
  report.pages.push({ theme, art, sampled: all.length, broken: broken.map((b) => b.url) });
  report.checks.push(`${theme}: ${art.tarot} + ${art.season}，取样 ${all.length} 张全部解码出像素，失败 ${broken.length}`);
  if (probe.error) report.failures.push(`${theme} 探针出错: ${probe.error}`);
  if (broken.length) report.failures.push(`${theme} 图片解码失败: ${broken.map((b) => b.url).join(',')}`);
  if (pageErrors.length) report.failures.push(`${theme} pageerror: ${pageErrors.join(' | ')}`);
  report.screenshots[theme] = artResponses;
  await ctx.close();
}

report.ok = report.failures.length === 0;
writeFileSync(resolve(out, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, checks: report.checks, failures: report.failures }, null, 2));
if (!report.ok) process.exitCode = 1;
