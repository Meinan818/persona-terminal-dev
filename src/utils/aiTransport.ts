/**
 * aiTransport —— AI 请求的发送通道（第 13 轮，千问 token-plan）。
 *
 * 有些服务商网关（千问套餐专属 / token-plan 的 coding.dashscope、token-plan.*.maas.aliyuncs.com）对浏览器的
 * OPTIONS 预检直接回 401、不带任何 CORS 头，WebView 里 fetch 根本发不出去。App 里有另一条路：
 * Capacitor 的 CapacitorHttp 由原生层（URLSession / OkHttp）发请求，不受 CORS 约束——代价是拿不到流式响应，
 * 整段回来再给页面。所以：
 *   · settings.aiNativeHosts 里登记的主机走原生通道（测试连接时自动探测并登记）；
 *   · aiFetch(url, init) 是 fetch 的替身：原生主机用 CapacitorHttp 并包成标准 Response，其余照旧 fetch；
 *   · chatStream 对原生主机退成非流式（见 aiClient）。
 * 网页 / PWA 没有原生层，这类主机只能提示用户换地址或经中转。
 */
import { CapacitorHttp, type HttpOptions, type HttpResponse } from '@capacitor/core';
import { isNative } from '@/utils/native';
import { getAuthToken, isAuthenticated } from '@/services/velvetApi';

let nativeHosts = new Set<string>();
let forceNativeForTest = false;

/** 从设置同步「走原生通道的主机」清单（aiClient 解析配置时顺手调；Settings 保存后立即生效） */
export function syncNativeHosts(hosts: string[] | undefined | null): void {
  nativeHosts = new Set((hosts ?? []).map((h) => h.trim().toLowerCase()).filter(Boolean));
}

export const hostOfUrl = (url: string): string => {
  try { return new URL(url).host.toLowerCase(); } catch { return ''; }
};

/** 这个地址是否该走原生通道：登记过 + 当前是原生壳（网页里没有原生层，登记了也走不了） */
export function isNativeHost(url: string): boolean {
  if (!nativeHosts.has(hostOfUrl(url))) return false;
  return forceNativeForTest || isNative();
}

/** 原生通道可用吗（原生壳里才有） */
export const nativeTransportAvailable = (): boolean => forceNativeForTest || isNative();

type NativeRequest = (opts: HttpOptions) => Promise<HttpResponse>;
let nativeRequest: NativeRequest = (opts) => CapacitorHttp.request(opts);

/** 测试桩：替换原生请求实现 / 在网页里假装自己是原生壳 */
export function _setNativeRequestForTest(fn: NativeRequest | null, pretendNative = false): void {
  nativeRequest = fn ?? ((opts) => CapacitorHttp.request(opts));
  forceNativeForTest = pretendNative;
}

const abortError = (): Error => {
  try { return new DOMException('The operation was aborted.', 'AbortError'); } catch { const e = new Error('The operation was aborted.'); e.name = 'AbortError'; return e; }
};

function normalizeHeaders(h: HeadersInit | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!h) return out;
  if (typeof Headers !== 'undefined' && h instanceof Headers) { h.forEach((v, k) => { out[k] = v; }); return out; }
  if (Array.isArray(h)) { for (const [k, v] of h) out[k] = v; return out; }
  for (const [k, v] of Object.entries(h)) out[k] = String(v);
  return out;
}

/**
 * 用原生层发一次请求并包成标准 Response：调用方的 resp.ok / status / text() / json() / headers.get() 照用。
 * 网络层失败抛 TypeError（与 fetch 同口径，aiNet.isNetworkError 认得）；取消抛 AbortError。
 * 注意：CapacitorHttp 发出去就收不回，signal 只能让调用方不再等它。
 */
export async function nativeFetch(url: string, init: RequestInit = {}): Promise<Response> {
  if (init.signal?.aborted) throw abortError();
  const method = (init.method ?? 'GET').toUpperCase();
  const headers = normalizeHeaders(init.headers);
  const contentType = Object.entries(headers).find(([k]) => k.toLowerCase() === 'content-type')?.[1] ?? '';
  let data: unknown = undefined;
  if (typeof init.body === 'string') {
    // 原生层只认字符串或 JSON 对象：JSON 请求体先解析成对象交给它序列化（安卓对字符串体 + json 头的处理各版本不一）
    if (/application\/json/i.test(contentType)) { try { data = JSON.parse(init.body); } catch { data = init.body; } }
    else data = init.body;
  } else if (init.body != null) {
    throw new TypeError('Load failed (native): 原生通道只支持文本请求体');
  }
  const req = nativeRequest({ url, method, headers, data, responseType: 'text', readTimeout: 180_000, connectTimeout: 30_000 });
  let res: HttpResponse;
  try {
    res = init.signal
      ? await Promise.race([req, new Promise<never>((_, reject) => init.signal!.addEventListener('abort', () => reject(abortError()), { once: true }))])
      : await req;
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') throw e;
    const msg = e instanceof Error ? e.message : String(e);
    throw new TypeError(`Load failed (native): ${msg.slice(0, 120)}`);
  }
  const status = Number(res?.status) || 0;
  if (status < 200 || status > 599) throw new TypeError(`Load failed (native): 无状态码（${status}）`);
  const text = typeof res.data === 'string' ? res.data : res.data == null ? '' : JSON.stringify(res.data);
  const h = new Headers();
  for (const [k, v] of Object.entries(res.headers ?? {})) { if (typeof v === 'string') { try { h.set(k, v); } catch { /* 非法头名 */ } } }
  return new Response(text, { status, headers: h });
}

/** fetch 的替身：代理开关开启时改道后端；原生主机走原生通道，其余照旧 */
export async function aiFetch(url: string, init: RequestInit = {}, force?: boolean): Promise<Response> {
  const rewritten = rewriteForProxy(url, init);
  if (rewritten) return fetch(rewritten.url, rewritten.init);
  return (force ?? isNativeHost(url)) ? nativeFetch(url, init) : fetch(url, init);
}

// ── 后端代理改道（钥匙不进浏览器）────────────────────────────────────────
// 开关打开时，AI 请求不再直连服务商，而是发给自己登录的后端 /api/ai/*，由后端持有
// API Key 转发。前端此时不需要带真 Key（后端按 X-Upstream-Provider 选服务端的 Key）。

let proxyEnabled = false;
let proxyBaseUrl = '';
/** 服务端**实际**配了钥匙的服务商（来自 GET /api/ai/capabilities）；空 = 一家都没配 */
let proxyProviders = new Set<string>();

/** 由 aiClient 解析设置时调用：开关 + 后端地址（velvetApi 的 API_URL） */
export function syncAiProxy(enabled: boolean, baseUrl: string): void {
  proxyEnabled = enabled;
  proxyBaseUrl = baseUrl.replace(/\/$/, '');
}

/** 由 aiClient 拉到能力清单后同步进来（见 ensureAiCapabilities） */
export function syncProxyProviders(providers: string[]): void {
  proxyProviders = new Set(providers);
}

/** 供诊断输出：服务端当前声明"配了钥匙"的服务商。空 = 一家都没配，请求都走直连 */
export function proxyProvidersSnapshot(): string[] {
  return [...proxyProviders];
}

export const aiProxyEnabled = (): boolean => proxyEnabled;

/**
 * 临时关掉代理跑一次，跑完无论成败都恢复原状。
 *
 * 用途：后端代理「服务端没配这家钥匙」时（502），调用方改走直连、用本机保存的 Key 再试一次。
 * 聊天路径一直有这个回退（见 aiClient 的「代理 502 → 直连」）；测试连接当初漏了，
 * 于是出现「聊天明明能用、点测试连接却报 HTTP 502 服务端未配置 XXX_API_KEY」。
 */
export async function withoutAiProxy<T>(run: () => Promise<T>): Promise<T> {
  const wasEnabled = proxyEnabled;
  const previousBaseUrl = proxyBaseUrl;
  proxyEnabled = false;
  proxyBaseUrl = '';
  try {
    return await run();
  } finally {
    proxyEnabled = wasEnabled;
    proxyBaseUrl = previousBaseUrl;
  }
}

/**
 * 音频转写代理改道（FormData 专用）。
 * 后端代理没有 /audio 端点时返回 null（直连兜底）；有则改发 /api/ai/audio。
 */
export function rewriteAudioForProxy(url: string, init: RequestInit): { url: string; init: RequestInit } {
  const rewritten = rewriteForProxy(url, init);
  if (rewritten && rewritten.url.endsWith('/api/ai/chat')) {
    return { url: rewritten.url.replace('/api/ai/chat', '/api/ai/audio'), init: rewritten.init };
  }
  if (rewritten) return rewritten;
  return { url, init };
}

/**
 * 把直连服务商的 URL/请求头改写成代理形态。
 * 返回 null = 不适用（调用方直连兜底）。
 */
export function rewriteForProxy(url: string, init: RequestInit): { url: string; init: RequestInit } | null {
  if (!proxyEnabled || !proxyBaseUrl) return null;
  const session = getAuthToken();
  if (!isAuthenticated() || !session) throw new Error('登录状态已失效，请重新登录后使用代理');
  try {
    const u = new URL(url);
    // 「拉模型列表」必须带用户自己的 Key 直连服务商，不能走代理：
    //   · 代理会把 Authorization 换成后端 JWT（用户 Key 被删掉）；
    //   · 后端按 BYOK 设计并不持有各家的 Key，真转发出去只会得到 404/502；
    //   · 而且 GET /…/models 会被下面的改写规则并到 /api/ai/chat，而后端只有 POST 映射，
    //     404 在错误分发里还会被鉴权过滤器当成匿名 → 前端拿到一个 401「密钥无效」的假象。
    if (u.pathname.endsWith('/models')) return null;
    // Anthropic 协议端点 …/v1/messages → 代理 /api/ai/messages；其余按 OpenAI 兼容 → /api/ai/chat
    const path = u.pathname.endsWith('/messages') ? '/api/ai/messages' : '/api/ai/chat';
    const headers = new Headers(init.headers ?? {});
    const provider = headers.get('X-Upstream-Provider') ?? '';
    // 服务端没配这家的钥匙 → 直连（用用户自己的 Key）。
    // 硬走代理只会白撞一次 502「服务端未配置 XXX_API_KEY」，再靠调用方回退 —— 每次多一个来回。
    if (!proxyProviders.has(provider)) return null;
    const host = u.host;
    headers.delete('Authorization');
    headers.delete('x-api-key');
    headers.delete('X-Upstream-Key-Ref');
    headers.set('Authorization', `Bearer ${session}`);
    headers.set('X-Upstream-Provider', provider);
    if (provider === 'custom') {
      headers.set('X-Upstream-Host', host);
      const basePath = u.pathname.replace(/\/(?:chat\/completions|messages|audio\/transcriptions)\/?$/, '');
      headers.set('X-Upstream-Base-Url', `${u.origin}${basePath}`);
    }
    return { url: `${proxyBaseUrl}${path}`, init: { ...init, headers } };
  } catch {
    return null;
  }
}
