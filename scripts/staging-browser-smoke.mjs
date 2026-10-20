import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { resolveStagingTarget } from './staging-coop-smoke.mjs';

const DEFAULT_CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

async function waitForDevToolsPort(profile, child) {
  let launchError;
  child.once('error', error => {
    launchError = error;
  });
  for (let attempt = 0; attempt < 150; attempt += 1) {
    if (launchError) throw launchError;
    try {
      const value = await readFile(path.join(profile, 'DevToolsActivePort'), 'utf8');
      const port = Number(value.split('\n')[0]);
      if (port) return port;
    } catch {
      // Chrome 尚未写完调试端口文件。
    }
    if (child.exitCode !== null) throw new Error(`隔离 Chrome 提前退出：${child.exitCode}`);
    await sleep(100);
  }
  throw new Error('隔离 Chrome 未在 15 秒内就绪');
}

function connectCdp(webSocketDebuggerUrl) {
  const socket = new WebSocket(webSocketDebuggerUrl);
  const pending = new Map();
  let sequence = 0;
  const listeners = new Map();

  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    if (message.id) {
      const waiter = pending.get(message.id);
      if (!waiter) return;
      pending.delete(message.id);
      clearTimeout(waiter.timer);
      if (message.error) waiter.reject(new Error(JSON.stringify(message.error)));
      else waiter.resolve(message.result);
      return;
    }
    for (const listener of listeners.get(message.method) ?? []) listener(message.params);
  });

  return {
    socket,
    on(method, listener) {
      const entries = listeners.get(method) ?? [];
      entries.push(listener);
      listeners.set(method, entries);
    },
    send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = ++sequence;
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(new Error(`CDP 超时：${method}`));
        }, 30_000);
        pending.set(id, { resolve, reject, timer });
        socket.send(JSON.stringify({ id, method, params }));
      });
    },
    close() {
      for (const waiter of pending.values()) {
        clearTimeout(waiter.timer);
        waiter.reject(new Error('CDP 已关闭'));
      }
      pending.clear();
      socket.close();
    },
  };
}

async function waitForTarget(port) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const page = targets.find(target => target.type === 'page');
      if (page) return page;
    } catch {
      // Chrome 调试服务尚未就绪。
    }
    await sleep(100);
  }
  throw new Error('找不到 Chrome 页面调试目标');
}

async function evaluate(cdp, expression) {
  const result = await cdp.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
  }
  return result.result.value;
}

async function run() {
  const target = resolveStagingTarget();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDir = path.resolve('.rivet', 'scratch', `staging-browser-${stamp}`);
  const profile = path.resolve('E:/CODEX/.cache/maskaria-ui', `staging-browser-${stamp}`);
  const temp = path.join(outputDir, 'tmp');
  await mkdir(outputDir, { recursive: true });
  await mkdir(profile, { recursive: true });
  await mkdir(temp, { recursive: true });

  const browser = spawn(process.env.CHROME_PATH ?? DEFAULT_CHROME, [
    '--headless=new',
    '--remote-debugging-port=0',
    `--user-data-dir=${profile}`,
    `--disk-cache-dir=${path.join(outputDir, 'disk-cache')}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-networking',
    '--disable-component-update',
    '--disable-gpu',
    'about:blank',
  ], {
    stdio: 'ignore',
    windowsHide: true,
    env: { ...process.env, TEMP: temp, TMP: temp },
  });

  let cdp;
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  const badResponses = [];
  try {
    const port = await waitForDevToolsPort(profile, browser);
    const page = await waitForTarget(port);
    cdp = connectCdp(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      cdp.socket.addEventListener('open', resolve, { once: true });
      cdp.socket.addEventListener('error', reject, { once: true });
    });

    cdp.on('Runtime.consoleAPICalled', event => {
      if (event.type === 'error') {
        consoleErrors.push(event.args.map(argument => argument.value ?? argument.description ?? '').join(' '));
      }
    });
    cdp.on('Runtime.exceptionThrown', event => {
      pageErrors.push(event.exceptionDetails?.exception?.description ?? event.exceptionDetails?.text ?? 'unknown exception');
    });
    cdp.on('Network.loadingFailed', event => {
      if (!event.canceled) failedRequests.push({ url: event.url ?? null, error: event.errorText });
    });
    cdp.on('Network.responseReceived', event => {
      if (event.response.status >= 400 && event.response.url.startsWith(target.origin)) {
        badResponses.push({ status: event.response.status, url: event.response.url });
      }
    });

    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Network.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true,
    });
    await cdp.send('Page.navigate', { url: `${target.origin}/` });

    let pageState = null;
    for (let attempt = 0; attempt < 160; attempt += 1) {
      pageState = await evaluate(cdp, `({
        url: location.href,
        title: document.title,
        rootChildren: document.querySelector('#root')?.childElementCount ?? 0,
        bodyText: (document.body?.innerText ?? '').trim().slice(0, 700),
        serviceWorkerController: Boolean(navigator.serviceWorker?.controller)
      })`);
      if (pageState.rootChildren > 0 && /欢迎|人格指数|登录|注册|创建角色|今日/.test(pageState.bodyText)) break;
      await sleep(250);
    }

    assert.ok(pageState?.rootChildren > 0, '首页加载后 #root 仍为空');
    assert.match(pageState?.bodyText ?? '', /欢迎|人格指数|登录|注册|创建角色|今日/, '首页未越过开场动画进入可操作内容');
    assert.deepEqual(pageErrors, [], `页面运行异常：${pageErrors.join(' | ')}`);

    const apiCheck = await evaluate(cdp, `(async () => {
      const response = await fetch('/api/health', { headers: { Accept: 'application/json' } });
      return { status: response.status, body: await response.json() };
    })()`);
    assert.equal(apiCheck.status, 200, '浏览器同源 API 请求失败');
    assert.equal(apiCheck.body.status, 'UP');
    assert.equal(apiCheck.body.db, 'UP');

    const screenshot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    const screenshotPath = path.join(outputDir, '390x844.png');
    await writeFile(screenshotPath, Buffer.from(screenshot.data, 'base64'));

    const report = {
      result: 'passed',
      target: target.origin,
      browser: 'isolated Chrome headless, 390x844',
      page: pageState,
      api: apiCheck,
      consoleErrors,
      pageErrors,
      failedRequests,
      badResponses,
      screenshot: screenshotPath,
      boundaries: [
        '真实 Chrome 渲染和 HTTPS API 通过，但不是两台物理设备验收。',
        'OS 后台通知、跨运营商网络和断网恢复仍需真机完成。',
      ],
    };
    const reportPath = path.join(outputDir, 'report.json');
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify({ ...report, reportPath }, null, 2));
  } finally {
    cdp?.close();
    if (browser.exitCode === null) browser.kill();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try {
    await run();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
