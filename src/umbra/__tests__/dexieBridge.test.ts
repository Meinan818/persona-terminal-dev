import { describe, expect, it, vi } from 'vitest';

vi.mock('@/store', () => ({
  useAppStore: {
    getState: () => ({
      settings: {
        battleShadowTimeDays: [5, 6, 0],
        battleShadowTimeStart: 20,
        battleShadowTimeEnd: 7,
      },
      umbraProfile: null,
      umbraRun: null,
      saveUmbraProfile: vi.fn(),
      saveUmbraRun: vi.fn(),
      setCurrentPage: vi.fn(),
    }),
  },
}));

import {
  checkpointForRun,
  hasAppliedCheckpoint,
} from '@/umbra/dexieBridge';
import { markCheckpointApplied } from '@/umbra/saveV4';

const run = {
  id: 'current',
  schemaVersion: 3,
  active: true,
  updatedAt: new Date('2026-10-22T00:00:00.000Z'),
  payload: {},
} as any;

describe('UMBRA Dexie bridge checkpoint', () => {
  it('从 run 生成幂等 checkpoint', () => {
    const checkpoint = checkpointForRun(run, {
      actionKey: 'action:2:hero:a',
      sequence: 3,
      payload: { dmg: 9 },
    });
    expect(checkpoint.id).toBe('action:2:hero:a#3');
    expect(checkpoint.applied).toBe(false);
  });

  it('applied checkpoint 能被 run payload 识别', () => {
    const checkpoint = checkpointForRun(run, {
      actionKey: 'action:2:hero:a',
      sequence: 3,
      payload: { dmg: 9 },
    });
    expect(hasAppliedCheckpoint(run, 'action:2:hero:a', 3)).toBe(false);
    const appliedRun = {
      ...run,
      payload: { checkpoints: [markCheckpointApplied(checkpoint)] },
    };
    expect(hasAppliedCheckpoint(appliedRun, 'action:2:hero:a', 3)).toBe(true);
  });
});
