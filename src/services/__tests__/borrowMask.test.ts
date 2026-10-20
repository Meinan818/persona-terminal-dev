import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createFreshUmbraProfile } from '@/umbra/state';
import type { OrgMember, OrgPersonaSnapshot, OrgView } from '@/types';

const h = vi.hoisted(() => ({
  state: {
    umbraProfile: null as ReturnType<typeof createFreshUmbraProfile> | null,
    saveUmbraProfile: vi.fn(),
  },
}));

vi.mock('@/store', () => ({
  useAppStore: {
    getState: () => h.state,
  },
}));

import { borrowMaskFromUi, markBorrowBattle } from '../borrowMask';

const now = new Date('2026-10-20T14:00:00.000Z');

const persona: OrgPersonaSnapshot = {
  name: '旅人之面',
  attribute: 'knowledge',
  level: 12,
  skills: [{
    name: '星尘',
    type: 'damage',
    power: 24,
    level: 2,
  }],
};

const member = {
  userId: 'friend-a',
  codename: '旅人',
  publicId: 'traveler',
  card: { streak: 1 },
} as unknown as OrgMember;

const view = {
  org: { id: 'org-a', name: '观测站', tz: 'Asia/Shanghai' },
  me: { userId: 'me-a' },
  members: [],
  ledger: [],
  raids: [],
  raidHits: [],
} as unknown as OrgView;

describe('UMBRA 同调存档', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.state.umbraProfile = createFreshUmbraProfile(now);
    h.state.saveUmbraProfile.mockImplementation(async profile => {
      h.state.umbraProfile = profile;
    });
  });

  it('借用写入正式 UMBRA 资料，并同步一份给 Demo', async () => {
    await borrowMaskFromUi(view, member, persona);
    const borrow = h.state.umbraProfile?.online?.borrow;
    expect(borrow?.mask?.persona.name).toBe('旅人之面');
    expect(borrow?.mask?.ownerId).toBe('friend-a');
    expect(borrow?.battles).toBe(0);
    expect(h.state.umbraProfile?.demo?.p5r?.borrowedMask).toEqual(borrow);
  });

  it('同一周第一次使用借来面具只增加一场', async () => {
    await borrowMaskFromUi(view, member, persona);
    const week = h.state.umbraProfile?.online?.borrow?.weekKey ?? '';
    await markBorrowBattle(now);
    expect(h.state.umbraProfile?.online?.borrow?.weekKey).toBe(week);
    expect(h.state.umbraProfile?.online?.borrow?.battles).toBe(1);
    expect(h.state.umbraProfile?.demo?.p5r?.borrowedMask).toEqual(h.state.umbraProfile?.online?.borrow);
  });

  it('没有 UMBRA 资料时不会退回旧战场存档', async () => {
    h.state.umbraProfile = null;
    await expect(borrowMaskFromUi(view, member, persona)).rejects.toThrow('先去UMBRA');
    expect(h.state.saveUmbraProfile).not.toHaveBeenCalled();
  });
});
