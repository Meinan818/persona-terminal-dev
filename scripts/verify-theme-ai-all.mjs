// Isolated AI pipeline audit across all four themes.
// Every model request is fulfilled locally; no charged model or production account is used.
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from '../node_modules/playwright/index.mjs';

const base = process.env.THEME_AUDIT_BASE ?? 'http://127.0.0.1:5212';
const out = resolve(process.argv[2] ?? '');
if (!process.argv[2]) throw new Error('Pass a new evidence directory');
if (existsSync(out)) throw new Error('Evidence directory already exists; use a new directory');
mkdirSync(out, { recursive: true });

const THEMES = [
  { id: 'blue', label: '蓝', kit: 'p3r-blue' },
  { id: 'pink', label: '粉', kit: 'p3r-pink' },
  { id: 'yellow', label: '黄', kit: 'p4g-yellow' },
  { id: 'red', label: '红', kit: null },
];
const only = (process.env.THEME_AI_ALL_ONLY ?? '').split(',').map((item) => item.trim()).filter(Boolean);
const selectedThemes = only.length ? THEMES.filter((theme) => only.includes(theme.id)) : THEMES;
const checkOnly = (process.env.THEME_AI_ALL_CHECK ?? '').split(',').map((item) => item.trim()).filter(Boolean);
const wanted = (name) => !checkOnly.length || checkOnly.includes(name);

const report = {
  scope: 'All AI entry points except UMBRA battle, using isolated local model responses.',
  base,
  ok: false,
  checks: [],
  failures: [],
  daily: [],
  requests: [],
  pageErrors: [],
  screenshots: {},
};

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
});

function mockContentFor(body) {
  const messages = Array.isArray(body?.messages) ? body.messages : [];
  const joined = messages.map((message) => String(message?.content ?? '')).join('\n');
  if (joined.includes('MOCK SUMMARY FOLLOW-UP QUESTION')) {
    return 'MOCK SUMMARY FOLLOWUP REPLY：追问由隔离模型生成。';
  }
  if (joined.includes('你是一个记账助手')) {
    if (joined.includes('JSON 数组') || joined.includes('消费凭证')) {
      return JSON.stringify([
        { direction: 'expense', amount: 15, type: 'food', incomeType: null, note: 'MOCK 早餐' },
        { direction: 'expense', amount: 4, type: 'transport', incomeType: null, note: 'MOCK 地铁' },
      ]);
    }
    return JSON.stringify({
      direction: 'expense',
      amount: 28,
      type: 'food',
      incomeType: null,
      note: 'MOCK 咖啡',
      category: '咖啡',
    });
  }
  if (joined.includes('你是一个简洁的成长教练')) {
    return JSON.stringify({
      knowledge: 2,
      guts: 1,
      dexterity: 0,
      kindness: 0,
      charm: 0,
      reason: 'MOCK ACTIVITY REASON：隔离模型按记录内容评分。',
    });
  }
  if (joined.includes('用户发来一张 App 截图')) {
    return JSON.stringify([{ text: 'MOCK 活动截图识别', attribute: 'knowledge' }]);
  }
  if (joined.includes('人格设定师')) {
    return 'MOCK PERSONA PROMPT：你是一个来自隔离测试的人格设定。';
  }
  if (joined.includes('需要生成的最高等级')) {
    return JSON.stringify({
      knowledge: ['MOCK一', 'MOCK二', 'MOCK三', 'MOCK四', 'MOCK五', 'MOCK六', 'MOCK七', 'MOCK八', 'MOCK九', 'MOCK十'],
      guts: ['MOCK一', 'MOCK二', 'MOCK三', 'MOCK四', 'MOCK五', 'MOCK六', 'MOCK七', 'MOCK八', 'MOCK九', 'MOCK十'],
      dexterity: ['MOCK一', 'MOCK二', 'MOCK三', 'MOCK四', 'MOCK五', 'MOCK六', 'MOCK七', 'MOCK八', 'MOCK九', 'MOCK十'],
      kindness: ['MOCK一', 'MOCK二', 'MOCK三', 'MOCK四', 'MOCK五', 'MOCK六', 'MOCK七', 'MOCK八', 'MOCK九', 'MOCK十'],
      charm: ['MOCK一', 'MOCK二', 'MOCK三', 'MOCK四', 'MOCK五', 'MOCK六', 'MOCK七', 'MOCK八', 'MOCK九', 'MOCK十'],
    });
  }
  if (joined.includes('需要重命名的属性等级成就')) {
    return JSON.stringify({ achievements: { knowledge_3: 'MOCK 洞察门槛' }, skills: {} });
  }
  if (joined.includes('你是一个小组的参谋')) {
    return JSON.stringify({ tasks: [{ i: 1, task: '隔离分工任务' }] });
  }
  if (joined.includes('整理「今日委托」题库')) {
    const ids = [...joined.matchAll(/^([a-z0-9_-]+)\s[^\n]*｜/gm)].map((match) => match[1]);
    return JSON.stringify(Object.fromEntries([...new Set(ids)].map((id) => [id, 1])));
  }
  if (joined.includes('第四张卡')) {
    return JSON.stringify({ title: 'MOCK AI 委托', hint: 'MOCK 委托提示', attr: 1, points: 1 });
  }
  if (joined.includes('本地推送文案')) {
    return JSON.stringify({
      tarot: { title: 'MOCK 塔罗', body: 'MOCK 塔罗提醒' },
      todos: { title: 'MOCK 任务', body: '还有 {n} 件事' },
      countercurrent: { title: 'MOCK 逆流', body: '{attr} 正在逆流' },
      summary: { title: 'MOCK 总结', body: 'MOCK 总结提醒' },
      record: { title: 'MOCK 记录', body: 'MOCK 记录提醒' },
    });
  }
  if (joined.includes('你是丝绒房间的主人伊戈尔')) {
    return JSON.stringify({
      reflection: 'MOCK IGOR REFLECTION：账目由隔离模型回望。',
      advice: ['MOCK IGOR ADVICE'],
    });
  }
  if (joined.includes('22 张大阿卡纳 id 参考')) {
    return JSON.stringify({
      arcanaId: 'star',
      orientation: 'upright',
      initialIntimacy: 2,
      interpretation: 'MOCK CONFIDANT INTERPRETATION：这是隔离模型匹配出的塔罗解读。',
      advice: 'MOCK CONFIDANT ADVICE：这是隔离模型给出的相处建议。',
    });
  }
  if (joined.includes('水晶球里的光线也跟着变了')) {
    return JSON.stringify({
      orientation: 'upright',
      description: 'MOCK STAR SHIFT DESCRIPTION',
      interpretation: 'MOCK STAR SHIFT INTERPRETATION',
      advice: 'MOCK STAR SHIFT ADVICE',
      summary: 'MOCK STAR SHIFT SUMMARY',
    });
  }
  if (joined.includes('判断亲密度建议加点')) {
    return JSON.stringify({
      delta: 3,
      narrative: 'MOCK INTERACTION NARRATIVE',
      advice: 'MOCK INTERACTION ADVICE',
    });
  }
  if (joined.includes('七日牌阵') || joined.includes('【结语】')) {
    return [
      '【结语】MOCK FATE VERDICT',
      '## 总结',
      'MOCK FATE SUMMARY：七张牌在隔离模型里汇成一条线。',
      '## 展望',
      'MOCK FATE OUTLOOK：接下来三天顺着这条线往前走。',
      '## 建议',
      '· MOCK FATE ADVICE：先完成最小的一步。',
    ].join('\n');
  }
  if (joined.includes('<<<META>>>')) {
    return [
      'MOCK_DAILY_AI_REPLY：今天的解读来自隔离模型。',
      '<<<META>>>',
      JSON.stringify({
        advice: 'MOCK DAILY ADVICE',
        attribute: '知识',
        fortune: 'good',
        memo: 'MOCK DAILY MEMO',
      }),
    ].join('\n');
  }
  if (body?.stream) return 'MOCK_STREAM_AI_REPLY：这是隔离模型的流式回复。';
  return 'MOCK_AI_REPLY：这是隔离模型的完整回复。';
}

function sseBody(text) {
  const chunks = String(text).match(/[\s\S]{1,24}/g) ?? [String(text)];
  return `${chunks.map((chunk) => `data: ${JSON.stringify({
    choices: [{ delta: { content: chunk }, finish_reason: null }],
  })}\n\n`).join('')}data: ${JSON.stringify({
    choices: [{ delta: {}, finish_reason: 'stop' }],
  })}\n\ndata: [DONE]\n\n`;
}

async function newThemePage(theme) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: 'reduce',
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
  });
  const localRequests = [];
  await context.route('http://mock.local/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const body = request.postDataJSON?.() ?? null;
    const entry = {
      theme: theme.id,
      method: request.method(),
      path,
      stream: !!body?.stream,
      model: body?.model ?? '',
      preview: String((body?.messages ?? []).map((message) => message?.content ?? '').join('\n')).slice(0, 240),
    };
    localRequests.push(entry);
    report.requests.push(entry);
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
      const content = mockContentFor(body);
      if (body?.stream) {
        return route.fulfill({
          status: 200,
          contentType: 'text/event-stream',
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: sseBody(content),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          choices: [{ message: { role: 'assistant', content }, finish_reason: 'stop' }],
        }),
      });
    }
    return route.fulfill({ status: 404, body: 'not mocked' });
  });

  const page = await context.newPage();
  page.on('pageerror', (error) => report.pageErrors.push(`${theme.id}: ${String(error)}`));
  return { context, page, localRequests };
}

async function screenshot(page, name) {
  const path = resolve(out, `${name}.png`);
  await page.screenshot({ path, fullPage: true });
  report.screenshots[name] = path;
}

async function seedTheme(page, theme) {
  await page.goto(`${base}/?__mode=day&__motion=low&__snd=0&__dev=0`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => (document.querySelector('#root')?.childElementCount ?? 0) > 0, null, { timeout: 30000 });
  await page.evaluate(async (themeId) => {
    const { useAppStore } = await import('/src/store/index.ts');
    let state = useAppStore.getState();
    if (!state.user) {
      await state.createUser('AI 全量隔离档案');
      state = useAppStore.getState();
    }
    await state.setTheme(themeId);
    await useAppStore.getState().updateSettings({
      summaryApiProvider: 'custom',
      summaryApiKey: 'sk-mock-ai-all',
      summaryApiBaseUrl: 'http://mock.local/v1',
      summaryModel: 'mock-model',
      navigatorModel: 'mock-model',
      assistantModel: 'mock-model',
      visionModel: 'mock-model',
      audioModel: 'mock-model',
      attributeNames: {
        knowledge: '知识',
        guts: '胆量',
        dexterity: '灵巧',
        kindness: '温柔',
        charm: '魅力',
      },
    });
  }, theme.id);
  await page.waitForFunction(({ id, kit }) => {
    const root = document.documentElement;
    return root.getAttribute('data-theme') === id
      && (kit ? root.getAttribute('data-kit') === kit : !root.getAttribute('data-kit'));
  }, { id: theme.id, kit: theme.kit }, { timeout: 20000 });
  await page.waitForTimeout(500);
  for (let i = 0; i < 5; i++) {
    const close = page.getByRole('button', { name: /我已经是客人了|跳过|关闭|✕/ }).first();
    if (await close.isVisible().catch(() => false)) {
      await close.click().catch(() => {});
      await page.waitForTimeout(200);
    } else {
      break;
    }
  }
}

async function verifyDaily(theme) {
  const { context, page, localRequests } = await newThemePage(theme);
  const result = {
    entry: `${theme.label} · 每日占卜`,
    theme: theme.id,
    requests: 0,
    source: null,
    narration: '',
    status: 'failed',
    error: '',
  };
  try {
    await seedTheme(page, theme);
    await page.evaluate(() => { location.hash = '#/p/astrology?tab=daily'; });
    await page.waitForFunction(() => document.body.innerText.includes('今日') || document.body.innerText.includes('星象'), null, { timeout: 25000 });
    await page.waitForTimeout(1200);

    const begin = page.getByRole('button', { name: '接入命运', exact: true }).first();
    if (await begin.isVisible().catch(() => false)) await begin.click();
    const firstCard = page.getByRole('button', { name: /第 1 张牌?/ }).first();
    await firstCard.waitFor({ state: 'visible', timeout: 10000 });
    await firstCard.click();

    const deadline = Date.now() + 30000;
    while (Date.now() < deadline) {
      await page.waitForTimeout(250);
      const state = await page.evaluate(async () => {
        const { useAppStore } = await import('/src/store/index.ts');
        const d = useAppStore.getState().dailyDivination;
        return d ? { source: d.source, narration: d.narration, cardId: d.cardId } : null;
      });
      if (state) {
        result.source = state.source;
        result.narration = state.narration;
        result.requests = localRequests.filter((request) => request.path.endsWith('/chat/completions')).length;
        break;
      }
    }
    if (!result.source) {
      result.requests = localRequests.filter((request) => request.path.endsWith('/chat/completions')).length;
      throw new Error('30s 内没有落库 dailyDivination');
    }
    assert.equal(result.source, 'ai', `${theme.label}每日占卜落库来源不是 ai`);
    assert.match(result.narration, /MOCK_DAILY_AI_REPLY/, `${theme.label}每日占卜没有使用隔离模型正文`);
    assert.ok(result.requests > 0, `${theme.label}每日占卜没有发出模型请求`);
    result.status = 'passed';
    report.checks.push(`${theme.label}: 每日占卜真实请求并落库为 AI 结果`);
    await screenshot(page, `${theme.id}-daily-ai`);
  } catch (error) {
    result.error = String(error?.stack ?? error);
    result.state = await page.evaluate(async () => {
      const { useAppStore } = await import('/src/store/index.ts');
      const { useTarotJobs, readDailyPending } = await import('/src/utils/tarotJobs.ts');
      const job = useTarotJobs.getState().daily;
      const daily = useAppStore.getState().dailyDivination;
      return {
        job: job ? {
          date: job.date,
          status: job.status,
          cardId: job.cardId,
          pickedIndex: job.pickedIndex,
          text: job.text,
          error: job.error,
          truncated: job.truncated,
        } : null,
        daily: daily ? { date: daily.date, source: daily.source, cardId: daily.cardId } : null,
        pending: readDailyPending(),
        bodyText: document.body.innerText.replace(/\s+/g, ' ').slice(0, 1200),
      };
    }).catch((stateError) => ({ stateError: String(stateError) }));
    report.failures.push(result);
    await screenshot(page, `${theme.id}-daily-failure`).catch(() => {});
  } finally {
    report.daily.push(result);
    await context.close().catch(() => {});
  }
}

async function verifyConfidantCreate(theme) {
  const { context, page, localRequests } = await newThemePage(theme);
  const result = {
    entry: `${theme.label} · 结识同伴`,
    theme: theme.id,
    requests: 0,
    source: null,
    status: 'failed',
    error: '',
  };
  try {
    await seedTheme(page, theme);
    await page.evaluate(() => { location.hash = '#/overlay/bond-create?step=description'; });
    const textarea = page.locator('textarea').first();
    await textarea.waitFor({ state: 'visible', timeout: 20000 });
    await textarea.fill('MOCK CONFIDANT DESCRIPTION：一起长大、互相支持，最近一起完成了重要的事。');
    await page.getByRole('button', { name: /下一步/ }).first().click();

    const arcanaModule = `/src/themes/${theme.kit}/screens/pkg3/arcana.ts`;
    const answers = await page.evaluate(async (modulePath) => {
      const mod = await import(modulePath);
      return mod.TRAIT_QUESTIONS.map((question) => question.options[0]);
    }, arcanaModule);
    for (const answer of answers) {
      await page.getByRole('button', { name: answer, exact: true }).click();
      await page.waitForTimeout(220);
    }
    await page.waitForFunction(() => document.body.innerText.includes('MOCK CONFIDANT INTERPRETATION'), null, { timeout: 30000 });
    const body = await page.locator('body').innerText();
    assert.match(body, /星星/);
    assert.match(body, /MOCK CONFIDANT ADVICE/);
    assert.doesNotMatch(body, /魔术师正位：他手里永远握着下一个点子/);
    result.requests = localRequests.filter((request) => request.path.endsWith('/chat/completions')).length;
    result.source = body.includes('· 本次为离线匹配 ·') ? 'offline' : 'ai';
    assert.ok(result.requests > 0, `${theme.label}结识同伴没有发出模型请求`);
    assert.equal(result.source, 'ai', `${theme.label}结识同伴仍标成离线`);
    result.status = 'passed';
    report.checks.push(`${theme.label}: 结识同伴使用真实 AI 匹配结果`);
    await screenshot(page, `${theme.id}-confidant-create-ai`);
  } catch (error) {
    result.error = String(error?.stack ?? error);
    result.bodyText = await page.locator('body').innerText().catch(() => '');
    report.failures.push(result);
    await screenshot(page, `${theme.id}-confidant-create-failure`).catch(() => {});
  } finally {
    report.confidantCreate = [...(report.confidantCreate ?? []), result];
    await context.close().catch(() => {});
  }
}

async function verifyCoopMatch(theme) {
  const { context, page, localRequests } = await newThemePage(theme);
  const result = {
    entry: `${theme.label} · 星象匹配`,
    theme: theme.id,
    requests: 0,
    status: 'failed',
    error: '',
  };
  try {
    await seedTheme(page, theme);
    await page.evaluate(() => { location.hash = '#/overlay/bond-coop-ai-match?step=description'; });
    const textarea = page.locator('textarea').first();
    await textarea.waitFor({ state: 'visible', timeout: 20000 });
    await textarea.fill('MOCK COOP DESCRIPTION：一起做过很多计划，关键时候互相支持。');
    await page.getByRole('button', { name: /下一步/ }).first().click();
    const arcanaModule = `/src/themes/${theme.kit}/screens/pkg3/arcana.ts`;
    const answers = await page.evaluate(async (modulePath) => {
      const mod = await import(modulePath);
      return mod.TRAIT_QUESTIONS.map((question) => question.options[0]);
    }, arcanaModule);
    for (const answer of answers) {
      await page.getByRole('button', { name: answer, exact: true }).click();
      await page.waitForTimeout(220);
    }
    await page.waitForFunction(() => document.body.innerText.includes('MOCK CONFIDANT INTERPRETATION'), null, { timeout: 30000 });
    const body = await page.locator('body').innerText();
    assert.match(body, /星星/);
    assert.match(body, /MOCK CONFIDANT ADVICE/);
    assert.doesNotMatch(body, /魔术师：他总能把手边的东西/);
    result.requests = localRequests.filter((request) => request.path.endsWith('/chat/completions')).length;
    assert.ok(result.requests > 0, `${theme.label}星象匹配没有发出模型请求`);
    assert.doesNotMatch(body, /· 本次为离线匹配 ·/);
    result.status = 'passed';
    report.checks.push(`${theme.label}: 星象匹配使用真实 AI 结果`);
    await screenshot(page, `${theme.id}-coop-match-ai`);
  } catch (error) {
    result.error = String(error?.stack ?? error);
    result.bodyText = await page.locator('body').innerText().catch(() => '');
    report.failures.push(result);
    await screenshot(page, `${theme.id}-coop-match-failure`).catch(() => {});
  } finally {
    report.coopMatch = [...(report.coopMatch ?? []), result];
    await context.close().catch(() => {});
  }
}

async function seedFateWindow(page) {
  await page.evaluate(async () => {
    const { useAppStore, toLocalDateKey } = await import('/src/store/index.ts');
    const { MAJOR_ARCANA, randomBonusMultiplier } = await import('/src/constants/tarot.ts');
    const store = useAppStore.getState();
    for (let offset = 6; offset >= 0; offset--) {
      const day = new Date();
      day.setDate(day.getDate() - offset);
      const card = MAJOR_ARCANA[offset % MAJOR_ARCANA.length];
      await store.saveDailyDivination({
        id: `mock-fate-${toLocalDateKey(day)}`,
        date: toLocalDateKey(day),
        drawnFrom: [card.id],
        pickedIndex: 0,
        cardId: card.id,
        orientation: offset % 2 ? 'reversed' : 'upright',
        effect: { attribute: card.relatedAttribute ?? 'knowledge', multiplier: randomBonusMultiplier('upright') },
        narration: `MOCK FATE DAY ${offset}`,
        advice: `MOCK FATE ADVICE ${offset}`,
        fortune: offset % 3 === 0 ? 'good' : 'small',
        source: 'ai',
        createdAt: day,
      });
    }
  });
  await page.waitForTimeout(500);
}

async function verifyFateGlimpse(theme) {
  const { context, page, localRequests } = await newThemePage(theme);
  const result = {
    entry: `${theme.label} · 窥探命运`,
    theme: theme.id,
    requests: 0,
    source: null,
    status: 'failed',
    error: '',
  };
  try {
    await seedTheme(page, theme);
    await seedFateWindow(page);
    await page.evaluate((state) => { location.hash = `#/overlay/astro-glimpse-flow?state=${state}`; }, theme.id === 'red' ? 'ritual' : 'await');
    await page.waitForTimeout(700);
    const startGlimpse = page.getByRole('button', { name: /窥\s*探\s*命\s*运/ }).first();
    if (await startGlimpse.isVisible().catch(() => false) && !(await startGlimpse.isDisabled().catch(() => true))) {
      await startGlimpse.click();
    }
    const hold = page.locator('[aria-label="长按中央的命运之牌"]').first();
    const startDeadline = Date.now() + 20000;
    let pressed = false;
    while (Date.now() < startDeadline) {
      await page.waitForTimeout(100);
      const state = await page.evaluate(async () => {
        const { useTarotJobs } = await import('/src/utils/tarotJobs.ts');
        return {
          job: useTarotJobs.getState().fate?.status ?? null,
          hasHold: !!document.querySelector('[aria-label="长按中央的命运之牌"]'),
        };
      });
      if (state.job) break;
      if (state.hasHold && !pressed) {
        await hold.dispatchEvent('pointerdown', { pointerId: 1, pointerType: 'mouse', button: 0 });
        pressed = true;
      }
    }
    if (pressed) {
      await page.waitForTimeout(900);
      await hold.dispatchEvent('pointerup', { pointerId: 1, pointerType: 'mouse', button: 0 }).catch(() => {});
    }
    let state = null;
    const deadline = Date.now() + 40000;
    while (Date.now() < deadline) {
      await page.waitForTimeout(50);
      state = await page.evaluate(async () => {
        const { useTarotJobs } = await import('/src/utils/tarotJobs.ts');
        const job = useTarotJobs.getState().fate;
        return job ? { source: job.source, status: job.status, result: job.result, savedId: job.savedId } : null;
      });
      if (state?.status === 'done' && state.result?.summary) break;
    }
    assert.ok(state?.status === 'done' && state.result?.summary, `${theme.label}窥探命运没有完成`);
    result.source = state.source;
    result.requests = localRequests.filter((request) => request.path.endsWith('/chat/completions')).length;
    assert.ok(result.requests > 0, `${theme.label}窥探命运没有发出模型请求`);
    assert.equal(state.source, 'ai', `${theme.label}窥探命运落成了离线结果`);
    assert.match(state.result?.summary ?? '', /MOCK FATE SUMMARY/);
    assert.match(state.result?.outlook ?? '', /MOCK FATE OUTLOOK/);
    assert.match(state.result?.advice ?? '', /MOCK FATE ADVICE/);
    assert.ok(state.savedId, `${theme.label}窥探命运没有落库`);
    await page.waitForFunction(() => document.body.innerText.includes('MOCK FATE SUMMARY'), null, { timeout: 10000 });
    result.status = 'passed';
    report.checks.push(`${theme.label}: 窥探命运使用真实 AI 结果并落库`);
    await screenshot(page, `${theme.id}-fate-glimpse-ai`);
  } catch (error) {
    result.error = String(error?.stack ?? error);
    result.bodyText = await page.locator('body').innerText().catch(() => '');
    report.failures.push(result);
    await screenshot(page, `${theme.id}-fate-glimpse-failure`).catch(() => {});
  } finally {
    report.fateGlimpse = [...(report.fateGlimpse ?? []), result];
    await context.close().catch(() => {});
  }
}

async function verifySummaryFollowUp(theme) {
  const { context, page, localRequests } = await newThemePage(theme);
  const result = {
    entry: `${theme.label} · 成长总结追问`,
    theme: theme.id,
    requests: 0,
    status: 'failed',
    error: '',
  };
  try {
    await seedTheme(page, theme);
    await page.evaluate(() => { location.hash = '#/overlay/actions-summary'; });
    const generate = page.getByRole('button', { name: /生成总结/ }).last();
    await generate.waitFor({ state: 'visible', timeout: 20000 });
    const beforeId = await page.evaluate(async () => {
      const { useSummaryJobs } = await import('/src/utils/summaryJobs.ts');
      return useSummaryJobs.getState().job?.id ?? '';
    });
    await generate.click();
    await page.waitForFunction(async (beforeId) => {
      const { useSummaryJobs } = await import('/src/utils/summaryJobs.ts');
      const job = useSummaryJobs.getState().job;
      return !!job && job.id !== beforeId && job.status === 'done';
    }, beforeId, { timeout: 40000 });

    const input = page.getByLabel('追问').first();
    await input.waitFor({ state: 'visible', timeout: 20000 });
    await input.fill('MOCK SUMMARY FOLLOW-UP QUESTION');
    await page.getByRole('button', { name: '发送', exact: true }).first().click();
    await page.waitForFunction(() => document.body.innerText.includes('MOCK SUMMARY FOLLOWUP REPLY'), null, { timeout: 30000 });
    result.requests = localRequests.filter((request) => request.path.endsWith('/chat/completions')).length;
    assert.ok(result.requests >= 2, `${theme.label}成长总结追问没有发出第二次模型请求`);
    result.status = 'passed';
    report.checks.push(`${theme.label}: 成长总结追问使用真实 AI 回复`);
    await screenshot(page, `${theme.id}-summary-followup-ai`);
  } catch (error) {
    result.error = String(error?.stack ?? error);
    result.bodyText = await page.locator('body').innerText().catch(() => '');
    report.failures.push(result);
    await screenshot(page, `${theme.id}-summary-followup-failure`).catch(() => {});
  } finally {
    report.summaryFollowUp = [...(report.summaryFollowUp ?? []), result];
    await context.close().catch(() => {});
  }
}

async function verifyLedgerBatch(theme) {
  const { context, page, localRequests } = await newThemePage(theme);
  const result = {
    entry: `${theme.label} · 一句话记账`,
    theme: theme.id,
    requests: 0,
    status: 'failed',
    error: '',
  };
  try {
    await seedTheme(page, theme);
    await page.evaluate(() => { location.hash = '#/p/ledger'; });
    const input = theme.id === 'red' ? page.locator('[data-quick]').first() : page.getByLabel('一句话记账').first();
    await input.waitFor({ state: 'visible', timeout: 20000 });
    await input.fill('早餐15 地铁4');
    await page.getByRole('button', { name: '记一笔', exact: true }).first().click();
    await page.waitForFunction(() => document.body.innerText.includes('确认 2 笔'), null, { timeout: 30000 });
    const notes = await page.locator('input[aria-label="备注"]').evaluateAll((items) => items.map((item) => item.value));
    assert.ok(notes.includes('MOCK 早餐') && notes.includes('MOCK 地铁'), `${theme.label}批量记账没有使用 AI 备注`);
    result.requests = localRequests.filter((request) => request.path.endsWith('/chat/completions')).length;
    assert.ok(result.requests > 0, `${theme.label}一句话记账没有发出模型请求`);
    result.status = 'passed';
    report.checks.push(`${theme.label}: 一句话记账使用真实 AI 拆账`);
    await screenshot(page, `${theme.id}-ledger-batch-ai`);
  } catch (error) {
    result.error = String(error?.stack ?? error);
    result.bodyText = await page.locator('body').innerText().catch(() => '');
    report.failures.push(result);
    await screenshot(page, `${theme.id}-ledger-batch-failure`).catch(() => {});
  } finally {
    report.ledgerBatch = [...(report.ledgerBatch ?? []), result];
    await context.close().catch(() => {});
  }
}

async function verifyLedgerVision(theme) {
  const { context, page, localRequests } = await newThemePage(theme);
  const result = {
    entry: `${theme.label} · 拍小票视觉解析`,
    theme: theme.id,
    requests: 0,
    via: null,
    status: 'failed',
    error: '',
  };
  try {
    await seedTheme(page, theme);
    const shot = await page.evaluate(async () => {
      const { useAppStore } = await import('/src/store/index.ts');
      const { parseLedgerShot } = await import('/src/utils/ledgerAI.ts');
      return await parseLedgerShot(
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z3nYAAAAASUVORK5CYII=',
        useAppStore.getState().settings,
      );
    });
    result.via = shot.via;
    result.requests = localRequests.filter((request) => request.path.endsWith('/chat/completions')).length;
    assert.equal(shot.via, 'vision', `${theme.label}拍小票没有走视觉档`);
    assert.ok(result.requests > 0, `${theme.label}拍小票没有发出模型请求`);
    assert.ok(shot.results.some((item) => item.note.includes('MOCK 早餐')), `${theme.label}视觉解析没有使用模型结果`);
    result.status = 'passed';
    report.checks.push(`${theme.label}: 拍小票走视觉模型解析`);
  } catch (error) {
    result.error = String(error?.stack ?? error);
    report.failures.push(result);
  } finally {
    report.ledgerVision = [...(report.ledgerVision ?? []), result];
    await context.close().catch(() => {});
  }
}

async function verifyLedgerSettlement(theme) {
  const { context, page, localRequests } = await newThemePage(theme);
  const result = {
    entry: `${theme.label} · 心相结算`,
    theme: theme.id,
    requests: 0,
    status: 'failed',
    error: '',
  };
  try {
    await seedTheme(page, theme);
    await page.evaluate(async () => {
      const { ledgerOps } = await import('/src/themes/ledgerOperations.ts');
      const { toLocalDateKey } = await import('/src/store/index.ts');
      await ledgerOps.saveEntry({
        direction: 'expense',
        amount: 42,
        type: 'food',
        category: '',
        channel: '微信',
        note: 'MOCK LEDGER',
        date: toLocalDateKey(),
        source: 'manual',
      }, {});
    });
    await page.evaluate(() => { location.hash = '#/overlay/ledger-settle-sheet'; });
    await page.waitForFunction(() => document.body.innerText.includes('MOCK IGOR REFLECTION'), null, { timeout: 30000 });
    result.requests = localRequests.filter((request) => request.path.endsWith('/chat/completions')).length;
    assert.ok(result.requests > 0, `${theme.label}心相结算没有发出模型请求`);
    result.status = 'passed';
    report.checks.push(`${theme.label}: 心相结算使用真实 AI 回望`);
    await screenshot(page, `${theme.id}-ledger-settlement-ai`);
  } catch (error) {
    result.error = String(error?.stack ?? error);
    result.bodyText = await page.locator('body').innerText().catch(() => '');
    report.failures.push(result);
    await screenshot(page, `${theme.id}-ledger-settlement-failure`).catch(() => {});
  } finally {
    report.ledgerSettlement = [...(report.ledgerSettlement ?? []), result];
    await context.close().catch(() => {});
  }
}

async function verifyActivityAI(theme) {
  const { context, page, localRequests } = await newThemePage(theme);
  const result = {
    entry: `${theme.label} · 记录 AI 分析`,
    theme: theme.id,
    requests: 0,
    status: 'failed',
    error: '',
  };
  try {
    await seedTheme(page, theme);
    await page.evaluate(() => { location.hash = '#/overlay/actions-record-sheet'; });
    const textarea = page.getByLabel('描述你刚才做了什么').first();
    await textarea.waitFor({ state: 'visible', timeout: 20000 });
    await textarea.fill('MOCK ACTIVITY：读完一章书，并整理了笔记。');
    const analyze = page.getByRole('button', { name: /AI 分析/ }).first();
    if (!(await analyze.isVisible().catch(() => false))) {
      await page.getByRole('button', { name: '分析关键词', exact: true }).first().click();
    }
    await analyze.click();
    await page.waitForFunction(() => document.body.innerText.includes('MOCK ACTIVITY REASON'), null, { timeout: 30000 });
    const visionItems = await page.evaluate(async () => {
      const { useAppStore } = await import('/src/store/index.ts');
      const { extractActivitiesFromImage } = await import('/src/utils/visionIntake.ts');
      const settings = useAppStore.getState().settings;
      return await extractActivitiesFromImage(
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z3nYAAAAASUVORK5CYII=',
        settings,
        settings.attributeNames,
      );
    });
    result.requests = localRequests.filter((request) => request.path.endsWith('/chat/completions')).length;
    assert.ok(result.requests >= 2, `${theme.label}记录分析或活动读图没有发出模型请求`);
    assert.ok(visionItems.some((item) => item.text.includes('MOCK 活动截图识别')), `${theme.label}活动截图没有使用视觉模型`);
    result.status = 'passed';
    report.checks.push(`${theme.label}: 记录分析使用真实 AI 评分`);
    await screenshot(page, `${theme.id}-activity-ai`);
  } catch (error) {
    result.error = String(error?.stack ?? error);
    result.bodyText = await page.locator('body').innerText().catch(() => '');
    report.failures.push(result);
    await screenshot(page, `${theme.id}-activity-ai-failure`).catch(() => {});
  } finally {
    report.activityAI = [...(report.activityAI ?? []), result];
    await context.close().catch(() => {});
  }
}

async function verifySharedAI(theme) {
  const { context, page, localRequests } = await newThemePage(theme);
  const result = {
    entry: `${theme.label} · 其他 AI 能力`,
    theme: theme.id,
    requests: 0,
    status: 'failed',
    error: '',
  };
  try {
    await seedTheme(page, theme);
    const state = await page.evaluate(async () => {
      const { useAppStore } = await import('/src/store/index.ts');
      const { LIFE_QUEST_PRESETS } = await import('/src/constants/lifeQuestPresets.ts');
      const { generateAttributeLevelTitles } = await import('/src/utils/attributeLevelTitles.ts');
      const { generatePresetNameMatches } = await import('/src/utils/presetNameMatcher.ts');
      const { generatePersonaPrompt } = await import('/src/utils/navigatorIntent.ts');
      const { splitOperationAI } = await import('/src/utils/orgOpsAI.ts');
      const { ensureLifeQuestAttrMap, ensureLifeQuestAiCard, _resetLifeQuestAIForTest } = await import('/src/utils/lifeQuestAI.ts');
      const { refreshNotifVoiceIfNeeded, getCachedNotifVoice } = await import('/src/utils/notifVoice.ts');
      const { streamCounselReply } = await import('/src/utils/counselAI.ts');
      const { matchConfidant, starShiftConfidant, evaluateInteraction } = await import('/src/utils/confidantAI.ts');
      const { generateSettlement } = await import('/src/utils/ledgerSettlement.ts');
      const { localLedgerSettlement } = await import('/src/themes/ledgerSettlement.ts');

      await useAppStore.getState().updateSettings({
        attributeNames: { knowledge: '洞察', guts: '锋芒', dexterity: '巧手', kindness: '共情', charm: '引力' },
        lifeQuestAiCard: true,
        notifAIVoice: true,
        notificationsEnabled: true,
        navigatorPresetId: 'builtin-cat',
      });
      _resetLifeQuestAIForTest();
      const settings = useAppStore.getState().settings;

      const titles = await generateAttributeLevelTitles(settings, settings.levelThresholds.length || 10);
      const presetNames = await generatePresetNameMatches(settings);
      const persona = await generatePersonaPrompt({
        name: '隔离猫',
        callUser: '大哥',
        toneWords: ['直接', '可靠'],
        coach: 'accompany',
        freeText: '只用于隔离测试',
      });
      const teamTasks = await splitOperationAI(settings, {
        goal: '完成隔离测试',
        daysLeft: 3,
        deadline: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
        people: [{ userId: 'mock-user', codename: '成员一', tarotId: '', card: { personas: [] } }],
      });
      const mapped = await ensureLifeQuestAttrMap(settings, (patch) => useAppStore.getState().updateSettings(patch));
      const aiCard = await ensureLifeQuestAiCard({
        settings: useAppStore.getState().settings,
        seedKey: 'mock-seed',
        todayKey: new Date().toISOString().slice(0, 10),
        activities: [],
        todos: [],
        others: LIFE_QUEST_PRESETS.slice(0, 3).map((preset) => ({
          key: preset.id,
          presetId: preset.id,
          title: String(preset.title).replace('{x}', preset.slots?.[0] ?? ''),
          hint: preset.hint,
          attribute: 'knowledge',
          points: 1,
        })),
      });
      const voiceFresh = await new Promise((resolve) => {
        let settled = false;
        const done = (value) => { if (!settled) { settled = true; resolve(value); } };
        refreshNotifVoiceIfNeeded(useAppStore.getState().settings, () => done(true));
        setTimeout(() => done(!!getCachedNotifVoice(useAppStore.getState().settings.navigatorPresetId || 'board')), 5000);
      });
      const counsel = [];
      for await (const chunk of streamCounselReply(useAppStore.getState().buildCounselContext(), undefined, { greeting: true })) {
        counsel.push(chunk);
      }
      const shift = await starShiftConfidant({
        settings: useAppStore.getState().settings,
        confidantName: '隔离同伴',
        arcanaName: '星星',
        orientation: 'upright',
        currentLevel: 4,
        previousDescription: '旧描述',
        previousInterpretation: '旧解读',
        previousAdvice: '旧建议',
        changeNote: '关系更稳定了',
        recentActivities: [],
      });
      const interaction = await evaluateInteraction({
        settings: useAppStore.getState().settings,
        confidantName: '隔离同伴',
        arcanaName: '星星',
        orientation: 'upright',
        currentLevel: 4,
        description: '一起完成了重要的事',
        relationshipSummary: '长期互相支持',
      }, undefined, true);
      const match = await matchConfidant({
        settings: useAppStore.getState().settings,
        name: '隔离同伴',
        description: '长期互相支持、一起完成重要事情的关系',
        takenArcanaIds: [],
        traits: [{ question: '相处方式', answer: '互相支持' }],
      });
      const ledgerSnapshot = localLedgerSettlement('month', new Date().toISOString().slice(0, 7));
      const settlement = await generateSettlement(ledgerSnapshot.data, useAppStore.getState().settings);
      return {
        titleHasMock: JSON.stringify(titles).includes('MOCK'),
        presetNames,
        persona,
        teamTasks,
        mapped,
        aiCard,
        voiceFresh,
        cachedVoice: getCachedNotifVoice(useAppStore.getState().settings.navigatorPresetId || 'board'),
        counsel: counsel.join(''),
        shift,
        interaction,
        match,
        settlement,
      };
    });
    result.requests = localRequests.filter((request) => request.path.endsWith('/chat/completions')).length;
    assert.ok(result.requests >= 12, `${theme.label}其他 AI 能力请求数不足`);
    assert.equal(state.titleHasMock, true);
    assert.match(state.persona, /MOCK PERSONA PROMPT/);
    assert.match(state.teamTasks['mock-user'] ?? '', /隔离分工任务/);
    assert.equal(state.mapped, true);
    assert.match(state.aiCard?.title ?? '', /MOCK AI 委托/);
    assert.equal(state.voiceFresh, true);
    assert.match(state.counsel, /MOCK_STREAM_AI_REPLY/);
    assert.match(state.shift.description, /MOCK STAR SHIFT DESCRIPTION/);
    assert.match(state.interaction.narrative, /MOCK INTERACTION NARRATIVE/);
    assert.match(state.match.interpretation, /MOCK CONFIDANT INTERPRETATION/);
    assert.match(state.settlement.reflection, /MOCK IGOR REFLECTION/);
    result.status = 'passed';
    report.checks.push(`${theme.label}: 称号/名称匹配/人格/组织/今日委托/通知/谏言均走真实 AI`);
  } catch (error) {
    result.error = String(error?.stack ?? error);
    report.failures.push(result);
  } finally {
    report.sharedAI = [...(report.sharedAI ?? []), result];
    await context.close().catch(() => {});
  }
}

try {
  if (wanted('daily')) for (const theme of selectedThemes) await verifyDaily(theme);
  if (wanted('confidant')) for (const theme of selectedThemes.filter((item) => item.id !== 'red')) await verifyConfidantCreate(theme);
  if (wanted('coop')) for (const theme of selectedThemes.filter((item) => item.id !== 'red')) await verifyCoopMatch(theme);
  if (wanted('fate')) for (const theme of selectedThemes) await verifyFateGlimpse(theme);
  if (wanted('summary')) for (const theme of selectedThemes.filter((item) => item.id !== 'red')) await verifySummaryFollowUp(theme);
  if (wanted('ledger')) for (const theme of selectedThemes) await verifyLedgerBatch(theme);
  if (wanted('vision')) for (const theme of selectedThemes) await verifyLedgerVision(theme);
  if (wanted('settlement')) for (const theme of selectedThemes) await verifyLedgerSettlement(theme);
  if (wanted('activity')) for (const theme of selectedThemes) await verifyActivityAI(theme);
  if (wanted('shared')) for (const theme of selectedThemes) await verifySharedAI(theme);
  assert.equal(report.failures.length, 0, report.failures.map((failure) => `${failure.entry}: ${failure.error}`).join('\n'));
  assert.equal(report.pageErrors.length, 0, report.pageErrors.join(' | '));
  report.ok = true;
} catch (error) {
  report.error = String(error?.stack ?? error);
} finally {
  await browser.close().catch(() => {});
  writeFileSync(resolve(out, 'report.json'), JSON.stringify(report, null, 2));
}

console.log(JSON.stringify({
  ok: report.ok,
  daily: report.daily,
  failures: report.failures.map((failure) => failure.entry),
  pageErrors: report.pageErrors.length,
  report: resolve(out, 'report.json'),
}, null, 2));
if (!report.ok) process.exitCode = 1;
