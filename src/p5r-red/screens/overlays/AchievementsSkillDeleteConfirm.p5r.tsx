/**
 * 删除技能确认（真实 Achievements.tsx SkillsTab 内置删除确认：「确认删除 / 确定要删除这个技能吗？此操作不可恢复。」删除 / 取消）。
 */
import type { OverlayProps } from '@/p5r-red/registry/types';
import { P5Confirm } from '@/p5r-red/kit/P5Confirm';
import { toast } from '@/p5r-red/kit/P5Toast';
export function AchievementsSkillDeleteConfirm({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm?: () => void }) {
  return <P5Confirm open={open} onClose={onClose} tone="danger" title="确认删除" description="确定要删除这个技能吗？此操作不可恢复。" confirmText="删除" cancelText="取消" onConfirm={() => { onConfirm?.(); toast('已删除技能'); }} />;
}
export default function AchievementsSkillDeleteConfirmPreview({ open, onClose }: OverlayProps) { return <AchievementsSkillDeleteConfirm open={open} onClose={onClose} />; }
