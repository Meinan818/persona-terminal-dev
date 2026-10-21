/**
 * 记下一个愿望（真实 src/pages/Todos.tsx wishAddOpen SheetModal）：输入「想实现的事…」+ 说明「它不会出现在今日任务里…」+「记下」。
 */
import { useEffect, useState } from 'react';
import type { OverlayProps } from '@yellow/registry/types';
import { P4Button, P4Input, P4Sheet, useToast } from '@yellow/kit';

export default function TodosWishAddSheet({ open, onClose, onAdd }: OverlayProps & { onAdd?: (title: string) => void }) {
  const toast = useToast();
  const [v, setV] = useState('');
  useEffect(() => { if (open) setV(''); }, [open]);
  const add = () => { if (!v.trim()) return; onAdd ? onAdd(v.trim()) : toast.success('记下了'); onClose(); };
  return (
    <P4Sheet open={open} onClose={onClose} title="记下一个愿望" en="NEW WISH" footer={<P4Button block size="lg" disabled={!v.trim()} onClick={add}>记下</P4Button>}>
      <P4Input autoFocus value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder="想实现的事…" aria-label="愿望标题" maxLength={40} />
      <p className="mt-2 text-meta text-p4g-ink-soft">它不会出现在今日任务里。记录时把事挂上去，你就能看见自己在靠近它。</p>
    </P4Sheet>
  );
}
