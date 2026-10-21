/**
 * 重新生成？（真实 SummaryModal.tsx 内 ConfirmDialog）：「这份草稿还没归档，重新生成会把它丢掉。」「丢弃并重新生成」/ 取消。
 */
import type { OverlayProps } from '@yellow/registry/types';
import { P4Dialog, useToast } from '@yellow/kit';

export default function SummaryModalRegenConfirm({ open, onClose, onConfirm }: OverlayProps & { onConfirm?: () => void }) {
  const toast = useToast();
  return (
    <P4Dialog open={open} onClose={onClose} danger title="重新生成？" message="这份草稿还没归档，重新生成会把它丢掉。"
      confirmText="丢弃并重新生成" cancelText="取消" onConfirm={() => (onConfirm ? onConfirm() : toast('已丢弃草稿，重新生成中…'))} />
  );
}
