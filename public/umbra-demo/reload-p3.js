/* MASKARIA · P3 RELOAD v2 视觉层（纯装饰）
 * 意象：沉入「灵魂之海」。每页一个独立构图，装饰节点全部 aria-hidden + pointer-events:none。
 * 规则：只在 data-theme="p3" 且非 hamuko 皮肤时运行；不改已有文本 / data-* 钩子；不拦截、不代发点击；
 *       只给已有节点加 class / style 自定义属性 / data-ui-* 属性，插入装饰兄弟或子节点。
 * 性能：手机降分辨率与帧率；测帧率过低自动切静态（body.r3-lite）；页面隐藏暂停；prefers-reduced-motion 全部静态。
 */
(function(){
  'use strict';
  const root=document.documentElement;
  if(root.dataset.theme!=='p3'||root.dataset.skin==='hamuko')return; // 哈姆子皮肤由 reload-hamuko.js 接管
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  const W=()=>innerWidth,H=()=>innerHeight;
  const DPR=Math.min(2,devicePixelRatio||1);
  const mobile=()=>innerWidth<820||document.body.classList.contains('sh-m');
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const NS='http://www.w3.org/2000/svg';

  function ready(fn){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();}
  /* 装饰节点工厂：一律 aria-hidden + 不吃指针 */
  function deco(tag,cls,html){
    const n=document.createElement(tag||'div');
    n.className=cls;n.setAttribute('aria-hidden','true');n.dataset.r3Deco='1';
    if(html)n.innerHTML=html;
    return n;
  }
  function once(host,cls,make,where){
    if(!host)return null;
    let n=[...host.children].find(c=>c.classList&&c.classList.contains(cls));
    if(n)return n;
    n=make();
    if(where==='prepend')host.prepend(n);else if(where==='before')host.before(n);else if(where==='after')host.after(n);else host.append(n);
    return n;
  }
  const num=s=>{const m=String(s||'').replace(/,/g,'').match(/-?\d+(\.\d+)?/);return m?Number(m[0]):NaN;};
  const ROMAN=['0','I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX','XXI'];

  /* ---------- 图形库（本地绘制 SVG） ---------- */
  const SVG={
    evoker:`<svg viewBox="0 0 120 70" class="r3-evoker-gun"><path d="M6 18 L86 18 L92 12 L104 12 L104 30 L80 30 L72 62 L50 62 L56 30 L6 30 Z" fill="#f6fcff" stroke="#050a1f" stroke-width="2"/><rect x="10" y="21" width="60" height="4" fill="#ff2448"/><text x="22" y="54" font-size="9" font-weight="800" fill="#c9f5ff" font-family="ShCond">S.E.E.S.</text></svg>`,
    clock:`<svg viewBox="0 0 200 200" class="r3-clock-svg"><circle cx="100" cy="100" r="92" fill="rgba(3,14,60,.82)" stroke="#d6ff8c" stroke-width="3"/><circle cx="100" cy="100" r="80" fill="none" stroke="rgba(214,255,140,.3)" stroke-width="1"/>${Array.from({length:60},(_,i)=>{const a=i/60*Math.PI*2,r1=i%5?84:76,r2=88;return `<line x1="${100+Math.sin(a)*r1}" y1="${100-Math.cos(a)*r1}" x2="${100+Math.sin(a)*r2}" y2="${100-Math.cos(a)*r2}" stroke="#d6ff8c" stroke-width="${i%5?1:3}"/>`;}).join('')}<g class="r3-clock-h"><rect x="96" y="44" width="8" height="58" fill="#f6fcff"/></g><g class="r3-clock-m"><rect x="98" y="22" width="4" height="80" fill="#d6ff8c"/></g><circle cx="100" cy="100" r="7" fill="#ff2448"/></svg>`,
    tartarus:`<svg viewBox="0 0 160 300" class="r3-tower-svg" preserveAspectRatio="xMidYMax meet"><path d="M80 0 L86 40 L84 60 L96 70 L92 110 L108 120 L104 170 L124 180 L118 240 L140 250 L136 300 L24 300 L20 250 L42 240 L36 180 L56 170 L52 120 L68 110 L64 70 L76 60 L74 40 Z" fill="#06200f" stroke="#d6ff8c" stroke-width="1.5"/><path d="M80 10 L80 300" stroke="rgba(214,255,140,.5)" stroke-width="1"/>${[80,130,190,250].map(y=>`<rect x="70" y="${y}" width="20" height="6" fill="#d6ff8c" opacity=".7"/>`).join('')}</svg>`,
    coffin:`<svg viewBox="0 0 40 90" class="r3-coffin-svg"><path d="M12 0 L28 0 L40 22 L32 90 L8 90 L0 22 Z" fill="#071a10" stroke="#d6ff8c" stroke-width="1.5"/><path d="M20 18 L20 52 M12 30 L28 30" stroke="#d6ff8c" stroke-width="2"/></svg>`,
    compass:`<svg viewBox="0 0 200 200" class="r3-compass-svg"><circle cx="100" cy="100" r="96" fill="none" stroke="rgba(201,245,255,.55)" stroke-width="1.5"/><circle cx="100" cy="100" r="70" fill="none" stroke="rgba(201,245,255,.25)" stroke-width="1" stroke-dasharray="3 5"/>${Array.from({length:72},(_,i)=>{const a=i/72*Math.PI*2,r1=i%6?90:84;return `<line x1="${100+Math.sin(a)*r1}" y1="${100-Math.cos(a)*r1}" x2="${100+Math.sin(a)*96}" y2="${100-Math.cos(a)*96}" stroke="#c9f5ff" stroke-width="${i%18?1:2.5}" opacity="${i%6?.45:.9}"/>`;}).join('')}<path d="M100 18 L108 100 L100 92 L92 100 Z" fill="#ff2448"/><path d="M100 182 L92 100 L100 108 L108 100 Z" fill="#f6fcff"/><text x="100" y="14" text-anchor="middle" font-size="12" font-weight="800" fill="#f6fcff" font-family="ShCond">N</text></svg>`,
    cylinder:`<svg viewBox="0 0 200 200" class="r3-cyl-svg"><defs><radialGradient id="r3cy" cx=".4" cy=".35"><stop offset="0" stop-color="#e8f6ff"/><stop offset=".5" stop-color="#7d93b8"/><stop offset="1" stop-color="#1c2846"/></radialGradient></defs><circle cx="100" cy="100" r="94" fill="url(#r3cy)" stroke="#050a1f" stroke-width="4"/>${Array.from({length:6},(_,i)=>{const a=i/6*Math.PI*2-Math.PI/2;return `<g><circle cx="${100+Math.cos(a)*56}" cy="${100+Math.sin(a)*56}" r="24" fill="#050a1f"/><circle cx="${100+Math.cos(a)*56}" cy="${100+Math.sin(a)*56}" r="15" fill="#b08a3a" stroke="#ffd98a" stroke-width="2"/><circle cx="${100+Math.cos(a)*56}" cy="${100+Math.sin(a)*56}" r="5" fill="#5a3f12"/></g>`;}).join('')}${Array.from({length:6},(_,i)=>{const a=(i+.5)/6*Math.PI*2-Math.PI/2;return `<path d="M${100+Math.cos(a)*80} ${100+Math.sin(a)*80} L${100+Math.cos(a)*94} ${100+Math.sin(a)*94}" stroke="#050a1f" stroke-width="7"/>`;}).join('')}<circle cx="100" cy="100" r="16" fill="#2a3656" stroke="#050a1f" stroke-width="3"/></svg>`,
    mask:`<svg viewBox="0 0 240 200" class="r3-shadowmask"><path d="M120 8 C190 8 232 56 228 104 C224 150 186 192 120 192 C54 192 16 150 12 104 C8 56 50 8 120 8 Z" fill="#020617"/><path d="M40 86 C60 58 104 62 116 92 C102 112 60 116 40 86 Z M200 86 C180 58 136 62 124 92 C138 112 180 116 200 86 Z" fill="#ffd84a"/><path d="M58 88 C70 78 90 80 98 92 C86 100 68 100 58 88 Z M182 88 C170 78 150 80 142 92 C154 100 172 100 182 88 Z" fill="#ff2448" class="r3-eye"/><path d="M70 146 Q120 172 170 146 Q150 160 120 162 Q90 160 70 146 Z" fill="#ff2448"/><path d="M120 20 L126 62 L120 70 L114 62 Z" fill="#ffd84a" opacity=".7"/></svg>`,
    lovers:`<svg viewBox="0 0 60 60"><path d="M30 52 C10 38 4 26 12 16 C18 9 26 12 30 20 C34 12 42 9 48 16 C56 26 50 38 30 52 Z" fill="none" stroke="currentColor" stroke-width="3"/><path d="M30 20 L30 52" stroke="currentColor" stroke-width="2"/></svg>`,
    chariot:`<svg viewBox="0 0 60 60"><circle cx="30" cy="30" r="22" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="30" cy="30" r="5" fill="currentColor"/>${Array.from({length:8},(_,i)=>{const a=i/8*Math.PI*2;return `<line x1="30" y1="30" x2="${30+Math.cos(a)*22}" y2="${30+Math.sin(a)*22}" stroke="currentColor" stroke-width="2"/>`;}).join('')}</svg>`,
    temperance:`<svg viewBox="0 0 60 60"><path d="M10 14 L24 14 L22 30 L12 30 Z M36 30 L48 30 L50 46 L34 46 Z" fill="none" stroke="currentColor" stroke-width="3"/><path d="M22 22 C30 22 32 34 40 36" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="3 3"/></svg>`,
    moon:`<svg viewBox="0 0 60 60"><path d="M38 8 A22 22 0 1 0 38 52 A17 17 0 1 1 38 8 Z" fill="currentColor"/><circle cx="46" cy="16" r="2" fill="currentColor"/><circle cx="50" cy="30" r="1.5" fill="currentColor"/></svg>`,
    elevator:`<svg viewBox="0 -20 300 140" class="r3-elev-svg"><path d="M20 110 A130 130 0 0 1 280 110" fill="none" stroke="#e7c46a" stroke-width="3"/>${Array.from({length:9},(_,i)=>{const a=Math.PI+i/8*Math.PI,x=150+Math.cos(a)*118,y=110+Math.sin(a)*118;return `<circle cx="${x}" cy="${y}" r="9" fill="#2a0e14" stroke="#e7c46a" stroke-width="2" class="r3-elev-lamp" style="--k:${i}"/><text x="${x}" y="${y+3.5}" text-anchor="middle" font-size="9" fill="#e7c46a" font-family="ShCond" font-weight="800">${i+1}</text>`;}).join('')}<g class="r3-elev-needle"><path d="M150 110 L146 30 L150 20 L154 30 Z" fill="#e7c46a"/></g><circle cx="150" cy="110" r="8" fill="#e7c46a"/></svg>`,
  };


  /* ---------- P3R 塔罗牌（本地 SVG）：深蓝卡面、金/白细线、罗马数字、牌名 ---------- */
  const ARCANA={fool:[0,'THE FOOL','愚者'],magician:[1,'THE MAGICIAN','魔术师'],priestess:[2,'THE PRIESTESS','女教皇'],empress:[3,'THE EMPRESS','女帝'],emperor:[4,'THE EMPEROR','皇帝'],hierophant:[5,'THE HIEROPHANT','教皇'],lovers:[6,'THE LOVERS','恋人'],chariot:[7,'THE CHARIOT','战车'],justice:[8,'JUSTICE','正义'],hermit:[9,'THE HERMIT','隐者'],fortune:[10,'FORTUNE','命运'],strength:[11,'STRENGTH','力量'],hanged:[12,'THE HANGED MAN','倒悬者'],death:[13,'DEATH','死神'],temperance:[14,'TEMPERANCE','节制'],devil:[15,'THE DEVIL','恶魔'],tower:[16,'THE TOWER','塔'],star:[17,'THE STAR','星'],moon:[18,'THE MOON','月'],sun:[19,'THE SUN','太阳'],judgement:[20,'JUDGEMENT','审判'],world:[21,'THE WORLD','世界']};
  const ARC_BY_CN=Object.fromEntries(Object.entries(ARCANA).map(([k,v])=>[v[2],k]));
  // 牌心纹样：只用几何线条（不画人物）
  const GLYPH={
    fool:'<circle cx="100" cy="150" r="46"/><circle cx="100" cy="150" r="30" class="t-thin"/><path d="M100 92 L106 144 L100 150 L94 144 Z" class="t-fill"/><path d="M56 214 L144 214 M70 226 L130 226" />',
    hanged:'<path d="M60 92 L140 92 M100 92 L100 120"/><path d="M100 212 L66 148 L134 148 Z"/><circle cx="100" cy="182" r="10" class="t-fill"/><path d="M78 230 L122 230"/>',
    hermit:'<path d="M80 96 L120 96 L128 116 L128 196 L72 196 L72 116 Z"/><path d="M100 128 L108 150 L100 172 L92 150 Z" class="t-fill"/><path d="M100 70 L100 96 M88 220 L112 220"/>',
    chariot:'<circle cx="100" cy="152" r="50"/><circle cx="100" cy="152" r="8" class="t-fill"/>'+Array.from({length:8},(_,i)=>{const a=i/8*Math.PI*2;return `<path d="M${100+Math.cos(a)*10} ${152+Math.sin(a)*10} L${100+Math.cos(a)*50} ${152+Math.sin(a)*50}" class="t-thin"/>`;}).join(''),
    world:'<ellipse cx="100" cy="152" rx="44" ry="62"/><ellipse cx="100" cy="152" rx="32" ry="48" class="t-thin"/><circle cx="52" cy="86" r="5" class="t-fill"/><circle cx="148" cy="86" r="5" class="t-fill"/><circle cx="52" cy="218" r="5" class="t-fill"/><circle cx="148" cy="218" r="5" class="t-fill"/>',
    moon:'<path d="M120 100 A52 52 0 1 0 120 204 A40 40 0 1 1 120 100 Z" class="t-fill"/><path d="M60 226 L140 226"/>',
    lovers:'<path d="M100 206 C60 178 50 150 66 130 C78 116 94 122 100 138 C106 122 122 116 134 130 C150 150 140 178 100 206 Z"/><path d="M100 138 L100 206" class="t-thin"/>',
    temperance:'<path d="M62 104 L94 104 L90 140 L66 140 Z M110 164 L138 164 L142 200 L106 200 Z"/><path d="M90 124 C110 124 112 150 124 164" class="t-thin" stroke-dasharray="4 4"/>',
    death:'<path d="M60 220 L140 84"/><path d="M60 220 C80 150 120 120 150 120" class="t-thin"/><circle cx="100" cy="152" r="48" class="t-thin"/>',
    star:'<path d="M100 96 L112 140 L156 152 L112 164 L100 208 L88 164 L44 152 L88 140 Z" class="t-fill"/><circle cx="100" cy="152" r="58" class="t-thin"/>',
    sun:'<circle cx="100" cy="152" r="30" class="t-fill"/>'+Array.from({length:12},(_,i)=>{const a=i/12*Math.PI*2;return `<path d="M${100+Math.cos(a)*40} ${152+Math.sin(a)*40} L${100+Math.cos(a)*56} ${152+Math.sin(a)*56}"/>`;}).join(''),
    tower:'<path d="M78 220 L84 108 L100 90 L116 108 L122 220 Z"/><path d="M90 140 L110 140 M90 172 L110 172" class="t-thin"/>',
  };
  const PERSONA_ARC={'亚森':'fool','奥菲斯':'fool','佐罗':'magician','猫妖精':'magician','卡门':'lovers','阿珈席翁':'lovers','船长基德':'chariot','约翰娜':'priestess','凯尔皮':'strength','皮克西':'lovers','杰克灯':'magician','杰克霜精':'magician'};
  const GENERIC='<path d="M100 96 L148 152 L100 208 L52 152 Z"/><path d="M100 120 L126 152 L100 184 L74 152 Z" class="t-thin"/><circle cx="100" cy="152" r="6" class="t-fill"/>';
  function tarotSvg(key,opt={}){
    const a=ARCANA[key]||ARCANA.fool,g=GLYPH[key]||GENERIC;
    const id='t'+(tarotSvg.n=(tarotSvg.n||0)+1);
    return `<svg viewBox="0 0 200 320" preserveAspectRatio="${opt.fill?'none':'xMidYMid meet'}" class="r3-tarot-svg${opt.reversed?' is-reversed':''}" role="presentation"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#14306f"/><stop offset=".55" stop-color="#0a1b4d"/><stop offset="1" stop-color="#050e30"/></linearGradient></defs>`+
      `<rect x="2" y="2" width="196" height="316" rx="8" fill="url(#${id})" stroke="#d9b866" stroke-width="2"/>`+
      `<rect x="11" y="11" width="178" height="298" rx="4" fill="none" stroke="#f3f6ff" stroke-opacity=".55" stroke-width="1"/>`+
      `<rect x="16" y="16" width="168" height="288" rx="2" fill="none" stroke="#d9b866" stroke-opacity=".5" stroke-width=".8"/>`+
      `<path d="M16 60 L184 60 M16 252 L184 252" stroke="#d9b866" stroke-opacity=".55" stroke-width=".8"/>`+
      `<text x="100" y="47" text-anchor="middle" class="t-num">${ROMAN[a[0]]}</text>`+
      `<g class="t-glyph" fill="none" stroke="#e9d08a" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round">${g}</g>`+
      (opt.name===false?'':`<text x="100" y="281" text-anchor="middle" class="t-name">${a[1]}</text>`)+
      `<path d="M30 30 L40 30 M30 30 L30 40 M170 30 L160 30 M170 30 L170 40 M30 290 L40 290 M30 290 L30 280 M170 290 L160 290 M170 290 L170 280" stroke="#d9b866" stroke-width="1.2"/>`+
      `</svg>`;
  }
  function tarotCard(key,opt={}){
    const a=ARCANA[key]||ARCANA.fool;
    return `<span class="r3-card${opt.reversed?' is-reversed':''}"><span class="r3-card-face">${tarotSvg(key,opt)}</span>${opt.caption!==false?`<em class="r3-card-cap">${opt.reversed?'REVERSED · 逆位':'UPRIGHT · 正位'}<small>${a[2]}</small></em>`:''}</span>`;
  }

  ready(()=>{
    const body=document.body;
    body.classList.add('r3','r3v2');
    if(reduce.matches)body.classList.add('r3-still');
    reduce.addEventListener?.('change',()=>body.classList.toggle('r3-still',reduce.matches));

    /* ---------- 1. 背景：静态 P3R 夜空（深蓝渐变 + 细线网格 + 极淡 Dark Hour 绿月）
       不再使用 WebGL / canvas；桌面最多一个 ≥24s 的 transform 慢漂移，手机与 reduced-motion 完全静态 ---------- */
    const sky=deco('div','r3-sky','<i class="r3-sky-grid"></i><i class="r3-sky-moon"></i>');
    body.prepend(sky);
    const seaCtl={setPage(){},still(){}};

    /* ---------- 2. 左上日历 ---------- */
    const clock=$('.sh-app-clock');
    if(clock){
      const d=new Date();
      const wd=['SUN','MON','TUE','WED','THU','FRI','SAT'][d.getDay()];
      const h=d.getHours();
      const slot=h>=20||h<7?['DARK HOUR','影时间']:h<12?['MORNING','早晨']:h<17?['AFTER SCHOOL','放学后']:['EVENING','傍晚'];
      clock.append(deco('div','r3-cal',`<b class="r3-cal-date">${d.getMonth()+1}<span class="r3-slash">/</span>${d.getDate()}</b><span class="r3-cal-wd">${wd}</span>${moonSvg(moonPhase(d))}<em class="r3-cal-slot">${slot[0]}<small>${slot[1]}</small></em><i class="r3-cal-bar"></i>`));
    }


    /* ---------- 3. 主菜单：MAIN 0X 多边形 + 说明 ---------- */
    const nav=$('.room-nav');
    const NAVTIP={battle:['BATTLE','训练遭遇、契约面具与同行编成。'],tower:['ASCEND','影时间据点、塔门与 5×5 塔层。'],persona:['PERSONA','面具名录、契约、成长与重塑。'],arsenal:['ARSENAL','装备、遗物、迷思、誓约与共鸣链。']};
    if(nav){
      const idx=deco('div','r3-menu-index','<small>MAIN</small><b>01</b><span class="r3-menu-sub"><em></em><i></i></span>');
      nav.after(idx);
      const sync=()=>{
        const links=$$('a',nav);
        const i=Math.max(0,links.findIndex(a=>a.getAttribute('aria-current')==='page'));
        links.forEach((a,k)=>{a.style.setProperty('--i',k);a.dataset.uiIdx=k;});
        idx.querySelector('b').textContent=String(i+1).padStart(2,'0');
        const t=NAVTIP[links[i]?.dataset.room]||['',''];
        idx.querySelector('em').textContent=t[0];idx.querySelector('i').textContent=t[1];
        idx.dataset.i=i;
        // 滑动高亮板：一个装饰块在选项间平移（transform 过渡），取代每个链接各自的 :before 白板
        const a=links[i];
        if(a&&plate){
          // 链接尺寸只在初始化 / resize 时量一次，切换时不再强制回流
          if(!sync.box||sync.box.length!==links.length)sync.box=links.map(x=>[x.offsetLeft,x.offsetTop,x.offsetWidth,x.offsetHeight]);
          const [ol,ot,ow,oh]=sync.box[i];
          const w=ow+40,h=oh*.74;
          plate.style.setProperty('--px',(ol+ow/2-165-17)+'px');plate.style.setProperty('--py',(ot+oh*.47-90)+'px');
          plate.style.setProperty('--sx',(w/330).toFixed(4));plate.style.setProperty('--sy',(h/180).toFixed(4));
          if(!plate.dataset.ready)requestAnimationFrame(()=>{plate.dataset.ready='1';});
        }
      };
      const plate=deco('div','r3-navplate','<i class="r3-navplate-w"></i><i class="r3-navplate-r"></i>');
      nav.append(plate); // append：不打乱 a:nth-child 的配色
      addEventListener('resize',()=>requestAnimationFrame(()=>{sync.box=null;sync();}));
      sync();
      new MutationObserver(sync).observe(nav,{subtree:true,attributes:true,attributeFilter:['aria-current']});
    }

    /* ---------- 4. 转场层：单个合成层遮罩（只动 transform / opacity），不再逐帧画 canvas ----------
       app 在 click 里同步重建 #content，无法先盖后建；做法是：新 DOM 一出现就在同一帧把遮罩"盖满"，
       让重建/字体换上的那一帧被遮住，再用 expo-out 把遮罩推走揭开新页面。 */
    const wipe=deco('div','r3-wipe','<i class="r3-wipe-a"></i><i class="r3-wipe-b"></i><i class="r3-wipe-line"></i>');
    body.append(wipe);
    // Web Animations：不需要 offsetWidth 强制回流来重启动画；transform 动画直接跑在合成线程
    const WK={
      page:[[{transform:'translate3d(0,0,0)'},{transform:'translate3d(105%,0,0)'}],520,0],
      back:[[{transform:'translate3d(0,0,0)'},{transform:'translate3d(-105%,0,0)'}],520,0],
    };
    function runWipe(kind){
      if(reduce.matches)return;
      (runWipe.anims||[]).forEach(a=>a.finish());
      wipe.dataset.kind=kind;wipe.classList.add('on');
      const ease='cubic-bezier(.16,1,.3,1)';
      const [a,b,l]=[...wipe.children];
      let list;
      if(kind==='fight'){
        list=[a.animate([{transform:'translate3d(0,0,0)'},{transform:'translate3d(0,-70%,0)'}],{duration:620,delay:60,easing:ease,fill:'backwards'}),
              b.animate([{transform:'translate3d(0,0,0)'},{transform:'translate3d(0,70%,0)'}],{duration:620,delay:60,easing:ease,fill:'backwards'}),
              l.animate([{opacity:1,transform:'none'},{opacity:0,transform:'none'}],{duration:260,easing:'cubic-bezier(.7,0,.84,0)',fill:'backwards'})];
      }else if(kind==='nav'){
        // 主菜单切换：不盖全屏，只让一道细光带斜扫过（单合成层 transform），配合滑动白板与内容分层入场
        list=[l.animate([{transform:'translate3d(-60%,0,0)',opacity:0},{transform:'translate3d(-20%,0,0)',opacity:1,offset:.25},{transform:'translate3d(60%,0,0)',opacity:0}],{duration:480,easing:ease,fill:'backwards'})];
      }else{
        const [kf,d]=WK[kind]||WK.page;
        list=[a.animate(kf,{duration:d,easing:ease,fill:'backwards'}),l.animate(kf,{duration:d,delay:40,easing:ease,fill:'backwards'})];
      }
      runWipe.anims=list;
      Promise.all(list.map(x=>x.finished)).then(()=>{if(runWipe.anims===list)wipe.classList.remove('on');}).catch(()=>{});
    }
    let lastPoint={x:W()*.5,y:H()*.45},goingBack=false,viaNav=false;
    addEventListener('pointerdown',e=>{
      lastPoint={x:e.clientX,y:e.clientY};
      const t=e.target.closest?.('[data-tower="back"],.back-button,.flow-return,[data-action="leave-battle"],[data-action="close-sheet"],[data-slice="back-day"],[data-slice="close"],[data-tower="prep-return"],[data-tower="return-back"],[data-tower="velvet-exit"],[data-tower="shop-back"]');
      goingBack=!!t;
      viaNav=!!e.target.closest?.('.room-nav a');
      if(viaNav){
        const ls=$$('.room-nav a'),to=ls.indexOf(e.target.closest('.room-nav a')),from=ls.findIndex(a=>a.getAttribute('aria-current')==='page');
        body.dataset.r3Dir=to<from?'up':'down';
      }
      // Leaving is triggered by a real scene change, not by pressing a navigation-shaped control.
    },{capture:true,passive:true});
    addEventListener('keydown',e=>{if(e.key==='Escape')goingBack=true;},{capture:true,passive:true});

    /* ---------- 5. 页面识别 ---------- */
    const content=document.getElementById('content');
    function pageOf(){
      const f=content?.firstElementChild;
      if(!f)return 'none';
      if(f.querySelector?.('.sh-stage')||f.classList.contains('sh-stage'))return 'battle';
      if(f.classList.contains('velvet-room')||f.querySelector?.('.velvet-room'))return 'velvet';
      const ts=f.dataset?.towerScene||f.querySelector?.('[data-tower-scene]')?.dataset.towerScene;
      if(f.querySelector?.('.night-base'))return 'base';
      if(ts&&ts!=='null')return 'ts-'+ts;
      const sl=f.dataset?.sliceScene||f.querySelector?.('[data-slice-scene]')?.dataset.sliceScene;
      if(sl)return 'slice-'+sl;
      const sc=f.dataset?.scene||f.querySelector?.('[data-scene]')?.dataset.scene;
      if(sc)return 'sc-'+sc;
      if(content.querySelector('.map-shell'))return 'map';
      if(content.querySelector('.home-grid'))return 'home';
      if(content.querySelector('.mask-tabs,.duo-layout'))return 'persona';
      if(content.querySelector('.arsenal-tabs'))return 'arsenal';
      if(content.querySelector('.slice-scene'))return 'slice';
      return 'other';
    }
    let lastPage=pageOf(),lastHash=location.hash;
    function onChange(){
      const page=pageOf();
      body.dataset.uiPage=page;
      decorate(page);
      seaCtl.setPage(page);
      if(page!==lastPage){
        const wasBattle=lastPage==='battle';
        lastPage=page;
        body.classList.remove('r3-leaving','r3-leaving-back');
        if(page==='battle')runWipe('fight');
        else if(viaNav)runWipe('nav');
        else runWipe(wasBattle||goingBack?'back':'page');
        if(!viaNav)delete body.dataset.r3Dir;
        enter(page==='battle'?'fight':wasBattle||goingBack?'back':'page');
        goingBack=false;viaNav=false;
      }
    }
    function enter(kind){
      if(reduce.matches||!content)return;
      // 新 DOM 节点首次获得样式时动画自然开始，不需要 offsetWidth 强制回流重启
      const k=kind==='fight'?'r3-enter-fight':kind==='back'?'r3-enter-back':'r3-enter';
      ['r3-enter','r3-enter-fight','r3-enter-back'].forEach(c=>c!==k&&body.classList.remove(c));
      body.classList.add(k);
      // 只给"这一次换页"出现的根节点挂 .r3-in：入场窗口内 app 再次重建 #content（回顾页/战斗常见）时，新节点不再重播入场 → 不再整页闪一下
      $$('#content>.r3-in').forEach(n=>n.classList.remove('r3-in'));
      content.firstElementChild?.classList.add('r3-in');
      clearTimeout(enter.t);requestAnimationFrame(()=>{clearTimeout(enter.t);enter.t=setTimeout(()=>body.classList.remove('r3-enter','r3-enter-fight','r3-enter-back'),900);});
    }
    if(content){
      let pending=false;
      const kick=()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;onChange();});};
      new MutationObserver(kick).observe(content,{childList:true});
      // 战斗 / 地图内的局部重绘（不换 #content 子节点）也要补装饰
      new MutationObserver(muts=>{if(muts.some(m=>[...m.addedNodes].some(n=>n.nodeType===1&&!n.dataset?.r3Deco)))kick();}).observe(content,{childList:true,subtree:true});
      new MutationObserver(kick).observe(body,{attributes:true,attributeFilter:['data-fighting','class']});
      addEventListener('hashchange',()=>requestAnimationFrame(onChange));
      addEventListener('resize',()=>requestAnimationFrame(onChange));
    }
    body.dataset.uiPage=lastPage;decorate(lastPage);seaCtl.setPage(lastPage);
    // 首屏才让主菜单逐项入场；之后切页菜单常驻不再重播（R4：切页时菜单消失再出现是"生硬"的来源之一）
    body.classList.add('r3-boot');setTimeout(()=>body.classList.remove('r3-boot'),1200);
    enter('page');

    /* 设置弹窗（#sheet 在 #content 外） */
    const sheet=$('dialog');
    if(sheet){
      const mark=()=>{
        if(!sheet.open)return;
        const isSys=sheet.classList.contains('settings-sheet');
        once(sheet,'r3-sys',()=>deco('div','r3-sys',`<span class="r3-sys-card">${tarotCard('hermit',{caption:false})}</span><em>SYSTEM</em><i class="r3-sys-line"></i>`),'prepend').hidden=!isSys;
      };
      new MutationObserver(mark).observe(sheet,{attributes:true,attributeFilter:['open','class'],childList:true});
      mark();
    }

    /* ---------- 6. 每页装饰 ---------- */
    function decorate(page){
      try{
        ({home:dHome,base:dBase,map:dMap,battle:dBattle,persona:dPersona,arsenal:dArsenal,velvet:dVelvet,'ts-shop':dShop,'ts-gear':dGear,'ts-inventory':dInv,'ts-shadow-talk':dTalk,'ts-shadow-talk-result':dTalkRes}[page]||(()=>{}))();
        dScene(page);
      }catch(err){/* 装饰失败不影响游戏 */ if(window.__r3debug)console.warn(err);}
    }

    function dHome(){
      const stage=$('.hero-stage');
      once(stage,'r3-abyss',()=>deco('div','r3-abyss',`<span class="r3-home-card">${tarotCard('fool',{reversed:true})}</span>`));
      const m=$('.mission');
      if(m){
        once(m,'r3-tipline',()=>deco('i','r3-tipline'));
        const prog=$$('.mission-line',m)[1];
        if(prog){const v=num(prog.querySelector('b')?.textContent);prog.style.setProperty('--pct',isNaN(v)?0:Math.min(1,v/100));prog.classList.add('r3-prog');}
        $$('.mission-line',m).forEach((l,i)=>l.style.setProperty('--i',i));
      }
      $$('.status-ribbon>span').forEach((s,i)=>s.style.setProperty('--i',i));
      const tb=$('.trial-banner');
      once(tb,'r3-keys',()=>deco('div','r3-keys','<span><i>✕</i>ATTACK</span><span><i>□</i>GUARD</span><span><i>△</i>ANALYZE</span><span><i>○</i>ITEM</span>'));
    }

    function dBase(){
      const nb=$('.night-base');if(!nb)return;
      // 状态多边形
      $$('.night-base-stats>div',nb).forEach((d,i)=>d.style.setProperty('--i',i));
      // 右侧巨字菜单 + tooltip
      const grid=$('.night-base-grid',nb);
      if(grid){
        const cards=$$('.night-base-card',grid);
        cards.forEach((c,i)=>{c.style.setProperty('--i',i);c.dataset.uiIdx=String(i+1).padStart(2,'0');});
        const tip=once(grid,'r3-tip',()=>deco('div','r3-tip','<span class="r3-tip-k"></span><b class="r3-tip-t"></b><p class="r3-tip-p"></p><i class="r3-tip-line"></i>'));
        const cur=once(grid,'r3-cursor',()=>deco('div','r3-cursor','<i></i><i></i>'));
        const setHot=c=>{
          if(!c)return;
          cards.forEach(x=>x.classList.toggle('r3-hot',x===c));
          tip.querySelector('.r3-tip-k').textContent=c.querySelector('span')?.textContent||'';
          tip.querySelector('.r3-tip-t').textContent=c.querySelector('h3')?.textContent||'';
          tip.querySelector('.r3-tip-p').textContent=c.querySelector('p')?.textContent||'';
          cur.style.setProperty('--y',(c.offsetTop+c.offsetHeight/2)+'px');
          cur.style.setProperty('--x',(c.offsetLeft)+'px');
          tip.animate?.([{opacity:0,transform:'translate3d(0,6px,0)'},{opacity:1,transform:'none'}],{duration:200,easing:'cubic-bezier(.16,1,.3,1)'});
        };
        if(!grid.dataset.uiBound){
          grid.dataset.uiBound='1';
          grid.addEventListener('pointerover',e=>setHot(e.target.closest('.night-base-card')),{passive:true});
          grid.addEventListener('focusin',e=>setHot(e.target.closest('.night-base-card')),{passive:true});
        }
        requestAnimationFrame(()=>setHot(cards.find(c=>c.classList.contains('r3-hot'))||cards[0]));
      }
      // 社群塔罗扇
      const ARC=[['VI','LOVERS','lovers'],['VII','CHARIOT','chariot'],['XIV','TEMPERANCE','temperance'],['XVIII','MOON','moon']];
      const RANK=['陌生','眼熟','会点头','愿意多說一句','愿意多说一句','记得你的习惯','等你回来','面熟','熟识','信赖','羁绊','挚友'];
      const npcs=$$('.night-npcs>article',nb);
      npcs.forEach((a,i)=>{
        a.style.setProperty('--i',i);a.style.setProperty('--n',npcs.length);
        const arc=ARC[i%ARC.length];
        const txt=a.querySelector('small')?.textContent||'';
        let rank='?';
        const order=[['陌生'],['眼熟','面熟'],['会点头','熟识'],['愿意多說一句','愿意多说一句','信赖'],['记得你的习惯','羁绊'],['等你回来','挚友']];
        order.forEach((ws,k)=>{if(ws.some(w=>txt.includes(w)))rank=k+1;});
        once(a,'r3-arcana',()=>deco('div','r3-arcana',`<b>${arc[0]}</b><span class="r3-arc-glyph">${SVG[arc[2]]}</span><em>${arc[1]}</em><i class="r3-rank">RANK <strong>${rank}</strong></i>`),'prepend');
      });
      // Tartarus 塔区铭牌
      const TOW=[['I','TOWER · ECHO'],['II','TOWER · VANITY'],['III','TOWER · ESCAPE']];
      $$('.tower-strata-list>button',nb).forEach((b,i)=>{
        b.style.setProperty('--i',i);
        const locked=!b.classList.contains('active')&&/等|未|锁|开放/.test(b.textContent);
        b.classList.toggle('r3-sealed',locked);
        once(b,'r3-plate',()=>deco('span','r3-plate',`<b>${TOW[i]?.[0]||i+1}</b><em>${TOW[i]?.[1]||''}</em>${SVG.tartarus}${locked?'<i class="r3-seal"><s></s><s></s><strong>SEALED</strong></i>':'<i class="r3-lift"></i>'}`),'prepend');
      });
      // 觉醒：召唤器脉冲
      const aw=$('.night-base-awaken',nb);
      once(aw,'r3-evoker',()=>deco('div','r3-evoker',`<i></i><i></i><i></i>${SVG.evoker}<em>EVOKE</em>`));
      // 塔门：午夜 0:00
      const gate=$('.night-base-gate',nb);
      once(gate,'r3-midnight',()=>deco('div','r3-midnight',`${SVG.tartarus}${SVG.clock}<b class="r3-zero">0:00</b><em>THE DARK HOUR</em>`),'prepend');
      // 试验层：棺材
      const lab=$('.night-base-slice',nb);
      once(lab,'r3-coffins',()=>deco('div','r3-coffins',Array.from({length:7},(_,i)=>`<span style="--k:${i}">${SVG.coffin}</span>`).join('')+'<em>EXPERIMENT FLOOR</em>'),'prepend');
      // 今夜请求 / 时间窗：小装饰
      const req=$('.night-request',nb);
      once(req,'r3-pin',()=>deco('i','r3-pin','REQUEST'));
    }

    function blockName(f){return f<=20?'THEBEL':f<=40?'ARQA':f<=60?'YABBASHAH':f<=80?'TZIAH':'HARABAH';}
    // 地图重绘记忆：同一楼层内移动时 #content 会整块重建，格子入场动画不能重播
    const mapMem={floor:null,open:new Set(),cur:-1};
    function dMap(){
      const grid=$('.map-grid');if(!grid)return;
      const cells=$$('.map-cell',grid);
      const hudF=num($('.map-hud span b')?.textContent)||1;
      const first=mapMem.floor!==hudF;
      if(!grid.dataset.uiSeen){ // 本次重建只处理一次
      grid.dataset.uiSeen=first?'intro':'settled';
      let cur=-1;
      cells.forEach((c,i)=>{
        c.style.setProperty('--c',i%5);c.style.setProperty('--r',Math.floor(i/5));
        if(c.classList.contains('is-current'))cur=i;
        const open=!c.classList.contains('is-fog');
        if(!first&&open&&!mapMem.open.has(i))c.dataset.uiNew='1'; // 新探明：单独淡入
      });
      mapMem.open=new Set(cells.map((c,i)=>c.classList.contains('is-fog')?-1:i).filter(i=>i>=0));
      // 玩家标记：一个滑动的光框，从上一格平移到新格（只动 transform）
      if(cur>=0){
        const mk=once(grid,'r3-youmark',()=>deco('i','r3-youmark'));
        const at=k=>{const c=cells[k];return c?`translate3d(${c.offsetLeft}px,${c.offsetTop}px,0)`:'none';};
        mk.style.width=cells[cur].offsetWidth+'px';mk.style.height=cells[cur].offsetHeight+'px';
        if(!first&&mapMem.cur>=0&&mapMem.cur!==cur&&!reduce.matches){
          mk.style.transition='none';mk.style.transform=at(mapMem.cur);
          void mk.offsetWidth;
          mk.style.transition='';mk.style.transform=at(cur);
        }else mk.style.transform=at(cur);
      }
      // 视口滚动：重建后的新视口 scrollLeft/Top 归零（旧版"格子整体消失几帧"的真正原因：
      // 先露出左上角空白平面，两帧后 app 才把视口居中）。这里在首帧绘制前就恢复旧滚动并直接居中，
      // 再用 grid 的 translate 从旧位置平滑滑到新位置，app 随后的居中就成了空操作。
      const vp=grid.closest('.map-viewport');
      if(vp){
        vp.addEventListener('scroll',()=>{mapMem.sl=vp.scrollLeft;mapMem.st=vp.scrollTop;},{passive:true});
        const cc=cur>=0?cells[cur]:null;
        if(!first&&mapMem.sl!=null){
          vp.scrollLeft=mapMem.sl;vp.scrollTop=mapMem.st;
          if(cc){
            const vr=vp.getBoundingClientRect(),cr=cc.getBoundingClientRect();
            const L=Math.max(0,vp.scrollLeft+cr.left-vr.left+cr.width/2-vp.clientWidth/2),T=Math.max(0,vp.scrollTop+cr.top-vr.top+cr.height/2-vp.clientHeight/2);
            const ox=vp.scrollLeft,oy=vp.scrollTop;
            vp.scrollLeft=L;vp.scrollTop=T;
            const dx=vp.scrollLeft-ox,dy=vp.scrollTop-oy;
            if((dx||dy)&&!reduce.matches){
              grid.style.transition='none';grid.style.translate=`${dx}px ${dy}px`;
              void grid.offsetWidth;
              grid.style.transition='translate .42s cubic-bezier(.16,1,.3,1)';grid.style.translate='0px 0px';
              setTimeout(()=>{grid.style.transition='';grid.style.translate='';},460);
            }
          }
          mapMem.sl=vp.scrollLeft;mapMem.st=vp.scrollTop;
        }
      }
      mapMem.floor=hudF;mapMem.cur=cur;
      }
      const hud=$('.map-hud');
      const floorTxt=hud?.querySelector('span b')?.textContent||'';
      const floor=num(floorTxt)||1;
      const spans=hud?$$(':scope>span',hud):[];
      spans.forEach((s,i)=>{s.style.setProperty('--i',i);s.dataset.uiK=['floor','zone','block','moon','alert','key','hp','sp'][i]||'x';});
      const moon=spans[3];
      if(moon){const v=num(moon.querySelector('b')?.textContent),max=num(moon.textContent.split('/')[1]);moon.style.setProperty('--pct',max?Math.max(0,Math.min(1,v/max)):1);once(moon,'r3-moonring',()=>deco('i','r3-moonring'),'prepend');}
      const al=spans[4];if(al){al.style.setProperty('--pct',Math.min(1,(num(al.querySelector('b')?.textContent)||0)/100));}
      [spans[6],spans[7]].forEach(s=>{if(!s)return;const v=num(s.querySelector('b')?.textContent),max=num(s.textContent.split('/')[1]);s.style.setProperty('--pct',max?Math.max(0,Math.min(1,v/max)):1);});
      const board=$('.map-board');
      const fl=once(board,'r3-floorplate',()=>deco('div','r3-floorplate','<b></b><em></em><small></small>'),'prepend');
      if(fl){fl.querySelector('b').textContent=String(floor).padStart(2,'0');fl.querySelector('em').textContent=blockName(floor);fl.querySelector('small').textContent='TARTARUS · '+(floor)+'F';}
      const vp=$('.map-viewport');
      once(vp?.parentElement,'r3-skyline',()=>deco('div','r3-skyline','<i class="r3-bigmoon"></i><i class="r3-cloud"></i><i class="r3-cloud b"></i>'),'prepend');
      const pad=$('.map-pad');
      once(pad,'r3-compass',()=>deco('div','r3-compass',SVG.compass),'prepend');
      const mcur=$('.map-current');
      once(mcur,'r3-tipline',()=>deco('i','r3-tipline'));
      $$('.map-legend>span').forEach((s,i)=>s.style.setProperty('--i',i));
    }

    function dTalk(){
      const st=$('.slice-talk-stage');if(!st)return;
      once(st,'r3-shadow',()=>deco('div','r3-shadow',`${SVG.mask}<i class="r3-smoke"></i><i class="r3-smoke b"></i>`),'prepend');
      const box=$('.slice-talk-box',st);
      once(box,'r3-reply-tag',()=>deco('span','r3-reply-tag','YOUR WORDS'),'prepend');
      $$('.slice-actions>button',st).forEach((b,i)=>b.style.setProperty('--i',i));
      const meter=$('.slice-shadow-meter');
      if(meter){
        const bar=meter.querySelector('i');
        const w=bar?(parseFloat(getComputedStyle(bar).getPropertyValue('--value'))||parseFloat(bar.style.width)||null):null;
        once(meter,'r3-dial',()=>deco('div','r3-dial','<i class="r3-dial-face"></i><i class="r3-dial-needle"></i>'),'prepend');
        if(bar){const s=bar.getAttribute('style')||'';const m=s.match(/(\d+(\.\d+)?)%/);if(m)meter.style.setProperty('--pct',Number(m[1])/100);}
      }
    }
    function dTalkRes(){
      const ch=$('.slice-chance');if(!ch)return;
      const p=num(ch.querySelector('b')?.textContent);
      const rollTxt=ch.parentElement?.querySelector('small')?.textContent||'';
      const roll=num(rollTxt);
      ch.style.setProperty('--chance',isNaN(p)?0:p/100);
      if(!isNaN(roll))ch.style.setProperty('--roll',roll/100);
      once(ch,'r3-gauge',()=>deco('div','r3-gauge','<i class="r3-gauge-arc"></i><i class="r3-gauge-needle"></i><b class="r3-gauge-pct"></b><em>SUCCESS RATE</em>'),'prepend').querySelector('.r3-gauge-pct').textContent=isNaN(p)?'':p+'%';
      const res=$('.slice-result');
      once(res,'r3-verdict',()=>deco('div','r3-verdict',res.classList.contains('is-success')?'<b>LISTENED</b><em>交涉成立</em>':'<b>REFUSED</b><em>交涉破裂</em>'),'prepend');
    }

    function dBattle(){
      const stage=$('.sh-stage');if(!stage)return;
      // 指令：键位徽记（CSS 依据 data-battle-action 前缀画出 △○□✕）
      $$('.command-grid>button',stage).forEach((b,i)=>{
        const a=(b.dataset.battleAction||'').split(':')[0];
        b.dataset.uiKey={basic:'cross',guard:'square',items:'circle',analyze:'triangle',gun:'l1'}[a]||'r1';
        b.style.setProperty('--i',i);
      });
      const grid=$('.command-grid',stage);
      once(grid,'r3-pad',()=>deco('div','r3-pad','<i></i><i></i>'),'prepend');
      const hero=$('.combat-hero',stage);
      const art=$('.sh-tarot .sh-art',stage);
      if(art){
        const nm=($('.sh-tarot>b',stage)?.textContent||'').trim();
        const key=PERSONA_ARC[nm]||'fool';
        const c=once(art,'r3-bcard',()=>deco('span','r3-bcard',''));
        if(c.dataset.k!==key){c.dataset.k=key;c.innerHTML=tarotSvg(key,{name:false,fill:true});}
      }
      once(hero,'r3-theurgy',()=>deco('div','r3-theurgy','<em>THEURGY</em><i><b></b></i><small>READY 0%</small>'));
      const hud=$('.player-hud',stage);
      once(hud,'r3-pcard',()=>deco('div','r3-pcard','<i></i>'),'prepend');
      // HP/SP 比例 → 斜条
      $$('.player-hud>div:not(.player-tag)',stage).forEach(d=>{const v=num(d.querySelector('strong')?.textContent),max=num(d.querySelector('em')?.textContent);if(max)d.style.setProperty('--pct',Math.max(0,Math.min(1,v/max)));});
      // 敌人准星
      $$('.enemy-unit',stage).forEach(u=>once(u,'r3-reticle',()=>deco('span','r3-reticle','<i></i><i></i><b></b>')));
      // 回合横幅装饰
      const th=$('.turn-handoff',stage);
      once(th,'r3-turnfx',()=>deco('i','r3-turnfx'));
      const shift=$('.party-rail',stage);
      once(shift,'r3-shift',()=>deco('span','r3-shift','SHIFT ▸'));
    }

    function dPersona(){
      $$('.mask-tabs>button').forEach((b,i,all)=>{b.style.setProperty('--i',i);b.style.setProperty('--n',all.length);b.dataset.uiArc=ROMAN[i]||'';});
      const md=$('.mask-display');
      if(md){
        const t=md.querySelector('p')?.textContent||'';
        once(md,'r3-tarot',()=>deco('div','r3-tarot',`<b class="r3-tarot-no"></b><em class="r3-tarot-name"></em><i class="r3-tarot-frame"></i>`),'prepend');
        const arc=(t.split('·')[1]||'').trim();
        const AR={'愚者':[0,'THE FOOL'],'魔术师':[1,'MAGICIAN'],'女教皇':[2,'PRIESTESS'],'女帝':[3,'EMPRESS'],'皇帝':[4,'EMPEROR'],'教皇':[5,'HIEROPHANT'],'恋人':[6,'LOVERS'],'战车':[7,'CHARIOT'],'正义':[8,'JUSTICE'],'隐者':[9,'HERMIT'],'命运':[10,'FORTUNE'],'力量':[11,'STRENGTH'],'倒悬者':[12,'HANGED MAN'],'死神':[13,'DEATH'],'节制':[14,'TEMPERANCE'],'恶魔':[15,'DEVIL'],'塔':[16,'TOWER'],'星':[17,'STAR'],'月':[18,'MOON'],'太阳':[19,'SUN'],'审判':[20,'JUDGEMENT'],'世界':[21,'WORLD']};
        const a=AR[arc]||[0,'THE FOOL'];
        md.querySelector('.r3-tarot-no').textContent=ROMAN[a[0]];
        md.querySelector('.r3-tarot-name').textContent=a[1];
      }
      // 五维参数条
      const sl=$('.persona-ledger-stats .stat-line');
      if(sl){
        const vals=$$(':scope>span',sl).map(s=>num(s.textContent));
        const max=Math.max(10,...vals.filter(v=>!isNaN(v)));
        $$(':scope>span',sl).forEach((s,i)=>{s.style.setProperty('--pct',isNaN(vals[i])?0:vals[i]/Math.max(20,max*1.25));s.style.setProperty('--i',i);});
      }
      $$('.persona-roster-grid>button').forEach((b,i)=>b.style.setProperty('--i',i));
    }

    function dArsenal(){
      const tabs=$('.arsenal-tabs');if(!tabs)return;
      const bs=$$(':scope>button',tabs);
      const i=Math.max(0,bs.findIndex(b=>b.classList.contains('active')||b.getAttribute('aria-selected')==='true'||b.getAttribute('aria-pressed')==='true'));
      bs.forEach((b,k)=>{b.style.setProperty('--i',k);b.style.setProperty('--d',k-i);});
      tabs.style.setProperty('--act',i);
      const cyl=once(tabs,'r3-cylinder',()=>deco('div','r3-cylinder',SVG.cylinder+'<b></b>'),'prepend');
      cyl.style.setProperty('--rot',(-i*60)+'deg');
      cyl.querySelector('b').textContent=String(i+1).padStart(2,'0');
      $$('.arsenal-list>article').forEach((a,k)=>a.style.setProperty('--i',k));
    }

    function dShop(){
      const sec=$$('.shop-section');
      sec.forEach((s,i)=>{s.style.setProperty('--i',i);s.dataset.uiIdx=i;$$('.shop-row',s).forEach((r,k)=>r.style.setProperty('--k',k));});
      const lay=$('.shop-layout');if(!lay)return;
      const cyl=once(lay,'r3-shopcyl',()=>deco('div','r3-shopcyl',SVG.cylinder+'<ol>'+sec.map(s=>`<li>${(s.querySelector('header h3')?.textContent||'').replace(/</g,'')}</li>`).join('')+'</ol>'),'prepend');
      const upd=()=>{
        let best=0,bd=1e9;
        sec.forEach((s,i)=>{const r=s.getBoundingClientRect();const d=Math.abs(r.top+Math.min(r.height,400)/2-innerHeight*.45);if(d<bd){bd=d;best=i;}});
        cyl.style.setProperty('--rot',(-best*60)+'deg');
        $$('li',cyl).forEach((l,i)=>l.classList.toggle('on',i===best));
        sec.forEach((s,i)=>s.classList.toggle('r3-chamber',i===best));
      };
      if(!dShop.bound){dShop.bound=true;addEventListener('scroll',()=>{if(body.dataset.uiPage==='ts-shop')upd();},{passive:true});}
      upd();
    }
    function dGear(){
      const slots=$$('.gear-slot');
      slots.forEach((s,i)=>s.style.setProperty('--i',i));
      const sl=$('.gear-slots');
      once(sl,'r3-doll',()=>deco('div','r3-doll',tarotCard('chariot',{caption:false})),'prepend');
    }
    function dInv(){
      $$('.inventory-row').forEach((r,i)=>r.style.setProperty('--i',i));
      const tabs=$('.inventory-tabs');
      if(tabs){const bs=$$(':scope>button',tabs);const i=Math.max(0,bs.findIndex(b=>b.classList.contains('active')));tabs.style.setProperty('--act',i);bs.forEach((b,k)=>b.style.setProperty('--i',k));once(tabs,'r3-zip',()=>deco('i','r3-zip'));}
    }
    function dVelvet(){
      const vr=$('.velvet-room');if(!vr)return;
      once(vr,'r3-elevator',()=>deco('div','r3-elevator',`<div class="r3-elev-dial">${SVG.elevator}</div><i class="r3-elev-door l"></i><i class="r3-elev-door r"></i><i class="r3-elev-rise"></i><i class="r3-pendulum"><b></b></i>`),'prepend');
      const menu=$$('.vr-menu>button',vr);
      const i=Math.max(0,menu.findIndex(b=>b.classList.contains('active')));
      vr.style.setProperty('--floor',i);
      menu.forEach((b,k)=>{b.style.setProperty('--i',k);b.dataset.uiFloor=k+1;});
      const nd=$('.r3-elev-needle',vr);if(nd)nd.style.transform=`rotate(${-90+i/8*180}deg)`;
      $$('.r3-elev-lamp',vr).forEach((l,k)=>l.classList.toggle('on',k===i));
    }

    function dScene(page){
      const sc=content?.firstElementChild;
      if(!sc||!sc.classList)return;
      const lay=sc.querySelector(':scope>div:not(.scene-ghost):not(.scene-heading)');
      // 区层显形：塔区名浮现
      if(/reveal/.test(page)||sc.querySelector('.reveal-layout')){
        const r=sc.querySelector('.reveal-layout');
        once(r,'r3-reveal',()=>deco('div','r3-reveal',`${SVG.tartarus}<b>TARTARUS</b><em>THE DARK HOUR · BLOCK I THEBEL</em><i class="r3-reveal-moon"></i>`));
      }
      if(page==='ts-safe'||sc.querySelector('.safehouse-layout')){
        const s=sc.querySelector('.safehouse-layout')||lay;
        once(s,'r3-safe',()=>deco('div','r3-safe','<i class="r3-safe-door"></i><i class="r3-safe-lamp"></i><b>SAFE ROOM</b>'));
      }
      if(sc.querySelector('.return-layout,.recap-ascent')||/ts-return|ts-recap|ts-clear|sc-recap|sc-clear/.test(page)){
        const s=sc.querySelector('.return-layout,.recap-ascent')||lay;
        once(s,'r3-dawn',()=>deco('div','r3-dawn','<i class="r3-sun"></i><i class="r3-horizon"></i><b>DAWN</b><em>影时间结束</em>'));
      }
      if(sc.querySelector('.finale-layout')){
        once(sc.querySelector('.finale-layout'),'r3-finale',()=>deco('div','r3-finale',tarotCard('world')));
      }
      if(sc.querySelector('.result-layout')||page==='sc-victory'){
        const s=sc.querySelector('.result-layout');
        once(s,'r3-result',()=>deco('div','r3-result','<b>RESULT</b><div class="r3-exp"><em>EXP</em><i><s></s></i><strong>LEVEL UP?</strong></div><span class="r3-result-rays"></span>'));
      }
      if(page.startsWith('slice-')){
        if(page==='slice-day'){const s=sc.querySelector('.slice-day');once(s,'r3-daycal',()=>{const d=new Date();return deco('div','r3-daycal',`<b>${d.getMonth()+1}/${d.getDate()}</b><em>${['SUN','MON','TUE','WED','THU','FRI','SAT'][d.getDay()]}</em><i class="r3-sunbeam"></i><span>DAYTIME</span>`);},'prepend');}
        else{once(sc,'r3-corridor',()=>deco('div','r3-corridor',Array.from({length:6},(_,i)=>`<span style="--k:${i}">${SVG.coffin}</span>`).join('')+'<i class="r3-green-moon"></i>'));}
      }
      if(sc.querySelector('.story-layout')){
        const s=sc.querySelector('.story-layout');
        s.dataset.uiScene=page;
        once(s,'r3-story',()=>deco('div','r3-story',`<b>${(sc.querySelector('.scene-heading span')?.textContent||'').replace(/</g,'')}</b><i></i>`));
      }
      if(sc.querySelector('.loot-layout')){
        once(sc.querySelector('.loot-layout'),'r3-chest',()=>deco('div','r3-chest','<i class="r3-lid"></i><i class="r3-box"></i><i class="r3-glow"></i>'));
      }
      if(sc.querySelector('.boss-layout')){
        once(sc.querySelector('.boss-layout'),'r3-boss',()=>deco('div','r3-boss',`${SVG.mask}<b>MAIN SHADOW</b>`));
      }
    }

    /* 帧率看门狗：只在启动后采样 3 个 2s 窗口（R4：原先常驻 rAF 循环让空闲页每帧都跑主线程帧，天鹅绒等页空闲掉帧）。
       持续低帧率 → 静态模式；采样结束即停，不再常驻。 */
    if(!reduce.matches){
      let frames=0,t0=0,bad=0,win=0;
      const watch=now=>{
        if(!t0)t0=now;
        if(document.hidden){t0=now;frames=0;requestAnimationFrame(watch);return;}
        frames++;
        if(now-t0>2000){
          const fps=frames*1000/(now-t0);
          bad=fps<22?bad+1:0;
          frames=0;t0=now;win++;
          if(bad>=2){body.classList.add('r3-lite');return;}
          if(win>=3)return;
        }
        requestAnimationFrame(watch);
      };
      setTimeout(()=>requestAnimationFrame(watch),2500);
    }
  });

  /* ======================================================================
   * 战斗行动特效（P3R · 灵魂之海 / 召唤器玻璃碎裂）
   * 只读侦测，不改规则：
   *  - 行动意图：捕获阶段被动监听点击（不 preventDefault / 不 stopPropagation），
   *    在 [data-action=execute] / [data-switch-mask] / [data-battle-item] 按下的瞬间
   *    读取当时 aria-pressed=true 的 [data-battle-action]（类型:id）与其 <small> 详情（属性 · 范围）。
   *  - 行动结果：combat-motion 往 body 插入的 .battle-impact[data-impact=kind]
   *    （slash/star=弱点/critical/one-more/guard/heal/buff/insight/player-hit）+ .damage-number 文本。
   *  - 耐性：重绘后的 .sh-affs .sh-aff.is-weak|resist|null|absorb|repel（按 物枪火冰电风念核祝咒 顺序）。
   *  - 敌人倒下：#content 重绘前后 .enemy-unit[data-target-id] 新增 .is-down。
   * 输出：body 下 aria-hidden + pointer-events:none 的 .r3x 层（≤900ms 自删）；
   *       给已有节点只加 class（r3x-own / r3x-struck / r3x-dissolve）。
   * ====================================================================== */
  ready(()=>{
    const body=document.body;
    const EL={'物理':'phys','枪击':'gun','火焰':'fire','冰冻':'ice','电击':'elec','疾风':'wind','念动':'psy','核热':'nuclear','祝福':'bless','咒怨':'curse','万能':'almighty','恢复':'heal','辅助':'support','异常':'ailment'};
    const AFF_ORDER=['phys','gun','fire','ice','elec','wind','psy','nuclear','bless','curse'];
    const EN={phys:'SLASH',gun:'GUN',fire:'AGI',ice:'BUFU',elec:'ZIO',wind:'GARU',psy:'PSI',nuclear:'FREI',bless:'HAMA',curse:'MUDO',almighty:'MEGIDO',heal:'DIA',support:'SUPPORT',ailment:'AILMENT'};
    let pending=null;
    const off=()=>reduce.matches||document.documentElement.dataset.theme!=='p3'||document.documentElement.dataset.skin==='hamuko';
    const lite=()=>mobile()||body.classList.contains('r3-lite');
    const R=(a,b)=>a+Math.random()*(b-a);
    const center=el=>{if(!el)return null;const r=el.getBoundingClientRect();if(!r.width&&!r.height)return null;return {x:r.left+r.width/2,y:r.top+r.height/2,w:r.width,h:r.height,top:r.top};};
    const clampX=x=>Math.max(70,Math.min(innerWidth-70,x));

    function readAction(){
      const st=$('.sh-stage');if(!st)return null;
      let b=$('[data-battle-action][aria-pressed=true]',st);
      if(!b){
        const lab=($('[data-action=execute]',st)?.textContent||'').split('·').slice(1).join('·').trim();
        if(lab)b=$$('[data-battle-action]',st).find(x=>(x.querySelector('span')?.firstChild?.textContent||'').trim()===lab)||null;
      }
      if(!b)return null;
      const [type,id]=(b.dataset.battleAction||'').split(':');
      const detail=(b.querySelector('small')?.textContent||'').trim();
      const head=detail.split('·')[0].trim();
      let el=EL[head]||'';
      if(type==='basic')el='phys';if(type==='gun')el='gun';
      const scope=/全体敌人/.test(detail)?'all':/全体我方|我方/.test(detail)?'ally':/自身/.test(detail)?'self':'enemy';
      return {type,id:id||'',el,scope,t:performance.now()};
    }
    document.addEventListener('click',e=>{
      if(off())return;
      const t=e.target.closest?.('[data-action=execute],[data-switch-mask],[data-battle-item]');
      if(!t||t.disabled)return;
      if(t.dataset.switchMask)pending={type:'switchMask',id:t.dataset.switchMask,el:'',scope:'self',t:performance.now()};
      else if(t.dataset.battleItem)pending={type:'item',id:t.dataset.battleItem,el:'',scope:'ally',t:performance.now()};
      else pending=readAction();
    },true); // 捕获 + 只读：不阻止、不代发

    /* 装饰层工厂 */
    function layer(cls,ms){
      const n=deco('div','r3x '+cls);
      body.append(n);
      setTimeout(()=>n.remove(),ms||900);
      return n;
    }
    function put(host,x,y,cls,html){
      const n=document.createElement('div');n.className=cls;
      n.style.setProperty('--x',x+'px');n.style.setProperty('--y',y+'px');
      if(html)n.innerHTML=html;host.append(n);return n;
    }
    function parts(n,fn){let s='';for(let i=0;i<n;i++)s+=fn(i);return s;}
    const cnt=n=>Math.max(3,Math.round(n*(lite()?.45:1)));

    function enemyTargets(scope){
      const st=$('.sh-stage');if(!st)return [];
      const alive=$$('.enemy-unit:not(.is-down)',st);
      let list=scope==='all'?alive:[ $('.enemy-unit.is-active',st)||alive[0] ].filter(Boolean);
      if(!list.length)list=$$('.enemy-unit',st).slice(0,1);
      return list.slice(0,3).map(u=>({u,p:center(u.querySelector('.enemy-unit-face')||u)})).filter(o=>o.p);
    }
    function heroHead(){
      const t=$('.sh-stage .combat-hero .sh-tarot');const p=center(t);
      if(p)return {x:p.x,y:p.top+p.h*.22};
      const h=center($('.combat-hero .head'));return h||{x:innerWidth*.22,y:innerHeight*.38};
    }
    function affinityOf(el){
      const i=AFF_ORDER.indexOf(el);if(i<0)return '';
      const a=$$('.sh-stage .sh-affs .sh-aff')[i];if(!a)return '';
      const m=a.className.match(/is-(weak|resist|null|absorb|repel)/);return m?m[1]:'';
    }
    function struck(units,strong){
      units.forEach(u=>{u.classList.remove('r3x-struck','r3x-struck-hard');void u.offsetWidth;u.classList.add(strong?'r3x-struck-hard':'r3x-struck');setTimeout(()=>u.classList.remove('r3x-struck','r3x-struck-hard'),520);});
    }

    /* --- 各部件 --- */
    function summon(L,big){ // 召唤器：头部玻璃碎裂 + 光环 + 蓝色碎片
      const h=heroHead();const n=cnt(big?18:13);
      put(L,h.x,h.y,'r3x-summon'+(big?' is-big':''),
        `<i class="sm-col"></i><i class="sm-flare"></i><i class="sm-halo"></i><i class="sm-halo b"></i>`+
        `<svg class="sm-crack" viewBox="-100 -100 200 200">${parts(11,i=>{const a=i/11*Math.PI*2+R(-.2,.2),r=R(45,96),m=r*R(.35,.6),ma=a+R(-.35,.35);return `<path pathLength="1" d="M0 0 L${Math.cos(ma)*m} ${Math.sin(ma)*m} L${Math.cos(a)*r} ${Math.sin(a)*r}"/>`;})}</svg>`+
        parts(n,i=>{const a=i/n*Math.PI*2+R(-.3,.3),d=R(70,big?220:160),s=R(14,big?40:30);return `<i class="sm-shard" style="--dx:${Math.cos(a)*d}px;--dy:${Math.sin(a)*d*.8+R(20,70)}px;--r:${R(-260,260)}deg;--s:${s}px;--cp:polygon(${R(0,40)}% 0,100% ${R(0,45)}%,${R(55,100)}% 100%,0 ${R(45,100)}%);--dl:${R(0,60)}ms"></i>`;}));
    }
    function slash(L,p,heavy,delay){
      put(L,p.x,p.y,'r3x-slash'+(heavy?' is-heavy':''),`<i class="sl a"></i><i class="sl b"></i>${heavy?'<i class="sl c"></i>':''}<i class="sl-glow"></i>`).style.setProperty('--dl',(delay||0)+'ms');
    }
    function gun(L,p,delay){
      const h=heroHead();
      const dx=p.x-h.x,dy=p.y-h.y,len=Math.hypot(dx,dy),ang=Math.atan2(dy,dx)*180/Math.PI;
      put(L,h.x,h.y,'r3x-tracer',`<i style="--len:${len}px;--ang:${ang}deg"></i><i style="--len:${len}px;--ang:${ang+1.5}deg;--sd:70ms"></i><i style="--len:${len}px;--ang:${ang-1.2}deg;--sd:140ms"></i>`).style.setProperty('--dl',(delay||0)+'ms');
      put(L,p.x,p.y,'r3x-hole','<i></i><i></i><b></b>').style.setProperty('--dl',(delay||0)+'ms');
    }
    function element(L,el,p,delay){
      const d=`--dl:${delay}ms`;let html='';
      switch(el){
        case 'fire':html=`<i class="ef-base"></i>`+parts(cnt(9),i=>`<i class="ef-tongue" style="--ox:${R(-70,70)}px;--h:${R(110,210)}px;--w:${R(36,64)}px;--sd:${R(0,180)}ms"></i>`)+parts(cnt(10),i=>`<i class="ef-ember" style="--ox:${R(-70,70)}px;--oy:${R(-200,-90)}px;--sd:${R(80,300)}ms"></i>`);break;
        case 'ice':html=`<i class="ei-ring"></i>`+parts(cnt(10),i=>`<i class="ei-spike" style="--a:${i/cnt(10)*360+R(-12,12)}deg;--l:${R(70,140)}px;--sd:${R(0,120)}ms"></i>`)+`<i class="ei-core"></i>`;break;
        case 'elec':html=`<svg class="ee-bolt" viewBox="0 0 200 600" preserveAspectRatio="none">${parts(lite()?2:3,k=>{let x=100+R(-30,30),s=`M${x} 0`;for(let y=40;y<=560;y+=40){x+=R(-38,38);s+=` L${x} ${y}`;}s+=' L100 600';return `<path d="${s}" style="--sd:${k*70}ms"/>`;})}</svg><i class="ee-flash"></i>`+parts(cnt(8),i=>`<i class="ee-arc" style="--a:${R(0,360)}deg;--sd:${R(120,320)}ms"></i>`);break;
        case 'wind':html=parts(lite()?2:3,k=>`<i class="ew-arc" style="--k:${k};--sd:${k*90}ms"></i>`)+parts(cnt(9),i=>`<i class="ew-blade" style="--a:${i*40}deg;--r:${R(50,110)}px;--sd:${R(0,200)}ms"></i>`);break;
        case 'psy':html=parts(lite()?3:5,k=>`<i class="ep-ring" style="--sd:${k*80}ms"></i>`)+parts(cnt(6),i=>`<i class="ep-prism" style="--a:${i*60+R(-15,15)}deg;--sd:${R(100,260)}ms"></i>`);break;
        case 'nuclear':html=`<i class="en-core"></i><i class="en-orb" style="--a:0deg"></i><i class="en-orb" style="--a:60deg"></i><i class="en-orb" style="--a:120deg"></i><i class="en-wave"></i>`;break;
        case 'bless':html=`<i class="eb-pillar"></i><svg class="eb-sigil" viewBox="-60 -60 120 120"><circle r="52"/><path d="M0 -50 L43 25 L-43 25 Z M0 50 L-43 -25 L43 -25 Z"/></svg>`+parts(cnt(10),i=>`<i class="eb-spark" style="--ox:${R(-60,60)}px;--oy:${R(-140,40)}px;--sd:${R(80,360)}ms"></i>`);break;
        case 'curse':html=`<i class="ec-ink"></i>`+parts(lite()?2:3,k=>`<i class="ec-claw" style="--k:${k};--sd:${120+k*70}ms"></i>`)+parts(cnt(8),i=>`<i class="ec-wisp" style="--ox:${R(-70,70)}px;--sd:${R(0,260)}ms"></i>`);break;
        case 'almighty':html=`<i class="ea-core"></i><i class="ea-ring"></i><i class="ea-ring b"></i>`;break;
        case 'heal':html=`<i class="eh-ring"></i>`+parts(cnt(12),i=>`<i class="eh-mote" style="--ox:${R(-55,55)}px;--oy:${R(-150,-60)}px;--sd:${R(0,320)}ms"></i>`);break;
        case 'support':html=`<svg class="es-rune" viewBox="-60 -60 120 120"><circle r="54"/><circle r="40" class="d"/><path d="M0 -54 V54 M-54 0 H54"/></svg>`;break;
        case 'ailment':html=parts(cnt(7),i=>`<i class="ec-wisp is-ail" style="--ox:${R(-60,60)}px;--sd:${R(0,260)}ms"></i>`);break;
        case 'phys':slash(L,p,true,delay);return;
        case 'gun':gun(L,p,delay);return;
        default:html=`<i class="ea-ring"></i>`;
      }
      put(L,p.x,p.y,'r3x-el',html).dataset.el=el;
      L.lastChild.style.cssText+=d;
    }
    function number(L,p,text,kind,delay){
      if(!text)return;
      const x=clampX(p.x+(kind==='hurt'?0:R(20,60))),y=p.y-(kind==='hurt'?10:R(10,40));
      const digits=[...text].map((c,i)=>`<i style="--n:${i}">${c}</i>`).join('');
      const n=put(L,x,y,'r3x-num is-'+kind,`<b>${digits}</b>`);n.style.setProperty('--dl',delay+'ms');
    }
    function word(L,p,w,kind,delay){
      const x=clampX(p.x),y=Math.max(90,p.y-(kind==='crit'?120:100));
      const n=put(L,x,y,'r3x-word is-'+kind,`<i class="wd-slab"></i><b data-t="${w}">${w}</b>${(kind==='weak'||kind==='crit')&&/1 MORE/.test($('.sh-stage .battle-log')?.textContent||'')?'<small>DOWN ▸ 1 MORE</small>':''}`);
      n.style.setProperty('--dl',delay+'ms');
      if(kind==='crit')put(L,p.x,p.y,'r3x-burst','').style.setProperty('--dl',delay+'ms');
    }
    function flash(L,strength,delay){const n=put(L,0,0,'r3x-flash'+(strength?' is-'+strength:''));n.style.setProperty('--dl',delay+'ms');}

    /* --- 主分派 --- */
    function onImpact(imp){
      if(off())return;
      const kind=imp.dataset.impact||'';
      if(kind==='allout')return; // 总攻击交给 .p3-aoa
      const act=pending&&performance.now()-pending.t<2500?pending:null;
      pending=null;
      imp.classList.add('r3x-own');
      const raw=(imp.querySelector('.damage-number')?.textContent||'').trim();
      const amount=num(raw);
      const hit={x:parseFloat(imp.style.getPropertyValue('--hit-x'))||innerWidth*.7,y:parseFloat(imp.style.getPropertyValue('--hit-y'))||innerHeight*.35};
      const L=layer('fx-'+kind);
      L.dataset.uiFx=kind;
      // 敌方行动打到我方
      if(kind==='player-hit'){
        put(L,hit.x,hit.y,'r3x-hurt',`<svg viewBox="-60 -60 120 120">${parts(7,i=>{const a=i/7*Math.PI*2+R(-.3,.3);return `<path pathLength="1" d="M0 0 L${Math.cos(a)*R(30,58)} ${Math.sin(a)*R(30,58)}"/>`;})}</svg>`);
        number(L,hit,String(Math.abs(amount)||''),'hurt',60);return;
      }
      if(kind==='guard'&&(!act||act.type==='guard')){
        const p=act?.type==='guard'?heroHead():hit;
        put(L,p.x,p.y+(act?40:0),'r3x-guard',`<svg viewBox="-70 -80 140 160"><path class="gd-shell" d="M0 -74 L64 -37 L64 37 L0 74 L-64 37 L-64 -37 Z"/>${parts(7,i=>{const a=i/6*Math.PI*2;return i===6?'<path class="gd-hex" d="M0 -18 L16 -9 L16 9 L0 18 L-16 9 L-16 -9 Z"/>':`<path class="gd-hex" transform="translate(${Math.cos(a+Math.PI/6)*32} ${Math.sin(a+Math.PI/6)*32})" d="M0 -18 L16 -9 L16 9 L0 18 L-16 9 L-16 -9 Z"/>`;})}</svg><i class="gd-wave"></i>`);
        if(!act)word(L,hit,'BLOCK','null',120);return;
      }
      if(!act){ // 无来源（如 1 MORE 回落）：只做通用
        if(kind==='one-more'){word(L,hit,'1 MORE','more',0);}
        return;
      }
      if(act.type==='item'||(kind==='heal'||kind==='buff')&&act.type!=='skill'&&act.type!=='switchMask'){
        put(L,hit.x,hit.y,'r3x-item',parts(cnt(14),i=>`<i style="--ox:${R(-50,50)}px;--oy:${R(-160,-50)}px;--sd:${R(0,340)}ms;--z:${R(.6,1.4)}"></i>`)+'<b></b>');
        if(kind==='heal'&&amount)number(L,hit,'+'+Math.abs(amount),'heal',260);return;
      }
      if(act.type==='switchMask'){summon(L,true);word(L,heroHead(),'PERSONA','summon',260);return;}
      if(act.type==='analyze'||kind==='insight'&&act.type!=='skill'){
        enemyTargets('enemy').forEach(o=>put(L,o.p.x,o.p.y,'r3x-scan','<i></i><i></i><b>ANALYZE</b>'));return;
      }
      if(act.type==='batonPass'||kind==='one-more'){word(L,hit,'1 MORE','more',0);return;}
      if(act.type==='showtime'){summon(L,true);enemyTargets('all').forEach(o=>{slash(L,o.p,true,240);});flash(L,'crit',200);return;}

      // 攻击类：普攻 / 枪 / 技能
      const isSkill=act.type==='skill';
      const el=act.el||(isSkill?'almighty':'phys');
      const supportive=['heal','support'].includes(el)||act.scope==='ally'||act.scope==='self';
      if(isSkill)summon(L,false);
      const t0=isSkill?240:act.type==='gun'?60:0;
      if(supportive){
        element(L,el==='heal'||kind==='heal'?'heal':'support',hit,t0);
        if(kind==='heal'&&amount)number(L,hit,'+'+Math.abs(amount),'heal',t0+220);
        return;
      }
      const tg=enemyTargets(act.scope);
      if(!tg.length)return;
      const aff=affinityOf(el);
      if(isSkill)tg.forEach((o,i)=>element(L,el,o.p,t0+i*40));
      else if(act.type==='gun')tg.forEach(o=>gun(L,o.p));
      else tg.forEach(o=>slash(L,o.p,false));
      const contact=t0+(isSkill?170:act.type==='gun'?120:110);
      setTimeout(()=>struck(tg.map(o=>o.u),kind==='star'||kind==='critical'),contact);
      const main=tg[0].p;
      const zero=!(Math.abs(amount)>0);
      if(kind==='critical'){flash(L,'crit',contact);word(L,main,'CRITICAL','crit',contact+20);}
      else if(kind==='star'){flash(L,'weak',contact);word(L,main,'WEAK','weak',contact+20);}
      else if(zero&&aff&&aff!=='weak'){word(L,main,{null:'NULL',absorb:'DRAIN',repel:'REPEL',resist:'RESIST'}[aff],'null',contact);}
      else if(/MISS|未命中|闪避|躲开/.test($('.sh-stage .battle-log')?.textContent||'')){word(L,main,'MISS','miss',contact);} // 规则当前不产生 MISS：仅预留
      else if(aff==='resist'){word(L,main,'RESIST','null',contact+40);}
      else flash(L,'',contact);
      if(!zero)tg.forEach((o,i)=>number(L,o.p,String(Math.abs(amount)),kind==='critical'?'crit':kind==='star'?'weak':'hit',contact+30+i*60));
    }

    /* --- 敌人倒下：溶解成黑雾 --- */
    let downSet=null,stageRef=null;
    function scanDown(){
      const st=$('.sh-stage');
      if(!st){downSet=null;stageRef=null;return;}
      const units=$$('.enemy-unit[data-target-id]',st);
      const now=new Set(units.filter(u=>u.classList.contains('is-down')).map(u=>u.dataset.targetId));
      const ids=units.map(u=>u.dataset.targetId).join(',');
      if(!downSet||stageRef!==ids){downSet=now;stageRef=ids;return;} // 新战斗：只记录
      const fresh=units.filter(u=>u.classList.contains('is-down')&&!downSet.has(u.dataset.targetId));
      downSet=now;
      if(off()||!fresh.length)return;
      const L=layer('fx-down',900);L.dataset.uiFx='dissolve';
      fresh.forEach(u=>{
        const p=center(u.querySelector('.enemy-unit-face')||u);if(!p)return;
        u.classList.add('r3x-dissolve');setTimeout(()=>u.classList.remove('r3x-dissolve'),900);
        put(L,p.x,p.y,'r3x-fog',`<i class="fg-mask"></i>`+parts(cnt(14),i=>`<i class="fg-puff" style="--ox:${R(-p.w*.4,p.w*.4)}px;--oy:${R(-p.h*.2,p.h*.3)}px;--ty:${R(-170,-80)}px;--z:${R(.7,1.6)};--sd:${R(0,260)}ms"></i>`)+parts(cnt(10),i=>`<i class="fg-mote" style="--ox:${R(-p.w*.5,p.w*.5)}px;--ty:${R(-220,-110)}px;--sd:${R(80,360)}ms"></i>`)).style.setProperty('--sz',Math.max(80,Math.min(260,p.w))+'px');
      });
    }

    new MutationObserver(ms=>{
      for(const m of ms)for(const n of m.addedNodes){
        if(n.nodeType===1&&n.classList?.contains('battle-impact'))onImpact(n);
      }
    }).observe(body,{childList:true});
    const content=$('#content');
    if(content){
      let q=0;
      new MutationObserver(()=>{if(q)return;q=1;queueMicrotask(()=>{q=0;scanDown();});}).observe(content,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
      scanDown();
    }
  });

  /* ---------- 月相 ---------- */
  function moonPhase(d){
    const syn=29.530588853,ref=Date.UTC(2000,0,6,18,14)/864e5;
    const days=d.getTime()/864e5-ref;
    return ((days%syn)+syn)%syn/syn;
  }
  function moonSvg(p){
    const r=15,c=18;
    const lit=p<=.5?p*2:(1-p)*2;
    const k=Math.cos(lit*Math.PI)*r;
    const waxing=p<.5;
    const s=waxing?1:0;
    const d=`M${c} ${c-r} A${r} ${r} 0 0 ${s} ${c} ${c+r} A${Math.abs(k)} ${r} 0 0 ${(k>0)===waxing?0:1} ${c} ${c-r}Z`;
    return `<svg class="r3-cal-moon" viewBox="0 0 36 36" aria-hidden="true"><circle cx="${c}" cy="${c}" r="${r}" fill="rgba(6,25,90,.85)" stroke="rgba(191,246,255,.6)" stroke-width="1.2"/><path d="${d}" fill="#eaffd0"/></svg>`;
  }

})();
