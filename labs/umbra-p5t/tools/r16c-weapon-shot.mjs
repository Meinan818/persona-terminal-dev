// r16c：武器手部特写（已接入的 7 名队员 × 待机/射击/技能/结算/近战 × 枪/近战）。探针页 tools/r16c-wp.html 只渲染角色 + 武器（无地图/HUD）。
//   每个状态直接播原版 clip（Idle / GunLoop / SkillActLoop / ResultFrontInLoop / Attack）到 0.4s 处，强制显示该武器（不管游戏里该状态显不显示），机位对准持武器手。
//   node tools/r16c-weapon-shot.mjs [keys逗号] → $OUT/<key>_<state>_<gun|melee>.png + metrics.json
import { chromium } from 'playwright';
import { createServer } from 'vite';
import fs from 'node:fs';
const OUT = process.env.OUT || '/tmp/r16c/wpn'; fs.mkdirSync(OUT, { recursive: true });
const KEYS = (process.argv[2] || 'joker,skull,mona,panther,fox,queen,erina').split(',');
const STATES = { idle: 'Idle', shoot: 'GunLoop', skill: 'SkillActLoop', result: 'ResultFrontInLoop', attack: 'Attack' };
const T = { idle: 0.4, shoot: 0.4, skill: 0.4, result: 0.4, attack: 0.35 };
const port = 4790 + Math.floor(Math.random() * 30);
const server = await createServer({ server: { port, host: '127.0.0.1', hmr: false, watch: { ignored: ['**/*'] } }, logLevel: 'error' }); await server.listen();
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
page.on('pageerror', (e) => console.log('ERR', String(e)));
await page.goto(`http://127.0.0.1:${port}/tools/r16c-wp.html`);
await page.waitForFunction(() => window.__wpReady, null, { timeout: 120000 });
const metrics = {};
for (const key of KEYS) {
  if (!(await page.evaluate((k) => window.__wp.load(k), key))) { console.log('skip', key); metrics[key] = null; continue; }
  metrics[key] = {};
  for (const [st, clip] of Object.entries(STATES)) for (const kind of ['gun', 'melee']) {
    const m = await page.evaluate(([c, k, t]) => window.__wp.pose(c, k, t), [clip, kind, T[st]]);
    metrics[key][`${st}_${kind}`] = m;
    if (m.missing || m.noWeapon) { console.log(key, st, kind, JSON.stringify(m)); continue; }
    await page.screenshot({ path: `${OUT}/${key}_${st}_${kind}.png` });
    console.log(key, st, kind, JSON.stringify(m));
  }
}
fs.writeFileSync(`${OUT}/metrics.json`, JSON.stringify(metrics, null, 1));
await browser.close(); await server.close(); console.log('done');
