import { describe, expect, it } from 'vitest';
import { createExploreRun } from '@/umbra/rules/exploreRun';
import { directorEventForExploreNode } from '@/umbra/rules/exploreRunDirector';

describe('UMBRA explore run director', () => {
  it('战斗节点映射为 encounter 主线事件', () => {
    const run = createExploreRun(1, 5);
    expect(directorEventForExploreNode(run)?.name).toBe('map:encounter');
  });
});
