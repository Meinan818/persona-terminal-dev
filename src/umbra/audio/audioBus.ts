// UMBRA 音频总线（CONTRACT-v1.3 §7）。缺文件静默，不在 present.json 里的文件不发请求。

import { selectBgmTrack, type BgmCondition, type AudioPrefs, type Playlist } from './bgm';

export interface SfxMap {
  skin: string;
  se: Record<string, { files: string[]; gainDb?: number; basis?: string }>;
  alias?: Record<string, string>;
}

export interface VoiceMap {
  skin: string;
  voice: Record<string, Record<string, string[]>>;
}

export type AudioBusKind = 'bgm' | 'se' | 'voice';

export interface AudioPlayback {
  play(file: string, bus: AudioBusKind, volume: number): void;
  stopBgm(): void;
}

export class AudioBus {
  private readonly present: Set<string>;
  private unlocked = false;
  private volumes: Record<AudioBusKind, number> = { bgm: 1, se: 1, voice: 1 };
  private currentBgmFile: string | null = null;

  constructor(
    private readonly sfx: SfxMap | null,
    private readonly voice: VoiceMap | null,
    private readonly playlist: Playlist | null,
    presentFiles: string[] = [],
    private readonly playback: AudioPlayback = { play() {}, stopBgm() {} },
  ) {
    this.present = new Set(presentFiles);
  }

  unlock(): void {
    this.unlocked = true;
  }

  setVolume(kind: AudioBusKind, value: number): void {
    this.volumes[kind] = Math.max(0, Math.min(1, value));
  }

  play(id: string): void {
    if (!this.unlocked) return;
    const seId = this.sfx?.alias?.[id] ?? id;
    const entry = this.sfx?.se[seId];
    const file = entry?.files[0];
    if (!file || !this.present.has(file)) return;
    this.playback.play(file, 'se', this.volumes.se);
  }

  voiceLine(unit: string, key: string): void {
    if (!this.unlocked) return;
    const files = this.voice?.voice[unit]?.[key] ?? [];
    const file = files[0];
    if (!file || !this.present.has(file)) return;
    this.playback.play(file, 'voice', this.volumes.voice);
  }

  bgm(cueId: string | null, condition: BgmCondition = {}, prefs: AudioPrefs = {}): void {
    if (!this.unlocked || !this.playlist) return;
    const selection = selectBgmTrack(this.playlist, cueId, condition, prefs, Math.random, this.currentBgmFile ?? undefined);
    const file = selection?.track.file;
    if (!file || !this.present.has(file)) return;
    if (file === this.currentBgmFile) return;
    this.currentBgmFile = file;
    this.playback.play(file, 'bgm', this.volumes.bgm);
  }

  stopBgm(): void {
    this.currentBgmFile = null;
    this.playback.stopBgm();
  }
}
