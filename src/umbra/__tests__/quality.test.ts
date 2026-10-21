import { describe, expect, it } from 'vitest';
import {
  applyQualityWindow,
  createQualityState,
  qualityWindowMedian,
} from '@/umbra/quality';

describe('UMBRA quality auto tier', () => {
  it('中位数只取有效窗口', () => {
    expect(qualityWindowMedian([
      { frameMs: 10 },
      { frameMs: 30 },
      { frameMs: 20, hidden: true },
    ])).toBe(20);
    expect(qualityWindowMedian([{ frameMs: 10, paused: true }])).toBeNull();
  });

  it('连续两个坏窗降档，连续五个好窗升档', () => {
    let state = createQualityState('high');
    state = applyQualityWindow(state, 21);
    state = applyQualityWindow(state, 22);
    expect(state.tier).toBe('mid');
    state = createQualityState('low');
    for (let i = 0; i < 5; i += 1) state = applyQualityWindow(state, 10);
    expect(state.tier).toBe('mid');
  });

  it('换档后有两个窗口冷却期', () => {
    let state = createQualityState('high');
    state = applyQualityWindow(state, 30);
    state = applyQualityWindow(state, 30);
    expect(state.tier).toBe('mid');
    const cooled = applyQualityWindow(state, 30);
    expect(cooled.tier).toBe('mid');
  });
});
