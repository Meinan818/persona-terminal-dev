/**
 * 记事本 · 删除确认（真实 NavigatorNotebook.tsx 内两个 ConfirmDialog，tone=danger；P1-17 新补）。
 *   memory：「删除这条记忆？ / 它会忘掉这件事。」删除 / 取消
 *   promise：「删掉这个约定？ / 删掉之后它就不会再问你这件事了。」删掉 / 取消
 * 独立预览：#/overlay/assistant-notebook-confirm?variant=memory|promise
 */
import type { OverlayProps } from '@/p5r-red/registry/types';
import { P5Confirm } from '@/p5r-red/kit/P5Confirm';
import { toast } from '@/p5r-red/kit/P5Toast';

export function NotebookDeleteConfirm({ kind, open, onClose, onConfirm }: { kind: 'memory' | 'promise'; open: boolean; onClose: () => void; onConfirm: () => void }) {
  return kind === 'promise'
    ? <P5Confirm open={open} onClose={onClose} tone="danger" title="删掉这个约定？" description="删掉之后它就不会再问你这件事了。" confirmText="删掉" cancelText="取消" onConfirm={onConfirm} />
    : <P5Confirm open={open} onClose={onClose} tone="danger" title="删除这条记忆？" description="它会忘掉这件事。" confirmText="删除" cancelText="取消" onConfirm={onConfirm} />;
}

export default function NavigatorNotebookConfirm({ open, onClose, params }: OverlayProps) {
  const kind = params?.get('variant') === 'promise' ? 'promise' : 'memory';
  return <NotebookDeleteConfirm kind={kind} open={open} onClose={onClose} onConfirm={() => toast(kind === 'promise' ? '约定已删掉' : '记忆已删除')} />;
}
