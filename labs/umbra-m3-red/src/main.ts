// UMBRA M3 · 红色样板第一阶段：P5R 战斗画面 1:1 还原（固定杂兵战，完整流程 + ?demo=1 自动循环）。
// 宿主层：选皮肤、建引擎、接规则层（game/battle）与 Director；皮肤包只给数据。
import { Sprite, UPDATE_PRIORITY, RenderTexture, Rectangle } from 'pixi.js';
import 'pixi.js/prepare';
import { Engine, Director, P5Hud, validate, makeUnit, Particles, Fx, Quality, TIERS, mountTalk, setErrorHook, UMBRA } from './umbra/engine';
import type { PartyState, EnemyState, ListRow } from './umbra/engine';
import type { EventName } from './umbra/skins/_contract';
import './umbra/skins/p5r-red/index';   // 宿主选择当前皮肤（契约：宿主按主题只 import 当前皮肤包；皮肤自身不得做副作用 import）
import { Battle, SKILLS, PERSONA_SKILLS } from './game/battle';

const qs = new URLSearchParams(location.search);
const DEMO = qs.get('demo') === '1';
const SKIN = qs.get('umbra') ?? 'p5r-red';
const DPR = window.devicePixelRatio || 1;
const INIT_Q = (qs.get('q') as any) || 'high';
const MAXDT = qs.has('maxdt') ? +qs.get('maxdt')! : 100;
const RES = qs.has('res') ? +qs.get('res')! : (INIT_Q === 'high' ? Math.min(DPR, 2) : INIT_Q === 'mid' ? Math.min(DPR, 1.5) : 1);
const M: any = { boot: 0, prewarmMs: 0, rehearse: [] as string[], cold: false, frames: [] as any[], firstSkillMaxDt: 0, phase: 'boot', loops: 0, issues: [] as any[], errors: [] as string[] };
(window as any).__M = M;
const t0 = performance.now();

const eng = new Engine();
setErrorHook((e, w) => { const s = `${w}: ${(e as any)?.message ?? e}`; if (!M.errors.includes(s)) M.errors.push(s); console.warn('[umbra]', s); });
await eng.st.init(document.getElementById('app')!, RES);
const pack = UMBRA.getSkin(SKIN)!;
// ui.css（只作用于 .umbra-skin-<id>；引擎注入，皮肤不做网络请求）
const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = `skins/${SKIN}/ui.css`; document.head.appendChild(css);
await eng.loadSkin(pack, `skins/${SKIN}/`);
for (const r of pack.recipes) M.issues.push(...validate(r));
const quality = new Quality(INIT_Q, qs.get('auto') !== '0');
eng.tier = quality.tier;
eng.fx = new Fx(eng.st, RES * TIERS[eng.tier].fresK);
eng.ps = new Particles(eng.st.app.renderer, eng.st.layers.fx);
eng.ps.cap = TIERS[eng.tier].cap;
quality.onChange = (t) => { eng.tier = t; eng.ps.cap = TIERS[t].cap; };

// ---------------------------------------------------------------- scene
const slots = pack.slots as any;
const bgDef = slots['scene.battle.bg'];
const bg = new Sprite(eng.tex[bgDef.asset]); bg.anchor.set(0.5); bg.position.set(bgDef.cx, 360); bg.scale.set(1.03);
eng.bgSprite = bg; eng.st.layers.bg.addChild(bg);
const pos = slots['scene.battle.positions'];
const grid = TIERS[eng.tier].mesh;
const jk = makeUnit('joker', 'ally', eng.tex['ally.joker.back'], pos.joker.x, pos.joker.y, pos.joker.h, pos.joker.facing, slots['unit.joker.portrait'].meshIdle, 0, grid);
jk.hitY = -pos.joker.h * 0.62;
eng.units.set('joker', jk); eng.st.layers.ally.addChild(jk.root);
['noisy', 'echo'].forEach((id, i) => {
  const p = pos.enemies[i];
  const u = makeUnit(id, 'enemy', eng.tex['enemy.' + id], p.x, p.y, p.h, 1, slots[`unit.${id}.portrait`].meshIdle, i * 1.7 + 0.6, grid);
  eng.units.set(id, u); eng.st.layers.enemy.addChild(u.root);
});

const dir = new Director(eng);
const hud = new P5Hud(eng);
dir.onMainChange.push((b) => hud.setBusy(b));
const B = new Battle();
let target = 'noisy';
let auto = false;

// ---------------------------------------------------------------- HUD sync
const L = (k: string) => eng.label(k);
function syncHud() {
  const party: PartyState[] = B.party.map((id) => { const u = B.u(id); return { id, name: L(u.name), hp: u.hp, hpMax: u.hpMax, sp: u.sp, spMax: u.spMax, active: id === 'joker' }; });
  hud.updateParty(party);
  const es: EnemyState[] = B.enemies.map((id) => { const u = B.u(id); return { id, name: L(u.name), hp: u.hp, hpMax: u.hpMax, lv: u.lv, known: u.known, weak: u.weak.filter((w) => u.known.includes(w)), down: u.down, alive: u.hp > 0 }; });
  hud.updateEnemies(es);
  if (B.u(target).hp <= 0) target = B.alive(B.enemies)[0] ?? target;
  hud.setTarget(target);
  const t = B.u(target);
  hud.setStrip({ lv: t.lv, name: L(t.name), weak: t.weak.filter((w) => t.known.includes(w)), known: t.known.length > 0, turn: B.turn, order: ['joker', 'agathion', 'caitsith', 'kelpie', ...B.alive(B.enemies)] });
  hud.oneMore = B.oneMore;
}
const play = (ev: EventName, payload: unknown, q: any = {}) => { M.phase = ev + (q.skillId ? ':' + q.skillId : ''); return dir.play(ev, payload, q).then((r) => { M.phase = 'idle'; return r; }); };

// ---------------------------------------------------------------- flow
async function startBattle() {
  B.reset(); target = 'noisy';
  for (const u of eng.units.values()) { u.down = false; u.stars.visible = false; u.body.rotation = 0; u.body.x = 0; u.body.y = 0; u.body.scale.set(1); u.root.visible = true; u.root.alpha = 1; }
  hud.setHoldRing(false); hud.setMode('hidden'); syncHud(); hud.navi('navi.idle');
  await play('battle:start', { enemyIds: B.enemies });
  playerTurn();
}
function playerTurn() {
  syncHud();
  hud.navi(B.oneMore ? 'navi.onemore' : 'navi.idle');
  hud.setMode('command');
}
async function afterAction(r: ReturnType<Battle['act']>) {
  syncHud();
  if (r.newDown.length) play('unit:down', { unitIds: r.newDown, side: 'enemy' });   // 重叠层，不阻塞主线
  if (r.won) return victory(false);
  if (r.oneMore) {
    await play('onemore', { unitId: 'joker' });
    if (r.holdUp) return holdUp();
    return playerTurn();
  }
  return enemyTurn();
}
async function doSkill(skillId: string) {
  if (!B.canUse(skillId)) return;
  hud.setMode('hidden');
  const r = B.act(skillId, target);                    // 1) 规则先提交
  syncHudParty();
  await play('action', r.payload, { skillId, side: 'ally' });   // 2) 再演出
  await afterAction(r);
}
function syncHudParty() { hud.updateParty(B.party.map((id) => { const u = B.u(id); return { id, name: id, hp: u.hp, hpMax: u.hpMax, sp: u.sp, spMax: u.spMax, active: id === 'joker' }; })); }
async function enemyTurn() {
  hud.setMode('hidden'); B.oneMore = false; hud.oneMore = false;
  hud.navi('navi.enemy');
  const acts = B.enemyTurn();
  for (const a of acts) {
    if (a.kind === 'getup') { const u = eng.units.get(a.payload.unitIds[0])!; u.down = false; u.stars.visible = false; u.body.rotation = 0; u.body.x = 0; u.body.y = 0; u.body.scale.set(1); syncHud(); continue; }
    syncHudParty();
    await play('action', a.payload, { side: 'enemy', skillId: a.payload.skillId });
  }
  await play('turn:start', { unitId: 'joker' });
  playerTurn();
}
async function holdUp() {
  syncHud(); hud.navi('navi.holdup');
  await play('holdup', { enemyIds: B.alive(B.enemies) });
  hud.setHoldRing(true, B.alive(B.enemies), B.party);
  hud.setMode('holdup');
}
async function allOut() {
  hud.setMode('hidden');
  const p = B.allOut();
  hud.setHoldRing(false);
  await play('allout', p);
  for (const id of B.enemies) { const u = eng.units.get(id)!; u.root.visible = false; }
  syncHud();
  await victory(true);
}
async function victory(bonus: boolean) {
  hud.setMode('hidden'); hud.navi('navi.win');
  const rw = B.rewards(bonus);
  await play('battle:end', rw);
  hud.showResult({ exp: rw.exp, money: rw.money, items: rw.drops.map((d) => ({ name: d.name, n: d.n })), bonus });
}
async function talk() {
  hud.setMode('talk'); hud.setHoldRing(true, B.alive(B.enemies), B.party);
  await play('talk:start', { enemyId: target });
  const view = mountTalk(eng.st.dom, SKIN, pack.templates?.talk, { enemyName: L(B.u(target).name), odds: '68%' });
  await view.setLine(L('talk.line.0'));
  view.setChoices([L('talk.choice.0'), L('talk.choice.1'), L('talk.choice.2')], async (i) => {
    const ok = B.talkResolve(i);
    await view.setLine(L(ok ? 'talk.ok' : 'talk.ng'));
    await new Promise((r) => setTimeout(r, 600));
    view.destroy();
    hud.setHoldRing(false);
    if (ok) { await play('talk:result', { ok, targetIds: [target], hits: [] }); for (const id of B.enemies) eng.units.get(id)!.root.visible = false; await victory(false); }
    else { hud.setMode('holdup'); }
  });
}

hud.onCommand = (id) => {
  if (dir.busy) return;
  const m = hud.getMode();
  if (m === 'command') {
    if (id === 'attack' || id === 'gun') dir.input(`${B.id}:${B.turn}:${B.seq}:${id}`, () => doSkill(id));
    else if (id === 'persona') { hud.openList('persona', PERSONA_SKILLS.map((s) => skillRow(s)), 'Arsene'); hud.setMode('list'); listKind = 'persona'; }
    else if (id === 'item') { hud.openList('item', B.items.map((i) => ({ id: i.id, name: L(i.name), desc: L(i.desc), cost: '×' + i.n, costKind: 'n', element: 'item', disabled: i.n <= 0 } as ListRow)), 'BAG'); hud.setMode('list'); listKind = 'item'; }
    else if (id === 'order') { hud.openList('order', ['analysis', 'tactics', 'escape'].map((o) => ({ id: o, name: L(`order.${o}.name`), desc: L(`order.${o}.desc`), element: 'order', disabled: o !== 'analysis' } as ListRow)), 'TACTICS'); hud.setMode('list'); listKind = 'order'; }
    else if (id === 'guard') { hud.setMode('hidden'); const p = B.guard(); play('action', p, { skillId: 'guard' }).then(() => enemyTurn()); }
    else if (id === 'baton') hud.navi('cmd.baton.sub');
  } else if (m === 'holdup') {
    if (id === 'allout') allOut();
    else if (id === 'talk') talk();
    else if (id === 'release') { hud.setMode('hidden'); hud.setHoldRing(false); B.release(); for (const i of B.enemies) eng.units.get(i)!.root.visible = false; victory(false); }
  } else if (m === 'result' && id === 'next') { startBattle(); M.loops++; }
};
let listKind = 'persona';
function skillRow(id: string): ListRow {
  const s = SKILLS[id];
  return { id, name: L(s.name), desc: L(s.desc), cost: s.costKind === 'sp' ? `${s.cost}SP` : `${s.cost}HP`, costKind: s.costKind, element: s.element, disabled: !B.canUse(id) };
}
hud.onRow = (id) => {
  if (id === 'back') { hud.setMode('command'); return; }
  if (listKind === 'persona') doSkill(id);
  else if (listKind === 'item') { hud.setMode('hidden'); const p = B.useItem(id); syncHudParty(); play('action', p, { skillId: 'item' }).then(() => enemyTurn()); }
  else if (listKind === 'order' && id === 'analysis') { B.analyze(); syncHud(); hud.navi('navi.weak'); hud.setMode('command'); }
};
hud.onEnemy = (id) => { if (B.u(id).hp > 0 && (hud.getMode() === 'command' || hud.getMode() === 'list')) { target = id; syncHud(); } };
hud.onSystem = (id) => {
  if (id === 'speed') { dir.speed = (dir.speed === 1 ? 2 : dir.speed === 2 ? 3 : 1) as any; hud.setSys('speed', `x${dir.speed}`, dir.speed > 1); }
  if (id === 'auto') { auto = !auto; dir.forceMinimal = auto; hud.setSys('auto', 'AUTO', auto); if (auto && hud.getMode() === 'command') autoStep(); }
  if (id === 'pause') { paused = !paused; hud.setSys('pause', paused ? '▶' : 'II', paused); }
};
let paused = false;
// 点击跳过（主线演出中点空白处）
eng.st.app.stage.eventMode = 'static';
eng.st.app.stage.hitArea = new Rectangle(-1e4, -1e4, 2e4, 2e4);
eng.st.app.stage.on('pointertap', (e) => { if (dir.busy && !DEMO && e.target === eng.st.app.stage) dir.skip(); });

// ---------------------------------------------------------------- prewarm + rehearse (§6 预热：幂等、可中断、有预算)
async function prewarm() {
  const p0 = performance.now();
  await eng.st.app.renderer.prepare.upload(Object.values(eng.tex));
  await eng.st.app.renderer.prepare.upload(eng.st.app.stage);
  const rt = RenderTexture.create({ width: 256, height: 256, resolution: 1 });
  eng.st.world.filters = [eng.fx.shock, eng.fx.rgb];
  const sv = eng.st.view.scale.x; eng.st.view.scale.set(0.2);
  eng.st.app.renderer.render({ container: eng.st.app.stage, target: rt, clear: true });
  eng.st.world.filters = [eng.fx.shock]; eng.st.app.renderer.render({ container: eng.st.app.stage, target: rt, clear: true });
  eng.st.world.filters = [eng.fx.rgb]; eng.st.app.renderer.render({ container: eng.st.app.stage, target: rt, clear: true });
  eng.st.view.scale.set(sv); eng.st.world.filters = null as any;
  try { eng.st.app.renderer.extract.pixels({ target: rt, frame: new Rectangle(0, 0, 1, 1) }); } catch { /* */ }
  rt.destroy(true);
  M.prewarmMs = Math.round(performance.now() - p0);
}
function rehearse() {
  // 在真实画布、真实尺寸上快进：技能 + 总攻 + 开战转场 + 1 MORE + HOLD UP。单次 >1.5s 放弃并标记冷启动。
  const fake = { actorId: 'joker', skillId: 'eiha', targetIds: ['noisy'], hits: [{ targetId: 'noisy', dmg: 1, weak: true, crit: false, miss: false, resist: 'none', element: 'curse', down: false }] };
  const list: [EventName, any, any][] = [['action', fake, { skillId: 'eiha' }], ['allout', { partyIds: B.party, finisherId: 'joker', total: 1, hits: fake.hits, targetIds: ['noisy'] }, {}],
    ['battle:start', {}, {}], ['onemore', {}, {}], ['holdup', { enemyIds: ['noisy'] }, {}], ['action', { ...fake, skillId: 'attack' }, { skillId: 'attack' }], ['battle:end', {}, {}]];
  for (const [ev, p, q] of list) {
    const r0 = performance.now(); let n = 0;
    dir.play(ev, p, q);
    while (dir.busy) {
      dir.update(34); eng.updateWorld(34); hud.update(34);
      eng.st.app.renderer.render({ container: eng.st.app.stage }); n++;
      if (performance.now() - r0 > 1500) { dir.reset(); M.cold = true; break; }
    }
    M.rehearse.push(`${ev}${q.skillId ? ':' + q.skillId : ''} renders=${n} ms=${Math.round(performance.now() - r0)}`);
  }
  dir.reset(); dir.log.length = 0; eng.ps.kill(); eng.sfxLog.length = 0;
  hud.showResult({ exp: 1, money: 1, items: [], bonus: true }); hud.update(1000); eng.st.app.renderer.render({ container: eng.st.app.stage });
  hud.openList('persona', PERSONA_SKILLS.map((s) => skillRow(s)), 'Arsene'); hud.setMode('list'); hud.update(300); eng.st.app.renderer.render({ container: eng.st.app.stage });
  hud.setMode('hidden'); dir.seen.clear();
  for (const u of eng.units.values()) { u.down = false; u.stars.visible = false; u.body.rotation = 0; u.body.x = 0; u.body.y = 0; u.body.scale.set(1); }
}
if (qs.get('prewarm') !== '0') { await prewarm(); if (qs.get('rehearse') !== '0') rehearse(); }
// rewarm：resize 后 300ms 合并一次，同尺寸已预热直接返回（只重做滤镜/遮罩离屏渲染）
const warmed = new Set<string>(); let rewarmTimer = 0; M.rewarms = 0;
eng.st.onLayout.push(() => {
  clearTimeout(rewarmTimer);
  rewarmTimer = window.setTimeout(() => {
    const key = `${eng.st.app.screen.width}x${eng.st.app.screen.height}`; if (warmed.has(key)) return; warmed.add(key); M.rewarms++;
    eng.st.world.filters = [eng.fx.shock, eng.fx.rgb]; eng.st.app.renderer.render({ container: eng.st.app.stage }); eng.st.world.filters = null as any;
  }, 300);
});
warmed.add(`${eng.st.app.screen.width}x${eng.st.app.screen.height}`);
document.getElementById('boot')?.remove();
M.boot = Math.round(performance.now() - t0);

// ---------------------------------------------------------------- loop
let last = performance.now(), frameStart = 0, lastCpu = 0, measuring = true;
let testFreeze: { ev: string; t: number } | null = null;
eng.st.app.ticker.add(() => {
  const now = performance.now(), raw = now - last; last = now; frameStart = now;
  let rdt = Math.min(raw, MAXDT);
  if (paused) rdt = 0;
  const m = dir.main;
  if (testFreeze && m && (m.ev === testFreeze.ev || m.recipe.id === testFreeze.ev) && m.tl.t + rdt * dir.speed >= testFreeze.t) {
    // 测试定格：把主线推进到目标时刻后停住（不计墙钟上限）
    const need = Math.max(0, testFreeze.t - m.tl.t);
    if (need > 0) { m.tl.update(need); eng.updateWorld(need); }
    rdt = 0; m.wall = 0;
  }
  const wdt = dir.update(rdt);
  eng.updateWorld(wdt);
  hud.update(rdt);
  quality.sample(raw, now, paused || document.hidden);
  if (measuring && M.phase !== 'boot') M.frames.push({ dt: +raw.toFixed(2), cpu: +lastCpu.toFixed(2), ph: M.phase, tier: quality.tier, np: eng.ps.count, f: eng.fx.filterCount });
  if (M.frames.length > 20000) M.frames.splice(0, 5000);
  if (M.phase === 'action:eiha' && M.firstSkillMaxDt === 0) M.firstSkillMaxDt = -1;
  if (M.phase === 'action:eiha' && !M._fsDone) M.firstSkillMaxDt = Math.max(M.firstSkillMaxDt, raw);
  if (M.phase !== 'action:eiha' && M.firstSkillMaxDt > 0) M._fsDone = true;
}, null, UPDATE_PRIORITY.HIGH);
eng.st.app.ticker.add(() => { lastCpu = performance.now() - frameStart; }, null, UPDATE_PRIORITY.UTILITY);
M.phase = 'idle';

// ---------------------------------------------------------------- auto / demo
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const untilMode = async (m: string, max = 20000) => { const s = performance.now(); while (hud.getMode() !== m || dir.busy) { await wait(40); if (performance.now() - s > max) return false; } return true; };
async function autoStep() {
  // AUTO：打弱点（已知弱点优先），全倒则总攻
  await wait(300);
  if (!auto || hud.getMode() !== 'command' || dir.busy) return;
  const n = B.u('noisy'), e = B.u('echo');
  if (n.hp > 0 && !n.down) { target = 'noisy'; await doSkill('eiha'); } else if (e.hp > 0 && !e.down) { target = 'echo'; await doSkill('attack'); } else await doSkill('attack');
}
async function demo() {
  for (;;) {
    await untilMode('command'); await wait(1100);
    hud.onEnemy('noisy'); hud.onCommand('persona'); await wait(1000);
    hud.tapRow(0); await wait(250); hud.tapRow(0);
    await untilMode('command'); await wait(900);
    hud.onEnemy('echo'); await wait(300); hud.onCommand('attack');
    await untilMode('holdup'); await wait(1100);
    hud.onCommand('allout');
    await untilMode('result'); await wait(2600);
    hud.onCommand('next');
  }
}
startBattle();
if (DEMO) demo();

// ---------------------------------------------------------------- test hooks
(window as any).__umbra = {
  eng, dir, hud, B, quality,
  get busy() { return dir.busy; }, get mode() { return hud.getMode(); }, get ev() { return dir.main?.ev ?? ''; }, get showT() { return dir.main?.tl.t ?? -1; },
  cmd: (id: string) => hud.onCommand(id), row: (i: number) => hud.tapRow(i), enemy: (id: string) => hud.onEnemy(id),
  freezeOn(ev: string, t: number) { testFreeze = { ev, t }; }, release() { testFreeze = null; },
  screenToDesign: (x: number, y: number) => eng.st.screenToDesign(x, y), designToScreen: (x: number, y: number) => eng.st.designToScreen(x, y),
  hitRects: () => hud.hitRects(), vis: () => eng.st.vis, safe: () => eng.st.safe,
  timing: () => dir.log, stopMeasure() { measuring = false; }, resetFrames() { M.frames.length = 0; },
  /** 测试用：演出中连点 */
  input: (key: string, fn: () => void) => dir.input(key, fn),
  counts: () => ({ particles: eng.ps.count, filters: eng.fx.filterCount, cutin: eng.st.layers.cutin.children.filter((c) => c.visible).length, allout: eng.st.layers.allout.children.filter((c) => c.visible).length, trans: eng.st.layers.trans.children.filter((c) => c.visible).length, dmg: eng.st.layers.dmg.children.length, fx: eng.st.layers.fx.children.length }),
};
