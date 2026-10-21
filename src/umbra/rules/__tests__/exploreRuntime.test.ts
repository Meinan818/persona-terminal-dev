import { describe, expect, it } from 'vitest';
import { addExploreEnemy, createExploreState, setExploreCell } from '@/umbra/rules/explore';
import {
  handleExploreCover,
  handleExploreInteract,
  handleExploreMove,
  handleExploreSpot,
} from '@/umbra/rules/exploreRuntime';

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

  it('贴掩体与交互格会产生对应事件', () => {
    let state = createExploreState(3, 3);
    state = setExploreCell(state, 0, 2, { type: 'cover' });
    expect(handleExploreCover(state).event?.name).toBe('explore:cover');
    state = setExploreCell(state, 0, 2, { type: 'chest' });
    expect(handleExploreInteract(state).event?.name).toBe('explore:interact');
  });

  it('发现守卫会产生 spotted 事件', () => {
    let state = createExploreState(3, 3);
    state = addExploreEnemy(state, {
      id: 'guard',
      x: 0,
      y: 1,
      facing: 'down',
      covered: false,
      aware: false,
    });
    expect(handleExploreSpot(state, 'guard').event?.name).toBe('explore:spotted');
  });
});
