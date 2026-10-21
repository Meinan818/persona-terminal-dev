export type UmbraWeather =
  | 'clear'
  | 'cloudy'
  | 'rain'
  | 'snow'
  | 'fog'
  | 'storm'
  | 'unknown';

export type UmbraWeekday =
  | 'mon'
  | 'tue'
  | 'wed'
  | 'thu'
  | 'fri'
  | 'sat'
  | 'sun';

export type UmbraMoonPhase = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface UmbraEnv {
  date: string;
  weekday: UmbraWeekday;
  weather: UmbraWeather;
  moonPhase: UmbraMoonPhase;
  darkHour: boolean;
}

export interface UmbraEnvSnapshotOptions {
  now?: Date;
  weather?: UmbraWeather;
  darkHour?: boolean;
}

const WEEKDAYS: UmbraWeekday[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

const pad = (value: number): string => String(value).padStart(2, '0');

export function localDateKey(now: Date): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function weekdayOf(dateKey: string, now: Date = new Date()): UmbraWeekday {
  const [year, month, day] = dateKey.split('-').map(Number);
  const value = new Date(year, month - 1, day);
  const index = Number.isNaN(value.getTime()) ? now.getDay() : value.getDay();
  return WEEKDAYS[index];
}

/**
 * 8 档月相由新月参考点按朔望月推进。规则只要求同日期稳定可复现，
 * 不承担天文表精度。
 */
export function moonPhaseForDate(dateKey: string): UmbraMoonPhase {
  const [year, month, day] = dateKey.split('-').map(Number);
  const value = new Date(year, month - 1, day, 12, 0, 0);
  const reference = new Date('2000-01-06T18:14:00Z').getTime();
  const days = (value.getTime() - reference) / 86_400_000;
  const synodic = 29.53058867;
  const normalized = ((days % synodic) + synodic) % synodic;
  return Math.floor((normalized / synodic) * 8) as UmbraMoonPhase;
}

export function createUmbraEnvSnapshot(options: UmbraEnvSnapshotOptions = {}): UmbraEnv {
  const now = options.now ?? new Date();
  const date = localDateKey(now);
  return {
    date,
    weekday: weekdayOf(date, now),
    weather: options.weather ?? 'unknown',
    moonPhase: moonPhaseForDate(date),
    darkHour: options.darkHour ?? false,
  };
}

export function envChanged(prev: UmbraEnv, next: UmbraEnv): (keyof UmbraEnv)[] {
  return (Object.keys(next) as (keyof UmbraEnv)[]).filter(key => prev[key] !== next[key]);
}
