// Regression for the blue shell transition: every navigation must avoid
// full-screen clip/cover work and keep Shatter polygons unmounted.
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from '../node_modules/playwright/index.mjs';

const base = process.env.THEME_AUDIT_BASE ?? 'http://127.0.0.1:5212';
const out = resolve(process.argv[2] ?? '');
if (!process.argv[2]) throw new Error('Pass a new evidence directory');
if (existsSync(out)) throw new Error('Evidence directory already exists; use a new directory');
mkdirSync(out, { recursive: true });

const report = {
  scope: 'Blue shell transitions use a lightweight compositor fade, not a full-screen clip cover or Shatter polygons. Frame timing is browser evidence only, not physical-device acceptance.',
  base,
  ok: false,
  checks: [],
  transitions: [],
  pageErrors: [],
  screenshots: {},
};

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
});
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  reducedMotion: 'no-preference',
  locale: 'zh-CN',
  timezoneId: 'Asia/Shanghai',
});
page.on('pageerror', (error) => report.pageErrors.push(String(error)));
await page.addInitScript(() => {
  localStorage.removeItem('sl-perf-degrade-v2');
  localStorage.setItem('sl-perf-sampled-v2', '1');
  localStorage.removeItem('sl-perf-strike');
});

async function inspectOverlay(kind) {
  await page.waitForTimeout(70);
  const state = await page.evaluate(() => {
    const viewportArea = window.innerWidth * window.innerHeight;
    const fixed = Array.from(document.body.querySelectorAll('*')).filter((element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.position === 'fixed'
        && style.display !== 'none'
        && style.visibility !== 'hidden'
        && Number(style.opacity) > 0
        && !element.closest('#root')
        && rect.width * rect.height >= viewportArea * 0.9;
    });
    const overlays = fixed
      .map((element) => ({
        element,
        zIndex: getComputedStyle(element).zIndex,
        childCount: element.children.length,
      }))
      .filter(({ element, childCount }) => childCount > 0 && (element.querySelector('svg') || element.querySelectorAll(':scope > span').length >= 2))
      .sort((a, b) => b.childCount - a.childCount);
    const overlay = overlays[0]?.element;
    const clippedFullScreen = Array.from(document.body.querySelectorAll('*')).filter((element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.clipPath !== 'none'
        && style.display !== 'none'
        && style.visibility !== 'hidden'
        && rect.width * rect.height >= viewportArea * 0.9;
    }).length;
    const animations = document.getAnimations().map((animation) => {
      const frames = animation.effect?.getKeyframes?.() ?? [];
      return {
        playState: animation.playState,
        opacity: frames.some((frame) => frame.opacity !== undefined),
        transform: frames.some((frame) => frame.transform !== undefined),
      };
    }).filter((animation) => animation.playState === 'running');
    return {
      transitionZ: overlays[0]?.zIndex ?? '',
      overlayCount: overlays.length,
      polygons: overlay?.querySelectorAll('polygon').length ?? 0,
      circles: overlay?.querySelectorAll(':scope > span').length ?? 0,
      childTags: overlay ? Array.from(overlay.children).map((element) => element.tagName.toLowerCase()) : [],
      clippedFullScreen,
      runningAnimations: animations.length,
      runningOpacityAnimations: animations.filter((animation) => animation.opacity).length,
      runningTransformAnimations: animations.filter((animation) => animation.transform).length,
    };
  });
  const path = resolve(out, `${report.transitions.length + 1}-${kind}.png`);
  await page.screenshot({ path });
  report.screenshots[`${kind}`] = path;
  return state;
}

async function navigate(kind, label) {
  const beforeHash = await page.evaluate(() => location.hash);
  const nav = page.locator('nav[aria-label="底部导航"], nav[aria-label="主导航"]').first();
  const button = nav.locator('button, a').filter({ hasText: label }).first();
  await button.click();
  const immediateHash = await page.evaluate(() => location.hash);
  const overlay = await inspectOverlay(kind);
  const frameTiming = await page.evaluate(() => new Promise((resolve) => {
    const samples = [];
    let previous = performance.now();
    const step = (now) => {
      samples.push(now - previous);
      previous = now;
      if (samples.length >= 20) {
        resolve({
          maxGapMs: Math.max(...samples),
          avgGapMs: samples.reduce((sum, value) => sum + value, 0) / samples.length,
        });
        return;
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }));
  report.transitions.push({ kind, label, beforeHash, immediateHash, ...overlay, ...frameTiming });
  assert.equal(overlay.polygons, 0, `${kind}: Shatter polygons were mounted`);
  assert.equal(overlay.clippedFullScreen, 0, `${kind}: a full-screen clip-path was mounted`);
  assert.ok(overlay.runningOpacityAnimations >= 1, `${kind}: page fade animation did not start`);
  await page.waitForTimeout(1100);
}

try {
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => (document.querySelector('#root')?.childElementCount ?? 0) > 0, null, { timeout: 30000 });
  await page.evaluate(async () => {
    const { useAppStore } = await import('/src/store/index.ts');
    const { setPrefs } = await import('/src/themes/p3r-blue/lib/prefs.ts');
    const state = useAppStore.getState();
    if (!state.user) await state.createUser('蓝色转场检查');
    await useAppStore.getState().setTheme('blue');
    document.documentElement.removeAttribute('data-boldness');
    setPrefs({ motion: 'full' });
  });
  await page.waitForFunction(() => document.documentElement.getAttribute('data-kit') === 'p3r-blue', null, { timeout: 30000 });
  await page.waitForTimeout(1600);

  await navigate('forward-actions', '行动');
  await navigate('forward-cooperation', '羁绊');
  await navigate('forward-menu', '菜单');
  await navigate('back-home', '首页');

  report.checks.push('blue navigation rendered no Shatter polygons');
  report.checks.push('blue navigation used no full-screen clip-path cover');
  report.checks.push('blue navigation started compositor-friendly opacity animation');
  assert.equal(report.pageErrors.length, 0, `page errors: ${report.pageErrors.join(' | ')}`);
  report.ok = true;
} catch (error) {
  report.error = String(error?.stack ?? error);
  report.failureState = await page.evaluate(() => ({
    href: location.href,
    hash: location.hash,
    theme: document.documentElement.getAttribute('data-theme'),
    kit: document.documentElement.getAttribute('data-kit'),
    boldness: document.documentElement.getAttribute('data-boldness'),
    p3rMotion: document.documentElement.getAttribute('data-p3r-motion'),
    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
    bodyText: document.body.innerText.replace(/\s+/g, ' ').trim().slice(0, 1200),
  })).catch(() => null);
  await page.screenshot({ path: resolve(out, '99-failure.png') }).catch(() => {});
} finally {
  await browser.close().catch(() => {});
  writeFileSync(resolve(out, 'report.json'), JSON.stringify(report, null, 2));
}

console.log(JSON.stringify({
  ok: report.ok,
  checks: report.checks.length,
  transitions: report.transitions.map((item) => ({
    kind: item.kind,
    polygons: item.polygons,
    circles: item.circles,
  })),
  pageErrors: report.pageErrors.length,
  error: report.error,
  report: resolve(out, 'report.json'),
}, null, 2));
if (!report.ok) process.exitCode = 1;
