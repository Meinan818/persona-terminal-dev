import { chromium } from 'playwright';
import { preview } from 'vite';
const OUT = '/workspace/work/notes/shots/2026-10-24';
const server = await preview({ preview: { port: 4321, host: '127.0.0.1' } });
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 });
const errs = []; page.on('pageerror', (e) => errs.push(String(e)));
await page.goto('http://127.0.0.1:4321/?speed=1');
await page.waitForFunction(() => window.__p5t && !window.__p5t.busy);
await page.evaluate(() => document.fonts.ready);
const cases = [
  ['gun-halfcover', 'gun', 'joker', 'gun', null, 'e1'],
  ['skill-weak-1more', 'skill', 'panther', 'skill', 'agi', 'e1'],
  ['push', 'push', 'joker', 'melee', null, 'e1'],
  ['lethal', 'lethal', 'skull', 'gun', null, 'e1'],
];
for (const [name, demo, who, mode, sk, tgt] of cases) {
  await page.evaluate((demo) => window.__p5t.forecastDemo(demo), demo);
  await page.waitForTimeout(300);
  await page.waitForFunction(() => !window.__p5t.busy && window.__p5t.battle.phase === 'player', null, { timeout: 15000 });
  await page.evaluate(([demo, who, mode, sk, tgt]) => {
    const p = window.__p5t; p.select(who);
    if (sk) p.setSkill(sk); else p.setMode(mode);
    p.tap({ unit: tgt });
  }, [demo, who, mode, sk, tgt]);
  await page.waitForTimeout(900);
  const info = await page.evaluate(() => { const f = document.querySelector('#forecast'); const r = f.getBoundingClientRect(); return { hidden: f.classList.contains('hidden'), r: [r.left, r.top, r.right, r.bottom].map(Math.round), text: f.innerText.replace(/\s+/g, ' ') }; });
  console.log(name, JSON.stringify(info));
  await page.screenshot({ path: `${OUT}/forecast-${name}.png` });
}
console.log('errors', errs);
await browser.close(); server.httpServer.close();
