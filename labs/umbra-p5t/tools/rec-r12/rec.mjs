// r12：待机（原版透视镜头）→ 选中 Mona 移动（白轮廓/青路径/黄箭头/盾牌）→ 指令菜单 GUN → 枪击 → Skull 同样 → 回合结束 → 原版 ENEMY TURN + 敌方行动镜头 → YOUR TURN → 第 2 回合击倒两敌 → 原版布局结算两页。
// 复制自 tools/rec-r11（虚拟时钟逐帧，非加速）：node tools/rec-r12/rec.mjs FROM TO
import { chromium } from 'playwright';
import { preview } from 'vite';
import fs from 'node:fs';
const FROM = +(process.argv[2] ?? 0), TO = +(process.argv[3] ?? 1e9), STRIDE = +(process.env.STRIDE || 1);
const OUT = process.env.OUT || '/workspace/work/r12/frames';
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
// 布景（为了 40s 内走完整流程）：去掉增援事件；e1 挪到 (3,8)、e2 挪到 (7,8)（不贴掩体 → 无 GUARD，有瞄准线；e1 贴长椅 → GUARD 红 X），都不移动（只开枪），HP 加大让第 1 回合打不死
await page.evaluate(async () => { const P = window.__p5t, B = P.battle, a = B.unit('e1'), b = B.unit('e2'); B.map.events = []; if (B.rt && B.rt.events) B.rt.events = []; a.pos = { x: 3, y: 8 }; a.hp = a.maxHp = 90; b.pos = { x: 7, y: 8 }; b.hp = b.maxHp = 90; b.move = 3; a.move = 0; a.gun = undefined; a.melee = 0; /* e1 不开枪：敌方回合只演 e2（含 1 MORE），控制总长 */ await P.play([]); });
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
const click = (sel) => P(`document.querySelector('${sel}')?.click()`);
const tl = [
  ['f', 40, () => null, 'idle cam（原版透视待机镜头）'],
  ['f', 1, () => P("P.select('mona')"), 'select mona'],
  ['f', 30, () => P("P.tap({tile:{x:3,y:10}})"), 'mona preview move（白轮廓/青路径/红终点格/黄箭头/盾牌）'],
  ['f', 45, () => P("P.tap({tile:{x:3,y:10}})"), 'mona confirm move'],
  ['idle', 40, () => click('#cmd .gun'), 'mona 指令菜单（瞄准线 + GUARD 红 X）→ GUN'],
  ['f', 18, () => P("P.tap({unit:'e2'})"), 'mona aim e2'],
  ['f', 22, () => P("P.tap({unit:'e2'})"), 'mona fire'],
  ['idle', 12, () => P("P.select('skull')"), 'select skull'],
  ['f', 25, () => P("P.tap({tile:{x:5,y:10}})"), 'skull preview move'],
  ['f', 30, () => P("P.tap({tile:{x:5,y:10}})"), 'skull confirm'],
  ['idle', 25, () => click('#cmd .persona'), 'skull PERSONA → 技能列表（红格+白描边范围）'],
  ['f', 50, () => P("P.skillPick()"), 'skull pick 吉欧'],
  ['f', 12, () => P("P.tap({unit:'e1'})"), 'skull target e1（锯齿准星+锁链线）'],
  ['f', 45, () => P("P.tap({unit:'e1'})"), 'skull release'],
  ['idle', 12, () => click('#endbar button'), 'end turn → ENEMY TURN'],
  ['idle', 12, () => P("const B=P.battle;B.unit('e1').hp=4;B.unit('e2').hp=4;P.select('joker')"), 'YOUR TURN 后 turn2:（布景 敌 HP→4）select joker'],
  ['f', 25, () => click('#cmd .gun'), 'joker GUN'],
  ['f', 15, () => P("P.tap({unit:'e2'})"), 'joker aim e2'],
  ['f', 20, () => P("P.tap({unit:'e2'})"), 'joker fire'],
  ['idle', 12, () => P("P.select('mona')"), 'select mona'],
  ['f', 20, () => click('#cmd .persona'), 'mona PERSONA'],
  ['f', 25, () => P("P.skillPick()"), 'mona pick 加尔'],
  ['f', 10, () => P("P.tap({unit:'e1'})"), 'mona target e1'],
  ['f', 20, () => P("P.tap({unit:'e1'})"), 'mona release → win'],
  ['f', 75, () => P("P.resultNext()"), 'result page 2'],
  ['f', 70, null, 'done'],
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
