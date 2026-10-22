const { chromium } = require('/workspace/work/umbra-next/m3/node_modules/playwright-core');
(async()=>{
 const px=process.env.HTTPS_PROXY||process.env.https_proxy||process.env.HTTP_PROXY||process.env.http_proxy; console.log('proxy?',!!px); const b = await chromium.launch({args:['--no-sandbox'], proxy: px?{server:px.replace(/\/\/[^@]*@/,'//')}:undefined});
 const ctx = await b.newContext({acceptDownloads:true, userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'});
 const p = await ctx.newPage();
 await p.goto(process.argv[2],{waitUntil:'domcontentloaded',timeout:60000});
 for(let i=0;i<20;i++){ const t=await p.title(); if(!/moment/i.test(t)) break; await p.waitForTimeout(2000);}
 console.log('TITLE',await p.title());
 const links = await p.$$eval('a',as=>as.map(a=>a.href).filter(h=>/download|asset\//.test(h)));
 console.log([...new Set(links)].slice(0,80).join('\n'));
 const fs=require('fs'); fs.writeFileSync('/tmp/page.html', await p.content());
 await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
