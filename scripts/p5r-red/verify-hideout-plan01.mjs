// Isolated browser regression for plan 01. No real login, network or user profile.
import { chromium } from '../../node_modules/playwright/index.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const base = process.env.HIDEOUT_BASE ?? 'http://127.0.0.1:5196';
const out = `E:/MASKARIA/outputs/hideout-plan01-${new Date().toISOString().replace(/[:.]/g, '-')}`;
await mkdir(out, { recursive: true });
const context = await chromium.launchPersistentContext(`${out}/profile`, {
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
  viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', serviceWorkers: 'block',
});
const report = { base, out, checks: [], pageerrors: [], blocked: 0 };
try {
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin !== base || url.pathname.startsWith('/api/')) {
      report.blocked++; return route.abort();
    }
    return route.continue();
  });
  const page = context.pages()[0];
  page.on('pageerror', error => report.pageerrors.push(error.message));
  await page.goto(base);
  await page.waitForFunction(() => document.querySelector('#root')?.childElementCount > 0);
  await page.evaluate(async () => {
    const { db } = await import('/src/db/index.ts');
    await db.users.put({ id: 'plan01-local', name: '隔离探针', theme: 'red', createdAt: new Date() });
    await db.settings.update('default', { openaiEnabled: false, darkMode: false });
  });
  await page.goto(`${base}/#/p/cooperation?__motion=low&__snd=0`);
  await page.reload();
  await page.locator('[data-bond="org"]').first().click();
  await page.getByText('登录之后才能用组织', { exact: true }).waitFor();
  report.checks.push('羁绊标题→组织：未登录空态');
  await page.screenshot({ path: `${out}/signed-out.png`, fullPage: true });

  await page.evaluate(async () => {
    const { useCloudStore } = await import('/src/store/cloud.ts');
    useCloudStore.setState({ cloudUser: { id: 'me', username: 'isolated-probe' } });
  });
  await page.locator('.og-h3').filter({ hasText: '还没有组织' }).waitFor();
  report.checks.push('原页登录状态更新→无组织空态');
  await page.screenshot({ path: `${out}/no-org.png`, fullPage: true });

  await page.evaluate(async () => {
    const { useCloudSocialStore } = await import('/src/store/cloudSocial.ts');
    const member = (userId, seat) => ({ id: `row-${userId}`, orgId: 'org1', userId, seat, slot: 'own',
      codename: `探针${userId}`, codenameKind: 'custom', tarotId: 'fool', card: { streak: 0 },
      goal: `${userId}真实目标`, createdAt: new Date(), updatedAt: new Date() });
    const me = member('me', 2);
    const view = { org: { id: 'org1', name: '计划01真实组织', motto: '合成数据验证',
      leaderId: 'leader', inviteCode: 'TEST1234', emblem: 'star', tz: 'Asia/Shanghai' },
      me, members: [member('leader', 1), me], posts: [{ id: 'post1', userId: 'gone', kind: 'moment',
        text: '真实状态动态', snapshot: { by: { codename: '离队作者' }, pts: {} }, createdAt: new Date() }],
      ops: [{ id: 'op1', initiatorId: 'gone', kind: 'big', title: '真实状态作战', deadline: '2099-01-01',
        participants: ['gone'], assignments: {}, status: 'active', createdAt: new Date(), updatedAt: new Date() }],
      checkins: [], ledger: [], reactions: [] };
    useCloudSocialStore.setState({ orgs: [view] });
  });
  await page.locator('.og-ttl-n').filter({ hasText: '计划01真实组织' }).waitFor();
  assert.match(await page.locator('.og-meta').innerText(), /MEMBER/);
  assert.equal(await page.locator('.og-mt').count(), 2);
  report.checks.push('原页组织更新→真实组织与两名成员，当前用户非首位');
  await page.screenshot({ path: `${out}/organization.png`, fullPage: true });

  for (const tab of ['board', 'ops', 'meeting', 'roster']) {
    await page.locator(`[data-sec="${tab}"]`).first().click();
    if (tab === 'board') await page.getByText('真实状态动态', { exact: true }).waitFor();
    if (tab === 'ops') {
      await page.getByText('真实状态作战', { exact: false }).first().waitFor();
      assert.equal(await page.locator('[data-cancel]').count(), 0);
      await page.locator('[data-demo-lead]').click();
      assert.equal(await page.locator('[data-cancel]').count(), 0);
    }
    const section = await page.locator('.og-sec').innerText();
    assert.doesNotMatch(section, /NaN|undefined|坂本龙司/);
    report.checks.push(`${tab}分区无崩溃/NaN`);
  }
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.screenshot({ path: `${out}/organization-wide.png`, fullPage: true });
  report.checks.push('宽屏组织页面可达');

  await page.evaluate(async () => {
    const { useCloudSocialStore } = await import('/src/store/cloudSocial.ts');
    const view = useCloudSocialStore.getState().orgs[0];
    useCloudSocialStore.setState({ orgs: [{ ...view, members: [] }] });
  });
  await page.waitForFunction(() => document.querySelectorAll('.og-mt').length === 0);
  report.checks.push('空成员组织无假名册');
  await page.evaluate(async () => {
    const { useCloudStore } = await import('/src/store/cloud.ts');
    useCloudStore.setState({ cloudUser: null });
  });
  await page.getByText('登录之后才能用组织', { exact: true }).waitFor();
  assert.equal(await page.locator('.og-ttl-n').count(), 0);
  report.checks.push('原页退出登录→旧组织消失');
  assert.deepEqual(report.pageerrors, []);
  report.ok = true;
} catch (error) {
  report.ok = false; report.error = error.stack; process.exitCode = 1;
} finally {
  await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
  await context.close();
  console.log(JSON.stringify(report, null, 2));
}
