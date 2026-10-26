// r16b：结算站位「同一时间点」拟合：虚拟时钟走到原版对应时刻后冻结（step(0) 只重摆不推进动作），按头部框迭代 x/d/y，输出 $OUT/fit-<scen>.json + 截图。
//   第 1 页 = ResultIn 开始后 3.53s（实机 16:06.47 开始 → 16:10.0）；翻页 = 开始后 5.83s（16:12.3）；第 2 页 = 翻页后 1.95s（16:14.25 / 26:06.0）。
//   node tools/r16b-fit.mjs [A|B] [yawsP2(逗号)]   A = L01 默认（Skull 最后一击、三人）；B = ?rsfront=joker&rsparty=joker,mona（复现 26:02 那场）
import { chromium } from 'playwright';
import { createServer } from 'vite';
import fs from 'node:fs';
const SC = process.argv[2] || 'A', YAWS = (process.argv[3] || '').split(',').filter(Boolean).map(Number);
const OUT = process.env.OUT || '/workspace/work/notes/r16b/fit'; fs.mkdirSync(OUT, { recursive: true });
const REF = { p1: { hero1: [365, 165, 160], other: [685, 230, 170], hero2: [1010, 122, 150] }, p2: SC === 'B' ? { hero1: [842, 152, 285], other: [255, 365, 210] } : { hero1: [920, 167, 260], other: [255, 365, 210] } };
if (SC === 'B') delete REF.p1.hero2;
const port = 4700 + Math.floor(Math.random() * 30);
const server = await createServer({ server: { port, host: '127.0.0.1', hmr: false, watch: { ignored: ['**/*'] } }, logLevel: 'error' }); await server.listen();
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('ERR', String(e)));
await page.addInitScript({ path: new URL('./rec-r16b/vclock.js', import.meta.url).pathname });
await page.addInitScript(() => { window.__ff = true; }); // 加载期间不画 WebGL（同 rec-r16b）
await page.goto(`http://127.0.0.1:${port}/?speed=1&level=L01${SC === 'B' ? '&rsfront=joker&rsparty=joker,mona' : ''}`);
await page.waitForFunction(() => window.__p5t && window.__p5t.started && window.__p5t.charsReady && !window.__p5t.busy, null, { timeout: 400000, polling: 500 });
await page.waitForFunction(() => window.__p5t.sceneKit.ready, null, { timeout: 60000, polling: 300 }).catch(() => console.log('WARN sceneKit'));
await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(1000);
await page.evaluate(() => window.__vc.setAuto(false));
await page.evaluate(() => { window.__ff = false; });
console.log('loaded');
const step = async (ms) => { for (let t = 0; t < ms; t += 1000 / 30) await page.evaluate((d) => window.__vc.step(d), Math.min(1000 / 30, ms - t)); };
const freeze = () => page.evaluate(() => window.__vc.step(0));
const head = () => page.evaluate(() => window.__rsHead());
async function fit(pg, ref) {
  let log = [];
  for (let it = 0; it < 14; it++) {
    await freeze(); await freeze();
    const h = await head(); const T = await page.evaluate((pg) => window.__rsT[pg], pg);
    const fov = await page.evaluate(() => window.__rsCam.fov);
    const err = {};
    for (const [role, r] of Object.entries(ref)) {
      const c = h[role]; if (!c) continue; const t = T[role];
      err[role] = { dx: ((c[0] - r[0]) / 1280 * 100).toFixed(1) + '%', dy: ((c[1] - r[1]) / 720 * 100).toFixed(1) + '%', dw: ((c[2] - r[2]) / 1280 * 100).toFixed(1) + '%', cur: c };
      const d = Math.min(8, Math.max(0.35, t.d * c[2] / r[2]));
      t.x += (r[0] - c[0]) / 1280 * 0.9;
      t.y = (t.y ?? 0) + (c[1] - r[1]) * (2 * Math.tan(fov * Math.PI / 360) * t.d) / 720 * 0.9;
      t.d = d;
    }
    await page.evaluate(([pg, T]) => { Object.assign(window.__rsT[pg], T); }, [pg, T]);
    log.push(err);
  }
  await freeze(); await freeze();
  const h = await head();
  return { T: await page.evaluate((pg) => JSON.parse(JSON.stringify(window.__rsT[pg])), pg), head: h, last: log[log.length - 1] };
}
const res = { scen: SC, ref: REF };
await page.evaluate(() => window.__p5t.showResult(true));
const PRE = 1320; // r16b：showResult 先放 0.12s 擦入 + 1.2s 纯红，之后才是 ResultIn
await step(PRE + 3530);
res.p1 = await fit(1, REF.p1);
await page.screenshot({ path: `${OUT}/${SC}_p1.png` });
await step(5830 - 3530);
await page.evaluate(() => window.__p5t.resultNext());
await step(1950);
if (YAWS.length) {
  for (const y of YAWS) { await page.evaluate((y) => { window.__rsT[2].hero1.yaw = y; }, y); await freeze(); await freeze(); await page.screenshot({ path: `${OUT}/${SC}_p2_yaw${y}.png` }); }
}
if (process.env.P2YAW) await page.evaluate((y) => { window.__rsT[2].hero1.yaw = y; }, +process.env.P2YAW);
res.p2 = await fit(2, REF.p2);
await page.screenshot({ path: `${OUT}/${SC}_p2.png` });
fs.writeFileSync(`${OUT}/fit-${SC}.json`, JSON.stringify(res, null, 1));
console.log(JSON.stringify(res));
await browser.close(); await server.close();
