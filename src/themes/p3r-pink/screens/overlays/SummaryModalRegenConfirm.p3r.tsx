/** 重新生成？（真实 SummaryModal.tsx 内 ConfirmDialog）：「这份草稿还没归档，重新生成会把它丢掉。」「丢弃并重新生成」/ 取消。 */
import type { OverlayProps } from '@pink/registry/types';
import { P3Dialog, useToast } from '@pink/kit';

export default function SummaryModalRegenConfirm({ open, onClose, onConfirm }: OverlayProps & { onConfirm?: () => void }) {
  const toast = useToast();
  return (
    <P3Dialog open={open} onClose={onClose} tone="warning" title="重新生成？" description="这份草稿还没归档，重新生成会把它丢掉。" confirmText="丢弃并重新生成" cancelText="取消"
      onConfirm={() => { onClose(); if (onConfirm) onConfirm(); else toast('已丢弃草稿，重新生成中…'); }} />
  );
}
