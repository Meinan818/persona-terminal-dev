// Plan 11: compare the four supplied demos with the integrated themes in one
// browser environment. This is evidence only: no real account, cloud write,
// deployment, APK, or charged model call is used.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { chromium } from '../node_modules/playwright/index.mjs';

const root = process.cwd();
const out = resolve(process.argv[2] ?? '');
if (!process.argv[2]) throw new Error('Pass a new evidence directory');
if (existsSync(out)) throw new Error('Evidence directory already exists; use a new directory');
mkdirSync(out, { recursive: true });

const integratedBase = process.env.THEME_PLAN11_INTEGRATED ?? 'http://127.0.0.1:5212';
const originalBase = {
  blue: process.env.THEME_PLAN11_BLUE ?? 'http://127.0.0.1:5221',
  pink: process.env.THEME_PLAN11_PINK ?? 'http://127.0.0.1:5222',
  yellow: process.env.THEME_PLAN11_YELLOW ?? 'http://127.0.0.1:5223',
  red: process.env.THEME_PLAN11_RED ?? 'http://127.0.0.1:5224',
};
const demos = resolve('E:/MASKARIA/.cache/demo-packages');
const imageCompare = resolve(root, 'scripts/compare-theme-plan11-images.py');
const NAV_SELECTOR = 'nav[aria-label="底部导航"], nav[aria-label="主导航"], nav#bnav';
const WHEEL_SELECTOR = '[role="menu"][aria-label="快捷跳转轮盘"], [aria-label="快捷跳转轮盘"] [role="menu"], [aria-label="快捷跳转轮盘"]';
const FULL_WHEEL_SELECTOR = '[aria-label="快捷跳转轮盘"]';

const themes = {
  blue: {
    alias: '@blue/',
    originalRoot: resolve(demos, 'p3r-blue-demo/p3r-blue'),
    integratedRoot: resolve(root, 'src/themes/p3r-blue'),
    splash: 'boot-splash-p3',
    splashQuery: 'state=reduced&speed=normal&hold=1',
    splashWait: 350,
    splashRoot: '[aria-label="MASKARIA 开屏 · 深夜月光录"]',
    zPrefix: '--p3r-z',
    expectedSounds: ['themea-switch.mp3', 'themea-nav.mp3', 'themea-success.mp3', 'themea-level.mp3'],
  },
  pink: {
    alias: '@pink/',
    originalRoot: resolve(demos, 'p3r-pink-demo/p3r-pink'),
    integratedRoot: resolve(root, 'src/themes/p3r-pink'),
    splash: 'boot-splash-p3',
    splashQuery: 'state=reduced&speed=normal&hold=1',
    splashWait: 350,
    splashRoot: '[aria-label="MASKARIA 开屏 · 深夜月光录"]',
    zPrefix: '--p3r-z',
    expectedSounds: ['themea-switch.mp3', 'themea-nav.mp3', 'themea-success.mp3', 'themea-level.mp3'],
  },
  yellow: {
    alias: '@yellow/',
    originalRoot: resolve(demos, 'p4g-yellow-demo/p4g-yellow'),
    integratedRoot: resolve(root, 'src/themes/p4g-yellow'),
    splash: 'boot-splash-p4',
    splashQuery: 'speed=slow',
    splashWait: 1100,
    splashRoot: '[aria-label="MASKARIA 开屏"]',
    zPrefix: '--p4g-z',
    expectedSounds: ['themeb-switch.mp3', 'themeb-nav.mp3', 'themeb-success.mp3', 'themeb-level.mp3'],
  },
  red: {
    alias: '',
    originalRoot: resolve(demos, 'p5r-red-demo/p5r-red-demo/integration'),
    integratedRoot: resolve(root, 'src'),
    splash: 'boot-splash-p5',
    splashQuery: 'speed=slow',
    splashWait: 900,
    splashRoot: '.oa-splash.sp5r',
    zPrefix: null,
    expectedSounds: ['themec-switch.mp3', 'dd.mp3', 'ok.mp3', 'themec-level.mp3'],
  },
};

const knownSourceSets = {
  blue: [
    ['src/shell', 'shell'],
    ['src/fx', 'fx'],
    ['src/kit', 'kit'],
    ['src/screens/overlays/SplashScreen.p3r.tsx', 'screens/overlays/SplashScreen.p3r.tsx'],
    ['src/screens/overlays/VelvetRoomSplash.p3r.tsx', 'screens/overlays/VelvetRoomSplash.p3r.tsx'],
    ['src/screens/overlays/RadialQuickNav.p3r.tsx', 'screens/overlays/RadialQuickNav.p3r.tsx'],
    ['src/screens/overlays/RadialWheel.p3r.tsx', 'screens/overlays/RadialWheel.p3r.tsx'],
  ],
  pink: [
    ['src/shell', 'shell'],
    ['src/fx', 'fx'],
    ['src/kit', 'kit'],
    ['src/screens/overlays/SplashScreen.p3r.tsx', 'screens/overlays/SplashScreen.p3r.tsx'],
    ['src/screens/overlays/VelvetRoomSplash.p3r.tsx', 'screens/overlays/VelvetRoomSplash.p3r.tsx'],
    ['src/screens/overlays/RadialQuickNav.p3r.tsx', 'screens/overlays/RadialQuickNav.p3r.tsx'],
    ['src/screens/overlays/RadialWheel.p3r.tsx', 'screens/overlays/RadialWheel.p3r.tsx'],
  ],
  yellow: [
    ['src/shell', 'shell'],
    ['src/fx', 'fx'],
    ['src/kit', 'kit'],
    ['src/screens/overlays/SplashScreen.p4g.tsx', 'screens/overlays/SplashScreen.p4g.tsx'],
    ['src/screens/overlays/VelvetRoomSplash.p4g.tsx', 'screens/overlays/VelvetRoomSplash.p4g.tsx'],
    ['src/screens/overlays/RadialQuickNav.p4g.tsx', 'screens/overlays/RadialQuickNav.p4g.tsx'],
  ],
  red: [
    ['src/p5r-red/shell', 'p5r-red/shell'],
    ['src/p5r-red/fx', 'p5r-red/fx'],
    ['src/p5r-red/screens/overlays/SplashScreen.p5r.tsx', 'p5r-red/screens/overlays/SplashScreen.p5r.tsx'],
    ['src/p5r-red/screens/overlays/RadialQuickNav.p5r.tsx', 'p5r-red/screens/overlays/RadialQuickNav.p5r.tsx'],
    ['src/p5r-red/screens/overlays/SplashScreen.p5r.css', 'p5r-red/screens/overlays/SplashScreen.p5r.css'],
  ],
};

const report = {
  scope: 'Plan 11 only: original demo vs integrated theme fidelity for splash, navigation/wheel, page transitions, overlay stacking, sound triggers, and sequence order. Same browser, viewport, fonts, and reduced/full motion modes.',
  integratedBase,
  originalBase,
  sourceParity: {},
  themes: {},
  imageComparisons: [],
  pageErrors: [],
  localFailures: [],
  originalDemoBaselineFailures: [],
  integratedLocalFailures: [],
  blockedExternal: 0,
  networkSoundRequests: [],
  checks: [],
};

function listFiles(path) {
  const result = [];
  const visit = (current) => {
    const info = statSync(current);
    if (info.isFile()) {
      result.push(current);
      return;
    }
    for (const name of readdirSync(current).sort()) visit(join(current, name));
  };
  visit(path);
  return result;
}

const normalizeSource = (text, alias) => {
  let next = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  if (alias) next = next.split(alias).join('@/');
  return next;
};

function compareSource(themeId) {
  const theme = themes[themeId];
  const files = [];
  for (const [originalRelative, integratedRelative] of knownSourceSets[themeId]) {
    const original = resolve(theme.originalRoot, originalRelative);
    const integrated = resolve(theme.integratedRoot, integratedRelative);
    if (statSync(original).isDirectory()) {
      const originalFiles = listFiles(original);
      const originalNames = new Set(originalFiles.map((file) => file.slice(original.length + 1).replace(/\\/g, '/')));
      const integratedFiles = listFiles(integrated);
      const integratedNames = new Set(integratedFiles.map((file) => file.slice(integrated.length + 1).replace(/\\/g, '/')));
      const names = Array.from(new Set([...originalNames, ...integratedNames])).sort();
      for (const relative of names) {
        const originalFile = resolve(original, relative);
        const integratedFile = resolve(integrated, relative);
        files.push(compareFile(originalFile, integratedFile, theme.alias, `${originalRelative}/${relative}`));
      }
    } else {
      files.push(compareFile(original, integrated, theme.alias, originalRelative));
    }
  }
  return {
    exactOrAliasOnly: files.filter((file) => file.state === 'identical' || file.state === 'alias-only').length,
    changed: files.filter((file) => file.state === 'changed'),
    missingOriginal: files.filter((file) => file.state === 'missing-original'),
    missingIntegrated: files.filter((file) => file.state === 'missing-integrated'),
    files,
  };
}

function compareFile(original, integrated, alias, label) {
  if (!existsSync(original)) return { label, state: 'missing-original' };
  if (!existsSync(integrated)) return { label, state: 'missing-integrated' };
  const rawOriginal = readFileSync(original, 'utf8');
  const rawIntegrated = readFileSync(integrated, 'utf8');
  if (rawOriginal === rawIntegrated) return { label, state: 'identical' };
  if (normalizeSource(rawOriginal, alias) === normalizeSource(rawIntegrated, alias)) return { label, state: 'alias-only' };
  return { label, state: 'changed' };
}

function sameOriginAllowed(url, base) {
  try {
    return new URL(url).origin === new URL(base).origin;
  } catch {
    return false;
  }
}

const audioBootstrap = () => {
  window.__plan11Sfx = [];
  const push = (entry) => {
    try { window.__plan11Sfx.push({ ...entry, at: performance.now() }); } catch { /* ignore */ }
  };
  const NativeAudio = window.Audio;
  function TrackedAudio(src) {
    push({ kind: 'element', src: String(src) });
    return new NativeAudio(src);
  }
  TrackedAudio.prototype = NativeAudio.prototype;
  window.Audio = TrackedAudio;
  const nativeFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    const raw = typeof input === 'string' ? input : input?.url ?? String(input);
    if (/\.(?:mp3|wav|ogg)(?:[?#]|$)/i.test(raw)) push({ kind: 'fetch', src: raw });
    return nativeFetch(input, init);
  };
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (AudioContextCtor) {
    const nativeCreate = AudioContextCtor.prototype.createBufferSource;
    AudioContextCtor.prototype.createBufferSource = function trackedCreateBufferSource(...args) {
      const source = nativeCreate.apply(this, args);
      const nativeStart = source.start.bind(source);
      source.start = (...startArgs) => {
        push({ kind: 'buffer', src: 'audio-context' });
        return nativeStart(...startArgs);
      };
      return source;
    };
  }
};

async function createHarness(name, base) {
  const context = await chromium.launchPersistentContext(resolve(out, `profile-${name}`), {
    executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    serviceWorkers: 'block',
    reducedMotion: 'no-preference',
  });
  await context.addInitScript(audioBootstrap);
  await context.route('**/*', async (route) => {
    const request = route.request();
    const url = request.url();
    if (!sameOriginAllowed(url, base)) {
      if (new URL(url).pathname.startsWith('/api/')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: '{"items":[]}' });
      }
      report.blockedExternal += 1;
      return route.abort();
    }
    if (/\.(?:mp3|wav|ogg)(?:[?#]|$)/i.test(url)) {
      report.networkSoundRequests.push({ base, url });
    }
    if (new URL(url).pathname.startsWith('/api/')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{"items":[]}' });
    }
    return route.continue();
  });
  return context;
}

function attach(page, side) {
  page.on('pageerror', (error) => report.pageErrors.push({ side, message: error.message, url: page.url() }));
  page.on('response', (response) => {
    const url = response.url();
    if (response.status() >= 400 && !new URL(url).pathname.startsWith('/api/')) {
      report.localFailures.push({ side, status: response.status(), url });
    }
  });
}

let navigationNonce = 0;
function appUrl(base, hash = '#/') {
  navigationNonce += 1;
  return `${base}/?plan11=${navigationNonce}${hash}`;
}

async function waitApp(page) {
  await page.waitForFunction(() => (document.querySelector('#root')?.childElementCount ?? 0) > 0, null, { timeout: 25000 });
  await page.waitForFunction(() => document.body.innerText.trim().length > 0, null, { timeout: 25000 });
}

async function goto(page, hash = '#/') {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await page.goto(appUrl(page.__plan11Base, hash), { waitUntil: 'domcontentloaded' });
      break;
    } catch (error) {
      if (!/ERR_ABORTED|interrupted by another navigation|target closed/i.test(String(error)) || attempt === 2) throw error;
    }
  }
  await waitApp(page);
  await page.waitForTimeout(350);
}

async function evalRetry(page, fn, arg) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      return await page.evaluate(fn, arg);
    } catch (error) {
      if (!/Execution context was destroyed|ERR_ABORTED|interrupted by another navigation/i.test(String(error))) throw error;
      await page.waitForTimeout(800);
      await waitApp(page).catch(() => {});
    }
  }
  throw new Error('page navigation kept interrupting isolated setup');
}

async function closeWelcome(page) {
  for (let i = 0; i < 5; i++) {
    const close = page.getByRole('button', { name: /跳过|关闭|我已经是客人了|开始使用/ }).first();
    if (await close.isVisible().catch(() => false)) {
      await close.click().catch(() => {});
      await page.waitForTimeout(250);
    } else {
      break;
    }
  }
}

async function waitForNav(page) {
  try {
    await page.locator(NAV_SELECTOR).first().waitFor({ state: 'visible', timeout: 8000 });
    await page.waitForTimeout(250);
    return { ok: true };
  } catch {
    return page.evaluate(() => ({
      ok: false,
      hash: location.hash,
      bodyText: document.body.innerText.replace(/\s+/g, ' ').trim().slice(0, 1200),
      rootChildren: document.querySelector('#root')?.childElementCount ?? 0,
    })).catch((error) => ({ ok: false, error: String(error) }));
  }
}

async function seedIntegrated(page, theme) {
  await goto(page, '#/');
  await evalRetry(page, async (theme) => {
    const storeUrl = performance.getEntriesByType('resource')
      .map((entry) => entry.name)
      .find((item) => item.includes('/src/store/index.ts'));
    const { useAppStore } = await import(storeUrl || '/src/store/index.ts');
    const { db } = await import('/src/db/index.ts');
    if (!useAppStore.getState().user) await useAppStore.getState().createUser('计划11隔离档案');
    const user = useAppStore.getState().user;
    await useAppStore.getState().updateSettings({
      darkMode: false,
      soundMuted: false,
      soundVolume: 80,
      summaryApiKey: '',
      aiProfiles: {},
    });
    if (user) {
      await db.users.update(user.id, { theme });
      useAppStore.setState({ user: { ...user, theme } });
    }
  }, theme);
  await page.waitForTimeout(700);
  await closeWelcome(page);
}

async function screenshot(page, name) {
  const path = resolve(out, `${name}.png`);
  await page.screenshot({ path, fullPage: false });
  return path;
}

function compareImages(label, originalPath, integratedPath) {
  const result = spawnSync('python', [imageCompare, originalPath, integratedPath], { encoding: 'utf8' });
  if (result.status !== 0) {
    report.imageComparisons.push({ label, error: result.stderr || result.stdout, status: result.status });
    return null;
  }
  const parsed = JSON.parse(result.stdout.trim());
  report.imageComparisons.push({ label, original: basename(originalPath), integrated: basename(integratedPath), ...parsed });
  return parsed;
}

async function collectSurface(page) {
  return page.evaluate(() => {
    const visible = (el) => {
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0 && rect.width > 0 && rect.height > 0;
    };
    const nav = document.querySelector('nav[aria-label="底部导航"], nav[aria-label="主导航"], nav#bnav');
    const navRect = nav?.getBoundingClientRect();
    const fixed = Array.from(document.querySelectorAll('body *'))
      .filter((el) => visible(el) && ['fixed', 'absolute'].includes(getComputedStyle(el).position))
      .map((el) => {
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return {
          tag: el.tagName.toLowerCase(),
          role: el.getAttribute('role'),
          aria: el.getAttribute('aria-label'),
          cls: typeof el.className === 'string' ? el.className.slice(0, 160) : '',
          z: style.zIndex,
          position: style.position,
          rect: [Math.round(rect.x), Math.round(rect.y), Math.round(rect.width), Math.round(rect.height)],
        };
      })
      .filter((entry) => entry.rect[2] > 40 && entry.rect[3] > 40)
      .slice(0, 40);
    const rootStyle = getComputedStyle(document.documentElement);
    return {
      hash: location.hash,
      bodyText: document.body.innerText.replace(/\s+/g, ' ').trim().slice(0, 500),
      nav: nav && navRect ? {
        rect: [Math.round(navRect.x), Math.round(navRect.y), Math.round(navRect.width), Math.round(navRect.height)],
        z: getComputedStyle(nav).zIndex,
        labels: Array.from(nav.querySelectorAll('button, a[data-go], a.bn2-b, a.bn2-hex')).map((button) => ({
          text: (button.innerText || button.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim(),
          current: button.getAttribute('aria-current'),
        })),
      } : null,
      vars: {
        nav: rootStyle.getPropertyValue('--p3r-z-nav').trim() || rootStyle.getPropertyValue('--p4g-z-nav').trim(),
        sheet: rootStyle.getPropertyValue('--p3r-z-sheet').trim() || rootStyle.getPropertyValue('--p4g-z-sheet').trim(),
        system: rootStyle.getPropertyValue('--p3r-z-system').trim() || rootStyle.getPropertyValue('--p4g-z-system').trim(),
        transition: rootStyle.getPropertyValue('--p3r-z-transition').trim() || rootStyle.getPropertyValue('--p4g-z-transition').trim(),
      },
      fixed,
      wheel: (() => {
        const menu = document.querySelector('[role="menu"][aria-label="快捷跳转轮盘"], [aria-label="快捷跳转轮盘"] [role="menu"], [aria-label="快捷跳转轮盘"]');
        if (!menu) return null;
        const rect = menu.getBoundingClientRect();
        let node = menu;
        let maxZ = 0;
        while (node) {
          const value = Number.parseInt(getComputedStyle(node).zIndex, 10);
          if (Number.isFinite(value)) maxZ = Math.max(maxZ, value);
          node = node.parentElement;
        }
        return {
          rect: [Math.round(rect.x), Math.round(rect.y), Math.round(rect.width), Math.round(rect.height)],
          items: menu.querySelectorAll('[role="menuitem"]').length,
          text: menu.innerText.replace(/\s+/g, ' ').trim(),
          maxZ,
          portaled: !menu.closest('#root'),
        };
      })(),
    };
  });
}

async function inspectSplash(themeId, pair) {
  const { theme, original, integrated } = pair;
  const hash = `#/overlay/${theme.splash}?${theme.splashQuery}&__mode=day&__motion=full&__dev=0&__snd=0`;
  await goto(original, hash);
  await goto(integrated, hash);
  await Promise.all([
    original.locator(theme.splashRoot).first().waitFor({ state: 'visible', timeout: 12000 }),
    integrated.locator(theme.splashRoot).first().waitFor({ state: 'visible', timeout: 12000 }),
  ]);
  const freeze = async (page) => {
    await page.waitForTimeout(300);
    await page.addStyleTag({ content: '*,*::before,*::after{animation-play-state:paused!important;transition:none!important}' });
  };
  await Promise.all([freeze(original), freeze(integrated)]);
  const [originalSurface, integratedSurface] = await Promise.all([
    collectSurface(original),
    collectSurface(integrated),
  ]);
  const [originalPath, integratedPath] = await Promise.all([
    screenshot(original, `${themeId}-splash-original`),
    screenshot(integrated, `${themeId}-splash-integrated`),
  ]);
  const image = compareImages(`${themeId}-splash`, originalPath, integratedPath);
  return {
    hash,
    original: originalSurface,
    integrated: integratedSurface,
    image,
  };
}

async function inspectNavigation(themeId, pair) {
  const { original, integrated } = pair;
  await Promise.all([
    goto(original, '#/p/dashboard?__mode=day&__motion=full&__dev=0&__snd=0'),
    goto(integrated, '#/p/dashboard?__mode=day&__motion=full&__dev=0&__snd=0'),
  ]);
  const [originalReady, integratedReady] = await Promise.all([waitForNav(original), waitForNav(integrated)]);
  if (!originalReady.ok || !integratedReady.ok) {
    await Promise.all([
      screenshot(original, `${themeId}-navigation-original-unready`),
      screenshot(integrated, `${themeId}-navigation-integrated-unready`),
    ]);
  }
  const [originalPath, integratedPath] = await Promise.all([
    screenshot(original, `${themeId}-dashboard-original`),
    screenshot(integrated, `${themeId}-dashboard-integrated`),
  ]);
  const originalNavPath = resolve(out, `${themeId}-nav-original.png`);
  const integratedNavPath = resolve(out, `${themeId}-nav-integrated.png`);
  await Promise.all([
    original.locator(NAV_SELECTOR).first().screenshot({ path: originalNavPath }),
    integrated.locator(NAV_SELECTOR).first().screenshot({ path: integratedNavPath }),
  ]);
  const [originalSurface, integratedSurface] = await Promise.all([
    collectSurface(original),
    collectSurface(integrated),
  ]);
  return {
    originalReady,
    integratedReady,
    original: originalSurface,
    integrated: integratedSurface,
    image: compareImages(`${themeId}-dashboard`, originalPath, integratedPath),
    navImage: compareImages(`${themeId}-nav`, originalNavPath, integratedNavPath),
  };
}

async function inspectWheel(themeId, pair) {
  const { original, integrated } = pair;
  const hash = '#/overlay/shell-radial-wheel?state=reduced&__mode=day&__motion=full&__dev=0&__snd=0';
  await goto(original, hash);
  await goto(integrated, hash);
  const menuSelector = themeId === 'red'
    ? '[aria-label="快捷跳转轮盘"] [role="menu"]'
    : WHEEL_SELECTOR;
  const [originalMenuReady, integratedMenuReady] = await Promise.all([
    original.locator(menuSelector).first().waitFor({ state: 'visible', timeout: 12000 }).then(() => true).catch(() => false),
    integrated.locator(menuSelector).first().waitFor({ state: 'visible', timeout: 12000 }).then(() => true).catch(() => false),
  ]);
  const originalPath = resolve(out, `${themeId}-wheel-original.png`);
  const integratedPath = resolve(out, `${themeId}-wheel-integrated.png`);
  if (originalMenuReady && integratedMenuReady) {
    await Promise.all([
      original.locator(menuSelector).first().screenshot({ path: originalPath }),
      integrated.locator(menuSelector).first().screenshot({ path: integratedPath }),
    ]);
  } else {
    await Promise.all([screenshot(original, `${themeId}-wheel-original`), screenshot(integrated, `${themeId}-wheel-integrated`)]);
  }
  const [originalSurface, integratedSurface] = await Promise.all([
    collectSurface(original),
    collectSurface(integrated),
  ]);
  const sequenceHash = '#/overlay/shell-radial-wheel?state=active&pick=3&__mode=day&__motion=full&__dev=0&__snd=0';
  await goto(original, sequenceHash);
  await goto(integrated, sequenceHash);
  const originalSequence = [];
  const integratedSequence = [];
  for (const wait of [120, 380, 300, 500, 600]) {
    await Promise.all([original.waitForTimeout(wait), integrated.waitForTimeout(wait)]);
    originalSequence.push(await collectSurface(original));
    integratedSequence.push(await collectSurface(integrated));
  }
  const openHash = '#/overlay/shell-radial-wheel?state=idle&__mode=day&__motion=full&__dev=0&__snd=0';
  await goto(original, openHash);
  await goto(integrated, openHash);
  await Promise.all([original.waitForTimeout(800), integrated.waitForTimeout(800)]);
  const originalFullPath = resolve(out, `${themeId}-wheel-full-original.png`);
  const integratedFullPath = resolve(out, `${themeId}-wheel-full-integrated.png`);
  await Promise.all([
    original.locator(FULL_WHEEL_SELECTOR).first().screenshot({ path: originalFullPath }),
    integrated.locator(FULL_WHEEL_SELECTOR).first().screenshot({ path: integratedFullPath }),
  ]);
  return {
    hash,
    sequenceHash,
    originalMenuReady,
    integratedMenuReady,
    original: originalSurface,
    integrated: integratedSurface,
    originalSequence,
    integratedSequence,
    image: compareImages(`${themeId}-wheel`, originalPath, integratedPath),
    fullImage: compareImages(`${themeId}-wheel-full`, originalFullPath, integratedFullPath),
  };
}

async function runTransitionSequence(page) {
  const nav = page.locator(NAV_SELECTOR).first();
  const button = nav.locator('button, a[data-go], a.bn2-b, a.bn2-hex').filter({ hasText: '行动' }).first();
  const fallback = nav.locator('button, a[data-go], a.bn2-b, a.bn2-hex').nth(1);
  const target = await button.count() ? button : fallback;
  if (!(await target.count())) {
    return {
      ready: false,
      state: await page.evaluate(() => ({
        hash: location.hash,
        bodyText: document.body.innerText.replace(/\s+/g, ' ').trim().slice(0, 1200),
      })),
      samples: [],
    };
  }
  const before = await collectSurface(page);
  await target.click();
  const samples = [];
  let elapsed = 0;
  for (const wait of [60, 100, 140, 260, 420, 520]) {
    await page.waitForTimeout(wait);
    elapsed += wait;
    samples.push({
      elapsed,
      state: await collectSurface(page),
    });
  }
  return { ready: true, before, samples };
}

async function inspectTransition(themeId, pair) {
  const { original, integrated } = pair;
  await Promise.all([
    goto(original, '#/p/dashboard?__mode=day&__motion=full&__dev=0&__snd=0'),
    goto(integrated, '#/p/dashboard?__mode=day&__motion=full&__dev=0&__snd=0'),
  ]);
  const [originalReady, integratedReady] = await Promise.all([waitForNav(original), waitForNav(integrated)]);
  const [originalSequence, integratedSequence] = await Promise.all([
    runTransitionSequence(original),
    runTransitionSequence(integrated),
  ]);
  return { originalReady, integratedReady, original: originalSequence, integrated: integratedSequence };
}

async function inspectSound(themeId, pair) {
  const { theme, original, integrated } = pair;
  const integratedSound = await integrated.context().newPage();
  integratedSound.__plan11Base = integrated.__plan11Base;
  attach(integratedSound, `integrated-sound-${themeId}`);
  await goto(integratedSound, '#/p/dashboard?__mode=day&__motion=full&__dev=0&__snd=1');
  await closeWelcome(integratedSound);
  await goto(integratedSound, '#/p/dashboard?__mode=day&__motion=full&__dev=0&__snd=1');
  await waitForNav(integratedSound);
  await integratedSound.waitForTimeout(600);
  await evalRetry(integratedSound, () => { window.__plan11Sfx = []; });
  report.networkSoundRequests.length = 0;
  const nav = integratedSound.locator(NAV_SELECTOR).first().locator('button, a[data-go], a.bn2-b, a.bn2-hex').nth(1);
  if (await nav.isVisible().catch(() => false)) await nav.click();
  await integratedSound.waitForTimeout(900);
  const integratedEventsAfterClick = await evalRetry(integratedSound, () => window.__plan11Sfx.slice());
  const feedbackPath = await evalRetry(integratedSound, () => performance.getEntriesByType('resource')
    .map((entry) => entry.name)
    .find((item) => item.includes('/src/utils/feedback.ts')) ?? null);
  if (feedbackPath) {
    await evalRetry(integratedSound, async (feedbackPath) => {
      const feedback = await import(feedbackPath);
      feedback.triggerNavFeedback();
    }, feedbackPath);
    await integratedSound.waitForTimeout(600);
  }
  const integratedEvents = await evalRetry(integratedSound, () => window.__plan11Sfx.slice());
  const integratedNetwork = report.networkSoundRequests.slice();
  const integratedSoundDiag = await evalRetry(integratedSound, async () => {
    const url = performance.getEntriesByType('resource').map((entry) => entry.name).find((item) => item.includes('/src/store/index.ts'));
    const { useAppStore } = await import(url || '/src/store/index.ts');
    const settings = useAppStore.getState().settings;
    return {
      theme: useAppStore.getState().user?.theme ?? null,
      muted: settings.soundMuted,
      volume: settings.soundVolume,
    };
  });
  await integratedSound.close();

  let originalEvents = [];
  let originalNetwork = [];
  if (themeId === 'red') {
    const originalSound = await original.context().newPage();
    originalSound.__plan11Base = original.__plan11Base;
    attach(originalSound, `original-sound-${themeId}`);
    await goto(originalSound, '#/p/dashboard?__mode=day&__motion=full&__dev=0&__snd=1');
    await evalRetry(originalSound, () => { window.__plan11Sfx = []; });
    report.networkSoundRequests.length = 0;
    const originalNav = originalSound.locator(NAV_SELECTOR).first().locator('button, a[data-go], a.bn2-b, a.bn2-hex').nth(1);
    if (await originalNav.isVisible().catch(() => false)) await originalNav.click();
    await originalSound.waitForTimeout(700);
    originalEvents = await evalRetry(originalSound, () => window.__plan11Sfx.slice());
    originalNetwork = report.networkSoundRequests.slice();
    await originalSound.close();
  }

  report.soundDiagnostics = [...(report.soundDiagnostics ?? []), {
    themeId,
    integratedEvents,
    integratedEventsAfterClick,
    integratedNetwork,
    integratedSoundDiag,
  }];
  return {
    expected: theme.expectedSounds,
    integratedEvents,
    integratedNetwork,
    integratedSoundDiag,
    originalEvents,
    originalNetwork,
    integratedMatched: theme.expectedSounds.filter((name) => integratedEvents.some((event) => String(event.src).includes(name))),
    originalMatched: theme.expectedSounds.filter((name) => originalEvents.some((event) => String(event.src).includes(name))),
  };
}

function addCheck(name, detail) {
  report.checks.push({ name, detail });
}

function assertClose(actual, expected, label, tolerance = 1) {
  if (actual == null || expected == null) return;
  assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: ${actual} != ${expected}`);
}

const originalContexts = {};
let integratedContext;
try {
  for (const themeId of Object.keys(themes)) {
    report.sourceParity[themeId] = compareSource(themeId);
    originalContexts[themeId] = await createHarness(`original-${themeId}`, originalBase[themeId]);
  }
  integratedContext = await createHarness('integrated', integratedBase);

  for (const themeId of Object.keys(themes)) {
    // openPair needs the current context for the requested theme.
    const originalContext = originalContexts[themeId];
    const theme = themes[themeId];
    const original = await originalContext.newPage();
    original.__plan11Base = originalBase[themeId];
    attach(original, `original-${themeId}`);
    await goto(original, '#/p/dashboard?__mode=day&__motion=full&__dev=0&__snd=0');
    await closeWelcome(original);

    const integrated = await integratedContext.newPage();
    integrated.__plan11Base = integratedBase;
    attach(integrated, `integrated-${themeId}`);
    await goto(integrated, '#/');
    await seedIntegrated(integrated, themeId);
    await goto(integrated, '#/p/dashboard?__mode=day&__motion=full&__dev=0&__snd=0');
    const pair = { theme, original, integrated };

    const splash = await inspectSplash(themeId, pair);
    const navigation = await inspectNavigation(themeId, pair);
    assert.equal(navigation.originalReady.ok, true, `${themeId}: original navigation did not load`);
    assert.equal(navigation.integratedReady.ok, true, `${themeId}: integrated navigation did not load`);
    if (navigation.original.nav && navigation.integrated.nav) {
      assert.equal(navigation.original.nav.labels.map((item) => item.text).join('|'), navigation.integrated.nav.labels.map((item) => item.text).join('|'), `${themeId}: navigation labels differ`);
      for (let i = 0; i < 4; i++) assertClose(navigation.integrated.nav.rect[i], navigation.original.nav.rect[i], `${themeId}: nav rect[${i}]`, 1);
      assert.equal(navigation.integrated.nav.z, navigation.original.nav.z, `${themeId}: nav z-index differs`);
    }
    const wheel = await inspectWheel(themeId, pair);
    assert.equal(wheel.originalMenuReady, true, `${themeId}: original wheel menu did not load`);
    assert.equal(wheel.integratedMenuReady, true, `${themeId}: integrated wheel menu did not load`);
    if (wheel.original.wheel && wheel.integrated.wheel) {
      assert.equal(wheel.integrated.wheel.items, wheel.original.wheel.items, `${themeId}: wheel item count differs`);
      const navZ = Number.parseInt(wheel.original.vars.nav || wheel.integrated.vars.nav, 10);
      if (Number.isFinite(navZ)) {
        assert.ok(wheel.original.wheel.maxZ > navZ, `${themeId}: original wheel is not layered above navigation`);
        assert.ok(wheel.integrated.wheel.maxZ > navZ, `${themeId}: integrated wheel is not layered above navigation`);
      }
    }
    const transition = await inspectTransition(themeId, pair);
    assert.equal(transition.original.ready, true, `${themeId}: original page transition did not run`);
    assert.equal(transition.integrated.ready, true, `${themeId}: integrated page transition did not run`);
    assert.ok(transition.original.samples.some((sample) => sample.state.hash.includes('/p/')), `${themeId}: original transition never reached a page route`);
    assert.ok(transition.integrated.samples.some((sample) => sample.state.hash.includes('/p/')), `${themeId}: integrated transition never reached a page route`);
    const sound = await inspectSound(themeId, pair);
    assert.ok(sound.integratedEvents.length > 0 || sound.integratedNetwork.length > 0, `${themeId}: no integrated sound event observed`);
    if (themeId === 'red') assert.ok(sound.originalEvents.length > 0 || sound.originalNetwork.length > 0, 'red: original nav sound was not observed');

    report.themes[themeId] = { splash, navigation, wheel, transition, sound };
    addCheck(`${themeId}: splash rendered in both builds`, `${theme.splash} ${theme.splashQuery}`);
    addCheck(`${themeId}: navigation labels and geometry compared`, JSON.stringify(navigation.original.nav?.labels ?? []));
    addCheck(`${themeId}: wheel rendered in both builds`, wheel.hash);
    addCheck(`${themeId}: page transition sequence sampled`, transition.original.samples.map((sample) => `${sample.elapsed}:${sample.state.hash}`).join(' | '));
    addCheck(`${themeId}: sound inventory captured`, `matched ${sound.integratedMatched.length}/${sound.expected.length}`);

    await Promise.all([original.close(), integrated.close()]);
  }

  assert.equal(report.pageErrors.length, 0, `pageErrors: ${JSON.stringify(report.pageErrors)}`);
  for (const themeId of ['blue', 'pink', 'yellow']) {
    assert.equal(report.sourceParity[themeId].changed.length, 0, `${themeId}: visual authority files changed`);
    assert.equal(report.sourceParity[themeId].missingOriginal.length, 0, `${themeId}: original files missing`);
    assert.equal(report.sourceParity[themeId].missingIntegrated.length, 0, `${themeId}: integrated files missing`);
  }
  assert.equal(report.sourceParity.red.missingOriginal.length, 0, 'red: original files missing');
  assert.equal(report.sourceParity.red.missingIntegrated.length, 0, 'red: integrated files missing');
  assert.deepEqual(
    report.sourceParity.red.changed.map((file) => file.label).sort(),
    ['src/p5r-red/shell/Navigation.p5r.tsx', 'src/p5r-red/shell/shell.css'],
    'red shell changed outside the documented accessibility/touch-only edits',
  );
  report.originalDemoBaselineFailures = report.localFailures.filter((failure) =>
    failure.side === 'original-yellow' && failure.url.includes('/assets/p4g/official/'));
  report.integratedLocalFailures = report.localFailures.filter((failure) =>
    failure.side.startsWith('integrated-') && !report.originalDemoBaselineFailures.includes(failure));
  assert.equal(report.integratedLocalFailures.length, 0, `integrated localFailures: ${JSON.stringify(report.integratedLocalFailures)}`);
  if (report.originalDemoBaselineFailures.length) {
    addCheck('yellow: original demo baseline 404s preserved as comparison caveat', report.originalDemoBaselineFailures.map((failure) => failure.url).join(' | '));
  }
  report.ok = true;
} catch (error) {
  report.ok = false;
  report.error = error.stack;
  process.exitCode = 1;
} finally {
  writeFileSync(resolve(out, 'report.json'), JSON.stringify(report, null, 2));
  for (const context of Object.values(originalContexts)) await context?.close().catch(() => {});
  await integratedContext?.close().catch(() => {});
  console.log(JSON.stringify({
    ok: report.ok,
    error: report.error,
    checks: report.checks.length,
    pageErrors: report.pageErrors.length,
    localFailures: report.localFailures.length,
    imageComparisons: report.imageComparisons.map((item) => ({
      label: item.label,
      changedRatio: item.changedRatio,
      meanAbsoluteDiff: item.meanAbsoluteDiff,
      error: item.error,
    })),
    sourceParity: Object.fromEntries(Object.entries(report.sourceParity).map(([key, value]) => [key, {
      exactOrAliasOnly: value.exactOrAliasOnly,
      changed: value.changed.length,
      missingOriginal: value.missingOriginal.length,
      missingIntegrated: value.missingIntegrated.length,
    }])),
    evidence: out,
  }, null, 2));
}
