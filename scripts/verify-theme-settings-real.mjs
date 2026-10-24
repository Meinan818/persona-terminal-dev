// End-to-end checks for previously simulated settings flows.
// All model traffic is fulfilled locally; imported media stays in the isolated browser profile.
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
  scope: 'Theme settings use real persona, archive, notification, BGM, and AI suggestion flows.',
  base,
  ok: false,
  checks: [],
  requests: [],
  pageErrors: [],
  screenshots: {},
};

let knownIds = null;

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
});
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  reducedMotion: 'no-preference',
  locale: 'zh-CN',
  timezoneId: 'Asia/Shanghai',
});

await context.route('http://mock.local/**', async (route) => {
  const request = route.request();
  const path = new URL(request.url()).pathname;
  report.requests.push({ method: request.method(), path });
  if (request.method() === 'OPTIONS') {
    return route.fulfill({
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      },
    });
  }
  if (path.endsWith('/models')) {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ data: [{ id: 'mock-settings-model' }] }),
    });
  }
  if (path.endsWith('/chat/completions')) {
    const body = request.postDataJSON();
    const prompt = (body?.messages ?? []).map((message) => String(message.content ?? '')).join('\n');
    let content = '本地 mock 回复';
    if (prompt.includes('人格设定师')) {
      content = '你是「审计人格」——说话直接，会先确认事实再给结论；习惯把复杂事情拆成可以马上完成的小步。';
    } else if (prompt.includes('命名设计器')) {
      content = JSON.stringify({
        achievements: knownIds ? { [knownIds.achievementId]: '审名校验' } : {},
        skills: knownIds ? { [knownIds.skillId]: '技艺校验' } : {},
      });
    } else if (prompt.includes('四字称号')) {
      const titles = Object.fromEntries(['knowledge', 'guts', 'dexterity', 'kindness', 'charm'].map((id) => [
        id,
        Array.from({ length: knownIds?.levelCount ?? 6 }, (_, index) => `试炼${index + 1}阶`),
      ]));
      content = JSON.stringify(titles);
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ choices: [{ message: { content } }] }),
    });
  }
  return route.fulfill({ status: 404, body: 'not mocked' });
});

const page = await context.newPage();
page.on('pageerror', (error) => report.pageErrors.push(String(error)));

async function screenshot(name) {
  const path = resolve(out, `${name}.png`);
  await page.screenshot({ path, fullPage: true });
  report.screenshots[name] = path;
}

async function setTheme(theme, kit) {
  await page.evaluate(async (theme) => {
    const { useAppStore } = await import('/src/store/index.ts');
    const state = useAppStore.getState();
    if (!state.user) await state.createUser('设置链路检查');
    await useAppStore.getState().setTheme(theme);
    await useAppStore.getState().updateSettings({
      summaryApiProvider: 'deepseek',
      summaryApiBaseUrl: 'http://mock.local/v1',
      summaryModel: 'mock-settings-model',
      summaryApiKey: 'sk-mock-settings',
      navigatorModel: 'mock-settings-model',
    });
  }, theme).catch((error) => {
    if (!/Execution context was destroyed|navigation/i.test(String(error))) throw error;
  });
  await page.waitForFunction(({ theme, kit }) => {
    const root = document.documentElement;
    return root.getAttribute('data-theme') === theme
      && root.getAttribute('data-kit') === kit
      && (document.querySelector('#root')?.childElementCount ?? 0) > 0;
  }, { theme, kit }, { timeout: 30000 });
  await page.waitForTimeout(500);
}

async function openSettings(tab) {
  await page.evaluate((tab) => { location.hash = `#/p/settings?tab=${tab}`; }, tab);
  await page.waitForTimeout(600);
}

try {
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => (document.querySelector('#root')?.childElementCount ?? 0) > 0, null, { timeout: 30000 });
  await setTheme('blue', 'p3r-blue');

  knownIds = await page.evaluate(async () => {
    const { ACHIEVEMENTS, SKILLS } = await import('/src/constants/index.ts');
    const { useAppStore } = await import('/src/store/index.ts');
    const achievement = ACHIEVEMENTS.find((item) => item.condition.type === 'attribute_level' && item.condition.attribute === 'knowledge');
    const skill = SKILLS.find((item) => item.requiredAttribute === 'knowledge');
    return {
      achievementId: achievement?.id ?? '',
      skillId: skill?.id ?? '',
      levelCount: useAppStore.getState().settings.levelThresholds.length,
    };
  });
  assert.ok(knownIds.achievementId && knownIds.skillId, 'could not resolve seeded achievement/skill ids');

  await openSettings('personalize');
  await page.getByRole('button', { name: /AI 匹配成就/ }).click();
  await page.getByRole('dialog', { name: /确认覆写/ }).waitFor({ state: 'visible', timeout: 15000 });
  await page.getByText('审名校验').first().waitFor({ state: 'visible' });
  await page.getByRole('button', { name: '取消', exact: true }).click();
  await page.getByRole('button', { name: 'AI 刷新', exact: true }).click();
  await page.getByRole('dialog', { name: /确认刷新/ }).waitFor({ state: 'visible', timeout: 15000 });
  await page.getByText('试炼1阶').first().waitFor({ state: 'visible' });
  await page.getByRole('button', { name: '取消', exact: true }).click();
  report.checks.push('AI name and level-title suggestions call the model and populate real selectors');

  await openSettings('navigator');
  await page.getByRole('button', { name: /新建人格/ }).click();
  const personaDialog = page.getByRole('dialog', { name: '新建人格' });
  await personaDialog.waitFor({ state: 'visible', timeout: 10000 });
  await personaDialog.getByLabel('名字').fill('审计人格');
  await personaDialog.getByRole('button', { name: /AI 生成人格设定/ }).click();
  await page.waitForFunction(() => Array.from(document.querySelectorAll('textarea'))
    .some((field) => field.getAttribute('aria-label') === '人格设定' && field.value.includes('审计人格')), null, { timeout: 15000 });
  await personaDialog.getByRole('button', { name: '保存', exact: true }).click();
  await page.getByText('审计人格').first().waitFor({ state: 'visible', timeout: 10000 });
  const personaSaved = await page.evaluate(async () => {
    const { useNavigatorStore } = await import('/src/store/navigator.ts');
    await useNavigatorStore.getState().loadPresets();
    return useNavigatorStore.getState().presets.some((preset) => preset.name === '审计人格');
  });
  assert.ok(personaSaved);
  report.checks.push('persona generation and save persist into the shared navigator preset store');

  for (const [theme, kit, shellModule] of [
    ['blue', 'p3r-blue', '/src/themes/p3r-blue/shell/shellBus.ts'],
    ['pink', 'p3r-pink', '/src/themes/p3r-pink/shell/shellBus.ts'],
    ['yellow', 'p4g-yellow', '/src/themes/p4g-yellow/shell/shellBus.ts'],
  ]) {
    await setTheme(theme, kit);
    await page.evaluate(async (shellModule) => {
      const shell = await import(shellModule);
      shell.openAssistant();
    }, shellModule);
    const assistant = page.getByRole('dialog', { name: '助手' }).first();
    await assistant.waitFor({ state: 'visible', timeout: 15000 });
    await assistant.getByRole('button', { name: '人格菜单' }).click();
    await assistant.getByText('审计人格', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
    const dialogText = await assistant.textContent();
    assert.doesNotMatch(dialogText ?? '', /高卷杏|摩尔加纳|坂本龙司/);
    await page.evaluate(async (shellModule) => {
      const shell = await import(shellModule);
      shell.closeAssistant();
    }, shellModule);
    report.checks.push(`${theme}: assistant menu reads the shared real persona store`);
  }

  await openSettings('navigator');
  await page.getByRole('button', { name: '整理', exact: true }).click();
  await page.waitForFunction(() => {
    const text = document.body.textContent ?? '';
    return text.includes('没有待归档的会话') || /已归档，最近摘要：/.test(text);
  }, null, { timeout: 15000 });
  const archiveText = await page.locator('body').textContent();
  assert.doesNotMatch(archiveText ?? '', /聊到了周五的面试和雨天去图书馆的计划/);
  report.checks.push('manual archive uses the real stale-session finalizer');

  await openSettings('notifications');
  const notificationTest = page.getByRole('button', { name: /测试通知仅支持客户端/ });
  await notificationTest.waitFor({ state: 'visible', timeout: 10000 });
  assert.ok(await notificationTest.isDisabled());
  assert.equal(await page.getByText('✓ 已发送，请查看通知栏').count(), 0);
  report.checks.push('web notification test no longer reports a fake success');

  await openSettings('theme');
  const bgmHeading = page.getByRole('button', { name: /导入音乐/ }).first();
  await bgmHeading.waitFor({ state: 'visible', timeout: 10000 });
  if ((await bgmHeading.getAttribute('aria-expanded')) !== 'true') await bgmHeading.click();
  await page.getByLabel('选择音频文件').setInputFiles({
    name: '审计音频.mp3',
    mimeType: 'audio/mpeg',
    buffer: Buffer.from('ID3mock-audio'),
  });
  await page.getByRole('listitem').getByText('审计音频', { exact: true }).first().waitFor({ state: 'visible', timeout: 15000 });
  const bgmSaved = await page.evaluate(async () => {
    const { listBgmTracks } = await import('/src/utils/bgm.ts');
    return (await listBgmTracks()).some((track) => track.name === '审计音频');
  });
  assert.ok(bgmSaved);
  report.checks.push('BGM import writes the real local track database');
  await screenshot('blue-settings-real');

  for (const [theme, kit] of [['pink', 'p3r-pink'], ['yellow', 'p4g-yellow']]) {
    await setTheme(theme, kit);
    await openSettings('theme');
    const heading = page.getByRole('button', { name: /导入音乐/ }).first();
    await heading.waitFor({ state: 'visible', timeout: 10000 });
    if ((await heading.getAttribute('aria-expanded')) !== 'true') await heading.click();
    await page.getByRole('listitem').getByText('审计音频', { exact: true }).first().waitFor({ state: 'visible', timeout: 10000 });
    report.checks.push(`${theme}: shared BGM data is visible through its own settings skin`);
  }

  await setTheme('red', null);
  await openSettings('navigator');
  await page.getByText('审计人格', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
  const redNavigatorText = await page.locator('body').textContent();
  assert.doesNotMatch(redNavigatorText ?? '', /高卷杏|摩尔加纳|坂本龙司/);
  await page.getByRole('button', { name: '整理', exact: true }).click();
  await page.waitForFunction(() => {
    const text = document.body.textContent ?? '';
    return text.includes('没有待归档的会话') || /已归档，最近摘要：/.test(text);
  }, null, { timeout: 15000 });
  report.checks.push('red: navigator settings reads real personas and archives real stale sessions');

  await openSettings('notifications');
  const redNotification = page.getByRole('button', { name: /测试通知仅支持客户端/ });
  await redNotification.waitFor({ state: 'visible', timeout: 10000 });
  assert.ok(await redNotification.isDisabled());
  report.checks.push('red: web notification test is disabled instead of faking success');

  await openSettings('personalize');
  await page.getByRole('button', { name: 'AI 刷新', exact: true }).click();
  await page.getByText(/确认刷新：/).first().waitFor({ state: 'visible', timeout: 15000 });
  await page.getByText('试炼1阶').first().waitFor({ state: 'visible' });
  await page.getByRole('button', { name: '取消', exact: true }).click();
  report.checks.push('red: level-title suggestions are generated by the model before confirmation');

  assert.equal(report.pageErrors.length, 0, `page errors: ${report.pageErrors.join(' | ')}`);
  report.ok = true;
} catch (error) {
  report.error = String(error?.stack ?? error);
  await page.screenshot({ path: resolve(out, '99-failure.png'), fullPage: true }).catch(() => {});
  process.exitCode = 1;
} finally {
  writeFileSync(resolve(out, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  await browser.close();
}
