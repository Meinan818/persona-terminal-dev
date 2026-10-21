/** 孤儿配图询问（真实 OrphanImagesPrompt.tsx）：删除 / 保留 → 结果「配图」好 / 关闭 */
import { useEffect, useState } from 'react';
import type { OverlayProps } from '@yellow/registry/types';
import { P6Dialog } from '@yellow/screens/pkg6/dialog';

export default function OrphanImagesPrompt({ open, onClose, params }: OverlayProps) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(params?.get('step') === 'result' ? '已删掉 7 张找不到记录的配图。' : null);
  useEffect(() => { if (open && params?.get('step') !== 'result') setResult(null); }, [open]); // eslint-disable-line
  if (result) return <P6Dialog open={open} onClose={() => { setResult(null); onClose(); }} speaker="系统" icon="🖼" title="配图" description={result} confirmText="好" cancelText="关闭" onConfirm={() => { setResult(null); onClose(); }} />;
  return (
    <P6Dialog open={open} onClose={onClose} speaker="系统" tone="warning" icon="🖼" busy={busy} busyText="删除中…"
      title="有 7 张配图找不到记录了" description="刚导入的备份里没有这些图对应的记录（共 3.2 MB）。删掉它们吗？保留的话只占空间，不会显示在任何地方。"
      confirmText="删除" cancelText="保留"
      onConfirm={() => { setBusy(true); setTimeout(() => { setBusy(false); setResult('已删掉 7 张找不到记录的配图。'); }, 800); }} />
  );
}
