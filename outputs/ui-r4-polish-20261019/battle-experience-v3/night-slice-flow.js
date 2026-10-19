/**
 * 单层 AI 切片 · 界面
 *
 * 白昼记录 → 夜层 → 绕行 / 硬刚 / 自由输入交涉 → 回到白昼。
 * 这一层只负责呈现和转发动作；数值、概率与奖励都在 night-slice.js。
 */

import { equipmentBonuses } from './equipment.js';
import { grantItem } from './inventory.js';
import {
  SLICE_LIMITS,
  TONE_LABELS,
  applyBattleLoss,
  applyBattleWin,
  cleanRecord,
  createSliceRun,
  currentRoom,
  observeRoom,
  offlineFloorSpec,
  offlineJudge,
  resolveTalk,
  retireRun,
  sneakRoom,
  towerFloorSpec,
} from './night-slice.js';
import {
  installPreviewSliceBridge,
  requestFloorSpec,
  requestShadowJudge,
} from './night-slice-ai.js';
import { PERSONALITIES } from './negotiation-rules.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}[char]));

const KEY = 'maskaria.p5r.slice.v1';
const MODE_LABELS = {
  ai: '模型夜层 · 已连接',
  preview: '预览桥 · 未连接真实模型',
  offline: '离线夜层 · 本地规则',
};
const ROOM_LABELS = {
  guard: '守卫',
  shadow: '影子',
  event: '异响',
  exit: '出口',
};
const PERSONALITY_LABELS = Object.fromEntries(
  Object.entries(PERSONALITIES).map(([id, item]) => [id, item.label]),
);
const WEAKNESSES = ['electric', 'fire', 'ice', 'wind', 'psy', 'bless', 'curse', 'phys'];

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const cleanTalk = value => (
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, 160) : ''
);

function hashString(value) {
  let hash = 2166136261;
  const text = String(value ?? '');
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function createSliceFlow(api) {
  const { state, icon, render, notify, persistP5State, startBattle } = api;
  const params = new URLSearchParams(location.search);
  const offlineOnly = params.get('slice-ai') === 'off';
  if (params.get('slice-ai') === 'preview') installPreviewSliceBridge();

  let active = params.get('slice') === '1';
  let page = 'day';
  let record = '';
  let spec = null;
  let run = null;
  let lastNight = null;
  let history = [];
  let status = '';
  let judgement = null;
  let outcome = null;
  let pendingRoom = null;
  let talkText = '';
  let busy = false;
  let planningMode = 'tower';
  let requestId = 0;
  let requestController = null;

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null');
      if (!saved || typeof saved !== 'object') return;
      record = cleanRecord(saved.record);
      spec = saved.spec ?? null;
      run = saved.run ?? null;
      lastNight = saved.lastNight ?? null;
      history = Array.isArray(saved.history) ? saved.history.slice(0, 3) : [];
      if (run && !run.spec) run = null;
      if (run?.finished) run = null;
    } catch {}
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({ record, spec, run, lastNight, history }));
    } catch {}
  }

  function maxVitals() {
    const bonuses = equipmentBonuses(state.equipment, state.equipmentLevels);
    return {
      maxHp: (Number(state.heroMaxHp) || 52) + (Number(bonuses.hp) || 0),
      maxSp: (Number(state.heroMaxSp) || 34) + (Number(bonuses.sp) || 0),
    };
  }

  function modeLabel(mode = spec?.mode ?? 'offline') {
    return MODE_LABELS[mode] ?? MODE_LABELS.offline;
  }

  function setStatus(text) {
    status = text;
    if (page === 'planning' || page === 'judging') render();
  }

  function isCurrentRequest(id, controller) {
    return active && id === requestId && controller === requestController;
  }

  function cancelRequest() {
    requestId += 1;
    requestController?.abort();
    requestController = null;
    busy = false;
    status = '';
  }

  const btn = (label, action, note = '', tone = '', disabled = false) => (
    `<button class="flow-button slice-action ${tone}" data-slice="${action}" ${disabled ? 'disabled' : ''}>` +
    `<span>${esc(label)}${note ? `<small>${esc(note)}</small>` : ''}</span>${icon('arrow')}</button>`
  );

  function frame(title, english, body, scene) {
    return `<section class="experience-scene slice-scene slice-${scene}" data-slice-scene="${scene}">` +
      `<button class="flow-return" data-slice="close">${icon('back')}<span>离开<small>RETURN</small></span></button>` +
      `<div class="scene-ghost" aria-hidden="true">${esc(english)}</div>` +
      `<div class="scene-heading"><h1>${esc(title)}</h1><span>${esc(english)}</span></div>${body}</section>`;
  }

  function dayPage() {
    const resumable = run && !run.finished;
    const last = lastNight;
    const lastCard = last ? `<article class="slice-last-card">
      <span class="slice-kicker">LAST NIGHT / ${esc(last.date ?? '')}</span>
      <h2>${esc(last.title)}</h2>
      <p class="slice-last-memory">${esc(last.memory)}</p>
      <div class="slice-last-stats">
        <span>房间 <b>${last.rooms}</b></span>
        <span>硬刚 <b>${last.defeated}</b></span>
        <span>交涉 <b>${last.talked}</b></span>
        <span>带回 <b>¥${Number(last.money) || 0}</b></span>
      </div>
      <small>${esc(last.reasonText)} · 模式：${esc(modeLabel(last.mode))}</small>
    </article>` : `<article class="slice-last-card is-empty">
      <span class="slice-kicker">THE LOOP</span>
      <h2>还没有昨夜。</h2>
      <p>塔里本来就有一层。偶尔，你也可以把白天的某件事带进去，让那一层从它长出来。</p>
      <ol class="slice-loop-list">
        <li><b>入夜</b><span>塔的一层</span></li>
        <li><b>绕行 / 硬刚</b><span>自己选</span></li>
        <li><b>交涉</b><span>自己写</span></li>
        <li><b>回到白昼</b><span>留下回响</span></li>
      </ol>
    </article>`;
    return frame('白昼。', 'DAYLIGHT', `<div class="slice-day">
      <section class="slice-write">
        <span class="slice-kicker">TONIGHT / 入夜</span>
        <h2 class="slice-day-title">今晚，从哪里开始？</h2>
        <p class="slice-day-copy">塔里本来就有一层。要不要把白天的某件事带进去，由你决定。</p>
        <div class="slice-actions">
          <button class="flow-button slice-primary" data-slice="plan-tower" ${busy ? 'disabled' : ''}><span>直接入夜<small>塔自己的一层 · 3–5 间房</small></span>${icon('arrow')}</button>
          ${resumable ? btn('继续昨夜', 'resume', `停在「${currentRoom(run)?.title ?? '半路'}」`) : ''}
        </div>
        <details class="slice-record-drawer">
          <summary>今天想带一件事进去（可选）</summary>
          <label for="slice-record">写一句还在心里的事</label>
          <textarea id="slice-record" maxlength="${SLICE_LIMITS.record}" rows="3" placeholder="例：开会时没敢说出自己的想法">${esc(record)}</textarea>
          <div class="slice-write-foot">
            <small>只用于这一层，不会写进主 App 的记录。</small>
            <span id="slice-count">${record.length} / ${SLICE_LIMITS.record}</span>
          </div>
          <button class="flow-button slice-action" data-slice="plan" ${busy ? 'disabled' : ''}><span>把这件事带进夜里<small>这一层会从它长出来</small></span>${icon('arrow')}</button>
        </details>
        ${status ? `<p class="slice-status" role="status">${esc(status)}</p>` : ''}
        <p class="slice-mode">${esc(modeLabel())}${offlineOnly ? ' · 已强制离线' : ''}</p>
      </section>
      <aside class="slice-aside">${lastCard}
        <div class="slice-aside-note"><b>AI 的位置</b><p>它写房间、影子和台词；HP、SP、成功率与奖励仍由规则决定。记录只在你想带进去时才会用。</p></div>
      </aside>
    </div>`, 'day');
  }

  function planningPage() {
    const quote = planningMode === 'record' && record
      ? `「${esc(record)}」`
      : '塔里的一层，正在显形。';
    return frame('楼层正在合拢。', 'THE FLOOR IS FORMING', `<div class="slice-planning">
      <div class="slice-planning-mark" aria-hidden="true">${icon('eye')}<i></i><i></i><i></i></div>
      <blockquote>${quote}</blockquote>
      <p class="slice-status" role="status">${esc(status || (planningMode === 'record' ? '它正在读这句话。' : '它正在铺开这一层。'))}</p>
      <small>${esc(modeLabel())}</small>
    </div>`, 'planning');
  }

  function pathList(runState) {
    return `<ol class="slice-path" aria-label="今晚的房间">${runState.spec.rooms.map((room, index) => {
      const stateName = index < runState.index ? 'done' : index === runState.index ? 'current' : 'locked';
      return `<li class="slice-path-item is-${stateName}" ${index === runState.index ? 'aria-current="step"' : ''}>
        <b>${String(index + 1).padStart(2, '0')}</b>
        <span>${esc(ROOM_LABELS[room.kind] ?? '房间')}<small>${esc(room.title)}</small></span>
      </li>`;
    }).join('')}</ol>`;
  }

  function hud(runState) {
    return `<div class="slice-hud">
      <div><span>HP</span><b>${runState.hp}</b><small>/ ${runState.maxHp}</small></div>
      <div><span>SP</span><b>${runState.sp}</b><small>/ ${runState.maxSp}</small></div>
      <div><span>夜色</span><b>${runState.time}</b><small>步</small></div>
      <div class="${runState.alert >= 80 ? 'is-alert' : ''}"><span>警戒</span><b>${runState.alert}%</b><small>${runState.alert >= 100 ? '先制' : ''}</small></div>
    </div>`;
  }

  function roomActions(room, runState) {
    if (!room) return '';
    if (room.kind === 'exit') {
      return `<div class="slice-actions">${btn('推开白昼的门', 'settle', '结算今晚，回到白天')}</div>`;
    }
    const sneakNote = `夜色 -1 · 警戒 +${Math.round((room.danger === 'high' ? 16 : room.danger === 'low' ? 6 : 10) * 0.8)}`;
    if (room.kind === 'guard') {
      return `<div class="slice-actions">${btn('硬刚', 'fight', '进入战斗 · 留在塔里', 'red')}${btn('绕开它', 'sneak', sneakNote)}</div>`;
    }
    if (room.kind === 'shadow') {
      return `<div class="slice-actions">${btn('开口交涉', 'talk', '自己写，不选选项', 'yellow')}${btn('硬刚', 'fight', '直接开战', 'red')}${btn('绕开它', 'sneak', sneakNote)}</div>`;
    }
    return `<div class="slice-actions">${btn('停下来听', 'observe', '夜色 -1 · 换一点情报')}${btn('绕开', 'sneak', sneakNote)}</div>`;
  }

  function roomCard(room, runState) {
    if (!room) return '';
    const personality = room.shadow
      ? `<span class="slice-shadow-tag">${esc(PERSONALITY_LABELS[room.shadow.personality] ?? '未知')}</span>`
      : '';
    return `<article class="slice-room-card" data-room-kind="${esc(room.kind)}">
      <header>
        <span class="slice-kicker">${esc(ROOM_LABELS[room.kind] ?? '房间')} · ${esc(room.danger.toUpperCase())}</span>
        <span class="slice-room-index">${String(runState.index + 1).padStart(2, '0')} / ${String(runState.spec.rooms.length).padStart(2, '0')}</span>
      </header>
      <h2>${esc(room.title)}</h2>
      <p class="slice-room-line">${esc(room.line)}</p>
      ${room.shadow ? `<div class="slice-shadow">
        <div class="slice-shadow-name"><b>${esc(room.shadow.name)}</b>${personality}</div>
        <blockquote>「${esc(room.shadow.opening)}」</blockquote>
        <small>它要的是：${esc(room.shadow.demand)}</small>
      </div>` : ''}
      ${room.kind === 'exit' ? `<p class="slice-exit-memory">黎明之前，它会给出今晚最后一句回响。</p>` : ''}
      ${roomActions(room, runState)}
    </article>`;
  }

  function nightPage() {
    if (!run) return dayPage();
    const room = currentRoom(run);
    if (!room || run.finished) {
      finishNight(run?.reason || 'complete');
      return settlePage();
    }
    return frame(run.spec.title, 'NIGHT / ONE FLOOR', `<div class="slice-night">
      <section class="slice-night-main">
        <div class="slice-night-head">
          <div><span class="slice-kicker">${run.spec.rooms.length} 间房 · ${esc(run.spec.mood)}</span><p class="slice-source">${run.spec.origin === 'tower' ? '这一层不是从记录里长出来的。' : run.spec.source ? `「${esc(run.spec.source)}」` : '今天没有记录。塔还是长出了一层。'}</p></div>
          ${hud(run)}
        </div>
        ${pathList(run)}
        ${roomCard(room, run)}
      </section>
      <aside class="slice-night-side">
        <div class="slice-log"><span class="slice-kicker">TONIGHT</span>
          ${run.log.length ? run.log.slice(-4).map(line => `<p>${esc(line)}</p>`).join('') : '<p>还没有留下脚印。</p>'}
        </div>
        <div class="slice-side-note"><b>${esc(modeLabel(run.spec.mode))}</b><small>${run.spec.mode === 'offline' ? '本地规则仍能完成整晚。' : 'AI 只写文本与人格，不改数值。'}</small></div>
        ${btn('中途退回白昼', 'settle', '保留已经拿到的东西', 'subtle')}
      </aside>
    </div>`, 'night');
  }

  function talkPage() {
    const room = currentRoom(run);
    if (!room?.shadow) return nightPage();
    return frame('它开口了。', 'NEGOTIATION', `<div class="slice-talk-layout">
      <section class="slice-talk-stage">
        <span class="slice-kicker">SHADOW · ${esc(PERSONALITY_LABELS[room.shadow.personality] ?? '未知')}</span>
        <h2>${esc(room.shadow.name)}</h2>
        <blockquote>「${esc(room.shadow.opening)}」</blockquote>
        <p class="slice-demand">它要的是：${esc(room.shadow.demand)}</p>
        <div class="slice-talk-box">
          <label for="slice-talk">你想对它说什么？</label>
          <textarea id="slice-talk" rows="4" maxlength="160" placeholder="不用选选项。写你真正想说的那句。">${esc(talkText)}</textarea>
          <div class="slice-write-foot"><small>语气、内容和长度都会被听进去；成功率仍由规则计算。</small><span id="slice-talk-count">${talkText.length} / 160</span></div>
          <div class="slice-actions">
            <button class="flow-button slice-primary" data-slice="talk-send"><span>说出口<small>消耗一次机会</small></span>${icon('arrow')}</button>
            ${btn('先不说了', 'talk-back', '回到房间')}
          </div>
        </div>
      </section>
      <aside class="slice-talk-side">
        <div class="slice-shadow-meter"><span>它的耐心</span><i style="width:${Math.max(12, 100 - run.alert)}%"></i><small>警戒越高，它越不容易听进去。</small></div>
        <div class="slice-side-note"><b>它不在意选项</b><small>同一个“讲理”，写得好和写得敷衍，命中率不一样。</small></div>
      </aside>
    </div>`, 'talk');
  }

  function judgingPage() {
    const room = currentRoom(run);
    return frame('它在听。', 'LISTENING', `<div class="slice-planning slice-judging">
      <blockquote>「${esc(talkText)}」</blockquote>
      <p class="slice-status" role="status">${esc(status || '影子正在判断这句话。')}</p>
      <small>${esc(modeLabel(spec?.mode))} · ${esc(room?.shadow?.name ?? '')}</small>
    </div>`, 'judging');
  }

  function resultPage() {
    const room = outcome?.room ?? pendingRoom;
    const success = Boolean(outcome?.success);
    const chance = Number(outcome?.chance) || 0;
    return frame(success ? '它让开了。' : '它没有接受。', success ? 'IT LISTENED' : 'IT DID NOT', `<div class="slice-result ${success ? 'is-success' : 'is-fail'}">
      <div class="slice-result-head">
        <span class="slice-kicker">${esc(TONE_LABELS[outcome?.tone] ?? '交涉')} · 质量 ${outcome?.quality ?? 0}</span>
        <h2>${success ? '影子把路让开了。' : '影子没有让路。'}</h2>
        <div class="slice-chance" role="img" aria-label="成功率 ${chance}%"><i style="width:${chance}%"></i><b>${chance}%</b></div>
        <small>掷出 ${Math.round((Number(outcome?.roll) || 0) * 100)} / 100</small>
      </div>
      <blockquote class="slice-reply">「${esc(outcome?.reply ?? judgement?.reply ?? '')}」</blockquote>
      <div class="slice-result-foot">
        ${success
          ? `<p>带走了 <b>${esc(outcome?.reward?.label ?? '一点东西')}</b> 与 ¥${outcome?.reward?.money ?? 0}。</p>`
          : `<p>HP -${outcome?.hpCost ?? 0}，警戒推到 ${run?.alert ?? 0}%。它记住了你说话的样子。</p>`}
        <div class="slice-actions">${btn(run?.finished ? '回到白昼' : '继续往前走', 'continue', run?.finished ? '结算今晚' : '下一间房')}</div>
      </div>
    </div>`, 'result');
  }

  function reasonText(reason) {
    if (reason === 'timeout') return '夜色用完了，你带着已经拿到的东西退回白昼';
    if (reason === 'defeat') return '你在影子里倒下，被清晨拖了回来';
    if (reason === 'descend') return '你自己选择在半路停下';
    return '你走完了这一层';
  }

  function settlePage() {
    const last = lastNight;
    if (!last) return dayPage();
    return frame('回到白昼。', 'RETURN TO DAYLIGHT', `<div class="slice-settle">
      <div class="slice-settle-head">
        <span class="slice-kicker">${esc(last.date)} · ${last.origin === 'tower' ? '塔的一层' : '记录的一层'}</span>
        <h2>${last.sourceSnippet ? `「${esc(last.sourceSnippet)}」` : esc(last.title)}</h2>
        <p>${esc(last.reasonText)}。</p>
      </div>
      <div class="slice-settle-grid">
        <div><span>走过房间</span><b>${last.rooms}</b><small>间</small></div>
        <div><span>硬刚</span><b>${last.defeated}</b><small>场</small></div>
        <div><span>交涉</span><b>${last.talked}</b><small>次</small></div>
        <div><span>带回</span><b>¥${last.money}</b>${last.loot.length ? `<small class="slice-loot">${esc(last.loot.join(' / '))}</small>` : ''}</div>
      </div>
      <blockquote class="slice-memory">${esc(last.memory)}</blockquote>
      ${last.memories.length ? `<ul class="slice-memories">${last.memories.map(line => `<li>${esc(line)}</li>`).join('')}</ul>` : ''}
      <div class="slice-actions">
        <button class="flow-button slice-primary" data-slice="back-day"><span>把这一夜留在白昼<small>HP ${last.hp} · SP ${last.sp}</small></span>${icon('arrow')}</button>
        ${btn('回到据点', 'close', '', 'subtle')}
      </div>
    </div>`, 'settle');
  }

  function screen() {
    if (!active || state.fighting) return null;
    if (page === 'day') return dayPage();
    if (page === 'planning') return planningPage();
    if (page === 'night') return nightPage();
    if (page === 'talk') return talkPage();
    if (page === 'judging') return judgingPage();
    if (page === 'result') return resultPage();
    if (page === 'settle') return settlePage();
    return dayPage();
  }

  function encounterFor(room) {
    const level = 3 + run.index + (room.danger === 'high' ? 3 : room.danger === 'low' ? 0 : 1);
    const weakness = WEAKNESSES[hashString(room.id + run.index) % WEAKNESSES.length];
    return {
      name: room.shadow?.name ?? room.title,
      weakness,
      level,
      maxHp: 58 + level * 14,
      attack: 7 + level * 1.5,
      defense: 2 + level,
      ambush: run.alert >= 100,
    };
  }

  function finishNight(reason) {
    if (!run) return;
    const vitals = maxVitals();
    retireRun(run, reason);
    state.hp = clamp(Math.round(run.hp), 1, vitals.maxHp);
    state.sp = clamp(Math.round(run.sp), 0, vitals.maxSp);
    if (run.money) state.money = (Number(state.money) || 0) + run.money;
    for (const grant of run.grants) grantItem(state, grant.id, 1);
    if (run.loot.length) state.battleLoot.push(...run.loot);
    lastNight = {
      date: new Date().toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }),
      title: run.spec.title,
      origin: run.spec.origin ?? 'record',
      sourceSnippet: (run.spec.source ?? '').length > 26 ? `${run.spec.source.slice(0, 26)}…` : (run.spec.source ?? ''),
      theme: run.spec.theme,
      memory: run.spec.memory,
      rooms: run.spec.rooms.length,
      cleared: Math.min(run.index + 1, run.spec.rooms.length),
      defeated: run.defeated,
      talked: run.talked,
      loot: [...run.loot],
      memories: [...run.memories],
      money: run.money,
      hp: state.hp,
      sp: state.sp,
      alert: run.alert,
      mode: run.spec.mode,
      reason,
      reasonText: reasonText(reason),
    };
    history = [lastNight, ...history].slice(0, 3);
    run = null;
    spec = null;
    page = 'settle';
    status = '';
    judgement = null;
    outcome = null;
    pendingRoom = null;
    talkText = '';
    save();
    api.persistP5State?.();
  }

  function open() {
    cancelRequest();
    active = true;
    page = 'day';
    status = '';
    render({ focus: true });
    window.scrollTo(0, 0);
  }

  function close() {
    cancelRequest();
    active = false;
    page = 'day';
    save();
    api.goRoom('tower');
  }

  async function planNight(mode = 'tower') {
    if (busy) return;
    const field = document.querySelector('#slice-record');
    const text = mode === 'record' ? cleanRecord(field?.value ?? record) : '';
    if (mode === 'record' && !text) {
      notify('没写内容，今晚就从塔里开始。');
      mode = 'tower';
    }
    record = text;
    planningMode = mode;
    const controller = new AbortController();
    const id = ++requestId;
    requestController = controller;
    const isCurrent = () => isCurrentRequest(id, controller);
    busy = true;
    status = '';
    page = 'planning';
    render({ focus: true });
    const date = new Date().toISOString().slice(0, 10);
    try {
      const nextSpec = offlineOnly
        ? (mode === 'tower' ? towerFloorSpec({ date }) : offlineFloorSpec(text, { date }))
        : await requestFloorSpec(
          { mode, record: text, date },
          {
            signal: controller.signal,
            onStatus: value => {
              if (!isCurrent()) return;
              setStatus(value);
            },
          },
        );
      if (!isCurrent()) return;
      spec = nextSpec;
      const vitals = maxVitals();
      run = createSliceRun(nextSpec, {
        hp: Number(state.hp) || vitals.maxHp,
        sp: Number(state.sp) || vitals.maxSp,
        maxHp: vitals.maxHp,
        maxSp: vitals.maxSp,
      });
      status = '';
      page = 'night';
      save();
      render({ focus: true });
      window.scrollTo(0, 0);
    } catch (error) {
      if (!isCurrent() || error?.name === 'AbortError') return;
      status = '这一层没有显形，请再试一次。';
      page = 'day';
      render({ focus: true });
    } finally {
      if (isCurrent()) {
        busy = false;
        requestController = null;
      }
    }
  }

  function resumeNight() {
    if (!run) return;
    page = 'night';
    render({ focus: true });
  }

  function fight() {
    const room = currentRoom(run);
    if (!room || !['guard', 'shadow'].includes(room.kind)) return;
    pendingRoom = room;
    save();
    startBattle('tower', { encounter: encounterFor(room), floor: 1 });
  }

  async function sendTalk() {
    if (busy) return;
    const room = currentRoom(run);
    if (!room) return;
    const field = document.querySelector('#slice-talk');
    const text = cleanTalk(field?.value ?? talkText);
    talkText = text;
    if (!text) {
      notify('总得说点什么。');
      document.querySelector('#slice-talk')?.focus();
      return;
    }
    const activeRun = run;
    const controller = new AbortController();
    const id = ++requestId;
    requestController = controller;
    const isCurrent = () => (
      isCurrentRequest(id, controller) && run === activeRun && currentRoom(run) === room
    );
    busy = true;
    page = 'judging';
    status = '';
    render({ focus: true });
    try {
      const judged = offlineOnly
        ? offlineJudge({ text, room })
        : await requestShadowJudge(
          { text, room, dayRecord: record },
          {
            signal: controller.signal,
            onStatus: value => {
              if (!isCurrent()) return;
              setStatus(value);
            },
          },
        );
      if (!isCurrent()) return;
      judgement = judged;
      const resolved = resolveTalk(run, room, judged);
      if (!resolved.ok) {
        status = '';
        page = 'talk';
        notify(resolved.reason || '这次交涉没有成立。');
        render({ focus: true });
        return;
      }
      outcome = { ...resolved, room };
      page = 'result';
      save();
      render({ focus: true });
      window.scrollTo(0, 0);
    } catch (error) {
      if (!isCurrent() || error?.name === 'AbortError') return;
      status = '';
      page = 'talk';
      notify('它没有回应，请再试一次。');
      render({ focus: true });
    } finally {
      if (isCurrent()) {
        busy = false;
        requestController = null;
      }
    }
  }

  function act(action) {
    if (action === 'open') { open(); return; }
    if (action === 'close') { close(); return; }
    if (action === 'plan') { void planNight('record'); return; }
    if (action === 'plan-tower') { void planNight('tower'); return; }
    if (action === 'resume') { resumeNight(); return; }
    if (action === 'fight') { fight(); return; }
    if (action === 'sneak') {
      const result = sneakRoom(run);
      if (!result.ok) notify(result.reason);
      else if (run.finished) finishNight(run.reason);
      save();
      render({ focus: true });
      return;
    }
    if (action === 'observe') {
      const result = observeRoom(run);
      if (!result.ok) notify(result.reason);
      else if (run.finished) finishNight(run.reason);
      save();
      render({ focus: true });
      return;
    }
    if (action === 'talk') { page = 'talk'; talkText = ''; render({ focus: true }); return; }
    if (action === 'talk-back') { page = 'night'; render({ focus: true }); return; }
    if (action === 'talk-send') { void sendTalk(); return; }
    if (action === 'continue') {
      if (run?.finished) finishNight(run.reason || 'complete');
      else page = 'night';
      render({ focus: true });
      return;
    }
    if (action === 'settle') {
      if (!run) { page = 'day'; render({ focus: true }); return; }
      finishNight(run.finished ? run.reason : (currentRoom(run)?.kind === 'exit' ? 'complete' : 'descend'));
      render({ focus: true });
      window.scrollTo(0, 0);
      return;
    }
    if (action === 'back-day') { page = 'day'; status = ''; render({ focus: true }); window.scrollTo(0, 0); return; }
  }

  function battleReturn(won) {
    if (!run) return;
    run.hp = clamp(Number(state.hp) || run.hp, 1, run.maxHp);
    run.sp = clamp(Number(state.sp) || run.sp, 0, run.maxSp);
    const room = pendingRoom;
    pendingRoom = null;
    if (won && room) {
      applyBattleWin(run, room);
      page = 'night';
      save();
      return;
    }
    applyBattleLoss(run, room);
    finishNight('defeat');
  }

  document.addEventListener('input', event => {
    if (event.target?.id === 'slice-record') {
      record = cleanRecord(event.target.value);
      const counter = document.querySelector('#slice-count');
      if (counter) counter.textContent = `${event.target.value.length} / ${SLICE_LIMITS.record}`;
    }
    if (event.target?.id === 'slice-talk') {
      talkText = cleanTalk(event.target.value);
      const counter = document.querySelector('#slice-talk-count');
      if (counter) counter.textContent = `${event.target.value.length} / 160`;
    }
  });

  load();

  return {
    screen,
    act,
    battleReturn,
    open,
    close,
    dismiss() {
      cancelRequest();
      active = false;
      page = 'day';
      status = '';
      save();
    },
    get active() { return active; },
    get page() { return page; },
    get snapshot() {
      return {
        active,
        page,
        mode: spec?.mode ?? null,
        rooms: run?.spec.rooms.length ?? 0,
        index: run?.index ?? 0,
        finished: Boolean(run?.finished),
      };
    },
  };
}
