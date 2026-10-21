import {
  Director,
  type BufferedAction,
  type DirectorEvent,
  type DirectorSpeed,
} from './director';
import {
  applyQualityWindow,
  createQualityState,
  qualityWindowMedian,
  type QualityState,
  type QualityTier,
  type QualityWindowSample,
} from './quality';

export interface UmbraCoordinatorOptions {
  speed?: DirectorSpeed;
  initialQuality?: QualityTier;
  thresholds?: { bad: number; good: number; badLow: number };
}

export class UmbraCoordinator {
  readonly director = new Director();
  readonly quality: QualityState;
  private readonly speed: DirectorSpeed;
  private readonly thresholds: { bad: number; good: number; badLow: number };

  constructor(options: UmbraCoordinatorOptions = {}) {
    this.speed = options.speed ?? 1;
    this.quality = createQualityState(options.initialQuality ?? 'mid');
    this.thresholds = options.thresholds ?? { bad: 20, good: 14, badLow: 25 };
  }

  get speedValue(): DirectorSpeed {
    return this.speed;
  }

  startMain(event: DirectorEvent, now: number): boolean {
    return this.director.startMain({ ...event, durationMs: event.durationMs / this.speed }, now);
  }

  startOverlap(event: DirectorEvent, now: number): boolean {
    return this.director.startOverlap({ ...event, durationMs: event.durationMs / this.speed }, now);
  }

  queueEnv(event: DirectorEvent): void {
    this.director.queueEnv({ ...event, durationMs: event.durationMs / this.speed });
  }

  pushInput(actionKey: string, action: unknown): BufferedAction | null {
    return this.director.pushInput(actionKey, action);
  }

  tick(now: number): { clearedMain: boolean; clearedOverlap: boolean; startedEnv: boolean } {
    const result = this.director.tick(now);
    if (result.clearedMain) this.director.drainInput();
    return result;
  }

  sampleQuality(samples: QualityWindowSample[]): void {
    const median = qualityWindowMedian(samples);
    const next = applyQualityWindow(this.quality, median, this.thresholds);
    Object.assign(this.quality, next);
  }
}
