/* MASKARIA · 哈姆子皮肤（P3P 女主路线 · 粉色 P3）视觉层 —— 纯装饰
 * 只在 html[data-theme=p3][data-skin=hamuko] 时运行；所有新增节点 aria-hidden + pointer-events:none。
 * 不改已有节点文本/属性，不拦截事件（只用 passive 监听读坐标），不碰 app.js 状态。
 * 内容：黄昏→月夜的樱色光斑背景（Canvas2D：月、bokeh、花瓣、细雨）、右栏"月相日历"、
 *       MP3 随身听"NOW PLAYING"条、页面切换斜向丝带 wipe（前进/返回反向）、
 *       进战斗"粉白闪光 + 斜切裂屏 + 心形碎片"、点击花瓣绽开；
 *       第三轮：战斗行动特效（battleFx，见文件末尾注释，样式在 r2-fx.css）。
 * prefers-reduced-motion：背景只画一帧静态，转场/点击特效全部关闭。
 */
(function(){
  'use strict';
  const root=document.documentElement;
  if(root.dataset.theme!=='p3'||root.dataset.skin!=='hamuko')return;
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  const DPR=Math.min(2,devicePixelRatio||1);
  const W=()=>innerWidth,H=()=>innerHeight;
  const fighting=()=>document.body.dataset.fighting==='true';
  const mk=(tag,cls,html)=>{const n=document.createElement(tag);n.className=cls;n.setAttribute('aria-hidden','true');if(html)n.innerHTML=html;return n;};

  function ready(fn){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();}

  ready(()=>{
    const body=document.body;
    body.classList.add('hk');

    /* ---------- 1. 背景：樱月夜 ---------- */
    const sky=mk('canvas','hk-sky');
    body.prepend(sky);
    const deco=mk('div','hk-deco','<i class="hk-glow"></i><i class="hk-grain"></i><b class="hk-xxii"><i></i><i></i><i></i><i></i></b><em class="hk-vert">THE&nbsp;JOURNEY&nbsp;·&nbsp;FES</em>');
    sky.after(deco);
    startSky(sky);

    /* ---------- 2. 月相日历（右栏，圆盘构图） ---------- */
    const d=new Date();
    const mon=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][d.getMonth()];
    const wd=['SUN','MON','TUE','WED','THU','FRI','SAT'][d.getDay()];
    const ph=moonPhase(d);
    const cal=mk('div','hk-cal',
      `<span class="hk-cal-disc">${moonSvg(ph)}<b>${d.getDate()}</b></span>`+
      `<span class="hk-cal-side"><em>${mon}<small>${String(d.getMonth()+1).padStart(2,'0')}</small></em><i>${wd}</i><strong>DARK HOUR<small>影时间 · ${phaseName(ph)}</small></strong></span>`);
    body.append(cal);

    /* ---------- 3. NOW PLAYING 随身听条（代替序号块） ---------- */
    const nav=document.querySelector('.room-nav');
    if(nav){
      const np=mk('div','hk-np','<span class="hk-np-eq"><i></i><i></i><i></i><i></i><i></i></span><span class="hk-np-txt"><small>NOW PLAYING</small><b>01</b><em>BATTLE</em></span><span class="hk-np-bar"><i></i></span>');
      body.append(np);
      const sync=()=>{
        const links=[...nav.querySelectorAll('a')];
        const i=Math.max(0,links.findIndex(a=>a.getAttribute('aria-current')==='page'));
        np.querySelector('b').textContent=String(i+1).padStart(2,'0')+' / '+String(links.length).padStart(2,'0');
        const sm=links[i]?.querySelector('small');
        np.querySelector('em').textContent=(sm?.textContent||'').trim()||'—';
        np.style.setProperty('--hk-np',((i+1)/Math.max(1,links.length)).toFixed(3));
      };
      sync();
      new MutationObserver(sync).observe(nav,{subtree:true,attributes:true,attributeFilter:['aria-current']});
    }

    /* ---------- 4. 转场画布 ---------- */
    const fx=mk('canvas','hk-fx');
    body.append(fx);
    const g=fx.getContext('2d');
    let run=0;
    function sizeFx(){fx.width=Math.round(W()*DPR);fx.height=Math.round(H()*DPR);g.setTransform(DPR,0,0,DPR,0,0);}
    /* 第四轮：转场不再使用这张全屏画布（保留节点，不分配全屏像素） */

    let lastPoint={x:W()*.5,y:H()*.5},goingBack=false;
    addEventListener('pointerdown',e=>{
      lastPoint={x:e.clientX,y:e.clientY};
      goingBack=!!e.target.closest?.('[data-tower="back"],.back-button,.flow-return,[data-action="leave-battle"],[data-action="close-sheet"],[data-slice="back-day"],[data-slice="close"],[data-tower="prep-return"]');
      bloom(e.clientX,e.clientY);
    },{capture:true,passive:true});
    addEventListener('keydown',e=>{if(e.key==='Escape')goingBack=true;},{capture:true,passive:true});

    /* 点击：花瓣绽开 + 一圈耳机音波 */
    function bloom(x,y){
      if(reduce.matches)return;
      const n=mk('i','hk-bloom','<b></b><b></b><b></b><b></b><b></b><s></s>');
      n.style.left=x+'px';n.style.top=y+'px';
      n.style.setProperty('--hk-r',(Math.random()*72|0)+'deg');
      body.append(n);
      setTimeout(()=>n.remove(),800);
    }

    const C={hot:'#ff3d8b',sak:'#ff6fa8',blush:'#ffc6dc',white:'#fff5f9',wine:'#5c0d33',plum:'#240821',mint:'#7cf5d2'};

    /* 斜向丝带 wipe：前进 = 右上→左下；返回 = 左→右并换酒红 */
    function ribbons(back){
      /* 第四轮修正：丝带 wipe 回归，但不再用全屏 Canvas 逐帧重绘——改为 4 条 DOM 斜丝带，只做 transform 位移（合成层），
         前进 = 右→左（白/樱/粉/酒红），返回 = 左→右并以酒红领头；总长约 620ms，pointer-events:none，不挡操作 */
      if(reduce.matches)return;
      document.querySelector('.hk-wipe')?.remove();
      const wCur=document.querySelector('.room-nav a[aria-current=page] small');
      const wTag=((wCur?.textContent)||'').trim().toUpperCase().slice(0,14);
      const w=mk('div','hk-wipe'+(back?' back':''),'<i></i><i></i><i><b>'+(wTag||'NOW PLAYING')+'</b></i><i></i>');
      body.append(w);
      setTimeout(()=>w.remove(),760);
      return;
      const id=++run,t0=performance.now(),dur=back?620:760;
      fx.classList.add('on');
      const ang=back?0.38:-0.38,dir=back?1:-1;
      const bands=back?[C.wine,C.hot,C.white,C.plum,C.sak]:[C.white,C.sak,C.hot,C.wine,C.plum];
      const cur=document.querySelector('.room-nav a[aria-current=page] small');
      const word=(document.querySelector('#content h1')?.firstChild?.textContent||'').trim().slice(0,8)||(cur?.textContent||'').trim();
      const tag=(cur?.textContent||'').trim().toUpperCase();
      const petals=Array.from({length:30},(_,k)=>({o:Math.random(),y:Math.random(),r:4+Math.random()*7,s:Math.random()*6,b:k%4}));
      const ease=q=>q<.5?4*q*q*q:1-Math.pow(-2*q+2,3)/2;
      function frame(now){
        if(id!==run)return;
        const p=Math.min(1,(now-t0)/dur);
        const w=W(),h=H(),D=Math.hypot(w,h),S=D*.62,N=bands.length,bh=D/N;
        g.clearRect(0,0,w,h);
        g.save();g.translate(w/2,h/2);g.rotate(ang);
        bands.forEach((col,i)=>{
          const lag=i*.07,q=Math.max(0,Math.min(1,(p-lag)/(1-lag*(N-1)/N-.12)));
          const lead=-S+2*S*ease(Math.min(1,q*2)),tail=-S+2*S*ease(Math.max(0,q*2-1));
          if(lead-tail<1)return;
          const top=-D/2+i*bh-2,bot=top+bh+4,nt=bh*.35;
          const x1=dir*tail,x2=dir*lead;
          g.fillStyle=col;g.beginPath();
          // 燕尾端头
          g.moveTo(x1,top);g.lineTo(x2,top);g.lineTo(x2+dir*nt,(top+bot)/2);g.lineTo(x2,bot);g.lineTo(x1,bot);g.lineTo(x1+dir*nt,(top+bot)/2);g.closePath();g.fill();
          // 丝带上的细缝线
          g.strokeStyle=col===C.white?'rgba(255,61,139,.35)':'rgba(255,245,249,.28)';g.setLineDash([10,8]);g.lineWidth=2;
          g.beginPath();g.moveTo(x1,top+10);g.lineTo(x2,top+10);g.moveTo(x1,bot-10);g.lineTo(x2,bot-10);g.stroke();g.setLineDash([]);
        });
        // 中段文字：去往的页面
        const mid=Math.sin(Math.min(1,p*1.25)*Math.PI);
        if(mid>.05&&word){
          g.globalAlpha=mid;g.textAlign='center';g.textBaseline='middle';
          g.font=`900 ${Math.round(Math.min(w,h)*.12)}px 'Noto Sans SC Black',sans-serif`;
          g.fillStyle=C.hot;g.fillText(word,6,6);g.fillStyle=C.white;g.fillText(word,0,0);
          if(tag){g.font=`italic 800 ${Math.round(Math.min(w,h)*.035)}px ShCond,sans-serif`;g.fillStyle=C.wine;g.fillText(tag+' ♪',0,Math.min(w,h)*.1);}
          g.globalAlpha=1;
        }
        g.restore();
        petals.forEach(pt=>{
          const x=(back?(-.15+p*1.3):(1.15-p*1.3))*w+(pt.o-.5)*w*.4;
          const y=pt.y*h+Math.sin(p*6+pt.s)*24;
          drawPetal(g,x,y,pt.r,p*8+pt.s,pt.b===0?C.white:pt.b===1?C.blush:C.sak,Math.sin(p*Math.PI));
        });
        if(p<1)requestAnimationFrame(frame);else{g.clearRect(0,0,W(),H());fx.classList.remove('on');}
      }
      requestAnimationFrame(frame);
    }

    /* 进战斗：粉白闪光 → 斜切一刀 → 上下两片沿刀口错开飞出 + 心形碎片 */
    function slash(){
      /* 第四轮：进战斗"斩屏"改为单个合成层的 DOM 遮罩——两片粉色屏幕（clip-path 静态形状）只做 transform 位移，
         白闪/刀光只做 opacity/scaleX；不再逐帧在全屏 Canvas 上重绘渐变和斜纹（那是转场卡顿的主因）。
         节奏：0–160ms 刀光划过 + 白闪；160ms 起两片沿刀口错开，560ms expo-out 揭开新舞台；总长 ≈ 760ms。 */
      if(reduce.matches)return;
      document.querySelector('.hk-slash')?.remove();
      const {x:cx,y:cy}=lastPoint;
      // R4 收尾：去掉全屏白闪层（多一张全屏半透明合成层，软件合成下每帧都要整屏混合），刀光自带光晕已足够；心形碎片 10→6（手机 4）
      const n=mk('div','hk-slash','<i class="hk-sl-a"></i><i class="hk-sl-b"></i><s class="hk-sl-cut"></s>'+
        Array.from({length:innerWidth<820?4:6},(_,k)=>`<em style="--a:${(k*37)%360}deg;--d:${120+((k*53)%220)}px;--c:${['#fff5f9','#ffc6dc','#7cf5d2'][k%3]}"></em>`).join(''));
      n.style.setProperty('--cx',cx+'px');n.style.setProperty('--cy',cy+'px');
      body.append(n);
      setTimeout(()=>n.remove(),900);
    }

    /* ---------- 4b. 第二轮：每次重绘后给已有节点挂装饰（只加 class / data-ui-* / --var，只插入 aria-hidden 装饰子节点） ---------- */
    function once(host,cls,html){if(!host||host.querySelector(':scope>.'+cls))return null;const n=mk('span',cls,html);host.append(n);return n;}
    const ARC=['0 FOOL','I MAGICIAN','II PRIESTESS','III EMPRESS','IV EMPEROR','V HIEROPHANT','VI LOVERS','VII CHARIOT','VIII JUSTICE','IX HERMIT','X FORTUNE','XI STRENGTH','XII HANGED','XIII DEATH','XIV TEMPERANCE','XV DEVIL','XVI TOWER','XVII STAR','XVIII MOON','XIX SUN','XX JUDGEMENT'];
    function decorate(){
      const c=document.getElementById('content');if(!c)return;
      const scene=c.querySelector('[data-tower-scene]')?.dataset.towerScene||c.querySelector('[data-slice-scene]')?.dataset.sliceScene||(c.querySelector('.velvet-room')?'velvet':'')||(c.querySelector('.map-shell')?'map':'')||(location.hash.slice(1)||'battle');
      if(body.dataset.uiPage!==scene)body.dataset.uiPage=scene;
      // 据点
      const head=c.querySelector('.night-base-head');
      if(head){once(head,'hk-disc');once(head,'hk-transport','<i><svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor"><rect x="3" y="4" width="2.5" height="12"/><path d="M17 4v12L7 10z"/></svg></i><i>▶</i><i><svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor"><rect x="14.5" y="4" width="2.5" height="12"/><path d="M3 4v12l10-6z"/></svg></i>');once(head,'hk-lcd-eq',Array.from({length:9},(_,i)=>`<i style="--i:${i}"></i>`).join(''));}
      once(c.querySelector('.tower-strata'),'hk-tower-glow');
      once(c.querySelector('.night-base-slice'),'hk-reels','<i></i><i></i>');
      c.querySelectorAll('.night-npcs article').forEach((a,i)=>{const v=['XX · JUDGEMENT','I · MAGICIAN','XIV · TEMPERANCE','XVII · STAR'][i%4];if(a.dataset.uiArcana!==v)a.dataset.uiArcana=v;});
      decorateMore(c,scene);
    }
    const setv=(el,k,v)=>{if(el&&el.style.getPropertyValue(k)!==String(v))el.style.setProperty(k,v);};
    const addc=(el,c)=>{if(el&&!el.classList.contains(c))el.classList.add(c);};
    const setd=(el,k,v)=>{if(el&&el.dataset[k]!==v)el.dataset[k]=v;};
    function decorateMore(c){
      // 地图：月光电池 / 警戒心电 / 巨大层号
      const hud=c.querySelector('.map-hud');
      if(hud){
        hud.querySelectorAll(':scope>span').forEach(s=>{
          const t=s.textContent;const n=t.match(/(\d+)\s*\/\s*(\d+)/);
          if(/月光/.test(t)&&n){addc(s,'hk-moonbar');setv(s,'--hk-v',(Math.min(1,+n[1]/Math.max(1,+n[2]))).toFixed(3));}
          if(/警戒/.test(t)){const p=t.match(/(\d+)\s*%/);addc(s,'hk-alertbar');setv(s,'--hk-v',p?(Math.min(100,+p[1])/100).toFixed(2):'0');}
        });
        const f=hud.querySelector('b')?.textContent.match(/(\d+)/);
        if(f)setd(c.querySelector('.map-board'),'uiFloor',String(f[1]).padStart(2,'0')+'F');
      }
      HK_DECOS.forEach(fn=>fn(c));
    }
    const HK_DECOS=[];
    // 战斗：黑胶 + 唱臂（唱臂指向被选中的指令）
    HK_DECOS.push(c=>{
      const po=c.querySelector('.sh-stage .combat-poster');
      if(!po){if(body.dataset.uiBusy)delete body.dataset.uiBusy;return;}
      if(!po.querySelector(':scope>.hk-vinyl')){po.prepend(mk('span','hk-vinyl'));po.prepend(mk('span','hk-arm','<i></i>'));}
      const bs=[...po.querySelectorAll('.command-grid button')];
      const i=bs.findIndex(b=>b.getAttribute('aria-pressed')==='true');
      setv(po.querySelector('.hk-arm'),'--hk-arm',(i<0?-12:-14-i*5)+'deg');
      const ex=po.querySelector('.execute');
      const busy=!!(ex&&ex.disabled);
      if(busy&&!body.dataset.uiBusy)body.dataset.uiBusy='1';else if(!busy&&body.dataset.uiBusy)delete body.dataset.uiBusy;
    });
    // 交涉：深夜短信手机（状态栏 / 日期分隔 / 正在输入 / 耐心环）
    const nowHM=()=>'0:00';
    HK_DECOS.push(c=>{
      c.querySelectorAll('.slice-talk-stage').forEach(st=>{
        const meter=st.parentElement?.querySelector('.slice-shadow-meter');
        const w=parseFloat(meter?.querySelector('i')?.style.width)||60;
        const v=(Math.max(0,Math.min(100,w))/100).toFixed(2);
        if(!st.querySelector(':scope>.hk-ph-bar'))st.prepend(mk('span','hk-ph-bar',`<em>${nowHM()}</em><span><i></i><i></i><i></i><i></i><b></b></span>`));
        setv(st.querySelector('.hk-ph-bar b'),'--hk-v',v);
        const h2=st.querySelector(':scope>h2');
        if(h2&&!st.querySelector(':scope>.hk-ph-day')){const d=mk('span','hk-ph-day','DARK HOUR · 今天 0:00');h2.after(d);}
        const bq=st.querySelector(':scope>blockquote');
        if(bq&&!st.querySelector(':scope>.hk-ph-typing')){const t=mk('span','hk-ph-typing','<i></i><i></i><i></i>');bq.after(t);}
        if(meter){setv(meter,'--hk-v',v);once(meter,'hk-ph-pct',`${Math.round(v*100)}<small>%</small>`);const p=meter.querySelector(':scope>.hk-ph-pct');if(p&&!p.textContent.startsWith(String(Math.round(v*100))))p.innerHTML=`${Math.round(v*100)}<small>%</small>`;}
        const lay=st.parentElement;
      });
      c.querySelectorAll('.slice-result').forEach(r=>{
        once(r,'hk-lock','<small>DARK HOUR · 影时间</small><b>0:00</b>');
        once(r,'hk-stamp',r.classList.contains('is-fail')?'已拒收':'已送达');
      });
    });
    // Persona：塔罗牌阵序号 + 日记本线圈/日期/涂鸦
    const ROMAN=['I','II','III','IV','V','VI','VII','VIII','IX','X'];
    const MON3=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    HK_DECOS.push(c=>{
      const tabs=[...c.querySelectorAll('.mask-tabs>button')];
      const sel=tabs.findIndex(b=>b.getAttribute('aria-pressed')==='true');
      tabs.forEach((b,i)=>{setv(b,'--hk-i',i);setv(b,'--hk-z',Math.abs(i-(tabs.length-1)/2)*2|0);setd(b,'uiArcana',ROMAN[i]||String(i+1));});
      const duo=c.querySelector('.duo-layout');
      if(duo){
        const md=duo.querySelector('.mask-display');
        if(md){const d=new Date();once(md,'hk-diary-date',`${MON3[d.getMonth()]}. ${d.getDate()}`);
          once(md,'hk-diary-doodle','<svg viewBox="0 0 64 64" fill="none" stroke="#ff3d8b" stroke-width="2.4" stroke-linecap="round"><path d="M32 52C14 40 8 30 12 21c4-8 14-8 20 1 6-9 16-9 20-1 4 9-2 19-20 31z"/><path d="M50 8l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" stroke="#ffb84d"/></svg>');}
        if(!duo.querySelector(':scope>.hk-rings'))duo.append(mk('span','hk-rings','<i></i>'.repeat(9)));
        const sp=md?md.offsetWidth:330;
        setv(duo,'--hk-spine',sp+'px');setv(duo,'--hk-spine-y',(md?md.offsetHeight:300)+'px');
      }
      c.querySelectorAll('.persona-roster-grid>button').forEach((b,i)=>setv(b,'--hk-i',i%4));
    });
    // 天鹅绒：琴键黑键位置 + 八音盒机芯 + 漂浮音符
    const BLACK=new Set([1,2,4,5,6,8,9,11,12,13]);
    HK_DECOS.push(c=>{
      const vr=c.querySelector('.velvet-room');if(!vr)return;
      vr.querySelectorAll('.vr-menu>button').forEach((b,i)=>{if(BLACK.has(i))setd(b,'uiBlack','1');});
      const pn=vr.querySelector('.vr-panel');
      if(pn){
        once(pn,'hk-mbox','<i class="end l"></i><i class="cyl"></i><i class="comb"></i><i class="end r"></i><i class="key"><svg viewBox="0 0 56 56"><g fill="#ffd27a" stroke="#8a6a3a" stroke-width="1.5"><circle cx="18" cy="18" r="11"/><circle cx="38" cy="38" r="11"/><rect x="22" y="22" width="12" height="12" rx="2"/></g><circle cx="18" cy="18" r="4" fill="#5c0d33"/><circle cx="38" cy="38" r="4" fill="#5c0d33"/></svg></i>');
        once(pn,'hk-dancer','<i></i><s></s><b></b>');
      }
      if(!vr.querySelector(':scope>.hk-notes')){
        const lite=body.classList.contains('sh-m');
        const n=mk('span','hk-notes',Array.from({length:lite?5:11},(_,i)=>`<i style="--x:${(i*9.1+4)%100}%;--s:${18+(i*7)%22}px;--t:${10+(i*3)%9}s;--d:${-i*1.7}s">${'♪♫♩♬'[i%4]}</i>`).join(''));
        vr.append(n);
      }
    });
    // 商店：贩卖机玻璃反光 + 投币口/取物口 + 每格瓶罐的颜色/形状
    const CANS=[['#7cf5d2','30px','6px 6px 4px 4px'],['#ff6fa8','36px','14px 14px 6px 6px'],['#ffd27a','28px','50% 50% 6px 6px'],['#b9a3ff','40px','8px'],['#ff8f6b','32px','16px 16px 4px 4px'],['#9fe0ff','26px','4px 4px 10px 10px']];
    HK_DECOS.push(c=>{
      c.querySelectorAll('.shop-section').forEach((s,si)=>{
        once(s,'hk-glass');
        once(s,'hk-vend-foot','<i class="tray">PUSH ▼ 取物口</i><i class="coin"></i>');
        s.querySelectorAll('.shop-row').forEach((r,i)=>{
          const name=r.querySelector('h3')?.textContent||'';let h=si*7+i;for(const ch of name)h=(h*31+ch.charCodeAt(0))>>>0;
          const k=CANS[h%CANS.length];setv(r,'--hk-c',k[0]);setv(r,'--hk-w',k[1]);setv(r,'--hk-r',k[2]);
        });
      });
    });
    // 首页：学生证抬头 / 条形码 / 镭射章
    HK_DECOS.push(c=>{
      const hs=c.querySelector('.home-grid>.hero-stage');if(!hs)return;
      once(hs,'hk-id-head','<b>学生证</b><small>GEKKO · NIGHT LINE<br>No. 0000-XXII</small>');
      once(hs,'hk-id-bar');once(hs,'hk-id-holo');
    });
    // 塔内单页：明信片邮票文字 + 邮戳 + 通关花瓣雨
    HK_DECOS.push(c=>{
      const sc=c.querySelector('.tower-scene[data-tower-scene]');if(!sc)return;
      const en=(sc.querySelector('.scene-heading>span')?.textContent||'DARK HOUR').trim().toUpperCase().slice(0,22);
      const sl=sc.querySelector('.story-layout');
      if(sl){
        setd(sl.querySelector('.scene-emblem'),'uiStamp',en.split(/\s*\/\s*/)[0].slice(0,14));
        const d=new Date(),ds=`${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
        const id='hkpm'+Math.random().toString(36).slice(2,7);
        once(sl,'hk-postmark',`<svg viewBox="0 0 132 132" fill="none" stroke="currentColor"><circle cx="66" cy="66" r="58" stroke-width="3"/><circle cx="66" cy="66" r="40" stroke-width="1.5"/><path id="${id}" d="M66 66m-49 0a49 49 0 1 1 98 0a49 49 0 1 1-98 0"/><text font-size="10" font-weight="800" letter-spacing="2.4" fill="currentColor" stroke="none" font-family="ShCond,sans-serif"><textPath href="#${id}">${en} · 影时间 · TARTARUS ·</textPath></text><text x="66" y="62" text-anchor="middle" font-size="11" font-weight="900" fill="currentColor" stroke="none" font-family="ShCond,sans-serif">${ds}</text><text x="66" y="78" text-anchor="middle" font-size="12" font-weight="900" fill="currentColor" stroke="none">0:00</text><path d="M124 56q10 5 20 0t20 0M124 70q10 5 20 0t20 0M124 84q10 5 20 0t20 0" stroke-width="3"/></svg>`);
      }
      const cel=/^(clear|finale)$/.test(sc.dataset.towerScene);
      const cf=sc.querySelector(':scope>.hk-confetti');
      if(cel&&!cf&&!reduce.matches){const lite=body.classList.contains('sh-m');sc.append(mk('span','hk-confetti',Array.from({length:lite?10:22},(_,i)=>`<i style="--x:${(i*4.7+3)%100}%;--t:${5+(i*1.3)%5}s;--d:${-i*.6}s;--c:${['#ff9cc3','#ffd27a','#7cf5d2','#fff','#b9a3ff'][i%5]}"></i>`).join('')));}
    });
    // 武库/装备/背包：磁带侧脊编号、吊牌摆动序、化妆灯泡、贴纸颜色
    const STK=['#ff6fa8','#7cf5d2','#ffd27a','#b9a3ff','#ff8f6b','#9fe0ff'];
    HK_DECOS.push(c=>{
      c.querySelectorAll('.arsenal-tabs>button').forEach((b,i)=>setd(b,'uiSide','SIDE '+'ABCDEF'[i]));
      c.querySelectorAll('.arsenal-wallet>span,.gear-bonuses>span').forEach((s,i)=>setv(s,'--hk-i',i%4));
      c.querySelectorAll('.gear-slot').forEach(g=>{
        if(g.querySelector(':scope>.hk-bulbs'))return;
        const n=14,html=Array.from({length:n},(_,i)=>{const t=i/(n-1);let x,y;if(t<.25){x=0;y=100-t/.25*55;}else if(t<.75){const a=Math.PI*(1-(t-.25)/.5);x=50+50*Math.cos(a);y=45-45*Math.sin(a);}else{x=100;y=45+(t-.75)/.25*55;}return `<i style="left:${x.toFixed(1)}%;top:${y.toFixed(1)}%;--i:${i}"></i>`;}).join('');
        g.append(mk('span','hk-bulbs',html));
      });
      c.querySelectorAll('.slice-path-item').forEach((li,i)=>setv(li,'--hk-i',i));
      c.querySelectorAll('.inventory-row').forEach((r,i)=>{setv(r,'--hk-c',STK[i%STK.length]);setv(r,'--hk-r',(i%2?1.2:-1)+'deg');});
    });
    /* ---------- 4c. 第四轮：滑动高亮块（导航 / 分类标签）——一个指示器在选项间平移，而不是每个按钮各自闪 ----------
       只插入 aria-hidden 装饰节点；位置用 transform 过渡；悬停时跟随指针所在项，离开回到当前项。 */
    function glide(host,itemSel,isOn){
      if(!host)return;
      host.classList.add('hk-glide-host');
      let g=host.querySelector(':scope>.hk-glide');
      if(!g){g=mk('span','hk-glide');host.append(g);
        const place=(it,instant)=>{
          if(!it){g.style.opacity='0';return;}
          const hr=host.getBoundingClientRect(),r=it.getBoundingClientRect();
          if(!r.width){g.style.opacity='0';return;}
          if(instant)g.classList.add('hk-glide-snap');
          g.style.setProperty('--gx',(r.left-hr.left+host.scrollLeft).toFixed(1)+'px');
          g.style.setProperty('--gy',(r.top-hr.top+host.scrollTop).toFixed(1)+'px');
          g.style.setProperty('--gw',r.width.toFixed(1)+'px');
          g.style.setProperty('--gh',r.height.toFixed(1)+'px');
          g.style.opacity='';
          if(instant){void g.offsetWidth;g.classList.remove('hk-glide-snap');}
        };
        const cur=()=>[...host.querySelectorAll(itemSel)].find(isOn);
        g._place=place;g._cur=cur;
        host.addEventListener('pointerover',e=>{const it=e.target.closest?.(itemSel);if(it&&host.contains(it)&&e.pointerType!=='touch')place(it);},{passive:true});
        host.addEventListener('pointerleave',()=>place(cur()),{passive:true});
        host.addEventListener('focusin',e=>{const it=e.target.closest?.(itemSel);if(it)place(it);},{passive:true});
        host.addEventListener('focusout',()=>place(cur()),{passive:true});
        // 内容区重绘会换掉整个标签容器：先放在上一次的位置，下一帧再滑到新选中项，保证"同一个指示器在移动"
        const key=String(host.className).split(' ').filter(k=>k!=='hk-glide-host').join('.');
        const prev=GLIDE_MEM[key];
        if(prev){g.classList.add('hk-glide-snap');for(const k in prev)g.style.setProperty(k,prev[k]);void g.offsetWidth;g.classList.remove('hk-glide-snap');requestAnimationFrame(()=>place(cur(),false));}
        else place(cur(),true);
        g._key=key;
      }else g._place(g._cur(),false);
      const it=g._cur&&g._cur();if(it)requestAnimationFrame(()=>{GLIDE_MEM[g._key]={'--gx':g.style.getPropertyValue('--gx'),'--gy':g.style.getPropertyValue('--gy'),'--gw':g.style.getPropertyValue('--gw'),'--gh':g.style.getPropertyValue('--gh')};});
    }
    const GLIDE_MEM={};
    const navEl=document.querySelector('.room-nav');
    const navOn=a=>a.getAttribute('aria-current')==='page';
    if(navEl){
      glide(navEl,'a',navOn);
      /* R4 收尾：aria-current 变化发生在 app 同步重建整页的同一个任务里——此时立刻量位置会强制整页同步布局（训练战/遭遇战开场实测 ~350–400ms 的那一帧）。
         改为等新页面自然渲染完一帧后再量；战斗中导航指示器本就隐藏，直接跳过，出战斗时补一次。 */
      let navT=0;const navSync=()=>{cancelAnimationFrame(navT);navT=requestAnimationFrame(()=>{navT=requestAnimationFrame(()=>{if(!fighting())glide(navEl,'a',navOn);});});};
      new MutationObserver(navSync).observe(navEl,{subtree:true,attributes:true,attributeFilter:['aria-current']});
      new MutationObserver(navSync).observe(document.body,{attributes:true,attributeFilter:['data-fighting']});
      addEventListener('resize',()=>{const g=navEl.querySelector('.hk-glide');g&&g._place(g._cur(),true);});
    }
    HK_DECOS.push(c=>{
      const pressed=b=>b.getAttribute('aria-pressed')==='true'||b.classList.contains('active')||b.getAttribute('aria-selected')==='true';
      c.querySelectorAll('.arsenal-tabs,.inventory-tabs').forEach(t=>glide(t,'button',pressed));
    });

    /* ---------- 5. 换页识别 ---------- */
    const content=document.getElementById('content');
    function pageKey(){
      const f=content?.firstElementChild;
      const scene=f?.querySelector?.('[data-tower-scene]')?.dataset.towerScene||f?.dataset?.towerScene||'';
      const cls=f?String(f.className||'').split(/\s+/).filter(c=>c&&c!=='hk-in'&&!/^is-|active|busy|loading/.test(c)).slice(0,3).join('.'):'';
      const sl=document.querySelector('[data-slice-scene]')?.dataset.sliceScene||'';
      return [location.hash,cls,scene,sl].join('|');
    }
    let lastKey=pageKey(),lastFight=fighting();
    function onChange(){
      const fi=fighting(),key=pageKey();
      if(fi!==lastFight){lastFight=fi;lastKey=key;if(fi){slash();enter('fight');}else{ribbons(true);enter('page');}goingBack=false;return;}
      if(key!==lastKey){lastKey=key;ribbons(goingBack);enter('page');goingBack=false;}
    }
    function enter(kind){
      if(reduce.matches)return;
      content?.querySelectorAll(':scope>.hk-in').forEach(n=>n.classList.remove('hk-in'));
      content?.firstElementChild?.classList.add('hk-in');
      // Only this arrival root participates; later same-scene renders must not replay the entrance.
      body.classList.remove(kind==='fight'?'hk-enter':'hk-enter-fight');
      body.classList.add(kind==='fight'?'hk-enter-fight':'hk-enter');
      clearTimeout(enter.t);enter.t=setTimeout(()=>{body.classList.remove('hk-enter','hk-enter-fight');ambient(true);},900);
      // 转场期间暂停所有无限循环的氛围动画（唱片旋转、均衡器、声波、雾标、背景漂移……），把每一帧的合成预算留给转场本身；
      // 等这一帧的样式/布局自然算完（rAF → 渲染 → 下一个任务）再取：新页面的动画此时已存在，getAnimations() 也不会再强制一次整页样式计算
      requestAnimationFrame(()=>setTimeout(()=>ambient(false),0));
    }
    let paused=[];
    function ambient(on){
      if(on){for(const a of paused)try{a.play();}catch(e){}paused=[];return;}
      try{for(const a of document.getAnimations()){if(a.playState!=='running')continue;const t=a.effect?.getTiming?.();if(t&&t.iterations===Infinity&&!a.effect.target?.closest?.('.hk-slash')){a.pause();paused.push(a);}}}catch(e){}
    }
    if(content){
      let pend=false;
      new MutationObserver(()=>{onChange();if(pend)return;pend=true;requestAnimationFrame(()=>{pend=false;decorate();});}).observe(content,{childList:true,subtree:true});
      new MutationObserver(onChange).observe(body,{attributes:true,attributeFilter:['data-fighting']});
      addEventListener('hashchange',()=>requestAnimationFrame(onChange));
    }
    decorate();
    let rz=0;addEventListener('resize',()=>{clearTimeout(rz);rz=setTimeout(decorate,150);});
    enter('page');
    battleFx(body);
  });

  /* ---------- 战斗特效（第三轮）：唱片刮碟 / Persona 心形镭射 / 乐器属性 / 丝带横幅 / 贴纸数字 / 休止符 / 花瓣倒下 / 心形泡泡盾 / 道具星光 ----------
   * 只读信号（不改规则）：
   *   body 直接子节点新增 .battle-impact[data-impact]（combat-motion.js 每次行动结果都会插入；--hit-x/--hit-y 为落点）
   *   .battle-log 文本（state.log = 本次行动最后一行日志：弱点 / 暴击 / TECHNICAL / 1 MORE / 无效 / 没有受伤 / 进入防御 / 使用「道具」）
   *   .sh-stage [data-battle-action][aria-pressed=true]（所选行动：type:id，小字 detail 首段是属性名）
   *   .enemy-unit / .enemy-targets [data-target-id] 的 is-down/down（存活→击破）
   *   .sh-stage 内新增 .p3-aoa（总攻击）
   * 对已有节点只做：给 .battle-impact 加 class、data-ui-* 与 --var；给 .enemy-art 加临时 class；在 .p3-aoa 里插 aria-hidden 子节点。
   * 新增层全部 aria-hidden + pointer-events:none，≤900ms 后移除；手机降粒子；reduced-motion 时不生成。 */
  function battleFx(body){
    const EL={'物理':'phys','枪击':'gun','火焰':'fire','冰冻':'ice','电击':'electric','疾风':'wind','念动':'psy','核热':'nuclear','祝福':'bless','咒怨':'curse','万能':'almighty','恢复':'healing','辅助':'support','异常':'ailment'};
    // 属性 → 乐器 + 主色（避开 P3 蓝 / P4 黄黑 / P5 红黑：全部偏粉彩、带白描边）
    const INST={phys:['vinyl','#ff3d8b'],gun:['cymbal','#ffcf6e'],fire:['guitar','#ff6a5c'],ice:['musicbox','#d6f6ff'],electric:['synth','#fff07a'],wind:['flute','#7cf5d2'],psy:['harp','#cfa6ff'],nuclear:['sub','#c4ff7a'],bless:['bell','#fff1c2'],curse:['organ','#c2367d'],almighty:['holo','#ffffff'],healing:['heart','#ffb3cf'],support:['heart','#ffc6dc'],ailment:['organ','#cfa6ff']};
    const lite=()=>body.classList.contains('sh-m')||innerWidth<820;
    const clampX=x=>Math.max(40,Math.min(innerWidth-40,x));
    const rnd=(a,b)=>a+Math.random()*(b-a);
    function center(sel,fb){const n=document.querySelector(sel);if(!n)return fb;const r=n.getBoundingClientRect();if(r.width<2&&r.height<2)return fb;return {x:r.left+r.width/2,y:r.top+r.height/2,w:r.width,h:r.height};}
    function layer(cls){const n=mk('div','hkx-layer '+cls);body.append(n);setTimeout(()=>n.remove(),900);return n;}
    function at(x,y,cls,html,extra){const n=mk('i','hkx '+cls,html);n.style.setProperty('--x',x.toFixed(1)+'px');n.style.setProperty('--y',y.toFixed(1)+'px');if(extra)for(const k in extra)n.style.setProperty(k,extra[k]);return n;}
    let selCache={type:'',detail:''},tgtCache='';
    // 本皮肤没有 .enemy-art，combat-motion 的落点会退回到 73%/35% 的默认坐标；敌方目标改用所选 .enemy-unit 的真实位置
    function targetUnit(){return (tgtCache&&document.querySelector(`.sh-stage .enemy-unit[data-target-id="${CSS.escape(tgtCache)}"]`))||document.querySelector('.sh-stage .enemy-unit.is-active');}
    // 行动执行后 app 会立刻按"下一位行动者"重绘，所以只在指令区不忙时缓存所选行动，命中时读缓存
    const deckBusy=()=>document.querySelector('.sh-stage .command-deck')?.getAttribute('aria-busy')==='true';
    function selected(){
      if(deckBusy())return selCache;
      const b=document.querySelector('.sh-stage [data-battle-action][aria-pressed="true"]');
      const tg=document.querySelector('.sh-stage .enemy-unit.is-active[data-target-id]');
      if(tg)tgtCache=tg.dataset.targetId;
      if(b){selCache={type:(b.dataset.battleAction||'').split(':')[0],detail:(b.querySelector('small')?.textContent||'').trim()};}
      return selCache;
    }
    const HEART='<svg viewBox="0 0 32 30"><path d="M16 28C6 21 1 15 1 9a7.5 7.5 0 0 1 15-2 7.5 7.5 0 0 1 15 2c0 6-5 12-15 19z"/></svg>';
    const REST='<svg viewBox="0 0 40 90"><path d="M14 4l14 18-10 14 14 20c-8-4-16-3-17 4-1 6 4 11 9 14-12-2-20-9-17-18 2-7 10-8 15-6L8 34l10-13z"/></svg>';

    /* —— 唱片刮碟：唱片 + 唱针划过 + 粉色音波斩 —— */
    function scratch(L,x,y,col){
      const ang=-18+rnd(-6,6);
      L.append(at(x,y,'hkx-vinyl','<b></b>',{'--c':col}));
      L.append(at(x,y,'hkx-arm','<b></b>',{'--a':ang+'deg'}));
      const W=lite()?260:420;
      let p='';for(let k=0;k<3;k++){const amp=[14,22,9][k],off=(k-1)*16;let d=`M${-W/2} ${off}`;for(let s=1;s<=24;s++){const xx=-W/2+W*s/24;d+=` L${xx.toFixed(1)} ${(off+Math.sin(s*1.15+k)*amp*Math.sin(Math.PI*s/24)).toFixed(1)}`;}p+=`<path pathLength="1" d="${d}"/>`;}
      L.append(at(x,y,'hkx-wave',`<svg viewBox="${-W/2} -60 ${W} 120" style="width:${W}px">${p}</svg><em>SCRATCH♪</em>`,{'--a':ang+'deg','--c':col}));
    }
    /* —— Persona 召唤：唱片爆转 + 心形镭射碎片 + 镭射线 —— */
    function summon(L,o,h,col){
      L.append(at(o.x,o.y,'hkx-sumdisc','<b></b>'));
      const n=lite()?6:14;
      for(let i=0;i<n;i++){const a=i/n*Math.PI*2+rnd(-.2,.2),d=rnd(70,lite()?120:190);L.append(at(o.x,o.y,'hkx-shard',HEART,{'--dx':(Math.cos(a)*d).toFixed(0)+'px','--dy':(Math.sin(a)*d).toFixed(0)+'px','--r':rnd(-180,180).toFixed(0)+'deg','--c':['#ff6fa8','#fff5f9','#7cf5d2','#cfa6ff','#ffd27a'][i%5],'--d':(i%4)*25+'ms','--s':rnd(.7,1.3).toFixed(2)}));}
      if(h){const dx=h.x-o.x,dy=h.y-o.y;L.append(at(o.x,o.y,'hkx-laser','',{'--len':Math.hypot(dx,dy).toFixed(0)+'px','--a':(Math.atan2(dy,dx)*180/Math.PI).toFixed(1)+'deg','--c':col}));}
    }
    /* —— 属性乐器：每种属性一种乐器形态（SVG）+ 音符飞散 —— */
    function instrument(L,x,y,el,col){
      const kind=(INST[el]||INST.almighty)[0];
      let svg='';
      const S=lite()?.7:1;
      if(kind==='vinyl'){scratch(L,x,y,col);return;}
      if(kind==='guitar'){for(let i=0;i<6;i++){let d=`M-140 ${-40+i*16}`;for(let s=1;s<=28;s++)d+=` L${-140+s*10} ${(-40+i*16+(s%2?1:-1)*(6-i*.6)).toFixed(1)}`;svg+=`<path pathLength="1" d="${d}"/>`;}svg+='<path class="f" d="M-10 -70l26 34-26 22-26-22z"/>';}
      else if(kind==='musicbox'){for(let i=0;i<9;i++){const hh=30+((i*7)%5)*12;svg+=`<rect class="f" x="${-90+i*20}" y="${-hh/2}" width="9" height="${hh}" rx="4"/>`;}svg+='<path pathLength="1" d="M-120 50 C-60 30 60 70 120 40"/>';}
      else if(kind==='synth'){let d='M-150 0';for(let i=0;i<10;i++){const xx=-150+i*30;d+=` L${xx} ${i%2?-34:34} L${xx+30} ${i%2?-34:34}`;}svg+=`<path pathLength="1" d="${d}"/><path pathLength="1" d="M-150 18 H150" style="stroke-width:3"/>`;}
      else if(kind==='flute'){let d='M0 0';for(let t=0;t<=60;t++){const a=t*.32,r=t*2.2;d+=` L${(Math.cos(a)*r).toFixed(1)} ${(Math.sin(a)*r*.8).toFixed(1)}`;}svg+=`<path pathLength="1" d="${d}"/><path pathLength="1" d="M-150 60 Q0 -40 150 50"/>`;}
      else if(kind==='harp'){for(let i=0;i<8;i++)svg+=`<path pathLength="1" d="M${-70+i*20} -80 L${-50+i*14} 80"/>`;svg+='<path pathLength="1" d="M-80 -86 Q20 -120 100 -60" style="stroke-width:7"/>';}
      else if(kind==='sub'){for(let i=1;i<=4;i++)svg+=`<circle class="ring" r="${i*28}" style="animation-delay:${i*60}ms"/>`;svg+='<circle class="f" r="18"/>';}
      else if(kind==='bell'){svg+='<path class="f" d="M0 -64c-26 0-38 22-38 50v22l-14 16h104l-14-16v-22c0-28-12-50-38-50z"/><circle class="f" cy="34" r="9"/>';for(let i=1;i<=3;i++)svg+=`<circle class="ring" r="${40+i*26}" style="animation-delay:${i*70}ms"/>`;}
      else if(kind==='organ'){for(let i=0;i<9;i++){const hh=60+Math.abs(4-i)*-10+80;svg+=`<rect class="f" x="${-90+i*20}" y="${40-hh}" width="14" height="${hh}" rx="7"/>`;}}
      else if(kind==='cymbal'){svg+='<ellipse class="f" rx="70" ry="18"/><ellipse class="f2" rx="16" ry="6"/>';for(let i=0;i<8;i++){const a=i/8*Math.PI*2;svg+=`<path pathLength="1" d="M${(Math.cos(a)*80).toFixed(0)} ${(Math.sin(a)*30).toFixed(0)} L${(Math.cos(a)*130).toFixed(0)} ${(Math.sin(a)*60).toFixed(0)}"/>`;}}
      else if(kind==='heart'){svg+=`<path class="f" transform="translate(-24 -26) scale(1.5)" d="M16 28C6 21 1 15 1 9a7.5 7.5 0 0 1 15-2 7.5 7.5 0 0 1 15 2c0 6-5 12-15 19z"/>`;}
      else{for(let i=0;i<5;i++)svg+=`<path pathLength="1" d="M-150 ${-28+i*14} C-50 ${-70+i*14} 50 ${14+i*14} 150 ${-28+i*14}"/>`;}
      L.append(at(x,y,'hkx-inst',`<svg viewBox="-160 -130 320 260" style="width:${320*S}px;height:${260*S}px">${svg}</svg>`,{'--c':col,'--a':rnd(-10,10).toFixed(0)+'deg'}));
      L.lastChild.dataset.uiInst=kind;
      const G=['♪','♫','♬','♩'],n=lite()?3:7;
      for(let i=0;i<n;i++){const a=rnd(-Math.PI*.95,-Math.PI*.05),d=rnd(60,140)*S;L.append(at(x,y,'hkx-note',`<b>${G[i%4]}</b>`,{'--dx':(Math.cos(a)*d).toFixed(0)+'px','--dy':(Math.sin(a)*d).toFixed(0)+'px','--c':col,'--d':(i*40)+'ms','--r':rnd(-30,30).toFixed(0)+'deg'}));}
    }
    function flash(L,x,y){L.append(at(x,y,'hkx-flash',''));}
    function jolt(){const a=document.querySelector('.combat-poster .enemy-art')||targetUnit()?.querySelector('.enemy-unit-face');if(!a)return;a.classList.remove('hkx-jolt');void a.offsetWidth;a.classList.add('hkx-jolt');setTimeout(()=>a.classList.remove('hkx-jolt'),460);}
    function ribbon(L,x,y,word,more){
      const w=Math.min(lite()?360:720,innerWidth*.94),cx=Math.max(w/2+6,Math.min(innerWidth-w/2-6,x)),cy=Math.max(lite()?70:96,y-(lite()?118:160));
      L.append(at(cx,cy,'hkx-ribbon',`<span><b>${word}</b><i>${word==='WEAK'?'弱点命中':word==='TECHNICAL'?'技术连携':word==='ALL-OUT'?'总攻击':'会心一击'}</i></span>`,{'--w':w+'px'}));
      if(more)L.append(at(Math.min(innerWidth-(lite()?52:70),cx+w/2-(lite()?40:60)),cy+(lite()?30:44),'hkx-sticker','<b>1<small>MORE</small></b><i>♡</i>'));
    }
    function rest(L,x,y,tag){L.append(at(x,y-20,'hkx-rest',REST+`<b>MISS<small>${tag}</small></b>`));}
    function bubble(L,x,y){
      L.append(at(x,y,'hkx-bubble',HEART+HEART));
      const n=lite()?3:7;for(let i=0;i<n;i++)L.append(at(x+rnd(-60,60),y+rnd(-10,50),'hkx-bub','',{'--s':rnd(8,20).toFixed(0)+'px','--d':(i*50)+'ms'}));
    }
    function stars(L,x,y){
      const n=lite()?6:14;
      for(let i=0;i<n;i++){const a=i/n*Math.PI*2,d=rnd(30,lite()?70:110);L.append(at(x,y,'hkx-star','',{'--dx':(Math.cos(a)*d).toFixed(0)+'px','--dy':(Math.sin(a)*d-20).toFixed(0)+'px','--s':rnd(10,24).toFixed(0)+'px','--d':(i%5)*35+'ms','--c':['#fff','#ffd27a','#ffc6dc','#7cf5d2'][i%4]}));}
      L.append(at(x,y,'hkx-twinkle',''));
    }
    function hearts(L,x,y){const n=lite()?4:9;for(let i=0;i<n;i++)L.append(at(x+rnd(-50,50),y+rnd(-10,30),'hkx-rise',HEART,{'--dy':-rnd(70,150).toFixed(0)+'px','--d':(i*45)+'ms','--s':rnd(.6,1.2).toFixed(2)}));}
    function crack(L,x,y){
      let d='M-70 -40';for(let i=1;i<=7;i++)d+=` L${-70+i*20} ${(i%2?14:-22)+rnd(-8,8)}`;
      L.append(at(x,y,'hkx-crack',`<svg viewBox="-90 -60 180 120"><path pathLength="1" d="${d}"/><path pathLength="1" d="M-10 -6 L4 30 L-6 56"/></svg>`));
      L.append(mk('i','hkx hkx-edge'));
    }
    function petals(x,y){
      const L=layer('hkx-down'),n=lite()?10:24;
      for(let i=0;i<n;i++){const a=rnd(0,Math.PI*2),d=rnd(40,lite()?110:190);L.append(at(x,y,'hkx-petal','',{'--dx':(Math.cos(a)*d).toFixed(0)+'px','--dy':(Math.sin(a)*d*.7+rnd(30,90)).toFixed(0)+'px','--r':rnd(-260,260).toFixed(0)+'deg','--s':rnd(.7,1.4).toFixed(2),'--d':(i%6)*30+'ms','--c':['#fff5f9','#ffc6dc','#ff8fbb','#ff6fa8'][i%4]}));}
      L.append(at(x,y,'hkx-fade','<b>♡ FADE OUT</b>'));
    }

    function onImpact(n){
      if(n.dataset.uiHk)return;
      const kind=n.dataset.impact||'';n.dataset.uiHk=kind;n.classList.add('hkx-imp');
      if(reduce.matches)return;
      const ox=parseFloat(n.style.getPropertyValue('--hit-x'))||innerWidth*.7,oy=parseFloat(n.style.getPropertyValue('--hit-y'))||innerHeight*.35;
      let hx=ox,hy=oy;
      const hero=center('.combat-hero .head',null)||center('.combat-hero',{x:innerWidth*.22,y:innerHeight*.4});
      const log=(document.querySelector('.battle-log')?.textContent||'').trim();
      const sel=selected();
      const el=EL[(sel.detail.split('·')[0]||'').trim()]||(sel.type==='gun'?'gun':sel.type==='basic'?'phys':'');
      const col=(INST[el]||INST.phys)[1];
      const enemyLine=/^(.+?) (?:以.+?攻击|使用「.+?」) (.+?)，/.test(log);
      const enemySide=kind==='player-hit'||(kind==='guard'&&(enemyLine||sel.type!=='guard'));
      if(!enemySide&&!['heal','buff','guard'].includes(kind)&&!document.querySelector('.combat-poster .enemy-art')){
        const u=targetUnit(),r=u?.getBoundingClientRect();
        if(r&&r.width>4){hx=r.left+r.width/2;hy=r.top+r.height/2;n.style.setProperty('--hk-dx',(hx-ox).toFixed(1)+'px');n.style.setProperty('--hk-dy',(hy-oy).toFixed(1)+'px');}
      }
      // 本皮肤的 .combat-hero .head 尺寸为 0，combat-motion 会把"打在主角身上"的落点夹到左上角 (22,28)；改到主角卡中心
      if(ox<=23&&oy<=29){hx=hero.x;hy=hero.y;n.style.setProperty('--hk-dx',(hx-ox).toFixed(1)+'px');n.style.setProperty('--hk-dy',(hy-oy).toFixed(1)+'px');}
      if(enemySide)n.dataset.uiHkSide='enemy';else{n.style.setProperty('--hk-c',col);n.dataset.uiHkEl=el||'none';}
      const L=layer('hkx-'+kind);
      if(kind==='guard'){bubble(L,enemySide?hx:hero.x,enemySide?hy:hero.y);return;}
      if(kind==='player-hit'){crack(L,hx,hy);flash(L,hx,hy);return;}
      if(kind==='insight'){
        const m=log.match(/无效|没有受伤|抵抗了即死|吸收|反弹|抗性/)||(sel.type!=='analyze'?['没有受伤']:null);
        if(m){n.dataset.uiHkMiss='1';rest(L,hx,hy,{'无效':'NULL','没有受伤':'NO DMG','抵抗了即死':'RESIST','吸收':'DRAIN','反弹':'REPEL','抗性':'RESIST'}[m[0]]);if(sel.type==='skill')summon(L,hero,{x:hx,y:hy},col);}
        else stars(L,hx,hy);
        return;
      }
      if(kind==='heal'||kind==='buff'){
        const item=sel.type==='items'||(/使用「[^」]+」/.test(log)&&!/→/.test(log)&&!/换上了/.test(log));
        if(item){n.dataset.uiHkItem='1';stars(L,hx,hy);return;}
        if(sel.type==='switchMask'||kind==='buff'){summon(L,hero,null,'#ff6fa8');return;}
        summon(L,hero,null,col);hearts(L,hx,hy);return;
      }
      if(kind==='one-more'){L.append(at(hx,hy-40,'hkx-sticker','<b>1<small>MORE</small></b><i>♡</i>'));summon(L,hero,null,'#ff6fa8');return;}
      // slash / star / critical / allout：真正的攻击
      if(sel.type==='skill'){summon(L,hero,{x:hx,y:hy},col);instrument(L,hx,hy,el||'almighty',col);}
      else if(el==='gun')instrument(L,hx,hy,'gun',col);
      else scratch(L,hx,hy,col);
      flash(L,hx,hy);jolt();
      const more=/1 MORE/.test(log);
      if(kind==='star')ribbon(L,hx,hy,'WEAK',more);
      else if(kind==='critical'){ribbon(L,hx,hy,/TECHNICAL/.test(log)?'TECHNICAL':sel.type==='showtime'?'SHOWTIME':'CRITICAL',more);}
      else if(kind==='allout')ribbon(L,hx,hy,'ALL-OUT',false);
      if(kind==='star'||kind==='critical'||kind==='allout')n.dataset.uiHkBanner='1';
    }
    new MutationObserver(ms=>{for(const m of ms)for(const a of m.addedNodes)if(a.nodeType===1&&a.classList.contains('battle-impact'))onImpact(a);}).observe(body,{childList:true});

    /* 击破侦测 + 总攻击装饰 + 选中行动缓存（#content 重绘后） */
    let alive=new Map();
    function scan(){
      const st=document.querySelector('.sh-stage');
      if(!st){alive=new Map();return;}
      selected();
      const next=new Map();
      st.querySelectorAll('.enemy-targets [data-target-id]').forEach(b=>next.set(b.dataset.targetId,!b.classList.contains('down')));
      if(!reduce.matches)for(const [id,ok] of next){
        if(ok||alive.get(id)!==true)continue;
        const u=st.querySelector(`.enemy-unit[data-target-id="${CSS.escape(id)}"]`);
        let p=u&&u.getBoundingClientRect();
        if(!p||p.width<4||u.offsetParent===null){const c=center('.combat-poster .enemy-art',{x:innerWidth*.7,y:innerHeight*.35});p={left:c.x,top:c.y,width:0,height:0};}
        const x=p.left+p.width/2,y=p.top+p.height/2;
        setTimeout(()=>petals(clampX(x),y),260);
      }
      alive=next;
      const stg=st.querySelector('.p3-stagger:not([data-ui-hk])');
      if(stg){stg.dataset.uiHk='1';if(!reduce.matches)stg.append(mk('div','hkx-1more','<b>1<small>MORE</small></b><i>♡</i><em>ONE MORE ♪</em>'));}
      const aoa=st.querySelector('.p3-aoa:not([data-ui-hk])');
      if(aoa){aoa.dataset.uiHk='1';if(!reduce.matches){const m=lite();aoa.append(mk('div','hkx-aoa','<i class="r r1"></i><i class="r r2"></i><i class="r r3"></i>'+Array.from({length:m?8:18},(_,i)=>`<b style="--x:${(i*53)%100}%;--y:${(i*37)%100}%;--d:${(i%6)*60}ms;--r:${(i*71)%360}deg">${HEART}</b>`).join('')));}}
    }
    const content=document.getElementById('content');
    if(content){let pend=false;new MutationObserver(()=>{if(pend)return;pend=true;requestAnimationFrame(()=>{pend=false;scan();});}).observe(content,{childList:true,subtree:true});scan();}
  }


  /* ---------- 图元 ---------- */
  function drawPetal(g,x,y,r,rot,col,a){
    if(a<=0.01)return;
    g.save();g.translate(x,y);g.rotate(rot);g.globalAlpha=a;g.fillStyle=col;
    // 樱花瓣：上端带一个小 V 缺口
    g.beginPath();g.moveTo(0,-r*.72);g.lineTo(r*.22,-r);
    g.bezierCurveTo(r*.95,-r*.7,r*.8,r*.45,0,r);
    g.bezierCurveTo(-r*.8,r*.45,-r*.95,-r*.7,-r*.22,-r);g.closePath();
    g.fill();
    g.restore();
  }
  function drawHeart(g,x,y,s,rot,col,a){
    g.save();g.translate(x,y);g.rotate(rot);g.globalAlpha=a;g.fillStyle=col;
    g.beginPath();g.moveTo(0,s*.35);
    g.bezierCurveTo(-s*1.1,-s*.35,-s*.45,-s*1.05,0,-s*.42);
    g.bezierCurveTo(s*.45,-s*1.05,s*1.1,-s*.35,0,s*.35);
    g.fill();g.restore();
  }

  function moonPhase(d){const syn=29.530588853,ref=Date.UTC(2000,0,6,18,14)/864e5;const days=d.getTime()/864e5-ref;return((days%syn)+syn)%syn/syn;}
  function phaseName(p){const n=['新月','蛾眉月','上弦','盈凸','满月','亏凸','下弦','残月'];return n[Math.round(p*8)%8];}
  function moonSvg(p){
    // 圆盘本身是月：亮部樱白，暗部酒红，外圈一道表盘刻度
    const r=30,c=36,lit=p<=.5?p*2:(1-p)*2,k=Math.cos(lit*Math.PI)*r,wax=p<.5;
    const dd=`M${c} ${c-r} A${r} ${r} 0 0 ${wax?1:0} ${c} ${c+r} A${Math.abs(k)} ${r} 0 0 ${(k>0)===wax?0:1} ${c} ${c-r}Z`;
    let ticks='';for(let i=0;i<30;i++){const a=i/30*Math.PI*2,r1=34,r2=i%5?32.4:31;ticks+=`<line x1="${c+Math.cos(a)*r1}" y1="${c+Math.sin(a)*r1}" x2="${c+Math.cos(a)*r2}" y2="${c+Math.sin(a)*r2}"/>`;}
    const tick=`<g stroke="rgba(255,198,220,.7)" stroke-width="1">${ticks}</g>`;
    return `<svg viewBox="0 0 72 72" aria-hidden="true">${tick}<circle cx="${c}" cy="${c}" r="${r}" fill="#3a0a2a"/><path d="${dd}" fill="#ffe3ee" opacity=".9"/><circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="#ff6fa8" stroke-width="1.5"/></svg>`;
  }

  /* ---------- 背景：Canvas2D 樱月夜 ---------- */
  function startSky(cv){
    const g=cv.getContext('2d');
    let w=0,h=0,mob=false;
    const bokeh=[],petals=[],rain=[];
    function seed(){
      bokeh.length=petals.length=rain.length=0;
      const nb=mob?8:14,np=mob?6:12,nr=0;
      for(let i=0;i<nb;i++)bokeh.push({x:Math.random(),y:Math.random()*.9,r:(mob?14:20)+Math.random()*(mob?40:70),a:.05+Math.random()*.14,s:Math.random()*6,v:.002+Math.random()*.006,c:Math.random()});
      for(let i=0;i<np;i++)petals.push({x:Math.random(),y:Math.random(),r:3+Math.random()*5,s:Math.random()*6,vy:.02+Math.random()*.035,vx:.012+Math.random()*.02,rot:Math.random()*6});
      for(let i=0;i<nr;i++)rain.push({x:Math.random(),y:Math.random(),l:.03+Math.random()*.05,v:.5+Math.random()*.6});
    }
    function size(){
      w=innerWidth;h=innerHeight;mob=w<820;
      cv.width=Math.round(w*DPR*.75);cv.height=Math.round(h*DPR*.75);
      g.setTransform(DPR*.75,0,0,DPR*.75,0,0);seed();
    }
    size();addEventListener('resize',size);
    let mode=0,smode=0;
    function draw(t){
      // 天空：顶部深紫 → 中段酒红 → 地平线樱粉余晖
      const sk=g.createLinearGradient(0,0,0,h);
      sk.addColorStop(0,mix('#12040f','#0c0310',mode));
      sk.addColorStop(.45,mix('#3a0b2e','#24071f',mode));
      sk.addColorStop(.8,mix('#7a1a4c','#4a0e33',mode));
      sk.addColorStop(1,mix('#d94a86','#8a1c55',mode));
      g.fillStyle=sk;g.fillRect(0,0,w,h);
      // 地平线雾带
      const hz=g.createRadialGradient(w*.55,h*1.05,0,w*.55,h*1.05,Math.max(w,h)*.7);
      hz.addColorStop(0,'rgba(255,140,190,.55)');hz.addColorStop(.5,'rgba(255,90,150,.12)');hz.addColorStop(1,'rgba(255,90,150,0)');
      g.fillStyle=hz;g.fillRect(0,0,w,h);
      // 月：左上（与蓝版右上相反），粉白，带一圈柔光晕
      // 月：菜单时在右下"升起"（右栏下方、无文字处），战斗时移到舞台中上
      const mx=mob?w*(.14+.6*smode):w*(.87-.37*smode),my=mob?h*(.84-.74*smode):h*(.86-.74*smode),mr=mob?w*(.16-.06*smode):Math.min(w,h)*(.16-.07*smode);
      const halo=g.createRadialGradient(mx,my,mr*.6,mx,my,mr*4);
      halo.addColorStop(0,'rgba(255,214,232,.35)');halo.addColorStop(.35,'rgba(255,120,175,.10)');halo.addColorStop(1,'rgba(255,120,175,0)');
      g.fillStyle=halo;g.fillRect(0,0,w,h);
      const mg=g.createRadialGradient(mx-mr*.25,my-mr*.25,mr*.1,mx,my,mr);
      mg.addColorStop(0,'#fffafc');mg.addColorStop(.7,'#ffe1ec');mg.addColorStop(1,'#ffc0d8');
      g.globalAlpha=.78-mode*.43;g.fillStyle=mg;g.beginPath();g.arc(mx,my,mr,0,Math.PI*2);g.fill();
      g.fillStyle='rgba(214,120,160,.18)';
      [[.3,-.2,.18],[-.25,.25,.24],[.15,.38,.12]].forEach(([ox,oy,rr])=>{g.beginPath();g.arc(mx+ox*mr,my+oy*mr,rr*mr,0,Math.PI*2);g.fill();});
      g.globalAlpha=1;
      // 光斑 bokeh
      g.globalCompositeOperation='lighter';
      for(const b of bokeh){
        const tw=.6+.4*Math.sin(t*.0006+b.s);
        const x=((b.x+t*b.v*.00002)%1.1)*w,y=b.y*h+Math.sin(t*.0003+b.s)*12;
        const rg=g.createRadialGradient(x,y,0,x,y,b.r);
        const col=b.c<.55?'255,111,168':b.c<.85?'255,198,220':'124,245,210';
        rg.addColorStop(0,`rgba(${col},${b.a*tw})`);rg.addColorStop(.72,`rgba(${col},${b.a*tw*.7})`);rg.addColorStop(1,`rgba(${col},0)`);
        g.fillStyle=rg;g.beginPath();g.arc(x,y,b.r,0,Math.PI*2);g.fill();
      }
      g.globalCompositeOperation='source-over';
      // 细雨（战斗中更密更亮）
      const ra=.06+mode*.16;
      if(ra>.07){g.strokeStyle=`rgba(255,214,232,${ra})`;g.lineWidth=1;g.beginPath();
        for(const r of rain){const y=((r.y+t*.0004*r.v)%1)*h*1.1-h*.05,x=r.x*w+y*.18;g.moveTo(x,y);g.lineTo(x+r.l*h*.18,y+r.l*h);}g.stroke();}
      // 花瓣
      for(const p of petals){
        const y=((p.y+t*p.vy*.00004)%1.08)*h-h*.04;
        const x=((p.x+t*p.vx*.00004)%1.1)*w-w*.05+Math.sin(t*.001+p.s)*18;
        drawPetal(g,x,y,p.r,p.rot+t*.0012*(p.s>3?1:-1),p.s>4?'#fff5f9':'#ffb3cf',.55-mode*.25);
      }
    }
    function mix(a,b,t){const pa=parseInt(a.slice(1),16),pb=parseInt(b.slice(1),16);const r=((pa>>16)&255)*(1-t)+((pb>>16)&255)*t,gg=((pa>>8)&255)*(1-t)+((pb>>8)&255)*t,bb=(pa&255)*(1-t)+(pb&255)*t;return `rgb(${r|0},${gg|0},${bb|0})`;}
    /* 第四轮：不再每帧重绘全屏（卡顿主因）。只在尺寸/战斗态/舞台变化时画一帧静态；
       桌面端的"动"交给 CSS 对整张画布做 ≥40s 的 transform 慢漂移（合成层，不重绘）。 */
    let lastSig='';
    function paint(){
      const fi=document.body.dataset.fighting==='true',st=fi&&!!document.querySelector('.sh-stage');
      const sig=[innerWidth,innerHeight,fi,st].join();if(sig===lastSig)return;lastSig=sig;
      mode=fi?1:0;smode=st?1:0;draw(0,true);
    }
    paint();
    /* 进/出战斗时背景重画放到转场遮罩完全盖住之后，不和舞台重建挤在同一帧 */
    new MutationObserver(()=>setTimeout(()=>requestAnimationFrame(paint),70)).observe(document.body,{attributes:true,attributeFilter:['data-fighting']});  /* R4 收尾：提前到斩屏两片完全静止覆盖的窗口（0–200ms）内，揭开前完成 */
    const ct=document.getElementById('content');
    if(ct){let pp=false;new MutationObserver(()=>{if(pp)return;pp=true;requestAnimationFrame(()=>{pp=false;paint();});}).observe(ct,{childList:true});}
    addEventListener('resize',()=>{lastSig='';requestAnimationFrame(paint);});
  }
})();
