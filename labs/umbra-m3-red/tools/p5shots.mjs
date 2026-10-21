// M3 第五阶段关键帧：node tools/p5shots.mjs W H [set=idle,summon,holdup,start,showtime,attack] [out=shots5] [who=queen+mona]
// idle：待机镜头环绕两个相位；summon：推近→扯面具→拉远仰拍人格面具；holdup：环绕镜头 + 包围构图 + 菜单；start：开战 d-panels 后镜头落位；
// showtime：入场镜头 / 合击镜头；attack：普攻与魔法施法镜头
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const [W, H, ...rest] = process.argv.slice(2);
const opt = Object.fromEntries(rest.map((a) => [a.slice(0, a.indexOf('=')), a.slice(a.indexOf('=') + 1)]));
const sets = (opt.set ?? 'idle,summon,holdup,start,showtime,attack').split(','), out = opt.out ?? 'shots5', tag = `${W}x${H}`;
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  executablePath: '/workspace/work/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux-arm64/chrome-headless-shell',
  args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'],
});
const T0 = Date.now(); const log = (s) => console.log(`[${((Date.now() - T0) / 1000).toFixed(1)}s] ${s}`);
const res = { errors: [], engErr: [] };
async function open(q = '') {
  const ctx = await browser.newContext({ viewport: { width: +W, height: +H }, deviceScaleFactor: 1, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => res.errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') res.errors.push(m.text()); });
  await page.goto(`http://127.0.0.1:8766/?maxdt=400&auto=0${q ? '&' + q : ''}`, { waitUntil: 'load' });
  const until = (fn, arg, t = 100000) => page.waitForFunction(fn, arg, { timeout: t, polling: 100 });
  const shot = async (name, settle = 150) => { await page.waitForTimeout(settle); await page.screenshot({ path: `${out}/${tag}-${name}.png` }); log('shot ' + name); };
  const freeze = async (ev, t) => { await page.evaluate(([e, x]) => window.__umbra.freezeOn(e, x), [ev, t]); await until(([e, x]) => window.__umbra.ev === e && window.__umbra.showT >= x - 1, [ev, t]); };
  const rel = () => page.evaluate(() => window.__umbra.release());
  const idle = (m = 'command') => until((mm) => window.__umbra && window.__umbra.mode === mm && !window.__umbra.busy, m);
  return { page, ctx, until, shot, freeze, rel, idle };
}
const done = async (o) => { res.engErr.push(...(await o.page.evaluate(() => window.__umbra.eng.errors))); await o.ctx.close(); };
const step = async (name, fn) => { try { await fn(); } catch (e) { log(`FAIL ${name}: ${String(e.message).slice(0, 120)}`); res.errors.push(`${name}: ${String(e.message).slice(0, 200)}`); } };
if (sets.includes('idle')) await step('idle', async () => {
  const o = await open(); await o.idle();
  await o.page.evaluate(() => { window.__umbra.eng.idleT = 6000; }); await o.shot('51-idle-a', 300);
  await o.page.evaluate(() => { window.__umbra.eng.idleT = 14200; }); await o.shot('51-idle-b', 300);
  await done(o);
});
if (sets.includes('summon')) {
  for (const [party, who] of [['queen,fox,noir', 'queen'], ['violet,mona,noir', 'violet'], ['mona,panther,skull', 'mona']].filter((x) => !opt.who || opt.who.split('+').includes(x[1]))) await step('summon ' + who, async () => {
    const o = await open('party=' + party); await o.idle();
    await o.page.evaluate(async (w) => { const U = window.__umbra; await U.eng.loadGroup('char:' + w); await U.eng.loadGroup('back:' + w); U.B.actor = w; U.eng.actor = w; }, who);
    await o.page.evaluate(() => { window.__umbra.cmd('persona'); window.__umbra.freezeOn('action', 180); window.__umbra.row(0); window.__umbra.row(0); });
    for (const [t, n] of [[180, 'a-push'], [330, 'b-rip'], [470, 'c-burst'], [640, 'd-reveal'], [1100, 'e-cast']]) { await o.freeze('action', t); await o.shot(`52-summon-${who}-${n}`); }
    await o.rel(); await done(o);
  });
}
if (sets.includes('holdup')) await step('holdup', async () => {
  const o = await open(); await o.idle();
  await o.page.evaluate(() => { window.__umbra.enemy('noisy'); window.__umbra.cmd('persona'); window.__umbra.row(0); window.__umbra.row(0); });
  await o.idle();
  await o.page.evaluate(() => { window.__umbra.freezeOn('holdup', 120); window.__umbra.enemy('echo'); window.__umbra.cmd('attack'); });
  for (const [t, n] of [[120, 'a-orbit'], [380, 'b-orbit'], [700, 'c-land']]) { await o.freeze('holdup', t); await o.shot(`53-holdup-${n}`); }
  await o.rel(); await o.idle('holdup'); await o.shot('53-holdup-d-menu', 400);
  await done(o);
});
if (sets.includes('start')) await step('start', async () => {
  const o = await open('prewarm=0'); await o.idle();
  await o.page.evaluate(() => { window.__umbra.hud.setMode('hidden'); window.__umbra.freezeOn('battle:start', 420); window.__umbra.dir.play('battle:start', { enemyIds: window.__umbra.B.enemies, leadId: 'joker' }, {}); });
  for (const [t, n] of [[420, 'a-panels'], [560, 'b-panels'], [680, 'c-swoop'], [800, 'd-land']]) { await o.freeze('battle:start', t); await o.shot(`54-start-${n}`); }
  await o.rel(); await done(o);
});
if (sets.includes('showtime')) await step('showtime', async () => {
  const o = await open(); await o.idle();
  await o.page.evaluate(() => { window.__umbra.freezeOn('highlight', 1100); window.__umbra.showtime('joker', 'skull'); });
  for (const [t, n] of [[1100, 'a-entrA'], [1330, 'b-entrB'], [1700, 'c-crouch'], [1900, 'd-strike-in'], [2140, 'e-impact'], [2900, 'f-title']]) { await o.freeze('highlight', t); await o.shot(`55-showtime-${n}`); }
  await o.rel(); await done(o);
});
if (sets.includes('attack')) await step('attack', async () => {
  const o = await open(); await o.idle();
  await o.page.evaluate(() => { window.__umbra.freezeOn('action', 450); window.__umbra.enemy('echo'); window.__umbra.cmd('attack'); });
  await o.freeze('action', 450); await o.shot('56-attack-hit'); await o.rel(); await o.idle();
  await o.page.evaluate(() => { window.__umbra.enemyAct(); }); await o.page.waitForTimeout(100);
  await done(o);
});
fs.writeFileSync(`tools/out/p5shots-${tag}.json`, JSON.stringify({ ...res, engErr: [...new Set(res.engErr)] }, null, 1));
log(JSON.stringify({ errors: res.errors.slice(0, 6), engErr: [...new Set(res.engErr)].slice(0, 8) }));
await browser.close();
