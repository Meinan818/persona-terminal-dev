// r9 过肩瞄准近景冲击波检查（只拍 Mona 开枪）。用法: node tools/r9-aim-shot.mjs outdir [prefix]
import { chromium } from 'playwright';
import { preview } from 'vite';
const OUT = process.argv[2] || '/tmp/r9'; const PRE = process.argv[3] || 'aim';
const server = await preview({ preview: { port: 4392, host: '127.0.0.1' } });
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('ERR', String(e)));
await page.goto('http://127.0.0.1:4392/?speed=1&level=L01');
await page.waitForFunction(() => window.__p5t && !window.__p5t.busy && window.__p5t.sceneKit.ready && window.__p5t.rigs.size >= 5, null, { timeout: 90000 });
const P = (code) => page.evaluate(`(async()=>{const P=window.__p5t;${code}})()`);
await P("const u=P.battle.unit('e1'); u.pos={x:3,y:8}; u.hp=50; u.maxHp=50; await P.play([]);");
await P("P.select('mona')"); await page.waitForTimeout(200);
await P("P.tap({tile:{x:6,y:9}})"); await page.waitForTimeout(200);
await P("P.setMode('gun');P.tap({unit:'e1'})"); await page.waitForTimeout(200);
await P("P.tap({unit:'e1'})");
const t0 = Date.now(); let i = 0;
while (Date.now() - t0 < 5000 && i < 16) { await page.waitForTimeout(90); await page.screenshot({ path: `${OUT}/${PRE}-${String(i++).padStart(2, '0')}.png` }); }
await browser.close(); await server.close();
