// r15：batch-08 新 clip 目检——在 L01 把指定单位摆到镜头前，逐个 clip 播到 frac 处截图（虚拟时钟），拼成联系表
import { chromium } from 'playwright';
import { preview } from 'vite';
import fs from 'node:fs';
const ID = process.argv[2] || 'joker';
const CLIPS = (process.argv[3] || 'Idle,HideL,HideR,ReadyStart,ReadyLoop,Personal1,JumpStart,JumpTop,ResultFrontIn,ResultFrontInLoop,ResultBackRInLoop,ResultBackLInLoop').split(',');
const OUT = process.env.OUT || `/workspace/work/notes/r15/clips-${ID}`;
fs.mkdirSync(OUT, { recursive: true });
const port = 4400 + Math.floor(Math.random() * 50);
const server = await preview({ preview: { port, host: '127.0.0.1' } });
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 640, height: 640 } });
page.on('pageerror', (e) => console.log('ERR', String(e)));
await page.goto(`http://127.0.0.1:${port}/?speed=1&level=L01`);
await page.waitForFunction(() => window.__p5t && window.__p5t.started && window.__p5t.charsReady && !window.__p5t.busy, null, { timeout: 150000, polling: 500 });
await page.waitForTimeout(1500);
const has = await page.evaluate((id) => { const r = window.__p5t.rigs.get(id); return r && r.act ? [...r.act.keys()] : null; }, ID);
console.log('clips', has && has.join(' '));
for (const c of CLIPS) {
  for (const frac of [0.3, 0.75]) {
    const ok = await page.evaluate(([id, c, frac]) => {
      const P = window.__p5t, r = P.rigs.get(id); if (!r || !r.act.has(c)) return false;
      const a = r.act.get(c); r.mixer.stopAllAction(); a.reset(); a.enabled = true; a.setEffectiveWeight(1); a.play(); a.paused = true; a.time = a.getClip().duration * frac; r.mixer.update(0);
      r.update = () => {}; // 停住自动状态机
      P.portrait(id, 0.5, 2.0, 0.35); return true;
    }, [ID, c, frac]);
    if (!ok) { console.log('miss', c); break; }
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/${c}_${Math.round(frac * 100)}.png` });
  }
}
await browser.close(); await server.close();
