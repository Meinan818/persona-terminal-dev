export type DirectorSpeed = 1 | 2 | 3;
export type DirectorLevel = 'full' | 'standard' | 'minimal';
export type DirectorTrackKind = 'main' | 'overlap';

export interface DirectorEvent {
  id: string;
  name: string;
  durationMs: number;
  track: DirectorTrackKind;
  actionKey?: string;
  overlapPriority?: number;
}

export interface BufferedAction {
  actionKey: string;
  action: unknown;
}

export interface DirectorLimits {
  main: number;
  overlap: number;
  encounterStartCombo: number;
  encounterStartComboMinimal: number;
}

export const DIRECTOR_LIMITS: DirectorLimits = {
  main: 3500,
  overlap: 500,
  encounterStartCombo: 1200,
  encounterStartComboMinimal: 700,
};

export function scaledDuration(durationMs: number, speed: DirectorSpeed): number {
  return Math.max(1, Math.round(durationMs / speed));
}

export function clampEventDuration(
  event: DirectorEvent,
  speed: DirectorSpeed,
  level: DirectorLevel,
): number {
  const limit = event.track === 'overlap'
    ? DIRECTOR_LIMITS.overlap
    : level === 'minimal'
      ? Math.round(DIRECTOR_LIMITS.main * 0.35)
      : DIRECTOR_LIMITS.main;
  return Math.min(event.durationMs, scaledDuration(limit, speed));
}

export function encounterComboBudget(
  encounterMs: number,
  speed: DirectorSpeed,
  level: DirectorLevel,
): number {
  const budget = level === 'minimal'
    ? DIRECTOR_LIMITS.encounterStartComboMinimal
    : DIRECTOR_LIMITS.encounterStartCombo;
  return Math.max(0, scaledDuration(budget, speed) - encounterMs);
}

export const CAPS: Record<string, [number, number]> = {
  'battle:start': [900, 350], 'turn:start': [300, 100], 'action': [1800, 600], 'action:enemy': [1500, 500],
  'unit:down': [500, 200], 'onemore': [450, 250], 'highlight': [3500, 1200], 'holdup': [1000, 400], 'allout': [3500, 1200],
  'talk:start': [800, 300], 'talk:result': [1200, 400], 'battle:end': [1500, 500], 'scene:enter': [600, 250], 'scene:leave': [600, 250],
  'map:move': [800, 300], 'map:encounter': [900, 350], 'env:change': [600, 250], 'ui:open': [280, 150], 'ui:close': [280, 150],
  'baton': [600, 250], 'persona:switch': [500, 200], 'shield:break': [500, 200], 'levelup': [1000, 400], 'card:pick': [600, 300],
  'buff:grant': [800, 300], 'boss:phase': [2000, 600], 'fusion:result': [3000, 1000],
  'shop:enter:full': [1200, 300], 'shop:enter:short': [500, 300], 'shop:exit': [600, 250], 'party:switch': [500, 200],
  'bond:assist': [800, 300], 'ailment:apply': [400, 150], 'ailment:cure': [400, 150], 'escape': [600, 250], 'velvet:alarm': [800, 300],
  'fusion:accident': [1000, 400], 'callingcard:send': [3000, 1000], 'explore:scan': [400, 200], 'persona:levelup': [800, 300], 'bond:rankup': [1500, 500],
  'holdup:result': [400, 150], 'explore:move:cell': [250, 120], 'explore:cover': [300, 150], 'explore:spotted': [500, 200], 'explore:interact': [400, 200],
  'unit:spawn': [600, 250], 'unit:flee': [600, 250], 'unit:revive': [600, 250], 'explore:sneak:cell': [350, 150], 'explore:exit': [800, 300],
  'boss:intro': [2000, 600], 'run:fail': [1500, 500], 'run:retreat': [1000, 400],
};

export const capKey = (ev: string, p: any): string => (
  ev === 'action' && p?.side === 'enemy'
    ? 'action:enemy'
    : ev === 'shop:enter'
      ? (p?.firstVisitToday ? 'shop:enter:full' : 'shop:enter:short')
      : ev === 'explore:move' ? 'explore:move:cell' : ev === 'explore:sneak' ? 'explore:sneak:cell' : ev
);

export const capOf = (ev: string, p: any, minimal: boolean, speed: number): number => {
  const [full, min] = CAPS[capKey(ev, p)] ?? [0, 0];
  const cells = ev === 'explore:move' || ev === 'explore:sneak'
    ? Math.max(1, (p?.path?.length ?? 2) - 1)
    : 1;
  const raw = (minimal ? min : full) * cells;
  return (cells > 1 ? Math.min(2000, raw) : raw) / speed;
};

export const wallMs = (r: { duration: number; tracks: { prim: string; dur?: number; args?: any }[] }): number => (
  r.duration + r.tracks
    .filter(track => track.prim === 'hitStop')
    .reduce((sum, track) => sum + (track.dur ?? track.args?.ms ?? 0), 0)
);

export class Director {
  private main: DirectorEvent | null = null;
  private mainEndsAt = 0;
  private overlap: DirectorEvent | null = null;
  private overlapEndsAt = 0;
  private buffer: BufferedAction[] = [];
  private executedActionKeys = new Set<string>();
  private pendingEnv: DirectorEvent | null = null;

  get mainEvent(): DirectorEvent | null {
    return this.main;
  }

  get overlapEvent(): DirectorEvent | null {
    return this.overlap;
  }

  get pendingEnvEvent(): DirectorEvent | null {
    return this.pendingEnv;
  }

  startMain(event: DirectorEvent, now: number): boolean {
    if (this.main) return false;
    this.main = event;
    this.mainEndsAt = now + event.durationMs;
    return true;
  }

  startOverlap(event: DirectorEvent, now: number): boolean {
    this.overlap = event;
    this.overlapEndsAt = now + event.durationMs;
    return true;
  }

  queueEnv(event: DirectorEvent): void {
    this.pendingEnv = event;
  }

  pushInput(actionKey: string, action: unknown): BufferedAction | null {
    if (this.executedActionKeys.has(actionKey)) return null;
    this.buffer.push({ actionKey, action });
    let dropped: BufferedAction | null = null;
    while (this.buffer.length > 2) dropped = this.buffer.shift() ?? null;
    return dropped;
  }

  drainInput(): BufferedAction[] {
    const ready: BufferedAction[] = [];
    for (const item of this.buffer) {
      if (this.executedActionKeys.has(item.actionKey)) continue;
      ready.push(item);
      this.executedActionKeys.add(item.actionKey);
    }
    this.buffer = [];
    return ready;
  }

  markActionExecuted(actionKey: string): void {
    this.executedActionKeys.add(actionKey);
  }

  tick(now: number): { clearedMain: boolean; clearedOverlap: boolean; startedEnv: boolean } {
    let clearedMain = false;
    let clearedOverlap = false;
    let startedEnv = false;

    if (this.main && now >= this.mainEndsAt) {
      this.main = null;
      clearedMain = true;
    }
    if (this.overlap && now >= this.overlapEndsAt) {
      this.overlap = null;
      clearedOverlap = true;
    }
    if (!this.main && this.pendingEnv) {
      this.main = this.pendingEnv;
      this.mainEndsAt = now + this.pendingEnv.durationMs;
      this.pendingEnv = null;
      startedEnv = true;
    }
    return { clearedMain, clearedOverlap, startedEnv };
  }
}
