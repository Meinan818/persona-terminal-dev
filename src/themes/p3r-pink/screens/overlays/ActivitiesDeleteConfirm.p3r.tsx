/** 确认删除这条记录？（真实 Activities.tsx + ConfirmDialog 三按钮 → p3 系统框 + 光标楔）：取消 / 仅删除条目 / 删除并回档。 */
import type { OverlayProps } from '@pink/registry/types';
import { P3Dialog, useToast } from '@pink/kit';

export default function ActivitiesDeleteConfirm({ open, onClose, description, onDelete }: OverlayProps & { description?: string; onDelete?: (rollback: boolean) => void }) {
  const toast = useToast();
  const d = description ?? '在图书馆把《雾中小镇》读完了第 4 章，顺手做了笔记';
  const short = d.length > 40 ? `${d.slice(0, 40)}…` : d;
  const done = (rollback: boolean) => { onClose(); if (onDelete) onDelete(rollback); else toast.success(rollback ? '已删除并回档' : '已删除条目'); };
  return (
    <P3Dialog open={open} onClose={onClose} tone="danger" variant="system" title="确认删除这条记录？"
      description={`「${short}」\n「删除并回档」会同时收回这条记录获得的点数；「仅删除条目」只移除记录本身。`}
      actions={[{ label: '取消', onClick: onClose }, { label: '仅删除条目', tone: 'danger', onClick: () => done(false) }, { label: '删除并回档', tone: 'danger', onClick: () => done(true) }]} />
  );
}
