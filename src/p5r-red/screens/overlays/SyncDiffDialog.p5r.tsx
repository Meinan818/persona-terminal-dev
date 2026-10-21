/**
 * SyncDiffDialog 同步差异（真实 src/components/auth/SyncDiffDialog.tsx，App 顶层：每 24h 自动同步时发现差异明显弹出）。
 * 视觉 = v3 b.js openSyncDiff。?state=large（较大差异）| small（小幅差异）| same（一致）。
 */
import { useState } from 'react';
import type { OverlayProps } from '@/p5r-red/registry/types';
import { P5BurstImg } from '@/p5r-red/kit/P5BurstImg';
import { ObSheet, ObMsg, ObSub, ObNote, ObLink, ObBtn, useMsgBox } from './ObKit';

const DT: [string, string, number, number][] = [['activities', '成长记录', 412, 398], ['todoCompletions', '任务完成', 188, 180], ['dailyDivinations', '每日塔罗', 42, 40], ['achievements', '成就', 14, 14], ['summaries', '周/月总结', 9, 7], ['confidantEvents', '同伴事件', 31, 33]];
const H: Record<string, [string, string, string]> = { same: ['本地与云端数据一致', '所有同步表的条目数量相同，可放心跳过。', '两侧记录总数相同'], small: ['存在小幅差异，不会自动覆盖', '差距较小，通常是最近几条增减；如需同步请手动选择方向。', '本地记录更多 → 可选择推送到云端'], large: ['本地与云端存在较大差异', '为避免误覆盖，请参考时间戳与条目差后确认同步方向。', '本地记录更多 → 可选择推送到云端'] };
export default function SyncDiffDialog({ open, onClose, params }: OverlayProps) {
  const [st, setSt] = useState(params?.get('state') ?? 'large');
  const [msg, setMsg] = useMsgBox();
  const [busy, setBusy] = useState<string | null>(null);
  const [t1, t2, dir] = H[st] ?? H.large;
  const rows = st === 'same' ? DT.map((r) => [r[0], r[1], r[2], r[2]] as typeof r) : st === 'small' ? DT.slice(0, 2).map((r) => [r[0], r[1], r[2], r[2] - 2] as typeof r) : DT;
  const act = (k: string, m: string) => { setBusy(k); setTimeout(() => { setBusy(null); setMsg(<ObMsg kind="ok">{m}</ObMsg>); }, 900); };
  return (
    <ObSheet open={open} onClose={onClose} title="同步差异" seed={231} wide states={[['large', '较大差异'], ['small', '小幅差异'], ['same', '一致']]} state={st} onState={setSt}>
      <div className={`ob-sev ${st}`}><P5BurstImg tone={st === 'large' ? 'red' : 'ink'} sz={54}>{st === 'same' ? '✓' : '!'}</P5BurstImg><div><b>{t1}</b><p>{t2}</p></div></div>
      <div className="ob-two">{['本地', '云端'].map((s, i) => <div key={s} className="ob-tot"><small>{s}</small><b>{rows.reduce((a, r) => a + r[2 + i as 2 | 3], 0)}</b><span>条目总数</span><em>最新：<b>{i ? '2 天前' : '3 分钟前'}</b></em></div>)}</div>
      <p className="ob-dir">{dir}</p>
      {st !== 'same' && <><ObSub>条目差异（按云端 - 本地）</ObSub><ul className="ob-diffs">{rows.filter((r) => r[3] !== r[2]).map(([k, l, a, b]) => <li key={k}><b>{l}</b><span>本地 {a}</span><span>云端 {b}</span><em className={b - a > 0 ? 'p' : 'n'}>{b - a > 0 ? '+' : ''}{b - a}</em></li>)}</ul></>}
      <ObNote>自动同步已改为每 24 小时至多一次；若差异明显会弹出本窗口确认，不再静默全量覆盖。</ObNote>
      {st === 'same' ? <div className="ob-acts"><ObBtn seed={232} onClick={onClose}>知道了</ObBtn></div> : (
        <>
          <div className="ob-bigacts">
            <button type="button" className="ob-big dl" disabled={!!busy} onClick={() => act('dl', '已从云端拉取')}><i className="ob-big-bg" /><span>{busy === 'dl' ? '拉取中…' : '从云端下载并覆盖'}</span></button>
            <button type="button" className="ob-big ul" disabled={!!busy} onClick={() => act('ul', '已同步到云端')}><i className="ob-big-bg" /><span>{busy === 'ul' ? '上传中…' : '上传本地数据覆盖云端'}</span></button>
          </div>
          {msg}
          <div className="ob-acts"><ObLink onClick={onClose}>暂不处理</ObLink></div>
        </>
      )}
    </ObSheet>
  );
}
