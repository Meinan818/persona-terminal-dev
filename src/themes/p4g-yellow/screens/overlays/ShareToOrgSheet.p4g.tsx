/**
 * 分享到据点（真实 src/components/org/ShareToOrgSheet.tsx）：
 * 「分享到」组织选择、「说一句」、预览「大家会看到」、余量、主按钮「分享」（分享中… / 今天的 3 条用完了）
 * → 成功「分享好了」「已分享到「X」」+「好」「去公告板看看」。?step=done 直接看成功态。
 */
import { useEffect, useState } from 'react';
import type { Activity } from '@/types';
import type { OverlayProps } from '@yellow/registry/types';
import { P4Button, P4Input, P4Sheet } from '@yellow/kit';
import { navigate } from '@yellow/shell/shellBus';
import { ACTIVITIES, ATTR_NAMES, ORGS } from '@yellow/adapters/pkg2';
import { cx } from '@yellow/lib/cx';

export default function ShareToOrgSheet({ open, onClose, params, activity }: OverlayProps & { activity?: Activity }) {
  const act = activity ?? ACTIVITIES[0];
  const [org, setOrg] = useState(ORGS[0].id);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (open) { setText(''); setError(null); setDone(params?.get('step') === 'done' ? ORGS[0].name : null); } }, [open]); // eslint-disable-line
  const view = ORGS.find((o) => o.id === org)!;
  const left = view.left;
  const gained = Object.entries(act.pointsAwarded).filter(([, v]) => v > 0);
  const submit = () => {
    if (!text.trim() || left <= 0) return;
    setBusy(true); setError(null);
    setTimeout(() => { setBusy(false); setDone(view.name); }, 700);
  };
  const footer = done ? (
    <div className="flex gap-3">
      <P4Button variant="secondary" onClick={onClose}>好</P4Button>
      <P4Button block onClick={() => { onClose(); navigate('hideout', undefined, { params: { tab: 'board' } }); }}>去公告板看看</P4Button>
    </div>
  ) : (
    <P4Button block size="lg" onClick={submit} disabled={busy || !text.trim() || left <= 0} busy={busy}>{busy ? '分享中…' : left <= 0 ? '今天的 3 条用完了' : '分享'}</P4Button>
  );
  return (
    <P4Sheet open={open} onClose={onClose} title={done ? '分享好了' : '分享到据点'} en="SHARE TO HIDEOUT" footer={footer}>
      {done ? (
        <div className="py-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-3 border-p4g-black bg-p4g-yellow text-[30px] text-p4g-black shadow-hard">✓</div>
          <div className="mt-3 font-display text-h3 font-bold text-p4g-ink">已分享到「{done}」</div>
          <div className="mt-1 text-meta font-bold text-p4g-ink-soft">大家打开据点的公告板就能看到，可以给你贴标签打气。</div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <div className="mb-1.5 font-display text-meta font-bold text-p4g-ink">分享到</div>
            <div className="grid grid-cols-1 gap-2">
              {ORGS.map((o) => (
                <button key={o.id} type="button" onClick={() => setOrg(o.id)} aria-pressed={org === o.id}
                  className={cx('flex min-w-0 items-center gap-3 rounded-sm border-3 px-3 py-2.5 text-left font-display font-bold', org === o.id ? 'border-p4g-black bg-p4g-select text-[color:var(--p4g-select-ink)] shadow-hard-sm' : 'border-p4g-line bg-p4g-surface text-p4g-ink')}>
                  <span className={cx('h-4 w-4 shrink-0 border-3', org === o.id ? 'border-current bg-p4g-yellow' : 'border-current')} />
                  <span className="min-w-0 flex-1 truncate text-body">{o.name}</span>
                  <span className="shrink-0 text-cap opacity-80">余 {o.left}</span>
                </button>
              ))}
            </div>
          </div>
          <P4Input label="说一句" aria-label="分享的那一句" placeholder="比如：跑完了第一个五公里" value={text} onChange={(e) => setText(e.target.value)} maxLength={60} />
          <div>
            <div className="mb-1.5 font-display text-meta font-bold text-p4g-ink">大家会看到</div>
            <div className="relative rounded-sm border-3 border-p4g-black bg-p4g-yellow p-3 text-p4g-black shadow-hard-sm">
              <div className="text-2xs font-bold opacity-70">刚刚</div>
              <div className="mt-1 min-h-[1.4em] break-words font-display text-lead font-bold leading-snug">{text.trim() || <span className="opacity-40">比如：跑完了第一个五公里</span>}</div>
              <div className="mt-2 flex flex-wrap gap-1.5">{gained.map(([a, v]) => <span key={a} className="rounded-xs bg-p4g-black px-1.5 font-display text-2xs font-bold text-p4g-yellow">{ATTR_NAMES[a as keyof typeof ATTR_NAMES]} +{v}</span>)}</div>
            </div>
          </div>
          <p className="text-meta text-p4g-ink-soft">只分享这一句和加点，不带记录原文。{left > 0 ? `今天还能在「${view.name}」分享 ${left} 条。` : `今天在「${view.name}」已经分享了 3 条，明天再来。`}</p>
          {error && <p className="text-meta font-bold text-p4g-danger">{error}</p>}
        </div>
      )}
    </P4Sheet>
  );
}
