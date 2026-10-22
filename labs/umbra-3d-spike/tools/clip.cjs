const { chromium } = require('/workspace/work/umbra-next/m3/node_modules/playwright-core');
(async()=>{
 const [out,w,h,fps,dur]=[process.argv[2],+process.argv[3],+process.argv[4],+(process.argv[5]||24),+(process.argv[6]||8)];
 const b=await chromium.launch({args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const p=await b.newPage({viewport:{width:w,height:h}});
 await p.goto('http://127.0.0.1:5179/?shot=clip&t=0',{timeout:110000});
 await p.waitForFunction(()=>document.title==='ready',null,{timeout:110000});
 const fs=require('fs'); fs.mkdirSync(out,{recursive:true});
 const start=+(process.argv[7]||0), end=+(process.argv[8]||fps*dur);
 for(let i=start;i<end;i++){ await p.evaluate(t=>window.__render(t), i/fps); await p.screenshot({path:`${out}/f${String(i).padStart(4,'0')}.jpg`,quality:90,type:'jpeg'}); }
 await b.close();
})().catch(e=>{console.error(e.message);process.exit(1)});
