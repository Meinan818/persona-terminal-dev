// r7 原版地图对齐检查截图：每关 整图俯视 + 叠格子；近景默认画面。用法: npx vite build && node tools/r7-map-shot.mjs [L01,L02]
import { chromium } from 'playwright';
import { preview } from 'vite';
const OUT = process.env.OUT || '/workspace/work/notes/shots/2026-10-26';
const PFX = process.env.PFX || 'r7-map'; // r9: PFX=r9-before / r9-after
const LV = (process.argv[2] || 'L01,L02,L03,L04,L05,L06,L08').split(',');
const MODES = (process.env.MODES || 'grid,plain,default').split(',');
const server = await preview({ preview: { port: 4343, host: '127.0.0.1' } });
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const W = +(process.env.W || 1280), H = +(process.env.H || 720);
const stats = {};
for (const lv of LV) {
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  page.on('pageerror', (e) => console.log('ERR', lv, String(e)));
  page.on('console', (m) => { if (m.type() === 'warning' || m.type() === 'error') console.log('console', lv, m.text().slice(0, 200)); });
  await page.goto(`http://127.0.0.1:4343/?speed=1&level=${lv}`);
  await page.waitForFunction(() => window.__p5t && !window.__p5t.busy && window.__p5t.sceneKit.ready && window.__p5t.rigs.size >= window.__p5t.battle.units.filter((u) => !u.prop && !u.ko).length, null, { timeout: 150000 });
  await page.waitForTimeout(1500);
  if (MODES.includes('default')) await page.screenshot({ path: `${OUT}/${PFX}-${lv}-default.png` });
  stats[lv] = await page.evaluate(() => window.__p5t.renderInfo());
  await page.evaluate(() => { const r = window.__p5t.rig; r.userZoom = 1; r.focus(null, 1); r.cur = { ...r.tgt }; r.apply(); });
  await page.waitForTimeout(400);
  stats[lv].overview = await page.evaluate(() => window.__p5t.renderInfo());
  if (MODES.includes('plain')) await page.screenshot({ path: `${OUT}/${PFX}-${lv}-overview.png` });
  if (MODES.includes('grid')) { await page.evaluate(() => window.__p5t.gridOverlay(true)); await page.waitForTimeout(300); await page.screenshot({ path: `${OUT}/${PFX}-${lv}-grid.png` }); }
  await page.close();
}
console.log(JSON.stringify(stats, null, 1));
await browser.close(); await server.close();
