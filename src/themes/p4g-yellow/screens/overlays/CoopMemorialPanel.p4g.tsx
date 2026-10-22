/**
 * 共战纪念（真实 CoopMemorialPanel）：与某位在线同伴共击暗影的全部图章。?state=empty 看空态。
 */
import type { Confidant } from '@real/types';
import type { OverlayProps } from '@yellow/registry/types';
import { P4Sheet } from '@yellow/kit';
import { ATTR_NAMES } from '@yellow/screens/pkg3/arcana';
import { PK3_CONFIDANTS } from '@yellow/mock/pkg3';

const ATTR_ICON: Record<string, string> = { knowledge: '📘', guts: '🔥', dexterity: '🎯', kindness: '🌿', charm: '✨' };

export function MemorialSheet({ isOpen, onClose, confidant, empty }: { isOpen: boolean; onClose: () => void; confidant: Confidant; empty?: boolean }) {
  const list = empty ? [] : [...(confidant.coopMemorials ?? []), {
    shadowId: 'coop:rain', shadowName: '雨夜之影', weaknessAttribute: 'kindness' as const, defeatedAt: '2026-09-14T22:30:00+08:00', winners: [], myDamage: 210, totalDamage: 520,
  }].sort((a, b) => new Date(b.defeatedAt).getTime() - new Date(a.defeatedAt).getTime());
  return (
    <P4Sheet open={isOpen} onClose={onClose} title="共战纪念" en="MEMORIAL">
      <p className="-mt-1 mb-3 text-meta text-p4g-ink-soft">与 <span className="font-bold text-p4g-ink">{confidant.name}</span> 共击暗影的全部记录</p>
      {list.length === 0 ? (
        <div className="rounded-sm border-2 border-dashed border-p4g-line py-10 text-center text-meta text-p4g-ink-soft">还没有共战记录。<br />下一次月相之夜，等待羁绊之影的降临。</div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {list.map((m, i) => {
            const d = new Date(m.defeatedAt);
            const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            const contribution = m.myDamage && m.totalDamage ? Math.round((m.myDamage / m.totalDamage) * 100) : null;
            return (
              <div key={`${m.shadowId}-${i}`} className="flex min-w-0 items-center gap-3 rounded-sm border-3 border-p4g-line bg-p4g-surface p-3 shadow-hard-sm" style={{ transform: `rotate(${i % 2 ? 0.6 : -0.6}deg)` }}>
                <div className="flex h-14 w-14 shrink-0 rotate-[-8deg] items-center justify-center rounded-full border-[3px] border-dashed border-p4g-red bg-p4g-black text-h2">🌑</div>
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="min-w-0 truncate font-display text-lead font-bold">{m.shadowName || '羁绊之影'}</span>
                    <span className="shrink-0 rounded-[2px] bg-p4g-orange px-1.5 text-2xs font-bold text-p4g-black">{ATTR_ICON[m.weaknessAttribute]} {ATTR_NAMES[m.weaknessAttribute]}</span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-x-1.5 text-cap text-p4g-ink-soft">
                    <span className="p4g-num">{ds}</span>
                    {contribution !== null && <><span>·</span><span>你的贡献 <span className="font-bold text-p4g-ink">{contribution}%</span></span></>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </P4Sheet>
  );
}

export default function CoopMemorialPanel({ open, onClose, params }: OverlayProps) {
  return <MemorialSheet isOpen={open} onClose={onClose} confidant={PK3_CONFIDANTS[0]} empty={params?.get('state') === 'empty'} />;
}
