// 红色主题与原包参考截图的像素级比对。定格条件（固定时钟 / 视口 / 时区 / 语言 / DPR）
// 与 scripts/p5r-red/compare.mjs 完全一致，但改用系统 Chrome 启动——本机自带的
// headless shell 一启动就崩。只证明版式没跑偏，不证明业务语义，也不等于真机手感。
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from '../node_modules/playwright/index.mjs';

const base = process.env.THEME_AUDIT_BASE ?? 'http://127.0.0.1:5212';
const pageName = 'p5r-red-verify.html';
const out = resolve(process.argv[2] ?? '');
if (!process.argv[2]) throw new Error('Pass a new evidence directory');
if (existsSync(out)) throw new Error('Evidence directory already exists; use a new directory');
mkdirSync(out, { recursive: true });

const refDir = resolve('scripts/p5r-red/reference');
const manifest = JSON.parse(readFileSync(resolve(refDir, 'manifest.json'), 'utf8'));
const CH = 40;
const DEFAULT_MAX = 0.006;
const only = process.env.RED_PARITY_ONLY ?? '';

const SHOOT = {
  fixedTime: manifest.fixedTime,
  timezoneId: manifest.timezoneId || 'Asia/Shanghai',
  locale: 'zh-CN',
  wait: manifest.wait || 1600,
};

const urlOf = (route, mode) => {
  const [p, q = ''] = route.replace(/^#/, '').split('?');
  const sp = new URLSearchParams(q);
  sp.set('__mode', mode);
  sp.set('__dev', '0');
  sp.set('__fx', '0');
  sp.set('__snd', '0');
  return `${base}/${pageName}#${p || '/'}?${sp.toString()}`;
};

// 定格：等网络静止 → 字体就绪 → 固定等待 → 图片解码 → 无限循环动画停在第 0 帧
const settle = async (page, wait) => {
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(wait);
  await page.evaluate(async () => {
    await Promise.all([...document.images].map((i) => (i.complete ? null : i.decode().catch(() => null))));
    for (const a of document.getAnimations()) {
      try {
        const t = a.effect && a.effect.getComputedTiming();
        if (t && t.iterations === Infinity) { a.pause(); a.currentTime = 0; } else { a.finish(); }
      } catch (e) { /* ignore */ }
    }
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  });
};

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
});

const results = [];
const groups = new Map();
for (const s of manifest.shots.filter((x) => !only || x.name.includes(only))) {
  const k = `${s.vp}|${s.mode}`;
  if (!groups.has(k)) groups.set(k, []);
  groups.get(k).push(s);
}

const diffPage = await (await browser.newContext()).newPage();

for (const [k, shots] of groups) {
  const [vp, mode] = k.split('|');
  const [w, h] = vp.split('x').map(Number);
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    deviceScaleFactor: 1,
    hasTouch: w < 700,
    timezoneId: SHOOT.timezoneId,
    locale: SHOOT.locale,
    colorScheme: 'light',
    reducedMotion: 'no-preference',
  });
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
  // 预热：开发服务第一次打开要现编译模块、现下字体分片，冷启动第一张会比参考图慢半拍。不计分。
  try {
    await page.goto(urlOf(shots[0].route, mode), { waitUntil: 'load', timeout: 60000 });
    await settle(page, SHOOT.wait);
  } catch { /* 预热失败不影响正式比对 */ }

  for (const s of shots) {
    errs.length = 0;
    const r = { name: s.name, title: s.title, route: s.route, vp, mode, ok: false };
    try {
      await page.goto('about:blank');
      await page.goto(urlOf(s.route, mode), { waitUntil: 'load', timeout: 60000 });
      await settle(page, SHOOT.wait);
      const shot = await page.screenshot({ path: resolve(out, `${s.name}.png`) });
      const ref = readFileSync(resolve(refDir, s.file));
      const d = await diffPage.evaluate(async ({ a, b, ch }) => {
        const load = (src) => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
        const [ia, ib] = await Promise.all([load(a), load(b)]);
        if (ia.width !== ib.width || ia.height !== ib.height) return { sizeMismatch: `${ia.width}x${ia.height} vs ${ib.width}x${ib.height}` };
        const c = (img) => {
          const cv = document.createElement('canvas');
          cv.width = img.width; cv.height = img.height;
          const x = cv.getContext('2d');
          x.drawImage(img, 0, 0);
          return [cv, x.getImageData(0, 0, img.width, img.height)];
        };
        const [cva, da] = c(ia);
        const [, db] = c(ib);
        const outImg = cva.getContext('2d').getImageData(0, 0, ia.width, ia.height);
        let n = 0;
        // 20px 网格扫描，标出差异集中在哪些区域（只用于定位偏差，不参与判定）
        const grid = [];
        for (let y = 0; y < ia.height; y += 20) {
          for (let px = 0; px < ia.width; px += 20) {
            let n = 0;
            for (let yy = y; yy < Math.min(ia.height, y + 20); yy++) {
              for (let xx = px; xx < Math.min(ia.width, px + 20); xx++) {
                const i = (yy * ia.width + xx) * 4;
                const dd = Math.max(Math.abs(da.data[i] - db.data[i]), Math.abs(da.data[i + 1] - db.data[i + 1]), Math.abs(da.data[i + 2] - db.data[i + 2]));
                if (dd > 40) n++;
              }
            }
            if (n > 60) grid.push({ x: px, y, n });
          }
        }
        grid.sort((m, k) => k.n - m.n);
        const regions = { topDiffCells: grid.slice(0, 20) };
        for (let p = 0; p < da.data.length; p += 4) {
          const diff = Math.max(
            Math.abs(da.data[p] - db.data[p]),
            Math.abs(da.data[p + 1] - db.data[p + 1]),
            Math.abs(da.data[p + 2] - db.data[p + 2]),
          );
          if (diff > ch) { n++; outImg.data[p] = 255; outImg.data[p + 1] = 0; outImg.data[p + 2] = 0; outImg.data[p + 3] = 255; }
          else { const g = (da.data[p] + da.data[p + 1] + da.data[p + 2]) / 3; outImg.data[p] = outImg.data[p + 1] = outImg.data[p + 2] = 200 + g / 5; outImg.data[p + 3] = 255; }
        }
        cva.getContext('2d').putImageData(outImg, 0, 0);
        return { n, total: ia.width * ia.height, diffPng: cva.toDataURL('image/png'), regions };
      }, { a: `data:image/png;base64,${shot.toString('base64')}`, b: `data:image/png;base64,${ref.toString('base64')}`, ch: CH });
      if (d.sizeMismatch) r.err = `尺寸不一致 ${d.sizeMismatch}`;
      else {
        r.ratio = d.n / d.total;
        r.regions = d.regions;
        r.max = s.maxRatio ?? DEFAULT_MAX;
        r.ok = r.ratio <= r.max && !errs.length;
        writeFileSync(resolve(out, `${s.name}.diff.png`), Buffer.from(d.diffPng.split(',')[1], 'base64'));
      }
      if (errs.length) r.errors = [...errs];
    } catch (e) {
      r.err = String(e.message || e).split('\n')[0].slice(0, 200);
      await page.close().catch(() => {});
      page = await mkPage();
    }
    results.push(r);
    console.log(`${r.ok ? 'PASS' : 'FAIL'} ${r.name.padEnd(32)} ${r.ratio != null ? (r.ratio * 100).toFixed(3) + '%' : '--'} / <=${((r.max ?? DEFAULT_MAX) * 100).toFixed(2)}%${r.err ? '  ' + r.err : ''}${r.errors ? '  ' + r.errors.join(' | ') : ''}`);
  }
  await ctx.close();
}

await browser.close();
const pass = results.filter((r) => r.ok).length;
const failed = results.filter((r) => !r.ok).map((r) => ({ name: r.name, title: r.title, ratio: r.ratio, max: r.max, err: r.err }));
const report = {
  scope: '红色主题每一张参考截图与 scripts/p5r-red/reference 的逐像素比对。定格条件与原 compare 工具一致。只证明版式没跑偏，不证明业务语义，也不等于真机手感。',
  base,
  reference: 'scripts/p5r-red/reference（p5r-red-demo dist，2026-10-21 生成）',
  ok: false,
  pass,
  total: results.length,
  failed,
  pageErrors: results.flatMap((r) => (r.errors ?? []).map((e) => `${r.name}: ${e}`)),
  results,
};
report.ok = pass === results.length && results.length > 0 && report.pageErrors.length === 0;
writeFileSync(resolve(out, 'report.json'), JSON.stringify(report, null, 2));
console.log(`\n证据目录：${resolve(out, 'report.json')}`);
console.log(pass === results.length && results.length ? `RESULT: PASS ${pass}/${results.length}` : `RESULT: FAIL ${pass}/${results.length}`);
if (!report.ok) process.exitCode = 1;

