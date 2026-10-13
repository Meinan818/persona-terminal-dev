/**
 * orgs.ts 分流回归测试（社交迁移 W3 第五波 第一步）：
 *
 * 自研后端登录态下（velvetApi.isAuthenticated()=true），组织核心的读写操作
 * 必须走 orgsApi（/api/social/orgs*），而不是 PocketBase。
 *
 * 关键：① mock isAuthenticated 为 true；② pb.collection 强制抛错作为硬断言。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => {
  const api = {
    listMine: vi.fn(),
    members: vi.fn(),
    fetch: vi.fn(),
    preview: vi.fn(),
    create: vi.fn(),
    join: vi.fn(),
    updateProfile: vi.fn(),
    updateCustom: vi.fn(),
    rotate: vi.fn(),
    updateMember: vi.fn(),
    setSlot: vi.fn(),
    leave: vi.fn(),
    kick: vi.fn(),
    transfer: vi.fn(),
    dissolve: vi.fn(),
  };
  const pb = {
    authStore: { isValid: false, token: '', record: null },
    collection: vi.fn(() => {
      throw new Error('不应触碰 PocketBase：自研登录态下必须走 orgsApi');
    }),
  };
  return { api, pb };
});

vi.mock('../pocketbase', () => ({ pb: h.pb, getUserId: () => 'user-me' }));
vi.mock('../velvetApi', () => ({
  isAuthenticated: () => true,
  getUserId: () => 'user-me',
  VelvetApiError: class extends Error {
    status: number; body: unknown;
    constructor(status: number, body: unknown) { super(`velvet ${status}`); this.status = status; this.body = body; }
  },
}));
vi.mock('../orgsApi', () => h.api);

import {
  listMyMemberships, listOrgMembers, fetchOrg, previewOrg,
  createOrg, joinOrg, updateOrgProfile, updateOrgCustom, rotateInviteCode,
  updateMyMember, setMySlot, leaveOrg, kickMember, transferLeader, dissolveOrg,
} from '../orgs';

const ORG = {
  id: 'org-1', name: '测试据点', motto: '稳', emblem: 'star',
  leaderId: 'user-me', inviteCode: 'ABCD2345', tz: 'Asia/Shanghai',
  createdAt: new Date(), updatedAt: new Date(),
};
const MEMBER = {
  id: 'mem-1', orgId: 'org-1', userId: 'user-me', slot: 'own' as const, seat: 1,
  codename: '队长', codenameKind: 'nickname' as const,
  card: { streak: 0, persona: null, at: new Date().toISOString() },
  createdAt: new Date(), updatedAt: new Date(),
};
const VIEW = { org: ORG, members: [MEMBER], me: MEMBER };

beforeEach(() => Object.values(h.api).forEach(f => f.mockReset()));

describe('orgs.ts 分流：自研登录态 → 走 orgsApi', () => {
  it('listMyMemberships 走 orgsApi，不碰 PocketBase', async () => {
    h.api.listMine.mockResolvedValue([{ org: ORG, member: MEMBER }]);
    const got = await listMyMemberships();
    expect(h.api.listMine).toHaveBeenCalled();
    expect(got).toHaveLength(1);
    expect(got![0].org.id).toBe('org-1');
    expect(got![0].member.seat).toBe(1);
  });

  it('listMyMemberships 后端失败返回 null（不抛）', async () => {
    h.api.listMine.mockRejectedValue(new Error('网络错误'));
    expect(await listMyMemberships()).toBeNull();
  });

  it('listOrgMembers 走 orgsApi', async () => {
    h.api.members.mockResolvedValue([MEMBER]);
    const got = await listOrgMembers('org-1');
    expect(h.api.members).toHaveBeenCalledWith('org-1');
    expect(got[0].id).toBe('mem-1');
  });

  it('fetchOrg 走 orgsApi', async () => {
    h.api.fetch.mockResolvedValue(ORG);
    const got = await fetchOrg('org-1');
    expect(h.api.fetch).toHaveBeenCalledWith('org-1');
    expect(got.name).toBe('测试据点');
  });

  it('previewOrg 规范化邀请码后走 orgsApi', async () => {
    h.api.preview.mockResolvedValue(ORG);
    const got = await previewOrg('abcd 2345');   // 带空格 + 小写 → 规范化
    expect(h.api.preview).toHaveBeenCalledWith('ABCD2345');
    expect(got?.id).toBe('org-1');
  });

  it('previewOrg 码不合法时提前抛（不触后端）', async () => {
    await expect(previewOrg('123')).rejects.toThrow('邀请码是 8 位字母和数字');
    expect(h.api.preview).not.toHaveBeenCalled();
  });

  it('createOrg 走 orgsApi（透传 name/motto/emblem/tz/codename）', async () => {
    h.api.create.mockResolvedValue({ org: ORG, member: MEMBER });
    const got = await createOrg({ name: '测试据点', motto: '稳', emblem: 'star' }, '队长', []);
    expect(h.api.create).toHaveBeenCalled();
    const arg = h.api.create.mock.calls[0][0];
    expect(arg.name).toBe('测试据点');
    expect(arg.tz).toBeTruthy();
    expect(arg.codename).toBe('队长');
    expect(got.member.slot).toBe('own');
  });

  it('createOrg 已有 own 名额时提前抛（不触后端）', async () => {
    await expect(createOrg({ name: 'x', motto: '', emblem: 'star' }, 'n', [VIEW as never]))
      .rejects.toThrow('你已经建过一个组织了（每人最多建一个）');
    expect(h.api.create).not.toHaveBeenCalled();
  });

  it('joinOrg 走 orgsApi（规范化码）', async () => {
    h.api.join.mockResolvedValue({ org: ORG, member: { ...MEMBER, slot: 'joined', seat: 2 } });
    const got = await joinOrg('ABCD2345', '新成员', []);
    expect(h.api.join).toHaveBeenCalledWith('ABCD2345', '新成员');
    expect(got.member.slot).toBe('joined');
  });

  it('joinOrg 已有 joined 名额时提前抛', async () => {
    const joinedView = { org: ORG, members: [MEMBER], me: { ...MEMBER, slot: 'joined' as const } };
    await expect(joinOrg('ABCD2345', 'n', [joinedView as never]))
      .rejects.toThrow('你已经加入了一个组织（每人最多加入一个）');
    expect(h.api.join).not.toHaveBeenCalled();
  });

  it('updateOrgProfile / updateOrgCustom / rotateInviteCode 走 orgsApi', async () => {
    h.api.updateProfile.mockResolvedValue(ORG);
    h.api.updateCustom.mockResolvedValue(ORG);
    h.api.rotate.mockResolvedValue({ ...ORG, inviteCode: 'NEWCODE2' });

    await updateOrgProfile('org-1', { name: '改名', motto: '稳', emblem: 'star' });
    expect(h.api.updateProfile).toHaveBeenCalledWith('org-1', expect.objectContaining({ name: '改名' }));

    await updateOrgCustom('org-1', { levelNames: ['壹'] });
    expect(h.api.updateCustom).toHaveBeenCalled();

    const rotated = await rotateInviteCode('org-1');
    expect(h.api.rotate).toHaveBeenCalledWith('org-1');
    expect(rotated.inviteCode).toBe('NEWCODE2');
  });

  it('updateMyMember 走 orgsApi（按 memberId 定位，字段 camelCase）', async () => {
    h.api.updateMember.mockResolvedValue({ ...MEMBER, codename: '新代号' });
    const got = await updateMyMember('mem-1', { codename: '新代号', goal: '下周读完', goalWeek: '2026-10-19' });
    expect(h.api.updateMember).toHaveBeenCalledWith('mem-1', expect.objectContaining({ codename: '新代号', goal: '下周读完' }));
    expect(got.codename).toBe('新代号');
  });

  it('setMySlot 走 orgsApi', async () => {
    h.api.setSlot.mockResolvedValue({ ...MEMBER, slot: 'joined' });
    const got = await setMySlot('mem-1', 'joined');
    expect(h.api.setSlot).toHaveBeenCalledWith('mem-1', 'joined');
    expect(got.slot).toBe('joined');
  });

  it('leaveOrg 走 orgsApi；队长（own）提前抛', async () => {
    h.api.leave.mockResolvedValue(undefined);
    const joinedView = { org: ORG, members: [], me: { ...MEMBER, slot: 'joined' as const } };
    await leaveOrg(joinedView as never);
    expect(h.api.leave).toHaveBeenCalledWith('org-1');

    await expect(leaveOrg(VIEW as never)).rejects.toThrow('队长要先把队长转让出去，或者解散组织');
  });

  it('kickMember / transferLeader / dissolveOrg 走 orgsApi（队长校验）', async () => {
    h.api.kick.mockResolvedValue({ rotated: ORG });
    h.api.transfer.mockResolvedValue(undefined);
    h.api.dissolve.mockResolvedValue(undefined);

    const kicked = await kickMember(VIEW as never, 'mem-2');
    expect(h.api.kick).toHaveBeenCalledWith('org-1', 'mem-2');
    expect(kicked.rotated?.id).toBe('org-1');

    await transferLeader(VIEW as never, 'mem-2', false);
    expect(h.api.transfer).toHaveBeenCalledWith('org-1', 'mem-2', false);

    await dissolveOrg(VIEW as never);
    expect(h.api.dissolve).toHaveBeenCalledWith('org-1');

    // 非队长（joined）调这些 → 提前抛
    const joinedView = { org: ORG, members: [MEMBER], me: { ...MEMBER, slot: 'joined' as const } };
    await expect(kickMember(joinedView as never, 'mem-2')).rejects.toThrow('只有队长能请离成员');
    await expect(dissolveOrg(joinedView as never)).rejects.toThrow('只有队长能解散组织');
  });

  it('orgsApi 抛出的错误不被 orgs.ts 吞掉（原样透传）', async () => {
    // orgsApi 内部已把 VelvetApiError 翻成人话文案；orgs.ts 分流层只负责透传
    h.api.join.mockRejectedValue(new Error('这个组织已经满 7 人了'));
    await expect(joinOrg('ABCD2345', 'n', [])).rejects.toThrow('这个组织已经满 7 人了');
  });
});
