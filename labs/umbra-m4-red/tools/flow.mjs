// M4 流程自动化：据点 → 委托板 → 预告信 → 潜入（宝箱/隐藏路/守门必战/岔路险路精英/安全屋）→ BOSS 两阶段 → 结算 → 回据点。
// node tools/flow.mjs <W> <H> [dpr=2] [fast=1(跳过战斗，只截流程画面)] [shots=dir]
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const [W, H, ...rest] = process.argv.slice(2);
const opt = Object.fromEntries(rest.map((a) => [a.slice(0, a.indexOf('=')), a.slice(a.indexOf('=') + 1)]));
if (opt.q === undefined && !opt.wipe && opt.retreat !== '1') opt.q = 'route=r2:2';   // D3：主流程预置确保路线 2 局，直接走预告信局
const dpr = +(opt.dpr ?? 2), fast = opt.fast === '1', dir = opt.shots ?? 'shots-m4', tag = `${W}x${H}`;
fs.mkdirSync(dir, { recursive: true }); fs.mkdirSync('tools/out', { recursive: true });
const browser = await chromium.launch({ executablePath: '/workspace/work/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux-arm64/chrome-headless-shell', args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
const ctx = await browser.newContext({ viewport: { width: +W, height: +H }, deviceScaleFactor: dpr, hasTouch: true });
const page = await ctx.newPage();
const errors = [], steps = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error' && !/favicon/.test(m.text())) errors.push(m.text()); });
const T0 = Date.now(); const log = (s) => { steps.push(`${((Date.now() - T0) / 1000).toFixed(1)}s ${s}`); console.log(steps.at(-1)); };
const sfx = opt.wipe ? '-wipe' : opt.retreat === '1' ? '-retreat' : '';
const shot = async (name) => { await page.waitForTimeout(450); await page.screenshot({ path: `${dir}/${tag}${sfx}-${name}.png` }); log('shot ' + name); };
const scr = () => Promise.race([page.evaluate(() => window.__flow?.screen ?? 'none'), new Promise((_, j) => setTimeout(() => j(new Error('page hung')), 15000))]);
const until = async (pred, ms = 60000) => { const s = Date.now(); for (;;) { const v = await scr(); if (pred(v)) return v; if (Date.now() - s > ms) throw new Error('timeout waiting, screen=' + v); await page.waitForTimeout(120); } };
const click = (id) => page.evaluate((i) => window.__flow.click(i), id);
await page.goto(`http://127.0.0.1:8767/?res=0.5&auto=0&maxdt=400${fast ? '&fastwin=1' : ''}${opt.wipe ? '&wipe=' + opt.wipe : ''}${opt.q ? '&' + opt.q : ''}`, { waitUntil: 'load' });
await until((s) => s === 'hub', 90000); await page.waitForTimeout(1500); log('hub');
await shot('01-hub');
await click('board'); await until((s) => s === 'board'); await page.waitForTimeout(500); await click('req:r2'); await page.waitForTimeout(200); await shot('02-board');
await click('accept'); await until((s) => s === 'hub'); await page.waitForTimeout(800);
await click('card'); await page.waitForTimeout(900);
if ((await scr()) === 'callingcard') {
  await shot('03-callingcard');
  await click('send'); await page.waitForTimeout(2300); await shot('04-cc-send'); await until((s) => s === 'hub', 8000); await page.waitForTimeout(800);
} else { await page.waitForTimeout(200); await shot('03-cc-locked'); log('callingcard locked (D3)'); await page.waitForTimeout(1400); }
await click('go'); await until((s) => s.startsWith('explore'), 15000); await page.waitForTimeout(900); log('explore');
let shotsDone = new Set(), battles = 0, autoOn = false, guard = 0, retried = 0; const failMode = !!opt.wipe || opt.retreat === '1';
for (;;) {
  if (++guard > 4000) throw new Error('loop guard');
  const s = await scr();
  if (process.env.V) log('loop ' + s);
  if (s === 'end' || s === 'failend') break;
  if (s === 'fail') {
    await page.waitForTimeout(400);
    const ids = await page.evaluate(() => window.__flow.ids());
    if (ids.includes('retry')) { if (!shotsDone.has('fail')) { shotsDone.add('fail'); await shot('12-fail'); } log('retry from safe'); retried++; await click('retry'); await until((v) => v !== 'fail', 15000); }
    continue;
  }
  if (s === 'retreat') { await page.waitForTimeout(200); continue; }
  if (s.startsWith('explore')) {
    if (!shotsDone.has(s)) { shotsDone.add(s); await shot('05-' + s.replace(':', '-')); }
    // 决策：未开宝箱（可达）→ 可过检定的隐藏路 → 守门/精英 → 出口
    const tgt = await page.evaluate(() => {
      const F = window.__flow, ex = F.run?.explore; if (!ex) return null;
      const reach = (c) => ex.pathTo(c) !== null;
      for (const h of ex.hidden) if (!h.open && (F.save.stats[h.stat] ?? 0) >= h.need && reach(h.at)) return h.at;
      for (const c of ex.chests) if (!c.open && reach(c.at)) return c.at;
      if (ex.gateOpen) return ex.exit;
      const g = ex.foes.find((f) => f.alive && f.kind !== 'patrol'); if (g && reach(g.at)) return g.at;
      const p = ex.foes.find((f) => f.alive && reach(f.at)); return p ? p.at : ex.exit;
    });
    if (!tgt) { await page.waitForTimeout(150); continue; }
    log('tap ' + JSON.stringify(tgt) + ' ' + s);
    await page.evaluate(([x, y]) => { window.__flow.tap(x, y); }, tgt);
    await page.waitForTimeout(250);
    for (let i = 0; i < 80; i++) { const b = await page.evaluate(() => window.__flow && window.__flow.screen); if (!b.startsWith('explore')) break; const busy = await page.evaluate(() => document.querySelector('.toast') !== null); await page.waitForTimeout(busy ? 150 : 100); if (i > 6) break; }
    continue;
  }
  if (s === 'battle') {
    battles++; log('battle #' + battles);
    await page.waitForFunction(() => window.__umbra && window.__umbra.mode === 'command' && !window.__umbra.busy || window.__umbra.mode === 'holdup' || window.__umbra.mode === 'result', null, { timeout: 60000 });
    if (battles === 1) await shot('06-battle');
    if (!autoOn) { await page.evaluate(() => { const h = window.__umbra.hud; h.onSystem('speed'); h.onSystem('speed'); h.onSystem('auto'); }); autoOn = true; }
    else await page.evaluate(() => { if (window.__umbra.mode === 'command') window.__umbra.cmd('attack'); });
    let phaseShot = false;
    for (let i = 0; i < 1500; i++) {
      const st = await page.evaluate(() => ({ m: window.__umbra.mode, busy: window.__umbra.busy, scr: window.__flow.screen, ph: window.__M.phase, boss: !!document.querySelector('.bp') }));
      if (st.scr !== 'battle') break;
      if (st.boss && !phaseShot) { phaseShot = true; await page.waitForTimeout(500); await shot('09-boss-phase'); }
      if (st.m === 'holdup' && !st.busy) { await page.waitForTimeout(300); await page.evaluate(() => window.__umbra.cmd('allout')); }
      else if (st.m === 'result' && !st.busy) { await page.waitForTimeout(1600); if (!shotsDone.has('result')) { shotsDone.add('result'); await shot('07-result'); } await page.evaluate(() => window.__umbra.cmd('next')); }
      else if (st.m === 'command' && !st.busy) { await page.waitForTimeout(700); const still = await page.evaluate(() => window.__umbra.mode === 'command' && !window.__umbra.busy); if (still) await page.evaluate(() => window.__umbra.cmd('attack')); }
      await page.waitForTimeout(200);
    }
    continue;
  }
  if (s === 'card') { if (!shotsDone.has('card')) { shotsDone.add('card'); await shot('08-card'); } await page.waitForTimeout(700); await click('0'); await page.waitForTimeout(700); continue; }
  if (s === 'fork') { await page.waitForTimeout(500); await shot('05-fork'); await click('risk'); await until((v) => v !== 'fork', 8000); continue; }
  if (s === 'safe') { await page.waitForTimeout(500); await shot('05-safe'); if (opt.retreat === '1') { await click('retreat'); await until((v) => v !== 'safe', 8000); continue; } await click('rest'); await page.waitForTimeout(600); await click('go'); await until((v) => v !== 'safe', 8000); continue; }
  if (s === 'boss:intro') { await page.waitForTimeout(900); if (!shotsDone.has('boss')) { shotsDone.add('boss'); await shot('09-boss-intro'); } await page.waitForTimeout(300); continue; }
  await page.waitForTimeout(150);
}
const endScr = await scr();
await page.waitForTimeout(1300); await shot(endScr === 'failend' ? '13-failend' : '10-end');
await click('back'); await until((s) => s === 'hub', 15000); await page.waitForTimeout(1200); await shot('11-hub-after');
const res = await page.evaluate(() => { const F = window.__flow; return { ok: true, flowErrors: F.errors, timings: F.timings, fx: F.run ? null : null, log: F.log, save: { money: F.save.money, lv: F.save.party.map((id) => [id, F.save.members[id].lv]), cleared: F.save.cleared }, umbraErrors: window.__M.errors, audio: window.__umbra.audioLog().slice(-60) }; });
const exLog = await page.evaluate(() => window.__flow.viewLog ?? null);
const out = { size: tag, fast, wipe: opt.wipe ?? null, retreat: opt.retreat === '1', retried, endScreen: endScr, battles, secs: (Date.now() - T0) / 1000, errors, steps, ...res, exLog };
fs.writeFileSync(`tools/out/flow-${tag}${fast ? '-fast' : ''}${opt.wipe ? '-wipe' : ''}${opt.retreat === '1' ? '-retreat' : ''}.json`, JSON.stringify(out, null, 1));
console.log('DONE', tag, 'battles', battles, 'errors', errors.length, 'flowErrors', res.flowErrors.length, 'lv', JSON.stringify(res.save.lv));
process.exit(errors.length || res.flowErrors.length ? 1 : 0);
