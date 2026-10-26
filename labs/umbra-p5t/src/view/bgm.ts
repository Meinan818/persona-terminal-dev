// r13：原版战斗 BGM（umbra-assets p5t/1_audio/bgm，CriWare ACB/AWB → WAV，Codex 导出）。
// 文件：tools/fetch-p5t-bgm.sh → public/p5t-bgm/<cue>.ogg（Opus）/ .m4a（AAC，iOS 回退），不入库；缺文件 = 无 BGM。
// 无缝循环：AudioBufferSourceNode.loop + loopStart/loopEnd = 原版 AWB 头的 loop 采样点 / 48000。
// 音量：localStorage 'umbra.bgmVol'（0–1，默认 0.3 ≈ −10.5 dB）。原版 WAV 母带 −8 LUFS，SE 枪声 −12.6 LUFS；0.3 让 BGM 落在 ≈−19 LUFS，
//   低于 SE（×0.8）约 4–5 dB —— 这个比例是推断（原版 CRI 混音器 category 音量未导出），按录像听感校。
// 每次开始/淡出记一条 window.__bgmLog → 录像脚本按时间混入。
import { BGM_TRACKS, bgmForLevel } from './bgmData';
import { audioCtx } from './sfx';
const BASE = 'p5t-bgm/';
const muted = typeof location !== 'undefined' && new URLSearchParams(location.search).has('mute');
export const bgmLog: { ev: 'play' | 'fade'; track?: string; loopStart?: number; loopEnd?: number; t: number; gain: number; ms?: number }[] = [];
(globalThis as unknown as { __bgmLog: typeof bgmLog }).__bgmLog = bgmLog;
export function getBgmVolume(): number {
  try { const v = parseFloat(localStorage.getItem('umbra.bgmVol') ?? ''); return isFinite(v) ? Math.max(0, Math.min(1, v)) : 0.3; } catch { return 0.3; }
}
const cache = new Map<string, Promise<AudioBuffer | null>>();
let cur: { src: AudioBufferSourceNode; gain: GainNode; track: string } | null = null;
let want: string | null = null;
const ext = () => { const a = document.createElement('audio'); return a.canPlayType('audio/ogg; codecs=opus') ? 'ogg' : 'm4a'; };
function load(c: AudioContext, track: string) {
  let p = cache.get(track);
  if (!p) { p = fetch(`${BASE}${track}.${ext()}`).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(r.status))).then((b) => c.decodeAudioData(b)).catch(() => null); cache.set(track, p); }
  return p;
}
/** 关卡开始：按原版 BgmId 播放（同一首在放则不重启） */
export function playLevelBgm(levelId: string) {
  const info = bgmForLevel(levelId);
  const tr = BGM_TRACKS[info.track];
  if (cur && cur.track === info.track && want === info.track) { cur.gain.gain.cancelScheduledValues(0); cur.gain.gain.value = getBgmVolume(); return; }
  stopBgm(300);
  want = info.track;
  const vol = muted ? 0 : getBgmVolume();
  bgmLog.push({ ev: 'play', track: info.track, loopStart: tr.loopStart / tr.rate, loopEnd: tr.loopEnd / tr.rate, t: performance.now(), gain: vol });
  const start = () => {
    const c = audioCtx(); if (!c) return;
    void load(c, info.track).then((b) => {
      if (!b || want !== info.track || cur) return;
      const s = c.createBufferSource(); s.buffer = b; s.loop = true;
      s.loopStart = tr.loopStart / tr.rate; s.loopEnd = Math.min(b.duration, tr.loopEnd / tr.rate);
      const g = c.createGain(); g.gain.value = vol; s.connect(g); g.connect(c.destination); s.start();
      cur = { src: s, gain: g, track: info.track };
    });
  };
  const c = audioCtx();
  if (c && c.state !== 'suspended') start();
  else { const go = () => { window.removeEventListener('pointerdown', go, true); window.removeEventListener('keydown', go, true); setTimeout(start, 50); }; window.addEventListener('pointerdown', go, true); window.addEventListener('keydown', go, true); start(); }
}
/** 淡出（结算时；原版结算曲未导出/未识别 → 推断：淡出） */
export function stopBgm(ms = 1500) {
  want = null;
  if (!cur) return;
  bgmLog.push({ ev: 'fade', t: performance.now(), gain: 0, ms });
  const c = cur.src.context as AudioContext, { src, gain } = cur; cur = null;
  const now = c.currentTime; gain.gain.cancelScheduledValues(now); gain.gain.setValueAtTime(gain.gain.value, now); gain.gain.linearRampToValueAtTime(0, now + ms / 1000);
  try { src.stop(now + ms / 1000 + 0.05); } catch { /* ignore */ }
}
