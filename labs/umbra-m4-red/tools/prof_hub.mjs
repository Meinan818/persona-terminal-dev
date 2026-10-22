// 据点空闲预加载的主线程影响：从进入据点起 12s 内的帧间隔（rAF），对比 prewarmex=0/1；再测首进潜入的转场中点与帧间隔
import { chromium } from 'playwright-core';
const Q = process.argv[2] ?? '';
const browser = await chromium.launch({ executablePath: '/workspace/work/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux-arm64/chrome-headless-shell', args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
const page = await (await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1 })).newPage();
await page.goto('http://127.0.0.1:8767/?res=0.5&auto=0&maxdt=400' + Q, { waitUntil: 'load' });
await page.waitForFunction(() => window.__flow && window.__flow.screen === 'hub', null, { timeout: 90000 });
await page.evaluate(() => { window.__gaps = []; let last = performance.now(); const f = () => { const n = performance.now(); window.__gaps.push(Math.round(n - last)); last = n; requestAnimationFrame(f); }; requestAnimationFrame(f); });
await page.waitForTimeout(12000);
const hub = await page.evaluate(() => { const g = window.__gaps; return { n: g.length, max: Math.max(...g), over100: g.filter((x) => x > 100).length, top: g.slice().sort((a, b) => b - a).slice(0, 5), pw: window.__flow.prewarmMs ?? null }; });
await page.evaluate(() => window.__flow.click('board')); await page.waitForTimeout(1200); await page.evaluate(() => window.__flow.click('accept'));
await page.waitForFunction(() => window.__flow.screen === 'hub', null, { timeout: 15000 }); await page.waitForTimeout(800);
await page.evaluate(() => { window.__gaps.length = 0; window.__flow.click('go'); });
await page.waitForFunction(() => (window.__flow.screen || '').startsWith('explore'), null, { timeout: 30000 }); await page.waitForTimeout(1500);
const enter = await page.evaluate(() => { const g = window.__gaps; const w = window.__flow.timings.filter((t) => t.ev === 'scene:wipe').slice(-1)[0]; return { build: w.build, wipe: w.ms, max: Math.max(...g), top: g.slice().sort((a, b) => b - a).slice(0, 5) }; });
console.log(JSON.stringify({ Q, hub, enter }));
await browser.close();
