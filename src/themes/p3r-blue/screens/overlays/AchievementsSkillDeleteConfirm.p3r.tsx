/** 删除技能确认（真实 src/pages/Achievements.tsx · 内置删除确认）：确认删除 /「确定要删除这个技能吗？此操作不可恢复。」删除 / 取消 → P3R 系统框 */
import type { OverlayProps } from '@blue/registry/types';
import { P3Dialog } from '@blue/kit';

export function SkillDeleteView({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm: () => void }) {
  return <P3Dialog open={open} onClose={onClose} tone="danger" variant="system" title="确认删除" description="确定要删除这个技能吗？此操作不可恢复。" confirmText="删除" cancelText="取消" onConfirm={() => { onConfirm(); onClose(); }} />;
}
export default function AchievementsSkillDeleteConfirm({ open, onClose }: OverlayProps) { return <SkillDeleteView open={open} onClose={onClose} onConfirm={() => undefined} />; }
