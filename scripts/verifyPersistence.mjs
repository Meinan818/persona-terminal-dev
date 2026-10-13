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
    const { useAppStore, ALL_LOCAL_TABLES } = await import('/src/store/index.ts');
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
  await writeFile(path.join(work, 'evidence.json'), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify({ ...evidence, artifact: path.join(work, 'evidence.json') }, null, 2));
} finally {
  if (ws?.readyState === WebSocket.OPEN) { ws.send(JSON.stringify({ id: ++seq, method: 'Browser.close' })); await delay(300); ws.close(); }
  if (browser && browser.exitCode === null) browser.kill();
  for (const waiter of pending.values()) { clearTimeout(waiter.timer); waiter.reject(new Error('Browser closed')); }
  await server.close();
}
