/**
 * ActionSheet 基座（真实 src/components/ActionSheet.tsx）：长按上下文菜单统一承载。
 * 标题（可选）、动作列表（可带图标；danger 恒红且恒排最末）、点任意动作自动关闭、「取消」常驻底部。
 * P3R：子菜单斜卡 + 光标楔选项（↑↓ / Enter）。?variant=notitle
 */
import { useState } from 'react';
import type { OverlayProps } from '@blue/registry/types';
import { P3ActionSheet, P3Button, IconEdit, IconTrash, IconStar, useToast } from '@blue/kit';

export interface P6Action { id: string; label: string; icon?: React.ReactNode; tone?: 'default' | 'danger' }
/** 同真实协议：danger 兜底排到最末 */
export function ActionSheetP4({ open, onClose, title, actions, onAction }: { open: boolean; onClose: () => void; title?: string; actions: P6Action[]; onAction: (id: string) => void }) {
  const sorted = [...actions].sort((a, b) => Number(a.tone === 'danger') - Number(b.tone === 'danger'));
  return <P3ActionSheet open={open} onClose={onClose} title={title} actions={sorted.map((a) => ({ id: a.id, label: a.label, icon: a.icon, tone: a.tone }))} onSelect={onAction} cancelText="取消" />;
}

export default function ActionSheet({ open, onClose, params }: OverlayProps) {
  const toast = useToast();
  const [noTitle, setNoTitle] = useState(params?.get('variant') === 'notitle');
  return (
    <>
      <div className="fixed inset-x-0 bottom-28 z-[1] flex justify-center"><P3Button size="sm" tone="soft" onClick={() => setNoTitle((v) => !v)}>{noTitle ? '带标题' : '无标题'}</P3Button></div>
      <ActionSheetP4 open={open} onClose={onClose} title={noTitle ? undefined : '图书馆看书两小时'}
        actions={[{ id: 'del', label: '删除', icon: <IconTrash size={16} />, tone: 'danger' }, { id: 'edit', label: '编辑', icon: <IconEdit size={16} /> }, { id: 'star', label: '标记为重要事件', icon: <IconStar size={16} /> }]}
        onAction={(id) => toast(id === 'del' ? '已删除' : id === 'edit' ? '打开编辑' : '已标记为重要事件', { duration: 1200 })} />
    </>
  );
}
