// r16b 结算自查：node tools/r16b-result-shot.mjs [variantsJson]  —— 用 vite dev（不需 build），一次加载多组 __rsT 参数截图
import { chromium } from 'playwright';
import { createServer } from 'vite';
import fs from 'node:fs';
const OUT = process.env.OUT || '/tmp/r16b/shots';
fs.mkdirSync(OUT, { recursive: true });
const VARS = process.argv[2] ? JSON.parse(fs.readFileSync(process.argv[2], 'utf8')) : [{ name: 'base' }];
const port = 4560 + Math.floor(Math.random() * 30);
const server = await createServer({ server: { port, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('ERR', String(e)));
await page.goto(`http://127.0.0.1:${port}/?speed=1&level=L01${process.env.QS || ''}`);
await page.waitForFunction(() => window.__p5t && window.__p5t.started && window.__p5t.charsReady && !window.__p5t.busy, null, { timeout: 170000, polling: 500 });
await page.waitForTimeout(1000);
const P = (code) => page.evaluate(`(async()=>{const P=window.__p5t;${code}})()`);
await P("P.showResult(true)");
await page.waitForTimeout(+(process.env.W1 || 9000));
for (const v of VARS) {
  if (v.p1) await P(`Object.assign(window.__rsT[1], ${JSON.stringify(v.p1)})`);
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/${v.name}_p1.png` }); console.log('p1', JSON.stringify(await page.evaluate(() => window.__rsProbe?.())));
}
await P("P.resultNext()"); await page.waitForTimeout(+(process.env.W2 || 7000));
for (const v of VARS) {
  if (v.p2) await P(`Object.assign(window.__rsT[2], ${JSON.stringify(v.p2)})`);
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/${v.name}_p2.png` }); console.log('p2', JSON.stringify(await page.evaluate(() => window.__rsProbe?.())));
}
await browser.close(); await server.close();
console.log('done');
