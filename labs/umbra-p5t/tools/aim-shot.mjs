import { chromium } from 'playwright';
import { preview } from 'vite';
const server = await preview({ preview: { port: 4319, host: '127.0.0.1' } });
const browser = await chromium.launch({ args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
for (const [w,h] of [[844,390],[1280,720]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  await page.goto('http://127.0.0.1:4319/?speed=0.25&map=test-01'); await page.waitForFunction(() => window.__p5t && !window.__p5t.busy);
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => { window.__p5t.play([{ type: 'attack', kind: 'gun', attackerId: 'joker', targetId: 'mandrake' }, { type: 'damage', unitId: 'mandrake', amount: 42 }]); });
  await page.waitForTimeout(2200);
  await page.screenshot({ path: process.cwd() + `/shots/p5t-aim-${w}x${h}.png` });
  await page.close();
}
await browser.close(); server.httpServer.close();
