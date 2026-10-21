/** 删除曲目确认（真实 BgmSettings.tsx 的 window.confirm(`删除「X」？`)，demo 用 P3R 对话框表现：确定 / 取消） */
import type { OverlayProps } from '@pink/registry/types';
import { P6Dialog } from '@pink/screens/pkg6/dialog';
import { useToast } from '@pink/kit';

export function BgmDeleteDialog({ open, onClose, name, onConfirm }: { open: boolean; onClose: () => void; name: string; onConfirm: () => void }) {
  return <P6Dialog open={open} onClose={onClose} speaker="系统" tone="danger" icon="♪" title={`删除「${name}」？`} confirmText="确定" cancelText="取消" onConfirm={() => { onConfirm(); onClose(); }} />;
}

export default function BgmSettingsDeleteConfirm({ open, onClose, params }: OverlayProps) {
  const toast = useToast();
  return <BgmDeleteDialog open={open} onClose={onClose} name={params?.get('name') ?? 'Your Affection (Reincarnation)'} onConfirm={() => toast('已删除', { duration: 1200 })} />;
}
