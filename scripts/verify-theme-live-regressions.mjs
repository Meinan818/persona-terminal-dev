// Isolated regression proof for real AI settings and the red navigator bridge.
// All model traffic is fulfilled by a local mock route; no charged model is used.
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
  scope: 'Three theme AI settings save/test real configuration, and the red assistant uses the shared navigator AI stream.',
  base,
  ok: false,
  checks: [],
  requests: [],
  pageErrors: [],
  screenshots: {},
};

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
      body: JSON.stringify({ data: [{ id: 'mock-model' }] }),
    });
  }
  if (path.endsWith('/chat/completions')) {
    const body = request.postDataJSON();
    if (body?.stream) {
      return route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: `data: ${JSON.stringify({ choices: [{ delta: { content: 'MOCK_RED_AI_REPLY：这是模型返回。' }, finish_reason: null }] })}\n\ndata: [DONE]\n\n`,
      });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ choices: [{ message: { content: 'pong' } }] }),
    });
  }
  return route.fulfill({ status: 404, body: 'not mocked' });
});

const page = await context.newPage();
page.on('pageerror', (error) => report.pageErrors.push(String(error)));

async function screenshot(name) {
  const path = resolve(out, `${name}.png`);
  await page.screenshot({ path });
  report.screenshots[name] = path;
}

async function waitTheme(theme, kit) {
  await page.waitForFunction(({ theme, kit }) => {
    const root = document.documentElement;
    return root.getAttribute('data-theme') === theme
      && (kit ? root.getAttribute('data-kit') === kit : !root.getAttribute('data-kit'))
      && (document.querySelector('#root')?.childElementCount ?? 0) > 0;
  }, { theme, kit }, { timeout: 30000 });
  await page.waitForTimeout(800);
}

async function setTheme(theme) {
  await page.evaluate(async (theme) => {
    const { useAppStore } = await import('/src/store/index.ts');
    const state = useAppStore.getState();
    if (!state.user) await state.createUser('真实桥接检查');
    await useAppStore.getState().setTheme(theme);
    await useAppStore.getState().updateSettings({
      summaryApiProvider: 'deepseek',
      summaryApiBaseUrl: 'http://mock.local/v1',
      summaryModel: 'mock-model',
      summaryApiKey: '',
    });
  }, theme).catch((error) => {
    if (!/Execution context was destroyed|navigation/i.test(String(error))) throw error;
  });
}

async function verifyAISettings(theme, kit) {
  await setTheme(theme);
  await waitTheme(theme, kit);
  await page.evaluate(() => { location.hash = '#/p/settings?tab=ai'; });
  await page.waitForTimeout(700);
  const keyInput = page.getByLabel('API 密钥').first();
  if (!(await keyInput.isVisible().catch(() => false))) {
    await page.locator('button[aria-expanded]').filter({ hasText: /API Key|DeepSeek/ }).first().click();
  }
  await keyInput.waitFor({ state: 'visible', timeout: 15000 });
  await keyInput.fill('sk-mock-theme');
  await page.getByRole('button', { name: '保存', exact: true }).first().click();
  await page.getByRole('button', { name: '测试连接', exact: true }).first().click();
  await page.getByText(/连接成功/).first().waitFor({ state: 'visible', timeout: 20000 });
  const state = await page.evaluate(async () => {
    const { useAppStore } = await import('/src/store/index.ts');
    const settings = useAppStore.getState().settings;
    return {
      key: settings.summaryApiKey,
      verifiedAt: settings.aiProfiles?.deepseek?.verifiedAt ?? 0,
      models: settings.aiProfiles?.deepseek?.models?.map((item) => typeof item === 'string' ? item : item.id) ?? [],
    };
  });
  assert.equal(state.key, 'sk-mock-theme');
  assert.ok(state.verifiedAt > 0);
  assert.ok(state.models.includes('mock-model'));
  report.checks.push(`${theme}: AI key saved, connection tested, model list stored`);
  await screenshot(`${theme}-ai-settings`);
}

async function verifyRedAssistant() {
  await setTheme('red');
  await waitTheme('red', null);
  await page.evaluate(async () => {
    const { useAppStore } = await import('/src/store/index.ts');
    await useAppStore.getState().updateSettings({
      summaryApiProvider: 'deepseek',
      summaryApiBaseUrl: 'http://mock.local/v1',
      summaryModel: 'mock-model',
      summaryApiKey: 'sk-mock-red',
      navigatorPresetId: 'builtin-cat',
    });
    const { openAssistant } = await import('/src/p5r-red/shell/shellBus.ts');
    openAssistant();
  });
  const dialog = page.getByRole('dialog', { name: /助手 · 摩尔加纳/ });
  await dialog.waitFor({ state: 'visible', timeout: 15000 });
  await page.locator('.nv-txt').filter({ hasText: /MOCK_RED_AI_REPLY/ }).first().waitFor({ state: 'visible', timeout: 20000 });
  const chatRequests = report.requests.filter((request) => request.path.endsWith('/chat/completions'));
  assert.ok(chatRequests.length > 0, 'red assistant did not call the model endpoint');
  report.checks.push('red assistant called the shared navigator model endpoint');
  await screenshot('red-assistant-ai');
}

async function verifyLongReadingAndSummaryJobs() {
  const before = report.requests.length;
  await page.evaluate(async () => {
    const { useAppStore, toLocalDateKey } = await import('/src/store/index.ts');
    const { drawRandom } = await import('/src/themes/p3r-blue/mock/pkg4-tarot.ts');
    const { startLongJob } = await import('/src/utils/tarotJobs.ts');
    const settings = useAppStore.getState().settings;
    const ids = drawRandom(6);
    startLongJob({
      settings,
      question: '隔离验证：接下来如何安排学习？',
      period: 'midterm',
      candidates: ids.map((id, index) => ({ cardId: id, orientation: index % 3 === 2 ? 'reversed' : 'upright' })),
      pickedIndices: [0, 1, 2],
    });
    const { startSummaryJob } = await import('/src/utils/summaryJobs.ts');
    const end = new Date();
    const start = new Date(end.getTime() - 6 * 86400_000);
    startSummaryJob({ settings, period: 'week', startDate: toLocalDateKey(start), endDate: toLocalDateKey(end) });
  });
  await page.waitForFunction(async () => {
    const { useTarotJobs } = await import('/src/utils/tarotJobs.ts');
    const { useSummaryJobs } = await import('/src/utils/summaryJobs.ts');
    const long = useTarotJobs.getState().long;
    const summary = useSummaryJobs.getState().job;
    return long?.status === 'done' && !!long.result && summary?.status === 'done' && !!summary.draft;
  }, null, { timeout: 30000 });
  const state = await page.evaluate(async () => {
    const { useTarotJobs } = await import('/src/utils/tarotJobs.ts');
    const { useSummaryJobs } = await import('/src/utils/summaryJobs.ts');
    return {
      longContent: useTarotJobs.getState().long?.result?.content ?? '',
      summaryContent: useSummaryJobs.getState().job?.draft?.content ?? '',
    };
  });
  const requests = report.requests.slice(before).filter((request) => request.path.endsWith('/chat/completions'));
  report.jobState = { requests: requests.length, ...state };
  assert.ok(requests.length >= 2, 'long reading and summary did not both call the model endpoint');
  assert.match(state.longContent, /MOCK_RED_AI_REPLY/);
  assert.match(state.summaryContent, /MOCK_RED_AI_REPLY/);
  report.checks.push('long reading and growth summary completed through the shared model endpoint');
}

try {
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => (document.querySelector('#root')?.childElementCount ?? 0) > 0, null, { timeout: 30000 });
  await verifyAISettings('blue', 'p3r-blue');
  await verifyAISettings('pink', 'p3r-pink');
  await verifyAISettings('yellow', 'p4g-yellow');
  await verifyLongReadingAndSummaryJobs();
  await verifyRedAssistant();
  assert.equal(report.pageErrors.length, 0, `page errors: ${report.pageErrors.join(' | ')}`);
  report.ok = true;
} catch (error) {
  report.error = String(error?.stack ?? error);
  report.failureState = await page.evaluate(() => ({
    href: location.href,
    hash: location.hash,
    theme: document.documentElement.getAttribute('data-theme'),
    kit: document.documentElement.getAttribute('data-kit'),
    bodyText: document.body.innerText.replace(/\s+/g, ' ').trim().slice(0, 1800),
  })).catch(() => null);
  await screenshot('99-failure').catch(() => {});
} finally {
  await browser.close().catch(() => {});
  writeFileSync(resolve(out, 'report.json'), JSON.stringify(report, null, 2));
}

console.log(JSON.stringify({
  ok: report.ok,
  checks: report.checks,
  requests: report.requests,
  pageErrors: report.pageErrors.length,
  error: report.error,
  report: resolve(out, 'report.json'),
}, null, 2));
if (!report.ok) process.exitCode = 1;
