// 音频占位接口（M3 第四阶段）：按 AUDIO-MAP-v1 §6 目录 skins/<id>/audio/{bgm,se,voice}/ 读 playlist.json / sfx.json / voice.json。
// 只请求 present.json 里登记为「已放入」的文件（tools/build_manifest.py 扫目录生成）→ 缺文件完全静默，不发 404。
// 首包不含音频（D-008）；AudioContext 在第一次用户输入时解锁；切后台暂停。
export interface SeEntry { files: string[]; gainDb?: number; basis?: string }
export interface Track { file: string; title?: string; source?: string; loopStart?: number; loopEnd?: number; weight?: number }
export interface PlEntry { id: string; scene: string; condition?: Record<string, unknown>; tracks: Track[]; loop?: boolean; enabledByDefault?: boolean }
interface Playlist { defaults?: { crossfadeMs?: number; victoryCrossfadeMs?: number }; entries: PlEntry[] }

export class AudioBus {
  ctx: AudioContext | null = null;
  base = '';
  se: Record<string, SeEntry> = {};
  alias: Record<string, string> = {};
  voice: Record<string, Record<string, string[]>> = {};
  pl: Playlist = { entries: [] };
  present = new Set<string>();
  buffers = new Map<string, Promise<AudioBuffer | null>>();
  /** 每次请求：`se:<id>` / `bgm:<scene>` / `voice:<unit>.<key>`，后缀 `(silent)` = 缺文件静默 */
  log: string[] = [];
  ready = false;
  private bus = { bgm: null as GainNode | null, se: null as GainNode | null, voice: null as GainNode | null };
  private cur: { src: AudioBufferSourceNode; g: GainNode; scene: string } | null = null;
  private lastTrack = '';

  async init(base: string) {
    this.base = base + 'audio/';
    const j = async (n: string) => { try { const r = await fetch(this.base + n, { cache: 'no-cache' }); return r.ok ? await r.json() : null; } catch { return null; } };
    const [sfx, pl, vo, pr] = await Promise.all([j('sfx.json'), j('playlist.json'), j('voice.json'), j('present.json')]);
    if (sfx) { this.se = sfx.se ?? {}; this.alias = sfx.alias ?? {}; }
    if (pl) this.pl = pl;
    if (vo) this.voice = vo.voice ?? {};
    (pr?.files ?? []).forEach((f: string) => this.present.add(f));
    this.ready = true;
    const unlock = () => { this.unlock(); window.removeEventListener('pointerdown', unlock, true); window.removeEventListener('keydown', unlock, true); };
    window.addEventListener('pointerdown', unlock, true); window.addEventListener('keydown', unlock, true);
    document.addEventListener('visibilitychange', () => { if (!this.ctx) return; if (document.hidden) this.ctx.suspend(); else this.ctx.resume(); });
  }
  unlock() {
    if (this.ctx || !this.present.size) return;     // 一个音频文件都没有：不建 AudioContext
    try {
      const C = (window as any).AudioContext ?? (window as any).webkitAudioContext; this.ctx = new C();
      for (const k of ['bgm', 'se', 'voice'] as const) { const g = this.ctx!.createGain(); g.connect(this.ctx!.destination); this.bus[k] = g; }
      this.bus.bgm!.gain.value = 0.7;
    } catch { this.ctx = null; }
  }
  private load(file: string): Promise<AudioBuffer | null> | null {
    if (!this.present.has(file) || !this.ctx) return null;
    let p = this.buffers.get(file);
    if (!p) { p = fetch(this.base + file).then((r) => r.arrayBuffer()).then((b) => this.ctx!.decodeAudioData(b)).catch(() => null); this.buffers.set(file, p); }
    return p;
  }
  private pick<T>(xs: T[], w: (x: T) => number = () => 1) { const tot = xs.reduce((a, x) => a + w(x), 0); let r = Math.random() * tot; for (const x of xs) { r -= w(x); if (r <= 0) return x; } return xs[0]; }

  /** 演出 sfx（recipe 里的短 id 走 alias → se.*） */
  play(id: string) {
    const sid = this.alias[id] ?? id, e = this.se[sid];
    const files = (e?.files ?? []).filter((f) => this.present.has(f));
    if (!files.length || !this.ctx) { this.log.push(`se:${sid}(silent)`); return; }
    this.log.push(`se:${sid}`);
    const p = this.load(this.pick(files)); if (!p) return;
    p.then((buf) => { if (!buf || !this.ctx) return; const s = this.ctx.createBufferSource(); s.buffer = buf; const g = this.ctx.createGain(); g.gain.value = Math.pow(10, (e!.gainDb ?? 0) / 20); s.connect(g).connect(this.bus.se!); s.start(); });
  }
  voiceLine(unit: string, key: string) {
    const files = (this.voice[unit]?.[key] ?? []).filter((f) => this.present.has(f));
    if (!files.length || !this.ctx) { this.log.push(`voice:${unit}.${key}(silent)`); return; }
    this.log.push(`voice:${unit}.${key}`);
    this.load(this.pick(files))?.then((buf) => { if (!buf || !this.ctx) return; const s = this.ctx.createBufferSource(); s.buffer = buf; s.connect(this.bus.voice!); s.start(); });
  }
  /** BGM：同 scene 下按 condition 匹配键最多者胜（D-008），池内按 weight 随机且不连续重复 */
  bgm(scene: string, cond: Record<string, unknown> = {}, fadeMs?: number) {
    const cands = this.pl.entries.filter((e) => e.scene === scene && e.enabledByDefault !== false && Object.entries(e.condition ?? {}).every(([k, v]) => cond[k] === v));
    cands.sort((a, b) => Object.keys(b.condition ?? {}).length - Object.keys(a.condition ?? {}).length);
    const best = cands[0];
    const tracks = (best?.tracks ?? []).filter((t) => this.present.has(t.file));
    if (!tracks.length || !this.ctx) { this.log.push(`bgm:${scene}(silent)`); return; }
    if (this.cur?.scene === scene) return;
    const pool = tracks.length > 1 ? tracks.filter((t) => t.file !== this.lastTrack) : tracks;
    const t = this.pick(pool, (x) => x.weight ?? 1); this.lastTrack = t.file;
    this.log.push(`bgm:${scene}`);
    const fade = (fadeMs ?? this.pl.defaults?.crossfadeMs ?? 800) / 1000;
    this.load(t.file)?.then((buf) => {
      if (!buf || !this.ctx) return;
      const now = this.ctx.currentTime;
      if (this.cur) { const o = this.cur; o.g.gain.setTargetAtTime(0, now, fade / 3); o.src.stop(now + fade + 0.1); }
      const s = this.ctx.createBufferSource(); s.buffer = buf; s.loop = best!.loop !== false;
      if (t.loopEnd && t.loopEnd > (t.loopStart ?? 0)) { s.loopStart = t.loopStart ?? 0; s.loopEnd = t.loopEnd; }
      const g = this.ctx.createGain(); g.gain.value = 0; g.gain.setTargetAtTime(1, now, fade / 3);
      s.connect(g).connect(this.bus.bgm!); s.start(); this.cur = { src: s, g, scene };
    });
  }
  stopBgm(fadeMs = 600) { if (!this.cur || !this.ctx) return; const o = this.cur; o.g.gain.setTargetAtTime(0, this.ctx.currentTime, fadeMs / 3000); o.src.stop(this.ctx.currentTime + fadeMs / 1000 + 0.1); this.cur = null; }
}
