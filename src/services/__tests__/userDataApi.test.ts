import { describe, it, expect, vi, beforeEach } from 'vitest';

// userDataApi 是自研后端同步数据面的传输层：只依赖 velvetApi 的 fetch 封装与全局 fetch。
// 契约锁定在后端 SyncController（/api/sync/rows*、/api/sync/profile）。
import * as api from '../userDataApi';
import { authWithPassword, clearAuth } from '../velvetApi';

const ok = (body: unknown, status = 200) =>
  new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

/** 取最近一次 fetch 调用的 [url, init] */
const lastCall = () => {
  const calls = vi.mocked(fetch).mock.calls;
  return calls[calls.length - 1] as [string, RequestInit];
};

describe('userDataApi 同步数据面客户端', () => {
  beforeEach(() => {
    localStorage.clear();
    clearAuth();
    vi.restoreAllMocks();
  });

  it('listRows 全量：GET /api/sync/rows，不带 fields、不带 method', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok([
      { id: 'r1', key: 'todos', value: [], created: 'c', updated: 'u' },
    ])));
    const rows = await api.listRows();
    expect(rows).toHaveLength(1);
    expect(rows[0].key).toBe('todos');
    const [url, init] = lastCall();
    expect(url).toBe('http://localhost:8080/api/sync/rows');
    expect(init.method).toBeUndefined();
  });

  it('listRows({ids:true}) 投影模式：URL 带 fields 且不含 value', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok([])));
    await api.listRows({ ids: true });
    const [url] = lastCall();
    expect(url).toBe('http://localhost:8080/api/sync/rows?fields=id,key,updated,created');
  });

  it('countRows：GET /api/sync/rows/count，返回 totalItems', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok({ totalItems: 3 })));
    const res = await api.countRows();
    expect(res.totalItems).toBe(3);
    const [url, init] = lastCall();
    expect(url).toBe('http://localhost:8080/api/sync/rows/count');
    expect(init.method).toBeUndefined();
  });

  it('getRow：GET /api/sync/rows/{id}，id 经 encodeURIComponent', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok({ id: 'a/b', key: 'k' })));
    await api.getRow('a/b');
    const [url] = lastCall();
    expect(url).toBe('http://localhost:8080/api/sync/rows/a%2Fb');
  });

  it('createRow：POST /api/sync/rows，body 为 {key,value}', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok({ id: 'n1', key: 'todos' })));
    await api.createRow('todos', [{ id: 1 }]);
    const [url, init] = lastCall();
    expect(url).toBe('http://localhost:8080/api/sync/rows');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ key: 'todos', value: [{ id: 1 }] });
  });

  it('updateRow：PUT /api/sync/rows/{id}，body 只含 value', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok({ id: 'n1', updated: '2026-01-01T00:00:00Z' })));
    const res = await api.updateRow('n1', [1, 2]);
    expect(res.updated).toBe('2026-01-01T00:00:00Z');
    const [url, init] = lastCall();
    expect(url).toBe('http://localhost:8080/api/sync/rows/n1');
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body as string)).toEqual({ value: [1, 2] });
  });

  it('deleteRow：DELETE /api/sync/rows/{id}，204 空响应不抛错', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok(undefined, 204)));
    await expect(api.deleteRow('n1')).resolves.toBeNull();
    const [url, init] = lastCall();
    expect(url).toBe('http://localhost:8080/api/sync/rows/n1');
    expect(init.method).toBe('DELETE');
  });

  it('updateProfile：PUT /api/sync/profile，body 透传 patch', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok({ id: 'u1', name: '新名' })));
    const rec = await api.updateProfile({ name: '新名' });
    expect(rec.name).toBe('新名');
    const [url, init] = lastCall();
    expect(url).toBe('http://localhost:8080/api/sync/profile');
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body as string)).toEqual({ name: '新名' });
  });

  it('登录后请求带 Authorization: Bearer <token>（复用 velvetApi 会话态）', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok({
      token: 'jwt-t', record: { id: 'u1', email: 'a@b.c' },
    })));
    await authWithPassword('a@b.c', 'password123');
    expect(api.isAuthenticated()).toBe(true);
    expect(api.getUserId()).toBe('u1');

    vi.mocked(fetch).mockResolvedValue(ok([]));
    await api.listRows();
    const [, init] = lastCall();
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer jwt-t');
  });

  it('未登录：isAuthenticated false、getUserId null', () => {
    expect(api.isAuthenticated()).toBe(false);
    expect(api.getUserId()).toBeNull();
  });
});
