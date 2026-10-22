// 音效占位钩子：演出时间轴上的音效/语音点。实时播放时越过时间点就派发 window 事件 'umbra:sfx'（detail: {id, t}），
// 正式音频接入时监听这个事件即可。?sfx=1 时用 WebAudio 合成占位声（点击页面后才会出声，浏览器自动播放限制）。
export const SFX_CUES = [
  { t: 1.00, id: 'sfx:evoker_raise' },     // 举枪（衣料摩擦）
  { t: 1.30, id: 'voice:persona_call' },   // 召唤者喊人格名（语音占位）
  { t: 1.82, id: 'sfx:evoker_trigger' },   // 扳机「咔」
  { t: 1.85, id: 'sfx:glass_shatter' },    // 玻璃碎裂（主音效）
  { t: 2.00, id: 'sfx:persona_appear' },   // 人格面具显形（上升音 + 低频）
  { t: 3.70, id: 'sfx:whip' },             // 甩镜风声
  { t: 3.72, id: 'sfx:agi_cast' },         // 亚基发动
  { t: 3.90, id: 'sfx:agi_hit' },          // 命中爆炸
  { t: 4.30, id: 'sfx:weak' },             // WEAK 提示音
  { t: 5.50, id: 'sfx:persona_vanish' },   // 面具消散
];

export class Sfx {
  constructor(enabled) {
    this.enabled = enabled; this.ctx = null; this.log = [];
    if (enabled) window.addEventListener('pointerdown', () => { if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)(); }, { once: true });
  }
  /** 区间 (a, b] 内的提示点全部派发（循环回绕时 a > b 视为从 0 开始） */
  tick(a, b) {
    for (const c of SFX_CUES) {
      const hit = a <= b ? (c.t > a && c.t <= b) : (c.t > a || c.t <= b);
      if (!hit) continue;
      window.dispatchEvent(new CustomEvent('umbra:sfx', { detail: { id: c.id, t: c.t } }));
      this.log.push(c.id); if (this.log.length > 30) this.log.shift();
      if (this.ctx) this.synth(c.id);
    }
  }
  synth(id) {
    const ac = this.ctx, now = ac.currentTime;
    const noise = (dur, f0, f1, gain, q = 1) => {
      const b = ac.createBuffer(1, ac.sampleRate * dur, ac.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2);
      const s = ac.createBufferSource(); s.buffer = b; const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = q; f.frequency.setValueAtTime(f0, now); f.frequency.exponentialRampToValueAtTime(f1, now + dur);
      const g = ac.createGain(); g.gain.value = gain; s.connect(f).connect(g).connect(ac.destination); s.start(now);
    };
    const ping = (fr, dur, gain, type = 'sine') => { const o = ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(fr, now); o.frequency.exponentialRampToValueAtTime(fr * 0.5, now + dur); const g = ac.createGain(); g.gain.setValueAtTime(gain, now); g.gain.exponentialRampToValueAtTime(0.001, now + dur); o.connect(g).connect(ac.destination); o.start(now); o.stop(now + dur); };
    if (id === 'sfx:glass_shatter') { noise(0.9, 6000, 2500, 0.9, 0.7); for (let i = 0; i < 6; i++) ping(2500 + Math.random() * 4000, 0.3 + Math.random() * 0.4, 0.08); ping(70, 0.5, 0.6, 'triangle'); }
    else if (id === 'sfx:evoker_trigger') ping(1800, 0.04, 0.3, 'square');
    else if (id === 'sfx:agi_hit') { noise(0.8, 900, 120, 1.0, 0.5); ping(55, 0.6, 0.7, 'triangle'); }
    else if (id === 'sfx:whip') noise(0.25, 800, 3000, 0.4, 0.8);
    else if (id === 'sfx:persona_appear') { ping(220, 1.2, 0.2); ping(330, 1.2, 0.12); }
    else if (id === 'sfx:weak') ping(1200, 0.15, 0.2, 'square');
    else noise(0.15, 1500, 800, 0.2);
  }
}
