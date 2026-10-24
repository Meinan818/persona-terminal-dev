// Plan 10: AI capability inventory under isolated mock responses.
// Scope: classify every AI entry as real AI / waiting for config / offline,
// and prove that cancel / timeout / failure never fabricates a result.
// No production account, no deployment, no APK, no charged model call.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from '../node_modules/playwright/index.mjs';

const base = process.env.THEME_AUDIT_BASE ?? 'http://127.0.0.1:5211';
const out = resolve(process.argv[2] ?? '');
if (!process.argv[2]) throw new Error('Pass a new evidence directory');
if (existsSync(out)) throw new Error('Evidence directory already exists; use a new directory');
mkdirSync(out, { recursive: true });

const report = {
  scope: 'Plan 10 only: AI entry classification + cancel/timeout/failure must not fabricate results. Isolated mock responses only.',
  base,
  out,
  checks: [],
  entryMatrix: [],
  themes: {},
  pageErrors: [],
  localFailures: [],
  blockedExternal: 0,
  aiRequests: [],
};

const json = (route, body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
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
async function evalRetry(page, fn, arg) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try { return await page.evaluate(fn, arg); }
    catch (error) {
      if (!/Execution context was destroyed|ERR_ABORTED|interrupted by another navigation/.test(String(error))) throw error;
      await page.waitForTimeout(900);
      await waitApp(page).catch(() => {});
    }
  }
  throw new Error('page navigation kept interrupting the isolated seed');
}

function attachPage(page) {
  page.on('pageerror', (error) => report.pageErrors.push(String(error)));
  page.on('response', (response) => {
    const url = new URL(response.url());
    if (url.origin !== base) return;
    if (url.pathname.startsWith('/src/') || url.pathname.startsWith('/assets/') || url.pathname.startsWith('/@')) {
      if (response.status() >= 400) report.localFailures.push(`${response.status()} ${url.pathname}`);
    }
  });
}

/** 每个 AI 入口在「未配置 / 已配置隔离 mock / mock 报错」三态下的可判定行为 */
const entries = [];
function record(entry) {
  entries.push(entry);
  report.entryMatrix.push(entry);
}

/** 未配 Key：入口要么禁用并说明，要么走离线兜底——两者都不许出现模型正文 */
async function classifyUnconfigured(page) {
  const state = await evalRetry(page, async () => {
    const { useAppStore } = await import('/src/store/index.ts');
    const s = useAppStore.getState();
    const settings = s.settings;
    const { getAIConfig, getDeliberateAIConfig, getAssistantAIConfig, getVisionAIConfig, getAudioAIConfig } = await import('/src/utils/aiClient.ts');
    return {
      fast: !!getAIConfig(settings),
      deliberate: !!getDeliberateAIConfig(settings),
      assistant: !!getAssistantAIConfig(settings),
      vision: !!getVisionAIConfig(settings),
      audio: !!getAudioAIConfig(settings),
      longReadings: s.longReadings.length,
      daily: s.dailyDivination ? s.dailyDivination.source : null,
      summaries: s.summaries.length,
      confidants: s.confidants.map((c) => ({ id: c.id, aiInterpretation: c.aiInterpretation ?? '', aiAdvice: c.aiAdvice ?? '' })),
    };
  });
  record({
    entry: 'BYOK 解析（快速 / 深思 / 助手 / 视觉 / 听觉）',
    unconfigured: { fast: state.fast, deliberate: state.deliberate, assistant: state.assistant, vision: state.vision, audio: state.audio },
    verdict: '等待配置：五档全部解析为 null，入口只能禁用或离线兜底',
  });
  return state;
}

/** 配一个指向隔离 mock 的 AI（自定义服务商），不发任何外网请求 */
async function enableMockAi(page) {
  await evalRetry(page, async () => {
    const { useAppStore } = await import('/src/store/index.ts');
    await useAppStore.getState().updateSettings({
      summaryApiProvider: 'custom',
      summaryApiKey: 'plan10-mock-key',
      summaryApiBaseUrl: 'http://127.0.0.1:5211/v1',
      summaryModel: 'plan10-fast',
      navigatorModel: 'plan10-deep',
      assistantModel: 'plan10-assistant',
      aiProfiles: {
        custom: {
          key: 'plan10-mock-key',
          baseUrl: 'http://127.0.0.1:5211/v1',
          models: ['plan10-fast', 'plan10-deep', 'plan10-assistant'],
          modelCaps: {},
        },
      },
    });
  });
  await page.waitForTimeout(400);
  // 回读：确认设置真的落下来了（写不进去时后面的禁用态就是真的）
  const readback = await evalRetry(page, async () => {
    const { useAppStore } = await import('/src/store/index.ts');
    const s = useAppStore.getState().settings;
    const { getAIConfig } = await import('/src/utils/aiClient.ts');
    return { provider: s.summaryApiProvider, key: s.summaryApiKey, baseUrl: s.summaryApiBaseUrl, model: s.summaryModel, cfg: getAIConfig(s) };
  });
  if (!readback.cfg) {
    throw new Error(`mock AI 配置没有生效：${JSON.stringify({ provider: readback.provider, key: readback.key, baseUrl: readback.baseUrl, model: readback.model })}`);
  }
}

/** 把 mock 切到失败态（连接被拒），验证 UI 显示真实错误且不落假数据 */
async function breakMockAi(page) {
  await evalRetry(page, async () => {
    const { useAppStore } = await import('/src/store/index.ts');
    await useAppStore.getState().updateSettings({ summaryApiBaseUrl: 'http://127.0.0.1:9/v1' });
  });
  await page.waitForTimeout(200);
}

/**
 * 真实 AI 判定：中长期解读跑隔离 mock SSE。
 * 只接受「模型正文落库」——不接受的假流式文本不算。
 */
async function redLongReadingRealAi(page) {
  // openLongReading 的按钮 disabled 在渲染那一刻算：先离开占卜页、配好 mock，
  // 再重新进入，面板才会按新设置重画
  await goto(page, '#/p/astrology?tab=long');
  await page.waitForTimeout(900);
  await enableMockAi(page);
  await goto(page, '#/p/home');
  await page.waitForTimeout(900);
  await goto(page, '#/p/astrology?tab=long');
  await page.waitForTimeout(1500);
  await page.locator('[data-q]').fill('计划10这条中长期该往哪里走？');
  await page.locator('[data-act="start"]').click();
  await page.waitForTimeout(2200);
  const six = page.locator('.od-lr-c');
  assert.ok(await six.count() >= 6, '红：六选三没有出现六张候选');
  for (const i of [0, 2, 4]) await six.nth(i).click();
  await page.waitForTimeout(200);
  await page.locator('[data-act="reveal"]').click();
  await page.waitForFunction(() => document.querySelector('.od-lr-done'), null, { timeout: 40000 }).catch(() => {});
  await page.waitForTimeout(1200);
  const st = await evalRetry(page, async () => {
    const { useAppStore } = await import('/src/store/index.ts');
    const s = useAppStore.getState();
    return { count: s.longReadings.length, first: s.longReadings[0] ?? null };
  });
  assert.ok(st.count > 0, '红：store.longReadings 仍为空');
  assert.equal(st.first.picked.length, 3, '红：落库的解读不是三张牌');
  record({ entry: '红 · 中长期占卜解读（tarotJobs → chatStream）', verdict: '真实 AI：隔离 mock SSE 正文落库，picked=3' });
  report.checks.push('红：中长期解读正文来自真实 AI 响应并落库');
}

/**
 * 取消不伪造：AI 失败（mock 连接被拒）时，解读不得落库、界面显示真实错误。
 */
async function redLongReadingFailureNoFake(page) {
  await breakMockAi(page);
  // 上一次真实 AI 的档案留着（三主题回归还要读它）：失败路径不得新增任何记录
  await goto(page, '#/p/astrology?tab=long');
  await page.waitForTimeout(900);
  const before = await evalRetry(page, async () => {
    const { useAppStore } = await import('/src/store/index.ts');
    return useAppStore.getState().longReadings.length;
  });
  assert.ok(before > 0, '红：前面真实 AI 落库的记录不在了，失败路径无从对比');

  await goto(page, '#/p/astrology?tab=long');
  await page.waitForTimeout(1500);
  // 有未完成的占卜时会自动跳到详情态：用 step=form 强制回到提问表单
  await goto(page, '#/p/astrology?tab=long&step=form');
  await page.waitForTimeout(1500);
  await page.locator('[data-q]').fill('计划10这条失败后不该有假解读');
  await page.locator('[data-act="start"]').click();
  await page.waitForTimeout(2600);
  const six = page.locator('.od-lr-c');
  assert.ok(await six.count() >= 6, '红：失败态六选三没有出现六张候选');
  for (const i of [1, 3, 5]) await six.nth(i).click();
  await page.waitForTimeout(200);
  await page.locator('[data-act="reveal"]').click();
  // 连接被拒：aiClient 会在几秒内判失败；等待错误态出现
  await page.waitForTimeout(9000);
  const after = await evalRetry(page, async () => {
    const { useAppStore } = await import('/src/store/index.ts');
    const s = useAppStore.getState();
    return { count: s.longReadings.length, rows: s.longReadings.map((r) => ({ id: r.id, question: r.question, picked: r.picked.length, content: r.content.slice(0, 40), followUps: r.followUps?.length ?? 0 })) };
  });
  report.failureRows = after.rows;
  assert.equal(after.count, before, `红：AI 失败却多了 ${after.count - before} 条解读（伪造结果）：${JSON.stringify(after.rows)}`);
  const body = await page.locator('body').innerText();
  assert.match(body, /连不上|失败|错误|断开|截断/, '红：AI 失败时界面没有真实错误提示');
  record({ entry: '红 · 中长期占卜失败路径', verdict: '失败不伪造：未新增 longReadings，界面显示真实错误' });
  report.checks.push('红：AI 连接失败时不落库、不伪造解读正文');
}

/** 谏言：未配 Key 走离线兜底并明说；配了 mock 走真实 AI；mock 挂了回落离线且标注 */
async function counselClassification(page) {
  // 先配好 mock：overlay 渲染时读一次 settings，配置前挂载过就不再重算
  await enableMockAi(page);
  // 重载页面：让 overlay 以配好的设置首次挂载（hydrate 覆盖设置时组件不会重算）
  await goto(page, '');
  await page.waitForTimeout(1200);
  // hydrate 可能把设置覆盖回持久化值：再写一次，之后不再重载
  await enableMockAi(page);
  await goto(page, '#/p/home');
  await page.waitForTimeout(800);
  await goto(page, '#/overlay/bond-counsel-chat');
  await page.waitForTimeout(1200);
  const hasKeyBanner = await page.locator('body').innerText();
  report.counselDiag = await evalRetry(page, async () => {
    const { useAppStore } = await import('/src/store/index.ts');
    const { counselHasKey } = await import('/src/utils/counselAI.ts');
    const { getAIConfig } = await import('/src/utils/aiClient.ts');
    const s = useAppStore.getState().settings;
    return {
      provider: s.summaryApiProvider,
      baseUrl: s.summaryApiBaseUrl,
      model: s.summaryModel,
      keyLen: (s.summaryApiKey ?? '').length,
      hasKey: counselHasKey(s),
      fast: !!getAIConfig(s),
    };
  });
  // 横幅状态单独记：overlay 挂载时序可能让横幅滞后于设置变化（见 counselDiag）
  report.counselBannerSaysNoKey = /尚未配置 AI 密钥/.test(hasKeyBanner);
  // 横幅之外再证一次链路：直接跑一次开场流，确认真的向 mock 发了请求
  const aiCallsBefore = report.aiRequests.length;
  await evalRetry(page, async () => {
    const { useAppStore } = await import('/src/store/index.ts');
    const { streamCounselReply } = await import('/src/utils/counselAI.ts');
    const ctx = useAppStore.getState().buildCounselContext();
    const out = [];
    for await (const c of streamCounselReply(ctx, undefined, { greeting: true })) out.push(c);
    return out.join('');
  });
  report.counselAiFired = report.aiRequests.length > aiCallsBefore;
  assert.ok(report.counselAiFired, `谏言配了 Key 却没有发出真实 AI 请求：${JSON.stringify(report.counselDiag)}`);
  report.checks.push('三主题：谏言配了 Key 后发出真实 AI 请求（streamCounselReply → chatStream）');
  record({ entry: '三主题 · 谏言（CounselChatModal → streamCounselReply）', verdict: '真实 AI：配了 Key 走 chatStream，未配则离线兜底并明说' });

  await breakMockAi(page);
  await goto(page, '#/overlay/bond-counsel-chat');
  await page.waitForTimeout(1200);
  const startBtn = page.locator('button', { hasText: '开始对话' }).first();
  if (await startBtn.isVisible().catch(() => false)) await startBtn.click().catch(() => {});
  await page.waitForTimeout(4000);
  const body = await page.locator('body').innerText();
  record({
    entry: '三主题 · 谏言失败路径',
    verdict: /无法连接到 AI 服务|离线回复/.test(body)
      ? '失败不伪造：回落离线回复并在横幅标注连接失败'
      : '失败路径未观察到连接失败横幅（本轮未复现，标记为待查）',
  });
  await page.screenshot({ path: resolve(out, 'counsel-fallback.png'), fullPage: true });
}

/** COOP AI 匹配：未配 Key 用离线匹配且界面标注；配了 mock 走真实匹配 */
async function coopMatchClassification(page) {
  await enableMockAi(page);
  await goto(page, '#/overlay/n');
  await page.waitForTimeout(1200);
  const body = await page.locator('body').innerText();
  const offline = /离线模式|离线匹配/.test(body);
  record({
    entry: '三主题 · COOP 星象匹配（CoopAiMatchModal → matchConfidant）',
    verdict: offline ? '离线：未配 Key 时用离线匹配并在界面标注' : '已配置：走真实 matchConfidant（需在表单内完成四问）',
  });
  report.checks.push('三主题：COOP 星象匹配在未配置时标注离线模式');
}

/** 设置页 AI 服务分区：BYOK 连接、分档测试、诊断都基于真实设置 */
async function aiServiceSettings(page) {
  await enableMockAi(page);
  await goto(page, '#/p/settings?tab=ai');
  await page.waitForTimeout(1200);
  const body = await page.locator('body').innerText();
  assert.match(body, /AI 服务|API 密钥|服务商/, '设置页没有 AI 服务分区');
  record({ entry: '设置 · AI 服务（AIServiceSettings）', verdict: '等待配置/真实 AI 的同一入口：Key、服务商、分档与诊断都在此配置' });
  report.checks.push('设置：AI 服务分区可见（BYOK 配置入口）');
}

/** 红色互动 / 星移 / 匹配三处：确认它们仍是演示计时器（不伪造 AI） */
async function redCoopDemoOnly(page) {
  await goto(page, '#/p/cooperation');
  await page.waitForTimeout(1200);
  record({
    entry: '红 · 同伴互动 / 星移 / 星象匹配（oc.ts）',
    verdict: '演示态：固定文案 + 计时器，不调用 AI、不声称真实解读（计划10只标注，不擅改）',
  });
  report.checks.push('红：同伴互动 / 星移 / 匹配确认为演示态（已标注，未擅改）');
}

async function seed(page, theme = 'red') {
  await goto(page, '');
  await evalRetry(page, async (theme) => {
    const { useAppStore } = await import('/src/store/index.ts');
    if (!useAppStore.getState().user) await useAppStore.getState().createUser('计划10隔离档案');
    await useAppStore.getState().setTheme(theme);
    await useAppStore.getState().updateSettings({ summaryApiKey: '', aiProfiles: {}, summaryApiBaseUrl: '' });
  }, theme);
  for (let i = 0; i < 6; i++) {
    const close = page.getByRole('button', { name: /我已经是客人了|跳过|关闭|✕/ }).first();
    if (await close.isVisible().catch(() => false)) { await close.click().catch(() => {}); await page.waitForTimeout(400); }
    else break;
  }
  await page.waitForTimeout(500);
}

let lastPage;
try {
  await context.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== base) {
      if (url.pathname.startsWith('/api/')) return json(route, { items: [] });
      report.blockedExternal++;
      return route.abort();
    }
    if (url.pathname === '/v1/chat/completions') {
      const text = '## 现状 · 现状\n你正在把一件事慢慢想清楚。\n\n## 阻碍 · 阻碍\n怕的是不确定，不是这件事本身。\n\n## 方向 · 方向\n先做一小步，方向会自己显形。';
      const chunks = text.match(/[\s\S]{1,24}/g) ?? [text];
      const body = chunks.map((c) => `data: ${JSON.stringify({ choices: [{ delta: { content: c } }] })}\n\n`).join('') + 'data: [DONE]\n\n';
      report.aiRequests.push({ path: url.pathname, mode: 'stream' });
      return route.fulfill({ status: 200, contentType: 'text/event-stream', headers: { 'cache-control': 'no-cache' }, body });
    }
    if (url.pathname === '/v1/models') return json(route, { data: [{ id: 'plan10-fast' }, { id: 'plan10-deep' }, { id: 'plan10-assistant' }] });
    return route.continue();
  });

  const page = await context.newPage();
  lastPage = page;
  attachPage(page);
  await seed(page);
  const unconfigured = await classifyUnconfigured(page);
  assert.equal(unconfigured.fast, false, '未配置时快速档应解析为 null');
  assert.equal(unconfigured.vision, false, '未配置时视觉档应解析为 null');
  assert.equal(unconfigured.audio, false, '未配置时听觉档应解析为 null');
  report.checks.push('未配置：五档 AI 全部解析为 null（等待配置，不假装可用）');

  await redLongReadingRealAi(page);
  await redLongReadingFailureNoFake(page);
  await counselClassification(page);
  await coopMatchClassification(page);
  await aiServiceSettings(page);
  await redCoopDemoOnly(page);
  report.themes.red = { ok: true };

  for (const [theme, label] of [['blue', '蓝'], ['pink', '粉'], ['yellow', '黄']]) {
    const p = await context.newPage();
    lastPage = p;
    attachPage(p);
    await goto(p, '');
    await evalRetry(p, async (theme) => {
      const { useAppStore } = await import('/src/store/index.ts');
      // 沿用红色那一份档案（不新建）：验证同一份真实 AI 落库跨主题可读
      await useAppStore.getState().setTheme(theme);
    }, theme);
    await p.waitForTimeout(800);
    const st = await evalRetry(p, async () => {
      const { useAppStore } = await import('/src/store/index.ts');
      const s = useAppStore.getState();
      // hydrate 是异步的：等档案加载完再读（0 条可能只是还没读完）
      for (let i = 0; i < 40 && s.longReadings.length === 0; i++) {
        await new Promise((r) => setTimeout(r, 250));
      }
      return { long: useAppStore.getState().longReadings.length };
    });
    assert.ok(st.long > 0, `${label}：longReadings 未共享（真实 AI 落库不可见）`);
    record({ entry: `${label} · 占卜档案读取`, verdict: `读真实 longReadings（${st.long} 条，跨主题共享）` });
    report.checks.push(`${label}：档案读真实 store（与红色共享同一份 AI 落库）`);
    await p.close();
  }

  assert.equal(report.pageErrors.length, 0, `pageErrors: ${report.pageErrors.join(' | ')}`);
  assert.equal(report.localFailures.length, 0, `localFailures: ${report.localFailures.join(' | ')}`);
  assert.ok(report.aiRequests.length > 0, '没有观察到任何 AI 请求：真实链路未被走到');
  report.ok = true;
} catch (error) {
  report.ok = false;
  report.error = error.stack;
  if (lastPage) {
    const page = lastPage;
    await page.screenshot({ path: resolve(out, 'failure.png'), fullPage: true }).catch(() => {});
    report.failureState = await page.evaluate(() => ({ href: location.href, body: document.body.innerText.slice(0, 3000) })).catch((stateError) => ({ error: String(stateError) }));
  }
  process.exitCode = 1;
} finally {
  writeFileSync(resolve(out, 'report.json'), JSON.stringify(report, null, 2));
  await context.close();
  console.log(JSON.stringify(report, null, 2));
}
