import { useAppStore } from '@/store';
import { isInShadowTime } from '@/constants';
import { createUmbraEnvSnapshot, type UmbraEnv } from './env';
import type { UmbraRuntimeBridge, UmbraBridgeSnapshot } from './runtimeBridge';
import {
  createUmbraCheckpoint,
  isCheckpointApplied,
  markCheckpointApplied,
  UMBRA_SAVE_SCHEMA_VERSION,
  type UmbraCheckpointV4,
  type UmbraSaveV4,
} from './saveV4';
import type { UmbraProfile, UmbraRunRecord } from './state';
import { createBridgeSnapshot } from './runtimeBridge';

const checkpointsOf = (run: UmbraRunRecord | null): UmbraCheckpointV4[] => {
  const raw = run?.payload?.checkpoints;
  return Array.isArray(raw) ? raw as UmbraCheckpointV4[] : [];
};

function saveWithCheckpoint(
  run: UmbraRunRecord | null,
  checkpoints: UmbraCheckpointV4[],
): UmbraRunRecord {
  return {
    id: run?.id ?? 'current',
    schemaVersion: run?.schemaVersion ?? UMBRA_SAVE_SCHEMA_VERSION as any,
    active: true,
    updatedAt: new Date(),
    payload: {
      ...(run?.payload ?? {}),
      checkpoints,
    },
  };
}

export function createDexieUmbraBridge(): UmbraRuntimeBridge {
  const env = (): UmbraEnv => {
    const state = useAppStore.getState();
    return createUmbraEnvSnapshot({
      weather: 'unknown',
      darkHour: isInShadowTime(
        state.settings.battleShadowTimeDays,
        state.settings.battleShadowTimeStart,
        state.settings.battleShadowTimeEnd,
      ),
    });
  };

  const save = (): UmbraSaveV4 => {
    const state = useAppStore.getState();
    return {
      schemaVersion: UMBRA_SAVE_SCHEMA_VERSION,
      profile: state.umbraProfile,
      run: state.umbraRun,
      checkpoints: checkpointsOf(state.umbraRun),
    };
  };

  return {
    getEnv: env,
    getSave: save,
    async commitRun(checkpoint: UmbraCheckpointV4): Promise<void> {
      const state = useAppStore.getState();
      const existing = checkpointsOf(state.umbraRun);
      const next = existing.some(item => item.id === checkpoint.id)
        ? existing.map(item => item.id === checkpoint.id ? markCheckpointApplied(checkpoint) : item)
        : [...existing, markCheckpointApplied(checkpoint)];
      await state.saveUmbraRun(saveWithCheckpoint(state.umbraRun, next));
    },
    async spendHeartPower(cost: number, checkpoint: UmbraCheckpointV4): Promise<boolean> {
      const state = useAppStore.getState();
      const profile = state.umbraProfile as UmbraProfile | null;
      if (!profile || profile.economy.sp < cost) return false;
      const applied = markCheckpointApplied(checkpoint);
      await state.saveUmbraProfile({
        ...profile,
        updatedAt: new Date(),
        economy: { ...profile.economy, sp: profile.economy.sp - cost },
      });
      const run = state.umbraRun;
      const existing = checkpointsOf(run);
      const next = existing.some(item => item.id === applied.id)
        ? existing.map(item => item.id === applied.id ? applied : item)
        : [...existing, applied];
      await state.saveUmbraRun(saveWithCheckpoint(run, next));
      return true;
    },
    notifyError(checkpointId: string, error: string): void {
      console.warn(`[umbra] ${checkpointId}: ${error}`);
    },
    exit(): void {
      useAppStore.getState().setCurrentPage('dashboard');
    },
  };
}

export function createDexieBridgeSnapshot(): UmbraBridgeSnapshot {
  return createBridgeSnapshot(
    createDexieUmbraBridge().getEnv(),
    createDexieUmbraBridge().getSave(),
  );
}

export function checkpointForRun(
  run: UmbraRunRecord | null,
  input: { actionKey: string; sequence: number; payload: unknown },
): UmbraCheckpointV4 {
  return createUmbraCheckpoint({
    runId: run?.id ?? 'current',
    actionKey: input.actionKey,
    sequence: input.sequence,
    payload: input.payload,
  });
}

export function hasAppliedCheckpoint(
  run: UmbraRunRecord | null,
  actionKey: string,
  sequence: number,
): boolean {
  return isCheckpointApplied(checkpointsOf(run), actionKey, sequence);
}
