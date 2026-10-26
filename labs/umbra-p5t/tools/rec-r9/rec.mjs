// r9（同 r8 时间线，复制自 tools/rec-r8）r8 实时逐帧录像（同 r7 时间线；另存 SE 事件 sfx.json 供 ffmpeg 混音）（虚拟时钟逐帧推进，非加速）：node tools/rec-r7/rec.mjs FROM TO   （帧号，30fps；FROM 之前快进不绘制）
import { chromium } from 'playwright';
import { preview } from 'vite';
import fs from 'node:fs';
const FROM = +(process.argv[2] ?? 0), TO = +(process.argv[3] ?? 1e9), STRIDE = +(process.env.STRIDE || 1);
const OUT = process.env.OUT || '/workspace/work/r9/frames';
fs.mkdirSync(OUT, { recursive: true });
const port = 4360 + Math.floor(Math.random() * 30);
const server = await preview({ preview: { port, host: '127.0.0.1' } });
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('GL Driver')) errs.push(m.text()); });
await page.addInitScript({ path: new URL('./vclock.js', import.meta.url).pathname });
const t0 = Date.now();
await page.goto(`http://127.0.0.1:${port}/?speed=1&level=L01`);
await page.waitForFunction(() => window.__p5t && !window.__p5t.busy && window.__p5t.sceneKit.ready && window.__p5t.rigs.size >= 5, null, { timeout: 90000, polling: 200 });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1500);
// 布景：e1 挪到 (3,8)、HP 50（让 Skull 近战够得到、Mona 枪击打倒而不击杀 → 1 MORE）
await page.evaluate(async () => { const P = window.__p5t, u = P.battle.unit('e1'); u.pos = { x: 3, y: 8 }; u.hp = 50; u.maxHp = 50; await P.play([]); });
await page.waitForTimeout(800);
await page.evaluate(() => window.__vc.setAuto(false));
const T0 = await page.evaluate(() => performance.now()); // 第 0 帧的虚拟时间（SE 时间轴零点）
console.log('loaded in', (Date.now() - t0) / 1000, 's');
await page.mouse.move(640, 360);

const ev = (f, a) => page.evaluate(f, a);
const P = (code) => page.evaluate(`(()=>{const P=window.__p5t;${code}})()`);
// 时间线：[等待类型, 参数, 动作]
// 'idle' n：busy=false 连续 n 帧后执行；'f' n：上一动作后再过 n 帧执行
// 跟随：等同游戏 camFollow（每帧 rig.focus(单位位置, 当前缩放)），走格开始到停步后 4 帧
let follow = null;
const fol = (id, code) => { follow = { id, moved: false, still: 0, last: null }; return P(code); };
async function followStep() {
  if (!follow) return;
  const r = await page.evaluate((id) => { const P = window.__p5t, g = P.unitMesh.get(id); if (!g) return null; P.rig.focus(g.position.clone(), P.rig.tgt.zoom); return [g.position.x, g.position.z]; }, follow.id);
  if (!r) { follow = null; return; }
  if (follow.last) { const d = Math.hypot(r[0] - follow.last[0], r[1] - follow.last[1]); if (d > 1e-3) { follow.moved = true; follow.still = 0; } else if (follow.moved && ++follow.still >= 4) follow = null; }
  if (follow) follow.last = r;
}
const tl = [
  ['f', 75, () => page.mouse.wheel(0, -120), 'zoom in'],
  ['f', 14, () => page.mouse.wheel(0, -120), 'zoom in 2'],
  ['f', 20, () => P("P.select('joker')"), 'select joker'],
  ['f', 30, () => P("P.tap({tile:{x:4,y:11}})"), 'joker preview'],
  ['f', 30, () => fol('joker', "P.tap({tile:{x:4,y:11}})"), 'joker move'],
  ['idle', 55, () => P("P.select('skull')"), 'select skull'],
  ['f', 20, () => P("P.tap({tile:{x:3,y:9}})"), 'skull preview tile'],
  ['f', 20, () => P("P.setMode('melee');P.tap({unit:'e1'})"), 'skull forecast'],
  ['f', 45, () => fol('skull', "P.tap({unit:'e1'})"), 'skull commit'],
  ['idle', 50, () => P("P.select('mona')"), 'select mona'],
  ['f', 18, () => P("P.tap({tile:{x:6,y:9}})"), 'mona preview tile'],
  ['f', 18, () => P("P.setMode('gun');P.tap({unit:'e1'})"), 'mona forecast'],
  ['f', 45, () => fol('mona', "P.tap({unit:'e1'})"), 'mona commit'],
  ['idle', 50, () => P("P.select('joker')"), 'select joker2'],
  ['f', 18, () => P("P.setSkill('eiha');P.tap({unit:'e1'})"), 'joker skill forecast'],
  ['f', 45, () => P("P.tap({unit:'e1'})"), 'joker skill commit'],
  ['idle', 60, () => page.click('#endbar'), 'end turn'],
  ['idle', 105, null, 'done'],
];
let i = 0, k = 0, since = 0, idleRun = 0, ff = null;
const log = [];
const tStart = Date.now();
while (k < tl.length && i <= TO) {
  const wantFF = i < FROM || (STRIDE > 1 && i % STRIDE !== 0);
  if (wantFF !== ff) { ff = wantFF; await ev((v) => { window.__ff = v; }, ff); }
  const busy = await ev(() => window.__p5t.busy);
  idleRun = busy ? 0 : idleRun + 1;
  const [kind, n, act, name] = tl[k];
  if ((kind === 'f' && since >= n) || (kind === 'idle' && idleRun >= n && since >= 3)) {
    log.push(`${i} ${name}`);
    if (act) await act();
    k++; since = 0; idleRun = 0;
    if (!act) break;
  }
  if (follow && follow.moved !== undefined) await followStep();
  const ta = Date.now();
  await ev(() => window.__vc.step(1000 / 30));
  const tb = Date.now();
  if (!ff) await page.screenshot({ path: `${OUT}/f${String(i).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 92 });
  if (!ff && i % 10 === 0) console.log('t', i, tb - ta, Date.now() - tb);
  if (process.env.ZLOG && [0,30,59,61,70,80,100,200,300].includes(i)) console.log('Z', i, await page.evaluate(() => { const r = window.__p5t.rig; return [r.cur.zoom.toFixed(3), r.tgt.zoom.toFixed(3), innerWidth, innerHeight].join(' '); }));
  i++; since++;
  if (i % 300 === 0) console.log('frame', i, (Date.now() - tStart) / 1000);
}
const sfxLog = await page.evaluate((t0) => (window.__sfxLog || []).map((e) => ({ ...e, ms: e.t - t0 })), T0);
fs.writeFileSync(`${OUT}/sfx-${FROM}-${TO}.json`, JSON.stringify(sfxLog));
console.log('sfx', sfxLog.length, sfxLog.map((e) => `${Math.round(e.ms)}:${e.name}`).join(' '));
console.log('stopped at frame', i, 'elapsed', (Date.now() - tStart) / 1000);
console.log(log.join('\n'));
console.log('state', await P("return P.battle.units.map(u=>u.id+'@'+u.pos.x+','+u.pos.y+' hp'+u.hp+(u.ko?' KO':'')+(u.downed?' D':'')).join(' | ')"));
console.log('errors', JSON.stringify(errs.slice(0, 8)));
await browser.close(); await server.close();
