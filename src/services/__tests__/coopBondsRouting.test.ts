/**
 * coopBonds.ts 分流回归测试（社交迁移 W3 第二波）：
 *
 * 自研后端登录态下（velvetApi.isAuthenticated()=true），同伴羁绊的 6 个操作
 * 必须走 coopBondsApi（/api/social/coop/bonds*），而不是 PocketBase。
 * 与 friends / notifications / prayers 同款自动分流。
 *
 * 关键（§二十四 坑2）：必须 mock velvetApi.isAuthenticated 为 true，
 * 否则测的是「判据为假」的分支，绿了也不证明分流生效。
 */
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => {
  const api = {
    listCoopBonds: vi.fn(),
    proposeCoopBond: vi.fn(),
    acceptCoopBond: vi.fn(),
    rejectCoopBond: vi.fn(),
    severCoopBond: vi.fn(),
    setCoopDecayPreference: vi.fn(),
  };
  const pb = {
    authStore: { isValid: false, token: '', record: null },
    collection: vi.fn(() => {
      throw new Error('不应触碰 PocketBase：自研登录态下必须走 coopBondsApi');
    }),
  };
  return { api, pb };
});

// velvetApi.isAuthenticated 决定分流（自研登录态）；mock 成已登录
vi.mock('../velvetApi', () => ({
  isAuthenticated: () => true,
  getUserId: () => 'user-me',
}));

vi.mock('../coopBondsApi', () => h.api);

import {
  listCoopBonds,
  proposeCoopBond,
  acceptCoopBond,
  rejectCoopBond,
  severCoopBond,
  setCoopDecayPreference,
  expireOutdatedCoopPending,
} from '../coopBonds';

const BOND = {
  id: 'bond-1',
  userAId: 'user-me',
  userBId: 'user-b',
  initiatorId: 'user-me',
  status: 'pending' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  Object.values(h.api).forEach((f) => f.mockReset());
  h.pb.collection.mockClear();
});

afterEach(() => {
  localStorage.clear();
});

describe('coopBonds.ts 分流：自研登录态 → 走 coopBondsApi', () => {
  it('listCoopBonds 走 coopBondsApi，不碰 PocketBase', async () => {
    h.api.listCoopBonds.mockResolvedValue([BOND]);
    const got = await listCoopBonds();
    expect(h.api.listCoopBonds).toHaveBeenCalled();
    expect(got).toEqual([BOND]);
  });

  it('proposeCoopBond 走 coopBondsApi，不碰 PocketBase', async () => {
    h.api.proposeCoopBond.mockResolvedValue(BOND);
    const input = {
      targetUserId: 'user-b', arcanaId: 'the-fool', orientation: 'upright' as const,
      intimacyLevel: 5, skillAttribute: 'knowledge' as const, message: 'hi',
    };
    const got = await proposeCoopBond(input);
    expect(h.api.proposeCoopBond).toHaveBeenCalledWith(input);
    expect(got).toEqual(BOND);
  });

  it('acceptCoopBond 走 coopBondsApi（bondId 透传）', async () => {
    h.api.acceptCoopBond.mockResolvedValue({ ...BOND, status: 'linked' });
    const input = {
      bondId: 'bond-1', arcanaId: 'the-magician', orientation: 'reversed' as const,
      intimacyLevel: 7, skillAttribute: 'guts' as const,
    };
    const got = await acceptCoopBond(input);
    expect(h.api.acceptCoopBond).toHaveBeenCalledWith(input);
    expect(got.status).toBe('linked');
  });

  it('rejectCoopBond 走 coopBondsApi', async () => {
    h.api.rejectCoopBond.mockResolvedValue({ ...BOND, status: 'rejected' });
    await rejectCoopBond('bond-1');
    expect(h.api.rejectCoopBond).toHaveBeenCalledWith('bond-1');
  });

  it('severCoopBond 走 coopBondsApi', async () => {
    h.api.severCoopBond.mockResolvedValue({ ...BOND, status: 'severed' });
    await severCoopBond('bond-1');
    expect(h.api.severCoopBond).toHaveBeenCalledWith('bond-1');
  });

  it('setCoopDecayPreference 走 coopBondsApi', async () => {
    h.api.setCoopDecayPreference.mockResolvedValue({ ...BOND, decayA: true });
    await setCoopDecayPreference('bond-1', true);
    expect(h.api.setCoopDecayPreference).toHaveBeenCalledWith('bond-1', true);
  });

  it('expireOutdatedCoopPending 自研态只统计，不发请求', async () => {
    const expired = { ...BOND, id: 'old', expiresAt: new Date(Date.now() - 1000) };
    const alive = { ...BOND, id: 'new', expiresAt: new Date(Date.now() + 100000) };
    const n = await expireOutdatedCoopPending([expired, alive]);
    expect(n).toBe(1);
    expect(h.pb.collection).not.toHaveBeenCalled();
  });
});
