// UMBRA M3 · 红色样板第一阶段：P5R 战斗画面 1:1 还原（固定杂兵战，完整流程 + ?demo=1 自动循环）。
// 宿主层：选皮肤、建引擎、接规则层（game/battle）与 Director；皮肤包只给数据。
import { Sprite, UPDATE_PRIORITY, RenderTexture, Rectangle } from 'pixi.js';
import 'pixi.js/prepare';
import { Engine, Director, P5Hud, validate, makeUnit, Particles, Fx, Quality, TIERS, mountTalk, setErrorHook, UMBRA } from './umbra/engine';
import type { PartyState, EnemyState, ListRow } from './umbra/engine';
import type { EventName } from './umbra/skins/_contract';
import './umbra/skins/p5r-red/index';   // 宿主选择当前皮肤（契约：宿主按主题只 import 当前皮肤包；皮肤自身不得做副作用 import）
import { Battle, SKILLS, DEFAULT_PARTY } from './game/battle';

const qs = new URLSearchParams(location.search);
const DEMO = qs.get('demo') === '1';
const SKIN = qs.get('umbra') ?? 'p5r-red';
const DPR = window.devicePixelRatio || 1;
const ENEMIES = Math.max(1, Math.min(5, +(qs.get('enemies') ?? 2) || 2));
const PARTY = (qs.get('party') ?? '').split(',').filter(Boolean).length ? qs.get('party')!.split(',').filter(Boolean) : DEFAULT_PARTY;
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
await eng.loadSkin(pack, `skins/${SKIN}/`, ['head:joker', 'head:oracle', 'back:joker', ...PARTY.map((p) => 'head:' + p)]);
for (const r of pack.recipes) M.issues.push(...validate(r));
const quality = new Quality(INIT_Q, qs.get('auto') !== '0');
eng.tier = quality.tier;
eng.fx = new Fx(eng.st, RES * TIERS[eng.tier].fresK);
eng.ps = new Particles(eng.st.app.renderer, eng.st.layers.fx);
eng.ps.cap = TIERS[eng.tier].cap;
quality.onChange = (t) => { eng.tier = t; eng.ps.cap = TIERS[t].cap; };

// ---------------------------------------------------------------- scene
const slots = pack.slots as any;
const roster = (pack as any).roster as { lead: string; navigator: string; default: string[]; chars: Record<string, { field: { h: number; dy: number } }>; showtime: string[][] };
const bgDef = slots['scene.battle.bg'];
const bg = new Sprite(eng.tex[bgDef.asset]); bg.anchor.set(0.5); bg.position.set(bgDef.cx, 360); bg.scale.set(1.03);
eng.bgSprite = bg; eng.st.layers.bg.addChild(bg);
const pos = slots['scene.battle.positions'];
const grid = TIERS[eng.tier].mesh;
/** 场上我方：当前行动者的背影（原作镜头在行动者身后）；名单里每人一个网格单位，按需创建 */
function ensureUnit(id: string) {
  if (eng.units.has(id)) return eng.units.get(id)!;
  const tex = eng.tex['back.' + id]; if (!tex) return null;
  const f = roster.chars[id]?.field ?? { h: 430, dy: 0 };
  const idle = slots[`unit.${id}.portrait`]?.meshIdle ?? { breath: 0.012, period: 2800, swayPx: 8, swayZone: 'all' };
  const u = makeUnit(id, 'ally', tex, pos.joker.x, pos.joker.y + f.dy, f.h, pos.joker.facing, idle, 0.4, grid);
  u.hitY = -f.h * 0.62; u.root.visible = false;
  eng.units.set(id, u); eng.st.layers.ally.addChild(u.root);
  return u;
}
ensureUnit(roster.lead)!.root.visible = true;

const dir = new Director(eng);
const hud = new P5Hud(eng);
dir.onMainChange.push((b) => hud.setBusy(b));
const B = new Battle(PARTY, ENEMIES);
hud.setPartyIds(B.party);
// D-004：敌人按数组建单位，站位读皮肤 enemyLayouts[n]
const lay = slots['scene.battle.enemyLayouts'][String(B.enemies.length)] ?? pos.enemies;
B.enemies.forEach((id, i) => {
  const ty = B.enemyType.get(id)!, p = lay[i];
  const u = makeUnit(id, 'enemy', eng.tex['enemy.' + ty], p.x, p.y, p.h, 1, slots[`unit.${ty}.portrait`].meshIdle, i * 1.7 + 0.6, grid);
  eng.units.set(id, u); eng.st.layers.enemy.addChild(u.root);
});
const eName = (id: string) => L(B.u(id).name) + (B.u(id).suffix ?? '');
let target = B.enemies[0];
let auto = false;
/** 当前队伍的角色素材懒加载（背影/cut-in/召唤/人格面具）；非当前队员不进首包 */
const loadParty = () => Promise.all(B.party.flatMap((id) => [eng.loadGroup('back:' + id), eng.loadGroup('char:' + id), eng.loadGroup('head:' + id)])).then(() => { B.party.forEach(ensureUnit); hud.refreshHeads(); });
eng.onGroup.push(() => hud.refreshHeads());

// 行动者切换：旧背影侧滑淡出、新背影侧滑进入（220ms 缓动，非硬切）
let swap: { from?: string; to: string; t: number } | null = null;
function setActor(id: string, instant = false) {
  const prev = eng.actor; eng.actor = id;
  const nu = ensureUnit(id);
  if (!nu) return;
  if (prev === id || instant) { for (const u of eng.units.values()) if (u.side === 'ally') u.root.visible = u.id === id; nu.root.x = nu.home.x; nu.root.alpha = 1; return; }
  swap = { from: prev, to: id, t: 0 }; nu.root.visible = true; nu.root.alpha = 0;
}
function tickSwap(dt: number) {
  if (!swap) return; swap.t += dt; const k = Math.min(1, swap.t / 220), e = 1 - Math.pow(1 - k, 3);
  const o = swap.from ? eng.units.get(swap.from) : undefined, n = eng.units.get(swap.to)!;
  if (o && o !== n) { o.root.x = o.home.x + 180 * e; o.root.alpha = 1 - e; }
  n.root.x = n.home.x - 160 * (1 - e); n.root.alpha = e;
  if (k >= 1) { if (o && o !== n) { o.root.visible = false; o.root.x = o.home.x; o.root.alpha = 1; } swap = null; }
}

// ---------------------------------------------------------------- HUD sync
const L = (k: string) => eng.label(k);
function partyStates(): PartyState[] { return B.party.map((id) => { const u = B.u(id); return { id, name: L(u.name), hp: u.hp, hpMax: u.hpMax, sp: u.sp, spMax: u.spMax, active: id === B.actor, baton: id === B.actor ? B.baton : 0 } as PartyState; }); }
function syncHud() {
  hud.setPartyIds(B.party);
  hud.updateParty(partyStates());
  const es: EnemyState[] = B.enemies.map((id) => { const u = B.u(id); return { id, name: eName(id), compact: B.enemies.length >= 4, hp: u.hp, hpMax: u.hpMax, lv: u.lv, known: u.known, weak: u.weak.filter((w) => u.known.includes(w)), down: u.down, alive: u.hp > 0 }; });
  if (B.u(target).hp <= 0) target = B.alive(B.enemies)[0] ?? target;
  hud.setTarget(target);
  hud.updateEnemies(es);
  const t = B.u(target);
  const order = [...B.alive(B.party).filter((i) => !B.acted.has(i)), ...B.alive(B.enemies)];
  hud.setStrip({ lv: t.lv, name: eName(target), weak: t.weak.filter((w) => t.known.includes(w)), known: t.known.length > 0, turn: B.turn, order, knownEls: t.known });
  hud.oneMore = B.oneMore; hud.canBaton = B.batonTargets().length > 0;
  const st = B.showtimeFor(roster.showtime); hud.showtime = st ? st.join('-') : '';
}
const play = (ev: EventName, payload: unknown, q: any = {}) => { M.phase = ev + (q.skillId ? ':' + q.skillId : ''); return dir.play(ev, payload, q).then((r) => { M.phase = 'idle'; return r; }); };
const syncHudParty = () => hud.updateParty(partyStates());

// ---------------------------------------------------------------- flow
async function startBattle() {
  B.reset(); target = B.enemies[0]; setActor(B.actor, true);
  for (const u of eng.units.values()) { u.down = false; u.stars.visible = false; u.body.rotation = 0; u.body.x = 0; u.body.y = 0; u.body.scale.set(1); if (u.side === 'enemy') { u.root.visible = true; } u.root.alpha = 1; }
  hud.setHoldRing(false); hud.setMode('hidden'); syncHud(); hud.naviText.text = '';
  const ld = loadParty();
  eng.audio.bgm('battle.normal');
  await play('battle:start', { enemyIds: B.enemies, leadId: roster.lead });
  await ld;
  playerTurn();
}
function naviTurn() { const n = L('navi.turn').replace('{name}', L('unit.' + B.actor)); hud.naviText.text = n; }
function playerTurn() {
  syncHud();
  if (B.oneMore) hud.navi('navi.onemore'); else if (hud.showtime) hud.navi('navi.showtime'); else if (B.actor === roster.lead) hud.naviText.text = L(B.alive(B.enemies).length === 1 ? 'navi.idle.one' : 'navi.idle').replace('{n}', L('num.cn')[B.alive(B.enemies).length - 1] ?? String(B.alive(B.enemies).length)); else naviTurn();
  hud.setMode('command');
  if (auto) autoStep();
}
async function afterAction(r: ReturnType<Battle['act']>) {
  syncHud();
  if (r.newDown.length) play('unit:down', { unitIds: r.newDown, side: 'enemy' });   // 重叠层，不阻塞主线
  if (r.won) return victory(false);
  if (r.oneMore) {
    eng.audio.voiceLine(B.actor, 'onemore');
    await play('onemore', { unitId: B.actor, actorId: B.actor });
    if (r.holdUp) return holdUp();
    return playerTurn();
  }
  return nextTurn();
}
async function nextTurn() {
  const n = B.nextActor();
  if (!n) return enemyTurn();
  setActor(n);
  await play('turn:start', { unitId: n });
  playerTurn();
}
async function doSkill(skillId: string) {
  if (!B.canUse(skillId)) return;
  hud.setMode('hidden');
  const summon = B.summonVer();
  await eng.loadGroup('char:' + B.actor);
  const r = B.act(skillId, target);                    // 1) 规则先提交
  syncHudParty();
  await play('action', r.payload, { skillId, side: 'ally', summon });   // 2) 再演出
  await afterAction(r);
}
async function doBaton(to: string) {
  hud.partyPick = []; hud.setMode('hidden');
  const p = B.batonTo(to); if (!p) return playerTurn();
  await Promise.all([eng.loadGroup('char:' + to), eng.loadGroup('back:' + to)]);
  await play('baton', p, {});
  setActor(to);
  playerTurn();
}
async function doShowtime() {
  const pair = hud.showtime.split('-'); if (pair.length !== 2) return;
  hud.setMode('hidden');
  await Promise.all([eng.loadGroup('show:' + pair.join('-')), ...pair.map((i) => eng.loadGroup('char:' + i))]);
  const r = B.showtime(pair);
  hud.navi('navi.showtime'); eng.audio.voiceLine(pair[0], 'highlight');
  await play('highlight', r.payload, {});
  syncHud();
  if (r.won) { for (const id of B.enemies) eng.units.get(id)!.root.visible = false; return victory(true); }
  return nextTurn();
}
async function doSwitch(inn: string) {
  // ORDER→SWITCH：先选后备（列表），再选要换下的队员（点队伍卡）
  hud.navi('navi.switch'); hud.partyPick = B.party.slice(1); hud.setPickWord('list.switch'); hud.setMode('pick'); syncHudParty();
  hud.onParty = async (out) => {
    hud.partyPick = [];
    const r = B.switchMember(out, inn); if (!r) return playerTurn();
    await Promise.all([eng.loadGroup('head:' + inn), eng.loadGroup('back:' + inn), eng.loadGroup('char:' + inn)]);
    ensureUnit(inn);
    if (eng.actor === out) setActor(inn);
    playerTurn();
  };
}
async function enemyTurn() {
  hud.setMode('hidden'); B.oneMore = false; hud.oneMore = false;
  hud.navi('navi.enemy');
  const acts = B.enemyTurn();
  setActor(B.actor);
  for (const a of acts) {
    if (a.kind === 'getup') { const u = eng.units.get(a.payload.unitIds[0])!; u.down = false; u.stars.visible = false; u.body.rotation = 0; u.body.x = 0; u.body.y = 0; u.body.scale.set(1); syncHud(); continue; }
    // 被打的队员：镜头给到他（显示其背影），再演出
    const tid = a.payload.targetIds[0]; if (eng.units.has(tid) || eng.tex['back.' + tid]) setActor(tid, true);
    syncHudParty();
    await play('action', { ...a.payload, actorName: eName(a.payload.actorId) }, { side: 'enemy', skillId: a.payload.skillId });
  }
  setActor(B.actor, true);
  await play('turn:start', { unitId: B.actor });
  playerTurn();
}
async function holdUp() {
  syncHud(); hud.navi(B.alive(B.enemies).length === 1 ? 'navi.holdup.one' : 'navi.holdup');   // 单敌用单数「它」
  eng.audio.bgm('holdup'); eng.audio.voiceLine(B.actor, 'holdup');
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
  eng.audio.bgm('victory', {}, 300); eng.audio.voiceLine(B.actor, 'victory');
  await play('battle:end', rw);
  hud.showResult({ exp: rw.exp, money: rw.money, items: rw.drops.map((d) => ({ name: d.name, n: d.n })), bonus, levelUps: rw.levelUps } as any);
  if (rw.levelUps.length) { await new Promise((r) => setTimeout(r, 1200)); if (hud.getMode() === 'result') await play('levelup', { unitIds: rw.levelUps.map((l) => l.id), stats: rw.levelUps }); }
}
async function talk() {
  hud.setMode('talk'); hud.setHoldRing(true, B.alive(B.enemies), B.party);
  await play('talk:start', { enemyId: target });
  const view = mountTalk(eng.st.dom, SKIN, pack.templates?.talk, { enemyName: eName(target), odds: '68%' });
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
    else if (id === 'persona') { hud.openList('persona', B.skillsOf(B.actor).map((s) => skillRow(s)), L('persona.' + B.actor)); hud.setMode('list'); listKind = 'persona'; }
    else if (id === 'item') { hud.openList('item', B.items.map((i) => ({ id: i.id, name: L(i.name), desc: L(i.desc), cost: '×' + i.n, costKind: 'n', element: 'item', disabled: i.n <= 0 } as ListRow)), 'BAG'); hud.setMode('list'); listKind = 'item'; }
    else if (id === 'order') { hud.openList('order', ['analysis', 'switch', 'tactics', 'escape'].map((o) => ({ id: o, name: L(`order.${o}.name`), desc: L(`order.${o}.desc`), element: 'order', disabled: o !== 'analysis' && o !== 'switch' } as ListRow)), 'TACTICS'); hud.setMode('list'); listKind = 'order'; }
    else if (id === 'guard') { hud.setMode('hidden'); const p = B.guard(); play('action', p, { skillId: 'guard' }).then(() => nextTurn()); }
    else if (id === 'baton') { hud.navi('navi.baton'); hud.partyPick = B.batonTargets(); hud.setPickWord('label.baton'); hud.setMode('pick'); syncHudParty(); hud.onParty = (to) => doBaton(to); }
    else if (id === 'showtime') doShowtime();
  } else if (m === 'pick') {
    if (id === 'back') { hud.partyPick = []; playerTurn(); }
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
  if (id === 'back') { if (listKind === 'switch') { hud.openList('order', ['analysis', 'switch', 'tactics', 'escape'].map((o) => ({ id: o, name: L(`order.${o}.name`), desc: L(`order.${o}.desc`), element: 'order', disabled: o !== 'analysis' && o !== 'switch' } as ListRow)), 'TACTICS'); listKind = 'order'; return; } hud.setMode('command'); return; }
  if (listKind === 'persona') doSkill(id);
  else if (listKind === 'item') { hud.setMode('hidden'); const p = B.useItem(id); syncHudParty(); play('action', p, { skillId: 'item' }).then(() => nextTurn()); }
  else if (listKind === 'order' && id === 'analysis') { B.analyze(); syncHud(); hud.navi('navi.weak'); hud.setMode('command'); }
  else if (listKind === 'order' && id === 'switch') {
    B.bench.forEach((b) => eng.loadGroup('head:' + b));
    hud.openList('switch', B.bench.map((b) => ({ id: b, name: L('unit.' + b), desc: `${L('persona.' + b)} · Lv${B.u(b).lv}  HP ${B.u(b).hp}/${B.u(b).hpMax}  SP ${B.u(b).sp}/${B.u(b).spMax}`, element: 'order', icon: `head.${b}#ink` } as ListRow)), L('list.switch')); listKind = 'switch';
  } else if (listKind === 'switch') doSwitch(id);
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
  const fake = { actorId: 'joker', skillId: 'eiha', targetIds: [B.enemies[0]], hits: [{ targetId: B.enemies[0], dmg: 1, weak: true, crit: false, miss: false, resist: 'none', element: 'curse', down: false }] };
  const list: [EventName, any, any][] = [['action', fake, { skillId: 'eiha', summon: 'full' }], ['allout', { partyIds: B.party, finisherId: 'joker', total: 1, hits: fake.hits, targetIds: [B.enemies[0]] }, {}],
    ['battle:start', {}, {}], ['onemore', {}, {}], ['holdup', { enemyIds: [B.enemies[0]] }, {}], ['action', { ...fake, skillId: 'attack' }, { skillId: 'attack' }], ['action', { actorId: 'joker', skillId: 'guard', targetIds: ['joker'], hits: [] }, { skillId: 'guard' }], ['battle:end', {}, {}], ['levelup', {}, {}]];
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
  M.rehearseErr = eng.errors.splice(0);   // 预演期队员素材尚未懒加载完（char:* 缺图）属预期，单独记录，不混进实战错误
  hud.showResult({ exp: 1, money: 1, items: [], bonus: true }); hud.update(1000); eng.st.app.renderer.render({ container: eng.st.app.stage });
  hud.openList('persona', B.skillsOf('joker').map((s) => skillRow(s)), L('persona.joker')); hud.setMode('list'); hud.update(300); eng.st.app.renderer.render({ container: eng.st.app.stage });
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
  tickSwap(rdt);
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
/** 找一手能打中未倒地敌人弱点的技能（AUTO / demo 共用；只看已提交规则数据） */
function pickMove(actor = B.actor): { skill: string; target: string } | null {
  for (const e of B.alive(B.enemies)) {
    const u = B.u(e); if (u.down) continue;
    for (const sk of [...B.skillsOf(actor), 'attack']) { const s = SKILLS[sk]; if ((s.kind === 'magic' || s.kind === 'phys') && u.weak.includes(s.element) && B.canUse(sk, actor)) return { skill: sk, target: e }; }
  }
  return null;
}
async function autoStep() {
  await wait(300);
  if (!auto || hud.getMode() !== 'command' || dir.busy) return;
  if (B.oneMore && B.batonTargets().length) { const to = B.batonTargets().find((t) => pickMove(t)); if (to && !pickMove()) { await doBaton(to); return; } }
  const m = pickMove(); target = m?.target ?? B.alive(B.enemies)[0]; await doSkill(m?.skill ?? 'attack');
}
async function demo() {
  for (;;) {
    await untilMode('command'); await wait(1000);
    if (B.won) { await wait(500); continue; }
    if (B.oneMore && B.batonTargets().length) {
      const to = B.batonTargets().find((t) => pickMove(t));
      if (to) { hud.onCommand('baton'); await wait(700); hud.onParty(to); continue; }
    }
    const m = pickMove();
    if (m && m.skill !== 'attack') {
      hud.onEnemy(m.target); hud.onCommand('persona'); await wait(900);
      const i = B.skillsOf(B.actor).indexOf(m.skill); hud.tapRow(i); await wait(250); hud.tapRow(i);
    } else { if (m) hud.onEnemy(m.target); await wait(300); hud.onCommand('attack'); }
    await wait(200);
    if (hud.getMode() === 'holdup' || (await untilMode('holdup', 1)) ) { /* fallthrough */ }
    if (B.allDown && !B.won) { await untilMode('holdup'); await wait(1100); hud.onCommand('allout'); await untilMode('result'); await wait(2600); hud.onCommand('next'); }
  }
}
startBattle();
if (DEMO) demo();

// ---------------------------------------------------------------- test hooks
(window as any).__umbra = {
  eng, dir, hud, B, quality,
  get busy() { return dir.busy; }, get mode() { return hud.getMode(); }, get ev() { return dir.main?.ev ?? ''; }, get showT() { return dir.main?.tl.t ?? -1; },
  demoFx: (id: string, actor = 'joker') => dir.play('highlight', { actorId: actor, targetIds: B.enemies.slice() }, { skillId: id }),
  cmd: (id: string) => hud.onCommand(id), party: (id: string) => hud.onParty(id), setTarget: (id: string) => { target = id; syncHud(); }, row: (i: number) => hud.tapRow(i), enemy: (id: string) => hud.onEnemy(id),
  freezeOn(ev: string, t: number) { testFreeze = { ev, t }; }, release() { testFreeze = null; },
  screenToDesign: (x: number, y: number) => eng.st.screenToDesign(x, y), designToScreen: (x: number, y: number) => eng.st.designToScreen(x, y),
  /** 测试用：全体倒地直接进 HOLD UP（敌人数量 1..5 的布局检查） */
  forceHoldup: () => { for (const id of B.alive(B.enemies)) { B.u(id).down = true; const u = eng.units.get(id); if (u) u.down = true; } return holdUp(); },
  enemyAct: () => enemyTurn(),
  /** 测试用：强制 SHOWTIME（默认 Joker+Skull） */
  showtime: async (a = 'joker', b = 'skull', freezeAt = 0) => {
    await Promise.all([eng.loadGroup('show:' + a + '-' + b), eng.loadGroup('char:' + a), eng.loadGroup('char:' + b)]);
    for (const id of B.alive(B.enemies)) B.u(id).hp = Math.max(B.u(id).hp, Math.round(B.u(id).hpMax * 0.6));
    B.actor = a; const r = B.showtime([a, b]); hud.setMode('hidden');
    if (freezeAt) testFreeze = { ev: 'highlight', t: freezeAt };
    return play('highlight', r.payload, {});
  },
  audioLog: () => eng.audio.log,
  hitRects: () => hud.hitRects(), vis: () => eng.st.vis, safe: () => eng.st.safe,
  timing: () => dir.log, stopMeasure() { measuring = false; }, resetFrames() { M.frames.length = 0; },
  /** 测试用：演出中连点 */
  input: (key: string, fn: () => void) => dir.input(key, fn),
  counts: () => ({ particles: eng.ps.count, filters: eng.fx.filterCount, cutin: eng.st.layers.cutin.children.filter((c) => c.visible).length, allout: eng.st.layers.allout.children.filter((c) => c.visible).length, trans: eng.st.layers.trans.children.filter((c) => c.visible).length, dmg: eng.st.layers.dmg.children.length, fx: eng.st.layers.fx.children.length }),
};
