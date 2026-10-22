const { chromium } = require('/workspace/work/umbra-next/m3/node_modules/playwright-core');
(async()=>{
 const px=process.env.HTTPS_PROXY||process.env.https_proxy||process.env.HTTP_PROXY||process.env.http_proxy;
 let proxy; if(px){const u=new URL(px); proxy={server:u.protocol+'//'+u.host, username:decodeURIComponent(u.username)||undefined, password:decodeURIComponent(u.password)||undefined}; console.log('scheme',u.protocol,'auth',!!u.username);}
 const b = await chromium.launch({headless:false, args:['--no-sandbox','--headless=new','--disable-blink-features=AutomationControlled'], proxy});
 const ctx=await b.newContext({userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',locale:'en-US',viewport:{width:1366,height:768}}); await ctx.addInitScript(()=>{Object.defineProperty(navigator,'webdriver',{get:()=>undefined})}); const p = await ctx.newPage();
 for (const url of ['https://example.com', process.argv[2]]) {
   try{ const r=await p.goto(url,{timeout:40000}); console.log(url, r&&r.status(), await p.title()); }catch(e){console.log(url,'ERR',e.message.split('\n')[0]);}
 }
 for(let i=0;i<15;i++){ if(!/moment/i.test(await p.title())) break; await p.waitForTimeout(2000);} console.log('after',await p.title());
 require('fs').writeFileSync('/tmp/page.html', await p.content());
 await b.close();
})();
