import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/workspace/work/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux-arm64/chrome-headless-shell', args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
p.on('pageerror', (e) => console.log('PAGEERR', String(e)));
p.on('console', (m) => console.log('CONSOLE', m.type(), m.text().slice(0, 300)));
await p.goto('http://127.0.0.1:8766/?maxdt=400&auto=0', { waitUntil: 'load' });
await p.waitForTimeout(25000);
console.log(await p.evaluate(() => JSON.stringify({ u: !!window.__umbra, mode: window.__umbra?.mode, err: window.__umbra?.eng.errors, M: window.__M?.issues?.filter((i) => i.level === 'error') })));
await b.close();
