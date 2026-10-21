// M3 第四阶段关键帧：node tools/p4shots.mjs W H [set=showtime,start,enemy,onemore,baton,summon] [out=shots4] [dpr=1]
// showtime：Joker+Skull 四段（分格/入场/合击/定格标题）；start：开战扯面具；enemy：敌方回合左上行动名条 + 受击姿态；
// onemore：1 MORE 中灰世界；baton：击掌手套；summon：Queen / Violet 精确面具扯下 + Mona 转身蓝焰
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const [W, H, ...rest] = process.argv.slice(2);
const opt = Object.fromEntries(rest.map((a) => [a.slice(0, a.indexOf('=')), a.slice(a.indexOf('=') + 1)]));
const sets = (opt.set ?? 'showtime,start,enemy,onemore,baton,summon').split(','), out = opt.out ?? 'shots4', tag = `${W}x${H}`, dpr = +(opt.dpr ?? 1);
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  executablePath: '/workspace/work/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux-arm64/chrome-headless-shell',
  args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'],
});
const T0 = Date.now(); const log = (s) => console.log(`[${((Date.now() - T0) / 1000).toFixed(1)}s] ${s}`);
const res = { errors: [], engErr: [], audio: [] };
async function open(q = '') {
  const ctx = await browser.newContext({ viewport: { width: +W, height: +H }, deviceScaleFactor: dpr, hasTouch: true });
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
const done = async (o) => { res.engErr.push(...(await o.page.evaluate(() => window.__umbra.eng.errors))); res.audio.push(...(await o.page.evaluate(() => window.__umbra.audioLog()))); await o.ctx.close(); };
if (sets.includes('start')) {
  const o = await open('prewarm=0');
  // 开战：重新开一场（startBattle 不暴露 → 直接播 battle:start 事件）
  await o.idle();
  await o.page.evaluate(() => { window.__umbra.hud.setMode('hidden'); window.__umbra.freezeOn('battle:start', 80); window.__umbra.dir.play('battle:start', { enemyIds: window.__umbra.B.enemies, leadId: 'joker' }, {}); });
  for (const [t, n] of [[80, 'a-grab'], [200, 'b-rip'], [300, 'c-goo'], [520, 'd-panels']]) { await o.freeze('battle:start', t); await o.shot(`41-start-${n}`); }
  await o.rel(); await done(o);
}
if (sets.includes('showtime')) {
  const o = await open(); await o.idle();
  await o.page.evaluate(() => { window.__umbra.freezeOn('highlight', 260); window.__umbra.showtime('joker', 'skull'); });
  for (const [t, n] of [[260, 'a-panels'], [700, 'b-logo'], [1260, 'c-entrance'], [1760, 'd-crouch'], [2140, 'e-strike'], [2900, 'f-title']]) { await o.freeze('highlight', t); await o.shot(`42-showtime-${n}`); }
  await o.rel(); await done(o);
}
if (sets.includes('enemy')) {
  const o = await open(); await o.idle();
  await o.page.evaluate(() => { window.__umbra.freezeOn('action', 300); window.__umbra.enemyAct(); });
  await o.freeze('action', 300); await o.shot('43-enemy-a-name');
  await o.freeze('action', 560); await o.shot('43-enemy-b-recoil');
  await o.rel(); await done(o);
}
if (sets.includes('onemore') || sets.includes('baton')) {
  const o = await open(); await o.idle();
  await o.page.evaluate(() => { window.__umbra.enemy('noisy'); window.__umbra.cmd('persona'); window.__umbra.row(0); window.__umbra.row(0); });
  await o.freeze('onemore', 280); await o.shot('44-onemore'); await o.rel();
  await o.idle();
  await o.page.evaluate(() => window.__umbra.cmd('baton')); await o.page.waitForTimeout(300);
  await o.page.evaluate(() => { window.__umbra.freezeOn('baton', 300); window.__umbra.party('skull'); });
  await o.freeze('baton', 300); await o.shot('45-baton'); await o.rel();
  await done(o);
}
if (sets.includes('summon')) {
  for (const [party, who, row] of [['queen,fox,noir', 'queen', 0], ['violet,mona,noir', 'violet', 0], ['mona,panther,skull', 'mona', 0]].filter((x) => !opt.who || opt.who.split('+').includes(x[1]))) {
    const o = await open('party=' + party); await o.idle();
    // 换到目标角色回合
    await o.page.evaluate(async (w) => { const U = window.__umbra; await U.eng.loadGroup('char:' + w); await U.eng.loadGroup('back:' + w); U.B.actor = w; U.eng.actor = w; }, who);
    await o.page.evaluate((r) => { window.__umbra.cmd('persona'); window.__umbra.freezeOn('action', 230); window.__umbra.row(r); window.__umbra.row(r); }, row);
    for (const [t, n] of [[230, 'grab'], [380, 'rip'], [520, 'flame']]) { try { await o.freeze('action', t); await o.shot(`46-summon-${who}-${n}`); } catch (e) { log('summon fail ' + who + ' ' + e.message.slice(0, 80)); break; } }
    await o.rel(); await done(o);
  }
}
fs.writeFileSync(`tools/out/p4shots-${tag}.json`, JSON.stringify({ ...res, engErr: [...new Set(res.engErr)], audio: [...new Set(res.audio)] }, null, 1));
log(JSON.stringify({ errors: res.errors.slice(0, 6), engErr: [...new Set(res.engErr)].slice(0, 8) }));
await browser.close();
