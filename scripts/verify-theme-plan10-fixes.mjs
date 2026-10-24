// Focused verification for the two plan-10 defects the user explicitly asked
// to repair. AI stays on an isolated same-origin mock; no external network,
// real account, cloud write, deployment, APK, or charged model call.
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
  scope: 'Plan 10 named defects: red interaction/starshift/match and red summary must use the real AI pipeline; blue/pink/yellow counsel banner must re-read settings while open.',
  base,
  checks: [],
  requests: [],
  pageErrors: [],
  localFailures: [],
  blockedExternal: 0,
};

const json = (route, body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
const sse = (route, text) => {
  const chunks = String(text).match(/[\s\S]{1,28}/g) ?? [String(text)];
  const body = chunks.map((chunk) => `data: ${JSON.stringify({ choices: [{ delta: { content: chunk }, finish_reason: null }] })}\n\n`).join('')
    + `data: ${JSON.stringify({ choices: [{ delta: {}, finish_reason: 'stop' }] })}\n\n`
    + 'data: [DONE]\n\n';
  return route.fulfill({ status: 200, contentType: 'text/event-stream', headers: { 'cache-control': 'no-cache' }, body });
};

function aiReplyFor(text) {
  if (text.includes('判断亲密度建议加点')) {
    return {
      delta: 4,
      narrative: 'MOCK INTERACTION · 烛火向前挪了一寸，你们都在认真听对方没说完的半句。',
      advice: 'MOCK ADVICE · 下次把那个没说完的半句接回来。',
    };
  }
  if (text.includes('重新落墨')) {
    return {
      orientation: 'upright',
      description: 'MOCK SHIFT DESCRIPTION · 你们把一次普通的并肩，变成了愿意再约下一次的默契。',
      interpretation: 'MOCK SHIFT READING · 光落在两个人之间，影子也没有催你们。',
      advice: 'MOCK SHIFT ADVICE · 给下一次见面留一个具体时间。',
      summary: 'MOCK SHIFT SUMMARY · 关系向前半步',
    };
  }
  if (text.includes('匹配一张大阿卡纳')) {
    return {
      arcanaId: 'star',
      orientation: 'upright',
      initialIntimacy: 2,
      interpretation: 'MOCK MATCH · 星星不是答案，是你们还愿意抬头看的方向。',
      advice: 'MOCK MATCH ADVICE · 把下一次见面说成一件具体的小事。',
    };
  }
  return null;
}

const context = await chromium.launchPersistentContext(resolve(out, 'profile'), {
  executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  viewport: { width: 390, height: 844 },
  serviceWorkers: 'block',
  reducedMotion: 'reduce',
});

let page;
async function waitRoot() {
  await page.waitForFunction(() => (document.querySelector('#root')?.childElementCount ?? 0) > 0, null, { timeout: 25000 });
  await page.waitForTimeout(250);
}

async function goto(hash = '#/') {
  const nonce = `${Date.now()}-${Math.random()}`;
  await page.goto(`${base}/?plan10fix=${nonce}${hash}`, { waitUntil: 'domcontentloaded' });
  await waitRoot();
}

async function evalRetry(fn, arg) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      return await page.evaluate(fn, arg);
    } catch (error) {
      if (!/Execution context was destroyed|interrupted by another navigation/i.test(String(error))) throw error;
      await page.waitForTimeout(700);
      await waitRoot().catch(() => {});
    }
  }
  throw new Error('page kept navigating during isolated setup');
}

async function setTheme(theme) {
  await evalRetry(async (theme) => {
    const { useAppStore } = await window.__getAppStoreModule();
    const { db } = await import('/src/db/index.ts');
    await useAppStore.getState().loadData();
    const user = (await db.users.toArray())[0] ?? useAppStore.getState().user;
    if (user) await db.users.update(user.id, { theme });
    if (useAppStore.getState().user) await useAppStore.getState().setTheme(theme);
  }, theme);
  await page.waitForTimeout(500);
}

async function setMockAi(enabled) {
  await evalRetry(async (enabled) => {
    const { useAppStore } = await window.__getAppStoreModule();
    await useAppStore.getState().updateSettings(enabled ? {
      summaryApiProvider: 'custom',
      summaryApiKey: 'plan10-fix-mock-key',
      summaryApiBaseUrl: `${location.origin}/v1`,
      summaryModel: 'plan10-fix-fast',
      summaryDeliberate: true,
      aiProfiles: {
        custom: {
          key: 'plan10-fix-mock-key',
          baseUrl: `${location.origin}/v1`,
          models: ['plan10-fix-fast'],
          modelCaps: {},
        },
      },
    } : {
      summaryApiProvider: 'custom',
      summaryApiKey: '',
      summaryApiBaseUrl: '',
      summaryModel: '',
      aiProfiles: {},
    });
  }, enabled);
  await page.waitForTimeout(300);
}

function attach() {
  page.on('pageerror', (error) => report.pageErrors.push(error.message));
  page.on('response', (response) => {
    const url = new URL(response.url());
    if (url.origin === base && response.status() >= 400 && !url.pathname.startsWith('/v1/')) {
      report.localFailures.push(`${response.status()} ${url.pathname}`);
    }
  });
}

function check(name, detail) {
  report.checks.push({ name, detail });
}

let lastPage;
try {
  await context.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== base) {
      report.blockedExternal += 1;
      return route.abort();
    }
    if (url.pathname.startsWith('/api/')) return json(route, { items: [] });
    if (url.pathname === '/v1/models') return json(route, { data: [{ id: 'plan10-fix-fast' }] });
    if (url.pathname !== '/v1/chat/completions') return route.continue();

    const body = request.postDataJSON();
    const joined = body.messages?.map((message) => message.content).join('\n') ?? '';
    const kind = joined.includes('判断亲密度建议加点') ? 'interaction'
      : joined.includes('重新落墨') ? 'starshift'
        : joined.includes('匹配一张大阿卡纳') ? 'match'
          : joined.includes('写法规则') ? 'summary'
            : joined.includes('直接回答即可') ? 'summary-followup'
              : 'other';
    report.requests.push({ kind, stream: !!body.stream });
    if (body.stream) {
      if (kind === 'summary') {
        return sse(route, 'MOCK SUMMARY · 这一周你留下了几条真实记录。\n\nMOCK SUMMARY SECOND · 下次继续从最小的一步开始。\n<<<META>>>\n{"memo":"MOCK SUMMARY MEMO","question":"下一步先做什么？"}');
      }
      return sse(route, 'MOCK SUMMARY FOLLOWUP · 先做五分钟能完成的那一步。');
    }
    const reply = aiReplyFor(joined);
    if (!reply) return json(route, { error: { message: 'unclassified mock request' } }, 400);
    return json(route, { choices: [{ message: { role: 'assistant', content: JSON.stringify(reply) }, finish_reason: 'stop' }] });
  });

  page = await context.newPage();
  lastPage = page;
  attach();
  await page.addInitScript(() => {
    window.__getAppStoreModule = () => {
      const urls = performance.getEntriesByType('resource').map((entry) => entry.name);
      const url = urls.find((item) => item.includes('/src/store/index.ts'));
      return import(url || '/src/store/index.ts');
    };
  });
  await goto('#/');
  await evalRetry(async () => {
    const { useAppStore } = await window.__getAppStoreModule();
    const store = useAppStore.getState();
    if (!store.user) await store.createUser('计划10修复隔离档案');
    await useAppStore.getState().setTheme('red');
    const existing = useAppStore.getState().confidants[0];
    if (!existing) {
      await useAppStore.getState().addConfidant({
        name: '计划10真',
        description: '一起做计划、偶尔在夜里长谈的朋友。',
        initialLevel: 4,
        skillAttribute: 'guts',
        match: {
          arcanaId: 'chariot',
          orientation: 'upright',
          initialIntimacy: 4,
          initialPoints: 3,
          interpretation: '初始解读',
          advice: '初始建议',
          source: 'offline',
        },
      });
    }
  });
  await setMockAi(true);

  // Red interaction uses evaluateInteraction and the returned narrative is saved.
  await goto('#/overlay/bond-interaction?step=input&__motion=low&__snd=0&__dev=0');
  await page.locator('textarea[data-in="t"]').fill('今天和真把拖了两周的计划重新排了一遍，也认真聊了彼此最近的压力。');
  await page.locator('[data-a="eval"]').click();
  await page.waitForFunction(() => document.body.innerText.includes('MOCK INTERACTION'), null, { timeout: 15000 });
  assert.match(await page.locator('body').innerText(), /MOCK ADVICE/);
  check('red interaction: real AI response rendered', 'MOCK INTERACTION + MOCK ADVICE');
  await page.locator('[data-a="ok"]').click();
  await page.waitForFunction(() => !document.querySelector('[role="dialog"][aria-label^="今日与"]'), null, { timeout: 15000 });
  const interactionState = await evalRetry(async () => {
    const { useAppStore } = await window.__getAppStoreModule();
    const { db } = await import('/src/db/index.ts');
    const remembered = useAppStore.getState().confidantEvents.find((item) => item.userInput?.includes('拖了两周'));
    const persisted = (await db.confidantEvents.toArray()).find((item) => item.userInput?.includes('拖了两周'));
    return persisted ? {
      narrative: persisted.narrative,
      advice: persisted.advice,
      delta: persisted.delta,
      storeNarrative: remembered?.narrative ?? null,
    } : null;
  });
  assert.match(interactionState?.narrative ?? '', /MOCK INTERACTION/);
  assert.match(interactionState?.advice ?? '', /MOCK ADVICE/);
  check('red interaction: real narrative persisted', JSON.stringify(interactionState));

  // Red star shift uses starShiftConfidant, previews the returned values and persists them.
  await evalRetry(async () => {
    const { useAppStore } = await window.__getAppStoreModule();
    await useAppStore.getState().loadConfidants();
    const cf = useAppStore.getState().confidants[0];
    await useAppStore.getState().updateConfidant(cf.id, { starShiftCharges: 1 });
  });
  await goto('#/overlay/bond-starshift-p5?stage=input&__motion=low&__snd=0&__dev=0');
  await page.locator('#oc-sf-in').fill('最近一次见面之后，我们都更愿意主动约下一次了。');
  await page.locator('[data-a="start"]').click();
  await page.waitForFunction(() => document.body.innerText.includes('MOCK SHIFT DESCRIPTION'), null, { timeout: 15000 });
  assert.match(await page.locator('body').innerText(), /MOCK SHIFT READING/);
  check('red starshift: real AI preview rendered', 'MOCK SHIFT DESCRIPTION + MOCK SHIFT READING');
  await page.locator('[data-a="ink"]').click();
  await page.waitForFunction(() => document.body.innerText.includes('这一次的落墨已经收进档案'), null, { timeout: 15000 });
  const shiftState = await evalRetry(async () => {
    const { useAppStore } = await window.__getAppStoreModule();
    await useAppStore.getState().loadConfidants();
    const cf = useAppStore.getState().confidants[0];
    return { description: cf.description, interpretation: cf.aiInterpretation, advice: cf.aiAdvice, charges: cf.starShiftCharges };
  });
  assert.match(shiftState.description, /MOCK SHIFT DESCRIPTION/);
  assert.match(shiftState.interpretation, /MOCK SHIFT READING/);
  assert.equal(shiftState.charges, 0);
  check('red starshift: real values persisted and charge consumed', JSON.stringify(shiftState));

  // Red star match uses matchConfidant, not T.PRIESTESS fixed text.
  await goto('#/overlay/bond-coop-ai-match?step=description&__motion=low&__snd=0&__dev=0');
  await page.locator('textarea[data-in="d"]').fill('会把荒唐计划认真做完的人，关键时刻从不掉链子。');
  await page.locator('[data-a="n"]').click();
  for (let i = 0; i < 4; i++) {
    await page.locator('[data-a="trait"]').first().click();
    await page.waitForTimeout(320);
  }
  await page.waitForFunction(() => document.body.innerText.includes('MOCK MATCH'), null, { timeout: 15000 });
  const matchText = await page.locator('body').innerText();
  assert.match(matchText, /MOCK MATCH ADVICE/);
  assert.match(matchText, /星星/);
  assert.doesNotMatch(matchText, /女教皇正位：冷静、克制、洞察/);
  check('red match: real AI tarot result rendered', 'MOCK MATCH + 星星，不含固定女教皇文案');

  // Red summary uses the background summary job, streams the mock letter and saves it.
  await goto('#/overlay/actions-summary-generate?__motion=low&__snd=0&__dev=0');
  await page.locator('[data-gen]').click();
  await page.waitForFunction(() => document.body.innerText.includes('MOCK SUMMARY SECOND'), null, { timeout: 30000 });
  assert.match(await page.locator('article.oa-letter').innerText(), /MOCK SUMMARY/);
  check('red summary: mock stream reached the letter', 'MOCK SUMMARY SECOND');
  await page.waitForFunction(() => {
    const button = document.querySelector('[data-save]');
    return !!button && !button.disabled;
  }, null, { timeout: 20000 });
  await page.locator('[data-save]').click();
  await page.waitForFunction(async () => {
    const { useAppStore } = await window.__getAppStoreModule();
    return useAppStore.getState().summaries.some((item) => item.content.includes('MOCK SUMMARY SECOND'));
  }, null, { timeout: 20000 });
  const savedSummary = await evalRetry(async () => {
    const { useAppStore } = await window.__getAppStoreModule();
    const { db } = await import('/src/db/index.ts');
    const summary = (await db.summaries.toArray()).find((item) => item.content.includes('MOCK SUMMARY SECOND'));
    return summary ? {
      id: summary.id,
      label: summary.label,
      memo: summary.memo,
      question: summary.question,
      storeCount: useAppStore.getState().summaries.length,
    } : null;
  });
  assert.ok(savedSummary, 'summary was not saved to the real store');
  assert.equal(savedSummary.memo, 'MOCK SUMMARY MEMO');
  check('red summary: archived to real summaries store', JSON.stringify(savedSummary));

  // With no key, red interaction must go offline and say so; no mock AI request is allowed.
  await setMockAi(false);
  await evalRetry(async () => {
    const { useAppStore } = await window.__getAppStoreModule();
    await useAppStore.getState().loadConfidants();
    const cf = useAppStore.getState().confidants[0];
    await useAppStore.getState().updateConfidant(cf.id, { lastInteractionDate: '2026-10-23' });
  });
  await goto('#/overlay/bond-interaction?step=input&__motion=low&__snd=0&__dev=0');
  const beforeOfflineRequests = report.requests.length;
  await page.locator('textarea[data-in="t"]').fill('今天只是安静地一起走了一段路，没有发生什么大事。');
  assert.match(await page.locator('body').innerText(), /未配置 AI API，将使用离线模式评估/);
  await page.locator('[data-a="eval"]').click();
  await page.waitForFunction(() => document.body.innerText.includes('本次为离线评估'), null, { timeout: 15000 });
  assert.equal(report.requests.length, beforeOfflineRequests, 'offline interaction unexpectedly called the model');
  check('red interaction: unconfigured path is visibly offline', '离线评估 + 0 model requests');

  // Counsel banner must react to a key saved after the overlay has already mounted.
  for (const [theme, label] of [['blue', '蓝'], ['pink', '粉'], ['yellow', '黄']]) {
    await setMockAi(false);
    await setTheme(theme);
    await goto('#/overlay/bond-counsel-chat?__motion=low&__snd=0&__dev=0');
    const kit = { blue: 'p3r-blue', pink: 'p3r-pink', yellow: 'p4g-yellow' }[theme];
    await page.waitForFunction((kit) => document.documentElement.getAttribute('data-kit') === kit, kit, { timeout: 15000 });
    await page.waitForFunction(() => document.body.innerText.includes('尚未配置 AI 密钥'), null, { timeout: 15000 });
    await setMockAi(true);
    const keyDiag = await evalRetry(async () => {
      const { useAppStore } = await window.__getAppStoreModule();
      const { counselHasKey } = await import('/src/utils/counselAI.ts');
      const settings = useAppStore.getState().settings;
      return {
        provider: settings.summaryApiProvider,
        baseUrl: settings.summaryApiBaseUrl,
        keyLength: (settings.summaryApiKey ?? '').length,
        hasKey: counselHasKey(settings),
        renderedKey: document.querySelector('[data-counsel-key]')?.getAttribute('data-counsel-key') ?? null,
      };
    });
    report.counselDiagnostics = [...(report.counselDiagnostics ?? []), { theme, keyDiag }];
    await page.waitForFunction(() => !document.body.innerText.includes('尚未配置 AI 密钥'), null, { timeout: 8000 });
    assert.match(await page.locator('body').innerText(), /谏言/);
    check(`${label} counsel: banner updates after key write`, 'mounted before key; banner disappeared');
  }

  assert.equal(report.pageErrors.length, 0, `pageErrors: ${report.pageErrors.join(' | ')}`);
  assert.equal(report.localFailures.length, 0, `localFailures: ${report.localFailures.join(' | ')}`);
  report.ok = true;
} catch (error) {
  report.ok = false;
  report.error = error.stack;
  if (lastPage) {
    await lastPage.screenshot({ path: resolve(out, 'failure.png'), fullPage: true }).catch(() => {});
    report.failureState = await lastPage.evaluate(() => ({
      url: location.href,
      body: document.body.innerText.slice(0, 4000),
    })).catch((stateError) => ({ error: String(stateError) }));
  }
  process.exitCode = 1;
} finally {
  writeFileSync(resolve(out, 'report.json'), JSON.stringify(report, null, 2));
  await context.close();
  console.log(JSON.stringify({
    ok: report.ok,
    error: report.error,
    checks: report.checks,
    requestCounts: report.requests.reduce((acc, item) => {
      acc[item.kind] = (acc[item.kind] ?? 0) + 1;
      return acc;
    }, {}),
    pageErrors: report.pageErrors,
    localFailures: report.localFailures,
    evidence: out,
  }, null, 2));
}
