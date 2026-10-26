// r15 自查截图：指令菜单 / 过肩瞄准 / 结算（第 1 页入场后 + 第 2 页）。node tools/r15-shots.mjs [which=cmd,aim,result]
import { chromium } from 'playwright';
import { preview } from 'vite';
import fs from 'node:fs';
const WHICH = (process.argv[2] || 'cmd,aim,result').split(',');
const OUT = process.env.OUT || '/workspace/work/notes/r15/shots';
fs.mkdirSync(OUT, { recursive: true });
const port = 4460 + Math.floor(Math.random() * 30);
const server = await preview({ preview: { port, host: '127.0.0.1' } });
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('ERR', String(e), e.stack));
await page.goto(`http://127.0.0.1:${port}/?speed=1&level=L01`);
await page.waitForFunction(() => window.__p5t && window.__p5t.started && window.__p5t.charsReady && !window.__p5t.busy, null, { timeout: 150000, polling: 500 });
await page.evaluate(async () => { const P = window.__p5t, B = P.battle, a = B.unit('e1'); B.map.events = []; a.pos = { x: 6, y: 8 }; a.guard = false; await P.play([]); });
await page.waitForTimeout(1500);
const P = (code) => page.evaluate(`(async()=>{const P=window.__p5t;${code}})()`);
if (WHICH.includes('cmd')) {
  await P("P.select('joker')"); await page.waitForTimeout(600);
  await P("P.tap({tile:{x:6,y:11}})"); await page.waitForTimeout(500); await P("P.tap({tile:{x:6,y:11}})");
  await page.waitForTimeout(4000);
  await page.screenshot({ path: `${OUT}/cmd.png` });
}
if (WHICH.includes('aim')) {
  await P("document.querySelector('#cmd .gun')?.click()"); await page.waitForTimeout(800);
  await P("P.tap({unit:'e1'})"); await page.waitForTimeout(400);
  await P("P.fx.aimShot('joker','e1',false)"); await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/aim.png` });
  await P("P.fx.endAim(0)"); await page.waitForTimeout(500);
}
if (WHICH.includes('result')) {
  await P("P.showResult(true)");
  for (const t of [600, 1500, 3000]) { await page.waitForTimeout(t === 600 ? 600 : t - 600); await page.screenshot({ path: `${OUT}/result_${t}.png` }); }
  await page.waitForTimeout(1500);
  await P("P.resultNext()"); await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/result_p2.png` });
}
await browser.close(); await server.close();
