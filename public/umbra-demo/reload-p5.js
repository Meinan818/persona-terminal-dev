/* MASKARIA · P5R 主题装饰层（reload-p5.js）
   只在 data-theme=p5 时运行；只新增 aria-hidden + pointer-events:none 的装饰节点，
   或给 body 加 class。不拦截点击、不改任何已有节点的文本/属性；尊重 prefers-reduced-motion。 */
(function(){
  'use strict';
  var root=document.documentElement;
  if(root.dataset.theme!=='p5')return;
  var reduced=window.matchMedia?matchMedia('(prefers-reduced-motion: reduce)'):{matches:false};
  var FONTS=['var(--p5-black)','var(--p5-tv)','var(--p5-serif)','var(--p5-cd)','var(--p5-black)'];
  var CLIPS=['none','polygon(0 6%,100% 0,94% 100%,4% 94%)','polygon(4% 0,100% 8%,96% 100%,0 90%)','polygon(0 0,96% 6%,100% 100%,6% 94%)'];
  function rnd(seed){var x=Math.sin(seed*9301+49297)*233280;return x-Math.floor(x);}
  function hash(s){var h=7;for(var i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0;return Math.abs(h);}
  function mk(tag,cls){var e=document.createElement(tag);if(cls)e.className=cls;e.setAttribute('aria-hidden','true');return e;}

  /* ---- 勒索信剪报字 ---- */
  function ownText(el){var t='';el.childNodes.forEach(function(n){if(n.nodeType===3)t+=n.textContent;});return t.trim();}
  function ransom(text,opts){
    opts=opts||{};
    var box=mk('p5r-ransom');box.dataset.src=text;
    var h=hash(text);
    Array.from(text).forEach(function(ch,i){
      var c=document.createElement('p5r-c');
      if(/\s/.test(ch)){c.className='sp';box.appendChild(c);return;}
      c.textContent=ch;
      if(/[。，、！？：；.,!?:;…·]/.test(ch)){c.className='pu';box.appendChild(c);return;}
      var r=rnd(h+i*7),r2=rnd(h+i*13),r3=rnd(h+i*29);
      var scheme=i===0?0:(r<.42?1:r<.72?0:r<.9?2:3);
      var bg=['#fff','#0a0a0a','#e5191c','#f4f1ea'][scheme],fg=['#0a0a0a','#fff','#fff','#e5191c'][scheme];
      if(opts.onRed&&scheme===2){bg='#0a0a0a';}
      c.style.setProperty('--bg',bg);c.style.setProperty('--fg',fg);
      c.style.setProperty('--r',((r2-.5)*14).toFixed(1)+'deg');
      c.style.setProperty('--y',((r3-.5)*.14).toFixed(2)+'em');
      c.style.setProperty('--s',(i===0?1.18:(.86+r3*.3)).toFixed(2)+'em');
      c.style.setProperty('--f',/[A-Za-z0-9]/.test(ch)?FONTS[(i+h)%2?1:3]:FONTS[Math.floor(r2*FONTS.length)%FONTS.length]);
      c.style.setProperty('--cp',CLIPS[Math.floor(r*CLIPS.length)%CLIPS.length]);
      box.appendChild(c);
    });
    return box;
  }
  var HOSTS='.page-heading,.scene-heading,.victory,.sheet-top';
  function applyRansom(){
    document.querySelectorAll(HOSTS).forEach(function(host){
      var h=host.querySelector(':scope>h1,:scope>h2#sheet-title');
      if(!h)return;
      var text=ownText(h);
      var prev=host.querySelector(':scope>p5r-ransom');
      if(!text){if(prev)prev.remove();return;}
      if(prev&&prev.dataset.src===text)return;
      if(prev)prev.remove();
      var box=ransom(text,{onRed:host.classList.contains('sheet-top')});
      host.insertBefore(box,h);
    });
  }

  /* ---- 红黑撕裂 / 星形扩散 转场 ---- */
  var activeWipe=null;
  function wipe(kind){
    if(reduced.matches)return;
    if(activeWipe)activeWipe.remove();
    var w=mk('div','p5r-wipe '+(kind||''));
    w.innerHTML='<i class="p5r-wipe-a"></i><i class="p5r-wipe-b"></i><b class="p5r-wipe-star"></b><i class="p5r-wipe-c"></i>';
    document.body.appendChild(w);activeWipe=w;
    var star=w.querySelector('.p5r-wipe-star'),a=w.querySelector('.p5r-wipe-a'),b=w.querySelector('.p5r-wipe-b'),c=w.querySelector('.p5r-wipe-c');
    /* 第四轮修正：用户偏好上一版转场（红黑撕裂 + 星形扩散），恢复 r3 版本 */
    var o={duration:560,easing:'cubic-bezier(.7,0,.2,1)',fill:'forwards'};
    try{
      a.animate([{transform:'translateX(-120%) skewX(-22deg)'},{transform:'translateX(-10%) skewX(-22deg)',offset:.45},{transform:'translateX(130%) skewX(-22deg)'}],o);
      b.animate([{transform:'translateX(130%) skewX(-22deg)'},{transform:'translateX(5%) skewX(-22deg)',offset:.5},{transform:'translateX(-130%) skewX(-22deg)'}],Object.assign({},o,{delay:40}));
      c.animate([{transform:'translateY(-120%) rotate(-8deg)'},{transform:'translateY(0) rotate(-8deg)',offset:.4},{transform:'translateY(120%) rotate(-8deg)'}],Object.assign({},o,{duration:500,delay:60}));
      star.animate([{transform:'translate(-50%,-50%) scale(0) rotate(0deg)',opacity:1},{transform:'translate(-50%,-50%) scale(1.4) rotate(40deg)',opacity:1,offset:.5},{transform:'translate(-50%,-50%) scale(3.4) rotate(80deg)',opacity:0}],{duration:620,easing:'cubic-bezier(.2,.8,.2,1)',fill:'forwards'});
    }catch(e){}
    setTimeout(function(){w.remove();if(activeWipe===w)activeWipe=null;},760);
  }
  function sig(){
    var m=document.getElementById('content');if(!m)return '';
    var f=m.firstElementChild;if(!f)return location.hash;
    var s=location.hash+'|'+f.className+'|'+(f.dataset.towerScene||'')+'|'+(f.dataset.velvetService||'');
    var st=m.querySelector('.sh-stage');if(st)s+='|stage';
    var ph=m.querySelector('.scene-heading h1,.page-heading h1');if(ph)s+='|'+ownText(ph);
    return s;
  }

  /* ---- 战斗：Hold Up / 总攻击 / 结算定格 ---- */
  function battleDeco(){
    var st=document.querySelector('.sh-stage');
    document.body.classList.toggle('p5r-holdup',!!document.querySelector('.engine-hold-up'));
    if(st&&!st.querySelector(':scope>.p5r-stage-deco')){
      var d=mk('div','p5r-stage-deco');
      d.innerHTML='<i class="p5r-sd-burst"></i><i class="p5r-sd-band"></i><i class="p5r-sd-band b2"></i><b class="p5r-sd-word">TAKE YOUR TIME</b>';
      st.insertBefore(d,st.firstChild);
    }
    var hu=document.querySelector('.engine-hold-up');
    if(hu&&!hu.querySelector(':scope>.p5r-guns')){
      var g=mk('div','p5r-guns');
      var html='';for(var i=0;i<6;i++)html+='<i style="--g:'+i+'"></i>';
      g.innerHTML=html+'<b class="p5r-hu-word">HOLD UP!</b>';
      hu.insertBefore(g,hu.firstChild);
    }
  }
  var showOverDone=new WeakSet();
  function resultDeco(){
    /* 结算页（胜利 / 安全屋 / 回城）出现时，打一次「THE SHOW\'S OVER」定格 */
    var host=document.querySelector('.victory,.safehouse-layout,.recap-summary:not([hidden]),.battle-result,.result-layout');
    if(!host||showOverDone.has(host))return;
    showOverDone.add(host);
    if(reduced.matches)return;
    var f=mk('div','p5r-showover');
    f.innerHTML='<i class="p5r-so-bg"></i><b class="p5r-so-burst"></b><strong>THE SHOW\'S OVER</strong>';
    document.body.appendChild(f);
    setTimeout(function(){f.classList.add('out');},1150);
    setTimeout(function(){f.remove();},1600);
  }


  /* =================== 第二轮：逐页专属装饰（只加 class / data-ui-* / --var / aria-hidden 节点） =================== */
  var ROMAN=['0','I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX','XXI'];
  /* 第四轮：塔罗面具卡（取代几何剪影小人） */
  function TAROT(n,en,zh,mod){return '<div class="p5r-tarot '+(mod||'')+'"><b class="no">'+ROMAN[n]+'</b><i class="mk"></i><em>'+en+'</em><s>'+zh+'</s></div>';}
  var RANKS=['陌生','面熟','熟识','信赖','羁绊','挚友'];
  var DAYS=['SUN','MON','TUE','WED','THU','FRI','SAT'];
  function deco(host,cls,html,first){
    if(!host)return null;
    var e=host.querySelector(':scope>.'+cls.split(' ')[0]);
    if(!e){e=mk('div',cls);if(html)e.innerHTML=html;if(first)host.insertBefore(e,host.firstChild);else host.appendChild(e);}
    return e;
  }
  function num(t){var m=String(t||'').replace(/,/g,'').match(/-?\d+(\.\d+)?/);return m?parseFloat(m[0]):NaN;}
  function setVar(el,k,v){if(el&&el.style.getPropertyValue(k)!==String(v))el.style.setProperty(k,v);}
  function pageInfo(){
    var c=document.getElementById('content'),f=c&&c.firstElementChild;
    var room=(location.hash||'#battle').slice(1)||'battle';
    var sc='';
    if(f){sc=f.dataset.towerScene||f.dataset.scene||f.dataset.velvetService||'';}
    if(document.querySelector('#content .sh-stage'))sc='stage';
    else if(c&&c.querySelector('.slice-shell,.slice-page,[class*="slice-"]')&&!sc){var s=c.querySelector('[class*="slice-"]');sc='slice';}
    if(sc==='null')sc='';
    return {room:room,scene:sc,first:f};
  }
  function homeDeco(){
    var hs=document.querySelector('#content .hero-stage');
    if(hs){
      var d=new Date();
      deco(hs,'p5r-cal','<b>'+(d.getMonth()+1)+'<i>/</i>'+d.getDate()+'</b><em>'+DAYS[d.getDay()]+'</em><span>影时间</span><s></s>',false);
      deco(hs,'p5r-pose','<i class="p5r-pose-red"></i>'+TAROT(0,'THE FOOL','愚者','is-xl'),false);
    }
    document.querySelectorAll('#content .status-ribbon>span,#content .night-hud>span').forEach(function(sp){
      var b=sp.querySelector('b');if(!b)return;var tot=num((sp.textContent.split('/')[1]||''));var v=num(b.textContent);
      if(tot>0&&!isNaN(v))setVar(sp,'--v',Math.max(0,Math.min(1,v/tot)).toFixed(3));
    });
    var tb=document.querySelector('#content .trial-banner');
    if(tb)deco(tb,'p5r-comic','<i class="k1"></i><i class="k2"></i><i class="k3"></i><b>SHOW<br>TIME</b>',false);
  }
  function towerDeco(){
    var nb=document.querySelector('#content .night-base');
    if(!nb)return;
    var d=new Date();
    var hh=('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2);
    var ph=deco(nb,'p5r-phone','<div class="p5r-ph-bar"><b>'+hh+'</b><span>Phan-Site</span><i></i></div><div class="p5r-ph-title"><b>怪盗请求频道</b><small>PHAN-SITE · 影时间</small></div><div class="p5r-ph-meter"><span>支持率</span><i></i><b></b></div><div class="p5r-ph-home"></div>',false);
    var grid=nb.querySelector('.night-base-grid');
    var sl=nb.querySelector('.tower-strata-list');
    deco(sl,'p5r-metro','<i class="ln"></i><b>MEMENTOS LINE</b>',false);
    nb.querySelectorAll('.tower-strata-list>button').forEach(function(b,i){setVar(b,'--i',i);});
    nb.querySelectorAll('.night-npcs>article').forEach(function(a,i){
      var t=a.textContent;var r=0;RANKS.forEach(function(w,k){if(t.indexOf(w)>=0)r=Math.max(r,k);});
      var ar=[19,11,14,7][i%4];
      var e=deco(a,'p5r-arcana','<b>'+ROMAN[ar]+'</b><em>RANK</em><s>'+'<i></i><i></i><i></i><i></i><i></i>'+'</s>',false);
      setVar(a,'--rank',r);setVar(a,'--i',i);
      e.querySelectorAll('s i').forEach(function(p,k){p.className=k<Math.max(1,r)?'on':'';});
    });
    var gate=nb.querySelector('.night-base-gate');
    if(gate){
      var closed=gate.classList.contains('is-closed');
      var g=deco(gate,'p5r-gate','',false);
      var want=closed?'lock':'open';
      if(g.dataset.k!==want){g.dataset.k=want;g.innerHTML=closed?'<i class="ch c1"></i><i class="ch c2"></i><b class="pad"></b><em>SEALED</em>':'<i class="tgt"></i><em>TARGET FOUND</em>';}
    }
    var lab=nb.querySelector('.night-base-slice');
    deco(lab,'p5r-term','<pre>&gt; ssh  oracle@mementos\n&gt; scan --rooms 3..5\n  [####......]  NEGOTIATION.AI\n&gt; <i></i></pre>',false);
    var foot=nb.querySelector('.night-base-foot');
    deco(foot,'p5r-exit','<i></i><i></i><i></i><b>ESCAPE</b>',false);
    var aw=nb.querySelector('.night-base-awaken');
    deco(aw,'p5r-call','<i class="r1"></i><i class="r2"></i><b>INCOMING</b><span>???</span>',false);
    var stats=nb.querySelector('.night-base-stats');
    if(stats)stats.querySelectorAll(':scope>div').forEach(function(s,i){setVar(s,'--i',i);});
  }
  function mapDeco(){
    var hud=document.querySelector('#content .map-hud');
    if(hud){
      hud.querySelectorAll(':scope>span').forEach(function(sp){
        if(sp.textContent.indexOf('警戒')>=0){var v=num(sp.querySelector('b')&&sp.querySelector('b').textContent);if(!isNaN(v)){setVar(hud,'--sec',Math.max(0,Math.min(100,v)));setVar(sp,'--sec',Math.max(0,Math.min(100,v)));sp.classList.add('p5r-sec');
          var dd=deco(sp,'p5r-secg','<i></i>',false);}}
      });
      deco(hud,'p5r-sec-word','SECURITY',false);
    }
    var board=document.querySelector('#content .map-board');
    if(board){
      deco(board,'p5r-bp','<i class="cmp"><b>N</b></i><i class="scl"></i><em>PALACE BLUEPRINT · 殿堂平面图</em><s>THIRD EYE</s>',false);
      var vp=board.querySelector('.map-viewport');
      deco(board,'p5r-sweep','<i></i>',false);
      board.querySelectorAll('.map-cell').forEach(function(c,i){setVar(c,'--i',i);setVar(c,'--x',i%5);setVar(c,'--y',Math.floor(i/5));});
    }
    var cur=document.querySelector('#content .map-current');
    if(cur)deco(cur,'p5r-navi','<i></i><i></i><i></i><i></i><i></i><i></i><i></i><b>NAVI</b>',false);
    var pad=document.querySelector('#content .map-pad');
    if(pad)deco(pad,'p5r-pad-ring','<i></i>',false);
  }
  function talkDeco(){
    var st=document.querySelector('#content .slice-talk-stage');
    if(st)deco(st,'p5r-demon','<i class="face"></i><i class="glow"></i>',false);
    var res=document.querySelector('#content .slice-result');
    if(res){
      deco(res,'p5r-verdict',res.classList.contains('is-success')?'<b>DEAL</b>':'<b>NO DEAL</b>',false);
    }
    var ch=document.querySelector('#content .slice-chance');
    if(ch){var v=num(ch.querySelector('b')&&ch.querySelector('b').textContent);if(!isNaN(v))setVar(ch,'--p',v);var rs=document.querySelector('#content .slice-result-head>small');var rv=num(rs&&rs.textContent);if(!isNaN(rv))setVar(ch,'--roll',rv);}
  }
  function resultDeco2(){
    var rl=document.querySelector('#content .result-layout');
    if(rl){
      deco(rl,'p5r-res','<b>RESULT</b><i></i>',false);
      rl.querySelectorAll('.result-stats>span').forEach(function(s,i){setVar(s,'--i',i);});
    }
    document.querySelectorAll('#content .recap-list>div,#content .safehouse-stats>div,#content .reward-progress>span').forEach(function(s,i){setVar(s,'--i',i);});
  }
  function personaDeco(){
    var md=document.querySelector('#content .mask-display');
    var sl=document.querySelector('#content .persona-ledger-stats .stat-line');
    if(md&&sl){
      var vals=[];sl.querySelectorAll(':scope>span').forEach(function(s){var b=s.querySelector('b');vals.push(num(b&&b.textContent)||0);});
      var key=vals.join(',');var mxv=Math.max(10,Math.max.apply(null,vals));sl.querySelectorAll(':scope>span').forEach(function(sp,i){setVar(sp,'--v',(vals[i]/mxv).toFixed(3));});
      var el=deco(md,'p5r-radar','',false);
      if(el.dataset.k!==key){
        el.dataset.k=key;
        var n=vals.length||5,mx=Math.max(5,Math.max.apply(null,vals)*1.25),pts=[],grid='';
        var lab=['力','魔','耐','速','运'];
        for(var r=1;r<=3;r++){var gp=[];for(var i=0;i<n;i++){var a=-Math.PI/2+i*2*Math.PI/n;gp.push((50+Math.cos(a)*40*r/3).toFixed(1)+','+(50+Math.sin(a)*40*r/3).toFixed(1));}grid+='<polygon points="'+gp.join(' ')+'" class="g"/>';}
        var labs='';
        for(var i=0;i<n;i++){var a=-Math.PI/2+i*2*Math.PI/n,v=Math.max(.12,vals[i]/mx);pts.push((50+Math.cos(a)*40*v).toFixed(1)+','+(50+Math.sin(a)*40*v).toFixed(1));labs+='<text x="'+(50+Math.cos(a)*48).toFixed(1)+'" y="'+(52+Math.sin(a)*48).toFixed(1)+'">'+(lab[i]||'')+'</text>';}
        el.innerHTML='<svg viewBox="-6 -6 112 112">'+grid+'<polygon class="v" points="'+pts.join(' ')+'"/>'+labs+'</svg>';
      }
    }
    if(md)deco(md,'p5r-p-burst','<i></i>',false);
    document.querySelectorAll('#content .mask-tabs>button,#content .persona-roster-grid>button,#content .party-lineup-panel button').forEach(function(b,i){setVar(b,'--i',i);});
  }
  function shopDeco(){
    var host=document.querySelector('#content .shop-layout');
    if(host)deco(host,'p5r-neon','<b>UNDER<span>GROUND</span></b><small>月见坂 · 黑市 · OPEN 24H</small>',false);
    document.querySelectorAll('#content .shop-section').forEach(function(s,i){setVar(s,'--i',i);});
  }
  function pageDeco(){
    var pi=pageInfo();
    var b=document.body;
    if(b.dataset.uiRoom!==pi.room)b.dataset.uiRoom=pi.room;
    if(b.dataset.uiScene!==pi.scene)b.dataset.uiScene=pi.scene;
    if(pi.room==='battle')homeDeco();
    var vr=document.querySelector('#content .velvet-room');if(vr){deco(vr,'p5r-vr-fx','<i></i><i></i>',false);deco(vr,'p5r-vr-stamp','REHABILITATION',false);}
    towerDeco();mapDeco();talkDeco();resultDeco2();personaDeco();shopDeco();
  }

  /* =================== 第三轮：攻击 / 命中特效（只读侦测 + aria-hidden 装饰层，≤900ms） ===================
     触发信号（全部只读）：
       · body 子节点新增 .battle-impact（combat-motion.js 每次演出都会 append，data-impact = slash|star|critical|allout|insight|one-more|buff|heal|guard|player-hit）
       · 出手前的「已选行动」：#content 渲染且 [data-action=execute] 可点时，记下 [data-battle-action][aria-pressed=true] 的 key / 属性文字 / 目标
         （出手后 app 立刻重绘成下一位行动者，所以必须在出手前快照）
       · 道具：道具面板 [data-battle-item] 开着或刚关闭（1.5s 内）时到来的 heal/buff 演出即视为道具
       · 换面具：面具选择面板 [data-switch-mask] 开着或刚关闭时到来的 buff 演出 = 大号 Persona 召唤
       · 敌人倒下：.enemy-unit 从可用变为 .is-down（逐帧缓存其屏幕矩形，撕纸从缓存位置飞出）
     装饰层 .p5r-fx 固定定位、pointer-events:none、aria-hidden；reduced-motion 时整段不运行。 */
  var EL={'物理':'phys','枪击':'gun','火焰':'fire','冰冻':'ice','电击':'electric','疾风':'wind','念动':'psy','核热':'nuclear','祝福':'bless','咒怨':'curse','万能':'almighty','恢复':'healing','辅助':'support','异常':'ailment'};
  var armed=null,itemOpen=false,itemGoneAt=0,maskOpen=false,maskGoneAt=0,enemyCache={},fxLayer=null;
  function lowFx(){return document.body.classList.contains('sh-m')||innerWidth<820;}
  function rectOf(el){if(!el)return null;var r=el.getBoundingClientRect();if(!r.width)return null;return {x:r.left+r.width/2,y:r.top+r.height/2,w:r.width,h:r.height};}
  function snapArmed(){
    var ex=document.querySelector('#content [data-action=execute]');
    if(!ex||ex.disabled)return;
    var sel=document.querySelector('#content [data-battle-action][aria-pressed=true]');
    if(!sel)return;
    var key=sel.dataset.battleAction||'',type=key.split(':')[0];
    var sm=sel.querySelector('small');var det=sm?sm.textContent:'';
    var el=EL[(det.split('·')[0]||'').trim()]||(type==='gun'?'gun':type==='basic'?'phys':'');
    var tgt=document.querySelector('#content .enemy-unit.is-active');
    armed={key:key,type:type,el:el,label:(sel.querySelector('span')||sel).childNodes[0]?((sel.querySelector('span')||sel).childNodes[0].textContent||'').trim():'',target:tgt?tgt.dataset.targetId:''};
  }
  function trackEnemies(){
    var units=document.querySelectorAll('#content .sh-stage .enemy-unit');
    if(!units.length){enemyCache={};return;}
    units.forEach(function(u){
      var id=u.dataset.targetId;if(!id)return;
      var down=u.classList.contains('is-down');
      var c=enemyCache[id];
      if(!down){var r=rectOf(u.querySelector('.enemy-unit-face')||u);enemyCache[id]={alive:true,r:r||(c&&c.r)};return;}
      if(c&&c.alive){enemyCache[id]={alive:false,r:c.r};if(c.r)setTimeout(function(){fxShred(c.r);},260);}
      else if(!c)enemyCache[id]={alive:false,r:null};
    });
  }
  function layer(){
    if(!fxLayer||!fxLayer.isConnected){fxLayer=mk('div','p5r-fx');document.body.appendChild(fxLayer);}
    return fxLayer;
  }
  function spawn(cls,x,y,html,life,vars){
    var e=mk('div','p5r-fx-n '+cls);
    e.style.left=Math.round(x)+'px';e.style.top=Math.round(y)+'px';
    if(vars)for(var k in vars)e.style.setProperty(k,vars[k]);
    if(html)e.innerHTML=html;
    layer().appendChild(e);
    setTimeout(function(){e.remove();},Math.min(900,life||900));
    return e;
  }
  function bits(n,fn){var h='';for(var i=0;i<n;i++)h+=fn(i);return h;}
  /* 普攻：黑色剪影冲刺 + 红黑交叉斩 */
  /* 普攻：怪盗面具掠过（取代原几何剪影） */
  var SIL='<svg viewBox="0 0 200 110" class="sil"><path d="M8 34C30 8 74 14 100 40 126 14 170 8 192 34 190 76 156 96 124 90 110 87 104 78 100 70 96 78 90 87 76 90 44 96 10 76 8 34Z"/><path class="kn" d="M38 44c10-8 30-8 42 6-12 10-32 10-42-6ZM162 44c-10-8-30-8-42 6 12 10 32 10 42-6Z"/></svg>';
  function fxSlash(r,big){
    var s=r.w/200,low=lowFx();
    spawn('p5r-fx-slash'+(big?' is-big':''),r.x,r.y,(low?'':SIL)+'<i class="b1"></i><i class="b2"></i><i class="b3"></i><i class="ink"></i>',760,{'--s':s.toFixed(2)});
  }
  function fxGun(r){
    var s=r.w/200;
    spawn('p5r-fx-gun',r.x,r.y,'<b class="flash"></b>'+bits(3,function(i){return '<i style="--i:'+i+'"></i>';}),720,{'--s':s.toFixed(2)});
  }
  /* Persona 召唤：面具撕裂 + 蓝色火焰 */
  function fxSummon(big){
    var hr=rectOf(document.querySelector('#content .combat-hero .sh-art'))||rectOf(document.querySelector('#content .combat-hero'));
    if(!hr)return 0;
    var low=lowFx(),n=low?5:9;
    var s=Math.min(1.4,Math.max(.5,hr.w/300));
    spawn('p5r-fx-summon'+(big?' is-big':''),hr.x,hr.y-hr.h*.18,'<div class="flames">'+bits(n,function(i){return '<i style="--i:'+i+';--d:'+(((i*37)%9)*18)+'ms;--x:'+((i-(n-1)/2)*22)+'px"></i>';})+'</div><b class="mk l"></b><b class="mk r"></b><em>PERSONA!</em>',big?880:620,{'--s':s.toFixed(2)});
    return big?0:240;
  }
  function fxElement(el,r,delay){
    var s=r.w/200,low=lowFx();
    var n={fire:7,ice:7,electric:3,wind:4,psy:4,nuclear:5,bless:6,curse:6,almighty:6,phys:3,gun:3,healing:8,support:4,ailment:5}[el]||5;
    if(low)n=Math.max(2,Math.ceil(n*.6));
    var e=spawn('p5r-fx-el el-'+el,r.x,r.y,'<b class="core"></b>'+bits(n,function(i){return '<i style="--i:'+i+';--n:'+n+';--a:'+Math.round(i*360/n)+'deg"></i>';}),900-(delay||0)+0,{'--s':s.toFixed(2),'--dl':(delay||0)+'ms'});
    return e;
  }
  /* 伤害数字 → 剪报拼贴字 */
  function fxNumber(text,x,y,variant,delay){
    if(!text)return;
    var box=ransom(text);
    var e=spawn('p5r-fx-num '+(variant||''),x,y,'',900,{'--dl':(delay||0)+'ms'});
    box.querySelectorAll('p5r-c').forEach(function(c,i){c.style.setProperty('--k',i);});
    e.appendChild(box);
  }
  function fxStamp(text,x,y,cls,delay){
    spawn('p5r-fx-stamp '+(cls||''),x,y,'<b>'+text+'</b>',860,{'--dl':(delay||0)+'ms'});
  }
  /* 敌人倒下：撕成纸片 */
  function fxShred(r){
    if(reduced.matches||!r)return;
    var n=lowFx()?8:16,s=r.w/200;
    spawn('p5r-fx-shred',r.x,r.y,bits(n,function(i){
      var a=rnd(i+3)*Math.PI*2,d=70+rnd(i+11)*120;
      return '<i style="--i:'+i+';--dx:'+Math.round(Math.cos(a)*d)+'px;--dy:'+Math.round(Math.sin(a)*d-40)+'px;--rot:'+Math.round((rnd(i+5)-.5)*540)+'deg;--c:'+(i%4)+';--cp:'+(i%5)+'"></i>';
    })+'<b class="tear"></b>',880,{'--s':s.toFixed(2)});
  }
  function fxGuard(){
    var hr=rectOf(document.querySelector('#content .combat-hero .sh-art'))||rectOf(document.querySelector('#content .combat-hero'));
    if(!hr)return;
    spawn('p5r-fx-guard',hr.x,hr.y,'<svg viewBox="0 0 120 140"><path d="M60 6 110 28V72C110 102 82 126 60 136 38 126 10 102 10 72V28Z"/><path class="x" d="M34 50 86 102M86 50 34 102"/></svg><b>GUARD</b>',820,{'--s':Math.max(.6,Math.min(1.3,hr.w/300)).toFixed(2)});
  }
  function fxItem(x,y){
    spawn('p5r-fx-item',x,y,'<i class="cap"></i><i class="arc"></i>'+bits(lowFx()?4:7,function(i){return '<s style="--i:'+i+'"></s>';})+'<b>ITEM</b>',860);
  }
  function hitReact(id,crit){
    var u=id?document.querySelector('#content .enemy-unit[data-target-id="'+id+'"]'):null;
    if(!u)u=document.querySelector('#content .enemy-unit.is-active');
    if(!u)return;
    u.setAttribute('data-ui-p5hit',crit?'crit':'hit');
    setTimeout(function(){if(u.isConnected&&u.getAttribute('data-ui-p5hit'))u.removeAttribute('data-ui-p5hit');},460);
  }
  function impactPoint(node){
    var x=parseFloat(node.style.getPropertyValue('--hit-x')),y=parseFloat(node.style.getPropertyValue('--hit-y'));
    return {x:isNaN(x)?innerWidth/2:x,y:isNaN(y)?innerHeight/2:y,w:lowFx()?120:200,h:200};
  }
  function onImpact(node){
    if(reduced.matches||root.dataset.theme!=='p5')return;
    var kind=node.dataset.impact||'';
    var dn=node.querySelector('.damage-number');var numText=dn?dn.textContent.trim():'';
    var amount=num(numText);
    var a=armed||{type:'',el:''};
    var logText=(document.querySelector('#content .battle-log')||{}).textContent||'';
    var isItem=(itemOpen||!!document.querySelector('[data-battle-item]')||Date.now()-itemGoneAt<1500)&&(kind==='heal'||kind==='buff');
    layer().setAttribute('data-ui-last',(a.key||'')+'|'+kind+'|'+(a.el||''));
    var enemyKinds={slash:1,star:1,critical:1,allout:1};
    if(enemyKinds[kind]||(kind==='insight'&&a.type!=='analyze')){
      var u=a.target&&document.querySelector('#content .enemy-unit[data-target-id="'+a.target+'"]');
      var r=rectOf(u&&u.querySelector('.enemy-unit-face'))||(enemyCache[a.target]&&enemyCache[a.target].r)||rectOf(document.querySelector('#content .enemy-unit.is-active .enemy-unit-face'))||impactPoint(node);
      document.body.style.setProperty('--p5r-hx',Math.round(r.x)+'px');document.body.style.setProperty('--p5r-hy',Math.round(r.y)+'px');
      node.setAttribute('data-ui-p5fx','enemy');
      if(kind==='allout'){hitReact(a.target,true);fxNumber(numText,r.x,r.y-r.h*.55,'is-crit',380);return;}
      var delay=0;
      if(a.type==='skill'){delay=fxSummon(false);fxElement(a.el||'almighty',r,delay);}
      else if(a.type==='gun')fxGun(r);
      else if(a.type==='showtime'){fxSlash(r,true);}
      else fxSlash(r,kind==='critical');
      var miss=kind==='insight';
      if(miss){fxStamp('MISS',r.x,r.y-r.h*.35,'is-miss',delay+120);return;}
      if(!(amount>0)||isNaN(amount))return; /* 无伤害的辅助/异常技能：只放属性形态 */
      setTimeout(function(){hitReact(a.target,kind==='critical'||kind==='star');},110+delay);
      fxNumber(numText.replace('−','-'),r.x,r.y-r.h*.5,kind==='critical'?'is-crit':kind==='star'?'is-weak':'',delay+90);
      return;
    }
    var p=impactPoint(node);
    if(kind==='player-hit'){node.setAttribute('data-ui-p5fx','party');fxNumber(numText.replace('−','-'),p.x,p.y-40,'is-hurt',60);return;}
    if(kind==='guard'){
      node.setAttribute('data-ui-p5fx','party');
      if(/没有造成伤害|无效|吸收|反弹/.test(logText)&&a.type!=='guard'){fxStamp('MISS',p.x,p.y-30,'is-miss is-enemy',60);}
      else fxGuard();
      return;
    }
    if(isItem){node.setAttribute('data-ui-p5fx','party');fxItem(p.x,p.y);if(kind==='heal'&&numText)fxNumber(numText,p.x,p.y-56,'is-heal',260);return;}
    if(kind==='heal'){node.setAttribute('data-ui-p5fx','party');if(a.type==='skill')fxSummon(false);fxElement('healing',p,180);fxNumber(numText,p.x,p.y-56,'is-heal',300);return;}
    var isMask=kind==='buff'&&(maskOpen||!!document.querySelector('[data-switch-mask]')||Date.now()-maskGoneAt<1500);
    if(kind==='buff'){node.setAttribute('data-ui-p5fx','party');if(isMask||a.type==='switchMask'||!a.type)fxSummon(true);else{fxSummon(false);fxElement(a.el||'support',p,200);}return;}
    if(kind==='one-more'){node.setAttribute('data-ui-p5fx','center');return;}
    if(kind==='insight'){return;}
  }
  function watchBody(){
    new MutationObserver(function(ms){
      for(var i=0;i<ms.length;i++)for(var j=0;j<ms[i].addedNodes.length;j++){
        var n=ms[i].addedNodes[j];
        if(n.nodeType===1&&n.classList.contains('battle-impact')){try{onImpact(n);}catch(e){}}
      }
    }).observe(document.body,{childList:true});
  }
  function fxTick(){
    var io=!!document.querySelector('[data-battle-item]');if(itemOpen&&!io)itemGoneAt=Date.now();itemOpen=io;
    var mo2=!!document.querySelector('[data-switch-mask]');if(maskOpen&&!mo2)maskGoneAt=Date.now();maskOpen=mo2;
    snapArmed();
  }
  /* 敌人矩形缓存放到 rAF 读阶段，避免在 MutationObserver 回调里强制同步布局 */
  function enemyTick(){if(!reduced.matches)trackEnemies();else enemyCache={};}


  /* =================== 第四轮：动效编排（只读测量 + aria-hidden 装饰 + body class + WAAPI transform/opacity） ===================
     · body.p5r4-enter：页面/场景切换后 900ms 内，内容分层入场（背景→主视觉→标题→内容→按钮）
     · body.p5r4-settled：同一页内的重绘（地图移动、点选）不再重播入场动画，避免闪烁
     · 滑动高亮：顶部导航 / 页签 / 战斗指令环 用同一块高亮在选项间平移
     · 共享元素衔接：地图 YOU 定位针、HP/SP/敌人血条在重绘之间平滑过渡 */
  var EASE='cubic-bezier(.16,1,.3,1)';
  /* 同页重绘：首帧绘制前把一次性入场动画直接落到终态（不切 body class，避免整树样式失效）。
     切页：什么都不做，新节点自然播放入场编排。 */
  function settleReplays(){
    var c=document.getElementById('content');if(!c||!document.getAnimations)return;
    var fighting=!!c.querySelector('.sh-stage');
    document.getAnimations().forEach(function(a){
      if(!a.animationName)return;
      var t=a.effect&&a.effect.target;if(!t||!c.contains(t))return;
      if(fighting&&a.animationName.indexOf('p5r4-')!==0)return;
      var tm=a.effect.getTiming();if(tm.iterations===Infinity)return;
      try{a.finish();}catch(e){}
    });
  }
  var slides={};
  /* 读阶段：只测量，不写样式（避免布局抖动） */
  function measureSlide(host,key,target,extra){
    if(!host)return null;
    var hl=host.querySelector(':scope>.p5r4-hl');
    if(!target)return {host:host,hl:hl,hide:true};
    var hr=host.getBoundingClientRect(),tr=target.getBoundingClientRect();
    if(!tr.width||!hr.width)return null;
    var rot=extra==='is-nav'?getComputedStyle(target).getPropertyValue('--p5rot'):(extra==='is-menu'?getComputedStyle(target).getPropertyValue('--r'):'');
    return {host:host,hl:hl,key:key,extra:extra,rot:rot,hr:hr,tr:tr,x:tr.left-hr.left+host.scrollLeft,y:tr.top-hr.top+host.scrollTop,w:tr.width,h:tr.height};
  }
  /* 写阶段 */
  function applySlide(m){
    if(!m)return;
    var hl=m.hl;
    if(m.hide){if(hl)hl.style.opacity='0';return;}
    var val='translate3d('+m.x.toFixed(1)+'px,'+m.y.toFixed(1)+'px,0)',sz=m.w.toFixed(1)+'px',szh=m.h.toFixed(1)+'px';
    var fresh=!hl;
    if(fresh){hl=mk('i','p5r4-hl'+(m.extra?' '+m.extra:''));m.host.appendChild(hl);/* 放在末尾：不打乱宿主子项的 :nth-child 倾角/错位 */}
    if(m.rot)hl.style.setProperty('--rot',m.rot.trim()||'-4deg');
    if(hl.__p===val+sz+szh){if(hl.style.opacity!=='1')hl.style.opacity='1';return;}
    hl.__p=val+sz+szh;
    var prev=slides[m.key];slides[m.key]={l:m.tr.left,t:m.tr.top,w:m.w,h:m.h};
    hl.style.opacity='1';hl.style.width=sz;hl.style.height=szh;hl.style.transform=val;
    /* FLIP：尺寸立即到位，只用 transform 从上一次的位置/尺寸过渡过来 */
    if(prev&&!reduced.matches&&(Math.abs(prev.l-m.tr.left)>1||Math.abs(prev.t-m.tr.top)>1||Math.abs(prev.w-m.w)>1)){
      var px=prev.l-m.hr.left+m.host.scrollLeft,py=prev.t-m.hr.top+m.host.scrollTop;
      try{hl.animate([{transform:'translate3d('+px.toFixed(1)+'px,'+py.toFixed(1)+'px,0) scale('+(prev.w/m.w).toFixed(3)+','+(prev.h/m.h).toFixed(3)+')'},{transform:val+' scale(1,1)'}],{duration:480,easing:EASE});}catch(e){}
    }
  }
  var lastYou=null,meters={};
  function motionMeasure(){
    /* ---- 读 ---- */
    var ms=[];
    var nav=document.querySelector('.room-nav');
    if(nav)ms.push(measureSlide(nav,'nav',nav.querySelector('a[aria-current=page]'),'is-nav'));
    ['.mask-tabs','.arsenal-tabs','.inventory-tabs'].forEach(function(sel){
      var t=document.querySelector('#content '+sel);
      if(t)ms.push(measureSlide(t,sel,t.querySelector(':scope>button:is(.active,[aria-selected=true],[aria-pressed=true])'),'is-tab'));
    });
    var cg=document.querySelector('#content .sh-stage .command-grid');
    if(cg)ms.push(measureSlide(cg,'cmd',cg.querySelector(':scope>button[aria-pressed=true]'),'is-cmd'));
    var you=null,c=document.querySelector('#content .map-board .map-cell.is-current');
    if(!c)lastYou=null;else if(!c.__p5r4){var r=c.getBoundingClientRect();you={c:c,l:r.left,t:r.top};}
    var mt=[],st=document.querySelector('#content .sh-stage');
    if(!st)meters={};else{
      var en=st.querySelector('.enemy-name h1');
      st.querySelectorAll('.meter>i').forEach(function(i,k){
        if(i.__p5r4)return;
        var m=i.parentElement,mw=m.getBoundingClientRect().width;if(!mw)return;
        var host=m.closest('.enemy-scene')?'enemy:'+(en?en.textContent:''):(m.closest('.sp')?'sp':(m.closest('.player-hud')?'hp':'m'+k));
        mt.push({i:i,m:m,f:i.getBoundingClientRect().width/mw,host:host});
      });
    }
    return {ms:ms,you:you,mt:mt};
  }
  function motionApply(M){
    if(!M)return;var ms=M.ms,you=M.you,mt=M.mt;
    /* ---- 写 ---- */
    ms.forEach(applySlide);
    if(you){
      you.c.__p5r4=1;
      if(lastYou&&!reduced.matches&&(Math.abs(lastYou.l-you.l)>4||Math.abs(lastYou.t-you.t)>4)){
        var pin=you.c.querySelector('.map-you');
        try{
          if(pin)pin.animate([{translate:(lastYou.l-you.l).toFixed(1)+'px '+(lastYou.t-you.t).toFixed(1)+'px'},{translate:'0 0'}],{duration:420,easing:EASE});
          you.c.animate([{opacity:.55},{opacity:1}],{duration:320,easing:EASE});
        }catch(e){}
      }
      lastYou={l:you.l,t:you.t};
    }
    mt.forEach(function(o){
      o.i.__p5r4=1;var prev=meters[o.host];meters[o.host]=o.f;
      if(prev==null||reduced.matches||Math.abs(prev-o.f)<.005||o.f<.01)return;
      try{o.i.animate([{transform:'scaleX('+(prev/o.f).toFixed(3)+')'},{transform:'scaleX(1)'}],{duration:480,easing:EASE});}catch(e){}
      var num=o.m.parentElement&&o.m.parentElement.querySelector('strong');
      if(num)try{num.animate([{opacity:.3,transform:'translateY(6px)'},{opacity:1,transform:'none'}],{duration:320,easing:EASE});}catch(e){}
    });
  }
  /* 据点五入口：一块悬停高亮在卡片之间滑动 */
  function menuHover(e){
    var card=e.target.closest&&e.target.closest('#content .night-base-grid .night-base-card');
    var grid=document.querySelector('#content .night-base-grid');if(!grid)return;
    if(!card){var hl=grid.querySelector(':scope>.p5r4-hl');if(hl&&!grid.contains(e.relatedTarget))hl.style.opacity='0';return;}
    applySlide(measureSlide(grid,'menu',card,'is-menu'));
  }
  /* ---- 调度 ---- */
  var lastSig='',queued=false,renderedSince=false;
  var skillView=null,skillSignature='',skillScroll=0,skillSelection='',skillWidth=0;
  function mobileSkillViewport(){
    if(document.documentElement.dataset.theme!=='p5'||!document.body.classList.contains('sh-m'))return;
    var view=document.querySelector('.sh-stage .command-detail');
    if(!view){skillView=null;skillSignature='';skillScroll=0;skillSelection='';return;}
    var skills=[].slice.call(view.querySelectorAll('.combat-skill'));
    var signature=skills.map(function(el){return el.dataset.battleAction;}).join('|');
    var selected=view.querySelector('.combat-skill.selected');
    var selection=selected?selected.dataset.battleAction:'';
    var replaced=view!==skillView,resized=view.clientWidth!==skillWidth;
    if(replaced){view.scrollLeft=signature===skillSignature?skillScroll:0;}
    if(selected&&(replaced||resized||selection!==skillSelection)){
      var left=selected.offsetLeft-6,right=left+selected.offsetWidth+12;
      if(left<view.scrollLeft)view.scrollLeft=Math.max(0,left);
      else if(right>view.scrollLeft+view.clientWidth)view.scrollLeft=right-view.clientWidth;
    }
    view.classList.toggle('p5-mobile-more-skills',view.scrollWidth>view.clientWidth+3);
    skillView=view;skillSignature=signature;skillScroll=view.scrollLeft;
    skillSelection=selection;skillWidth=view.clientWidth;
  }
  function tick(){
    queued=false;
    applyRansom();battleDeco();resultDeco();try{pageDeco();}catch(e){}
    mobileSkillViewport();
    var s=sig();
    var M=null;
    try{enemyTick();}catch(e){}
    try{M=motionMeasure();}catch(e){}
    /* 读完再写：settle / wipe / 高亮位移都放在测量之后，同一帧只做一次样式+布局 */
    if(s!==lastSig){var first=!lastSig;lastSig=s;if(!first)wipe();}else if(renderedSince){settleReplays();}
    renderedSince=false;
    try{motionApply(M);}catch(e){}
  }
  function queue(){if(queued)return;queued=true;requestAnimationFrame(tick);}
  function start(){
    document.body.classList.add('p5r-js');
    var deco=mk('div','p5r-bg');
    deco.innerHTML='<i class="p5r-bg-tear"></i><i class="p5r-bg-tear t2"></i><i class="p5r-bg-strip"></i>';
    document.body.insertBefore(deco,document.body.firstChild);
    var mo=new MutationObserver(function(ms){for(var k=0;k<ms.length;k++){if(ms[k].target.id==='content'){renderedSince=true;break;}}try{fxTick();}catch(e){}queue();});
    watchBody();
    var c=document.getElementById('content');if(c)mo.observe(c,{childList:true,subtree:true});
    var t=document.getElementById('sheet-title');if(t)mo.observe(t,{childList:true,characterData:true,subtree:true});
    var sh=document.getElementById('sheet-body');if(sh)mo.observe(sh,{childList:true});
    addEventListener('hashchange',queue);
    document.addEventListener('mouseover',menuHover,{passive:true});
    document.addEventListener('scroll',function(e){if(e.target===skillView)skillScroll=skillView.scrollLeft;},{passive:true,capture:true});
    addEventListener('resize',function(){slides={};document.querySelectorAll('.p5r4-hl').forEach(function(h){h.__p='';});queue();},{passive:true});
    tick();
    if(!reduced.matches)setTimeout(function(){if(!activeWipe)wipe('intro');},60);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
