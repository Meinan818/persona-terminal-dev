import { describe, expect, it } from 'vitest';
import { mergeTable } from '../syncMerge';

describe('云同步合并规则', () => {
  it('UMBRA 单行冲突保留用户选择的 SP，同时并集保留两侧在线奖励去重 ID', () => {
    const local = {
      id: 'current',
      economy: { sp: 10, totalSpEarned: 30, money: 1200 },
      social: {
        orgOpRewards: ['op-local'],
        orgRaidRewards: ['raid-shared'],
      },
    };
    const cloud = {
      id: 'current',
      economy: { sp: 5, totalSpEarned: 40, money: 900 },
      social: {
        orgOpRewards: ['op-cloud'],
        orgRaidRewards: ['raid-shared', 'raid-cloud'],
      },
    };

    const result = mergeTable('umbraProfiles', [local], [cloud], {
      conflictWins: 'local',
      dropOnlyCloud: new Set(),
    });

    expect(result.rows[0].economy).toEqual(local.economy);
    expect(result.rows[0].social).toEqual({
      orgOpRewards: ['op-local', 'op-cloud'],
      orgRaidRewards: ['raid-shared', 'raid-cloud'],
    });
  });
});
