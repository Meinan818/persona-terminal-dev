/**
 * 远程图片原生取回的单测。
 *
 * 由来（2026-10-16 缺陷 B 真机复现 + 桌面 Chromium 实测）：
 * App 的 WebView origin 是 `https://localhost`（Capacitor androidScheme:'https'），
 * 而后端是 `http://<公网IP>`。Chromium 把这种跨协议的图片请求判为 mixed-content
 * 直接拦掉——本机实测：同一张 `http://192.144.227.216/icon.png`，
 * 在 http 页面里 LOADED 128x128，在 https 页面里 ERROR 且 blockedReason=mixed-content；
 * 且「允许混合内容」开关在当代 Chromium 上已不生效（`--allow-running-insecure-content`
 * 与 `--blink-settings=allowRunningInsecureContent=true` 两种方式都仍被拦）。
 *
 * 因此改走原生 HTTP：CapacitorHttp 的 Android 实现里
 * （@capacitor/android .../util/HttpRequestHandler.java 的 readData）
 * `responseType` 为 ARRAY_BUFFER/BLOB 时走 `readStreamAsBase64`，即拿回 base64 字符串。
 * 前端再拼成 `data:` URL 交给 <img> —— data:/blob: 不跨协议，不会触发拦截。
 *
 * 本测试钉死四件事：判定条件、base64 清洗、失败可回退、同址只取一次。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/utils/native', () => ({ isNative: vi.fn(() => false) }));

import { isNative } from '@/utils/native';
import {
  needsNativeAssetFetch,
  fetchRemoteAssetAsDataUrl,
  fetchRemoteAssetBlob,
  clearRemoteAssetCache,
  _setNativeGetForTest,
} from '../remoteAsset';

const mockedIsNative = isNative as unknown as ReturnType<typeof vi.fn>;
const asNative = (v: boolean) => { mockedIsNative.mockReturnValue(v); };

/** 造一个原生响应桩：默认 200 + image/png + 一小段 base64 */
const okResponse = (over: Record<string, unknown> = {}) => ({
  status: 200,
  data: 'iVBORw0KGgo=',
  headers: { 'Content-Type': 'image/png' },
  url: 'http://192.144.227.216/api/avatar/7',
  ...over,
});

describe('远程图片原生取回（绕开 App 内混合内容拦截）', () => {
  beforeEach(() => {
    clearRemoteAssetCache();
    _setNativeGetForTest(null);
    asNative(false);
    vi.clearAllMocks();
  });

  describe('要不要走原生', () => {
    it('网页端一律不走（同源解析，本来就没问题）', () => {
      asNative(false);
      expect(needsNativeAssetFetch('http://192.144.227.216/api/avatar/7')).toBe(false);
    });

    it('原生壳里的 http 绝对地址要走（这正是被拦的那种）', () => {
      asNative(true);
      expect(needsNativeAssetFetch('http://192.144.227.216/api/avatar/7')).toBe(true);
    });

    it('原生壳里的 https 地址不走（不跨协议，未来后端上 https 后自动免走这条）', () => {
      asNative(true);
      expect(needsNativeAssetFetch('https://cdn.example.com/a.png')).toBe(false);
      expect(needsNativeAssetFetch('https://192.144.227.216/api/avatar/7')).toBe(false);
    });

    it('data: / blob: / 相对路径都不走', () => {
      asNative(true);
      expect(needsNativeAssetFetch('data:image/png;base64,AAA')).toBe(false);
      expect(needsNativeAssetFetch('blob:http://x/y')).toBe(false);
      expect(needsNativeAssetFetch('/api/avatar/7')).toBe(false);
      expect(needsNativeAssetFetch(undefined)).toBe(false);
      expect(needsNativeAssetFetch('')).toBe(false);
    });
  });

  describe('取回并拼成 data URL', () => {
    it('成功时返回 data:image/png;base64,... 形式', async () => {
      asNative(true);
      const calls: unknown[] = [];
      _setNativeGetForTest(async (opts) => { calls.push(opts); return okResponse() as never; });

      const out = await fetchRemoteAssetAsDataUrl('http://192.144.227.216/api/avatar/7');

      expect(out).toBe('data:image/png;base64,iVBORw0KGgo=');
      // 必须以 blob 方式请求，否则原生侧不会走 base64 那条分支
      expect(calls).toHaveLength(1);
      expect((calls[0] as { responseType?: string }).responseType).toBe('blob');
    });

    it('Android 的 Base64.DEFAULT 会带换行——必须清洗掉，否则 data URL 是坏的', async () => {
      asNative(true);
      _setNativeGetForTest(async () => okResponse({ data: 'iVBORw0K\r\nGgo=\n' }) as never);

      const out = await fetchRemoteAssetAsDataUrl('http://192.144.227.216/api/avatar/8');

      expect(out).toBe('data:image/png;base64,iVBORw0KGgo=');
    });

    it('Content-Type 带 charset 时只取主类型', async () => {
      asNative(true);
      _setNativeGetForTest(async () => okResponse({ headers: { 'content-type': 'image/webp; charset=binary' } }) as never);

      const out = await fetchRemoteAssetAsDataUrl('http://192.144.227.216/api/avatar/9');
      expect(out.startsWith('data:image/webp;base64,')).toBe(true);
    });

    it('拿不到 image/* 的 Content-Type 时按扩展名兜底', async () => {
      asNative(true);
      _setNativeGetForTest(async () => okResponse({ headers: {} }) as never);

      const jpg = await fetchRemoteAssetAsDataUrl('http://x/a.jpg');
      expect(jpg.startsWith('data:image/jpeg;base64,')).toBe(true);
    });

    it('非 2xx 抛错（调用方据此保留原来的地址，不至于把图弄没）', async () => {
      asNative(true);
      _setNativeGetForTest(async () => okResponse({ status: 404 }) as never);

      await expect(fetchRemoteAssetAsDataUrl('http://x/missing.png')).rejects.toThrow();
    });

    it('原生层抛错时原样冒出去（网络失败不该被吞掉）', async () => {
      asNative(true);
      _setNativeGetForTest(async () => { throw new Error('boom'); });

      await expect(fetchRemoteAssetAsDataUrl('http://x/a.png')).rejects.toThrow('boom');
    });

    it('空 body 视为失败，不产出坏 data URL', async () => {
      asNative(true);
      _setNativeGetForTest(async () => okResponse({ data: '' }) as never);

      await expect(fetchRemoteAssetAsDataUrl('http://x/empty.png')).rejects.toThrow();
    });
  });

  describe('缓存', () => {
    it('同一个地址只向原生要一次', async () => {
      asNative(true);
      let n = 0;
      _setNativeGetForTest(async () => { n += 1; return okResponse() as never; });

      const a = await fetchRemoteAssetAsDataUrl('http://x/same.png');
      const b = await fetchRemoteAssetAsDataUrl('http://x/same.png');

      expect(a).toBe(b);
      expect(n).toBe(1);
    });

    it('并发请求同一地址也只发一次', async () => {
      asNative(true);
      let n = 0;
      _setNativeGetForTest(async () => { n += 1; await new Promise(r => setTimeout(r, 5)); return okResponse() as never; });

      const [a, b] = await Promise.all([
        fetchRemoteAssetAsDataUrl('http://x/race.png'),
        fetchRemoteAssetAsDataUrl('http://x/race.png'),
      ]);

      expect(a).toBe(b);
      expect(n).toBe(1);
    });

    it('失败不进缓存——下次还能重试', async () => {
      asNative(true);
      let n = 0;
      _setNativeGetForTest(async () => {
        n += 1;
        if (n === 1) throw new Error('first fails');
        return okResponse() as never;
      });

      await expect(fetchRemoteAssetAsDataUrl('http://x/retry.png')).rejects.toThrow();
      const second = await fetchRemoteAssetAsDataUrl('http://x/retry.png');
      expect(second).toBe('data:image/png;base64,iVBORw0KGgo=');
      expect(n).toBe(2);
    });
  });

  describe('取原图 Blob（裁切卡面用）', () => {
    it('网页端仍走普通 fetch（行为不变）', async () => {
      asNative(false);
      const spy = vi.fn(async () => ({
        ok: true,
        status: 200,
        blob: async () => new Blob(['x'], { type: 'image/png' }),
      }));
      vi.stubGlobal('fetch', spy);

      const blob = await fetchRemoteAssetBlob('http://192.144.227.216/api/avatar/7');

      expect(spy).toHaveBeenCalledTimes(1);
      expect(blob.type).toBe('image/png');
      vi.unstubAllGlobals();
    });

    it('原生壳里走原生通道，base64 还原成 Blob 且类型来自响应头', async () => {
      asNative(true);
      // 'AQID' 解出来是字节 01 02 03
      _setNativeGetForTest(async () => okResponse({ data: 'AQID', headers: { 'Content-Type': 'image/jpeg' } }) as never);

      const blob = await fetchRemoteAssetBlob('http://192.144.227.216/api/avatar/7');

      expect(blob.type).toBe('image/jpeg');
      const bytes = new Uint8Array(await blob.arrayBuffer());
      expect([...bytes]).toEqual([1, 2, 3]);
    });

    it('原生取原图非 2xx 时抛错（调用方据此提示「取不到原图」）', async () => {
      asNative(true);
      _setNativeGetForTest(async () => okResponse({ status: 500 }) as never);

      await expect(fetchRemoteAssetBlob('http://x/a.png')).rejects.toThrow();
    });
  });
});
