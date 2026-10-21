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
