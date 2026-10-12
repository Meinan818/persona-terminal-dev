import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * pushUserProfile / pushProfilePresence 的回归测试。
 *
 * 背景（真实踩过的坑）：这两个函数曾在自研后端模式下**静默不干活**——上传前的判断写的是
 * `if (!pb || !pb.authStore.isValid) return;`，而登录走 velvetApi（只存 localStorage），
 * PocketBase 那份登录状态永远是"未登录"，于是函数每次都直接返回：
 * 「改了昵称、升了级，好友那边永远看不到」，而且不报错、不提示。
 *
 * 本测试钉住修复后的两条行为：
 *   1. 没登录 → 一个请求都不发（不能拿匿名身份乱写云端）
 *   2. 登录后 → 真的把档案发到 /api/sync/profile，且内容、凭证都对
 */
import { authWithPassword, clearAuth } from '../velvetApi';
import * as sync from '../sync';
import { useAppStore } from '@/store';

const ok = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

/**
 * 从一次 mock fetch 的调用记录里，挑出发往 /api/sync/profile 的请求体。
 * pushUserProfile 内部会连发两次（先档案主体、再名片状态），故取**第一次**。
 */
const profilePatchFrom = (f: ReturnType<typeof vi.fn>): Record<string, unknown> | null => {
  for (let i = 0; i < f.mock.calls.length; i++) {
    const [url, init] = f.mock.calls[i] as [string, RequestInit];
    if (String(url).endsWith('/api/sync/profile') && init?.method === 'PUT') {
      return JSON.parse(init.body as string);
    }
  }
  return null;
};

describe('档案推送 pushUserProfile / pushProfilePresence', () => {
  beforeEach(() => {
    localStorage.clear();
    clearAuth();
    vi.restoreAllMocks();
    useAppStore.setState({ user: null });
  });

  it('未登录：一个请求都不发', async () => {
    const f = vi.fn().mockResolvedValue(ok({}));
    vi.stubGlobal('fetch', f);

    await sync.pushUserProfile();
    await sync.pushProfilePresence();

    expect(f).not.toHaveBeenCalled();
  });

  it('已登录：档案发往 /api/sync/profile（PUT），含昵称、等级、难度档', async () => {
    // 先登录（这一步会消耗一次 fetch stub），再换成我们观察用的 mock
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok({
      token: 'jwt-t', record: { id: 'u-user-profile', email: 'me@example.com', name: 'me' },
    })));
    await authWithPassword('me@example.com', 'password123');
    useAppStore.setState({ user: { name: '夜行者' } as never });

    const f = vi.fn().mockResolvedValue(ok({ id: 'u-user-profile' }));
    vi.stubGlobal('fetch', f);

    await sync.pushUserProfile();

    const patch = profilePatchFrom(f);
    expect(patch, '应当向 /api/sync/profile 发出 PUT').not.toBeNull();
    expect(patch!.nickname).toBe('夜行者');
    expect(patch).toHaveProperty('total_lv');
    expect(patch).toHaveProperty('level_difficulty');

    // 请求带登录凭证（Bearer token），否则后端会当成未登录
    const hit = f.mock.calls.find(
      ([url]) => String(url).endsWith('/api/sync/profile'),
    ) as [string, RequestInit];
    expect((hit[1].headers as Record<string, string>).Authorization).toBe('Bearer jwt-t');
  });

  it('pushProfilePresence：把名片状态发出去', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok({
      token: 'jwt-t', record: { id: 'u-presence', email: 'p@example.com', name: 'p' },
    })));
    await authWithPassword('p@example.com', 'password123');

    // id 必须在预设里（constants/profileStatus），否则 liveStatus 会判为「已过期/无效」
    const status = { id: 'focus', at: new Date().toISOString() };
    useAppStore.setState(s => ({ settings: { ...s.settings, profileStatus: status } }) as never);

    const f = vi.fn().mockResolvedValue(ok({ id: 'u-presence' }));
    vi.stubGlobal('fetch', f);

    await sync.pushProfilePresence();

    const sent = profilePatchFrom(f);
    expect(sent).not.toBeNull();
    expect(sent!.status).toEqual(status);
  });
});
