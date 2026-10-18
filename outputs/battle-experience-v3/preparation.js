import {escapeHtml as esc} from './encounters.js';
import {requestAwakening} from './persona-ai.js';

export function createPreparationDirector(api) {
  const {state,masks,icon,openSheet,render,notify,arsenalItems} = api;
  const sheet=document.querySelector('#sheet');
  let createStep=0,answers=[null,null,null,null],sources=[],traits='',working=0,createCandidate=null,awakeningController=null;
  let pendingName='',pendingDescription='',reshapeTarget=0,growthLevel=3;
  let disposed=new Set(),socket=null,oath=null,chain=null;
  const settings={enabled:true,start:'20:00',end:'07:00',hp:40,scale:100};
  const growthState=masks.map(()=>({level:3,points:2,skillRanks:[1,1],selectedSkill:0}));
  const questions=[
    ['对于人生，你认为：',['人生是一场修行，每次经历都是成长的磨砺','人生是一场探险，未知才是最大的魅力','人生是一份责任，对自己和他人都要负责','人生是一段旅程，重要的是沿途的风景和同行的人','人生是一面镜子，你投入什么就得到什么']],
    ['在人群中，你通常：',['是推动事情发展的核心，引领方向','默默观察，在关键时刻给出精准建议','连接不同的人，调节气氛，让大家融为一体','专注于自己的事，保持独立与清醒','寻找志同道合的人，追求深度连接']],
    ['面对过去，你倾向于：',['从失败和挫折中汲取力量，化为前进的动力','珍视美好的记忆，让它们温暖当下的每一刻','坦然接受，好的坏的都造就了现在的自己','有些遗憾，但也无怨无悔，坚定向前','希望改变某些事，因此更加珍惜现在的每个选择']],
    ['对于未来，你持有：',['坚定的信念，目标清晰，步步为营','开放的心态，享受未知带来的一切可能','期待与担忧并存，但相信自己能够面对','专注当下，相信未来自然会到来','理想主义的憧憬，相信世界可以因自己而变得更好']],
  ];
  const sourceLabels=['太初的光芒','文明的墨痕','蒸腾的汽焰','二进制之海','幻想与纹样'];
  const answerAttributes=[[0,1,2,3,4],[1,0,4,2,3],[1,3,0,4,2],[0,2,3,1,4]];
  const growthNames=['起心','定形','回响','越界','觉醒'];
  function btn(label,action,note='',tone=''){return `<button type="button" class="prep-button ${tone}" data-prep="${action}"><span>${label}${note?`<small>${note}</small>`:''}</span>${icon('arrow')}</button>`;}
  function notice(text){const e=document.querySelector('#prep-notice');if(e)e.textContent=text;else notify(text);}
  function footer(){return '<p class="prep-footnote">本次操作只保留在预览内；AI 由宿主配置提供，不写入密钥或真实存档。未接通 AI 时会明确降级为离线回应。</p>';}
  function open(title,body){openSheet(title,`<div class="preparation-panel"><p id="prep-notice" role="alert"></p>${body}${footer()}</div>`);}
  function answerScores(){
    const scores=[0,0,0,0,0];
    answers.forEach((answer,question)=>{if(answer!==null)scores[answerAttributes[question][answer]]+=1;});
    sources.forEach(source=>{scores[source]+=1;});
    return scores;
  }
  function candidateFromAnswers(){
    const scores=answerScores();
    let index=scores.indexOf(Math.max(...scores));
    if(index<0)index=0;
    return {index,scores};
  }
  function scoreBars(scores){
    const total=Math.max(1,...scores);
    return masks.slice(0,5).map((m,i)=>`<div class="trait-bar"><span>${m.attr}</span><i><b style="width:${Math.max(12,scores[i]/total*100)}%"></b></i><strong>${scores[i]}</strong></div>`).join('');
  }
  function showCreateResult(){
    const result=createCandidate||{mode:'offline',selected:0,candidates:[candidateFromAnswers()]};
    createCandidate=result;
    const picked=result.candidates?.[result.selected]||result.candidates?.[0]||candidateFromAnswers();
    const m=masks[picked.index]||masks[0];
    const skills=picked.skills?.length?picked.skills:m.skills.slice(0,2).map(skill=>({name:skill[0],seed:skill[2]}));
    open('你的力量，已经醒来',`<div class="awakening-mark awakened">${icon('mask')}</div><div class="awakening-mode ${result.mode==='ai'?'is-ai':'is-offline'}"><b>${result.mode==='ai'?'AI 回应':'离线回应'}</b><span>${result.mode==='ai'?'基于你的回答生成候选':'当前预览未挂 AI bridge，使用确定性底盘'}</span></div><div class="persona-candidate"><span class="candidate-kicker">回应属性 · ${m.attr}</span><h3 class="prep-lead">${esc(picked.name||m.name)}</h3><p>${esc(picked.description||m.passive)}</p><div class="candidate-skills">${skills.map(skill=>`<span>${esc(skill.name)}<small>${esc(skill.seed)}</small></span>`).join('')}</div></div><p class="candidate-words">“${esc(traits)}”</p><div class="candidate-memory"><span>觉醒记忆</span><b>${esc(result.memory||picked.memory||'这份回应会留在之后的战斗里。')}</b></div><p class="candidate-diagnosis">${esc(result.diagnosis||'你的回答之间，形成了一条仍在变化的力量线索。')}</p><div class="trait-bars" aria-label="回答形成的属性倾向">${scoreBars(result.scores||answerScores())}</div><div class="creation-receipt"><span>四问</span><b>${answers.filter(answer=>answer!==null).length} / 4</b><span>力量之源</span><b>${sources.length} / 2</b><span>候选</span><b>${result.candidates?.length||1} 张</b></div>${btn('确认这张面具','finish-create')}${btn('换一张回应','create-reroll','保留你的回答与自述','subtle')}${btn('回到自述，继续调整','create-return','','subtle')}`);
  }
  function showCreate(){
    if(createCandidate){showCreateResult();return;}
    const steps=`<ol class="awakening-steps" aria-label="觉醒进度">${[1,2,3,4,5].map(n=>`<li class="${n<=createStep?'reached':''}"><b>${String(n).padStart(2,'0')}</b><span>${n===5?'自述':'问答'}</span></li>`).join('')}</ol>`;
    if(createStep===0){open('遇见另一个自己',`<div class="awakening-mark">${icon('mask')}</div><h3 class="prep-lead">那些构成你的力量，<br>正在等待回应。</h3><p>四个选择，一段自述。让面具从你的答案里浮现。</p>${btn('开始觉醒','create-next')}`);return;}
    if(createStep<=4){const [title,options]=questions[createStep-1];open('觉醒问答',`${steps}<h3 class="prep-lead">${title}</h3><div class="answer-options">${options.map((text,i)=>`<button type="button" data-prep="answer:${i}" aria-pressed="${answers[createStep-1]===i}"><span>${String.fromCharCode(65+i)}</span>${text}</button>`).join('')}</div><div class="prep-actions">${btn('上一步','create-back','','subtle')}${btn(createStep===4?'写下自己的特质':'下一问','create-next')}</div>`);return;}
    open('说说你自己',`${steps}<form id="awakening-form"><label class="field-label" for="awakening-traits">那些让你骄傲的品质</label><textarea id="awakening-traits" name="traits" rows="3" maxlength="240" required placeholder="例如：好奇、愿意尝试，也愿意为别人停下来。">${esc(traits)}</textarea><h3 class="source-title">力量之源 <small>可不选 · 最多两项</small></h3><div class="source-options">${sourceLabels.map((label,i)=>`<button type="button" data-prep="source:${i}" aria-pressed="${sources.includes(i)}" ${!sources.includes(i)&&sources.length>=2?'disabled':''}>${label}</button>`).join('')}</div><div class="prep-actions">${btn('回看问答','create-back','','subtle')}${btn('唤醒面具','create-generate')}</div></form>`);
  }
  function showReshape(){
    if(reshapeTarget>=5)reshapeTarget=0;
    const current=masks[reshapeTarget];
    open('重塑一张面具',`<p>选择要重塑的属性。技能、SP 消耗和状态条会保留，确认后只替换这张面具的名字与自述。</p><div class="reshape-attrs">${masks.slice(0,5).map((m,i)=>`<button type="button" data-prep="reshape-target:${i}" aria-pressed="${reshapeTarget===i}">${m.attr}</button>`).join('')}</div><div class="before-mask">${icon('mask')}<div><small>当前面具 · ${current.attr}</small><b>${esc(current.name)}</b><span>${esc(current.passive)}</span></div></div><div class="reshape-contract"><span>保留</span><b>技能组 · SP 消耗 · 出战位置</b><span>替换</span><b>名称 · 与你的联系</b></div><form id="reshape-form"><label class="field-label" for="new-mask-name">新的面具名称</label><input id="new-mask-name" name="name" maxlength="20" required value="${esc(pendingName)}" placeholder="给这份力量一个名字"><label class="field-label" for="new-mask-description">它与你的联系</label><textarea id="new-mask-description" name="description" maxlength="160" rows="3" placeholder="写下一句描述">${esc(pendingDescription)}</textarea>${btn('预览新的面具','reshape-preview')}</form>${btn('让面具重新回应','reshape-summon','查看示例召唤结果','subtle')}`);
  }
  function showGrowth(level=growthLevel){
    const m=masks[state.mask],progress=growthState[state.mask];
    growthLevel=Math.max(1,Math.min(5,Number(level)||progress.level));
    const unlocked=growthLevel<=progress.level;
    const selectedSkill=progress.selectedSkill;
    const skill=m.skills[selectedSkill];
    const rank=progress.skillRanks[selectedSkill];
    const nextLevel=progress.level+1;
    const upgradeButton=unlocked&&progress.points>0?btn('模拟提升技能','growth-upgrade',`消耗 1 枚成长印记 · 当前 ${progress.points}`):progress.points<=0?'<p class="growth-hint">成长印记已用尽，本次预览不会自动补充。</p>':'';
    const unlockButton=!unlocked&&growthLevel===nextLevel&&progress.points>0?btn(`解锁 LV ${growthLevel}`,'growth-unlock','消耗 1 枚成长印记'):'';
    open('力量如何生长',`<div class="growth-heading"><p class="growth-name">${esc(m.name)} <span>${m.attr}</span></p><b>成长印记 <strong>${progress.points}</strong></b></div><div class="growth-track" aria-label="技能解锁等级">${[1,2,3,4,5].map(n=>`<button type="button" data-prep="growth:${n}" class="${n<=progress.level?'unlocked':'locked'}" aria-pressed="${n===growthLevel}">${n<=progress.level?icon('star'):icon('shield')}<span>LV ${n}</span><small>${growthNames[n-1]}</small></button>`).join('')}</div><div class="growth-detail"><div class="growth-status"><b>${unlocked?'已解锁':'尚未解锁'}</b><span>${unlocked?`面具等级 ${progress.level} · 可继续打磨`:`需要先达到 LV ${growthLevel}`}</span></div><h3>${unlocked?esc(skill[0]):`LV ${growthLevel} · 新的回应`}</h3><p>${unlocked?esc(skill[2]):`对应属性达到 ${growthLevel} 级后解锁新的技能节点。`}</p><div class="mastery-bar"><i style="width:${unlocked?Math.min(100,46+rank*18):0}%"></i></div><p>技能熟练度 · ${unlocked?`${rank} / 3 · 可在本次预览中提升`:'等待解锁'}</p></div>${unlocked?`<div class="growth-skill-list" aria-label="技能选择">${m.skills.map((s,i)=>`<button type="button" data-prep="growth-skill:${i}" class="${selectedSkill===i?'selected':''}" aria-pressed="${selectedSkill===i}"><span>${i+1}</span><b>${esc(s[0])}</b><small>等级 ${progress.skillRanks[i]} · ${esc(s[2])}</small></button>`).join('')}</div>${upgradeButton}`:unlockButton}${btn('恢复本次成长预览','growth-reset','','subtle')}`);
  }
  function showSettings(){
    open('战场设置',`<p>影时间，与自己的节奏对齐。</p><form id="battle-settings-form"><label class="check-setting"><span>启用逆影战场</span><input name="enabled" type="checkbox" ${settings.enabled?'checked':''}></label><div class="time-fields"><label class="field-label">影时间开始<input name="start" type="time" required value="${settings.start}"></label><label class="field-label">影时间结束<input name="end" type="time" required value="${settings.end}"></label></div><details class="advanced-settings"><summary>战斗参数</summary><label class="field-label">基础 HP<input name="hp" type="number" min="1" max="9999" required value="${settings.hp}"></label><label class="field-label">攻击倍率（%）<input name="scale" type="number" min="1" max="1000" required value="${settings.scale}"></label></details><div class="prep-actions">${btn('恢复默认','settings-reset','','subtle')}${btn('保存设置','settings-save')}</div></form>`);
    document.querySelector('.settings-button').setAttribute('aria-expanded','true');sheet.classList.add('settings-sheet');
  }
  function item(id){
    if(id==='moon'||id==='thread'){
      if(disposed.has(id)){notify('这件示例遗物已经分解');return;}
      const entry=arsenalItems.relic.find(r=>r[0]===id);if(!entry)return;
      open(entry[1],`<span class="reward-rarity">${id==='moon'?'弦月':'残月'} / RELIC</span><p>${entry[2]}</p><div class="relic-slots">${[0,1].map(i=>`<span class="${i<state.equipped.size?'filled':''}">${icon(i<state.equipped.size?'star':'box')}</span>`).join('')}<b>${state.equipped.size} / 2</b></div>${btn(state.equipped.has(id)?'卸下这件遗物':'携带这件遗物',`equip:${id}`)}${btn('分解为 SP',`salvage:${id}`,id==='moon'?'弦月 · 25 SP':'残月 · 10 SP','subtle')}`);return;
    }
    if(id==='myth'){
      open('迷思 · 慧眼',`<span class="reward-rarity">MYTH STONE</span><p>该技能暴击率提升。每个普通技能只有一个镶嵌位，誓约技能不可镶嵌。</p>${socket?`<div class="effect-receipt">${icon('star')}<span>已镶入 ${esc(masks[socket.mask].name)} · ${esc(masks[socket.mask].skills[socket.skill][0])}</span></div>${btn('卸下迷思','unsocket')}`:`<p>选择一个普通技能。</p>${masks[state.mask].skills.map((s,i)=>oath?.mask===state.mask&&oath.skill===i?'<p>誓约技能不可镶嵌，选择其它普通技能。</p>':btn(esc(s[0]),`socket:${i}`,`${esc(masks[state.mask].name)} · ${s[1]} SP`)).join('')}`}`);return;
    }
    if(id==='oath'){
      open('誓约 · 铁壁之誓',`<span class="reward-rarity">OATH</span><p>为一张面具装上誓约技能。每张 Persona 同时只有一个誓约，可以卸下。</p>${oath!==null?`<div class="effect-receipt">${icon('shield')}<span>${esc(masks[oath.mask].name)} · 技能位 ${oath.skill+1} · 铁壁之誓</span></div>${btn('卸下誓约','remove-oath')}`:`<div class="answer-options">${masks.slice(0,5).map((m,i)=>btn(esc(m.name),`oath-target:${i}`,m.attr)).join('')}</div>`}`);return;
    }
    if(id==='chain'){
      const pairs=[['无畏考据','知识 + 勇气','弱点命中失衡充能提升'],['精算连击','知识 + 灵巧','暴击率 +6%'],['月下共鸣','体贴 + 魅力','共鸣效果 +30%']];
      open('两份力量，相互回应',`<p>同时生效一条共鸣链，选择后会替换当前连接。</p><div class="chain-options">${pairs.map(([name,pair,effect],i)=>`<button data-prep="chain:${i}" aria-pressed="${chain===i}">${icon('mask')}<span><b>${name}</b><small>${pair} · ${effect}</small></span>${chain===i?icon('check'):icon('arrow')}</button>`).join('')}</div>${chain!==null?btn('解除当前共鸣','remove-chain','','subtle'):''}`);
    }
  }
  function act(action){
    const [kind,arg,extra]=action.split(':');
    if(kind==='create'){clearTimeout(working);awakeningController?.abort();awakeningController=null;createStep=0;answers=[null,null,null,null];traits='';sources=[];createCandidate=null;showCreate();return;}
    if(kind==='create-next'){if(createStep>0&&createStep<=4&&answers[createStep-1]===null){notice('先选一个与你接近的回答。');return;}createStep=Math.min(5,createStep+1);showCreate();return;}
    if(kind==='create-back'){if(createStep===5)traits=document.querySelector('#awakening-traits')?.value??traits;createStep=Math.max(0,createStep-1);showCreate();return;}
    if(kind==='answer'){answers[createStep-1]=Number(arg);showCreate();return;}
    if(kind==='source'){traits=document.querySelector('#awakening-traits')?.value??traits;const id=Number(arg);sources=sources.includes(id)?sources.filter(s=>s!==id):sources.length<2?[...sources,id]:sources;showCreate();return;}
    if(kind==='create-generate'){
      const form=document.querySelector('#awakening-form');if(!form.reportValidity())return;traits=new FormData(form).get('traits').trim();if(!traits){notice('写下一点你珍视的品质，再继续。');return;}
      awakeningController?.abort();awakeningController=new AbortController();
      const selectedAnswers=answers.map((answer,question)=>({question:questions[question][0],answer:answer===null?'':questions[question][1][answer]||''}));
      const input={answers:selectedAnswers,traits,sources:[...sources],scores:answerScores(),roster:masks.slice(0,5).map(m=>({attr:m.attr,name:m.name,passive:m.passive,skills:m.skills.slice(0,2)}))};
      open('AI 正在听见你',`<div class="awakening-mark is-awakening">${icon('mask')}</div><h3 class="prep-lead">面具，正在回应。</h3><p id="awakening-reasoning">${api.reduced.matches?'正在整理你的回答。':'AI 正在把你的回答、力量之源和矛盾放在一起。'}</p>`);
      requestAwakening(input,{signal:awakeningController.signal,onReasoning:text=>{const node=document.querySelector('#awakening-reasoning');if(node&&text)node.textContent=text.slice(-120);}}).then(result=>{if(!sheet.open)return;createCandidate={...result,scores:input.scores};showCreateResult();}).catch(error=>{if(error?.name==='AbortError')return;createCandidate={mode:'offline',selected:0,candidates:[candidateFromAnswers()],scores:input.scores,diagnosis:'回应暂时中断，先用离线底盘保留你的答案。',memory:'你把这次没有说完的回应留到了下一次。'};if(sheet.open)showCreateResult();});return;
    }
    if(kind==='finish-create'){const result=createCandidate||{mode:'offline',selected:0,candidates:[candidateFromAnswers()]};const picked=result.candidates?.[result.selected]||result.candidates?.[0]||candidateFromAnswers();state.mask=picked.index;state.skill=0;state.personaCreated=true;growthLevel=growthState[state.mask].level;sheet.close();api.goRoom('persona');notify(`觉醒流程已完成 · ${picked.name||masks[state.mask].name} 已就绪`);return;}
    if(kind==='create-error'){clearTimeout(working);open('回应暂时中断',`<div class="awakening-mark">${icon('eye')}</div><h3 class="prep-lead">你的答案，没有丢失。</h3><p>暂时没有得到回应。可以回看自己的描述，准备好后再试。</p>${btn('回到自述，重新尝试','create-return')}`);return;}
    if(kind==='create-return'){createCandidate=null;awakeningController?.abort();awakeningController=null;createStep=5;showCreate();return;}
    if(kind==='create-reroll'){if(!createCandidate)createCandidate={mode:'offline',selected:0,candidates:[candidateFromAnswers()]};createCandidate.selected=(createCandidate.selected+1)%createCandidate.candidates.length;showCreateResult();return;}
    if(kind==='reshape'){pendingName='';pendingDescription='';reshapeTarget=Math.min(4,state.mask);showReshape();return;}
    if(kind==='reshape-target'){pendingName=document.querySelector('#new-mask-name')?.value??'';pendingDescription=document.querySelector('#new-mask-description')?.value??'';reshapeTarget=Number(arg);showReshape();return;}
    if(kind==='reshape-preview'){
      const form=document.querySelector('#reshape-form');if(!form.reportValidity())return;const data=new FormData(form);pendingName=data.get('name').trim();pendingDescription=data.get('description').trim();if(!pendingName){notice('名称不能只包含空格。');return;}
      const current=masks[reshapeTarget];
      open('让新的名字落定',`<div class="reshape-comparison"><span><small>原来的面具</small><b>${esc(current.name)}</b><em>${esc(current.passive)}</em></span>${icon('arrow')}<span><small>新的面具</small><b>${esc(pendingName)}</b><em>${esc(pendingDescription||'这份力量，与你一同向前。')}</em></span></div><div class="reshape-diff"><span>属性</span><b>${current.attr} · 保留</b><span>技能组</span><b>${current.skills.map(s=>esc(s[0])).join(' · ')} · 保留</b><span>状态条</span><b>HP / SP 位置与数值 · 保留</b></div>${btn('确认重塑','reshape-confirm')}${btn('再改一改','reshape-edit','','subtle')}`);return;
    }
    if(kind==='reshape-edit'){showReshape();return;}
    if(kind==='reshape-summon'){open('新的名字，正在靠近',`<div class="awakening-mark is-awakening">${icon('mask')}</div><h3 class="prep-lead">给这份力量，一次新的回应。</h3><p>示例召唤进行中…</p>`);working=setTimeout(()=>{if(!sheet.open)return;pendingName='远行者';pendingDescription='带着白昼积累的力量，走向未曾抵达的地方。';open('新的面具已回应',`<h3 class="prep-lead">${pendingName}</h3><p>${pendingDescription}</p>${btn('确认重塑','reshape-confirm')}${btn('手动调整','reshape-edit','','subtle')}`);},api.reduced.matches?80:950);return;}
    if(kind==='reshape-error'){open('重塑暂时中断',`<p>当前面具仍然保留。你可以重新尝试，或手动写下新的名称。</p>${btn('重新尝试','reshape-summon')}${btn('改为手动填写','reshape-edit','','subtle')}`);return;}
    if(kind==='reshape-confirm'){if(!pendingName.trim()){notice('先写下新的面具名称。');return;}masks[reshapeTarget].name=pendingName;if(pendingDescription)masks[reshapeTarget].passive=pendingDescription;state.mask=reshapeTarget;sheet.close();api.goRoom('persona');notify('这张示例面具已重塑 · 技能与状态保持不变');return;}
    if(kind==='growth'){growthLevel=Number(arg)||growthState[state.mask].level;showGrowth(growthLevel);return;}
    if(kind==='growth-skill'){const progress=growthState[state.mask];progress.selectedSkill=Math.max(0,Math.min(masks[state.mask].skills.length-1,Number(arg)||0));showGrowth(growthLevel);return;}
    if(kind==='growth-upgrade'){const progress=growthState[state.mask];const skill=progress.selectedSkill;if(progress.points<=0){notice('成长印记已用尽。');return;}if(progress.skillRanks[skill]>=3){notice('这项技能已达到本次预览上限。');return;}progress.points-=1;progress.skillRanks[skill]+=1;showGrowth(growthLevel);return;}
    if(kind==='growth-unlock'){const progress=growthState[state.mask];if(growthLevel!==progress.level+1){notice('请先选择紧邻的下一层。');return;}if(progress.points<=0){notice('成长印记已用尽。');return;}progress.points-=1;progress.level+=1;growthLevel=progress.level;showGrowth(growthLevel);return;}
    if(kind==='growth-reset'){const progress=growthState[state.mask];progress.level=3;progress.points=2;progress.skillRanks=[1,1];progress.selectedSkill=0;growthLevel=3;showGrowth(3);return;}
    if(kind==='settings'){showSettings();return;}
    if(kind==='settings-reset'){const form=document.querySelector('#battle-settings-form');for(const [name,value] of Object.entries({start:'20:00',end:'07:00',hp:40,scale:100}))form.elements[name].value=value;form.elements.enabled.checked=true;notice('已恢复预览默认值，保存后生效。');return;}
    if(kind==='settings-save'){
      const form=document.querySelector('#battle-settings-form');if(!form.reportValidity())return;const data=new FormData(form);Object.assign(settings,{enabled:data.has('enabled'),start:data.get('start'),end:data.get('end'),hp:Number(data.get('hp')),scale:Number(data.get('scale'))});sheet.close();render();notify('设置已保留在本次预览中');return;
    }
    if(kind==='item'){item(arg);return;}
    if(kind==='equip'){
      if(disposed.has(arg))return;
      if(state.equipped.has(arg))state.equipped.delete(arg);else if(state.equipped.size<2)state.equipped.add(arg);else{notice('当前装备位已满，先卸下一件遗物。');return;}
      render();item(arg);return;
    }
    if(kind==='salvage'){open('分解前，确认一下',`<p>分解后，这件遗物会离开本次预览的武库。</p><div class="effect-receipt">${icon('star')}<span>转化为 ${arg==='moon'?25:10} SP</span></div>${btn('保留遗物',`item:${arg}`)}${btn('确认分解',`salvage-confirm:${arg}`,'仅影响示例库存','danger')}`);return;}
    if(kind==='salvage-confirm'){if(disposed.has(arg))return;disposed.add(arg);state.equipped.delete(arg);state.sp=Math.min(260,state.sp+(arg==='moon'?25:10));const i=arsenalItems.relic.findIndex(r=>r[0]===arg);if(i>=0)arsenalItems.relic.splice(i,1);sheet.close();render();notify('示例遗物已分解，SP 已更新');return;}
    if(kind==='socket'){if(oath?.mask===state.mask&&oath.skill===Number(arg)){notice('誓约技能不能镶嵌迷思。');return;}socket={mask:state.mask,skill:Number(arg)};render();item('myth');return;}
    if(kind==='unsocket'){socket=null;render();item('myth');return;}
    if(kind==='oath-target'){open('选择誓约的技能位',`<p>选择 ${esc(masks[Number(arg)].name)} 的一个技能位。原技能会保留，卸下誓约时恢复。</p>${masks[Number(arg)].skills.map((s,i)=>btn(esc(s[0]),`oath:${arg}:${i}`,`技能位 ${i+1} · 替换为铁壁之誓`)).join('')}`);return;}
    if(kind==='oath'){const mask=Number(arg),skill=Number(extra);if(oath){notice('先卸下当前誓约，再选择新的面具。');return;}oath={mask,skill,original:[...masks[mask].skills[skill]]};masks[mask].skills[skill]=['铁壁之誓',18,'护盾 · 视为完全格挡'];render();item('oath');return;}
    if(kind==='remove-oath'){if(oath)masks[oath.mask].skills[oath.skill]=oath.original;oath=null;render();item('oath');return;}
    if(kind==='chain'){chain=Number(arg);render();item('chain');return;}
    if(kind==='remove-chain'){chain=null;render();item('chain');return;}
  }
  sheet.addEventListener('close',()=>{clearTimeout(working);awakeningController?.abort();awakeningController=null;});
  document.addEventListener('submit',event=>{const id=event.target.id;const action={'awakening-form':'create-generate','reshape-form':'reshape-preview','battle-settings-form':'settings-save'}[id];if(action){event.preventDefault();act(action);}});
  return {
    act,item,settings,
    itemStatus(id){return id==='myth'&&socket?'已镶嵌':id==='oath'&&oath!==null?'已装上':id==='chain'&&chain!==null?'已连接':'';},
    personaTools(){return `<div class="preparation-tools"><button data-prep="create">${icon('star')}<span>觉醒问答</span></button><button data-prep="reshape">${icon('mask')}<span>面具重塑</span></button><button data-prep="growth">${icon('eye')}<span>技能成长</span></button></div>`;},
  };
}
