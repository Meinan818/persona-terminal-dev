/**
 * 删除成就确认（真实 Achievements.tsx 内置删除确认：「确认删除 / 确定要删除这个成就吗？此操作不可恢复。」删除 / 取消）。红频道 = kit P5Confirm（danger）。
 */
import type { OverlayProps } from '@/p5r-red/registry/types';
import { P5Confirm } from '@/p5r-red/kit/P5Confirm';
import { toast } from '@/p5r-red/kit/P5Toast';
export function AchievementsDeleteConfirm({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm?: () => void }) {
  return <P5Confirm open={open} onClose={onClose} tone="danger" title="确认删除" description="确定要删除这个成就吗？此操作不可恢复。" confirmText="删除" cancelText="取消" onConfirm={() => { onConfirm?.(); toast('已删除成就'); }} />;
}
export default function AchievementsDeleteConfirmPreview({ open, onClose }: OverlayProps) { return <AchievementsDeleteConfirm open={open} onClose={onClose} />; }
