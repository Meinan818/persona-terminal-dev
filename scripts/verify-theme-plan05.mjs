// Plan 05: isolated ledger loop. Blue full path first, then pink/yellow/red regression.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from '../node_modules/playwright/index.mjs';

const base = process.env.THEME_AUDIT_BASE ?? 'http://127.0.0.1:5198';
const out = resolve(process.argv[2] ?? '');
if (!process.argv[2]) throw new Error('Pass a new evidence directory');
if (existsSync(out)) throw new Error('Evidence directory already exists; use a new directory');
mkdirSync(out, { recursive: true });

const report = {
  scope: 'Plan 05 only: isolated local ledger, blue full path then pink/yellow/red regression. No login, API or paid model call.',
  base,
  out,
  checks: [],
  themes: {},
  pageErrors: [],
  localFailures: [],
  blockedExternal: 0,
  apiRequests: 0,
};

const context = await chromium.launchPersistentContext(resolve(out, 'profile'), {
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  viewport: { width: 390, height: 844 },
  serviceWorkers: 'block',
  reducedMotion: 'reduce',
});

const appUrl = (hash = '') => `${base}/?__mode=day&__motion=low&__snd=0&__dev=0${hash}`;

async function waitApp(page) {
  await page.waitForFunction(() => (document.querySelector('#root')?.childElementCount ?? 0) > 0, null, { timeout: 15000 });
}

async function openLedger(page) {
  const target = appUrl('#/p/ledger');
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await page.goto(target, { waitUntil: 'domcontentloaded' });
    } catch (error) {
      if (!/ERR_ABORTED|interrupted by another navigation/.test(String(error))) throw error;
    }
    await page.waitForTimeout(700);
    const mounted = await page.evaluate(() => (document.querySelector('#root')?.childElementCount ?? 0) > 0).catch(() => false);
    if (mounted) break;
  }
  await waitApp(page);
  await page.waitForTimeout(3500);
}

async function setTheme(page, color) {
  await page.evaluate(async (next) => {
    const { useAppStore } = await import('/src/store/index.ts');
    const { db } = await import('/src/db/index.ts');
    await useAppStore.getState().setTheme(next);
    const user = await db.users.toCollection().first();
    if (user) await db.users.update(user.id, { theme: next });
  }, color);
}

async function ledgerState(page, note) {
  return page.evaluate(async (wanted) => {
    const { useAppStore } = await import('/src/store/index.ts');
    const { db } = await import('/src/db/index.ts');
    const [entries, budgets, assets] = await Promise.all([
      db.ledgerEntries.toArray(),
      db.budgets.toArray(),
      db.assets.toArray(),
    ]);
    const state = useAppStore.getState();
    return {
      entries,
      budgets,
      assets,
      matched: wanted ? entries.filter((entry) => entry.note === wanted) : [],
      total: state.getTotalBalance(),
      accounts: state.getAccountBalances(),
    };
  }, note);
}

async function dismissTransient(page) {
  for (let i = 0; i < 4; i++) {
    const visibleClose = page.locator('.oa-xk:visible, .od-x:visible, [aria-label="关闭"]:visible').last();
    if (await visibleClose.count()) {
      await visibleClose.click({ force: true }).catch(() => {});
    } else {
      await page.keyboard.press('Escape').catch(() => {});
    }
    await page.waitForTimeout(180);
  }
}

async function saveManualEntry(page, { amount, note, typeName = '娱乐' }) {
  await page.getByRole('button', { name: '记一笔', exact: true }).click();
  const dialog = page.getByRole('dialog').last();
  await dialog.getByLabel('金额').fill(String(amount));
  if (typeName) await dialog.getByRole('button', { name: new RegExp(typeName) }).click();
  await dialog.getByLabel('备注').fill(note);
  await dialog.getByRole('button', { name: '保存', exact: true }).click();
  await dialog.waitFor({ state: 'hidden', timeout: 10000 });
  await page.waitForTimeout(1200);
}

try {
  await context.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith('/api/')) {
      report.apiRequests++;
      return route.abort();
    }
    if (url.origin !== base) {
      report.blockedExternal++;
      return route.abort();
    }
    return route.continue();
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
  await page.waitForTimeout(1500);
  await page.evaluate(async () => {
    const { useAppStore } = await import('/src/store/index.ts');
    const { db } = await import('/src/db/index.ts');
    if (!useAppStore.getState().user) await useAppStore.getState().createUser('计划05隔离探针');
    await db.ledgerEntries.clear();
    await db.budgets.clear();
    await db.assets.clear();
    await useAppStore.getState().loadLedger();
    await useAppStore.getState().setTheme('blue');
  });

  await openLedger(page);
  await page.getByText('先设置你当前的余额').waitFor({ timeout: 15000 });
  await page.getByRole('button', { name: /先设置你当前的余额/ }).click();
  let dialog = page.getByRole('dialog').last();
  await dialog.getByLabel('微信 余额').fill('500');
  await dialog.getByRole('button', { name: '就这么记（1 个账户）' }).click();
  await dialog.waitFor({ state: 'hidden' });
  await page.waitForTimeout(500);
  let state = await ledgerState(page, '初始余额');
  assert.equal(state.matched.length, 1);
  assert.equal(state.accounts.find((account) => account.name === '微信')?.balance, 500);
  report.checks.push('蓝：开局按微信写入真实初始余额，账户余额同步为 500');

  const beforeCancel = state.entries.length;
  await page.getByRole('button', { name: '记一笔', exact: true }).click();
  dialog = page.getByRole('dialog').last();
  await dialog.getByLabel('金额').fill('12');
  await dialog.getByRole('button', { name: '关闭', exact: true }).click();
  await dialog.waitFor({ state: 'hidden' });
  assert.equal((await ledgerState(page)).entries.length, beforeCancel);
  report.checks.push('蓝：取消单笔确认不写流水');

  await saveManualEntry(page, { amount: 88, note: '计划05单笔', typeName: '娱乐' });
  state = await ledgerState(page, '计划05单笔');
  assert.equal(state.matched.length, 1);
  assert.equal(state.matched[0].type, 'fun');
  assert.equal(state.matched[0].channel, '微信');
  await page.screenshot({ path: resolve(out, 'blue-single.png'), fullPage: true });
  report.checks.push('蓝：单笔金额、类目、账户和备注写入 Dexie');

  const amountInput = page.getByLabel('一句话记账');
  await amountInput.fill('早餐15、地铁4');
  await page.getByRole('button', { name: '记一笔', exact: true }).click();
  dialog = page.getByRole('dialog').last();
  await dialog.getByRole('button', { name: /全部保存/ }).click();
  await dialog.waitFor({ state: 'hidden', timeout: 10000 });
  await page.waitForTimeout(1500);
  state = await ledgerState(page);
  assert.equal(state.entries.filter((entry) => entry.direction === 'expense' && ['早餐', '地铁'].includes(entry.note ?? '')).length, 2);
  report.checks.push('蓝：本地批量解析两笔并一次落库，条目数量正好增加 2');

  await dismissTransient(page);
  await page.getByRole('button', { name: '设置预算', exact: true }).click();
  dialog = page.getByRole('dialog').last();
  await dialog.getByPlaceholder('3000').fill('1000');
  await dialog.getByRole('button', { name: '保存', exact: true }).click();
  await dialog.waitFor({ state: 'hidden' });
  await page.waitForTimeout(500);
  state = await ledgerState(page);
  const currentPeriod = await page.evaluate(async () => {
    const { useAppStore, toLocalDateKey } = await import('/src/store/index.ts');
    const { ledgerCycle } = await import('/src/utils/ledgerFormat.ts');
    const settings = useAppStore.getState().settings;
    return ledgerCycle(settings.ledgerPayCycleEnabled === true, settings.ledgerResetDay ?? 1, toLocalDateKey()).key;
  });
  assert.equal(state.budgets.find((budget) => budget.period === currentPeriod)?.monthlyLimit, 1000);
  report.checks.push('蓝：预算写入当前真实周期，刷新前已可从权威 store 读取');

  await page.locator('button').filter({ hasText: '统计' }).last().click();
  await page.getByText('本月预算', { exact: true }).waitFor();
  await page.getByText(/¥1,000/).first().waitFor();
  await page.getByRole('button', { name: /让伊戈尔结算/ }).click();
  dialog = page.getByRole('dialog').last();
  await dialog.getByText(/本地账目回顾|伊戈尔的回望/).first().waitFor({ timeout: 10000 });
  await dialog.getByText('¥107', { exact: false }).first().waitFor();
  await page.screenshot({ path: resolve(out, 'blue-settlement.png'), fullPage: true });
  await dialog.getByRole('button', { name: '关闭', exact: true }).click();
  await dialog.waitFor({ state: 'hidden' });
  report.checks.push('蓝：统计和本地结算读取真实 1000 预算、107 支出，未调用模型');

  await page.locator('button').filter({ hasText: '流水' }).last().click();
  await page.getByRole('button', { name: '对账', exact: true }).click();
  dialog = page.getByRole('dialog').last();
  await dialog.getByLabel('微信 余额').fill('400');
  await dialog.getByRole('button', { name: /校准 1 个账户/ }).click();
  await dialog.waitFor({ state: 'hidden' });
  await page.waitForTimeout(500);
  state = await ledgerState(page);
  assert.equal(state.accounts.find((account) => account.name === '微信')?.balance, 400);
  assert.ok(state.entries.some((entry) => entry.direction === 'adjust' && entry.note === '余额对账'));
  report.checks.push('蓝：多账户对账写入调整流水，微信余额校准到 400');

  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitApp(page);
  await page.waitForTimeout(3500);
  const persisted = await ledgerState(page);
  assert.equal(persisted.entries.length, state.entries.length);
  assert.equal(persisted.budgets.find((budget) => budget.period === currentPeriod)?.monthlyLimit, 1000);
  assert.equal(persisted.accounts.find((account) => account.name === '微信')?.balance, 400);
  report.checks.push('蓝：刷新后流水、预算与账户余额保留');

  const deleteRow = page.getByRole('button').filter({ hasText: '计划05单笔' }).first();
  await deleteRow.click();
  await page.getByText('删除', { exact: true }).last().click();
  await page.waitForTimeout(700);
  assert.equal((await ledgerState(page, '计划05单笔')).matched.length, 0);
  report.checks.push('蓝：删除流水等待真实写入，刷新数据源不再存在该笔');
  report.themes.blue = { ok: true, entries: (await ledgerState(page)).entries.length };

  for (const theme of [
    { key: 'pink', label: '粉' },
    { key: 'yellow', label: '黄' },
  ]) {
    await setTheme(page, theme.key);
    await openLedger(page);
    const note = `计划05回归-${theme.key}`;
    await saveManualEntry(page, { amount: theme.key === 'pink' ? 26 : 36, note, typeName: '餐饮' });
    const row = await ledgerState(page, note);
    assert.equal(row.matched.length, 1);

    if (theme.key === 'yellow') await page.getByRole('button', { name: /✿\s*对账/ }).click();
    else await page.getByRole('button', { name: '对账', exact: true }).click();
    dialog = page.getByRole('dialog').last();
    await dialog.getByLabel('微信 余额').fill(String(theme.key === 'pink' ? 777 : 888));
    await dialog.getByRole('button', { name: /校准 1 个账户/ }).click();
    await dialog.waitFor({ state: 'hidden' });
    await page.waitForTimeout(400);
    const checked = await ledgerState(page);
    assert.equal(checked.accounts.find((account) => account.name === '微信')?.balance, theme.key === 'pink' ? 777 : 888);
    await page.screenshot({ path: resolve(out, `${theme.key}-ledger.png`), fullPage: true });
    report.themes[theme.key] = { ok: true, entry: row.matched[0].id, balance: checked.accounts.find((account) => account.name === '微信')?.balance };
    report.checks.push(`${theme.label}：单笔与对账均等待真实 Dexie 写入`);
  }

  await setTheme(page, 'red');
  await openLedger(page);
  const redNote = '计划05回归-red';
  await page.getByRole('button', { name: '记一笔', exact: true }).click();
  dialog = page.getByRole('dialog').last();
  await dialog.getByLabel('金额').fill('56');
  await dialog.getByPlaceholder('备注（可选）').fill(redNote);
  await dialog.getByRole('button', { name: '保存', exact: true }).click();
  await dialog.waitFor({ state: 'hidden', timeout: 10000 });
  await page.waitForTimeout(1200);
  assert.equal((await ledgerState(page, redNote)).matched.length, 1);

  await dismissTransient(page);
  await page.getByRole('button', { name: '对账', exact: true }).click();
  dialog = page.getByRole('dialog').last();
  const redState = await ledgerState(page);
  await dialog.getByText('本月对账已用完').waitFor();
  const exhausted = dialog.getByRole('button', { name: '本月对账已用完' });
  assert.equal(await exhausted.isDisabled(), true);
  assert.equal((await ledgerState(page)).entries.length, redState.entries.length);
  await dialog.getByRole('button', { name: '关闭', exact: true }).click();
  await page.screenshot({ path: resolve(out, 'red-ledger.png'), fullPage: true });
  report.themes.red = { ok: true, entry: (await ledgerState(page, redNote)).matched[0].id, balance: redState.accounts.find((account) => account.name === '微信')?.balance };
  report.checks.push('红：单笔等待真实 Dexie 写入；第四轮对账被真实限额拦截且未写假调整');

  await page.getByRole('button', { name: '统计 · 心相结算', exact: true }).click();
  await page.getByRole('button', { name: /让伊戈尔结算/ }).waitFor({ timeout: 10000 });
  const redStatsText = await page.locator('body').innerText();
  assert.match(redStatsText, /本期预算 ¥1,000/);
  assert.match(redStatsText, /¥137/);
  await page.getByRole('button', { name: /让伊戈尔结算/ }).click();
  await page.getByText('心相结算', { exact: true }).waitFor();
  await page.waitForTimeout(1200);
  assert.match(await page.locator('body').innerText(), /¥137/);
  await page.screenshot({ path: resolve(out, 'red-stats.png'), fullPage: true });
  await page.getByRole('button', { name: '关闭', exact: true }).last().click();
  report.checks.push('红：统计与本地结算读取真实 137 支出和 1000 预算');

  assert.equal(report.apiRequests, 0);
  assert.deepEqual(report.pageErrors, []);
  assert.deepEqual(report.localFailures, []);
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
        body: document.body.innerText.slice(0, 3000),
        entries: await db.ledgerEntries.toArray(),
        budgets: await db.budgets.toArray(),
        ledger: useAppStore.getState().ledgerEntries,
      };
    }).catch((stateError) => ({ error: String(stateError) }));
  }
  process.exitCode = 1;
} finally {
  writeFileSync(resolve(out, 'report.json'), JSON.stringify(report, null, 2));
  await context.close();
  console.log(JSON.stringify(report, null, 2));
}
