import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createServer } from 'vite';

// 专用浏览器资料目录与合成 HTTP；不打开用户浏览器或连接真实账号。
const root = process.cwd();
const base = path.join(root, '.rivet/scratch/audit-20261013');
await mkdir(base, { recursive: true });
const work = await mkdtemp(path.join(base, 'persistence-'));
const profile = path.join(work, 'browser');
const temp = path.join(work, 'tmp');
await mkdir(temp, { recursive: true });
await mkdir(path.join(work, 'empty-env'), { recursive: true });
process.env.VITE_API_URL = 'http://repair.invalid';
process.env.VITE_PB_URL = '';
process.env.VITE_PB_FALLBACK_URLS = '';
const server = await createServer({ root, envDir: path.join(work, 'empty-env'), cacheDir: path.join(work, 'vite-cache'), server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
let browser, ws;
const pending = new Map();
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
let seq = 0;
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++seq;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 30000);
    pending.set(id, { resolve, reject, timer }); ws.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
  return result.result.value;
}
try {
  await server.listen();
  browser = spawn(process.env.PERSISTENCE_CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, `--disk-cache-dir=${path.join(work, 'disk-cache')}`,
    '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--disable-gpu', 'about:blank',
  ], { windowsHide: true, stdio: 'ignore', env: { ...process.env, TEMP: temp, TMP: temp } });
  let launchError;
  browser.on('error', error => { launchError = error; });
  let port;
  for (let i = 0; i < 150; i++) {
    if (launchError) throw launchError;
    try { port = Number((await readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]); if (port) break; } catch { /* 等待本次子进程就绪 */ }
    if (browser.exitCode !== null) throw new Error(`Isolated Chrome exited: ${browser.exitCode}`);
    await delay(100);
  }
  assert.ok(port, 'Isolated Chrome did not become ready');
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  ws = new WebSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  ws.onmessage = ({ data }) => {
    const message = JSON.parse(data), waiter = pending.get(message.id);
    if (!waiter) return;
    pending.delete(message.id); clearTimeout(waiter.timer);
    message.error ? waiter.reject(new Error(JSON.stringify(message.error))) : waiter.resolve(message.result);
  };
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
  await send('Network.setBlockedURLs', { urls: ['https://*', 'http://repair.invalid/*'] });
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await send('Page.navigate', { url: server.resolvedUrls.local[0] });
  await delay(1500);
  const evidence = await evaluate(`(async () => {
    const { db } = await import('/src/db/index.ts');
    const { useAppStore, ALL_LOCAL_TABLES, toLocalDateKey } = await import('/src/store/index.ts');
    const auth = await import('/src/services/velvetApi.ts');
    const sync = await import('/src/services/sync.ts');
    const results = [];
    const check = (value, message) => { if (!value) throw new Error(message); };
    const verify = async (name, fn) => { try { await fn(); results.push(name); } catch (error) { throw new Error(name + ': ' + error.message); } };
    const rejects = async fn => { let failed = false; try { await fn(); } catch { failed = true; } check(failed, 'Expected failure'); };
    let cloudRows = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input, init) => {
      const url = String(input);
      if (!url.startsWith('http://repair.invalid/')) return originalFetch(input, init);
      if (url.endsWith('/api/velvet/auth-with-password')) return Response.json({ token: 'synthetic-session', record: { id: 'synthetic-account', email: 'test@example.invalid' } });
      if (url.includes('/api/sync/rows') && (!init?.method || init.method === 'GET')) return Response.json(cloudRows);
      return Response.json({ id: 'synthetic', updated: new Date().toISOString() });
    };
    await useAppStore.getState().createUser('隔离验证角色');
    useAppStore.setState({ syncNotifications: async () => {} });
    await auth.authWithPassword('test@example.invalid', 'synthetic');
    const row = (key, value) => ({ id: key, key, value, updated: '2026-10-13T10:00:00Z', created: '2026-10-13T10:00:00Z' });
    const baseline = { id: 'baseline', userId: useAppStore.getState().user.id, date: new Date(), description: '隔离验证记录', method: 'local', pointsAwarded: { knowledge: 0, guts: 0, dexterity: 0, kindness: 0, charm: 0 } };
    await db.activities.put(baseline);
    await verify('坏快照保留真实 IndexedDB 数据', async () => {
      for (const rows of [
        [row('activities', '{invalid')],
        [row('_meta', { schema: 2, chunks: { activities: { n: 2, at: '2026-10-13T12:00:00Z' } } }), row('activities#1', [baseline])],
      ]) { cloudRows = rows; await rejects(() => sync.pullAll()); check(!!await db.activities.get('baseline'), 'Local record lost'); }
    });
    await verify('拉取中途写失败整体回滚，内存不变', async () => {
      const oldAttributes = await db.attributes.toArray();
      cloudRows = [row('attributes', oldAttributes.map(a => ({ ...a, points: 99 }))), row('activities', [{ ...baseline, id: 'cloud-new' }])];
      const fail = () => { throw new Error('synthetic table write failure'); };
      db.activities.hook('creating', fail);
      try { await rejects(() => sync.pullAll()); } finally { db.activities.hook('creating').unsubscribe(fail); }
      check(!!await db.activities.get('baseline'), 'Activity rollback failed');
      check((await db.attributes.get('knowledge')).points === oldAttributes.find(a => a.id === 'knowledge').points, 'Attribute rollback failed');
      check(useAppStore.getState().attributes.find(a => a.id === 'knowledge').points !== 99, 'Memory published failed snapshot');
    });
    await verify('合法快照提交后恢复日期与内存', async () => {
      cloudRows = [row('activities', [{ ...baseline, id: 'cloud-new' }])];
      await sync.pullAll();
      check((await db.activities.get('cloud-new')).date instanceof Date, 'Date not revived');
      check(useAppStore.getState().activities.some(a => a.id === 'cloud-new'), 'Memory not refreshed');
    });
    await verify('设置失败回滚，队列继续接受重试', async () => {
      const old = (await db.settings.toArray())[0];
      const original = db.settings.put;
      db.settings.put = async () => { throw new Error('synthetic settings failure'); };
      try { await rejects(() => useAppStore.getState().updateSettings({ summaryModel: 'changed' })); } finally { db.settings.put = original; }
      check(useAppStore.getState().settings.summaryModel === old.summaryModel, 'Failed settings reached memory');
      await useAppStore.getState().updateSettings({ summaryModel: 'retry-ok' });
      check((await db.settings.toArray())[0].summaryModel === 'retry-ok', 'Retry failed');
    });
    await verify('阈值保存失败时设置与属性一起回滚', async () => {
      const old = (await db.settings.toArray())[0];
      const original = db.attributes.bulkPut;
      db.attributes.bulkPut = async () => { throw new Error('synthetic attribute failure'); };
      try { await rejects(() => useAppStore.getState().updateSettings({ levelThresholds: [0, 1, 2] })); } finally { db.attributes.bulkPut = original; }
      check(JSON.stringify((await db.settings.toArray())[0].levelThresholds) === JSON.stringify(old.levelThresholds), 'Settings partially committed');
      check(JSON.stringify(useAppStore.getState().settings.levelThresholds) === JSON.stringify(old.levelThresholds), 'Memory partially committed');
    });
    if (${JSON.stringify(process.argv.includes('--todos'))}) {
      await verify('任务并发只有一份完成与奖励', async () => {
        await useAppStore.getState().addTodo({ title: '并发验证任务', attribute: 'knowledge', points: 1, frequency: 'single', repeatDaily: true, isActive: true });
        const todo = useAppStore.getState().todos.find(t => t.title === '并发验证任务');
        const before = (await db.attributes.get('knowledge')).points;
        await Promise.all([useAppStore.getState().completeTodo(todo.id), useAppStore.getState().completeTodo(todo.id)]);
        check((await db.todoCompletions.where('todoId').equals(todo.id).count()) === 1, 'Duplicate completion');
        check((await db.activities.filter(a => a.description === '完成任务: 并发验证任务').count()) === 1, 'Duplicate reward');
        check((await db.attributes.get('knowledge')).points === before + 1, 'Duplicate points');
        check(await useAppStore.getState().completeTodo(todo.id) === null, 'Repeat accepted');
        await useAppStore.getState().undoTodayTodoCompletion(todo.id);
        check((await db.attributes.get('knowledge')).points === before, 'Undo failed');
        check(await db.todoCompletions.where('todoId').equals(todo.id).count() === 0, 'Undo left completion');
      });
      await useAppStore.getState().saveBattleState({ id: 'current', playerHp: 100, playerMaxHp: 100, sp: 0, totalSpEarned: 0, status: 'idle', shadowsDefeated: 0 });
      for (const stage of ['completion', 'activity', 'attribute', 'SP', 'archive']) {
        await verify('任务 ' + stage + ' 写失败整体回滚且重试成功', async () => {
          const title = '故障验证-' + stage;
          await useAppStore.getState().addTodo({ title, attribute: 'knowledge', points: 1, frequency: 'single', repeatDaily: false, isActive: true });
          const todo = useAppStore.getState().todos.find(t => t.title === title);
          const before = (await db.attributes.get('knowledge')).points;
          const oldSp = (await db.battleStates.get('current')).sp;
          const target = stage === 'completion' ? db.todoCompletions : stage === 'activity' ? db.activities : stage === 'attribute' ? db.attributes : stage === 'SP' ? db.battleStates : db.todos;
          const hook = ['completion', 'activity'].includes(stage) ? 'creating' : 'updating';
          const fail = () => { throw new Error('synthetic ' + stage + ' failure'); };
          target.hook(hook, fail);
          try { await rejects(() => useAppStore.getState().completeTodo(todo.id)); } finally { target.hook(hook).unsubscribe(fail); }
          check(await db.todoCompletions.where('todoId').equals(todo.id).count() === 0, 'Half completion');
          check(await db.activities.filter(a => a.description === '完成任务: ' + title).count() === 0, 'Partial reward');
          check((await db.attributes.get('knowledge')).points === before, 'Partial attribute');
          check(useAppStore.getState().attributes.find(a => a.id === 'knowledge').points === before, 'Partial memory attribute');
          check((await db.battleStates.get('current')).sp === oldSp && useAppStore.getState().battleState.sp === oldSp, 'Partial SP');
          check((await db.todos.get(todo.id)).isActive, 'Partial archive');
          check(!!await useAppStore.getState().completeTodo(todo.id), 'Retry blocked');
          check((await db.attributes.get('knowledge')).points === before + 1, 'Retry reward wrong');
          check((await db.battleStates.get('current')).sp === oldSp + 1, 'Retry SP wrong');
          check(!(await db.todos.get(todo.id)).isActive, 'Successful single task not archived');
        });
      }
      await verify('命运加成两条奖励一起提交，失败可重试', async () => {
        const title = '命运事务验证';
        await useAppStore.getState().addTodo({ title, attribute: 'guts', points: 1, frequency: 'single', repeatDaily: true, isActive: true, fateDrawnDate: toLocalDateKey() });
        const todo = useAppStore.getState().todos.find(t => t.title === title);
        const before = (await db.attributes.get('guts')).points;
        const oldSp = (await db.battleStates.get('current')).sp;
        const failBonus = (_key, value) => { if (value.description === '命运加成: ' + title) throw new Error('synthetic bonus failure'); };
        db.activities.hook('creating', failBonus);
        try { await rejects(() => useAppStore.getState().completeTodo(todo.id)); } finally { db.activities.hook('creating').unsubscribe(failBonus); }
        check(await db.todoCompletions.where('todoId').equals(todo.id).count() === 0, 'Bonus half completion');
        check((await db.attributes.get('guts')).points === before && (await db.battleStates.get('current')).sp === oldSp, 'Bonus partial points');
        await useAppStore.getState().completeTodo(todo.id);
        check((await db.attributes.get('guts')).points === before + 2, 'Bonus formula changed');
        check((await db.battleStates.get('current')).sp === oldSp + 2, 'Bonus SP lost');
        check(await db.activities.filter(a => a.description === '命运加成: ' + title || a.description === '完成任务: ' + title).count() === 2, 'Bonus rows wrong');
      });
      await verify('计数任务并发到达目标只奖励一次', async () => {
        const title = '计数验证';
        await useAppStore.getState().addTodo({ title, attribute: 'charm', points: 1, frequency: 'count', targetCount: 2, repeatDaily: true, isActive: true });
        const todo = useAppStore.getState().todos.find(t => t.title === title);
        const before = (await db.attributes.get('charm')).points;
        await Promise.all(Array.from({ length: 3 }, () => useAppStore.getState().completeTodo(todo.id)));
        const completions = await db.todoCompletions.where('todoId').equals(todo.id).toArray();
        check(completions.length === 1 && completions[0].count === 2, 'Count contract changed');
        check((await db.attributes.get('charm')).points === before + 1, 'Count duplicate reward');
      });
      await verify('每日任务跨日沿用每天一次的规则', async () => {
        const title = '跨日验证';
        await useAppStore.getState().addTodo({ title, attribute: 'guts', points: 1, frequency: 'daily', repeatDaily: true, isActive: true });
        const todo = useAppStore.getState().todos.find(t => t.title === title);
        await useAppStore.getState().completeTodo(todo.id);
        const OriginalDate = Date;
        const tomorrow = new OriginalDate(); tomorrow.setDate(tomorrow.getDate() + 1);
        globalThis.Date = class extends OriginalDate {
          constructor(...args) { super(...(args.length ? args : [tomorrow.getTime()])); }
          static now() { return tomorrow.getTime(); }
        };
        try { check(!!await useAppStore.getState().completeTodo(todo.id), 'Next day blocked'); }
        finally { globalThis.Date = OriginalDate; }
        check(await db.todoCompletions.where('todoId').equals(todo.id).count() === 2, 'Daily completion rows wrong');
      });
      await verify('独立页面共享 IndexedDB 时同一任务只奖励一次', async () => {
        const frame = document.createElement('iframe'); frame.src = '/'; document.body.append(frame);
        await new Promise(resolve => { frame.onload = resolve; });
        try {
          frame.contentWindow.fetch = globalThis.fetch;
          const second = await frame.contentWindow.eval('import("/src/store/index.ts")');
          await second.useAppStore.getState().initializeApp();
          second.useAppStore.setState({ syncNotifications: async () => {} });
          const title = '跨页面验证';
          await useAppStore.getState().addTodo({ title, attribute: 'dexterity', points: 1, frequency: 'single', repeatDaily: true, isActive: true });
          const todo = useAppStore.getState().todos.find(t => t.title === title);
          const before = (await db.attributes.get('dexterity')).points;
          await Promise.all([useAppStore.getState().completeTodo(todo.id), second.useAppStore.getState().completeTodo(todo.id)]);
          check(await db.todoCompletions.where('todoId').equals(todo.id).count() === 1, 'Cross-page completion duplicated');
          check((await db.attributes.get('dexterity')).points === before + 1, 'Cross-page reward duplicated');
        } finally { frame.remove(); }
      });
    }
    await verify('清空清单覆盖全部本地表且导入保留裁图', async () => {
      check(db.tables.every(table => ALL_LOCAL_TABLES.includes(table.name)), 'Missing local table');
      await db.onlineCardFaces.put({ userId: 'synthetic-face', dataUrl: 'synthetic' });
      await useAppStore.getState().resetAllData({ keepImages: true });
      check(await db.onlineCardFaces.count() === 1, 'Import erased local face');
    });
    await verify('清空失败时已有表数据全部回滚', async () => {
      await db.users.put({ id: 'rollback-user', name: 'Rollback', createdAt: new Date() });
      const fail = () => { throw new Error('synthetic clear failure'); };
      db.onlineCardFaces.hook('deleting', fail);
      try { await rejects(() => useAppStore.getState().resetAllData()); } finally { db.onlineCardFaces.hook('deleting').unsubscribe(fail); }
      check(!!await db.users.get('rollback-user'), 'Partial clear');
    });
    await verify('全量清空所有本地表且可重复调用', async () => {
      for (const table of db.tables) if (await table.count() === 0) await table.put({ id: 'synthetic', userId: 'synthetic' });
      await useAppStore.getState().resetAllData();
      for (const table of db.tables) check(await table.count() === 0, 'Table left behind: ' + table.name);
      await useAppStore.getState().resetAllData();
    });
    auth.clearAuth(); globalThis.fetch = originalFetch;
    return { passed: results.length, results, persistence: 'real Chrome IndexedDB', services: 'synthetic HTTP; no external service calls' };
  })()`);
  await evaluate(`(async () => {
    const { useAppStore } = await import('/src/store/index.ts');
    await useAppStore.getState().createUser('隔离验收角色');
    await useAppStore.getState().addTodo({ title: '本地任务验收', attribute: 'knowledge', points: 1, frequency: 'daily', repeatDaily: true, isActive: true });
    useAppStore.getState().setActionsSubTab('todos');
    useAppStore.getState().setCurrentPage('actions');
  })()`);
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    ready = await evaluate(`document.body.innerText.includes('本地任务验收')`);
    if (ready) break;
    await delay(200);
  }
  assert.ok(ready, 'Action task page did not become visible after splash');
  evidence.pages = [];
  for (const width of [390, 1280]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: width === 390 ? 844 : 900, deviceScaleFactor: 1, mobile: width === 390 });
    await delay(800);
    const page = await evaluate(`({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, rootChildren: document.querySelector('#root')?.childElementCount, taskVisible: document.body.innerText.includes('本地任务验收') })`);
    assert.ok(page.taskVisible && page.rootChildren > 0 && page.scrollWidth <= page.width, 'Action page failed width check');
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    const screenshot = path.join(work, `actions-${width}.png`);
    await writeFile(screenshot, Buffer.from(shot.data, 'base64'));
    evidence.pages.push({ ...page, screenshot });
  }
  await writeFile(path.join(work, 'evidence.json'), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify({ ...evidence, artifact: path.join(work, 'evidence.json') }, null, 2));
} finally {
  if (ws?.readyState === WebSocket.OPEN) { ws.send(JSON.stringify({ id: ++seq, method: 'Browser.close' })); await delay(300); ws.close(); }
  if (browser && browser.exitCode === null) browser.kill();
  for (const waiter of pending.values()) { clearTimeout(waiter.timer); waiter.reject(new Error('Browser closed')); }
  await server.close();
}
