export const UMBRA_RUN_ID = 'current';

export interface UmbraRuntimePayload extends Record<string, unknown> {
  floor: number;
  maxFloor: number;
  stratum: string;
  seed: number;
  map: Record<string, unknown> | null;
  exploration: Record<string, unknown> | null;
}

const clone = <T,>(value: T): T => (
  typeof structuredClone === 'function'
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value)) as T
);

export function serializeExploration(exploration: any): {
  map: Record<string, unknown>;
  exploration: Record<string, unknown>;
} {
  const { map, listened, ...state } = exploration;
  return {
    map: clone(map),
    exploration: {
      ...clone(state),
      listened: [...(listened ?? [])],
      map: null,
    },
  };
}

export function restoreExploration(payload: Partial<UmbraRuntimePayload> | null | undefined): any | null {
  const map = payload?.map;
  const state = payload?.exploration;
  if (!map || !state || typeof map !== 'object' || typeof state !== 'object') return null;
  if (!map.rooms || !map.start || !map.exit) return null;
  return {
    ...clone(state),
    map: clone(map),
    listened: new Set(Array.isArray(state.listened) ? state.listened : []),
  };
}

export function createRuntimePayload(input: {
  floor?: number;
  maxFloor?: number;
  stratum?: string;
  seed: number;
  exploration: any;
}): UmbraRuntimePayload {
  const serialized = serializeExploration(input.exploration);
  return {
    floor: Math.max(1, Math.round(Number(input.floor) || 1)),
    maxFloor: Math.max(1, Math.round(Number(input.maxFloor) || 40)),
    stratum: typeof input.stratum === 'string' && input.stratum ? input.stratum : 'echo',
    seed: Number.isFinite(Number(input.seed)) ? Number(input.seed) : 1,
    ...serialized,
  };
}
