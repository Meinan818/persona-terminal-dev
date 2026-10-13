import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { authWithPassword, clearAuth } from '@/services/velvetApi';
import { syncAiProxy, rewriteForProxy, aiProxyEnabled, _setNativeRequestForTest } from '../aiTransport';

describe('AI 后端代理改道（rewriteForProxy）', () => {
  beforeEach(async () => {
    _setNativeRequestForTest(null, false);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ token: 'synthetic-session', record: { id: 'test', email: 'test@example.invalid' } })));
    await authWithPassword('test', 'synthetic');
  });
  afterEach(() => { syncAiProxy(false, ''); clearAuth(); vi.unstubAllGlobals(); });

  it('开关关闭时原样直连', () => {
    syncAiProxy(false, 'http://localhost:8080');
    expect(aiProxyEnabled()).toBe(false);
    const init = { method: 'POST', headers: { Authorization: 'Bearer sk-test' } };
    expect(rewriteForProxy('https://api.openai.com/v1/chat/completions', init)).toBeNull();
  });

  it('开关开启：OpenAI 端点改道 /api/ai/chat，剥掉鉴权头、补 provider 头', () => {
    syncAiProxy(true, 'http://localhost:8080/');
    const init = {
      method: 'POST',
      headers: { 'Authorization': 'Bearer sk-test', 'X-Upstream-Provider': 'deepseek', 'Content-Type': 'application/json' },
      body: '{"model":"x"}',
    };
    const r = rewriteForProxy('https://api.deepseek.com/v1/chat/completions', init);
    expect(r).not.toBeNull();
    expect(r!.url).toBe('http://localhost:8080/api/ai/chat');
    const h = new Headers(r!.init.headers);
    expect(h.get('Authorization')).toBe('Bearer synthetic-session'); // 应用登录凭据与上游 Key 分开
    expect(h.get('X-Upstream-Provider')).toBe('deepseek');
    expect(r!.init.body).toBe('{"model":"x"}');         // 请求体原样透传
  });

  it('Anthropic 端点改道 /api/ai/messages，剥掉 x-api-key', () => {
    syncAiProxy(true, 'http://localhost:8080');
    const init = { method: 'POST', headers: { 'x-api-key': 'sk-ant', 'X-Upstream-Provider': 'custom' } };
    const r = rewriteForProxy('https://relay.example.com/v1/messages', init);
    expect(r!.url).toBe('http://localhost:8080/api/ai/messages');
    const h = new Headers(r!.init.headers);
    expect(h.get('x-api-key')).toBeNull();
    expect(h.get('X-Upstream-Host')).toBe('relay.example.com'); // custom 服务商带主机给服务端白名单校验
  });

  it('未配后端地址时不开代理（fail-closed）', () => {
    syncAiProxy(true, '');
    const init = { headers: { 'X-Upstream-Provider': 'openai' } };
    expect(rewriteForProxy('https://api.openai.com/v1/chat/completions', init)).toBeNull();
  });

  it('非法 URL 改道失败时返回 null（直连兜底）', () => {
    syncAiProxy(true, 'http://localhost:8080');
    expect(rewriteForProxy('not-a-url', {})).toBeNull();
  });
});
