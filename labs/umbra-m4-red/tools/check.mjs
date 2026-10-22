// M3 自检：skin:timing 简版（1/2/3 倍速 × 完整/极简，墙钟实测 ≤ 上限、无强制推进）+ 命中区几何 + 竖屏旋转点击映射
// + 跳过总攻时定格画闪现 + 冻结 payload + 输入缓冲 + 演出后清场计数 + 主线程帧时间。
// node tools/check.mjs   （res=0.25 去掉软件光栅瓶颈，帧间隔接近真实）
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const base = 'http://127.0.0.1:8767/';
const browser = await chromium.launch({
  executablePath: '/workspace/work/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux-arm64/chrome-headless-shell',
  args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'],
});
const out = { timing: {}, frames: {}, geometry: null, portrait: null, skip: null, freeze: null, buffer: null, clean: null, errors: [] };
const T0 = Date.now(); const log = (s) => console.log(`[${((Date.now() - T0) / 1000).toFixed(1)}s] ${s}`);
async function open(w, h, q = '') {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => out.errors.push(String(e)));
  await page.goto(base + `?battle=1&res=0.25&auto=0${q}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__umbra && window.__umbra.mode === 'command' && !window.__umbra.busy, null, { timeout: 60000 });
  return { ctx, page };
}
const until = async (page, fn, arg, t = 30000) => { try { return await page.waitForFunction(fn, arg, { timeout: t, polling: 50 }); } catch (e) {
  console.log('STATE', await page.evaluate(() => JSON.stringify({ m: window.__umbra.mode, b: window.__umbra.busy, ev: window.__umbra.ev, log: window.__umbra.timing().slice(-6).map((r) => r.recipe + ':' + r.wallMs + '/' + r.capMs + (r.forced ? 'F' : '')), err: window.__M.errors.slice(-4), hp: [...window.__umbra.B.units.values()].map((u) => u.id + u.hp + (u.down ? 'D' : '')) })));
  throw e; } };
async function flow(page) {
  await page.evaluate(() => { window.__umbra.enemy('noisy'); window.__umbra.cmd('persona'); });
  await page.waitForTimeout(250);
  await page.evaluate(() => window.__umbra.row(0));
  await until(page, () => window.__umbra.mode === 'command' && !window.__umbra.busy);
  await page.evaluate(() => { window.__umbra.enemy('echo'); window.__umbra.cmd('attack'); });
  await until(page, () => window.__umbra.mode === 'holdup' && !window.__umbra.busy);
  await page.evaluate(() => window.__umbra.cmd('allout'));
  await until(page, () => window.__umbra.mode === 'result' && !window.__umbra.busy);
  await page.waitForTimeout(400);
  await page.evaluate(() => window.__umbra.cmd('next'));
  await until(page, () => window.__umbra.mode === 'command' && !window.__umbra.busy);
}
{
  const { ctx, page } = await open(844, 390);
  // 我方非弱点 + 敌方回合也覆盖一次（GUARD → 敌人行动），再跑主流程
  for (const [speed, minimal] of [[1, false], [1, true], [2, false], [3, false]]) {
    await page.evaluate(([s, m]) => { const u = window.__umbra; u.dir.speed = s; u.dir.forceMinimal = m; u.dir.log.length = 0; u.resetFrames(); }, [speed, minimal]);
    await page.evaluate(() => window.__umbra.cmd('guard'));
    await until(page, () => window.__umbra.mode === 'command' && !window.__umbra.busy);
    await flow(page);
    const tag = `x${speed}-${minimal || speed > 1 ? 'minimal' : 'full'}`;
    out.timing[tag] = await page.evaluate(() => window.__umbra.timing());
    out.frames[tag] = await page.evaluate(() => {
      const by = {}; for (const f of window.__M.frames) (by[f.ph.split(':')[0]] ??= []).push(f);
      const med = (a) => { const s = a.slice().sort((x, y) => x - y); return s[s.length >> 1]; };
      return Object.fromEntries(Object.entries(by).map(([k, v]) => [k, { n: v.length, cpuMed: +med(v.map((f) => f.cpu)).toFixed(2), cpuMax: +Math.max(...v.map((f) => f.cpu)).toFixed(2), dtMed: +med(v.map((f) => f.dt)).toFixed(1), npMax: Math.max(...v.map((f) => f.np)), filtMax: Math.max(...v.map((f) => f.f)) }]));
    });
    log('timing ' + tag);
  }
  await page.evaluate(() => { window.__umbra.dir.speed = 1; window.__umbra.dir.forceMinimal = false; });
  // 待机帧时间：指令轮静置 6s（HUD 只在变化时重建后，待机不该再有 40ms+ 尖峰）
  await page.evaluate(() => window.__umbra.resetFrames()); await page.waitForTimeout(6000);
  out.idle = await page.evaluate(() => { const f = window.__M.frames.filter((x) => x.ph === 'idle'); const c = f.map((x) => x.cpu).sort((a, b) => a - b), d = f.map((x) => x.dt).sort((a, b) => a - b);
    const q = (a, p) => a[Math.min(a.length - 1, Math.floor(a.length * p))]; return { n: f.length, cpuMed: +q(c, 0.5).toFixed(2), cpuP95: +q(c, 0.95).toFixed(2), cpuMax: +c[c.length - 1].toFixed(2), over16: c.filter((x) => x > 16.7).length, dtMed: +q(d, 0.5).toFixed(1) }; });
  log('idle ' + JSON.stringify(out.idle));
  out.clean = await page.evaluate(() => window.__umbra.counts());
  // payload 冻结：演出拿到的 payload 不可写
  out.freeze = await page.evaluate(() => { const d = window.__umbra.dir; let r = 'no-run';
    d.play('onemore', { a: { b: 1 } }); const p = d.main.rc.payload; try { p.a.b = 2; } catch (e) { r = 'throws'; } r = r === 'throws' ? r : (p.a.b === 1 ? 'ignored(frozen)' : 'MUTATED'); d.skip(); return { result: r, frozen: Object.isFrozen(p) && Object.isFrozen(p.a) }; });
  // 输入缓冲：演出中连点 5 次 → 执行 1 + 缓冲 2（保留最后 2 个）
  out.buffer = await page.evaluate(async () => { const u = window.__umbra, d = u.dir; const ran = [];
    d.play('holdup', { enemyIds: [] }); for (let i = 0; i < 5; i++) u.input('k' + i, () => ran.push('k' + i));
    const buffered = d.buffer.map((b) => b.key); d.skip(); await new Promise((r) => setTimeout(r, 50)); return { buffered, ranAfter: ran }; });
  // 跳过总攻：定格画闪现 ≤150ms 后清场
  out.skip = await page.evaluate(async () => { const u = window.__umbra, d = u.dir;
    d.play('allout', { partyIds: ['joker', 'agathion', 'caitsith', 'kelpie'], finisherId: 'joker', total: 999, hits: [{ targetId: 'noisy', dmg: 1, weak: false, crit: false, miss: false, resist: 'none', element: 'x', down: false }], targetIds: ['noisy'] });
    await new Promise((r) => setTimeout(r, 300)); const t0 = performance.now(); d.skip();
    const fc = [...u.eng.fix.entries()].find(([k]) => k.startsWith('finish:'));
    const visibleAtSkip = fc ? fc[1].visible : null;
    while (d.busy) await new Promise((r) => setTimeout(r, 10));
    return { finishVisibleDuringFlash: visibleAtSkip, flashMs: Math.round(performance.now() - t0), after: u.counts(), finishVisibleAfter: fc ? fc[1].visible : null }; });
  log('skip/freeze/buffer');
  // 命中区几何（设计坐标）
  out.geometry = await page.evaluate(() => {
    const rs = window.__umbra.hitRects(), cmd = [780, 220, 476, 476], res = [];
    for (const r of rs) { const [x, y, w, h] = r.rect; res.push({ ...r, minSide: Math.min(w, h), need: r.main ? 96 : 86, ok: Math.min(w, h) >= (r.main ? 96 : 86), inside: x >= cmd[0] && y >= cmd[1] && x + w <= cmd[0] + cmd[2] && y + h <= cmd[1] + cmd[3] }); }
    const ov = []; for (const a of res) for (const b of res) if (a !== b && a.set === b.set && a.id < b.id && !(a.id + '/' + b.id === 'baton/showtime')) { const [ax, ay, aw, ah] = a.rect, [bx, by, bw, bh] = b.rect; if (ax < bx + bw && bx < ax + aw && ay < by + bh && by < ay + ah) ov.push(a.id + '/' + b.id); }
    const s667 = Math.min(667 / 1280, 375 / 720);
    return { items: res, overlaps: ov, pt667: { secondary86: +(86 * s667).toFixed(1), main96: +(96 * s667).toFixed(1) } };
  });
  await ctx.close();
}
{
  // 竖屏 390×844 → 虚拟横屏旋转：在屏幕坐标点每个主指令中心
  const { ctx, page } = await open(390, 844);
  const res = [];
  for (const id of ['persona', 'back', 'order', 'back', 'item', 'back']) {
    const pt = await page.evaluate((id) => {
      const u = window.__umbra;
      if (id === 'back') { const r = [780, 558, 476, 86]; return { ...u.designToScreen(r[0] + 40, r[1] + 43), d: [820, 601] }; }
      const it = u.hitRects().find((r) => r.id === id && r.set === 'main'); const [x, y, w, h] = it.rect;
      return { ...u.designToScreen(x + w - 12, y + h - 12), d: [x + w - 12, y + h - 12] };
    }, id);
    const back = await page.evaluate(([x, y]) => window.__umbra.screenToDesign(x, y), [pt.x, pt.y]);
    // back 行的实际位置：列表最后一行
    if (id === 'back') {
      const rowsN = await page.evaluate(() => window.__umbra.hud.listRows.length);
      const p2 = await page.evaluate((n) => window.__umbra.designToScreen(800, 300 + (n - 1) * 86 + 43), rowsN);
      await page.touchscreen.tap(p2.x, p2.y);
    } else await page.touchscreen.tap(pt.x, pt.y);
    await page.waitForTimeout(250);
    const mode = await page.evaluate(() => window.__umbra.mode);
    res.push({ id, screen: [+pt.x.toFixed(1), +pt.y.toFixed(1)], designTarget: pt.d, mappedBack: [+back.x.toFixed(1), +back.y.toFixed(1)], modeAfter: mode, ok: id === 'back' ? mode === 'command' : mode === 'list' });
  }
  out.portrait = res;
  await ctx.close();
}
fs.writeFileSync('tools/out/check.json', JSON.stringify(out, null, 1));
const bad = [];
for (const [k, list] of Object.entries(out.timing)) for (const r of list) if (r.forced || r.wallMs > r.capMs) bad.push(`${k} ${r.recipe} ${r.wallMs}/${r.capMs}${r.forced ? ' FORCED' : ''}`);
// 第二阶段硬指标：1 MORE 完整档 ≤450ms、跳过闪白 ≤150ms、Guard/Attack 完整档 duration ≤ 3× 极简档上限
const full = out.timing['x1-full'] ?? [], mini = out.timing['x1-minimal'] ?? [];
const capOf = (list, id) => (list.find((r) => r.recipe === id) || {}).capMs;
const gates = {
  onemoreFullMaxWall: Math.max(...full.filter((r) => r.recipe === 'onemore').map((r) => r.wallMs)),
  onemoreOk: full.filter((r) => r.recipe === 'onemore').every((r) => r.wallMs <= 450),
  skipFlashMs: out.skip.flashMs, skipOk: out.skip.flashMs <= 150,
  guard: { dur: (full.find((r) => r.recipe === 'action.guard') || {}).duration, minCap: capOf(mini, 'action.guard') },
  attack: { dur: (full.find((r) => r.recipe === 'action.attack') || {}).duration, minCap: capOf(mini, 'action.attack') },
};
gates.guard.ok = gates.guard.dur <= 3 * gates.guard.minCap; gates.attack.ok = gates.attack.dur <= 3 * gates.attack.minCap;
gates.idle = out.idle;
out.gates = gates; fs.writeFileSync('tools/out/check.json', JSON.stringify(out, null, 1));
log('GATES ' + JSON.stringify(gates));
log(JSON.stringify({ overCap: bad, geometryBad: out.geometry.items.filter((i) => !i.ok || !i.inside).map((i) => i.id), overlaps: out.geometry.overlaps, portrait: out.portrait.map((p) => p.id + ':' + p.ok), skip: out.skip, freeze: out.freeze, buffer: out.buffer, clean: out.clean, errors: out.errors.slice(0, 5) }));
await browser.close();
