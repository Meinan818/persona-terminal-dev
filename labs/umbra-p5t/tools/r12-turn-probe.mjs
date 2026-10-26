// r12：回合横幅 DOM 实测（YOUR TURN 字样被裁排查）：node tools/r12-turn-probe.mjs [t秒] [out.png]
import { chromium } from 'playwright';
import { createServer } from 'vite';
const T = +(process.argv[2] ?? 1.0), OUT = process.argv[3] || '/tmp/turn-probe.png';
const server = await createServer({ server: { port: 4399, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto('http://127.0.0.1:4399/__probe').catch(() => {});
await page.setContent('<html><body style="margin:0;background:#888"><div id="app" style="position:relative;width:1280px;height:720px;overflow:hidden"></div></body></html>');
await page.addStyleTag({ content: (await import('node:fs')).readFileSync('src/p5t-hud.css', 'utf8') });
const r = await page.evaluate(async (T) => {
  const m = await import('http://127.0.0.1:4399/src/fx/turnChange.ts');
  await m.turnChangeReady();
  const base = performance.now(); let off = 0;
  performance.now = () => base + off; // 冻结在 t=T
  m.playTurnChange('ally', 1, document.getElementById('app'));
  off = T * 1000; await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const out = {};
  for (const n of ['turn_text_image', 'bar_3_image_0', 'bar_3_mask', 'Image', 'character_image', 'bar_0_image', 'bar_2_image']) {
    const e = document.querySelector(`.tcn[data-n="${n}"]`); if (!e) continue; const b = e.getBoundingClientRect();
    out[n] = [b.left, b.top, b.right, b.bottom].map(Math.round).join(',') + ' clip=' + getComputedStyle(e).clipPath;
  }
  return out;
}, T);
console.log(JSON.stringify(r, null, 1));
await page.waitForTimeout(2000);
await page.screenshot({ path: OUT });
await browser.close(); await server.close();
