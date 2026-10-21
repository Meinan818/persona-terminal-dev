import { describe, expect, it } from 'vitest';
import { exploreDirectorEvent } from '@/umbra/rules/exploreEvents';

describe('UMBRA explore events', () => {
  it('探索事件映射到 Director 事件并按倍速缩放', () => {
    expect(exploreDirectorEvent('explore:move', 2).durationMs).toBe(400);
    expect(exploreDirectorEvent('explore:spotted').track).toBe('main');
  });
});
