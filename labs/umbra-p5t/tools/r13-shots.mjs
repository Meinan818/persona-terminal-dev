// r13：待机 / 指令菜单 / 选技能目标 三张截图（真实时间）。node tools/r13-shots.mjs OUTDIR [query]
import { chromium } from 'playwright';
import { preview } from 'vite';
import fs from 'node:fs';
const OUT = process.argv[2] || '/tmp/r13s'; const Q = process.argv[3] || '';
fs.mkdirSync(OUT, { recursive: true });
const port = 4420 + Math.floor(Math.random() * 30);
const server = await preview({ preview: { port, host: '127.0.0.1' } });
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errs = []; page.on('pageerror', (e) => errs.push(String(e)));
await page.goto(`http://127.0.0.1:${port}/?speed=1&level=L01${Q}`);
await page.waitForFunction(() => window.__p5t && window.__p5t.started && window.__p5t.charsReady && !window.__p5t.busy, null, { timeout: 120000, polling: 300 });
await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(2500);
const P = (c) => page.evaluate(`(()=>{const P=window.__p5t;${c}})()`);
const shot = async (n) => { await page.screenshot({ path: `${OUT}/${n}.png` }); console.log('shot', n); };
const only = (process.env.ONLY || 'idle,command,target').split(',');
if (only.includes('idle')) await shot('idle');
await P(process.env.SETUP || "const B=P.battle;const j=B.unit('joker');const e=B.units.find(u=>u.side==='enemy'&&!u.ko);console.log(JSON.stringify({j:j.pos,e:e.pos}))");
await P("P.select('joker')"); await page.waitForTimeout(2500);
if (only.includes('command')) await shot('command');
if (only.includes('target')) {
  await P("document.querySelector('#cmd .persona')?.click()"); await page.waitForTimeout(2500);
  await shot('skilllist');
  await P("P.skillPick()"); await page.waitForTimeout(800);
  const tid = await P("const B=P.battle;const e=B.units.filter(u=>u.side==='enemy'&&!u.ko);return e[0]&&e[0].id");
  await P(`P.tap({unit:'${tid}'})`); await page.waitForTimeout(2500);
  await shot('target');
}
console.log('errors', JSON.stringify(errs.slice(0, 5)));
await browser.close(); await server.close();
