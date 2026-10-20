import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import tls from 'node:tls';
import { fileURLToPath } from 'node:url';

const ISOLATED_STAGING_CONFIRMATION = 'isolated-staging';
const REQUEST_TIMEOUT_MS = 25_000;

function isPrivateIpv4(hostname) {
  const parts = hostname.split('.').map(Number);
  if (parts.length !== 4 || parts.some(part => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a, b] = parts;
  return a === 0 || a === 10 || a === 127
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168)
    || (a === 198 && (b === 18 || b === 19))
    || a >= 224;
}

function isPrivateIpv6(hostname) {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  return normalized === '::' || normalized === '::1'
    || normalized.startsWith('fc') || normalized.startsWith('fd')
    || normalized.startsWith('fe8') || normalized.startsWith('fe9')
    || normalized.startsWith('fea') || normalized.startsWith('feb')
    || normalized.startsWith('::ffff:127.')
    || normalized.startsWith('::ffff:10.')
    || normalized.startsWith('::ffff:192.168.');
}

export function resolveStagingTarget(env = process.env) {
  const rawUrl = env.MASKARIA_STAGING_URL?.trim();
  if (!rawUrl) throw new Error('缺少 MASKARIA_STAGING_URL');
  if (env.MASKARIA_STAGING_CONFIRM !== ISOLATED_STAGING_CONFIRMATION) {
    throw new Error(`必须设置 MASKARIA_STAGING_CONFIRM=${ISOLATED_STAGING_CONFIRMATION}，确认目标是不含正式用户数据的隔离环境`);
  }

  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error('MASKARIA_STAGING_URL 不是合法 URL');
  }
  if (url.protocol !== 'https:') throw new Error('staging 验收只接受 HTTPS');
  if (url.username || url.password) throw new Error('staging URL 不能携带用户名或密码');
  if (url.search || url.hash) throw new Error('staging URL 不能携带查询参数或片段');
  if (url.pathname !== '/') throw new Error('staging URL 必须是站点根地址，不能带路径');

  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local')
      || isPrivateIpv4(hostname) || isPrivateIpv6(hostname)) {
    throw new Error('staging URL 必须是两台手机可访问的公网地址，不能是本机、LAN 或私有地址');
  }

  return Object.freeze({
    origin: url.origin,
    hostname,
    port: Number(url.port || 443),
  });
}

export function inspectTls(target, timeoutMs = 15_000) {
  return new Promise((resolve, reject) => {
    const socket = tls.connect({
      host: target.hostname,
      port: target.port,
      servername: target.hostname,
      ALPNProtocols: ['http/1.1'],
      rejectUnauthorized: true,
    });
    let settled = false;
    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      if (error) reject(error);
      else resolve(value);
    };
    socket.setTimeout(timeoutMs, () => finish(new Error('TLS 连接超时')));
    socket.once('error', error => finish(error));
    socket.once('secureConnect', () => {
      const certificate = socket.getPeerCertificate();
      const validTo = Date.parse(certificate.valid_to);
      finish(null, {
        authorized: socket.authorized,
        protocol: socket.getProtocol(),
        alpnProtocol: socket.alpnProtocol || null,
        subject: certificate.subject?.CN ?? null,
        issuer: certificate.issuer?.O ?? certificate.issuer?.CN ?? null,
        validFrom: certificate.valid_from ?? null,
        validTo: certificate.valid_to ?? null,
        daysRemaining: Number.isFinite(validTo)
          ? Math.floor((validTo - Date.now()) / 86_400_000)
          : null,
      });
    });
  });
}

function percentile(values, fraction) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)];
}

async function requestJson(target, pathname, { token, method = 'GET', body } = {}) {
  const startedAt = performance.now();
  const response = await fetch(new URL(pathname, target.origin), {
    method,
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    redirect: 'manual',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { raw: text.slice(0, 300) };
  }
  return {
    status: response.status,
    headers: response.headers,
    payload,
    durationMs: Math.round(performance.now() - startedAt),
  };
}

function assertStatus(result, expected, label) {
  assert.equal(result.status, expected, `${label} 期望 HTTP ${expected}，实际 ${result.status}`);
}

function sanitizeForReport(value) {
  if (Array.isArray(value)) return value.map(sanitizeForReport);
  if (!value || typeof value !== 'object') return value;
  const output = {};
  for (const [key, item] of Object.entries(value)) {
    if (/token|password|secret|authorization/i.test(key)) continue;
    output[key] = sanitizeForReport(item);
  }
  return output;
}

async function register(target, label, stamp) {
  const result = await requestJson(target, '/api/velvet/register', {
    method: 'POST',
    body: {
      email: `codex-staging-${label}-${stamp}@example.invalid`,
      password: `pw-${stamp}-${label}-staging-only`,
      name: `stg${label}${stamp}`.slice(0, 24),
    },
  });
  assertStatus(result, 200, `注册测试账号 ${label}`);
  assert.ok(result.payload?.record?.id, `注册测试账号 ${label} 未返回 userId`);
  assert.ok(result.payload?.token, `注册测试账号 ${label} 未返回 JWT`);
  return {
    label,
    id: String(result.payload.record.id),
    name: String(result.payload.record.name ?? result.payload.record.username ?? ''),
    token: String(result.payload.token),
    durationMs: result.durationMs,
  };
}

async function inspectHttpRedirect(target) {
  const insecure = new URL(target.origin);
  insecure.protocol = 'http:';
  try {
    const response = await fetch(insecure, {
      redirect: 'manual',
      signal: AbortSignal.timeout(10_000),
    });
    const location = response.headers.get('location');
    if (response.status >= 300 && response.status < 400 && location?.startsWith('https://')) {
      return { result: 'redirected_to_https', status: response.status };
    }
    if (response.status === 200) return { result: 'failed_plain_http_is_served', status: response.status };
    return { result: 'warning_unexpected_http_response', status: response.status, location: location ?? null };
  } catch (error) {
    return {
      result: 'http_port_unreachable',
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

function notificationHas(notification, predicate) {
  let payload = notification.payload ?? null;
  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload);
    } catch {
      payload = null;
    }
  }
  return predicate({ ...notification, payload });
}

async function runSmoke(target) {
  const stamp = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const checks = [];
  const warnings = [];
  const latencies = [];
  let accounts = [];
  let report = null;

  const check = async (name, fn) => {
    const startedAt = performance.now();
    try {
      const value = await fn();
      checks.push({ name, result: 'passed', durationMs: Math.round(performance.now() - startedAt) });
      return value;
    } catch (error) {
      checks.push({
        name,
        result: 'failed',
        durationMs: Math.round(performance.now() - startedAt),
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  };

  try {
    const tlsEvidence = await check('受信任 TLS 与证书有效期', async () => {
      const evidence = await inspectTls(target);
      assert.equal(evidence.authorized, true, 'TLS 证书未被当前系统信任');
      assert.ok(evidence.protocol && /^TLSv1\.[23]$/.test(evidence.protocol), `TLS 协议异常：${evidence.protocol}`);
      assert.ok(evidence.daysRemaining !== null && evidence.daysRemaining >= 0, 'TLS 证书已过期或有效期无法解析');
      if (evidence.daysRemaining < 14) warnings.push(`TLS 证书将在 ${evidence.daysRemaining} 天内到期`);
      return evidence;
    });

    const health = await check('HTTPS 后端 Health 与数据库', async () => {
      const response = await requestJson(target, '/api/health');
      latencies.push(response.durationMs);
      assertStatus(response, 200, 'Health');
      assert.equal(response.payload?.status, 'UP', '后端 Health 未报告 UP');
      assert.equal(response.payload?.db, 'UP', '后端数据库未报告 UP');
      const serverDate = Date.parse(response.headers.get('date') ?? '');
      assert.ok(Number.isFinite(serverDate), 'HTTPS 响应缺少可解析的 Date 头');
      const offsetMs = serverDate - Date.now();
      assert.ok(Math.abs(offsetMs) <= 5 * 60_000, `本机与 staging 服务器时钟偏差 ${Math.round(offsetMs / 1000)} 秒`);
      return {
        status: response.payload.status,
        database: response.payload.db,
        serverClockOffsetMs: Math.round(offsetMs / 1000) * 1000,
        headers: {
          strictTransportSecurity: response.headers.get('strict-transport-security'),
          cacheControl: response.headers.get('cache-control'),
        },
      };
    });
    if (!health.headers.strictTransportSecurity) warnings.push('staging 未返回 Strict-Transport-Security；TLS 可用但尚未声明 HSTS');

    const frontend = await check('HTTPS 前端入口', async () => {
      const startedAt = performance.now();
      const response = await fetch(target.origin, {
        redirect: 'follow',
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      latencies.push(Math.round(performance.now() - startedAt));
      assert.equal(response.status, 200, `前端入口期望 HTTP 200，实际 ${response.status}`);
      assert.match(response.headers.get('content-type') ?? '', /text\/html/i, '前端入口不是 HTML');
      const html = await response.text();
      assert.ok(html.length > 100, '前端入口 HTML 为空');
      return { status: response.status, finalUrl: response.url, bytes: Buffer.byteLength(html) };
    });

    const downgrade = await check('HTTP 入口不直接提供应用', async () => {
      const evidence = await inspectHttpRedirect(target);
      assert.notEqual(evidence.result, 'failed_plain_http_is_served', 'HTTP 入口直接返回 200，存在明文访问');
      if (evidence.result !== 'redirected_to_https') warnings.push(`HTTP 降级检查结果：${evidence.result}`);
      return evidence;
    });

    accounts = await check('创建两个隔离 staging 测试账号', async () => {
      const [accountA, accountB] = await Promise.all([
        register(target, 'a', stamp),
        register(target, 'b', stamp),
      ]);
      latencies.push(accountA.durationMs, accountB.durationMs);
      return [accountA, accountB];
    });
    const [accountA, accountB] = accounts;

    await check('好友申请、接受与双方状态', async () => {
      const sent = await requestJson(target, '/api/social/friends/request', {
        token: accountA.token,
        method: 'POST',
        body: { targetId: accountB.id, message: `HTTPS staging smoke ${stamp}` },
      });
      latencies.push(sent.durationMs);
      assertStatus(sent, 200, '好友申请');
      assert.equal(sent.payload?.status, 'pending');
      const friendshipId = sent.payload?.id;
      assert.ok(friendshipId, '好友申请未返回 friendshipId');

      const duplicate = await requestJson(target, '/api/social/friends/request', {
        token: accountA.token,
        method: 'POST',
        body: { targetId: accountB.id, message: '幂等重试' },
      });
      latencies.push(duplicate.durationMs);
      assertStatus(duplicate, 200, '好友申请幂等重试');
      assert.equal(duplicate.payload?.id, friendshipId, '好友申请重试生成了第二条关系');

      const accepted = await requestJson(target, `/api/social/friends/${friendshipId}/accept`, {
        token: accountB.token,
        method: 'POST',
        body: {},
      });
      latencies.push(accepted.durationMs);
      assertStatus(accepted, 200, '好友接受');
      assert.equal(accepted.payload?.status, 'accepted');

      const [listA, listB] = await Promise.all([
        requestJson(target, '/api/social/friends', { token: accountA.token }),
        requestJson(target, '/api/social/friends', { token: accountB.token }),
      ]);
      latencies.push(listA.durationMs, listB.durationMs);
      assertStatus(listA, 200, '好友列表 A');
      assertStatus(listB, 200, '好友列表 B');
      assert.equal(listA.payload?.items?.find(item => item.id === friendshipId)?.status, 'accepted');
      assert.equal(listB.payload?.items?.find(item => item.id === friendshipId)?.status, 'accepted');

      const notifications = await requestJson(target, '/api/social/notifications', { token: accountB.token });
      latencies.push(notifications.durationMs);
      assertStatus(notifications, 200, '好友通知');
      assert.ok(
        notifications.payload?.items?.some(item => notificationHas(item, notification => (
          notification.type === 'friend_request'
          && String(notification.payload?.friendship_id ?? notification.payload?.friendshipId ?? '') === String(friendshipId)
        ))),
        'B 未收到好友申请通知',
      );
    });

    await check('COOP 提议、接受与双方状态', async () => {
      const proposed = await requestJson(target, '/api/social/coop/bonds/propose', {
        token: accountA.token,
        method: 'POST',
        body: {
          targetUserId: accountB.id,
          arcanaId: 'fool',
          orientation: 'up',
          intimacyLevel: 1,
          skillAttribute: 'knowledge',
          message: `HTTPS staging COOP ${stamp}`,
        },
      });
      latencies.push(proposed.durationMs);
      assertStatus(proposed, 200, 'COOP 提议');
      assert.equal(proposed.payload?.status, 'pending');
      const bondId = proposed.payload?.id;
      assert.ok(bondId, 'COOP 提议未返回 bondId');

      const notification = await requestJson(target, '/api/social/notifications', { token: accountB.token });
      latencies.push(notification.durationMs);
      assertStatus(notification, 200, 'COOP 通知');
      assert.ok(
        notification.payload?.items?.some(item => notificationHas(item, entry => (
          entry.type === 'coop_proposal' && String(entry.payload?.coop_bond_id ?? '') === String(bondId)
        ))),
        'B 未收到 COOP 提议通知',
      );

      const accepted = await requestJson(target, `/api/social/coop/bonds/${bondId}/accept`, {
        token: accountB.token,
        method: 'POST',
        body: {
          arcanaId: 'fool',
          orientation: 'up',
          intimacyLevel: 1,
          skillAttribute: 'knowledge',
        },
      });
      latencies.push(accepted.durationMs);
      assertStatus(accepted, 200, 'COOP 接受');
      assert.equal(accepted.payload?.status, 'linked');

      const [bondsA, bondsB] = await Promise.all([
        requestJson(target, '/api/social/coop/bonds', { token: accountA.token }),
        requestJson(target, '/api/social/coop/bonds', { token: accountB.token }),
      ]);
      latencies.push(bondsA.durationMs, bondsB.durationMs);
      assertStatus(bondsA, 200, 'COOP 列表 A');
      assertStatus(bondsB, 200, 'COOP 列表 B');
      assert.equal(bondsA.payload?.items?.find(item => item.id === bondId)?.status, 'linked');
      assert.equal(bondsB.payload?.items?.find(item => item.id === bondId)?.status, 'linked');
      return { bondId: String(bondId) };
    });

    await check('共享事件幂等写入与单条通知', async () => {
      const eventId = `staging-smoke-${stamp}`;
      const eventBody = {
        recipientId: accountB.id,
        eventId,
        date: new Date().toISOString().slice(0, 10),
        delta: 1,
        narrative: 'HTTPS staging 自动验收：同一条事件只应写入一次。',
        advice: '继续验证弱网与通知',
        userInput: '继续',
      };
      const burst = await Promise.all(Array.from({ length: 4 }, () => (
        requestJson(target, '/api/social/coop/events', {
          token: accountA.token,
          method: 'POST',
          body: eventBody,
        })
      )));
      latencies.push(...burst.map(item => item.durationMs));
      assert.ok(burst.every(item => item.status === 200), `共享事件出现非 200：${burst.map(item => item.status).join(',')}`);
      assert.equal(burst.filter(item => item.payload?.created === true).length, 1, '共享事件没有且仅有一次 created=true');
      assert.equal(burst.filter(item => item.payload?.created === false).length, 3, '共享事件重试未全部幂等');

      const notifications = await requestJson(target, '/api/social/notifications', { token: accountB.token });
      latencies.push(notifications.durationMs);
      assertStatus(notifications, 200, '共享事件通知');
      const matching = notifications.payload?.items?.filter(item => notificationHas(item, entry => (
        entry.payload?.kind === 'coop_event' && entry.payload?.event_id === eventId
      )));
      assert.equal(matching?.length, 1, '共享事件没有且仅有一条通知');
      return { eventId, createdCount: 1, idempotentCount: 3, notificationCount: matching.length };
    });

    report = {
      result: 'passed',
      automatedTransportAndApiChecks: 'passed',
      stagingAcceptance: false,
      target: target.origin,
      transport: { tls: tlsEvidence, health, frontend, downgrade },
      accounts: accounts.map(({ label, id, name }) => ({ label, userId: id, username: name })),
      checks,
      latencyMs: {
        samples: latencies.length,
        min: Math.min(...latencies),
        p50: percentile(latencies, 0.5),
        p95: percentile(latencies, 0.95),
        max: Math.max(...latencies),
      },
      warnings,
      manualAcceptanceRequired: [
        '两台物理设备连接同一隔离 staging，并分别使用不同账号。',
        '至少让一台设备走蜂窝网络、另一台走 Wi-Fi，完成好友申请、接受、COOP 提议/接受和共享事件。',
        '授予系统通知权限后，将接收端 App 退到后台，确认好友申请、COOP 提议和共享事件产生真实 OS 通知。',
        '在发送共享事件时临时断网 15 秒，恢复后确认重试只落一条事件和一条通知。',
        '记录两端系统时间、页面提示和失败截图；任何一项未做都不能把 staging 验收标成通过。',
      ],
      boundaries: [
        '本脚本只验证公网 HTTPS、TLS、服务器时钟、API 契约和单主机并发，不验证两台手机的真实网络差异。',
        '本脚本不能代替系统通知权限、后台通知和弱网恢复的真机验收。',
        '测试账号只允许创建在隔离 staging；目标 URL 必须显式声明 isolated-staging。',
      ],
    };
  } catch (error) {
    report = {
      result: 'failed',
      automatedTransportAndApiChecks: 'failed',
      stagingAcceptance: false,
      target: target.origin,
      accounts: accounts.map(({ label, id, name }) => ({ label, userId: id, username: name })),
      checks,
      latencyMs: latencies.length ? {
        samples: latencies.length,
        min: Math.min(...latencies),
        p50: percentile(latencies, 0.5),
        p95: percentile(latencies, 0.95),
        max: Math.max(...latencies),
      } : null,
      warnings,
      failure: error instanceof Error ? error.message : String(error),
      boundaries: [
        '失败结果只证明当前 staging 自动验收未通过，不代表已定位业务根因。',
        '报告不包含密码、JWT 或原始响应正文。',
      ],
    };
    process.exitCode = 1;
  }

  const reportPath = process.env.MASKARIA_STAGING_REPORT
    ? path.resolve(process.env.MASKARIA_STAGING_REPORT)
    : path.resolve('.rivet', 'scratch', `staging-coop-${stamp}`, 'report.json');
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(sanitizeForReport(report), null, 2)}\n`);
  console.log(JSON.stringify({ ...sanitizeForReport(report), reportPath }, null, 2));
  return report;
}

function printHelp() {
  console.log(`MASKARIA 隔离 staging HTTPS / COOP 验收

PowerShell:
  $env:MASKARIA_STAGING_URL='https://staging.example.com'
  $env:MASKARIA_STAGING_CONFIRM='isolated-staging'
  node scripts/staging-coop-smoke.mjs

可选:
  MASKARIA_STAGING_REPORT  JSON 报告路径；默认写入 .rivet/scratch/staging-coop-<stamp>/report.json

只检查 URL 是否满足隔离 staging 约束：
  node scripts/staging-coop-smoke.mjs --check-target

脚本自动验证公网 HTTPS、TLS、Health、前端入口、好友/COOP/共享事件及通知契约。
两台真机的跨运营商网络、弱网恢复和 OS 后台通知仍须按报告中的清单人工验收。`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  if (process.argv.includes('--help')) {
    printHelp();
  } else {
    try {
      const target = resolveStagingTarget();
      if (process.argv.includes('--check-target')) {
        console.log(JSON.stringify({ result: 'passed', target: target.origin }, null, 2));
      } else {
        await runSmoke(target);
      }
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    }
  }
}
