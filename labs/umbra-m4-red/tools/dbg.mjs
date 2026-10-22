import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: '/workspace/work/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux-arm64/chrome-headless-shell', args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--enable-webgl'] });
const page = await (await browser.newContext({ viewport: { width: 844, height: 390 } })).newPage();
page.on('pageerror', (e) => console.log('ERR', String(e)));
await page.goto('http://127.0.0.1:8766/?res=0.25&auto=0', { waitUntil: 'load' });
await page.waitForFunction(() => window.__umbra && window.__umbra.mode === 'command' && !window.__umbra.busy, null, { timeout: 60000 });
await page.evaluate(() => { window.__umbra.dir.forceMinimal = true; window.__umbra.cmd('guard'); setTimeout(()=>{window.__umbra.enemy('noisy');window.__umbra.cmd('persona');setTimeout(()=>window.__umbra.row(0),300)},2500); });
for (let i = 0; i < 14; i++) { await page.waitForTimeout(500); console.log(await page.evaluate(() => JSON.stringify({ m: window.__umbra.mode, b: window.__umbra.busy, ev: window.__umbra.ev, t: window.__umbra.showT, log: window.__umbra.timing().slice(-3).map(r=>r.recipe+':'+r.wallMs+'/'+r.capMs+(r.forced?'F':'')), e: window.__M.errors.slice(-3) }))); }
await browser.close();
