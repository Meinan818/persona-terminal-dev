// r6 截图：最大近景、敌方过肩瞄准、召唤暗屏只压背景、技能命中落在目标、batch-03 角色/敌兵
import { chromium } from 'playwright';
import { preview } from 'vite';
const OUT = process.env.OUT || '/workspace/work/notes/shots/2026-10-26';
const ONLY = (process.argv[2] || 'zoom,aim,summon,party,bw,foes').split(',');
const server = await preview({ preview: { port: 4337, host: '127.0.0.1' } });
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errs = [];
async function open(level, need = ['joker'], w = 1280, h = 720, speed = 1) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(`http://127.0.0.1:4337/?speed=${speed}&level=${level}`);
  await page.waitForFunction(() => window.__p5t && !window.__p5t.busy && window.__p5t.sceneKit.ready, null, { timeout: 100000 });
  for (const id of need) await page.waitForFunction((id) => window.__p5t.rigs.get(id)?.mixer, id, { timeout: 100000 }).catch(() => errs.push(`${level}: ${id} 正版 rig 缺`));
  await page.waitForTimeout(1200);
  return page;
}
const snap = async (page, name, wait = 500) => { await page.waitForTimeout(wait); await page.screenshot({ path: `${OUT}/r6-${name}.png` }); console.log('shot', name); };
const pxH = (page, id) => page.evaluate((id) => {
  const P = window.__p5t, g = P.unitMesh.get(id); const T = g.position.constructor;
  let y0 = 1e9, y1 = -1e9; const v = new T();
  g.traverse((o) => { if (o.isSkinnedMesh && o.visible && !o.userData.outline) { o.computeBoundingBox(); const b = o.boundingBox.clone().applyMatrix4(o.matrixWorld); for (const y of [b.min.y, b.max.y]) { v.set(g.position.x, y, g.position.z).project(P.camera); const py = (1 - v.y) / 2 * innerHeight; y0 = Math.min(y0, py); y1 = Math.max(y1, py); } } });
  return Math.round(y1 - y0);
}, id);
const kinds = (page) => page.evaluate(() => [...window.__p5t.rigs].map(([id, r]) => `${id}:${r.key ?? r.constructor.name}:h${r.height.toFixed(2)}`).join(' '));

if (ONLY.includes('zoom')) {
  const page = await open('L01', ['joker', 'skull', 'mona']);
  console.log('default joker px', await pxH(page, 'joker'));
  await page.evaluate(() => { const P = window.__p5t, g = P.unitMesh.get('joker'); P.rig.userZoom = P.rig.zMax; P.rig.focus(g.position.clone(), P.rig.zMax); P.rig.cur = { ...P.rig.tgt }; P.rig.apply(); });
  await page.waitForTimeout(1500);
  console.log('cur zoom', await page.evaluate(() => window.__p5t.rig.cur.zoom.toFixed(2)));
  console.log('max zoom', await page.evaluate(() => window.__p5t.rig.zMax.toFixed(2)), 'levels', await page.evaluate(() => window.__p5t.rig.levels.join('/')), 'joker px', await pxH(page, 'joker'));
  await snap(page, 'zoom-max-L01');
  await page.close();
}
if (ONLY.includes('aim') || ONLY.includes('summon')) {
  const page = await open('L01', ['joker', 'skull', 'mona'], 1280, 720, ONLY.includes('summon') ? 0.2 : 1);
  const foe = await page.evaluate(() => window.__p5t.battle.units.find((u) => u.side === 'enemy' && !u.ko && window.__p5t.rigs.get(u.id)?.mixer)?.id);
  await page.waitForFunction((id) => window.__p5t.rigs.get(id)?.mixer, foe, { timeout: 60000 });
  if (ONLY.includes('aim')) {
    await page.evaluate((foe) => { const P = window.__p5t; const t = P.unitMesh.get('joker'); P.rigs.get(foe).aim(t.position, 'gun', 4000); void P.fx.aimShot(foe, 'joker', false); }, foe);
    await snap(page, 'enemy-aim', 1100);
    await page.evaluate(() => window.__p5t.fx.endAim(0));
    await page.evaluate(() => { const P = window.__p5t; const t = P.unitMesh.get('e1') ?? [...P.unitMesh.values()][3]; P.rigs.get('joker').aim(t.position, 'gun', 4000); void P.fx.aimShot('joker', [...P.battle.units].find((u) => u.side === 'enemy').id, true); });
    await snap(page, 'joker-aim', 1000);
    await page.evaluate(() => window.__p5t.fx.endAim(0));
    await page.waitForTimeout(800);
  }
  if (ONLY.includes('summon')) {
    await page.evaluate((foe) => { const P = window.__p5t, g = P.unitMesh.get('joker'), t = P.unitMesh.get(foe); P.rig.userZoom = P.rig.levels[3]; P.rig.focus(g.position.clone(), P.rig.levels[3]); P.rigs.get('joker').aim(t.position, 'skill', 3000); }, foe);
    await page.waitForTimeout(1400);
    await page.evaluate(() => { const P = window.__p5t; P.rigs.get('joker').aim(null, 'skill', 3000); void P.summonCutIn('joker', 'eiha'); });
    await snap(page, 'summon-dim', 1500);
    await page.waitForTimeout(3500);
    await page.waitForTimeout(1200);
    await page.evaluate((foe) => { const P = window.__p5t, g = P.unitMesh.get(foe); P.rig.focus(g.position.clone(), P.rig.levels[3]); }, foe);
    await page.waitForTimeout(1300);
    await page.evaluate((foe) => window.__p5t.fx.skillHit(foe, 'eiha'), foe);
    await snap(page, 'eiha-hit', 900);
  }
  await page.close();
}
if (ONLY.includes('party')) {
  const page = await open('L05', ['joker', 'panther', 'fox']);
  console.log(await kinds(page));
  await snap(page, 'default-L05');
  for (const id of (process.env.PARTY || 'panther,fox').split(',')) {
    await page.evaluate((id) => { const P = window.__p5t, g = P.unitMesh.get(id); P.rigs.get(id).faceTo({ x: g.position.x, y: 0, z: g.position.z + 5 }); P.portrait(id, 0.7, 1.8, 0.5); }, id);
    await snap(page, `${id}-idle`, 700);
    await page.evaluate((id) => { const P = window.__p5t, g = P.unitMesh.get(id); P.rigs.get(id).aim({ x: g.position.x, y: 0, z: g.position.z + 5 }, 'gun', 1e9); }, id);
    await snap(page, `${id}-gun`, 1400);
    await page.evaluate((id) => { const P = window.__p5t, g = P.unitMesh.get(id); P.rigs.get(id).endAim(); }, id);
    await page.waitForTimeout(1200);
    await page.evaluate((id) => { const P = window.__p5t, g = P.unitMesh.get(id); P.rigs.get(id).aim({ x: g.position.x, y: 0, z: g.position.z + 5 }, 'melee', 2400); }, id);
    await snap(page, `${id}-melee`, 380);
    await page.waitForTimeout(1800);
  }
  const foe = await page.evaluate(() => window.__p5t.battle.units.filter((u) => u.side === 'enemy' && !u.ko).map((u) => `${u.id}:${u.name}:${window.__p5t.rigs.get(u.id)?.key}`).join(' '));
  console.log('L05 foes', foe);
  await page.close();
}
async function foeShot(level, pick, name) {
  const page = await open(level, ['joker']);
  const ids = await page.evaluate((pick) => window.__p5t.battle.units.filter((u) => u.side === 'enemy' && new RegExp(pick).test(u.name)).map((u) => u.id), pick);
  if (!ids.length) { errs.push(`${level} 无 ${pick}`); await page.close(); return; }
  const id = ids[0];
  await page.waitForFunction((id) => window.__p5t.rigs.get(id)?.mixer, id, { timeout: 100000 }).catch(() => errs.push(`${level} ${pick} 正版 rig 缺`));
  console.log(level, pick, await page.evaluate((id) => window.__p5t.rigs.get(id)?.key, id));
  await page.evaluate((id) => { const P = window.__p5t, g = P.unitMesh.get(id); g.visible = true; g.traverse((o) => { o.visible = o.visible; }); P.rigs.get(id)?.faceTo({ x: g.position.x, y: 0, z: g.position.z + 5 }); P.portrait(id, 0.5, 2.0, 0.6); }, id);
  await snap(page, name, 900);
  await page.close();
}
// 关卡里开局不在场（增援）的单位：在 L01 把 e1 的模型临时换成该正版模型拍特写（只动画面）
async function keyShot(page, key, name) {
  const ok = await page.evaluate(async (key) => {
    const P = window.__p5t; if (!(await P.chars.preloadChar(key))) return false;
    const g = P.unitMesh.get('e1'); while (g.children.length) g.remove(g.children[0]);
    const r = P.chars.makeChar(key); g.add(r.root); P.rigs.set('e1', r); g.visible = true;
    r.faceTo({ x: g.position.x, y: 0, z: g.position.z + 5 }); P.portrait('e1', 0.5, 2.0, 0.6); return true;
  }, key);
  if (!ok) errs.push(`${key} 缺`); else await snap(page, name, 1200);
}
if (ONLY.includes('keys')) {
  const page = await open('L01', ['joker']);
  for (const [k, n] of (process.env.KEYS || 'fox_bw:bw-fox,panther_bw:bw-panther,em0002_010:grenadier,em0003_010:drummer,em0001_016:sniper,queen:queen,erina:erina,marie:marie').split(',').map((x) => x.split(':'))) await keyShot(page, k, n);
  await page.close();
}
if (ONLY.includes('bw')) { await foeShot('L04', 'FOX', 'bw-fox'); await foeShot('L04', 'PANTHER', 'bw-panther'); }
if (ONLY.includes('foes')) { await foeShot('L05', 'Grenadier', 'grenadier'); await foeShot('L08', 'Drummer', 'drummer'); await foeShot('L08', '狙击', 'sniper'); }
console.log('errs', errs.length ? errs : 'none');
await browser.close(); server.httpServer.close();
