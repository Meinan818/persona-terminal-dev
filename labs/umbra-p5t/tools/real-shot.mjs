// P5T 正版试点接入截图：Joker PC0001_151 原版动作（待机/跑/开枪/近战/受击/倒地）+ 默认视角 +（若接入）Map_02100 整图。
// 用法：bash tools/fetch-private-models.sh && npm run build 后 node tools/real-shot.mjs [only=default,anim,face,map]
import { chromium } from 'playwright';
import { preview } from 'vite';
const OUT = process.env.OUT || '/workspace/work/notes/shots/2026-10-25';
const ONLY = (process.argv[2] || 'default,anim,face,map').split(',');
const PFX = process.env.PFX || 'real';
const server = await preview({ preview: { port: 4333, host: '127.0.0.1' } });
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errs = [];
async function open(level, w = 1280, h = 720) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on('pageerror', (e) => errs.push(String(e)));
  page.on('console', (m) => { if ((m.type() === 'warning' || m.type() === 'error') && !m.text().includes('GL Driver')) errs.push(m.text()); });
  await page.goto(`http://127.0.0.1:4333/?speed=1&level=${level}`);
  await page.waitForFunction(() => window.__p5t && !window.__p5t.busy && window.__p5t.sceneKit.ready, null, { timeout: 90000 });
  await page.waitForFunction(() => window.__p5t.rigs.has('joker') && window.__p5t.rigs.get('joker').mixer, null, { timeout: 60000 }).catch(() => errs.push('joker pilot rig missing'));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1500);
  return page;
}
const snap = async (page, name, wait = 600) => { await page.waitForTimeout(wait); await page.screenshot({ path: `${OUT}/${PFX}-${name}.png` }); console.log('shot', name); };
/** Joker 实际蒙皮包围盒在当前俯视镜头里的像素高 */
const jokerPx = (page) => page.evaluate(() => {
  const P = window.__p5t, r = P.rigs.get('joker'); const T = r.root.parent.position.constructor;
  let lo = Infinity, hi = -Infinity; const v = new T();
  r.root.updateMatrixWorld(true);
  r.root.traverse((o) => { if (o.isSkinnedMesh && o.visible && !o.userData.outline) { const pos = o.geometry.attributes.position; for (let i = 0; i < pos.count; i += 7) { o.getVertexPosition(i, v); v.applyMatrix4(o.matrixWorld); const p = v.clone().project(P.camera); lo = Math.min(lo, p.y); hi = Math.max(hi, p.y); } } });
  return Math.round((hi - lo) / 2 * innerHeight);
});
async function stage(page) {
  // Joker 挪到空地，右前方放一个敌人当目标
  return page.evaluate(() => {
    const P = window.__p5t, r = P.rigs.get('joker'), g = r.root.parent;
    g.visible = true; r.faceTo({ x: g.position.x, y: 0, z: g.position.z + 5 });
    return { x: g.position.x, z: g.position.z };
  });
}
if (ONLY.includes('default')) {
  const page = await open('L01');
  await snap(page, 'default-L01-1280x720', 800);
  console.log('joker px (skinned bbox) 1280x720', await jokerPx(page));
  await page.close();
}
if (ONLY.includes('anim')) {
  const page = await open('L01');
  await stage(page);
  const cam = (ang, dist, h) => page.evaluate(([a, d, h]) => window.__p5t.portrait('joker', a, d, h), [ang, dist, h]);
  await cam(0.5, 2.4, 0.9);
  await snap(page, 'joker-idle', 900);
  await page.evaluate(() => window.__p5t.rigs.get('joker').setRunning(true));
  await snap(page, 'joker-run', 520);
  await page.evaluate(() => window.__p5t.rigs.get('joker').setRunning(false));
  await page.waitForTimeout(500);
  await page.evaluate(() => { const r = window.__p5t.rigs.get('joker'), g = r.root.parent; r.aim({ x: g.position.x + 0.5, y: 0, z: g.position.z + 6 }, 'gun', 1e9); });
  await snap(page, 'joker-gunstart', 250);
  await snap(page, 'joker-gunfire', 280);
  await snap(page, 'joker-gunloop', 900);
  await cam(Math.PI / 2 + 0.3, 2.4, 0.7);
  await snap(page, 'joker-gun-side', 300);
  await page.evaluate(() => window.__p5t.rigs.get('joker').endAim());
  await page.waitForTimeout(900);
  await cam(0.5, 2.4, 0.9);
  await page.evaluate(() => { const r = window.__p5t.rigs.get('joker'), g = r.root.parent; r.aim({ x: g.position.x, y: 0, z: g.position.z + 6 }, 'melee', 2400); });
  await snap(page, 'joker-melee-a', 450);
  await snap(page, 'joker-melee-b', 400);
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.__p5t.rigs.get('joker').flinch());
  await snap(page, 'joker-damage', 300);
  await page.waitForTimeout(1200);
  await page.evaluate(() => { const P = window.__p5t; P.battle.unit('joker').downed = true; P.rigs.get('joker').setDowned(true); });
  await snap(page, 'joker-downstart', 200);
  await snap(page, 'joker-down', 1800);
  await page.evaluate(() => { const P = window.__p5t; P.battle.unit('joker').downed = false; P.rigs.get('joker').setDowned(false); });
  await snap(page, 'joker-downreturn', 350);
  await page.close();
}
if (ONLY.includes('face')) {
  const page = await open('L01');
  await stage(page);
  await page.evaluate(() => window.__p5t.portrait('joker', 0.3, 1.5, 0.75));
  await snap(page, 'joker-face', 900);
  await page.close();
}
if (ONLY.includes('map')) {
  const lv = process.env.MAPLV || 'L01';
  const page = await open(lv);
  const info = await page.evaluate(() => ({ ri: window.__p5t.renderInfo(), map: window.__p5t.sceneKit.p5tMapInfo?.() ?? null }));
  console.log('render', JSON.stringify(info));
  await page.keyboard.press('KeyM'); await page.waitForTimeout(1500);
  await snap(page, `map-${lv}-overview`, 600);
  await page.keyboard.press('KeyM'); await page.waitForTimeout(1500);
  await snap(page, `map-${lv}-default`, 600);
  const fps = await page.evaluate(() => new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 3000) requestAnimationFrame(f); else res(n / ((performance.now() - t0) / 1000)); }; requestAnimationFrame(f); }));
  console.log('fps (swiftshader, 2 核无 GPU)', fps.toFixed(1));
  await page.close();
}
console.log('errors', JSON.stringify(errs.slice(0, 10)));
await browser.close(); await server.close();
