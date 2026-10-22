// M4 流程宿主：据点 → 委托板 → 预告信（可选）→ Q 版格子潜入（守门/精英必战、岔路、安全屋）→ 战斗（复用 M3）→ BOSS（两阶段）→ 局末结算 → 回据点。
// 规则在 game/run + game/explore（零 DOM）；这里只做画面与输入。DOM 画面挂在引擎的 1280×720 DOM 叠加层（与画布同变换：虚拟横屏/出血/安全区一致）。
import { Container, Sprite } from 'pixi.js';
import type { Engine, Director, RunResult } from '../umbra/engine';
import { SKIPPABLE } from '../umbra/engine';
import { Save, Run, REQ, ECO } from '../game/run';
import type { Card } from '../game/run';
import type { Cell, StepEvent } from '../game/explore';
import { Explore } from '../game/explore';
import ROOMS from '../game/data/rooms.json';
import type { BattleCfg, BattleOutcome } from '../main';
import { ExploreView } from './exploreView';
import { CONS } from '../game/shop';
import { BY_ID } from '../game/fusion';
import { shopFlow, velvetFlow } from './shopView';

interface Ctx { eng: Engine; dir: Director; runBattle: (c: BattleCfg) => Promise<BattleOutcome>; L: (k: string) => string; M: any; qs: URLSearchParams }
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

export function startFlow(ctx: Ctx) {
  const { eng, L, M, dir } = ctx; const SK = 'skins/p5r-red/assets/';
  const fmt = (k: string, v: Record<string, string | number> = {}) => L(k).replace(/\{(\w+)\}/g, (_, n) => String(v[n] ?? ''));
  const ransom = (s: string) => `<span class="rn">${[...s].map((ch) => ch === ' ' ? '<i class="sp"></i>' : `<i>${esc(ch)}</i>`).join('')}</span>`;
  const save = new Save();
  // 测试钩子：?route=r2:2 预置确保路线局数（自动化直接走预告信局）
  for (const kv of (ctx.qs.get('route') ?? '').split(',').filter(Boolean)) { const [k, v] = kv.split(':'); save.routes[k] = +v || 0; }
  const F: any = { screen: 'boot', log: [] as any[], save, run: null as Run | null, errors: [] as string[], timings: [] as any[] };
  (window as any).__flow = F; M.flow = F;
  // ---- 图层：Pixi 背景/格子（view 内，world 之上、HUD/转场之下）+ DOM 屏
  const layer = new Container(); layer.label = 'layer.flow';
  eng.st.view.addChildAt(layer, eng.st.view.getChildIndex(eng.st.world) + 1);
  const hubBg = new Sprite(); hubBg.anchor.set(0.5); hubBg.position.set(640, 360); layer.addChild(hubBg);
  const host = document.createElement('div'); host.className = 'umbra-skin-p5r-red flow'; eng.st.dom.appendChild(host);
  let view: ExploreView | null = null;
  eng.st.app.ticker.add((t) => view?.update(Math.min(100, t.deltaMS)));
  const screen = (cls = '', html = '') => { host.innerHTML = ''; const d = document.createElement('div'); d.className = 'fl-screen ' + cls; d.innerHTML = html; host.appendChild(d); return d; };
  const timed = async (ev: string, cap: number, f: () => Promise<void>) => { const t0 = performance.now(); await f(); F.timings.push({ ev, ms: Math.round(performance.now() - t0), cap }); };
  /** M4b：流程/探索演出一律走 Director（皮肤 recipe，时长按契约上限，墙钟 + 强制推进 + 清场由 Director 负责） */
  // 流程画面的演出按 1 倍速/完整级别播（战斗内的倍速、AUTO 只作用于战斗，离开战斗时恢复）
  const show = (ev: string, payload: Record<string, unknown> = {}, q: Record<string, string> = {}) => { const pr = dir.play(ev as any, payload, q); return pr.then((r: RunResult) => { F.timings.push({ ev, ms: r.wallMs, cap: r.capMs, recipe: r.recipe, forced: r.forced, skipped: r.skipped }); return r; }); };
  // v1.3 §3g-3 可跳过名单：点任意处跳到清场
  window.addEventListener('pointerdown', () => { const m = dir.main; if (m && SKIPPABLE.has(m.ev)) dir.skip(); }, true);
  F.viewLog = F.timings;
  const ui = (ev: string) => eng.audio.play('se.ui.' + ev);
  const bgm = (cue: string, cond: Record<string, unknown> = {}) => { eng.audio.bgm(cue, cond); F.log.push('bgm:cue ' + cue); };
  /** 转场：红黑三片斜切（≤0.65s），中点切内容 */
  let midMs = 0;
  async function wipe(mid: () => void | Promise<void>) {
    await timed('scene:wipe', 700, async () => {
      const w = document.createElement('div'); w.className = 'wipe'; w.innerHTML = '<i></i><i></i><i></i>'; host.parentElement!.appendChild(w); w.classList.add('umbra-skin-p5r-red');
      eng.audio.play('se.scene.enter'); await wait(300); const m0 = performance.now(); await mid(); midMs = performance.now() - m0; await wait(380); w.remove();
    });
    const last = F.timings[F.timings.length - 1]; last.ms = Math.round(last.ms - midMs); last.build = Math.round(midMs);   // 墙钟只计转场本身；中点内容构建/加载另记 build
  }
  const toast = (s: string, red = false) => { const t = document.createElement('div'); t.className = 'toast' + (red ? ' red' : ''); t.textContent = s; host.appendChild(t); setTimeout(() => t.remove(), 1400); };
  const headImg = (id: string) => `<img src="${SK}head.${id}.webp" alt="">`;
  const tapOnce = (root: HTMLElement) => new Promise<string>((res) => { root.querySelectorAll<HTMLElement>('[data-id]').forEach((b) => b.addEventListener('click', () => { ui('confirm'); res(b.dataset.id!); }, { once: true })); });
  let selected: string | null = null; let ccPlanned = false;
  // M5 商店/天鹅绒画面共享的宿主能力
  F.eng = eng;
  const sx = { eng, L, fmt, ransom, esc, save, F, SK, host, screen, show, ui, bgm, toast, tapOnce, wipe, setHubBg, headImg, qs: ctx.qs };

  function setHubBg(id: string | null) { hubBg.visible = !!id; if (id && eng.tex[id]) { hubBg.texture = eng.tex[id]; hubBg.scale.set(Math.max(1280 / eng.tex[id].width, 960 / eng.tex[id].height) * 1.0); } }

  // ================================================================ 据点空闲预加载（M4b：消除首进潜入 1.5–4s 卡顿）
  // 据点画面空闲时：懒加载潜入/精英/BOSS 素材组 → 用样板房间预构建 Q 版棋盘 → 纹理与 Graphics 上传 GPU → 离屏渲染一帧（着色器编译）
  let warm: Promise<void> | null = null;
  function prewarmExplore() {
    if (warm) return warm;
    warm = (async () => {
      const t0 = performance.now(); const st: Record<string, number> = {}; let tk = t0;
      const lap = (k: string) => { const n = performance.now(); st[k] = Math.round(n - tk); tk = n; };
      const yieldIdle = () => new Promise<void>((r) => idle(() => r()));
      await Promise.all(['flow', 'enemy:elite', 'enemy:boss'].map((g) => eng.loadGroup(g))); lap('load');
      await yieldIdle();
      if (!view) { view = new ExploreView(eng.tex, save.party); layer.addChild(view.root); view.root.label = 'explore'; view.root.visible = false; }
      const v = view; const sample = (ROOMS as any).boss.r1;
      v.build(new Explore({ ...sample, kind: 'boss' })); lap('build'); F.buildSteps = { ...v.buildSteps };
      await yieldIdle();
      // 纹理逐张上传（每张之间让出主线程），再上传棋盘 Graphics
      const texs = ['chibi.joker', 'chibi.skull', 'chibi.mona', 'chibi.panther', 'chibi.guard', 'chibi.elite', 'enemy.boss1', 'enemy.boss2', 'enemy.elite', 'bg.explore.palace', 'callingcard'].map((k) => eng.tex[k]).filter(Boolean);
      for (const t of texs) { try { await eng.st.app.renderer.prepare.upload(t); } catch { /* */ } await new Promise((r) => setTimeout(r, 0)); }
      lap('upload.tex');
      v.root.visible = true; const a = v.root.alpha; v.root.alpha = 0;
      try { await eng.st.app.renderer.prepare.upload(v.root); } catch { /* */ } lap('upload.board');
      await yieldIdle();
      eng.st.app.renderer.render({ container: eng.st.app.stage }); lap('render');
      v.root.alpha = a; if (!F.screen.startsWith('explore')) v.root.visible = false;
      F.prewarmMs = Math.round(performance.now() - t0); F.prewarmSteps = st; F.log.push('prewarm explore ' + F.prewarmMs + 'ms ' + JSON.stringify(st));
    })().catch((e) => { F.errors.push('prewarm ' + String(e)); });
    return warm;
  }
  const idle = (f: () => void) => ((window as any).requestIdleCallback ? (window as any).requestIdleCallback(f, { timeout: 1500 }) : setTimeout(f, 400));
  // ================================================================ HUB
  async function hub(): Promise<void> {
    if (ctx.qs.get('prewarmex') !== '0') idle(() => { prewarmExplore(); });
    F.screen = 'hub'; setHubBg('bg.hideout'); bgm('hub.home');
    const req = selected ? REQ.requests.find((r) => r.id === selected)! : null;
    const mem = save.party.map((id) => `<div class="hub-mem">${headImg(id)}<em>Lv${save.members[id].lv}</em></div>`).join('');
    const d = screen('hub', `
      <div class="hub-title">${ransom(L('flow.hub.title'))}</div><div class="hub-sub">${L('flow.hub.sub')}</div>
      <div class="hub-req">${req ? `<b>${L('flow.hub.selected')}</b>　${L('req.' + req.id + '.place')} · ${L('flow.req.target')}「${L('req.' + req.id + '.boss')}」${ccPlanned ? '　<b>★ ' + L('flow.cc.sent') + '</b>' : ''}` : L('flow.hub.none')}</div>
      <div class="hub-menu">
        ${btn('board', 'flow.menu.board', !selected)}${btn('card', 'flow.menu.card', !!selected && save.ccUnlocked(selected) && !ccPlanned, !!selected && !save.ccUnlocked(selected) ? 'lock' : '')}${btn('go', 'flow.menu.go', !!selected)}${btn('shop', 'flow.menu.shop')}${btn('velvet', 'flow.menu.velvet')}
      </div>
      <div class="hub-info"><div class="hub-card"><b>${L('flow.hub.money')}</b><span>¥${save.money.toLocaleString('en-US')}</span></div><div class="hub-card"><b>${L('flow.hub.cleared')}</b><span>${save.cleared.length}/3</span></div><div class="hub-party">${mem}</div></div>`);
    const id = await tapOnce(d);
    if (id === 'board') return wipeRet(() => board()).then(() => hub());
    if (id === 'card') { if (!selected) { toast(L('flow.need.req'), true); return hub(); } if (!save.ccUnlocked(selected)) { F.log.push('callingcard locked'); toast(save.cleared.includes(selected) ? L('flow.cc.done') : fmt('flow.cc.locked', { n: save.ccNeed(selected) }), true); return hub(); } return wipeRet(() => callingCard()).then(() => hub()); }
    if (id === 'go') { if (!selected) { toast(L('flow.need.req'), true); return hub(); } await infiltrate(selected); return hub(); }
    if (id === 'shop') { await shopFlow(sx); return hub(); }
    if (id === 'velvet') { await velvetFlow(sx); return hub(); }
  }
  function btn(id: string, k: string, hot = false, wip: boolean | string = false) { return `<button class="fl-btn${hot ? ' hot' : ''}${wip === true ? ' wip' : wip ? ' ' + wip : ''}" data-id="${id}"><span class="zh">${L(k)}</span><span class="en">${L(k + '.en')}</span></button>`; }
  async function wip(id: string) {
    F.screen = 'wip:' + id; const npc = id === 'shop' ? 'npc.military' : 'npc.velvet';
    await eng.loadGroup('flow');
    const d = screen('', `<div class="dim"></div><div class="wipscr"><img src="${SK}${npc}.webp" alt=""><div class="msg"><b>${L(id === 'shop' ? 'flow.menu.shop' : 'flow.menu.velvet')}</b>${L('flow.wip')}</div></div><div class="fl-row">${btn('back', 'flow.wip.back')}</div>`);
    d.querySelector('.fl-btn .en')!.textContent = 'BACK';
    await tapOnce(d);
  }
  // ================================================================ 委托板
  async function board() {
    F.screen = 'board'; bgm('requests');
    let pick = selected ?? REQ.requests[0].id;
    const draw = () => screen('', `<div class="dim"></div><div class="board-title">${ransom(L('flow.board.title'))}</div><div class="board-list">${REQ.requests.map((r) => `
      <div class="req${r.id === pick ? ' sel' : ''}" data-id="req:${r.id}"><span class="stars">${'★'.repeat(r.stars)}</span><h3>${L('req.' + r.id + '.place')}</h3>
      <dl><dt>${L('flow.req.client')}</dt><dd>${L('req.' + r.id + '.client')}</dd><dt>${L('flow.req.target')}</dt><dd>${L('flow.boss.ruler')}「${L('req.' + r.id + '.boss')}」</dd><dt>${L('flow.req.reward')}</dt><dd>¥${r.reward.money.toLocaleString('en-US')}</dd></dl>
      <p>${L('req.' + r.id + '.story')}</p><div class="route">${fmt('flow.req.route', { n: Math.min(2, save.routes[r.id] ?? 0) })}${save.ccUnlocked(r.id) ? ' · ' + L('flow.cc.ready') : ''}</div>${save.cleared.includes(r.id) ? `<span class="done">${L('flow.req.done')}</span>` : ''}</div>`).join('')}</div>
      <div class="fl-row">${btn('back', 'flow.req.back')}${btn('accept', 'flow.req.accept', true)}</div>`);
    for (;;) {
      const d = draw(); d.querySelectorAll('.fl-btn .en').forEach((e, i) => (e.textContent = i ? 'ACCEPT' : 'BACK'));
      const id = await tapOnce(d);
      if (id.startsWith('req:')) { pick = id.slice(4); continue; }
      if (id === 'accept') { if (selected !== pick) ccPlanned = false; selected = pick; toast(L('flow.req.accept') + '：' + L('req.' + pick + '.place')); }
      return;
    }
  }
  // ================================================================ 预告信（callingcard:send 3.0s 可跳过）
  async function callingCard() {
    F.screen = 'callingcard'; const r = selected!;
    const d = screen('', `<div class="dim"></div><div class="cc"><div class="logo"></div>${ransom(L('flow.cc.title'))}<div class="to">${fmt('flow.cc.to', { place: L('req.' + r + '.place'), boss: L('req.' + r + '.boss') })}</div><div class="body">${L('flow.cc.body')}</div><div class="sign">${L('flow.cc.sign')}</div></div>
      <div class="cc-eff">${L('flow.cc.effect')}</div><div class="fl-row">${btn('skip', 'flow.cc.skip')}${btn('send', 'flow.cc.send', true)}</div>`);
    d.querySelectorAll('.fl-btn .en').forEach((e, i) => (e.textContent = i ? 'SEND' : 'LATER'));
    const id = await tapOnce(d);
    if (id !== 'send') { ccPlanned = false; return; }
    ccPlanned = true;
    host.innerHTML = '';   // DOM 卡面收起，飞出/钉墙演出在画布上（recipe callingcard.send）
    await show('callingcard:send', { targetId: 'boss.' + r });
  }
  // ================================================================ 潜入
  async function infiltrate(reqId: string) {
    const run = new Run(save, reqId); run.callingCard = ccPlanned; F.run = run;
    // D3：发出预告信的局终点 = 统治者（两阶段 + 宝物）；普通局终点 = 守卫 BOSS（一阶段）
    eng.skin.labels['enemy.boss'] = L('req.' + reqId + '.boss');          // AI/委托文字覆盖：BOSS 名按委托（规则 id 不变）
    eng.skin.labels['enemy.warden'] = fmt('flow.warden.name', { place: L('req.' + reqId + '.place') });
    await prewarmExplore();
    let outcome: 'clear' | 'fail' | 'retreat' = 'clear';
    while (run.idx < run.nodes.length) {
      const n = run.node; let r: string | void = undefined;
      if (n.kind === 'gate' || n.kind === 'vault' || n.kind === 'risk') { await wipe(() => explore(run, n.kind)); r = await exploreLoop(run); }
      else if (n.kind === 'fork') { const c = await wipeRet(() => fork(run)); run.choose(c); bgm(c === 'risk' ? 'explore.risk' : 'explore', run.callingCard ? { callingCard: true } : {}); await wipe(() => explore(run, c === 'risk' ? 'risk' : 'vault')); r = await exploreLoop(run); }
      else if (n.kind === 'safe') { await wipe(() => {}); r = await safeRoom(run); }
      else if (n.kind === 'boss') r = await bossNode(run);
      if (r === 'retreat') { outcome = 'retreat'; break; }
      if (r === 'fail') {
        // 全灭：可从最近的安全屋免费重试一次（GDD §四），否则按失败结算
        const retry = await failScreen(run);
        if (retry) { run.retryFromSafe(); F.log.push('run:retry safe'); continue; }
        outcome = 'fail'; break;
      }
      run.next();
    }
    hideExplore();
    if (outcome === 'clear') { await wipe(() => runEnd(run)); await endWait; }
    else { await failSettle(run, outcome); }
    selected = null; ccPlanned = false; save.restAll(); save.persist();
    await wipe(() => {});
  }
  function hideExplore() { if (view) view.root.visible = false; eng.board = null; }
  /** 全灭画面：run:fail 演出 → 失败卡（保留/失去）→ 重试或撤回 */
  async function failScreen(run: Run): Promise<boolean> {
    F.screen = 'fail'; hideExplore(); host.innerHTML = ''; setHubBg('bg.explore.palace'); bgm('gameover');
    await show('run:fail', { reason: 'wipe' });
    if (!run.canRetry) return false;
    const p = run.failPreview();
    const d = screen('', `<div class="dim"></div><div class="big-title">${ransom(L('flow.fail.head'))}</div>
      <div class="end-grid fail"><div><b>${L('flow.fail.keep')}</b><span>¥${p.keepMoney.toLocaleString('en-US')}</span><small>EXP ×½</small></div><div><b>${L('flow.fail.lost')}</b><span>¥${p.loseMoney.toLocaleString('en-US')}</span></div></div>
      <div class="fl-row">${btn('back', 'flow.fail.back')}${btn('retry', 'flow.fail.retry', true)}</div>`);
    d.querySelectorAll('.fl-btn .en').forEach((e, i) => (e.textContent = i ? L('flow.fail.retry.sub') : 'HIDEOUT'));
    const id = await tapOnce(d); return id === 'retry';
  }
  /** 失败/撤退结算：保留本局收获的一半（B11/B19 + GDD §四），委托不算完成 */
  async function failSettle(run: Run, why: 'fail' | 'retreat') {
    if (why === 'retreat') { F.screen = 'retreat'; bgm('explore.escape'); host.innerHTML = ''; await show('run:retreat', { reason: 'safe' }); }
    const res = run.failSettle();
    await wipe(() => {
      F.screen = 'failend'; setHubBg('bg.explore.palace');
      const items = Object.entries(res.items).map(([k, n]) => `${L('item.' + k + '.name')} ×${n}`).join('　') || '—';
      const d = screen('', `<div class="dim"></div><div class="big-title">${ransom(L(why === 'fail' ? 'flow.fail.head' : 'flow.retreat.head'))}</div>
        <div class="end-grid fail"><div><b>${L('flow.fail.keep')}</b><span>¥${res.money.toLocaleString('en-US')}</span><small>EXP ${res.exp.toLocaleString('en-US')}</small></div><div><b>${L('flow.end.items')}</b><small>${items}</small></div>
        <div><b>${L('flow.fail.lost')}</b><span>¥${res.lostMoney.toLocaleString('en-US')}</span><small>EXP ${res.lostExp.toLocaleString('en-US')}</small></div><div><b>${L('flow.end.battles')}</b><small>${run.battles} · ${L('flow.end.alert')} ${run.alert}%</small></div></div>
        <div class="fl-row">${btn('back', 'flow.fail.back', true)}</div>`);
      d.querySelector('.fl-btn .en')!.textContent = 'HIDEOUT';
      endWait = tapOnce(d).then(() => {});
    });
    await endWait;
  }
  let endWait: Promise<void> = Promise.resolve();
  async function wipeRet<T>(f: () => Promise<T>): Promise<T> { let p!: Promise<T>; await wipe(() => { p = f(); }); return p; }
  function explore(run: Run, kind: string) {
    F.screen = 'explore:' + kind; setHubBg(null);
    const ex = run.enterNode()!;
    if (!view) { view = new ExploreView(eng.tex, save.party); layer.addChild(view.root); view.root.label = 'explore'; }
    view.root.visible = true; view.build(ex); eng.board = view.adapter();
    if (kind === 'boss') bgm('explore.boss', run.callingCard ? { callingCard: true } : {}); else if (kind !== 'risk') bgm('explore', run.callingCard ? { callingCard: true } : {});
    exHud(run, kind === 'boss' ? fmt('flow.hint.boss', { boss: L(run.ruler ? 'enemy.boss' : 'enemy.warden') }) : L(kind === 'risk' ? 'flow.hint.elite' : kind === 'vault' ? 'flow.hint.vault' : 'flow.hint.gate'));
  }
  let hudEl: HTMLElement | null = null;
  function exHud(run: Run, navi?: string) {
    const nodes = run.nodes.map((n, i) => { const k = n.kind === 'fork' ? (n.choice ? (n.choice === 'risk' ? 'risk' : 'vault') : 'fork') : n.kind; return `<span class="${i < run.idx ? 'done' : i === run.idx ? 'cur' : ''}">${L('flow.map.' + k)}</span>`; }).join('');
    const party = save.party.map((id) => { const m = save.members[id]; return `<div>${headImg(id)}<span class="hp">${m.hp}</span>/<span class="sp">${m.sp}</span></div>`; }).join('');
    const cards = run.cards.map((c) => `<i class="${c.rarity}">${L('card.' + c.series).slice(0, 2)}</i>`).join('');
    const d = screen('pass', `<div class="ex-alert${run.alertMax ? ' max' : ''}"><b>${L('flow.alert')}</b><div class="bar"><i style="transform:scaleX(${run.alert / 100})"></i></div><span class="pct">${run.alert}%</span></div>
      <div class="ex-map">${nodes}</div><div class="ex-scan"><button class="fl-btn" data-id="scan"><span class="zh">${L('flow.scan')}</span><span class="en">THIRD EYE</span></button></div>
      <div class="ex-party">${party}</div><div class="ex-cards">${cards}</div>
      <div class="ex-navi"><img src="${SK}head.oracle.webp" alt=""><p>${esc(navi ?? L('flow.tap'))}</p></div>`);
    hudEl = d;
    d.querySelector('[data-id=scan]')!.addEventListener('click', () => { if (busy || !view || scanCool) return; ui('confirm'); scanCool = true; (d.querySelector('[data-id=scan]') as HTMLElement).classList.add('cool'); busy = true; show('explore:scan', {}).then(() => { busy = false; }); setTimeout(() => { scanCool = false; hudEl?.querySelector('[data-id=scan]')?.classList.remove('cool'); }, 6000); });
  }
  const navi = (s: string) => { const p = hudEl?.querySelector('.ex-navi p'); if (p) p.textContent = s; };
  let busy = false, scanCool = false;
  function exploreLoop(run: Run) {
    return new Promise<string>((resolve) => {
      const v = view!, ex = run.explore!;
      v.onTap = async (c: Cell) => {
        if (busy) return; busy = true;
        try {
          const oldTrail = [ex.pos, ...ex.trail]; const evs = ex.tap(c);
          if (!evs.length) { ui('error'); busy = false; return; }
          for (const e of evs) { const r = await playEv(run, e, oldTrail); if (r === 'exit' || r === 'fail') { v.onTap = null; busy = false; resolve(r); return; } }
        } catch (err) { F.errors.push(String((err as any)?.stack ?? err)); }
        busy = false;
      };
      F.tap = (x: number, y: number) => v.onTap?.([x, y]);
    });
  }
  async function playEv(run: Run, e: StepEvent, oldTrail: Cell[]): Promise<string | void> {
    const v = view!, ex = run.explore!;
    if (e.kind === 'move') {
      const seq = [...oldTrail.slice().reverse(), ...e.path]; const base = oldTrail.length;
      const trails = e.path.map((_, i) => [seq[base + i - 1], seq[base + i - 2], seq[base + i - 3]].filter(Boolean) as Cell[]);
      eng.audio.play('se.step'); await show('explore:move', { unitId: 'joker', from: oldTrail[0], to: e.path[e.path.length - 1], path: e.path, trails, foes: e.foes });
    } else if (e.kind === 'cover') { navi(L('flow.hint.cover')); await show('explore:cover', { unitId: 'joker', cell: e.cell, coverId: 'cover' }); }
    else if (e.kind === 'spotted') {
      run.spotted++; run.addAlert(ECO.alert.spotted); toast(L('flow.spotted'), true);
      await show('explore:spotted', { enemyId: e.foeId, alert: run.alert });
      exHud(run, run.alertMax ? L('flow.alert.max') : L('flow.chase')); eng.audio.play('se.alert.up'); F.log.push('alert:change ' + run.alert);
    } else if (e.kind === 'lost') { toast(L('flow.chase.lost')); navi(L('flow.chase.lost')); v.syncFoes(); v.drawCones(); }
    else if (e.kind === 'interact' && e.what === 'chest') {
      await show('explore:interact', { kind: 'chest', targetId: 'chest', cell: e.at }, { kind: 'chest' });
      const l = e.loot; run.loot(l);
      if (l.money) { toast(fmt('flow.chest.money', { n: l.money.toLocaleString('en-US') })); eng.audio.play('se.money.get'); }
      if (l.item) { toast(fmt('flow.chest.item', { item: L('item.' + l.item + '.name'), n: l.n ?? 1 })); eng.audio.play('se.item.get'); }
      if (l.card) { await wait(500); await cardPick(run, l.card === 'rare'); }
      exHud(run);
    } else if (e.kind === 'interact' && e.what === 'hidden') {
      const h = ex.hiddenAt(e.at)!; const val = save.stats[h.stat] ?? 0; const ok = val >= h.need;
      await show('explore:interact', { kind: 'device', targetId: 'hidden', cell: e.at, ok }, { kind: 'device' });
      if (ok) { ex.openHidden(e.at); toast(fmt('flow.hidden.ok', { v: val })); v.drawCones(); } else toast(fmt('flow.hidden.ng', { v: val, need: h.need }), true);
    } else if (e.kind === 'encounter') {
      const f = e.enc.foe; F.log.push(`map:encounter ${f.kind} ${e.enc.mode}`);
      toast(L(e.enc.mode === 'preemptive' ? 'flow.preemptive' : e.enc.mode === 'ambushed' ? 'flow.ambushed' : 'flow.spotted'), e.enc.mode !== 'preemptive');
      await show('map:encounter', { nodeType: f.kind, enemyId: f.id, ambush: e.enc.mode });
      if (f.kind === 'boss') { const o = await bossFight(run, f); return o.lost ? 'fail' : 'exit'; }
      const out = await fight(run, f.enc, e.enc.mode, f.kind === 'patrol');
      if (out.fled) { F.log.push('escape success'); v.syncFoes(); exHud(run, L('flow.escape.ok')); return; }
      if (out.lost) return 'fail';
      ex.defeat(f.id); v.removeFoe(f.id);
      if (f.kind !== 'patrol') { await cardPick(run, f.kind === 'elite'); exHud(run, L('flow.exit.open')); await show('explore:exit', { gateId: 'gate' }); }
      else exHud(run);
    } else if (e.kind === 'exit') return 'exit';
  }
  // M5：装备修正随 carry 进战斗（饰品 HP/SP 加在上限上，回写时按差值扣回）
  function carry() { const c: Record<string, any> = {}; for (const id of save.party) { const m = save.members[id], q = save.eqOf(id); c[id] = { lv: m.lv, hp: m.hp + q.hp, hpMax: m.hpMax + q.hp, sp: m.sp + q.sp, spMax: m.spMax + q.sp, exp: m.exp, eq: q }; } return c; }
  const bagOf = () => Object.fromEntries(Object.entries(save.items).filter(([k, n]) => n > 0 && (CONS as any)[k]));
  async function fight(run: Run, types: string[], mode: 'preemptive' | 'normal' | 'ambushed', optional = false, isBoss = false): Promise<BattleOutcome> {
    F.screen = 'battle'; layer.visible = false; host.style.display = 'none';
    (window as any).__flowAward = (rw: any) => run.award(rw.exp, rw.money, rw.drops.map((d: any) => ({ id: d.id, n: d.n })));
    // 测试钩子：?wipe=boss → BOSS 战敌攻 ×30（自动化覆盖全灭失败分支，真战斗）；?fastwin=1 跳过战斗（wipe 指定的那场除外）
    const wipeT = ctx.qs.get('wipe'); const forceWipe = wipeT === 'all' || (wipeT === 'boss' && isBoss);
    const bag0 = bagOf();
    const mods = run.mods(); if (forceWipe) { mods.enemyAtk *= 30; mods.enemyHp *= 20; mode = 'ambushed'; }
    const out = ctx.qs.get('fastwin') === '1' && !forceWipe ? fakeWin(run, types) : await ctx.runBattle({ types, mode, carry: carry(), mods, party: save.party, callingCard: run.callingCard, optional, bag: bag0, jokerSkills: save.jokerSkills(), jokerPersona: BY_ID[save.persona.id]?.en });
    if (out.bag) for (const [k, n0] of Object.entries(bag0)) { const used = n0 - (out.bag[k] ?? 0); if (used > 0) { save.items[k] = Math.max(0, (save.items[k] ?? 0) - used); F.log.push(`bag ${k} -${used}`); } }
    for (const [id, c] of Object.entries(out.carry)) { const m = save.members[id]; m.hp = Math.min(m.hpMax, Math.max(out.lost ? 0 : 1, c.hp + (m.hpMax - c.hpMax))); m.sp = Math.min(m.spMax, c.sp + (m.spMax - c.spMax)); }
    run.battles++; run.turns += out.turns;
    if (out.turns > ECO.alert.slowTurns) run.addAlert(ECO.alert.slowBattle * (out.turns - ECO.alert.slowTurns));
    layer.visible = true; host.style.display = '';
    if (out.lost) { F.screen = 'fail'; return out; }
    F.screen = 'explore'; if (view && run.node.kind !== 'boss') bgm(run.forkChoice === 'risk' && run.node.kind === 'fork' ? 'explore.risk' : 'explore', run.callingCard ? { callingCard: true } : {});
    if (out.fled) bgm(run.forkChoice === 'risk' ? 'explore.risk' : 'explore', {});
    return out;
  }
  /** 测试用（?fastwin=1）：跳过战斗直接判胜（截图各尺寸流程画面用；完整流程自动化不用它） */
  function fakeWin(run: Run, types: string[]): BattleOutcome { const exp = 120 * types.length, money = 500 * types.length; run.award(exp, money, []); F.log.push('fastwin ' + types.join('+')); return { exp, money, drops: [], turns: 2, carry: carry(), bonus: false }; }
  // ================================================================ 心之卡（card:pick 0.6s → DOM 三选一）
  async function cardPick(run: Run, rare: boolean) {
    const offer = run.cardOffer(rare); F.screen = 'card';
    await show('card:pick', { cards: offer.map((c) => ({ id: c.id, rarity: c.rarity, title: 'card.' + c.series })) });   // 翻牌入场演出走 recipe，之后 DOM 三选一
    const d = document.createElement('div'); d.className = 'fl-screen'; host.appendChild(d);
    d.innerHTML = `<div class="dim"></div><div class="big-title">${ransom(L('flow.card.title'))}</div><div class="cards">${offer.map((c, i) => `<button class="hcard s-${c.series}${c.rarity === 'rare' ? ' rare' : ''}" data-id="${i}">${c.rarity === 'rare' ? `<span class="rr">${L('card.rare')}</span>` : ''}<span class="suit"></span><h4>${L('card.' + c.series)}</h4><p>${L('card.' + c.series + '.desc')}</p></button>`).join('')}</div>`;
    const id = await tapOnce(d); const card: Card = offer[+id];
    d.querySelector(`[data-id="${id}"]`)!.classList.add('picked'); run.cards.push(card); await wait(560); d.remove();
    if (run.count(card.series) === 3) { toast(L('flow.card.set') + ' ' + L('card.' + card.series)); F.log.push('buff:grant set.' + card.series); }
    F.screen = 'explore';
  }
  // ================================================================ 岔路 / 安全屋
  async function fork(run: Run): Promise<'safe' | 'risk'> {
    F.screen = 'fork'; if (view) view.root.visible = false; setHubBg('bg.explore.palace'); bgm('explore', run.callingCard ? { callingCard: true } : {});
    const d = screen('', `<div class="dim"></div><div class="big-title">${ransom(L('flow.fork.title'))}</div><div class="fork">
      <button class="fl-btn" data-id="safe"><span class="zh">${L('flow.fork.safe')}</span><span class="en">${L('flow.fork.safe.sub')}</span></button>
      <button class="fl-btn risk" data-id="risk"><span class="zh">${L('flow.fork.risk')}</span><span class="en">${L('flow.fork.risk.sub')}</span></button></div>`);
    F.log.push('map:move fork'); return (await tapOnce(d)) as 'safe' | 'risk';
  }
  async function safeRoom(run: Run): Promise<string | void> {
    F.screen = 'safe'; hideExplore(); setHubBg('bg.explore.palace'); bgm('explore.safe'); run.markSafe();
    const d = screen('', `<div class="dim"></div><div class="big-title">${ransom(L('flow.safe.sub'))}</div><div class="safe-word">SAFE ROOM</div><div class="safe-row">
      <button class="fl-btn hot" data-id="rest"><span class="zh">${L('flow.safe.rest')}</span><span class="en">${L('flow.safe.rest.sub')}</span></button>
      <button class="fl-btn" data-id="go"><span class="zh">${L('flow.safe.go')}</span><span class="en">NEXT</span></button>
      <button class="fl-btn ghost" data-id="retreat"><span class="zh">${L('flow.safe.retreat')}</span><span class="en">${L('flow.safe.retreat.sub')}</span></button></div>`);
    let id = await tapOnce(d);
    if (id === 'rest') { run.safeRest(); save.persist(); toast(L('flow.safe.saved')); d.querySelector('[data-id=rest]')!.remove(); id = await tapOnce(d); }
    if (id === 'retreat') return 'retreat';
  }
  // ================================================================ BOSS（boss:intro 2.0s 可跳过 → 战斗 → boss:phase 由战斗宿主回调）
  /** BOSS 节点（§20：BOSS 关固定手工格子房间，按委托一张）：走到王座前 → boss:intro → 战斗 */
  async function bossNode(run: Run): Promise<string | void> {
    await eng.loadGroup('enemy:boss');
    await wipe(() => explore(run, 'boss'));
    return exploreLoop(run);
  }
  async function bossFight(run: Run, f: { enc: string[] }) {
    F.screen = 'boss:intro'; hideExplore(); host.innerHTML = ''; setHubBg('bg.explore.palace');
    bgm('boss.intro');
    const ruler = run.ruler;
    await show('boss:intro', { bossId: ruler ? 'boss' : 'warden', tex: 'enemy.boss1', ruler, bossRole: L(ruler ? 'flow.boss.ruler' : 'flow.boss.warden'), bossLabel: L(ruler ? 'enemy.boss' : 'enemy.warden') }, {});
    const out = await fight(run, f.enc, 'normal', false, true);
    if (out.lost) return out;
    if (ruler) { run.treasure = true; F.log.push('item:get treasure'); }
    bgm('boss.defeat');
    return out;
  }
  (window as any).__flowTiming = (r: RunResult) => F.timings.push({ ev: r.ev, ms: r.wallMs, cap: r.capMs, recipe: r.recipe, forced: r.forced, skipped: r.skipped });
  // ================================================================ 局末结算
  async function runEnd(run: Run) {
    run.finish(); F.screen = 'end'; setHubBg('bg.explore.palace'); bgm('result');
    const items = Object.entries(run.gain.items).map(([k, n]) => `${L('item.' + k + '.name')} ×${n}`).join('　') || '—';
    const lv = save.party.map((id) => `${L('unit.' + id)} ${run.startLv[id]}→${save.members[id].lv}`).join('　');
    const d = screen('', `<div class="dim"></div><div class="big-title">${ransom(L('flow.end.title'))}</div>
      <div class="end-grid"><div><b>${L('flow.end.exp')}</b><span>${run.gain.exp.toLocaleString('en-US')}</span></div><div><b>${L('flow.end.money')}</b><span>¥${run.gain.money.toLocaleString('en-US')}</span><small>（${L('flow.end.reward')} ¥${run.req.reward.money.toLocaleString('en-US')}）</small></div>
      <div><b>${L('flow.end.lv')}</b><small>${lv}</small></div><div><b>${L('flow.end.items')}</b><small>${items}${run.treasure ? '　★ ' + L('flow.end.treasure') + '「' + L('flow.treasure.crown') + '」' : ''}</small></div>
      <div><b>${L('flow.end.cards')}</b><small>${run.cards.map((c) => L('card.' + c.series) + (c.rarity === 'rare' ? '★' : '')).join(' ') || '—'}</small></div><div><b>${L('flow.end.battles')}</b><small>${run.battles} · ${L('flow.end.alert')} ${run.alert}%</small></div></div>
      <div class="rank-l">${L('flow.end.rank')}</div><div class="rank">${run.rank()}</div><div class="fl-row">${btn('back', 'flow.end.back', true)}</div>`);
    d.querySelector('.fl-btn .en')!.textContent = 'HIDEOUT';
    endWait = tapOnce(d).then(() => {});
  }
  // ---- 启动
  (async () => { await eng.loadGroup('flow'); document.fonts?.ready; await hub(); })().catch((e) => F.errors.push(String(e?.stack ?? e)));
  F.click = (id: string) => (host.querySelector(`[data-id="${id}"]`) as HTMLElement | null)?.click();
  F.ids = () => Array.from(host.querySelectorAll<HTMLElement>('[data-id]')).map((e) => e.dataset.id);
}
