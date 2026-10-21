/**
 * 确认删除这条记录？（真实 Activities.tsx + ConfirmDialog 三按钮）：取消 / 仅删除条目 / 删除并回档。
 */
import type { OverlayProps } from '@yellow/registry/types';
import { P4ChoiceList, P4Dialog, useToast } from '@yellow/kit';

export default function ActivitiesDeleteConfirm({ open, onClose, description, onDelete }: OverlayProps & { description?: string; onDelete?: (rollback: boolean) => void }) {
  const toast = useToast();
  const d = description ?? '在图书馆把《雾中小镇》读完了第 4 章，顺手做了笔记';
  const short = d.length > 40 ? `${d.slice(0, 40)}…` : d;
  const done = (rollback: boolean) => { onClose(); if (onDelete) onDelete(rollback); else toast.success(rollback ? '已删除并回档' : '已删除条目'); };
  return (
    <P4Dialog open={open} onClose={onClose} danger title="确认删除这条记录？" actions="none" speaker="SYSTEM"
      message={<span className="whitespace-pre-line">{`「${short}」\n「删除并回档」会同时收回这条记录获得的点数；「仅删除条目」只移除记录本身。`}</span>}>
      <div className="border-t-2 border-dashed border-white/15 pt-2">
        <P4ChoiceList defaultIndex={0} onSelect={(id) => (id === 'cancel' ? onClose() : done(id === 'rollback'))}
          items={[{ id: 'cancel', label: '取消' }, { id: 'only', label: '仅删除条目', danger: true }, { id: 'rollback', label: '删除并回档', danger: true }]} />
      </div>
    </P4Dialog>
  );
}
