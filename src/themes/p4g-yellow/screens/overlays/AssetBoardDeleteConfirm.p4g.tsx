/** 删除这件资产？（真实 src/components/ledger/AssetBoard.tsx · ConfirmDialog）资产名 + 删除/取消 */
import type { OverlayProps } from '@yellow/registry/types';
import { P4Dialog } from '@yellow/kit';

export function AssetDeleteConfirmView({ open, onClose, name, onConfirm }: { open: boolean; onClose: () => void; name: string; onConfirm: () => void }) {
  return <P4Dialog open={open} onClose={onClose} danger speaker="资产" title="删除这件资产？" message={name} confirmText="删除" cancelText="取消" onConfirm={onConfirm} />;
}

export default function AssetBoardDeleteConfirm({ open, onClose }: OverlayProps) {
  return <AssetDeleteConfirmView open={open} onClose={onClose} name="索尼相机 A7C" onConfirm={() => undefined} />;
}
