// M3 截图驱动：node tools/shots.mjs W H [dpr=1] [tag=] [states=1234567] [q=]
// 走真实流程：待机 → 技能列表 → cut-in(定格) → 1 MORE(定格) → HOLD UP → 总攻定格 → 结算
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const [W, H, ...rest] = process.argv.slice(2);
const opt = Object.fromEntries(rest.map((a) => [a.slice(0, a.indexOf('=')), a.slice(a.indexOf('=') + 1)]));
const dpr = +(opt.dpr ?? 1), tag = opt.tag ?? `${W}x${H}`, dirOut = opt.out ?? 'shots';
const want = (n) => !opt.states || opt.states.includes(String(n));
const base = opt.base ?? 'http://127.0.0.1:8766/';
const browser = await chromium.launch({
  executablePath: '/workspace/work/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux-arm64/chrome-headless-shell',
  args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'],
});
const ctx = await browser.newContext({ viewport: { width: +W, height: +H }, deviceScaleFactor: dpr, hasTouch: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
const T0 = Date.now(); const log = (s) => console.log(`[${((Date.now() - T0) / 1000).toFixed(1)}s] ${s}`);
await page.goto(base + `?maxdt=400&auto=0${opt.q ? '&' + opt.q : ''}`, { waitUntil: 'load' });
const until = (fn, arg, t = +(opt.wait ?? 90000)) => page.waitForFunction(fn, arg, { timeout: t, polling: 100 });
await until(() => window.__umbra && window.__umbra.mode === 'command' && !window.__umbra.busy);
log('ready');
const shot = async (n, name) => { await page.waitForTimeout(350); if (want(n)) { await page.screenshot({ path: `${dirOut}/${tag}-${n}-${name}.png` }); log('shot ' + name); } };
await shot(1, 'idle');
await page.evaluate(() => window.__umbra.cmd('persona'));
await page.waitForTimeout(300);
await shot(2, 'skilllist');
await page.evaluate(() => { window.__umbra.freezeOn('action', 300); window.__umbra.row(0); });
await until(() => window.__umbra.ev === 'action' && window.__umbra.showT >= 299);
await shot(3, 'cutin');
await page.evaluate(() => { window.__umbra.release(); window.__umbra.freezeOn('onemore', 280); });
await until(() => window.__umbra.ev === 'onemore' && window.__umbra.showT >= 279);
await page.waitForFunction(() => !window.__umbra.eng.fx.flash.visible, null, { timeout: 3000 }).catch(() => page.evaluate(() => { window.__umbra.eng.fx.flash.visible = false; }));  // 慢帧下定格与闪白同帧触发时闪白不再衰减；按时间轴 t=280 时闪白（140–210）早已结束   // 闪白结束后再拍（软件光栅慢帧会把闪白峰值帧留在截图里）
await shot(4, 'onemore');
await page.evaluate(() => window.__umbra.release());
await until(() => window.__umbra.mode === 'command' && !window.__umbra.busy);
await page.evaluate(() => { window.__umbra.enemy('echo'); window.__umbra.cmd('attack'); });
await until(() => window.__umbra.mode === 'holdup' && !window.__umbra.busy);
await shot(5, 'holdup');
await page.evaluate(() => { window.__umbra.freezeOn('allout', 2600); window.__umbra.cmd('allout'); });
await until(() => window.__umbra.ev === 'allout' && window.__umbra.showT >= 2599);
await shot(6, 'allout');
await page.evaluate(() => window.__umbra.release());
await until(() => window.__umbra.mode === 'result' && !window.__umbra.busy);
await page.waitForTimeout(1800);
await shot(7, 'result');
const info = await page.evaluate(() => ({ M: { boot: window.__M.boot, prewarm: window.__M.prewarmMs, rehearse: window.__M.rehearse, cold: window.__M.cold, errors: window.__M.errors, issues: window.__M.issues },
  timing: window.__umbra.timing(), counts: window.__umbra.counts(), vis: window.__umbra.vis(), sfx: window.__umbra.eng.sfxLog.length, engErr: window.__umbra.eng.errors }));
fs.writeFileSync(`tools/out/shots-${tag}.json`, JSON.stringify({ info, errors }, null, 1));
log(JSON.stringify({ errors: errors.slice(0, 8), counts: info.counts, engErr: info.engErr.slice(0, 5), issues: info.M.issues.filter((i) => i.level === 'error') }));
await browser.close();
