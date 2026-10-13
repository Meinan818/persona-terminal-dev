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
    // 公告板（第五波 第二步）
    board: vi.fn(),
    ledger: vi.fn(),
    createMoment: vi.fn(),
    setReaction: vi.fn(),
    deletePost: vi.fn(),
    report: vi.fn(),
    createMinutes: vi.fn(),
    createOpCard: vi.fn(),
    purgeUser: vi.fn(),
    // 作战（第五波 第三步）
    listOps: vi.fn(),
    createOp: vi.fn(),
    cancelOp: vi.fn(),
    createCheckin: vi.fn(),
    deleteCheckin: vi.fn(),
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
  listOrgBoard, createMoment, setReaction, deletePost, reportPost,
  createMinutes, listOrgLedger, deleteUserContent,
  listOrgOps, createOperation, cancelOperation, createCheckin, deleteCheckin,
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

describe('orgs.ts 公告板分流：自研登录态 → 走 orgsApi', () => {
  const POST = {
    id: 'post-1', orgId: 'org-1', userId: 'user-me', kind: 'moment' as const,
    text: '分享一条', snapshot: null, minutes: null, createdAt: new Date(),
  };
  const REACTION = {
    id: 'react-1', postId: 'post-1', orgId: 'org-1', userId: 'user-me',
    tag: 'strong' as const, createdAt: new Date(), updatedAt: new Date(),
  };

  it('listOrgBoard 走 orgsApi（posts + reactions）', async () => {
    h.api.board.mockResolvedValue({ posts: [POST], reactions: [REACTION] });
    const got = await listOrgBoard('org-1');
    expect(h.api.board).toHaveBeenCalledWith('org-1');
    expect(got.posts).toHaveLength(1);
    expect(got.reactions).toHaveLength(1);
  });

  it('createMoment 走 orgsApi', async () => {
    h.api.createMoment.mockResolvedValue(POST);
    const snap = { v: 1 as const, date: '2026-10-13', pts: {}, names: {}, by: { codename: '谁' } };
    const got = await createMoment('org-1', '分享一条', snap);
    expect(h.api.createMoment).toHaveBeenCalledWith('org-1', '分享一条', snap);
    expect(got.id).toBe('post-1');
  });

  it('createMoment 空文本提前抛（不触后端）', async () => {
    await expect(createMoment('org-1', '   ', { v: 1, date: 'x', pts: {}, names: {}, by: { codename: 'w' } }))
      .rejects.toThrow('写一句话再分享');
    expect(h.api.createMoment).not.toHaveBeenCalled();
  });

  it('setReaction 走 orgsApi；撤（null）透传', async () => {
    h.api.setReaction.mockResolvedValue(REACTION);
    const got = await setReaction('org-1', 'post-1', 'strong', undefined);
    expect(h.api.setReaction).toHaveBeenCalledWith('org-1', 'post-1', 'strong');
    expect(got?.tag).toBe('strong');

    h.api.setReaction.mockResolvedValue(null);
    expect(await setReaction('org-1', 'post-1', 'strong', REACTION as never)).toBeNull();
  });

  it('deletePost 走 orgsApi', async () => {
    h.api.deletePost.mockResolvedValue(undefined);
    await deletePost('post-1');
    expect(h.api.deletePost).toHaveBeenCalledWith('post-1');
  });

  it('reportPost 走 orgsApi（带原话副本）', async () => {
    h.api.report.mockResolvedValue(undefined);
    await reportPost(POST as never, 'harass');
    expect(h.api.report).toHaveBeenCalled();
    const arg = h.api.report.mock.calls[0][0];
    expect(arg.postId).toBe('post-1');
    expect(arg.reason).toBe('harass');
  });

  it('createMinutes 走 orgsApi（确定 id + 周键）', async () => {
    h.api.createMinutes.mockResolvedValue(POST);
    const minutes = { v: 1 as const, week: '2026-10-13', rate: { done: 0, total: 0 }, done: [], goals: [], titles: [], absent: [] };
    await createMinutes('org-1', minutes);
    expect(h.api.createMinutes).toHaveBeenCalled();
  });

  it('listOrgLedger 走 orgsApi', async () => {
    h.api.ledger.mockResolvedValue([POST]);
    const got = await listOrgLedger('org-1');
    expect(h.api.ledger).toHaveBeenCalledWith('org-1');
    expect(got).toHaveLength(1);
  });

  it('deleteUserContent 走 orgsApi（尽力而为，失败只记日志）', async () => {
    h.api.purgeUser.mockResolvedValue(undefined);
    await deleteUserContent('org-1', 'user-x');
    expect(h.api.purgeUser).toHaveBeenCalledWith('org-1', 'user-x');

    h.api.purgeUser.mockRejectedValue(new Error('网络错误'));
    await expect(deleteUserContent('org-1', 'user-x')).resolves.toBeUndefined();  // 不抛
  });
});

describe('orgs.ts 作战分流：自研登录态 → 走 orgsApi', () => {
  const OP = {
    id: 'op-1', orgId: 'org-1', initiatorId: 'user-me', kind: 'small' as const, attr: 'knowledge' as const,
    title: '读完一本书', deadline: '2026-10-30', participants: ['user-me'], assignments: {},
    status: 'active' as const, createdAt: new Date(), updatedAt: new Date(),
  };
  const CHECKIN = {
    id: 'ci-1', operationId: 'op-1', orgId: 'org-1', userId: 'user-me', kind: 'done' as const,
    day: '2026-10-13', text: '', createdAt: new Date(),
  };

  it('listOrgOps 走 orgsApi（ops + checkins）', async () => {
    h.api.listOps.mockResolvedValue({ ops: [OP], checkins: [CHECKIN] });
    const got = await listOrgOps('org-1');
    expect(h.api.listOps).toHaveBeenCalledWith('org-1');
    expect(got.ops).toHaveLength(1);
    expect(got.checkins).toHaveLength(1);
  });

  it('createOperation 走 orgsApi（屏蔽词检查在前）', async () => {
    h.api.createOp.mockResolvedValue(OP);
    const draft = { kind: 'small' as const, attr: 'knowledge' as const, title: '读完一本书', deadline: '2026-10-30', participants: ['user-me'], assignments: {} };
    const got = await createOperation('org-1', draft as never);
    expect(h.api.createOp).toHaveBeenCalledWith('org-1', draft);
    expect(got.id).toBe('op-1');
  });

  it('createOperation 标题含屏蔽词 → 提前抛（不触后端）', async () => {
    const draft = { kind: 'small' as const, attr: 'knowledge' as const, title: '傻逼东西', deadline: '2026-10-30', participants: ['user-me'], assignments: {} };
    await expect(createOperation('org-1', draft as never)).rejects.toThrow();
    expect(h.api.createOp).not.toHaveBeenCalled();
  });

  it('cancelOperation 走 orgsApi', async () => {
    h.api.cancelOp.mockResolvedValue({ ...OP, status: 'cancelled' });
    const got = await cancelOperation('op-1');
    expect(h.api.cancelOp).toHaveBeenCalledWith('op-1');
    expect(got.status).toBe('cancelled');
  });

  it('createCheckin 走 orgsApi；plan 空文本提前抛', async () => {
    h.api.createCheckin.mockResolvedValue(CHECKIN);
    const got = await createCheckin(OP as never, 'done', { day: '2026-10-13' });
    expect(h.api.createCheckin).toHaveBeenCalledWith('op-1', 'done', '2026-10-13', '');
    expect(got?.kind).toBe('done');

    await expect(createCheckin(OP as never, 'plan', { text: '   ' })).rejects.toThrow('写一句你负责的那一份');
  });

  it('createCheckin 已取消/不在名单 → null 透传', async () => {
    h.api.createCheckin.mockResolvedValue(null);
    expect(await createCheckin(OP as never, 'done', { day: '2026-10-13' })).toBeNull();
  });

  it('deleteCheckin 走 orgsApi', async () => {
    h.api.deleteCheckin.mockResolvedValue(undefined);
    await deleteCheckin('ci-1');
    expect(h.api.deleteCheckin).toHaveBeenCalledWith('ci-1');
  });
});
