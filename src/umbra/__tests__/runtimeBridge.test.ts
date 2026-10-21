import { describe, expect, it } from 'vitest';
import {
  createUmbraEnvSnapshot,
  envChanged,
  moonPhaseForDate,
} from '@/umbra/env';
import {
  actionKeyFor,
  checkpointIdFor,
  createUmbraCheckpoint,
  isCheckpointApplied,
  markCheckpointApplied,
  UMBRA_SAVE_SCHEMA_VERSION,
  type UmbraSaveV4,
} from '@/umbra/saveV4';
import { createBridgeSnapshot } from '@/umbra/runtimeBridge';

describe('UMBRA env snapshot', () => {
  it('按本地日期生成稳定快照', () => {
    const now = new Date('2026-10-22T20:00:00+08:00');
    const env = createUmbraEnvSnapshot({
      now,
      weather: 'rain',
      darkHour: true,
    });
    expect(env.date).toBe('2026-10-22');
    expect(env.weekday).toBe('thu');
    expect(env.weather).toBe('rain');
    expect(env.darkHour).toBe(true);
  });

  it('月相同一日期可复现且落在 0..7', () => {
    expect(moonPhaseForDate('2026-10-22')).toBe(moonPhaseForDate('2026-10-22'));
    expect(Number.isInteger(moonPhaseForDate('2026-10-22'))).toBe(true);
    expect(moonPhaseForDate('2026-10-22')).toBeGreaterThanOrEqual(0);
    expect(moonPhaseForDate('2026-10-22')).toBeLessThanOrEqual(7);
  });

  it('只返回实际变化的字段', () => {
    const now = new Date('2026-10-22T20:00:00+08:00');
    const prev = createUmbraEnvSnapshot({ now, weather: 'clear', darkHour: false });
    const next = createUmbraEnvSnapshot({ now, weather: 'rain', darkHour: true });
    expect(envChanged(prev, next)).toEqual(['weather', 'darkHour']);
  });
});

describe('UMBRA save V4 checkpoint', () => {
  const key = actionKeyFor('action', 3, 'hero', 'a');

  it('同一 action key 的 checkpoint id 可复现', () => {
    expect(checkpointIdFor(key, 2)).toBe(checkpointIdFor(key, 2));
  });

  it('未应用时不计为已结算', () => {
    const checkpoint = createUmbraCheckpoint({
      runId: 'run-a',
      actionKey: key,
      sequence: 2,
      payload: { dmg: 10 },
      now: new Date('2026-10-22T00:00:00.000Z'),
    });
    expect(checkpoint.schemaVersion).toBe(UMBRA_SAVE_SCHEMA_VERSION);
    expect(isCheckpointApplied([checkpoint], key, 2)).toBe(false);
    const applied = markCheckpointApplied(checkpoint);
    expect(isCheckpointApplied([applied], key, 2)).toBe(true);
  });
});

describe('UMBRA runtime bridge snapshot', () => {
  it('快照保留 schema、env、profile、run 和 checkpoint', () => {
    const now = new Date('2026-10-22T00:00:00.000Z');
    const env = createUmbraEnvSnapshot({ now });
    const checkpoint = createUmbraCheckpoint({
      runId: 'run-a',
      actionKey: 'action:1:hero:a',
      sequence: 1,
      payload: { dmg: 7 },
      now,
    });
    const save: UmbraSaveV4 = {
      schemaVersion: UMBRA_SAVE_SCHEMA_VERSION,
      profile: { id: 'current' },
      run: { id: 'run-a' },
      checkpoints: [checkpoint],
    };
    const snapshot = createBridgeSnapshot(env, save);
    expect(snapshot.schemaVersion).toBe(UMBRA_SAVE_SCHEMA_VERSION);
    expect(snapshot.env).toEqual(env);
    expect(snapshot.profile).toEqual({ id: 'current' });
    expect(snapshot.run).toEqual({ id: 'run-a' });
    expect(snapshot.checkpoints).toHaveLength(1);
  });
});
