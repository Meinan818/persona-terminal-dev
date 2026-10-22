import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: '/workspace/work/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux-arm64/chrome-headless-shell', args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
const page = await (await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1 })).newPage();
const Q = process.argv[2] ?? '';
await page.goto('http://127.0.0.1:8767/?res=0.5&auto=0&maxdt=400' + Q, { waitUntil: 'load' });
await page.waitForFunction(() => window.__flow && (window.__flow.prewarmMs > 0 || window.__flow.screen === 'hub'), null, { timeout: 60000 }); await page.waitForTimeout(9000);
console.log(await page.evaluate(() => JSON.stringify({ pw: window.__flow.prewarmMs, st: window.__flow.prewarmSteps, b: window.__flow.buildSteps })));
console.log('maxdt during hub/prewarm', await page.evaluate(() => { const f = window.__M.frames.map((x) => x.dt); return JSON.stringify({ n: f.length, max: Math.max(...f), top: f.slice().sort((a, b) => b - a).slice(0, 6) }); }));
// 对照：首进潜入的转场中点构建
await page.evaluate(() => window.__flow.click('board')); await page.waitForTimeout(1500); await page.evaluate(() => window.__flow.click('req:r1')); await page.waitForTimeout(300); await page.evaluate(() => window.__flow.click('accept'));
await page.waitForFunction(() => window.__flow.screen === 'hub', null, { timeout: 15000 }); await page.waitForTimeout(800);
await page.evaluate(() => { window.__M.frames.length = 0; window.__flow.click('go'); });
await page.waitForFunction(() => (window.__flow.screen || '').startsWith('explore'), null, { timeout: 30000 }); await page.waitForTimeout(1500);
console.log('enter explore', await page.evaluate(() => { const f = window.__M.frames.map((x) => x.dt); const w = window.__flow.timings.filter((t) => t.ev === 'scene:wipe').slice(-1)[0]; return JSON.stringify({ wipe: w, max: Math.max(...f), top: f.slice().sort((a, b) => b - a).slice(0, 5) }); }));
await browser.close();
