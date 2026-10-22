// UMBRA 音频选曲（CONTRACT-v1.3 §7.4）。纯函数，不依赖 Web Audio 或 DOM。

export interface PlaylistTrack {
  file: string;
  title?: string;
  source?: string;
  loopStart?: number;
  loopEnd?: number;
  weight?: number;
}

export interface PlaylistEntry {
  id: string;
  scene: string;
  condition?: Record<string, string | boolean>;
  tracks: PlaylistTrack[];
  loop?: boolean;
  basis?: 'original' | 'borrowed' | 'unverified';
  priority?: 'P0' | 'P1' | 'P2' | 'P3' | 'P4';
  enabledByDefault?: boolean;
}

export interface Playlist {
  skin: string;
  version: number;
  defaults?: {
    crossfadeMs?: number;
    victoryCrossfadeMs?: number;
    noRepeat?: boolean;
  };
  entries: PlaylistEntry[];
}

export type BgmCondition = Record<string, string | boolean | undefined>;
/** entryId | trackFile -> 'lock' | 'off' */
export type AudioPrefs = Record<string, string>;

export interface BgmSelection {
  entry: PlaylistEntry;
  track: PlaylistTrack;
}

export function matchesCondition(entry: PlaylistEntry, condition: BgmCondition): boolean {
  if (!entry.condition) return true;
  return Object.entries(entry.condition).every(([key, value]) => condition[key] === value);
}

export function selectBgmTrack(
  playlist: Playlist,
  cueId: string | null,
  condition: BgmCondition,
  prefs: AudioPrefs = {},
  rng: () => number = Math.random,
  lastTrackFile?: string,
): BgmSelection | null {
  if (!cueId) return null;

  const candidates = playlist.entries
    .filter(entry => entry.scene === cueId && entry.enabledByDefault !== false)
    .filter(entry => prefs[entry.id] !== 'off')
    .filter(entry => matchesCondition(entry, condition))
    .map(entry => ({ entry, matched: Object.keys(entry.condition ?? {}).length }))
    .sort((a, b) => b.matched - a.matched);

  if (!candidates.length) return null;
  const bestMatch = candidates[0].matched;
  const topEntries = candidates
    .filter(item => item.matched === bestMatch)
    .map(item => item.entry);
  const lockedEntry = topEntries.find(entry => prefs[entry.id] === 'lock');
  const entries = lockedEntry ? [lockedEntry] : topEntries;

  const tracks = entries
    .flatMap(entry => entry.tracks.map(track => ({ entry, track })))
    .filter(({ track }) => prefs[track.file] !== 'off');
  const lockedTrack = tracks.find(({ track }) => prefs[track.file] === 'lock');
  const pool = lockedTrack ? [lockedTrack] : tracks;
  const noRepeat = playlist.defaults?.noRepeat !== false;
  const eligible = noRepeat && pool.length > 1
    ? pool.filter(({ track }) => track.file !== lastTrackFile)
    : pool;
  const source = eligible.length ? eligible : pool;
  if (!source.length) return null;

  const totalWeight = source.reduce((sum, item) => sum + Math.max(0, item.track.weight ?? 1), 0);
  let pick = source[source.length - 1];
  if (totalWeight > 0) {
    let cursor = rng() * totalWeight;
    for (const item of source) {
      cursor -= Math.max(0, item.track.weight ?? 1);
      if (cursor <= 0) {
        pick = item;
        break;
      }
    }
  }
  return pick;
}
