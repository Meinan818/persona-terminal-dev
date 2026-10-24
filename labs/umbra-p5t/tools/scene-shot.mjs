// 关卡场景截图：LV=L01,L02… ；每关整图 1280x720 + 844x390 一张 + 旋转 180° 一张（ROT=1）
import { chromium } from 'playwright';
import { preview } from 'vite';
const OUT = process.env.OUT || '/workspace/work/notes/shots/2026-10-25';
const PFX = process.env.PFX || 'scene';
const LVS = (process.env.LV || 'L01').split(',');
const server = await preview({ preview: { port: 4323, host: '127.0.0.1' } });
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errs = [];
const sizes = process.env.SMALL ? [[844, 390]] : process.env.BIG ? [[1280, 720]] : [[1280, 720], [844, 390]];
for (const lv of LVS) for (const [w, h] of sizes) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: w > 1000 ? 1 : 2 });
  page.on('pageerror', (e) => errs.push(lv + ' ' + String(e)));
  page.on('console', (m) => { if ((m.type() === 'warning' || m.type() === 'error') && !m.text().includes('GL Driver')) errs.push(lv + ' ' + m.text()); });
  await page.goto(`http://127.0.0.1:4323/?speed=1&level=${lv}`);
  await page.waitForFunction(() => window.__p5t && !window.__p5t.busy && window.__p5t.sceneKit.ready, null, { timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1200);
  const t0 = Date.now(); await page.evaluate(() => new Promise((r) => { let n = 0; const f = () => (++n < 10 ? requestAnimationFrame(f) : r()); requestAnimationFrame(f); }));
  const info = await page.evaluate(() => window.__p5t.renderInfo?.());
  console.log(lv, `${w}x${h}`, '10 frames ms', Date.now() - t0, JSON.stringify(info));
  await page.screenshot({ path: `${OUT}/${PFX}-${lv}-${w}x${h}.png` });
  if (process.env.ROT && w > 1000) {
    await page.evaluate(() => { window.__p5t.rig.rotate(1); window.__p5t.rig.rotate(1); });
    await page.waitForTimeout(3500);
    await page.screenshot({ path: `${OUT}/${PFX}-${lv}-rot180.png` });
  }
  await page.close();
}
console.log('errors', errs.slice(0, 10));
await browser.close(); server.httpServer.close();
