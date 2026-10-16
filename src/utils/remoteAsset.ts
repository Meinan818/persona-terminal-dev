/**
 * remoteAsset —— 把远程图片经原生通道取回，绕开 App 内的混合内容拦截。
 *
 * 由来（2026-10-16 缺陷 B 的真机定论）：
 * Capacitor 的 `androidScheme:'https'` 让 WebView 里页面的 origin 是 `https://localhost`，
 * 而自建后端是 `http://<公网IP>`。Chromium 把「安全页面去取不安全图片」判为 mixed-content
 * 直接拦掉。本机用桌面 Chromium 实测（同一张 `http://192.144.227.216/icon.png`）：
 *   · http 页面 → LOADED 128x128；
 *   · https 页面 → ERROR，Network.loadingFailed 的 blockedReason = mixed-content；
 *   · 打开「允许混合内容」（--allow-running-insecure-content，
 *     以及更底层的 --blink-settings=allowRunningInsecureContent=true）→ **仍然被拦**。
 * 也就是说 `android.allowMixedContent: true` 这个配置项在现代 Chromium 上已不生效
 * ——「配置在」不等于「管用」，这是之前几轮判断走偏的地方。
 *
 * 解法：改由原生网络栈取图（CapacitorHttp 走 OkHttp/URLSession，与页面 origin 无关），
 * 再以 `data:` 形式交给 <img>。`data:` / `blob:` 不跨协议，不会触发拦截。
 * Android 侧的实现（@capacitor/android 的 util/HttpRequestHandler.java:readData）
 * 在 `responseType` 为 ARRAY_BUFFER/BLOB 时走 `readStreamAsBase64`，所以拿到的是 base64 字符串。
 *
 * 边界：
 *   · 只在原生壳里走这条路——网页端同源解析本来就正常，不掺和；
 *   · 只代理 `http://` 绝对地址——将来后端挂上 https 后，本机制自动失效（不需要它了）；
 *   · 取失败一律抛错，由调用方保留原地址（宁可维持现状，也不能把图弄没）。
 */
import { CapacitorHttp, type HttpOptions, type HttpResponse } from '@capacitor/core';
import { isNative } from '@/utils/native';

/** 要不要走原生：原生壳 + http:// 绝对地址（页面是 https，跨协议必被拦） */
export const needsNativeAssetFetch = (url?: string | null): boolean =>
  !!url && isNative() && /^http:\/\//i.test(url);

type NativeGet = (opts: HttpOptions) => Promise<HttpResponse>;

let nativeGet: NativeGet = (opts) => CapacitorHttp.request(opts);

/** 测试桩：替换原生请求实现（照 aiTransport 的同款做法） */
export function _setNativeGetForTest(fn: NativeGet | null): void {
  nativeGet = fn ?? ((opts) => CapacitorHttp.request(opts));
}

const MIME_BY_EXT: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  bmp: 'image/bmp',
};

/**
 * 定出 data URL 的 MIME。优先信后端给的 image/*；拿不到（或不是 image/*）时按扩展名兜底。
 * 头名大小写不固定，逐个比。
 */
export const mimeOfAsset = (headers: Record<string, string> | undefined, url: string): string => {
  let ct = '';
  if (headers) {
    for (const [k, v] of Object.entries(headers)) {
      if (k.toLowerCase() === 'content-type' && typeof v === 'string') { ct = v; break; }
    }
  }
  const main = ct.split(';')[0].trim().toLowerCase();
  if (main.startsWith('image/')) return main;
  const path = url.split('?')[0].split('#')[0];
  const ext = path.includes('.') ? path.slice(path.lastIndexOf('.') + 1).toLowerCase() : '';
  return MIME_BY_EXT[ext] ?? 'image/png';
};

/** 已取回的 data URL 缓存：同一个头像在多个页面反复出现，不该反复走原生 */
const cache = new Map<string, string>();
/** 在途请求：同一地址并发调用只发一次 */
const inflight = new Map<string, Promise<string>>();

/** 清缓存（测试用；换账号/退出登录时可调） */
export function clearRemoteAssetCache(): void {
  cache.clear();
  inflight.clear();
}

/** 经原生通道取一张图，返回可直接塞给 <img> 的 data URL。失败抛错，不进缓存。 */
export async function fetchRemoteAssetAsDataUrl(url: string): Promise<string> {
  const hit = cache.get(url);
  if (hit) return hit;
  const running = inflight.get(url);
  if (running) return running;

  const task = (async () => {
    const res = await nativeGet({ url, method: 'GET', responseType: 'blob' });
    const status = Number(res?.status) || 0;
    if (status < 200 || status > 299) throw new Error(`远程图片取回失败：HTTP ${status}`);
    const raw = typeof res?.data === 'string' ? res.data : '';
    // Android 的 Base64.DEFAULT 每 76 字符插入换行，必须清掉，否则 data URL 是坏的
    const b64 = raw.replace(/\s+/g, '');
    if (!b64) throw new Error('远程图片取回失败：响应体为空');
    const out = `data:${mimeOfAsset(res?.headers as Record<string, string> | undefined, url)};base64,${b64}`;
    cache.set(url, out);
    return out;
  })();

  inflight.set(url, task);
  try {
    return await task;
  } finally {
    inflight.delete(url);
  }
}

/**
 * 取一张远程图并返回 Blob——给「裁切卡面」这类必须拿到原始字节的场景用
 * （原来直接 `fetch(远端URL)`，而 fetch 属主动混合内容，在 App 里同样会被拦）。
 * 网页端仍是普通 fetch，行为不变。
 */
export async function fetchRemoteAssetBlob(url: string): Promise<Blob> {
  if (!needsNativeAssetFetch(url)) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`取原图失败：HTTP ${res.status}`);
    return res.blob();
  }
  const res = await nativeGet({ url, method: 'GET', responseType: 'blob' });
  const status = Number(res?.status) || 0;
  if (status < 200 || status > 299) throw new Error(`取原图失败：HTTP ${status}`);
  const raw = typeof res?.data === 'string' ? res.data : '';
  const b64 = raw.replace(/\s+/g, '');
  if (!b64) throw new Error('取原图失败：响应体为空');
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mimeOfAsset(res?.headers as Record<string, string> | undefined, url) });
}
