// r16c：各角色枪在 GunLoop 里的枪管方向与正前方的夹角 + 挂点空间校正欧拉角（tools/r16c-wp.html 的 __wp.aimFix）。node tools/r16c-aimfix.mjs
import { chromium } from 'playwright';
import { createServer } from 'vite';
const port = 4820 + Math.floor(Math.random() * 30);
const server = await createServer({ server: { port, host: '127.0.0.1', hmr: false, watch: { ignored: ['**/*'] } }, logLevel: 'error' }); await server.listen();
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
await page.goto(`http://127.0.0.1:${port}/tools/r16c-wp.html`); await page.waitForFunction(() => window.__wpReady, null, { timeout: 120000 });
const out = {};
for (const k of (process.argv[2] || 'joker,skull,mona,panther,fox,queen,erina').split(',')) {
  if (!(await page.evaluate((k) => window.__wp.load(k), k))) continue;
  out[k] = []; for (const t of [0.1, 0.4, 0.8]) out[k].push(await page.evaluate((t) => window.__wp.aimFix(t), t));
  console.log(k, JSON.stringify(out[k]));
}
await browser.close(); await server.close();
