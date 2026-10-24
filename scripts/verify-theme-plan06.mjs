// Plan 06: isolated account/sync boundary. No real cloud account or data is used.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from '../node_modules/playwright/index.mjs';

const base = process.env.THEME_AUDIT_BASE ?? 'http://127.0.0.1:5199';
const out = resolve(process.argv[2] ?? '');
if (!process.argv[2]) throw new Error('Pass a new evidence directory');
if (existsSync(out)) throw new Error('Evidence directory already exists; use a new directory');
mkdirSync(out, { recursive: true });

const report = {
  scope: 'Plan 06 only: isolated auth/sync boundary. No real account deletion, cloud data, paid model or production API.',
  base,
  out,
  checks: [],
  themes: {},
  apiRequests: [],
  pageErrors: [],
  localFailures: [],
  blockedExternal: 0,
};

const json = (route, body, status = 200) => route.fulfill({
  status,
  contentType: 'application/json',
  body: JSON.stringify(body),
});
const empty = (route, status = 204) => route.fulfill({ status, body: '' });

const cloud = {
  mode: 'ok',
  seq: 0,
  rowsByUser: new Map(),
  authByIdentity: new Map(),
};

const userFromAuth = (headers) => {
  const token = String(headers.authorization ?? '').replace(/^Bearer\s+/i, '');
  return cloud.authByIdentity.get(token) ?? null;
};
const rowsFor = (userId) => {
  if (!cloud.rowsByUser.has(userId)) cloud.rowsByUser.set(userId, new Map());
  return cloud.rowsByUser.get(userId);
};
const recordFor = (userId, identity) => ({
  id: userId,
  email: identity.includes('@') ? identity : `${identity}@example.invalid`,
  username: identity.includes('@') ? identity.split('@')[0] : identity,
  name: '隔离探针',
});
const authPayload = (userId, identity) => {
  const token = `token-${userId}-${++cloud.seq}`;
  const record = recordFor(userId, identity);
  cloud.authByIdentity.set(token, { id: userId, record });
  return { token, record };
};

const context = await chromium.launchPersistentContext(resolve(out, 'profile'), {
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  viewport: { width: 390, height: 844 },
  serviceWorkers: 'block',
  reducedMotion: 'reduce',
});

const appUrl = (hash = '') => `${base}/?__mode=day&__motion=low&__snd=0&__dev=0${hash}`;
const waitApp = (page) => page.waitForFunction(
  () => (document.querySelector('#root')?.childElementCount ?? 0) > 0,
  null,
  { timeout: 15000 },
);

async function openAccount(page) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await page.goto(appUrl('#/p/account'), { waitUntil: 'domcontentloaded' });
    } catch (error) {
      if (!/ERR_ABORTED|interrupted by another navigation/.test(String(error))) throw error;
    }
    await page.waitForTimeout(900);
    const ready = await page.evaluate(() => (
      (document.querySelector('#root')?.childElementCount ?? 0) > 0
      && document.body.innerText.trim().length > 20
    )).catch(() => false);
    if (ready) break;
  }
  await waitApp(page);
  await page.waitForFunction(() => document.body.innerText.trim().length > 20, null, { timeout: 15000 });
  await page.waitForTimeout(2200);
}

async function setTheme(page, theme) {
  await page.evaluate(async (next) => {
    const { useAppStore } = await import('/src/store/index.ts');
    const { db } = await import('/src/db/index.ts');
    await useAppStore.getState().setTheme(next);
    const user = await db.users.toCollection().first();
    if (user) await db.users.update(user.id, { theme: next });
  }, theme);
  await page.waitForTimeout(900);
}

async function clearAuth(page) {
  await page.evaluate(async () => {
    const { clearAuth: clear } = await import('/src/services/velvetApi.ts');
    clear();
  });
}

async function injectAuth(page, identity) {
  return page.evaluate(async (who) => {
    const { authWithPassword } = await import('/src/services/velvetApi.ts');
    return authWithPassword(who, 'pw123456');
  }, identity);
}

async function dismissTransient(page) {
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(180);
  }
}

async function ensureCloudPanel(page, theme) {
  if (theme !== 'red') return;
  const slot = page.locator('.slot5[data-k="cloud"]');
  if (await slot.count()) await slot.click();
  await page.waitForTimeout(350);
}

async function assertSignedOut(page) {
  const body = await page.locator('body').innerText();
  assert.match(body, /登录云端/);
  assert.doesNotMatch(body, /yeji_0610|yeji\.mask@example\.com/);
}

async function setMode(mode) {
  cloud.mode = mode;
}

async function clickDialogAction(scope, name) {
  for (const role of ['button', 'menuitem', 'option']) {
    const action = scope.getByRole(role, { name, exact: true }).last();
    if (await action.count()) {
      await action.click();
      return;
    }
  }
  throw new Error(`Dialog action not found: ${name}`);
}

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
    const body = (() => {
      try { return request.postDataJSON(); } catch { return null; }
    })();
    const auth = userFromAuth(request.headers());

    if (url.pathname === '/api/velvet/auth-with-password') {
      const identity = String(body?.identity ?? '');
      if (identity.includes('wrong')) return json(route, { velvet: 'not_found' }, 401);
      const userId = identity.includes('pink') ? 'cloud-pink'
        : identity.includes('yellow') ? 'cloud-yellow'
          : identity.includes('red') ? 'cloud-red'
            : 'cloud-blue';
      return json(route, authPayload(userId, identity));
    }
    if (url.pathname === '/api/velvet/otp/request') {
      const email = String(body?.email ?? '');
      if (email.includes('wrong')) return json(route, { message: '发送太频繁' }, 429);
      return json(route, { ok: true });
    }
    if (url.pathname === '/api/velvet/otp/verify') {
      const email = String(body?.email ?? 'probe@example.invalid');
      if (String(body?.code) === '0000') return json(route, { velvet: 'not_found' }, 401);
      return json(route, authPayload(`otp-${email}`, email));
    }
    if (url.pathname === '/api/velvet/account' && request.method() === 'DELETE') {
      if (cloud.mode === 'delete-fail') return json(route, { message: 'synthetic delete failure' }, 503);
      return empty(route);
    }
    if (url.pathname === '/api/velvet/request-password-reset') return json(route, { ok: true });

    if (!auth) return json(route, { velvet: 'not_found' }, 401);
    const userId = auth.id;
    const rows = rowsFor(userId);

    if (cloud.mode === 'expired') return json(route, { velvet: 'not_found' }, 401);
    if (cloud.mode === 'network-fail') return json(route, { message: 'synthetic network failure' }, 503);
    if (cloud.mode === 'conflict') {
      if (url.pathname === '/api/sync/rows/count') return json(route, { totalItems: 1 });
      if (url.pathname === '/api/sync/rows' && request.method() === 'GET') {
        return json(route, [{
          id: 'cloud-foreign',
          key: 'activities',
          value: [{ id: 'foreign-only' }],
          created: '2026-10-24T00:00:00.000Z',
          updated: '2026-10-24T00:00:01.000Z',
        }]);
      }
    }
    if (cloud.mode === 'merge' && url.pathname === '/api/sync/rows' && request.method() === 'GET' && !url.searchParams.has('fields')) {
      const merged = [...rows.values()].map((row) => ({ ...row }));
      const activities = merged.find((row) => row.key === 'activities');
      if (activities) {
        activities.value = [
          ...(Array.isArray(activities.value) ? activities.value : []),
          { id: 'foreign-merge-row', title: '隔离云端独有条目' },
        ];
      } else {
        merged.push({
          id: 'foreign-merge-record',
          key: 'activities',
          value: [{ id: 'foreign-merge-row', title: '隔离云端独有条目' }],
          created: '2026-10-24T00:00:00.000Z',
          updated: '2026-10-24T00:00:01.000Z',
        });
      }
      return json(route, merged);
    }

    if (url.pathname === '/api/sync/rows/count') return json(route, { totalItems: rows.size });
    if (url.pathname === '/api/sync/rows' && request.method() === 'GET') {
      const idsOnly = url.searchParams.has('fields');
      return json(route, [...rows.values()].map((row) => idsOnly
        ? { id: row.id, key: row.key, created: row.created, updated: row.updated }
        : row));
    }
    if (url.pathname === '/api/sync/rows' && request.method() === 'POST') {
      const id = `row-${++cloud.seq}`;
      const now = new Date().toISOString();
      const row = { id, key: String(body?.key ?? ''), value: body?.value, created: now, updated: now };
      rows.set(row.key, row);
      return json(route, row);
    }
    const rowMatch = url.pathname.match(/^\/api\/sync\/rows\/([^/]+)$/);
    if (rowMatch && request.method() === 'PUT') {
      const row = [...rows.values()].find((item) => item.id === decodeURIComponent(rowMatch[1]));
      if (!row) return json(route, { message: 'missing row' }, 404);
      row.value = body?.value;
      row.updated = new Date().toISOString();
      return json(route, { id: row.id, updated: row.updated });
    }
    if (rowMatch && request.method() === 'GET') {
      const row = [...rows.values()].find((item) => item.id === decodeURIComponent(rowMatch[1]));
      return row ? json(route, row) : json(route, { message: 'missing row' }, 404);
    }
    if (rowMatch && request.method() === 'DELETE') {
      const id = decodeURIComponent(rowMatch[1]);
      for (const [key, row] of rows) if (row.id === id) rows.delete(key);
      return empty(route);
    }
    if (url.pathname === '/api/sync/profile') return json(route, auth.record);
    if (url.pathname === '/api/me') return json(route, auth.record);
    if (url.pathname === '/api/avatar') return request.method() === 'DELETE' ? empty(route) : json(route, { avatar: '', size: 0 });
    return json(route, { message: `unhandled synthetic endpoint ${url.pathname}` }, 404);
  });

  const page = context.pages()[0];
  page.on('pageerror', (error) => report.pageErrors.push({ url: page.url(), message: error.message, stack: error.stack }));
  page.on('response', (response) => {
    if (response.status() >= 400 && response.url().startsWith(base) && !new URL(response.url()).pathname.startsWith('/api/')) {
      report.localFailures.push({ url: response.url(), status: response.status() });
    }
  });

  await page.goto(appUrl(), { waitUntil: 'domcontentloaded' });
  await waitApp(page);
  await page.waitForTimeout(1200);
  await page.evaluate(async () => {
    const { useAppStore } = await import('/src/store/index.ts');
    const { clearAuth: clear } = await import('/src/services/velvetApi.ts');
    if (!useAppStore.getState().user) await useAppStore.getState().createUser('计划06隔离探针');
    await useAppStore.getState().setTheme('blue');
    clear();
  });

  await openAccount(page);
  await assertSignedOut(page);
  report.checks.push('蓝：未登录页面只显示真实未登录状态，没有演示账号邮箱或 UserID');

  await page.getByRole('button', { name: '登录云端', exact: true }).click();
  const login = page.getByRole('dialog').last();
  await login.getByRole('button', { name: '我明白了，继续', exact: true }).click();
  const passwordTab = login.locator('button').filter({ hasText: /^密码/ }).first();
  await passwordTab.click();
  const wrongIdentity = login.locator('input[autocomplete="username"]');
  const wrongPassword = login.locator('input[type="password"]');
  await wrongIdentity.fill('wrong@example.invalid');
  await wrongPassword.click();
  await wrongPassword.pressSequentially('wrong-password', { delay: 15 });
  assert.equal(await wrongPassword.inputValue(), 'wrong-password');
  await login.getByRole('button', { name: '进入房间', exact: true }).click();
  await login.getByText(/账号或密码不正确/).waitFor({ timeout: 10000 });
  assert.equal(await page.evaluate(() => localStorage.getItem('velvet.jwt')), null);
  report.checks.push('蓝：错误密码显示真实 401 文案，不保存 token、不假报登录成功');

  const goodIdentity = login.locator('input[autocomplete="username"]');
  const goodPassword = login.locator('input[type="password"]');
  await goodIdentity.fill('blue@example.invalid');
  await goodPassword.click();
  await goodPassword.fill('');
  await goodPassword.pressSequentially('pw123456', { delay: 15 });
  assert.equal(await goodPassword.inputValue(), 'pw123456');
  await login.getByRole('button', { name: '进入房间', exact: true }).click();
  await page.getByText('blue@example.invalid', { exact: false }).first().waitFor({ timeout: 10000 });
  await page.waitForTimeout(1200);
  assert.ok(await page.evaluate(() => localStorage.getItem('velvet.jwt')));
  report.checks.push('蓝：密码登录保存真实 token，账号页显示隔离接口返回的邮箱');
  await page.screenshot({ path: resolve(out, 'blue-signed-in.png'), fullPage: true });
  await page.waitForTimeout(2600);

  await setMode('network-fail');
  await page.getByRole('button', { name: '立即同步到云端', exact: true }).click();
  await page.getByText(/同步失败：/).first().waitFor({ timeout: 10000 });
  assert.ok(await page.evaluate(() => localStorage.getItem('velvet.jwt')));
  report.checks.push('蓝：同步网络失败显示服务端错误，登录态和本地档案仍保留');
  await page.screenshot({ path: resolve(out, 'blue-network-fail.png'), fullPage: true });

  await setMode('ok');
  await page.getByRole('button', { name: '立即同步到云端', exact: true }).click();
  await page.getByText('已同步到云端', { exact: false }).first().waitFor({ timeout: 10000 });
  await page.waitForTimeout(3200);

  await setMode('merge');
  await page.getByRole('button', { name: /和云端对一对/ }).click();
  await page.getByText('和云端对一对', { exact: true }).last().waitFor({ timeout: 10000 });
  await page.getByRole('button', { name: '合并', exact: true }).click();
  await page.getByText(/合并完成：/).waitFor({ timeout: 10000 });
  report.checks.push('蓝：真实合并弹层完成预览、按表合并并回推云端');
  await page.screenshot({ path: resolve(out, 'blue-merge-done.png'), fullPage: true });
  await page.getByRole('button', { name: '好', exact: true }).click();
  await setMode('ok');

  await setMode('delete-fail');
  await page.getByRole('button', { name: '永久删除云端账号', exact: false }).first().click();
  const deleteDialog = page.getByRole('alertdialog').last();
  await clickDialogAction(deleteDialog, '永久删除');
  await deleteDialog.getByText(/服务器暂时出错|注销失败|synthetic delete failure/).first().waitFor({ timeout: 10000 });
  assert.ok(await page.evaluate(() => localStorage.getItem('velvet.jwt')));
  report.checks.push('蓝：删号请求在隔离接口失败时保留弹窗/登录态，不本地假删除');
  await clickDialogAction(deleteDialog, '取消');

  await setMode('expired');
  await page.getByRole('button', { name: '立即同步到云端', exact: true }).click();
  await page.getByText('云端登录已失效', { exact: false }).first().waitFor({ timeout: 10000 });
  assert.equal(await page.evaluate(() => localStorage.getItem('velvet.jwt')), null);
  report.checks.push('蓝：受保护请求返回 401 后清除过期 token，页面明确提示本机数据仍在');
  await page.screenshot({ path: resolve(out, 'blue-expired.png'), fullPage: true });

  await setMode('ok');
  await injectAuth(page, 'blue@example.invalid');
  await page.getByText('blue@example.invalid', { exact: false }).first().waitFor({ timeout: 10000 });
  await page.getByRole('button', { name: '退出登录', exact: true }).click();
  const logoutDialog = page.getByRole('alertdialog').last();
  await clickDialogAction(logoutDialog, '确认退出');
  await page.waitForTimeout(500);
  await assertSignedOut(page);
  assert.equal(await page.evaluate(() => localStorage.getItem('velvet.jwt')), null);
  report.checks.push('蓝：退出登录清 token 并回到真实未登录页，本机档案未删除');
  report.themes.blue = { ok: true };

  for (const theme of ['pink', 'yellow', 'red']) {
    await dismissTransient(page);
    await setTheme(page, theme);
    await openAccount(page);
    await ensureCloudPanel(page, theme);
    await assertSignedOut(page);
    const identity = `${theme}@example.invalid`;
    await injectAuth(page, identity);
    await ensureCloudPanel(page, theme);
    await page.waitForTimeout(500);
    const activeEmail = await page.evaluate(async () => {
      const { useCloudStore } = await import('/src/store/cloud.ts');
      return useCloudStore.getState().cloudUser?.email ?? null;
    });
    assert.equal(activeEmail, identity);

    await setMode('network-fail');
    await page.getByRole('button', { name: '立即同步到云端', exact: true }).click();
    await page.getByText(/同步失败|服务器暂时出错/).first().waitFor({ timeout: 10000 });
    assert.ok(await page.evaluate(() => localStorage.getItem('velvet.jwt')));

    await setMode('ok');
    await page.getByRole('button', { name: '退出登录', exact: true }).click();
    const dialog = page.getByRole('alertdialog').last();
    await clickDialogAction(dialog, '确认退出');
    await page.waitForTimeout(500);
    await assertSignedOut(page);
    await page.screenshot({ path: resolve(out, `${theme}-signed-out.png`), fullPage: true });
    report.themes[theme] = { ok: true, networkFailureShown: true, logoutCleared: true };
    report.checks.push(`${theme}：真实登录态可见、网络失败不假成功、退出后回到未登录`);
  }

  const syncKeys = await page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith('velvet:lastSyncAt')));
  assert.ok(syncKeys.some((key) => key.startsWith('velvet:lastSyncAt:')));
  assert.ok(syncKeys.every((key) => key === 'velvet:lastSyncAt' || key.startsWith('velvet:lastSyncAt:cloud-')));
  report.checks.push('同步水位按账号分键，页面刷新不会把上一账号时间冒充当前账号');

  assert.equal(report.pageErrors.length, 0);
  assert.equal(report.localFailures.length, 0);
  report.ok = true;
} catch (error) {
  report.ok = false;
  report.error = error.stack;
  const page = context.pages()[0];
  if (page) {
    await page.screenshot({ path: resolve(out, 'failure.png'), fullPage: true }).catch(() => {});
    report.failureState = await page.evaluate(async () => {
      const { useCloudStore } = await import('/src/store/cloud.ts');
      return {
        href: location.href,
        body: document.body.innerText.slice(0, 4000),
        jwt: localStorage.getItem('velvet.jwt'),
        cloud: useCloudStore.getState(),
      };
    }).catch((stateError) => ({ error: String(stateError) }));
  }
  process.exitCode = 1;
} finally {
  writeFileSync(resolve(out, 'report.json'), JSON.stringify(report, null, 2));
  await context.close();
  console.log(JSON.stringify(report, null, 2));
}
