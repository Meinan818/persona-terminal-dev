import { describe, expect, it } from 'vitest';
import { createExploreState } from '@/umbra/rules/explore';
import { handleExploreMove } from '@/umbra/rules/exploreRuntime';

describe('UMBRA explore runtime', () => {
  it('移动成功会返回 Director 事件', () => {
    const state = createExploreState(4, 4);
    const result = handleExploreMove(state, 'up', 2);
    expect(result.ok).toBe(true);
    expect(result.event?.name).toBe('explore:move');
    expect(result.event?.durationMs).toBe(400);
  });

  it('撞墙不产生事件', () => {
    const state = createExploreState(4, 4);
    const result = handleExploreMove(state, 'down');
    expect(result.ok).toBe(false);
    expect(result.event).toBeUndefined();
  });
});
