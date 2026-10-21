import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: '/workspace/work/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux-arm64/chrome-headless-shell', args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--enable-webgl'] });
const page = await (await browser.newContext({ viewport: { width: 844, height: 390 } })).newPage();
page.on('pageerror', (e) => console.log('ERR', String(e)));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('CON', m.text()); });
await page.goto('http://127.0.0.1:8766/?res=0.25&auto=0' + (process.argv[2] ?? ''), { waitUntil: 'load' });
await page.waitForFunction(() => window.__umbra && window.__umbra.mode === 'command' && !window.__umbra.busy, null, { timeout: 60000 });
const st = () => page.evaluate(() => JSON.stringify({ m: window.__umbra.mode, b: window.__umbra.busy, ev: window.__umbra.ev, t: Math.round(window.__umbra.showT), actor: window.__umbra.B.actor, om: window.__umbra.B.oneMore, bt: window.__umbra.B.batonTargets(), log: window.__umbra.timing().slice(-2).map(r=>r.recipe+':'+Math.round(r.wallMs)+'/'+r.capMs+(r.forced?'F':'')), e: window.__umbra.eng.errors.slice(-3) }));
const steps = JSON.parse(process.argv[3] ?? '[]');
for (const s of steps) { await page.evaluate(s); for (let i = 0; i < 6; i++) { await page.waitForTimeout(400); console.log(await st()); } }
await browser.close();
