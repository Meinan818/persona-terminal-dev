import { describe, expect, it } from 'vitest';
import { createExploreRun } from '@/umbra/rules/exploreRun';
import {
  directorEventsForExploreNode,
  directorEventForExploreNode,
} from '@/umbra/rules/exploreRunDirector';

describe('UMBRA explore run director', () => {
  it('战斗节点映射为 map:encounter + battle:start 组合事件', () => {
    const run = createExploreRun(1, 5);
    const events = directorEventsForExploreNode(run);
    expect(events.map(event => event.name)).toEqual(['map:encounter', 'battle:start']);
    expect(events[0].track).toBe('main');
    expect(events[1].track).toBe('overlap');
    const total = events.reduce((sum, event) => sum + event.durationMs, 0);
    expect(total).toBeLessThanOrEqual(1200);
  });

  it('战斗组合在 minimal 档合计不超过精简预算', () => {
    const run = createExploreRun(1, 5);
    const events = directorEventsForExploreNode(run, 1, 'minimal');
    const total = events.reduce((sum, event) => sum + event.durationMs, 0);
    expect(total).toBeLessThanOrEqual(700);
  });

  it('非战斗节点映射为对应 explore 事件', () => {
    const run = createExploreRun(1, 5);
    const nonBattleIndex = run.plan.nodes.findIndex(node => (
      !['mob', 'elite', 'guardian', 'boss'].includes(node.kind)
    ));
    expect(nonBattleIndex).toBeGreaterThanOrEqual(0);
    const events = directorEventsForExploreNode({ ...run, index: nonBattleIndex });
    expect(events).toHaveLength(1);
    expect(events[0].name).toMatch(/^explore:/);
  });

  it('保留单事件入口并返回首条主线事件', () => {
    const run = createExploreRun(1, 5);
    expect(directorEventForExploreNode(run)?.name).toBe('map:encounter');
  });
});
