// r16c：结算两页在原版同一时刻截图（+ IoU 用的 key / noband 两张调试帧 + 头部框）。
//   第 1 页 = ResultIn 后 3.53s；翻页 = ResultIn 后 5.83s；第 2 页 = 翻页后 1.95s；ResultIn = showResult 后 1.32s（0.12s 擦入 + 1.2s 纯红）。
//   node tools/r16c-shot.mjs A|B   → $OUT/<S>_p1.png, <S>_p1_key.png, <S>_p1_noband.png, <S>_p2*.png, <S>_heads.json
import { chromium } from 'playwright';
import { createServer } from 'vite';
import fs from 'node:fs';
const SC = process.argv[2] || 'A';
const OUT = process.env.OUT || '/tmp/r16c/shot'; fs.mkdirSync(OUT, { recursive: true });
const port = 4760 + Math.floor(Math.random() * 30);
const server = await createServer({ server: { port, host: '127.0.0.1', hmr: false, watch: { ignored: ['**/*'] } }, logLevel: 'error' }); await server.listen();
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('ERR', String(e)));
await page.addInitScript({ path: new URL('./rec-r16b/vclock.js', import.meta.url).pathname });
await page.addInitScript(() => { window.__ff = true; });
await page.goto(`http://127.0.0.1:${port}/?speed=1&level=L01${SC === 'B' ? '&rsfront=joker&rsparty=joker,mona' : ''}`);
await page.waitForFunction(() => window.__p5t && window.__p5t.started && window.__p5t.charsReady && !window.__p5t.busy, null, { timeout: 400000, polling: 500 });
await page.waitForFunction(() => window.__p5t.sceneKit.ready, null, { timeout: 60000, polling: 300 }).catch(() => console.log('WARN sceneKit'));
await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(800);
await page.evaluate(() => window.__vc.setAuto(false));
await page.evaluate(() => { window.__ff = false; });
console.log('loaded');
const step = async (ms) => { for (let t = 0; t < ms; t += 1000 / 30) await page.evaluate((d) => window.__vc.step(d), Math.min(1000 / 30, ms - t)); };
const freeze = () => page.evaluate(() => window.__vc.step(0));
async function trio(tag) {
  await freeze(); await page.screenshot({ path: `${OUT}/${SC}_${tag}.png` });
  for (const m of ['key', 'noband']) { await page.evaluate((m) => { window.__rsDbg = m; }, m); await freeze(); await page.screenshot({ path: `${OUT}/${SC}_${tag}_${m}.png` }); }
  await page.evaluate(() => { window.__rsDbg = null; }); await freeze();
  return page.evaluate(() => window.__rsHead());
}
const heads = {};
await page.evaluate(() => window.__p5t.showResult(true));
await step(1320 + 3530);
heads.p1 = await trio('p1');
await step(5830 - 3530);
await page.evaluate(() => window.__p5t.resultNext());
await step(1950);
heads.p2 = await trio('p2');
fs.writeFileSync(`${OUT}/${SC}_heads.json`, JSON.stringify(heads));
console.log(JSON.stringify(heads));
await browser.close(); await server.close();
