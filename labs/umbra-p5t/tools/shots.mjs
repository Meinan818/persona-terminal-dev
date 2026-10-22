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

const waitEvent = (page, pred, timeout = 15000) => page.waitForFunction(pred, null, { timeout, polling: 30 });
const TUT = 2; // MAPS 里「教学·推落追击」的序号（下拉框第 2 项）

// 844×390：教学图 Joker 在高台上近战，把掩体里的 Pixie 推下去 → 下方龙司 FOLLOW UP
async function shot1() {
  const page = await browser.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  await open(page, url.replace('speed=4', 'speed=0.5').replace('?', `?map=tut-followup&`));
  await page.waitForFunction(() => window.__p5t && !window.__p5t.busy);
  await page.evaluate(() => { const p = window.__p5t; p.hook.pauseOn = 'followUp'; p.hook.pauseDelay = 220; p.select('joker'); p.setMode('melee'); p.tap({ unit: 'pixie2' }); p.tap({ unit: 'pixie2' }); });
  await waitEvent(page, () => window.__p5t.hook.paused);
  await page.screenshot({ path: out + 'p5t-844x390.png' });
  await page.evaluate(() => window.__p5t.hook.resume());
  await idle(page);
  await page.close();
}

// 1280×720：同一关先推落追击，再让杏打爆油桶（2 格内敌人被吹飞、失去 Resistance）
async function shot2() {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await open(page, url.replace('speed=4', 'speed=0.6').replace('?', `?map=tut-followup&`));
  await page.waitForFunction(() => window.__p5t && !window.__p5t.busy);
  await page.evaluate(() => { const p = window.__p5t; p.select('joker'); p.setMode('melee'); p.tap({ unit: 'pixie2' }); p.tap({ unit: 'pixie2' }); });
  await idle(page);
  await page.evaluate(() => { const p = window.__p5t; p.hook.pauseOn = 'explode'; p.hook.pauseDelay = 160; p.select('panther'); p.setMode('gun'); p.tap({ unit: 'barrel2' }); p.tap({ unit: 'barrel2' }); });
  await waitEvent(page, () => window.__p5t.hook.paused);
  await page.screenshot({ path: out + 'p5t-1280x720.png' });
  await page.evaluate(() => window.__p5t.hook.resume());
  await idle(page);
  await page.close();
}

// 特殊敌人图总览（盾兵/投掷者在高台/传送者/支援者/喇叭/木箱），点开敌方范围
async function shot3() {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await open(page, url.replace('?', `?map=test-02&`));
  await page.waitForFunction(() => window.__p5t && !window.__p5t.busy);
  await page.evaluate(() => { document.querySelector('#btn-threat').click(); window.__p5t.select('skull'); });
  await page.waitForTimeout(300);
  await page.screenshot({ path: out + 'p5t-specials-1280x720.png' });
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
      const ko = b.units.find((x) => x.side === 'ally' && x.ko && !x.escort);
      if (ko && b.reserves.length && b.batonLeft > 0) return { baton: true };
      const u = b.alive('ally').find((a) => !a.acted);
      if (!u) return { end: true };
      let best = null;
      const dests = [u.pos, ...b.moveTiles(u)];
      for (const d of dests) for (const e of b.alive('enemy')) {
        const opts = [['melee', b.canMelee(u, e, d), u.melee], ['gun', b.canShoot(u, e, d), u.gun ? u.gun.power : 0]];
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
    else if (step.baton) await act(() => document.querySelector('#baton button').click());
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

// 1c：机关图——龙司穿过开着的门 B 走进摄像头监视范围 → ALERT + 援军（门/开关/升降台/摄像头同屏）
async function shot4() {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  await open(page, url.replace('speed=4', 'speed=1').replace('?', `?map=mech&`));
  await page.waitForFunction(() => window.__p5t && !window.__p5t.busy);
  await page.evaluate(() => { const p = window.__p5t; p.hook.pauseOn = 'reinforce'; p.hook.pauseDelay = 380; p.select('skull'); p.tap({ tile: { x: 6, y: 5 } }); p.tap({ tile: { x: 6, y: 5 } }); });
  await waitEvent(page, () => window.__p5t.hook.paused);
  await page.screenshot({ path: out + 'p5t-1c-1280x720.png' });
  await page.evaluate(() => window.__p5t.hook.resume());
  await idle(page);
  const st = await page.evaluate(() => ({ enemies: window.__p5t.battle.alive('enemy').length, cams: [...window.__p5t.battle.rt.cameras] }));
  console.log('MECH', JSON.stringify(st));
  await page.close();
}

// 1c：靶场 C（844×390）——艾丽娜 Flag of Freedom 插旗（橙色范围）+ 祐介 Like a Phantom 两个诱饵，选中明智看第二 Charge / 被动
async function shot5() {
  const page = await browser.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  await open(page, url.replace('?', `?map=range-c&`));
  await page.waitForFunction(() => window.__p5t && !window.__p5t.busy);
  const tapUnique = async (id, tile) => {
    await page.evaluate(([id, tile]) => { const p = window.__p5t; p.battle.voltage = 100; p.select(id); p.setMode('unique'); p.tap({ tile }); p.tap({ tile }); }, [id, tile]);
    await idle(page);
  };
  await tapUnique('erina', { x: 5, y: 3 });
  await tapUnique('fox', { x: 2, y: 4 });
  await page.waitForTimeout(1900); // 等确认提示的 toast 消失
  await page.evaluate(() => { const p = window.__p5t; p.select('crow'); });
  await page.waitForTimeout(300);
  await page.screenshot({ path: out + (ONLY === 'ui' ? 'p5t-ui2-844x390.png' : 'p5t-1c-844x390.png') });
  const st = await page.evaluate(() => ({ decoys: window.__p5t.battle.units.filter((u) => u.decoy).length, flags: window.__p5t.battle.units.filter((u) => u.prop === 'flag').length }));
  console.log('RANGEC', JSON.stringify(st));
  await page.close();
}

const ONLY = process.env.SHOTS;
try {
  if (ONLY === 'ui') { await shot5(); }
  else if (ONLY === '1c') { await shot4(); await shot5(); await fullPlay(); }
  else { await shot1(); await shot2(); await shot3(); await shot4(); await shot5(); await fullPlay(); }
} finally { await browser.close(); server.httpServer.close(); }
console.log('shots ->', out);
