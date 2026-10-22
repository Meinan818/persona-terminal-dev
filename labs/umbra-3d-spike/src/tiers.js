// 画质档位：只降分辨率/采样，不删效果种类（Bloom、反射、调色、描边、粒子在每档都在）。
// ?tier=high|mid|low 强制；否则按设备自动选，运行中帧时过长会自动降一档。
export const TIERS = {
  high: { name: 'high', dprCap: 2.0, msaa: 4, bloomScale: 0.5, bloomStrength: 0.75, reflScale: 0.5, reflBlur: 1.0, particles: 1.0, outline: 1.0 },
  mid:  { name: 'mid',  dprCap: 1.5, msaa: 2, bloomScale: 0.35, bloomStrength: 0.7, reflScale: 0.33, reflBlur: 1.4, particles: 0.7, outline: 1.0 },
  low:  { name: 'low',  dprCap: 1.0, msaa: 0, bloomScale: 0.25, bloomStrength: 0.65, reflScale: 0.25, reflBlur: 1.8, particles: 0.45, outline: 1.0 },
};

export function pickTier(params) {
  const forced = params.get('tier');
  if (forced && TIERS[forced]) return TIERS[forced];
  const ua = navigator.userAgent || '';
  const mobile = /Android|iPhone|iPad|Mobile/i.test(ua) || Math.min(screen.width, screen.height) < 540;
  const cores = navigator.hardwareConcurrency || 4;
  if (mobile) return cores >= 8 ? TIERS.mid : TIERS.low;
  return cores >= 6 ? TIERS.high : TIERS.mid;
}

export const ORDER = ['high', 'mid', 'low'];

/** 帧时监控：连续 2 秒平均超过 budgetMs 就回调降档（最多降到 low）。 */
export class Governor {
  constructor(onDown, budgetMs = 24) { this.onDown = onDown; this.budget = budgetMs; this.acc = 0; this.n = 0; this.t = 0; }
  sample(dtMs) {
    this.acc += dtMs; this.n++; this.t += dtMs;
    if (this.t > 2000) { const avg = this.acc / this.n; this.acc = this.n = this.t = 0; if (avg > this.budget) this.onDown(avg); }
  }
}
