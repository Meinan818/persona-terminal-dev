/**
 * 共战纪念（真实 CoopMemorialPanel）：与某位在线同伴共击羁绊之影的全部图章（时间倒序，含你的贡献占比 / 终结者 / 连胜）。
 *   #/overlay/bond-memorial   ?state=empty 空态
 * 入口：同伴详情 · 信息页「共战纪念」卡。
 */
import type { Confidant } from '@/types';
import type { OverlayProps } from '@pink/registry/types';
import { P3R, P3Sheet, P3Empty, slantClip } from '@pink/kit';
import { ATTR_NAMES } from '@pink/screens/pkg3/arcana';
import { PK3_CONFIDANTS } from '@pink/adapters/pkg3';

export function MemorialSheet({ isOpen, onClose, confidant, empty }: { isOpen: boolean; onClose: () => void; confidant: Confidant | null; empty?: boolean }) {
  if (!confidant) return null;
  const list = empty ? [] : [...(confidant.coopMemorials ?? []), { shadowId: 'coop:rain', shadowName: '雨夜之影', weaknessAttribute: 'kindness' as const, defeatedAt: '2026-09-14T22:30:00+08:00', winners: [], myDamage: 210, totalDamage: 520 }]
    .sort((a, b) => new Date(b.defeatedAt).getTime() - new Date(a.defeatedAt).getTime());
  return (
    <P3Sheet open={isOpen} onClose={onClose} title="共战纪念" en="MEMORIAL">
      <p className="-mt-1 mb-4 text-[13px]" style={{ color: P3R.grey }}>与 <b style={{ color: P3R.ink }}>{confidant.name}</b> 共击暗影的全部记录 · {list.length} 枚图章</p>
      {list.length === 0 ? (
        <P3Empty ghost="MEMORIAL" text="还没有共战记录。" sub="下一次月相之夜，等待羁绊之影的降临。" />
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {list.map((m, i) => {
            const d = new Date(m.defeatedAt);
            const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            const contribution = m.myDamage && m.totalDamage ? Math.round((m.myDamage / m.totalDamage) * 100) : null;
            const fin = (m as { finisherId?: string }).finisherId === 'me';
            return (
              <div key={`${m.shadowId}-${i}`} className="relative flex min-w-0 items-center gap-3 px-4 py-3" style={{ background: P3R.panel, clipPath: slantClip(12), boxShadow: 'var(--p3r-shadow)' }}>
                <span aria-hidden className="absolute left-0 top-0 h-full w-[4px]" style={{ background: i ? P3R.cyan : P3R.blue }} />
                <div className="relative flex h-14 w-14 shrink-0 rotate-[-8deg] items-center justify-center rounded-full" style={{ boxShadow: 'inset 0 0 0 3px var(--p3r-blue)', background: P3R.cyanFaint }}>
                  <span className="font-cond text-[11px] leading-tight" style={{ color: P3R.roseInk }}>SEALED<br /><span className="text-[16px]">{ds.slice(5)}</span></span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="min-w-0 truncate font-heavy text-[16px]" style={{ color: P3R.ink }}>{m.shadowName || '羁绊之影'}</span>
                    <span className="shrink-0 px-1.5 text-[11px] font-black" style={{ background: P3R.cyanPale, color: P3R.roseInk, clipPath: slantClip(3) }}>弱点 {ATTR_NAMES[m.weaknessAttribute]}</span>
                    {fin && <span className="shrink-0 px-1.5 font-cond text-[11px]" style={{ background: P3R.magenta, color: '#fff', clipPath: slantClip(3) }}>FINISHER</span>}
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-x-1.5 text-[12px]" style={{ color: P3R.grey }}>
                    <span className="font-cond">{ds}</span>
                    {contribution !== null && <><span>·</span><span>你的贡献 <b style={{ color: P3R.ink }}>{contribution}%</b></span></>}
                    {(m as { streak?: number }).streak ? <><span>·</span><span>连胜 ×{(m as { streak?: number }).streak}</span></> : null}
                  </div>
                  {contribution !== null && <div className="mt-1.5 h-[5px] overflow-hidden" style={{ background: 'var(--p3r-track)', clipPath: slantClip(2) }}><div className="h-full w-full origin-left" style={{ background: P3R.blue, transform: `scaleX(${contribution / 100})` }} /></div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </P3Sheet>
  );
}

export default function CoopMemorialPanel({ open, onClose, params }: OverlayProps) {
  return <MemorialSheet isOpen={open} onClose={onClose} confidant={PK3_CONFIDANTS[0]} empty={params?.get('state') === 'empty'} />;
}
