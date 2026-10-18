import {createTowerJourney,towerNodes} from './tower-journey.js';

export function createTowerFlow(api){
  const {state,icon,render,reduced}=api,model=createTowerJourney(),j=model.journey;
  const initialVitals={hp:state.hp,sp:state.sp};
  let page=null,receipt=null,clock=null,raf=0,serial=0,recap=null;
  const btn=(label,action,note='',disabled=false)=>`<button class="flow-button" data-tower="${action}" ${disabled?'disabled':''}><span>${label}${note?`<small>${note}</small>`:''}</span>${icon('arrow')}</button>`;
  const frame=(title,en,body)=>`<section class="experience-scene tower-scene" data-tower-scene="${page}"><button class="flow-return" data-tower="back">${icon('back')}<span>返回<small>RETURN</small></span></button><div class="scene-ghost" aria-hidden="true">${en}</div><div class="scene-heading"><h1>${title}</h1><span>${en}</span></div>${body}</section>`;
  function stop(){cancelAnimationFrame(raf);clock=null;serial++;}
  function timeline(duration,onTick,onDone){
    stop();const id=serial;clock={elapsed:0,last:performance.now()};
    const tick=now=>{if(id!==serial||!clock)return;const dt=Math.max(0,now-clock.last);clock.last=now;if(!document.hidden)clock.elapsed+=dt;onTick(clock.elapsed);if(clock.elapsed>=duration){stop();onDone();return;}raf=requestAnimationFrame(tick);};
    raf=requestAnimationFrame(tick);
  }
  function show(next){stop();page=next;render({focus:true});scrollTo(0,0);}
  function reveal(error=false){
    show(error?'reveal-error':'reveal');if(error)return;
    if(reduced.matches){show('reveal-ready');return;}
    timeline(1100,()=>{},()=>show('reveal-ready'));
  }
  function routeBack(){stop();page=null;api.goRoom('tower');}
  function start(error=false){model.start();Object.assign(state,initialVitals);receipt=null;reveal(error);}
  function enter(){
    const pending=j.pending??model.enter();if(!pending)return;
    if(pending.resolved){receipt=pending.result;show('receipt');return;}
    if(pending.kind==='mob'||pending.kind==='boss'){
      page=null;api.startFight(pending.kind==='boss',pending.battleState);return;
    }
    show(pending.kind);
  }
  function choose(action){
    if(!j.pending||j.pending.resolved)return;
    const kind=j.pending.kind;let result;
    if(kind==='echo'&&action==='heal'){
      const before=state.hp;state.hp=Math.min(390,state.hp+78);result={label:'沐浴月光',detail:`HP ${before} → ${state.hp} / 390`,type:'heal'};
    }else if(kind==='echo'&&action==='buff'){
      j.buffs.push('月辉 +6%');result={label:'汲取月辉',detail:'本次登塔伤害 +6%',type:'buff'};
    }else if(kind==='event'&&['gaze','pass'].includes(action)){
      if(action==='gaze')j.buffs.push('月光映照 +5%');result={label:action==='gaze'?'凝视水面':'绕开路过',detail:action==='gaze'?'月光映照 · 本次登塔伤害 +5%':'保留气力 · 无额外变化',type:'event'};
    }else if(kind==='quiz'&&['correct','wrong'].includes(action)){
      result={label:action==='correct'?'认出了勇气':'镜面渐渐散去',detail:action==='correct'?'你认出了那份力量。':'也许，下次会看得更清楚。',type:'quiz'};
    }else return;
    if(model.resolve(result)){receipt=result;show('receipt');}
  }
  function claim(){
    if(j.pending?.kind!=='chest')return;
    if(j.pending.resolved){receipt=j.pending.result;show('receipt');return;}
    if(model.addLoot())state.sp=Math.min(260,state.sp+10);
    const result={label:'月匣已收下',detail:`回响之线 ×1 · +10 SP，当前 ${state.sp} / 260`,type:'chest'};
    model.resolve(result);receipt=result;show('receipt');
  }
  function finish(){
    if(!model.advance())return;
    if(j.ended==='clear')show('clear');else routeBack();
  }
  function summary(){
    const history=j.active?j.history:[],battles=history.filter(e=>['mob','boss'].includes(e.kind)).length;
    return `<div class="recap-summary" ${recap?.done?'':'hidden'}><h2>${j.ended==='clear'?'这段路，已被你穿过。':'今晚，走到了这里。'}</h2><div class="recap-list"><div><span>本次预览完成战斗</span><strong>${battles} 场</strong></div><div><span>完成节点</span><strong>${history.length} 处</strong></div><div><span>收下的遗物</span><strong>${j.loot.length?`回响之线 ×${j.loot.length}`:'暂无'}</strong></div><div><span>带走的力量</span><strong>${j.buffs.length?j.buffs.join(' · '):'保留每一步的回声'}</strong></div></div><ol class="journey-record">${history.map(e=>`<li><b>${String(e.floor).padStart(2,'0')}F</b><span>${towerNodes[e.kind].title}<small>${e.label} · ${e.detail}</small></span></li>`).join('')||'<li>这次还没有完成新的节点。</li>'}</ol>${btn('回到战场','home')}${j.ended==='clear'?btn('走向终局','finale'):''}<p class="scene-note">本次预览从 3F 接续；1–3F 是入场前的示意楼层，不计入本次战斗与收获。</p></div>`;
  }
  function recapRows(floor){
    return Array.from({length:Math.min(6,floor)},(_,i)=>{const n=floor-i,entry=j.history.find(e=>e.floor===n);return `<div class="recap-floor-bar ${i===0?'on':''}" ${i===0?'aria-current="true"':''}><b>${String(n).padStart(2,'0')}<small>F</small></b><span>${n===recap.target?'本次抵达':entry?towerNodes[entry.kind].kind:n<=3?'已走过':'经过'}</span>${icon(n===recap.target?'tower':'check')}</div>`;}).join('');
  }
  function drawRecap(floor){
    if(!recap||floor===recap.shown)return;
    recap.shown=floor;const root=document.querySelector('.recap-ascent');if(!root)return;
    root.dataset.floor=String(floor);root.querySelector('.recap-counter b').textContent=String(floor).padStart(2,'0');
    root.querySelector('.recap-counter').animate?.(reduced.matches?[{opacity:1}]:[{scale:1.2},{scale:1}],{duration:260,easing:'cubic-bezier(.16,1,.3,1)'});
    const bars=root.querySelector('.recap-floor-window');bars.innerHTML=recapRows(floor);
    if(!reduced.matches)bars.animate([{translate:'0 38px',opacity:.6},{translate:'0 0',opacity:1}],{duration:260,easing:'cubic-bezier(.16,1,.3,1)'});
  }
  function finishRecap(){if(!recap||recap.done)return;stop();drawRecap(recap.target);recap.done=true;render();document.querySelector('[data-tower="home"]')?.focus({preventScroll:true});}
  function showRecap(){
    recap={target:j.active?j.floor:4,shown:0,done:false};show('recap');
    if(reduced.matches){finishRecap();return;}
    drawRecap(1);timeline(recap.target*300+650,ms=>drawRecap(Math.min(recap.target,1+Math.floor(ms/300))),finishRecap);
  }
  function screen(){
    if(!page)return null;
    if(page.startsWith('reveal'))return frame(page==='reveal-error'?'雾还没有散开。':'听见塔层，缓缓显形。','STRATUM',`<div class="reveal-layout ${page==='reveal-ready'?'ready':''}"><div class="tower-silhouette" aria-hidden="true"><i></i><i></i><i></i><i></i></div><div><span class="stratum-number">03<span>STRATUM</span></span><h2>${page==='reveal-error'?'显形暂时中断':page==='reveal-ready'?'回声之庭':'正在显形…'}</h2><p class="scene-copy">${page==='reveal-error'?'已走过的路还在，重新显形后继续。':'从 3F 接续这一次探索。先侦察前路，再作选择。'}</p>${page==='reveal-error'?btn('重新显形','retry'):btn(page==='reveal-ready'?'踏入高塔':'跳过显形，进入高塔','route')}<p class="scene-note">固定路线示例，只保留在当前预览内。</p></div></div>`);
    if(page==='recap')return frame('一层一层，回望来时路。','TONIGHT / RETURN',`<div class="recap-ascent ${recap.done?'is-settled':''}" data-floor="${recap.shown||1}" data-target="${recap.target}"><div class="recap-moon" aria-hidden="true"></div><div class="recap-counter"><b>${String(recap.shown||1).padStart(2,'0')}</b><span>FLOOR</span></div><div class="recap-floor-window" aria-label="逐层回望">${recapRows(recap.shown||1)}</div><p class="recap-arrival" role="status">${recap.done?`本次抵达 ${String(recap.target).padStart(2,'0')}F`:'沿着走过的楼层，向上回望。'}</p></div>${!recap.done?btn('跳过回望','skip-recap','直接抵达本次楼层'):''}${summary()}`);
    if(page==='retreat')return frame('今晚，走到这里？','DESCEND',`<div class="story-layout"><div class="scene-emblem">${icon('back')}</div><div><h2>你已抵达 ${j.floor}F。</h2><p class="scene-copy">${j.pending&&!j.pending.resolved?'当前节点尚未完成；下塔回顾会停在本次抵达层。':'已经获得的收获会保留在本次行程回顾中。'}</p>${btn('继续探索','route','回到刚才的位置')}${btn('确认下塔，回望来路','descend','结束本次预览行程')}</div></div>`);
    if(page==='receipt')return frame('每一步，都留下回声。','AFTER THE ECHO',`<div class="story-layout"><div class="scene-emblem">${icon('check')}</div><div><h2>${receipt.label}</h2><p class="scene-copy">${receipt.detail}</p><div class="effect-receipt">${icon('tower')}<span>${j.floor}F · 此节点已完成</span></div>${btn(j.floor===10?'看看这段路':'继续向上','finish',j.floor===10?'区层通关':'返回路线，显示下一层')}<p class="scene-note">每个节点的选择只结算一次。</p></div></div>`);
    if(page==='echo')return frame('在这里，停一会儿。','MOON ECHO',`<div class="story-layout"><div class="scene-emblem">${icon('star')}</div><div><h2>月光回响</h2><p class="scene-copy">这一次选择，只回应你一次。</p><div class="echo-preview"><span>HP <b>${state.hp} → ${Math.min(390,state.hp+78)}</b> / 390</span><span>或带走 <b>月辉 +6%</b></span></div>${btn('沐浴月光','heal','回复 20% 体力')}${btn('汲取月辉','buff','本次登塔伤害 +6%')}</div></div>`);
    if(page==='event')return frame('另一条路，正在回应。','ENCOUNTER',`<div class="story-layout"><div class="scene-emblem">${icon('eye')}</div><div><h2>月光积水</h2><p class="scene-copy">塔层的凹陷处积着一汪月光色的水，水面映出的不是你的脸。</p>${btn('凝视水面','gaze','靠近，听见水中的回答')}${btn('绕开路过','pass','保留气力，继续向上')}</div></div>`);
    if(page==='quiz')return frame('还记得那时候吗？','REFLECTION',`<div class="story-layout"><div class="scene-emblem">${icon('eye')}</div><div><h2>镜之自问</h2><blockquote class="journey-quote">面对那件一直回避的事，我还是迈出了一步。</blockquote><p class="scene-copy">这是哪一种来自白昼的力量？</p>${btn('勇气','correct')}${btn('灵巧','wrong')}${btn('体贴','wrong')}<p class="scene-note">虚构片段，不读取你的真实记录。</p></div></div>`);
    if(page==='chest'||page==='chest-open')return frame('月光，把它留给了你。','MOON CHEST',`<div class="loot-layout ${page==='chest-open'?'is-revealed':''}"><div class="loot-object">${icon(page==='chest-open'?'star':'box')}<i></i></div><div class="loot-copy"><h2>${page==='chest-open'?'回响之线':'还有什么，等待被看见？'}</h2><p>${page==='chest-open'?'残月遗物 ×1 · 10 SP':'亲手揭开，看看这段路留下了什么。'}</p>${page==='chest-open'?`<p class="reward-sp-preview">SP ${state.sp} → ${Math.min(260,state.sp+10)} / 260</p>`:''}${btn(page==='chest-open'?'收下这份收获':'揭晓月匣',page==='chest-open'?'claim':'reveal-chest')}</div></div>`);
    if(page==='clear')return frame('这一层，已被你穿过。','STRATUM CLEAR',`<div class="story-layout"><div class="scene-emblem">${icon('tower')}</div><div><h2>回声之庭 · 通关</h2><p class="scene-copy">你抵达了 10F，也穿过了守在塔顶的那层执念。</p>${btn('一层层回望来路','recap')}${btn('走向终局','finale')}</div></div>`);
    if(page==='defeat')return frame('今晚，先到这里。','NOT THE END',`<div class="story-layout"><div class="scene-emblem">${icon('shield')}</div><div><h2>在 ${j.floor}F，暂歇。</h2><p class="scene-copy">体力已经耗尽。这次未完成的战斗不会记作胜利；走过的路和已收下的收获仍可回顾。</p>${btn('回望今晚走过的路','recap')}${btn('回到战场','home')}</div></div>`);
    if(page==='finale')return frame('你已经走过黑夜。','BEYOND THE MASK',`<div class="finale-layout"><div class="finale-star">${icon('star')}</div><h2>面具之外，<br>仍是你自己。</h2><p class="scene-copy">把这一刻的力量，带回白昼。</p>${btn('回望这段路','recap')}${btn('回到战场','home')}</div>`);
    return null;
  }
  function route(){
    if(!j.active)model.start();
    if(j.ended)return `<div class="page-heading"><h1>登塔<span>ASCEND / 03</span></h1></div><section class="journey-ended"><div class="recap-floor"><b>${String(j.floor).padStart(2,'0')}</b><span>FLOOR</span></div><div><h2>${j.ended==='clear'?'回声之庭，已经穿过。':'今晚的行程，停在这里。'}</h2><p class="scene-copy">这一次抵达 ${j.floor}F，完成 ${j.history.length} 个节点。沿着走过的路，再回望一次。</p>${btn('逐层回顾本次行程','recap')}${j.ended==='clear'?btn('走向终局','finale'):''}${btn('重新预览这段路','start','重新开始当前内存示例')}</div></section>`;
    const floor=j.pending?j.floor:Math.min(10,j.floor+1),choices=model.choices(),kind=j.pending?.kind??j.selected,n=towerNodes[kind],locked=Boolean(j.pending);
    return `<div class="page-heading"><h1>登塔<span>ASCEND / 03</span></h1><p>沿着走过的路，继续向上。</p></div><div class="journey-strip"><span>回声之庭 <b>${j.floor} / 10 F</b></span><span>HP <b>${state.hp}</b> / 390</span><span>SP <b>${state.sp}</b> / 260</span></div><div class="tower-grid"><section class="route-map journey-map" aria-label="第三区层路线图"><div class="route-watermark" aria-hidden="true">ASCEND</div><svg class="route-tracks" viewBox="0 0 600 520" preserveAspectRatio="none" aria-hidden="true"><path class="track-future" d="M300 62V180M140 306V260L300 218L460 260V306M300 218V180M300 306V218"/>${choices.map((id,i)=>{const x=choices.length===1?300:[140,300,460][i];return `<path class="track-base" d="M300 430V386L${x} 350V306"/><path class="track-live ${id===kind?'chosen':''}" pathLength="1" d="M300 430V386L${x} 350V306"/>`;}).join('')}</svg><div class="route-floor"><span class="floor-tag"><b>10</b>F</span><div class="route-node fog boss-node"><span class="node-seal">${icon('mask')}</span><span class="node-caption">心魔 · 塔顶</span></div></div><div class="route-floor"><span class="floor-tag"><b>${Math.min(10,floor+1)}</b>F</span><div class="route-node fog"><span class="node-seal">${icon('eye')}</span><span class="node-caption">${floor===10?'塔顶就在眼前':'前路尚未显现'}</span></div></div><div class="route-floor branch-floor ${choices.length===1?'single-choice':''}"><span class="floor-tag"><b>${String(floor).padStart(2,'0')}</b>F</span>${choices.map(id=>`<button class="route-node next ${kind===id?'selected':''}" data-tower="select:${id}" aria-pressed="${kind===id}" ${locked&&id!==kind?'disabled':''}><span class="node-seal">${icon(towerNodes[id].icon)}</span><span class="node-caption">${towerNodes[id].kind}</span><span class="node-hint">${locked?(id===kind?'已选择':'本层未选择'):id===kind?'查看中':'可前往'}</span></button>`).join('')}</div><div class="route-floor"><span class="floor-tag"><b>${String(Math.max(3,floor-1)).padStart(2,'0')}</b>F</span><div class="route-node done"><span class="node-seal">${icon('check')}</span><span class="node-caption">已经走过</span></div></div><p class="route-caption">${j.ended?'这段行程已结束':locked?'当前节点尚待处理，完成后继续':'侦察节点，再确认这一步'}</p></section><section class="route-detail" aria-live="polite"><p class="detail-kind">${floor}F / ${n.kind}</p><h2>${n.title}</h2><p>${n.note}</p><div class="detail-row"><span>敌人生命</span><strong>${n.hp}</strong></div><div class="detail-row"><span>已知弱点</span><strong>${n.weak}</strong></div><div class="detail-row"><span>本次已完成</span><strong>${j.history.length} 个节点</strong></div>${btn(j.ended?'回顾本次行程':locked?'继续处理当前节点':n.action,j.ended?'recap':'enter')}<p class="info-note">固定示例路线，只在当前预览中推进。</p></section></div><div class="tower-tools">${btn('下塔回顾','retreat')}${btn('区层情报','intel')}</div>`;
  }
  function act(action){
    if(action.startsWith('select:')){if(model.select(action.slice(7))){render();document.querySelector(`[data-tower="${action}"]`)?.focus({preventScroll:true});}return;}
    if(action==='start'){start();return;}
    if(action==='retry'){reveal();return;}
    if(action==='route'){routeBack();return;}
    if(action==='enter'){enter();return;}
    if(['heal','buff','gaze','pass','correct','wrong'].includes(action)){choose(action);return;}
    if(action==='reveal-chest'&&page==='chest'){show('chest-open');return;}
    if(action==='claim'&&page==='chest-open'){claim();return;}
    if(action==='finish'){finish();return;}
    if(action==='retreat'){show(j.ended==='clear'?'clear':'retreat');return;}
    if(action==='descend'&&page==='retreat'){model.end('descend');showRecap();return;}
    if(action==='recap'){showRecap();return;}
    if(action==='skip-recap'){finishRecap();return;}
    if(action==='intel'){show('reveal-ready');return;}
    if(action==='finale'&&j.ended==='clear'){show('finale');return;}
    if(action==='home'){stop();page=null;api.goRoom('battle');return;}
    if(action==='back'){if(page==='recap'&&!recap.done){finishRecap();return;}if(j.ended){stop();page=null;api.goRoom('battle');}else routeBack();}
  }
  document.addEventListener('visibilitychange',()=>{if(clock)clock.last=performance.now();});
  return {screen,route,act,start,showRecap,get snapshot(){return {active:j.active,floor:j.floor,ended:j.ended};},get active(){return j.active;},get page(){return page;},get pendingBattle(){return j.active&&['mob','boss'].includes(j.pending?.kind)&&!j.pending.resolved&&!j.ended;},
    hide(){stop();page=null;},recordLoot(){return model.addLoot();},
    battleReturn(won,phase){if(!this.pendingBattle)return;if(won){model.resolve({label:'战斗胜利',detail:'击破了挡路的阴影。',type:'battle'});model.advance();if(j.ended==='clear')page='clear';}else{j.pending.battleState={enemyHp:j.pending.kind==='boss'?state.enemyHp:312,stagger:j.pending.kind==='boss'?state.stagger:0,turn:state.turn,phase:j.pending.kind==='boss'?phase:1};page=null;}},
    defeat(){model.end('defeat');show('defeat');},
  };
}
