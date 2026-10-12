import { describe, it, expect, vi, beforeEach } from 'vitest';

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
});
