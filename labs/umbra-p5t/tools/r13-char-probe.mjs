import { chromium } from 'playwright';
import { preview } from 'vite';
const server = await preview({ root: process.cwd(), preview: { port: 4399, host: '127.0.0.1' } });
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('console', (m) => { if (m.type() !== 'debug') console.log('C', m.type(), m.text().slice(0, 200)); });
page.on('requestfailed', (r) => console.log('FAIL', r.url()));
await page.goto('http://127.0.0.1:4399/?speed=1&level=L01');
for (let i = 0; i < 40; i++) {
  await page.waitForTimeout(2000);
  const s = await page.evaluate(() => { const P = window.__p5t; if (!P) return null; const r = P.rigs; return { size: r.size, ids: [...r.keys()], joker: r.get('joker') ? (r.get('joker').key ?? 'proc') : null, ready: P.charsReady, cover: document.getElementById('loadcover')?.className }; });
  console.log(i, JSON.stringify(s));
  if (s && s.ready) { for (let k=0;k<8;k++){ await page.waitForTimeout(1000); console.log(await page.evaluate(()=>window.__p5t.started+' '+window.__p5t.busy+' '+document.getElementById('loadcover').className)); } break; }
}
await page.screenshot({ path: '/tmp/jprobe.png' });
await browser.close(); await server.close();
