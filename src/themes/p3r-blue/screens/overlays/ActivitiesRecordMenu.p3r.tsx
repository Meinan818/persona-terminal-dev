/** 记录长按菜单（真实 Activities.tsx + components/ActionSheet，p3 = 暂停菜单子项 + 光标楔）：分享到据点 / 图片 / 删除 / 取消。 */
import type { OverlayProps } from '@blue/registry/types';
import { P3ActionSheet, useToast } from '@blue/kit';

export default function ActivitiesRecordMenu({ open, onClose, title, onAction }: OverlayProps & { title?: string; onAction?: (id: 'share' | 'images' | 'delete') => void }) {
  const toast = useToast();
  return (
    <P3ActionSheet open={open} onClose={onClose} title={title ?? '在图书馆把《雾中小镇》读完了第 4 章…'}
      actions={[{ id: 'share', label: '分享到据点', desc: '发到组织公告板，今天每个据点最多 3 条' }, { id: 'images', label: '图片', desc: '查看 / 添加 / 删除这条记录的配图' }, { id: 'delete', label: '删除', tone: 'danger' }]}
      onSelect={(id) => { if (onAction) onAction(id as 'share'); else toast(id === 'share' ? '打开「分享到据点」' : id === 'images' ? '打开「记录图片」' : '打开删除确认'); }} />
  );
}
