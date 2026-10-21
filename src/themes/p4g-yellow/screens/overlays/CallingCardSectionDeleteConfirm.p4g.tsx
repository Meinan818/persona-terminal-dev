/**
 * 删除倒计时确认（真实 CallingCardSection.tsx ConfirmDialog）：删除「X」？/ 归档的倒计时不可恢复。历史"留下记录"保留不动。/ 删除 · 取消。
 */
import type { OverlayProps } from '@yellow/registry/types';
import { P4Dialog, useToast } from '@yellow/kit';

export default function CallingCardSectionDeleteConfirm({ open, onClose, title = '驾照科目二', onConfirm }: OverlayProps & { title?: string; onConfirm?: () => void }) {
  const toast = useToast();
  return (
    <P4Dialog open={open} onClose={onClose} danger title={`删除「${title}」？`} message={<span className="whitespace-pre-line">{'归档的倒计时不可恢复。\n历史"留下记录"保留不动。'}</span>}
      confirmText="删除" cancelText="取消" onConfirm={() => (onConfirm ? onConfirm() : toast.success('已删除'))} />
  );
}
