// 第四阶段新增/改动演出的墙钟：SHOWTIME（highlight 3.5s/1.2s）、敌方行动（1.5s/0.5s）、开战（0.9s/0.35s），1×完整 / 1×极简 / 2× / 3×
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const b = await chromium.launch({ executablePath: '/workspace/work/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux-arm64/chrome-headless-shell', args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
const p = await (await b.newContext({ viewport: { width: 844, height: 390 } })).newPage();
const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
await p.goto('http://127.0.0.1:8766/?res=0.25&auto=0', { waitUntil: 'load' });
const until = (fn, a, t = 90000) => p.waitForFunction(fn, a, { timeout: t, polling: 50 });
await until(() => window.__umbra && window.__umbra.mode === 'command' && !window.__umbra.busy);
const out = [];
for (const [speed, min] of [[1, false], [1, true], [2, true], [3, true]]) {
  await p.evaluate(([s, m]) => { const U = window.__umbra; U.dir.speed = s; U.dir.forceMinimal = m; U.dir.log.length = 0; }, [speed, min]);
  await p.evaluate(() => window.__umbra.showtime('joker', 'skull')); await until(() => !window.__umbra.busy);
  await p.evaluate(() => { const U = window.__umbra; U.B.showtimeUsed.clear(); for (const id of U.B.enemies) { const u = U.B.u(id); u.hp = u.hpMax; U.eng.units.get(id).root.visible = true; } U.B.won = false; });
  await p.evaluate(() => { window.__umbra.hud.setMode('hidden'); return window.__umbra.dir.play('battle:start', { enemyIds: window.__umbra.B.enemies, leadId: 'joker' }, {}); });
  await p.evaluate(() => window.__umbra.dir.play('action', { actorId: window.__umbra.B.enemies[0], skillId: 'enemy.lunge', targetIds: ['joker'], hits: [{ targetId: 'joker', dmg: 10, weak: false, crit: false, miss: false, resist: 'none', element: 'phys', down: false }], side: 'enemy', actorName: 'X' }, { side: 'enemy', skillId: 'enemy.lunge' }));
  const log = await p.evaluate(() => window.__umbra.timing().map((r) => ({ recipe: r.recipe, dur: r.duration, wall: Math.round(r.wallMs), cap: Math.round(r.capMs), forced: r.forced, level: r.level, speed: r.speed })));
  out.push({ speed, minimal: min, log });
  console.log(speed, min, JSON.stringify(log.map((r) => `${r.recipe} ${r.wall}/${r.cap}${r.forced ? ' FORCED' : ''}`)));
}
const iss = await p.evaluate(() => window.__M.issues.filter((i) => i.level === 'error'));
fs.writeFileSync('tools/out/p4timing.json', JSON.stringify({ out, errs, issues: iss, eng: await p.evaluate(() => window.__umbra.eng.errors) }, null, 1));
console.log('errs', errs.length, 'issues', JSON.stringify(iss));
await b.close();
