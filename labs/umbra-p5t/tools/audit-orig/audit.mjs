// 原版素材运行时审计（2026-10-27）：vite dev server（直接读 public/，不依赖 dist）+ Playwright swiftshader。
// node tools/audit-orig/audit.mjs L01 [L02 …]  → OUT/Lxx.png、Lxx-menu.png、Lxx-result.png、Lxx.json
// 记录：所有 HTTP ≥400 / requestfailed、console warn/error（fallback/回退/Kenney/占位/程序化）、pageerror、
// Kenney 布景请求（models/{town,castle,survival,pirate,furniture}/ = 回退/自制布景）、renderInfo（origStats/gimmickCount/placeholderCount）。
// 依赖：PLAYWRIGHT_BROWSERS_PATH（默认 /workspace/work/ms-playwright）。
import { chromium } from 'playwright';
import { createServer, preview } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
process.env.PLAYWRIGHT_BROWSERS_PATH ||= '/workspace/work/ms-playwright';
const OUT = process.env.OUT || '/workspace/work/audit';
fs.mkdirSync(OUT, { recursive: true });
const levels = process.argv.slice(2).length ? process.argv.slice(2) : ['L01'];
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const port = 4700 + Math.floor(Math.random() * 200);
// DIST=<目录>：用 vite preview 服务一份快照构建（避免并行改 src 触发 dev HMR 整页重载）；否则 vite dev 直接读 public/
const DIST = process.env.DIST;
const server = DIST
  ? await preview({ root, configFile: path.join(root, 'vite.config.ts'), build: { outDir: DIST }, preview: { port, host: '127.0.0.1', strictPort: true }, logLevel: 'error' })
  : await createServer({ root, configFile: path.join(root, 'vite.config.ts'), server: { port, host: '127.0.0.1', strictPort: true }, logLevel: 'error' });
if (!DIST) await server.listen();
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const KENNEY = /\/models\/(town|castle|survival|pirate|furniture)\//;
const FLAG = /fallback|回退|kenney|占位|程序化|placeholder|load failed|404|not found/i;
for (const lv of levels) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const rec = { level: lv, bad: [], failed: [], console: [], pageerror: [], kenney: [], requests: [], info: null, steps: [] };
  page.on('response', (r) => { const u = r.url(); if (!u.includes(`:${port}/`)) return; const p = u.split(`:${port}`)[1]; const ct = r.headers()['content-type'] || ''; rec.requests.push([r.status(), p, ct, r.request().method()]);
    // vite/sirv 的 SPA 回退：缺文件也回 200 + index.html → 素材扩展名却拿到 text/html = 实际 404
    const spa404 = /\.(glb|gltf|png|webp|jpg|ogg|m4a|json|bin|ktx2|exr)(\?|$)/i.test(p) && ct.includes('text/html');
    if (r.status() >= 400 || spa404) rec.bad.push([spa404 ? '200-html(=404)' : r.status(), p, r.request().method()]); if (KENNEY.test(p)) rec.kenney.push(p); });
  page.on('requestfailed', (r) => rec.failed.push([r.failure()?.errorText, r.method(), r.url().split(`:${port}`)[1] ?? r.url()]));
  page.on('pageerror', (e) => rec.pageerror.push(String(e).slice(0, 400)));
  page.on('console', (m) => { const t = m.text(); if (t.includes('GL Driver') || t.includes('GPU stall')) return; if (m.type() === 'error' || m.type() === 'warning' || FLAG.test(t)) rec.console.push(`[${m.type()}] ${t.slice(0, 300)}`); });
  const t0 = Date.now();
  await page.goto(`http://127.0.0.1:${port}/?speed=4&level=${lv}`);
  const ok = await page.waitForFunction(() => window.__p5t && window.__p5t.started && window.__p5t.charsReady && !window.__p5t.busy, null, { timeout: 300000, polling: 1000 }).then(() => true).catch(() => false);
  rec.steps.push(['loaded', ok, (Date.now() - t0) / 1000, await page.evaluate(() => { const P = window.__p5t; return P ? { started: P.started, chars: P.charsReady, busy: P.busy } : null; }).catch(() => null)]);
  await page.waitForFunction(() => window.__p5t.sceneKit.ready && !window.__p5t.renderInfo().origLoading, null, { timeout: 60000, polling: 500 }).then(() => rec.steps.push(['sceneReady', true])).catch(() => rec.steps.push(['sceneReady', false]));
  await page.waitForTimeout(2500);
  rec.info = await page.evaluate(() => { const i = window.__p5t.renderInfo(); return { ...i, map: window.__p5t.battle.map.id, w: window.__p5t.battle.map.width, h: window.__p5t.battle.map.height }; }).catch((e) => String(e));
  rec.census = await page.evaluate(() => { const P = window.__p5t, c = {}; P.world.traverse((o) => { if (o.name && o.parent === P.world) c[o.name] = (c[o.name] || 0) + 1; }); let meshes = 0; P.world.traverse((o) => { if (o.isMesh && o.visible) meshes++; }); c.__visibleMeshes = meshes;
    // 每个单位用的模型：orig:<key> = 原版 GLB；JokerRig/chibi = 社区/程序化回退；NONE = 占位胶囊
    c.__units = P.battle.units.filter((u) => !u.hidden).map((u) => { const r = P.rigs.get(u.id); return `${u.id}|${u.name}|${u.side}|${u.prop ? 'prop' : u.decoy ? 'decoy' : r ? ('key' in r ? 'orig:' + r.key : 'FALLBACK:' + (r.constructor?.name || 'rig')) : 'NONE(占位胶囊)'}`; });
    return c; }).catch((e) => String(e));
  await page.screenshot({ path: `${OUT}/${lv}.png` });
  // 指令菜单 → 技能列表
  try {
    const ally = await page.evaluate(() => { const B = window.__p5t.battle; const a = B.units.find((u) => u.side === 'ally' && !u.ko && !u.hidden); window.__p5t.select(a.id); return a.id; });
    await page.waitForTimeout(2500);
    const cmd = await page.evaluate(() => { const c = document.querySelector('#cmd'); return c ? { hidden: c.classList.contains('hidden'), html: c.innerHTML.length } : null; });
    rec.steps.push(['select', ally, cmd]);
    await page.screenshot({ path: `${OUT}/${lv}-menu.png` });
    const sk = await page.evaluate(() => { const b = document.querySelector('#cmd .persona, #cmd .skill, #cmd [data-act="skill"]'); if (b) { b.click(); return b.className; } return null; });
    await page.waitForTimeout(3000);
    rec.steps.push(['skillBtn', sk]);
    await page.screenshot({ path: `${OUT}/${lv}-skill.png` });
    await page.keyboard.press('Escape'); await page.waitForTimeout(800);
  } catch (e) { rec.steps.push(['menuErr', String(e).slice(0, 200)]); }
  // 结算
  try {
    await page.evaluate(() => window.__p5t.showResult(true));
    await page.waitForTimeout(6000);
    await page.screenshot({ path: `${OUT}/${lv}-result.png` });
    await page.evaluate(() => window.__p5t.resultNext()); await page.waitForTimeout(4000);
    await page.screenshot({ path: `${OUT}/${lv}-result2.png` });
    rec.steps.push(['result', true]);
  } catch (e) { rec.steps.push(['resultErr', String(e).slice(0, 200)]); }
  rec.secs = (Date.now() - t0) / 1000;
  const okSet = new Set(rec.requests.filter((q) => q[0] < 400 && !String(q[2]).includes('text/html')).map((q) => q[1]));
  rec.failedReal = rec.failed.filter((f) => !(f[0] === 'net::ERR_ABORTED' && okSet.has(f[2]))); // HEAD 探测被 Chromium 标 ABORTED 但已拿到 200 = 无害
  const summary = { level: lv, missing404: rec.bad.length, missingList: rec.bad.map((b) => b[2] === 'HEAD' ? `HEAD探测:${b[1]}` : b[1]), missingGET: rec.bad.filter((b) => b[2] !== 'HEAD').length, reqFailedReal: rec.failedReal.length, headAborted: rec.failed.length - rec.failedReal.length, consoleFlag: rec.console.length, pageerror: rec.pageerror.length, kenneyReqs: rec.kenney.length, info: rec.info, census: rec.census, steps: rec.steps, secs: rec.secs };
  fs.writeFileSync(`${OUT}/${lv}.json`, JSON.stringify({ summary, ...rec }, null, 1));
  console.log(JSON.stringify(summary));
  await page.close();
}
await browser.close(); await server.close();
process.exit(0);
