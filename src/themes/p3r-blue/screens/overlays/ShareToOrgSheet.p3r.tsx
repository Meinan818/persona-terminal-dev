/**
 * 分享到据点（真实 src/components/org/ShareToOrgSheet.tsx）：
 * 「分享到」组织选择、「说一句」（比如：跑完了第一个五公里）、预览「大家会看到」、余量「今天还能在「X」分享 N 条」、
 * 主按钮「分享到据点」（分享中… / 今天的 3 条用完了）→ 成功「分享好了」+「好」「去公告板看看」。
 * ?step=done 直接看成功态；?state=quota 选中余量 0 的据点。
 */
import { useEffect, useState } from 'react';
import type { Activity } from '@real/types';
import type { OverlayProps } from '@blue/registry/types';
import { P3Button, P3Field, P3Input, P3Sheet, P3Tag, ShatteredStar, P3R, slantClip, SelectWedge } from '@blue/kit';
import { navigate } from '@blue/shell/shellBus';
import { ATTR_NAMES } from '@blue/mock/pkg2';
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
  const [error, setError] = useState('');
  useEffect(() => {
    if (!open) return;
    const first = orgs[0];
    setOrg(first?.org.id ?? '');
    setText(act ? defaultShareText(act.description) : '');
    setDone(null);
    setError('');
    for (const v of orgs) void refreshBoard(v.org.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, act?.id]);
  const view = orgs.find((o) => o.org.id === org) ?? orgs[0];
  const left = view ? Math.max(0, ORG_POSTS_PER_DAY - myPostsToday(view.posts, view.me.userId)) : 0;
  const gained = act ? Object.entries(act.pointsAwarded).filter(([, v]) => v > 0) : [];
  const submit = async () => {
    if (!act || !view || !text.trim() || left <= 0 || busy) return;
    setBusy(true);
    setError('');
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
      <P3Button tone="soft" onClick={onClose}>好</P3Button>
      <P3Button block corner onClick={() => { onClose(); navigate('hideout', undefined, { params: { tab: 'board' } }); }}>去公告板看看</P3Button>
    </div>
  ) : (
      <P3Button block size="lg" corner onClick={submit} disabled={!act || !view || !text.trim() || left <= 0} busy={busy} busyText="分享中…">{!view ? '先加入一个组织' : left <= 0 ? `今天的 ${ORG_POSTS_PER_DAY} 条用完了` : '分享到据点'}</P3Button>
  );
  return (
    <P3Sheet open={open} onClose={onClose} title={done ? '分享好了' : '分享到据点'} en="SHARE" footer={footer} busy={busy}>
      {done ? (
        <div className="py-4 text-center">
          <ShatteredStar className="mx-auto w-[120px]" />
          <div className="mt-2 font-heavy text-[20px]" style={{ color: P3R.ink }}>已分享到「{done}」</div>
          <div className="mt-1 text-[13px]" style={{ color: P3R.inkSoft }}>大家打开据点的公告板就能看到，可以给你贴标签打气。</div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <div className="mb-1.5 text-[13px] font-black" style={{ color: P3R.ink }}>分享到</div>
            <div role="radiogroup" className="grid grid-cols-1 gap-1.5">
              {orgs.map((o) => {
                const on = org === o.org.id;
                const remain = Math.max(0, ORG_POSTS_PER_DAY - myPostsToday(o.posts, o.me.userId));
                return (
                  <button key={o.org.id} type="button" role="radio" aria-checked={on} onClick={() => setOrg(o.org.id)} className="relative flex h-12 min-w-0 items-center gap-3 px-5 text-left">
                    <span aria-hidden className="absolute inset-0" style={{ background: on ? 'transparent' : P3R.cyanFaint, clipPath: slantClip(9) }} />
                    {on && <SelectWedge className="-left-1 -right-2 inset-y-0" />}
                    <span className="relative min-w-0 flex-1 truncate font-heavy text-[16px]" style={{ color: on ? 'var(--p3r-mulberry)' : P3R.ink }}>{o.org.name}</span>
                    <span className="relative shrink-0 font-cond text-[13px]" style={{ color: on ? 'var(--p3r-mulberry)' : remain ? P3R.roseInk : 'var(--p3r-coral-ink)' }}>余 {remain}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <P3Field label="说一句" count={`${text.length}/${ORG_POST_TEXT_MAX}`}><P3Input aria-label="分享的那一句" placeholder="比如：跑完了第一个五公里" value={text} onChange={(e) => setText(e.target.value)} maxLength={ORG_POST_TEXT_MAX} /></P3Field>
          <div>
            <div className="mb-1.5 text-[13px] font-black" style={{ color: P3R.ink }}>大家会看到</div>
            <div className="relative">
              <span aria-hidden className="absolute inset-0 translate-x-[6px] translate-y-[6px]" style={{ background: 'var(--p3r-slab-back)', clipPath: slantClip(12) }} />
              <div className="relative p-3 pl-4" style={{ background: P3R.panel, clipPath: slantClip(12) }}>
                <div className="font-cond text-[11px]" style={{ color: P3R.grey }}>JUST NOW · 刚刚</div>
                <div className="mt-1 min-h-[1.4em] break-words text-[16px] font-black leading-snug" style={{ color: P3R.ink }}>{text.trim() || <span style={{ color: P3R.grey }}>比如：跑完了第一个五公里</span>}</div>
                <div className="mt-2 flex flex-wrap gap-1.5">{gained.map(([a, v]) => <P3Tag key={a} tone="rose">{attrNames[a as keyof typeof attrNames] ?? ATTR_NAMES[a as keyof typeof ATTR_NAMES]} +{v}</P3Tag>)}</div>
              </div>
            </div>
          </div>
          <p className="text-[12px]" style={{ color: left > 0 ? P3R.grey : 'var(--p3r-coral-ink)' }}>只分享这一句和加点，不带记录原文。{view ? (left > 0 ? `今天还能在「${view.org.name}」分享 ${left} 条。` : `今天在「${view.org.name}」已经分享了 ${ORG_POSTS_PER_DAY} 条，明天再来。`) : '先在据点里建立或加入一个组织。'}</p>
          {!act && <p role="alert" className="text-[12px] font-bold" style={{ color: 'var(--p3r-coral-ink)' }}>这条记录当前不能分享。</p>}
          {error && <p role="alert" className="text-[12px] font-bold" style={{ color: 'var(--p3r-coral-ink)' }}>{error}</p>}
        </div>
      )}
    </P3Sheet>
  );
}
