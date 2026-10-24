import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useCloudStore } from '@/store/cloud';

// velvetApi 只依赖全局 fetch 与 localStorage——jsdom 环境自带 localStorage
import {
  register,
  authWithPassword,
  isAuthenticated,
  getUserId,
  clearAuth,
  onAuthChange,
  getToken,
  VelvetApiError,
  velvetRequest,
  getAuthGeneration,
  SESSION_EXPIRED_MESSAGE,
} from '../velvetApi';

const ok = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  }));

describe('velvetApi 认证客户端', () => {
  beforeEach(() => {
    localStorage.clear();
    clearAuth();
    vi.restoreAllMocks();
  });

  it('注册成功：保存 token 与 record，isAuthenticated 变 true', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok({
      token: 'jwt-abc',
      record: { id: 'u1', email: 'a@b.c', name: 'tester' },
    })));
    const rec = await register('a@b.c', 'password123', 'tester');
    expect(rec.id).toBe('u1');
    expect(isAuthenticated()).toBe(true);
    expect(getUserId()).toBe('u1');
    expect(getToken()).toBe('jwt-abc');
    // 请求形状：POST /api/velvet/register，带 email/password/name，不带 Authorization
    const call = vi.mocked(fetch).mock.calls[0];
    expect(call[0]).toContain('/api/velvet/register');
    const body = JSON.parse((call[1] as RequestInit).body as string);
    expect(body).toEqual({ email: 'a@b.c', password: 'password123', name: 'tester' });
    expect(JSON.stringify((call[1] as RequestInit).headers)).not.toContain('Authorization');
  });

  it('登录成功：契约 {token, record}，登录前不出现 Authorization 头', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok({
      token: 'jwt-xyz',
      record: { id: 'u2', email: 'x@y.z', name: 'uid1' },
    })));
    const rec = await authWithPassword('uid1', 'pw123456');
    expect(rec.id).toBe('u2');
    expect(getToken()).toBe('jwt-xyz');
  });

  it('登录失败 401 velvet:not_found：抛 VelvetApiError，status=401，body 可探测', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok({ velvet: 'not_found' }, 401)));
    await expect(authWithPassword('nobody', 'wrong')).rejects.toMatchObject({
      status: 401,
      body: { velvet: 'not_found' },
    });
    expect(isAuthenticated()).toBe(false);
  });

  it('已登录请求收到 401：清理过期会话并保留“本机数据仍在”的明确提示', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(ok({ token: 'expired-token', record: { id: 'u-expired', email: 'old@example.com' } }))
      .mockResolvedValueOnce(ok({ velvet: 'not_found' }, 401)));
    await authWithPassword('old@example.com', 'pw123456');

    await expect(velvetRequest('/api/me')).rejects.toMatchObject({
      status: 401,
      message: SESSION_EXPIRED_MESSAGE,
    });
    expect(isAuthenticated()).toBe(false);
    expect(localStorage.getItem('velvet.jwt')).toBeNull();
    expect(localStorage.getItem('velvet.record')).toBeNull();
  });

  it('注册冲突 409：抛 VelvetApiError status=409', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok(
      { velvet: 'not_found', message: 'email already registered' }, 409)));
    await expect(register('taken@b.c', 'password123')).rejects.toMatchObject({ status: 409 });
  });

  it('登录态持久化：写 localStorage', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok({
      token: 'jwt-p', record: { id: 'u3', email: 'p@b.c' },
    })));
    await authWithPassword('p@b.c', 'pw123456');
    expect(localStorage.getItem('velvet.jwt')).toBe('jwt-p');
    expect(JSON.parse(localStorage.getItem('velvet.record')!)).toMatchObject({ id: 'u3' });
  });

  it('onAuthChange：登录时收到 record，登出收到 null', async () => {
    const seen: Array<{ id: string | null }> = [];
    const off = onAuthChange((r: { id?: string } | null) => seen.push({ id: r?.id ?? null }));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok({
      token: 't', record: { id: 'u9', email: 'e@b.c' },
    })));
    await authWithPassword('e@b.c', 'pw123456');
    clearAuth();
    expect(seen).toEqual([{ id: 'u9' }, { id: null }]);
    off();
  });

  it('VelvetApiError 是 Error 实例（auth.ts 的 instanceof 逻辑依赖）', () => {
    expect(new VelvetApiError(404, { velvet: 'not_found' })).toBeInstanceOf(Error);
  });

  it.each([502, 401, 403])('非 JSON 错误体保留 HTTP %s，不传播原始 HTML', async status => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>gateway error</html>', { status })));
    await expect(velvetRequest('/api/me')).rejects.toMatchObject({ status, body: null });
  });
  it('空错误体保留状态码，坏成功 JSON 报协议错误，204 正常返回', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response(null, { status: 502 }))
      .mockResolvedValueOnce(new Response('{broken', { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 })));
    await expect(velvetRequest('/api/me')).rejects.toMatchObject({ status: 502 });
    await expect(velvetRequest('/api/me')).rejects.toMatchObject({ status: 200, message: '服务器响应格式错误' });
    await expect(velvetRequest('/api/avatar', { method: 'DELETE' })).resolves.toBeNull();
  });
  it('重新登录同一账号也会使旧会话代次失效', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => ok({ token: 'synthetic', record: { id: 'test', email: 'test@example.invalid' } })));
    await authWithPassword('test', 'synthetic');
    const generation = getAuthGeneration();
    clearAuth(); await authWithPassword('test', 'synthetic');
    expect(getAuthGeneration()).toBeGreaterThan(generation);
  });
  it('其他标签页登出后通知监听方，并使在途会话失效', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => ok({ token: 'synthetic', record: { id: 'test', email: 'test@example.invalid' } })));
    await authWithPassword('test', 'synthetic');
    const generation = getAuthGeneration();
    localStorage.removeItem('velvet.jwt'); localStorage.removeItem('velvet.record');
    window.dispatchEvent(new StorageEvent('storage', { key: 'velvet.jwt', storageArea: localStorage }));
    expect(isAuthenticated()).toBe(false); expect(getAuthGeneration()).toBeGreaterThan(generation);
  });
  it('登出后清除上一会话的同步中状态与错误', () => {
    const off = useCloudStore.getState().initAuthListener();
    try {
      useCloudStore.setState({ syncStatus: 'syncing', lastError: 'previous session' });
      clearAuth();
      expect(useCloudStore.getState()).toMatchObject({ cloudUser: null, syncStatus: 'idle', lastError: null });
    } finally { off(); }
  });

  it('换账号或重新登录时清空上一会话的同步水位、冲突与待确认提示', async () => {
    const off = useCloudStore.getState().initAuthListener();
    try {
      vi.stubGlobal('fetch', vi.fn()
        .mockResolvedValueOnce(ok({ token: 'token-a', record: { id: 'account-a', email: 'a@example.com' } }))
        .mockResolvedValueOnce(ok({ token: 'token-b', record: { id: 'account-b', email: 'b@example.com' } })));
      await authWithPassword('account-a', 'pw123456');
      useCloudStore.setState({
        lastSyncAt: new Date('2026-10-24T00:00:00.000Z'),
        lastSyncDirection: 'pull',
        conflictPending: true,
        diffWarning: { tables: [] } as never,
        mergeOpen: true,
        mergeHint: ['activities'],
      });

      clearAuth();
      await authWithPassword('account-b', 'pw123456');

      expect(useCloudStore.getState()).toMatchObject({
        cloudUser: expect.objectContaining({ id: 'account-b' }),
        lastSyncAt: null,
        lastSyncDirection: null,
        conflictPending: false,
        diffWarning: null,
        mergeOpen: false,
        mergeHint: null,
      });
    } finally {
      off();
    }
  });
});
