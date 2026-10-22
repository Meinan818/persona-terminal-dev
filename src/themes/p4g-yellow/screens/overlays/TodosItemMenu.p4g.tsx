/**
 * 任务长按菜单（真实 src/pages/Todos.tsx ActionSheet）：
 * 普通：编辑 / 归档 / 删除 / 取消；约定或作战待办：编辑（属性 / 分值）/ 打开这个约定 · 打开这场作战 · 打开这个目标 / 删除 / 取消。?variant=pact|op
 */
import type { Todo } from '@real/types';
import type { OverlayProps } from '@yellow/registry/types';
import { P4ActionSheet, useToast } from '@yellow/kit';
import { navigate } from '@yellow/shell/shellBus';

export type TodoMenuAction = 'edit' | 'archive' | 'delete' | 'open';
export default function TodosItemMenu({ open, onClose, params, todo, onAction }: OverlayProps & { todo?: Todo | null; onAction?: (a: TodoMenuAction) => void }) {
  const toast = useToast();
  const v = params?.get('variant');
  const pact = todo ? !!todo.pact : v === 'pact';
  const op = todo ? todo.orgOp : v === 'op' ? { kind: 'big' as const, orgName: '八十稻羽探索部' } : undefined;
  const linked = pact || !!op;
  const actions = linked
    ? [{ id: 'edit', label: '编辑（属性 / 分值）' }, { id: 'open', label: op ? (op.kind === 'big' ? '打开这场作战' : '打开这个目标') : '打开这个约定' }, { id: 'delete', label: '删除', danger: true }]
    : [{ id: 'edit', label: '编辑' }, { id: 'archive', label: '归档' }, { id: 'delete', label: '删除', danger: true }];
  return (
    <P4ActionSheet open={open} onClose={onClose} title={todo?.title ?? (linked ? '和堂岛约好一起练习投篮' : '晨跑 3 公里')} actions={actions}
      onAction={(id) => {
        onClose();
        if (id === 'open') { navigate(op ? 'hideout' : 'cooperation'); return; }
        onAction ? onAction(id as TodoMenuAction) : toast(`（demo）${actions.find((a) => a.id === id)?.label}`);
      }} />
  );
}
