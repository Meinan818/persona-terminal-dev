import { describe, expect, it } from 'vitest';
import { AudioBus, type AudioPlayback } from '../audioBus';
import type { Playlist } from '../bgm';

const playlist: Playlist = {
  skin: 'p5r-red',
  version: 1,
  entries: [{ id: 'battle.normal', scene: 'battle', tracks: [{ file: 'bgm/battle.opus' }] }],
};

const recording = (): AudioPlayback & { calls: { file: string; bus: string; volume: number }[] } => {
  const calls: { file: string; bus: string; volume: number }[] = [];
  return {
    calls,
    play(file, bus, volume) { calls.push({ file, bus, volume }); },
    stopBgm() {},
  };
};

describe('UMBRA AudioBus', () => {
  it('present 外文件静默，不触发播放', () => {
    const playback = recording();
    const bus = new AudioBus(
      { skin: 'p5r-red', se: { 'fire': { files: ['se/fire.opus'] } } },
      null,
      null,
      [],
      playback,
    );
    bus.unlock();
    bus.play('fire');
    expect(playback.calls).toEqual([]);
  });

  it('present 内文件按总线与音量播放', () => {
    const playback = recording();
    const bus = new AudioBus(
      { skin: 'p5r-red', se: { 'fire': { files: ['se/fire.opus'] } }, alias: { hit: 'fire' } },
      null,
      null,
      ['se/fire.opus'],
      playback,
    );
    bus.unlock();
    bus.setVolume('se', 0.5);
    bus.play('hit');
    expect(playback.calls).toEqual([{ file: 'se/fire.opus', bus: 'se', volume: 0.5 }]);
  });

  it('未解锁不播放', () => {
    const playback = recording();
    const bus = new AudioBus(
      { skin: 'p5r-red', se: { 'fire': { files: ['se/fire.opus'] } } },
      null,
      null,
      ['se/fire.opus'],
      playback,
    );
    bus.play('fire');
    expect(playback.calls).toEqual([]);
  });

  it('bgm 选曲后播放 present 内文件且不重复重启同一首', () => {
    const playback = recording();
    const bus = new AudioBus(null, null, playlist, ['bgm/battle.opus'], playback);
    bus.unlock();
    bus.bgm('battle');
    bus.bgm('battle');
    expect(playback.calls).toEqual([{ file: 'bgm/battle.opus', bus: 'bgm', volume: 1 }]);
  });
});
