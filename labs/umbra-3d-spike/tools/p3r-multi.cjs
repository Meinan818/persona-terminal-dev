// usage: node p3r-multi.cjs outPrefix WxH tier "t1 t2 ..." [extraQuery]  → <outPrefix>-<t>.png（一次加载页面，多帧截图）
const { chromium } = require('/workspace/work/umbra-next/m3/node_modules/playwright-core');
(async () => {
  const [pre, wh, tier, ts, extra] = process.argv.slice(2); const [w, h] = wh.split('x').map(Number);
  const b = await chromium.launch({ args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: w < 1000 ? 2 : 1 });
  p.on('pageerror', (e) => console.log('[err]', e.message)); p.on('console', (m) => { if (/error|warn/i.test(m.type())) console.log('[c]', m.text().slice(0, 200)); });
  await p.goto(`http://127.0.0.1:5179/p3r-summon.html?t=0&tier=${tier}${extra || ''}`, { timeout: 110000 });
  await p.waitForFunction(() => document.title === 'ready', null, { timeout: 110000 });
  for (const t of ts.split(/\s+/).filter(Boolean)) { await p.evaluate((t) => window.__render(+t), t); await p.screenshot({ path: `${pre}-${t}.png` }); }
  console.log(JSON.stringify(await p.evaluate(() => window.__info)));
  await b.close();
})().catch((e) => { console.error(e.message); process.exit(1); });
