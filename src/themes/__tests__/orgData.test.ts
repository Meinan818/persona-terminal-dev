import { describe, expect, it } from 'vitest';
import type { OrgView } from '@/types';
import { activeOrgOps, buildOrgOpsState, endedOrgOps, orgRaidCardData, orgReactionData } from '@/themes/orgData';

const view = {
  org: { id: 'org-1', tz: 'Asia/Shanghai' },
  members: [{ id: 'm1', userId: 'me', codename: '我' }, { id: 'm2', userId: 'friend', codename: '友' }],
  me: { id: 'm1', userId: 'me' },
  ops: [
    { id: 'op-live', orgId: 'org-1', initiatorId: 'me', kind: 'big', attr: 'guts', title: '真实作战', deadline: '2026-10-30', participants: ['me', 'friend'], assignments: {}, status: 'active', createdAt: new Date(), updatedAt: new Date() },
    { id: 'op-done', orgId: 'org-1', initiatorId: 'me', kind: 'small', attr: 'knowledge', title: '已完成目标', deadline: '2026-10-20', participants: ['me', 'friend'], assignments: {}, status: 'active', createdAt: new Date(), updatedAt: new Date() },
    { id: 'op-cancel', orgId: 'org-1', initiatorId: 'me', kind: 'small', attr: 'kindness', title: '取消目标', deadline: '2026-10-25', participants: ['me'], assignments: {}, status: 'cancelled', createdAt: new Date(), updatedAt: new Date() },
  ],
  checkins: [
    { id: 'c1', operationId: 'op-live', orgId: 'org-1', userId: 'me', kind: 'plan', day: '', text: '我的分工', createdAt: new Date() },
    { id: 'c2', operationId: 'op-done', orgId: 'org-1', userId: 'me', kind: 'done', day: '2026-10-20', text: '', createdAt: new Date() },
    { id: 'c3', operationId: 'op-done', orgId: 'org-1', userId: 'friend', kind: 'done', day: '2026-10-20', text: '', createdAt: new Date() },
    { id: 'c4', operationId: 'op-cancel', orgId: 'org-1', userId: 'me', kind: 'out', day: '', text: '', createdAt: new Date() },
  ],
  reactions: [
    { id: 'r1', postId: 'post-1', orgId: 'org-1', userId: 'me', tag: 'strong', createdAt: new Date(), updatedAt: new Date() },
    { id: 'r2', postId: 'post-1', orgId: 'org-1', userId: 'friend', tag: 'strong', createdAt: new Date(), updatedAt: new Date() },
    { id: 'r3', postId: 'post-1', orgId: 'org-1', userId: 'friend', tag: 'hug', createdAt: new Date(), updatedAt: new Date() },
  ],
  raids: [{ id: 'raid-1', orgId: 'org-1', slot: 21, boss: { v: 1, name: '真实之月', weak: 'guts' }, hpMax: 100, createdAt: new Date('2026-10-20T12:00:00+08:00') }],
  raidHits: [
    { id: 'h1', raidId: 'raid-1', orgId: 'org-1', userId: 'me', kind: 'strike', night: '2026-10-20', skill: '斩', damage: 30, weak: true, createdAt: new Date() },
    { id: 'h2', raidId: 'raid-1', orgId: 'org-1', userId: 'friend', kind: 'strike', night: '2026-10-20', skill: '击', damage: 20, weak: false, createdAt: new Date() },
  ],
  posts: [{ id: 'minutes-1', kind: 'minutes', minutes: { week: '2026-10-19', rate: { done: 1, total: 2 }, titles: [], goals: [], done: [], absent: [] } }],
} as unknown as OrgView;

describe('orgData', () => {
  it('只把 active 作战放进进行中列表', () => {
    expect(activeOrgOps(view).map((operation) => operation.id)).toEqual(['op-live', 'op-done']);
  });

  it('从 checkins 还原分工、完成和退出状态', () => {
    const state = buildOrgOpsState(view);
    expect(state['op-live'].me).toEqual({ state: 'todo', plan: '我的分工' });
    expect(state['op-done'].friend.state).toBe('done');
    expect(state['op-cancel'].me.state).toBe('out');
  });

  it('结束历史按截止日与真实完成人数计算', () => {
    expect(endedOrgOps(view, '2026-10-23')).toEqual([
      expect.objectContaining({ id: 'op-done', status: 'achieved', done: 2, counted: 2 }),
      expect.objectContaining({ id: 'op-cancel', status: 'cancelled' }),
    ]);
  });

  it('公告板标签从 reactions 现算', () => {
    expect(orgReactionData(view)).toEqual({
      mine: { 'post-1': ['strong'] },
      counts: { 'post-1': { strong: 2, hug: 1 } },
    });
  });

  it('团战卡片按真实出手扣血并汇总出手人', () => {
    expect(orgRaidCardData(view)).toEqual(expect.objectContaining({
      hpMax: 100,
      left: 50,
      hitters: [
        { userId: 'me', nights: 1, allout: false },
        { userId: 'friend', nights: 1, allout: false },
      ],
    }));
  });
});
