/** 删除技能确认（真实 src/pages/Achievements.tsx · 内置删除确认）：确认删除 /「确定要删除这个技能吗？此操作不可恢复。」删除 / 取消 */
import type { OverlayProps } from '@yellow/registry/types';
import { P4Dialog } from '@yellow/kit';

export function SkillDeleteView({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm: () => void }) {
  return <P4Dialog open={open} onClose={onClose} danger speaker="技能" title="确认删除" message="确定要删除这个技能吗？此操作不可恢复。" confirmText="删除" cancelText="取消" onConfirm={onConfirm} />;
}
export default function AchievementsSkillDeleteConfirm({ open, onClose }: OverlayProps) { return <SkillDeleteView open={open} onClose={onClose} onConfirm={() => undefined} />; }
