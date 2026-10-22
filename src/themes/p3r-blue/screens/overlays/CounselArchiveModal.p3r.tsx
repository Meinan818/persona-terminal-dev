/**
 * 谏言归档库（真实 CounselArchiveModal）：被亲手存下的谈话摘要（时间倒序 · 条数 · @同伴）+ 删除确认。
 *   #/overlay/bond-counsel-archive   ?state=empty 空态
 * 入口：同伴页 ✧ 菜单「谏言归档库」。
 */
import { useEffect, useState } from 'react';
import type { CounselArchive } from '@real/types';
import type { OverlayProps } from '@blue/registry/types';
import { P3Dialog, P3Empty, P3R, P3Sheet, showToast, slantClip, tickClip } from '@blue/kit';
import { PK3_CONFIDANTS, PK3_COUNSEL_ARCHIVES } from '@blue/mock/pkg3';

const fmt = (d: Date) => `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

export function CounselArchiveSheet({ isOpen, onClose, empty }: { isOpen: boolean; onClose: () => void; empty?: boolean }) {
  const [list, setList] = useState<CounselArchive[]>(empty ? [] : PK3_COUNSEL_ARCHIVES);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  useEffect(() => { if (isOpen) setList(empty ? [] : PK3_COUNSEL_ARCHIVES); }, [isOpen, empty]);
  const sorted = [...list].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return (
    <>
      <P3Sheet open={isOpen} onClose={onClose} title={<span aria-label="谏言归档库">✧ 谏言归档库</span>} en="ARCHIVE" size="tall">
        <p className="-mt-1 mb-4 text-[13px]" style={{ color: P3R.grey }}>{sorted.length} 次被你亲手存下的谈话</p>
        {sorted.length === 0 ? (
          <P3Empty ghost="ARCHIVE" text="归档库还是空的。" sub="聊完之后点「归档」，这次谈话的摘要会留在这里。" />
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {sorted.map((a, i) => (
              <article key={a.id} className="relative min-w-0 px-5 pb-3 pt-3" style={{ background: i ? P3R.panel : 'var(--p3r-mulberry)', color: i ? P3R.ink : 'var(--p3r-cream)', clipPath: slantClip(12), boxShadow: i ? 'var(--p3r-shadow)' : undefined }}>
                <span aria-hidden className="absolute bottom-0 right-4 h-[6px] w-[14px]" style={{ background: P3R.magenta, clipPath: tickClip }} />
                <div className="flex min-w-0 items-center gap-2">
                  <span className="min-w-0 flex-1 truncate font-cond text-[13px] tracking-wider" style={{ color: i ? P3R.roseInk : 'var(--bk-bubble-a)' }}>{fmt(a.createdAt)} · {a.messageCount} 条</span>
                  <button type="button" onClick={() => setConfirmId(a.id)} aria-label={`删除 ${fmt(a.createdAt)} 的归档`} className="shrink-0 px-2 text-[12px] font-black" style={{ color: i ? 'var(--p3r-coral-ink)' : 'var(--bk-bubble-b)' }}>删除</button>
                </div>
                <p className="mt-1.5 text-[14px] leading-relaxed">{a.summary}</p>
                {a.mentionedConfidantIds.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{a.mentionedConfidantIds.map((id) => <span key={id} className="px-2 text-[11px] font-black" style={{ background: P3R.blue, color: P3R.onBlue, clipPath: slantClip(4) }}>@{PK3_CONFIDANTS.find((c) => c.id === id)?.name ?? id}</span>)}</div>}
              </article>
            ))}
          </div>
        )}
      </P3Sheet>
      <P3Dialog open={!!confirmId} onClose={() => setConfirmId(null)} tone="danger" title="删除这条归档？" description="删除后不可恢复。" confirmText="删除" cancelText="再想想"
        onConfirm={() => { setList((l) => l.filter((x) => x.id !== confirmId)); setConfirmId(null); showToast('已删除'); }} />
    </>
  );
}

export default function CounselArchiveModal({ open, onClose, params }: OverlayProps) {
  return <CounselArchiveSheet isOpen={open} onClose={onClose} empty={params?.get('state') === 'empty'} />;
}
