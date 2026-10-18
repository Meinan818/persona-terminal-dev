import {createEncounterDirector,escapeHtml as esc} from './encounters.js';
import {createPreparationDirector} from './preparation.js';
import {visualArt} from './art.js';
import {ITEM_DEFS} from './economy-rules.js';
import {BRIBE_COST,NEGOTIATION_OPTIONS,OPTION_ORDER,PERSONALITIES,chanceLabel,createNegotiation,negotiationChance,resolveNegotiation} from './negotiation-rules.js';
import {installPreviewNegotiationBridge,offlineNegotiation,requestNegotiation} from './negotiation-ai.js';
import {
  applyBattleReward,
  applyBattleItem,
  battleReceipt,
  buildActionPayload,
  buildBattleView,
  createTowerBattle,
  promoteBossPhase,
  syncAppState,
} from './p5-battle-bridge.js';
import { buildBattlePersona, ELEMENTS, setPersonaOverride } from './p5-combat-rules.js';
import { clearSignatureFx, playAllOut, playStagger } from './p3-signature-fx.js';
import { EQUIPMENT, equipmentBonuses, equipmentEffects, equipItem, unequipItem } from './equipment.js';
import { inventoryEntries, equipmentSummary, slotLabel, useInventoryItem, sellInventoryItem, upgradeEquipment } from './inventory.js';
import { arsenalEffects, relicList, RELICS, CHAINS } from './arsenal-effects.js';
import { xpNeeded } from './persona-progress.js';
import { createNpcTrust } from './npcs.js';
import { createSliceFlow } from './night-slice-flow.js';
installPreviewNegotiationBridge();
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const content = $('#content');
const sheet = $('#sheet');
const fixture = new URLSearchParams(location.search).get('state');
const visualStateMode = new URLSearchParams(location.search).get('visual') === 'states';
const visualStateKey = new URLSearchParams(location.search).get('state') || 'intent';
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const state = {
  room: 'battle', fighting: false, origin: 'battle', selectedNode: 'mob',
  mask: 0, arsenalTab: 'gear', equipped: new Set(['moon']), command: 'skills', skill: 0,
  relicDisposed: new Set(), chain: null, myth: null, oath: null, personaGrowth: {},
  hp: 52, sp: fixture === 'low-sp' ? 4 : 34, heroMaxHp: 52, heroMaxSp: 34,
  enemyHp: 312, enemyMaxHp: 420,
  turn: 4, stagger: 0, busy: false, finished: false, turnPhase: 'player', log: '轮到你了。先看意图，再决定这一回合。',
  negotiation: null, enemyRage: 0, weaknessKnown: false, recruitedMasks: [], battleLoot: [],
  battle: null, battleView: null, targetId: 'primary', battleActionKey: '',
  battleEncounter: null, battleFloor: 4, battleReceipt: null, battleWon: false, partyVitals: {},
  showtimeCutIn: false,
  heroPersonaIds: [], personaRoster: [], activePersonaId: 'arsene',
  allyPersonaIds: ['cait-sith', 'agathion', 'kelpie'],
  battleItems: { painkiller: 2, energyDrink: 1, revive: 1 },
  money: 8000,
  compendium: { entries: [] },
  materials: {},
  personaOverrides: {},
  personaCreated: false,
  personaAwakening: null,
  equipment: { weapon: 'training-blade', armor: 'school-jacket', accessory: null },
  ownedEquipment: ['training-blade', 'school-jacket'],
  equipmentLevels: {},
  personaXp: {},
  towerStratum: 'echo',
  npcTrust: createNpcTrust(),
  shadowTime: { days: [5, 6, 0], start: '20:00', end: '07:00' },
};
const scrolls = new Map();
const masks = [
  { id:'arsene', attr:'知识', name:'亚森', passive:'愚者 · 以咒怨切开表象', skills:[['耶哈',4,'咒怨伤害 · 单体'],['斩击',6,'物理伤害 · 单体']] },
  { id:'pixie', attr:'勇气', name:'皮克希', passive:'恋人 · 电击与微光', skills:[['吉欧',4,'电击伤害 · 单体'],['迪亚',3,'回复一名同伴的 HP']] },
  { id:'jack-o-lantern', attr:'灵巧', name:'杰克灯笼', passive:'魔术师 · 火种与削弱', skills:[['亚基',4,'火焰伤害 · 单体'],['拉坤达',8,'降低目标防御']] },
  { id:'silky', attr:'体贴', name:'希路奇', passive:'女教皇 · 冰冻与安眠', skills:[['永眠',3,'让目标陷入睡眠'],['布芙',4,'冰冻伤害 · 单体']] },
  { id:'succubus', attr:'魅力', name:'女梦魔', passive:'月 · 睡意与暴击', skills:[['永眠',3,'让目标陷入睡眠'],['反叛',5,'提升同伴暴击率']] },
  { id:'izanagi', attr:'借来的', name:'伊邪那岐', passive:'来自同伴 · 借来的雷霆', skills:[['十文字斩',20,'物理重击 · 单体两次'],['吉欧加',8,'电击伤害 · 单体']] },
];
const SUMMON_LINES = {
  arsene: '吾即是汝。影子，退后。',
  pixie: '别怕。这次由我来。',
  'jack-o-lantern': '借个火？不，借你的恐惧。',
  silky: '睡吧。醒来时，夜已经过去了。',
  succubus: '看着我。你只需要看着我。',
  izanagi: '借来的雷，也要还。',
};
const attributeMarks = [['eye','KNOWLEDGE'],['sword','COURAGE'],['shield','DEXTERITY'],['star','KINDNESS'],['mask','CHARM'],['mask','BORROWED']];
const ARCANA_LABELS = {
  fool:'愚者', magician:'魔术师', priestess:'女教皇', empress:'女皇', emperor:'皇帝',
  hierophant:'教皇', lovers:'恋人', chariot:'战车', justice:'正义', hermit:'隐者',
  fortune:'命运', strength:'力量', hanged:'倒吊人', death:'死神', temperance:'节制',
  devil:'恶魔', tower:'塔', star:'星', moon:'月', sun:'太阳', judgement:'审判',
  world:'世界', faith:'信念', consultant:'顾问',
};
const PARTY_CANDIDATE_IDS = ['cait-sith', 'agathion', 'kelpie', 'mandrake', 'archangel', 'principality'];
// 逆影战场重做：新模块独立存档；旧版 `maskaria.p5.preview.v1` 不读取、不迁移。
const P5_PREVIEW_KEY = 'maskaria.p5r.rebuild.v1';
const BASE_MASK_IDS = new Set(['arsene', 'pixie', 'jack-o-lantern', 'silky', 'succubus', 'izanagi']);
state.heroPersonaIds = masks.map(mask => mask.id);
state.personaRoster = [...state.heroPersonaIds];
state.activePersonaId = masks[state.mask].id;

function displayMaskFromPersona(persona, attr = '名录') {
  if (!persona) return null;
  const arcana = ARCANA_LABELS[persona.arcana] ?? persona.arcana;
  const element = persona.elementLabel ?? ELEMENTS[persona.element]?.label ?? persona.element;
  return {
    id: persona.id,
    attr,
    name: persona.name,
    passive: `${arcana} · ${element}`,
    skills: persona.skills.map(skill => [
      skill.name,
      skill.sp,
      `${ELEMENTS[skill.sourceElement]?.label ?? skill.sourceElement ?? '技能'} · ${skill.target === 'ally' || skill.target === 'allAllies' ? '我方' : skill.target === 'allEnemies' ? '全体敌方' : '敌方'}`,
    ]),
  };
}

function ensurePersonaInRoster(personaId, attr = '名录') {
  if (!personaId) return null;
  const built = buildBattlePersona(personaId);
  if (!built) return null;
  let display = masks.find(mask => mask.id === personaId);
  if (!display) {
    display = displayMaskFromPersona(built, attr);
    if (!display) return null;
    masks.push(display);
  }
  if (!state.heroPersonaIds.includes(personaId)) state.heroPersonaIds.push(personaId);
  if (!state.personaRoster.includes(personaId)) state.personaRoster.push(personaId);
  return display;
}

function persistP5State() {
  try {
    localStorage.setItem(P5_PREVIEW_KEY, JSON.stringify({
      activePersonaId: state.activePersonaId,
      allyPersonaIds: state.allyPersonaIds,
      personaRoster: state.personaRoster,
      battleItems: state.battleItems,
      money: state.money,
      compendium: state.compendium,
      materials: state.materials,
      personaOverrides: state.personaOverrides,
      personaCreated: Boolean(state.personaCreated),
      personaAwakening: state.personaAwakening,
      equipment: state.equipment,
      ownedEquipment: state.ownedEquipment,
      equipmentLevels: state.equipmentLevels,
      relics: [...state.equipped],
      relicDisposed: [...state.relicDisposed],
      chain: state.chain,
      myth: state.myth,
      oath: state.oath,
      personaGrowth: state.personaGrowth,
      difficulty: state.difficulty,
      personaXp: state.personaXp,
      towerStratum: state.towerStratum,
      npcTrust: state.npcTrust,
      shadowTime: state.shadowTime,
    }));
  } catch {}
}

function loadP5State() {
  try {
    const saved = JSON.parse(localStorage.getItem(P5_PREVIEW_KEY) ?? 'null');
    if (!saved) return;
    for (const id of saved.personaRoster ?? []) ensurePersonaInRoster(id);
    const allies = (saved.allyPersonaIds ?? []).filter(id => Boolean(buildBattlePersona(id)));
    if (allies.length === 3) state.allyPersonaIds = allies;
    if (saved.battleItems && typeof saved.battleItems === 'object') {
      for (const [id, qty] of Object.entries(saved.battleItems)) {
        if (ITEM_DEFS[id] && Number.isFinite(Number(qty))) state.battleItems[id] = Math.max(0, Number(qty));
      }
    }
    if (Number.isFinite(Number(saved.money))) state.money = Math.max(0, Number(saved.money));
    if (saved.compendium?.entries?.length) state.compendium = { entries: saved.compendium.entries };
    if (saved.materials && typeof saved.materials === 'object') state.materials = { ...saved.materials };
    if (saved.personaOverrides && typeof saved.personaOverrides === 'object') {
      state.personaOverrides = { ...saved.personaOverrides };
      for (const [id, override] of Object.entries(state.personaOverrides)) setPersonaOverride(id, override);
    }
    state.personaCreated = Boolean(saved.personaCreated);
    state.personaAwakening = saved.personaAwakening && typeof saved.personaAwakening === 'object'
      ? { ...saved.personaAwakening }
      : null;
    if (saved.equipment && typeof saved.equipment === 'object') {
      state.equipment = { ...state.equipment, ...saved.equipment };
    }
    if (Array.isArray(saved.ownedEquipment)) {
      state.ownedEquipment = [...new Set(saved.ownedEquipment.filter(id => Boolean(EQUIPMENT[id])))];
      state.ownedEquipment = [...new Set([...state.ownedEquipment, 'training-blade', 'school-jacket'])];
    }
    if (saved.equipmentLevels && typeof saved.equipmentLevels === 'object') {
      state.equipmentLevels = Object.fromEntries(
        Object.entries(saved.equipmentLevels)
          .filter(([id, level]) => Boolean(EQUIPMENT[id]) && Number.isFinite(Number(level)))
          .map(([id, level]) => [id, Math.max(0, Math.min(5, Number(level)))]),
      );
    }
    if (Array.isArray(saved.relics)) {
      state.equipped = new Set(saved.relics.filter(id => Boolean(RELICS[id])).slice(0, 2));
    }
    if (Array.isArray(saved.relicDisposed)) {
      state.relicDisposed = new Set(saved.relicDisposed.filter(id => Boolean(RELICS[id])));
      for (const id of state.relicDisposed) state.equipped.delete(id);
    }
    state.chain = Number.isInteger(saved.chain) && CHAINS[saved.chain] ? saved.chain : null;
    state.myth = saved.myth && typeof saved.myth === 'object' ? { ...saved.myth } : null;
    state.oath = saved.oath && typeof saved.oath === 'object' ? { ...saved.oath } : null;
    if (saved.personaGrowth && typeof saved.personaGrowth === 'object') {
      state.personaGrowth = { ...saved.personaGrowth };
    }
    if (['easy', 'normal', 'hard'].includes(saved.difficulty)) state.difficulty = saved.difficulty;
    if (saved.personaXp && typeof saved.personaXp === 'object') {
      state.personaXp = Object.fromEntries(
        Object.entries(saved.personaXp)
          .filter(([id, xp]) => Boolean(buildBattlePersona(id)) && Number.isFinite(Number(xp)))
          .map(([id, xp]) => [id, Math.max(0, Number(xp))]),
      );
    }
    if (['echo', 'vanity', 'escape'].includes(saved.towerStratum)) {
      state.towerStratum = saved.towerStratum;
    }
    if (saved.npcTrust && typeof saved.npcTrust === 'object') {
      state.npcTrust = { ...createNpcTrust(), ...saved.npcTrust };
    }
    if (saved.shadowTime && typeof saved.shadowTime === 'object') {
      state.shadowTime = {
        days: Array.isArray(saved.shadowTime.days) && saved.shadowTime.days.length ? saved.shadowTime.days : [5, 6, 0],
        start: typeof saved.shadowTime.start === 'string' ? saved.shadowTime.start : '20:00',
        end: typeof saved.shadowTime.end === 'string' ? saved.shadowTime.end : '07:00',
      };
    }
    if (saved.activePersonaId && selectPersona(saved.activePersonaId)) {
      state.activePersonaId = saved.activePersonaId;
    }
  } catch {}
}

function selectPersona(personaId) {
  const index = masks.findIndex(mask => mask.id === personaId);
  if (index < 0) return false;
  state.mask = index;
  state.activePersonaId = personaId;
  state.skill = 0;
  persistP5State();
  return true;
}

function removePersonaFromRoster(personaId) {
  if (BASE_MASK_IDS.has(personaId)) return false;
  state.personaRoster = state.personaRoster.filter(id => id !== personaId);
  state.heroPersonaIds = state.heroPersonaIds.filter(id => id !== personaId);
  const index = masks.findIndex(mask => mask.id === personaId);
  if (index >= 0) masks.splice(index, 1);
  delete state.personaOverrides[personaId];
  setPersonaOverride(personaId, null);
  if (state.activePersonaId === personaId) {
    state.activePersonaId = masks[0]?.id ?? 'arsene';
    state.mask = Math.max(0, masks.findIndex(mask => mask.id === state.activePersonaId));
  }
  persistP5State();
  return true;
}

function allyPersona(personaId) {
  return buildBattlePersona(personaId);
}

function maskTabButton(mask, index) {
  const mark = attributeMarks[index] ?? ['mask', 'PERSONA'];
  return `<button data-mask="${index}" aria-pressed="${index === state.mask}">${icon(mark[0])}<span>${mask.attr}<small>${mark[1]}</small></span><b aria-hidden="true">${icon('chevrons')}</b></button>`;
}

function openPartyEditor(focusSlot = 0) {
  const slot = Math.max(0, Math.min(2, Number(focusSlot) || 0));
  const cards = state.allyPersonaIds.map((id, index) => {
    const persona = allyPersona(id);
    return `<button type="button" class="party-slot ${index === slot ? 'selected' : ''}" data-party-slot="${index}" aria-pressed="${index === slot}"><b>${String(index + 1).padStart(2, '0')}</b><span>${esc(persona?.name ?? id)}<small>${esc(persona ? `${ARCANA_LABELS[persona.arcana] ?? persona.arcana} · ${persona.elementLabel ?? persona.element}` : '同行面具')}</small></span></button>`;
  }).join('');
  const candidates = PARTY_CANDIDATE_IDS.map(id => {
    const persona = allyPersona(id);
    if (!persona) return '';
    const occupied = state.allyPersonaIds.includes(id) && state.allyPersonaIds[slot] !== id;
    return `<button type="button" data-ally-id="${id}" data-slot="${slot}" ${occupied ? 'disabled' : ''} aria-pressed="${state.allyPersonaIds[slot] === id}"><span>${esc(persona.name)}<small>Lv.${persona.level} · ${esc(persona.elementLabel ?? persona.element)}</small></span>${state.allyPersonaIds[slot] === id ? icon('check') : icon('arrow')}</button>`;
  }).join('');
  openSheet('同行面具', `<p class="sheet-lede">三张面具从名录借来，与你一同进入影时间。</p><div class="party-editor-slots">${cards}</div><h3 class="sheet-subhead">替换第 ${slot + 1} 位</h3><div class="ally-picker">${candidates}</div>`);
}

function openBattleItems() {
  const entries = Object.entries(state.battleItems ?? {}).filter(([id, qty]) => (
    Number(qty) > 0 && ['heal', 'sp', 'revive', 'cure'].includes(ITEM_DEFS[id]?.kind)
  ));
  if (!entries.length) {
    openSheet('道具', '<p class="sheet-lede">随身包已经空了。</p>');
    return;
  }
  openSheet('道具', `<p class="sheet-lede">使用一件道具会消耗当前行动。</p><div class="ally-picker">${entries.map(([id, qty]) => {
    const item = ITEM_DEFS[id];
    if (!item) return '';
    return `<button data-battle-item="${id}"><span>${esc(item.name)} ×${qty}<small>${esc(item.desc)}</small></span>${icon('arrow')}</button>`;
  }).join('')}</div>`);
}

function useBattleItemAction(id) {
  if (!state.battle || state.busy || state.battle.phase !== 'party') return;
  const item = ITEM_DEFS[id];
  const qty = Number(state.battleItems?.[id]) || 0;
  if (!item || qty <= 0) {
    notify('这件道具已经用完了。');
    return;
  }
  const actor = state.battle.actor;
  const run = ++actionRun;
  const result = applyBattleItem(state.battle, item, { targetId: actor?.id });
  if (!result.ok) {
    notify(result.reason);
    return;
  }
  state.battleItems[id] = qty - 1;
  persistP5State();
  sheet.close();
  state.busy = true;
  state.log = `${actor?.name ?? '你'} 使用「${item.name}」。`;
  const view = syncBattleUi();
  const target = view?.party?.find(member => member.id === result.targetId);
  render();
  const kind = result.kind === 'sp' ? 'buff' : result.kind === 'heal' || result.kind === 'revive' ? 'heal' : 'buff';
  flows.impact(kind, {
    amount: result.amount,
    target: 'party',
    targetSelector: target ? `[data-party-id="${target.id}"]` : null,
    meterTo: target?.hp,
    meterMax: target?.maxHp,
  }).finished.then(() => {
    if (run !== actionRun) return;
    state.busy = false;
    const next = syncBattleUi();
    if (next?.phase === 'defeat') {
      state.fighting = false;
      flows.open('defeat');
      return;
    }
    render({ focus: true });
  });
}
const nodes = {
  echo: { title:'回忆之光', kind:'回响', icon:'star', hp:'—', weak:'—', note:'短暂休息，听见一段来自白昼的回声。', action:'进入回响', reward:'恢复与回忆' },
  mob: { title:'聒噪的假面', kind:'小影', icon:'sword', hp:'312 / 420', weak:'知识', note:'它正在蓄势。查看敌人的意图，决定自己的第一步。', action:'进入战斗', reward:'战斗后结算' },
  chest: { title:'月匣', kind:'月匣', icon:'box', hp:'—', weak:'—', note:'走近一只沉默的匣子，看看这段路留下了什么。', action:'查看月匣', reward:'开启后揭晓' },
};
function icon(name) { return `<svg aria-hidden="true"><use href="#i-${name}"/></svg>`; }
function mainButton(text, action, small = '', tone = '') {
  return `<button class="main-button ${tone}" data-action="${action}"><span>${text}${small ? `<small>${small}</small>` : ''}</span>${icon('arrow')}</button>`;
}
function heading(title, en, note = '') { return `<div class="page-heading"><h1>${title}<span>${en}</span></h1>${note ? `<p>${note}</p>` : ''}</div>`; }
function notify(text) {
  $('.toast').textContent = text;
  $('.toast').classList.add('visible');
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => $('.toast').classList.remove('visible'), 2400);
}
let sweepTimer, hitTimer, enemyTimer, actionRun=0;
function transition(word, origin) {
  if (reduced.matches) return;
  const fx = $('.sweep');
  clearTimeout(sweepTimer);
  fx.classList.remove('playing');
  fx.style.setProperty('--x', `${origin?.x ?? innerWidth / 2}px`);
  fx.style.setProperty('--y', `${origin?.y ?? innerHeight / 2}px`);
  $('span', fx).textContent = word;
  void fx.offsetWidth;
  fx.classList.add('playing');
  sweepTimer = setTimeout(() => fx.classList.remove('playing'), 670);
}
function hit(text) {
  if (reduced.matches) return;
  const fx = $('.hit-fx');
  clearTimeout(hitTimer);
  fx.classList.remove('playing');
  $('strong', fx).textContent = text;
  void fx.offsetWidth;
  fx.classList.add('playing');
  hitTimer = setTimeout(() => fx.classList.remove('playing'), 520);
}
function openSheet(title, html) {
  $('#sheet-title').textContent = title;
  sheet.classList.toggle('settings-sheet',title==='战场设置');
  $('#sheet-body').innerHTML = html;
  $('.settings-button').setAttribute('aria-expanded',String(title==='战场设置'));
  if (!sheet.open) sheet.showModal();
}
function home() {
  const journey=flows.towerSnapshot;
  if (fixture === 'no-persona'&&!state.personaCreated) return `${heading('逆影战场','SHADOW BATTLE')}<div class="home-grid"><div class="hero-stage"><div aria-hidden="true">${figure()}</div><span class="sh-home-glint" aria-hidden="true"></span></div><section class="mission"><h2>先遇见你的 Persona</h2><p>选择你的面具，再踏入影时间。</p>${mainButton('开始觉醒','awaken-persona')}<p class="info-note">还没有面具回应你。</p></section></div>`;
  return `${heading('逆影战场','SHADOW BATTLE','影时间没有尽头。')}
    <div class="home-grid"><div class="hero-stage" aria-hidden="true">${figure()}<span class="slash-label">与另一个自己，同路。</span><span class="sh-home-glint" aria-hidden="true"></span></div>
      <section class="mission"><span class="slash-label">${preparation.settings.enabled?'影时间进行中':'战场暂未启用'}</span><h2>${journey.ended?'塔门已关。':'下一层还在。'}</h2><p>${journey.ended?`本次抵达 ${journey.floor}F。`:`当前 ${journey.floor}F。路线还没有决定。`}</p>
        <div class="mission-line"><span>当前区段</span><b>第 ${Math.max(1, Math.ceil((journey.floor || 1) / 10))} 区段</b></div>
        <div class="mission-line"><span>登塔进度</span><b>${journey.floor} / ${journey.maxFloor ?? 100} F</b></div>
        ${mainButton(journey.ended?'查看本次行程':'继续登塔','open-tower',journey.ended?'回望走过的路':'回到当前层，查看下一条路线')}
        <button class="text-button" data-action="start-battle">进入训练遭遇</button>
        <div class="mini-prep">${icon('mask')}<span>契约面具 <b>${esc(masks[state.mask].name)}</b></span><button class="text-button" data-action="open-persona">交换</button></div>
        <div class="status-ribbon"><span>HP <b>${state.hp}</b> / ${state.heroMaxHp??52}</span><span>SP <b>${state.sp}</b> / ${state.heroMaxSp??34}</span><span>装备 <b>${Object.values(state.equipment??{}).filter(Boolean).length}</b> / 3</span><span>遗物 <b>${state.equipped.size}</b> / 2</span></div>
      </section></div>
    <section class="trial-banner">
      <div><h2><span class="trial-mode">HOLD UP</span>全部击倒后，影子会开口。</h2><p>弱点和暴击会让影子倒地。全部倒地时，战斗停下：你可以总攻击、交涉，或让它重新站起来。收服的 Persona 会进入面具名录。</p></div>
      <button class="trial-go" type="button" data-action="start-battle"><span>进入训练遭遇<small>4F · 不影响塔层进度 · 看弱点 / One More / HOLD UP</small></span>${icon('arrow')}</button>
    </section>`;
}
function figure() { return visualArt('hero','<div class="figure"><i class="head"></i><i class="coat"></i><i class="eye"></i><i class="cut"></i></div>'); }
function tower() {
  return flows.screen() ?? (flows.towerActive ? flows.towerRoute() : flows.towerPrep());
}
function persona() {
  const m = masks[state.mask];
  const built = buildBattlePersona(m.id);
  const xp = Number(state.personaXp?.[m.id]) || 0;
  const need = xpNeeded(built?.level ?? 1);
  const skillList = built?.skills?.length
    ? built.skills.map(skill => ({
      name: skill.name,
      sp: skill.sp,
      detail: `${ELEMENTS[skill.sourceElement]?.label ?? skill.element} · ${skill.target === 'ally' || skill.target === 'allAllies' ? '我方' : skill.target === 'allEnemies' ? '全体敌方' : '敌方'}${skill.guard ? ' · 防御' : ''}`,
    }))
    : m.skills.map(skill => ({ name: skill[0], sp: skill[1], detail: skill[2] }));
  if (state.oath?.maskId === m.id && skillList[state.oath.skillIndex]) {
    skillList[state.oath.skillIndex] = { name: '铁壁之誓', sp: 0, detail: '防御 · 以大盾挡下本回合伤害' };
  }
  const growth = state.personaGrowth?.[m.id];
  const ranks = Array.isArray(growth?.skillRanks) ? growth.skillRanks : [];
  return `${heading('Persona','THE OTHER SELF','契约仍在。')}
    <div class="mask-tabs" aria-label="选择面具">${masks.map(maskTabButton).join('')}</div>
    <div class="duo-layout"><div class="mask-display"><div class="mask-art" aria-hidden="true"></div><p>${m.attr} · ${esc(m.passive)}</p></div><section class="persona-info"><h2>${esc(built?.name ?? m.name)}</h2><p>当前契约。<span class="persona-exp">Lv.${built?.level ?? 1} · EXP ${xp} / ${need}</span></p>
    <div class="persona-spec">${icon(attributeMarks[state.mask]?.[0]??'mask')}<span>契约面具</span><strong>${m.attr}</strong><b>${attributeMarks[state.mask]?.[1]??'PERSONA'}</b></div>
    <div class="persona-stats"><span>HP <b>${built?.maxHp ?? 52}</b></span><span>SP <b>${built?.maxSp ?? 34}</b></span><span>攻 <b>${built?.attack ?? 0}</b></span><span>防 <b>${built?.defense ?? 0}</b></span><span>速 <b>${built?.agility ?? 0}</b></span><span>运 <b>${built?.luck ?? 0}</b></span></div>
    <div class="persona-skills">${skillList.map((s,i) => `<article class="persona-skill" style="--order:${i}"><div class="persona-skill-mark">${icon(i===0?(attributeMarks[state.mask]?.[0]??'mask'):'star')}</div><div class="persona-skill-copy"><h3>${esc(s.name)}${ranks[i] > 1 ? ` <small>Lv.${ranks[i]}</small>` : ''}</h3><p>${esc(s.detail)}</p></div><strong class="persona-skill-cost">${s.sp}<small>SP</small></strong></article>`).join('')}</div>
    ${mainButton('返回高塔','open-tower')}${preparation.personaTools()}<p class="info-note">技能成长会提高对应技能的伤害；迷思、誓约与装备会直接进入战斗。</p></section></div>`;
}
const arsenalItems = {
  relic:[['moon','月光碎片','半月遗物 · 已有装备可在这里调整。'],['thread','回响之线','残月遗物 · 查看说明后选择携带。']],
  myth:[['myth','迷思石','选择技能，查看镶嵌与卸下的位置。']],
  oath:[['oath','未命名的誓约','为面具选择誓约技能。']],
  chain:[['chain','共鸣链','查看两张面具之间的连接。']],
};
function arsenal() {
  const tabs = [['gear','装备'],['relic','遗物'],['myth','迷思'],['oath','誓约'],['chain','共鸣链']];
  const entries = inventoryEntries(state);
  const bonuses = equipmentBonuses(state.equipment, state.equipmentLevels);
  const passive = arsenalEffects(state);
  const tab = tabs.some(([id]) => id === state.arsenalTab) ? state.arsenalTab : 'gear';
  const button = (label, action, disabled = false) => `<button class="small-button" data-arsenal="${action}" ${disabled ? 'disabled' : ''}>${label}</button>`;
  const slots = ['weapon','armor','accessory'].map(slot => {
    const item = EQUIPMENT[state.equipment?.[slot]];
    return `<article class="equipment-row"><div class="equipment-glyph">${icon(slot === 'weapon' ? 'sword' : slot === 'armor' ? 'shield' : 'star')}</div><div><h3>${item ? esc(item.name) : `${slotLabel(slot)} · 空`}</h3><p>${item ? esc(equipmentSummary(item, state.equipmentLevels?.[item.id] ?? 0)) : '这个位置还没有装备。'}</p></div>${item ? button('卸下', `unequip:${slot}`) : ''}</article>`;
  }).join('');
  const ownedGear = entries.equipment.map(entry => `<article class="equipment-row"><div class="equipment-glyph">${icon('mask')}</div><div><h3>${esc(entry.item.name)} <small>+${entry.level}</small></h3><p>${esc(equipmentSummary(entry.item, entry.level))}</p></div><div class="inventory-actions">${entry.equipped ? '<span class="info-note">装备中</span>' : button('装备', `equip:${entry.item.id}`)}${button(`强化 +${entry.level + 1}`, `upgrade:${entry.item.id}`, entry.level >= 5 || state.money < entry.upgrade.money || (Number(state.materials.enhanceStone) || 0) < entry.upgrade.stones)}</div></article>`).join('');
  const consumables = entries.consumables.map(entry => `<article class="equipment-row"><div class="equipment-glyph">${icon('box')}</div><div><h3>${esc(entry.item.name)} ×${entry.qty}</h3><p>${esc(entry.item.desc)}</p></div><div class="inventory-actions">${button('使用', `use:${entry.id}`, !['heal','sp'].includes(entry.item.kind))}${button('出售 ×1', `sell:${entry.id}`)}</div></article>`).join('');
  const materials = entries.materials.map(entry => `<article class="equipment-row"><div class="equipment-glyph">${icon('star')}</div><div><h3>${esc(entry.item.name)} ×${entry.qty}</h3><p>${esc(entry.item.desc)}</p></div>${button('出售 ×1', `sell:${entry.id}`)}</article>`).join('');
  const relics = relicList(state).map(relic => `<article class="equipment-row"><div class="equipment-glyph">${icon('star')}</div><div><h3>${esc(relic.name)}</h3><p>${esc(relic.desc)} · ${relic.equipped ? '已携带' : '未携带'}</p></div><div class="inventory-actions">${button(relic.equipped ? '卸下' : '携带', `relic:${relic.id}`)}<button class="small-button" data-item="${relic.id}">查看</button></div></article>`).join('');
  const chains = CHAINS.map((chain, index) => `<article class="equipment-row"><div class="equipment-glyph">${icon('mask')}</div><div><h3>${esc(chain.name)}</h3><p>${esc(chain.pair)} · ${esc(chain.desc)}</p></div>${button(state.chain === index ? '解除' : '连接', `chain:${index}`)}</article>`).join('');
  const myth = state.myth ? `<div class="effect-receipt">${icon('star')}<span>${esc(masks[state.myth.mask]?.name ?? '')} · ${esc(masks[state.myth.mask]?.skills?.[state.myth.skill]?.[0] ?? '技能')} · 暴击 +10%</span></div>${button('重新镶嵌', 'open:myth')}` : `<p class="info-note">迷思石可以给指定面具的一个技能追加 10% 暴击率。</p>${button('选择镶嵌技能', 'open:myth')}`;
  const oath = state.oath ? `<div class="effect-receipt">${icon('shield')}<span>${esc(masks[state.oath.mask]?.name ?? '')} · ${esc(masks[state.oath.mask]?.skills?.[state.oath.skill]?.[0] ?? '技能')} → 铁壁之誓</span></div>${button('调整誓约', 'open:oath')}` : `<p class="info-note">誓约会把一个技能替换成“铁壁之誓”，在战斗中可以主动防御。</p>${button('选择誓约', 'open:oath')}`;
  const body = tab === 'gear'
    ? `<div class="gear-bonuses"><span>攻击 <b>+${bonuses.attack}</b></span><span>防御 <b>+${bonuses.defense}</b></span><span>HP <b>+${bonuses.hp}</b></span><span>SP <b>+${bonuses.sp}</b></span></div><div class="arsenal-list">${slots}${ownedGear || '<p class="info-note">还没有获得其他装备。</p>'}</div>`
    : tab === 'relic'
      ? `<div class="gear-bonuses"><span>遗物位 <b>${state.equipped.size} / 2</b></span><span>技能伤害 <b>+${Math.round(passive.skillBonus * 100)}%</b></span><span>金钱 <b>+${Math.round(passive.money * 100)}%</b></span></div><div class="arsenal-list">${relics}</div>`
      : tab === 'myth'
        ? `<div class="vr-panel-inline">${myth}</div>`
        : tab === 'oath'
          ? `<div class="vr-panel-inline">${oath}</div>`
          : `<div class="arsenal-list">${chains}</div>`;
  const extra = tab === 'gear' ? `<h3 class="source-title">消耗品</h3><div class="arsenal-list">${consumables || '<p class="info-note">背包里还没有消耗品。</p>'}</div><h3 class="source-title">素材</h3><div class="arsenal-list">${materials || '<p class="info-note">还没有素材。</p>'}</div>` : '';
  return `${heading('武库','ARSENAL','每一件东西都真正进入战斗、经济或探索。')}
    <div class="subnav arsenal-tabs" aria-label="武库分类">${tabs.map(([id,label],i) => `<button data-arsenal-tab="${id}" aria-pressed="${id === tab}">${icon(['sword','star','eye','shield','mask'][i])}<span>${label}<small>${['GEAR','RELIC','MYTH','OATH','RESONANCE'][i]}</small></span></button>`).join('')}</div>
    <div class="arsenal-wallet"><span>持有 <b>¥${(Number(state.money) || 0).toLocaleString()}</b></span><span>HP <b>${state.hp}</b> / ${state.heroMaxHp ?? 52}</span><span>SP <b>${state.sp}</b> / ${state.heroMaxSp ?? 34}</span></div>
    ${body}${extra}<p class="info-note">装备、遗物、迷思、誓约和共鸣链会立即生效。成长技能在 Persona 页提升。</p>`;
}
function skillRow(skill, index, selectable = false) {
  const selected = selectable && state.skill === index;
  const tag = selectable ? 'button' : 'div';
  const disabled = selectable && (state.sp < skill[1] || state.busy);
  return `<${tag} class="skill-row ${selected ? 'selected' : ''}" ${selectable ? `data-skill="${index}" aria-pressed="${selected}" ${disabled ? 'disabled' : ''}` : ''}>${icon('star')}<span>${skill[0]}<small>${skill[2]}${disabled && state.sp < skill[1] ? ' · SP 不足' : ''}</small></span><strong>${skill[1]} SP</strong></${tag}>`;
}
const commands = [['skills','技能','star'],['basic','普攻','sword'],['defend','防御','shield'],['insight','洞察','eye']];
function meter(value, maximum) { return `<div class="meter"><i style="--value:${Math.max(0, Math.min(100,value/maximum*100))}%"></i></div>`; }
function battleActionKey(action) {
  return action ? `${action.type}:${action.id ?? action.targetId ?? ''}` : '';
}
function battleActionIcon(type) {
  return {
    basic: 'sword',
    gun: 'eye',
    guard: 'shield',
    analyze: 'eye',
    batonPass: 'chevrons',
    switchMask: 'mask',
    items: 'box',
  }[type] ?? 'star';
}
function currentEngineView() {
  if (!state.battle) return null;
  const view = buildBattleView(state.battle, state.targetId);
  const itemCount = Object.values(state.battleItems ?? {}).reduce((total, qty) => total + (Number(qty) || 0), 0);
  if (view.phase === 'party') {
    view.actions.push({ type: 'items', label: '道具', detail: `${itemCount} 件可用 · 消耗本回合`, cost: 0, disabled: itemCount <= 0 });
  }
  state.battleView = view;
  if (view.selectedTargetId && view.selectedTargetId !== state.targetId) state.targetId = view.selectedTargetId;
  const available = view.actions ?? [];
  if (!available.some(action => battleActionKey(action) === state.battleActionKey)) {
    state.battleActionKey = battleActionKey(
      available.find(action => action.type === 'skill' && !action.disabled)
      ?? available.find(action => action.type === 'basic' && !action.disabled)
      ?? available.find(action => !action.disabled)
      ?? available[0],
    );
  }
  return view;
}
function selectedEngineAction(view = currentEngineView()) {
  return view?.actions?.find(action => battleActionKey(action) === state.battleActionKey) ?? null;
}
function commandCost() {
  const action = selectedEngineAction();
  return Number(action?.cost) || 0;
}
function commandName() {
  return selectedEngineAction()?.label ?? '选择行动';
}
function enemyUnitsHtml(view) {
  return view.enemies.map((enemy, index) => `<button class="enemy-unit ${enemy.active ? 'is-active' : ''} ${!enemy.alive ? 'is-down' : ''}" data-target-id="${enemy.id}" data-unit="${index}" aria-pressed="${enemy.active}" ${!enemy.alive ? 'disabled' : ''} title="点击选中 ${esc(enemy.name)}"><span class="enemy-unit-face" aria-hidden="true"><svg viewBox="0 0 200 200"><circle cx="100" cy="100" r="82" fill="#05040e" stroke="#ff3f8e" stroke-width="4"/><circle cx="100" cy="100" r="96" fill="none" stroke="rgba(255,63,142,.3)"/><ellipse cx="70" cy="90" rx="17" ry="10" fill="#ff7fb3"/><ellipse cx="130" cy="90" rx="17" ry="10" fill="#ff7fb3"/><path d="M76 132l8-8 8 8 8-8 8 8 8-8" stroke="#ff7fb3" stroke-width="5" fill="none"/></svg></span><span class="enemy-unit-label"><b>${esc(enemy.alive ? enemy.name : 'DEFEATED')}</b><small>${enemy.alive ? `HP ${enemy.hp} / ${enemy.maxHp}` : '已击破'}</small></span></button>`).join('');
}
let lastShownActorId = null;
function combat() {
  if (state.finished) return flows.victory();
  const view = currentEngineView();
  if (!view) return flows.victory();
  const target = view.selectedTarget;
  const negotiating = Boolean(state.negotiation?.active);
  const actorTurn = view.phase === 'party' && !negotiating;
  const showTurnHandoff = view.phase === 'party' && !state.busy && Boolean(view.actorId) && view.actorId !== lastShownActorId;
  if (showTurnHandoff) lastShownActorId = view.actorId;
  if (view.phase !== 'party') lastShownActorId = null;
  const turnHandoff = showTurnHandoff
    ? `<div class="turn-handoff ${view.actorIsPlayer?'is-player':'is-ally'}" role="status" aria-live="polite"><span>${view.actorIsPlayer?'YOUR TURN':'ALLY TURN'}</span><b>${esc(view.actorIsPlayer?'轮到你了':view.actorName??'同伴')}</b><small>${view.actorIsPlayer?'选择行动':'轮到同伴行动 · 现在由你操作'}</small></div>`
    : '';
  const action = selectedEngineAction(view);
  const skills = view.actions.filter(item => item.type === 'skill');
  const commandsAvailable = view.actions.filter(item => !['skill', 'switchMask'].includes(item.type));
  const knownItems = target?.knownAffinities ?? [];
  const knownWeak = knownItems.find(item => item.affinity === 'weak');
  const knownText = knownItems.map(item => `${item.label}${item.short}`).join(' · ');
  const weakness = knownWeak ? `弱点 · ${knownWeak.label}` : knownItems.length ? `已发现 · ${knownText}` : '弱点 · 未发现';
  const statusLabels = {burn:'燃烧',freeze:'冰冻',shock:'触电',confuse:'混乱',fear:'恐惧',sleep:'睡眠',rage:'暴怒',despair:'绝望',dizzy:'眩晕',brainwash:'洗脑',forget:'遗忘'};
  const disabled = state.busy || !actorTurn || !action || action.disabled;
  const intentTitle = negotiating
    ? 'HOLD UP · 它倒下了'
    : view.phase === 'holdUp'
      ? 'HOLD UP · 所有影子都倒下了'
      : view.phase === 'party'
        ? `${view.actorName} 的行动`
        : view.phase === 'defeat'
          ? '队伍倒下'
          : '敌方回合';
  const intentNote = negotiating
    ? '现在可以威胁、讨好、讲理，或给它 SP。'
    : view.phase === 'holdUp'
      ? '可以谈判、总攻击，或让它们重新站起来继续战斗。'
      : target?.intent
        ? `下一手：${target.intent.label} · ${target.intent.elementLabel} · 目标随机。`
        : `下一手：${target?.elementLabel ?? '未知'}系技能 · 目标随机。`;
  const showtimeCutIn = state.showtimeCutIn
    ? `<div class="showtime-cutin" aria-hidden="true"><span>SHOWTIME</span><b>${esc(view.actorName ?? '你')} × ${esc(view.party.find(member => !member.isPlayer)?.name ?? '同伴')}</b><small>ONE MORE CHANCE</small></div>`
    : '';
  const normalDeck = `<div class="actor-turn ${view.actorIsPlayer?'is-player':'is-ally'}"><span>${view.actorIsPlayer?'YOUR TURN':'ALLY TURN'}</span><b>${esc(view.actorIsPlayer?'你':view.actorName??'同伴')}</b><small>${view.actorIsPlayer?'选择行动':'轮到同伴，由你操作'}</small></div><div class="command-label"><span>${view.actorIsPlayer?'SKILL · 主角技能':'ALLY · 同伴行动'}</span><strong>COST</strong></div>
      <div class="command-grid engine-command-grid">${commandsAvailable.map((item,order)=>`<button data-battle-action="${battleActionKey(item)}" aria-pressed="${battleActionKey(item)===state.battleActionKey}" style="--tilt:${[-4,-1,2,4,1,-2][order%6]}deg" ${state.busy||!actorTurn||item.disabled?'disabled':''}>${icon(battleActionIcon(item.type))}<span>${esc(item.label)}<small>${esc(item.detail ?? item.type)}</small></span></button>`).join('')}</div>
      <div class="command-detail">${skills.length?`<div class="skill-list">${skills.map(item=>combatSkill(item)).join('')}</div><p>${esc(action?.detail ?? '选择一项行动。')}</p>`:`<div class="action-banner">${icon('sword')}<strong>没有可用技能</strong><b>0<small>SP</small></b></div><p>仍然可以使用普攻、枪击、防御或同伴行动。</p>`}</div>
      <button class="main-button execute" data-action="execute" ${disabled?'disabled':''}><span>${state.busy?'行动演出中…':!actorTurn?'等待当前回合':action?.disabled?'当前无法使用':`执行 · ${esc(action?.label ?? '选择行动')}`}</span>${icon('arrow')}</button>
      <p class="busy-text">${state.busy?'等待行动结束，避免重复出手。':!actorTurn?'当前不是行动者的回合。':`${commandCost()} SP · ${esc(action?.detail ?? '选好行动后执行')}`}</p>`;
  const holdUpCutins = `<div class="p3-cutins" aria-hidden="true">${['主角', '队员 1', '队员 2', '队员 3'].map(label => `<span class="p3-cutin"><b>P3-E</b><em>${label} Cut-in</em><small>480×760</small></span>`).join('')}</div>`;
  const holdUpDeck = view.phase === 'holdUp' ? `<div class="engine-hold-up">${holdUpCutins}<span>HOLD UP</span><h3>全部倒地。</h3><p>现在可以总攻击、交涉，或放它们站起来。</p><div class="hold-up-actions"><button data-holdup-engine="allOut">${icon('star')}总攻击</button><button data-action="hold-up-negotiate">${icon('eye')}交涉</button><button data-holdup-engine="continue">${icon('back')}放它们起来</button></div></div>` : '';
  const shAff = ['phys','gun','fire','ice','electric','wind','psy','nuclear','bless','curse'].map(el=>{const k=knownItems.find(item=>item.element===el);const nm={phys:'物',gun:'枪',fire:'火',ice:'冰',electric:'电',wind:'风',psy:'念',nuclear:'核',bless:'祝',curse:'咒'}[el];return `<span class="sh-aff ${k?'is-'+k.affinity:''}" title="${esc(k?k.label:nm)}"><i><em>${k?esc(k.short):'?'}</em></i><small>${nm}</small></span>`;}).join('');
  const shDeco = `<div class="sh-sky" aria-hidden="true"><div class="sh-moon"></div><div class="sh-word">DARK HOUR</div><div class="sh-water"><i></i><i></i><i></i><i></i><i></i></div><div class="sh-ripple"></div><div class="sh-ripple"></div></div><div class="sh-clock" aria-hidden="true"><b>0<span>:</span>00</b><i class="sh-phase"></i><div><strong>影时间 · ROUND ${String(view.round).padStart(2,'0')}</strong><em>THE DARK HOUR</em><small>${state.busy?'行动演出中':esc(view.actorName??'—')}${flows.bossPhase?` · PHASE 0${flows.bossPhase}`:''}</small></div></div><div class="p4-deco" aria-hidden="true"><i class="p4-fan a"></i><i class="p4-fan b"></i><i class="p4-spot s1"></i><i class="p4-spot s2"></i><i class="p4-stripe"></i><div class="p4-logo"><small>MIDNIGHT CHANNEL</small><b>午夜电视台</b><i>live tonight!</i></div><div class="p4-clock"><b>ROUND ${String(view.round).padStart(2,'0')}</b><i>${state.busy?'ON AIR · 演出中':'现场直播中'}</i></div><div class="p4-booth"><span class="p4-tag">导航员<b>NAVI</b></span><div class="p4-por"><em>P4-D</em>导航员立绘</div><div class="p4-sig"><b>后台导航</b><i>reading…</i><div class="p4-wave">${'<span></span>'.repeat(9)}</div><span class="p4-live"><i></i>ON AIR</span></div><h5>耐性表<i>affinity</i></h5></div><div class="p4-tv"><i class="ant l"></i><i class="ant r"></i><div class="body"></div><div class="scr"><div class="fog"></div><div class="floor"></div><div class="vhs"></div><div class="roll"></div><div class="vig"></div><div class="gl"></div><span class="osd tl">CH ${flows.bossPhase?'0'+flows.bossPhase:'01'} <b class="bug">LIVE</b></span><span class="osd tr"><b class="r">●</b> REC</span></div><div class="knobs"><span></span><span></span></div></div><div class="p4-cast"><h4>今晚的出演阵容<i>tonight's cast</i></h4></div><div class="p4-con"><div class="deck"></div><div class="nb"><i class="rings"></i></div></div></div>`;
  return `${showtimeCutIn}<div class="sh-stage" data-phase="${esc(view.phase)}" data-negotiating="${negotiating}">${shDeco}${turnHandoff}<div class="combat-top"><button class="back-button" data-action="leave-battle">${icon('back')}<span>返回${state.origin==='tower'?'路线':'战场'}<small>RETURN</small></span></button><div class="party-rail" aria-label="队伍回合">${view.party.map(member=>`<span class="${member.active?'active':''} ${member.down?'down':''}" data-party-id="${member.id}"><b>${member.isPlayer?'YOU':'ALLY'}</b>${esc(member.name)}<small>${member.active?'行动中':member.down?'倒下':`HP ${member.hp}`}</small></span>`).join('')}</div><p>ROUND ${String(view.round).padStart(2,'0')} / ${state.busy?'行动演出中':view.actorName??'—'}</p></div>${flows.rehearsalRail?.()??''}${visualStateMode?visualStateRail():''}
    <div class="combat-poster">
      <div class="combat-word" aria-hidden="true">BATTLE</div>
      <div class="combat-hero" aria-hidden="true"><div class="sh-tarot"><span class="sh-num">— ${view.actorIsPlayer?'0':'I'} —</span><div class="sh-art">${figure()}</div><b>${esc(view.actorPersona??view.actorName??'—')}</b><em>${view.actorIsPlayer?'PERSONA':'ALLY'}${view.actorPersonaLevel?` · LV ${view.actorPersonaLevel}`:''}</em><i class="sh-glint"></i></div></div>
      <div class="combat-orbit" aria-hidden="true"><i></i><b></b></div>
      <div class="glass-shards" aria-hidden="true">${Array.from({length:9},(_,i)=>`<i style="--i:${i}"></i>`).join('')}</div>
      <section class="enemy-scene ${flows.bossPhase?'boss-in-combat':''} ${state.busy?'enemy-turn':''}" data-phase="${flows.bossPhase||1}" aria-label="敌人状态">
      <div class="enemy-name"><h1>${esc(target?.name??'敌人')}</h1><span>${flows.bossPhase?`PHASE 0${flows.bossPhase}`:`${target?.down?'DOWN':'TARGET'}`}</span></div>
      <div class="enemy-targets" role="group" aria-label="战场上的敌人，共 ${view.enemies.length} 个"><span class="enemy-count">敌人 ${view.enemies.filter(e=>e.alive).length} / ${view.enemies.length}</span>${view.enemies.map(enemy=>`<button data-target-id="${enemy.id}" class="${enemy.active?'active':''} ${!enemy.alive?'down':''}" aria-pressed="${enemy.active}" ${!enemy.alive?'disabled':''}><b>${esc(!enemy.alive?'DEFEATED':enemy.name)}</b><small>${!enemy.alive?'已击破':`HP ${enemy.hp} / ${enemy.maxHp}`}</small></button>`).join('')}</div>
      <div class="enemy-vitals"><span>敌人 HP</span><span><strong>${target?.hp??0}</strong> / ${target?.maxHp??1}</span></div>${meter(target?.hp??0,target?.maxHp??1)}
      <div class="sh-affs" aria-label="耐性">${shAff}</div><div class="weakness-line"><b>${weakness}</b><span>${negotiating?'HOLD UP · 可以交涉':target?.status?`异常 · ${statusLabels[target.status]??target.status}${target.statusTurns?` · ${target.statusTurns} 回合`:''}`:target?.down?'失衡 · 1 MORE / 总攻击窗口':target?.enraged?'激怒 · 攻击提升':'耐性会随命中逐步发现'}</span></div>
      <div class="sh-ring" aria-hidden="true"><i></i><i></i><i></i><b></b></div>${enemyUnitsHtml(view)}
      <div class="enemy-intent">${icon('eye')}<span><b>${intentTitle}</b><small>${intentNote}</small></span></div>
    </section><section class="command-deck" aria-label="战斗指令" aria-busy="${state.busy||negotiating}">
      <div class="player-hud"><div class="player-tag"><b>${view.actorIsPlayer?'ME':'ALLY'}</b><span>${esc(view.actorPersona??view.actorName??'—')}<small>${view.actorPersonaLevel?`LV ${view.actorPersonaLevel}`:''}</small></span></div><div><span>HP <strong>${view.hudHp}</strong><em>/ ${view.hudMaxHp}</em></span>${meter(view.hudHp,view.hudMaxHp)}</div><div class="sp"><span>SP <strong>${view.hudSp}</strong><em>/ ${view.hudMaxSp}</em></span>${meter(view.hudSp,view.hudMaxSp)}</div></div>
      <div class="mask-switcher"><button class="icon-button" data-action="prev-mask" aria-label="上一张面具" ${state.busy||negotiating||!view.actorIsPlayer?'disabled':''}>${icon('chevrons')}</button><button data-action="choose-mask" ${state.busy||negotiating||!view.actorIsPlayer?'disabled':''}><span class="mask-emblem">${icon('mask')}</span><span class="mask-switch-name">${esc(view.actorPersona??view.actorName??'—')}<small>${view.actorIsPlayer?'PERSONA · 换面具消耗本回合':'ALLY · 当前同伴'}</small></span><b aria-hidden="true">${icon('chevrons')}</b></button><button class="icon-button" data-action="next-mask" aria-label="下一张面具" ${state.busy||negotiating||!view.actorIsPlayer?'disabled':''}>${icon('chevrons')}</button></div>
      ${negotiating ? negotiationPanel() : view.phase === 'holdUp' ? '' : normalDeck}
    </section><p class="battle-log" role="status" aria-live="polite">${esc(state.log)}</p></div>${view.phase === 'holdUp' && !negotiating ? holdUpDeck : ''}</div>`;
}

let negotiationRun = 0;

function negotiationModeLabel(mode) {
  if (mode === 'offline') return '旧契约';
  if (mode === 'preview') return 'HOLD UP';
  return 'HOLD UP';
}

function negotiationSuccessCard() {
  const data = state.negotiation.data;
  return `<div class="negotiation-card">
    <span class="stamp">DEAL</span>
    <h4>它接受了你的条件。</h4>
    <p>你可以把它收作面具，也可以拿走它身上的东西。</p>
    <div class="skill-line"><b>收服</b> ${esc(data.recruit.name)} · ${esc(data.recruit.skillName)}<br>${esc(data.recruit.skillDesc)}</div>
    <div class="skill-line"><b>奖励</b> SP +${data.reward.sp} · ${esc(data.reward.item)}</div>
    <div class="negotiation-choices"><button type="button" data-action="negotiation-recruit">收服为面具</button><button type="button" data-action="negotiation-reward">索要奖励</button></div>
  </div>`;
}

function negotiationFailedCard() {
  const chance = state.negotiation.chance;
  return `<div class="negotiation-failed">
    <h4>交涉破裂。</h4>
    <p>它对“${esc(NEGOTIATION_OPTIONS[state.negotiation.option]?.label ?? '这个条件')}”不买账（把握：${chanceLabel(chance)}）。它被激怒了，下一击会更重。</p>
    <button class="small-button" type="button" data-action="negotiation-fight">放它们起来</button>
  </div>`;
}

function negotiationResultCard() {
  const result = state.negotiation.result;
  if (result.type === 'recruit') {
    return `<div class="negotiation-card">
      <span class="stamp">RECRUITED</span>
      <h4>${esc(result.name)} 加入了面具名录。</h4>
      <p>${esc(result.attribute ?? result.element ?? 'PERSONA')} · ${esc(result.skillName)}</p>
      <div class="skill-line">${esc(result.skillDesc)}</div>
      <p>它的名字，已记入面具名录。</p>
      <div class="negotiation-result-actions"><button class="main-button" type="button" data-action="return-after-battle"><span>${state.origin==='tower'?'带着收服结果返回路线':'返回战场'}</span></button></div>
    </div>`;
  }
  return `<div class="negotiation-card">
    <span class="stamp">LOOT</span>
    <h4>拿到了 ${esc(result.item)}。</h4>
    <p>SP +${result.sp}。它缩回影子里，没再挡路。</p>
    <div class="negotiation-result-actions"><button class="main-button" type="button" data-action="return-after-battle"><span>${state.origin==='tower'?'带着奖励返回路线':'返回战场'}</span></button></div>
  </div>`;
}

function negotiationPanel() {
  const n = state.negotiation;
  if (!n?.active) return '';
  const personality = PERSONALITIES[n.data?.personality] ?? PERSONALITIES.proud;
  const head = `<div class="negotiation-head"><div><span>HOLD UP / 交涉</span><b>${esc(personality.label)}的影子</b></div><span class="negotiation-ai ${esc(n.aiMode)}">${esc(negotiationModeLabel(n.aiMode))}</span></div>`;
  if (n.phase === 'loading') {
    return `<div class="negotiation-panel" role="status">${head}<div class="negotiation-loading"><span>影子正在打量你</span><p>${esc(n.statusText)}</p><i></i></div></div>`;
  }
  if (n.phase === 'rolling') {
    return `<div class="negotiation-panel" role="status">${head}<div class="negotiation-loading"><span>交涉判定</span><p>它在衡量你的话……</p><i></i></div></div>`;
  }
  if (n.phase === 'success') return `<div class="negotiation-panel">${head}${negotiationSuccessCard()}</div>`;
  if (n.phase === 'failed') return `<div class="negotiation-panel">${head}${negotiationFailedCard()}</div>`;
  if (n.phase === 'result') return `<div class="negotiation-panel">${head}${negotiationResultCard()}</div>`;
  const data = n.data;
  const options = OPTION_ORDER.map(id => {
    const meta = NEGOTIATION_OPTIONS[id];
    const disabled = state.busy || (id === 'bribe' && state.sp < BRIBE_COST);
    const cost = id === 'bribe' ? ` · ${BRIBE_COST} SP` : '';
    return `<button class="negotiation-option ${id}" type="button" data-negotiation-option="${id}" ${disabled ? 'disabled' : ''}>
      <span class="n-stance"><b>${meta.label}</b><small>${meta.en}</small></span>
      <span class="n-copy"><b>${esc(data.options[id])}</b><small>${esc(meta.blurb)} · <span class="n-risk">${meta.risk}风险</span>${cost}</small></span>
    </button>`;
  }).join('');
  return `<div class="negotiation-panel" aria-live="polite">${head}
    <span class="negotiation-personality">${esc(personality.label)} · ${esc(personality.blurb)}</span>
    <blockquote class="negotiation-quote">“${esc(data.opening)}”</blockquote>
    <p class="negotiation-demand"><b>它想要</b>${esc(data.demand)}</p>
    <div class="negotiation-options">${options}</div>
    <button class="negotiation-allout" type="button" data-holdup-engine="allOut"><b>总攻击</b><small>不谈判，直接收尾</small></button>
    <button class="negotiation-fight" type="button" data-action="negotiation-fight">不接话，继续打</button>
  </div>`;
}

async function loadNegotiation() {
  const n = state.negotiation;
  if (!n) return;
  const run = ++negotiationRun;
  const view = state.battleView ?? currentEngineView();
  const target = view?.selectedTarget;
  const weakness = target?.knownAffinities?.find(item => item.affinity === 'weak')?.element;
  const enemyAttribute = ({
    electric: '知识',
    bless: '勇气',
    fire: '勇气',
    ice: '体贴',
    wind: '灵巧',
    psy: '知识',
    nuclear: '灵巧',
    curse: '魅力',
  })[weakness] ?? '魅力';
  const input = {
    enemy: {
      name: target?.name ?? (flows.bossPhase ? '回声的执念' : '聒噪的假面'),
      attribute: enemyAttribute,
      level: state.battleFloor,
      hp: target?.hp ?? state.enemyHp,
      maxHp: target?.maxHp ?? state.enemyMaxHp,
    },
    persona: {
      name: view?.actorPersona ?? masks[state.mask].name,
      attribute: enemyAttribute,
    },
    player: { hp: state.hp, sp: state.sp, turn: state.turn },
    history: state.log,
  };
  try {
    const result = await requestNegotiation(input, {
      onStatus: text => {
        if (run !== negotiationRun || !state.negotiation) return;
        state.negotiation.statusText = text;
        const line = document.querySelector('.negotiation-loading p');
        if (line) line.textContent = text;
      },
    });
    if (run !== negotiationRun || !state.negotiation) return;
    const battleEnemy = state.battle?.enemies.find(enemy => enemy.id === state.targetId);
    if (battleEnemy?.recruit) {
      result.recruit = {
        ...result.recruit,
        ...battleEnemy.recruit,
        attribute: enemyAttribute,
      };
    }
    if (battleEnemy?.reward) result.reward = { ...battleEnemy.reward };
    state.negotiation.data = result;
    state.negotiation.aiMode = result.mode;
    state.negotiation.phase = 'offer';
    state.busy = false;
    state.log = `${PERSONALITIES[result.personality]?.label ?? '影子'}开口了。它在等你开价。`;
    render();
  } catch (error) {
    if (run !== negotiationRun || error?.name === 'AbortError' || !state.negotiation) return;
    state.negotiation.data = offlineNegotiation(input);
    state.negotiation.aiMode = 'offline';
    state.negotiation.phase = 'offer';
    state.busy = false;
    state.log = '影子按旧模板开口了。';
    render();
  }
}

function maybeOpenNegotiation(weak) {
  const n = state.negotiation;
  if (!n || n.used || n.active || state.finished) return false;
  const staggered = state.stagger >= 2;
  const chance = staggered ? 1 : weak ? 0.25 : 0;
  if (chance <= 0 || Math.random() > chance) return false;
  n.active = true;
  n.used = true;
  n.phase = 'loading';
  n.aiMode = 'preview';
  n.statusText = staggered ? '它倒下了。影子抬起头，第一次正眼看你。' : '它露出一瞬破绽，似乎有话要说。';
  state.busy = true;
  state.turnPhase = 'player';
  state.log = n.statusText;
  render();
  void loadNegotiation();
  return true;
}

function startNegotiationDemo() {
  startBattle('battle', { negotiationHint: true });
}

function negotiationAct(option) {
  const n = state.negotiation;
  if (!n?.active || n.phase !== 'offer' || state.busy) return;
  const meta = NEGOTIATION_OPTIONS[option];
  if (!meta) return;
  if (option === 'bribe' && state.sp < BRIBE_COST) {
    notify(`SP 不足 ${BRIBE_COST}`);
    return;
  }
  n.option = option;
  n.phase = 'rolling';
  state.busy = true;
  state.log = '它在衡量你的话……';
  render();
  setTimeout(() => {
    if (!state.negotiation || state.negotiation !== n) return;
    const result = state.battle?.holdUp({ type: 'negotiate', enemyId: state.targetId, option });
    if (!result?.ok) {
      state.busy = false;
      n.phase = 'offer';
      notify(result?.reason ?? '交涉无法继续。');
      render();
      return;
    }
    const view = syncBattleUi();
    n.chance = negotiationChance({
      personality: n.data?.personality,
      option,
      staggered: true,
      lowHp: (view?.selectedTarget?.hp ?? 1) / (view?.selectedTarget?.maxHp ?? 1) < 0.35,
      weaknessMatch: false,
      sp: state.sp,
    });
    state.busy = false;
    n.success = state.battle.phase === 'negotiation';
    if (n.success) {
      n.phase = 'success';
      state.log = '它接受了你的条件。';
      render();
      return;
    }
    n.phase = 'failed';
    state.log = '交涉破裂。它被激怒了。';
    render();
  }, 700);
}

function chooseNegotiationOutcome(type) {
  const n = state.negotiation;
  if (!n?.active || n.phase !== 'success') return;
  if (type === 'recruit') {
    const result = state.battle?.chooseResult('recruit');
    if (!result?.ok) {
      notify(result?.reason ?? '现在无法收服。');
      return;
    }
    const recruit = state.battle.result;
    ensurePersonaInRoster(recruit.personaId, '收服');
    persistP5State();
    state.recruitedMasks.push({ ...recruit, obtainedAt: Date.now() });
    n.result = { type: 'recruit', name: recruit.name, personaId: recruit.personaId, element: recruit.element, skillName: recruit.skillName, skillDesc: recruit.skillDesc };
    state.log = `${recruit.name} 加入了面具名录。`;
  } else {
    const result = state.battle?.chooseResult('reward');
    if (!result?.ok) {
      notify(result?.reason ?? '现在无法领取奖励。');
      return;
    }
    const reward = state.battle.result;
    applyBattleReward(state.battle, reward);
    state.battleLoot.push(reward.item);
    n.result = { type: 'reward', ...reward };
    state.log = `拿到了 ${reward.item}。`;
  }
  state.battleWon = true;
  state.battleReceipt = battleReceipt(state.battle);
  syncBattleUi();
  n.phase = 'result';
  render();
}

function closeNegotiation() {
  const n = state.negotiation;
  if (!n?.active) return;
  if (n.phase === 'success') return;
  if (n.phase === 'result') {
    returnFromBattle();
    return;
  }
  if (n.phase === 'failed') {
    n.active = false;
    n.phase = null;
    state.busy = false;
    syncBattleUi();
    render({ focus: true });
    return;
  }
  if (state.battle?.phase === 'holdUp') {
    const result = state.battle.holdUp({ type: 'continue' });
    if (!result.ok) {
      notify(result.reason);
      return;
    }
    syncBattleUi();
  }
  n.active = false;
  n.phase = null;
  state.busy = false;
  state.log = '你没有接话。它重新摆好架势。';
  render();
}

function visualStateRail(){
  const states={intent:['大招前摇','HEAVY WIND-UP','下一击将释放重击；把它打入失衡即可打断。'],status:['异常状态','STATUS EFFECTS','回合开始结算中毒、沉静或警戒。'],mask:['面具切换','MASK SHIFT','切换是自由行动；借来的面具拥有独立次数。'],phase:['二形态展开','PHASE 02','第一形态清零后，同一舞台直接进入下一形态。'],support:['同伴援助','SUPPORT','支援从战斗上层进入，不遮挡玩家状态条。'],moon:['月度心魔','MOON SHADOW','月相改变弱点与词缀，战场进入本月专属状态。'],abyss:['深渊规则','ABYSS RING','本周规则会改变一整场战斗的取舍。'],finale:['伪神终局','FINAL BOSS','三条血与终局演出在同一战场系统内收束。']};
  const current=states[visualStateKey]??states.intent;
  return `<section class="visual-state-rail" aria-label="战斗状态取景"><div class="visual-state-heading"><span>战场取景 / VISUAL COVERAGE</span><b>${current[0]}</b><em>${current[1]} · ${current[2]}</em></div><div class="visual-state-tabs">${Object.entries(states).map(([id,state])=>`<button type="button" class="${id===visualStateKey?'active':''}" data-visual-state="${id}">${state[0]}</button>`).join('')}</div></section><div class="visual-state-dock state-${visualStateKey}" aria-label="${current[0]} 示例">${visualStateKey==='intent'?`<span>${icon('eye')}<b>下一击：大招释放</b><small>前摇可被失衡打断 · 预计 96 点</small></span><strong>⚡</strong>`:visualStateKey==='status'?`<span class="state-chip poison">☠ 中毒 · 3 回合</span><span class="state-chip calm">◌ 沉静 · 1 回合</span><span class="state-chip guard">▣ 警戒 · 减伤</span>`:visualStateKey==='mask'?`<span>${icon('mask')} 奥丁·全知</span><i>${icon('arrow')}</i><b>${icon('mask')} 伊邪那岐·大神</b><small>借来的面具 · 本周 3 场</small>`:visualStateKey==='support'?`<span class="support-glyph">${icon('shield')}</span><b>同伴庇护</b><small>致命一击前保留 1 HP · 支援提示</small>`:visualStateKey==='moon'?`<span class="moon-mark">☾</span><b>月度心魔：回声的执念</b><small>月蚀词缀 · 弱点暂时隐藏</small>`:visualStateKey==='abyss'?`<span class="abyss-mark">RING 07</span><b>静默规则</b><small>防御不回 SP · 深渊守卫已锁定意图</small>`:visualStateKey==='finale'?`<span class="finale-mark">01 / 03</span><b>伪神终局 · 第一条血</b><small>终局演出接管战斗收尾</small>`:`<b>PHASE 02</b><span>面具之下，意志重生。</span><i><em></em></i>`}</div>`;
}
function combatSkill(skill) {
  const key = battleActionKey(skill);
  const selected = state.battleActionKey === key;
  return `<button class="combat-skill ${selected?'selected':''}" data-battle-action="${key}" aria-pressed="${selected}" ${state.busy||skill.disabled?'disabled':''}>${icon('chevrons')}<span>${esc(skill.label)}<small>${esc(skill.detail ?? '')}${skill.disabled?' · 当前不可用':''}</small></span><strong>${skill.cost??0}<small>SP</small></strong></button>`;
}

function appendPersonaSystems() {
  const info = $('.persona-info');
  if (!info) return;
  const built = buildBattlePersona(state.activePersonaId);
  if (built) {
    const resistanceLabels = { wk:'弱', rs:'耐', nu:'无', ab:'吸', rp:'反' };
    const stats = document.createElement('section');
    stats.className = 'persona-ledger-stats';
    stats.innerHTML = `<div class="stat-line">${[
      ['力', built.strength], ['魔', built.magic], ['耐', built.endurance], ['速', built.agility], ['运', built.luck],
    ].map(([label, value]) => `<span>${label}<b>${value}</b></span>`).join('')}</div><div class="affinity-line">${Object.entries(built.resistances).filter(([, code]) => code !== '-').map(([element, code]) => `<span class="${code}">${ELEMENTS[element]?.label ?? element} ${resistanceLabels[code] ?? code}</span>`).join('') || '<span>耐性未显现</span>'}</div>`;
    const skills = $('.persona-skills', info);
    info.insertBefore(stats, skills ?? null);
  }

  const roster = document.createElement('section');
  roster.className = 'persona-roster-panel';
  roster.innerHTML = `<div class="roster-heading"><div><span>MASK REGISTRY</span><h2>面具名录</h2></div><b>${state.personaRoster.length} 张</b></div><div class="persona-roster-grid">${state.personaRoster.map(id => {
    const persona = buildBattlePersona(id);
    if (!persona) return '';
    return `<button data-persona-id="${persona.id}" class="${persona.id === state.activePersonaId ? 'active' : ''}" aria-pressed="${persona.id === state.activePersonaId}"><div><span>${esc(ARCANA_LABELS[persona.arcana] ?? persona.arcana)}</span><b>${esc(persona.name)}</b><small>Lv.${persona.level} · ${esc(persona.elementLabel ?? persona.element)}</small></div><em>${persona.id === state.activePersonaId ? '契约中' : '交换'}</em></button>`;
  }).join('')}</div>`;
  content.append(roster);

  const party = document.createElement('section');
  party.className = 'party-lineup-panel';
  party.innerHTML = `<div class="roster-heading"><div><span>PARTY PERSONA</span><h2>同行面具</h2></div><button class="small-button" data-action="open-party-editor">编成</button></div><p>这三张面具从名录借出，与你一同进入影时间。</p><div class="party-lineup">${state.allyPersonaIds.map((id, index) => {
    const persona = allyPersona(id);
    return `<button data-party-slot="${index}"><b>${String(index + 1).padStart(2, '0')}</b><span>${esc(persona?.name ?? id)}<small>Lv.${persona?.level ?? '—'} · ${esc(persona?.elementLabel ?? persona?.element ?? '同行面具')}</small></span>${icon('chevrons')}</button>`;
  }).join('')}</div>`;
  content.append(party);
}

function appendHomePartyLine() {
  const prep = $('.mini-prep');
  if (!prep || $('.party-prep')) return;
  prep.insertAdjacentHTML('afterend', `<div class="party-prep">${icon('shield')}<span>同行面具 <b>${state.allyPersonaIds.map(id => esc(allyPersona(id)?.name ?? id)).join(' / ')}</b></span><button class="text-button" data-action="open-party-editor">编成</button></div>`);
}

function render({ focus = false } = {}) {
  const previousMaskScroll=$('.mask-tabs')?.scrollLeft ?? 0;
  document.body.dataset.fighting = String(state.fighting||Boolean(flows.active)||sliceFlow.active);
  $$('.room-nav a').forEach(a => {
    if (a.dataset.room === state.room) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current');
  });
  const overlay = sliceFlow.screen() ?? flows.screen();
  content.innerHTML = overlay ?? (state.fighting ? combat() : ({battle:home,tower,persona,arsenal}[state.room])());
  document.body.classList.toggle('p3-hold-up', Boolean(state.fighting && state.battle?.phase === 'holdUp' && !state.negotiation?.active));
  if (!state.fighting && !overlay && state.room === 'persona') appendPersonaSystems();
  if (!state.fighting && !overlay && state.room === 'battle') appendHomePartyLine();
  if(flows.rehearsal){
    const deck=$('.command-deck');if(deck){deck.inert=true;$$('button',deck).forEach(button=>button.disabled=true);}
  }
  const tabs=$('.mask-tabs');
  if(tabs){tabs.scrollLeft=previousMaskScroll;const active=$('[aria-pressed="true"]',tabs);if(active&&tabs.scrollWidth>tabs.clientWidth){tabs.scrollTo({left:active.offsetLeft-(tabs.clientWidth-active.offsetWidth)/2,behavior:reduced.matches?'instant':'smooth'});}}
  if (focus) content.focus({preventScroll:true});
}
let clickOrigin;
function roomFromHash() {
  const room = location.hash.slice(1);
  return ['battle','tower','persona','arsenal'].includes(room) ? room : 'battle';
}
function navigate(room) {
  if (state.fighting) return;
  if (room === state.room && location.hash) return;
  location.hash = room;
}
addEventListener('hashchange', () => {
  sliceFlow.dismiss();
  flows.towerHide();
  if(flows.active){flows.resetView();state.busy=false;}
  if (state.fighting) {
    history.replaceState(null,'',`#${state.room}`);
    leaveBattle();
    return;
  }
  scrolls.set(state.room,scrollY);
  state.room=roomFromHash();
  transition({battle:'SHADOW',tower:'ASCEND',persona:'PERSONA',arsenal:'ARSENAL'}[state.room],clickOrigin);
  render({focus:true});
  window.scrollTo(0,scrolls.get(state.room) ?? 0);
});
function startBattle(origin = state.room,options={}) {
  clearSignatureFx();
  actionRun++;clearTimeout(enemyTimer);
  state.negotiation = createNegotiation();
  state.enemyRage = 0;
  flows.battleStarted(options);
  state.origin = origin;
  state.fighting = true;
  state.finished = false;
  state.busy = false;
  state.turnPhase = 'player';
  state.command='skills';
  state.skill=0;
  state.weaknessKnown=false;
  state.battleEncounter=options.encounter??null;
  state.battleFloor=Number(options.floor)||4;
  state.battleReceipt=null;
  state.battleWon=false;
  const baseGearEffects=equipmentEffects(state.equipment,state.equipmentLevels);
  const doctorTrust=Math.max(0,Math.min(5,Number(state.npcTrust?.doctor)||0));
  const gearEffects={...baseGearEffects,heal:baseGearEffects.heal+doctorTrust*0.05};
  const passive=arsenalEffects(state);
  const ambush=Boolean(options.encounter?.ambush)&&!gearEffects.ambushGuard;
  const ambushLoss={easy:0.04,normal:0.08,hard:0.15}[state.difficulty]??0.08;
  const startingHp=ambush?Math.max(1,Math.round(state.hp*(1-ambushLoss))):state.hp;
  state.battle=createTowerBattle({
    encounter:options.encounter??{},
    floor:state.battleFloor,
    boss:Boolean(options.bossEncounter),
    heroPersonaIds:state.heroPersonaIds,
    activePersonaId:state.activePersonaId,
    allyPersonaIds:state.allyPersonaIds,
    heroHp:startingHp,
    heroSp:state.sp,
    partyVitals:state.partyVitals,
    equipmentBonuses:equipmentBonuses(state.equipment,state.equipmentLevels),
    equipmentEffects:gearEffects,
    arsenal:{
      effects:passive,
      myth:state.myth,
      oath:state.oath,
      skillRanks:Object.fromEntries(
        Object.entries(state.personaGrowth??{}).map(([id,progress])=>[id,progress.skillRanks??[]]),
      ),
    },
    difficulty:state.difficulty,
  });
  state.targetId=state.battle.enemies[0]?.id??'';
  state.battleActionKey='';
  if(fixture==='low-sp'){
    const hero=state.battle.party.find(member=>member.isPlayer);
    if(hero)hero.sp=Math.min(4,hero.maxSp);
  }
  if(options.negotiationHint){
    for(const enemy of state.battle.enemies){
      enemy.down=true;
      enemy.hp=Math.max(1,Math.round(enemy.maxHp*0.42));
    }
    state.battle.phase='holdUp';
  }
  syncAppState(state.battle,state,state.targetId);
  state.log=options.negotiationHint?'先打它的弱点。把它打失衡，它就会开口。':ambush?'影子先看见了你。':'轮到你了。先看意图，再决定这一回合。';
  transition('ENCOUNTER',clickOrigin);
  render({focus:true});
  window.scrollTo(0,0);
}
function returnFromBattle() {
  clearSignatureFx();
  sheet.close();
  actionRun++;clearTimeout(enemyTimer);
  const won=state.finished||state.battleWon||state.negotiation?.phase==='result';
  const receipt=state.battleReceipt??(state.battle?battleReceipt(state.battle):null);
  if(sliceFlow.active) sliceFlow.battleReturn(won);
  else flows.towerReturn(won,flows.bossPhase,receipt);
  flows.resetView?.();
  state.busy=false;
  state.turnPhase='player';
  state.fighting=false;
  state.finished=false;
  state.negotiation=null;
  state.enemyRage=0;
  state.battle=null;
  state.battleView=null;
  state.battleActionKey='';
  state.battleEncounter=null;
  state.battleReceipt=null;
  state.battleWon=false;
  state.room=state.origin;
  history.replaceState(null,'',`#${state.room}`);
  transition(state.room==='tower'?'ASCEND':'SHADOW',clickOrigin);
  render({focus:true});
  window.scrollTo(0,scrolls.get(state.room) ?? 0);
}
function leaveBattle() {
  if(flows.rehearsal){flows.act('rehearsal-close');return;}
  if(state.busy) { notify('行动尚未结束，请稍候再返回。'); return; }
  if(state.finished) { returnFromBattle(); return; }
  openSheet('返回前，确认一下', `<p>离开当前遭遇战，返回${state.origin==='tower'?'高塔路线':'战场'}？</p><p>离开后，本场进度不会保留。</p>${mainButton('留在战斗','close-sheet')}${mainButton('返回'+(state.origin==='tower'?'高塔路线':'战场'),'confirm-leave','','red')}`);
}
function syncBattleUi() {
  if (!state.battle) return null;
  const view = syncAppState(state.battle, state, state.targetId);
  state.battleView = view;
  return view;
}

function actionPlayback(action, lines, view) {
  const text = lines.join('\n');
  const damage = [...text.matchAll(/受到\s*(\d+)\s*伤害/g)]
    .reduce((total, match) => total + Number(match[1] || 0), 0);
  const healed = [...text.matchAll(/回复\s*(\d+)\s*HP/g)]
    .reduce((total, match) => total + Number(match[1] || 0), 0);
  const invalid = /无效|没有受伤|抵抗了即死/.test(text);
  let kind = 'slash';
  if (action.type === 'guard') kind = 'guard';
  else if (action.type === 'analyze') kind = 'insight';
  else if (action.type === 'batonPass') kind = 'one-more';
  else if (action.type === 'switchMask') kind = 'buff';
  else if (action.type === 'showtime') kind = 'critical';
  else if (/回复|复活/.test(text) && healed > 0) kind = 'heal';
  else if (/TECHNICAL/.test(text)) kind = 'critical';
  else if (/弱点/.test(text)) kind = 'star';
  else if (/暴击/.test(text)) kind = 'critical';
  else if (invalid) kind = 'insight';
  const target = view.selectedTarget;
  return {
    kind,
    amount: kind === 'heal' ? healed : invalid ? 0 : damage,
    meterTo: kind === 'heal'
      ? Math.min(view.hudMaxHp, view.hudHp + healed)
      : target?.hp,
    meterMax: kind === 'heal' ? view.hudMaxHp : target?.maxHp,
  };
}

function enemyPlaybacks(lines, view) {
  return lines.flatMap(line => {
    const match = line.match(/^(.+?) (?:以.+?攻击|使用「.+?」) (.+?)，(?:造成 (\d+) 伤害|没有造成伤害|.*?(无效|吸收|反弹|抗性))/);
    if (!match) return [];
    const amount = Number(match[3] || 0);
    const member = view.party.find(item => match[2].includes(item.name));
    return [{
      kind: amount > 0 ? 'player-hit' : 'guard',
      amount,
      target: member ? 'party' : 'player',
      targetName: member?.name ?? view.party.find(item => item.isPlayer)?.name ?? '你',
      targetSelector: member ? `[data-party-id="${member.id}"]` : null,
      meterTo: member?.hp ?? view.hudHp,
      meterMax: member?.maxHp ?? view.hudMaxHp,
      log: line,
    }];
  });
}

function beginEngineNegotiation() {
  if (!state.battle || state.battle.phase !== 'holdUp' || state.negotiation?.active) return;
  const n = createNegotiation();
  n.active = true;
  n.used = true;
  n.phase = 'loading';
  n.aiMode = 'preview';
  n.statusText = '它倒下了。影子抬起头，第一次正眼看你。';
  state.negotiation = n;
  state.busy = true;
  state.log = n.statusText;
  render();
  void loadNegotiation();
}

function openMaskPicker() {
  const view = currentEngineView();
  if (!view?.actorIsPlayer) return;
  const switches = view.actions.filter(action => action.type === 'switchMask');
  openSheet('换面具 · 消耗本回合', switches.length
    ? `<p>换面具会结束主角这次行动。选择一张仍在队列里的 Persona。</p>${switches.map(action => `<button class="skill-row" data-switch-mask="${action.id}" ${action.disabled?'disabled':''}>${icon('mask')}<span>${esc(action.label)}<small>${esc(action.detail)}</small></span><strong>换</strong></button>`).join('')}`
    : '<p>现在没有可替换的 Persona。</p>');
}

function performHoldUpAction(type, option) {
  if (!state.battle || state.battle.phase !== 'holdUp' || state.busy) return;
  const run = ++actionRun;
  const before = buildBattleView(state.battle, state.targetId);
  const payload = type === 'negotiate'
    ? { type, enemyId: state.targetId, option }
    : { type };
  const result = state.battle.holdUp(payload);
  if (!result.ok) {
    notify(result.reason);
    return;
  }
  const view = syncBattleUi();
  if (type === 'allOut') {
    if (state.negotiation) {
      state.negotiation.active = false;
      state.negotiation.phase = null;
    }
    state.busy = true;
    state.log = '总攻击！';
    render();
    const dealt = (before.enemies ?? []).map(enemy => {
      const after = view?.enemies?.find(item => item.id === enemy.id);
      return { name: enemy.name, damage: Math.max(0, (enemy.hp ?? 0) - (after?.hp ?? 0)) };
    }).filter(entry => entry.damage > 0);
    const totalDamage = dealt.reduce((sum, entry) => sum + entry.damage, 0);
    const finishLine = dealt.length
      ? `${dealt.map(entry => `${entry.name} ${entry.damage}`).join(' + ')} · 心魔已退散`
      : '影子退散 · 影时间重归安静';
    const allOut = playAllOut({ damage: totalDamage, finishLine });
    const finished = allOut ? allOut.finished : flows.impact('allout', {
      amount: totalDamage,
      meterTo: view?.selectedTarget?.hp,
    }).finished;
    finished.then(() => {
      if (run !== actionRun) return;
      state.busy = false;
      if (state.battle.phase === 'victory') {
        state.finished = true;
        state.battleReceipt = battleReceipt(state.battle);
        if (flows.battleFinished()) return;
        render();
      } else {
        render();
      }
    });
    return;
  }
  if (type === 'negotiate') {
    if (state.battle.phase === 'negotiation') {
      state.negotiation.phase = 'success';
      state.negotiation.success = true;
      state.negotiation.chance = negotiationChance({
        personality: state.negotiation.data?.personality,
        option,
        staggered: true,
        lowHp: (view.selectedTarget?.hp ?? 1) / (view.selectedTarget?.maxHp ?? 1) < 0.35,
        weaknessMatch: false,
        sp: state.sp,
      });
      state.busy = false;
      state.log = '它接受了你的条件。';
    } else {
      state.negotiation.phase = 'failed';
      state.negotiation.success = false;
      state.busy = false;
      state.log = '交涉破裂。它被激怒了。';
    }
    render();
    return;
  }
  state.negotiation.active = false;
  state.negotiation.phase = null;
  state.busy = false;
  render({ focus: true });
}

function execute(options = {}) {
  if (flows.rehearsal) return;
  if (state.busy || state.finished || !state.fighting || !state.battle) return;
  const view = currentEngineView();
  if (!view || view.phase !== 'party') {
    notify('当前不是可行动阶段。');
    return;
  }
  const action = selectedEngineAction(view);
  if (!action) {
    notify('先选择一个行动。');
    return;
  }
  if (action.disabled) {
    notify('当前无法使用这个行动。');
    return;
  }
  const payload = buildActionPayload(action, state.targetId);
  if (action.type === 'switchMask') {
    const nextMask = masks.findIndex(mask => mask.id === action.id);
    if (nextMask >= 0) selectPersona(action.id);
  }
  const logStart = state.battle.log.length;
  const result = state.battle.act(payload);
  if (!result.ok) {
    notify(result.reason);
    return;
  }
  if (action.type === 'showtime') {
    state.showtimeCutIn = true;
    render({ focus: false });
    setTimeout(() => {
      state.showtimeCutIn = false;
      render();
    }, 900);
  }
  if (action.type === 'switchMask') {
    const name = masks.find(mask => mask.id === action.id)?.name ?? action.id;
    state.battle.log.push(`${name}「${SUMMON_LINES[action.id] ?? '面具，回应。'}」`);
  }
  const lines = state.battle.log.slice(logStart);
  const run = ++actionRun;
  const playback = actionPlayback(action, lines, syncBattleUi());
  state.busy = true;
  state.log = lines.at(-1) ?? `${action.label} · 行动完成。`;
  render();
  const onDone = () => {
    if (run !== actionRun) return;
    const next = syncBattleUi();
    const enemyHits = enemyPlaybacks(lines, next);
    if (enemyHits.length && next.phase === 'party') {
      state.log = enemyHits.at(-1).log;
      render();
      const sequence = enemyHits.reduce(
        (promise, hit) => promise.then(() => flows.impact(hit.kind, hit).finished),
        Promise.resolve(),
      );
      sequence.then(() => {
        if (run !== actionRun) return;
        state.busy = false;
        syncBattleUi();
        if (next.phase === 'defeat') {
          state.fighting = false;
          flows.open('defeat');
          return;
        }
        render({ focus: true });
      });
      return;
    }
    state.busy = false;
    syncBattleUi();
    if (next.phase === 'victory') {
      state.finished = true;
      state.battleReceipt = battleReceipt(state.battle);
      if (flows.battleFinished()) return;
      transition('FINISH');
      render();
      $('[data-action="return-after-battle"]')?.focus({ preventScroll: true });
      return;
    }
    if (next.phase === 'holdUp') {
      render({ focus: true });
      document.querySelector('[data-holdup-engine="allOut"]')?.focus({ preventScroll: true });
      return;
    }
    if (next.phase === 'defeat') {
      state.fighting = false;
      flows.open('defeat');
      return;
    }
    render({ focus: true });
    $('[data-action="execute"]')?.focus({ preventScroll: true });
  };
  flows.impact(playback.kind, playback).finished.then(() => {
    if (run !== actionRun) return;
    const oneMore = state.battle?.phase === 'party' && lines.some(line => /1 MORE/.test(line));
    if (oneMore) {
      const view = state.battleView ?? currentEngineView();
      const baton = view?.actions?.find(item => item.type === 'batonPass');
      const batonName = baton?.label?.replace(/^接力\s*→\s*/, '') ?? '';
      const stagger = playStagger({
        targetName: view?.selectedTarget?.name ?? '',
        batonName,
      });
      const finished = stagger ? stagger.finished : flows.impact('one-more', {
        amount: 0,
        meterTo: state.enemyHp,
        meterMax: state.enemyMaxHp,
      }).finished;
      finished.then(onDone);
    } else {
      onDone();
    }
  });
}
function goRoom(room){clearSignatureFx();actionRun++;clearTimeout(enemyTimer);flows.resetView();state.fighting=false;state.finished=false;state.busy=false;state.turnPhase='player';state.negotiation=null;state.enemyRage=0;state.battle=null;state.battleView=null;state.battleActionKey='';state.battleReceipt=null;state.battleWon=false;state.room=room;history.replaceState(null,'',`#${room}`);render({focus:true});scrollTo(0,0);}
loadP5State();
const flows=createEncounterDirector({
  state,icon,render,reduced,transition,notify,mainButton,startBattle,execute,goRoom,returnFromBattle,persistP5State,
  openAwakening:()=>preparation.act('create'),
  addPersonaToRoster: ensurePersonaInRoster,
  removePersonaFromRoster,
  onBossMorph(phase){
    if(!state.battle)return;
    promoteBossPhase(state.battle,{phase});
    state.finished=false;
    state.battleReceipt=null;
    syncBattleUi();
  },
});
const preparation=createPreparationDirector({state,masks,icon,openSheet,render,notify,arsenalItems,reduced,goRoom,persistP5State});
const sliceFlow=createSliceFlow({state,icon,render,notify,persistP5State,goRoom,startBattle});
if(new URLSearchParams(location.search).get('p5r-debug')==='1'){
  window.__p5rDebug={
    jump:(floor,selected)=>flows.towerDebugJump(floor,selected),
    openChest:(kind)=>flows.towerDebugOpenChest?.(kind),
    guardian:()=>flows.towerDebugGuardian?.(),
    exit:()=>flows.towerDebugExit?.(),
    fightShadow:()=>flows.towerDebugFightShadow?.(),
    shadowTalk:()=>flows.towerDebugShadowTalk?.(),
    winBattle:()=>{
      if(!state.battle)return false;
      state.battleWon=true;
      state.finished=true;
      returnFromBattle();
      return true;
    },
    setRound:(round)=>{
      if(!state.battle)return false;
      state.battle.round=Math.max(1,Number(round)||1);
      state.battle.prepareIntents?.();
      syncBattleUi();
      render({focus:true});
      return true;
    },
  };
}
function buttonFeedback(control){
  if(reduced.matches)return;
  const r=control.getBoundingClientRect();
  const flare=document.createElement('span');
  flare.className=control.matches('.route-node')?'button-flare node-flare':'button-flare';
  flare.setAttribute('aria-hidden','true');
  Object.assign(flare.style,{left:`${r.left}px`,top:`${r.top}px`,width:`${r.width}px`,height:`${r.height}px`});
  document.body.append(flare);
  flare.animate([{opacity:.8,scale:.94,translate:'0 0'},{opacity:.5,scale:1.02,translate:'3px -2px',offset:.28},{opacity:0,scale:1.1,translate:'8px -5px'}],{duration:340,easing:'cubic-bezier(.16,1,.3,1)'}).finished.catch(()=>{}).finally(()=>flare.remove());
}
document.addEventListener('pointerdown',event=>{
  const control=event.target.closest('button,a');
  if(!control||control.disabled||reduced.matches)return;
  control.animate([{scale:'1'},{scale:'.955',offset:.35},{scale:'1'}],{duration:220,easing:'cubic-bezier(.16,1,.3,1)'});
});
document.addEventListener('click',event=>{
  const control=event.target.closest('button,a');
  if(!control||control.disabled)return;
  if(flows.rehearsal&&!control.dataset.flow&&control.dataset.action!=='leave-battle'){event.preventDefault();return;}
  buttonFeedback(control);
  const box=control.getBoundingClientRect();
  clickOrigin={x:box.left+box.width/2,y:box.top+box.height/2};
  if(control.dataset.negotiationOption){negotiationAct(control.dataset.negotiationOption);return;}
  if(control.dataset.holdupEngine){performHoldUpAction(control.dataset.holdupEngine);return;}
  if(control.dataset.personaId){selectPersona(control.dataset.personaId);if(sheet.open)sheet.close();render({focus:true});return;}
  if(control.dataset.partySlot!==undefined){openPartyEditor(Number(control.dataset.partySlot));return;}
  if(control.dataset.allyId){const slot=Number(control.dataset.slot)||0;state.allyPersonaIds[slot]=control.dataset.allyId;persistP5State();openPartyEditor(slot);render();return;}
  if(control.dataset.targetId){state.targetId=control.dataset.targetId;syncBattleUi();render();return;}
  if(control.dataset.battleItem){useBattleItemAction(control.dataset.battleItem);return;}
  if(control.dataset.battleAction?.startsWith('items:')){openBattleItems();return;}
  if(control.dataset.battleAction){if(state.busy)return;state.battleActionKey=control.dataset.battleAction;render();$(`[data-battle-action="${state.battleActionKey}"]`)?.focus({preventScroll:true});return;}
  if(control.dataset.switchMask){state.battleActionKey=`switchMask:${control.dataset.switchMask}`;sheet.close();execute();return;}
  if(control.dataset.flow){flows.act(control.dataset.flow);return;}
  if(control.dataset.slice){sliceFlow.act(control.dataset.slice);return;}
  if(control.dataset.tower){flows.towerAct(control.dataset.tower);return;}
  if(control.dataset.prep){preparation.act(control.dataset.prep);return;}
  if(control.dataset.visualState){location.href=`?view=combat&visual=states&state=${encodeURIComponent(control.dataset.visualState)}`;return;}
  if(control.matches('.room-nav a')&&state.fighting){event.preventDefault();return;}
  if(control.dataset.node){state.selectedNode=control.dataset.node;render();$(`[data-node="${state.selectedNode}"]`)?.focus({preventScroll:true});return;}
  if(control.dataset.mask!==undefined){const nextMask=Number(control.dataset.mask);state.mask=nextMask;state.activePersonaId=masks[nextMask]?.id??state.activePersonaId;state.skill=0;if(sheet.open)sheet.close();render();if(!state.fighting)$(`[data-mask="${state.mask}"]`)?.focus({preventScroll:true});return;}
  if(control.dataset.arsenalTab){state.arsenalTab=control.dataset.arsenalTab;render();$(`[data-arsenal-tab="${state.arsenalTab}"]`)?.focus({preventScroll:true});return;}
  if(control.dataset.arsenal){
    const [kind,arg]=control.dataset.arsenal.split(':');
    if(kind==='equip'){const result=equipItem(state.equipment,state.ownedEquipment,arg);if(result.ok){state.equipment=result.equipment;notify(`${result.item.name} 已装备`);}else notify(result.reason);}
    else if(kind==='unequip'){const result=unequipItem(state.equipment,arg);if(result.ok){state.equipment=result.equipment;notify('装备已卸下');}else notify(result.reason);}
    else if(kind==='upgrade'){const result=upgradeEquipment(state,arg);notify(result.ok?`${result.label} 强化到 +${result.level}`:result.reason);}
    else if(kind==='use'){const result=useInventoryItem(state,arg);notify(result.ok?`${result.label} 已使用`:result.reason);}
    else if(kind==='sell'){const result=sellInventoryItem(state,arg,1);notify(result.ok?`卖出 ${result.label}，+¥${result.gain}`:result.reason);}
    else if(kind==='relic'){
      if(state.equipped.has(arg))state.equipped.delete(arg);
      else if(state.equipped.size<2)state.equipped.add(arg);
      else{notify('遗物位已满，先卸下一件。');render();return;}
      notify(state.equipped.has(arg)?'遗物已携带':'遗物已卸下');
    }
    else if(kind==='chain'){const index=Number(arg);state.chain=state.chain===index?null:index;notify(state.chain===null?'共鸣链已解除':'共鸣链已连接');}
    else if(kind==='open'){preparation.item(arg);return;}
    persistP5State();render({focus:true});return;
  }
  if(control.dataset.skill!==undefined){if(state.busy)return;state.skill=Number(control.dataset.skill);render();$(`[data-skill="${state.skill}"]`)?.focus({preventScroll:true});return;}
  if(control.dataset.command){if(state.busy)return;state.command=control.dataset.command;render();$(`[data-command="${state.command}"]`)?.focus({preventScroll:true});return;}
  if(control.dataset.item){
    preparation.item(control.dataset.item);
    return;
  }
  const action=control.dataset.action;
  if(!action)return;
  if(action.startsWith('equip-')){const id=action.slice(6);state.equipped.has(id)?state.equipped.delete(id):state.equipped.add(id);sheet.close();render();notify('装备已更新');return;}
  if(action==='open-tower'){if(!preparation.settings.enabled){preparation.act('settings');return;}if(!flows.towerActive){flows.open('tower-flow');return;}navigate('tower');}
  else if(action==='open-persona')navigate('persona');
  else if(action==='open-party-editor')openPartyEditor();
  else if(action==='awaken-persona')preparation.act('create');
  else if(action==='start-negotiation')startNegotiationDemo();
  else if(action==='hold-up-negotiate')beginEngineNegotiation();
  else if(action==='open-battle-items')openBattleItems();
  else if(action==='negotiation-fight')closeNegotiation();
  else if(action==='negotiation-recruit')chooseNegotiationOutcome('recruit');
  else if(action==='negotiation-reward')chooseNegotiationOutcome('reward');
  else if(action==='start-battle')startBattle('battle');
  else if(action==='enter-node'){
    if(state.selectedNode==='mob'){scrolls.set('tower',scrollY);startBattle('tower');}
    else flows.open(state.selectedNode==='echo'?'echo':'chest');
  }
  else if(action==='leave-battle')leaveBattle();
  else if(action==='confirm-leave'||action==='return-after-battle')returnFromBattle();
  else if(action==='close-sheet')sheet.close();
  else if(action==='prev-mask'||action==='next-mask'||action==='choose-mask')openMaskPicker();
  else if(action==='execute')execute();
  else if(action==='settings'){
    if(state.fighting||state.busy){notify('先返回战场，再调整设置。');return;}
    preparation.act('settings');
  }
});
sheet.addEventListener('click',event=>{if(event.target!==sheet)return;const r=sheet.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)sheet.close();});
sheet.addEventListener('close',()=>{
  $('.settings-button').setAttribute('aria-expanded','false');
  const fallback=state.fighting?$('[data-action="choose-mask"]'):$(`.room-nav a[data-room="${state.room}"]`);
  if(!document.activeElement||document.activeElement===document.body)fallback?.focus({preventScroll:true});
});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!sheet.open){if(sliceFlow.active&&!state.fighting){event.preventDefault();sliceFlow.close();return;}if(flows.transforming||flows.active||flows.rehearsal){event.preventDefault();flows.close();return;}if(state.fighting){event.preventDefault();leaveBattle();}}});
document.addEventListener('visibilitychange',()=>document.body.classList.toggle('is-hidden',document.hidden));
state.room=roomFromHash();
const towerPreview=new URLSearchParams(location.search).get('tower');
if(towerPreview)state.room='tower';
render();
if(towerPreview){flows.towerPreview?.(towerPreview);render();}
if(fixture==='low-sp')startBattle('tower');
else if(new URLSearchParams(location.search).get('view')==='combat'&&(!location.hash||state.room==='battle'))startBattle('battle');
const initialScene=new URLSearchParams(location.search).get('scene');
if(initialScene)flows.open(initialScene);
