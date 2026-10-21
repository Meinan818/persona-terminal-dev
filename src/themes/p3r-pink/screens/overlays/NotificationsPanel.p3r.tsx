/**
 * 通知面板（真实 NotificationsPanel）：新消息 / 已读分组、全部已读、战斗消息筛选（ON·OFF）、长按多选删除、
 * 行内操作（好友申请 接受 / 拒绝；COOP 响应 / 拒绝；一起进步 查看 / 婉拒）、单条 ⋯ 菜单（标为已读 / 删除）。
 *   #/overlay/bond-notifications   ?state=empty（空）|loading（加载中 → 1.6s 后载入）|error（加载失败 · 重试）
 * 入口：同伴页 ✧ 菜单「通知」（未登录禁用）。
 */
import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/store';
import { useCloudSocialStore } from '@/store/cloudSocial';
import type { OverlayProps } from '@pink/registry/types';
import { P3ActionSheet, P3Button, P3Empty, P3Error, P3Loading, P3OnOff, P3R, P3Sheet, showToast, slantClip, tickClip } from '@pink/kit';
import { PK3_NOTIF_TITLE, useCooperationData, type Pk3Notif } from '@pink/adapters/pkg3';
import { Sparkle } from '@pink/screens/pkg3/ui';

export function NotificationsSheet({ isOpen, onClose, state, onOpenCoopAccept, onOpenPactRespond }: { isOpen: boolean; onClose: () => void; state?: 'empty' | 'loading' | 'error' | null; onOpenCoopAccept?: () => void; onOpenPactRespond?: () => void }) {
  const data = useCooperationData();
  const markPersistedRead = useCloudSocialStore((store) => store.markNotificationRead);
  const removePersistedNotification = useCloudSocialStore((store) => store.removeNotification);
  const [list, setList] = useState<Pk3Notif[]>(state === 'empty' ? [] : data.notifications);
  const [loading, setLoading] = useState(state === 'loading');
  const [failed, setFailed] = useState(state === 'error');
  const [hideBattle, setHideBattle] = useState(false);
  const [multi, setMulti] = useState(false);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [working, setWorking] = useState<string | null>(null);
  const [handled, setHandled] = useState<Record<string, string>>({});
  const press = useRef<number | null>(null);
  useEffect(() => { if (isOpen) { setList(state === 'empty' ? [] : data.notifications); setLoading(state === 'loading'); setFailed(state === 'error'); setMulti(false); setSel(new Set()); } }, [isOpen, state, data.notifications]);
  useEffect(() => { if (!loading) return; const t = window.setTimeout(() => setLoading(false), 1600); return () => clearTimeout(t); }, [loading]);
  const unread = list.filter((n) => !n.read).length;
  const vis = list.filter((n) => !(hideBattle && n.battle));
  const fresh = vis.filter((n) => !n.read); const old = vis.filter((n) => n.read);
  const markRead = (id: string) => { setList((l) => l.map((n) => (n.id === id ? { ...n, read: true } : n))); void markPersistedRead(id); };
  const del = (ids: string[]) => { setList((l) => l.filter((n) => !ids.includes(n.id))); ids.forEach((id) => void removePersistedNotification(id)); };
  const act = (n: Pk3Notif, k: string, done: string, after?: () => void) => { setWorking(`${n.id}:${k}`); window.setTimeout(() => { setWorking(null); setHandled((h) => ({ ...h, [n.id]: done })); markRead(n.id); after?.(); }, 600); };
  const toggleSel = (id: string) => setSel((s) => { const x = new Set(s); if (x.has(id)) x.delete(id); else x.add(id); return x; });

  const row = (n: Pk3Notif, i: number) => {
    const w = (k: string) => working === `${n.id}:${k}`;
    const picked = multi && sel.has(n.id);
    return (
      <div key={n.id} onPointerDown={() => { press.current = window.setTimeout(() => { setMulti(true); setSel(new Set([n.id])); press.current = null; }, 520); }}
        onPointerUp={() => { if (press.current) clearTimeout(press.current); }} onPointerLeave={() => { if (press.current) clearTimeout(press.current); }} onClick={() => { if (multi) toggleSel(n.id); }}
        className="relative flex min-w-0 gap-3 px-4 py-3" style={{ background: picked ? P3R.ink : n.read ? (i % 2 ? 'var(--p3r-row-alt)' : 'var(--p3r-row)') : P3R.panel, color: picked ? 'var(--p3r-on-ink)' : P3R.ink }}>
        {!n.read && !picked && <span aria-hidden className="absolute left-0 top-0 h-full w-[4px]" style={{ background: n.battle ? P3R.magenta : P3R.blue }} />}
        {multi ? <span className="mt-0.5 flex h-5 w-6 shrink-0 items-center justify-center text-[12px] font-black" style={{ clipPath: slantClip(4), background: picked ? P3R.blue : 'transparent', boxShadow: picked ? undefined : 'inset 0 0 0 2px rgb(var(--p3r-cyan-rgb) / 0.8)', color: P3R.onBlue }}>{picked ? '✓' : ''}</span>
          : <span aria-hidden className="mt-1.5 h-[10px] w-[8px] shrink-0" style={{ background: n.read ? 'var(--p3r-track)' : P3R.magenta, clipPath: tickClip }} />}
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-baseline gap-2">
            <span className="min-w-0 truncate text-[14px] font-black"><span style={{ color: picked ? 'var(--pk-petal-a)' : P3R.roseInk }}>{n.from}</span> {PK3_NOTIF_TITLE[n.type]}</span>
            <span className="ml-auto shrink-0 text-[11px]" style={{ opacity: 0.65 }}>{n.ago}</span>
          </div>
          <p className="mt-0.5 text-[13px]" style={{ opacity: 0.85 }}>{n.body}</p>
          {!multi && n.actions && !handled[n.id] && (
            <div className="mt-2 flex gap-2" onPointerDown={(e) => e.stopPropagation()}>
              {n.actions === 'friend' && <><P3Button size="sm" busy={w('ok')} busyText="处理中…" onClick={() => act(n, 'ok', '· 已接受好友申请。')}>接受</P3Button><P3Button size="sm" tone="soft" onClick={() => act(n, 'no', '· 已拒绝。')}>拒绝</P3Button></>}
              {n.actions === 'coop' && <><P3Button size="sm" onClick={() => { markRead(n.id); onOpenCoopAccept?.(); }}>响应</P3Button><P3Button size="sm" tone="soft" busy={w('no')} busyText="…" onClick={() => act(n, 'no', '· 已拒绝这次提议。')}>拒绝</P3Button></>}
              {n.actions === 'pact' && <><P3Button size="sm" onClick={() => { markRead(n.id); onOpenPactRespond?.(); }}>查看</P3Button><P3Button size="sm" tone="soft" busy={w('no')} busyText="…" onClick={() => act(n, 'no', '· 已婉拒。')}>婉拒</P3Button></>}
            </div>
          )}
          {handled[n.id] && <p className="mt-1 text-[12px] font-black" style={{ color: P3R.grey }}>{handled[n.id]}</p>}
        </div>
        {!multi && <button type="button" aria-label="更多" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); setMenuFor(n.id); }} className="h-8 w-8 shrink-0 self-start font-black" style={{ color: P3R.grey }}>⋯</button>}
      </div>
    );
  };
  const Head = ({ label, en }: { label: string; en: string }) => (
    <div className="flex items-center gap-2 px-4 py-1" style={{ background: P3R.ink }}><span aria-hidden className="h-[9px] w-[7px]" style={{ background: P3R.blue, clipPath: tickClip }} /><span className="text-[12px] font-black" style={{ color: 'var(--p3r-on-ink)' }}>{label}</span><span className="font-cond text-[11px] tracking-wider" style={{ color: 'var(--pk-petal-a)' }}>{en}</span></div>
  );

  return (
    <>
      <P3Sheet open={isOpen} onClose={onClose} size="tall" title={<span className="inline-flex items-center gap-1.5"><Sparkle size={18} style={{ color: P3R.blue }} />通知</span>} en="NOTICE"
        headerExtra={<P3Button size="sm" tone="soft" disabled={unread === 0 || loading} onClick={() => { list.filter((n) => !n.read).forEach((n) => void markPersistedRead(n.id)); setList((l) => l.map((n) => ({ ...n, read: true }))); }}>全部已读</P3Button>}
        footer={multi ? (
          <div className="flex min-w-0 items-center gap-3">
            <span className="min-w-0 flex-1 truncate text-[14px] font-black">多选模式 · 已选 {sel.size} 条</span>
            <P3Button size="sm" tone="soft" onClick={() => { setMulti(false); setSel(new Set()); }}>取消</P3Button>
            <P3Button size="sm" tone="danger" disabled={sel.size === 0} ariaLabel="删除所选" onClick={() => { del([...sel]); setMulti(false); setSel(new Set()); showToast(`已删除 ${sel.size} 条`); }}>删除</P3Button>
          </div>
        ) : <P3Button block tone="ink" onClick={onClose}>关闭</P3Button>}>
        <div aria-label="通知">
          <div className="-mt-1 text-[13px]" style={{ color: P3R.grey }}>{loading ? '正在接收…' : unread > 0 ? `${unread} 条未读 · 长按可多选删除` : '没有新消息'}</div>
          <div className="mt-3 flex min-w-0 items-center justify-between gap-3 px-4 py-2" style={{ background: 'var(--p3r-row)', clipPath: slantClip(8) }}>
            <span className="text-[13px] font-black" style={{ color: P3R.inkSoft }}>筛选 · {hideBattle ? '已隐藏战斗消息' : '显示战斗消息'}</span>
            <P3OnOff value={!hideBattle} onChange={(v) => setHideBattle(!v)} ariaLabel="战斗消息" />
          </div>
          <div className="mt-3 overflow-hidden" style={{ clipPath: slantClip(10), boxShadow: 'var(--p3r-shadow)' }}>
            {loading ? <div className="py-6" style={{ background: P3R.panel }}><P3Loading text="通知加载中…" rows={3} /></div>
              : failed ? <div className="py-4" style={{ background: P3R.panel }}><P3Error title="通知没能拉下来" text="网络开小差了，稍后再试。" onRetry={() => { setFailed(false); setLoading(true); }} /></div>
              : vis.length === 0 ? <div className="py-4" style={{ background: P3R.panel }}><P3Empty ghost="EMPTY" text="这里空无一物。" sub="好友申请、回应、祈愿都会在这里提醒你。" /></div>
              : (<>
                {fresh.length > 0 && <Head label="新消息" en="NEW" />}
                {fresh.map((n, i) => row(n, i))}
                {old.length > 0 && <Head label="已读" en="READ" />}
                {old.map((n, i) => row(n, i))}
              </>)}
          </div>
        </div>
      </P3Sheet>
      <P3ActionSheet open={!!menuFor} onClose={() => setMenuFor(null)} title="这条通知" actions={[{ id: 'read', label: '标为已读' }, { id: 'del', label: '删除', tone: 'danger' }]}
        onSelect={(id) => { if (!menuFor) return; if (id === 'read') markRead(menuFor); else { del([menuFor]); showToast('已删除'); } setMenuFor(null); }} />
    </>
  );
}

export default function NotificationsPanel({ open, onClose, params }: OverlayProps) {
  const st = params?.get('state');
  return <NotificationsSheet isOpen={open} onClose={onClose} state={st === 'empty' || st === 'loading' || st === 'error' ? st : null}
    onOpenCoopAccept={() => { window.location.hash = '#/overlay/bond-coop-accept'; }} onOpenPactRespond={() => { window.location.hash = '#/overlay/bond-pact-respond'; }} />;
}
