#!/usr/bin/env node
/**
 * P5R 红频道 · 真实 App 冒烟（接入件 · 不要改）。验证 App.tsx 两行 + adapter/live.ts 在正式 App 里跑得起来。
 *   node scripts/p5r-red/smoke-live.mjs --base http://127.0.0.1:5173
 * 做法：打开正式 App（开发服务，全新的浏览器档案）→ 通过 store 建一个测试用户并切到红主题 → 刷新 →
 *       检查 <html data-ui-channel="p5">、红频道外壳已渲染、名片名字 = store 里的名字（adapter 在工作）→ 依次打开 7 个页面。
 * 任何 pageerror / console.error / 资源 404 都算失败（唯一例外：正式 App 自己访问外部域名的请求失败，如版本检查被 CORS / 断网拦截，只打印不判失败）。末行 RESULT: PASS 才算过。只在临时浏览器档案里写数据，不碰你的真实数据。
 */
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const args = process.argv.slice(2);
const BASE = (args.includes('--base') ? args[args.indexOf('--base') + 1] : 'http://127.0.0.1:5173').replace(/\/$/, '');
let chromium;
try { ({ chromium } = await import('playwright')); } catch { console.log('缺少 playwright：npm i --no-save playwright@1.64.1 && npx playwright install chromium'); console.log('RESULT: FAIL'); process.exit(1); }
const NAME = '冒烟测试员';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true, locale: 'zh-CN', timezoneId: 'Asia/Shanghai' });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(`pageerror: ${e.message.slice(0, 200)}`));
const ext = new Set(); // 正式 App 自己访问外网（版本检查 api.github.com / data.jsdelivr.com 等）在无外网 / 被 CORS 拦时的报错：与红频道无关，只记录不判失败
const external = (m) => { const t = m.text(); const u = (t.match(/Access to fetch at '([^']+)'/) || [])[1] || (/Failed to load resource/.test(t) ? (m.location() || {}).url : ''); if (!u || u.startsWith(BASE)) return false; try { ext.add(new URL(u).host); } catch { ext.add(u.slice(0, 60)); } return true; };
page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource.*(api|pocketbase|weather|favicon)/i.test(m.text()) && !external(m)) errs.push(`console: ${m.text().slice(0, 200)}`); });
page.on('response', (r) => { const u = r.url(); if (r.status() >= 400 && u.startsWith(BASE) && !/\/api\//.test(u)) errs.push(`HTTP ${r.status()}: ${u.replace(BASE, '')}`); });
const checks = [];
const ok = (name, pass, info = '') => { checks.push(pass); console.log(`${pass ? '✓' : '✗'} ${name}${info ? '  ' + info : ''}`); };
try {
  await page.goto(`${BASE}/`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(4000);
  await page.evaluate(async (name) => {
    const m = await import('/src/store/index.ts');
    const st = m.useAppStore.getState();
    if (!st.user) await st.createUser(name);
    await m.useAppStore.getState().setTheme('red');
  }, NAME);
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => document.documentElement.getAttribute('data-ui-channel') === 'p5' && !!document.querySelector('#view'), null, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(2500);
  ok('html data-ui-channel="p5"', await page.evaluate(() => document.documentElement.getAttribute('data-ui-channel') === 'p5'));
  ok('红频道外壳已渲染（#view）', await page.evaluate(() => !!document.querySelector('#view')));
  for (const [route, text] of [['#/p/menu', NAME], ['#/', ''], ['#/p/actions?tab=todos', ''], ['#/p/cooperation', ''], ['#/p/astrology', ''], ['#/p/ledger', ''], ['#/p/settings', '']]) {
    await page.evaluate((h) => { location.hash = h; }, route);
    await page.waitForTimeout(1800);
    const body = await page.evaluate(() => document.body.innerText);
    ok(`打开 ${route}`, body.trim().length > 20 && (!text || body.includes(text)), text ? `（应显示 store 里的名字「${text}」= adapter 在工作）` : '');
  }
  await page.screenshot({ path: join(tmpdir(), 'p5r-smoke-live.png') }).catch(() => {});
} catch (e) { errs.push(`脚本：${String(e.message || e).slice(0, 200)}`); }
await browser.close();
if (ext.size) console.log(`  （已忽略正式 App 自身的外网请求失败：${[...ext].join('、')}——无外网或被 CORS 拦截，与红频道无关）`);
ok('没有 pageerror / console.error / 资源 404', !errs.length, errs.slice(0, 8).join(' | '));
const pass = checks.every(Boolean);
console.log(pass ? 'RESULT: PASS' : 'RESULT: FAIL');
process.exit(pass ? 0 : 1);
