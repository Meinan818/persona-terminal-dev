/** 删除这件资产？（真实 src/components/ledger/AssetBoard.tsx · ConfirmDialog tone=danger）资产名 + 删除 / 取消 → P3R 系统框 */
import type { OverlayProps } from '@blue/registry/types';
import { P3Dialog } from '@blue/kit';

export function AssetDeleteConfirmView({ open, onClose, name, onConfirm }: { open: boolean; onClose: () => void; name: string; onConfirm: () => void }) {
  return <P3Dialog open={open} onClose={onClose} tone="danger" variant="system" title="删除这件资产？" description={`${name}\n连同它的附加费用一起删除，流水里的那一笔会保留。`} confirmText="删除" cancelText="取消" onConfirm={() => { onConfirm(); onClose(); }} />;
}

export default function AssetBoardDeleteConfirm({ open, onClose }: OverlayProps) {
  return <AssetDeleteConfirmView open={open} onClose={onClose} name="索尼相机 A7C" onConfirm={() => undefined} />;
}
