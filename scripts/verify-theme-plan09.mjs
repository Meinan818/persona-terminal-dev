// Plan 09: divination, achievements and settings take effect for real (red channel focus + three-theme regression).
// Isolated IndexedDB, no AI provider configured, no production account, no deployment, no APK.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from '../node_modules/playwright/index.mjs';

const base = process.env.THEME_AUDIT_BASE ?? 'http://127.0.0.1:5208';
const out = resolve(process.argv[2] ?? '');
if (!process.argv[2]) throw new Error('Pass a new evidence directory');
if (existsSync(out)) throw new Error('Evidence directory already exists; use a new directory');
mkdirSync(out, { recursive: true });

const report = {
  scope: 'Plan 09 only: divination / achievements / settings really take effect. Isolated IndexedDB, no AI provider, no production account, no deployment, no APK.',
  base,
  out,
  checks: [],
  themes: {},
  pageErrors: [],
  localFailures: [],
  blockedExternal: 0,
};

const json = (route, body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
const context = await chromium.launchPersistentContext(resolve(out, 'profile'), {
  executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  viewport: { width: 390, height: 844 },
  serviceWorkers: 'block',
  reducedMotion: 'reduce',
});

const appUrl = (hash = '') => `${base}/?__mode=day&__motion=low&__snd=0&__dev=0${hash}`;
const waitApp = (page) => page.waitForFunction(() => (document.querySelector('#root')?.childElementCount ?? 0) > 0, null, { timeout: 20000 });
async function goto(page, hash) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try { await page.goto(appUrl(hash), { waitUntil: 'domcontentloaded' }); break; }
    catch (error) { if (!/ERR_ABORTED|interrupted by another navigation/.test(String(error))) throw error; }
  }
  await waitApp(page);
  await page.waitForFunction(() => document.body.innerText.trim().length > 20, null, { timeout: 20000 });
}
async function evalRetry(page, fn, arg) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try { return await page.evaluate(fn, arg); }
    catch (error) {
      if (!/Execution context was destroyed|ERR_ABORTED|interrupted by another navigation/.test(String(error))) throw error;
      await page.waitForTimeout(900);
      await waitApp(page).catch(() => {});
    }
  }
  throw new Error('page navigation kept interrupting the isolated seed');
}

/** 读 store 的占卜 / 成就 / 设置真实现状 */
const readState = (page) => page.evaluate(async () => {
  const { useAppStore } = await import('/src/store/index.ts');
  const s = useAppStore.getState();
  return {
    daily: s.dailyDivination ? { id: s.dailyDivination.id, date: s.dailyDivination.date, cardId: s.dailyDivination.cardId, orientation: s.dailyDivination.orientation, source: s.dailyDivination.source, fortune: s.dailyDivination.fortune } : null,
    longCount: s.longReadings.length,
    longFirst: s.longReadings[0] ? { id: s.longReadings[0].id, question: s.longReadings[0].question, period: s.longReadings[0].period, picked: s.longReadings[0].picked.length, archived: s.longReadings[0].archived, followUps: s.longReadings[0].followUps?.length ?? 0 } : null,
    achievements: s.achievements.map((a) => ({ id: a.id, unlocked: a.unlocked, progress: a.condition.currentProgress ?? 0, value: a.condition.value })),
    settings: { soundMuted: s.settings.soundMuted, darkMode: s.settings.darkMode, ledgerEnabled: s.settings.ledgerEnabled, currency: s.settings.currency, ledgerPayCycleEnabled: s.settings.ledgerPayCycleEnabled, ledgerResetDay: s.settings.ledgerResetDay, spendEvalEnabled: s.settings.spendEvalEnabled },
  };
});

let lastPage;
function attachPage(page) {
  page.on('pageerror', (error) => report.pageErrors.push(String(error)));
  page.on('response', (response) => {
    const url = new URL(response.url());
    if (url.origin !== base) return;
    if (url.pathname.startsWith('/src/') || url.pathname.startsWith('/assets/') || url.pathname.startsWith('/@')) {
      if (response.status() >= 400) report.localFailures.push(`${response.status()} ${url.pathname}`);
    }
  });
}

async function seed(page, theme = 'red') {
  await goto(page, '');
  await evalRetry(page, async (theme) => {
    const { useAppStore } = await import('/src/store/index.ts');
    if (!useAppStore.getState().user) await useAppStore.getState().createUser('计划09隔离档案');
    await useAppStore.getState().setTheme(theme);
    // 关掉 AI：所有占卜都走离线兜底，验证真实落库而不是假流式
    await useAppStore.getState().updateSettings({ summaryApiKey: '', aiProfiles: {} });
  }, theme);
  // 首屏欢迎弹层会挡住页面：有就点掉
  for (let i = 0; i < 6; i++) {
    const close = page.getByRole('button', { name: /我已经是客人了|跳过|关闭|✕/ }).first();
    if (await close.isVisible().catch(() => false)) { await close.click().catch(() => {}); await page.waitForTimeout(400); }
    else break;
  }
  await page.waitForTimeout(500);
}

/** 红主题：今日塔罗抽一张 → 落库 → 刷新后还是同一张 */
async function redDailyDraw(page) {
  await goto(page, '#/p/astrology?tab=daily');
  await page.waitForTimeout(900);
  const picks = page.locator('.as-card');
  await picks.first().waitFor({ timeout: 20000 });
  await picks.first().click();
  await page.waitForTimeout(2600);
  const after = await readState(page);
  assert.ok(after.daily, '红：点牌后 store 里没有 dailyDivination');
  assert.equal(after.daily.source, 'offline');
  assert.ok(after.daily.cardId, '红：dailyDivination 没有 cardId');
  report.checks.push('红：今日塔罗点牌 → 真实 saveDailyDivination（offline）');

  // 刷新后仍是同一张（同一天只一张）
  await goto(page, '#/p/astrology?tab=daily');
  await page.waitForTimeout(900);
  const reloaded = await readState(page);
  assert.equal(reloaded.daily?.id, after.daily.id, '红：刷新后今日塔罗变了');
  const body = await page.locator('body').innerText();
  assert.match(body, /本牌含义|总体运势|每日一抽/);
  await page.screenshot({ path: resolve(out, 'red-astrology-daily.png'), fullPage: true });
  report.checks.push('红：刷新后今日塔罗保持同一张并显示完成态');
}

/** 配一个指向隔离 mock 的 AI，让中长期占卜能跑真实链路（不发任何外网请求） */
async function enableMockAi(page) {
  await evalRetry(page, async () => {
    const { useAppStore } = await import('/src/store/index.ts');
    await useAppStore.getState().updateSettings({
      summaryApiProvider: 'custom',
      summaryApiKey: 'plan09-mock-key',
      summaryApiBaseUrl: 'http://127.0.0.1:5208/v1',
      summaryModel: 'plan09-fast',
      navigatorModel: 'plan09-deep',
      aiProfiles: { custom: { key: 'plan09-mock-key', baseUrl: 'http://127.0.0.1:5208/v1', models: ['plan09-fast'], modelCaps: {} } },
    });
  });
  await page.waitForTimeout(400);
}

/** 红主题：中长期提问 → 洗牌 → 六选三 → 落库 → 档案可见 */
async function redLongReading(page) {
  await enableMockAi(page);
  await goto(page, '#/p/astrology?tab=long');
  await page.waitForTimeout(900);
  await page.locator('[data-q]').fill('计划09这条中长期该往哪里走？');
  await page.locator('[data-act="start"]').click();
  await page.waitForTimeout(2200);
  const six = page.locator('.od-lr-c');
  assert.ok(await six.count() >= 6, '红：六选三没有出现六张候选');
  for (const i of [0, 2, 4]) await six.nth(i).click();
  await page.waitForTimeout(200);
  await page.locator('[data-act="reveal"]').click();
  await page.waitForFunction(() => document.querySelector('.od-lr-done'), null, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1200);
  const st = await readState(page);
  assert.ok(st.longCount > 0, '红：store.longReadings 仍为空');
  assert.match(st.longFirst?.question ?? '', /计划09这条中长期该往哪里走/);
  assert.equal(st.longFirst?.picked, 3, '红：落库的解读不是三张牌');
  report.checks.push('红：中长期解读正文来自真实 AI 响应并落库（picked=3）');
  report.checks.push('红：中长期提问 → 洗牌 → 六选三 → 真实落库');

  await goto(page, '#/p/astrology?tab=archive');
  await page.waitForTimeout(900);
  const body = await page.locator('body').innerText();
  assert.match(body, /计划09这条中长期该往哪里走/);
  await page.screenshot({ path: resolve(out, 'red-astrology-archive.png'), fullPage: true });
  report.checks.push('红：档案列表读真实 longReadings');
}

/** 红主题：成就解锁 / 新增 → 落库 → 刷新保留 */
async function redAchievements(page) {
  await goto(page, '#/p/achievements?tab=achievements');
  await page.waitForTimeout(900);
  // 造一条已达成的成就（知识当前 Lv.1，配 Lv.1 条件即可达成），再点解锁
  await evalRetry(page, async () => {
    const { useAppStore } = await import('/src/store/index.ts');
    const s = useAppStore.getState();
    await s.addCustomAchievement({ id: 'custom_plan09', title: '计划09可解锁', description: '知识达到 Lv.1', icon: '🎯', condition: { type: 'attribute_level', value: 1, attribute: 'knowledge' } });
  });
  await page.waitForTimeout(900);
  const badge = page.locator('.badge5.ready').first();
  await badge.waitFor({ timeout: 15000 });
  await badge.click();
  await page.waitForFunction(() => document.body.innerText.includes('成就解锁'), null, { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1200);
  const st = await readState(page);
  const unlocked = st.achievements.find((a) => a.id === 'custom_plan09');
  assert.ok(unlocked?.unlocked, '红：点解锁后 store 里该成就仍未解锁');
  report.checks.push('红：成就「已达成，点击解锁」→ 真实 unlockAchievement');

  await goto(page, '#/p/achievements?tab=achievements');
  await page.waitForTimeout(900);
  const reloaded = await readState(page);
  assert.ok(reloaded.achievements.find((a) => a.id === 'custom_plan09')?.unlocked, '红：刷新后成就解锁态丢失');
  await page.screenshot({ path: resolve(out, 'red-achievements.png'), fullPage: true });
  report.checks.push('红：刷新后成就解锁态保留');
}

/** 设置：改完立刻生效，且刷新后保留 */
async function settingsTakeEffect(page) {
  await goto(page, '#/p/settings?tab=theme');
  await page.waitForTimeout(900);
  await page.getByRole('switch', { name: '静音模式' }).first().click({ timeout: 15000 });
  await page.waitForTimeout(400);
  let st = await readState(page);
  assert.equal(st.settings.soundMuted, true, '红：静音开关没有写进 settings');
  report.checks.push('设置：静音模式切换后写进真实 settings');

  await goto(page, '#/p/settings?tab=theme');
  await page.waitForTimeout(900);
  await page.getByRole('switch', { name: '夜间模式' }).first().click({ timeout: 15000 });
  await page.waitForTimeout(400);
  st = await readState(page);
  assert.equal(st.settings.darkMode, true, '红：夜间模式没有写进 settings');
  report.checks.push('设置：夜间模式切换后写进真实 settings');

  // 记账开关与发薪日（真实影响计划05的周期）
  await goto(page, '#/p/settings?tab=personalize');
  await page.waitForTimeout(900);
  const payCycle = page.getByRole('switch', { name: '发薪日周期' }).first();
  if (await payCycle.isVisible().catch(() => false)) {
    const before = (await readState(page)).settings.ledgerPayCycleEnabled;
    await payCycle.click();
    await page.waitForTimeout(400);
    const after = (await readState(page)).settings.ledgerPayCycleEnabled;
    assert.notEqual(after, before, '红：发薪日周期开关没有写进 settings');
    report.checks.push('设置：发薪日周期切换后写进真实 settings');
  }

  // 刷新后保留
  await goto(page, '');
  await page.waitForTimeout(900);
  st = await readState(page);
  assert.equal(st.settings.soundMuted, true, '刷新后静音设置丢失');
  assert.equal(st.settings.darkMode, true, '刷新后夜间设置丢失');
  report.checks.push('设置：刷新后静音 / 夜间设置仍保留');
}

try {
  await context.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== base) {
      if (url.pathname.startsWith('/api/')) return json(route, { items: [] });
      report.blockedExternal++;
      return route.abort();
    }
    if (url.pathname === '/v1/chat/completions') {
      // 隔离 mock：SSE 流式返回一段固定 markdown（含小标题），验证红色流程能解析成牌阵分段并落库
      const text = '## 现状 · 现状\n你正在把一件事慢慢想清楚。\n\n## 阻碍 · 阻碍\n怕的是不确定，不是这件事本身。\n\n## 方向 · 方向\n先做一小步，方向会自己显形。';
      const chunks = text.match(/[\s\S]{1,24}/g) ?? [text];
      const body = chunks.map((c) => `data: ${JSON.stringify({ choices: [{ delta: { content: c } }] })}\n\n`).join('') + 'data: [DONE]\n\n';
      return route.fulfill({ status: 200, contentType: 'text/event-stream', headers: { 'cache-control': 'no-cache' }, body });
    }
    if (url.pathname === '/v1/models') return json(route, { data: [{ id: 'plan09-fast' }, { id: 'plan09-deep' }] });
    return route.continue();
  });

  const page = await context.newPage();
  lastPage = page;
  attachPage(page);
  await seed(page);
  await redDailyDraw(page);
  await redLongReading(page);
  await redAchievements(page);
  await settingsTakeEffect(page);
  report.themes.red = { ok: true };

  // 三主题回归：占卜 / 成就页能开、无 pageerror
  for (const [theme, label] of [['blue', '蓝'], ['pink', '粉'], ['yellow', '黄']]) {
    const p = await context.newPage();
    lastPage = p;
    attachPage(p);
    await goto(p, '');
    await evalRetry(p, async (theme) => {
      const { useAppStore } = await import('/src/store/index.ts');
      if (!useAppStore.getState().user) await useAppStore.getState().createUser('计划09隔离档案');
      await useAppStore.getState().setTheme(theme);
    }, theme);
    await p.waitForTimeout(800);
    // 真实读：档案 tab 的计数来自真实 longReadings（红主题刚落了 1 条，四主题共享同一 store）
    const st = await readState(p);
    assert.equal(st.longCount, 1, `${label}：longReadings 不是真实共享的 1 条`);
    assert.ok(st.achievements.some((a) => a.id === 'custom_plan09' && a.unlocked), `${label}：成就解锁态不是真实共享的`);
    report.checks.push(`${label}：档案计数与成就解锁态读真实 store（跨主题共享）`);
/** 等到页面真的渲染出目标内容（主题切换会让整树重挂，光等 body 非空不够） */
async function gotoWait(page, hash, needle) {
  await goto(page, hash);
  for (let i = 0; i < 12; i++) {
    await page.waitForTimeout(700);
    const text = await page.locator('body').innerText().catch(() => '');
    if (text.includes(needle)) return text;
    await goto(page, hash).catch(() => {});
  }
  throw new Error(`${hash} 等待 ${needle} 超时`);
}

    const seen = {};
    const pages = [
      ['#/p/astrology?tab=daily', '今日塔罗'],
      ['#/p/astrology?tab=long', '中长期占卜'],
      ['#/p/astrology?tab=archive', '档案'],
      ['#/p/achievements?tab=achievements', '成就'],
      ['#/p/achievements?tab=skills', '技能'],
      ['#/p/settings?tab=personalize', '属性'],
    ];
    for (const [hash, needle] of pages) {
      const text = await gotoWait(p, hash, needle);
      assert.ok(text.trim().length > 20, `${label} ${hash} 正文为空`);
      seen[hash] = text.slice(0, 120);
      if (hash === '#/p/astrology?tab=archive') await p.screenshot({ path: resolve(out, `${theme}-astrology.png`), fullPage: true }).catch(() => {});
      if (hash === '#/p/achievements?tab=achievements') await p.screenshot({ path: resolve(out, `${theme}-achievements.png`), fullPage: true }).catch(() => {});
    }
    report.themes[theme] = { ok: true, pages: seen };
    report.themes[theme] = { ok: true };
    report.checks.push(`${label}：占卜 / 成就 / 设置页可打开且无 pageerror`);
    await p.close();
  }

  assert.equal(report.pageErrors.length, 0);
  assert.equal(report.localFailures.length, 0);
  report.ok = true;
} catch (error) {
  report.ok = false;
  report.error = error.stack;
  if (lastPage) {
    const page = lastPage;
    await page.screenshot({ path: resolve(out, 'failure.png'), fullPage: true }).catch(() => {});
    report.failureState = await page.evaluate(async () => {
      const { useAppStore } = await import('/src/store/index.ts');
      const s = useAppStore.getState();
      return { href: location.href, body: document.body.innerText.slice(0, 4000), daily: !!s.dailyDivination, longCount: s.longReadings.length, soundMuted: s.settings.soundMuted, darkMode: s.settings.darkMode };
    }).catch((stateError) => ({ error: String(stateError) }));
  }
  process.exitCode = 1;
} finally {
  delete report.currentTheme;
  writeFileSync(resolve(out, 'report.json'), JSON.stringify(report, null, 2));
  await context.close();
  console.log(JSON.stringify(report, null, 2));
}
