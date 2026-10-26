// r8：原版 P5T 战斗音效（Codex 4a25a24 解出的 22 条 CriWare 原版 SE）。
// 文件：tools/fetch-p5t-sfx.sh → public/p5t-sfx/<名>.ogg（Opus）/ .m4a（AAC，iOS 回退），不入库；缺文件 = 静音。
// WebAudio：第一次点屏/按键时解锁（手机浏览器要求用户手势）；音量 = localStorage 'umbra.sfxVol'（0–1，默认 0.8；?mute 静音）。
// 每次播放记一条 window.__sfxLog（名字、performance.now、增益）→ 录像脚本按时间混音。
const BASE = 'p5t-sfx/';
export type SfxName =
  | 'gun_fire' | 'gun_impact' | 'gun_hit_v1' | 'gun_hit_v2' | 'gun_ambush' | 'melee_hit'
  | 'damage_blow_away' | 'damage_hit_wall' | 'down_fall_ground' | 'down_fall_ground_high' | 'down_stand_up'
  | 'one_more' | 'ui_confirm_1' | 'ui_confirm_2' | 'ui_confirm_3' | 'ui_confirm_short'
  | 'all_out_attack' | 'all_out_end' | 'all_out_in' | 'all_out_people_fs' | 'all_out_people_gaya' | 'all_out_cutin'
  | 'se_btl_wipe_win'; // r16b：battle_result.acb（tools/fetch-p5t-result-sfx.sh）

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
const bufs = new Map<string, Promise<AudioBuffer | null>>();
const ready = new Map<string, AudioBuffer>();
const muted = typeof location !== 'undefined' && new URLSearchParams(location.search).has('mute');
export const sfxLog: { name: string; t: number; gain: number }[] = [];
(globalThis as unknown as { __sfxLog: typeof sfxLog }).__sfxLog = sfxLog;

export function getVolume(): number {
  try { const v = parseFloat(localStorage.getItem('umbra.sfxVol') ?? ''); return isFinite(v) ? Math.max(0, Math.min(1, v)) : 0.8; } catch { return 0.8; }
}
export function setVolume(v: number) { try { localStorage.setItem('umbra.sfxVol', String(v)); } catch { /* ignore */ } if (master) master.gain.value = v; }

function ensureCtx(): AudioContext | null {
  if (ctx) return ctx;
  const AC = (window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain(); master.gain.value = muted ? 0 : getVolume(); master.connect(ctx.destination);
  return ctx;
}
/** r13：与 BGM 共用的 AudioContext */
export function audioCtx(): AudioContext | null { return ensureCtx(); }
const ext = () => { const a = document.createElement('audio'); return a.canPlayType('audio/ogg; codecs=opus') ? 'ogg' : 'm4a'; };
function load(name: string): Promise<AudioBuffer | null> {
  let p = bufs.get(name);
  if (!p) {
    const c = ensureCtx();
    p = !c ? Promise.resolve(null) : fetch(`${BASE}${name}.${ext()}`).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(r.status)))
      .then((b) => c.decodeAudioData(b)).then((b) => { ready.set(name, b); return b; }).catch(() => null);
    bufs.set(name, p);
  }
  return p;
}
/** 首次用户手势解锁（Android Chrome / iOS Safari 要求） */
export function installUnlock() {
  const go = () => {
    const c = ensureCtx(); if (!c) return;
    if (c.state === 'suspended') void c.resume();
    const b = c.createBuffer(1, 1, 22050); const s = c.createBufferSource(); s.buffer = b; s.connect(c.destination); s.start(0);
    window.removeEventListener('pointerdown', go, true); window.removeEventListener('keydown', go, true); window.removeEventListener('touchend', go, true);
  };
  window.addEventListener('pointerdown', go, true); window.addEventListener('keydown', go, true); window.addEventListener('touchend', go, true);
}
const BATTLE: SfxName[] = ['gun_fire', 'gun_impact', 'gun_hit_v1', 'melee_hit', 'damage_blow_away', 'damage_hit_wall', 'down_fall_ground', 'one_more', 'ui_confirm_1', 'ui_confirm_short', 'all_out_in', 'all_out_attack', 'all_out_end', 'all_out_cutin'];
/** 关卡开始预载常用 SE（共约 0.3MB Opus） */
export function preloadSfx() { if (ensureCtx()) for (const n of BATTLE) void load(n); }
const lastAt = new Map<string, number>();
/** 播放（未加载完 → 加载后若仍在 150ms 内则补播）；同名 40ms 内去重 */
export function sfx(name: SfxName, gain = 1) {
  const now = performance.now();
  if ((lastAt.get(name) ?? -1e9) > now - 40) return;
  lastAt.set(name, now);
  sfxLog.push({ name, t: now, gain });
  const c = ensureCtx(); if (!c || !master) return;
  const play = (b: AudioBuffer) => { const s = c.createBufferSource(); s.buffer = b; const g = c.createGain(); g.gain.value = gain; s.connect(g); g.connect(master!); s.start(); };
  const b = ready.get(name);
  if (b) play(b); else void load(name).then((x) => { if (x && performance.now() - now < 150) play(x); });
}
