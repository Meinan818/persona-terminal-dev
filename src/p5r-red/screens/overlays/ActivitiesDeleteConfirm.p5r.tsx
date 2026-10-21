/**
 * 确认删除这条记录？（真实 Activities.tsx ConfirmDialog tone=danger，三选项，P1-02）：取消（恒在左）/ 仅删除条目 / 删除并回档（危险，恒在右）。
 * 描述：「X」+「删除并回档」会同时收回这条记录获得的点数；「仅删除条目」只移除记录本身。
 */
import type { OverlayProps } from '@/p5r-red/registry/types';
import { P5Confirm } from '@/p5r-red/kit/P5Confirm';
import { toast } from '@/p5r-red/kit/P5Toast';

const trunc = (t: string, n: number) => (t.length > n ? `${t.slice(0, n)}…` : t);
export function ActivitiesDeleteConfirm({ open, onClose, desc, onDelete }: { open: boolean; onClose: () => void; desc: string; onDelete?: (rollback: boolean) => void }) {
  return (
    <P5Confirm open={open} onClose={onClose} tone="danger" title="确认删除这条记录？"
      description={`「${trunc(desc, 40)}」\n「删除并回档」会同时收回这条记录获得的点数；「仅删除条目」只移除记录本身。`}
      actions={[
        { label: '取消', onClick: () => {} },
        { label: '仅删除条目', onClick: () => { onDelete?.(false); toast('已删除这条记录'); } },
        { label: '删除并回档', tone: 'danger', onClick: () => { onDelete?.(true); toast('已删除，并收回了这条记录的点数'); } },
      ]} />
  );
}
export default function ActivitiesDeleteConfirmPreview({ open, onClose }: OverlayProps) {
  return <ActivitiesDeleteConfirm open={open} onClose={onClose} desc="图书馆自习三小时，把线代第四章刷完" />;
}
