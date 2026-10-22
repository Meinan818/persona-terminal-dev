import { describe, expect, it } from 'vitest';
import {
  matchesCondition,
  selectBgmTrack,
  type Playlist,
} from '../bgm';

const playlist: Playlist = {
  skin: 'p5r-red',
  version: 1,
  defaults: { crossfadeMs: 800, victoryCrossfadeMs: 300, noRepeat: true },
  entries: [
    {
      id: 'base.day', scene: 'hideout', tracks: [{ file: 'bgm/hideout-day.opus' }],
    },
    {
      id: 'base.rain', scene: 'hideout', condition: { weather: 'rain' },
      tracks: [{ file: 'bgm/hideout-rain.opus' }],
    },
    {
      id: 'base.rain.night', scene: 'hideout',
      condition: { weather: 'rain', darkHour: true },
      tracks: [{ file: 'bgm/hideout-rain-night.opus' }],
    },
    {
      id: 'battle.normal', scene: 'battle',
      tracks: [
        { file: 'bgm/battle-a.opus', weight: 2 },
        { file: 'bgm/battle-b.opus', weight: 1 },
      ],
    },
  ],
};

describe('UMBRA bgm:cue selection', () => {
  it('条件键最多者胜出', () => {
    const selection = selectBgmTrack(playlist, 'hideout', { weather: 'rain', darkHour: true });
    expect(selection?.track.file).toBe('bgm/hideout-rain-night.opus');
  });

  it('无匹配条件回退到基础条目', () => {
    const selection = selectBgmTrack(playlist, 'hideout', { weather: 'clear' });
    expect(selection?.track.file).toBe('bgm/hideout-day.opus');
  });

  it('权重随机且 noRepeat 不连续重复同一首', () => {
    const rng = (() => {
      const values = [0.1, 0.1];
      let index = 0;
      return () => values[Math.min(index++, values.length - 1)];
    })();
    const first = selectBgmTrack(playlist, 'battle', {}, {}, rng);
    const second = selectBgmTrack(playlist, 'battle', {}, {}, rng, first?.track.file);
    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(second?.track.file).not.toBe(first?.track.file);
  });

  it('prefs off 跳过条目', () => {
    const selection = selectBgmTrack(playlist, 'hideout', { weather: 'rain' }, {
      'base.rain': 'off',
    });
    expect(selection?.track.file).toBe('bgm/hideout-day.opus');
  });

  it('matchesCondition 按环境字段精确匹配', () => {
    expect(matchesCondition(playlist.entries[1], { weather: 'rain' })).toBe(true);
    expect(matchesCondition(playlist.entries[1], { weather: 'clear' })).toBe(false);
  });
});
