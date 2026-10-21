/** 删除倒计时确认（真实 CallingCardSection.tsx ConfirmDialog）：删除「X」？/ 归档的倒计时不可恢复。历史保留不动。/ 删除 · 取消。 */
import type { OverlayProps } from '@pink/registry/types';
import { P3Dialog, useToast } from '@pink/kit';

export default function CallingCardSectionDeleteConfirm({ open, onClose, title = '驾照科目二', onConfirm }: OverlayProps & { title?: string; onConfirm?: () => void }) {
  const toast = useToast();
  return (
    <P3Dialog open={open} onClose={onClose} tone="danger" title={`删除「${title}」？`} description={'归档的倒计时不可恢复。\n历史"留下记录"保留不动。'} confirmText="删除" cancelText="取消"
      onConfirm={() => { onClose(); if (onConfirm) onConfirm(); else toast.success('已删除'); }} />
  );
}
