export function createCombatMotion({reduced}) {
  const animations=new Set(),effects=new Set();
  let morph=null;
  const $=selector=>document.querySelector(selector);
  const clamp=(value,low,high)=>Math.min(high,Math.max(low,value));
  function animate(node,frames,options={}) {
    if(!node||reduced.matches)return null;
    const animation=node.animate(frames,{duration:420,easing:'cubic-bezier(.16,1,.3,1)',...options});
    animations.add(animation);
    if(document.hidden)animation.pause();
    animation.finished.catch(()=>{}).finally(()=>animations.delete(animation));
    return animation;
  }
  document.addEventListener('visibilitychange',()=>{
    morph?.resetClock();
    for(const record of effects)record.last=performance.now();
    for(const animation of animations){if(document.hidden)animation.pause();else if(animation.playState==='paused')animation.play();}
  });
  function point(selector,fallback) {
    const element=$(selector);if(!element)return fallback;
    const r=element.getBoundingClientRect();
    return {x:clamp(r.left+r.width/2,22,innerWidth-22),y:clamp(r.top+r.height/2,28,innerHeight-28)};
  }
  function shake(node,amount=5) {
    animate(node,[{translate:'0 0'},{translate:`${-amount}px 2px`,offset:.2},{translate:`${amount}px -1px`,offset:.4},{translate:`${-amount/2}px 1px`,offset:.65},{translate:'0 0'}],{duration:280,easing:'ease-out'});
  }
  function meter(target,to) {
    if(!Number.isFinite(to))return;
    const player=target==='player';
    const fill=$(player?'.player-hud>div:nth-child(2) .meter i':'.enemy-scene>.meter i');
    const number=$(player?'.player-hud>div:nth-child(2) strong':'.enemy-vitals strong');
    const maximum=player?390:420;
    if(number)number.textContent=String(to);
    if(fill){const from=getComputedStyle(fill).width;fill.style.width=`${clamp(to/maximum*100,0,100)}%`;animate(fill,[{width:from},{width:fill.style.width}],{duration:440,fill:'forwards'});}
  }
  function play(kind,{amount,target,meterTo}={}) {
    const player=target==='player'||kind==='player-hit'||kind==='heal'||kind==='guard'||kind==='one-more'||kind==='buff';
    const impact=point(player?'.combat-hero .head':'.enemy-art',{x:innerWidth*(player ? .2 : .73),y:innerHeight*.35});
    const origin=point(player?'.enemy-art':'.combat-hero .head',{x:innerWidth*(player ? .73 : .2),y:innerHeight*.35});
    const root=document.createElement('div');root.className=`battle-impact impact-${kind}`;root.dataset.impact=kind;root.setAttribute('aria-hidden','true');
    root.style.setProperty('--hit-x',`${impact.x}px`);root.style.setProperty('--hit-y',`${impact.y}px`);
    root.style.setProperty('--text-shift',`${clamp(impact.x,110,innerWidth-110)-impact.x}px`);
    const value=Number.isFinite(amount)?Math.round(amount):kind==='heal'?30:kind==='player-hit'?24:48;
    const label={star:'WEAK',slash:'HIT',critical:'CRITICAL',allout:'ALL OUT','player-hit':'DAMAGE',heal:'RECOVER',guard:'BLOCK','one-more':'1 MORE',insight:'INSIGHT',buff:'READY'}[kind]??'HIT';
    const sparks=kind==='critical'||kind==='allout'?22:kind==='heal'?12:14;
    const path=`M ${origin.x} ${origin.y} Q ${(origin.x+impact.x)/2} ${Math.min(origin.y,impact.y)-60} ${impact.x} ${impact.y}`;
    root.innerHTML=`<svg class="attack-trace" viewBox="0 0 ${innerWidth} ${innerHeight}"><path pathLength="1" d="${path}"/><path pathLength="1" d="${path}"/></svg><div class="impact-point"><i class="impact-ring"></i><i class="impact-flare"></i><i class="impact-cut cut-one"></i><i class="impact-cut cut-two"></i><span class="damage-number">${kind==='heal'?'+':kind==='guard'||kind==='one-more'||kind==='insight'||kind==='buff'?'':'−'}${kind==='guard'?'BLOCK':kind==='one-more'?'1 MORE':kind==='insight'?'SCAN':kind==='buff'?'READY':value}</span><b class="impact-label">${label}</b>${Array.from({length:sparks},(_,i)=>{const angle=i*2.39996;const distance=42+(i%5)*17;return `<i class="impact-spark" style="--dx:${Math.cos(angle)*distance}px;--dy:${Math.sin(angle)*distance}px;--spin:${i*47}deg;--delay:${(i%3)*13}ms"></i>`;}).join('')}<svg class="guard-dome" viewBox="0 0 120 140"><path d="M60 8 106 30V73C106 101 79 124 60 134 41 124 14 101 14 73V30Z"/><path d="m39 68 15 16 29-35"/></svg><div class="spell-star"></div></div>`;
    if(kind==='guard'){const counter=document.createElementNS('http://www.w3.org/2000/svg','path');counter.setAttribute('class','counter-trace');counter.setAttribute('pathLength','1');counter.setAttribute('d',`M ${impact.x} ${impact.y} Q ${(impact.x+origin.x)/2} ${Math.min(impact.y,origin.y)+45} ${origin.x} ${origin.y}`);root.querySelector('.attack-trace').append(counter);}
    document.body.append(root);
    let finish;
    const record={root,elapsed:0,last:performance.now(),raf:0,finished:new Promise(resolve=>{finish=resolve;})};
    record.finish=()=>{cancelAnimationFrame(record.raf);root.remove();effects.delete(record);finish();};
    effects.add(record);
    if(!reduced.matches&&['star','slash','critical','allout'].includes(kind))animate($('.combat-hero .figure'),[{translate:'0 0'},{translate:'-9px 2px',offset:.25},{translate:'19px -3px',offset:.6},{translate:'0 0'}],{duration:380});
    const apply=()=>{
      if(!root.isConnected)return;
      root.classList.add('has-contact');meter(player?'player':'enemy',meterTo);
      const actor=player?$('.combat-hero .figure'):$('.enemy-art');
      if(kind==='heal'){
        animate($('.player-hud'),[{filter:'brightness(1)'},{filter:'brightness(1.65)',offset:.25},{filter:'brightness(1)'}],{duration:600});
      }else if(kind==='guard'){
        animate($('.combat-hero .figure'),[{translate:'0 0'},{translate:'-8px 0',offset:.25},{translate:'8px 0',offset:.6},{translate:'0 0'}],{duration:440});
        animate($('.player-hud'),[{filter:'brightness(1)'},{filter:'brightness(1.5)',offset:.3},{filter:'brightness(1)'}],{duration:410});
        animate($('.enemy-art'),[{translate:'0 0'},{translate:'13px -3px',offset:.55},{translate:'0 0'}],{duration:500,delay:110});
      }else if(kind==='one-more'||kind==='buff'||kind==='insight'){
        animate($(kind==='insight'?'.enemy-art':'.combat-hero .figure'),[{filter:'brightness(1)'},{filter:'brightness(1.8)',offset:.35},{filter:'brightness(1)'}],{duration:480});
      }else{
        const baseScale=actor?(parseFloat(getComputedStyle(actor).scale)||1):1;
        animate(actor,[{translate:'0 0',scale:baseScale},{translate:player?'-15px 4px':'16px -4px',scale:baseScale*(player ? .94 : .88),offset:.18},{translate:player?'6px -1px':'-8px 3px',scale:baseScale*1.04,offset:.4},{translate:player?'-3px 0':'5px -1px',scale:baseScale*.98,offset:.65},{translate:'0 0',scale:baseScale}],{duration:470});
        animate(player?$('.player-hud'):$('.enemy-face'),[{filter:'brightness(1)'},{filter:'brightness(2.6)',offset:.08},{filter:'brightness(1.1)',offset:.27},{filter:'brightness(1)'}],{duration:300});
        shake($('.combat-poster'),kind==='critical'||kind==='allout'?5:3);
      }
    };
    let contacted=false;
    const tick=now=>{
      const dt=Math.max(0,now-record.last);record.last=now;
      if(!document.hidden)record.elapsed+=dt;
      if(!contacted&&record.elapsed>=(reduced.matches?0:110)){contacted=true;apply();}
      if(record.elapsed>=(reduced.matches?380:1050)){record.finish();return;}
      record.raf=requestAnimationFrame(tick);
    };
    record.raf=requestAnimationFrame(tick);
    return record;
  }
  function transformBoss({onMorph,onComplete}) {
    if(morph)return;
    const poster=$('.combat-poster'),actor=$('.enemy-art');
    if(!poster||!actor||reduced.matches){onMorph();onComplete();return;}
    const veil=document.createElement('div');veil.className='boss-morph-veil';
    veil.innerHTML='<div class="morph-vignette"></div><div class="morph-caption"><span>BREAK THE MASK</span><b>它的意志，还没有熄灭。</b></div><button class="phase-skip" data-flow="skip-transform">跳过演出 <span>ESC</span></button>';
    document.body.append(veil);poster.classList.add('is-transforming');poster.dataset.morph='gather';
    const shells=document.createElement('div');shells.className='phase-halves';
    const original=$('.enemy-face')??$('.enemy-art .approved-illustration');
    if(original){for(const side of['left','right']){const clone=original.cloneNode(true);clone.classList.add('phase-half',`half-${side}`);clone.removeAttribute('hidden');shells.append(clone);}}
    const core=document.createElement('i');core.className='phase-core';actor.append(shells,core);
    let elapsed=0,last=performance.now(),split=false,changed=false,rafId=0,done=false;
    const run={veil,shells,core,poster,animations:[],finish:null,cancel:null,resetClock:()=>{last=performance.now();}};morph=run;
    const own=animation=>{if(animation)run.animations.push(animation);};
    own(animate(actor,[{scale:1.08,translate:'0 0'},{scale:.92,translate:'0 7px',offset:.25},{scale:1.38,translate:'0 -9px',offset:.66},{scale:1.15,translate:'0 0'}],{duration:1680,easing:'cubic-bezier(.32,0,.2,1)'}));
    const change=()=>{if(changed)return;changed=true;poster.dataset.morph='rise';onMorph();veil.querySelector('.morph-caption').innerHTML='<span>SECOND FORM</span><b>面具之下，意志重生。</b>';};
    const cleanup=()=>{cancelAnimationFrame(rafId);for(const animation of run.animations)animation.cancel();veil.remove();shells.remove();core.remove();poster.classList.remove('is-transforming');delete poster.dataset.morph;morph=null;};
    run.finish=()=>{if(done)return;done=true;change();cleanup();onComplete();};
    run.cancel=()=>{if(done)return;done=true;cleanup();};
    const tick=now=>{
      const dt=Math.max(0,now-last);last=now;if(!document.hidden)elapsed+=dt;
      if(elapsed>=330&&!split){split=true;poster.dataset.morph='fracture';veil.classList.add('is-breaking');for(const [index,half]of[...shells.children].entries()){const direction=index===0?-1:1;own(animate(half,[{translate:'0 0',rotate:'0deg',opacity:1},{translate:`${direction*75}px -24px`,rotate:`${direction*42}deg`,opacity:0}],{duration:650,fill:'forwards'}));}}
      if(elapsed>=850)change();
      if(elapsed>=1680){run.finish();return;}rafId=requestAnimationFrame(tick);
    };rafId=requestAnimationFrame(tick);
  }
  function clear() {
    morph?.cancel();
    for(const record of effects)record.finish();effects.clear();
    for(const animation of animations)animation.cancel();animations.clear();
  }
  return {play,transformBoss,clear,get transforming(){return Boolean(morph);},skipTransformation(){morph?.finish();}};
}
