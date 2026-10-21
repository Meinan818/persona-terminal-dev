export const UMBRA_SAVE_SCHEMA_VERSION = 4;

export interface UmbraCheckpointV4 {
  id: string;
  schemaVersion: typeof UMBRA_SAVE_SCHEMA_VERSION;
  runId: string;
  actionKey: string;
  sequence: number;
  createdAt: string;
  updatedAt: string;
  applied: boolean;
  payload: unknown;
}

export interface UmbraSaveV4 {
  schemaVersion: typeof UMBRA_SAVE_SCHEMA_VERSION;
  profile: unknown;
  run: unknown;
  checkpoints: UmbraCheckpointV4[];
}

const cleanId = (value: string, max = 96): string => value.trim().slice(0, max);

export function actionKeyFor(
  event: string,
  round: number,
  actorId: string,
  targetId?: string,
): string {
  return [cleanId(event), Math.max(0, Math.floor(round)), cleanId(actorId), targetId ? cleanId(targetId) : '']
    .filter(Boolean)
    .join(':');
}

export function checkpointIdFor(actionKey: string, sequence: number): string {
  return `${cleanId(actionKey)}#${Math.max(0, Math.floor(sequence))}`;
}

export function createUmbraCheckpoint(
  input: {
    runId: string;
    actionKey: string;
    sequence: number;
    payload: unknown;
    now?: Date;
  },
): UmbraCheckpointV4 {
  const now = input.now ?? new Date();
  const stamp = now.toISOString();
  return {
    id: checkpointIdFor(input.actionKey, input.sequence),
    schemaVersion: UMBRA_SAVE_SCHEMA_VERSION,
    runId: cleanId(input.runId),
    actionKey: cleanId(input.actionKey),
    sequence: Math.max(0, Math.floor(input.sequence)),
    createdAt: stamp,
    updatedAt: stamp,
    applied: false,
    payload: typeof structuredClone === 'function'
      ? structuredClone(input.payload)
      : JSON.parse(JSON.stringify(input.payload)),
  };
}

export function markCheckpointApplied(
  checkpoint: UmbraCheckpointV4,
  now: Date = new Date(),
): UmbraCheckpointV4 {
  return { ...checkpoint, applied: true, updatedAt: now.toISOString() };
}

export function isCheckpointApplied(
  checkpoints: UmbraCheckpointV4[],
  actionKey: string,
  sequence: number,
): boolean {
  return checkpoints.some(item => item.actionKey === actionKey && item.sequence === sequence && item.applied);
}
