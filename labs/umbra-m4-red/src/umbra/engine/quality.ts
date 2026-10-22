// §6 三档画质 + 自动降档（1 秒一窗、ticker 帧时间中位数、后台/暂停/loading 不计）。
export type TierName = 'high' | 'mid' | 'low';
export interface Tier { name: TierName; particleK: number; speedK: number; shardK: number; cap: number; mesh: [number, number]; fresK: number }
export const TIERS: Record<TierName, Tier> = {
  high: { name: 'high', particleK: 1, speedK: 1, shardK: 1, cap: 600, mesh: [8, 12], fresK: 0.5 },
  mid: { name: 'mid', particleK: 0.6, speedK: 0.7, shardK: 0.7, cap: 300, mesh: [8, 12], fresK: 0.5 },
  low: { name: 'low', particleK: 0.33, speedK: 0.5, shardK: 0.5, cap: 150, mesh: [6, 8], fresK: 0.5 },
};
const ORDER: TierName[] = ['high', 'mid', 'low'];

export class Quality {
  tier: TierName; ceiling: TierName;
  private win: number[] = []; private winStart = 0; private bad = 0; private good = 0; private cool = 0; private voidWin = false;
  windows: { med: number; counted: boolean; tier: TierName }[] = [];
  changes: { at: number; from: TierName; to: TierName; med: number }[] = [];
  onChange?: (t: TierName) => void;
  constructor(initial: TierName, public auto: boolean) { this.tier = initial; this.ceiling = initial; }
  /** paused = 后台/暂停/loading：该窗作废 */
  sample(dt: number, now: number, paused: boolean) {
    if (this.winStart === 0) this.winStart = now;
    if (paused) this.voidWin = true; else this.win.push(dt);
    if (now - this.winStart < 1000) return;
    const s = this.win.slice().sort((a, b) => a - b), med = s.length ? s[s.length >> 1] : 0;
    const counted = !this.voidWin && s.length > 0;
    this.windows.push({ med: +med.toFixed(2), counted, tier: this.tier }); if (this.windows.length > 120) this.windows.shift();
    this.win.length = 0; this.winStart = now; this.voidWin = false;
    if (!counted || !this.auto) { if (!counted) { this.bad = 0; this.good = 0; } return; }
    if (this.cool > 0) { this.cool--; return; }
    if (med > 20) { this.bad++; this.good = 0; } else if (med < 14) { this.good++; this.bad = 0; } else { this.bad = 0; this.good = 0; }
    const i = ORDER.indexOf(this.tier);
    if (this.bad >= 2 && i < 2) this.set(ORDER[i + 1], now, med);
    else if (this.good >= 5 && i > ORDER.indexOf(this.ceiling)) this.set(ORDER[i - 1], now, med);
  }
  private set(n: TierName, now: number, med: number) {
    this.changes.push({ at: Math.round(now), from: this.tier, to: n, med }); this.tier = n; this.bad = this.good = 0; this.cool = 2; this.onChange?.(n);
  }
}
