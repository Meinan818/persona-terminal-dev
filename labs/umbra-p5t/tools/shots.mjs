// 截图 + 浏览器内通过 UI 点击完整打一关的冒烟测试
// PLAYWRIGHT_BROWSERS_PATH=/workspace/work/ms-playwright LD_LIBRARY_PATH=/workspace/work/pw-libs node tools/shots.mjs
import { chromium } from 'playwright';
import { preview } from 'vite';

const server = await preview({ preview: { port: 4317, host: '127.0.0.1' }, css: { postcss: {} } });
const url = 'http://127.0.0.1:4317/?speed=4';
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const out = new URL('../shots/', import.meta.url).pathname;
// 字体分片是 font-display: optional：先预热一次再正式加载，保证截图里中文用上思源黑体
async function open(page, u) {
  await page.goto(u);
  await page.evaluate(() => document.fonts.load('900 16px "Noto Sans SC Black"', '回合目标击败全部敌人近战枪技能待机结束移动再点一次确认伤害掩护中通关无人重来敌方范围'));
  await page.goto(u);
  await page.evaluate(() => document.fonts.ready);
}
const idle = (page) => page.waitForFunction(() => !window.__p5t.busy, null, { timeout: 15000 });

async function shot1() {
  const page = await browser.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  await open(page, url);
  await page.waitForFunction(() => window.__p5t && !window.__p5t.busy);
  await page.evaluate(() => { const p = window.__p5t; p.select('joker'); p.tap({ tile: { x: 1, y: 3 } }); p.tap({ unit: 'mandrake' }); });
  await page.waitForTimeout(300);
  await page.screenshot({ path: out + 'p5t-844x390.png' });
  await page.close();
}

async function shot2() {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await open(page, url.replace('speed=4', 'speed=0.6'));
  await page.waitForFunction(() => window.__p5t && !window.__p5t.busy);
  // Joker 移到 (1,4) 射击空地上的 Mandrake → DOWN → 1 MORE
  await page.evaluate(() => { const p = window.__p5t; p.select('joker'); p.tap({ unit: 'mandrake' }); p.tap({ unit: 'mandrake' }); });
  await page.waitForTimeout(700);
  await page.screenshot({ path: out + 'p5t-1280x720.png' });
  await idle(page);
  await page.close();
}

async function fullPlay() {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  await page.goto(url.replace('speed=4', 'speed=40'));
  await page.waitForFunction(() => window.__p5t && !window.__p5t.busy);
  for (let i = 0; i < 300; i++) {
    const phase = await page.evaluate(() => window.__p5t.battle.phase);
    if (phase === 'won' || phase === 'lost') break;
    // 页面内用贪心策略决定，再完全通过 UI 点击执行
    const step = await page.evaluate(() => {
      const p = window.__p5t, b = p.battle;
      if (b.pendingTriple) return { triple: true };
      const u = b.alive('ally').find((a) => !a.acted);
      if (!u) return { end: true };
      let best = null;
      const dests = [u.pos, ...b.moveTiles(u)];
      for (const d of dests) for (const e of b.alive('enemy')) {
        const opts = [['melee', b.canMelee(u, e, d), u.melee], ['gun', b.canShoot(u, e, d), u.gun.power]];
        for (const [kind, ok, pw] of opts) {
          if (!ok) continue;
          const pv = b.previewDamage(u, e, kind, undefined, d);
          const score = (pv.willDown ? 50 : 0) + pv.amount;
          if (!best || score > best.score) best = { u: u.id, dest: d, target: e.id, kind, score };
        }
      }
      if (!best) {
        const e = b.alive('enemy')[0];
        const tiles = b.moveTiles(u).sort((a, c) => Math.abs(a.x - e.pos.x) + Math.abs(a.y - e.pos.y) - Math.abs(c.x - e.pos.x) - Math.abs(c.y - e.pos.y));
        return { wait: u.id, dest: tiles[0] ?? null };
      }
      return best;
    });
    const act = async (fn, arg) => { await page.evaluate(fn, arg); await idle(page); };
    if (step.triple) await act(() => document.querySelector('[data-act=triple]').click());
    else if (step.end) await act(() => document.querySelector('[data-act=end]').click());
    else if (step.wait) {
      await act((s) => { const p = window.__p5t; p.select(s.wait); if (s.dest) { p.tap({ tile: s.dest }); p.tap({ tile: s.dest }); } }, step);
      await act((s) => { window.__p5t.select(s.wait); document.querySelector('[data-act=wait]').click(); }, step);
    } else {
      await act((s) => {
        const p = window.__p5t, b = p.battle, u = b.unit(s.u);
        p.select(s.u);
        if (s.dest.x !== u.pos.x || s.dest.y !== u.pos.y) { p.tap({ tile: s.dest }); p.tap({ tile: s.dest }); }
      }, step);
      await act((s) => { const p = window.__p5t; p.select(s.u); p.setMode(s.kind); p.tap({ unit: s.target }); p.tap({ unit: s.target }); }, step);
    }
  }
  const res = await page.evaluate(() => ({ phase: window.__p5t.battle.phase, turn: window.__p5t.battle.turn, crowns: window.__p5t.battle.crowns() }));
  console.log('FULLPLAY', JSON.stringify(res));
  await page.waitForTimeout(400);
  await page.screenshot({ path: out + 'p5t-result-1280x720.png' });
  await page.close();
}

try { await shot1(); await shot2(); await fullPlay(); } finally { await browser.close(); server.httpServer.close(); }
console.log('shots ->', out);
