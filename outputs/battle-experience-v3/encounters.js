import {createCombatMotion} from './combat-motion.js';
import {createTowerFlow} from './tower-flow.js';
// Presentation fixtures for the prototype. Production outcomes remain owned by BattleEngine/store.
export const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function createEncounterDirector(api) {
  const {state, icon, render, reduced, transition, notify} = api;
  const motion=createCombatMotion({reduced});
  let page = null, details = {}, timer = 0, raf = 0, qte = null, rehearsal = null, effectRun = 0;
  let boss = false, bossPhase = 1, claimed = false, chestClaimed = false;
  const towerFlow=createTowerFlow({...api,startFight(isBoss,resume){page=null;boss=isBoss;bossPhase=resume?.phase??1;api.startBattle('tower',{bossEncounter:isBoss,journey:true,resume});}});
  const rehearsalSteps = [
    ['hit','受击','敌方意图落地，玩家 HP 条承受冲击。','敌方回合结算'],
    ['critical','暴击','敌人被命中，闪点、碎片与暴击跳字同时出现。','暴击结果确认'],
    ['heal','治疗','光点上升，HP 数字和原位血条同步回复。','回复技能结算'],
    ['guard','格挡反击','完全格挡后蓄起反击的光，反击伤害由下一次攻击结算。','完全格挡或反击预备成立'],
    ['one-more','追加回合','保留当前回合的行动权，敌方不立即回应。','引擎授予追加行动'],
    ['qte','总攻击 QTE','3.5 秒连点决定总攻击档位，再落到命中演出。','失衡窗口确认'],
    ['boss','Boss 变身','第一形态被击破后，舞台内直接破壳进入第二形态。','第一形态 HP 清零'],
  ];
  const catalog = [
    ['战斗演出','BATTLE',['battle-flow','完整演出排练'],['battle-stage','战场状态取景'],['fx:hit','受击'],['fx:critical','暴击'],['fx:heal','治疗'],['fx:guard','格挡反击'],['fx:one-more','追加回合'],['qte','总攻击 QTE'],['boss','Boss 登场与变身']],
    ['战后与结算','AFTER THE FIGHT',['victory','战斗胜利'],['defeat','败退'],['retreat','撤退确认'],['loot','战利品揭晓']],
    ['高塔之间','BETWEEN FLOORS',['tower-flow','连贯高塔流程'],['reveal','区层显形'],['reveal-error','显形中断'],['event','异变事件'],['echo','月光回响'],['quiz','镜之自问'],['chest','月匣'],['recap','逐层下塔回顾'],['clear','区层通关'],['finale','终局']],
  ];
  const effectLabels = {hit:['-24','受击'],critical:['CRITICAL','暴击'],heal:['+30 HP','微光回复'],guard:['BLOCK / COUNTER','格挡反击'],'one-more':['1 MORE','追加回合']};
  function button(label, action, note = '', tone = '', disabled = false) {
    return `<button class="flow-button ${tone}" data-flow="${action}" ${disabled?'disabled':''}><span>${label}${note?`<small>${note}</small>`:''}</span>${icon('arrow')}</button>`;
  }
  function frame(title, english, body, type = page) {
    const recovery=type==='catalog'?`<div class="scene-index"><section><h2>中断后的回应<small>RECOVERY</small></h2><button class="flow-button" data-prep="create-error"><span>觉醒中断与重试</span>${icon('arrow')}</button><button class="flow-button" data-prep="reshape-error"><span>重塑中断与手动恢复</span>${icon('arrow')}</button></section></div>`:'';
    return `<section class="experience-scene scene-${type}" data-scene="${type}"><button class="flow-return" data-flow="close">${icon('back')}<span>返回<small>RETURN</small></span></button><div class="scene-ghost" aria-hidden="true">${english}</div><div class="scene-heading"><h1>${title}</h1><span>${english}</span></div>${body}${recovery}</section>`;
  }
  function stamp(kind, text = '') { return `<div class="scene-emblem emblem-${kind}" aria-hidden="true"><i></i><b>${icon(kind)}</b><span>${text}</span></div>`; }
  function stop() { effectRun++;clearTimeout(timer); cancelAnimationFrame(raf); timer=0;raf=0;qte=null; }
  function open(kind, data = {}) {
    if(state.busy && kind!=='qte') { notify('等这一段行动结束，再切换。'); return; }
    if(rehearsal&&kind!=='battle-flow'){notify('退出排练后，再查看其他流程。');return;}
    if(kind==='battle-stage'){location.href='?view=combat&visual=states&state=intent';return;}
    const known=new Set(['catalog','phase','event-result','tower-flow-error',...catalog.flatMap(([, ,...items])=>items.map(([id])=>id))]);
    if(!known.has(kind))kind='catalog';
    if(kind==='event-result'&&(!data.title||!data.text))kind='event';
    stop();
    towerFlow.hide();
    if(kind==='tower-flow'||kind==='tower-flow-error'){page=null;state.fighting=false;towerFlow.start(kind==='tower-flow-error');return;}
    if(kind==='recap'){page=null;towerFlow.showRecap();return;}
    if(kind==='defeat'&&towerFlow.pendingBattle){page=null;towerFlow.defeat();return;}
    if(kind==='battle-flow'){
      rehearsal={step:0,qte:false};page=null;api.startBattle('tower');state.log='战斗演出排练开始：按顺序检查每个反馈节点。';render({focus:true});return;
    }
    if(kind.startsWith('fx:')) { page=null;if(!state.fighting||state.finished)api.startBattle('tower');else render();effect(kind.slice(3));return; }
    if(kind==='phase') {page=null;boss=true;bossPhase=1;api.startBattle('tower',{bossEncounter:true});state.enemyHp=0;startTransformation();return;}
    if(kind==='victory') { page=null;state.fighting=true;state.finished=true;state.origin='tower';claimed=false;render({focus:true});return; }
    page=kind;details={...data};
    if(kind==='qte') { details.returnScroll=scrollY;state.busy=true;qte={running:false,gauge:30,remaining:3500,last:0}; }
    if(kind==='loot'||kind==='chest')details.revealed=kind==='loot'?claimed:chestClaimed;
    if(kind==='reveal')details.ready=reduced.matches;
    render({focus:true});window.scrollTo(0,0);
    if(kind==='reveal'&&!reduced.matches) timer=setTimeout(()=>{if(page==='reveal'){details.ready=true;render();}},1100);
  }
  function close() {
    if(towerFlow.page){towerFlow.act('back');return;}
    if(motion.transforming){if(rehearsal)rehearsal.morphResult='skip';motion.skipTransformation();return;}
    if(page==='qte'){
      stop();page=null;state.busy=false;
      if(rehearsal){rehearsal.qte=false;state.log='已取消连点，未消耗 SP；仍可重新进入总攻击。';}
      render({focus:true});scrollTo(0,details.returnScroll??0);return;
    }
    if(rehearsal){api.returnFromBattle();return;}
    if(!page&&state.finished){api.returnFromBattle();return;}
    stop();page=null;render({focus:true});
  }
  function goTower() { stop();page=null;api.goRoom('tower'); }
  function effect(kind) {
    const labels=effectLabels[kind];if(!labels)return;
    const run=++effectRun;
    const mapped={hit:'player-hit',critical:'critical',heal:'heal',guard:'guard','one-more':'one-more'}[kind];
    const amount=kind==='hit'?24:kind==='critical'?96:kind==='heal'?Math.min(30,390-state.hp):0;
    const next=kind==='hit'?Math.max(0,state.hp-amount):kind==='critical'?Math.max(0,state.enemyHp-amount):kind==='heal'?Math.min(390,state.hp+amount):undefined;
    state.busy=true;state.log=`${labels[1]} · 场景演出`;render();motion.play(mapped,{amount,meterTo:next}).finished.then(()=>{if(run!==effectRun)return;if(kind==='hit'||kind==='heal')state.hp=next;if(kind==='critical')state.enemyHp=next;state.busy=false;state.log=`${labels[1]} · 演出完成`;render();});
  }
  function rehearsalRail() {
    if(!rehearsal)return '';
    const finished=rehearsal.step>=rehearsalSteps.length;
    const current=rehearsalSteps[Math.min(rehearsal.step,rehearsalSteps.length-1)];
    const qteLabels={complete:'蓄力到顶',timeout:'计时结束',skip:'跳过连点','reduced-motion':'减少动画'};
    const morphLabels={full:'完整变身',skip:'跳过变身','reduced-motion':'减少动画'};
    const result=rehearsal.qteResult?`${qteLabels[rehearsal.qteResult]} · ×${rehearsal.qteMultiplier.toFixed(1)}`:'';
    const finishNote=finished?`${result} / ${morphLabels[rehearsal.morphResult]??''}`:'';
    return `<section class="rehearsal-rail" aria-label="战斗演出排练"><div class="rehearsal-head" role="status"><span>演出排练 <small>${finished?'7 / 7':`${rehearsal.step+1} / ${rehearsalSteps.length}`}</small></span><strong>${finished?'七段演出已看完':current[1]}</strong><em>${finished?finishNote:`${rehearsal.step===6?`${result} · `:''}${current[3]} · ${current[2]}`}</em></div><div class="rehearsal-steps">${rehearsalSteps.map(([id,label],index)=>`<span title="${label}" aria-label="${label}${index<rehearsal.step?'：已播放':''}" ${index===rehearsal.step&&!finished?'aria-current="step"':''} class="${index<rehearsal.step?'done ':''}${index===rehearsal.step&&!finished?'current':''}"><b>${String(index+1).padStart(2,'0')}</b>${label}</span>`).join('')}</div><div class="rehearsal-actions">${finished?button('再看一次','open:battle-flow'):button(state.busy?'演出中…':rehearsal.step===5?'进入总攻击':'播放下一段','rehearsal-next','',rehearsal.step===6?'red':'',state.busy)}${button('退出排练','rehearsal-close','','subtle')}</div></section>`;
  }
  function rehearsalEffect(kind) {
    const run=rehearsal;
    const amount=kind==='hit'?24:kind==='critical'?96:kind==='heal'?Math.min(30,390-state.hp):0;
    const meterTo=kind==='hit'?Math.max(0,state.hp-amount):kind==='critical'?Math.max(0,state.enemyHp-amount):kind==='heal'?Math.min(390,state.hp+amount):state.hp;
    state.busy=true;state.log=`${rehearsalSteps[rehearsal.step][1]} · 排练中…`;render();
    motion.play(kind==='hit'?'player-hit':kind,{amount,target:kind==='critical'?'enemy':'player',meterTo}).finished.then(()=>{
      if(rehearsal!==run)return;
      if(kind==='hit'||kind==='heal')state.hp=meterTo;if(kind==='critical')state.enemyHp=meterTo;
      rehearsal.step++;state.busy=false;state.log=`${rehearsalSteps[rehearsal.step-1][1]} · 已完成`;render();focusRehearsal();
    });
  }
  function focusRehearsal(){document.querySelector('.rehearsal-actions button')?.focus({preventScroll:true});}
  function rehearsalQte() {
    details={returnScroll:scrollY};page='qte';state.busy=true;qte={running:false,gauge:30,remaining:3500,last:0};render({focus:true});scrollTo(0,0);
  }
  function startTransformation(){
    if(rehearsal&&!rehearsal.morphResult)rehearsal.morphResult=reduced.matches?'reduced-motion':'full';
    page=null;state.finished=false;state.busy=true;state.log='面具正在破裂，另一层意志正在苏醒。';render({focus:true});
    motion.transformBoss({onMorph(){
      bossPhase=2;state.enemyHp=420;state.stagger=0;state.command='skills';state.skill=0;state.log='第二形态已展开。';
      const scene=document.querySelector('.enemy-scene');if(!scene)return;
      scene.dataset.phase='2';scene.querySelector('.enemy-name>span').textContent='PHASE 02';scene.querySelector('.enemy-vitals strong').textContent='420';
      const fill=scene.querySelector(':scope>.meter i');if(fill){fill.style.width='100%';if(!reduced.matches)fill.animate([{width:'0%'},{width:'100%'}],{duration:650,easing:'cubic-bezier(.16,1,.3,1)'});}
      const log=document.querySelector('.battle-log');if(log)log.textContent='面具之下，意志重生。';
    },onComplete(){if(rehearsal)rehearsal.step++;state.busy=false;state.log='第二形态已展开，重新观察它的意图。';render({focus:true});if(rehearsal)focusRehearsal();}});
  }
  function victory() {
    return frame('这一场，拿下。','VICTORY',`<div class="result-layout"><div class="result-mark">${icon('sword')}<b>WIN</b></div><div class="result-content"><p class="scene-copy">你把属于自己的力量，带到了这一刻。</p><div class="result-stats"><span>完成回合<b>${Math.max(1,state.turn-3)}</b></span><span>剩余 HP<b>${state.hp}</b></span><span>剩余 SP<b>${state.sp}</b></span></div><div class="reward-progress" aria-label="结算进度"><span class="done">01 战斗结束</span><span class="${claimed?'done':'current'}">02 ${claimed?'收获已收下':'揭晓收获'}</span><span>03 返回${state.origin==='tower'?'路线':'战场'}</span></div>${claimed?`<div class="reward-receipt" role="status">${icon('check')}<div><strong>这一战的收获，已收下。</strong><span>回响之线 ×1 · 10 SP</span><small>当前 SP ${state.sp} / 260 · 不会重复领取</small></div></div>`:`<div class="reward-line">${icon('box')}<span>战利品</span><b>等待揭晓</b></div>${button('揭晓战利品','open:loot','先看看这一战留下了什么')}`} ${api.mainButton(state.origin==='tower'?'返回高塔路线':'返回战场','return-after-battle')}<p class="scene-note">本次为内存示例收获，不写入正式存档。</p></div></div>`,'victory').replace('class="experience-scene','class="victory experience-scene');
  }
  function screen() {
    if(towerFlow.page)return towerFlow.screen();
    if(!page)return null;
    if(page==='catalog') return frame('每一步，都有回应。','SCENE INDEX',`<p class="scene-copy">选一段流程，看看它如何发生。</p><div class="scene-index">${catalog.map(([title,en,...items])=>`<section><h2>${title}<small>${en}</small></h2>${items.map(([id,label])=>button(label,`open:${id}`)).join('')}</section>`).join('')}<section><h2>准备与成长<small>PREPARATION</small></h2><button class="flow-button" data-prep="create"><span>Persona 觉醒</span>${icon('arrow')}</button><button class="flow-button" data-prep="reshape"><span>面具重塑</span>${icon('arrow')}</button><button class="flow-button" data-prep="growth"><span>技能与成长</span>${icon('arrow')}</button><button class="flow-button" data-prep="settings"><span>设置编辑</span>${icon('arrow')}</button></section></div>`);
    if(page==='qte') return frame('把这一击，推到尽头。','ALL OUT',`<div class="qte-stage"><div class="qte-duel" aria-hidden="true"><span>${icon('mask')}<b>你的意志</b></span><i>${icon('sword')}</i><span>${icon('eye')}<b>${boss?'回声的执念':'聒噪的假面'}</b></span></div><p class="scene-copy">${reduced.matches?'减少动画已开启，可直接使用默认档位出手。':qte.running?'持续连点，把光条向前推。':'准备好再开始，倒计时不会提前走。'}</p><div class="qte-readout"><b id="qte-seconds">${(qte.remaining/1000).toFixed(1)}</b><span>SECONDS</span><strong id="qte-mult">×${qteMultiplier(qte.gauge).toFixed(1)}</strong></div><div class="qte-track" role="progressbar" aria-label="总攻击蓄力" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(qte.gauge)}"><i id="qte-fill" style="width:${qte.gauge}%"></i><b style="left:50%"></b><b style="left:75%"></b></div><div class="qte-thresholds" aria-hidden="true"><span>×1.2</span><span>50% · ×1.5</span><span>75% · ×1.8</span><span>100% · ×2.2</span></div>${qte.running?'<button class="qte-tap" data-flow="tap-qte">连点！<small>TAP / SPACE</small></button>':button(reduced.matches?'直接出手 · ×1.5':'开始连点','start-qte',reduced.matches?'使用默认档位':'3.5 秒 · 也可以按空格键')}${button('跳过连点，直接出手','skip-qte','默认档位 ×1.5','subtle')}<p class="scene-note">${reduced.matches?'保留结果提示，省略连点与飞行特效。':'时间结束后按当前蓄力出手；返回或 Esc 取消本次连点。'}</p></div>`);
    if(page==='loot'||page==='chest') {const collected=page==='chest'?chestClaimed:claimed;return frame(collected?'这份收获，已属于你。':page==='chest'?'月光，把它留给了你。':'这一程的收获。',page==='chest'?'MOON CHEST':'REWARD',`<div class="loot-layout ${details.revealed?'is-revealed':''}"><div class="loot-object">${icon(collected?'check':details.revealed?'star':'box')}<i></i></div><div class="loot-copy">${details.revealed?`<span class="reward-rarity">残月 / RELIC</span><h2>回响之线</h2><p>一件来自塔层之间的遗物。让这段路留下回声。</p><div class="loot-rewards"><div>${icon('box')}<span>遗物<strong>回响之线</strong></span><b>×1</b></div><div>${icon('star')}<span>SP<strong>月光余力</strong></span><b>+10</b></div></div><p class="reward-sp-preview">${collected?`当前 SP ${state.sp} / 260 · 已收下`:`SP ${state.sp} → ${Math.min(260,state.sp+10)} / 260`}</p>${button(collected?(page==='chest'?'返回路线':'查看结算'):'收下这份收获','claim-loot',collected?'不会重复领取':'收下后展示回执')}`:`<h2>还有什么，等待被看见？</h2><p>亲手揭开，看看这段路留下了什么。</p>${button('揭晓','reveal-loot','REVEAL')}`}<p class="scene-note">仅在本次预览中展示示例收获。</p></div></div>`);}
    if(page==='echo')return frame('在这里，停一会儿。','MOON ECHO',`<div class="story-layout">${stamp('star')}<div class="story-content"><h2>月光回响</h2><p class="scene-copy">一小片月光落在塔层间。它愿意回应你一次。</p><div class="choice-stack">${button('沐浴月光','echo-heal','回复 20% 体力')}${button('汲取月辉','echo-buff','本次登塔伤害 +6%')}</div><p class="scene-note">选择后回到原来的路线。</p></div></div>`);
    if(page==='event')return frame('另一条路，正在回应。','ENCOUNTER',`<div class="story-layout">${stamp('eye')}<div class="story-content"><h2>月光积水</h2><p class="scene-copy">塔层的凹陷处积着一汪月光色的水，水面映出的不是你的脸。</p><div class="choice-stack">${button('凝视水面','event-gaze','靠近，听见水中的回答')}${button('绕开路过','event-pass','保留气力，继续向上')}</div></div></div>`);
    if(page==='event-result')return frame('你作出了选择。','AFTER THE ECHO',`<div class="story-layout">${stamp('check')}<div class="story-content"><h2>${details.title}</h2><p class="scene-copy">${details.text}</p><div class="effect-receipt">${icon('star')}<span>${details.effect}</span></div>${button('继续向上','finish-event','返回路线')}</div></div>`);
    if(page==='quiz') return frame('还记得那时候吗？','REFLECTION',`<div class="story-layout">${stamp('eye')}<div class="story-content"><h2>镜之自问</h2><p class="scene-copy">这是哪一种来自白昼的力量？</p><blockquote>“面对那件一直回避的事，我还是迈出了一步。”</blockquote><div class="choice-stack">${button('勇气','quiz-correct')}${button('灵巧','quiz-wrong')}${button('体贴','quiz-wrong')}</div><p class="scene-note">使用虚构片段预览，不读取你的真实记录。</p></div></div>`);
    if(page==='reveal'||page==='reveal-error')return frame(page==='reveal-error'?'雾还没有散开。':'听见塔层，缓缓显形。','STRATUM',`<div class="reveal-layout ${details.ready?'ready':''}"><div class="tower-silhouette" aria-hidden="true"><i></i><i></i><i></i><i></i></div><div><span class="stratum-number">03<span>STRATUM</span></span><h2>${page==='reveal-error'?'显形暂时中断':details.ready?'回声之庭':'正在显形…'}</h2><p class="scene-copy">${page==='reveal-error'?'这段路还没有消失。准备好了，可以再试一次。':'那些被白昼留下的回声，在这里有了形状。'}</p>${page==='reveal-error'?button('重新显形','open:reveal'):details.ready?button('踏入高塔','go-tower'):button('直接进入','go-tower','跳过显形演出','subtle')}</div></div>`);
    if(page==='boss')return frame('塔顶，正在注视你。','SHADOW',`<div class="boss-layout">${stamp('mask')}<div><span class="boss-phase">MAIN SHADOW</span><h2>回声的执念</h2><p class="scene-copy">走过的每一层，最终都在这里相遇。</p>${button('迎战心魔','start-boss','第一形态击破后，会在战斗舞台自动破壳变身')}</div></div>`);
    if(page==='defeat')return frame('今晚，先到这里。','NOT THE END',`<div class="result-layout"><div class="result-mark defeat-mark">${icon('shield')}<b>REST</b></div><div class="result-content"><p class="scene-copy">败退不是抹去已经走过的路。先停下，整理好自己。</p><div class="result-stats"><span>抵达楼层<b>04 F</b></span><span>完成战斗<b>2</b></span><span>本次状态<b>败退</b></span></div><div class="outcome-note">${icon('eye')}<p><strong>今晚的探索已结束</strong><span>回顾已走过的楼层和已获得的收获，准备好后明晚再来。</span></p></div>${button('看看今晚走过的路','open:recap')}${button('回到战场','go-home','','subtle')}<p class="scene-note">败退流程预览，不修改实际挑战次数或存档。</p></div></div>`);
    if(page==='retreat')return frame('要在这里暂别吗？','RETREAT',`<div class="story-layout">${stamp('back')}<div class="story-content"><h2>今晚，走到这里？</h2><p class="scene-copy">可以留在这一层继续探索，也可以收起今晚的行程。</p><div class="outcome-note">${icon('back')}<p><strong>下塔会结束本次探索</strong><span>接下来先查看今晚的回顾，再回到战场。已经获得的收获会列在回顾里。</span></p></div>${button('继续探索','close','回到刚才的位置')}${button('结束探索，查看回顾','open:recap','确认下塔','danger')}<p class="scene-note">本页预览离场流程，不修改正式存档。</p></div></div>`);
    if(page==='recap'||page==='clear')return frame(page==='clear'?'这一层，已被你穿过。':'带着今晚的回声，回去吧。',page==='clear'?'STRATUM CLEAR':'RETURN',`<div class="recap-layout"><div class="recap-floor"><b>${page==='clear'?'10':'04'}</b><span>FLOOR</span></div><div class="recap-content"><h2>${page==='clear'?'回声之庭 · 通关':'今夜回顾'}</h2><p class="scene-copy">你走过的每一步，都留下了形状。</p><div class="recap-list"><div><span>完成战斗</span><strong>2 场</strong></div><div><span>探索节点</span><strong>3 处</strong></div><div><span>获得遗物</span><strong>回响之线</strong></div><div><span>这一次的力量</span><strong>月光映照</strong></div></div>${button('返回战场','go-home')}${page==='clear'?button('看看下一段路','open:reveal','','subtle'):''}<p class="scene-note">本页展示示例探索数据。</p></div></div>`);
    if(page==='finale')return frame('你已经走过黑夜。','BEYOND THE MASK',`<div class="finale-layout"><div class="finale-star" aria-hidden="true">${icon('star')}</div><h2>面具之外，<br>仍是你自己。</h2><p class="scene-copy">把这一刻的力量，带回白昼。</p>${button('回到庭园','go-home')}</div>`);
    return null;
  }
  function qteMultiplier(value) { return value>=100?2.2:value>=75?1.8:value>=50?1.5:1.2; }
  function finishQte(multiplier,reason='timeout') {
    if(page!=='qte')return;
    stop();page=null;state.busy=false;
    if(rehearsal?.qte){
      rehearsal.qte=false;rehearsal.qteResult=reason;rehearsal.qteMultiplier=multiplier;
      const run=rehearsal,damage=Math.round(168*multiplier/1.5),next=Math.max(0,state.enemyHp-damage);
      state.busy=true;state.log=`总攻击 · ×${multiplier.toFixed(1)} · 命中演出`;render();scrollTo(0,details.returnScroll??0);
      motion.play('allout',{amount:damage,meterTo:next}).finished.then(()=>{if(rehearsal!==run)return;state.enemyHp=next;rehearsal.step++;state.busy=false;state.log=`总攻击 · ×${multiplier.toFixed(1)} 档位完成`;render();focusRehearsal();});return;
    }
    if(!state.fighting){api.startBattle('tower');state.command='allout';state.stagger=2;}
    state.command='allout';
    api.execute({qteResolved:true,multiplier});
  }
  function runQte() {
    if(!qte||qte.running)return;
    if(reduced.matches){finishQte(1.5,'reduced-motion');return;}
    qte.running=true;render();document.querySelector('[data-flow="tap-qte"]')?.focus({preventScroll:true});qte.last=performance.now();
    const tick=now=>{
      if(!qte||page!=='qte')return;
      const dt=Math.min(100,now-qte.last);qte.last=now;
      if(!document.hidden){qte.remaining=Math.max(0,qte.remaining-dt);qte.gauge=Math.max(0,qte.gauge-.016*dt);}
      const fill=document.querySelector('#qte-fill');if(fill){fill.style.width=`${qte.gauge}%`;fill.parentElement.setAttribute('aria-valuenow',String(Math.round(qte.gauge)));document.querySelector('#qte-seconds').textContent=(qte.remaining/1000).toFixed(1);document.querySelector('#qte-mult').textContent=`×${qteMultiplier(qte.gauge).toFixed(1)}`;}
      if(qte.remaining<=0||qte.gauge>=100){finishQte(qteMultiplier(qte.gauge),qte.gauge>=100?'complete':'timeout');return;}raf=requestAnimationFrame(tick);
    };raf=requestAnimationFrame(tick);
  }
  function act(action) {
    if(action.startsWith('open:')){open(action.slice(5));return;}
    if(action==='close'){close();return;}
    if(action==='go-tower'||action==='finish-event'){goTower();return;}
    if(action==='go-home'){stop();page=null;api.goRoom('battle');return;}
    if(action==='start-qte'){runQte();return;}
    if(action==='tap-qte'){if(qte?.running){qte.gauge=Math.min(100,qte.gauge+2.2);if(qte.gauge>=100)finishQte(qteMultiplier(qte.gauge),'complete');}return;}
    if(action==='skip-qte'){finishQte(1.5,'skip');return;}
    if(action==='rehearsal-close'){api.returnFromBattle();return;}
    if(action==='rehearsal-next'){
      if(!rehearsal||state.busy)return;
      if(rehearsal.step<5){rehearsalEffect(rehearsalSteps[rehearsal.step][0]);return;}
      if(rehearsal.step===5){rehearsal.qte=true;rehearsalQte();return;}
      if(rehearsal.step===6){boss=true;bossPhase=1;state.enemyHp=0;startTransformation();return;}
      rehearsal.step=rehearsalSteps.length;render();return;
    }
    if(action==='reveal-loot'){if(details.revealed)return;details.revealed=true;transition('REVEAL');render();return;}
    if(action==='claim-loot'){
      if((page!=='loot'&&page!=='chest')||!details.revealed)return;
      const wasChest=page==='chest',collected=wasChest?chestClaimed:claimed;
      if(!collected){if(wasChest)chestClaimed=true;else{claimed=true;if(towerFlow.pendingBattle)towerFlow.recordLoot();}state.sp=Math.min(260,state.sp+10);render({focus:true});return;}
      page=null;if(wasChest)goTower();else render({focus:true});return;
    }
    if(action==='echo-heal'||action==='echo-buff'){if(action==='echo-heal')state.hp=Math.min(390,state.hp+78);open('event-result',{title:action==='echo-heal'?'月光，回应了你。':'把这束光，带在身边。',text:action==='echo-heal'?'片刻停留之后，你重新站稳了脚步。':'月辉在掌心凝聚，陪你走进下一层。',effect:action==='echo-heal'?`体力 ${state.hp} / 390`:'月光回响 · 本次登塔伤害 +6%'});return;}
    if(action==='event-gaze'||action==='event-pass'){open('event-result',{title:action==='event-gaze'?'水中的你，点了点头。':'继续往前。',text:action==='event-gaze'?'一股清亮的力量涌了上来。':'你没有理会，水面平静如常。',effect:action==='event-gaze'?'月光映照 · 本次登塔伤害 +5%':'保留气力 · 无额外变化'});return;}
    if(action==='quiz-correct'||action==='quiz-wrong'){open('event-result',{title:action==='quiz-correct'?'你认出了那份力量。':'也许，下次会看得更清楚。',text:'镜面里的片段渐渐散开，前路重新显现。',effect:action==='quiz-correct'?'镜之自问 · 回答正确':'镜之自问 · 本次未答对'});return;}
    if(action==='start-boss'){page=null;boss=true;bossPhase=1;api.startBattle('tower',{bossEncounter:true});return;}
    if(action==='skip-transform'){if(rehearsal)rehearsal.morphResult='skip';motion.skipTransformation();return;}
  }
  document.addEventListener('keydown',event=>{if(page==='qte'&&qte?.running&&event.code==='Space'&&!event.repeat){event.preventDefault();act('tap-qte');}});
  document.addEventListener('visibilitychange',()=>{if(qte)qte.last=performance.now();});
  return {
    get active(){return page??towerFlow.page;},get transforming(){return motion.transforming;},get bossPhase(){return boss?bossPhase:0;},screen,victory,open,close,act,effect,
    towerRoute:()=>towerFlow.route(),towerAct:action=>towerFlow.act(action),get towerActive(){return towerFlow.active;},get towerSnapshot(){return towerFlow.snapshot;},
    towerReturn(won){if(!rehearsal)towerFlow.battleReturn(won,bossPhase);},towerHide:()=>towerFlow.hide(),
    impact:(kind,options)=>motion.play(kind,options),
    get rehearsal(){return rehearsal;},rehearsalRail,resetView(){stop();page=null;rehearsal=null;motion.clear();},
    battleStarted({bossEncounter=false}={}){motion.clear();claimed=false;if(!bossEncounter){boss=false;bossPhase=1;}},
    battleFinished(){if(boss&&bossPhase===1){startTransformation();return true;}boss=false;return false;},
    towerTools(){return `<div class="tower-tools">${[['event','异变'],['echo','回响'],['chest','月匣'],['reveal','区层'],['retreat','下塔']].map(([id,label])=>`<button data-flow="open:${id}">${icon(id==='retreat'?'back':id==='reveal'?'tower':id==='chest'?'box':'star')}<span>${label}</span></button>`).join('')}</div>`;},
  };
}
