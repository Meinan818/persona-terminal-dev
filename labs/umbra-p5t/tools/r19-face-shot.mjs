// r19：面具特写。node tools/r19-face-shot.mjs [keys] → $OUT/<key>_<only>.png
import { chromium } from 'playwright';
import { createServer } from 'vite';
import fs from 'node:fs';
const OUT = process.env.OUT || '/tmp/r19/face'; fs.mkdirSync(OUT, { recursive: true });
const KEYS = (process.argv[2] || 'joker').split(',');
const ONLY = (process.env.ONLY ?? ',_F00,_M00,_E00,_H00').split(',');
const port = 4830 + Math.floor(Math.random() * 30);
const server = await createServer({ server: { port, host: '127.0.0.1', hmr: false, watch: { ignored: ['**/*'] } }, logLevel: 'error' }); await server.listen();
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 480, height: 480 } });
page.on('pageerror', (e) => console.log('ERR', String(e)));
await page.goto(`http://127.0.0.1:${port}/tools/r19-face.html`);
await page.waitForFunction(() => window.__faceReady, null, { timeout: 120000 });
for (const key of KEYS) {
  if (!(await page.evaluate((k) => window.__face.load(k), key))) { console.log('skip', key); continue; }
  for (const o of ONLY) for (const yaw of (process.env.YAWS || '0').split(',').map(Number)) {
    const r = await page.evaluate(([o, y]) => window.__face.shot(o === '' ? null : o, y, +(new URLSearchParams(location.search).get('d') || 0.9)), [o, yaw]);
    if (o === '' && yaw === 0) console.log(key, JSON.stringify(r));
    await page.screenshot({ path: `${OUT}/${key}_${o || 'all'}_${yaw}.png` });
  }
}
await browser.close(); await server.close();
