/**
 * coopPacts.ts 分流回归测试（社交迁移 W3 第三波）：
 *
 * 自研后端登录态下（velvetApi.isAuthenticated()=true），一起进步的 6 个操作
 * 必须走 coopPactsApi（/api/social/pacts*），而不是 PocketBase。
 *
 * 关键（§二十四 坑2）：必须 mock velvetApi.isAuthenticated 为 true，
 * 否则测的是「判据为假」的分支，绿了也不证明分流生效。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => {
  const api = {
    listMyPacts: vi.fn(),
    createPact: vi.fn(),
    respondPact: vi.fn(),
    setMyDone: vi.fn(),
    nudgePact: vi.fn(),
    endPact: vi.fn(),
    closePact: vi.fn(),
  };
  const pb = {
    authStore: { isValid: false, token: '', record: null },
    collection: vi.fn(() => {
      throw new Error('不应触碰 PocketBase：自研登录态下必须走 coopPactsApi');
    }),
  };
  return { api, pb };
});

vi.mock('../velvetApi', () => ({ isAuthenticated: () => true, getUserId: () => 'user-me' }));
vi.mock('../coopPactsApi', () => h.api);

import {
  listMyPacts, createPact, respondPact, setMyDone, nudgePact, endPact, closePact,
} from '../coopPacts';

const PACT = {
  id: 'pact-1',
  fromId: 'user-me',
  toId: 'user-b',
  kind: 'daily' as const,
  mode: 'same' as const,
  titleFrom: '一起读书',
  days: 7,
  status: 'active' as const,
  doneFrom: [],
  doneTo: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => Object.values(h.api).forEach(f => f.mockReset()));

describe('coopPacts.ts 分流：自研登录态 → 走 coopPactsApi', () => {
  it('listMyPacts 走 coopPactsApi，不碰 PocketBase', async () => {
    h.api.listMyPacts.mockResolvedValue([PACT]);
    const got = await listMyPacts();
    expect(h.api.listMyPacts).toHaveBeenCalled();
    expect(got).toEqual([PACT]);
  });

  it('listMyPacts 后端失败时返回 null（不是 []）', async () => {
    h.api.listMyPacts.mockRejectedValue(new Error('网络错误'));
    const got = await listMyPacts();
    expect(got).toBeNull();   // pactSync 依赖这个区分
  });

  it('createPact 走 coopPactsApi（校验通过后）', async () => {
    h.api.createPact.mockResolvedValue(PACT);
    const got = await createPact({
      toId: 'user-b', kind: 'daily', mode: 'same', title: '一起读书',
      days: 7, today: '2026-10-14',
    }, []);
    expect(h.api.createPact).toHaveBeenCalled();
    expect(got).toEqual(PACT);
  });

  it('respondPact 走 coopPactsApi', async () => {
    h.api.respondPact.mockResolvedValue(PACT);
    await respondPact('pact-1', true, { today: '2026-10-14' });
    expect(h.api.respondPact).toHaveBeenCalledWith('pact-1', true, { today: '2026-10-14' });
  });

  it('setMyDone 走 coopPactsApi', async () => {
    h.api.setMyDone.mockResolvedValue(PACT);
    await setMyDone('pact-1', '2026-10-14', true);
    expect(h.api.setMyDone).toHaveBeenCalledWith('pact-1', '2026-10-14', true);
  });

  it('nudgePact 走 coopPactsApi', async () => {
    h.api.nudgePact.mockResolvedValue(PACT);
    await nudgePact('pact-1', '2026-10-14');
    expect(h.api.nudgePact).toHaveBeenCalledWith('pact-1', '2026-10-14');
  });

  it('endPact 走 coopPactsApi', async () => {
    h.api.endPact.mockResolvedValue({ ...PACT, status: 'cancelled' });
    await endPact('pact-1');
    expect(h.api.endPact).toHaveBeenCalledWith('pact-1');
  });

  it('closePact 走 coopPactsApi', async () => {
    h.api.closePact.mockResolvedValue({ ...PACT, status: 'finished' });
    await closePact('pact-1', 'finished');
    expect(h.api.closePact).toHaveBeenCalledWith('pact-1', 'finished');
  });
});
