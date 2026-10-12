import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * 头像推送 syncAvatarIfChanged 的回归测试（通过 pushUserProfile 触发）。
 *
 * 背景（与档案推送同源的坑）：上传头像的代码在自研模式下**完全不执行**——
 * 守卫写的是 `if (!pb) return;`，而自研模式下 pb 为空（登录走 velvetApi）。
 * 于是「换了头像，云端永远不更新」且不报错。
 *
 * 本测试钉住修复后的行为：
 *   1. 未登录 → 不发任何请求
 *   2. 已登录且本地有新头像 → 发 POST /api/avatar（multipart），带 Bearer
 *   3. 已登录且清空头像 → 发 DELETE /api/avatar
 *   4. 头像没变（指纹相同）→ 不重复上传
 */
import { authWithPassword, clearAuth } from '../velvetApi';
import * as sync from '../sync';
import { useAppStore } from '@/store';

const ok = (body: unknown = {}, status = 200) =>
  new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

/** 一张最小的 dataUrl（1x1 PNG），指纹比对只看字符串 */
const TINY_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

const callsTo = (f: ReturnType<typeof vi.fn>, suffix: string) =>
  f.mock.calls.filter(([url]) => String(url).endsWith(suffix));

const login = async (id = 'u-av') => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok({
    token: 'jwt-t', record: { id, email: 'me@example.com', name: 'me' },
  })));
  await authWithPassword('me@example.com', 'password123');
};

describe('头像推送 syncAvatarIfChanged', () => {
  beforeEach(() => {
    localStorage.clear();
    clearAuth();
    vi.restoreAllMocks();
    useAppStore.setState({ user: null });
    // 清掉上次上传指纹，避免用例间互相影响
    useAppStore.setState(s => ({ settings: { ...s.settings, lastUploadedAvatarSig: '' } }) as never);
  });

  it('未登录：不发任何请求', async () => {
    const f = vi.fn().mockResolvedValue(ok());
    vi.stubGlobal('fetch', f);
    useAppStore.setState({ user: { avatarDataUrl: TINY_PNG } as never });

    await sync.pushUserProfile();

    expect(f).not.toHaveBeenCalled();
  });

  it('已登录 + 本地有新头像：POST /api/avatar（带 Bearer）', async () => {
    await login('u-av-upload');
    const f = vi.fn().mockResolvedValue(ok({ avatar: '/api/avatar/u-av-upload' }));
    vi.stubGlobal('fetch', f);
    useAppStore.setState({ user: { name: 'x', avatarDataUrl: TINY_PNG } as never });

    await sync.pushUserProfile();

    const hits = callsTo(f, '/api/avatar');
    expect(hits.length, '应当向 /api/avatar 发上传请求').toBeGreaterThan(0);
    const [, init] = hits[0] as [string, RequestInit];
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer jwt-t');
    // 清空路径不应被触发
    expect(hits.some(([, i]) => (i as RequestInit).method === 'DELETE')).toBe(false);
  });

  it('已登录 + 清空头像：DELETE /api/avatar', async () => {
    await login('u-av-clear');
    // 先记住「上次上传过」（指纹非空），这次本地没有 dataUrl → 走清空
    useAppStore.setState(s => ({ settings: { ...s.settings, lastUploadedAvatarSig: 'abc_123' } }) as never);
    const f = vi.fn().mockResolvedValue(ok({}, 204));
    vi.stubGlobal('fetch', f);
    useAppStore.setState({ user: { name: 'x' } as never });

    await sync.pushUserProfile();

    const deletes = callsTo(f, '/api/avatar').filter(([, i]) => (i as RequestInit).method === 'DELETE');
    expect(deletes.length, '应当发 DELETE /api/avatar').toBeGreaterThan(0);
  });

  it('头像没变（指纹一致）：不重复上传', async () => {
    await login('u-av-same');
    // 与 sync.ts 内部 fingerprint() 相同的算法（djb2 变体 + 长度），测试自算避免污染其公开接口
    const sig = (() => {
      let h = 5381;
      for (let i = 0; i < TINY_PNG.length; i++) h = ((h << 5) + h + TINY_PNG.charCodeAt(i)) >>> 0;
      return h.toString(36) + '_' + TINY_PNG.length.toString(36);
    })();
    useAppStore.setState(s => ({ settings: { ...s.settings, lastUploadedAvatarSig: sig } }) as never);

    const f = vi.fn().mockResolvedValue(ok());
    vi.stubGlobal('fetch', f);
    useAppStore.setState({ user: { name: 'x', avatarDataUrl: TINY_PNG } as never });

    await sync.pushUserProfile();

    expect(callsTo(f, '/api/avatar').length, '指纹一致时不应上传').toBe(0);
  });
});
