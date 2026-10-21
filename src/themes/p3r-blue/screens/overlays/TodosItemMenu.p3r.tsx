/**
 * 任务长按菜单（真实 src/pages/Todos.tsx ActionSheet）：
 * 普通：编辑 / 归档 / 删除 / 取消；约定或作战待办：编辑（属性 / 分值）/ 打开这个约定 · 打开这场作战 · 打开这个目标 / 删除 / 取消。?variant=pact|op
 */
import type { Todo } from '@/types';
import type { OverlayProps } from '@blue/registry/types';
import { P3ActionSheet, useToast } from '@blue/kit';
import { navigate } from '@blue/shell/shellBus';

export type TodoMenuAction = 'edit' | 'archive' | 'delete' | 'open';
export default function TodosItemMenu({ open, onClose, params, todo, onAction }: OverlayProps & { todo?: Todo | null; onAction?: (a: TodoMenuAction) => void }) {
  const toast = useToast();
  const v = params?.get('variant');
  const pact = todo ? !!todo.pact : v === 'pact';
  const op = todo ? todo.orgOp : v === 'op' ? { kind: 'big' as const, orgName: '月光馆探索部' } : undefined;
  const linked = pact || !!op;
  const actions = linked
    ? [{ id: 'edit', label: '编辑（属性 / 分值）' }, { id: 'open', label: op ? (op.kind === 'big' ? '打开这场作战' : '打开这个目标') : '打开这个约定' }, { id: 'delete', label: '删除', tone: 'danger' as const }]
    : [{ id: 'edit', label: '编辑' }, { id: 'archive', label: '归档' }, { id: 'delete', label: '删除', tone: 'danger' as const }];
  return (
    <P3ActionSheet open={open} onClose={onClose} title={todo?.title ?? (linked ? '和顺平约好一起练习投篮' : '晨跑 3 公里')} description={linked ? (op ? '组织作战派下来的任务：标题与截止由作战决定' : '与同伴的约定：标题与节奏由约定决定') : undefined} actions={actions}
      onSelect={(id) => {
        if (id === 'open') { navigate(op ? 'hideout' : 'cooperation'); return; }
        if (onAction) onAction(id as TodoMenuAction); else toast(actions.find((a) => a.id === id)?.label ?? '');
      }} />
  );
}
