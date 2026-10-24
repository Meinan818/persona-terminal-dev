// 敌方回合镜头截图：结束回合后按时间点连拍；检查镜头还原 + 速度2/点屏快进的总时长
import { chromium } from 'playwright';
import { preview } from 'vite';
const OUT = process.env.OUT || '/workspace/work/notes/shots/2026-10-25';
const LV = process.env.LV || 'L01';
const server = await preview({ preview: { port: 4322, host: '127.0.0.1' } });
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
async function run(speed, shots, skipAt) {
  const page = await browser.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 });
  const errs = []; page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(`http://127.0.0.1:4322/?speed=${speed}&level=${LV}`);
  await page.waitForFunction(() => window.__p5t && !window.__p5t.busy);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);
  const before = await page.evaluate(() => ({ ...window.__p5t.rig.tgt }));
  const t0 = Date.now();
  await page.evaluate(() => document.querySelector('#endbar button').click());
  const log = [];
  for (const [ms, name] of shots) {
    const wait = ms - (Date.now() - t0); if (wait > 0) await page.waitForTimeout(wait);
    const st = await page.evaluate(() => ({ v: window.__p5t.vPhase, actor: window.__p5t.enemyCam.actor, aim: document.body.classList.contains('aiming'), busy: window.__p5t.busy }));
    log.push([ms, st]);
    if (name) await page.screenshot({ path: `${OUT}/enemy-${name}.png` });
  }
  if (skipAt != null) { await page.waitForTimeout(Math.max(0, skipAt - (Date.now() - t0))); await page.mouse.click(420, 200); }
  await page.waitForFunction(() => !window.__p5t.busy, null, { timeout: 60000 });
  const dur = Date.now() - t0;
  await page.waitForTimeout(900);
  const after = await page.evaluate(() => ({ ...window.__p5t.rig.tgt }));
  if (speed === 1 && skipAt == null) await page.screenshot({ path: `${OUT}/enemy-restored.png` });
  await page.close();
  return { speed, skipAt, dur, before, after, log, errs };
}
const seq = [];
for (let ms = 250; ms <= 9000; ms += 350) seq.push([ms, `t${String(ms).padStart(4, '0')}`]);
const r0 = await run(1, []);
console.log('speed1-noshot', r0.dur, 'restored', JSON.stringify(r0.before) === JSON.stringify(r0.after));
{ // 开场横幅单独拍（停在中段）
  const page = await browser.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 });
  await page.goto(`http://127.0.0.1:4322/?speed=1&level=${LV}`);
  await page.waitForFunction(() => window.__p5t && !window.__p5t.busy); await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => { window.__p5t.enemyTurnBanner(4000); });
  await page.waitForTimeout(900); await page.screenshot({ path: `${OUT}/enemy-banner.png` }); await page.close();
}
const r1 = process.env.NOSEQ ? { log: [] } : await run(1, process.env.ALL ? seq : seq.filter((_, i) => i < 26));
console.log(JSON.stringify({ ...r1, log: r1.log.map(([m, s]) => `${m}:${s.v}/${s.actor}/${s.aim ? 'AIM' : ''}/${s.busy ? 'b' : ''}`).join(' ') }));
const r2 = await run(2, []);
console.log('speed2', r2.dur, r2.errs);
const r3 = await run(1, [], 1500);
console.log('skip@1.5s', r3.dur, r3.errs);
await browser.close(); server.httpServer.close();
