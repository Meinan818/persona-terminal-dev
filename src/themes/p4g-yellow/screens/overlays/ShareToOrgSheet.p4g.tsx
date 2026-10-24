/**
 * 分享到据点（真实 src/components/org/ShareToOrgSheet.tsx）：
 * 「分享到」组织选择、「说一句」、预览「大家会看到」、余量、主按钮「分享」（分享中… / 今天的 3 条用完了）
 * → 成功「分享好了」「已分享到「X」」+「好」「去公告板看看」。?step=done 直接看成功态。
 */
import { useEffect, useState } from 'react';
import type { Activity } from '@real/types';
import type { OverlayProps } from '@yellow/registry/types';
import { P4Button, P4Input, P4Sheet } from '@yellow/kit';
import { navigate } from '@yellow/shell/shellBus';
import { ATTR_NAMES } from '@yellow/mock/pkg2';
import { cx } from '@yellow/lib/cx';
import { useAppStore } from '@/store';
import { useCloudSocialStore } from '@/store/cloudSocial';
import { refreshBoard, shareActivity } from '@/services/orgSync';
import { ORG_POSTS_PER_DAY, ORG_POST_TEXT_MAX, defaultShareText, myPostsToday } from '@/utils/orgLogic';

export default function ShareToOrgSheet({ open, onClose, params, activity }: OverlayProps & { activity?: Activity }) {
  const orgs = useCloudSocialStore((s) => s.orgs);
  const attrNames = useAppStore((s) => s.settings.attributeNames);
  const act = activity ?? null;
  const [org, setOrg] = useState(orgs[0]?.org.id ?? '');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    setOrg(orgs[0]?.org.id ?? '');
    setText(act ? defaultShareText(act.description) : '');
    setError(null);
    setDone(null);
    for (const v of orgs) void refreshBoard(v.org.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, act?.id]);
  const view = orgs.find((o) => o.org.id === org) ?? orgs[0];
  const left = view ? Math.max(0, ORG_POSTS_PER_DAY - myPostsToday(view.posts, view.me.userId)) : 0;
  const gained = act ? Object.entries(act.pointsAwarded).filter(([, v]) => v > 0) : [];
  const submit = async () => {
    if (!act || !view || !text.trim() || left <= 0 || busy) return;
    setBusy(true); setError(null);
    try {
      await shareActivity(view.org.id, act, text);
      setDone(view.org.name);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : '没分享出去，稍后再试');
    } finally {
      setBusy(false);
    }
  };
  const footer = done ? (
    <div className="flex gap-3">
      <P4Button variant="secondary" onClick={onClose}>好</P4Button>
      <P4Button block onClick={() => { onClose(); navigate('hideout', undefined, { params: { tab: 'board' } }); }}>去公告板看看</P4Button>
    </div>
  ) : (
    <P4Button block size="lg" onClick={submit} disabled={busy || !act || !view || !text.trim() || left <= 0} busy={busy}>{busy ? '分享中…' : !view ? '先加入一个组织' : left <= 0 ? `今天的 ${ORG_POSTS_PER_DAY} 条用完了` : '分享'}</P4Button>
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
              {orgs.map((o) => (
                <button key={o.org.id} type="button" onClick={() => setOrg(o.org.id)} aria-pressed={org === o.org.id}
                  className={cx('flex min-w-0 items-center gap-3 rounded-sm border-3 px-3 py-2.5 text-left font-display font-bold', org === o.org.id ? 'border-p4g-black bg-p4g-select text-[color:var(--p4g-select-ink)] shadow-hard-sm' : 'border-p4g-line bg-p4g-surface text-p4g-ink')}>
                  <span className={cx('h-4 w-4 shrink-0 border-3', org === o.org.id ? 'border-current bg-p4g-yellow' : 'border-current')} />
                  <span className="min-w-0 flex-1 truncate text-body">{o.org.name}</span>
                  <span className="shrink-0 text-cap opacity-80">余 {Math.max(0, ORG_POSTS_PER_DAY - myPostsToday(o.posts, o.me.userId))}</span>
                </button>
              ))}
            </div>
          </div>
          <P4Input label="说一句" aria-label="分享的那一句" placeholder="比如：跑完了第一个五公里" value={text} onChange={(e) => setText(e.target.value)} maxLength={ORG_POST_TEXT_MAX} />
          <div>
            <div className="mb-1.5 font-display text-meta font-bold text-p4g-ink">大家会看到</div>
            <div className="relative rounded-sm border-3 border-p4g-black bg-p4g-yellow p-3 text-p4g-black shadow-hard-sm">
              <div className="text-2xs font-bold opacity-70">刚刚</div>
              <div className="mt-1 min-h-[1.4em] break-words font-display text-lead font-bold leading-snug">{text.trim() || <span className="opacity-40">比如：跑完了第一个五公里</span>}</div>
              <div className="mt-2 flex flex-wrap gap-1.5">{gained.map(([a, v]) => <span key={a} className="rounded-xs bg-p4g-black px-1.5 font-display text-2xs font-bold text-p4g-yellow">{attrNames[a as keyof typeof attrNames] ?? ATTR_NAMES[a as keyof typeof ATTR_NAMES]} +{v}</span>)}</div>
            </div>
          </div>
          <p className="text-meta text-p4g-ink-soft">只分享这一句和加点，不带记录原文。{view ? (left > 0 ? `今天还能在「${view.org.name}」分享 ${left} 条。` : `今天在「${view.org.name}」已经分享了 ${ORG_POSTS_PER_DAY} 条，明天再来。`) : '先在据点里建立或加入一个组织。'}</p>
          {!act && <p className="text-meta font-bold text-p4g-danger">这条记录当前不能分享。</p>}
          {error && <p className="text-meta font-bold text-p4g-danger">{error}</p>}
        </div>
      )}
    </P4Sheet>
  );
}
