import { describe, expect, it } from 'vitest';
import {
  encounterForExploreNode,
  explorePlanWithEncounters,
} from '@/umbra/rules/exploreEncounter';

describe('UMBRA explore encounter', () => {
  it('规划至少 4 场战斗且战斗节点生成敌人', () => {
    const { plan, battleCount } = explorePlanWithEncounters(9, 5);
    expect(battleCount).toBeGreaterThanOrEqual(4);
    const index = plan.nodes.findIndex(node => node.kind === 'boss');
    const enemies = encounterForExploreNode(plan, index, () => 0.4);
    expect(enemies).not.toBeNull();
    expect(enemies!.length).toBeGreaterThanOrEqual(1);
    expect(enemies!.length).toBeLessThanOrEqual(3);
  });

  it('非战斗节点不生成遭遇', () => {
    const { plan } = explorePlanWithEncounters(9, 5);
    const index = plan.nodes.findIndex(node => node.kind === 'chest');
    expect(encounterForExploreNode(plan, index)).toBeNull();
  });
});
