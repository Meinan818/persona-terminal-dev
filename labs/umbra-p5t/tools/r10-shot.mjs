// r10 截图：node tools/r10-shot.mjs OUT.png [level=L01] 'JS代码'...（每段代码后等 400ms；P=window.__p5t；代码里 SHOT:name 存一张中间图）
import { chromium } from 'playwright';
import { preview } from 'vite';
const [OUT, LV = 'L01', ...steps] = process.argv.slice(2);
const port = 4400 + Math.floor(Math.random() * 40);
const server = await preview({ preview: { port, host: '127.0.0.1' } });
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: +(process.env.W || 1280), height: +(process.env.H || 720) } });
page.on('pageerror', (e) => console.log('ERR', String(e)));
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('GL Driver')) console.log('CERR', m.text()); if (m.type() === 'log' && m.text().startsWith('[r10]')) console.log(m.text()); });
await page.goto(`http://127.0.0.1:${port}/?speed=1&level=${LV}${process.env.Q || ''}`);
await page.waitForFunction(() => window.__p5t && !window.__p5t.busy && window.__p5t.sceneKit.ready && window.__p5t.rigs.size >= 3, null, { timeout: 120000, polling: 300 });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(2500);
for (const s of steps) {
  if (s.startsWith('SHOT:')) { await page.screenshot({ path: s.slice(5) }); continue; }
  if (s.startsWith('WAIT:')) { await page.waitForTimeout(+s.slice(5)); continue; }
  const r = await page.evaluate(`(async()=>{const P=window.__p5t;${s}})()`);
  if (r !== undefined) console.log('=>', JSON.stringify(r));
  await page.waitForTimeout(400);
}
await page.screenshot({ path: OUT });
await browser.close(); await server.close();
