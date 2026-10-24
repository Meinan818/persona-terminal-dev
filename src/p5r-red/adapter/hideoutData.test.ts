import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { create } from 'zustand';
import type { OrgView, OrgMember, OrgPost, OrgOperation } from '@/types';

// Keep real derivation, Zustand subscriptions and imperative host; isolate unrelated overlays/audio.
vi.mock('@/store/cloud', () => ({ useCloudStore: create(() => ({ cloudUser: null })) }));
vi.mock('../screens/pkg3/oc', () => ({ OC: {} }));
vi.mock('../screens/pkg3/od', () => ({ OD: {} }));
vi.mock('../lib/prefs', () => ({ isLowMotion: () => true }));
vi.mock('../screens/pkg3/p5', () => {
  let rerender: null | (() => void) = null;
  return {
    LAYER_SEL: '.test-overlay', setRerender: (fn: typeof rerender) => { rerender = fn; },
    P5: {
      ui: { btn: (s: string) => s, star: () => '', ransom: (s: string) => s },
      shape: { quad: () => 'none', starPts: () => '' }, ATTR: {},
      reduced: () => true, isWide: () => false, sil: () => '',
      rerender: () => rerender?.(), sfx: vi.fn(), toast: vi.fn(),
    },
  };
});

import { useCloudStore } from '@/store/cloud';
import { useCloudSocialStore } from '@/store/cloudSocial';
import { getRedHideoutData } from './hideoutData';
import { applyParams, orgPage, st, setLeader, MEM } from '../screens/pkg3/hideout';
import Hideout from '../screens/pages/Hideout.p5r';

const member = (userId: string, seat: number): OrgMember => ({
  id: `row-${userId}`, userId, orgId: 'org1', slot: 'own', seat, codename: `成员${userId}`,
  codenameKind: 'custom', tarotId: 'fool', card: { streak: 0 }, goal: `${userId}的目标`,
  createdAt: new Date(), updatedAt: new Date(),
});
const makeView = (): OrgView => {
  const leader = member('leader', 1), me = member('me', 2);
  return {
    org: { id: 'org1', name: '真实组织', motto: '真实口号', leaderId: 'leader',
      tz: 'Asia/Shanghai', inviteCode: 'TEST1234', emblem: 'star' } as OrgView['org'],
    members: [leader, me], me, posts: [], reactions: [], ops: [], checkins: [], ledger: [],
  };
};
const signIn = () => useCloudStore.setState({ cloudUser: { id: 'me' } as never });
const setView = (view: OrgView) => useCloudSocialStore.setState({ orgs: [view] });
let root: Root | undefined;

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  useCloudStore.setState({ cloudUser: null });
  useCloudSocialStore.setState({ orgs: [] });
  applyParams(new URLSearchParams());
  Object.assign(st, { sec: 'roster', roster: 'grid', wall: 0, raid: false, blocked: new Set(), reacted: {} });
});
afterEach(() => { if (root) act(() => root!.unmount()); root = undefined; document.body.innerHTML = ''; });

describe('red hideout real state', () => {
  it('does not expose a cached organization while signed out', () => {
    setView(makeView());
    expect(getRedHideoutData()).toMatchObject({ signedIn: false, org: null, members: [], posts: [], ops: [] });
    expect(orgPage.render(false)).not.toContain('真实组织');
    expect(st.demo).toBe('login');
  });

  it('renders signed-in no-organization and empty-member organizations without fake members', () => {
    signIn();
    expect(() => orgPage.render(false)).not.toThrow();
    expect(st.demo).toBe('empty');
    const view = makeView(); view.members = [];
    setView(view);
    for (const sec of ['roster', 'board', 'meeting', 'ops']) {
      st.sec = sec;
      const html = orgPage.render(false);
      expect(html).not.toMatch(/NaN|undefined|坂本龙司|夜读小队/);
    }
    expect(MEM).toEqual([]);
    expect(st.demo).toBe('normal');
  });

  it('uses user IDs and the actual current member rather than the first row or preview role', () => {
    signIn(); const view = makeView(); setView(view);
    const d = getRedHideoutData();
    expect(d.members.map(m => [m.id, m.me, m.leader])).toEqual([
      ['leader', false, true], ['me', true, false],
    ]);
    applyParams(new URLSearchParams('state=normal&tab=meeting'));
    const node = document.createElement('div'); node.innerHTML = orgPage.render(false);
    expect(node.querySelector('.og-mg.me')?.textContent).toContain('me的目标');
    expect(node.querySelector('.og-meta')?.textContent).toContain('MEMBER');
    setLeader(true);
    expect(MEM.find(m => m.me)?.leader).toBe(false);
    expect(getRedHideoutData().members.find(m => m.me)?.leader).toBe(false);
    view.org.leaderId = 'me'; setView({ ...view });
    applyParams(new URLSearchParams('state=member'));
    orgPage.render(false);
    expect(MEM.find(m => m.me)?.leader).toBe(true);
  });

  it('handles departed post authors, operation snapshots, reactions and missing operation participants', () => {
    signIn(); const view = makeView();
    view.posts = [
      { id: 'post1', userId: 'gone', kind: 'moment', text: '<img src=x onerror=alert(1)>',
        snapshot: { by: { codename: '已离队作者' }, pts: {} }, createdAt: new Date() },
      { id: 'card1', userId: 'gone', kind: 'operation', opCard: { title: '真实达成', day: '2026-10-23',
        participants: [{ userId: 'gone', codename: '离队参与者' }] }, createdAt: new Date() },
      { id: 'minutes', kind: 'minutes', createdAt: new Date() },
    ] as OrgPost[];
    view.reactions = [{ postId: 'post1', userId: 'me', tag: 'hug' }] as OrgView['reactions'];
    view.ops = [{ id: 'op1', initiatorId: 'gone', kind: 'big', title: '真实作战',
      deadline: '2099-01-01', participants: ['gone'], assignments: {}, status: 'active',
      createdAt: new Date(), updatedAt: new Date() }] as OrgOperation[];
    setView(view);
    const data = getRedHideoutData();
    expect(data.posts).toHaveLength(2);
    expect(data.posts[0]).toMatchObject({ byName: '已离队作者', mine: 'hug', tags: { hug: ['me'] } });
    expect(data.ops[0]).toMatchObject({ done: 0, counted: 0, rows: [['gone', '真实作战', 'goal', 'gone']] });
    st.sec = 'board';
    const html = orgPage.render(false);
    expect(html).toContain('已离队作者'); expect(html).toContain('离队参与者');
    expect(html).toContain('&lt;img'); expect(html).not.toContain('<img src=x');
    st.sec = 'ops';
    expect(orgPage.render(false)).not.toMatch(/NaN|undefined/);
    view.ops[0].assignments = { gone: '<img src=x onerror=alert(2)>' };
    const opHtml = orgPage.render(false);
    expect(opHtml).toContain('&lt;img'); expect(opHtml).not.toContain('<img src=x');
  });

  it('refreshes the mounted imperative page on auth and organization store updates', async () => {
    const container = document.createElement('div'); document.body.append(container);
    root = createRoot(container);
    await act(async () => root!.render(createElement(Hideout, { pageId: 'hideout', params: new URLSearchParams(), wide: false })));
    expect(st.demo).toBe('login');
    await act(async () => signIn());
    expect(st.demo).toBe('empty');
    await act(async () => setView(makeView()));
    expect(container.querySelector('.og-ttl-n')?.textContent).toContain('真实组织');
    await act(async () => useCloudStore.setState({ cloudUser: null }));
    expect(container.querySelector('.og-ttl-n')).toBeNull(); expect(MEM).toEqual([]);
  });
});
