// r14：技能释放过程连拍（虚拟时钟，逐帧推进；召唤切入 / Persona / 原版命中特效）。
// node tools/r14-skill-shot.mjs OUTDIR UNIT [TARGET] ；SHOTS="40,55,70"（释放后第 N 帧，30fps）
import { chromium } from 'playwright';
import { preview } from 'vite';
import fs from 'node:fs';
const OUT = process.argv[2] || '/tmp/r14k'; const UNIT = process.argv[3] || 'joker'; const TGT = process.argv[4] || '';
const SHOTS = (process.env.SHOTS || '20,35,50,65,80').split(',').map(Number);
fs.mkdirSync(OUT, { recursive: true });
const port = 4430 + Math.floor(Math.random() * 30);
const server = await preview({ preview: { port, host: '127.0.0.1' } });
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errs = []; page.on('pageerror', (e) => errs.push(String(e))); page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('GL Driver')) errs.push(m.text()); });
await page.addInitScript({ path: new URL('./rec-r14/vclock.js', import.meta.url).pathname });
await page.addInitScript(() => { window.__ff = true; });
await page.goto(`http://127.0.0.1:${port}/?speed=1&level=L01`);
await page.waitForFunction(() => window.__p5t && window.__p5t.started && window.__p5t.charsReady && !window.__p5t.busy, null, { timeout: 110000, polling: 300 });
console.log('loaded'); await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(500);
const P = (c) => page.evaluate(`(()=>{const P=window.__p5t;${c}})()`);
if (process.env.SETUP) await page.evaluate(`(async()=>{const P=window.__p5t;${process.env.SETUP}})()`);
await page.evaluate(() => window.__vc.setAuto(false)); await page.evaluate(() => { window.__ff = false; });
const step = async (n) => { for (let i = 0; i < n; i++) await page.evaluate(() => window.__vc.step(1000 / 30)); };
await P(`P.select('${UNIT}')`); await step(30);
await P("document.querySelector('#cmd .persona')?.click()"); await step(30);
await P("P.skillPick()"); await step(20);
const tid = TGT || await P("const B=P.battle;const e=B.units.filter(u=>u.side==='enemy'&&!u.ko);return e[0]&&e[0].id");
console.log('tap', tid); await P(`P.tap({unit:'${tid}'})`); await step(15);
if (process.env.TAP2) { await P(`P.tap({unit:'${tid}'})`); }
let f = 0;
for (const s of SHOTS) { await step(s - f); f = s; await page.screenshot({ path: `${OUT}/k${String(s).padStart(3, '0')}.png` }); console.log('shot', s); }
console.log('errors', JSON.stringify(errs.slice(0, 5)));
await browser.close(); await server.close();
