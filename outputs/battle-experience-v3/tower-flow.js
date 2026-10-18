import {towerNodes} from './tower-journey.js';
import {createDungeonRun} from './dungeon-run.js';
import {ITEM_DEFS} from './economy-rules.js';
import {fuse,skillName,ARCANA_LABELS,itemize,lockdown,register,sacrifice,withdraw,specialFuse,specialRecipes,materialEntries} from './velvet-rules.js';
import {getPersona} from './p5r-compendium.js';
import {buildBattlePersona,setPersonaOverride} from './p5-combat-rules.js';
import {formatCountdown,formatShadowTimeRange,nextShadowTime,shadowTimeStatus} from './shadow-time.js';
import {awakeningSummary,canEnterTower} from './awakening-state.js';
import {EQUIPMENT,SLOT_LABELS,equipItem,equipmentBonuses,equipmentRows,unequipItem} from './equipment.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

export function createTowerFlow(api){
  const {state,icon,render,reduced}=api,model=createDungeonRun(),j=model.journey;
  const debugMode=new URLSearchParams(location.search).get('p5r-debug')==='1';
  const initialVitals={hp:state.hp,sp:state.sp};
  let page=null,receipt=null,clock=null,raf=0,serial=0,recap=null;
  let interlude=null,shopReturn='interlude',shopMessage='',prepMessage='',fusionPreview=null,fusionMessage='',specialPreview=null,specialMessage='',velvetService='fusion',velvetMessage='',velvetReturn='return';
  const btn=(label,action,note='',disabled=false)=>`<button class="flow-button" data-tower="${action}" ${disabled?'disabled':''}><span>${label}${note?`<small>${note}</small>`:''}</span>${icon('arrow')}</button>`;
  const frame=(title,en,body)=>`<section class="experience-scene tower-scene" data-tower-scene="${page}"><button class="flow-return" data-tower="back">${icon('back')}<span>返回<small>RETURN</small></span></button><div class="scene-ghost" aria-hidden="true">${en}</div><div class="scene-heading"><h1>${title}</h1><span>${en}</span></div>${body}</section>`;
  function stop(){cancelAnimationFrame(raf);clock=null;serial++;}
  const money=()=>Number(state.money)||0;
  const personaName=id=>getPersona(id)?.name??id;
  const rosterIds=()=>[...new Set(state.personaRoster??[])].filter(id=>Boolean(getPersona(id)));
  const SHOP_STOCK=['painkiller','sportsDrink','energyDrink','revive'];
  function captureParty(){
    return (state.battleView?.party??[]).map(member=>({
      id:member.id,name:member.name,isPlayer:Boolean(member.isPlayer),
      hp:member.hp,maxHp:member.maxHp,sp:member.sp,maxSp:member.maxSp,
    }));
  }
  function restParty(){
    if(!interlude||interlude.rested)return;
    const party=interlude.party??[];
    for(const member of party){
      if(member.isPlayer){
        state.hp=Math.min(member.maxHp,state.hp+Math.max(1,Math.ceil(member.maxHp*.3)));
        state.sp=Math.min(member.maxSp,state.sp+Math.max(1,Math.ceil(member.maxSp*.3)));
        continue;
      }
      const vitals=state.partyVitals?.[member.id];
      if(!vitals)continue;
      vitals.hp=Math.min(member.maxHp,(Number(vitals.hp)||0)+Math.max(1,Math.ceil(member.maxHp*.3)));
      vitals.sp=Math.min(member.maxSp,(Number(vitals.sp)||0)+Math.max(1,Math.ceil(member.maxSp*.3)));
    }
    interlude.rested=true;
    api.persistP5State?.();
    render({focus:true});
  }
  function buyItem(id){
    const item=ITEM_DEFS[id];
    if(!item)return;
    const price=Number(item.price)||0;
    if(money()<price){shopMessage=`钱不够（需要 ¥${price}）。`;render();return;}
    state.money-=price;
    state.battleItems[id]=(Number(state.battleItems?.[id])||0)+1;
    shopMessage=`买下 ${item.name} ×1（¥${price}）。`;
    api.persistP5State?.();
    render({focus:true});
  }
  function buyEquipment(id){
    const item=EQUIPMENT[id];
    if(!item||item.price<=0)return;
    if(state.ownedEquipment.includes(id)){shopMessage='这件装备已经在手里。';render();return;}
    if(money()<item.price){shopMessage=`钱不够（需要 ¥${item.price}）。`;render();return;}
    state.money-=item.price;
    state.ownedEquipment=[...state.ownedEquipment,id];
    shopMessage=`买下 ${item.name}（¥${item.price}）。去装备页换上。`;
    api.persistP5State?.();
    render({focus:true});
  }
  function previewFusion(){
    const a=document.querySelector('#velvet-a')?.value;
    const b=document.querySelector('#velvet-b')?.value;
    if(!a||!b){fusionMessage='先选择两张面具。';fusionPreview=null;render();return;}
    const result=fuse(a,b);
    if(!result.ok){fusionMessage=result.reason;fusionPreview=null;render();return;}
    fusionMessage='';
    fusionPreview={...result,a,b};
    render({focus:true});
  }
  function confirmFusion(){
    if(!fusionPreview)return;
    const cost=Number(fusionPreview.cost)||0;
    if(money()<cost){fusionMessage=`钱不够（需要 ¥${cost}）。`;fusionPreview=null;render();return;}
    state.money-=cost;
    api.addPersonaToRoster?.(fusionPreview.persona.id);
    api.persistP5State?.();
    fusionMessage=`${fusionPreview.persona.name} 已进入面具名录。`;
    fusionPreview=null;
    render({focus:true});
  }
  function previewSpecial(resultId){
    const recipe=specialRecipes(rosterIds()).find(entry=>entry.resultId===resultId);
    if(!recipe){specialMessage='这张特殊配方不在图鉴里。';specialPreview=null;render();return;}
    const missing=recipe.sources.filter(source=>!source.owned);
    specialPreview={
      resultId:recipe.resultId,
      result:recipe.result,
      sources:recipe.sources,
      cost:recipe.cost,
      ready:recipe.ready&&!recipe.resultOwned,
    };
    specialMessage=recipe.resultOwned
      ?`${recipe.result.name} 已经在面具名录里。`
      :recipe.ready?'':`还缺 ${missing.map(source=>source.name).join('、')}。`;
    render({focus:true});
  }
  function confirmSpecial(){
    if(!specialPreview)return;
    const recipe=specialRecipes(rosterIds()).find(entry=>entry.resultId===specialPreview.resultId);
    if(!recipe){specialMessage='这张特殊配方不在图鉴里。';specialPreview=null;render();return;}
    if(recipe.resultOwned){specialMessage=`${recipe.result.name} 已经在面具名录里。`;render();return;}
    if(!recipe.ready){
      specialMessage=`还缺 ${recipe.sources.filter(source=>!source.owned).map(source=>source.name).join('、')}。`;
      render();return;
    }
    const result=specialFuse(recipe.sourceIds);
    if(!result.ok){specialMessage=result.reason;render();return;}
    if(money()<result.cost){specialMessage=`钱不够（需要 ¥${result.cost}）。`;render();return;}
    state.money-=result.cost;
    api.addPersonaToRoster?.(result.persona.id);
    api.persistP5State?.();
    specialMessage=`${result.persona.name} 已通过特殊融合进入面具名录（¥${result.cost}）。`;
    specialPreview=null;
    render({focus:true});
  }
  function velvetPersona(id){
    const persona=buildBattlePersona(id);
    if(!persona)return null;
    return {...persona,stats:{hp:persona.maxHp,sp:persona.maxSp,attack:persona.attack,defense:persona.defense}};
  }
  function applyOverride(id,persona){
    if(!persona)return;
    const previous=state.personaOverrides?.[id]??{};
    const stats={...previous.stats};
    const source=persona.stats??{};
    for(const key of ['hp','sp','attack','defense']){
      const value=source[key]??persona[key==='hp'?'maxHp':key==='sp'?'maxSp':key];
      if(Number.isFinite(value))stats[key]=value;
    }
    const override={level:persona.level??previous.level,stats};
    state.personaOverrides={...(state.personaOverrides??{}),[id]:override};
    setPersonaOverride(id,override);
  }
  function gallowsExec(){
    const baseId=document.querySelector('#vg-base')?.value;
    const fodderId=document.querySelector('#vg-fodder')?.value;
    if(!baseId||!fodderId||baseId===fodderId){velvetMessage='选择两个不同的面具。';render();return;}
    const base=velvetPersona(baseId),fodder=velvetPersona(fodderId);
    if(!base||!fodder){velvetMessage='图鉴里没有这张面具。';render();return;}
    const result=sacrifice(base,fodder);
    if(!result.ok){velvetMessage=result.reason;render();return;}
    if(!api.removePersonaFromRoster?.(fodderId)){velvetMessage='基础契约面具不能被献祭；请选择后来获得的面具。';render();return;}
    applyOverride(baseId,result.persona);
    velvetMessage=`${fodder.name} 被献祭，${base.name} 升到 Lv.${result.persona.level}。`;
    api.persistP5State?.();
    render({focus:true});
  }
  function chairExec(){
    const id=document.querySelector('#vc-persona')?.value;
    const persona=velvetPersona(id);
    if(!persona){velvetMessage='图鉴里没有这张面具。';render();return;}
    const result=itemize(persona);
    if(!result.ok){velvetMessage=result.reason;render();return;}
    if(!api.removePersonaFromRoster?.(id)){velvetMessage='基础契约面具不能送上电椅；请选择后来获得的面具。';render();return;}
    state.materials={...(state.materials??{}),[result.itemId]:(Number(state.materials?.[result.itemId])||0)+result.qty};
    velvetMessage=`${persona.name} 坐上电椅，留下 ${result.itemLabel??result.itemId} ×${result.qty}。`;
    api.persistP5State?.();
    render({focus:true});
  }
  function lockdownExec(stat){
    const id=document.querySelector('#vl-persona')?.value;
    const persona=velvetPersona(id);
    if(!persona){velvetMessage='图鉴里没有这张面具。';render();return;}
    const cost=800;
    if(money()<cost){velvetMessage=`钱不够（需要 ¥${cost}）。`;render();return;}
    const result=lockdown(persona,stat);
    if(!result.ok){velvetMessage=result.reason;render();return;}
    state.money-=cost;
    applyOverride(id,result.persona);
    velvetMessage=`${result.message}（¥${cost}）`;
    api.persistP5State?.();
    render({focus:true});
  }
  function compendiumRegister(){
    const id=document.querySelector('#vcp-persona')?.value;
    const source=getPersona(id),built=buildBattlePersona(id);
    if(!source||!built){velvetMessage='图鉴里没有这张面具。';render();return;}
    const effective={...source,level:built.level,stats:{...source.stats,hp:built.maxHp,sp:built.maxSp,attack:built.attack,defense:built.defense},skills:source.skills};
    register(state.compendium,effective);
    velvetMessage=`${source.name} · Lv.${built.level} 已登记进图鉴。`;
    api.persistP5State?.();
    render({focus:true});
  }
  function withdrawPersona(id){
    const wallet={money:money()};
    const result=withdraw(state.compendium,id,wallet);
    if(!result.ok){velvetMessage=result.reason;render();return;}
    state.money=wallet.money;
    applyOverride(result.persona.id,result.persona);
    api.addPersonaToRoster?.(result.persona.id);
    velvetMessage=`从图鉴取回 ${result.persona.name}（¥${result.cost}）。`;
    api.persistP5State?.();
    render({focus:true});
  }
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
  function debugJump(floor,selected='mob'){
    j.active=true;
    j.floor=Math.max(0,Math.min(j.maxFloor-1,Number(floor)-1));
    j.pending=null;
    j.selected=selected;
    j.ended=null;
    page=null;
    api.goRoom('tower');
  }
  function start(error=false){
    model.start();
    Object.assign(state,initialVitals);
    receipt=null;interlude=null;shopReturn='interlude';shopMessage='';prepMessage='';
    fusionPreview=null;fusionMessage='';specialPreview=null;specialMessage='';
    velvetService='fusion';velvetMessage='';velvetReturn='prep';
    if(error){reveal(true);return;}
    show('prep');
  }
  function enter(){
    const pending=j.pending??model.enter();if(!pending)return;
    if(pending.resolved){receipt=pending.result;show('receipt');return;}
    if(['mob','elite','boss'].includes(pending.kind)){
      page=null;api.startFight(pending.kind==='boss',pending.battleState,pending.encounter,pending.floor);return;
    }
    show(pending.kind);
  }
  function choose(action){
    if(!j.pending||j.pending.resolved)return;
    const kind=j.pending.kind;let result;
    if(kind==='echo'&&action==='heal'){
      const before=state.hp,max=state.heroMaxHp??52;state.hp=Math.min(max,state.hp+Math.max(1,Math.round(max*.2)));result={label:'沐浴月光',detail:`HP ${before} → ${state.hp} / ${max}`,type:'heal'};
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
    const max=state.heroMaxSp??34;if(model.addLoot())state.sp=Math.min(max,state.sp+10);
    const result={label:'月匣已收下',detail:`回响之线 ×1 · +10 SP，当前 ${state.sp} / ${max}`,type:'chest'};
    model.resolve(result);receipt=result;show('receipt');
  }
  function finish(){
    if(!model.advance())return;
    if(j.ended==='clear')show('clear');else routeBack();
  }
  function summary(){
    const history=j.active?j.history:[],battles=history.filter(e=>['mob','elite','boss'].includes(e.kind)).length;
    const lootText=j.loot.length?j.loot.map(item=>item.label).join(' / '):'暂无';
    return `<div class="recap-summary" ${recap?.done?'':'hidden'}><h2>${j.ended==='clear'?'塔顶。':'本夜行程结束。'}</h2><div class="recap-list"><div><span>完成战斗</span><strong>${battles} 场</strong></div><div><span>完成节点</span><strong>${history.length} 处</strong></div><div><span>收下的战利品</span><strong>${lootText}</strong></div><div><span>带走的力量</span><strong>${j.buffs.length?j.buffs.join(' · '):'本夜无增益'}</strong></div></div><ol class="journey-record">${history.map(e=>`<li><b>${String(e.floor).padStart(2,'0')}F</b><span>${towerNodes[e.kind].title}<small>${e.label} · ${e.detail}</small></span></li>`).join('')||'<li>这次还没有完成新的节点。</li>'}</ol>${btn('回到战场','home')}${j.ended==='clear'?btn('走向终局','finale'):''}<p class="scene-note">本次从 1F 接续。</p></div>`;
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
  function shadowState(){
    const forced=new URLSearchParams(location.search).get('shadow');
    if(forced==='1'||forced==='0'){
      const base=shadowTimeStatus(new Date());
      return {...base,active:forced==='1',nextStart:forced==='1'?null:nextShadowTime(new Date())};
    }
    return shadowTimeStatus(new Date());
  }
  function prepPage(){
    const shadow=shadowState(),roster=rosterIds(),materialCount=materialEntries(state.materials).reduce((sum,item)=>sum+item.qty,0);
    const awakened=Boolean(state.personaCreated);
    const canEnter=canEnterTower({shadowActive:shadow.active,personaCreated:awakened});
    const gateTitle=!awakened?'面具还没有回应':shadow.active?'塔门已开启':'影时间尚未降临';
    const gateCopy=!awakened?'影时间不替你做决定。先完成觉醒，塔门才会打开。':shadow.active?'进入后不能购物或融合；安全屋只负责休息和返回。':'据点随时可以整理。等到影时间降临，塔门才会回应。';
    const nextText=!awakened?'先完成觉醒':shadow.active?'影时间正在流淌':shadow.nextStart?`下次开启还有 ${formatCountdown(shadow.nextStart.getTime()-Date.now())}`:'等待影时间';
    const contract=awakeningSummary(state.personaAwakening);
    const card=(title,note,tag,action)=>`<article class="night-base-card"><span>${tag}</span><h3>${title}</h3><p>${note}</p><button type="button" data-tower="${action}">进入</button></article>`;
    const awakenBanner=awakened?'':`<div class="night-base-awaken"><div><span>FIRST CONTRACT</span><h3>还没有面具回应你。</h3><p>四道问题，一段自述。等你说完，它才会开口。</p></div><button type="button" data-tower="prep-awaken">回应它</button></div>`;
    return frame('影时间据点。','DARK HOUR BASE',`<div class="night-base"><section class="night-base-head"><span class="slash-label">DARK HOUR / PREPARATION</span><h2>${shadow.active?'影时间，正在流淌。':'影时间，还没有降临。'}</h2><p>${shadow.active?'商店和天鹅绒房间都在塔外。整理好队伍，再从塔门进入。':'准备可以随时进行；只有塔门会在影时间开启。'}</p><div class="night-base-window"><span>${esc(formatShadowTimeRange())}</span><b>${nextText}</b></div></section><div class="night-base-stats"><div><span>持有</span><b>¥${money().toLocaleString()}</b></div><div><span>面具</span><b>${roster.length}</b><small>张</small></div><div><span>契约</span><b>${esc(contract)}</b></div><div><span>素材</span><b>${materialCount}</b><small>件</small></div></div>${awakenBanner}<section class="night-base-grid">${card('天鹅绒房间','融合、处刑、电椅、禁闭、图鉴与素材。','VELVET ROOM','prep-velvet')}${card('月见坂补给','战斗道具、复活针与 SP 饮料。','SUPPLY','prep-shop')}${card('装备','武器、防具与饰品。','GEAR','prep-gear')}${card('队伍与 Persona','查看面具名录，调整契约与同行编成。','PERSONA','prep-persona')}</section><div class="night-base-gate ${canEnter?'is-open':'is-closed'}"><div><span>TOWER GATE</span><h3>${gateTitle}</h3><p>${gateCopy}</p></div>${btn(canEnter?'踏上高塔':!awakened?'等待觉醒':'等待影时间','enter-tower','',!canEnter)}</div>${prepMessage?`<p class="shop-message">${esc(prepMessage)}</p>`:''}<div class="night-base-foot">${btn('离开据点，回到战场','home')}</div></div>`);
  }
  function interludePage(){
    const reward=interlude?.reward;
    return frame('战后，喘口气。','SAFEHOUSE',`<div class="safehouse-layout"><section class="safehouse-copy"><span class="slash-label">SAFEHOUSE / AFTER BATTLE</span><h2>${esc(interlude?.battle?.summary??'挡路的影子散了。')}</h2><p>这一层已经完成。安全屋只负责休息；补给和融合回据点再做。</p>${reward?`<p class="safehouse-reward">战斗奖励 ¥${reward.money}${reward.items.length?` · ${esc(reward.items.join(' / '))}`:''}${reward.sp?` · SP +${reward.sp}`:''}</p>`:''}<div class="safehouse-stats"><div><span>HP</span><b>${state.hp}</b><small>/ ${state.heroMaxHp??52}</small></div><div><span>SP</span><b>${state.sp}</b><small>/ ${state.heroMaxSp??34}</small></div><div><span>持有</span><b>¥${money().toLocaleString()}</b></div><div><span>战利品</span><b>${state.battleLoot?.length??0}</b><small>件</small></div></div></section><section class="safehouse-actions">${btn(interlude?.rested?'已休息':'安全屋休息','rest','恢复 30% HP / SP',interlude?.rested)}${btn('继续向上','continue','回到路线，显示下一层')}${btn('回到据点','prep-return','补给、融合、编成')}</section></div>`);
  }
  function shopPage(){
    const backLabel=shopReturn==='return'?'回到回城':shopReturn==='prep'?'回到据点':'回到安全屋';
    return frame('月见坂补给。','SUPPLY',`<div class="shop-layout"><div class="shop-head"><span>月见坂补给</span><b>¥${money().toLocaleString()}</b></div><div class="shop-list">${SHOP_STOCK.map(id=>{const item=ITEM_DEFS[id];if(!item)return '';const qty=Number(state.battleItems?.[id])||0;return `<article class="shop-row"><div class="shop-item"><h3>${esc(item.name)}</h3><p>${esc(item.desc)}</p></div><div class="shop-meta"><b>¥${item.price}</b><small>持有 ${qty}</small></div><button class="small-button" data-tower="buy:${id}" ${money()<item.price?'disabled':''}>购买</button></article>`;}).join('')}</div><div class="shop-gear"><h3>装备</h3>${Object.values(EQUIPMENT).filter(item=>item.price>0).map(item=>{const owned=state.ownedEquipment.includes(item.id);return `<article class="shop-row"><div class="shop-item"><h3>${esc(item.name)}</h3><p>${esc(item.desc)}</p></div><div class="shop-meta"><b>¥${item.price}</b><small>${SLOT_LABELS[item.slot]}${owned?' · 已拥有':''}</small></div><button class="small-button" data-tower="buy-equipment:${item.id}" ${owned||money()<item.price?'disabled':''}>${owned?'已拥有':'购买'}</button></article>`;}).join('')}</div>${shopMessage?`<p class="shop-message">${esc(shopMessage)}</p>`:''}<div class="shop-actions">${btn(backLabel,'shop-back')}${shopReturn==='interlude'?btn('继续向上','continue'):''}</div></div>`);
  }
  function gearPage(){
    const rows=equipmentRows(state.equipment),bonuses=equipmentBonuses(state.equipment);
    return frame('装备。','GEAR',`<div class="gear-page"><section class="gear-summary"><span class="slash-label">LOADOUT / EQUIPMENT</span><h2>带进塔里的东西。</h2><p>武器、防具和饰品只加攻防与 HP/SP，不改变 Persona 的技能和耐性。</p><div class="gear-bonuses"><span>攻击 <b>+${bonuses.attack}</b></span><span>防御 <b>+${bonuses.defense}</b></span><span>HP <b>+${bonuses.hp}</b></span><span>SP <b>+${bonuses.sp}</b></span></div></section><div class="gear-slots">${rows.map(row=>{const owned=state.ownedEquipment.map(id=>EQUIPMENT[id]).filter(item=>item&&item.slot===row.slot);return `<article class="gear-slot"><header><span>${row.label}</span><b>${row.item?esc(row.item.name):'未装备'}</b></header>${row.item?`<p>${esc(row.item.desc)}</p><small>攻 +${row.item.attack} · 防 +${row.item.defense} · HP +${row.item.hp} · SP +${row.item.sp}</small>${btn('卸下',`unequip:${row.slot}`)}`:'<p>这个位置还空着。</p>'}<div class="gear-owned">${owned.map(item=>`<button type="button" data-tower="equip:${item.id}" ${state.equipment[row.slot]===item.id?'disabled':''}>${esc(item.name)}<small>${state.equipment[row.slot]===item.id?'装备中':`攻 +${item.attack} · 防 +${item.defense}`}</small></button>`).join('')||'<span>还没有这个位置的装备。</span>'}</div></article>`;}).join('')}</div><div class="gear-foot">${btn('回到据点','prep-return')}</div></div>`);
  }
  function returnPage(){
    return frame('回城。','RETURN',`<div class="return-layout"><section class="return-copy"><span class="slash-label">DARK HOUR / RETURN</span><h2>影时间退去。</h2><p>Boss 已经被击破。把这一夜带回据点，再做补给和融合。</p><div class="return-stats"><div><span>持有</span><b>¥${money().toLocaleString()}</b></div><div><span>面具</span><b>${rosterIds().length}</b><small>张</small></div><div><span>战利品</span><b>${state.battleLoot?.length??0}</b><small>件</small></div><div><span>完成节点</span><b>${j.history.length}</b></div></div></section><section class="return-actions">${btn('回到影时间据点','prep-return','补给、融合与编成')}${btn('回到战场','home')}</section></div>`);
  }
  function velvetPage(){
    const roster=rosterIds();
    const select=(id,selectedIndex)=>`<select id="${id}" class="velvet-select">${roster.map((pid,index)=>`<option value="${pid}" ${index===selectedIndex?'selected':''}>${esc(personaName(pid))}</option>`).join('')}</select>`;
    const preview=fusionPreview;
    const quote={
      fusion:'两个名字关进同一间牢房，剩下的那个，才是结果。',
      gallows:'献祭不是结束，是另一种加法。',
      chair:'坐上电椅。别担心，它比你更疼。',
      lockdown:'锁上门。等它学会你想要的样子。',
      compendium:'名字留下了。下一次，它会记得你。',
      special:'特别的名字，需要特别的配方。',
      materials:'坐过电椅的东西，都会留下一点自己。',
      skill:'牌还没有印好。',
    }[velvetService]??'今天想怎么处置这些面具？';
    const services=[['fusion','融合','FUSION'],['gallows','处刑','GALLOWS'],['chair','电椅','CHAIR'],['lockdown','禁闭','LOCKDOWN'],['compendium','图鉴','COMPENDIUM'],['special','特殊融合','SPECIAL'],['materials','素材','ITEMS'],['skill','技能卡','SKILL CARD']];
    const compendiumEntries=state.compendium?.entries??[];
    const recipes=specialRecipes(roster);
    const materialList=materialEntries(state.materials);
    const backLabel=velvetReturn==='prep'?'回到据点':'回到回城';
    const panel=()=>{
      if(velvetService==='fusion')return `<h2>双体融合 / FUSION</h2><p>选择两张面具，把它们关进同一间牢房。结果只来自 P5R 图鉴。</p><div class="vr-selects"><label>面具 A${select('velvet-a',0)}</label><span>×</span><label>面具 B${select('velvet-b',1)}</label></div>${btn('预览融合','preview-fusion')}${preview?`<div class="vr-result"><h3>${esc(preview.persona.name)}</h3><p>Lv.${preview.persona.level} · ${esc(ARCANA_LABELS[preview.persona.arcana]??preview.persona.arcana)} · ${preview.persona.skills.length} 个技能</p><p>${preview.persona.skills.slice(0,4).map(id=>esc(skillName(id))).join(' · ')}</p>${btn(`确认融合 · ¥${preview.cost}`,'confirm-fusion')}</div>`:''}`;
      if(velvetService==='gallows')return `<h2>处刑 / GALLOWS</h2><p>献祭一个后来获得的面具，让另一个升级。基础契约面具不可处刑。</p><div class="vr-selects"><label>保留的面具${select('vg-base',0)}</label><span>←</span><label>被献祭的面具${select('vg-fodder',1)}</label></div><button class="vr-action danger" data-tower="gallows-exec">执行绞刑</button>`;
      if(velvetService==='chair')return `<h2>电椅 / ELECTRIC CHAIR</h2><p>把面具变成材料。基础契约面具不可物品化。</p><div class="vr-selects"><label>送上电椅${select('vc-persona',0)}</label></div><button class="vr-action danger" data-tower="chair-exec">确认物品化</button>`;
      if(velvetService==='lockdown')return `<h2>禁闭 / LOCKDOWN</h2><p>把面具关起来训练一个属性，费用 ¥800。</p><div class="vr-selects"><label>训练对象${select('vl-persona',0)}</label></div><div class="vr-lockdown-actions">${[['hp','HP'],['sp','SP'],['attack','攻击'],['defense','防御']].map(([stat,label])=>`<button data-tower="lockdown-exec:${stat}">训练 ${label}</button>`).join('')}</div>`;
      if(velvetService==='compendium')return `<h2>图鉴 / COMPENDIUM</h2><p>登记当前面具，或花等级 × 300 取回。</p><div class="vr-selects"><label>登记面具${select('vcp-persona',0)}</label></div><button class="vr-action" data-tower="compendium-register">登记进图鉴</button><div class="vr-compendium">${compendiumEntries.length?compendiumEntries.map(persona=>`<button data-tower="withdraw:${persona.id}"><span>${esc(persona.name)} · Lv.${persona.level}</span><b>¥${persona.level*300}</b></button>`).join(''):'<p>图鉴还是空的。先登记一张面具。</p>'}</div>`;
      if(velvetService==='special'){
        const preview=specialPreview;
        return `<h2>特殊融合 / SPECIAL FUSION</h2><p>按 P5R 特殊配方组合多张面具。素材必须已在名录中，结果只来自图鉴。共 ${recipes.length} 条，可滚动查看；本预览不消耗素材面具。</p>${preview?`<div class="vr-result vr-special-result"><h3>${esc(preview.result.name)}</h3><p>Lv.${preview.result.level} · ${esc(ARCANA_LABELS[preview.result.arcana]??preview.result.arcana)} · 素材 ${preview.sources.length} 张 · ¥${preview.cost}</p><p>${preview.sources.map(source=>`${esc(source.name)}${source.owned?' ✓':' ✗'}`).join(' · ')}</p>${preview.ready?btn(`确认特殊融合 · ¥${preview.cost}`,'confirm-special'):`<p class="vr-missing">${preview.sources.every(source=>source.owned)?'结果已在面具名录中。':'集齐素材后才能确认。'}</p>`}</div>`:''}<div class="vr-recipes" aria-label="特殊融合配方">${recipes.map(recipe=>`<button class="vr-recipe ${recipe.ready&&!recipe.resultOwned?'ready':''}" data-tower="special-recipe:${recipe.resultId}"><span class="vr-recipe-main"><b>${esc(recipe.result.name)}</b><small>Lv.${recipe.result.level} · ${esc(ARCANA_LABELS[recipe.result.arcana]??recipe.result.arcana)}</small></span><span class="vr-recipe-state">${recipe.resultOwned?'已在名录':recipe.ready?'可融合':`缺 ${recipe.missing} 张`}</span><span class="vr-recipe-sources">${recipe.sources.map(source=>`<span class="${source.owned?'owned':'missing'}">${esc(source.name)}${source.owned?' ✓':' ✗'}</span>`).join('<i> / </i>')}</span></button>`).join('')}</div>`;
      }
      if(velvetService==='materials'){
        return `<h2>素材 / MATERIALS</h2><p>电椅留下的技能卡与装备会收在这里。</p>${materialList.length?`<div class="vr-materials">${materialList.map(item=>`<article class="vr-material"><span class="vr-material-tag">${item.category==='skill-card'?'技能卡':item.category==='equipment'?'装备':'素材'}</span><b>${esc(item.label)}</b><span class="vr-material-qty">×${item.qty}</span><small>${item.sourceNames.length?`来源 · ${esc(item.sourceNames.slice(0,2).join(' / '))}${item.sourceNames.length>2?' 等':''}`:'电椅产物'}</small></article>`).join('')}</div>`:'<div class="vr-empty"><b>还没有素材。</b><p>把后来获得的面具送上电椅，产物会存入这里。</p></div>'}`;
      }
      return `<h2>技能卡 / LOCKED</h2><div class="vr-locked"><b>SKILL CARD</b><p>需要网络或剧情解锁的技能卡功能。入口先留在这里。</p></div>`;
    };
    return `<div class="velvet-room" data-velvet-service="${velvetService}"><div class="vr-bars" aria-hidden="true"></div><div class="vr-curtain vr-curtain-left" aria-hidden="true"></div><div class="vr-curtain vr-curtain-right" aria-hidden="true"></div><div class="vr-moon" aria-hidden="true"></div><div class="vr-spot" aria-hidden="true"></div><header class="vr-top"><button class="vr-back" data-tower="return-back">← ${backLabel}</button><div class="vr-title"><span>VELVET ROOM</span><h1>天鹅绒房间</h1><p>“${esc(quote)}”</p></div><div class="vr-wallet">¥${money().toLocaleString()}</div></header><div class="vr-layout"><nav class="vr-menu" aria-label="天鹅绒房间服务">${services.map(([id,label,en])=>`<button class="${velvetService===id?'active':''}" data-tower="velvet-service:${id}"><small>${en}</small><b>${label}</b></button>`).join('')}</nav><main class="vr-panel">${panel()}${velvetMessage?`<p class="vr-message">${esc(velvetMessage)}</p>`:''}${fusionMessage?`<p class="vr-message">${esc(fusionMessage)}</p>`:''}${specialMessage?`<p class="vr-message">${esc(specialMessage)}</p>`:''}</main><aside class="vr-side"><div class="vr-slot"><b>P5-VR-A</b><span>双子看守</span><small>900×1200 · 透明 PNG</small></div><div class="vr-slot"><b>P5-VR-B</b><span>房间背景</span><small>1600×900 · 透明 PNG</small></div><blockquote>“${esc(quote)}”</blockquote></aside></div><button class="vr-exit" data-tower="velvet-exit">离开房间 · ${backLabel}</button></div>`;
  }
  function screen(){
    if(!page)return null;
    if(page==='prep')return prepPage();
    if(page==='interlude')return interludePage();
    if(page==='shop')return shopPage();
    if(page==='gear')return gearPage();
    if(page==='return')return returnPage();
    if(page==='velvet')return velvetPage();
    if(page.startsWith('reveal'))return frame(page==='reveal-error'?'雾还没有散开。':'听见塔层，缓缓显形。','STRATUM',`<div class="reveal-layout ${page==='reveal-ready'?'ready':''}"><div class="tower-silhouette" aria-hidden="true"><i></i><i></i><i></i><i></i></div><div><span class="stratum-number">03<span>STRATUM</span></span><h2>${page==='reveal-error'?'显形暂时中断':page==='reveal-ready'?'回声之庭':'正在显形…'}</h2><p class="scene-copy">${page==='reveal-error'?'已走过的路还在，重新显形后继续。':'从 1F 接续这一次探索。先侦察前路，再作选择。'}</p>${page==='reveal-error'?btn('重新显形','retry'):btn(page==='reveal-ready'?'踏入高塔':'跳过显形，进入高塔','route')}<p class="scene-note">路线只在本夜生效。</p></div></div>`);
    if(page==='recap')return frame('塔层回看。','TONIGHT / RETURN',`<div class="recap-ascent ${recap.done?'is-settled':''}" data-floor="${recap.shown||1}" data-target="${recap.target}"><div class="recap-moon" aria-hidden="true"></div><div class="recap-counter"><b>${String(recap.shown||1).padStart(2,'0')}</b><span>FLOOR</span></div><div class="recap-floor-window" aria-label="逐层回望">${recapRows(recap.shown||1)}</div><p class="recap-arrival" role="status">${recap.done?`本次抵达 ${String(recap.target).padStart(2,'0')}F`:'从抵达层向下回看。'}</p></div>${!recap.done?btn('跳过回望','skip-recap','直接抵达抵达层'):''}${summary()}`);
    if(page==='retreat')return frame('今晚，走到这里？','DESCEND',`<div class="story-layout"><div class="scene-emblem">${icon('back')}</div><div><h2>你已抵达 ${j.floor}F。</h2><p class="scene-copy">${j.pending&&!j.pending.resolved?'当前节点尚未完成；下塔回顾会停在本次抵达层。':'战利品会留在本夜记录里。'}</p>${btn('继续探索','route','回到刚才的位置')}${btn('确认下塔，回望来路','descend','结束本夜行程')}</div></div>`);
    if(page==='receipt')return frame('每一步，都留下回声。','AFTER THE ECHO',`<div class="story-layout"><div class="scene-emblem">${icon('check')}</div><div><h2>${receipt.label}</h2><p class="scene-copy">${receipt.detail}</p><div class="effect-receipt">${icon('tower')}<span>${j.floor}F · 此节点已完成</span></div>${btn(j.floor===j.maxFloor?'看看这段路':'继续向上','finish',j.floor===j.maxFloor?'区层通关':'返回路线，显示下一层')}<p class="scene-note">每个节点的选择只结算一次。</p></div></div>`);
    if(page==='echo')return frame('在这里，停一会儿。','MOON ECHO',`<div class="story-layout"><div class="scene-emblem">${icon('star')}</div><div><h2>月光回响</h2><p class="scene-copy">这一次选择，只回应你一次。</p><div class="echo-preview"><span>HP <b>${state.hp} → ${Math.min(state.heroMaxHp??52,state.hp+Math.max(1,Math.round((state.heroMaxHp??52)*.2)))}</b> / ${state.heroMaxHp??52}</span><span>或带走 <b>月辉 +6%</b></span></div>${btn('沐浴月光','heal','回复 20% 体力')}${btn('汲取月辉','buff','本次登塔伤害 +6%')}</div></div>`);
    if(page==='event')return frame('另一条路，正在回应。','ENCOUNTER',`<div class="story-layout"><div class="scene-emblem">${icon('eye')}</div><div><h2>月光积水</h2><p class="scene-copy">塔层的凹陷处积着一汪月光色的水，水面映出的不是你的脸。</p>${btn('凝视水面','gaze','靠近，听见水中的回答')}${btn('绕开路过','pass','保留气力，继续向上')}</div></div>`);
    if(page==='quiz')return frame('还记得那时候吗？','REFLECTION',`<div class="story-layout"><div class="scene-emblem">${icon('eye')}</div><div><h2>镜之自问</h2><blockquote class="journey-quote">面对那件一直回避的事，我还是迈出了一步。</blockquote><p class="scene-copy">这是哪一种来自白昼的力量？</p>${btn('勇气','correct')}${btn('灵巧','wrong')}${btn('体贴','wrong')}<p class="scene-note">虚构片段，不读取你的真实记录。</p></div></div>`);
    if(page==='safe')return frame('门合上了。','SAFE ROOM',`<div class="story-layout"><div class="scene-emblem">${icon('shield')}</div><div><h2>${j.floor}F · 安全屋</h2><p class="scene-copy">影子暂时找不到这里。可以休息一次，把警戒压回去。</p><div class="safehouse-stats"><div><span>HP</span><b>${state.hp}</b><small>/ ${state.heroMaxHp??52}</small></div><div><span>SP</span><b>${state.sp}</b><small>/ ${state.heroMaxSp??34}</small></div><div><span>警戒</span><b>${j.security}%</b></div><div><span>钥匙</span><b>${j.keys}</b><small>把</small></div></div>${btn(j.pending?.rested?'已经休息过':'休息一次','safe-rest','压回 20% 警戒',j.pending?.rested)}${btn('继续向上','safe-continue')}</div></div>`);
    if(page==='calling')return frame('写下来。','CALLING CARD',`<div class="story-layout"><div class="scene-emblem">${icon('star')}</div><div><h2>${j.floor}F · 预告信</h2><p class="scene-copy">塔顶的执念已经察觉到你。把名字写上去，它才会从阴影里走出来。</p>${btn('送出预告信','send-calling','Boss 前置')}</div></div>`);
    if(page==='trap')return frame('脚下响了一声。','TRAP',`<div class="story-layout"><div class="scene-emblem">${icon('eye')}</div><div><h2>${j.floor}F · 机关</h2><p class="scene-copy">细线连着墙后的影子。拆开它，还是直接踩过去？</p>${btn('拆解机关','trap-disarm','警戒 -10%')}${btn('硬闯','trap-force','警戒 +15%，HP -6','danger')}</div></div>`);
    if(page==='key')return frame('锁孔在等。','KEY',`<div class="story-layout"><div class="scene-emblem">${icon('box')}</div><div><h2>${j.floor}F · 旧钥匙</h2><p class="scene-copy">钥匙上刻着上一层的编号。它不属于这里，但塔不打算解释。</p>${btn('收下钥匙','take-key',`当前 ${j.keys} 把`)}</div></div>`);
    if(page==='chest'||page==='chest-open')return frame('月光，把它留给了你。','MOON CHEST',`<div class="loot-layout ${page==='chest-open'?'is-revealed':''}"><div class="loot-object">${icon(page==='chest-open'?'star':'box')}<i></i></div><div class="loot-copy"><h2>${page==='chest-open'?'回响之线':'还有什么，等待被看见？'}</h2><p>${page==='chest-open'?'残月遗物 ×1 · 10 SP':'亲手揭开，看看这段路留下了什么。'}</p>${page==='chest-open'?`<p class="reward-sp-preview">SP ${state.sp} → ${Math.min(state.heroMaxSp??34,state.sp+10)} / ${state.heroMaxSp??34}</p>`:''}${btn(page==='chest-open'?'收下这份收获':'揭晓月匣',page==='chest-open'?'claim':'reveal-chest')}</div></div>`);
    if(page==='clear')return frame('层门已开。','STRATUM CLEAR',`<div class="story-layout"><div class="scene-emblem">${icon('tower')}</div><div><h2>回声之庭 · 通关</h2><p class="scene-copy">你抵达了 ${j.maxFloor}F，也穿过了守在塔顶的那层执念。</p>${btn('一层层回望来路','recap')}${btn('走向终局','finale')}</div></div>`);
    if(page==='defeat')return frame('今晚，先到这里。','NOT THE END',`<div class="story-layout"><div class="scene-emblem">${icon('shield')}</div><div><h2>在 ${j.floor}F，暂歇。</h2><p class="scene-copy">体力已经耗尽。这次未完成的战斗不会记作胜利；走过的路和已收下的收获仍可回顾。</p>${btn('回望今晚走过的路','recap')}${btn('回到战场','home')}</div></div>`);
    if(page==='finale')return frame('你已经走过黑夜。','BEYOND THE MASK',`<div class="finale-layout"><div class="finale-star">${icon('star')}</div><h2>面具之外，<br>仍是你自己。</h2><p class="scene-copy">把这一刻的力量，带回白昼。</p>${btn('回望这段路','recap')}${btn('回到战场','home')}</div>`);
    return null;
  }
  function route(){
    if(!j.active)model.start();
    if(j.ended)return `<div class="page-heading"><h1>登塔<span>ASCEND / 03</span></h1></div><section class="journey-ended"><div class="recap-floor"><b>${String(j.floor).padStart(2,'0')}</b><span>FLOOR</span></div><div><h2>${j.ended==='clear'?'回声之庭，已经穿过。':'今晚的行程，停在这里。'}</h2><p class="scene-copy">这一次抵达 ${j.floor}F，完成 ${j.history.length} 个节点。回看本夜记录。</p>${btn('回看本夜记录','recap')}${j.ended==='clear'?btn('走向终局','finale'):''}${btn('重新进入此层','start','清空本夜进度并重新开始')}</div></section>`;
    const floor=j.pending?j.floor:Math.min(j.maxFloor,j.floor+1),choices=model.choices(),kind=j.pending?.kind??j.selected,n=towerNodes[kind],locked=Boolean(j.pending);
    return `<div class="page-heading"><h1>登塔<span>ASCEND / 03</span></h1><p>沿着走过的路，继续向上。</p></div><div class="journey-strip"><span>回声之庭 <b>${floor} / ${j.maxFloor} F</b></span><span>HP <b>${state.hp}</b> / ${state.heroMaxHp??52}</span><span>SP <b>${state.sp}</b> / ${state.heroMaxSp??34}</span><span>警戒 <b>${j.security}%</b></span>${j.alert?'<span class="journey-alert">ALERT</span>':''}</div><div class="tower-grid"><section class="route-map journey-map" aria-label="第三区层路线图"><div class="route-watermark" aria-hidden="true">ASCEND</div><svg class="route-tracks" viewBox="0 0 600 520" preserveAspectRatio="none" aria-hidden="true"><path class="track-future" d="M300 62V180M140 306V260L300 218L460 260V306M300 218V180M300 306V218"/>${choices.map((id,i)=>{const x=choices.length===1?300:[140,300,460][i];return `<path class="track-base" d="M300 430V386L${x} 350V306"/><path class="track-live ${id===kind?'chosen':''}" pathLength="1" d="M300 430V386L${x} 350V306"/>`;}).join('')}</svg><div class="route-floor"><span class="floor-tag"><b>${j.maxFloor}</b>F</span><div class="route-node fog boss-node"><span class="node-seal">${icon('mask')}</span><span class="node-caption">心魔 · 塔顶</span></div></div><div class="route-floor"><span class="floor-tag"><b>${Math.min(j.maxFloor,floor+1)}</b>F</span><div class="route-node fog"><span class="node-seal">${icon('eye')}</span><span class="node-caption">${floor===j.maxFloor?'塔顶就在眼前':'前路尚未显现'}</span></div></div><div class="route-floor branch-floor ${choices.length===1?'single-choice':''}"><span class="floor-tag"><b>${String(floor).padStart(2,'0')}</b>F</span>${choices.map(id=>`<button class="route-node next ${kind===id?'selected':''}" data-tower="select:${id}" aria-pressed="${kind===id}" ${locked&&id!==kind?'disabled':''}><span class="node-seal">${icon(towerNodes[id].icon)}</span><span class="node-caption">${towerNodes[id].kind}</span><span class="node-hint">${locked?(id===kind?'已选择':'本层未选择'):id===kind?'查看中':'可前往'}</span></button>`).join('')}</div><div class="route-floor"><span class="floor-tag"><b>${String(Math.max(1,floor-1)).padStart(2,'0')}</b>F</span><div class="route-node done"><span class="node-seal">${icon('check')}</span><span class="node-caption">已经走过</span></div></div><p class="route-caption">${j.ended?'这段行程已结束':locked?'当前节点尚待处理，完成后继续':'侦察节点，再确认这一步'}</p></section><section class="route-detail" aria-live="polite"><p class="detail-kind">${floor}F / ${n.kind}</p><h2>${n.title}</h2><p>${n.note}</p><div class="detail-row"><span>敌人生命</span><strong>${n.hp}</strong></div><div class="detail-row"><span>已知弱点</span><strong>${n.weak}</strong></div><div class="detail-row"><span>已完成</span><strong>${j.history.length} 个节点</strong></div>${btn(j.ended?'回顾本次行程':locked?'继续处理当前节点':n.action,j.ended?'recap':'enter')}<p class="info-note">路线只在本夜生效。</p></section></div><div class="tower-tools">${btn('下塔回顾','retreat')}${btn('区层情报','intel')}</div>`;
  }
  function act(action){
    if(action==='rest'){restParty();return;}
    if(action==='continue'){page=null;routeBack();return;}
    if(action==='safe-rest'){if(model.rest())render({focus:true});return;}
    if(action==='safe-continue'){if(model.resolve({label:'安全屋',detail:`警戒压回 ${j.security}%`,type:'safe'}))finish();return;}
    if(action==='send-calling'){if(model.sendCallingCard()&&model.resolve({label:'预告信已送出',detail:'塔顶的执念开始回应。',type:'calling'}))finish();return;}
    if(action==='trap-disarm'){model.disarmTrap();if(model.resolve({label:'机关已拆',detail:`警戒 ${j.security}%`,type:'trap'}))finish();return;}
    if(action==='trap-force'){model.forceTrap();state.hp=Math.max(1,state.hp-6);if(model.resolve({label:'硬闯机关',detail:`HP ${state.hp} · 警戒 ${j.security}%`,type:'trap'}))finish();return;}
    if(action==='take-key'){model.takeKey();if(model.resolve({label:'收下旧钥匙',detail:`钥匙 ${j.keys} 把`,type:'key'}))finish();return;}
    if(action==='prep-return'){prepMessage='';show('prep');return;}
    if(action==='prep-shop'){shopReturn='prep';shopMessage='';show('shop');return;}
    if(action==='prep-gear'){show('gear');return;}
    if(action==='prep-velvet'){velvetReturn='prep';fusionPreview=null;fusionMessage='';specialPreview=null;specialMessage='';velvetService='fusion';velvetMessage='';show('velvet');return;}
    if(action==='prep-persona'){stop();page=null;api.goRoom('persona');return;}
    if(action==='prep-awaken'){api.openAwakening?.();return;}
    if(action==='enter-tower'){
      if(!state.personaCreated){prepMessage='先让面具回应你。';show('prep');return;}
      const shadow=shadowState();
      if(!shadow.active){prepMessage=`影时间尚未降临。下次开启：${shadow.nextStart?shadow.nextStart.toLocaleString('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}):'等待下次影时间'}。`;show('prep');return;}
      if(j.ended)model.start();
      if(j.active&&j.history.length>0){page=null;api.goRoom('tower');return;}
      reveal(false);return;
    }
    if(action==='shop'){shopReturn='interlude';shopMessage='';show('shop');return;}
    if(action==='shop-return'){shopReturn='return';shopMessage='';show('shop');return;}
    if(action==='shop-back'){show(shopReturn);return;}
    if(action.startsWith('buy:')){buyItem(action.slice(4));return;}
    if(action.startsWith('buy-equipment:')){buyEquipment(action.slice('buy-equipment:'.length));return;}
    if(action.startsWith('equip:')){
      const result=equipItem(state.equipment,state.ownedEquipment,action.slice('equip:'.length));
      if(result.ok){state.equipment=result.equipment;api.persistP5State?.();}
      render({focus:true});return;
    }
    if(action.startsWith('unequip:')){
      const result=unequipItem(state.equipment,action.slice('unequip:'.length));
      if(result.ok){state.equipment=result.equipment;api.persistP5State?.();}
      render({focus:true});return;
    }
    if(action==='velvet'){velvetReturn='return';fusionPreview=null;fusionMessage='';specialPreview=null;specialMessage='';velvetService='fusion';velvetMessage='';show('velvet');return;}
    if(action.startsWith('velvet-service:')){velvetService=action.slice('velvet-service:'.length);velvetMessage='';fusionMessage='';fusionPreview=null;specialPreview=null;specialMessage='';render({focus:true});return;}
    if(action==='gallows-exec'){gallowsExec();return;}
    if(action==='chair-exec'){chairExec();return;}
    if(action.startsWith('lockdown-exec:')){lockdownExec(action.slice('lockdown-exec:'.length));return;}
    if(action==='compendium-register'){compendiumRegister();return;}
    if(action.startsWith('withdraw:')){withdrawPersona(action.slice('withdraw:'.length));return;}
    if(action==='preview-fusion'){previewFusion();return;}
    if(action==='confirm-fusion'){confirmFusion();return;}
    if(action.startsWith('special-recipe:')){previewSpecial(action.slice('special-recipe:'.length));return;}
    if(action==='confirm-special'){confirmSpecial();return;}
    if(action==='return-back'){show(velvetReturn);return;}
    if(action==='velvet-exit'){show(velvetReturn);return;}
    if(action.startsWith('select:')){if(model.select(action.slice(7))){render();document.querySelector(`[data-tower="${action}"]`)?.focus({preventScroll:true});}return;}
    if(action==='start'){start();return;}
    if(action==='retry'){reveal();return;}
    if(action==='route'){if(!j.active)model.start();routeBack();return;}
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
    if(action==='back'){
      if(!page&&!j.active){stop();api.goRoom('battle');return;}
      if(page==='shop'){show(shopReturn);return;}
      if(page==='gear'){show('prep');return;}
      if(page==='velvet'){show(velvetReturn);return;}
      if(page==='prep'){stop();page=null;api.goRoom('battle');return;}
      if(page==='interlude'){routeBack();return;}
      if(page==='return'){stop();page=null;api.goRoom('battle');return;}
      if(page==='recap'&&!recap.done){finishRecap();return;}
      if(j.ended){stop();page=null;api.goRoom('battle');}else routeBack();
    }
  }
  document.addEventListener('visibilitychange',()=>{if(clock)clock.last=performance.now();});
  return {screen,route,act,start,showRecap,prep(){return prepPage();},...debugMode?{debugJump}:{},get snapshot(){return {active:j.active,floor:j.floor,ended:j.ended};},get active(){return j.active;},get page(){return page;},get pendingBattle(){return j.active&&['mob','boss','elite'].includes(j.pending?.kind)&&!j.pending.resolved&&!j.ended;},
    hide(){stop();page=null;},recordLoot(reward){return model.addLoot(reward);},
    preview(next){if(next!=='return'&&next!=='velvet')return false;model.start();j.floor=j.maxFloor;j.ended='clear';interlude={battle:{summary:'这一夜的最后一道影子，已经散了。'},rested:false,party:[]};fusionPreview=null;fusionMessage='';specialPreview=null;specialMessage='';velvetService='fusion';velvetMessage='';velvetReturn='return';prepMessage='';page=next;return true;},
    battleReturn(won,phase,battleResult){if(!this.pendingBattle)return;if(won){const floor=j.pending.floor,wasBoss=j.pending.kind==='boss';const drops=Array.isArray(battleResult?.drops)?battleResult.drops:[];const reward=battleResult?.reward??null;const items=[];let spGain=0;for(const drop of drops){if(drop?.item){items.push(drop.item);state.battleLoot.push(drop.item);}if(drop?.sp)spGain+=Number(drop.sp)||0;}if(reward?.item){items.push(reward.item);state.battleLoot.push(reward.item);}if(reward?.sp)spGain+=Number(reward.sp)||0;const moneyGain=240+floor*60;state.money+=moneyGain;if(spGain)state.sp=Math.min(state.heroMaxSp??state.sp,state.sp+spGain);api.persistP5State?.();interlude={battle:battleResult,rested:false,party:captureParty(),reward:{money:moneyGain,items,sp:spGain}};model.resolve({label:'战斗胜利',detail:battleResult?.summary??'击破了挡路的阴影。',type:'battle',receipt:battleResult??null});model.advance();page=(wasBoss||j.ended==='clear')?'return':'interlude';}else{j.pending.battleState={enemyHp:j.pending.kind==='boss'?state.enemyHp:312,stagger:j.pending.kind==='boss'?state.stagger:0,turn:state.turn,phase:j.pending.kind==='boss'?phase:1};page=null;}},
    defeat(){model.end('defeat');show('defeat');},
  };
}
