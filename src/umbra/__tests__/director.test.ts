import { describe, expect, it } from 'vitest';
import {
  Director,
  capOf,
  clampEventDuration,
  encounterComboBudget,
  scaledDuration,
  wallMs,
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

  it('时长上限按事件与倍速取整', () => {
    expect(capOf('action', { side: 'enemy' }, false, 1)).toBe(1500);
    expect(capOf('onemore', {}, false, 2)).toBe(225);
  });

  it('探索移动上限按格数计算并封顶 2000ms', () => {
    expect(capOf('explore:move', { path: [[0, 0], [1, 0], [2, 0]] }, false, 1)).toBe(500);
    expect(capOf('explore:move', { path: Array(20).fill([0, 0]) }, false, 1)).toBe(2000);
  });

  it('wallMs 把 hitStop 停帧计入总墙钟时长', () => {
    expect(wallMs({
      duration: 1000,
      tracks: [
        { prim: 'hitStop', dur: 90 },
        { prim: 'tween', dur: 400 },
      ],
    })).toBe(1090);
  });
});
