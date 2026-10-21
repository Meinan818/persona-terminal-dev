/** 删除任务确认（真实 Todos.tsx ConfirmDialog）：「删除任务」「任务「X」将被永久删除，无法撤销。」删除 / 取消。 */
import type { OverlayProps } from '@pink/registry/types';
import { P3Dialog, useToast } from '@pink/kit';

export default function TodosDeleteConfirm({ open, onClose, title = '晨跑 3 公里', onConfirm }: OverlayProps & { title?: string; onConfirm?: () => void }) {
  const toast = useToast();
  return (
    <P3Dialog open={open} onClose={onClose} tone="danger" title="删除任务" description={`任务「${title}」将被永久删除，无法撤销。`} confirmText="删除" cancelText="取消"
      onConfirm={() => { onClose(); if (onConfirm) onConfirm(); else toast.success('已删除'); }} />
  );
}
