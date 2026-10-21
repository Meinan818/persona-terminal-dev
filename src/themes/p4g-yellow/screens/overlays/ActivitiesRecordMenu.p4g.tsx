/**
 * 记录长按菜单（真实 Activities.tsx + components/ActionSheet）：分享到据点 / 图片 / 删除 / 取消。
 */
import type { OverlayProps } from '@yellow/registry/types';
import { P4ActionSheet, useToast } from '@yellow/kit';

export default function ActivitiesRecordMenu({ open, onClose, title, onAction }: OverlayProps & { title?: string; onAction?: (id: 'share' | 'images' | 'delete') => void }) {
  const toast = useToast();
  return (
    <P4ActionSheet
      open={open}
      onClose={onClose}
      title={title ?? '在图书馆把《雾中小镇》读完了第 4 章…'}
      actions={[
        { id: 'share', label: '分享到据点' },
        { id: 'images', label: '图片' },
        { id: 'delete', label: '删除', danger: true },
      ]}
      onAction={(id) => { onClose(); if (onAction) onAction(id as 'share'); else toast(`（demo）${id === 'share' ? '分享到据点' : id === 'images' ? '图片' : '删除'}`); }}
    />
  );
}
