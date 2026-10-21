/** 删除人格确认（真实 NavigatorSettings.tsx ConfirmDialog）：「删除人格「X」？」「它的历史会话仍会保留。」删除 / 取消 */
import type { OverlayProps } from '@blue/registry/types';
import { P6Dialog } from '@blue/screens/pkg6/dialog';
import { useToast } from '@blue/kit';

export function PersonaDeleteDialog({ open, onClose, label, onConfirm }: { open: boolean; onClose: () => void; label: string; onConfirm: () => void }) {
  return <P6Dialog open={open} onClose={onClose} tone="danger" speaker="助手" title={`删除人格「${label}」？`} description="它的历史会话仍会保留。" confirmText="删除" cancelText="取消" onConfirm={() => { onConfirm(); onClose(); }} />;
}
export default function NavigatorSettingsPersonaDeleteConfirm({ open, onClose, params }: OverlayProps) {
  const toast = useToast();
  return <PersonaDeleteDialog open={open} onClose={onClose} label={params?.get('name') ?? '白手套'} onConfirm={() => toast('已删除人格', { duration: 1200 })} />;
}
