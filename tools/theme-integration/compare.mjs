#!/usr/bin/env node
/**
 * demo ⇄ 真实 App 同地址截图对比（并排 + 差异热图 + 差异百分比）。
 *
 * 前提：两个开发服务都已启动
 *   demo：cd demo/<目录> && npm run dev          （黄 5180 / 粉 5191 / 蓝 5192）
 *   真实：npm run dev                            （默认 5173）
 * 用法（仓库根）：
 *   node tools/theme-integration/compare.mjs --theme yellow --routes "#/,#/p/ledger" [--viewport 390x844] [--mode day|night]
 *        [--app http://localhost:5173] [--demo http://localhost:5180] [--wait 2500] [--out .theme-compare] [--no-seed]
 *        [--app-actions "<js>"]  在真实 App 每条路由截图前额外执行的 JS（例如点开某个弹层）
 * 种子：默认在真实 App（必须是 vite dev，不是 build 产物）里自动建一个测试用户并切到该主题（只在 IndexedDB 为空时）。
 * playwright：优先用仓库根的 node_modules，没有就用 demo/p4g-yellow/node_modules 里的。
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const has = (k) => argv.includes(k);
const REPO = path.resolve(arg('--repo', process.cwd()));
const theme = arg('--theme', 'yellow');
const PORTS = { yellow: 5180, pink: 5191, blue: 5192 };
const DEMO_DIR = { yellow: 'p4g-yellow', pink: 'p3r-pink', blue: 'p3r-blue' };
if (!PORTS[theme]) { console.error('--theme 只能是 yellow / pink / blue'); process.exit(2); }
const APP = arg('--app', 'http://localhost:5173');
// demo 默认用已构建的 dist（file:// 直接开，不用起服务；demo 交付时已构建好）；没有 dist 时用 dev 服务端口
const distHtml = path.join(REPO, 'demo', DEMO_DIR[theme], 'dist', 'index.html');
const DEMO = arg('--demo', fs.existsSync(distHtml) ? pathToFileURL(distHtml).href : `http://localhost:${PORTS[theme]}`);
const routes = arg('--routes', '#/').split(',').map((s) => s.trim()).filter(Boolean);
const [vw, vh] = arg('--viewport', '390x844').split('x').map(Number);
const mode = arg('--mode', 'day');
const wait = Number(arg('--wait', '2500'));
const OUT = path.resolve(REPO, arg('--out', '.theme-compare'), theme);
const appActions = arg('--app-actions', '');
fs.mkdirSync(OUT, { recursive: true });

// playwright 解析
function loadPlaywright() {
  for (const base of [REPO, path.join(REPO, 'demo', 'p4g-yellow'), path.join(REPO, 'demo', DEMO_DIR[theme])]) {
    try { const req = createRequire(path.join(base, 'package.json')); return req.resolve('playwright'); } catch { /* next */ }
  }
  return null;
}
const pwPath = loadPlaywright();
if (!pwPath) { console.error('找不到 playwright：在仓库根 npm i -D playwright@1.48.2 && npx playwright install chromium'); process.exit(2); }
if (!process.env.PLAYWRIGHT_BROWSERS_PATH) {
  for (const c of [path.join(REPO, '..', 'work', 'ms-playwright'), path.join(REPO, 'work', 'ms-playwright')]) if (fs.existsSync(c)) process.env.PLAYWRIGHT_BROWSERS_PATH = c;
}
const pwMod = await import(pathToFileURL(pwPath).href);
const chromium = pwMod.chromium ?? pwMod.default?.chromium;

const browser = await chromium.launch();
const mk = async () => {
  const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: 1, reducedMotion: 'no-preference' });
  const page = await ctx.newPage();
  page.setDefaultTimeout(120000); page.setDefaultNavigationTimeout(120000); // 首次打开 vite dev 要现编译，很慢
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e.message || e)));
  return { ctx, page, errs };
};

// demo：外壳参数 __mode / __dev=0
const demoUrl = (r) => { const [p, q] = r.split('?'); const sp = new URLSearchParams(q || ''); sp.set('__mode', mode); sp.set('__dev', '0'); return `${DEMO.endsWith('.html') ? DEMO : DEMO + '/'}${p}?${sp}`; };
const appUrl = (r) => `${APP}/${r}`;

async function seed(page) {
  if (has('--no-seed')) return;
  // vite dev 首次会「依赖预构建 → 自动刷新」，主题切换也会触发整页刷新：所以重试几次
  for (let i = 0; i < 6; i++) {
    try {
      await page.goto(APP + '/', { waitUntil: 'load' });
      await page.waitForTimeout(3000);
      const r = await page.evaluate(async ({ theme, mode }) => {
        const m = await import('/src/store/index.ts');
        const st = m.useAppStore.getState();
        if (!st.user) { await st.createUser('测试旅人'); }
        const s2 = m.useAppStore.getState();
        if (s2.user && s2.user.theme !== theme) await s2.setTheme(theme);
        if (!!m.useAppStore.getState().settings.darkMode !== (mode === 'night')) await m.useAppStore.getState().updateSettings({ darkMode: mode === 'night' });
        return { user: !!m.useAppStore.getState().user, theme: m.useAppStore.getState().user?.theme };
      }, { theme, mode });
      // 切主题会触发 useKitReloadGuard 整页刷新：等刷新完成（最多 60 秒）再返回，避免后面的 goto 和刷新抢跑
      if (r.user && r.theme === theme) { await page.waitForLoadState('load').catch(() => {}); await page.waitForTimeout(3000); return r; }
    } catch (e) { console.log(`种子第 ${i + 1} 次被页面刷新打断，重试…`); await page.waitForTimeout(3000); }
  }
  throw new Error('种子失败：真实 App 是不是没用 npm run dev 启动？');
}

async function diff(page, a, b) {
  return page.evaluate(async ({ a, b }) => {
    const load = (src) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = src; });
    const [ia, ib] = await Promise.all([load(a), load(b)]);
    const w = Math.max(ia.width, ib.width), h = Math.max(ia.height, ib.height);
    const ca = document.createElement('canvas'); ca.width = w; ca.height = h; const xa = ca.getContext('2d'); xa.drawImage(ia, 0, 0);
    const cb = document.createElement('canvas'); cb.width = w; cb.height = h; const xb = cb.getContext('2d'); xb.drawImage(ib, 0, 0);
    const da = xa.getImageData(0, 0, w, h).data, db = xb.getImageData(0, 0, w, h).data;
    const out = document.createElement('canvas'); out.width = w * 2 + 12; out.height = h * 2 + 12; const xo = out.getContext('2d');
    xo.fillStyle = '#222'; xo.fillRect(0, 0, out.width, out.height);
    xo.drawImage(ia, 0, 0); xo.drawImage(ib, w + 12, 0);
    const heat = xo.createImageData(w, h); let bad = 0;
    for (let i = 0; i < da.length; i += 4) {
      const d = Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]);
      const on = d > 60; if (on) bad++;
      heat.data[i] = on ? 255 : da[i] * 0.25; heat.data[i + 1] = on ? 40 : da[i + 1] * 0.25; heat.data[i + 2] = on ? 40 : da[i + 2] * 0.25; heat.data[i + 3] = 255;
    }
    xo.putImageData(heat, 0, h + 12);
    xo.fillStyle = '#fff'; xo.font = 'bold 14px sans-serif'; xo.fillText('DEMO', 6, 16); xo.fillText('APP', w + 18, 16); xo.fillText('DIFF', 6, h + 28);
    return { pct: Math.round((bad / (w * h)) * 10000) / 100, png: out.toDataURL('image/png') };
  }, { a, b });
}

const report = [];
const A = await mk(); const D = await mk();
const seeded = await seed(A.page);
if (seeded) console.log('种子：', seeded);
for (const r of routes) {
  await D.page.goto(demoUrl(r), { waitUntil: 'load' }); await D.page.waitForTimeout(wait);
  const sd = await D.page.screenshot();
  await A.page.goto(appUrl(r), { waitUntil: 'load' });
  if (/#\//.test(r)) { await A.page.evaluate((h) => { if (location.hash !== h) location.hash = h; }, r.slice(r.indexOf('#'))); }
  // dev 服务冷启动后第一次进主题要现编译几百个模块（演练 2 核机：10–60 秒），期间 KitHost 的 Suspense fallback=null → 纯白屏。
  // 只等 networkidle + 固定秒数会拍到白屏（2026-10-21 演练「粉记账页白屏」的真实原因）。所以：等到 <html data-kit> 已设置
  // 且 #root 里真有文字，再按 --wait 等入场动画。超时（180 秒）则在报告里标 appBlank=true，不当成"差异小"。
  await A.page.waitForLoadState('networkidle', { timeout: 90000 }).catch(() => {});
  const t0 = Date.now();
  const ready = await A.page.waitForFunction(() => !!document.documentElement.getAttribute('data-kit') && (document.getElementById('root')?.innerText || '').trim().length > 20, null, { timeout: 180000, polling: 500 }).then(() => true).catch(() => false);
  const readyMs = Date.now() - t0;
  await A.page.waitForTimeout(wait);
  if (appActions) { await A.page.evaluate(appActions); await A.page.waitForTimeout(wait); }
  const sa = await A.page.screenshot();
  const res = await diff(D.page, 'data:image/png;base64,' + sd.toString('base64'), 'data:image/png;base64,' + sa.toString('base64'));
  const name = (r.replace(/[^\w-]+/g, '_').replace(/^_+|_+$/g, '') || 'root') + `.${vw}x${vh}.${mode}.png`;
  fs.writeFileSync(path.join(OUT, name), Buffer.from(res.png.split(',')[1], 'base64'));
  const kit = await A.page.evaluate(() => document.documentElement.getAttribute('data-kit'));
  report.push({ route: r, viewport: `${vw}x${vh}`, mode, diffPct: res.pct, appBlank: !ready, appReadyMs: readyMs, file: path.join(OUT, name), appDataKit: kit, appErrors: A.errs.splice(0), demoErrors: D.errs.splice(0) });
  console.log(`${r}  差异 ${res.pct}%  data-kit=${kit}${ready ? '' : '  ⚠️ 真实 App 180 秒内没渲染出主题界面（白屏），本条无效'}  → ${path.relative(REPO, path.join(OUT, name))}`);
}
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
await browser.close();
