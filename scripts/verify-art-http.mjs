// 塔罗 / 岁时卡素材全量核对：文件在不在、HTTP 通不通、四主题页面上显不显示。
// 只读：只监听响应和截图，不写任何业务数据。
import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from '../node_modules/playwright/index.mjs';

const base = process.env.THEME_AUDIT_BASE ?? 'http://127.0.0.1:5212';
const out = resolve(process.argv[2] ?? '');
if (!process.argv[2]) throw new Error('Pass a new evidence directory');
if (existsSync(out)) throw new Error('Evidence directory already exists; use a new directory');
mkdirSync(out, { recursive: true });

const MAJORS = ['fool','magician','high_priestess','empress','emperor','hierophant','lovers','chariot','strength','hermit','wheel_of_fortune','justice','hanged_man','death','temperance','devil','tower','star','moon','sun','judgement','world'];
const SUITS = ['wands','cups','swords','pentacles'];
const MINORS = SUITS.flatMap((s) => Array.from({ length: 14 }, (_, i) => `${s}_${i + 1}`));
const TAROT_SETS = ['p3','p4','p5','pink'];
// 两套路径都要查：public/tarot/{set} 给 constants/tarotArt.ts 用，
// public/assets/tarot/{set} 给 themes/*/lib/asset.ts 的 tarotAsset() 用（历史上只补过一部分）
const TAROT_ROOTS = ['tarot', 'assets/tarot'];
const SEASON_ROOTS = ['season', 'assets/season'];
const TERMS = ['xiaohan','dahan','lichun','yushui','jingzhe','chunfen','qingming','guyu','lixia','xiaoman','mangzhong','xiazhi','xiaoshu','dashu','liqiu','chushu','bailu','qiufen','hanlu','shuangjiang','lidong','xiaoxue','daxue','dongzhi'];
const FESTIVALS = ['yuandan','qingrenjie','funvjie','laodongjie','qingnianjie','ertongjie','jiaoshijie','guoqingjie','wanshengye','shuangshiyi','pinganye','shengdanjie','kuanianye','chuxi','chunjie','yuanxiao','duanwu','qixi','zhongqiu','chongyang'].map((f) => `festival_${f}`);

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
});
const report = { base, ok: false, http: {}, checks: [], failures: [], screenshots: {} };

// 1 · 在真实页面里逐张请求，用页面自己的 response 监听收状态码（空白页 fetch 会被 CORS 挡）
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'zh-CN', timezoneId: 'Asia/Shanghai' });
const page = await ctx.newPage();
const seen = new Map();
page.on('response', (r) => {
  const p = new URL(r.url()).pathname;
  if (/^\/?(tarot|season)\//.test(p)) seen.set(p, { status: r.status(), type: r.headers()['content-type'] ?? '' });
});
await page.goto(`${base}/?__mode=day&__motion=low&__snd=0&__dev=0`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => (document.querySelector('#root')?.childElementCount ?? 0) > 0, null, { timeout: 30000 });

async function probeUrl(url) {
  return page.evaluate(async (u) => {
    try {
      const res = await fetch(u, { method: 'GET', cache: 'no-store' });
      const buf = new Uint8Array(await res.arrayBuffer());
      return { status: res.status, type: res.headers.get('content-type') ?? '', bytes: buf.byteLength };
    } catch (e) { return { status: 0, type: '', bytes: 0, error: String(e).slice(0, 120) }; }
  }, url);
}

for (const set of TAROT_SETS) {
  const ids = [...MAJORS, ...MINORS];
  for (const root of TAROT_ROOTS) {
    const results = [];
    for (const id of ids) {
      results.push({ id, ...(await probeUrl(`${base}/${root}/${set}/${id}.webp`)) });
    }
    report.http[`${root}/${set}`] = results;
    const bad = results.filter((r) => r.status !== 200 || r.bytes < 1000 || !/image\//.test(r.type));
    report.checks.push(`${root}/${set}: ${results.length} 张全部 HTTP 200 且是图片，异常 ${bad.length}`);
    if (bad.length) report.failures.push(`${root}/${set} 异常 ${bad.length} 张: ${bad.slice(0, 8).map((b) => `${b.id}@${b.status}`).join(',')}`);
  }
}
for (const set of TAROT_SETS) {
  const slugs = [...TERMS, ...FESTIVALS];
  for (const root of SEASON_ROOTS) {
    const results = [];
    for (const slug of slugs) {
      results.push({ id: slug, ...(await probeUrl(`${base}/${root}/${set}/${slug}.webp`)) });
    }
    report.http[`${root}/${set}`] = results;
    const bad = results.filter((r) => r.status !== 200 || r.bytes < 1000 || !/image\//.test(r.type));
    report.checks.push(`${root}/${set}: ${results.length} 张全部 HTTP 200 且是图片，异常 ${bad.length}`);
    if (bad.length) report.failures.push(`${root}/${set} 异常 ${bad.length} 张: ${bad.slice(0, 8).map((b) => `${b.id}@${b.status}`).join(',')}`);
  }
}

// 2 · 四主题真实页面：按当前主题算出的卡面 URL 必须真的解码出像素
const THEMES = [{ id: 'blue', label: '蓝' }, { id: 'pink', label: '粉' }, { id: 'yellow', label: '黄' }, { id: 'red', label: '红' }];
report.render = [];
for (const theme of THEMES) {
  const tctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true, locale: 'zh-CN', timezoneId: 'Asia/Shanghai' });
  const tpage = await tctx.newPage();
  const pageErrors = [];
  tpage.on('pageerror', (e) => pageErrors.push(String(e)));
  const failedImages = [];
  tpage.on('response', (r) => { if (r.status() >= 400 && /\.(webp|png|jpe?g)/.test(new URL(r.url()).pathname)) failedImages.push(`${r.status()} ${new URL(r.url()).pathname}`); });

  await tpage.goto(`${base}/?__mode=day&__motion=low&__snd=0&__dev=0`, { waitUntil: 'domcontentloaded' });
  await tpage.waitForFunction(() => (document.querySelector('#root')?.childElementCount ?? 0) > 0, null, { timeout: 30000 });
  await tpage.waitForTimeout(1500);
  await tpage.evaluate(async (themeId) => {
    const { useAppStore } = await import('/src/store/index.ts');
    if (!useAppStore.getState().user) await useAppStore.getState().createUser('素材核对档案');
    await useAppStore.getState().setTheme(themeId);
  }, theme.id).catch(() => {});
  await tpage.waitForTimeout(2500);

  // 每个主题真实读取卡面的路径：红主题走 slots/ 素材槽，蓝粉黄走 assets/（函数不能带进页面）
  const ART_OF_THEME = {
    blue: { tarot: 'assets/tarot/p3', season: 'assets/season/p3' },
    pink: { tarot: 'assets/tarot/pink', season: 'assets/season/pink' },
    yellow: { tarot: 'assets/tarot/p4', season: 'assets/season/p4' },
    red: { tarot: 'slots/tarot/p5', season: 'slots/season/p5' },
  };
  const art = ART_OF_THEME[theme.id];
  const probe = await tpage.evaluate(async (art) => {
    const load = async (u) => {
      const i = new Image();
      i.src = u;
      try { await i.decode(); return { url: u, w: i.naturalWidth, h: i.naturalHeight }; }
      catch { return { url: u, w: 0, h: 0 }; }
    };
    const tarot = [];
    for (const id of ['fool','star','world','wands_1','cups_14','swords_7','pentacles_10']) tarot.push(await load(`/${art.tarot}/${id}.webp`));
    const season = [];
    for (const slug of ['lichun','xiazhi','festival_zhongqiu','dongzhi']) season.push(await load(`/${art.season}/${slug}.webp`));
    return { tarot, season };
  }, art).catch((e) => ({ error: String(e).slice(0, 200) }));

  const broken = [...(probe.tarot ?? []), ...(probe.season ?? [])].filter((x) => !x.w);
  report.render.push({ theme: theme.id, art, broken: broken.map((b) => b.url), pageErrors, failedImages });
  report.checks.push(`${theme.label}: ${art.tarot} + ${art.season}，取样 ${(probe.tarot ?? []).length + (probe.season ?? []).length} 张全部解码出像素，失败 ${broken.length}`);
  if (probe.error) report.failures.push(`${theme.id} 探针出错: ${probe.error}`);
  if (broken.length) report.failures.push(`${theme.id} 图片解码失败: ${broken.map((b) => b.url).join(',')}`);
  if (pageErrors.length) report.failures.push(`${theme.id} pageerror: ${pageErrors.join(' | ')}`);
  if (failedImages.length) report.failures.push(`${theme.id} 资源请求失败: ${failedImages.join(',')}`);
  await tctx.close();
}
await ctx.close();

report.ok = report.failures.length === 0;
writeFileSync(resolve(out, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, checks: report.checks, failures: report.failures }, null, 2));
if (!report.ok) process.exitCode = 1;
