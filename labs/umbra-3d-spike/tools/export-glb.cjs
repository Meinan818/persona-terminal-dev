const { chromium } = require('/workspace/work/umbra-next/m3/node_modules/playwright-core');
(async()=>{ const b=await chromium.launch({args:['--no-sandbox']}); const p=await b.newPage();
 p.on('console',m=>console.log('[c]',m.text().slice(0,200))); p.on('pageerror',e=>console.log('[err]',e.message));
 await p.goto('http://127.0.0.1:5179/export-glb.html'); await p.waitForFunction(()=>document.title==='done',null,{timeout:100000});
 const o=await p.evaluate(()=>window.__out); require('fs').writeFileSync(process.argv[2],Buffer.from(o.b64,'base64')); console.log(o.names); await b.close(); })().catch(e=>{console.error(e.message);process.exit(1)});
