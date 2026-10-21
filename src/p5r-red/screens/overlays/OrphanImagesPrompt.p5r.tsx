/**
 * 孤儿配图询问 OrphanImagesPrompt（真实 src/components/OrphanImagesPrompt.tsx，App 顶层：导入备份后发现配图没有对应记录时）。
 * 迁移自 v3 overlays/a.js §9 openOrphan：ConfirmDialog warning（删除 / 保留，删除忙碌 700ms）→ 结果确认框「已删掉 N 张找不到记录的配图。」。
 *   ?step=done 直达结果框
 */
import { useEffect, useState } from 'react';
import type { OverlayProps } from '@/p5r-red/registry/types';
import { P5Confirm } from '@/p5r-red/kit/P5Confirm';

export default function OrphanImagesPrompt({ open, onClose, params }: OverlayProps) {
  const [step, setStep] = useState<'ask' | 'done' | null>(null);
  useEffect(() => { setStep(open ? (params?.get('step') === 'done' ? 'done' : 'ask') : null); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <P5Confirm open={step === 'ask'} onClose={() => setStep((s) => (s === 'ask' ? null : s))} onCancel={onClose} tone="warning" icon="⚠️" title="有 3 张配图找不到记录了"
        description="刚导入的备份里没有这些图对应的记录（共 1.2 MB）。删掉它们吗？保留的话只占空间，不会显示在任何地方。" confirmText="删除" cancelText="保留" busyMs={700}
        onConfirm={() => setTimeout(() => setStep('done'), 220)} />
      <P5Confirm open={step === 'done'} onClose={() => { setStep(null); onClose(); }} icon="✔" title="配图" description="已删掉 3 张找不到记录的配图。" confirmText="好" cancelText="关闭" />
    </>
  );
}
