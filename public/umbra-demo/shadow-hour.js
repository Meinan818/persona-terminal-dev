// 影时间（P3）舞台缩放：电脑 1440 设计宽度 / 手机 390 设计宽度，同一套 DOM 按断点重新构图。
(function(){
  const root=document.documentElement;
  const force=new URLSearchParams(location.search).get('v');
  function fit(){
    const w=innerWidth,h=innerHeight;
    const mobile=force?force==='m':(w<820||w<h*0.9);
    document.body.classList.toggle('sh-m',mobile);
    document.body.classList.toggle('sh-d',!mobile);
    let s,W,H;
    if(mobile){s=w/390;W=390;H=Math.max(700,h/s);}
    else{s=Math.min(w/1440,h/820);W=Math.max(1440,w/s);H=Math.max(820,h/s);}
    root.style.setProperty('--sh-s',s);
    root.style.setProperty('--sh-w',W+'px');
    root.style.setProperty('--sh-h',H+'px');
  }
  addEventListener('resize',fit);
  if(document.body)fit();else addEventListener('DOMContentLoaded',fit);
})();
