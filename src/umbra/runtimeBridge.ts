import type { UmbraEnv } from './env';
import type { UmbraCheckpointV4, UmbraSaveV4 } from './saveV4';

export interface UmbraRuntimeBridge {
  getEnv(): UmbraEnv;
  getSave(): UmbraSaveV4;
  commitRun(checkpoint: UmbraCheckpointV4): Promise<void>;
  spendHeartPower(cost: number, checkpoint: UmbraCheckpointV4): Promise<boolean>;
  notifyError(checkpointId: string, error: string): void;
  exit(): void;
}

export interface UmbraBridgeSnapshot {
  schemaVersion: UmbraSaveV4['schemaVersion'];
  env: UmbraEnv;
  profile: unknown;
  run: unknown;
  checkpoints: UmbraCheckpointV4[];
}

export function createBridgeSnapshot(
  env: UmbraEnv,
  save: UmbraSaveV4,
): UmbraBridgeSnapshot {
  return {
    schemaVersion: save.schemaVersion,
    env: { ...env },
    profile: save.profile,
    run: save.run,
    checkpoints: save.checkpoints.map(item => ({ ...item })),
  };
}
