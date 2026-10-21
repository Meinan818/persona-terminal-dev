// D-004 布局检查：?enemies=1..5 时，选目标（准星+头顶名牌）/ HOLD UP（包围剪影+标题）/ 敌方行动 / 总攻
// 遍历敌人数组，计算设计坐标包围盒，与可见 HUD（指令盘、队伍卡、顶栏、系统键、HOLD UP 标题）求交。
// usage: tools/run.sh enemies 1280 720 [n=1,3,5] [shots=1]
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const [W, H] = [+process.argv[2] || 1280, +process.argv[3] || 720];
const kv = Object.fromEntries(process.argv.slice(4).map((a) => a.split('=')));
const NS = (kv.n || '1,2,3,4,5').split(',').map(Number);
const SHOTS = kv.shots === '1';
const browser = await chromium.launch({
  executablePath: '/workspace/work/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux-arm64/chrome-headless-shell',
  args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'],
});
fs.mkdirSync('shots2', { recursive: true });
const out = {};
const MEASURE = () => {
  const u = window.__umbra, eng = u.eng, hud = u.hud, v = eng.st.view;
  const db = (c) => { if (!c || !c.visible || c.worldAlpha === 0) return null; const b = c.getBounds(); if (b.width <= 0 || b.height <= 0) return null;
    const p1 = v.toLocal({ x: b.x, y: b.y }), p2 = v.toLocal({ x: b.x + b.width, y: b.y + b.height });
    return [Math.round(Math.min(p1.x, p2.x)), Math.round(Math.min(p1.y, p2.y)), Math.round(Math.abs(p2.x - p1.x)), Math.round(Math.abs(p2.y - p1.y))]; };
  const hudBoxes = {};
  for (const [n, s] of hud.sets) { const b = db(s.c); if (b) { // 指令盘：用命中区并集（装饰溢出不算）
      const items = window.__umbra.hitRects().filter((r) => r.set === n).map((r) => r.rect);
      const x0 = Math.min(...items.map((r) => r[0])), y0 = Math.min(...items.map((r) => r[1])), x1 = Math.max(...items.map((r) => r[0] + r[2])), y1 = Math.max(...items.map((r) => r[1] + r[3]));
      hudBoxes['cmd:' + n] = [x0, y0, x1 - x0, y1 - y0]; } }
  for (const k of ['party', 'order', 'top', 'sys', 'holdLogo', 'list']) { const b = db(hud[k]); if (b) hudBoxes[k] = b; }
  const things = {};
  for (const id of u.B.enemies) { const un = eng.units.get(id); if (un && un.root.visible) things['enemy:' + id] = db(un.body ?? un.root); }
  for (const [id, c] of hud.overs) { const b = db(c); if (b && hud.over.visible) things['over:' + id] = b; }
  const r = db(hud.reticle); if (r && hud.reticle.alpha > 0) things.reticle = r;
  hud.holdRing.children.forEach((c, i) => { const b = db(c); if (b && hud.holdRing.visible && i % 2 === 1) things['ring:' + (i >> 1)] = b; });
  const ov = [];
  const inter = (a, b) => { const x = Math.max(a[0], b[0]), y = Math.max(a[1], b[1]), x2 = Math.min(a[0] + a[2], b[0] + b[2]), y2 = Math.min(a[1] + a[3], b[1] + b[3]); return x2 > x && y2 > y ? (x2 - x) * (y2 - y) : 0; };
  for (const [tk, tb] of Object.entries(things)) if (tb) for (const [hk, hb] of Object.entries(hudBoxes)) { const a = inter(tb, hb); if (a > 0) ov.push({ thing: tk, hud: hk, area: a, frac: +(a / (tb[2] * tb[3])).toFixed(3) }); }
  // 头顶名牌互相重叠
  const ok = Object.entries(things).filter(([k]) => k.startsWith('over:'));
  for (let i = 0; i < ok.length; i++) for (let j = i + 1; j < ok.length; j++) { const a = inter(ok[i][1], ok[j][1]); if (a > 0) ov.push({ thing: ok[i][0], hud: ok[j][0], area: a, frac: +(a / (ok[i][1][2] * ok[i][1][3])).toFixed(3) }); }
  return { mode: u.mode, vis: eng.st.vis, hudBoxes, things, overlaps: ov };
};
for (const n of NS) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(`http://127.0.0.1:8766/?res=0.5&auto=0&enemies=${n}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__umbra && window.__umbra.mode === 'command' && !window.__umbra.busy, null, { timeout: 60000 });
  await page.waitForTimeout(400);
  const r = { target: [], holdup: null, enemyTurn: null, errs };
  const ids = await page.evaluate(() => window.__umbra.B.enemies.slice());
  for (const id of ids) { // 选目标：逐个敌人
    await page.evaluate((id) => window.__umbra.setTarget(id), id); await page.waitForTimeout(250);
    r.target.push({ id, ...(await page.evaluate(MEASURE)) });
    if (SHOTS && id === ids[ids.length - 1]) await page.screenshot({ path: `shots2/${W}x${H}-18-n${n}-target.png` });
  }
  await page.evaluate(() => window.__umbra.forceHoldup());
  await page.waitForFunction(() => window.__umbra.mode === 'holdup' && !window.__umbra.busy, null, { timeout: 30000 });
  await page.waitForTimeout(300);
  r.holdup = await page.evaluate(MEASURE);
  if (SHOTS) await page.screenshot({ path: `shots2/${W}x${H}-19-n${n}-holdup.png` });
  if (SHOTS) { // 总攻中段 + 收尾
    await page.evaluate(() => window.__umbra.cmd('allout'));
    await page.waitForTimeout(1500); await page.screenshot({ path: `shots2/${W}x${H}-20-n${n}-allout.png` });
  }
  await ctx.close();
  // 敌方行动（敌人意图/行动横幅）：新页面，GUARD 后进入敌方回合
  const ctx2 = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const p2 = await ctx2.newPage(); p2.on('pageerror', (e) => errs.push(String(e)));
  await p2.goto(`http://127.0.0.1:8766/?res=0.5&auto=0&enemies=${n}`, { waitUntil: 'load' });
  await p2.waitForFunction(() => window.__umbra && window.__umbra.mode === 'command' && !window.__umbra.busy, null, { timeout: 60000 });
  await p2.evaluate(() => window.__umbra.enemyAct());
  await p2.waitForFunction(() => window.__umbra.ev === 'action', null, { timeout: 20000 }).catch(() => {});
  await p2.waitForTimeout(350);
  r.enemyTurn = await p2.evaluate(MEASURE);
  if (SHOTS) await p2.screenshot({ path: `shots2/${W}x${H}-21-n${n}-enemyturn.png` });
  await ctx2.close();
  out[n] = r;
  const bad = [...r.target.flatMap((t) => t.overlaps.map((o) => `target(${t.id}) ${o.thing}×${o.hud} ${o.frac}`)), ...r.holdup.overlaps.map((o) => `holdup ${o.thing}×${o.hud} ${o.frac}`), ...r.enemyTurn.overlaps.map((o) => `enemyTurn ${o.thing}×${o.hud} ${o.frac}`)];
  console.log(`n=${n}`, JSON.stringify([...new Set(bad)]), errs.slice(0, 3));
}
fs.writeFileSync(`tools/out/enemies-${W}x${H}.json`, JSON.stringify(out, null, 1));
await browser.close();
