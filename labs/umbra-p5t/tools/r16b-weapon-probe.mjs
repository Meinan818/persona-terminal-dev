// r16b：检查持枪挂点（战斗 GunLoop）：node tools/r16b-weapon-probe.mjs → $OUT/wp_<id>_<ang>.png
import { chromium } from 'playwright';
import { createServer } from 'vite';
import fs from 'node:fs';
const OUT = process.env.OUT || '/tmp/r16b/wp'; fs.mkdirSync(OUT, { recursive: true });
const port = 4600 + Math.floor(Math.random() * 30);
const server = await createServer({ server: { port, host: '127.0.0.1' }, logLevel: 'error' }); await server.listen();
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
await page.goto(`http://127.0.0.1:${port}/?speed=1&level=L01`);
await page.waitForFunction(() => window.__p5t && window.__p5t.started && window.__p5t.charsReady && !window.__p5t.busy, null, { timeout: 170000, polling: 500 });
for (const id of ['skull', 'joker', 'mona']) {
  await page.evaluate((id) => { const P = window.__p5t, g = P.unitMesh.get(id), r = P.rigs.get(id); const t = g.position.clone(); t.z -= 5; r.faceTo(t); r.aim(t, 'gun', 60000); }, id);
  await page.waitForTimeout(6000);
  for (const ang of [Math.PI, Math.PI * 0.6]) {
    await page.evaluate(([id, ang]) => window.__p5t.portrait(id, ang, 1.6, 0.2), [id, ang]);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT}/wp_${id}_${ang.toFixed(1)}.png` });
  }
  await page.evaluate(() => window.__p5t.portrait(null));
}
await browser.close(); await server.close(); console.log('done');
