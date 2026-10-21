import { describe, expect, it } from 'vitest';
import {
  canExitExplore,
  createExploreSession,
  recordExploreBattle,
} from '@/umbra/rules/exploreSession';

describe('UMBRA explore session', () => {
  it('至少 4 场且守门阴影已击败才能离场', () => {
    let session = createExploreSession();
    session = recordExploreBattle(session, 'guardian');
    expect(canExitExplore(session)).toBe(false);
    for (let i = 0; i < 3; i += 1) session = recordExploreBattle(session, 'mob');
    expect(canExitExplore(session)).toBe(true);
  });
});
