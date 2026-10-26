// r16b：结算 Skull 枪朝向候选比对（8 种欧拉翻转截图 → /tmp/r16b/wp/f_*.png）
import { chromium } from 'playwright';
import { createServer } from 'vite';
const port = 4640 + Math.floor(Math.random() * 30);
const server = await createServer({ root: process.cwd(), server: { port, host: '127.0.0.1' }, logLevel: 'error' }); await server.listen();
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(`http://127.0.0.1:${port}/?speed=1&level=L01`);
await page.waitForFunction(() => window.__p5t && window.__p5t.started && window.__p5t.charsReady && !window.__p5t.busy, null, { timeout: 170000, polling: 500 });
await page.evaluate(() => window.__p5t.showResult(true)); await page.waitForTimeout(20000);
const P = Math.PI;
for (const [n, f] of [['none', [0, 0, 0]], ['x', [P, 0, 0]], ['y', [0, P, 0]], ['z', [0, 0, P]], ['xh', [P / 2, 0, 0]], ['xm', [-P / 2, 0, 0]], ['zh', [0, 0, P / 2]], ['zm', [0, 0, -P / 2]]]) {
  await page.evaluate((f) => { globalThis.__wpFlip = f; }, f); await page.waitForTimeout(900);
  await page.screenshot({ path: `/tmp/r16b/wp/f_${n}.png`, clip: { x: 150, y: 0, width: 400, height: 420 } });
}
await browser.close(); await server.close(); console.log('done');
