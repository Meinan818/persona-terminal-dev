import {createEncounterDirector,escapeHtml as esc} from './encounters.js';
import {createPreparationDirector} from './preparation.js';
import {visualArt} from './art.js';
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
  mask: 0, arsenalTab: 'relic', equipped: new Set(['moon']), command: 'skills', skill: 0,
  hp: 345, sp: fixture === 'low-sp' ? 4 : 217, enemyHp: 312,
  turn: 4, stagger: 0, busy: false, finished: false, turnPhase: 'player', log: '轮到你了。先看意图，再决定这一回合。',
};
const scrolls = new Map();
const masks = [
  { attr:'知识', name:'观测者', passive:'冷静地看穿表象', skills:[['星落',18,'知识伤害 · 命中敌人弱点'],['回响',8,'追加伤害 · 把握失衡时机']] },
  { attr:'勇气', name:'反抗者', passive:'迎着恐惧向前', skills:[['疾风刺',12,'勇气伤害 · 单体攻击'],['不屈',10,'防护 · 迎接下一击']] },
  { attr:'灵巧', name:'织线者', passive:'在缝隙中寻找机会', skills:[['飞刃',12,'灵巧伤害 · 单体攻击'],['蓄力',8,'准备下一次进攻']] },
  { attr:'体贴', name:'守灯人', passive:'为自己留一盏灯', skills:[['微光',10,'回复生命'],['安宁',8,'防护 · 稳住脚步']] },
  { attr:'魅力', name:'回声', passive:'让声音抵达彼岸', skills:[['回音斩',12,'魅力伤害 · 单体攻击'],['鼓舞',8,'强化下一次进攻']] },
  { attr:'借来的', name:'同行者', passive:'来自同伴 · 本周剩余 2 场', skills:[['共鸣',14,'万能属性 · 借来的力量'],['守望',10,'防护 · 同伴的支持']] },
];
const attributeMarks = [['eye','KNOWLEDGE'],['sword','COURAGE'],['shield','DEXTERITY'],['star','KINDNESS'],['mask','CHARM'],['mask','BORROWED']];
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
  if (fixture === 'no-persona'&&!state.personaCreated) return `${heading('逆影战场','SHADOW BATTLE')}<div class="home-grid"><div class="hero-stage"><div aria-hidden="true">${figure()}</div></div><section class="mission"><h2>先遇见你的 Persona</h2><p>选择你的面具，再踏入影时间。</p>${mainButton('开始觉醒','awaken-persona')}<p class="info-note">尚未建立 Persona 的入口状态预览。</p></section></div>`;
  return `${heading('逆影战场','SHADOW BATTLE','把白昼积攒的力量，带到这一刻。')}
    <div class="home-grid"><div class="hero-stage" aria-hidden="true">${figure()}<span class="slash-label">与另一个自己，同路。</span></div>
      <section class="mission"><span class="slash-label">${preparation.settings.enabled?'影时间进行中':'战场暂未启用'}</span><h2>${journey.ended?'带着回声，回来了。':'继续向上。'}</h2><p>${journey.ended?`这一次，你抵达了第 ${journey.floor} 层。`:`你停在第 ${journey.floor} 层。下一步，仍由你选择。`}</p>
        <div class="mission-line"><span>当前区层</span><b>第 03 区层</b></div>
        <div class="mission-line"><span>登塔进度</span><b>${journey.floor} / 10 F</b></div>
        ${mainButton(journey.ended?'查看本次行程':'继续登塔','open-tower',journey.ended?'回望走过的路':'回到当前层，查看下一条路线')}
        <button class="text-button" data-action="start-battle">查看当前遭遇战</button>
        <div class="mini-prep">${icon('mask')}<span>出战面具 <b>${esc(masks[state.mask].name)}</b></span><button class="text-button" data-action="open-persona">调整</button></div>
        <div class="status-ribbon"><span>HP <b>${state.hp}</b> / 390</span><span>SP <b>${state.sp}</b> / 260</span><span>遗物 <b>${state.equipped.size}</b> 件</span></div>
      </section></div>`;
}
function figure() { return visualArt('hero','<div class="figure"><i class="head"></i><i class="coat"></i><i class="eye"></i><i class="cut"></i></div>'); }
function tower() {
  return flows.towerRoute();
}
function persona() {
  const m = masks[state.mask];
  return `${heading('Persona','THE OTHER SELF','把力量准备好，再回到你的路。')}
    <div class="mask-tabs" aria-label="选择面具">${masks.map((m,i) => `<button data-mask="${i}" aria-pressed="${i === state.mask}">${icon(attributeMarks[i][0])}<span>${m.attr}<small>${attributeMarks[i][1]}</small></span><b aria-hidden="true">${icon('chevrons')}</b></button>`).join('')}</div>
    <div class="duo-layout"><div class="mask-display"><div class="mask-art" aria-hidden="true"></div><p>${m.attr} · ${esc(m.passive)}</p></div><section class="persona-info"><h2>${esc(m.name)}</h2><p>当前出战面具的技能与状态。</p>
    <div class="persona-spec">${icon(attributeMarks[state.mask][0])}<span>出战面具</span><strong>${m.attr}</strong><b>${attributeMarks[state.mask][1]}</b></div><div class="persona-skills">${m.skills.map((s,i) => `<article class="persona-skill" style="--order:${i}"><div class="persona-skill-mark">${icon(i===0?attributeMarks[state.mask][0]:'star')}</div><div class="persona-skill-copy"><h3>${s[0]}</h3><p>${s[2]}</p></div><strong class="persona-skill-cost">${s[1]}<small>SP</small></strong></article>`).join('')}</div>
    ${mainButton('带着它，继续登塔','open-tower')}${preparation.personaTools()}<p class="info-note">预览中的面具选择会保留到遭遇战。</p></section></div>`;
}
const arsenalItems = {
  relic:[['moon','月光碎片','半月遗物 · 已有装备可在这里调整。'],['thread','回响之线','残月遗物 · 查看说明后选择携带。']],
  myth:[['myth','迷思石','选择技能，查看镶嵌与卸下的位置。']],
  oath:[['oath','未命名的誓约','为面具选择誓约技能。']],
  chain:[['chain','共鸣链','查看两张面具之间的连接。']],
};
function arsenal() {
  const tabs = [['relic','遗物'],['myth','迷思'],['oath','誓约'],['chain','共鸣链']];
  return `${heading('武库','ARSENAL','在这里准备好，把注意力留给战斗。')}
    <div class="subnav arsenal-tabs" aria-label="武库分类">${tabs.map(([id,label],i) => `<button data-arsenal-tab="${id}" aria-pressed="${id === state.arsenalTab}">${icon(['star','eye','shield','mask'][i])}<span>${label}<small>${['RELIC','MYTH','OATH','RESONANCE'][i]}</small></span></button>`).join('')}</div>
    ${fixture === 'empty'||arsenalItems[state.arsenalTab].length===0 ? `<section class="empty-state">${icon('box')}<h2>这里还很安静。</h2><p>登塔获得的${tabs.find(t=>t[0]===state.arsenalTab)[1]}会收在这里。</p>${mainButton('回到高塔','open-tower')}</section>` : `<div class="arsenal-list">${arsenalItems[state.arsenalTab].map(([id,name,note])=>`<article class="equipment-row"><div class="equipment-glyph">${icon(state.arsenalTab==='relic'?'star':'box')}</div><div><h3>${name}</h3><p>${note}${preparation.itemStatus(id)?` · ${preparation.itemStatus(id)}`:''}</p></div><button class="small-button" data-item="${id}">${state.arsenalTab==='relic'?(state.equipped.has(id)?'已携带':'查看'):'查看'}</button></article>`).join('')}</div><p class="info-note">遗物、迷思、誓约和共鸣链保留各自的操作位置。</p>`}`;
}
function skillRow(skill, index, selectable = false) {
  const selected = selectable && state.skill === index;
  const tag = selectable ? 'button' : 'div';
  const disabled = selectable && (state.sp < skill[1] || state.busy);
  return `<${tag} class="skill-row ${selected ? 'selected' : ''}" ${selectable ? `data-skill="${index}" aria-pressed="${selected}" ${disabled ? 'disabled' : ''}` : ''}>${icon('star')}<span>${skill[0]}<small>${skill[2]}${disabled && state.sp < skill[1] ? ' · SP 不足' : ''}</small></span><strong>${skill[1]} SP</strong></${tag}>`;
}
const commands = [['skills','技能','star'],['basic','普攻','sword'],['defend','防御','shield'],['insight','洞察','eye']];
function meter(value, maximum) { return `<div class="meter"><i style="--value:${Math.max(0, Math.min(100,value/maximum*100))}%"></i></div>`; }
function commandCost() { return state.command === 'skills' ? masks[state.mask].skills[state.skill][1] : state.command === 'insight' ? 2 : state.command === 'allout' ? 20 : 0; }
function commandName() { return state.command === 'skills' ? masks[state.mask].skills[state.skill][0] : state.command === 'allout' ? '总攻击' : commands.find(c => c[0] === state.command)[1]; }
function combat() {
  if (state.finished) return flows.victory();
  const m = masks[state.mask];
  const descriptions = { basic:'普通攻击 · 0 SP。选择后再执行，避免误触。', defend:'防御 · 稳住这一回合，迎接敌人的下一击。', insight:'洞察 · 2 SP。查看敌人的意图与弱点情报。', allout:'总攻击 · 20 SP。抓住失衡窗口，展开攻势。' };
  const enemyTurn = state.turnPhase === 'enemy';
  return `<div class="combat-top"><button class="back-button" data-action="leave-battle">${icon('back')}<span>返回${state.origin==='tower'?'路线':'战场'}<small>RETURN</small></span></button><p>TURN ${String(state.turn).padStart(2,'0')} / ${state.busy?(enemyTurn?'敌方回合':'行动演出中'):'你的回合'}</p></div>${flows.rehearsalRail?.()??''}${visualStateMode?visualStateRail():''}
    <div class="combat-poster">
      <div class="combat-word" aria-hidden="true">BATTLE</div>
      <div class="combat-hero" aria-hidden="true">${figure()}</div>
      <div class="combat-orbit" aria-hidden="true"><i></i><b></b></div>
      <div class="glass-shards" aria-hidden="true">${Array.from({length:9},(_,i)=>`<i style="--i:${i}"></i>`).join('')}</div>
      <section class="enemy-scene ${flows.bossPhase?'boss-in-combat':''} ${enemyTurn?'enemy-turn':''}" data-phase="${flows.bossPhase||1}" aria-label="敌人状态"><div class="enemy-name"><h1>${flows.bossPhase?'回声的执念':'聒噪的假面'}</h1><span>${flows.bossPhase?`PHASE 0${flows.bossPhase}`:'LV 05'}</span></div>
      <div class="enemy-vitals"><span>敌人 HP</span><span><strong>${state.enemyHp}</strong> / 420</span></div>${meter(state.enemyHp,420)}
      <div class="weakness-line"><b>弱点 · 知识</b><span>${state.stagger >= 2?'失衡 · 总攻击窗口':`失衡 ${state.stagger} / 2`}</span></div>
      <div class="enemy-art" aria-hidden="true"><div class="boss-crown">${[-85,-50,-20,20,50,85,140,220].map(angle=>`<i style="--spike:${angle}deg"></i>`).join('')}</div>${visualArt('enemy','<div class="enemy-orbit"></div><div class="enemy-face"><i></i><i></i><b></b></div>')}</div>
      <div class="enemy-intent">${icon('eye')}<span><b>${enemyTurn?'敌方出手：蓄势攻击':'下一击：蓄势攻击'}</b><small>${enemyTurn?'准备承受这一击，或用防御化解。':'先看意图，再决定进攻还是防御。'}</small></span></div>
    </section><section class="command-deck" aria-label="战斗指令" aria-busy="${state.busy}">
      <div class="player-hud"><div class="player-tag"><b>ME</b><span>LV <strong>12</strong></span></div><div><span>HP <strong>${state.hp}</strong><em>/ 390</em></span>${meter(state.hp,390)}</div><div class="sp"><span>SP <strong>${state.sp}</strong><em>/ 260</em></span>${meter(state.sp,260)}</div></div>
      <div class="mask-switcher"><button class="icon-button" data-action="prev-mask" aria-label="上一张面具" ${state.busy?'disabled':''}>${icon('chevrons')}</button><button data-action="choose-mask" ${state.busy?'disabled':''}><span class="mask-emblem">${icon('mask')}</span><span class="mask-switch-name">${esc(m.name)}<small>${m.attr} · PERSONA</small></span><b aria-hidden="true">${icon('chevrons')}</b></button><button class="icon-button" data-action="next-mask" aria-label="下一张面具" ${state.busy?'disabled':''}>${icon('chevrons')}</button></div>
      <div class="command-label"><span>${state.command==='skills'?'SKILL · 技能':'ACTION · 行动'}</span><strong>COST</strong></div>
      <div class="command-grid">${commands.map(([id,label,i],order)=>`<button data-command="${id}" aria-pressed="${id===state.command}" style="--tilt:${[-4,-1,2,4][order]}deg" ${state.busy?'disabled':''}>${icon(i)}<span>${label}<small>${['SKILL','ATTACK','GUARD','INSIGHT'][order]}</small></span></button>`).join('')}</div>
      <div class="command-detail">${state.command==='skills'?`<div class="skill-list">${m.skills.map((s,i)=>combatSkill(s,i)).join('')}</div><p>${m.skills[state.skill][2]}</p>`:`<div class="action-banner">${icon(commands.find(c=>c[0]===state.command)?.[2]??'star')}<strong>${commandName()}</strong><b>${commandCost()}<small>SP</small></b></div><p>${descriptions[state.command]}</p>`}</div>
      ${state.stagger>=2?`<button class="small-button allout-pick" data-command="allout" ${state.busy?'disabled':''}>${icon('star')}总攻击 · 20 SP</button>`:''}
      <button class="main-button execute ${state.command==='allout'?'red':''}" data-action="execute" ${state.busy||state.sp<commandCost()?'disabled':''}><span>${state.busy?'行动演出中…':state.sp<commandCost()?'SP 不足':`执行 · ${commandName()}`}</span>${icon('arrow')}</button>
      <p class="busy-text">${state.busy?(enemyTurn?'敌方出手，准备承受这一击。':'等待行动结束，避免重复出手。'):`${commandCost()} SP · 选好行动后执行`}</p>
    </section><p class="battle-log" role="status" aria-live="polite">${state.log}</p></div>`;
}
function visualStateRail(){
  const states={intent:['大招前摇','HEAVY WIND-UP','下一击将释放重击；把它打入失衡即可打断。'],status:['异常状态','STATUS EFFECTS','回合开始结算中毒、沉静或警戒。'],mask:['面具切换','MASK SHIFT','切换是自由行动；借来的面具拥有独立次数。'],phase:['二形态展开','PHASE 02','第一形态清零后，同一舞台直接进入下一形态。'],support:['同伴援助','SUPPORT','支援从战斗上层进入，不遮挡玩家状态条。'],moon:['月度心魔','MOON SHADOW','月相改变弱点与词缀，战场进入本月专属状态。'],abyss:['深渊规则','ABYSS RING','本周规则会改变一整场战斗的取舍。'],finale:['伪神终局','FINAL BOSS','三条血与终局演出在同一战场系统内收束。']};
  const current=states[visualStateKey]??states.intent;
  return `<section class="visual-state-rail" aria-label="战斗状态取景"><div class="visual-state-heading"><span>战场取景 / VISUAL COVERAGE</span><b>${current[0]}</b><em>${current[1]} · ${current[2]}</em></div><div class="visual-state-tabs">${Object.entries(states).map(([id,state])=>`<button type="button" class="${id===visualStateKey?'active':''}" data-visual-state="${id}">${state[0]}</button>`).join('')}</div></section><div class="visual-state-dock state-${visualStateKey}" aria-label="${current[0]} 示例">${visualStateKey==='intent'?`<span>${icon('eye')}<b>下一击：大招释放</b><small>前摇可被失衡打断 · 预计 96 点</small></span><strong>⚡</strong>`:visualStateKey==='status'?`<span class="state-chip poison">☠ 中毒 · 3 回合</span><span class="state-chip calm">◌ 沉静 · 1 回合</span><span class="state-chip guard">▣ 警戒 · 减伤</span>`:visualStateKey==='mask'?`<span>${icon('mask')} 观测者</span><i>${icon('arrow')}</i><b>${icon('mask')} 同行者</b><small>借来的面具 · 本周 3 场</small>`:visualStateKey==='support'?`<span class="support-glyph">${icon('shield')}</span><b>同伴庇护</b><small>致命一击前保留 1 HP · 支援提示</small>`:visualStateKey==='moon'?`<span class="moon-mark">☾</span><b>月度心魔：回声的执念</b><small>月蚀词缀 · 弱点暂时隐藏</small>`:visualStateKey==='abyss'?`<span class="abyss-mark">RING 07</span><b>静默规则</b><small>防御不回 SP · 深渊守卫已锁定意图</small>`:visualStateKey==='finale'?`<span class="finale-mark">01 / 03</span><b>伪神终局 · 第一条血</b><small>终局演出接管战斗收尾</small>`:`<b>PHASE 02</b><span>面具之下，意志重生。</span><i><em></em></i>`}</div>`;
}
function combatSkill(skill,index){
  const latin=[['STARFALL','ECHO'],['GALE THRUST','UNYIELDING'],['FLYING BLADE','CHARGE'],['LIGHT','SERENITY'],['ECHO SLASH','ENCOURAGE'],['RESONANCE','GUARD']];
  return `<button class="combat-skill ${state.skill===index?'selected':''}" data-skill="${index}" aria-pressed="${state.skill===index}" ${state.busy||state.sp<skill[1]?'disabled':''}>${icon('chevrons')}<span>${skill[0]}<small>${skill[0]==='铁壁之誓'?'AEGIS OATH':latin[state.mask][index]}${state.sp<skill[1]?' · SP 不足':''}</small></span><strong>${skill[1]}<small>SP</small></strong></button>`;
}
function render({ focus = false } = {}) {
  const previousMaskScroll=$('.mask-tabs')?.scrollLeft ?? 0;
  document.body.dataset.fighting = String(state.fighting||Boolean(flows.active));
  $$('.room-nav a').forEach(a => {
    if (a.dataset.room === state.room) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current');
  });
  content.innerHTML = flows.screen() ?? (state.fighting ? combat() : ({battle:home,tower,persona,arsenal}[state.room])());
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
  actionRun++;clearTimeout(enemyTimer);
  flows.battleStarted(options);
  state.origin = origin;
  state.fighting = true;
  state.finished = false;
  state.busy = false;
  state.turnPhase = 'player';
  state.command='skills';
  state.skill=0;
  state.enemyHp=options.resume?.enemyHp??312;
  state.stagger=options.resume?.stagger??0;
  state.turn=options.resume?.turn??4;
  state.log='轮到你了。先看意图，再决定这一回合。';
  if(!options.journey){state.sp=fixture==='low-sp'?4:217;state.hp=345;}
  transition('ENCOUNTER',clickOrigin);
  render({focus:true});
  window.scrollTo(0,0);
}
function returnFromBattle() {
  sheet.close();
  actionRun++;clearTimeout(enemyTimer);
  flows.towerReturn(state.finished);
  flows.resetView?.();
  state.busy=false;
  state.turnPhase='player';
  state.fighting=false;
  state.finished=false;
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
  openSheet('返回前，确认一下', `<p>离开当前遭遇战，返回${state.origin==='tower'?'高塔路线':'战场'}？</p><p>本页是操作预览，不会更改正式存档。</p>${mainButton('留在战斗','close-sheet')}${mainButton('返回'+(state.origin==='tower'?'高塔路线':'战场'),'confirm-leave','','red')}`);
}
function execute(options={}) {
  if(flows.rehearsal)return;
  if (state.busy || state.finished || !state.fighting || state.sp < commandCost()) return;
  if(state.command==='allout'&&!options.qteResolved){flows.open('qte');return;}
  const command=state.command;
  const name=commandName();
  const weak=command==='skills'&&state.mask===0;
  const skillAttacks=command==='skills'&&(state.mask===0||state.mask===4||(state.skill===0&&state.mask!==3));
  const healing=command==='skills'&&state.mask===3&&state.skill===0;
  const damage=command==='allout'?Math.round(168*(options.multiplier??1.5)/1.5):weak?72:48;
  const enemyActs = command !== 'insight';
  const run=++actionRun;
  state.busy=true;
  state.sp-=commandCost();
  state.log=`${name} · 行动演出中…`;
  render();
  let playback;
  if(command==='allout'||command==='basic'||skillAttacks)playback=flows.impact(command==='allout'?'allout':weak?'star':'slash',{amount:damage,meterTo:Math.max(0,state.enemyHp-damage)});
  else if(healing)playback=flows.impact('heal',{amount:Math.min(30,390-state.hp),meterTo:Math.min(390,state.hp+30)});
  else playback=flows.impact(command==='defend'?'guard':command==='insight'?'insight':'buff');
  playback.finished.then(()=>{
    if(run!==actionRun)return;
    // Standalone presentation fixture only. Production actions must use BattleEngine.act().
    if(skillAttacks||command==='basic'||command==='allout') {
      state.enemyHp=Math.max(0,state.enemyHp-damage);
      if(weak)state.stagger=Math.min(2,state.stagger+1);
      if(command==='allout')state.stagger=0;
    }
    if(command==='skills'&&state.mask===3&&state.skill===0)state.hp=Math.min(390,state.hp+30);
    state.log=command==='insight'?'意图已确认：下一击蓄势攻击，弱点为知识。':command==='defend'?'防御姿态已就绪。':state.enemyHp===0?'敌人倒下了。':state.stagger>=2?'敌人失衡！总攻击已可选择。':weak?'命中弱点！知识攻击奏效。':'行动结束，重新选择下一步。';
    state.finished=state.enemyHp===0;
    if(state.finished){if(flows.battleFinished())return;transition('FINISH');}
    if(state.finished){state.busy=false;state.turnPhase='player';render();$('[data-action="return-after-battle"]')?.focus({preventScroll:true});return;}
    if(!enemyActs){state.turn++;state.busy=false;state.turnPhase='player';render();$('[data-action="execute"]')?.focus({preventScroll:true});return;}
    state.turnPhase='enemy';
    state.log=command==='defend'?'防御姿态已就绪，敌方正在出手。':'行动完成，敌方正在出手。';
    render();
    enemyTimer=setTimeout(()=>{
      const guarded=command==='defend';
      // 24 点沿用目录里已验收的受击演示；防御保留同一攻击的 50% 承伤。
      const enemyDamage=guarded?12:24;
      const hpAfter=Math.max(0,state.hp-enemyDamage);
      flows.impact(guarded?'guard':'player-hit',{amount:enemyDamage,target:'player',meterTo:hpAfter}).finished.then(()=>{
        if(run!==actionRun)return;
        state.hp=hpAfter;
        state.turn++;
        state.turnPhase='player';
        state.busy=false;
        state.log=guarded?`敌方出手：防御生效，受到 ${enemyDamage} 点伤害。`:`敌方出手：受到 ${enemyDamage} 点伤害。`;
        if(state.hp<=0){state.fighting=false;flows.open('defeat');return;}
        render();
        $('[data-action="execute"]')?.focus({preventScroll:true});
      });
    },reduced.matches?0:220);
  });
}
function goRoom(room){actionRun++;clearTimeout(enemyTimer);flows.resetView();state.fighting=false;state.finished=false;state.busy=false;state.turnPhase='player';state.room=room;history.replaceState(null,'',`#${room}`);render({focus:true});scrollTo(0,0);}
const flows=createEncounterDirector({state,icon,render,reduced,transition,notify,mainButton,startBattle,execute,goRoom,returnFromBattle});
const preparation=createPreparationDirector({state,masks,icon,openSheet,render,notify,arsenalItems,reduced,goRoom});
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
  if(control.dataset.flow){flows.act(control.dataset.flow);return;}
  if(control.dataset.tower){flows.towerAct(control.dataset.tower);return;}
  if(control.dataset.prep){preparation.act(control.dataset.prep);return;}
  if(control.dataset.visualState){location.href=`?view=combat&visual=states&state=${encodeURIComponent(control.dataset.visualState)}`;return;}
  if(control.matches('.room-nav a')&&state.fighting){event.preventDefault();return;}
  if(control.dataset.node){state.selectedNode=control.dataset.node;render();$(`[data-node="${state.selectedNode}"]`)?.focus({preventScroll:true});return;}
  if(control.dataset.mask!==undefined){state.mask=Number(control.dataset.mask);state.skill=0;if(sheet.open)sheet.close();render();if(!state.fighting)$(`[data-mask="${state.mask}"]`)?.focus({preventScroll:true});return;}
  if(control.dataset.arsenalTab){state.arsenalTab=control.dataset.arsenalTab;render();$(`[data-arsenal-tab="${state.arsenalTab}"]`)?.focus({preventScroll:true});return;}
  if(control.dataset.skill!==undefined){if(state.busy)return;state.skill=Number(control.dataset.skill);render();$(`[data-skill="${state.skill}"]`)?.focus({preventScroll:true});return;}
  if(control.dataset.command){if(state.busy)return;state.command=control.dataset.command;render();$(`[data-command="${state.command}"]`)?.focus({preventScroll:true});return;}
  if(control.dataset.item){
    preparation.item(control.dataset.item);
    return;
  }
  const action=control.dataset.action;
  if(!action)return;
  if(action.startsWith('equip-')){const id=action.slice(6);state.equipped.has(id)?state.equipped.delete(id):state.equipped.add(id);sheet.close();render();notify('示例装备已更新');return;}
  if(action==='open-tower'){if(!preparation.settings.enabled){preparation.act('settings');return;}if(!flows.towerActive){flows.open('tower-flow');return;}navigate('tower');}
  else if(action==='open-persona')navigate('persona');
  else if(action==='awaken-persona')preparation.act('create');
  else if(action==='start-battle')startBattle('battle');
  else if(action==='enter-node'){
    if(state.selectedNode==='mob'){scrolls.set('tower',scrollY);startBattle('tower');}
    else flows.open(state.selectedNode==='echo'?'echo':'chest');
  }
  else if(action==='leave-battle')leaveBattle();
  else if(action==='confirm-leave'||action==='return-after-battle')returnFromBattle();
  else if(action==='close-sheet')sheet.close();
  else if(action==='prev-mask'||action==='next-mask'){
    if(state.busy)return;state.mask=(state.mask+(action==='next-mask'?1:-1)+masks.length)%masks.length;state.skill=0;render();$(`[data-action="${action}"]`)?.focus({preventScroll:true});
  }
  else if(action==='choose-mask')openSheet('选择出战面具',masks.map((m,i)=>`<button class="skill-row" data-mask="${i}" aria-pressed="${i===state.mask}">${icon('mask')}<span>${esc(m.name)}<small>${m.attr} · ${esc(m.passive)}</small></span>${i===state.mask?icon('check'):''}</button>`).join(''));
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
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!sheet.open){if(flows.transforming||flows.active||flows.rehearsal){event.preventDefault();flows.close();return;}if(state.fighting){event.preventDefault();leaveBattle();}}});
document.addEventListener('visibilitychange',()=>document.body.classList.toggle('is-hidden',document.hidden));
state.room=roomFromHash();
render();
if(fixture==='low-sp')startBattle('tower');
else if(new URLSearchParams(location.search).get('view')==='combat'&&(!location.hash||state.room==='battle'))startBattle('battle');
const initialScene=new URLSearchParams(location.search).get('scene');
if(initialScene)flows.open(initialScene);
