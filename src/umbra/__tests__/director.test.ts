import { describe, expect, it } from 'vitest';
import {
  Director,
  clampEventDuration,
  encounterComboBudget,
  scaledDuration,
  type DirectorEvent,
} from '@/umbra/director';

const main = (durationMs: number, actionKey?: string): DirectorEvent => ({
  id: 'action',
  name: 'action',
  durationMs,
  track: 'main',
  actionKey,
});

describe('UMBRA Director', () => {
  it('倍速按比例缩短演出上限', () => {
    expect(scaledDuration(900, 2)).toBe(450);
    expect(scaledDuration(450, 3)).toBe(150);
  });

  it('事件时长不会超过该档上限', () => {
    expect(clampEventDuration(main(10000), 1, 'full')).toBe(3500);
    expect(clampEventDuration(main(10000), 1, 'minimal')).toBe(1225);
  });

  it('遇敌接开战按组合预算扣掉已用时长', () => {
    expect(encounterComboBudget(500, 1, 'full')).toBe(700);
    expect(encounterComboBudget(500, 1, 'minimal')).toBe(200);
  });

  it('主线到点清场，env:change 只在空闲时接上', () => {
    const director = new Director();
    expect(director.startMain(main(100), 0)).toBe(true);
    director.queueEnv({ id: 'env', name: 'env:change', durationMs: 60, track: 'main' });
    const tick = director.tick(120);
    expect(tick.clearedMain).toBe(true);
    expect(tick.startedEnv).toBe(true);
    expect(director.mainEvent?.id).toBe('env');
  });

  it('输入缓冲保留最新两条且同一 action key 只执行一次', () => {
    const director = new Director();
    director.pushInput('a', { target: 'a' });
    director.pushInput('b', { target: 'b' });
    director.pushInput('c', { target: 'c' });
    expect(director.pushInput('c', { target: 'c2' })?.actionKey).toBe('b');
    const ready = director.drainInput();
    expect(ready.map(item => item.actionKey)).toEqual(['c']);
    expect(director.drainInput()).toEqual([]);
    director.pushInput('c', { target: 'c3' });
    expect(director.pushInput('c', { target: 'c4' })).toBeNull();
  });
});
