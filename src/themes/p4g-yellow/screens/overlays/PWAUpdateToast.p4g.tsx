/** PWA 更新 Toast（真实 src/components/PWAUpdateToast.tsx）：「✦ 有新版本可用」「立即更新」「稍后」（aria「稍后再说」） */
import { useState } from 'react';
import type { OverlayProps } from '@yellow/registry/types';
import { P6Strip } from '@yellow/screens/pkg6/strip';
import { useToast } from '@yellow/kit';

export default function PWAUpdateToast({ open, onClose }: OverlayProps) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <P6Strip show={open} position="bottom" tag="NEW!" tagTone="orange"
      actions={<>
        <button type="button" disabled={busy} onClick={() => { setBusy(true); setTimeout(() => { setBusy(false); onClose(); toast.success('已更新到新版本'); }, 900); }} className="shrink-0 rounded-[3px] bg-p4g-yellow px-2.5 py-1 font-display text-meta font-bold text-p4g-black disabled:opacity-60">{busy ? '更新中…' : '立即更新'}</button>
        <button type="button" aria-label="稍后再说" onClick={onClose} className="shrink-0 font-display text-meta font-bold text-p4g-white/80 underline">稍后</button>
      </>}>
      <span>✦ 有新版本可用</span>
    </P6Strip>
  );
}
