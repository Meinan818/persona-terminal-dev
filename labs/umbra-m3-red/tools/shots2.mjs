// M3 第二阶段截图：node tools/shots2.mjs W H [dpr=1] [tag=] [set=main|party|showtime|all]
// main：待机 → 技能列表 → 召唤序列（6 帧）→ 施法命中 → 1 MORE（去色+眼部横条）→ BATON 选人 → 交接 → 龙司回合 → 龙司召唤 → HOLD UP → 总攻 → 结算+LEVEL UP
// party：?party=queen,fox,noir 换队后待机；showtime：SHOWTIME 4 帧
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const [W, H, ...rest] = process.argv.slice(2);
const opt = Object.fromEntries(rest.map((a) => [a.slice(0, a.indexOf('=')), a.slice(a.indexOf('=') + 1)]));
const dpr = +(opt.dpr ?? 1), tag = opt.tag ?? `${W}x${H}`, dirOut = opt.out ?? 'shots', set = opt.set ?? 'all';
const base = opt.base ?? 'http://127.0.0.1:8766/';
const browser = await chromium.launch({
  executablePath: '/workspace/work/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux-arm64/chrome-headless-shell',
  args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'],
});
const T0 = Date.now(); const log = (s) => console.log(`[${((Date.now() - T0) / 1000).toFixed(1)}s] ${s}`);
const out = { errors: [], engErr: [], timing: [] };
async function open(q = '') {
  const ctx = await browser.newContext({ viewport: { width: +W, height: +H }, deviceScaleFactor: dpr, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => out.errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') out.errors.push(m.text()); });
  await page.goto(base + `?maxdt=400&auto=0${q ? '&' + q : ''}`, { waitUntil: 'load' });
  const until = (fn, arg, t = +(opt.wait ?? 100000)) => page.waitForFunction(fn, arg, { timeout: t, polling: 100 });
  await until(() => window.__umbra && window.__umbra.mode === 'command' && !window.__umbra.busy);
  const shot = async (name, settle = 300) => { await page.waitForTimeout(settle); await page.screenshot({ path: `${dirOut}/${tag}-${name}.png` }); log('shot ' + name); };
  const freeze = async (ev, t) => { await page.evaluate(([e, x]) => window.__umbra.freezeOn(e, x), [ev, t]); await until(([e, x]) => window.__umbra.ev === e && window.__umbra.showT >= x - 1, [ev, t]); };
  const rel = () => page.evaluate(() => window.__umbra.release());
  const idle = (m = 'command') => until((mm) => window.__umbra.mode === mm && !window.__umbra.busy, m);
  return { page, ctx, until, shot, freeze, rel, idle };
}
if (set === 'all' || set === 'main') {
  const { page, ctx, shot, freeze, rel, idle } = await open();
  await shot('01-idle');
  await page.evaluate(() => { window.__umbra.enemy('noisy'); window.__umbra.cmd('persona'); });
  await shot('02-skilllist');
  await page.evaluate(() => { window.__umbra.freezeOn('action', 90); window.__umbra.row(0); window.__umbra.row(0); });
  for (const [t, n] of [[90, 'a-in'], [230, 'b-grab'], [330, 'c-rip'], [420, 'd-flame'], [600, 'e-rise'], [760, 'f-full'], [1050, 'g-cast'], [1230, 'h-hit']]) {
    await freeze('action', t); await shot(`03-summon-${n}`, 120);
  }
  await rel(); await freeze('onemore', 210); await shot('04-onemore', 120); await rel();
  await idle();
  await page.evaluate(() => window.__umbra.cmd('baton')); await shot('05-baton-pick');
  await page.evaluate(() => { window.__umbra.freezeOn('baton', 300); window.__umbra.party('skull'); });
  await freeze('baton', 300); await shot('06-baton', 120); await rel();
  await idle(); await shot('07-skull-turn', 500);
  await page.evaluate(() => { window.__umbra.enemy('echo'); window.__umbra.cmd('persona'); });
  await shot('08-skull-list');
  await page.evaluate(() => { window.__umbra.freezeOn('action', 420); window.__umbra.row(1); window.__umbra.row(1); });
  await freeze('action', 420); await shot('09-skull-summon', 120); await rel();
  await idle('holdup'); await shot('10-holdup');
  await page.evaluate(() => { window.__umbra.freezeOn('allout', 2600); window.__umbra.cmd('allout'); });
  await freeze('allout', 2600); await shot('11-allout', 120); await rel();
  await idle('result'); await shot('12-result', 2600);
  const info = await page.evaluate(() => ({ timing: window.__umbra.timing(), engErr: window.__umbra.eng.errors, issues: window.__M.issues.filter((i) => i.level === 'error'), counts: window.__umbra.counts() }));
  out.timing.push(...info.timing); out.engErr.push(...info.engErr); out.issues = info.issues; out.counts = info.counts;
  await ctx.close();
}
if (set === 'all' || set === 'party') {
  const { page, ctx, shot } = await open('party=queen,fox,noir');
  await page.waitForTimeout(1500);
  await shot('13-party-queen-fox-noir', 500);
  await page.evaluate(() => { window.__umbra.cmd('order'); });
  await page.waitForTimeout(300); await page.evaluate(() => { window.__umbra.row(1); window.__umbra.row(1); });
  await shot('14-switch-list', 600);
  out.engErr.push(...(await page.evaluate(() => window.__umbra.eng.errors)));
  await ctx.close();
}
if (set === 'all' || set === 'showtime') {
  const { page, ctx, shot, freeze, rel } = await open();
  await page.evaluate(async () => {
    const U = window.__umbra; await U.eng.loadGroup('show:mona-panther'); await U.eng.loadGroup('char:mona'); await U.eng.loadGroup('char:panther');
    U.B.u('noisy').hp = 300; U.B.actor = 'mona';
    const r = U.B.showtime(['mona', 'panther']); U.hud.setMode('hidden');
    U.freezeOn('highlight', 350); U.dir.play('highlight', r.payload, {});
  });
  for (const [t, n] of [[350, 'a-logo'], [1000, 'b-cutins'], [1750, 'c-card'], [2700, 'd-total']]) { await freeze('highlight', t); await shot(`15-showtime-${n}`, 120); }
  await rel();
  out.engErr.push(...(await page.evaluate(() => window.__umbra.eng.errors)));
  await ctx.close();
}
fs.writeFileSync(`tools/out/shots2-${tag}.json`, JSON.stringify(out, null, 1));
log(JSON.stringify({ errors: out.errors.slice(0, 8), engErr: [...new Set(out.engErr)].slice(0, 10), issues: out.issues }));
await browser.close();
