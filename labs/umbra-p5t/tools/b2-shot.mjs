// batch-02 正版角色接入截图：默认画面、四人同框近景、Skull/Mona 攻击、敌兵、Marie、Joker 技能。
// 用法：bash tools/fetch-private-models.sh && npx vite build && node tools/b2-shot.mjs [only=default,group,skull,mona,enemy,marie,skill]
import { chromium } from 'playwright';
import { preview } from 'vite';
const OUT = process.env.OUT || '/workspace/work/notes/shots/2026-10-26';
const ONLY = (process.argv[2] || 'default,group,skull,mona,enemy,marie,skill').split(',');
const server = await preview({ preview: { port: 4334, host: '127.0.0.1' } });
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errs = [];
async function open(level, w = 1280, h = 720, need = ['joker']) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on('pageerror', (e) => errs.push(String(e)));
  page.on('console', (m) => { if ((m.type() === 'warning' || m.type() === 'error') && !m.text().includes('GL Driver')) errs.push(m.text()); });
  await page.goto(`http://127.0.0.1:4334/?speed=1&level=${level}`);
  await page.waitForFunction(() => window.__p5t && !window.__p5t.busy && window.__p5t.sceneKit.ready, null, { timeout: 120000 });
  for (const id of need) await page.waitForFunction((id) => { const r = window.__p5t.rigs.get(id); return r && r.mixer; }, id, { timeout: 90000 }).catch(() => errs.push(`${level}: ${id} 正版 rig 缺`));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1500);
  return page;
}
const snap = async (page, name, wait = 600) => { await page.waitForTimeout(wait); await page.screenshot({ path: `${OUT}/b2-${name}.png` }); console.log('shot', name); };
/** 把一组单位（只动画面）摆到 Joker 周围空地，面向 +z */
const arrange = (page, ids, face = 1) => page.evaluate(([ids, face]) => {
  const P = window.__p5t, gj = P.unitMesh.get(ids[0]); const base = gj.position.clone();
  ids.forEach((id, i) => { const g = P.unitMesh.get(id); if (!g) return; g.visible = true; g.position.set(base.x + (i - (ids.length - 1) / 2) * 1.0, base.y, base.z + (i % 2) * 0.2); const r = P.rigs.get(id); r?.faceTo({ x: g.position.x, y: 0, z: g.position.z + 5 * face }); });
}, [ids, face]);
const cam = (page, id, ang, dist, h) => page.evaluate(([id, a, d, h]) => window.__p5t.portrait(id, a, d, h), [id, ang, dist, h]);
const act = (page, id, kind, ms = 1e9) => page.evaluate(([id, kind, ms]) => { const P = window.__p5t, r = P.rigs.get(id), g = P.unitMesh.get(id); r.aim({ x: g.position.x, y: 0, z: g.position.z + 6 }, kind, ms); }, [id, kind, ms]);
const kinds = (page) => page.evaluate(() => [...window.__p5t.rigs].map(([id, r]) => `${id}:${r.key ?? r.constructor.name}:h${r.height.toFixed(2)}`).join(' '));

if (ONLY.includes('default')) {
  const page = await open('L01', 1280, 720, ['joker', 'skull', 'mona']);
  console.log(await kinds(page));
  await snap(page, 'default-L01-1280x720', 800);
  await page.close();
}
if (ONLY.includes('group') || ONLY.includes('skull') || ONLY.includes('mona') || ONLY.includes('enemy') || ONLY.includes('skill')) {
  const page = await open('L01', 1280, 720, ['joker', 'skull', 'mona']);
  const foe = await page.evaluate(() => window.__p5t.battle.units.find((u) => u.side === 'enemy' && !u.ko && window.__p5t.rigs.get(u.id)?.mixer)?.id);
  if (!foe) errs.push('L01 没有正版敌兵 rig');
  const ids = ['joker', 'skull', 'mona'];
  await arrange(page, ids);
  if (ONLY.includes('group')) { await cam(page, 'joker', 0.15, 4.2, 0.9); await page.evaluate(() => { window.__p5t.portrait('joker', 0.15, 4.2, 0.9); }); await snap(page, 'group-4', 900); }
  if (ONLY.includes('skull')) {
    await cam(page, 'skull', 0.2, 1.1, 0.35); await snap(page, 'skull-face', 600);
    await cam(page, 'skull', 0.6, 2.2, 0.8);
    await act(page, 'skull', 'melee', 2400); await snap(page, 'skull-attack', 380);
    await page.waitForTimeout(2200);
    await act(page, 'skull', 'gun', 1e9); await snap(page, 'skull-gun', 900);
    await page.evaluate(() => window.__p5t.rigs.get('skull').endAim()); await page.waitForTimeout(900);
  }
  if (ONLY.includes('mona')) {
    await cam(page, 'mona', 0.6, 1.9, 0.6);
    await act(page, 'mona', 'melee', 2400); await snap(page, 'mona-attack', 380);
    await page.waitForTimeout(2200);
    await act(page, 'mona', 'gun', 1e9); await snap(page, 'mona-gun', 900);
    await page.evaluate(() => window.__p5t.rigs.get('mona').endAim()); await page.waitForTimeout(900);
  }
  if (ONLY.includes('enemy') && foe) {
    await page.evaluate((id) => { const P = window.__p5t, g = P.unitMesh.get(id); P.rigs.get(id).faceTo({ x: g.position.x, y: 0, z: g.position.z + 5 }); }, foe);
    await cam(page, foe, 0.35, 2.6, 0.9); await snap(page, 'enemy-idle', 900);
    await page.evaluate((id) => { const P = window.__p5t, r = P.rigs.get(id), g = P.unitMesh.get(id); r.aim({ x: g.position.x, y: 0, z: g.position.z + 6 }, 'gun', 1e9); }, foe);
    await snap(page, 'enemy-gun', 1000);
    await page.evaluate((id) => window.__p5t.rigs.get(id).endAim(), foe); await page.waitForTimeout(900);
    await page.evaluate((id) => window.__p5t.rigs.get(id).die(), foe); await snap(page, 'enemy-ko', 1500);
  }
  if (ONLY.includes('skill')) {
    await cam(page, 'joker', 0.5, 2.4, 0.9);
    await act(page, 'joker', 'skill', 1e9); await snap(page, 'joker-skill-start', 500); await snap(page, 'joker-skill-act', 1200);
    await page.evaluate(() => window.__p5t.rigs.get('joker').endAim()); await page.waitForTimeout(800);
    await act(page, 'joker', 'gun', 1e9); await snap(page, 'joker-gun', 900);
    await page.evaluate(() => window.__p5t.rigs.get('joker').endAim()); await page.waitForTimeout(900);
    await act(page, 'joker', 'melee', 2400); await snap(page, 'joker-knife', 420);
  }
  await page.close();
}
for (const lv of ['L04', 'L06', 'L08']) if (ONLY.includes(lv)) {
  const page = await open(lv, 1280, 720, ['joker']);
  await snap(page, `default-${lv}-1280x720`, 800);
  await page.evaluate(() => window.__p5t.camOverview?.());
  await page.close();
}
if (ONLY.includes('marie')) {
  const page = await open('L10', 1280, 720, ['joker', 'boss']);
  console.log(await kinds(page));
  await page.evaluate(() => { const P = window.__p5t, g = P.unitMesh.get('boss'); g.visible = true; P.rigs.get('boss').faceTo({ x: g.position.x, y: 0, z: g.position.z + 5 }); });
  await cam(page, 'boss', 0.3, 5.0, 1.6); await snap(page, 'marie-idle', 900);
  await act(page, 'boss', 'gun', 1e9); await snap(page, 'marie-gun', 1000);
  await page.evaluate(() => window.__p5t.rigs.get('boss').endAim()); await page.waitForTimeout(1000);
  await act(page, 'boss', 'melee', 1e9); await snap(page, 'marie-melee-chain', 1200);
  await page.close();
}
console.log(errs.length ? 'ERRS\n' + [...new Set(errs)].join('\n') : 'no errors');
await browser.close(); server.httpServer.close();
