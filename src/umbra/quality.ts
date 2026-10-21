export type QualityTier = 'high' | 'mid' | 'low';

export interface QualityWindowSample {
  frameMs: number;
  hidden?: boolean;
  paused?: boolean;
  loading?: boolean;
}

export interface QualityState {
  tier: QualityTier;
  renderScale: number;
  cooldown: number;
  badWindows: number;
  goodWindows: number;
}

const TIER_ORDER: QualityTier[] = ['high', 'mid', 'low'];
const TIER_SCALE: Record<QualityTier, number> = { high: 1, mid: 0.75, low: 0.5 };

const median = (values: number[]): number => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

export function createQualityState(initial: QualityTier = 'mid'): QualityState {
  return {
    tier: initial,
    renderScale: TIER_SCALE[initial],
    cooldown: 0,
    badWindows: 0,
    goodWindows: 0,
  };
}

export function qualityWindowMedian(samples: QualityWindowSample[]): number | null {
  const valid = samples.filter(sample => !sample.hidden && !sample.paused && !sample.loading);
  if (!valid.length) return null;
  return median(valid.map(sample => sample.frameMs));
}

export function applyQualityWindow(
  state: QualityState,
  medianMs: number | null,
  thresholds: { bad: number; good: number; badLow: number } = {
    bad: 20,
    good: 14,
    badLow: 25,
  },
): QualityState {
  if (medianMs == null) return { ...state, badWindows: 0, goodWindows: 0 };
  const tierIndex = TIER_ORDER.indexOf(state.tier);
  const cooldown = Math.max(0, state.cooldown - 1);

  if (state.tier === 'low' && medianMs > thresholds.badLow) {
    return {
      ...state,
      renderScale: Math.max(0.85, state.renderScale - 0.15),
      badWindows: 0,
      goodWindows: 0,
    };
  }
  if (medianMs > thresholds.bad) {
    const badWindows = state.badWindows + 1;
    if (badWindows >= 2 && tierIndex < TIER_ORDER.length - 1 && cooldown === 0) {
      const tier = TIER_ORDER[tierIndex + 1];
      return { tier, renderScale: TIER_SCALE[tier], cooldown: 2, badWindows: 0, goodWindows: 0 };
    }
    return { ...state, cooldown, badWindows, goodWindows: 0 };
  }

  if (medianMs < thresholds.good) {
    const goodWindows = state.goodWindows + 1;
    if (goodWindows >= 5 && tierIndex > 0 && cooldown === 0) {
      const tier = TIER_ORDER[tierIndex - 1];
      return { tier, renderScale: TIER_SCALE[tier], cooldown: 2, badWindows: 0, goodWindows: 0 };
    }
    return { ...state, cooldown, badWindows: 0, goodWindows };
  }

  return { ...state, cooldown, badWindows: 0, goodWindows: 0 };
}
