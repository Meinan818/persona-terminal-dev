#!/usr/bin/env node
/**
 * P5R 红频道 · 像素验收（接入件 · 不要改）。
 * 用 Playwright 打开正式仓库开发服务里的 /p5r-red-verify.html（mock 数据 + 正式仓库全局样式），
 * 逐条截图，与 scripts/p5r-red/reference/ 里的参考截图（demo dist 原样截出）逐像素比对。
 *
 *   node scripts/p5r-red/compare.mjs --base http://127.0.0.1:5173            # 全部参考截图
 *   node scripts/p5r-red/compare.mjs --base http://127.0.0.1:5173 --only menu  # 只跑名字含 menu 的
 *
 * 判定：每张图「差异像素占比」≤ 该图阈值（manifest.json 的 maxRatio，缺省 0.6%）才算过；
 *       差异像素 = 任一通道差 > 40（吸收抗锯齿 / 字体微差）。末行 RESULT: PASS x/x 才算通过，任何一张不过 = RESULT: FAIL。
 * 产物（系统临时目录 /tmp/p5r-compare/，不进仓库）：<name>.png（本次截图）、<name>.diff.png（红点 = 差异）、report.json。
 * 依赖：playwright（npm i --no-save playwright@1.64.1 && npx playwright install chromium）。不改 package.json。
 * 没有「更新参考图」的开关：参考图只能由 demo 包方重新生成。参考图被改过 check-copy.mjs 会报错。
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const get = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const BASE = get('base', 'http://127.0.0.1:5173').replace(/\/$/, '');
const ONLY = get('only', '');
const PAGE = get('page', 'p5r-red-verify.html'); // 只有 demo 包方自检时才会改（指向 dist/index.html）
const OUT = resolve(get('out', join(tmpdir(), 'p5r-compare'))); // 放系统临时目录：不会被 git add 进仓库
const REF = resolve(get('ref', resolve(here, 'reference')));
const DEFAULT_MAX = 0.006, CH = 40;

let chromium;
try { ({ chromium } = await import('playwright')); } catch {
  console.error('缺少 playwright：先运行  npm i --no-save playwright@1.64.1 && npx playwright install chromium');
  console.log('RESULT: FAIL（缺少 playwright）'); process.exit(1);
}
if (!existsSync(resolve(REF, 'manifest.json'))) { console.error(`找不到参考截图清单 ${REF}/manifest.json`); console.log('RESULT: FAIL'); process.exit(1); }
const manifest = JSON.parse(readFileSync(resolve(REF, 'manifest.json'), 'utf8'));
mkdirSync(OUT, { recursive: true });

/** 和参考截图同一套拍摄条件（固定时钟 / 时区 / 语言 / 浅色系统 / DPR 1 / 关音效与惊喜层 / 隐藏演示胶囊） */
const SHOOT = { fixedTime: manifest.fixedTime, timezoneId: manifest.timezoneId || 'Asia/Shanghai', locale: 'zh-CN', wait: manifest.wait || 1600 };
const urlOf = (route, mode) => { const [p, q = ''] = route.replace(/^#/, '').split('?'); const sp = new URLSearchParams(q); sp.set('__mode', mode); sp.set('__dev', '0'); sp.set('__fx', '0'); sp.set('__snd', '0'); return `${BASE}/${PAGE}#${p || '/'}?${sp}`; };

/** 定格（参考图与对比共用同一段，两边必须一致）：等网络静止 → 字体 → 固定等待 → 图片解码 → 无限循环动画停在第 0 帧、有限动画直接到终态 → 两帧后截图。只为截图可复现，不改任何样式。 */
const settle = async (page, wait) => { await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {}); await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(wait); await page.evaluate(async () => { await Promise.all([...document.images].map((i) => (i.complete ? null : i.decode().catch(() => null)))); for (const a of document.getAnimations()) { try { const t = a.effect && a.effect.getComputedTiming(); if (t && t.iterations === Infinity) { a.pause(); a.currentTime = 0; } else a.finish(); } catch (e) { /* ignore */ } } await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); }); };
const browser = await chromium.launch();
const results = [];
const groups = new Map();
for (const s of manifest.shots.filter((x) => !ONLY || x.name.includes(ONLY))) { const k = `${s.vp}|${s.mode}`; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(s); }
const diffPage = await (await browser.newContext()).newPage();
for (const [k, shots] of groups) {
  const [vp, mode] = k.split('|'); const [w, h] = vp.split('x').map(Number);
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: w < 700, timezoneId: SHOOT.timezoneId, locale: SHOOT.locale, colorScheme: 'light', reducedMotion: 'no-preference' });
  const errs = [];
  const mkPage = async () => {
    const p = await ctx.newPage();
    if (SHOOT.fixedTime) await p.clock.setFixedTime(new Date(SHOOT.fixedTime));
    p.on('pageerror', (e) => errs.push(`pageerror: ${e.message.slice(0, 160)}`));
    p.on('console', (m) => { if (m.type() === 'error') errs.push(`console: ${m.text().slice(0, 160)}`); });
    p.on('requestfailed', (r) => errs.push(`resource: ${r.url().split('/').slice(-2).join('/')}`));
    return p;
  };
  let page = await mkPage();
  // 预热（不截图、不计分）：开发服务第一次打开要现编译模块、现下字体分片，冷启动的第一张会比参考图慢半拍（演练 dryrun5：首张 dashboard 0.78%，预热后 0.49%）
  try { await page.goto(urlOf(shots[0].route, mode), { waitUntil: 'load', timeout: 60000 }); await settle(page, SHOOT.wait); } catch { /* 预热失败不影响正式对比 */ }
  for (const s of shots) {
    errs.length = 0;
    const r = { name: s.name, route: s.route, vp, mode, ok: false };
    try {
      await page.goto('about:blank');
      await page.goto(urlOf(s.route, mode), { waitUntil: 'load', timeout: 30000 });
      await settle(page, SHOOT.wait);
      const shot = await page.screenshot({ path: resolve(OUT, `${s.name}.png`) });
      const ref = readFileSync(resolve(REF, s.file));
      const d = await diffPage.evaluate(async ({ a, b, ch }) => {
        const load = (src) => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
        const [ia, ib] = await Promise.all([load(a), load(b)]);
        if (ia.width !== ib.width || ia.height !== ib.height) return { sizeMismatch: `${ia.width}x${ia.height} vs ${ib.width}x${ib.height}` };
        const c = (img) => { const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height; const x = cv.getContext('2d'); x.drawImage(img, 0, 0); return [cv, x.getImageData(0, 0, img.width, img.height)]; };
        const [cva, da] = c(ia); const [, db] = c(ib);
        const out = cva.getContext('2d').getImageData(0, 0, ia.width, ia.height); let n = 0;
        for (let p = 0; p < da.data.length; p += 4) {
          const diff = Math.max(Math.abs(da.data[p] - db.data[p]), Math.abs(da.data[p + 1] - db.data[p + 1]), Math.abs(da.data[p + 2] - db.data[p + 2]));
          if (diff > ch) { n++; out.data[p] = 255; out.data[p + 1] = 0; out.data[p + 2] = 0; out.data[p + 3] = 255; } else { const g = (da.data[p] + da.data[p + 1] + da.data[p + 2]) / 3; out.data[p] = out.data[p + 1] = out.data[p + 2] = 200 + g / 5; out.data[p + 3] = 255; }
        }
        cva.getContext('2d').putImageData(out, 0, 0);
        return { n, total: ia.width * ia.height, diffPng: cva.toDataURL('image/png') };
      }, { a: `data:image/png;base64,${shot.toString('base64')}`, b: `data:image/png;base64,${ref.toString('base64')}`, ch: CH });
      if (d.sizeMismatch) { r.err = `尺寸不一致 ${d.sizeMismatch}`; }
      else {
        r.ratio = d.n / d.total; r.max = s.maxRatio ?? DEFAULT_MAX; r.ok = r.ratio <= r.max && !errs.length;
        writeFileSync(resolve(OUT, `${s.name}.diff.png`), Buffer.from(d.diffPng.split(',')[1], 'base64'));
      }
      if (errs.length) r.errors = [...errs];
    } catch (e) { r.err = String(e.message || e).split('\n')[0].slice(0, 200); await page.close().catch(() => {}); page = await mkPage(); }
    results.push(r);
    console.log(`${r.ok ? '✓' : '✗'} ${s.name.padEnd(34)} ${r.ratio != null ? (r.ratio * 100).toFixed(3) + '%' : '—'} / ≤${((r.max ?? DEFAULT_MAX) * 100).toFixed(2)}%${r.err ? '  ' + r.err : ''}${r.errors ? '  ' + r.errors.join(' | ') : ''}`);
  }
  await ctx.close();
}
await browser.close();
const pass = results.filter((r) => r.ok).length;
writeFileSync(resolve(OUT, 'report.json'), JSON.stringify({ base: BASE, generated: new Date().toISOString(), pass, total: results.length, results }, null, 1));
console.log(`\n报告：${OUT}/report.json（差异图 *.diff.png，红点 = 不一致的像素）`);
console.log(pass === results.length && results.length ? `RESULT: PASS ${pass}/${results.length}` : `RESULT: FAIL ${pass}/${results.length}`);
process.exit(pass === results.length && results.length ? 0 : 1);
