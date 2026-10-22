import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: '/workspace/work/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux-arm64/chrome-headless-shell', args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
const page = await (await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1 })).newPage();
page.on('pageerror', (e) => console.log('ERR', String(e)));
await page.goto('http://127.0.0.1:8767/?res=0.5&auto=0&maxdt=400&fastwin=1');
await page.waitForFunction(() => window.__flow?.screen === 'hub', null, { timeout: 90000 }); await page.waitForTimeout(800);
await page.evaluate(() => { const F = window.__flow; F.click('board'); });
await page.waitForTimeout(1500); await page.evaluate(() => window.__flow.click('req:r2')); await page.waitForTimeout(300); await page.evaluate(() => window.__flow.click('accept')); await page.waitForTimeout(1500);
await page.evaluate(() => window.__flow.click('card')); await page.waitForTimeout(1500); await page.evaluate(() => window.__flow.click('send')); await page.waitForTimeout(4500); await page.evaluate(() => window.__flow.click('go')); await page.waitForTimeout(3000);
const ev = (f, a) => Promise.race([page.evaluate(f, a), new Promise((r) => setTimeout(() => r('EVAL-TIMEOUT'), 5000))]);
const st = () => ev(() => { const F = window.__flow, ex = F.run.explore; return JSON.stringify({ s: F.screen, pos: ex?.pos, foes: ex?.foes.map((f) => [f.id, f.at, f.facing, f.alive]), gate: ex?.gateOpen, err: F.errors }); });
console.log(await st());
for (const t of [[7, 0], [7, 0], [8, 4], [8, 4]]) {
  console.log('tap', t, await ev(([x, y]) => { const ex = window.__flow.run.explore; return JSON.stringify(ex.pathTo([x, y])); }, t));
  await ev(([x, y]) => window.__flow.tap(x, y), t);
  for (let i = 0; i < 6; i++) { await page.waitForTimeout(700); console.log(await st()); }
  if (await ev(() => window.__flow.screen) === 'card') { console.log('shooting'); const r = await Promise.race([page.screenshot({ path: 'work/card.png' }).then(() => 'ok'), new Promise((r) => setTimeout(() => r('SHOT-TIMEOUT'), 20000))]); console.log('shot', r); }
  await ev(() => window.__flow.screen === 'card' && window.__flow.click('0'));
}
await browser.close();
