import { describe, expect, it } from 'vitest';
import {
  advanceExploreRun,
  createExploreRun,
  encounterForCurrentNode,
  isExploreRunComplete,
} from '@/umbra/rules/exploreRun';

describe('UMBRA explore run', () => {
  it('推进所有节点后达到离场条件', () => {
    let run = createExploreRun(11, 5);
    while (!isExploreRunComplete(run) && run.index < run.plan.nodes.length) {
      run = advanceExploreRun(run);
    }
    expect(isExploreRunComplete(run)).toBe(true);
    expect(run.session.battles).toBeGreaterThanOrEqual(4);
  });

  it('当前战斗节点能生成遭遇', () => {
    let run = createExploreRun(11, 5);
    while (encounterForCurrentNode(run) === null) run = advanceExploreRun(run);
    expect(encounterForCurrentNode(run)?.length).toBeGreaterThanOrEqual(1);
  });
});
