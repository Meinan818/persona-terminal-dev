import { describe, expect, it } from 'vitest';
import {
  Director,
  isAClassEvent,
  isSkippableEvent,
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

const ev = (
  name: string,
  durationMs: number,
  track: DirectorEvent['track'] = 'main',
  overlapPriority?: number,
): DirectorEvent => ({ id: name, name, durationMs, track, overlapPriority });

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

  it('重叠层优先级：unit:down 播放中来更低优先级的 ailment 会被丢弃', () => {
    const director = new Director();
    expect(director.startOverlap(ev('unit:down', 500, 'overlap', 3), 0)).toBe(true);
    expect(director.startOverlap(ev('ailment:apply', 400, 'overlap', 1), 0)).toBe(false);
    expect(director.overlapEvent?.name).toBe('unit:down');
  });

  it('重叠层优先级：ailment 播放中来更高优先级的 unit:down 会清场接管', () => {
    const director = new Director();
    expect(director.startOverlap(ev('ailment:apply', 400, 'overlap', 1), 0)).toBe(true);
    expect(director.startOverlap(ev('unit:down', 500, 'overlap', 3), 0)).toBe(true);
    expect(director.overlapEvent?.name).toBe('unit:down');
  });

  it('A 类事件不进主线、重叠层或输入缓冲', () => {
    expect(isAClassEvent('ui:cursor')).toBe(true);
    expect(isSkippableEvent('boss:intro')).toBe(true);
    const director = new Director();
    for (let index = 0; index < 50; index += 1) {
      expect(director.routeEvent(ev('ui:cursor', 0), 0)).toBe('a-class');
    }
    expect(director.mainEvent).toBeNull();
    expect(director.overlapEvent).toBeNull();
    expect(director.drainInput()).toEqual([]);
  });

  it('可跳过事件清场后主线与重叠层为空', () => {
    const director = new Director();
    director.startMain(ev('boss:intro', 2000), 0);
    director.startOverlap(ev('unit:down', 500, 'overlap', 3), 0);
    const result = director.skip(1200);
    expect(result).toEqual({ clearedMain: true, clearedOverlap: true });
    expect(director.mainEvent).toBeNull();
    expect(director.overlapEvent).toBeNull();
  });
});
