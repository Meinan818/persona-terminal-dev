/**
 * 同步状态浮标（真实 src/components/auth/SyncStatusBadge.tsx）：同步进行 / 完成 / 失败时自动出现、成功后自动淡出。
 * 「拉取中…/上传中…/同步中…」「已从云端拉取/已同步到云端」「登录已失效 · 本机数据仍在/同步失败」。?state=pull|push|sync|pulled|pushed|expired|failed
 */
import { useEffect, useState } from 'react';
import type { OverlayProps } from '@pink/registry/types';
import { P6Strip } from '@pink/screens/pkg6/strip';
import { P3Button } from '@pink/kit';

const STATES = {
  pull: { tag: 'SYNC', tone: 'yellow', label: '拉取中…', spin: true }, push: { tag: 'SYNC', tone: 'yellow', label: '上传中…', spin: true }, sync: { tag: 'SYNC', tone: 'yellow', label: '同步中…', spin: true },
  pulled: { tag: 'OK', tone: 'green', label: '已从云端拉取' }, pushed: { tag: 'OK', tone: 'green', label: '已同步到云端' },
  expired: { tag: 'ERROR', tone: 'red', label: '登录已失效 · 本机数据仍在' }, failed: { tag: 'ERROR', tone: 'red', label: '同步失败' },
} as const;
type K = keyof typeof STATES;

export default function SyncStatusBadge({ open, onClose, params }: OverlayProps) {
  const [k, setK] = useState<K>((params?.get('state') as K) || 'push');
  const [show, setShow] = useState(open);
  useEffect(() => { setShow(open); }, [open]);
  useEffect(() => {
    if (!show) return;
    if (k === 'push' || k === 'pull' || k === 'sync') { const t = setTimeout(() => setK(k === 'pull' ? 'pulled' : 'pushed'), 1600); return () => clearTimeout(t); }
    if (k === 'pulled' || k === 'pushed') { const t = setTimeout(() => { setShow(false); onClose(); }, 2200); return () => clearTimeout(t); }
  }, [k, show]); // eslint-disable-line
  const st = STATES[k];
  return (
    <>
      <div className="fixed inset-x-0 bottom-28 z-[1] flex flex-wrap justify-center gap-2 px-4">
        {(Object.keys(STATES) as K[]).map((x) => <P3Button key={x} size="sm" tone={x === k ? 'ink' : 'soft'} onClick={() => { setK(x); setShow(true); }}>{STATES[x].label}</P3Button>)}
      </div>
      <P6Strip show={show} tag={st.tag} tagTone={st.tone} role={st.tone === 'red' ? 'alert' : 'status'}
        actions={'spin' in st ? <span aria-hidden className="h-3 w-3 shrink-0 animate-spin border-2 border-p3r-rose border-t-transparent lowmo:animate-none" /> : st.tone === 'red' ? <button type="button" onClick={() => { setShow(false); onClose(); }} className="shrink-0 font-heavy text-meta font-bold text-p3r-rose underline">关闭</button> : undefined}>
        {st.label}
      </P6Strip>
    </>
  );
}
