/**
 * 通知面板（真实 NotificationsPanel）：未读/已读分组、全部已读、战斗消息筛选、长按多选删除、
 * 行内操作（好友申请 接受/拒绝；COOP 响应/拒绝；一起进步 查看/婉拒）、单条 ⋯ 菜单（标为已读 / 删除）。
 * #/overlay/bond-notifications?state=empty|loading
 */
import { useEffect, useRef, useState } from 'react';
import type { OverlayProps } from '@yellow/registry/types';
import { P4ActionSheet, P4Button, P4Loading, P4Sheet, P4Switch, showToast } from '@yellow/kit';
import { cx } from '@yellow/lib/cx';
import { PK3_NOTIF_TITLE, type Pk3Notif, useCooperationData } from '@yellow/adapters/pkg3';
import { Sparkle } from '@yellow/screens/pkg3/ui';
import { useCloudSocialStore } from '@/store/cloudSocial';
import { deleteNotification, markAllNotificationsRead, markNotificationRead } from '@/services/notifications';
import { acceptFriendRequest, rejectFriendRequest } from '@/services/friends';
import { rejectCoopBond } from '@/services/coopBonds';
import { answerPact } from '@/services/pactSync';
import { loadSocial } from '@/services/social';

export function NotificationsSheet({ isOpen, onClose, state, onOpenCoopAccept, onOpenPactRespond }: { isOpen: boolean; onClose: () => void; state?: 'empty' | 'loading' | null; onOpenCoopAccept?: () => void; onOpenPactRespond?: () => void }) {
  const { notifications, rawNotifications, socialLoading, cloudUser } = useCooperationData();
  const markReadLocal = useCloudSocialStore((s) => s.markNotificationRead);
  const removeLocal = useCloudSocialStore((s) => s.removeNotification);
  const list = state === 'empty' ? [] : notifications;
  const loading = state === 'loading' || socialLoading;
  const [hideBattle, setHideBattle] = useState(false);
  const [multi, setMulti] = useState(false);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [working, setWorking] = useState<string | null>(null);
  const [handled, setHandled] = useState<Record<string, string>>({});
  const press = useRef<number | null>(null);
  useEffect(() => { if (isOpen) { setMulti(false); setSel(new Set()); setHandled({}); if (cloudUser) void loadSocial({ force: true }); } }, [cloudUser?.id, isOpen]);
  const unread = list.filter((n) => !n.read).length;
  const vis = list.filter((n) => !(hideBattle && n.battle));
  const fresh = vis.filter((n) => !n.read); const old = vis.filter((n) => n.read);
  const markRead = (id: string) => { markReadLocal(id); void markNotificationRead(id).catch((error) => console.warn('[themes] mark notification read failed', error)); };
  const remove = (ids: string[]) => { for (const id of ids) removeLocal(id); void Promise.all(ids.map((id) => deleteNotification(id))).catch((error) => console.warn('[themes] delete notification failed', error)); };
  const markAllRead = () => {
    const unreadRaw = rawNotifications.filter((n) => !n.read);
    void markAllNotificationsRead(unreadRaw).then(() => { for (const n of unreadRaw) markReadLocal(n.id); }).catch((error) => console.warn('[themes] mark all notifications failed', error));
  };
  const act = (n: Pk3Notif, k: string, done: string, after?: () => void) => {
    setWorking(`${n.id}:${k}`);
    void (async () => {
      try {
        if (n.actions === 'friend' && n.actionId) {
          if (k === 'ok') await acceptFriendRequest(n.actionId); else await rejectFriendRequest(n.actionId);
        } else if (n.actions === 'coop' && n.actionId && k === 'no') {
          await rejectCoopBond(n.actionId);
        } else if (n.actions === 'pact' && n.actionId && k === 'no') {
          await answerPact(n.actionId, false);
        }
        await markNotificationRead(n.id);
        markReadLocal(n.id);
        setHandled((h) => ({ ...h, [n.id]: done }));
        if (n.actions === 'friend') await loadSocial({ force: true });
        after?.();
      } catch (error) {
        showToast(error instanceof Error ? error.message : '处理失败');
      } finally {
        setWorking(null);
      }
    })();
  };
  const toggleSel = (id: string) => setSel((s) => { const x = new Set(s); if (x.has(id)) x.delete(id); else x.add(id); return x; });

  const Row = ({ n }: { n: Pk3Notif }) => {
    const w = (k: string) => working === `${n.id}:${k}`;
    return (
      <div
        onPointerDown={() => { press.current = window.setTimeout(() => { setMulti(true); setSel(new Set([n.id])); press.current = null; }, 520); }}
        onPointerUp={() => { if (press.current) clearTimeout(press.current); }} onPointerLeave={() => { if (press.current) clearTimeout(press.current); }}
        onClick={() => { if (multi) toggleSel(n.id); }}
        className={cx('relative flex min-w-0 gap-3 border-b-2 px-3 py-3', n.read ? 'border-[color:var(--p4g-line-soft)] bg-p4g-surface-2' : 'border-[color:var(--p4g-separator-a)]', multi && sel.has(n.id) && '!bg-p4g-select !text-[color:var(--p4g-select-ink)]')}
        style={n.read || (multi && sel.has(n.id)) ? undefined : { background: 'var(--p4g-surface-grad)' }}>
        {multi ? <span className={cx('mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-[2px] border-2 border-current text-cap font-bold')}>{sel.has(n.id) ? '✓' : ''}</span>
          : <span className={cx('mt-1.5 h-2.5 w-2.5 shrink-0 rotate-45', n.read ? 'bg-p4g-muted/50' : 'bg-p4g-red')} />}
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-baseline gap-2">
            <span className="min-w-0 truncate font-display text-body font-bold"><span className="text-[color:var(--p4g-rank)]">{n.from}</span> {PK3_NOTIF_TITLE[n.type]}</span>
            <span className="ml-auto shrink-0 text-2xs opacity-70">{n.ago}</span>
          </div>
          <p className="mt-0.5 text-meta opacity-85">{n.body}</p>
          {!multi && n.actions && !handled[n.id] && (
            <div className="mt-2 flex gap-2" onPointerDown={(e) => e.stopPropagation()}>
              {n.actions === 'friend' && <><P4Button size="sm" busy={w('ok')} onClick={() => act(n, 'ok', '· 已接受好友申请。')}>{w('ok') ? '处理中…' : '接受'}</P4Button><P4Button size="sm" variant="secondary" onClick={() => act(n, 'no', '· 已拒绝。')}>拒绝</P4Button></>}
              {n.actions === 'coop' && <><P4Button size="sm" onClick={() => { markRead(n.id); onOpenCoopAccept?.(); }}>响应</P4Button><P4Button size="sm" variant="secondary" onClick={() => act(n, 'no', '· 已拒绝这次提议。')}>{w('no') ? '…' : '拒绝'}</P4Button></>}
              {n.actions === 'pact' && <><P4Button size="sm" onClick={() => { markRead(n.id); onOpenPactRespond?.(); }}>查看</P4Button><P4Button size="sm" variant="secondary" onClick={() => act(n, 'no', '· 已婉拒。')}>{w('no') ? '…' : '婉拒'}</P4Button></>}
            </div>
          )}
          {handled[n.id] && <p className="mt-1 text-cap font-bold text-p4g-ink-soft">{handled[n.id]}</p>}
        </div>
        {!multi && <button type="button" aria-label="更多" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); setMenuFor(n.id); }} className="h-8 w-8 shrink-0 self-start rounded-sm font-bold opacity-70 hover:bg-black/10">⋯</button>}
      </div>
    );
  };

  return (
    <>
      <P4Sheet open={isOpen} onClose={onClose} size="tall" hideClose
        footer={multi ? (
          <div className="flex items-center gap-3">
            <span className="min-w-0 flex-1 font-display text-body font-bold">多选模式 · 已选 {sel.size} 条</span>
            <P4Button size="sm" variant="secondary" onClick={() => { setMulti(false); setSel(new Set()); }}>取消</P4Button>
            <P4Button size="sm" variant="danger" disabled={sel.size === 0} aria-label="删除所选" title={`删除 ${sel.size} 条`} onClick={() => { remove([...sel]); setMulti(false); setSel(new Set()); }}>删除</P4Button>
          </div>
        ) : undefined}>
        <div aria-label="通知" className="pt-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 font-display text-h2 font-bold"><Sparkle size={18} className="text-p4g-orange" />通知</div>
              <div className="text-meta text-p4g-ink-soft">{unread > 0 ? `${unread} 条未读` : '没有新消息'}</div>
            </div>
            <P4Button size="sm" variant="secondary" disabled={unread === 0} onClick={markAllRead}>全部已读</P4Button>
            <button type="button" aria-label="关闭" onClick={onClose} className="p4g-press flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border-3 border-p4g-line bg-p4g-yellow font-bold text-p4g-black shadow-hard-sm">✕</button>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 rounded-sm bg-p4g-surface px-3 py-2 text-meta">
            <span className="text-p4g-ink-soft">筛选</span>
            <span className="flex items-center gap-2 font-bold"><span>{hideBattle ? '已隐藏战斗消息' : '显示战斗消息'}</span><P4Switch size="sm" checked={!hideBattle} onChange={(v) => setHideBattle(!v)} aria-label="战斗消息" /></span>
          </div>
          <div className="mt-3 overflow-hidden rounded-sm border-3 border-p4g-line">
            {loading ? <div className="py-8"><P4Loading size="sm" label="加载中…" /></div>
              : vis.length === 0 ? (
                <div className="bg-p4g-surface-2 py-12 text-center"><div className="mb-3 text-5xl text-p4g-ink/30">✦</div><p className="text-meta text-p4g-ink-soft">这里空无一物。<br />好友申请、回应、祈愿都会在这里提醒你。</p></div>
              ) : (
                <>
                  {fresh.length > 0 && <SectionHeader label="新消息" />}
                  {fresh.map((n) => <Row key={n.id} n={n} />)}
                  {old.length > 0 && <SectionHeader label="已读" />}
                  {old.map((n) => <Row key={n.id} n={n} />)}
                </>
              )}
          </div>
        </div>
      </P4Sheet>
      <P4ActionSheet open={!!menuFor} onClose={() => setMenuFor(null)} actions={[{ id: 'read', label: '标为已读' }, { id: 'del', label: '删除', danger: true }]}
        onAction={(id) => { if (!menuFor) return; if (id === 'read') markRead(menuFor); else { remove([menuFor]); showToast('已删除'); } setMenuFor(null); }} />
    </>
  );
}

function SectionHeader({ label }: { label: string }) {
  return <div className="flex items-center gap-2 bg-p4g-black px-3 py-1 font-display text-cap font-bold tracking-[0.2em] text-p4g-yellow"><span className="h-2 w-2 rotate-45 bg-p4g-orange" />{label}</div>;
}

export default function NotificationsPanel({ open, onClose, params }: OverlayProps) {
  const st = params?.get('state');
  return <NotificationsSheet isOpen={open} onClose={onClose} state={st === 'empty' || st === 'loading' ? st : null}
    onOpenCoopAccept={() => { window.location.hash = '#/overlay/bond-coop-accept'; }} onOpenPactRespond={() => { window.location.hash = '#/overlay/bond-pact-respond'; }} />;
}
