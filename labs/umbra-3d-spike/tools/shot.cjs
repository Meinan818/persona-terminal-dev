// usage: node shot.cjs url outPng w h [waitTitle] [evalJsonOut]
const { chromium } = require('/workspace/work/umbra-next/m3/node_modules/playwright-core');
(async()=>{
 const [url,out,w,h,dpr,wait]=process.argv.slice(2);
 const b=await chromium.launch({args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
 const p=await b.newPage({viewport:{width:+w,height:+h},deviceScaleFactor:+(dpr||1)});
 p.on('console',m=>{ if(m.type()!=='debug') console.log('[c]',m.text().slice(0,300))}); p.on('pageerror',e=>console.log('[err]',e.message));
 await p.goto(url,{timeout:110000});
 await p.waitForFunction(()=>document.title==='done'||document.title==='ready',null,{timeout:+(wait||100000)});
 const o=await p.evaluate(()=>window.__out); if(o) require('fs').writeFileSync(out.replace(/\.png$/,'.json'),JSON.stringify(o,null,1));
 if(out.endsWith('.png')) await p.screenshot({path:out});
 await b.close();
})().catch(e=>{console.error(e.message);process.exit(1)});
