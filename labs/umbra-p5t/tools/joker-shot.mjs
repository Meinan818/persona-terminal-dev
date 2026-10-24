// Joker 实体模型截图（需先 tools/fetch-private-models.sh + npm run build）：
// joker-full-L01（整图）/ joker-idle-L01（近景待机）/ joker-aim（举枪）/ joker-run / joker-downed / joker-aimcam（实战事件：走格→枪击过肩机位）
import { chromium } from 'playwright';
import { preview } from 'vite';
const OUT = process.env.OUT || '/workspace/work/notes/shots/2026-10-25';
const LV = process.env.LV || 'L01';
const server = await preview({ preview: { port: 4327, host: '127.0.0.1' } });
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errs = [];
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => errs.push(String(e)));
page.on('console', (m) => { if ((m.type() === 'warning' || m.type() === 'error') && !m.text().includes('GL Driver')) errs.push(m.text()); });
await page.goto(`http://127.0.0.1:4327/?speed=1&level=${LV}`);
await page.waitForFunction(() => window.__p5t && !window.__p5t.busy && window.__p5t.sceneKit.ready, null, { timeout: 60000 });
await page.waitForFunction(() => window.__p5t.jokerModel, null, { timeout: 30000 }).catch(() => errs.push('joker model NOT loaded (placeholder)'));
await page.evaluate(() => document.fonts.ready);
const shot = async (name, wait = 700) => { await page.waitForTimeout(wait); await page.screenshot({ path: `${OUT}/joker-${name}.png` }); console.log('shot', name); };
await shot(`full-${LV}`, 1500);
const info = await page.evaluate(() => {
  const P = window.__p5t, b = P.battle, j = b.unit('joker');
  const foe = b.units.filter((u) => u.side === 'enemy' && !u.ko && !b.isHidden(u)).sort((a, c) => (Math.abs(a.pos.x - j.pos.x) + Math.abs(a.pos.y - j.pos.y)) - (Math.abs(c.pos.x - j.pos.x) + Math.abs(c.pos.y - j.pos.y)))[0];
  return { j: j.pos, foe: foe?.id, fp: foe?.pos, loaded: P.jokerModel };
});
console.log(JSON.stringify(info));
if (info.loaded) {
  const pose = (p) => page.evaluate(([p, fid]) => {
    const P = window.__p5t, r = P.rigs.get('joker'), b = P.battle, j = b.unit('joker'), f = b.unit(fid);
    r.setRunning(false); r.endAim(); j.downed = false;
    const front = { x: j.pos.x, y: 0, z: j.pos.y + 5 };
    if (p === 'aim') { const tgt = { x: f.pos.x, y: 0, z: f.pos.y }; r.aim(tgt, 'gun', 1e9); P.portrait('joker', Math.atan2(tgt.x - j.pos.x, tgt.z - j.pos.y) + 2.2, 2.4, 0.7); return; }
    r.faceTo(front);
    if (p === 'run') r.setRunning(true);
    if (p === 'downed') j.downed = true; // 只为截图：refreshLabels 每帧按规则状态同步倒地
    P.portrait('joker', 0.5, p === 'downed' ? 2.6 : 2.0, p === 'downed' ? 1.6 : 0.55);
  }, [p, info.foe]);
  for (const p of ['idle', 'aim', 'run', 'downed']) { await pose(p); await shot(p === 'idle' ? `idle-${LV}` : p, p === 'run' ? 1010 : 1100); }
  await page.evaluate(() => { const P = window.__p5t; P.battle.unit('joker').downed = false; P.portrait(null); });
  // 实战事件：走两格（跑步）→ 枪击（过肩机位，右臂指向目标）→ 目标受击
  await page.evaluate(([fid]) => {
    const P = window.__p5t, j = P.battle.unit('joker');
    const path = [j.pos, { x: j.pos.x, y: j.pos.y - 1 }, { x: j.pos.x, y: j.pos.y - 2 }];
    P.play([{ type: 'move', unitId: 'joker', from: j.pos, path }, { type: 'attack', kind: 'gun', attackerId: 'joker', targetId: fid }, { type: 'damage', unitId: fid, amount: 42 }]);
  }, [info.foe]);
  await page.waitForTimeout(450); await page.screenshot({ path: `${OUT}/joker-aimcam.png` }); console.log('shot aimcam'); // 截图本身约 0.5s（swiftshader）
  await page.waitForFunction(() => !window.__p5t.busy, null, { timeout: 15000 });
}
console.log('errors', errs.slice(0, 10));
await browser.close(); server.httpServer.close();
