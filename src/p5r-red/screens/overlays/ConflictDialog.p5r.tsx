/**
 * ConflictDialog 两个房间的档案（真实 src/components/auth/ConflictDialog.tsx，App 顶层：首次登录云端时本机与云端都有档案自动弹出）。
 * 视觉 = v3 b.js openConflict。?state=ok（读到条目）| loading（读取中）| fail（读数失败：「—」= 未知）| busy（处理中）。
 */
import { useState } from 'react';
import type { OverlayProps } from '@/p5r-red/registry/types';
import { D } from '@/p5r-red/mock/data';
import { ObSheet, ObMsg, ObLink, ObBtn, useMsgBox } from './ObKit';

const T: [string, string, number, number][] = [['activities', '活动', 412, 398], ['todos', '任务', 36, 41], ['confidants', '同伴', 6, 6], ['summaries', '总结', 9, 7], ['dailyDivinations', '每日塔罗', 42, 40], ['longReadings', '中长期占卜', 3, 3]];
export default function ConflictDialog({ open, onClose, params }: OverlayProps) {
  const [st, setSt] = useState(params?.get('state') ?? 'ok');
  const [msg, setMsg] = useMsgBox();
  const [busy, setBusy] = useState<string | null>(null);
  const unk = st === 'fail', loading = st === 'loading';
  const col = (local: boolean) => {
    const tot = T.reduce((s, t) => s + t[local ? 2 : 3], 0);
    return (
      <div className={`ob-cf-col ${local ? 'l' : 'r'}`}><small className="ob-cf-side">{local ? '本机' : '云端'}</small><b className="ob-cf-name">{local ? D.user.name : '云端档案'}</b>
        <span className="ob-cf-meta">{loading ? '读取中…' : `合计 ${unk ? '—' : tot} 条`}</span><span className="ob-cf-meta">最近活动：{unk ? '—' : local ? '3 分钟前' : '2 天前'}</span>
        <ul>{T.map(([k, l, a, b]) => { const n = local ? a : b, o = local ? b : a, win = !unk && !loading && n > o; return <li key={k}><span>{l}</span><b className={win ? 'win' : ''}>{unk || loading ? '—' : n}{win ? ' ▲' : ''}</b></li>; })}</ul></div>
    );
  };
  const act = (k: string, m: string) => { setBusy(k); setTimeout(() => { setBusy(null); setMsg(<ObMsg kind="ok">{m}</ObMsg>); }, 900); };
  const dis = st === 'busy' || loading || !!busy;
  return (
    <ObSheet open={open} onClose={onClose} title="两个房间的档案" seed={221} wide states={[['ok', '读到条目'], ['loading', '读取中'], ['fail', '读数失败'], ['busy', '处理中']]} state={st} onState={setSt}>
      <p className="ob-lead">本机与云端都有档案。看一眼两边的大致情况，选择保留哪一份</p>
      <div className="ob-cf">{col(true)}<span className="ob-vs" aria-hidden="true">VS</span>{col(false)}</div>
      {unk && <div className="ob-msg err">没能读到两侧的条目数（网络或登录态问题）。上面的「—」表示<b>未知</b>，不是 0；在读到数字之前，请不要凭这一屏做覆盖决定。 <ObBtn tone="paper" size="sm" seed={222} onClick={() => setSt('ok')}>重试</ObBtn></div>}
      {st === 'ok' && <ObMsg kind="info">建议：总条目数看上去<b>本机更多</b>，如果不确定，优先选<b>「保留本机」</b></ObMsg>}
      <p className="ob-warn">被覆盖的一侧将永久消失，无法恢复。若想保险一点，可先到"设置 → 数据管理"导出本机备份。</p>
      <div className="ob-bigacts">
        <button type="button" className="ob-big dl" disabled={dis} onClick={() => act('dl', '已从云端下载并覆盖本机')}><i className="ob-big-bg" /><span>{st === 'busy' || busy === 'dl' ? '处理中…' : '从云端下载并覆盖'}</span><small>保留云端档案 · 本机现有数据会被替换</small></button>
        <button type="button" className="ob-big ul" disabled={dis} onClick={() => act('ul', '已上传本机数据覆盖云端')}><i className="ob-big-bg" /><span>{busy === 'ul' ? '处理中…' : '上传本地数据覆盖云端'}</span><small>保留本机档案 · 云端现有数据会被替换</small></button>
      </div>
      {msg}
      <div className="ob-acts"><ObLink onClick={onClose}>稍后再决定</ObLink></div>
    </ObSheet>
  );
}
