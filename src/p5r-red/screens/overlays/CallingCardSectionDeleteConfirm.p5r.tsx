/**
 * 删除倒计时确认（真实 CallingCardSection.tsx 的 ConfirmDialog，P0-07 / P1-06）：tone=danger，
 * 标题「删除「X」？」，描述「归档的倒计时不可恢复。\n历史"留下记录"保留不动。」，确认「删除」/ 取消「取消」。
 * pkg5 React 版。调用方：pkg5 页面用 named export；pkg4 registry 'actions-cc-delete'（?title=）用 default export。
 */
import type { OverlayProps } from '@/p5r-red/registry/types';
import { P5Confirm } from '@/p5r-red/kit/P5Confirm';
import { toast } from '@/p5r-red/kit/P5Toast';
export function CallingCardDeleteConfirm({ open, onClose, title, onConfirm }: { open: boolean; onClose: () => void; title: string; onConfirm?: () => void }) {
  return <P5Confirm open={open} onClose={onClose} tone="danger" title={`删除「${title}」？`} description={'归档的倒计时不可恢复。\n历史"留下记录"保留不动。'} confirmText="删除" cancelText="取消" onConfirm={() => { onConfirm?.(); toast('已删除'); }} />;
}
export default function CallingCardSectionDeleteConfirm({ open, onClose, params }: OverlayProps) {
  return <CallingCardDeleteConfirm open={open} onClose={onClose} title={params?.get('title') ?? '期末考试全科通过'} />;
}
