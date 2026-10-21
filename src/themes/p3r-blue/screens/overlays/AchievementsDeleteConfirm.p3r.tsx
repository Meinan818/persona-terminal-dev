/** 删除成就确认（真实 src/pages/Achievements.tsx · confirmDeleteId）：确认删除 /「确定要删除这个成就吗？此操作不可恢复。」删除 / 取消 → P3R 系统框 */
import type { OverlayProps } from '@blue/registry/types';
import { P3Dialog } from '@blue/kit';

export function AchievementDeleteView({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm: () => void }) {
  return <P3Dialog open={open} onClose={onClose} tone="danger" variant="system" title="确认删除" description="确定要删除这个成就吗？此操作不可恢复。" confirmText="删除" cancelText="取消" onConfirm={() => { onConfirm(); onClose(); }} />;
}
export default function AchievementsDeleteConfirm({ open, onClose }: OverlayProps) { return <AchievementDeleteView open={open} onClose={onClose} onConfirm={() => undefined} />; }
