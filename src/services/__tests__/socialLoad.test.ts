/**
 * social.ts 加载管线回归测试（复现 2026-10-14 缺陷）：
 *
 * 自研后端登录态下（isAuthenticated()=true，但 PocketBase 的
 * authStore.isValid 恒 false），loadSocial 必须仍然跑起来，
 * 把好友列表塞进 store —— 而不是在第一行守卫就 return。
 *
 * 原缺陷：loadSocialOnce 首行 `if (!pb || !pb.authStore.isValid) return;`
 * 用 PocketBase 登录态当判据，自研模式下恒真 → 社交页一条数据都不加载。
 * 且 listNotifications（通知中心尚未迁移）会抛错，在 Promise.all 里
 * 把整条加载打挂 —— 即使守卫放开也拿不到好友列表。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => {
  const store = {
    setLoading: vi.fn(),
    setLastError: vi.fn(),
    setFriendships: vi.fn(),
    setNotifications: vi.fn(),
    setTodayPrayers: vi.fn(),
    setCoopBonds: vi.fn(),
    setCoopShadows: vi.fn(),
    markLoaded: vi.fn(),
    reset: vi.fn(),
    friendships: [],
    notifications: [],
    todayPrayers: [],
    coopBonds: [],
    coopShadows: [],
    lastLoadedAt: null as Date | null,
  };
  return {
    store,
    isAuthenticated: vi.fn(() => true), // 自研后端已登录
    listFriendships: vi.fn(),
  };
});

vi.mock('../velvetApi', () => ({
  getUserId: () => 'user-me',
  isAuthenticated: h.isAuthenticated,
}));

vi.mock('@/store/cloudSocial', () => ({
  useCloudSocialStore: { getState: () => h.store },
}));
vi.mock('@/store/cloud', () => ({
  useCloudStore: { getState: () => ({ syncStatus: 'idle' }) },
}));
vi.mock('@/store', () => ({
  useAppStore: {
    getState: () => ({
      loadConfidants: vi.fn(),
      confidants: [],
      saveBattleState: vi.fn(),
      battleState: null,
    }),
  },
}));

// 好友走 mock（返回一条 linked 记录），通知用真实实现以验证降级
vi.mock('../friends', () => ({
  listFriendships: h.listFriendships,
  expireOutdatedPending: vi.fn().mockResolvedValue(0),
}));

vi.mock('../prayers', () => ({ listTodayPrayers: vi.fn().mockResolvedValue([]) }));
vi.mock('../coopBonds', () => ({
  listCoopBonds: vi.fn().mockResolvedValue([]),
  expireOutdatedCoopPending: vi.fn().mockResolvedValue(0),
  viewFromMySide: vi.fn(),
  resolveCoopInitialIntimacy: vi.fn(),
  takePendingBondDescription: vi.fn(),
}));
vi.mock('../coopShadows', () => ({
  listCoopShadows: vi.fn().mockResolvedValue([]),
  maybeSpawnForBonds: vi.fn().mockResolvedValue(undefined),
  retreatExpiredShadow: vi.fn().mockResolvedValue(undefined),
  dedupeShadows: (x: unknown[]) => x,
  reconcileActiveShadow: vi.fn(),
}));
vi.mock('./onlineCardFace', () => ({
  getOnlineCardFace: vi.fn(),
  clearOnlineCardFace: vi.fn(),
}));
vi.mock('./pactSync', () => ({ syncPacts: vi.fn().mockResolvedValue(undefined) }));
vi.mock('./orgSync', () => ({ syncOrgs: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/utils/confidantAI', () => ({ interpretLockedArcana: vi.fn() }));

const FRIENDSHIP = { id: 'fid-1', status: 'linked' as const };

beforeEach(() => {
  vi.resetModules();
  h.listFriendships.mockReset().mockResolvedValue([FRIENDSHIP]);
  Object.values(h.store).forEach((v) => {
    if (typeof v === 'function' && 'mockReset' in v) (v as ReturnType<typeof vi.fn>).mockReset();
  });
  h.store.lastLoadedAt = null;
});

describe('loadSocial 在自研登录态下必须加载好友', () => {
  it('守卫放开：PocketBase 未登录但自研后端已登录 → 仍拉好友并写入 store', async () => {
    const { loadSocial } = await import('../social');
    await loadSocial({ force: true });

    expect(h.listFriendships, '应调用好友列表接口').toHaveBeenCalled();
    expect(h.store.setFriendships, '好友列表应写入 store').toHaveBeenCalledWith([FRIENDSHIP]);
  });
});
