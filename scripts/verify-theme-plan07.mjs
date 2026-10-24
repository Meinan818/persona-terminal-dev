// Plan 07: companion/confidant real paths, isolated browser profile and mocked social APIs.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from '../node_modules/playwright/index.mjs';

const base = process.env.THEME_AUDIT_BASE ?? 'http://127.0.0.1:5207';
const out = resolve(process.argv[2] ?? '');
if (!process.argv[2]) throw new Error('Pass a new evidence directory');
if (existsSync(out)) throw new Error('Evidence directory already exists; use a new directory');
mkdirSync(out, { recursive: true });

const report = {
  scope: 'Plan 07 only: companionship real paths. No paid AI, production API, account deletion or deployment.',
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
const empty = (route) => route.fulfill({ status: 204, body: '' });
const profile = {
  id: 'friend-cloud',
  username: 'probe_friend',
  nickname: '隔离好友',
  total_lv: 12,
  attribute_levels: { knowledge: 3, guts: 2, dexterity: 2, kindness: 4, charm: 1 },
};
const friendship = {
  id: 'friendship-1',
  userAId: 'friend-cloud',
  userBId: 'plan07-cloud',
  initiatorId: 'friend-cloud',
  status: 'accepted',
  created: '2026-10-20T00:00:00.000Z',
  updated: '2026-10-20T00:00:00.000Z',
  expand: { other: profile },
};
const bond = {
  id: 'bond-1',
  status: 'pending',
  initiatorId: 'friend-cloud',
  userAId: 'plan07-cloud',
  userBId: 'friend-cloud',
  arcanaAId: 'sun',
  arcanaBId: 'moon',
  arcanaAOrientation: 'upright',
  arcanaBOrientation: 'upright',
  intimacyALevel: 3,
  intimacyBLevel: 4,
  skillAttributeA: 'charm',
  skillAttributeB: 'kindness',
  messageA: '',
  messageB: '隔离 COOP 留言',
  decayA: false,
  decayB: false,
  otherProfile: profile,
  created: '2026-10-20T00:00:00.000Z',
  updated: '2026-10-20T00:00:00.000Z',
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

async function goto(page, hash) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await page.goto(appUrl(hash), { waitUntil: 'domcontentloaded' });
      break;
    } catch (error) {
      if (!/ERR_ABORTED|interrupted by another navigation/.test(String(error))) throw error;
    }
  }
  await waitApp(page);
  await page.waitForFunction(() => document.body.innerText.trim().length > 20, null, { timeout: 15000 });
}

async function seed(page, theme, suffix) {
  const id = `plan07-${theme}`;
  await page.evaluate(async ({ theme, suffix }) => {
    const { useAppStore } = await import('/src/store/index.ts');
    const { clearAuth } = await import('/src/services/velvetApi.ts');
    clearAuth();
    if (!useAppStore.getState().user) await useAppStore.getState().createUser(`计划07${suffix}`);
    await useAppStore.getState().setTheme(theme);
  }, { theme, suffix });
  await page.waitForTimeout(1200);
  await waitApp(page).catch(() => {});
  await page.evaluate(async ({ id, suffix }) => {
    const { useAppStore } = await import('/src/store/index.ts');
    const { db } = await import('/src/db/index.ts');
    await db.confidants.clear();
    await db.confidantEvents.clear();
    const user = useAppStore.getState().user;
    const now = new Date();
    await db.confidants.add({
      id,
      userId: user.id,
      source: 'offline',
      name: `计划07${suffix}`,
      arcanaId: 'star',
      orientation: 'upright',
      description: '计划07隔离同伴',
      aiInterpretation: '一段真实写入的解读',
      aiAdvice: '今天多问一句',
      intimacy: 1,
      intimacyPoints: 8,
      buffs: [],
      decayEnabled: false,
      starShiftCharges: 0,
      createdAt: now,
      lastInteractionAt: now,
    });
    await useAppStore.getState().loadConfidants();
  }, { id, suffix });
  await page.waitForTimeout(900);
  return id;
}

async function auth(page) {
  return page.evaluate(async () => {
    const { authWithPassword } = await import('/src/services/velvetApi.ts');
    return authWithPassword('plan07@example.invalid', 'pw123456');
  });
}

async function readConfidant(page, id) {
  return page.evaluate(async (id) => {
    const { useAppStore } = await import('/src/store/index.ts');
    const { db } = await import('/src/db/index.ts');
    const row = await db.confidants.get(id);
    const events = await db.confidantEvents.where('confidantId').equals(id).toArray();
    return {
      intimacy: row?.intimacy,
      intimacyPoints: row?.intimacyPoints,
      charges: row?.starShiftCharges ?? 0,
      archivedAt: row?.archivedAt ?? null,
      queue: useAppStore.getState().confidantRankUpQueue.filter((item) => item.confidantId === id),
      starEvents: events.filter((event) => event.type === 'star_shift').length,
      conversationEvents: events.filter((event) => event.type === 'conversation').length,
    };
  }, id);
}

async function blueFlow(page) {
  const id = await seed(page, 'blue', '蓝');
  await goto(page, '#/p/cooperation?view=list');
  await page.getByText(`计划07蓝`, { exact: true }).first().waitFor({ timeout: 15000 });
  await page.getByRole('button', { name: /计划07蓝/ }).first().click();
  await page.getByRole('button', { name: /今日互动/ }).last().click();
  await page.getByRole('textbox').last().fill('今天一起完成了计划07的隔离互动验证');
  await page.getByRole('button', { name: '解读这一段', exact: true }).click();
  await page.getByText('建议加点（可调整）', { exact: true }).waitFor({ timeout: 10000 });
  await page.getByRole('button', { name: '就这样记下', exact: true }).click();

  await page.locator('.rk-root').waitFor({ timeout: 10000 });
  assert.equal(await page.locator('.rk-root').count(), 1);
  const afterSave = await readConfidant(page, id);
  assert.equal(afterSave.intimacy, 2);
  assert.equal(afterSave.charges, 1);
  assert.equal(afterSave.queue.length, 1);
  await page.locator('.rk-confirm.on').waitFor({ timeout: 10000 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: resolve(out, 'blue-rankup.png'), fullPage: true });
  report.checks.push('蓝：真实互动写入触发 1 条升级队列，页面本地链未重复播放');

  await page.locator('.rk-root .go').click();
  await page.getByRole('button', { name: /使用星移/ }).waitFor({ timeout: 10000 });
  await page.getByRole('button', { name: /使用星移/ }).click();
  await page.getByRole('button', { name: /重新落墨/ }).waitFor({ timeout: 10000 });
  await page.getByRole('button', { name: /重新落墨/ }).click();
  await page.getByRole('button', { name: '落墨', exact: true }).click();
  await page.waitForFunction(async (id) => {
    const { db } = await import('/src/db/index.ts');
    return (await db.confidants.get(id))?.starShiftCharges === 0;
  }, id, { timeout: 10000 });
  const afterShift = await readConfidant(page, id);
  assert.equal(afterShift.charges, 0);
  assert.equal(afterShift.starEvents, 1);
  report.checks.push('蓝：升级恭喜进入真实星移，只扣 1 次并写 1 条星移事件');

  await page.waitForTimeout(1800);
  await goto(page, '#/p/cooperation?view=list');
  await page.getByRole('button', { name: /计划07蓝/ }).first().click();
  await page.getByRole('button', { name: '暂时归档', exact: true }).click();
  await page.waitForFunction(async (id) => {
    const { db } = await import('/src/db/index.ts');
    return !!(await db.confidants.get(id))?.archivedAt;
  }, id, { timeout: 10000 }).catch(async (error) => {
    const state = await readConfidant(page, id);
    throw new Error(`blue archive failed: ${JSON.stringify(state)}; ${error.message}`);
  });
  const archived = await readConfidant(page, id);
  assert.ok(archived.archivedAt);
  report.checks.push('蓝：归档按钮等待真实数据库写入后才反馈成功');
  report.themes.blue = { ok: true };
}

async function pinkFlow(page) {
  const id = await seed(page, 'pink', '粉');
  await goto(page, '#/p/cooperation?view=list');
  await page.getByText('计划07粉', { exact: true }).first().waitFor({ timeout: 15000 });
  await page.getByRole('button', { name: /计划07粉/ }).first().click();
  await page.getByRole('button', { name: /今日互动/ }).last().click();
  await page.getByRole('textbox').last().fill('今天和计划07粉一起完成了粉主题互动');
  await page.getByRole('button', { name: '解读这一段', exact: true }).click();
  await page.getByText('建议加点（可调整）', { exact: true }).waitFor({ timeout: 10000 });
  await page.getByRole('button', { name: '就这样记下', exact: true }).click();
  await page.locator('.rk-root').waitFor({ timeout: 10000 });
  assert.equal(await page.locator('.rk-root').count(), 1);
  const state = await readConfidant(page, id);
  assert.equal(state.intimacy, 2);
  assert.equal(state.charges, 1);
  assert.equal(state.queue.length, 1);
  await page.locator('.rk-confirm.on').waitFor({ timeout: 10000 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: resolve(out, 'pink-rankup.png'), fullPage: true });
  report.checks.push('粉：真实互动只生成 1 条全局升级事件，页面本地链未重复播放');
  await page.locator('.rk-root .go').click();
  await page.getByRole('button', { name: '稍后再说', exact: true }).waitFor({ timeout: 10000 });
  await page.getByRole('button', { name: '稍后再说', exact: true }).click();
  await page.waitForFunction((id) => {
    return import('/src/store/index.ts').then(({ useAppStore }) =>
      useAppStore.getState().confidantRankUpQueue.every((item) => item.confidantId !== id),
    );
  }, id, { timeout: 10000 });
  report.themes.pink = { ok: true };
}

async function onlineFlow(page) {
  await auth(page);
  await goto(page, '#/p/cooperation?filter=online&view=list');
  await page.getByRole('button', { name: '邀请在线同伴', exact: true }).click();
  await page.getByPlaceholder('fuuka.y').fill('probe_friend');
  await page.getByRole('button', { name: '搜索', exact: true }).click();
  await page.getByText('@probe_friend', { exact: false }).waitFor({ timeout: 10000 });
  await page.getByRole('button', { name: '发送申请', exact: true }).click();
  await page.getByText('申请已送出', { exact: true }).waitFor({ timeout: 10000 });
  await page.screenshot({ path: resolve(out, 'blue-online-invite.png'), fullPage: true });
  assert.ok(report.apiRequests.some((item) => item.path === '/api/social/users'));
  assert.ok(report.apiRequests.some((item) => item.path === '/api/social/friends/request'));
  report.checks.push('蓝：在线邀请使用真实用户搜索与好友申请接口，成功后才显示已送出');

  const result = await page.evaluate(async () => {
    const { coopBondOps } = await import('/src/themes/cooperationData.ts');
    const proposed = await coopBondOps.propose({
      targetUserId: 'friend-cloud',
      arcanaId: 'star',
      orientation: 'upright',
      intimacyLevel: 4,
      skillAttribute: 'charm',
      message: '计划07隔离提议',
    });
    const accepted = await coopBondOps.accept({
      bondId: proposed.id,
      arcanaId: 'moon',
      orientation: 'reversed',
      intimacyLevel: 5,
      skillAttribute: 'kindness',
      message: '接受隔离提议',
    });
    const rejected = await coopBondOps.reject(accepted.id);
    return { proposed: proposed.status, accepted: accepted.status, rejected: rejected.status };
  });
  assert.deepEqual(result, { proposed: 'pending', accepted: 'linked', rejected: 'rejected' });
  assert.ok(report.apiRequests.some((item) => item.path === '/api/social/coop/bonds/propose'));
  assert.ok(report.apiRequests.some((item) => item.path === '/api/social/coop/bonds/bond-1/accept'));
  assert.ok(report.apiRequests.some((item) => item.path === '/api/social/coop/bonds/bond-1/reject'));
  report.checks.push('蓝：COOP 提议、接受、拒绝走隔离 API，状态由服务响应决定');
}

async function yellowFlow(page) {
  const id = await seed(page, 'yellow', '黄');
  await goto(page, '#/p/cooperation?view=list');
  await page.getByText('计划07黄', { exact: true }).first().waitFor({ timeout: 15000 });
  await page.getByRole('button', { name: /计划07黄/ }).first().click();
  await page.getByRole('button', { name: /今日互动/ }).last().click();
  await page.getByRole('textbox').last().fill('今天和计划07黄一起完成了黄主题互动');
  await page.getByRole('button', { name: '解读这一段', exact: true }).click();
  await page.getByText('建议加点（可调整）', { exact: true }).waitFor({ timeout: 10000 });
  await page.getByRole('button', { name: '就这样记下', exact: true }).click();
  await page.getByRole('dialog', { name: /亲密度升级/ }).waitFor({ timeout: 12000 });
  assert.equal(await page.getByRole('dialog', { name: /亲密度升级/ }).count(), 1);
  const state = await readConfidant(page, id);
  assert.equal(state.intimacy, 2);
  assert.equal(state.queue.length, 1);
  assert.equal(state.charges, 1);
  report.checks.push('黄：真实互动触发原 P4 升级链 1 次，实际星移次数不再额外 +1');
  await page.getByRole('button', { name: '继续收看', exact: true }).waitFor({ timeout: 10000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: resolve(out, 'yellow-rankup.png'), fullPage: true });
  await page.getByRole('button', { name: '继续收看', exact: true }).click();
  await page.waitForFunction((id) => {
    return import('/src/store/index.ts').then(({ useAppStore }) =>
      useAppStore.getState().confidantRankUpQueue.every((item) => item.confidantId !== id),
    );
  }, id, { timeout: 10000 });
  report.checks.push('黄：升级链确认后消费同一队列，不残留重复事件');
  report.themes.yellow = { ok: true };
}

async function redFlow(page) {
  const id = await seed(page, 'red', '红');
  await goto(page, '#/p/cooperation');
  await page.getByText('计划07红', { exact: true }).first().waitFor({ timeout: 18000 });
  await page.locator('[data-cpi], .tarot5').first().click();
  await page.locator('[data-a="interact"]').last().click();
  await page.locator('[data-in="t"]').fill('今天和计划07红一起完成了红主题互动');
  await page.locator('[data-a="eval"]').click();
  await page.locator('[data-a="ok"]').waitFor({ timeout: 10000 });
  await page.locator('[data-a="ok"]').click();
  await page.locator('.rk5-root').waitFor({ timeout: 12000 });
  assert.equal(await page.locator('.rk5-root').count(), 1);
  const state = await readConfidant(page, id);
  assert.equal(state.intimacy, 2);
  assert.equal(state.charges, 1);
  report.checks.push('红：命令式互动等待真实 store/Dexie 写入，升级由全局 P5 演出消费 1 次');
  await page.locator('.rk5-confirm.on').waitFor({ timeout: 10000 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: resolve(out, 'red-rankup.png'), fullPage: true });
  await page.waitForTimeout(1200);
  await page.locator('.rk5-confirm .go').click();
  await page.getByRole('button', { name: /使用星移/ }).waitFor({ timeout: 10000 });
  await page.getByRole('button', { name: /使用星移/ }).click();
  await page.getByRole('button', { name: /重新落墨/ }).waitFor({ timeout: 10000 });
  await page.getByRole('button', { name: /重新落墨/ }).click();
  await page.getByRole('button', { name: '落墨', exact: true }).waitFor({ timeout: 10000 });
  await page.getByRole('button', { name: '落墨', exact: true }).click();
  await page.waitForFunction(async (id) => {
    const { db } = await import('/src/db/index.ts');
    return (await db.confidants.get(id))?.starShiftCharges === 0;
  }, id, { timeout: 10000 });
  const shifted = await readConfidant(page, id);
  assert.equal(shifted.starEvents, 1);
  report.checks.push('红：升级后的星移由同一 P5 全局链消费，次数和事件只写 1 次');
  await page.waitForTimeout(1800);
  await goto(page, '#/p/cooperation');
  await page.locator('[data-cpi], .tarot5').first().click();
  await page.locator('[data-a="archive"]').last().click();
  await page.waitForFunction(async (id) => {
    const { db } = await import('/src/db/index.ts');
    return !!(await db.confidants.get(id))?.archivedAt;
  }, id, { timeout: 10000 });
  report.checks.push('红：归档写入真实 store/Dexie 后才更新详情状态');
  report.themes.red = { ok: true };
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
    if (url.pathname === '/api/velvet/auth-with-password') {
      return json(route, {
        token: 'plan07-token',
        record: { id: 'plan07-cloud', email: 'plan07@example.invalid', username: 'plan07', name: '计划07隔离账号' },
      });
    }
    if (url.pathname === '/api/me' || url.pathname === '/api/sync/profile') {
      return json(route, { id: 'plan07-cloud', email: 'plan07@example.invalid', username: 'plan07', name: '计划07隔离账号' });
    }
    if (url.pathname === '/api/social/users') return json(route, profile);
    if (url.pathname === '/api/social/friends/request') {
      return json(route, { ...friendship, status: 'pending' });
    }
    if (url.pathname === '/api/social/friends') return json(route, { items: [friendship] });
    if (url.pathname === '/api/social/prayers/today') return json(route, { items: [] });
    if (url.pathname === '/api/social/notifications') return json(route, { items: [] });
    if (url.pathname === '/api/social/coop/bonds' && request.method() === 'GET') return json(route, { items: [] });
    if (url.pathname === '/api/social/coop/bonds/propose') return json(route, { ...bond, status: 'pending', initiatorId: 'plan07-cloud' });
    if (url.pathname.endsWith('/accept')) return json(route, { ...bond, status: 'linked' });
    if (url.pathname.endsWith('/reject')) return json(route, { ...bond, status: 'rejected' });
    if (url.pathname.endsWith('/sever')) return json(route, { ...bond, status: 'severed' });
    if (url.pathname === '/api/sync/rows/count') return json(route, { totalItems: 0 });
    if (url.pathname === '/api/sync/rows') return json(route, request.method() === 'GET' ? [] : {});
    if (url.pathname.startsWith('/api/social/')) return json(route, { items: [] });
    if (url.pathname === '/api/avatar') return json(route, { avatar: '', size: 0 });
    return json(route, {});
  });

  const page = context.pages()[0];
  page.on('pageerror', (error) => report.pageErrors.push({ url: page.url(), message: error.message, stack: error.stack }));
  page.on('response', (response) => {
    if (response.status() >= 400 && response.url().startsWith(base) && !new URL(response.url()).pathname.startsWith('/api/')) {
      report.localFailures.push({ url: response.url(), status: response.status() });
    }
  });

  await goto(page, '');
  await blueFlow(page);
  await pinkFlow(page);
  await onlineFlow(page);
  await yellowFlow(page);
  await redFlow(page);

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
      const { useAppStore } = await import('/src/store/index.ts');
      const { db } = await import('/src/db/index.ts');
      return {
        href: location.href,
        body: document.body.innerText.slice(0, 6000),
        confidants: await db.confidants.toArray(),
        events: await db.confidantEvents.toArray(),
        queue: useAppStore.getState().confidantRankUpQueue,
        invite: useAppStore.getState().starShiftInvite,
      };
    }).catch((stateError) => ({ error: String(stateError) }));
  }
  process.exitCode = 1;
} finally {
  writeFileSync(resolve(out, 'report.json'), JSON.stringify(report, null, 2));
  await context.close();
  console.log(JSON.stringify(report, null, 2));
}
