// Plan 08: four-theme hideout reads and real operation writes against isolated mocked APIs.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from '../node_modules/playwright/index.mjs';

const base = process.env.THEME_AUDIT_BASE ?? 'http://127.0.0.1:5207';
const out = resolve(process.argv[2] ?? '');
if (!process.argv[2]) throw new Error('Pass a new evidence directory');
if (existsSync(out)) throw new Error('Evidence directory already exists; use a new directory');
mkdirSync(out, { recursive: true });

const now = '2026-10-24T06:00:00.000Z';
const rawOrg = {
  id: 'org1',
  name: '计划08真实组织',
  motto: '真实读写，不靠 toast',
  emblem: 'star',
  leaderId: 'plan08-cloud',
  inviteCode: 'PLAN08OK',
  tz: 'Asia/Shanghai',
  custom: { levelNames: ['真实据点'] },
  createdAt: now,
  updatedAt: now,
};
const rawMe = {
  id: 'member-me',
  orgId: 'org1',
  userId: 'plan08-cloud',
  slot: 'own',
  seat: 1,
  codename: '计划08我',
  codenameKind: 'custom',
  tarotId: 'fool',
  card: { streak: 3, week: { key: '2026-10-19', days: 31 }, lv: 7, attrs: [
    { id: 'knowledge', name: '知识', level: 2, points: 40 },
    { id: 'guts', name: '胆量', level: 2, points: 35 },
    { id: 'dexterity', name: '灵巧', level: 1, points: 20 },
    { id: 'kindness', name: '温柔', level: 1, points: 18 },
    { id: 'charm', name: '魅力', level: 1, points: 16 },
  ], persona: { name: '真实面具', attribute: 'guts', level: 2, skills: [] }, personas: [
    { name: '真实面具', attribute: 'guts', level: 2, skills: [] },
  ] },
  goal: '完成计划08真实读写',
  goalWeek: '2026-10-19',
  result: 'partial',
  resultWeek: '2026-10-19',
  createdAt: now,
  updatedAt: now,
};
const rawMate = {
  ...rawMe,
  id: 'member-mate',
  userId: 'mate-cloud',
  slot: 'joined',
  seat: 2,
  codename: '计划08真实队友',
  tarotId: 'star',
  card: { ...rawMe.card, lv: 5, persona: null, personas: [] },
  goal: '队友真实目标',
};
const rawMinutes = {
  id: 'minutes-1',
  orgId: 'org1',
  userId: 'plan08-cloud',
  kind: 'minutes',
  text: '',
  snapshot: {
    v: 1,
    week: '2026-10-19',
    rate: { done: 1, total: 2 },
    done: [{ userId: 'plan08-cloud', codename: '计划08我' }],
    goals: [{ userId: 'plan08-cloud', codename: '计划08我', goal: '真实下周目标' }],
    titles: [{ userId: 'plan08-cloud', codename: '计划08我', title: '真实称号', tid: 'ops' }],
    absent: [{ userId: 'mate-cloud', codename: '计划08真实队友' }],
  },
  weekKey: '2026-10-19',
  createdAt: now,
};
const rawMoment = {
  id: 'post-1',
  orgId: 'org1',
  userId: 'mate-cloud',
  kind: 'moment',
  text: '来自真实公告板',
  snapshot: { v: 1, date: '2026-10-24', pts: { guts: 2 }, names: { guts: '胆量' }, by: { codename: '计划08真实队友', tarotId: 'star' } },
  createdAt: now,
};

const report = {
  scope: 'Plan 08 only: hideout real reads/writes. Isolated IndexedDB, mocked organization API, no production account or deployment.',
  base,
  out,
  checks: [],
  themes: {},
  apiRequests: [],
  operationBodies: [],
  pageErrors: [],
  localFailures: [],
  blockedExternal: 0,
};

const json = (route, body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
const empty = (route) => route.fulfill({ status: 204, body: '' });
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
async function gotoHideout(page, tab) {
  for (let attempt = 0; attempt < 3; attempt++) {
    await goto(page, `#/p/hideout?tab=${tab}`);
    await page.waitForTimeout(500);
    if (await page.getByText('计划08真实组织', { exact: false }).first().isVisible().catch(() => false)) return;
  }
  await page.getByText('计划08真实组织', { exact: false }).first().waitFor({ timeout: 15000 });
}
async function evalRetry(page, fn, arg) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      return await page.evaluate(fn, arg);
    } catch (error) {
      if (!/Execution context was destroyed|ERR_ABORTED|interrupted by another navigation/.test(String(error))) throw error;
      await page.waitForTimeout(900);
      await waitApp(page).catch(() => {});
    }
  }
  throw new Error('page navigation kept interrupting the isolated seed');
}

async function themeFlow(page, theme, label) {
  const id = `plan08-${theme}`;
  await goto(page, '');
  await evalRetry(page, async ({ theme, id }) => {
    const { useAppStore } = await import('/src/store/index.ts');
    if (!useAppStore.getState().user) await useAppStore.getState().createUser(`计划08${id}`);
    await useAppStore.getState().setTheme(theme);
  }, { theme, id });
  await page.waitForTimeout(700);
  await waitApp(page).catch(() => {});
  await evalRetry(page, async ({ theme, id }) => {
    const { useAppStore } = await import('/src/store/index.ts');
    const { useCloudStore } = await import('/src/store/cloud.ts');
    const { useCloudSocialStore } = await import('/src/store/cloudSocial.ts');
    const { syncOrgs } = await import('/src/services/orgSync.ts');
    if (!useAppStore.getState().user) await useAppStore.getState().createUser(`计划08${id}`);
    useCloudStore.setState({ cloudUser: { id: 'plan08-cloud', email: 'plan08@example.invalid', username: 'plan08', name: '计划08隔离账号' }, cloudEnabled: true });
    await syncOrgs();
    useCloudSocialStore.getState().setHideoutOrgId('org1');
  }, { theme, id });
  await page.waitForTimeout(1500);

  await gotoHideout(page, 'roster');
  const text = await page.locator('body').innerText();
  assert.match(text, /计划08真实队友/);
  assert.doesNotMatch(text, /坂本龙司|夜读小队|高卷杏/);

  await gotoHideout(page, 'ops');
  if (theme === 'red') {
    await page.locator('[data-act="opnew"]').click();
    await page.locator('[data-goal]').fill(`红主题真实目标${id}`);
    await page.locator('[data-ok]').click();
  } else {
    await page.getByRole('button', { name: /发起/ }).first().click();
    await page.getByPlaceholder(/比如：这周每人跑一次 5 公里/).fill(`${label}真实目标${id}`);
    await page.getByRole('button', { name: '发起这个目标', exact: true }).click();
  }
  await page.waitForTimeout(1200);
  assert.ok(report.operationBodies.some((item) => item.theme === theme), `${theme} operation POST missing`);
  if (theme === 'red') {
    await gotoHideout(page, 'board');
    await page.locator('[data-tag="post-1:strong"]').click();
    await page.waitForFunction(() => import('/src/p5r-red/adapter/hideoutData.ts').then(({ getRedHideoutData }) => getRedHideoutData().posts[0]?.mine === 'strong'), null, { timeout: 10000 });
    assert.ok(report.apiRequests.some((item) => item.method === 'POST' && item.path === '/api/social/orgs/org1/reactions'));
    report.checks.push('红：公告板标签点击等待真实 reaction API，再重绘真实状态');
  }
  await page.screenshot({ path: resolve(out, `${theme}-hideout.png`), fullPage: true });
  report.themes[theme] = { ok: true, memberVisible: true, noFakeMembers: true, operationPosted: true, reactionPosted: theme === 'red' };
  report.checks.push(`${label}：真实组织/成员可读，界面按钮产生真实作战 POST`);
}

let opSeq = 0;
let lastPage;
try {
  await context.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== base) {
      if (url.pathname.startsWith('/api/')) {
        report.apiRequests.push({ method: request.method(), path: url.pathname, external: true });
        return route.abort();
      }
      report.blockedExternal++;
      return route.abort();
    }
    if (!url.pathname.startsWith('/api/')) return route.continue();
    report.apiRequests.push({ method: request.method(), path: url.pathname });

    if (url.pathname === '/api/velvet/auth-with-password') {
      return json(route, { token: 'plan08-token', record: { id: 'plan08-cloud', email: 'plan08@example.invalid', username: 'plan08', name: '计划08隔离账号' } });
    }
    if (url.pathname === '/api/me' || url.pathname === '/api/sync/profile') {
      return json(route, { id: 'plan08-cloud', email: 'plan08@example.invalid', username: 'plan08', name: '计划08隔离账号' });
    }
    if (url.pathname === '/api/social/orgs' && request.method() === 'GET') {
      return json(route, { items: [{ org: rawOrg, member: rawMe }] });
    }
    if (url.pathname === '/api/social/orgs/org1' && request.method() === 'GET') return json(route, rawOrg);
    if (url.pathname === '/api/social/orgs/org1/members') return json(route, { items: [rawMe, rawMate] });
    if (url.pathname === '/api/social/orgs/org1/board') return json(route, { posts: [rawMoment], reactions: [] });
    if (url.pathname === '/api/social/orgs/org1/ledger') return json(route, { items: [rawMinutes] });
    if (url.pathname === '/api/social/orgs/org1/raids') return json(route, { raids: [], hits: [] });
    if (url.pathname === '/api/social/orgs/org1/ops' && request.method() === 'POST') {
      const body = JSON.parse(request.postData() || '{}');
      const theme = report.currentTheme;
      report.operationBodies.push({ theme, ...body });
      const op = {
        id: `op-${++opSeq}`, orgId: 'org1', initiatorId: 'plan08-cloud', kind: body.kind || 'small', attr: body.attr || 'guts',
        title: body.title || '', deadline: body.deadline || '2026-10-31', participants: body.participants || [],
        assignments: body.assignments || {}, status: 'active', createdAt: now, updatedAt: now,
      };
      return json(route, op);
    }
    if (url.pathname === '/api/social/orgs/org1/ops') return json(route, { ops: [], checkins: [] });
    if (url.pathname === '/api/social/orgs/org1/reactions' && request.method() === 'POST') {
      const body = JSON.parse(request.postData() || '{}');
      return json(route, { id: 'reaction-1', postId: body.postId, orgId: 'org1', userId: 'plan08-cloud', tag: body.tag, createdAt: now, updatedAt: now });
    }
    if (url.pathname.startsWith('/api/social/orgs/')) return json(route, { items: [], posts: [], reactions: [], ops: [], checkins: [], raids: [], hits: [] });
    if (url.pathname === '/api/sync/rows/count') return json(route, { totalItems: 0 });
    if (url.pathname === '/api/sync/rows') return json(route, request.method() === 'GET' ? [] : {});
    if (url.pathname === '/api/avatar') return json(route, { avatar: '', size: 0 });
    if (url.pathname.startsWith('/api/social/')) return json(route, { items: [] });
    return json(route, {});
  });

  const attachPage = (page) => {
    page.on('pageerror', (error) => report.pageErrors.push({ url: page.url(), message: error.message, stack: error.stack }));
    page.on('response', (response) => {
      if (response.status() >= 400 && response.url().startsWith(base) && !new URL(response.url()).pathname.startsWith('/api/')) {
        report.localFailures.push({ url: response.url(), status: response.status() });
      }
    });
  };
  lastPage = context.pages()[0];
  attachPage(lastPage);

  await goto(lastPage, '');
  await evalRetry(lastPage, async () => {
    const { authWithPassword } = await import('/src/services/velvetApi.ts');
    await authWithPassword('plan08@example.invalid', 'pw123456');
  });
  await lastPage.waitForTimeout(500);
  for (const [theme, label] of [['blue', '蓝'], ['pink', '粉'], ['yellow', '黄'], ['red', '红']]) {
    report.currentTheme = theme;
    const page = await context.newPage();
    lastPage = page;
    attachPage(page);
    await themeFlow(page, theme, label);
    await page.close();
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
      const { useCloudSocialStore } = await import('/src/store/cloudSocial.ts');
      return { href: location.href, body: document.body.innerText.slice(0, 6000), orgs: useCloudSocialStore.getState().orgs };
    }).catch((stateError) => ({ error: String(stateError) }));
  }
  process.exitCode = 1;
} finally {
  delete report.currentTheme;
  writeFileSync(resolve(out, 'report.json'), JSON.stringify(report, null, 2));
  await context.close();
  console.log(JSON.stringify(report, null, 2));
}
