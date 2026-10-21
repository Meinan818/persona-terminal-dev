/** 记下一个愿望（真实 Todos.tsx wishAddOpen SheetModal）：输入「想实现的事…」+ 说明「它不会出现在今日任务里…」+「记下」。 */
import { useEffect, useState } from 'react';
import type { OverlayProps } from '@blue/registry/types';
import { P3Button, P3Input, P3Sheet, useToast, P3R } from '@blue/kit';

export default function TodosWishAddSheet({ open, onClose, onAdd }: OverlayProps & { onAdd?: (title: string) => void }) {
  const toast = useToast();
  const [v, setV] = useState('');
  useEffect(() => { if (open) setV(''); }, [open]);
  const add = () => { if (!v.trim()) return; if (onAdd) onAdd(v.trim()); else toast.success('记下了'); onClose(); };
  return (
    <P3Sheet open={open} onClose={onClose} title="记下一个愿望" en="NEW WISH" footer={<P3Button block size="lg" corner disabled={!v.trim()} onClick={add}>记下</P3Button>}>
      <P3Input autoFocus value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder="想实现的事…" aria-label="愿望标题" maxLength={40} />
      <p className="mt-2 text-[12px] leading-relaxed" style={{ color: P3R.grey }}>它不会出现在今日任务里。记录时把事挂上去，你就能看见自己在靠近它。</p>
    </P3Sheet>
  );
}
