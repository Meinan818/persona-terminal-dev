import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { authWithPassword, clearAuth } from '@/services/velvetApi';
import { aiFetch, rewriteForProxy, syncAiProxy } from '../aiTransport';

beforeEach(async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ token: 'synthetic-session', record: { id: 'test', email: 'test@example.invalid' } })));
  await authWithPassword('test', 'synthetic'); syncAiProxy(true, 'http://localhost:8080');
});
afterEach(() => { clearAuth(); syncAiProxy(false, ''); vi.unstubAllGlobals(); });

it('代理剥离上游 Key 后携带当前应用会话，保留 body 和取消信号', async () => {
  const fetchSpy = vi.fn().mockResolvedValue(Response.json({})); vi.stubGlobal('fetch', fetchSpy);
  const controller = new AbortController();
  await aiFetch('https://relay.example.invalid/custom/v1/chat/completions', { method: 'POST', headers: { Authorization: 'Bearer synthetic-upstream', 'X-Upstream-Provider': 'custom' }, body: '{}', signal: controller.signal });
  const [, init] = fetchSpy.mock.calls[0];
  expect(new Headers(init.headers).get('Authorization')).toBe('Bearer synthetic-session');
  expect(init.body).toBe('{}'); expect(init.signal).toBe(controller.signal);
  expect(new Headers(init.headers).get('X-Upstream-Base-Url')).toBe('https://relay.example.invalid/custom/v1');
});
it('旧凭据引用头不能被带到代理', () => {
  const result = rewriteForProxy('https://relay.example.invalid/v1/chat/completions', { headers: { 'X-Upstream-Provider': 'custom', 'X-Upstream-Key-Ref': 'NON_AI_SENTINEL' } });
  expect(new Headers(result!.init.headers).get('X-Upstream-Key-Ref')).toBeNull();
});
it('登出后代理失败且不回退直连或调用 fetch', async () => {
  clearAuth(); const spy = vi.fn().mockResolvedValue(Response.json({})); vi.stubGlobal('fetch', spy);
  await expect(aiFetch('https://api.openai.com/v1/chat/completions', { headers: { 'X-Upstream-Provider': 'openai' } })).rejects.toThrow();
  expect(spy).not.toHaveBeenCalled();
});
