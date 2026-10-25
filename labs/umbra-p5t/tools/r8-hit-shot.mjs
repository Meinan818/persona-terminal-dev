// r8 打击感检查截图（实时）：L01 Skull 近战 / Mona 开枪，命中前后连拍。用法: node tools/r8-hit-shot.mjs [outdir]
import { chromium } from 'playwright';
import { preview } from 'vite';
const OUT = process.argv[2] || '/tmp/r8';
const server = await preview({ preview: { port: 4391, host: '127.0.0.1' } });
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('ERR', String(e)));
await page.goto('http://127.0.0.1:4391/?speed=1&level=L01');
await page.waitForFunction(() => window.__p5t && !window.__p5t.busy && window.__p5t.sceneKit.ready && window.__p5t.rigs.size >= 5, null, { timeout: 90000 });
await page.waitForTimeout(1500);
const P = (code) => page.evaluate(`(async()=>{const P=window.__p5t;${code}})()`);
await P("const u=P.battle.unit('e1'); u.pos={x:3,y:8}; u.hp=50; u.maxHp=50; await P.play([]);");
await page.mouse.wheel(0, -240); await page.waitForTimeout(600);
await P("P.select('skull')"); await page.waitForTimeout(300);
await P("P.tap({tile:{x:3,y:9}})"); await page.waitForTimeout(300);
await P("P.setMode('melee');P.tap({unit:'e1'})"); await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/hit-forecast.png` });
await P("P.tap({unit:'e1'})");
for (let i = 0; i < 14; i++) { await page.waitForTimeout(120); await page.screenshot({ path: `${OUT}/hit-m${String(i).padStart(2, '0')}.png` }); }
await page.waitForFunction(() => !window.__p5t.busy, null, { timeout: 30000 });
await P("P.select('mona')"); await page.waitForTimeout(300);
await P("P.tap({tile:{x:6,y:9}})"); await page.waitForTimeout(300);
await P("P.setMode('gun');P.tap({unit:'e1'})"); await page.waitForTimeout(300);
await P("P.tap({unit:'e1'})");
for (let i = 0; i < 18; i++) { await page.waitForTimeout(120); await page.screenshot({ path: `${OUT}/hit-g${String(i).padStart(2, '0')}.png` }); }
console.log(JSON.stringify(await page.evaluate(() => ({ info: window.__p5t.renderInfo(), sfx: (window.__sfxLog || []).map((e) => e.name) }))));
await browser.close(); await server.close();
