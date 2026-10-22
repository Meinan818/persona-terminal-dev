import { ConflictDialog } from '@/components/auth/ConflictDialog';
import { SyncDiffDialog } from '@/components/auth/SyncDiffDialog';
import { useCloudStore } from '@/store/cloud';
import { resolveConflictKeepLocal, resolveConflictKeepCloud, acceptDiffKeepLocal, acceptDiffKeepCloud } from '@/services/sync';

/** 订阅 cloudStore.conflictPending 全局呈现冲突解决弹窗 */
export function GlobalConflictDialog() {
  const pending = useCloudStore((s) => s.conflictPending);
  const setPending = useCloudStore((s) => s.setConflictPending);
  return (
    <ConflictDialog
      isOpen={pending}
      onClose={() => setPending(false)}
      onKeepLocal={async () => {
        await resolveConflictKeepLocal();
        setPending(false);
      }}
      onKeepCloud={async () => {
        await resolveConflictKeepCloud();
        setPending(false);
      }}
    />
  );
}

/** 订阅 cloudStore.diffWarning 全局呈现条目差异提示 */
export function GlobalDiffDialog() {
  const diff = useCloudStore((s) => s.diffWarning);
  const setDiff = useCloudStore((s) => s.setDiffWarning);
  return (
    <SyncDiffDialog
      isOpen={!!diff}
      diff={diff}
      onKeepLocal={async () => {
        await acceptDiffKeepLocal();
        setDiff(null);
      }}
      onKeepCloud={async () => {
        await acceptDiffKeepCloud();
        setDiff(null);
      }}
      onDismiss={() => setDiff(null)}
    />
  );
}
