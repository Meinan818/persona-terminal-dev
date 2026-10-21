/** 删除成就确认（真实 src/pages/Achievements.tsx · confirmDeleteId）：确认删除 /「确定要删除这个成就吗？此操作不可恢复。」删除 / 取消 */
import type { OverlayProps } from '@yellow/registry/types';
import { P4Dialog } from '@yellow/kit';

export function AchievementDeleteView({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm: () => void }) {
  return <P4Dialog open={open} onClose={onClose} danger speaker="成就" title="确认删除" message="确定要删除这个成就吗？此操作不可恢复。" confirmText="删除" cancelText="取消" onConfirm={onConfirm} />;
}
export default function AchievementsDeleteConfirm({ open, onClose }: OverlayProps) { return <AchievementDeleteView open={open} onClose={onClose} onConfirm={() => undefined} />; }
