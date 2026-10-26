// r15 实机录像：Joker 掩体后 GUN 暴击 e1（心形量表缩减、DOWN、1 MORE）→ 1 MORE 用 PERSONA 耶哈召唤原版 Arsene → Skull SWORD 击退 e2 → ENEMY TURN（e1 先 DownReturn 起身再开枪、敌回合无 SHOT 牌、敌兵蹲掩体）→ 第 2 回合两枪击倒 → 原版镜头轨道结算。
// （以下为 r14 头注，复制自 rec-r13；r14 改动：原版指令牌排版/红描边/原版场内贴图/压低瞄准镜头/击飞/结算 3D 站位）
// r13 实机录像：开战 YOUR TURN → Joker 移到全掩体后（路径/终点格/掩体面盾牌）→ 新指令牌 → GUN 过肩瞄准（遮挡物抖动镂空）→ 侧移出掩体开火 → CHANCE 暴击正面特写 → 回掩体
// → Skull 贴身 SWORD 近战击退 → Mona PERSONA 技能列表 + 选目标 → ENEMY TURN → YOUR TURN 第 2 回合击倒两敌 → 结算两页。
// 复制自 tools/rec-r12（虚拟时钟逐帧，非加速）：node tools/rec-r13/rec.mjs FROM TO；结束时另存 __bgmLog（bgm-*.json）给 mix.py。
import { chromium } from 'playwright';
import { preview } from 'vite';
import fs from 'node:fs';
const FROM = +(process.argv[2] ?? 0), TO = +(process.argv[3] ?? 1e9), STRIDE = +(process.env.STRIDE || 1);
const OUT = process.env.OUT || '/workspace/work/r15/frames';
fs.mkdirSync(OUT, { recursive: true });
const port = 4360 + Math.floor(Math.random() * 30);
const server = await preview({ preview: { port, host: '127.0.0.1' } });
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('GL Driver')) errs.push(m.text()); });
await page.addInitScript({ path: new URL('./vclock.js', import.meta.url).pathname });
await page.addInitScript(() => { window.__ff = true; }); // 加载/开场 YOUR TURN 期间不画 WebGL（swiftshader 下自动时钟每秒只走 ~25ms，开场横幅会卡 80s）；录制前关掉
const t0 = Date.now();
await page.goto(`http://127.0.0.1:${port}/?speed=1&level=L01`);
await page.waitForFunction(() => window.__p5t && window.__p5t.started && window.__p5t.charsReady && !window.__p5t.busy, null, { timeout: 110000, polling: 300 }).catch(async (e) => { console.log('STATE', await page.evaluate(() => { const P = window.__p5t; return P ? JSON.stringify({ s: P.started, c: P.charsReady, b: P.busy, k: P.sceneKit?.ready }) : 'no __p5t'; })); throw e; });
await page.waitForFunction(() => window.__p5t.sceneKit.ready, null, { timeout: 30000, polling: 300 }).catch(() => console.log('WARN sceneKit not ready'));
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1500);
// 布景（45s 内走完整流程）：去掉增援事件；e1 挪到 (6,8)（空地、无掩体 → CHANCE 暴击；不动不开枪），e2 挪到 (2,8)（Skull 从 (2,9) 贴身近战 → 向北击退到 (2,5) 掩体前；不移动，敌方回合只原地开枪），HP 加大让第 1 回合打不死
await page.evaluate(async () => { const P = window.__p5t, B = P.battle, a = B.unit('e1'), b = B.unit('e2'); B.map.events = []; if (B.rt && B.rt.events) B.rt.events = []; a.pos = { x: 6, y: 8 }; a.hp = a.maxHp = 90; a.move = 0; a.melee = 0; b.pos = { x: 2, y: 8 }; b.hp = b.maxHp = 90; b.move = 0; a.guard = false; b.guard = false; /* r15：e1 保留枪（敌回合起身后开枪），不移动 */ await P.play([]); });
await page.waitForTimeout(800);
await page.evaluate(() => window.__vc.setAuto(false));
await page.evaluate(() => { window.__ff = false; });
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
  ['f', 15, () => P("P.play([{type:'phaseStart',phase:'player',turn:1}])"), '开战：第 1 回合 YOUR TURN'],
  ['idle', 8, () => P("P.select('joker')"), 'select joker'],
  ['f', 25, () => P("P.tap({tile:{x:6,y:11}})"), 'joker preview move → (6,11) 全掩体后'],
  ['f', 30, () => P("P.tap({tile:{x:6,y:11}})"), 'joker confirm move'],
  ['idle', 35, () => click('#cmd .gun'), 'joker 指令牌（镜头更近、TURN 面板、无按键圆钮）→ GUN'],
  ['f', 25, () => P("P.tap({unit:'e1'})"), 'joker aim e1（心形：青/红预计段/暗 + 锁定红圈）'],
  ['f', 35, () => P("P.tap({unit:'e1'})"), 'joker fire（侧移→过肩→暴击特写→心形缩减→DOWN→1 MORE）'],
  ['idle', 15, () => P("P.select('joker')"), '1 MORE：再选 joker'],
  ['f', 20, () => click('#cmd .persona'), 'joker PERSONA → 技能列表'],
  ['f', 38, () => P("P.skillPick()"), 'joker pick 耶哈'],
  ['f', 30, () => P("P.tap({unit:'e1'})"), 'joker 耶哈释放 → 召唤原版 Arsene'],
  ['idle', 10, () => P("P.select('skull')"), 'select skull'],
  ['f', 20, () => P("P.tap({tile:{x:2,y:9}})"), 'skull preview move → (2,9) 贴 e2'],
  ['f', 28, () => P("P.tap({tile:{x:2,y:9}})"), 'skull confirm move'],
  ['idle', 25, () => click('#cmd .sword'), 'skull SWORD'],
  ['f', 15, () => P("P.tap({unit:'e2'})"), 'skull melee target e2'],
  ['f', 25, () => P("P.tap({unit:'e2'})"), 'skull melee → 击退'],
  ['idle', 10, () => click('#endbar button'), 'end turn → ENEMY TURN（e1 起身再开枪）'],
  ['idle', 10, () => P("P.battle.unit('e1').hp=4;P.battle.unit('e2').hp=4;P.select('joker')"), 'turn2（布景 e1/e2 HP→4）select joker'],
  ['f', 18, () => click('#cmd .gun'), 'joker GUN'],
  ['f', 12, () => P("P.tap({unit:'e1'})"), 'joker aim e1'],
  ['f', 15, () => P("P.tap({unit:'e1'})"), 'joker fire → e1 KO'],
  ['idle', 10, () => P("P.select('skull')"), 'select skull'],
  ['f', 18, () => click('#cmd .gun'), 'skull GUN'],
  ['f', 12, () => P("P.tap({unit:'e2'})"), 'skull aim e2'],
  ['f', 15, () => P("P.tap({unit:'e2'})"), 'skull fire → e2 KO → win'],
  ['f', 200, () => P("P.resultNext()"), 'result page 2'],
  ['f', 60, null, 'done'],
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
const bgmLog = await page.evaluate((t0) => (window.__bgmLog || []).map((e) => ({ ...e, fadeMs: e.ms, ms: e.t - t0 })), T0);
fs.writeFileSync(`${OUT}/bgm-${FROM}-${TO}.json`, JSON.stringify(bgmLog));
console.log('bgm', JSON.stringify(bgmLog));
fs.writeFileSync(`${OUT}/timeline-${FROM}-${TO}.txt`, log.join('\n'));
console.log('sfx', sfxLog.length, sfxLog.map((e) => `${Math.round(e.ms)}:${e.name}`).join(' '));
console.log('stopped at frame', i, 'elapsed', (Date.now() - tStart) / 1000);
console.log(log.join('\n'));
console.log('state', await P("return P.battle.units.map(u=>u.id+'@'+u.pos.x+','+u.pos.y+' hp'+u.hp+(u.ko?' KO':'')+(u.downed?' D':'')).join(' | ')"));
console.log('errors', JSON.stringify(errs.slice(0, 8)));
await browser.close(); await server.close();
