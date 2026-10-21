import { describe, expect, it } from 'vitest';
import { buildExplorePlan, planBattleCount } from '@/umbra/rules/explorePlanner';

describe('UMBRA explore planner', () => {
  it('每局最少 4 场且含精英、守门阴影、BOSS', () => {
    const plan = buildExplorePlan(7, 5);
    const kinds = plan.nodes.map(node => node.kind);
    expect(planBattleCount(plan)).toBeGreaterThanOrEqual(4);
    expect(kinds).toContain('elite');
    expect(kinds).toContain('guardian');
    expect(kinds).toContain('boss');
  });

  it('同种子生成相同关卡', () => {
    expect(buildExplorePlan(7, 5)).toEqual(buildExplorePlan(7, 5));
  });
});
