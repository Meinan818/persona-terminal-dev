/**
 * coopShadows.ts 分流回归测试（社交迁移 W3 第四波）：
 *
 * 自研后端登录态下（velvetApi.isAuthenticated()=true），羁绊之影的读写操作
 * 必须走 coopShadowsApi（/api/social/shadows*），而不是 PocketBase。
 *
 * 关键：① mock isAuthenticated 为 true（§二十四 坑2）；② 409 → 逐字文案。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => {
  const api = {
    listCoopShadows: vi.fn(),
    getCoopShadow: vi.fn(),
    listAttacksFor: vi.fn(),
    spawnCoopShadow: vi.fn(),
    identifyShadow: vi.fn(),
    attackCoopShadow: vi.fn(),
    allOutAttack: vi.fn(),
    retreatExpiredShadow: vi.fn(),
  };
  const pb = {
    authStore: { isValid: false, token: '', record: null },
    collection: vi.fn(() => {
      throw new Error('不应触碰 PocketBase：自研登录态下必须走 coopShadowsApi');
    }),
  };
  return { api, pb };
});

vi.mock('../velvetApi', () => ({
  isAuthenticated: () => true,
  getUserId: () => 'user-me',
  VelvetApiError: class extends Error {
    status: number; body: unknown;
    constructor(status: number, body: unknown) { super(`velvet ${status}`); this.status = status; this.body = body; }
  },
}));
vi.mock('../coopShadowsApi', () => h.api);
// moonPhase 用真实实现（isMoonPhaseNight 会被 spawn 路径用到，这里只测分流不打真实 spawn 判定）

import {
  listCoopShadows, listAttacksFor, identifyShadow, attackCoopShadow,
  retreatExpiredShadow, spawnCoopShadow,
} from '../coopShadows';

const SHADOW = {
  id: 'shadow-1',
  bondId: 'bond-1',
  userAId: 'user-me',
  userBId: 'user-b',
  shadowId: 'coop:despair',
  spawnedAt: new Date(),
  expiresAt: new Date(Date.now() + 86400000),
  hpMax: 200,
  hpCurrent: 200,
  status: 'active' as const,
  weaknessAttribute: 'knowledge' as const,
  comboCount: 0,
  allOutByA: false,
  allOutByB: false,
  identifiedByA: false,
  identifiedByB: false,
  sharedBuffs: {},
};

beforeEach(() => Object.values(h.api).forEach(f => f.mockReset()));

describe('coopShadows.ts 分流：自研登录态 → 走 coopShadowsApi', () => {
  it('listCoopShadows 走 coopShadowsApi，不碰 PocketBase', async () => {
    h.api.listCoopShadows.mockResolvedValue([SHADOW]);
    const got = await listCoopShadows();
    expect(h.api.listCoopShadows).toHaveBeenCalled();
    expect(got).toEqual([SHADOW]);
  });

  it('listCoopShadows 后端失败返回 []（不抛）', async () => {
    h.api.listCoopShadows.mockRejectedValue(new Error('网络错误'));
    expect(await listCoopShadows()).toEqual([]);
  });

  it('listAttacksFor 走 coopShadowsApi', async () => {
    h.api.listAttacksFor.mockResolvedValue([]);
    await listAttacksFor('shadow-1');
    expect(h.api.listAttacksFor).toHaveBeenCalledWith('shadow-1');
  });

  it('spawnCoopShadow 走 coopShadowsApi（传 slotId/hp/名字）', async () => {
    h.api.spawnCoopShadow.mockResolvedValue({ shadow: SHADOW, created: true });
    const bond = {
      id: 'bond-1', userAId: 'user-me', userBId: 'user-b', status: 'linked',
      createdAt: new Date(), otherProfile: { totalLv: 12 },
    };
    const r = await spawnCoopShadow(bond as never, 18);
    expect(h.api.spawnCoopShadow).toHaveBeenCalled();
    const arg = h.api.spawnCoopShadow.mock.calls[0][0];
    expect(arg.bondId).toBe('bond-1');
    expect(arg.hpMax).toBe(450);   // 18+12=30 → ≤30 → 450 档
    expect(arg.weaknessAttribute).toBeDefined();
    expect(r.created).toBe(true);
  });

  it('identifyShadow 走 coopShadowsApi', async () => {
    h.api.identifyShadow.mockResolvedValue({ ...SHADOW, identifiedByA: true });
    await identifyShadow(SHADOW as never);
    expect(h.api.identifyShadow).toHaveBeenCalledWith('shadow-1');
  });

  it('attackCoopShadow 走 coopShadowsApi（伤害前端算好传入）', async () => {
    h.api.attackCoopShadow.mockResolvedValue({
      attack: { id: 'a1', damageFinal: 130 },
      updatedShadow: SHADOW,
      weaknessBonus: true, resonanceBonus: false, isBuffCast: false, defeatedNow: false,
    });
    const r = await attackCoopShadow({
      shadow: SHADOW as never,
      personaId: 'p1', personaName: '人格',
      skillKind: 'damage', skillName: '斩击', skillAttribute: 'knowledge',
      damageRaw: 100,
    });
    expect(h.api.attackCoopShadow).toHaveBeenCalled();
    const arg = h.api.attackCoopShadow.mock.calls[0][1];
    expect(arg.damageFinal).toBe(130);   // 100 × 1.3（弱点）
    expect(arg.weaknessBonus).toBe(true);
    expect(r.defeatedNow).toBe(false);
  });

  it('attackCoopShadow 409 已出过手 → 翻译成逐字文案', async () => {
    const { VelvetApiError } = await import('../velvetApi');
    h.api.attackCoopShadow.mockRejectedValue(
      new VelvetApiError(409, { code: 'already_attacked_today', message: '...' }));
    await expect(attackCoopShadow({
      shadow: SHADOW as never,
      personaId: 'p1', personaName: '人格',
      skillKind: 'damage', skillName: '斩击', skillAttribute: 'knowledge',
      damageRaw: 100,
    })).rejects.toThrow('今天你已经对这只羁绊之影出过手了，明天再来');
  });

  it('retreatExpiredShadow 走 coopShadowsApi', async () => {
    h.api.retreatExpiredShadow.mockResolvedValue({ ...SHADOW, status: 'retreated' });
    await retreatExpiredShadow(SHADOW as never);
    expect(h.api.retreatExpiredShadow).toHaveBeenCalledWith('shadow-1');
  });
});
