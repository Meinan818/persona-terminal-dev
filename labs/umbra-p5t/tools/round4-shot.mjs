// round4 截图：比例/脸部修正后的 Skull·Mona、暗色敌兵、默认近景镜头。
// 用法：npm run build 后 node tools/round4-shot.mjs [only=party,enemy,full,l08,rotate]
import { chromium } from 'playwright';
import { preview } from 'vite';
const OUT = process.env.OUT || '/workspace/work/notes/shots/2026-10-25';
const ONLY = (process.argv[2] || 'party,enemy,full,l08,rotate').split(',');
const server = await preview({ preview: { port: 4332, host: '127.0.0.1' } });
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errs = [];
async function open(level, w = 1280, h = 720) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on('pageerror', (e) => errs.push(String(e)));
  page.on('console', (m) => { if ((m.type() === 'warning' || m.type() === 'error') && !m.text().includes('GL Driver')) errs.push(m.text()); });
  await page.goto(`http://127.0.0.1:4332/?speed=1&level=${level}`);
  await page.waitForFunction(() => window.__p5t && !window.__p5t.busy && window.__p5t.sceneKit.ready, null, { timeout: 60000 });
  await page.waitForFunction(() => window.__p5t.rigs.has('joker'), null, { timeout: 30000 }).catch(() => errs.push('joker rig missing'));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1200);
  return page;
}
/** 找一块空地（中心格 + 左右各 1 格 + 前方 3 行都是空地），返回格坐标；把 ids 依次摆在 dx 位置（只挪显示） */
async function stage(page, ids, gap = 0.95) {
  return page.evaluate(([ids, gap]) => {
    const P = window.__p5t, m = P.battle.map, free = (x, y) => y >= 0 && y < m.height && x >= 0 && x < m.width && !['wall', 'half', 'full'].includes(m.tiles[y][x]) && !(m.heights?.[y]?.[x]);
    let best = null;
    for (let y = 0; y < m.height - 3 && !best; y++) for (let x = 2; x < m.width - 2 && !best; x++) {
      let ok = true; for (let dy = 0; dy <= 2 && ok; dy++) for (let dx = -1; dx <= 1 && ok; dx++) if (!free(x + dx, y + dy)) ok = false;
      if (ok) best = { x, y };
    }
    best ??= { x: Math.floor(m.width / 2), y: Math.floor(m.height / 2) };
    const c = P.rigs.get(ids[0]).root.parent;
    const base = c.position.clone(); base.x += best.x - P.battle.unit(ids[0]).pos.x; base.z += best.y - P.battle.unit(ids[0]).pos.y; base.y = 0;
    ids.forEach((id, i) => { const r = P.rigs.get(id); if (!r) return; const g = r.root.parent; g.visible = true; const dx = (i === 0 ? 0 : i % 2 ? 1 : -1) * Math.ceil(i / 2) * gap; g.position.set(base.x + dx, base.y, base.z); r.faceTo({ x: g.position.x, y: 0, z: g.position.z + 5 }); });
    return best;
  }, [ids, gap]);
}
const snap = async (page, name, wait = 600) => { await page.waitForTimeout(wait); await page.screenshot({ path: `${OUT}/round4-${name}.png` }); console.log('shot', name); };

if (ONLY.includes('party')) {
  const page = await open('L01');
  // 三人并排站到 Joker 旁边（只挪显示位置），从正前方拍
  console.log('stage', JSON.stringify(await stage(page, ['joker', 'skull', 'mona'])));
  await page.evaluate(() => window.__p5t.portrait('joker', 0.1, 2.5, 1.45));
  await snap(page, 'party-idle', 900);
  await page.evaluate(() => { const P = window.__p5t; for (const id of ['joker', 'skull', 'mona']) { const r = P.rigs.get(id); const g = r.root.parent; r.aim({ x: g.position.x + 0.3, y: 0, z: g.position.z + 6 }, id === 'joker' ? 'gun' : 'melee', 1e9); } });
  await snap(page, 'party-attack', 700);
  await page.evaluate(() => { const P = window.__p5t; for (const id of ['joker', 'skull', 'mona']) { const r = P.rigs.get(id); r.endAim(); r.setRunning(true); } });
  await snap(page, 'party-run', 700);
  // Joker 过肩举枪
  await page.evaluate(() => {
    const P = window.__p5t, r = P.rigs.get('joker'), g = r.root.parent;
    for (const id of ['skull', 'mona']) { P.rigs.get(id).setRunning(false); P.rigs.get(id).root.visible = false; }
    r.setRunning(false); const tgt = { x: g.position.x + 1, y: 0, z: g.position.z + 6 }; r.aim(tgt, 'gun', 1e9);
    P.portrait('joker', Math.atan2(1, 6) + Math.PI + 0.45, 1.6, 0.55);
  });
  await snap(page, 'joker-aim-shoulder', 900);
  await page.evaluate(() => { const P = window.__p5t; P.portrait('joker', Math.atan2(1, 6) + 1.2, 1.9, 0.4); });
  await snap(page, 'joker-aim-side', 500);
  await page.close();
}

if (ONLY.includes('enemy')) {
  const page = await open('L01');
  const ids = await page.evaluate(() => {
    const P = window.__p5t, b = P.battle;
    const es = b.units.filter((u) => u.side === 'enemy' && !u.ko && P.rigs.has(u.id)).map((u) => u.id);
    return es;
  });
  await stage(page, ids.slice(0, 3));
  await page.evaluate((es) => { for (const u of window.__p5t.battle.units) if (u.side === 'ally') { const r = window.__p5t.rigs.get(u.id); if (r) r.root.visible = false; } window.__p5t.portrait(es[0], 0.1, 2.5, 1.45); }, ids);
  await snap(page, 'enemy-idle', 900);
  await page.evaluate((es) => { const P = window.__p5t; const r0 = P.rigs.get(es[0]); const g = r0.root.parent; r0.aim({ x: g.position.x, y: 0, z: g.position.z + 5 }, 'melee', 1e9); P.rigs.get(es[1])?.setRunning(true); P.rigs.get(es[2])?.flinch(); }, ids);
  await snap(page, 'enemy-attack', 650);
  await page.evaluate((es) => { const P = window.__p5t; P.rigs.get(es[1])?.setRunning(false); const b = P.battle; b.unit(es[2]).downed = true; P.rigs.get(es[0]).endAim(); P.fxKeep.add(es[1]); b.unit(es[1]).ko = true; P.rigs.get(es[1])?.die(); }, ids);
  await snap(page, 'enemy-down-die', 420);
  await page.close();
}

if (ONLY.includes('full')) {
  for (const [w, h] of [[1280, 720], [844, 390]]) {
    const page = await open('L01', w, h);
    await snap(page, `default-L01-${w}x${h}`, 600);
    const px = await page.evaluate(() => { const P = window.__p5t, r = P.rigs.get('joker'), g = r.root.parent; const cam = P.camera; const a = g.position.clone().project(cam), b = g.position.clone().setY(g.position.y + 1.1).project(cam); return Math.round(Math.abs(b.y - a.y) / 2 * innerHeight); });
    console.log('joker px', w, h, px);
    if (w === 1280) {
      await page.keyboard.press('KeyE'); await page.waitForTimeout(2200); await snap(page, `default-L01-rot90-${w}x${h}`, 300);
      await page.keyboard.press('KeyM'); await page.waitForTimeout(1800); await snap(page, `overview-L01-${w}x${h}`, 300);
    }
    await page.close();
  }
}

if (ONLY.includes('l08')) {
  const page = await open('L08');
  await snap(page, 'L08-1280x720', 800);
  await page.evaluate(() => { const P = window.__p5t; P.rig.setZoom?.(0); });
  await page.close();
}

if (ONLY.includes('rotate')) {
  const page = await open('L01');
  await snap(page, 'rotate-L01-0', 300);
  for (const k of [1, 2]) {
    await page.keyboard.press('KeyE');
    await page.waitForTimeout(2500);
    await snap(page, `rotate-L01-${k * 90}`, 400);
  }
  await page.close();
}
console.log('errors', errs.slice(0, 10));
await browser.close(); server.httpServer.close();
