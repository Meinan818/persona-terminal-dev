/**
 * 和云端对一对（真实 src/components/auth/SyncMergeSheet.tsx）。?state=loading|same|done|hint
 * 「正在对账…」「两边一样，没什么要合的。」按表：本机 N · 云端 M · 只本机 / 只云端 / 不同 + 样例；
 * 「合并时丢掉云端多出来的 N 条」勾选；「两边都改过的 N 条，用哪边」本机/云端；以云端为准 / 以本机为准 / 合并（合并中…）；完成 →「好」。
 */
import { useEffect, useState } from 'react';
import type { OverlayProps } from '@yellow/registry/types';
import { P6Sheet } from '@yellow/screens/pkg6/sheet';
import { P4Button, P4Loading } from '@yellow/kit';
import { SYNC_MERGE, SYNC_TABLE_LABEL } from '@yellow/mock/pkg6';
import { cx } from '@yellow/lib/cx';

export default function SyncMergeSheet({ open, onClose, params }: OverlayProps) {
  const st = params?.get('state');
  const [loading, setLoading] = useState(true);
  const [same] = useState(st === 'same');
  const [side, setSide] = useState<'local' | 'cloud'>('local');
  const [drop, setDrop] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<null | 'cloud' | 'local' | 'merge'>(null);
  const [done, setDone] = useState<string | null>(st === 'done' ? '合并完成：留下本机独有 17 条、云端独有 3 条，两边不同的 4 条按本机；已经推到云端。' : null);
  useEffect(() => { if (!open) return; setLoading(true); if (st === 'loading') return; const t = setTimeout(() => setLoading(false), 700); return () => clearTimeout(t); }, [open, st]);
  const totalConflict = SYNC_MERGE.reduce((a, t) => a + t.conflict, 0);
  const totalOnlyCloud = SYNC_MERGE.reduce((a, t) => a + t.onlyCloud, 0);
  const run = (k: 'cloud' | 'local' | 'merge') => { setBusy(k); setTimeout(() => { setBusy(null); setDone(k === 'merge' ? `合并完成：留下本机独有 17 条、云端独有 ${totalOnlyCloud - Object.values(drop).filter(Boolean).length} 条，两边不同的 ${totalConflict} 条按${side === 'local' ? '本机' : '云端'}；已经推到云端。` : k === 'local' ? '已用本机数据覆盖云端。' : '已用云端数据覆盖本机。'); }, 1000); };
  const close = () => { setDone(null); onClose(); };
  return (
    <P6Sheet open={open} onClose={close} busy={!!busy} title="和云端对一对" en="SYNC · MERGE" size="tall"
      footer={done ? <P4Button block onClick={close}>好</P4Button> : !same && !loading ? (
        <div className="space-y-2">
          <div className="flex min-w-0 items-center gap-2"><span className="min-w-0 flex-1 text-meta font-bold">两边都改过的 {totalConflict} 条，用哪边</span>
            <div className="flex shrink-0 gap-1">{(['local', 'cloud'] as const).map((x) => <button key={x} type="button" onClick={() => setSide(x)} className={cx('rounded-[3px] border-2 px-3 py-1 font-display text-meta font-bold', side === x ? 'border-p4g-black bg-p4g-black text-p4g-yellow night:border-p4g-yellow night:bg-p4g-yellow night:text-p4g-black' : 'border-p4g-line/40')}>{x === 'local' ? '本机' : '云端'}</button>)}</div></div>
          <div className="grid grid-cols-3 gap-2">
            <P4Button size="sm" variant="secondary" disabled={!!busy} onClick={() => run('cloud')}>{busy === 'cloud' ? '拉取中…' : '以云端为准'}</P4Button>
            <P4Button size="sm" variant="secondary" disabled={!!busy} onClick={() => run('local')}>{busy === 'local' ? '推送中…' : '以本机为准'}</P4Button>
            <P4Button size="sm" disabled={!!busy} onClick={() => run('merge')}>{busy === 'merge' ? '合并中…' : '合并'}</P4Button>
          </div>
        </div>
      ) : same && !loading ? <P4Button block onClick={close}>好</P4Button> : undefined}>
      <div className="space-y-3 pt-1">
        {st === 'hint' && <p className="rounded-[4px] border-2 border-p4g-orange bg-p4g-orange/15 px-3 py-2 text-meta font-bold">推送时发现云端的成长记录、任务在别处改过。先看看两边差在哪，再决定怎么合。</p>}
        {done ? <div className="rounded-[4px] border-3 border-p4g-black bg-p4g-yellow p-4 font-display text-body font-bold text-p4g-black night:border-p4g-yellow">✓ {done}</div>
          : loading ? <div className="py-6"><P4Loading label="正在对账…" /></div>
            : same ? <p className="rounded-[4px] bg-p4g-surface px-3 py-6 text-center font-display text-body font-bold">两边一样，没什么要合的。</p> : (
              <>
                <ul className="grid grid-cols-1 gap-2">
                  {SYNC_MERGE.map((t) => (
                    <li key={t.table} className="min-w-0 overflow-hidden rounded-[4px] border-2 border-p4g-black bg-p4g-surface night:border-p4g-yellow">
                      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 bg-p4g-black px-3 py-1.5 text-p4g-white">
                        <b className="min-w-0 flex-1 truncate font-display text-body text-p4g-yellow">{SYNC_TABLE_LABEL[t.table]}</b>
                        <span className="text-2xs">本机 {t.local} · 云端 {t.cloud}</span>
                        {t.onlyLocal > 0 && <span className="rounded-[2px] bg-p4g-yellow px-1 text-2xs font-bold text-p4g-black">只本机 {t.onlyLocal}</span>}
                        {t.onlyCloud > 0 && <span className="rounded-[2px] bg-p4g-cyan px-1 text-2xs font-bold text-p4g-black">只云端 {t.onlyCloud}</span>}
                        {t.conflict > 0 && <span className="rounded-[2px] bg-p4g-orange px-1 text-2xs font-bold text-p4g-black">不同 {t.conflict}</span>}
                      </div>
                      <div className="space-y-0.5 px-3 py-2 text-meta">
                        {t.samples.onlyLocal.length > 0 && <p><b>只本机：</b>{t.samples.onlyLocal.join('；')}{t.onlyLocal > t.samples.onlyLocal.length ? ' …' : ''}</p>}
                        {t.samples.onlyCloud.length > 0 && <p><b>只云端：</b>{t.samples.onlyCloud.join('；')}{t.onlyCloud > t.samples.onlyCloud.length ? ' …' : ''}</p>}
                        {t.samples.conflict.length > 0 && <p><b>两边不同：</b>{t.samples.conflict.join('；')}{t.conflict > t.samples.conflict.length ? ' …' : ''}</p>}
                        {t.onlyCloud > 0 && (
                          <label className="mt-1 flex cursor-pointer items-start gap-2 rounded-[3px] bg-p4g-surface-2 px-2 py-1.5">
                            <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-[color:var(--p4g-orange)]" checked={!!drop[t.table]} onChange={(e) => setDrop({ ...drop, [t.table]: e.target.checked })} />
                            <span>合并时丢掉云端多出来的 {t.onlyCloud} 条（确认是我在这台设备上删掉的）</span>
                          </label>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
                <p className="text-meta leading-relaxed text-p4g-ink-soft">合并 = 两边都留：只本机有的留，只云端有的默认留{totalOnlyCloud > 0 ? '（可按表丢弃）' : ''}，两边不同的按上面选的一边；成就和技能取解锁的那边，同一天的任务完成取次数多的。合并完会推到云端。</p>
              </>
            )}
      </div>
    </P6Sheet>
  );
}
