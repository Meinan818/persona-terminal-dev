// P5T 正版 HUD 截图：默认画面 1280×720 / 844×390、1 MORE 横幅、总攻（Triple Threat）、DOWN/BLOCK 字母、敌方回合横幅。
// 用法：bash tools/fetch-p5t-hud.sh && npx vite build && node tools/hud-shot.mjs [p5hud=0 对比 CSS 版]
import { chromium } from 'playwright';
import { preview } from 'vite';
const OUT = process.env.OUT || '/workspace/work/notes/shots/2026-10-26';
const PFX = process.env.PFX || 'hud';
const Q = process.argv[2] ? `&${process.argv[2]}` : '';
const server = await preview({ preview: { port: 4341, host: '127.0.0.1' } });
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errs = [];
const ONLY = (process.env.ONLY || 'default,fx').split(',');
const SIZES = (process.env.SIZES || '1280x720,844x390').split(',').map((s) => s.split('x').map(Number));
async function open(w, h, level = 'L01') {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(`http://127.0.0.1:4341/?speed=1&level=${level}${Q}`);
  await page.waitForFunction(() => window.__p5t && !window.__p5t.busy && window.__p5t.sceneKit.ready, null, { timeout: 90000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1800);
  return page;
}
const shot = async (page, name) => { await page.screenshot({ path: `${OUT}/${PFX}-${name}.png` }); console.log('shot', name); };
/** 冻结演出并把 sel 下所有 CSS 动画拨到 t 毫秒（含 delay） */
const freezeAt = (page, sel, t) => page.evaluate(([sel, t]) => {
  document.body.classList.add('frozen');
  for (const a of document.getAnimations()) { const el = a.effect?.target; if (el && el.closest && el.closest(sel)) { a.pause(); a.currentTime = t; } }
}, [sel, t]);
/** 页面内监听：sel 一出现立刻冻结（避免慢机上错过时间点） */
const armFreeze = (page, sel) => page.evaluate((sel) => { const mo = new MutationObserver(() => { if (document.querySelector(sel)) { document.body.classList.add('frozen'); mo.disconnect(); } }); mo.observe(document.body, { childList: true, subtree: true }); }, sel);
const thaw = (page) => page.evaluate(() => { document.body.classList.remove('frozen'); for (const a of document.getAnimations()) if (a.playState === 'paused') a.play(); });

// 1) 默认画面
if (ONLY.includes('default')) for (const [w, h] of SIZES) {
  const page = await open(w, h);
  console.log(w, h, 'p5hud on =', await page.evaluate(() => document.body.classList.contains('p5hud')));
  await shot(page, `default-${w}x${h}`);
  // DOWN / BLOCK 字母（拨到 0.5s：四个字母都已落定）
  await page.evaluate(() => { const P = window.__p5t; P.fx.pop('joker', 'DOWN!'); P.fx.pop('mona', '盾挡!'); });
  await page.waitForTimeout(30);
  await freezeAt(page, '.p5pop', 560);
  await shot(page, `down-block-${w}x${h}`);
  await thaw(page);
  await page.close();
}

// 2) 1 MORE + 总攻：demo 局（Joker 枪击打倒 e1 → 1 MORE；之后发动 Triple Threat）
if (ONLY.includes('fx')) for (const [w, h] of SIZES) {
  const page = await open(w, h);
  await page.evaluate(() => window.__p5t.demo('triple'));
  await page.waitForFunction(() => !window.__p5t.busy);
  await page.waitForTimeout(1500);
  await armFreeze(page, '.fx-cut.om');
  await page.evaluate(() => { const p = window.__p5t; p.select('joker'); p.setMode('gun'); p.tap({ unit: 'e1' }); p.tap({ unit: 'e1' }); });
  await page.waitForSelector('.fx-cut.om', { timeout: 20000 });
  await freezeAt(page, '.fx-cut.om', 500);
  await shot(page, `1more-${w}x${h}`);
  await thaw(page);
  await page.waitForFunction(() => !window.__p5t.busy, null, { timeout: 30000 });
  await page.waitForTimeout(600);
  await shot(page, `after-1more-${w}x${h}`);
  const pend = await page.evaluate(() => !!window.__p5t.battle.pendingTriple);
  console.log('pendingTriple', pend);
  if (pend) {
    await armFreeze(page, '.fx-cut.tt .ttb');
    await page.evaluate(() => document.querySelector('[data-act=triple]').click());
    await page.waitForSelector('.fx-cut.tt .ttb', { timeout: 20000 });
    await freezeAt(page, '.fx-cut.tt', 170);
    await shot(page, `allout-go-${w}x${h}`);
    await armFreeze(page, '.fx-cut.tt .allout');
    await thaw(page);
    await page.waitForSelector('.fx-cut.tt .allout', { timeout: 20000 }).catch(() => console.log('no allout layer'));
    await freezeAt(page, '.fx-cut.tt .allout', 300);
    await shot(page, `allout-hit-${w}x${h}`);
    await thaw(page);
    await page.waitForFunction(() => !window.__p5t.busy, null, { timeout: 30000 });
  }
  if (w === 1280) {
    // 敌方回合横幅
    await page.evaluate(() => { void window.__p5t.enemyTurnBanner(4000); });
    await page.waitForTimeout(500);
    await shot(page, `enemy-turn-${w}x${h}`);
  }
  await page.close();
}
console.log('errors', errs.length ? errs : 'none');
await browser.close(); server.httpServer.close();
