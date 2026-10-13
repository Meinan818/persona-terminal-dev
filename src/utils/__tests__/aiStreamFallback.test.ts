/**
 * 回归：流式路径也必须能在代理不可用时回退直连。
 *
 * 背景（2026-10-14 用户实测「塔罗 AI 不能用」）：非流式的 chatComplete 早就有
 * 「代理 502 → 关掉代理、用本机 Key 直连重发」，但流式的 chatStream 漏了这条，
 * 于是塔罗、谏言、年度总结这些走流式的功能会把 502「服务端未配置 XXX_API_KEY」
 * 原样显示给用户。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { authWithPassword, clearAuth } from '@/services/velvetApi';
import { syncAiProxy, syncProxyProviders } from '@/utils/aiTransport';
import { chatStream, type AIConfig } from '@/utils/aiClient';

const cfg: AIConfig = {
  apiKey: 'sk-synthetic',
  baseUrl: 'https://api.deepseek.com/v1',
  model: 'deepseek-chat',
  provider: 'deepseek',
  tier: 'fast',
};

const sseResponse = (text: string): Response =>
  new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(
          `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\ndata: [DONE]\n\n`,
        ));
        controller.close();
      },
    }),
    { status: 200, headers: { 'Content-Type': 'text/event-stream' } },
  );

describe('流式 AI 的代理回退', () => {
  beforeEach(async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      Response.json({ token: 'synthetic-session', record: { id: 'test', email: 'test@example.invalid' } }),
    ));
    await authWithPassword('test', 'synthetic');
    syncAiProxy(true, 'http://backend.invalid');
    // 服务端「声称」有这家钥匙 → 请求会先走代理；真实场景里它这时会回 502
    syncProxyProviders(['deepseek']);
  });

  afterEach(() => {
    syncAiProxy(false, '');
    syncProxyProviders([]);
    clearAuth();
    vi.unstubAllGlobals();
  });

  it('代理 502 时关掉代理、用本机 Key 直连重发', async () => {
    const fetchSpy = vi.fn()
      .mockResolvedValueOnce(new Response(
        JSON.stringify({ message: '服务端未配置 DEEPSEEK_API_KEY 环境变量' }),
        { status: 502, headers: { 'Content-Type': 'application/json' } },
      ))
      .mockResolvedValueOnce(sseResponse('你好'));
    vi.stubGlobal('fetch', fetchSpy);

    const chunks: string[] = [];
    for await (const delta of chatStream(cfg, [{ role: 'user', content: 'hi' }])) chunks.push(delta);

    expect(chunks.join('')).toContain('你好');
    expect(String(fetchSpy.mock.calls[1][0])).toContain('api.deepseek.com'); // 第二发已改回直连服务商
  });
});
