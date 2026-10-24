import { chromium } from 'playwright';
import { preview } from 'vite';
const OUT = process.env.OUT || '/workspace/work/notes/shots/2026-10-25';
const PFX = process.env.PFX || 'round2-forecast';
const VW = Number(process.env.VW || 844), VH = Number(process.env.VH || 390);
const server = await preview({ preview: { port: 4321, host: '127.0.0.1' } });
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: VW, height: VH }, deviceScaleFactor: VW > 1000 ? 1 : 2 });
const errs = []; page.on('pageerror', (e) => errs.push(String(e)));
await page.goto('http://127.0.0.1:4321/?speed=1');
await page.waitForFunction(() => window.__p5t && !window.__p5t.busy);
await page.evaluate(() => document.fonts.ready);
const cases = [
  ['gun-halfcover', 'gun', 'joker', 'gun', null, 'e1'],
  ['skill-weak-1more', 'skill', 'panther', 'skill', 'agi', 'e1'],
  ['push', 'push', 'joker', 'melee', null, 'e1'],
  ['lethal', 'lethal', 'skull', 'gun', null, 'e1'],
];
for (const [name, demo, who, mode, sk, tgt] of cases) {
  await page.evaluate((demo) => window.__p5t.forecastDemo(demo), demo);
  await page.waitForTimeout(300);
  await page.waitForFunction(() => !window.__p5t.busy && window.__p5t.battle.phase === 'player', null, { timeout: 15000 });
  await page.evaluate(([demo, who, mode, sk, tgt]) => {
    const p = window.__p5t; p.select(who);
    if (sk) p.setSkill(sk); else p.setMode(mode);
    p.tap({ unit: tgt });
  }, [demo, who, mode, sk, tgt]);
  await page.waitForTimeout(900);
  const info = await page.evaluate(() => { const f = document.querySelector('#forecast'); const vp = [innerWidth, innerHeight]; const r = f.getBoundingClientRect(); const v = document.querySelector('#volt-star').getBoundingClientRect(); const sk = getComputedStyle(document.querySelector('#skills')).display; const ov = !(r.right < v.left || r.left > v.right || r.bottom < v.top || r.top > v.bottom); return { inView: r.left >= 0 && r.top >= 0 && r.right <= vp[0] && r.bottom <= vp[1], voltOverlap: ov, skillsDisplay: sk, hidden: f.classList.contains('hidden'), r: [r.left, r.top, r.right, r.bottom].map(Math.round), text: f.innerText.replace(/\s+/g, ' ') }; });
  console.log(name, JSON.stringify(info));
  await page.screenshot({ path: `${OUT}/${PFX}-${name}.png` });
}
// 实际关卡：L01 Joker 走到能开枪的格子，再对敌人枪击预测（看场景里贴在头顶的效果）
for (const lv of (process.env.LV || 'L01,L07').split(',')) {
  await page.evaluate((lv) => window.__p5t.loadLevel(lv), lv);
  await page.waitForFunction(() => window.__p5t && !window.__p5t.busy && window.__p5t.sceneKit.ready && window.__p5t.battle.phase === 'player', null, { timeout: 60000 });
  await page.waitForTimeout(800);
  const plan = await page.evaluate(() => {
    const p = window.__p5t, b = p.battle;
    for (const u of b.alive('ally')) for (const t of [u.pos, ...b.moveTiles(u)]) for (const e of b.units) {
      if (e.side !== 'enemy' || e.ko || b.isHidden(e)) continue;
      if (b.canShoot(u, e, t) && b.grid.hasAnyCover(t)) return { who: u.id, tile: t, tgt: e.id };
    }
    return null;
  });
  if (!plan) { console.log(lv, 'no shot plan'); continue; }
  await page.evaluate(({ who, tile }) => { const p = window.__p5t; p.select(who); const u = p.battle.unit(who); if (u.pos.x !== tile.x || u.pos.y !== tile.y) p.tap({ tile }); }, plan);
  await page.waitForTimeout(400);
  await page.waitForFunction(() => !window.__p5t.busy, null, { timeout: 15000 });
  await page.evaluate(({ tgt }) => { const p = window.__p5t; p.setMode('gun'); p.tap({ unit: tgt }); }, plan);
  await page.waitForTimeout(1200);
  const info = await page.evaluate(() => { const f = document.querySelector('#forecast'); const r = f.getBoundingClientRect(); return { hidden: f.classList.contains('hidden'), r: [r.left, r.top, r.right, r.bottom].map(Math.round), text: f.innerText.replace(/\s+/g, ' ') }; });
  console.log(lv, JSON.stringify(plan), JSON.stringify(info));
  await page.screenshot({ path: `${OUT}/${PFX}-${lv}-${VW}x${VH}.png` });
}
console.log('errors', errs);
await browser.close(); server.httpServer.close();
