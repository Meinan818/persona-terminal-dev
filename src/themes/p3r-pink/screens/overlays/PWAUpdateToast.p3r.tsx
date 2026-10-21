/** PWA 更新 Toast（真实 src/components/PWAUpdateToast.tsx）：「✦ 有新版本可用」「立即更新」「稍后」（aria「稍后再说」） */
import { useState } from 'react';
import type { OverlayProps } from '@pink/registry/types';
import { P6Strip } from '@pink/screens/pkg6/strip';
import { useToast } from '@pink/kit';

export default function PWAUpdateToast({ open, onClose }: OverlayProps) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <P6Strip show={open} position="bottom" tag="NEW!" tagTone="orange"
      actions={<>
        <button type="button" disabled={busy} onClick={() => { setBusy(true); setTimeout(() => { setBusy(false); onClose(); toast.success('已更新到新版本'); }, 900); }} className="shrink-0 rounded-none bg-p3r-rose px-2.5 py-1 font-heavy text-meta font-bold text-p3r-on-rose disabled:opacity-60">{busy ? '更新中…' : '立即更新'}</button>
        <button type="button" aria-label="稍后再说" onClick={onClose} className="shrink-0 font-heavy text-meta font-bold text-p3r-on-ink/80 underline">稍后</button>
      </>}>
      <span>✦ 有新版本可用</span>
    </P6Strip>
  );
}
