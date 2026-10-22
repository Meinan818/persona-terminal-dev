// Playwright driver for the spike. node tools/pw.mjs <mode> <W> <H> [opts]
//  mode=shots : screenshots (idle / transition / cut-in / impact / all-out freeze) + input-mapping test
//  mode=perf  : demo loop under CPU throttling, dumps frames JSON to tools/out/
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const [mode, W, H, ...rest] = process.argv.slice(2);
const opt = Object.fromEntries(rest.map((a) => [a.slice(0, a.indexOf('=')), a.slice(a.indexOf('=') + 1)]));
const dpr = +(opt.dpr ?? 2), rate = +(opt.rate ?? 1), secs = +(opt.secs ?? 40), extra = opt.q ?? '';
const tag = opt.tag ?? `${W}x${H}`;
const base = opt.base ?? 'http://127.0.0.1:8765/';
const exe = 'chromium_headless_shell-1248';
const browser = await chromium.launch({
  executablePath: `/workspace/work/ms-playwright/${exe}/chrome-headless-shell-linux-arm64/chrome-headless-shell`,
  args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-vsync=false'],
});
const ctx = await browser.newContext({ viewport: { width: +W, height: +H }, deviceScaleFactor: dpr, hasTouch: true, isMobile: false });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
const out = {};
if (mode === 'shots') {
  await page.goto(base + (extra ? `?${extra}` : ''), { waitUntil: 'load' });
  await page.waitForFunction(() => window.__umbra && !window.__umbra.busy, null, { timeout: 60000 });
  await page.waitForTimeout(600);
  const dir = 'shots';
  const shot = async (name) => page.screenshot({ path: `${dir}/${tag}-${name}.png` });
  if (!opt.only || opt.only.split(',').includes('1')) await shot('1-idle');
  const only = opt.only ? opt.only.split(',') : null;
  const frozen = async (fn, t, name) => {
    if (only && !only.includes(name[0])) return;
    await page.evaluate((t) => window.__umbra.freeze(t), t);
    await page.evaluate(fn);
    await page.waitForFunction((t) => window.__umbra.showTime() >= t - 1, t, { timeout: 30000 });
    await page.waitForTimeout(250);
    await shot(name);
    await page.evaluate(() => window.__umbra.freeze(-1));
    await page.waitForFunction(() => !window.__umbra.busy, null, { timeout: 30000 });
    await page.waitForTimeout(300);
  };
  await frozen(() => window.__umbra.playTransition(), 330, '2-transition');
  await frozen(() => window.__umbra.playSkill(), 260, '3-cutin');
  await frozen(() => window.__umbra.playSkill(), 800, '4-impact');
  await frozen(() => window.__umbra.playAllOut(), 1300, '5-allout-mid');
  await frozen(() => window.__umbra.playAllOut(), 2600, '6-allout-freeze');
  out.M = await page.evaluate(() => ({ boot: window.__M.bootMs, load: window.__M.loadMs, prewarm: window.__M.prewarmMs, gl: window.__M.glRenderer, ev: window.__M.events.slice(-2) }));
} else if (mode === 'input') {
  await page.goto(base + (extra ? `?${extra}` : ''), { waitUntil: 'load' });
  await page.waitForFunction(() => window.__umbra && !window.__umbra.busy, null, { timeout: 60000 });
  // input mapping: tap every button at its on-screen position
  const res = [];
  for (let i = 0; i < 5; i++) {
    const b = await page.evaluate((i) => window.__umbra.buttonScreen(i), i);
    const d = await page.evaluate((i) => window.__umbra.buttonDesign(i), i);
    const back = await page.evaluate(([x, y]) => window.__umbra.screenToDesign(x, y), [b.x, b.y]);
    const before = await page.evaluate(() => window.__M.taps.length);
    // edge of button (r-4 design px towards screen-right) must also hit
    await page.touchscreen.tap(b.x, b.y);
    await page.waitForTimeout(80);
    const taps = await page.evaluate(() => window.__M.taps.slice());
    res.push({ label: b.label, screen: [+b.x.toFixed(1), +b.y.toFixed(1)], design: [+d.x.toFixed(1), +d.y.toFixed(1)], mappedBack: [+back.x.toFixed(1), +back.y.toFixed(1)], hit: taps.length > before && taps[taps.length - 1] === b.label });
    await page.waitForFunction(() => !window.__umbra.busy, null, { timeout: 60000, polling: 200 });
  }
  // main button logical diameter in CSS px on this screen
  const scale = await page.evaluate(() => { const a = window.__umbra.designToScreen(0, 0), b = window.__umbra.designToScreen(100, 0); return Math.hypot(b.x - a.x, b.y - a.y) / 100; });
  out.input = res; out.cssPerDesignPx = +scale.toFixed(4); out.mainBtnCssDiameter = +(96 * scale).toFixed(1);
} else if (mode === 'perf') {
  const cdp = await ctx.newCDPSession(page);
  if (rate > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate });
  await page.goto(base + `?demo=1${extra ? '&' + extra : ''}`, { waitUntil: 'load', timeout: 90000 });
  await page.waitForFunction(() => window.__M && window.__M.frames.length > 0, null, { timeout: 90000 });
  await page.waitForTimeout(secs * 1000);
  out.M = await page.evaluate(() => window.__M);
  out.qchanges = await page.evaluate(() => window.__umbra.quality.changes);
}
out.errors = errors; out.tag = tag; out.dpr = dpr; out.rate = rate; out.viewport = [+W, +H]; out.extra = extra;
fs.writeFileSync(`tools/out/${mode}-${tag}.json`, JSON.stringify(out));
console.log(JSON.stringify({ ...out, M: mode === 'perf' ? { frames: out.M.frames.length, loops: out.M.loops, firstSkillMaxDt: out.M.firstSkillMaxDt, boot: out.M.bootMs, prewarm: out.M.prewarmMs, gl: out.M.glRenderer } : out.M }, null, 0));
await browser.close();
