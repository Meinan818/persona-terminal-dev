import { chromium } from 'playwright';
import { preview } from 'vite';
const OUT = '/workspace/work/notes/shots/2026-10-24';
const server = await preview({ preview: { port: 4322, host: '127.0.0.1' } });
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errs = [];
for (const [w, h, tag] of [[844, 390, '844x390'], [1280, 720, '1280x720']]) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto('http://127.0.0.1:4322/?speed=1&level=L01');
  await page.waitForFunction(() => window.__p5t && !window.__p5t.busy, null, { timeout: 30000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/plaza-${tag}.png` });
  if (tag === '1280x720') {
    for (let i = 1; i <= 2; i++) {
      await page.evaluate(() => window.__p5t.rig.rotate?.(1));
      await page.waitForTimeout(4000);
      await page.screenshot({ path: `${OUT}/plaza-rot${i}-${tag}.png` });
    }
  }
  await page.close();
}
console.log('errors', errs);
await browser.close(); server.httpServer.close();
