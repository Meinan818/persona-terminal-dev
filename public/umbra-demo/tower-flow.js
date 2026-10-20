import {towerNodes} from './tower-journey.js';
import {createDungeonRun} from './dungeon-run.js';
import {ITEM_DEFS,SHOP_DEFS} from './economy-rules.js';
import {fuse,skillName,ARCANA_LABELS,itemize,lockdown,register,sacrifice,withdraw,specialFuse,specialRecipes,materialEntries,networkFusion} from './velvet-rules.js';
import {getPersona} from './p5r-compendium.js';
import {buildBattlePersona,setPersonaOverride} from './p5-combat-rules.js';
import {formatCountdown,formatShadowTimeRange,nextShadowTime,shadowTimeStatus} from './shadow-time.js';
import {awakeningSummary,canEnterTower} from './awakening-state.js';
import {EQUIPMENT,SLOT_LABELS,equipItem,equipmentBonuses,equipmentEffects,equipmentRows,unequipItem} from './equipment.js';
import {grantItem,grantLoot,sellInventoryItem,useInventoryItem,upgradeEquipment,inventoryEntries,equipmentSummary,slotLabel} from './inventory.js';
import {rollChestLoot,rollBattleLoot,rollRequestLoot,chestTierForKind} from './loot-rules.js';
import {grantPersonaXp} from './persona-progress.js';
import {TOWER_STRATA,getStratum} from './tower-registry.js';
import {createRequest,recordRequest,requestForStratum} from './requests.js';
import {NPCS,trustLabel} from './npcs.js';
import {currentRoom,visibleRooms} from './floor-map.js';
import {arsenalEffects} from './arsenal-effects.js';
import {TONE_LABELS,offlineJudge,resolveTalkCheck} from './night-slice.js';
import {requestShadowJudge} from './night-slice-ai.js';
import {shadowProfileFor} from './grid-negotiation.js';
import {regionForFloor} from './region-rules.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

export function createTowerFlow(api){
  const {state,icon,render,reduced}=api,model=createDungeonRun({stratum:state.towerStratum}),j=model.journey;
  const debugMode=new URLSearchParams(location.search).get('p5r-debug')==='1';
  const offlineOnly=new URLSearchParams(location.search).get('slice-ai')==='off';
  const initialVitals={hp:state.hp,sp:state.sp};
  const RUN_KEY='maskaria.p5r.run.v1';
  let page=null,receipt=null,clock=null,raf=0,serial=0,recap=null;
  let interlude=null,shopReturn='interlude',shopMessage='',prepMessage='',requestMessage='',fusionPreview=null,fusionMessage='',specialPreview=null,specialMessage='',networkPreview=null,networkMessage='',skillCardSelected='',velvetService='fusion',velvetMessage='',velvetReturn='return',inventoryTab='consumables',inventoryMessage='';
  let shadowTalk=null,shadowTalkBusy=false,shadowTalkController=null,shadowTalkRequestId=0;
  const btn=(label,action,note='',disabled=false)=>{
    const tone=typeof disabled==='string'?disabled:'';
    return `<button class="flow-button${tone?` ${tone}`:''}" data-tower="${action}" ${disabled===true?'disabled':''}><span>${label}${note?`<small>${note}</small>`:''}</span>${icon('arrow')}</button>`;
  };
  const frame=(title,en,body)=>`<section class="experience-scene tower-scene" data-tower-scene="${page}"><button class="flow-return" data-tower="back">${icon('back')}<span>返回<small>RETURN</small></span></button><div class="scene-ghost" aria-hidden="true">${en}</div><div class="scene-heading"><h1>${title}</h1><span>${en}</span></div>${body}</section>`;
  function cancelShadowTalk(){
    shadowTalkRequestId+=1;
    shadowTalkController?.abort();
    shadowTalkController=null;
    shadowTalkBusy=false;
  }
  function stop(){cancelAnimationFrame(raf);clock=null;serial++;cancelShadowTalk();}
  const money=()=>Number(state.money)||0;
  const trust=id=>Math.max(0,Math.min(5,Number(state.npcTrust?.[id])||0));
  const gearFx=()=>{
    const base=equipmentEffects(state.equipment,state.equipmentLevels);
    const arsenal=arsenalEffects(state);
    return {
      ...base,
      money:base.money+arsenal.money+trust('shopkeeper')*0.02,
      drop:base.drop+arsenal.drop,
      heal:base.heal+arsenal.heal+trust('doctor')*0.05,
    };
  };
  function applyRunBonuses(){
    const effects=gearFx();
    model.setRunBonuses({
      steps:effects.steps,
      securityGuard:effects.securityGuard,
      chestBonus:effects.chest,
      dropBonus:effects.drop,
    });
  }
  const personaName=id=>getPersona(id)?.name??buildBattlePersona(id)?.name??id;
  const rosterIds=()=>[...new Set(state.personaRoster??[])].filter(id=>Boolean(getPersona(id)));
  const SHOP_STOCK=['painkiller','sportsDrink','energyDrink','revive'];
  const priceFor=(item,gear=false)=>{
    const discount=Math.min(0.1,trust(gear?'gunsmith':'shopkeeper')*0.02);
    return Math.max(0,Math.round((Number(item?.price)||0)*(1-discount)));
  };
  function captureParty(){
    return (state.battleView?.party??[]).map(member=>({
      id:member.id,name:member.name,isPlayer:Boolean(member.isPlayer),
      hp:member.hp,maxHp:member.maxHp,sp:member.sp,maxSp:member.maxSp,
    }));
  }
  function restParty(){
    if(!interlude||interlude.rested)return;
    const party=interlude.party??[];
    const heal=regionForFloor(j.floor,j.maxFloor).safeHeal??.3;
    for(const member of party){
      if(member.isPlayer){
        state.hp=Math.min(member.maxHp,state.hp+Math.max(1,Math.ceil(member.maxHp*heal)));
        state.sp=Math.min(member.maxSp,state.sp+Math.max(1,Math.ceil(member.maxSp*heal)));
        continue;
      }
      const vitals=state.partyVitals?.[member.id];
      if(!vitals)continue;
      vitals.hp=Math.min(member.maxHp,(Number(vitals.hp)||0)+Math.max(1,Math.ceil(member.maxHp*heal)));
      vitals.sp=Math.min(member.maxSp,(Number(vitals.sp)||0)+Math.max(1,Math.ceil(member.maxSp*heal)));
    }
    interlude.rested=true;
    api.persistP5State?.();
    render({focus:true});
  }
  function buyItem(id){
    const item=ITEM_DEFS[id];
    if(!item)return;
    const price=priceFor(item,false);
    if(money()<price){shopMessage=`钱不够（需要 ¥${price}）。`;render();return;}
    state.money-=price;
    grantItem(state,id,1);
    shopMessage=`买下 ${item.name} ×1（¥${price}）。`;
    api.persistP5State?.();
    render({focus:true});
  }
  function buyEquipment(id){
    const item=EQUIPMENT[id];
    if(!item||item.price<=0)return;
    if(state.ownedEquipment.includes(id)){shopMessage='这件装备已经在手里。';render();return;}
    const price=priceFor(item,true);
    if(money()<price){shopMessage=`钱不够（需要 ¥${price}）。`;render();return;}
    state.money-=price;
    grantItem(state,id,1);
    shopMessage=`买下 ${item.name}（¥${price}）。去装备页换上。`;
    api.persistP5State?.();
    render({focus:true});
  }
  function markRequest(event){
    if(!j.request)return;
    const result=recordRequest(j.request,event);
    j.request=result.request;
    if(result.completed){
      state.money+=Math.round(j.request.money*(1+trust('shopkeeper')*0.02));
      const granted=grantLoot(state,{...rollRequestLoot(j.request.id),money:0});
      state.battleLoot.push(granted.text||j.request.item);
      requestMessage=`今夜请求完成 · ${j.request.title} · ¥${j.request.money}${granted.text?` + ${granted.text}`:` + ${j.request.item}`}`;
      api.persistP5State?.();
    }
  }
  function previewFusion(){
    const a=document.querySelector('#velvet-a')?.value;
    const b=document.querySelector('#velvet-b')?.value;
    if(!a||!b){fusionMessage='先选择两张面具。';fusionPreview=null;render();return;}
    const result=fuse(a,b);
    if(!result.ok){fusionMessage=result.reason;fusionPreview=null;render();return;}
    fusionMessage='';
    const discount=Math.min(0.25,trust('velvet')*0.05);
    fusionPreview={...result,a,b,cost:Math.round(result.cost*(1-discount)),discount};
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
    const discount=Math.min(0.25,trust('velvet')*0.05);
    specialPreview={
      resultId:recipe.resultId,
      result:recipe.result,
      sources:recipe.sources,
      cost:Math.round(recipe.cost*(1-discount)),
      discount,
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
    const cost=Number(specialPreview.cost)||0;
    if(money()<cost){specialMessage=`钱不够（需要 ¥${cost}）。`;render();return;}
    state.money-=cost;
    api.addPersonaToRoster?.(result.persona.id);
    api.persistP5State?.();
    specialMessage=`${result.persona.name} 已通过特殊融合进入面具名录（¥${cost}）。`;
    specialPreview=null;
    render({focus:true});
  }
  function scanNetwork(){
    const result=networkFusion(rosterIds());
    if(!result.ok){networkMessage=result.reason;networkPreview=null;render();return;}
    const discount=Math.min(0.25,trust('velvet')*0.05);
    networkPreview={...result,cost:Math.round(result.cost*(1-discount)),discount};
    networkMessage='';
    render({focus:true});
  }
  function confirmNetwork(){
    if(!networkPreview)return;
    const cost=Number(networkPreview.cost)||0;
    if(money()<cost){networkMessage=`钱不够（需要 ¥${cost}）。`;networkPreview=null;render();return;}
    state.money-=cost;
    api.addPersonaToRoster?.(networkPreview.persona.id);
    api.persistP5State?.();
    networkMessage=`${networkPreview.persona.name} 从网络里回应了你（¥${cost}）。`;
    networkPreview=null;
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
    if(Array.isArray(previous.skills)&&previous.skills.length)override.skills=[...previous.skills];
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
  function useSkillCard(){
    const targetId=document.querySelector('#vsc-persona')?.value;
    const cardId=skillCardSelected;
    if(!targetId||!cardId){velvetMessage='先选一张技能卡和一张面具。';render();return;}
    const qty=Number(state.materials?.[cardId])||0;
    if(qty<=0){velvetMessage='这张技能卡已经用完了。';render();return;}
    const built=buildBattlePersona(targetId);
    if(!built){velvetMessage='图鉴里没有这张面具。';render();return;}
    if(built.skills.some(skill=>skill.id===cardId)){velvetMessage=`${built.name} 已经会「${skillName(cardId)}」。`;render();return;}
    if(built.skills.length>=6){velvetMessage=`${built.name} 的技能组已经满了（6 个）。`;render();return;}
    const previous=state.personaOverrides?.[targetId]??{};
    const override={...previous,skills:[...(Array.isArray(previous.skills)?previous.skills:[]),cardId]};
    state.personaOverrides={...(state.personaOverrides??{}),[targetId]:override};
    setPersonaOverride(targetId,override);
    const nextQty=qty-1;
    if(nextQty>0)state.materials={...state.materials,[cardId]:nextQty};
    else{state.materials={...state.materials};delete state.materials[cardId];}
    velvetMessage=`${built.name} 学会了「${skillName(cardId)}」。`;
    api.persistP5State?.();
    render({focus:true});
  }
  function timeline(duration,onTick,onDone){
    stop();const id=serial;clock={elapsed:0,last:performance.now()};
    const tick=now=>{if(id!==serial||!clock)return;const dt=Math.max(0,now-clock.last);clock.last=now;if(!document.hidden)clock.elapsed+=dt;onTick(clock.elapsed);if(clock.elapsed>=duration){stop();onDone();return;}raf=requestAnimationFrame(tick);};
    raf=requestAnimationFrame(tick);
  }
  function show(next){stop();page=next;render({focus:true});scrollTo(0,0);}
  const finiteVital=value=>typeof value==='number'&&Number.isFinite(value);
  const partyVitalsSnapshot=party=>Object.fromEntries(
    Object.entries(party&&typeof party==='object'&&!Array.isArray(party)?party:{})
      .filter(([,v])=>v&&finiteVital(v.hp)&&finiteVital(v.sp))
      .map(([id,v])=>[id,{hp:Math.max(0,v.hp),sp:Math.max(0,v.sp)}]),
  );
  function restoreRunVitals(vitals){
    // 旧行程没有资源快照时保留既有状态；只恢复白名单，不合并任意存档字段。
    if(!vitals||typeof vitals!=='object'||Array.isArray(vitals))return;
    if(finiteVital(vitals.heroMaxHp)&&vitals.heroMaxHp>0)state.heroMaxHp=vitals.heroMaxHp;
    if(finiteVital(vitals.heroMaxSp)&&vitals.heroMaxSp>=0)state.heroMaxSp=vitals.heroMaxSp;
    if(finiteVital(vitals.hp))state.hp=Math.max(0,Math.min(state.heroMaxHp??52,vitals.hp));
    if(finiteVital(vitals.sp))state.sp=Math.max(0,Math.min(state.heroMaxSp??34,vitals.sp));
    if(vitals.partyVitals&&typeof vitals.partyVitals==='object'&&!Array.isArray(vitals.partyVitals)){
      state.partyVitals=partyVitalsSnapshot(vitals.partyVitals);
    }
  }
  function serializeRun(){
    if(!j.active||j.ended)return null;
    return {
      version:1,
      savedAt:Date.now(),
      vitals:{hp:state.hp,sp:state.sp,heroMaxHp:state.heroMaxHp,heroMaxSp:state.heroMaxSp,partyVitals:partyVitalsSnapshot(state.partyVitals)},
      journey:{...j,map:null,explore:null},
      map:j.map?{...j.map}:null,
      explore:j.explore?{...j.explore,map:null,listened:[...j.explore.listened]}:null,
    };
  }
  function saveRun(){
    try{
      const data=serializeRun();
      if(data)localStorage.setItem(RUN_KEY,JSON.stringify(data));
    }catch{}
  }
  function clearRun(){try{localStorage.removeItem(RUN_KEY);}catch{}}
  function peekRun(){
    try{
      const data=JSON.parse(localStorage.getItem(RUN_KEY)??'null');
      return data?.journey?.active&&!data.journey.ended?data.journey:null;
    }catch{return null;}
  }
  function restoreRun(){
    try{
      const data=JSON.parse(localStorage.getItem(RUN_KEY)??'null');
      if(!data?.journey?.active||data.journey.ended)return false;
      Object.assign(j,data.journey);
      restoreRunVitals(data.vitals);
      if(data.map)j.map=data.map;
      if(data.explore){
        j.explore={...data.explore,map:j.map,listened:new Set(data.explore.listened??[])};
      }
      j.active=true;
      page=null;
      applyRunBonuses();
      if(!j.explore&&!j.pending&&j.floor<j.maxFloor-1)model.beginFloor(j.floor||1);
      api.persistP5State?.();
      api.goRoom('tower');
      queueMapCenter();
      return true;
    }catch{return false;}
  }
  let mapCenterRun=0,mapDrag=null,mapTouchStart=null,mapTouchMoved=false,suppressMapClick=false,lastRoomTap=0;
  function centerMapViewport(smooth=false){
    const view=document.querySelector('[data-map-viewport]');
    const cell=view?.querySelector('.map-cell.is-current');
    if(!view||!cell)return false;
    const viewRect=view.getBoundingClientRect(),cellRect=cell.getBoundingClientRect();
    const left=view.scrollLeft+cellRect.left-viewRect.left+cellRect.width/2-view.clientWidth/2;
    const top=view.scrollTop+cellRect.top-viewRect.top+cellRect.height/2-view.clientHeight/2;
    view.scrollTo({left:Math.max(0,left),top:Math.max(0,top),behavior:smooth&&!reduced.matches?'smooth':'auto'});
    return true;
  }
  function queueMapCenter(smooth=false){
    const run=++mapCenterRun;
    requestAnimationFrame(()=>requestAnimationFrame(()=>{if(run===mapCenterRun)centerMapViewport(smooth);}));
  }
  const renderMap=()=>{render({focus:true});queueMapCenter();saveRun();};
  document.addEventListener('pointerdown',event=>{
    const view=event.target.closest?.('[data-map-viewport]');
    if(!view||event.button!==0||event.pointerType==='touch')return;
    mapDrag={view,x:event.clientX,y:event.clientY,left:view.scrollLeft,top:view.scrollTop,moved:false};
    view.classList.add('is-dragging');
    try{view.setPointerCapture?.(event.pointerId);}catch{}
  });
  document.addEventListener('pointermove',event=>{
    if(!mapDrag)return;
    if(Math.abs(event.clientX-mapDrag.x)+Math.abs(event.clientY-mapDrag.y)>8)mapDrag.moved=true;
    mapDrag.view.scrollLeft=mapDrag.left-(event.clientX-mapDrag.x);
    mapDrag.view.scrollTop=mapDrag.top-(event.clientY-mapDrag.y);
  });
  const endMapDrag=()=>{
    if(!mapDrag)return;
    if(mapDrag.moved){
      suppressMapClick=true;
      setTimeout(()=>{suppressMapClick=false;},350);
    }
    mapDrag.view.classList.remove('is-dragging');
    mapDrag=null;
  };
  document.addEventListener('pointerup',endMapDrag);
  document.addEventListener('pointercancel',endMapDrag);
  document.addEventListener('touchstart',event=>{
    const view=event.target.closest?.('[data-map-viewport]');
    if(!view||!event.touches[0])return;
    mapTouchStart={x:event.touches[0].clientX,y:event.touches[0].clientY};
    mapTouchMoved=false;
  },{passive:true});
  document.addEventListener('touchmove',event=>{
    if(!mapTouchStart||!event.touches[0])return;
    const dx=event.touches[0].clientX-mapTouchStart.x,dy=event.touches[0].clientY-mapTouchStart.y;
    if(Math.abs(dx)+Math.abs(dy)>8)mapTouchMoved=true;
  },{passive:true});
  document.addEventListener('touchend',()=>{
    if(mapTouchStart&&mapTouchMoved){
      suppressMapClick=true;
      setTimeout(()=>{suppressMapClick=false;},350);
    }
    mapTouchStart=null;
  },{passive:true});
  document.addEventListener('click',event=>{
    if(suppressMapClick&&event.target.closest?.('[data-tower^="room:"]')){
      event.preventDefault();
      event.stopPropagation();
    }
  },true);
  function tapRoom(control){
    if(!control||mapTouchMoved)return;
    const now=Date.now();
    if(now-lastRoomTap<350)return;
    lastRoomTap=now;
    suppressMapClick=true;
    setTimeout(()=>{suppressMapClick=false;},350);
    act(control.dataset.tower);
  }
  document.addEventListener('pointerup',event=>{
    if(event.pointerType==='touch')tapRoom(event.target.closest?.('[data-tower^="room:"]'));
  },true);
  document.addEventListener('touchend',event=>{
    const control=event.target.closest?.('[data-tower^="room:"]');
    if(control)tapRoom(control);
  },{passive:true});
  function revealRoomPanel(){
    if(!matchMedia('(max-width:760px)').matches)return;
    requestAnimationFrame(()=>document.querySelector('.map-current')?.scrollIntoView({behavior:reduced.matches?'auto':'smooth',block:'center'}));
  }
  function reveal(error=false){
    show(error?'reveal-error':'reveal');if(error)return;
    if(reduced.matches){show('reveal-ready');return;}
    timeline(1100,()=>{},()=>show('reveal-ready'));
  }
  function routeBack(){stop();page=null;api.goRoom('tower');if(j.explore)queueMapCenter();}
  function debugJump(floor,selected='mob'){
    j.active=true;
    j.floor=Math.max(1,Math.min(j.maxFloor,Number(floor)||1));
    j.pending=null;
    j.selected=selected;
    j.ended=null;
    j.map=null;
    j.explore=null;
    model.beginFloor(j.floor);
    page=null;
    api.goRoom('tower');
    queueMapCenter();
  }
  function debugOpenChest(kind){
    if(!j.explore||!j.map)return false;
    const chest=Object.values(j.map.rooms).find(room=>room.type==='chest'&&!room.cleared);
    if(!chest)return false;
    if(kind)chest.chestKind=kind;
    j.explore.player={x:chest.x,y:chest.y};
    chest.revealed=true;
    chest.visited=true;
    page=null;
    api.goRoom('tower');
    queueMapCenter();
    return true;
  }
  function debugGuardian(){
    if(!j.explore||!j.map)return false;
    const guardian=j.map.rooms[j.map.guardianId];
    if(!guardian||guardian.cleared)return false;
    guardian.revealed=true;
    for(const [dir,dx,dy] of MAP_STEPS){
      const from=j.map.rooms[`${guardian.x-dx},${guardian.y-dy}`];
      if(!from)continue;
      j.explore.player={x:from.x,y:from.y};
      const result=model.mapMove(dir);
      if(result.pending){page=null;api.goRoom('tower');enter();return true;}
    }
    return false;
  }
  function debugExit(){
    if(!j.explore||!j.map)return false;
    const exit=j.map.rooms[`${j.map.exit.x},${j.map.exit.y}`];
    if(!exit)return false;
    exit.revealed=true;
    exit.visited=true;
    j.explore.player={x:exit.x,y:exit.y};
    page=null;
    api.goRoom('tower');
    queueMapCenter();
    return true;
  }
  function debugFightShadow(){
    if(!j.explore||!j.map)return false;
    const shadow=Object.values(j.map.rooms).find(room=>room.type==='shadow'&&!room.cleared);
    if(!shadow)return false;
    shadow.revealed=true;
    for(const [dir,dx,dy] of MAP_STEPS){
      const from=j.map.rooms[`${shadow.x-dx},${shadow.y-dy}`];
      if(!from)continue;
      j.explore.player={x:from.x,y:from.y};
      const result=model.mapMove(dir);
      if(result.pending){page=null;api.goRoom('tower');enter();return true;}
    }
    return false;
  }
  function debugShadowTalk(){
    if(!j.explore||!j.map)return false;
    const shadow=Object.values(j.map.rooms).find(room=>room.type==='shadow'&&!room.cleared);
    if(!shadow)return false;
    shadow.revealed=true;
    for(const [dir,dx,dy] of MAP_STEPS){
      const from=j.map.rooms[`${shadow.x-dx},${shadow.y-dy}`];
      if(!from)continue;
      j.explore.player={x:from.x,y:from.y};
      const result=model.mapMove(dir);
      if(result.pending&&result.pending.kind==='shadow'){
        page=null;
        j.mapMessage='它没有先动手。你可以开口，也可以拔刀。';
        api.goRoom('tower');
        renderMap();
        return true;
      }
    }
    return false;
  }
  function start(error=false){
    clearRun();
    model.start(state.towerStratum);
    applyRunBonuses();
    j.request=createRequest(requestForStratum(state.towerStratum));
    Object.assign(state,initialVitals);
    receipt=null;interlude=null;shopReturn='interlude';shopMessage='';prepMessage='';requestMessage='';
    fusionPreview=null;fusionMessage='';specialPreview=null;specialMessage='';
    velvetService='fusion';velvetMessage='';velvetReturn='prep';skillCardSelected='';networkPreview=null;networkMessage='';
    if(error){reveal(true);return;}
    show('prep');
  }
  function enter(){
    const pending=j.pending??model.enter();if(!pending)return;
    if(pending.resolved){receipt=pending.result;show('receipt');return;}
    if(['mob','elite','boss','guardian','shadow'].includes(pending.kind)){
      page=null;api.startFight(pending.kind==='boss',pending.battleState,pending.encounter,pending.floor);return;
    }
    show(pending.kind);
  }
  function handlePending(result){
    if(result.pending?.kind==='shadow'&&!result.pending.resolved){
      page=null;
      j.mapMessage='它没有先动手。你可以开口，也可以拔刀。';
      renderMap();
      revealRoomPanel();
      return true;
    }
    enter();
    return true;
  }
  function applyRegionStep(){
    if(!j.explore)return;
    const region=regionForFloor(j.floor,j.maxFloor);
    const turn=Number(j.explore.turn)||0;
    if(region.corrodeEvery&&turn>0&&turn%region.corrodeEvery===0){
      const damage=Number(region.corrodeDamage)||2;
      state.hp=Math.max(1,(Number(state.hp)||1)-damage);
      j.mapMessage=`藤蔓收紧，HP -${damage}。`;
    }
    if(region.clockEvery&&turn>0&&turn%region.clockEvery===0){
      const spend=Number(region.clockTime)||1;
      const security=Number(region.clockSecurity)||3;
      j.explore.time=Math.max(0,(Number(j.explore.time)||0)-spend);
      j.explore.security=Math.min(100,(Number(j.explore.security)||0)+security);
      j.explore.alert=j.explore.security>=100;
      model.syncExplore();
      if(j.explore.time<=0){j.explore.ended='timeout';j.timeout=true;j.ended='timeout';}
      j.mapMessage=`钟摆响了一声：月光 -${spend}，警戒 +${security}。`;
    }
    if(region.securityPerMove)model.adjustSecurity(region.securityPerMove);
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
    if(j.ended==='clear'){clearRun();show('clear');}else{saveRun();routeBack();}
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
    const options={
      days:state.shadowTime?.days??[5,6,0],
      startHour:Number(String(state.shadowTime?.start??'20:00').split(':')[0]),
      endHour:Number(String(state.shadowTime?.end??'07:00').split(':')[0]),
    };
    const forced=new URLSearchParams(location.search).get('shadow');
    if(forced==='1'||forced==='0'){
      const base=shadowTimeStatus(new Date(),options);
      return {...base,active:forced==='1',nextStart:forced==='1'?null:nextShadowTime(new Date(),options)};
    }
    return shadowTimeStatus(new Date(),options);
  }
  function prepPage(){
    if(!j.active&&state.towerStratum!=='echo'){state.towerStratum='echo';model.setStratum('echo');api.persistP5State?.();}
    const shadow=shadowState(),roster=rosterIds(),materialCount=materialEntries(state.materials).reduce((sum,item)=>sum+item.qty,0);
    const awakened=Boolean(state.personaCreated);
    const canEnter=canEnterTower({shadowActive:shadow.active,personaCreated:awakened});
    const gateTitle=!awakened?'面具还没有回应':shadow.active?'塔门已开启':'影时间尚未降临';
    const gateCopy=!awakened?'影时间不替你做决定。先完成觉醒，塔门才会打开。':shadow.active?'进入后不能购物或融合；安全屋只负责休息和返回。':'据点随时可以整理。等到影时间降临，塔门才会回应。';
    const nextText=!awakened?'先完成觉醒':shadow.active?'影时间正在流淌':shadow.nextStart?`下次开启还有 ${formatCountdown(shadow.nextStart.getTime()-Date.now())}`:'等待影时间';
    const contract=awakeningSummary(state.personaAwakening);
    const stratum=getStratum(state.towerStratum);
    const request=j.request??createRequest(requestForStratum(state.towerStratum));
    const card=(title,note,tag,action)=>`<article class="night-base-card"><span>${tag}</span><h3>${title}</h3><p>${note}</p><button type="button" data-tower="${action}">进入</button></article>`;
    const awakenBanner=awakened?'':`<div class="night-base-awaken"><div><span>FIRST CONTRACT</span><h3>还没有面具回应你。</h3><p>四道问题，一段自述。等你说完，它才会开口。</p></div><button type="button" data-tower="prep-awaken">回应它</button></div>`;
    const sliceBanner=`<div class="night-base-slice is-lab"><div><span>AI LAB / 试验层</span><h3>3–5 间房的短流程。</h3><p>用来验证自由交涉与夜层生成；主线仍是上面的格子高塔。</p></div><button type="button" data-slice="open">进入试验层</button></div>`;
    const savedRun=peekRun();
    const continueBanner=savedRun?`<div class="night-base-continue"><div><span>LAST RUN / 上次的塔</span><h3>上次停在 ${savedRun.floor}F。</h3><p>第 ${Math.max(1,Math.ceil(savedRun.floor/10))} 区段 · 继续这一夜，或者从 1F 重新开始。</p></div><div class="night-base-continue-actions"><button type="button" data-tower="continue-run">继续</button><button type="button" data-tower="new-run">重新开始</button></div></div>`:'';
    const stratumPanel=`<section class="tower-strata"><div class="tower-strata-head"><span>塔层 / STRATUM</span><b>${esc(stratum.name)}</b><small>${esc(stratum.rule)}</small></div><div class="tower-strata-list">${TOWER_STRATA.map(item=>{const locked=item.id!=='echo';return `<button type="button" data-tower="stratum:${item.id}" class="${item.id===state.towerStratum?'active':''}" ${locked||(j.active&&!j.ended)?'disabled':''}><b>${esc(item.name)}</b><small>${esc(locked?'等独立玩法开放':item.rule)}</small></button>`;}).join('')}</div><p class="tower-strata-note">先做回声之庭；另外两座塔等有真正不同的玩法后再开放。</p></section>`;
    const npcEffect=id=>{
      const rank=trust(id);
      if(id==='velvet')return `融合费用 -${rank*5}%`;
      if(id==='gunsmith')return `装备价格 -${rank*2}%`;
      if(id==='doctor')return `治疗量 +${rank*5}%`;
      return `战斗与请求金钱 +${rank*2}%`;
    };
    const npcPanel=`<section class="night-npcs">${NPCS.map(npc=>`<article><span>${esc(npc.role)}</span><b>${esc(npc.name)}</b><small>${esc(npc.line)} · ${trustLabel(state.npcTrust?.[npc.id]??0)} · ${npcEffect(npc.id)}</small></article>`).join('')}</section>`;
    return frame('影时间据点。','DARK HOUR BASE',`<div class="night-base"><section class="night-base-head"><span class="slash-label">DARK HOUR / PREPARATION</span><h2>${shadow.active?'影时间，正在流淌。':'影时间，还没有降临。'}</h2><p>${shadow.active?'商店和天鹅绒房间都在塔外。整理好队伍，再从塔门进入。':'准备可以随时进行；只有塔门会在影时间开启。'}</p><div class="night-base-window"><span>${esc(formatShadowTimeRange({days:state.shadowTime?.days??[5,6,0],startHour:Number(String(state.shadowTime?.start??'20:00').split(':')[0]),endHour:Number(String(state.shadowTime?.end??'07:00').split(':')[0])}))}</span><b>${nextText}</b></div></section><div class="night-base-stats"><div><span>持有</span><b>¥${money().toLocaleString()}</b></div><div><span>面具</span><b>${roster.length}</b><small>张</small></div><div><span>契约</span><b>${esc(contract)}</b></div><div><span>素材</span><b>${materialCount}</b><small>件</small></div></div><div class="night-request ${request.completed?'completed':''}"><span>今夜请求</span><b>${esc(request.title)}</b><small>${esc(request.desc)} · ${request.progress}/${request.target}</small></div>${continueBanner}${awakenBanner}${stratumPanel}${npcPanel}<section class="night-base-grid">${card('天鹅绒房间','融合、处刑、电椅、禁闭、图鉴与素材。','VELVET ROOM','prep-velvet')}${card('月见坂补给','战斗道具、复活针与 SP 饮料。','SUPPLY','prep-shop')}${card('装备','武器、防具与饰品。','GEAR','prep-gear')}${card('队伍与 Persona','查看面具名录，调整契约与同行编成。','PERSONA','prep-persona')}${card('背包','消耗品、素材、出售与强化。','BACKPACK','prep-inventory')}</section><div class="night-base-gate ${canEnter?'is-open':'is-closed'}"><div><span>TOWER GATE</span><h3>${gateTitle}</h3><p>${gateCopy}</p></div>${btn(canEnter?'踏上高塔':!awakened?'等待觉醒':'等待影时间','enter-tower','',!canEnter)}</div>${sliceBanner}${prepMessage?`<p class="shop-message">${esc(prepMessage)}</p>`:''}${requestMessage?`<p class="shop-message">${esc(requestMessage)}</p>`:''}<div class="night-base-foot">${btn('离开据点，回到战场','home')}</div></div>`);
  }
  function interludePage(){
    const reward=interlude?.reward;
    return frame('战后，喘口气。','SAFEHOUSE',`<div class="safehouse-layout"><section class="safehouse-copy"><span class="slash-label">SAFEHOUSE / AFTER BATTLE</span><h2>${esc(interlude?.battle?.summary??'挡路的影子散了。')}</h2><p>这一层已经完成。安全屋只负责休息；补给和融合回据点再做。</p>${reward?`<p class="safehouse-reward">战斗奖励 ¥${reward.money}${reward.items.length?` · ${esc(reward.items.join(' / '))}`:''}${reward.sp?` · SP +${reward.sp}`:''}</p>`:''}${interlude?.personaProgress?`<p class="safehouse-reward">${esc(interlude.personaProgress.name)} EXP +${interlude.personaProgress.xpGain}${interlude.personaProgress.leveled?` · Lv.${interlude.personaProgress.level}`:''}</p>`:''}${requestMessage?`<p class="safehouse-reward">${esc(requestMessage)}</p>`:''}<div class="safehouse-stats"><div><span>HP</span><b>${state.hp}</b><small>/ ${state.heroMaxHp??52}</small></div><div><span>SP</span><b>${state.sp}</b><small>/ ${state.heroMaxSp??34}</small></div><div><span>持有</span><b>¥${money().toLocaleString()}</b></div><div><span>战利品</span><b>${state.battleLoot?.length??0}</b><small>件</small></div></div></section><section class="safehouse-actions">${btn(interlude?.rested?'已休息':'安全屋休息','rest','恢复 30% HP / SP',interlude?.rested)}${btn('继续向上','continue','回到路线，显示下一层')}${btn('回到据点','prep-return','补给、融合、编成')}</section></div>`);
  }
  function shopPage(){
    const backLabel=shopReturn==='return'?'回到回城':shopReturn==='prep'?'回到据点':'回到安全屋';
    return frame('月见坂补给。','SUPPLY',`<div class="shop-layout"><div class="shop-head"><span>月见坂补给</span><b>¥${money().toLocaleString()}</b></div><div class="shop-list">${SHOP_STOCK.map(id=>{const item=ITEM_DEFS[id];if(!item)return '';const qty=Number(state.battleItems?.[id])||0;return `<article class="shop-row"><div class="shop-item"><h3>${esc(item.name)}</h3><p>${esc(item.desc)}</p></div><div class="shop-meta"><b>¥${item.price}</b><small>持有 ${qty}</small></div><button class="small-button" data-tower="buy:${id}" ${money()<item.price?'disabled':''}>购买</button></article>`;}).join('')}</div><div class="shop-gear"><h3>装备</h3>${Object.values(EQUIPMENT).filter(item=>item.price>0).map(item=>{const owned=state.ownedEquipment.includes(item.id);return `<article class="shop-row"><div class="shop-item"><h3>${esc(item.name)}</h3><p>${esc(item.desc)}</p></div><div class="shop-meta"><b>¥${item.price}</b><small>${SLOT_LABELS[item.slot]}${owned?' · 已拥有':''}</small></div><button class="small-button" data-tower="buy-equipment:${item.id}" ${owned||money()<item.price?'disabled':''}>${owned?'已拥有':'购买'}</button></article>`;}).join('')}</div>${shopMessage?`<p class="shop-message">${esc(shopMessage)}</p>`:''}<div class="shop-actions">${btn(backLabel,'shop-back')}${shopReturn==='interlude'?btn('继续向上','continue'):''}</div></div>`);
  }
  function shopPageNew(){
    const backLabel=shopReturn==='return'?'回到回城':shopReturn==='prep'?'回到据点':'回到安全屋';
    const sections=[SHOP_DEFS.clinic,SHOP_DEFS.arms,SHOP_DEFS.vending];
    const rows=sections.map(shop=>`<section class="shop-section"><header><h3>${esc(shop.name)}</h3><small>${esc(shop.tagline)}</small></header>${shop.stock.map(id=>{
      const item=EQUIPMENT[id]??ITEM_DEFS[id];
      if(!item)return '';
      const gear=Boolean(EQUIPMENT[id]);
      const owned=gear&&state.ownedEquipment.includes(id);
      const qty=gear?0:(Number(state.battleItems[id])||Number(state.materials[id])||0);
      const action=gear?`buy-equipment:${id}`:`buy:${id}`;
      const price=priceFor(item,gear);
      return `<article class="shop-row"><div class="shop-item"><h3>${esc(item.name)}</h3><p>${esc(item.desc)}</p></div><div class="shop-meta"><b>¥${price}</b><small>${gear?SLOT_LABELS[item.slot]:`持有 ${qty}`}</small></div><button class="small-button" data-tower="${action}" ${owned||money()<price?'disabled':''}>${owned?'已拥有':'购买'}</button></article>`;
    }).join('')}</section>`).join('');
    return frame('商店。','SHOP',`<div class="shop-layout"><div class="shop-head"><span>月见坂 · 夜间营业</span><b>¥${money().toLocaleString()}</b></div><div class="shop-sections">${rows}</div>${shopMessage?`<p class="shop-message">${esc(shopMessage)}</p>`:''}<div class="shop-actions">${btn(backLabel,'shop-back')}${shopReturn==='interlude'?btn('继续向上','continue'):''}${btn('打开背包','prep-inventory','出售与强化')}</div></div>`);
  }
  function gearPageNew(){
    const rows=equipmentRows(state.equipment,state.equipmentLevels);
    const bonuses=equipmentBonuses(state.equipment,state.equipmentLevels);
    const effects=gearFx();
    const owned=inventoryEntries(state).equipment;
    const effectLine=[
      effects.crit?`暴击 +${Math.round(effects.crit*100)}%`:'',
      effects.steps?`每层 +${effects.steps} 步`:'',
      effects.securityGuard?`移动警戒 -${effects.securityGuard}`:'',
      effects.money?`金钱 +${Math.round(effects.money*100)}%`:'',
      effects.chest?`月匣品质 +${effects.chest}`:'',
      effects.drop?`掉落 +${Math.round(effects.drop*100)}%`:'',
      effects.heal?`治疗 +${Math.round(effects.heal*100)}%`:'',
      effects.ambushGuard?'免疫先制':'',
    ].filter(Boolean).join(' · ')||'暂无特殊效果';
    return frame('装备。','GEAR',`<div class="gear-page"><section class="gear-summary"><span class="slash-label">LOADOUT / EQUIPMENT</span><h2>带进塔里的东西。</h2><p>数值之外，装备还会改变战斗和探索：暴击、步数、警戒、月匣、掉落与治疗。</p><div class="gear-bonuses"><span>攻击 <b>+${bonuses.attack}</b></span><span>防御 <b>+${bonuses.defense}</b></span><span>HP <b>+${bonuses.hp}</b></span><span>SP <b>+${bonuses.sp}</b></span></div><div class="gear-effects">${esc(effectLine)}</div></section><div class="gear-slots">${rows.map(row=>{const candidates=owned.filter(entry=>entry.item.slot===row.slot);const current=row.item?owned.find(entry=>entry.item.id===row.item.id):null;return `<article class="gear-slot"><header><span>${row.label}</span><b>${row.item?esc(row.item.name):'未装备'}${row.item?` <small>+${row.level}</small>`:''}</b></header>${row.item?`<p>${esc(row.item.desc)}</p><small>${esc(equipmentSummary(row.item,row.level))}</small><div class="gear-slot-actions">${btn('卸下',`unequip:${row.slot}`)}${current?btn(`强化 +${row.level+1}`,`upgrade-gear:${row.item.id}`,`¥${current.upgrade.money} · 强化石 ${current.upgrade.stones}`,current.level>=5||money()<current.upgrade.money||(Number(state.materials.enhanceStone)||0)<current.upgrade.stones):''}</div>`:'<p>这个位置还空着。</p>'}<div class="gear-owned">${candidates.map(entry=>`<button type="button" data-tower="equip:${entry.item.id}" ${state.equipment[row.slot]===entry.item.id?'disabled':''}><span>${esc(entry.item.name)} <small>+${entry.level}</small></span><small>${esc(equipmentSummary(entry.item,entry.level))}</small></button>`).join('')||'<span>还没有这个位置的装备。</span>'}</div></article>`;}).join('')}</div><div class="gear-foot">${btn('打开背包','prep-inventory','出售与素材')}${btn('回到据点','prep-return')}</div></div>`);
  }
  function inventoryPage(){
    const entries=inventoryEntries(state);
    const tabs=[['consumables','消耗品'],['materials','素材'],['equipment','装备']];
    const tab=tabs.some(([id])=>id===inventoryTab)?inventoryTab:'consumables';
    const row=(id,name,desc,meta,actions)=>`<article class="inventory-row"><div class="inventory-mark">${icon(id==='equipment'?'mask':'box')}</div><div class="inventory-copy"><h3>${esc(name)}</h3><p>${esc(desc||'')}</p><small>${esc(meta||'')}</small></div><div class="inventory-actions">${actions}</div></article>`;
    const body=tab==='equipment'
      ?entries.equipment.map(entry=>row('equipment',`${entry.item.name} +${entry.level}`,entry.item.desc,equipmentSummary(entry.item,entry.level),`${entry.equipped?'<span class="inventory-equipped">装备中</span>':btn('装备',`equip:${entry.item.id}`)}${btn('出售',`sell-item:${entry.item.id}`,`+¥${entry.sell}`,entry.equipped||entry.sell<=0)}${btn('强化',`upgrade-gear:${entry.item.id}`,`¥${entry.upgrade.money} · 石 ${entry.upgrade.stones}`,entry.level>=5||money()<entry.upgrade.money||(Number(state.materials.enhanceStone)||0)<entry.upgrade.stones)}`)).join('')||'<p class="inventory-empty">还没有装备。去商店、月匣或守卫那里找。</p>'
      :tab==='materials'
        ?entries.materials.map(entry=>row('materials',`${entry.item?.name??entry.id} ×${entry.qty}`,entry.item?.desc,'素材 · 强化或融合用',btn('出售 ×1',`sell-item:${entry.id}`,`+¥${entry.item?.sell??0}`))).join('')||'<p class="inventory-empty">还没有素材。强化石会从守卫和月匣里掉。</p>'
        :entries.consumables.map(entry=>row('consumables',`${entry.item.name} ×${entry.qty}`,entry.item.desc,`${entry.item.kind==='material'?'素材':'战斗中使用'} · 售价 ¥${entry.item.sell??0}`,`${btn('使用',`use-item:${entry.id}`,'塔内也可用',!['heal','sp'].includes(entry.item.kind))}${btn('出售 ×1',`sell-item:${entry.id}`,`+¥${entry.item.sell??0}`)}`)).join('')||'<p class="inventory-empty">背包是空的。去月见坂补给看看。</p>';
    return frame('背包。','INVENTORY',`<div class="inventory-page"><div class="inventory-head"><div><span>BACKPACK / STOCK</span><h2>带在身上的东西。</h2></div><div class="inventory-wallet"><b>¥${money().toLocaleString()}</b><small>HP ${state.hp} / ${state.heroMaxHp??52} · SP ${state.sp} / ${state.heroMaxSp??34}</small></div></div><div class="inventory-tabs">${tabs.map(([id,label])=>`<button data-tower="inventory-tab:${id}" class="${tab===id?'active':''}" aria-pressed="${tab===id}">${label}</button>`).join('')}</div>${inventoryMessage?`<p class="shop-message">${esc(inventoryMessage)}</p>`:''}<div class="inventory-list">${body}</div><div class="inventory-foot">${btn('回到据点','prep-return')}</div></div>`);
  }
  function gearPage(){
    const rows=equipmentRows(state.equipment),bonuses=equipmentBonuses(state.equipment);
    return frame('装备。','GEAR',`<div class="gear-page"><section class="gear-summary"><span class="slash-label">LOADOUT / EQUIPMENT</span><h2>带进塔里的东西。</h2><p>武器、防具和饰品只加攻防与 HP/SP，不改变 Persona 的技能和耐性。</p><div class="gear-bonuses"><span>攻击 <b>+${bonuses.attack}</b></span><span>防御 <b>+${bonuses.defense}</b></span><span>HP <b>+${bonuses.hp}</b></span><span>SP <b>+${bonuses.sp}</b></span></div></section><div class="gear-slots">${rows.map(row=>{const owned=state.ownedEquipment.map(id=>EQUIPMENT[id]).filter(item=>item&&item.slot===row.slot);return `<article class="gear-slot"><header><span>${row.label}</span><b>${row.item?esc(row.item.name):'未装备'}</b></header>${row.item?`<p>${esc(row.item.desc)}</p><small>攻 +${row.item.attack} · 防 +${row.item.defense} · HP +${row.item.hp} · SP +${row.item.sp}</small>${btn('卸下',`unequip:${row.slot}`)}`:'<p>这个位置还空着。</p>'}<div class="gear-owned">${owned.map(item=>`<button type="button" data-tower="equip:${item.id}" ${state.equipment[row.slot]===item.id?'disabled':''}>${esc(item.name)}<small>${state.equipment[row.slot]===item.id?'装备中':`攻 +${item.attack} · 防 +${item.defense}`}</small></button>`).join('')||'<span>还没有这个位置的装备。</span>'}</div></article>`;}).join('')}</div><div class="gear-foot">${btn('回到据点','prep-return')}</div></div>`);
  }
  function returnPage(){
    return frame('回城。','RETURN',`<div class="return-layout"><section class="return-copy"><span class="slash-label">DARK HOUR / RETURN</span><h2>影时间退去。</h2><p>Boss 已经被击破。把这一夜带回据点，再做补给和融合。</p>${requestMessage?`<p class="safehouse-reward">${esc(requestMessage)}</p>`:''}<div class="return-stats"><div><span>持有</span><b>¥${money().toLocaleString()}</b></div><div><span>面具</span><b>${rosterIds().length}</b><small>张</small></div><div><span>战利品</span><b>${state.battleLoot?.length??0}</b><small>件</small></div><div><span>完成节点</span><b>${j.history.length}</b></div></div></section><section class="return-actions">${btn('回到影时间据点','prep-return','补给、融合与编成')}${btn('回到战场','home')}</section></div>`);
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
      network:'信号穿过影时间。另一端有人替你按下按钮。',
      materials:'坐过电椅的东西，都会留下一点自己。',
      skill:'牌还没有印好。',
    }[velvetService]??'今天想怎么处置这些面具？';
    const services=[['fusion','融合','FUSION'],['gallows','处刑','GALLOWS'],['chair','电椅','CHAIR'],['lockdown','禁闭','LOCKDOWN'],['compendium','图鉴','COMPENDIUM'],['special','特殊融合','SPECIAL'],['network','网络融合','NETWORK'],['materials','素材','ITEMS'],['skill','技能卡','SKILL CARD']];
    const compendiumEntries=state.compendium?.entries??[];
    const recipes=specialRecipes(roster);
    const materialList=materialEntries(state.materials);
    const skillCards=materialList.filter(item=>item.category==='skill-card');
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
      if(velvetService==='network'){
        const preview=networkPreview;
        return `<h2>网络融合 / NETWORK FUSION</h2><p>把两张面具交给网络，另一端会替你试一次。结果只来自图鉴，费用随结果变化。</p>${preview?`<div class="vr-result"><h3>${esc(preview.persona.name)}</h3><p>Lv.${preview.persona.level} · ${esc(ARCANA_LABELS[preview.persona.arcana]??preview.persona.arcana)} · ${esc(preview.sourceNames.join(' × '))}</p><p>${preview.persona.skills.slice(0,4).map(id=>esc(skillName(id))).join(' · ')}</p>${btn(`确认网络融合 · ¥${preview.cost}`,'confirm-network')}</div>`:`${btn('扫描网络','network-scan','从当前名录里找一组新名字')}`}${networkMessage?`<p class="vr-message">${esc(networkMessage)}</p>`:''}`;
      }
      if(velvetService==='materials'){
        return `<h2>素材 / MATERIALS</h2><p>电椅留下的技能卡与装备会收在这里。</p>${materialList.length?`<div class="vr-materials">${materialList.map(item=>`<article class="vr-material"><span class="vr-material-tag">${item.category==='skill-card'?'技能卡':item.category==='equipment'?'装备':'素材'}</span><b>${esc(item.label)}</b><span class="vr-material-qty">×${item.qty}</span><small>${item.sourceNames.length?`来源 · ${esc(item.sourceNames.slice(0,2).join(' / '))}${item.sourceNames.length>2?' 等':''}`:'电椅产物'}</small></article>`).join('')}</div>`:'<div class="vr-empty"><b>还没有素材。</b><p>把后来获得的面具送上电椅，产物会存入这里。</p></div>'}`;
      }
      if(velvetService==='skill'){
        return `<h2>技能卡 / SKILL CARD</h2><p>电椅留下的技能卡，可以教给一张面具。每张面具最多保留六个主动技能。</p><div class="vr-skill-cards">${skillCards.length?skillCards.map(card=>`<button type="button" data-tower="skill-card:${card.id}" class="${skillCardSelected===card.id?'selected':''}"><span>${esc(card.label)}</span><small>×${card.qty}</small></button>`).join(''):'<p>还没有技能卡。把技能卡型面具送上电椅。</p>'}</div><div class="vr-selects"><label>教给哪张面具${select('vsc-persona',0)}</label></div>${btn('教给它','use-skill-card','',!skillCardSelected||!skillCards.length)}${velvetMessage?`<p class="vr-message">${esc(velvetMessage)}</p>`:''}`;
      }
      return `<h2>技能卡 / LOCKED</h2><div class="vr-locked"><b>SKILL CARD</b><p>需要网络或剧情解锁的技能卡功能。入口先留在这里。</p></div>`;
    };
    return `<div class="velvet-room" data-velvet-service="${velvetService}"><div class="vr-bars" aria-hidden="true"></div><div class="vr-curtain vr-curtain-left" aria-hidden="true"></div><div class="vr-curtain vr-curtain-right" aria-hidden="true"></div><div class="vr-moon" aria-hidden="true"></div><div class="vr-spot" aria-hidden="true"></div><header class="vr-top"><button class="vr-back" data-tower="return-back">← ${backLabel}</button><div class="vr-title"><span>VELVET ROOM</span><h1>天鹅绒房间</h1><p>“${esc(quote)}”</p></div><div class="vr-wallet">¥${money().toLocaleString()}</div></header><div class="vr-layout"><nav class="vr-menu" aria-label="天鹅绒房间服务">${services.map(([id,label,en])=>`<button class="${velvetService===id?'active':''}" data-tower="velvet-service:${id}"><small>${en}</small><b>${label}</b></button>`).join('')}</nav><main class="vr-panel">${panel()}${velvetMessage?`<p class="vr-message">${esc(velvetMessage)}</p>`:''}${fusionMessage?`<p class="vr-message">${esc(fusionMessage)}</p>`:''}${specialMessage?`<p class="vr-message">${esc(specialMessage)}</p>`:''}</main><aside class="vr-side"><div class="vr-slot"><b>P5-VR-A</b><span>双子看守</span><small>900×1200 · 透明 PNG</small></div><div class="vr-slot"><b>P5-VR-B</b><span>房间背景</span><small>1600×900 · 透明 PNG</small></div><blockquote>“${esc(quote)}”</blockquote></aside></div><button class="vr-exit" data-tower="velvet-exit">离开房间 · ${backLabel}</button></div>`;
  }
  function shadowTalkPage(){
    const profile=shadowTalk?.profile;
    if(!profile)return mapPage();
    return frame('它开口了。','NEGOTIATION',`<div class="slice-talk-layout grid-talk">
      <section class="slice-talk-stage">
        <span class="slice-kicker">SHADOW · ${esc(profile.personalityLabel)} · ${esc(profile.attribute)}</span>
        <h2>${esc(profile.name)}</h2>
        <blockquote>「${esc(profile.opening)}」</blockquote>
        <p class="slice-demand">它要的是：${esc(profile.demand)}</p>
        <div class="slice-talk-box">
          <label for="grid-talk-input">你想对它说什么？</label>
          <textarea id="grid-talk-input" rows="4" maxlength="160" placeholder="不用选选项。写你真正想说的那句。">${esc(shadowTalk?.text??'')}</textarea>
          <div class="slice-write-foot"><small>语气、内容和长度都会被听进去；成功率仍由规则计算。</small><span id="grid-talk-count">${(shadowTalk?.text??'').length} / 160</span></div>
          <div class="slice-actions">
            <button class="flow-button slice-primary" data-tower="shadow-talk-send" ${shadowTalkBusy?'disabled':''}><span>${shadowTalkBusy?'它在听…':'说出口'}<small>失败会开战</small></span>${icon('arrow')}</button>
            ${btn('拔刀','shadow-talk-fight','直接开战','danger')}
            ${btn('先退开','shadow-talk-back','回到房间','subtle')}
          </div>
          ${shadowTalk?.status?`<p class="slice-status" role="status">${esc(shadowTalk.status)}</p>`:''}
        </div>
      </section>
      <aside class="slice-talk-side">
        <div class="slice-shadow-meter"><span>它的耐心</span><i style="width:${Math.max(12,100-(j.explore?.security??0))}%"></i><small>警戒越高，它越不容易听进去。</small></div>
        <div class="slice-side-note"><b>${shadowTalk?.judged?`判定：${shadowTalk.judged.mode==='ai'?'模型':'离线'}`:'判定方式'}</b><small>同一个“讲理”，写得好和写得敷衍，命中率不一样。</small></div>
      </aside>
    </div>`);
  }
  function shadowTalkResultPage(){
    const result=shadowTalk?.result;
    if(!result)return mapPage();
    const success=Boolean(result.success);
    return frame(success?'它让开了。':'它没有接受。',success?'IT LISTENED':'IT DID NOT',`<div class="slice-result ${success?'is-success':'is-fail'}">
      <div class="slice-result-head">
        <span class="slice-kicker">${esc(TONE_LABELS[result.tone]??'交涉')} · 质量 ${result.quality} · ${result.mode==='ai'?'模型判定':'离线判定'}</span>
        <h2>${success?'影子把路让开了。':'影子没有让路。'}</h2>
        <div class="slice-chance" role="img" aria-label="成功率 ${result.chance}%"><i style="width:${result.chance}%"></i><b>${result.chance}%</b></div>
        <small>掷出 ${Math.round((Number(result.roll)||0)*100)} / 100</small>
      </div>
      <blockquote class="slice-reply">「${esc(result.reply??'')}」</blockquote>
      <div class="slice-result-foot">
        ${success?`<p>带走了 <b>${esc(result.reward?.label??'一点回声')}</b> 与 ¥${result.reward?.money??0}。</p>`:`<p>HP -${result.hpCost} · 警戒 ${j.security}%。它不打算再谈了。</p>`}
        <div class="slice-actions">${success?btn('继续往前走','shadow-talk-continue'):btn('迎战','shadow-talk-fight','它已经准备好了','danger')}</div>
      </div>
    </div>`);
  }
  async function sendShadowTalk(){
    if(shadowTalkBusy||!shadowTalk||!j.pending)return;
    const field=document.querySelector('#grid-talk-input');
    const text=(field?.value??'').trim().replace(/\s+/g,' ').slice(0,160);
    shadowTalk.text=text;
    if(!text){shadowTalk.status='总得说点什么。';render({focus:true});return;}
    shadowTalkBusy=true;
    shadowTalk.status='它在听。';
    const requestId=++shadowTalkRequestId;
    const controller=new AbortController();
    shadowTalkController=controller;
    const isCurrent=()=>requestId===shadowTalkRequestId&&shadowTalkController===controller&&Boolean(shadowTalk);
    render({focus:true});
    try{
      const room={title:'影子房',shadow:{...shadowTalk.profile}};
      const judged=offlineOnly
        ? offlineJudge({text,room})
        : await requestShadowJudge({text,room,dayRecord:''},{signal:controller.signal,onStatus:value=>{if(isCurrent()){shadowTalk.status=value;render();}}});
      if(!isCurrent())return;
      shadowTalk.judged=judged;
      shadowTalk.status='';
      if(judged.tone==='bribe'&&(Number(state.sp)||0)<20){
        shadowTalk.status='它等着你拿出 20 SP，可你拿不出来。';
        return;
      }
      const danger=j.pending?.blockBoss?'high':'mid';
      const check=resolveTalkCheck({
        personality:shadowTalk.profile.personality,
        tone:judged.tone,
        quality:judged.quality,
        sp:Number(state.sp)||0,
        hp:Number(state.hp)||1,
        maxHp:state.heroMaxHp??52,
        danger,
      });
      state.sp=Math.max(0,(Number(state.sp)||0)-check.spCost);
      let reward=null;
      if(check.success){
        const granted=grantLoot(state,rollBattleLoot({floor:j.floor,maxFloor:j.maxFloor,kind:'shadow',stratum:j.stratum,rng:Math.random,dropBonus:gearFx().drop}));
        const moneyGain=Math.round((120+j.floor*45)*(1+gearFx().money)*(regionForFloor(j.floor,j.maxFloor).reward||1));
        state.money=(Number(state.money)||0)+moneyGain;
        reward={money:moneyGain,label:granted.text||'一点回声'};
        j.loot.push({floor:j.floor,label:reward.label,sp:0});
        model.resolveMapBattle(true,{
          label:'影子让开了',
          detail:`${TONE_LABELS[judged.tone]??'交涉'} · ${check.chance}%`,
          message:`影子让开了。${reward.label} · ¥${moneyGain}`,
        });
        j.mapMessage=`影子让开了。${reward.label} · ¥${moneyGain}`;
      }else{
        state.hp=Math.max(1,(Number(state.hp)||1)-check.hpCost);
        model.adjustSecurity(check.alertGain);
        if(j.pending)j.pending.talkFailed=true;
        j.mapMessage='它没有接受。战斗开始前，你还有一次拔刀的机会。';
      }
      shadowTalk.result={...check,tone:judged.tone,quality:judged.quality,reply:judged.reply,mode:judged.mode,reward};
      page='shadow-talk-result';
      api.persistP5State?.();
      saveRun();
    }catch(error){
      if(!isCurrent())return;
      shadowTalk.status=error?.name==='AbortError'?'你收回了这句话。':'它没有回应，换离线方式再听了一次。';
    }finally{
      if(isCurrent()){
        shadowTalkBusy=false;
        shadowTalkController=null;
        render({focus:true});
      }
    }
  }
  function screen(){
    if(!page)return null;
    if(page==='prep')return prepPage();
    if(page==='interlude')return interludePage();
    if(page==='shop')return shopPageNew();
    if(page==='gear')return gearPageNew();
    if(page==='inventory')return inventoryPage();
    if(page==='return')return returnPage();
    if(page==='velvet')return velvetPage();
    if(page==='shadow-talk')return shadowTalkPage();
    if(page==='shadow-talk-result')return shadowTalkResultPage();
    if(page.startsWith('reveal'))return frame(page==='reveal-error'?'雾还没有散开。':'听见塔层，缓缓显形。','STRATUM',`<div class="reveal-layout ${page==='reveal-ready'?'ready':''}"><div class="tower-silhouette" aria-hidden="true"><i></i><i></i><i></i><i></i></div><div><span class="stratum-number">03<span>STRATUM</span></span><h2>${page==='reveal-error'?'显形暂时中断':page==='reveal-ready'?esc(getStratum(j.stratum).name):'正在显形…'}</h2><p class="scene-copy">${page==='reveal-error'?'已走过的路还在，重新显形后继续。':'从 1F 接续这一次探索。先侦察前路，再作选择。'}</p>${page==='reveal-error'?btn('重新显形','retry'):btn(page==='reveal-ready'?'踏入高塔':'跳过显形，进入高塔','route')}<p class="scene-note">路线只在本夜生效。</p></div></div>`);
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
    if(page==='clear')return frame('层门已开。','STRATUM CLEAR',`<div class="story-layout"><div class="scene-emblem">${icon('tower')}</div><div><h2>${esc(getStratum(j.stratum).name)} · 通关</h2><p class="scene-copy">你抵达了 ${j.maxFloor}F，也穿过了守在塔顶的那层执念。</p>${btn('一层层回望来路','recap')}${btn('进入无尽回廊','endless','下一轮更强')}${btn('走向终局','finale')}</div></div>`);
    if(page==='defeat')return frame('今晚，先到这里。','NOT THE END',`<div class="story-layout"><div class="scene-emblem">${icon('shield')}</div><div><h2>在 ${j.floor}F，暂歇。</h2><p class="scene-copy">体力已经耗尽。这次未完成的战斗不会记作胜利；走过的路和已收下的收获仍可回顾。</p>${btn('回望今晚走过的路','recap')}${btn('回到战场','home')}</div></div>`);
    if(page==='finale')return frame('你已经走过黑夜。','BEYOND THE MASK',`<div class="finale-layout"><div class="finale-star">${icon('star')}</div><h2>面具之外，<br>仍是你自己。</h2><p class="scene-copy">把这一刻的力量，带回白昼。</p>${btn('回望这段路','recap')}${btn('回到战场','home')}</div>`);
    return null;
  }
  const mapIcon=type=>({start:'back',exit:'tower',guardian:'sword',shadow:'eye',chest:'box',key:'star',trap:'eye',safe:'shield',event:'star',empty:'chevrons'}[type]??'eye');
  const mapName=type=>({start:'入口',exit:'出口',guardian:'守卫',shadow:'影子',chest:'月匣',key:'钥匙',trap:'机关',safe:'安全屋',event:'异响',empty:'空房'}[type]??'房间');
  const FLOOR_FLAVOR=[
    {name:'月台',tagline:'灯管一闪一闪，广播没有报站。',rooms:{start:'楼梯口',shadow:'候车的影子',guardian:'检票口守卫',chest:'遗失的行李',key:'值班室钥匙',trap:'松动的月台砖',safe:'值班室',event:'广播杂音',exit:'末班车门',empty:'空站台'}},
    {name:'档案室',tagline:'抽屉全被拉开，名字被撕掉。',rooms:{start:'档案入口',shadow:'翻纸的手',guardian:'档案室看守',chest:'封存的抽屉',key:'标本柜钥匙',trap:'漏水的管道',safe:'值班室',event:'纸页摩擦声',exit:'档案后门',empty:'空档案架'}},
    {name:'温室',tagline:'枯叶下面还有呼吸。',rooms:{start:'温室门',shadow:'花丛里的眼睛',guardian:'园丁的影子',chest:'玻璃花房',key:'工具柜钥匙',trap:'缠住脚踝的藤',safe:'花房后间',event:'滴水声',exit:'温室后门',empty:'枯花房'}},
    {name:'剧场',tagline:'幕布后面有人替你鼓掌。',rooms:{start:'后台入口',shadow:'候场的影子',guardian:'舞台看守',chest:'道具箱',key:'化妆间钥匙',trap:'松动的舞台板',safe:'后台休息室',event:'空座席的回声',exit:'侧幕出口',empty:'空排练室'}},
    {name:'走廊',tagline:'每一扇门后都是同一条走廊。',rooms:{start:'走廊尽头',shadow:'门后的脚步',guardian:'走廊守卫',chest:'门缝里的匣子',key:'尽头房间钥匙',trap:'错位的门框',safe:'楼梯间',event:'门铃',exit:'向上的楼梯',empty:'空走廊'}},
    {name:'泳池',tagline:'水面高过池沿，却没有溢出来。',rooms:{start:'更衣室',shadow:'水下的手',guardian:'池边守卫',chest:'储物柜',key:'救生员钥匙',trap:'湿滑的池边',safe:'消毒间',event:'水声',exit:'排水口',empty:'空泳池'}},
    {name:'食堂',tagline:'餐盘还在冒热气。',rooms:{start:'食堂门',shadow:'排队的影子',guardian:'后厨看守',chest:'保温柜',key:'冷库钥匙',trap:'油污地面',safe:'后厨',event:'餐具碰撞声',exit:'送货通道',empty:'空餐桌'}},
    {name:'钟楼',tagline:'钟摆停在你进来的那一刻。',rooms:{start:'钟楼底',shadow:'报时的影子',guardian:'钟摆守卫',chest:'齿轮箱',key:'钟室钥匙',trap:'松动的齿轴',safe:'钟室',event:'钟声余响',exit:'钟楼顶门',empty:'空齿轮间'}},
    {name:'天台',tagline:'风很大，脚印只有你的。',rooms:{start:'天台门',shadow:'风里的影子',guardian:'栏杆边的守卫',chest:'被风刮来的箱子',key:'水塔钥匙',trap:'碎裂的地砖',safe:'水塔下',event:'远处的低语',exit:'向上的梯子',empty:'空天台'}},
    {name:'镜厅',tagline:'每一面镜子里的你都慢半拍。',rooms:{start:'镜厅入口',shadow:'镜中的你',guardian:'镜面守卫',chest:'倒影里的匣子',key:'镜框钥匙',trap:'碎裂的镜面',safe:'暗室',event:'镜子里的耳语',exit:'镜厅尽头',empty:'空镜框'}},
    {name:'前厅',tagline:'门缝里有光，也有呼吸。',rooms:{start:'塔顶前厅',shadow:'最后的影子',guardian:'前厅守卫',chest:'最后的行李',key:'塔顶钥匙',trap:'断裂的地板',safe:'前厅角落',event:'门后的呼吸',exit:'塔顶之门',empty:'空前厅'}},
    {name:'塔顶',tagline:'它已经等你很久了。',rooms:{start:'塔顶',shadow:'心魔的余响',guardian:'心魔',chest:'心魔的残片',key:'无用的钥匙',trap:'碎裂的塔砖',safe:'无',event:'心魔的低语',exit:'塔顶',empty:'空塔顶'}},
  ];
  const floorFlavor=floor=>{
    const n=Math.max(1,Number(floor)||1);
    if(n>=100)return FLOOR_FLAVOR[11];
    if(n>=99)return FLOOR_FLAVOR[10];
    return FLOOR_FLAVOR[Math.min(9,Math.floor((n-1)/10))]??FLOOR_FLAVOR[0];
  };
  const roomTitle=(room)=>{
    if(room.cleared){
      if(room.type==='guardian')return '守卫倒下了。';
      if(room.type==='shadow')return '影子散了。';
      if(room.type==='chest')return '月匣空了。';
      if(room.type==='key')return '钥匙已经带走。';
      if(room.type==='trap')return '机关安静了。';
      if(room.type==='event')return '水面恢复平静。';
    }
    return room.type==='start'?'入口。':room.type==='exit'?'出口。':room.type==='guardian'?(room.blockBoss?'本段守层者挡在门前。':'守卫挡在门前。'):room.type==='shadow'?'影子在等你。':room.type==='chest'?'月光落在匣子上。':room.type==='key'?'一把旧钥匙。':room.type==='trap'?'脚下不太对。':room.type==='safe'?'门合上了。':room.type==='event'?'墙后有什么在响。':'这里暂时安静。';
  };
  const roomCopy=(room,explore)=>{
    if(room.cleared){
      if(room.type==='guardian')return '门已经开了。往右上走，就能离开这一层。';
      if(room.type==='shadow')return '这里已经没有威胁。继续走，或者听一听墙后的动静。';
      if(room.type==='chest')return '匣子空了。路还在。';
      if(room.type==='key')return '钥匙在你身上。出口可以直接开锁。';
      if(room.type==='trap')return '机关已经处理完，不会再响。';
      if(room.type==='event')return '水面安静下来。这里不会再回应第二次。';
    }
    return room.type==='start'?'回头是塔门。往前走，雾会散开。':room.type==='exit'?explore.exitUnlocked?'门已经开了。踏出去，下一层就会显形。':(explore.map.rooms[explore.map.guardianId]?.blockBoss&&!explore.guardianDefeated?'区段守层者还站在门前，钥匙打不开。':'门锁着。守卫或钥匙，选一条路。'):room.type==='guardian'?(room.blockBoss?'这一段由它守着。钥匙打不开它身后的门。':'它守着出口。打赢它，门就会开。'):room.type==='shadow'?'它已经看见你了。开口，或者拔刀。':room.type==='chest'?'匣子的锁很旧。先检查会多花一步，直接打开也许更快。':room.type==='key'?'拿上它，出口可以不必经过守卫。':room.type==='trap'?'拆开会安静一点；硬闯会更快，也更吵。':room.type==='safe'?'这一层只能休息一次。恢复，或者继续贪。':room.type==='event'?'靠近它，或者只带走一点月光。':'雾在墙外。你可以听一听，或者直接走。';
  };
  const MAP_STEPS=[['up',0,-1],['right',1,0],['down',0,1],['left',-1,0]];
  function findMapPath(targetX,targetY){
    if(!j.explore||!j.map)return null;
    const start=`${j.explore.player.x},${j.explore.player.y}`;
    const goal=`${targetX},${targetY}`;
    if(start===goal)return [];
    const queue=[start];
    const prev=new Map([[start,null]]);
    while(queue.length){
      const id=queue.shift();
      const [cx,cy]=id.split(',').map(Number);
      for(const [dir,dx,dy] of MAP_STEPS){
        const room=j.map.rooms[`${cx+dx},${cy+dy}`];
        if(!room||!room.revealed||prev.has(room.id))continue;
        const isGoal=room.id===goal;
        if(!isGoal&&!room.cleared&&['guardian','shadow','chest','key','trap','event'].includes(room.type))continue;
        if(!isGoal&&room.type==='exit'&&!j.explore.exitUnlocked)continue;
        prev.set(room.id,{from:id,dir});
        if(isGoal){
          const path=[];
          let cursor=room.id;
          while(cursor!==start){
            const step=prev.get(cursor);
            if(!step)return null;
            path.unshift({dir:step.dir,roomId:cursor});
            cursor=step.from;
          }
          return path;
        }
        queue.push(room.id);
      }
    }
    return null;
  }
  function walkMapPath(path){
    if(!path?.length)return;
    for(const step of path){
      const result=model.mapMove(step.dir);
      if(result.ok)applyRegionStep();
      if(result.pending){handlePending(result);return;}
      if(!result.ok){j.mapMessage=result.reason;break;}
      const room=currentRoom(j.explore);
      if(room&&(room.type==='exit'||room.type==='safe'||(!room.cleared&&['chest','key','trap','event'].includes(room.type))))break;
    }
    renderMap();
    const room=currentRoom(j.explore);
    if(room&&(room.type==='exit'||room.type==='safe'||(!room.cleared&&['chest','key','trap','event'].includes(room.type))))revealRoomPanel();
  }
  function mapCell(room,explore,flavor){
    const current=room.x===explore.player.x&&room.y===explore.player.y;
    const clickable=room.revealed&&!current;
    const classes=['map-cell'];
    if(!room.revealed)classes.push('is-fog');
    else{
      classes.push(`is-${room.type}`);
      if(room.visited)classes.push('is-visited');
      if(room.cleared&&room.type!=='empty')classes.push('is-cleared');
      if(current)classes.push('is-current');
    }
    const body=room.revealed
      ?`${current?`<span class="map-you">YOU</span>`:''}<span class="map-glyph">${icon(current?'mask':mapIcon(room.type))}</span><span class="map-name">${current?'你在这里':(flavor.rooms[room.type]??mapName(room.type))}</span>${room.type==='exit'&&explore.exitUnlocked?'<span class="map-open">OPEN</span>':''}`
      :'<span class="map-fog-mark">?</span><span class="map-name">未探明</span>';
    const tag=clickable?'button':'div';
    const attrs=clickable?`type="button" data-tower="room:${room.x}:${room.y}"`:(current?'aria-current="true"':'');
    return `<${tag} class="${classes.join(' ')}" ${attrs} ${room.revealed?`aria-label="${flavor.rooms[room.type]??mapName(room.type)}${current?'，当前位置':'，点击走过去'}"`:'aria-label="未探明房间"'}>${body}</${tag}>`;
  }
  function mapPage(){
    if(!j.explore||!j.map)return '';
    const explore=j.explore,room=currentRoom(explore),floor=j.floor;
    const flavor=floorFlavor(floor);
    const region=regionForFloor(floor,j.maxFloor);
    const blockBoss=Boolean(explore.map.rooms[explore.map.guardianId]?.blockBoss&&!explore.guardianDefeated);
    const revealed=visibleRooms(explore).length;
    const cells=[];
    for(let y=0;y<j.map.height;y+=1)for(let x=0;x<j.map.width;x+=1)cells.push(mapCell(j.map.rooms[`${x},${y}`],explore,flavor));
    const roomActions=()=>{
      if(room.type==='key'&&!room.cleared)return btn('收下旧钥匙','take-key','出口可以直接开锁');
      if(room.type==='chest'&&!room.cleared)return btn('先检查','inspect-chest','消耗 1 步 · 安全打开')+btn('直接打开','open-chest','不耗步 · 可能触发陷阱','danger');
      if(room.type==='trap'&&!room.cleared)return btn('拆解机关','disarm-trap','警戒 -8%')+btn('硬闯','force-trap','警戒 +12% · HP -6','danger');
      if(room.type==='safe')return btn(room.rested?'已经休息过':blockBoss?'先击破区段守层者':'在安全屋休息','rest','警戒 -20% · 恢复 30% HP/SP',room.rested||blockBoss);
      if(room.type==='event'&&!room.cleared)return btn('触碰水面','event-heal','回复 15% HP')+btn('带走月光','event-buff','下一战伤害 +5%');
      if(room.type==='exit')return explore.exitUnlocked?btn('走下这一层','leave-floor','下一层还在上面'):`<p class="map-locked">${explore.map.rooms[explore.map.guardianId]?.blockBoss&&!explore.guardianDefeated?'区段守层者还站在门前。钥匙打不开，必须击破它。':'出口锁着。击破守卫，或带一把钥匙来。'}</p>`;
      if(room.type==='guardian'&&!room.cleared)return btn(room.blockBoss?'迎战区段守层者':'迎战守卫','enter',room.blockBoss?'钥匙无效 · 击破后本段出口解锁':'击破后解锁出口','danger');
      if(room.type==='shadow'&&!room.cleared){
        const failed=Boolean(j.pending?.talkFailed);
        return `${failed?'<p class="map-locked">它不再听你说话了。</p>':btn('开口交涉','shadow-talk','自己写一句 · 失败会开战','yellow')}${btn('迎战影子','enter',failed?'只能打了':'它挡在这里','danger')}`;
      }
      return `<p class="map-quiet">这里只有回声。继续走，或者听一听墙后的动静。</p>`;
    };
    return `<div class="page-heading map-page-heading"><h1>登塔<span>ASCEND / 03</span></h1><p>${esc(flavor.tagline)} · 每一步都会留下声音。</p></div>
      <div class="map-hud"><span>${esc(getStratum(j.stratum).name)} <b>${floor} / ${j.maxFloor} F</b></span><span>区域 <b>${esc(region.short)}</b></span><span>区段 <b>${Math.ceil(floor/10)} / ${Math.ceil(j.maxFloor/10)}</b></span><span>月光 <b>${explore.time}</b> / ${explore.maxTime} 步</span><span>警戒 <b>${j.security}%</b></span><span>钥匙 <b>${j.keys}</b></span><span>HP <b>${state.hp}</b> / ${state.heroMaxHp??52}</span><span>SP <b>${state.sp}</b> / ${state.heroMaxSp??34}</span>${j.alert?'<span class="journey-alert">ALERT · 被盯上了</span>':''}</div>
      <div class="map-region"><div><span>${region.from}–${region.to}F</span><b>${esc(region.name)}</b></div><p>${esc(region.rule)}</p></div>
      <div class="map-shell"><section class="map-board" aria-label="${esc(getStratum(j.stratum).name)} ${floor} 层房间地图">
        <div class="map-board-head"><div><span>FLOOR ${String(floor).padStart(2,'0')} / ${esc(flavor.name)} · BLOCK ${String(Math.ceil(floor/10)).padStart(2,'0')}</span><b>${explore.exitUnlocked?'出口已经开了':blockBoss?'击破区段守层者':'找到守卫或钥匙'}</b></div><div class="map-head-tools"><small>拖动查看 · 已探明 ${revealed} / 25</small><button type="button" data-tower="map-center">回到当前位置</button></div></div>
        <div class="map-viewport" data-map-viewport aria-label="可拖动查看的房间地图"><div class="map-grid">${cells.join('')}</div></div>
        <div class="map-legend"><span><i class="lg-you"></i>你</span><span><i class="lg-threat"></i>敌人</span><span><i class="lg-loot"></i>收获</span><span><i class="lg-fog"></i>迷雾</span></div>
      </section><aside class="map-side">
        <div class="map-current ${j.alert?'is-alert':''}"><span>${floor}F · ${esc(flavor.name)}</span><h2>${room.cleared?roomTitle(room):(flavor.rooms[room.type]??roomTitle(room))}</h2><p>${roomCopy(room,explore)}</p><div class="map-actions">${roomActions()}</div></div>
        <div class="map-objective"><span>本层目标</span><b>${explore.exitUnlocked?'出口已开':blockBoss?'击破区段守层者':'击破守卫 / 取得钥匙'}</b><small>${j.mapMessage||'剩下 '+explore.time+' 步。贪一间房，还是现在就走？'}</small></div>
        <div class="map-pad" aria-label="移动"><button data-tower="move:up" aria-label="向上">↑</button><button data-tower="move:left" aria-label="向左">←</button><button data-tower="map-listen" aria-label="倾听">听</button><button data-tower="move:right" aria-label="向右">→</button><button data-tower="move:down" aria-label="向下">↓</button></div>
        <div class="map-side-foot">${btn('听一听墙后','map-listen','消耗 1 步 · 警戒 +4')}${btn('下塔回顾','retreat','带走已经拿到的东西')}</div>
      </aside></div>`;
  }
  function route(){
    if(!j.active)model.start();
    if(j.ended)return `<div class="page-heading"><h1>登塔<span>ASCEND / 03</span></h1></div><section class="journey-ended"><div class="recap-floor"><b>${String(j.floor).padStart(2,'0')}</b><span>FLOOR</span></div><div><h2>${j.ended==='clear'?'回声之庭，已经穿过。':j.ended==='timeout'?'天亮了。':'今晚的行程，停在这里。'}</h2><p class="scene-copy">${j.ended==='timeout'?`这一层的月光用完了。你带着已经拿到的东西退回塔门。`:''}这一次抵达 ${j.floor}F，完成 ${j.history.length} 个节点。回看本夜记录。</p>${btn('回看本夜记录','recap')}${j.ended==='clear'?btn('走向终局','finale'):''}${btn('重新进入此层','start','清空本夜进度并重新开始')}</div></section>`;
    if(j.pending?.kind==='calling')return frame('写下来。','CALLING CARD',`<div class="story-layout"><div class="scene-emblem">${icon('star')}</div><div><h2>${j.floor}F · 预告信</h2><p class="scene-copy">塔顶的执念已经察觉到你。把名字写上去，它才会从阴影里走出来。</p>${btn('送出预告信','send-calling','Boss 前置')}</div></div>`);
    if(j.floor>=j.maxFloor||j.callingCardSent)return frame('塔顶，正在注视你。','SHADOW',`<div class="boss-layout"><div class="scene-emblem">${icon('mask')}</div><div><span class="boss-phase">MAIN SHADOW</span><h2>回声的执念</h2><p class="scene-copy">走过的每一层，最终都在这里相遇。</p>${btn('迎战心魔','enter','第一形态击破后会在战斗舞台变身')}</div></div>`);
    if(!j.explore){
      applyRunBonuses();
      if(j.floor<1)model.beginFloor(1);else model.beginFloor(j.floor);
    }
    return mapPage();
  }
  function act(action){
    if(action==='shadow-talk'){
      if(j.pending?.kind!=='shadow'||j.pending.resolved)return;
      shadowTalk={profile:shadowProfileFor(j.pending.encounter??{},j.floor),text:'',status:'',judged:null,result:null};
      page='shadow-talk';
      render({focus:true});
      return;
    }
    if(action==='shadow-talk-back'){cancelShadowTalk();page=null;renderMap();return;}
    if(action==='shadow-talk-send'){void sendShadowTalk();return;}
    if(action==='shadow-talk-fight'){cancelShadowTalk();page=null;enter();return;}
    if(action==='shadow-talk-continue'){cancelShadowTalk();page=null;renderMap();return;}
    if(action.startsWith('room:')){
      const [,x,y]=action.split(':').map(Number);
      const path=findMapPath(x,y);
      if(path===null){j.mapMessage='这条路还没探明，或者被挡住了。先走近一点，或者用“听”。';renderMap();return;}
      if(!path.length)return;
      walkMapPath(path);
      return;
    }
    if(action.startsWith('move:')){
      const result=model.mapMove(action.slice('move:'.length));
      if(result.ok)applyRegionStep();
      if(result.pending){handlePending(result);return;}
      if(!result.ok)j.mapMessage=result.reason;
      renderMap();
      return;
    }
    if(action==='map-listen'){
      const result=model.mapAct('listen');
      j.mapMessage=result.ok?`你听见墙后有一点动静。还剩 ${j.explore?.time??0} 步。`:result.reason??'什么也没听见。';
      renderMap();
      return;
    }
    if(action==='take-key'&&j.explore){
      const result=model.mapAct('take-key');
      if(result.ok){markRequest('key');j.mapMessage=`收下旧钥匙。出口可以直接开锁。`;}
      renderMap();
      return;
    }
    if((action==='open-chest'||action==='inspect-chest')&&j.explore){
      const chest=currentRoom(j.explore);
      const inspect=action==='inspect-chest';
      const result=model.mapAct(action);
      if(result.ok){
        const loot=rollChestLoot({floor:j.floor,maxFloor:j.maxFloor,tier:chestTierForKind(chest?.chestKind,j.floor,(j.chestBonus??0)+(regionForFloor(j.floor,j.maxFloor).chestBonus||0),j.maxFloor)});
        const granted=grantLoot(state,loot);
        const max=state.heroMaxSp??34;
        state.sp=Math.min(max,state.sp+10);
        let damage=0;
        if(result.trapped){
          damage=Math.max(1,Math.round((state.heroMaxHp??52)*.12));
          state.hp=Math.max(1,state.hp-damage);
        }
        j.loot.push({floor:j.floor,label:granted.text||'月匣收获',sp:10});
        j.mapMessage=`月匣开了。${granted.text||'拿到一点东西'}${damage?` · 陷阱触发，HP -${damage}`:''} · SP +10。`;
        api.persistP5State?.();
      }else{
        j.mapMessage=result.reason??'这个匣子打不开。';
      }
      renderMap();
      return;
    }
    if(action==='disarm-trap'&&j.explore){
      const result=model.mapAct('disarm-trap');
      if(result.ok)j.mapMessage=`机关拆开了。警戒 ${j.security}%。`;
      renderMap();
      return;
    }
    if(action==='force-trap'&&j.explore){
      const result=model.mapAct('force-trap');
      if(result.ok){state.hp=Math.max(1,state.hp-6);j.mapMessage=`硬闯过去。HP ${state.hp}，警戒 ${j.security}%。`;}
      renderMap();
      return;
    }
    if(action==='rest'&&j.explore){
      const result=model.mapAct('rest');
      if(result.ok){
        const maxHp=state.heroMaxHp??52,maxSp=state.heroMaxSp??34;
        const heal=regionForFloor(j.floor,j.maxFloor).safeHeal??.3;
        state.hp=Math.min(maxHp,state.hp+Math.max(1,Math.ceil(maxHp*heal)));
        state.sp=Math.min(maxSp,state.sp+Math.max(1,Math.ceil(maxSp*heal)));
        markRequest('safe');
        j.mapMessage=`休息过了。HP ${state.hp}/${maxHp} · SP ${state.sp}/${maxSp}。`;
      }
      renderMap();
      return;
    }
    if(action==='event-heal'&&j.explore){
      const result=model.mapAct('event-heal');
      if(result.ok){const max=state.heroMaxHp??52;state.hp=Math.min(max,state.hp+Math.max(1,Math.round(max*.15)));j.mapMessage=`水面映出一点暖意。HP ${state.hp}/${max}。`;}
      renderMap();
      return;
    }
    if(action==='event-buff'&&j.explore){
      const result=model.mapAct('event-buff');
      if(result.ok){j.buffs.push('月光映照 +5%');j.mapMessage='你把月光收进掌心。下一战伤害 +5%。';}
      renderMap();
      return;
    }
    if(action==='leave-floor'&&j.explore){
      if(model.completeFloor()){j.mapMessage='';renderMap();}
      return;
    }
    if(action==='map-center'){centerMapViewport(true);return;}
    if(action==='rest'){restParty();return;}
    if(action==='continue'){page=null;routeBack();return;}
    if(action==='safe-rest'){if(model.rest()){markRequest('safe');saveRun();render({focus:true});}return;}
    if(action==='safe-continue'){if(model.resolve({label:'安全屋',detail:`警戒压回 ${j.security}%`,type:'safe'}))finish();return;}
    if(action==='send-calling'){if(model.sendCallingCard()&&model.resolve({label:'预告信已送出',detail:'塔顶的执念开始回应。',type:'calling'}))finish();return;}
    if(action==='trap-disarm'){model.disarmTrap();if(model.resolve({label:'机关已拆',detail:`警戒 ${j.security}%`,type:'trap'}))finish();return;}
    if(action==='trap-force'){model.forceTrap();state.hp=Math.max(1,state.hp-6);if(model.resolve({label:'硬闯机关',detail:`HP ${state.hp} · 警戒 ${j.security}%`,type:'trap'}))finish();return;}
    if(action==='take-key'){model.takeKey();markRequest('key');if(model.resolve({label:'收下旧钥匙',detail:`钥匙 ${j.keys} 把`,type:'key'}))finish();return;}
    if(action==='prep-return'){prepMessage='';show('prep');return;}
    if(action==='continue-run'){if(!restoreRun()){prepMessage='没有可以继续的塔层进度。';show('prep');}return;}
    if(action==='new-run'){clearRun();prepMessage='上次进度已清空。';show('prep');return;}
    if(action.startsWith('stratum:')){
      if(j.active&&!j.ended){prepMessage='塔层只能在进入高塔前更换。';show('prep');return;}
      state.towerStratum=action.slice('stratum:'.length);
      model.setStratum(state.towerStratum);
      api.persistP5State?.();
      render({focus:true});
      return;
    }
    if(action==='prep-shop'){shopReturn='prep';shopMessage='';show('shop');return;}
    if(action==='prep-gear'){show('gear');return;}
    if(action==='prep-inventory'){inventoryTab='consumables';inventoryMessage='';show('inventory');return;}
    if(action.startsWith('inventory-tab:')){inventoryTab=action.slice('inventory-tab:'.length);inventoryMessage='';render({focus:true});return;}
    if(action.startsWith('sell-item:')){
      const result=sellInventoryItem(state,action.slice('sell-item:'.length),1);
      inventoryMessage=result.ok?`卖出 ${result.label}，+¥${result.gain}。`:result.reason;
      api.persistP5State?.();
      render({focus:true});
      return;
    }
    if(action.startsWith('use-item:')){
      const result=useInventoryItem(state,action.slice('use-item:'.length));
      inventoryMessage=result.ok?`使用 ${result.label}，${result.kind==='heal'?'HP':result.kind==='sp'?'SP':''} +${result.amount}。`:result.reason;
      api.persistP5State?.();
      if(result.ok)saveRun();
      render({focus:true});
      return;
    }
    if(action.startsWith('upgrade-gear:')){
      const result=upgradeEquipment(state,action.slice('upgrade-gear:'.length));
      inventoryMessage=result.ok?`${result.label} 强化到 +${result.level}。`:result.reason;
      api.persistP5State?.();
      render({focus:true});
      return;
    }
    if(action==='prep-velvet'){velvetReturn='prep';fusionPreview=null;fusionMessage='';specialPreview=null;specialMessage='';velvetService='fusion';velvetMessage='';show('velvet');return;}
    if(action==='prep-persona'){stop();page=null;api.goRoom('persona');return;}
    if(action==='prep-awaken'){api.openAwakening?.();return;}
    if(action==='enter-tower'){
      if(!state.personaCreated){prepMessage='先让面具回应你。';show('prep');return;}
      const shadow=shadowState();
      if(!shadow.active){prepMessage=`影时间尚未降临。下次开启：${shadow.nextStart?shadow.nextStart.toLocaleString('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}):'等待下次影时间'}。`;show('prep');return;}
      if(!j.active||j.ended){
        if(restoreRun())return;
        clearRun();
        model.start(state.towerStratum);
        applyRunBonuses();
        j.request=createRequest(requestForStratum(state.towerStratum));
        model.beginFloor(1);
        saveRun();
      }
      if(j.active&&j.explore){page=null;api.goRoom('tower');queueMapCenter();return;}
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
    if(action.startsWith('velvet-service:')){velvetService=action.slice('velvet-service:'.length);velvetMessage='';fusionMessage='';fusionPreview=null;specialPreview=null;specialMessage='';skillCardSelected='';networkPreview=null;networkMessage='';render({focus:true});return;}
    if(action==='gallows-exec'){gallowsExec();return;}
    if(action==='chair-exec'){chairExec();return;}
    if(action.startsWith('lockdown-exec:')){lockdownExec(action.slice('lockdown-exec:'.length));return;}
    if(action==='compendium-register'){compendiumRegister();return;}
    if(action.startsWith('withdraw:')){withdrawPersona(action.slice('withdraw:'.length));return;}
    if(action==='preview-fusion'){previewFusion();return;}
    if(action==='confirm-fusion'){confirmFusion();return;}
    if(action.startsWith('special-recipe:')){previewSpecial(action.slice('special-recipe:'.length));return;}
    if(action==='confirm-special'){confirmSpecial();return;}
    if(action==='network-scan'){scanNetwork();return;}
    if(action==='confirm-network'){confirmNetwork();return;}
    if(action.startsWith('skill-card:')){skillCardSelected=action.slice('skill-card:'.length);velvetMessage='';render({focus:true});return;}
    if(action==='use-skill-card'){useSkillCard();return;}
    if(action==='return-back'){show(velvetReturn);return;}
    if(action==='velvet-exit'){show(velvetReturn);return;}
    if(action.startsWith('select:')){if(model.select(action.slice(7))){render();document.querySelector(`[data-tower="${action}"]`)?.focus({preventScroll:true});}return;}
    if(action==='start'){start();return;}
    if(action==='retry'){reveal();return;}
    if(action==='route'){
      if(!j.active){model.start(state.towerStratum);applyRunBonuses();j.request=createRequest(requestForStratum(state.towerStratum));}
      if(!j.explore&&!j.pending&&j.floor<j.maxFloor){applyRunBonuses();model.beginFloor(j.floor<1?1:j.floor);}
      saveRun();
      routeBack();
      return;
    }
    if(action==='enter'){enter();return;}
    if(['heal','buff','gaze','pass','correct','wrong'].includes(action)){choose(action);return;}
    if(action==='reveal-chest'&&page==='chest'){show('chest-open');return;}
    if(action==='claim'&&page==='chest-open'){claim();return;}
    if(action==='finish'){finish();return;}
    if(action==='retreat'){show(j.ended==='clear'?'clear':'retreat');return;}
    if(action==='descend'&&page==='retreat'){model.end('descend');clearRun();showRecap();return;}
    if(action==='recap'){showRecap();return;}
    if(action==='skip-recap'){finishRecap();return;}
    if(action==='intel'){show('reveal-ready');return;}
    if(action==='finale'&&j.ended==='clear'){show('finale');return;}
    if(action==='endless'){model.startEndless(state.towerStratum);applyRunBonuses();j.request=createRequest('boss');requestMessage='';reveal(false);return;}
    if(action==='home'){stop();page=null;api.goRoom('battle');return;}
    if(action==='back'){
      if(!page&&!j.active){stop();api.goRoom('battle');return;}
      if(page==='shop'){show(shopReturn);return;}
      if(page==='gear'){show('prep');return;}
      if(page==='inventory'){show('prep');return;}
      if(page==='velvet'){show(velvetReturn);return;}
      if(page==='shadow-talk'||page==='shadow-talk-result'){cancelShadowTalk();page=null;renderMap();return;}
      if(page==='prep'){stop();page=null;api.goRoom('battle');return;}
      if(page==='interlude'){routeBack();return;}
      if(page==='return'){stop();page=null;api.goRoom('battle');return;}
      if(page==='recap'&&!recap.done){finishRecap();return;}
      if(j.ended){stop();page=null;api.goRoom('battle');}else routeBack();
    }
  }
  document.addEventListener('visibilitychange',()=>{if(clock)clock.last=performance.now();});
  document.addEventListener('input',event=>{
    if(event.target?.id!=='grid-talk-input')return;
    const counter=document.querySelector('#grid-talk-count');
    if(counter)counter.textContent=`${event.target.value.length} / 160`;
  });
  document.addEventListener('keydown',event=>{
    if(page||state.fighting||!j.explore)return;
    if(event.target?.matches?.('input,select,textarea'))return;
    const dir={ArrowUp:'up',w:'up',W:'up',ArrowDown:'down',s:'down',S:'down',ArrowLeft:'left',a:'left',A:'left',ArrowRight:'right',d:'right',D:'right'}[event.key];
    if(!dir)return;
    event.preventDefault();
    act(`move:${dir}`);
  });
  return {screen,route,act,start,showRecap,checkpoint:saveRun,prep(){return prepPage();},...debugMode?{debugJump,debugOpenChest,debugFightShadow,debugShadowTalk,debugGuardian,debugExit}:{},get snapshot(){return {active:j.active,floor:j.floor,maxFloor:j.maxFloor,ended:j.ended};},get active(){return j.active;},get page(){return page;},get pendingBattle(){return j.active&&['mob','boss','elite','guardian','shadow'].includes(j.pending?.kind)&&!j.pending.resolved&&!j.ended;},
    hide(){stop();page=null;},recordLoot(reward){return model.addLoot(reward);},
    preview(next){if(next!=='return'&&next!=='velvet')return false;model.start(state.towerStratum);j.request=createRequest(requestForStratum(state.towerStratum));j.floor=j.maxFloor;j.ended='clear';interlude={battle:{summary:'这一夜的最后一道影子，已经散了。'},rested:false,party:[]};fusionPreview=null;fusionMessage='';specialPreview=null;specialMessage='';networkPreview=null;networkMessage='';velvetService='fusion';velvetMessage='';velvetReturn='return';skillCardSelected='';prepMessage='';requestMessage='';page=next;return true;},
    battleReturn(won,phase,battleResult){
      if(!this.pendingBattle)return;
      const battleKind=j.pending.kind;
      const mapBattle=['guardian','shadow'].includes(battleKind)&&Boolean(j.explore);
      if(!won){
        if(mapBattle){model.resolveMapBattle(false);clearRun();page=null;show('defeat');return;}
        j.pending.battleState={enemyHp:battleKind==='boss'?state.enemyHp:312,stagger:battleKind==='boss'?state.stagger:0,turn:state.turn,phase:battleKind==='boss'?phase:1};
        page=null;
        return;
      }
      const floor=j.pending.floor,wasBoss=battleKind==='boss',blockBoss=Boolean(j.pending.blockBoss);
      // 先认领合法遭遇，再产生任何资源副作用；异常旧存档不能先领奖。
      if(mapBattle){if(!model.resolveMapBattle(true))return;}
      else if(!model.resolve({label:'战斗胜利',detail:battleResult?.summary??'击破了挡路的阴影。',type:'battle',receipt:battleResult??null}))return;
      const effects=gearFx();
      const drops=Array.isArray(battleResult?.drops)?battleResult.drops:[];
      const reward=battleResult?.reward??null;
      const items=[];
      let spGain=0;
      for(const drop of drops){
        if(drop?.sp)spGain+=Number(drop.sp)||0;
      }
      if(reward?.sp)spGain+=Number(reward.sp)||0;
      const battleLoot=rollBattleLoot({
        floor,
        maxFloor:j.maxFloor,
        kind:wasBoss?'boss':battleKind,
        stratum:j.stratum,
        rng:Math.random,
        dropBonus:effects.drop,
        blockBoss,
      });
      const granted=grantLoot(state,battleLoot);
      if(granted.lines.length){items.push(...granted.lines);state.battleLoot.push(...granted.lines);}
      const moneyGain=Math.round((240+floor*60)*(1+effects.money)*(regionForFloor(floor,j.maxFloor).reward||1));
      state.money+=moneyGain;
      if(spGain)state.sp=Math.min(state.heroMaxSp??state.sp,state.sp+spGain);
      if(wasBoss){
        markRequest('boss');
        state.npcTrust=Object.fromEntries(Object.entries(state.npcTrust??{}).map(([id,value])=>[id,Math.min(5,(Number(value)||0)+1)]));
      }else if(battleKind==='elite'||battleKind==='guardian')markRequest('elite');
      const xpPersonaId=state.activePersonaId,built=buildBattlePersona(xpPersonaId),xpGain=20+floor*4;
      const progress=grantPersonaXp({xp:Number(state.personaXp?.[xpPersonaId])||0,level:built?.level??1},xpGain);
      state.personaXp={...(state.personaXp??{}),[xpPersonaId]:progress.xp};
      if(progress.leveled){
        const previous=state.personaOverrides?.[xpPersonaId]??{},override={...previous,level:progress.level};
        state.personaOverrides={...(state.personaOverrides??{}),[xpPersonaId]:override};
        setPersonaOverride(xpPersonaId,override);
        const growth=state.personaGrowth?.[xpPersonaId]??{level:1,points:0,skillRanks:[],selectedSkill:0};
        state.personaGrowth={
          ...(state.personaGrowth??{}),
          [xpPersonaId]:{
            ...growth,
            level:Math.max(Number(growth.level)||1,Math.min(5,progress.level)),
            points:(Number(growth.points)||0)+progress.leveled,
          },
        };
      }
      api.persistP5State?.();
      if(mapBattle){
        page=null;
        j.mapMessage=`${battleKind==='guardian'?(blockBoss?'区段守层者倒下，本段出口解锁。':'守卫倒下，出口解锁。'):'影子散了。'} ¥${moneyGain}${granted.text?` · ${granted.text}`:''}`;
        saveRun();
        queueMapCenter();
        return;
      }
      interlude={battle:battleResult,rested:false,party:captureParty(),personaProgress:{id:xpPersonaId,name:built?.name??xpPersonaId,xpGain,...progress},reward:{money:moneyGain,items,sp:spGain}};
      model.advance();
      if(j.ended)clearRun();else saveRun();
      page=(wasBoss||j.ended==='clear')?'return':'interlude';
    },
    defeat(){model.end('defeat');clearRun();show('defeat');},
  };
}
