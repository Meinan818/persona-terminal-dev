/**
 * 条目差异提示（真实 src/components/auth/SyncDiffDialog.tsx）。?variant=same|minor|major（默认 major）
 * 标题（一致 / 小幅差异 / 较大差异）+ 说明；本地 / 云端「条目总数」+ 最新时间；「条目差异（按云端 - 本地）」表；
 * 说明「自动同步已改为每 24 小时至多一次…」；一致 →「知道了」；有差异 →「从云端下载并覆盖」「上传本地数据覆盖云端」「暂不处理」。
 */
import { useState } from 'react';
import type { OverlayProps } from '@blue/registry/types';
import { P6Dialog } from '@blue/screens/pkg6/dialog';
import { SYNC_DIFF, SYNC_TABLE_LABEL } from '@blue/mock/pkg6';
import { P3Button, useToast } from '@blue/kit';
import { cx } from '@blue/lib/cx';

type V = 'same' | 'minor' | 'major';
export default function SyncDiffDialog({ open, onClose, params }: OverlayProps) {
  const toast = useToast();
  const [v, setV] = useState<V>((params?.get('variant') as V) || 'major');
  const rows = SYNC_DIFF.map((r) => v === 'same' ? { ...r, cloudCount: r.localCount } : v === 'minor' ? { ...r, cloudCount: r.table === 'activities' ? r.localCount - 2 : r.localCount } : r);
  const lt = rows.reduce((a, r) => a + r.localCount, 0), ct = rows.reduce((a, r) => a + r.cloudCount, 0);
  const title = v === 'same' ? '本地与云端数据一致' : v === 'minor' ? '存在小幅差异，不会自动覆盖' : '本地与云端存在较大差异';
  const desc = v === 'same' ? '所有同步表的条目数量相同，可放心跳过。' : v === 'minor' ? '差距较小，通常是最近几条增减；如需同步请手动选择方向。' : '为避免误覆盖，请参考时间戳与条目差后确认同步方向。';
  const hint = lt > ct ? '本地记录更多 → 可选择推送到云端' : lt < ct ? '云端记录更多 → 可选择拉取到本地' : '两侧记录总数相同';
  return (
    <>
      <div className="fixed inset-x-0 bottom-28 z-[1] flex justify-center gap-2">
        {(['same', 'minor', 'major'] as V[]).map((x) => <P3Button key={x} size="sm" tone={v === x ? 'ink' : 'soft'} onClick={() => setV(x)}>{x === 'same' ? '一致' : x === 'minor' ? '小幅' : '较大'}</P3Button>)}
      </div>
      <P6Dialog open={open} onClose={onClose} wide speaker="云同步" tone={v === 'major' ? 'warning' : 'default'} icon={v === 'same' ? '✓' : undefined} title={title} description={desc}
        choices={v === 'same' ? [{ id: 'ok', label: '知道了', primary: true }] : [{ id: 'pull', label: '从云端下载并覆盖', primary: true }, { id: 'push', label: '上传本地数据覆盖云端' }, { id: 'skip', label: '暂不处理' }]}
        onChoice={(id) => { if (id === 'pull' || id === 'push') toast.success(id === 'pull' ? '已从云端下载并覆盖' : '已上传本地数据覆盖云端'); onClose(); }}>
        <div className="grid grid-cols-2 gap-2">
          {[['本地', lt, '刚刚'], ['云端', ct, '3 小时前']].map(([label, n, latest]) => (
            <div key={label as string} className="min-w-0 rounded-none border-2 border-p3r-lilac/50 bg-p3r-rose px-3 py-2 text-p3r-on-rose">
              <div className="font-heavy text-meta font-bold">{label} · 条目总数</div>
              <div className="font-cond tabular text-h1 leading-none">{n}</div>
              <div className="mt-0.5 truncate text-2xs">最新：<span className="font-bold">{latest}</span></div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-meta font-bold text-p3r-rose">{hint}</p>
        <div className="mt-2">
          <div className="mb-1 font-heavy text-meta font-bold">条目差异（按云端 - 本地）</div>
          <ul className="grid max-h-[34vh] grid-cols-1 gap-px overflow-y-auto rounded-none border-2 border-p3r-panel/20">
            {rows.map((r, i) => { const d = r.cloudCount - r.localCount; return (
              <li key={r.table} className={cx('flex min-w-0 items-center gap-2 px-2.5 py-1 text-meta', i % 2 ? 'bg-p3r-panel/5' : '')}>
                <span className="min-w-0 flex-1 truncate">{SYNC_TABLE_LABEL[r.table]}</span>
                <span className="shrink-0 opacity-70">本地 {r.localCount}</span><span className="shrink-0 opacity-70">云端 {r.cloudCount}</span>
                <span className={cx('font-cond tabular w-10 shrink-0 text-right', d > 0 ? 'text-p3r-lilac' : d < 0 ? 'text-p3r-coral' : 'opacity-50')}>{d > 0 ? `+${d}` : d}</span>
              </li>); })}
          </ul>
        </div>
        <p className="mt-2 text-2xs opacity-70">自动同步已改为每 24 小时至多一次；若差异明显会弹出本窗口确认，不再静默全量覆盖。</p>
      </P6Dialog>
    </>
  );
}
