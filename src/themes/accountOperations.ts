import { deleteAccount, logout } from '@/services/auth';
import {
  computeSyncDiff,
  pullAll,
  pushAll,
  syncOnLogin,
  SyncConflictError,
  type LoginSyncResult,
} from '@/services/sync';
import { useCloudStore } from '@/store/cloud';

export type AccountPushResult = 'pushed' | 'diff' | 'conflict';

/**
 * Shared account actions for the four theme shells.
 *
 * This layer only routes UI intent into the existing auth/sync services and
 * cloud store. It does not own credentials, sync state, or cloud data.
 */
export const accountOps = {
  async push(): Promise<AccountPushResult> {
    const diff = await computeSyncDiff();
    if (!diff) throw new Error('未登录，无法同步');
    if (diff.cloudExceedsLocal) {
      useCloudStore.getState().setDiffWarning(diff);
      return 'diff';
    }

    try {
      await pushAll();
      return 'pushed';
    } catch (error) {
      if (error instanceof SyncConflictError) {
        useCloudStore.getState().openMerge(error.tables);
        return 'conflict';
      }
      throw error;
    }
  },

  pull(): Promise<void> {
    return pullAll();
  },

  async afterLogin(): Promise<LoginSyncResult> {
    const result = await syncOnLogin();
    if (result === 'conflict') {
      useCloudStore.getState().setConflictPending(true);
    }
    return result;
  },

  logout(): void {
    logout();
  },

  deleteAccount(): Promise<void> {
    return deleteAccount();
  },
};
