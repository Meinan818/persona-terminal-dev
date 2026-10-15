/**
 * 回归：**测试连接**与**拉模型列表**这两条请求必须带上 X-Upstream-Provider。
 *
 * 背景（2026-10-14 真机反馈）：用自研后端代理时，后端按这个头选服务商的 Key
 * （见 AiProxyController 与 aiTransport.rewriteForProxy 的透传）。真实对话一直带着它，
 * 而这两条请求当初漏了 → 后端回 400「缺少 X-Upstream-Provider 头」，
 * 用户看到的就是「聊天明明能用，点测试连接却报失败」。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ aiFetch: vi.fn(), nativeAvailable: false }));

// 只替换网络出口：代理开关（syncAiProxy / aiProxyEnabled / withoutAiProxy）必须用真实现，
// 否则测不出「代理 502 → 回退直连」这条路径。
vi.mock('@/utils/aiTransport', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/aiTransport')>();
  return { ...actual, aiFetch: h.aiFetch, nativeTransportAvailable: () => h.nativeAvailable };
});

import { fetchAvailableModels, testAIConnection } from '@/utils/aiProviders';
import { syncAiProxy } from '@/utils/aiTransport';

const okJson = (body: unknown): Response =>
  new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });

const headersOfFirstCall = (): Headers =>
  new Headers((h.aiFetch.mock.calls[0][1] as RequestInit).headers as HeadersInit);

describe('AI 请求头：代理靠 X-Upstream-Provider 认服务商', () => {
  beforeEach(() => {
    h.aiFetch.mockReset();
    h.nativeAvailable = false;
    localStorage.clear();
    syncAiProxy(false, '');
  });

  it('测试连接带上当前服务商', async () => {
    h.aiFetch.mockResolvedValue(okJson({ choices: [{ message: { role: 'assistant', content: 'pong' } }] }));
    await testAIConnection({ provider: 'deepseek', apiKey: 'sk-synthetic' });
    expect(headersOfFirstCall().get('X-Upstream-Provider')).toBe('deepseek');
  });

  it('拉模型列表带上当前服务商', async () => {
    h.aiFetch.mockResolvedValue(okJson({ data: [{ id: 'deepseek-chat' }] }));
    await fetchAvailableModels({ provider: 'deepseek', apiKey: 'sk-synthetic' });
    expect(headersOfFirstCall().get('X-Upstream-Provider')).toBe('deepseek');
  });

  it('首次拉模型被 WebView 跨域拦住时，改走原生通道并标记主机', async () => {
    h.nativeAvailable = true;
    h.aiFetch
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(okJson({ data: [{ id: 'kitool-model' }] }));

    const result = await fetchAvailableModels({
      provider: 'custom', apiKey: 'sk-synthetic', baseUrl: 'https://kitool.ai/v1',
    });

    expect(result).toMatchObject({ ok: true, models: ['kitool-model'], transport: 'native', nativeHost: 'kitool.ai' });
    expect(h.aiFetch).toHaveBeenCalledTimes(2);
    expect(h.aiFetch.mock.calls[0][2]).toBeUndefined();
    expect(h.aiFetch.mock.calls[1][2]).toBe(true);
  });

  it('代理报「服务端未配置这家钥匙」时，回退直连再试一次', async () => {
    syncAiProxy(true, 'http://backend.invalid');
    h.aiFetch
      .mockResolvedValueOnce(new Response(
        JSON.stringify({ message: '服务端未配置 DEEPSEEK_API_KEY 环境变量' }),
        { status: 502, headers: { 'Content-Type': 'application/json' } },
      ))
      .mockResolvedValueOnce(okJson({ choices: [{ message: { role: 'assistant', content: 'pong' } }] }));

    const result = await testAIConnection({ provider: 'deepseek', apiKey: 'sk-synthetic' });

    expect(result.ok).toBe(true);
    expect(h.aiFetch).toHaveBeenCalledTimes(2);
  });
});
