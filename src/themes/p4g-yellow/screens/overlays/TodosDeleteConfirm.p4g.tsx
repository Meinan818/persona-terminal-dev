/**
 * 删除任务确认（真实 src/pages/Todos.tsx ConfirmDialog）：「删除任务」「任务「X」将被永久删除，无法撤销。」删除 / 取消。
 */
import type { OverlayProps } from '@yellow/registry/types';
import { P4Dialog, useToast } from '@yellow/kit';

export default function TodosDeleteConfirm({ open, onClose, title = '晨跑 3 公里', onConfirm }: OverlayProps & { title?: string; onConfirm?: () => void }) {
  const toast = useToast();
  return (
    <P4Dialog open={open} onClose={onClose} danger title="删除任务" message={`任务「${title}」将被永久删除，无法撤销。`} confirmText="删除" cancelText="取消"
      onConfirm={() => (onConfirm ? onConfirm() : toast.success('已删除'))} />
  );
}
