// Plan 04: real task/growth writes in an isolated browser profile. No login, API or paid AI.
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from '../node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';

const base = process.env.THEME_AUDIT_BASE ?? 'http://127.0.0.1:5197';
const out = resolve(process.argv[2] ?? '');
if (!process.argv[2]) throw new Error('Pass a new evidence directory');
if (existsSync(out)) throw new Error('Evidence directory already exists; use a new directory');

mkdirSync(out, { recursive: true });
const report = {
  scope: 'Plan 04 only: blue full task/growth loop, then pink/yellow/red regression. Isolated profile; no API or paid AI.',
  base,
  out,
  checks: [],
  themes: {},
  pageerrors: [],
  localFailures: [],
  blocked: 0,
};

const context = await chromium.launchPersistentContext(resolve(out, 'profile'), {
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  viewport: { width: 390, height: 844 },
  serviceWorkers: 'block',
  reducedMotion: 'reduce',
});

const closeCompletion = async (page) => {
  const close = page.getByRole('button', { name: '关闭' }).last();
  if (await close.count()) await close.click({ force: true });
  const record = page.getByRole('button', { name: '记录这一刻', exact: true }).last();
  if (await record.count()) await record.click({ force: true });
};

const taskState = (page, title) => page.evaluate(async (wanted) => {
  const { db } = await import('/src/db/index.ts');
  const todo = await db.todos.filter((row) => row.title === wanted).first();
  const completions = todo ? await db.todoCompletions.where('todoId').equals(todo.id).toArray() : [];
  const activities = todo ? await db.activities.filter((row) => row.description === `完成任务: ${wanted}`).toArray() : [];
  return {
    todo: todo ?? null,
    completions,
    activities,
    count: completions.reduce((sum, row) => sum + row.count, 0),
  };
}, title);

try {
  await context.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== base || url.pathname.startsWith('/api/')) {
      report.blocked++;
      return route.abort();
    }
    return route.continue();
  });

  const page = context.pages()[0];
  page.on('pageerror', (error) => report.pageerrors.push({ url: page.url(), message: error.message, stack: error.stack }));
  page.on('response', (response) => {
    if (response.status() >= 400 && response.url().startsWith(base) && !new URL(response.url()).pathname.startsWith('/api/')) {
      report.localFailures.push({ url: response.url(), status: response.status() });
    }
  });

  await page.goto(`${base}/?__mode=day&__motion=low&__snd=0&__dev=0`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => (document.querySelector('#root')?.childElementCount ?? 0) > 0, null, { timeout: 15000 });
  await page.evaluate(async () => {
    const { useAppStore } = await import('/src/store/index.ts');
    const { db } = await import('/src/db/index.ts');
    if (!useAppStore.getState().user) await useAppStore.getState().createUser('计划04隔离探针');
    await db.todos.clear();
    await db.todoCompletions.clear();
    await db.activities.clear();
    await db.wishes.clear();
    await useAppStore.getState().loadData();
    await useAppStore.getState().setTheme('blue');
    const s = useAppStore.getState();
    await s.addTodo({
      title: '计划04-计次', attribute: 'knowledge', points: 1, frequency: 'count', targetCount: 3,
      repeatDaily: true, isActive: true, important: false,
    });
    await s.addTodo({
      title: '计划04-升级', attribute: 'guts', points: 40, frequency: 'single', targetCount: 1,
      repeatDaily: false, isActive: true, important: true,
    });
    await s.addTodo({
      title: '计划04-BIG-DEAL', attribute: 'dexterity', points: 2, frequency: 'single', targetCount: 1,
      repeatDaily: false, isActive: true, important: true, isBigDeal: true,
      steps: [
        { id: 'plan04-step-1', title: '第一步', source: 'manual', done: false },
        { id: 'plan04-step-2', title: '第二步', source: 'manual', done: false },
      ],
    });
  });

  await page.goto(`${base}/?__mode=day&__motion=low&__snd=0&__dev=0#/p/actions?tab=todos`, { waitUntil: 'domcontentloaded' });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByText('计划04-计次', { exact: true }).waitFor({ timeout: 15000 });

  const countTask = page.getByRole('button').filter({ hasText: '计划04-计次' }).first();
  for (let i = 1; i <= 3; i++) {
    await countTask.click();
    await page.waitForTimeout(250);
    const state = await taskState(page, '计划04-计次');
    assert.equal(state.count, i);
    if (i < 3) assert.equal(state.activities.length, 0);
  }
  await page.getByRole('dialog', { name: '今日完成：计划04-计次' }).waitFor();
  await page.screenshot({ path: resolve(out, 'blue-count-complete.png'), fullPage: true });
  report.checks.push('蓝：计次任务 1/3、2/3 只记进度，3/3 才发奖励与完成条');
  await closeCompletion(page);

  let saved = await taskState(page, '计划04-计次');
  assert.equal(saved.activities.length, 1);
  assert.equal(saved.todo.isActive, true, 'daily count task stays active for the next day');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByText('计划04-计次', { exact: true }).waitFor({ timeout: 15000 });
  saved = await taskState(page, '计划04-计次');
  assert.equal(saved.count, 3);
  assert.equal(saved.activities.length, 1);
  report.checks.push('蓝：刷新后完成计数、奖励记录与每日任务状态保留');

  await page.getByTitle('撤销今日完成（同时回退点数和记录）').first().click();
  await page.waitForTimeout(400);
  saved = await taskState(page, '计划04-计次');
  assert.equal(saved.count, 0);
  assert.equal(saved.activities.length, 0);
  assert.equal(saved.todo.isActive, true);
  report.checks.push('蓝：任务页撤销今日完成，计数/记录/归档一起回退');

  await page.getByRole('button', { name: '添加任务' }).click();
  await page.getByLabel('任务标题').fill('计划04-新建');
  await page.getByRole('button', { name: '添加', exact: true }).click();
  await page.getByText('计划04-新建', { exact: true }).waitFor();
  saved = await taskState(page, '计划04-新建');
  assert.ok(saved.todo?.id);
  assert.notEqual(saved.todo.id, '');
  report.checks.push('蓝：任务页新建写入真实 ID');

  const newRow = page.getByRole('button').filter({ hasText: '计划04-新建' }).first();
  await newRow.scrollIntoViewIfNeeded();
  await newRow.evaluate((element) => {
    element.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch', clientX: 30, clientY: 30 }));
  });
  await page.waitForTimeout(620);
  await newRow.evaluate((element) => {
    element.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerType: 'touch', clientX: 30, clientY: 30 }));
  });
  await page.getByText('编辑', { exact: true }).last().click();
  await page.getByLabel('任务标题').fill('计划04-已编辑');
  await page.getByRole('button', { name: '保存', exact: true }).click();
  await page.getByText('计划04-已编辑', { exact: true }).waitFor();
  assert.equal((await taskState(page, '计划04-新建')).todo, null);
  assert.ok((await taskState(page, '计划04-已编辑')).todo?.id);
  report.checks.push('蓝：任务页长按编辑落库');

  await page.getByRole('button').filter({ hasText: '计划04-已编辑' }).first().getByTitle('归档（不启用）').click();
  await page.waitForTimeout(300);
  saved = await taskState(page, '计划04-已编辑');
  assert.equal(saved.todo.isActive, false);
  report.checks.push('蓝：任务页归档落库并更新列表');

  await page.getByRole('button', { name: '今日任务（点击切到愿望）' }).click();
  await page.getByRole('button', { name: '＋ 记下一个愿望' }).click();
  await page.getByLabel('愿望标题').fill('计划04-愿望');
  await page.getByRole('button', { name: '记下', exact: true }).click();
  await page.getByText('计划04-愿望', { exact: true }).waitFor();
  await page.getByRole('button', { name: '「计划04-愿望」的操作' }).click();
  await page.getByRole('button', { name: '收起', exact: true }).click();
  await page.waitForTimeout(350);
  const wish = await page.evaluate(async () => {
    const { db } = await import('/src/db/index.ts');
    return db.wishes.filter((row) => row.title === '计划04-愿望').first();
  });
  assert.equal(wish.status, 'archived');
  await page.screenshot({ path: resolve(out, 'blue-wish-archived.png'), fullPage: true });
  report.checks.push('蓝：愿望创建与收起写回 Dexie');

  await page.getByRole('button', { name: '愿望（点击切回今日任务）' }).click();
  await page.getByRole('button').filter({ hasText: '计划04-BIG-DEAL' }).first().click();
  await page.getByRole('button', { name: '完成这一步' }).first().click();
  await page.waitForTimeout(350);
  let big = await taskState(page, '计划04-BIG-DEAL');
  assert.equal(big.todo.steps.filter((step) => step.done).length, 1);
  await page.getByRole('button', { name: '完成这一步' }).first().click();
  await page.waitForTimeout(900);
  big = await taskState(page, '计划04-BIG-DEAL');
  assert.equal(big.todo.steps.every((step) => step.done), true);
  assert.equal(big.todo.isActive, false);
  assert.ok(big.todo.clearedActivityId);
  await page.getByText('大功告成', { exact: false }).first().waitFor({ timeout: 8000 });
  await page.screenshot({ path: resolve(out, 'blue-bigdeal-clear.png'), fullPage: true });
  report.checks.push('蓝：BIG DEAL 子步落库，末步真实收官并播放既有结算');
  await closeCompletion(page);

  await page.goto(`${base}/?__mode=day&__motion=low&__snd=0&__dev=0#/p/dashboard?sec=tasks`, { waitUntil: 'domcontentloaded' });
  await page.getByText('计划04-升级', { exact: true }).waitFor({ timeout: 15000 });
  await page.getByRole('button').filter({ hasText: '计划04-升级' }).first().click();
  await page.getByRole('dialog', { name: '今日完成：计划04-升级' }).waitFor();
  await closeCompletion(page);
  await page.getByText('恭喜升级', { exact: false }).first().waitFor({ timeout: 8000 });
  await page.screenshot({ path: resolve(out, 'blue-levelup.png'), fullPage: true });
  report.checks.push('蓝：完成条关闭后，仅在真升级时出现升级演出');

  const themes = [
    { key: 'pink', label: '粉' },
    { key: 'yellow', label: '黄' },
    { key: 'red', label: '红' },
  ];
  for (const theme of themes) {
    const title = `计划04-回归-${theme.key}`;
    await page.evaluate(async ({ color, taskTitle }) => {
      const { useAppStore } = await import('/src/store/index.ts');
      const { db } = await import('/src/db/index.ts');
      await useAppStore.getState().addTodo({
        title: taskTitle, attribute: 'kindness', points: 1, frequency: 'single', targetCount: 1,
        repeatDaily: true, isActive: true, important: false,
      });
      const user = await db.users.toCollection().first();
      if (!user) throw new Error('missing isolated user');
      await db.users.update(user.id, { theme: color });
    }, { color: theme.key, taskTitle: title });
    await page.goto(`${base}/?__mode=day&__motion=low&__snd=0&__dev=0#/p/actions?tab=todos`, { waitUntil: 'domcontentloaded' });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByText(title, { exact: true }).waitFor({ timeout: 15000 });
    if (theme.key === 'red') await page.getByText(title, { exact: true }).click();
    else await page.getByRole('button').filter({ hasText: title }).first().click();
    await page.waitForTimeout(450);
    const state = await taskState(page, title);
    assert.equal(state.count, 1);
    assert.equal(state.activities.length, 1);
    report.themes[theme.key] = { ok: true, count: state.count, activities: state.activities.length };
    report.checks.push(`${theme.label}：任务页完成一次，进度与奖励同步落库`);
    await page.screenshot({ path: resolve(out, `${theme.key}-task-complete.png`), fullPage: true });
    if (await page.locator('.oa-ci').count()) await page.locator('.oa-xk').first().click({ force: true }).catch(() => {});
  }

  await page.evaluate(async () => {
    const { useAppStore } = await import('/src/store/index.ts');
    await useAppStore.getState().addTodo({
      title: '计划04-红色升级', attribute: 'charm', points: 40, frequency: 'single', targetCount: 1,
      repeatDaily: true, isActive: true, important: false,
    });
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByText('计划04-红色升级', { exact: true }).waitFor({ timeout: 15000 });
  await page.getByText('计划04-红色升级', { exact: true }).click();
  await page.waitForTimeout(500);
  const redComplete = page.locator('.oa-ci');
  await redComplete.waitFor();
  await redComplete.locator('.oa-xk').first().click({ force: true });
  await page.getByRole('dialog', { name: /恭喜升级/ }).waitFor({ timeout: 8000 });
  const redLevel = await page.evaluate(async () => {
    const { db } = await import('/src/db/index.ts');
    const row = await db.attributes.get('charm');
    return row?.level ?? 0;
  });
  assert.ok(redLevel >= 2);
  report.themes.red.growth = { ok: true, level: redLevel };
  report.checks.push('红：跨页完成通知由 RedGrowthHost 按完成条→升级顺序消费');
  await page.screenshot({ path: resolve(out, 'red-levelup.png'), fullPage: true });

  assert.deepEqual(report.pageerrors, []);
  assert.deepEqual(report.localFailures, []);
  report.ok = true;
} catch (error) {
  report.ok = false;
  report.error = error.stack;
  if (context.pages()[0]) {
    const page = context.pages()[0];
    await page.screenshot({ path: resolve(out, 'failure.png'), fullPage: true }).catch(() => {});
    report.failureState = await page.evaluate(async () => {
      const { db } = await import('/src/db/index.ts');
      const { useAppStore } = await import('/src/store/index.ts');
      const users = await db.users.toArray();
      const todos = await db.todos.toArray();
      return {
        href: location.href,
        body: document.body.innerText.slice(0, 2000),
        user: useAppStore.getState().user,
        todos: todos.map((todo) => ({ id: todo.id, title: todo.title, isActive: todo.isActive, archivedAt: todo.archivedAt })),
        users,
      };
    }).catch((stateError) => ({ error: String(stateError) }));
  }
  process.exitCode = 1;
} finally {
  writeFileSync(resolve(out, 'report.json'), JSON.stringify(report, null, 2));
  await context.close();
  console.log(JSON.stringify(report, null, 2));
}
