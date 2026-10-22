/**
 * 谏言归档库（真实 CounselArchiveModal）：摘要列表 + 删除确认；?state=empty 看空态。
 */
import { useEffect, useState } from 'react';
import type { CounselArchive } from '@real/types';
import type { OverlayProps } from '@yellow/registry/types';
import { P4Dialog, P4Sheet } from '@yellow/kit';
import { PK3_CONFIDANTS, PK3_COUNSEL_ARCHIVES } from '@yellow/mock/pkg3';

const fmt = (d: Date) => `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

export function CounselArchiveSheet({ isOpen, onClose, empty }: { isOpen: boolean; onClose: () => void; empty?: boolean }) {
  const [list, setList] = useState<CounselArchive[]>(empty ? [] : PK3_COUNSEL_ARCHIVES);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  useEffect(() => { if (isOpen) setList(empty ? [] : PK3_COUNSEL_ARCHIVES); }, [isOpen, empty]);
  const sorted = [...list].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const target = list.find((a) => a.id === confirmId);
  return (
    <>
      <P4Sheet open={isOpen} onClose={onClose} title={<span aria-label="谏言归档库">✧ 谏言归档库</span>} en="COUNSEL ARCHIVE" size="tall">
        <p className="-mt-1 mb-3 text-meta text-p4g-ink-soft">{sorted.length} 次被你亲手存下的谈话</p>
        {sorted.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mb-3 text-6xl text-p4g-ink/30" aria-hidden>✧</div>
            <p className="text-meta text-p4g-ink-soft">归档库还是空的。<br />聊完之后点「归档」，这次谈话的摘要会留在这里。</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {sorted.map((a, i) => (
              <article key={a.id} className="relative min-w-0 rounded-sm border-3 border-p4g-black bg-[color:var(--p4g-msg)] p-3 pt-4 text-[color:var(--p4g-msg-ink)] shadow-[4px_4px_0_var(--p4g-yellow)]" style={{ transform: `rotate(${i % 2 ? 0.5 : -0.5}deg)` }}>
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate p4g-num text-cap tracking-widest text-p4g-yellow">{fmt(a.createdAt)} · {a.messageCount} 条</span>
                  <button type="button" onClick={() => setConfirmId(a.id)} aria-label={`删除 ${fmt(a.createdAt)} 的归档`} className="shrink-0 font-display text-cap font-bold text-p4g-orange underline underline-offset-2">删除</button>
                </div>
                <p className="mt-1.5 text-body leading-relaxed">{a.summary}</p>
                {a.mentionedConfidantIds.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">{a.mentionedConfidantIds.map((id) => <span key={id} className="rounded-[2px] bg-p4g-yellow px-1.5 text-2xs font-bold text-p4g-black">@{PK3_CONFIDANTS.find((c) => c.id === id)?.name ?? id}</span>)}</div>
                )}
              </article>
            ))}
          </div>
        )}
      </P4Sheet>
      <P4Dialog open={!!target} onClose={() => setConfirmId(null)} danger title="删除这条归档？" message="删除后不可恢复。" confirmText="删除" cancelText="再想想" actions="buttons"
        onConfirm={() => setList((l) => l.filter((x) => x.id !== confirmId))} />
    </>
  );
}

export default function CounselArchiveModal({ open, onClose, params }: OverlayProps) {
  return <CounselArchiveSheet isOpen={open} onClose={onClose} empty={params?.get('state') === 'empty'} />;
}
