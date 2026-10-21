/** 记事本 · 删除确认（真实 NavigatorNotebook.tsx 两个 ConfirmDialog）。?variant=memo|promise */
import { useState } from 'react';
import type { OverlayProps } from '@yellow/registry/types';
import { P6Dialog } from '@yellow/screens/pkg6/dialog';
import { P4Button, useToast } from '@yellow/kit';

export function NotebookDeleteDialog({ kind, open, onClose, onConfirm }: { kind: 'memo' | 'promise'; open: boolean; onClose: () => void; onConfirm: () => void }) {
  return kind === 'memo'
    ? <P6Dialog open={open} onClose={onClose} tone="danger" speaker="记事本" title="删除这条记忆？" description="它会忘掉这件事。" confirmText="删除" cancelText="取消" onConfirm={() => { onConfirm(); onClose(); }} />
    : <P6Dialog open={open} onClose={onClose} tone="danger" speaker="记事本" title="删掉这个约定？" description="删掉之后它就不会再问你这件事了。" confirmText="删掉" cancelText="取消" onConfirm={() => { onConfirm(); onClose(); }} />;
}

export default function NavigatorNotebookConfirm({ open, onClose, params }: OverlayProps) {
  const toast = useToast();
  const [kind, setKind] = useState<'memo' | 'promise'>(params?.get('variant') === 'promise' ? 'promise' : 'memo');
  return (
    <>
      <div className="fixed inset-x-0 bottom-28 z-[1] flex justify-center gap-2">
        <P4Button size="sm" variant={kind === 'memo' ? 'black' : 'secondary'} onClick={() => setKind('memo')}>删除记忆</P4Button>
        <P4Button size="sm" variant={kind === 'promise' ? 'black' : 'secondary'} onClick={() => setKind('promise')}>删除约定</P4Button>
      </div>
      <NotebookDeleteDialog kind={kind} open={open} onClose={onClose} onConfirm={() => toast('已删除', { duration: 1000 })} />
    </>
  );
}
