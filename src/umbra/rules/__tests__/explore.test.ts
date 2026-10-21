import { describe, expect, it } from 'vitest';
import {
  addExploreEnemy,
  canBackstab,
  coverExplore,
  createExploreState,
  interactExplore,
  moveExplore,
  setExploreCell,
  spotExplore,
} from '@/umbra/rules/explore';

describe('UMBRA explore rules', () => {
  it('玩家按格子移动且不能穿墙', () => {
    let state = createExploreState(4, 4, [[1, 3]]);
    const blocked = moveExplore(state, 'right');
    expect(blocked.ok).toBe(false);
    const moved = moveExplore(state, 'up');
    expect(moved.ok).toBe(true);
    expect(moved.state.player).toMatchObject({ x: 0, y: 2 });
    expect(moved.events).toContain('explore:move');
  });

  it('贴掩体后记录 explore:cover', () => {
    let state = createExploreState(3, 3);
    state = setExploreCell(state, 0, 2, { type: 'cover' });
    const result = coverExplore(state);
    expect(result.ok).toBe(true);
    expect(result.state.player.covered).toBe(true);
    expect(result.events).toContain('explore:cover');
  });

  it('面向敌人时才会被发现，背后可偷袭', () => {
    let state = createExploreState(3, 3);
    state = addExploreEnemy(state, {
      id: 'enemy-a',
      x: 0,
      y: 1,
      facing: 'down',
      covered: false,
      aware: false,
    });
    const spotted = spotExplore(state, 'enemy-a');
    expect(spotted.spottedIds).toContain('enemy-a');
    expect(canBackstab(state, 'enemy-a')).toBe(true);
  });

  it('只在交互格返回可交互类型', () => {
    let state = createExploreState(2, 2);
    state = setExploreCell(state, 0, 1, { type: 'chest' });
    const result = interactExplore(state);
    expect(result.ok).toBe(true);
    expect(result.type).toBe('chest');
  });
});
