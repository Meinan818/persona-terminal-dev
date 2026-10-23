/**
 * 羁绊页 · 同伴（真实 src/pages/Cooperation.tsx，黄频道）。
 *
 * 版式 1:1 P4G：
 *   · 列表视图 = Social Link 列表（页头彩虹横条 + 白字黑描边「S.Link」+ 橙色星花；每行 左塔罗框 + 橙色 Rank 字 + 橙标签牌名 +
 *     白色分段进度 + 名字；选中整行反黑；绿/橙分隔线；右侧主角立绘位；底部提示行）。
 *   · 专辑墙视图 = 3D 塔罗 cover flow（左右切换 · 单击翻面 · 下滑看档案 + 刻度跳卡条 + 空白牌新增）。
 * 功能全量：同伴/组织切换、N / 22、✧ 菜单（关于 / 谏言 / 归档库 / 通知 + 红点）、简介面板、塔罗冲突提示、四个筛选、视图切换、
 * 在线好友占位卡（祈愿 / 名片）、祈愿快捷键四态、SHADOW 徽章、长按条目封面菜单、空状态、FAB、全部弹窗串联、升级演出链。
 * URL：?view=list|wall  ?filter=all|offline|online|archived  ?state=empty|loading|error  ?tab=org（兼容旧链接 → 重定向 #/p/hideout，与底导再点 / 页内「组织」切换同一落点）
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CloudProfile, Confidant } from '@real/types';
import type { PageProps } from '@yellow/registry/types';
import { P4Button, P4EmptyState, P4ErrorState, P4Loading, P4Outline, SlotImg, showToast } from '@yellow/kit';
import { CollageItem, CollageStagger } from '@yellow/fx';
import { navigate } from '@yellow/shell/shellBus';
import { p4gAsset } from '@yellow/lib/asset';
import { useLowMotion } from '@yellow/lib/prefs';
import { cx } from '@yellow/lib/cx';
import { Navigate } from 'react-router-dom';
import { ARCANA_SHORT, ATTR_NAMES, INTIMACY_LABELS, MAJOR_ARCANA_IDS, MAX_INTIMACY, TAROT_BY_ID, levelProgress } from '@yellow/screens/pkg3/arcana';
import { AsteriskFlower, NameFx, PactTag, PrayQuickButton, ShadowBadge, Sparkle, StatusTag, TarotCard, useCardBack } from '@yellow/screens/pkg3/ui';
import { P4CinemaChain, type ChainPage, type RankUpNotice } from '@yellow/screens/pkg3/cinema';
import { cooperationOps, shadowForConfidant, useCooperationData } from '@yellow/adapters/pkg3';
import { useAppStore } from '@/store';
import { CooperationMenuPanel } from '@yellow/screens/overlays/CooperationMenu.p4g';
import { ConfidantCreateSheet } from '@yellow/screens/overlays/ConfidantCreateModal.p4g';
import { ConfidantDetailSheet } from '@yellow/screens/overlays/ConfidantDetailModal.p4g';
import { InteractionSheet } from '@yellow/screens/overlays/ConfidantInteractionModal.p4g';
import { MemorialSheet } from '@yellow/screens/overlays/CoopMemorialPanel.p4g';
import { PactPanelModal } from '@yellow/screens/overlays/PactPanel.p4g';
import { PactRespondSheet } from '@yellow/screens/overlays/PactModals.p4g';
import { CounselChat } from '@yellow/screens/overlays/CounselChatModal.p4g';
import { CounselArchiveSheet } from '@yellow/screens/overlays/CounselArchiveModal.p4g';
import { NotificationsSheet } from '@yellow/screens/overlays/NotificationsPanel.p4g';
import { AddOnlineSheet } from '@yellow/screens/overlays/AddOnlineConfidantModal.p4g';
import { OnlineProfileSheet } from '@yellow/screens/overlays/OnlineConfidantProfileCard.p4g';
import { CoopProposeSheet } from '@yellow/screens/overlays/CoopProposeModal.p4g';
import { CoopAcceptSheet } from '@yellow/screens/overlays/CoopAcceptModal.p4g';
import { PrayerEffect, type PrayerEffectKind } from '@yellow/screens/overlays/PrayerEffectOverlay.p4g';
import { ShadowBattle } from '@yellow/screens/overlays/CoopShadowBattleModal.p4g';
import { VictoryScreen } from '@yellow/screens/overlays/CoopVictoryScreen.p4g';
import { CropDialog } from '@yellow/screens/overlays/ImageCropDialog.p4g';

type Filter = 'all' | 'offline' | 'online' | 'archived';
type ViewMode = 'wall' | 'list';
interface FriendItem { kind: 'friend'; id: string; profile: CloudProfile; prayed: boolean; beenPrayedBy: boolean; face?: string }
type WallItem = Confidant | FriendItem | 'add';
const isFriend = (x: WallItem): x is FriendItem => x !== 'add' && (x as FriendItem).kind === 'friend';
interface PrayerState { alreadyPrayed: boolean; waitingReciprocity: boolean; pending: boolean; onPray: () => void }

export default function Cooperation({ tab, params }: PageProps) {
  // 真实 App：组织视图 = currentPage 'hideout'（BondTitle.goBondView）。旧链接 ?tab=org 统一重定向到 #/p/hideout（保留其余参数）
  if (tab === 'org') { const q = new URLSearchParams(params); q.delete('tab'); const qs = q.toString(); return <Navigate to={`/p/hideout${qs ? `?${qs}` : ''}`} replace />; }
  return <Companions params={params} />;
}

function Companions({ params }: { params: URLSearchParams }) {
  const low = useLowMotion();
  const demoState = params.get('state');
  const loggedIn = params.get('login') !== '0';
  const { confidants: realConfidants, counselArchives, friends: realFriends, materializeBlockers, notifications, coopShadows, activeShadows, coopBonds, cloudUser } = useCooperationData();
  const [confidants, setConfidants] = useState<Confidant[]>(demoState === 'empty' ? [] : realConfidants);
  const [friends, setFriends] = useState<FriendItem[]>(demoState === 'empty' ? [] : realFriends.map((f) => ({ ...f })));
  useEffect(() => { if (demoState !== 'empty') setConfidants(realConfidants); }, [realConfidants, demoState]);
  useEffect(() => { if (demoState !== 'empty') setFriends(realFriends.map((f) => ({ ...f }))); }, [realFriends, demoState]);
  const [filter, setFilter] = useState<Filter>((params.get('filter') as Filter) || 'all');
  const [viewMode, setViewMode] = useState<ViewMode>((params.get('view') as ViewMode) || 'wall');
  const [loading, setLoading] = useState(demoState === 'loading');
  const [error, setError] = useState(demoState === 'error');
  const [menuOpen, setMenuOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;
  const importantUnread = notifications.filter((n) => !n.read && n.type !== 'prayer_received').length;
  const [ackedAt, setAckedAt] = useState<number | null>(null);
  const showDot = importantUnread > 0 && ackedAt !== importantUnread;
  // 弹窗
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [counselOpen, setCounselOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [addOnlineOpen, setAddOnlineOpen] = useState(false);
  const [profileCard, setProfileCard] = useState<CloudProfile | null>(null);
  const [proposeTarget, setProposeTarget] = useState<CloudProfile | null>(null);
  const [acceptOpen, setAcceptOpen] = useState(false);
  const acceptBond = coopBonds.find((b) => b.status === 'pending') ?? null;
  const [pactRespondOpen, setPactRespondOpen] = useState(false);
  const [interactionFor, setInteractionFor] = useState<Confidant | null>(null);
  const [memorialFor, setMemorialFor] = useState<Confidant | null>(null);
  const [pactFor, setPactFor] = useState<Confidant | null>(null);
  const [shadowBattle, setShadowBattle] = useState<string | null>(null);
  const [victory, setVictory] = useState(false);
  const [prayerFx, setPrayerFx] = useState<{ kind: PrayerEffectKind; name: string } | null>(null);
  const [prayerInFlight, setPrayerInFlight] = useState<string | null>(null);
  const [prayed, setPrayed] = useState<Record<string, boolean>>({ 'c-rise': true });
  const [interacted, setInteracted] = useState<Record<string, boolean>>({});
  const [chain, setChain] = useState<{ c: Confidant; notice: RankUpNotice; start: ChainPage } | null>(null);
  const [crop, setCrop] = useState<FriendItem | null>(null);

  const activeCount = confidants.filter((c) => !c.archivedAt).length;
  const remaining = MAJOR_ARCANA_IDS.length - activeCount;
  const counselState: 'available' | 'active' | 'cooldown' = params.get('counsel') === 'cooldown' ? 'cooldown' : params.get('counsel') === 'active' ? 'active' : 'available';

  const visible = useMemo(() => {
    const rank = (c: Confidant) => (c.archivedAt ? 2 : c.source === 'online' ? 0 : 1);
    const list = confidants.filter((c) => (filter === 'offline' ? !c.archivedAt && c.source === 'offline' : filter === 'online' ? !c.archivedAt && c.source === 'online' : filter === 'archived' ? !!c.archivedAt : !c.archivedAt));
    return [...list].sort((a, b) => rank(a) - rank(b) || b.createdAt.getTime() - a.createdAt.getTime());
  }, [confidants, filter]);
  const showOnlineFriends = (filter === 'all' || filter === 'online') && loggedIn;
  const friendItems = showOnlineFriends ? friends : [];

  const pray = useCallback((key: string, name: string, reciprocal: boolean, onDone: () => void) => {
    if (prayerInFlight) return;
    setPrayerInFlight(key);
    window.setTimeout(() => { setPrayerInFlight(null); onDone(); setPrayerFx({ kind: reciprocal ? 'reciprocal' : 'sent', name }); }, 650);
  }, [prayerInFlight]);
  const prayerFor = (c: Confidant): PrayerState | undefined => {
    if (!(c.source === 'online' && !c.archivedAt && c.linkedCloudUserId) || !loggedIn) return undefined;
    const waiting = c.id === 'c-chie' && !prayed[c.id];
    return { alreadyPrayed: !!prayed[c.id], waitingReciprocity: waiting, pending: prayerInFlight === c.id, onPray: () => pray(c.id, c.name, waiting, () => setPrayed((p) => ({ ...p, [c.id]: true }))) };
  };
  const friendPrayer = (f: FriendItem): PrayerState => ({ alreadyPrayed: f.prayed, waitingReciprocity: f.beenPrayedBy && !f.prayed, pending: prayerInFlight === f.id, onPray: () => pray(f.id, f.profile.nickname ?? '', f.beenPrayedBy, () => setFriends((l) => l.map((x) => (x.id === f.id ? { ...x, prayed: true } : x)))) });

  const detail = confidants.find((c) => c.id === detailId) ?? null;
  const detailShadow = useMemo(() => {
    if (!detail?.linkedCloudUserId) return null;
    const active = activeShadows.find((s) => s.userAId === detail.linkedCloudUserId || s.userBId === detail.linkedCloudUserId);
    return active ? shadowForConfidant(active, cloudUser?.id) : null;
  }, [activeShadows, cloudUser?.id, detail?.linkedCloudUserId]);
  const updateConfidant = (id: string, patch: Partial<Confidant>) => {
    setConfidants((l) => l.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    void cooperationOps.update(id, patch);
  };

  if (loading) return <div className="py-16"><P4Loading label="信号接收中" /><div className="mt-4 flex justify-center"><P4Button size="sm" variant="secondary" onClick={() => setLoading(false)}>（演示）完成加载</P4Button></div></div>;
  if (error) return <div className="py-10"><P4ErrorState message="同伴数据没能读出来。" onRetry={() => setError(false)} /></div>;

  return (
    <div className="relative mx-auto w-full max-w-[880px] min-w-0 pb-24">
      {/* ── 页头：同伴 / 组织 + N/22 + ✧ 菜单 ── */}
      <div className="relative -mx-4 mb-4 overflow-visible">
        <div aria-hidden className="h-6 p4g-candy-h" />
        <div className="flex min-w-0 items-end gap-2 px-4 pt-2">
          <div role="tablist" aria-label="同伴 / 组织切换" className="flex min-w-0 items-end gap-3">
            <button role="tab" aria-selected type="button" aria-label="同伴（现在这页）" className="min-w-0">
              <P4Outline size="clamp(34px, 10vw, 52px)" stroke={6} italic drop={3}>同伴</P4Outline>
            </button>
            <button role="tab" aria-selected={false} type="button" aria-label="点一下切换到组织" onClick={() => navigate('hideout', undefined, { transition: 'noise' })} data-bond-toggle className="mb-1.5 shrink-0 rounded-[2px] border-2 border-p4g-line bg-p4g-surface-2 px-2 py-0.5 font-display text-meta font-bold text-p4g-ink">组织</button>
          </div>
          <AsteriskFlower size={44} className="pk3-twinkle mb-1 hidden shrink-0 sm:block" />
          <div className="ml-auto flex shrink-0 items-center gap-2 pb-1">
            <span className="rounded-[2px] bg-p4g-black px-2 py-1 p4g-num text-meta text-p4g-yellow night:border-2 night:border-p4g-yellow" aria-label={`已缔结 ${activeCount} / ${MAJOR_ARCANA_IDS.length}`}>{activeCount} / {MAJOR_ARCANA_IDS.length}</span>
            <div className="relative">
              <button type="button" data-coop-menu-trigger onClick={() => { setMenuOpen((v) => !v); if (!menuOpen) setAckedAt(importantUnread); }}
                aria-label={showDot ? `同伴系统菜单（${unreadCount} 条新通知）` : '同伴系统菜单'}
                className={cx('p4g-press relative flex h-10 w-10 items-center justify-center rounded-sm border-3 text-lead font-bold shadow-hard-sm', menuOpen ? 'border-p4g-black bg-p4g-black text-p4g-yellow night:border-p4g-yellow' : 'border-p4g-line bg-p4g-yellow text-p4g-black')}>
                ✧
                {showDot && <span aria-hidden className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-p4g-black bg-p4g-red" />}
              </button>
              <CooperationMenuPanel open={menuOpen} onClose={() => setMenuOpen(false)} counselState={counselState} cooldownDate="10/22" archiveCount={counselArchives.length} loggedIn={loggedIn} unreadCount={unreadCount}
                onAbout={() => setInfoOpen((v) => !v)} onCounsel={() => setCounselOpen(true)} onArchive={() => setArchiveOpen(true)} onNotifications={() => setNotifOpen(true)} />
            </div>
          </div>
        </div>
      </div>

      {/* 简介面板 */}
      <AnimatePresence initial={false}>
        {infoOpen && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="mb-4">
            <div className="relative rounded-sm border-3 border-p4g-black bg-[color:var(--p4g-msg)] p-4 text-[color:var(--p4g-msg-ink)] shadow-plate">
              <p className="text-body leading-relaxed"><span className="mr-1 text-p4g-yellow">&gt;</span>每一段关系都对应一张塔罗大阿卡纳。记录下 Ta，让这段羁绊随着你的真诚一起成长——亲密度提升会解锁日常加成、战斗道具与永久技能。</p>
              <p className="mt-2 text-cap leading-relaxed text-[color:var(--p4g-msg-ink)]/75">· 22 张大阿卡纳，每位同伴唯一占用一张<br />· 长按详情页的塔罗牌可换为自定义头像（仅保留本地）<br />· 详情页中部右侧的灰色 ✧ 可一键进入「谏言」，直接聊聊这段关系</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 塔罗冲突 */}
      {materializeBlockers.length > 0 && demoState !== 'empty' && (
        <div className="mb-4 flex min-w-0 items-start gap-2 rounded-sm border-3 border-p4g-black bg-p4g-orange px-3 py-2.5 text-meta text-p4g-black">
          <span className="mt-0.5 shrink-0">⚠️</span>
          <div className="min-w-0">
            <div className="font-bold">有 {materializeBlockers.length} 位已缔结 COOP 的同伴因塔罗冲突未能生成本地卡片</div>
            <div className="opacity-85">{materializeBlockers.map((b) => `@${b.otherName}`).join('、')} 想占用的塔罗已被其他活跃同伴使用。请先把冲突的同伴归档（或让对方改选塔罗），然后下次刷新会自动补齐。</div>
          </div>
        </div>
      )}

      {/* 筛选 + 视图切换 */}
      <div className="mb-4 flex min-w-0 items-center gap-2">
        <div role="tablist" className="grid min-w-0 flex-1 grid-cols-4 gap-1 rounded-full border-3 border-p4g-line bg-p4g-surface-2 p-1">
          {([['all', '全部'], ['offline', '离线'], ['online', '在线'], ['archived', '归档']] as const).map(([id, label]) => {
            const on = filter === id;
            return (
              <button key={id} role="tab" aria-selected={on} type="button" onClick={() => setFilter(id)} className={cx('relative min-w-0 rounded-full py-1.5 font-display text-body font-bold', on ? 'text-p4g-black' : 'text-p4g-ink-soft')}>
                {on && <motion.span layoutId={low ? undefined : 'pk3-filter'} className="absolute inset-0 rounded-full bg-p4g-orange" transition={{ duration: 0.2, ease: [0.2, 0.9, 0.1, 1] }} />}
                {on && <Sparkle size={10} className="absolute left-1.5 top-0.5 text-white" />}
                <span className="relative">{label}</span>
              </button>
            );
          })}
        </div>
        <button type="button" onClick={() => setViewMode(viewMode === 'wall' ? 'list' : 'wall')} aria-label={viewMode === 'wall' ? '切换到列表视图' : '切换到专辑墙视图'} title={viewMode === 'wall' ? '列表视图' : '专辑墙视图'}
          className="p4g-press flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border-3 border-p4g-line bg-p4g-yellow text-lead text-p4g-black shadow-hard-sm">{viewMode === 'wall' ? '☰' : '🃏'}</button>
      </div>

      {/* 主体 */}
      {visible.length === 0 && friendItems.length === 0 ? (
        <P4EmptyState title={filter === 'archived' ? '暂无归档的同伴' : '尚未与任何同伴建立羁绊'} action={filter !== 'archived' ? <P4Button size="lg" onClick={() => setCreateOpen(true)} leading={<Sparkle size={16} />}>邀请第一位同伴</P4Button> : undefined} />
      ) : viewMode === 'list' ? (
        <SLinkList confidants={visible} friends={friendItems} prayerFor={prayerFor} friendPrayer={friendPrayer} loggedIn={loggedIn}
          onOpen={(c) => setDetailId(c.id)} onOpenFriend={(f) => setProfileCard(f.profile)} onShadow={(c) => setShadowBattle(c.name)} onPrefer={(c, t) => updateConfidant(c.id, { preferTarotOverAvatar: t })} />
      ) : (
        <AlbumWall confidants={visible} friends={friendItems} canCreate={remaining > 0 && filter !== 'archived'} prayerFor={prayerFor} friendPrayer={friendPrayer}
          onOpenDetail={(c) => setDetailId(c.id)} onCreate={() => setCreateOpen(true)} onOpenFriend={(f) => setProfileCard(f.profile)} onPropose={(f) => setProposeTarget(f.profile)} onCropFriend={(f) => setCrop(f)} />
      )}

      {/* FAB */}
      {remaining > 0 && filter !== 'archived' && (
        <button type="button" onClick={() => setCreateOpen(true)} aria-label="新增同伴" className="p4g-press fixed bottom-24 right-5 flex h-16 w-16 items-center justify-center wide:bottom-8 wide:right-8" style={{ zIndex: 'var(--p4g-z-nav)' as unknown as number }}>
          <Sparkle size={64} className="absolute inset-0 text-p4g-orange" style={{ filter: 'drop-shadow(3px 3px 0 var(--p4g-black))' }} />
          <span className="relative font-display text-h2 font-bold text-p4g-black">+</span>
        </button>
      )}

      {/* ── 弹窗串联 ── */}
      <ConfidantCreateSheet isOpen={createOpen} onClose={() => setCreateOpen(false)} remaining={remaining} onPickOnline={() => { setCreateOpen(false); setAddOnlineOpen(true); }}
        onCreated={(r) => { void cooperationOps.add({ name: r.name, description: r.description, match: { arcanaId: r.arcanaId, orientation: r.orientation, initialIntimacy: Math.min(3, r.level), initialPoints: [0, 4, 9, 16, 25, 36, 50, 70, 95, 125, 160][r.level] ?? 0, interpretation: '', advice: '', source: 'offline' }, source: 'offline', initialLevel: r.level }).then((c) => { if (r.decay) void cooperationOps.update(c.id, { decayEnabled: true }); setDetailId(c.id); }).catch(() => showToast('没能创建这段羁绊')); }} />
      <ConfidantDetailSheet isOpen={!!detail} onClose={() => setDetailId(null)} confidant={detail} loggedIn={loggedIn} hasShadow={!!detailShadow} shadow={detailShadow} interactedToday={!!(detail && interacted[detail.id])}
        onUpdate={(p) => detail && updateConfidant(detail.id, p)} onDelete={() => { if (!detail) return; void cooperationOps.remove(detail.id); setConfidants((l) => l.filter((c) => c.id !== detail.id)); }}
        onOpenCounsel={() => setCounselOpen(true)} onOpenInteraction={() => detail && setInteractionFor(detail)} onOpenPact={() => detail && setPactFor(detail)} onOpenMemorial={() => detail && setMemorialFor(detail)}
        onOpenStarShift={() => detail && setChain({ c: detail, notice: { oldLevel: detail.intimacy, newLevel: detail.intimacy, starShiftGained: false }, start: 'page3' })}
        onViewOnlineProfile={() => detail?.linkedProfile && setProfileCard(detail.linkedProfile)} onOpenCoopShadow={() => detail && setShadowBattle(detail.name)} />
      {interactionFor && <InteractionSheet isOpen onClose={() => setInteractionFor(null)} confidant={interactionFor} loggedIn={loggedIn}
        onSaved={() => {
          const old = interactionFor;
          const fresh = useAppStore.getState().confidants.find((c) => c.id === old.id);
          if (!fresh) return;
          setInteracted((m) => ({ ...m, [fresh.id]: true }));
          setConfidants((l) => l.map((c) => (c.id === fresh.id ? fresh : c)));
          window.setTimeout(() => {
            setInteractionFor(null);
            if (fresh.intimacy > old.intimacy) {
              setDetailId(null);
              setChain({ c: fresh, notice: { oldLevel: old.intimacy, newLevel: fresh.intimacy, starShiftGained: true }, start: 'stage' });
            }
          }, 700);
        }} />}
      {memorialFor && <MemorialSheet isOpen onClose={() => setMemorialFor(null)} confidant={memorialFor} />}
      <PactPanelModal open={!!pactFor} onClose={() => setPactFor(null)} partnerName={pactFor?.name ?? ''} />
      <CounselChat isOpen={counselOpen} onClose={() => setCounselOpen(false)} initialState={counselState === 'cooldown' ? 'cooldown' : counselState === 'active' ? 'live' : 'intro'} />
      <CounselArchiveSheet isOpen={archiveOpen} onClose={() => setArchiveOpen(false)} />
      <NotificationsSheet isOpen={notifOpen} onClose={() => setNotifOpen(false)} onOpenCoopAccept={() => setAcceptOpen(true)} onOpenPactRespond={() => setPactRespondOpen(true)} />
      <AddOnlineSheet isOpen={addOnlineOpen} onClose={() => setAddOnlineOpen(false)} loggedIn={loggedIn} />
      {profileCard && <OnlineProfileSheet isOpen onClose={() => setProfileCard(null)} profile={profileCard} loggedIn={loggedIn}
        initialCoop={confidants.some((c) => c.linkedCloudUserId === profileCard.id) ? 'linked' : 'none'} initialPrayed={!!friends.find((f) => f.profile.id === profileCard.id)?.prayed}
        onProposeCoop={() => setProposeTarget(profileCard)} onAcceptCoop={() => setAcceptOpen(true)} onPray={() => setPrayerFx({ kind: 'sent', name: profileCard.nickname ?? '' })} />}
      <CoopProposeSheet isOpen={!!proposeTarget} onClose={() => setProposeTarget(null)} target={proposeTarget} targetName={proposeTarget?.nickname || proposeTarget?.userId || '未命名客人'} />
      <CoopAcceptSheet isOpen={acceptOpen} onClose={() => setAcceptOpen(false)} bond={acceptBond} />
      <PactRespondSheet isOpen={pactRespondOpen} onClose={() => setPactRespondOpen(false)} name="千枝" />
      <PrayerEffect isOpen={!!prayerFx} kind={prayerFx?.kind ?? 'sent'} targetName={prayerFx?.name ?? ''} onDismiss={() => setPrayerFx(null)} />
      <ShadowBattle isOpen={!!shadowBattle} onClose={() => setShadowBattle(null)} partnerName={shadowBattle ?? ''} shadow={activeShadows[0] ?? null} onVictory={() => { setShadowBattle(null); setVictory(true); }} />
      <VictoryScreen isOpen={victory} onClose={() => setVictory(false)} partnerName="千枝" shadowName="镜中之影" />
      <CropDialog open={!!crop} onClose={() => setCrop(null)} title={crop ? `裁切 ${crop.profile.nickname} 的卡面` : '裁切卡面'} aspect={1 / 1.6} src={p4gAsset('tv-mascot.webp')}
        onDone={(url) => { if (crop) setFriends((l) => l.map((x) => (x.id === crop.id ? { ...x, face: url } : x))); setCrop(null); showToast('卡面已更新'); }} />
      {chain && <P4CinemaChain open onClose={() => setChain(null)} confidant={chain.c} notice={chain.notice} start={chain.start} charges={chain.c.starShiftCharges ?? 0} attrName={chain.c.skillAttribute ? ATTR_NAMES[chain.c.skillAttribute] : undefined} />}
    </div>
  );
}

// ═══════════════════════════════ 列表视图：S.Link ═══════════════════════════════
function SLinkList({ confidants, friends, prayerFor, friendPrayer, loggedIn, onOpen, onOpenFriend, onShadow, onPrefer }: {
  confidants: Confidant[]; friends: FriendItem[]; prayerFor: (c: Confidant) => PrayerState | undefined; friendPrayer: (f: FriendItem) => PrayerState; loggedIn: boolean;
  onOpen: (c: Confidant) => void; onOpenFriend: (f: FriendItem) => void; onShadow: (c: Confidant) => void; onPrefer: (c: Confidant, tarot: boolean) => void;
}) {
  const { coopShadows } = useCooperationData();
  const rows: { k: string; f?: FriendItem; c?: Confidant }[] = [...friends.map((f) => ({ k: f.id, f })), ...confidants.map((c) => ({ k: c.id, c }))];
  const [sel, setSel] = useState(0);
  const [menu, setMenu] = useState<{ c: Confidant; x: number; y: number } | null>(null);
  const press = useRef<number | null>(null);
  const long = useRef(false);
  const wrap = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!menu) return; const f = () => setMenu(null); window.addEventListener('pointerdown', f); return () => window.removeEventListener('pointerdown', f); }, [menu]);
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(rows.length - 1, s + 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
    if (e.key === 'Enter') { const r = rows[sel]; if (r?.c) onOpen(r.c); else if (r?.f) onOpenFriend(r.f); }
  };
  return (
    <div className="relative grid grid-cols-1 gap-0 lg:grid-cols-[minmax(0,1fr)_220px]">
      <div ref={wrap} tabIndex={0} onKeyDown={onKey} className="relative min-w-0 overflow-hidden rounded-sm border-3 border-p4g-line shadow-hard outline-none">
        {/* S.Link 页头横条 */}
        <div className="relative h-12 overflow-hidden">
          <div aria-hidden className="absolute inset-0 p4g-candy-h" />
          <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
            <P4Outline size={28} stroke={5} italic>S.Link</P4Outline>
            <AsteriskFlower size={38} />
          </div>
        </div>
        <CollageStagger>
          {rows.map((r, i) => {
            const selected = i === sel;
            if (r.f) {
              const f = r.f; const p = friendPrayer(f); const name = f.profile.nickname || f.profile.userId || '未命名客人';
              return (
                <CollageItem key={r.k} from="left">
                  <div role="button" tabIndex={-1} onMouseEnter={() => setSel(i)} onClick={(e) => { if ((e.target as HTMLElement).closest('[data-pray-button]')) return; onOpenFriend(f); }}
                    className={cx('relative flex min-w-0 cursor-pointer items-center gap-3 px-3 py-2.5', selected ? 'bg-p4g-select text-[color:var(--p4g-select-ink)]' : 'text-p4g-ink')} style={selected ? undefined : { background: 'var(--p4g-surface-grad)' }}>
                    <span className={cx('flex h-[60px] w-[38px] shrink-0 items-center justify-center rounded-[3px] border-[3px] border-dashed font-display text-h3 font-bold', selected ? 'border-[color:var(--p4g-select-ink)]' : 'border-p4g-success text-p4g-success')}>{(name[0] || '?').toUpperCase()}</span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                        <span className={cx('font-display text-lead font-bold italic leading-none', selected ? '' : 'text-[color:var(--p4g-rank)]')}>LV {f.profile.totalLv}</span>
                        <StatusTag tone="online">ONLINE</StatusTag>{p.waitingReciprocity && <StatusTag tone="waiting">待回应</StatusTag>}
                      </span>
                      <NameFx waiting={p.waitingReciprocity} className="block truncate font-display text-lead font-bold">{name}</NameFx>
                      <span className={cx('truncate text-cap', selected ? 'opacity-80' : 'text-p4g-ink-soft')}>@{f.profile.userId ?? '—'} · {p.alreadyPrayed ? '今日已为 Ta 祈愿 · 点开查看详情' : p.waitingReciprocity ? 'Ta 今天为你祈愿了，回敬一下？' : '点开看名片 · 或直接祈愿（双方各 +2 SP）'}</span>
                      <span className="flex flex-wrap gap-1"><PactTag text={`与 ${name}`} /></span>
                    </span>
                    <PrayQuickButton alreadyPrayed={p.alreadyPrayed} waitingReciprocity={p.waitingReciprocity} pending={p.pending} onClick={p.onPray} />
                    {!selected && <span aria-hidden className="absolute inset-x-0 bottom-0 h-[2px]" style={{ background: i % 2 ? 'var(--p4g-separator-b)' : 'var(--p4g-separator-a)' }} />}
                  </div>
                </CollageItem>
              );
            }
            const c = r.c!; const card = TAROT_BY_ID[c.arcanaId]; const prog = levelProgress(c); const pr = prayerFor(c);
            const isOnline = c.source === 'online'; const archived = !!c.archivedAt;
            const avatar = isOnline && !c.preferTarotOverAvatar ? undefined : undefined; void avatar;
            const showAvatar = isOnline && !c.preferTarotOverAvatar && !!c.linkedProfile;
            return (
              <CollageItem key={r.k} from="left">
                <div role="button" tabIndex={-1}
                  onMouseEnter={() => setSel(i)}
                  onPointerDown={(e) => { if (!isOnline || archived || !loggedIn) return; if ((e.target as HTMLElement).closest('[data-pray-button],[data-shadow-badge]')) return; long.current = false; const rect = (e.currentTarget as HTMLElement).getBoundingClientRect(); press.current = window.setTimeout(() => { long.current = true; setMenu({ c, x: rect.right - 12, y: rect.top + 18 }); }, 480); }}
                  onPointerUp={() => { if (press.current) clearTimeout(press.current); }} onPointerLeave={() => { if (press.current) clearTimeout(press.current); }}
                  onContextMenu={(e) => { if (isOnline && !archived) { e.preventDefault(); long.current = true; setMenu({ c, x: e.clientX, y: e.clientY }); } }}
                  onClick={(e) => { if (long.current) { long.current = false; return; } if ((e.target as HTMLElement).closest('[data-pray-button]')) return; onOpen(c); }}
                  className={cx('relative flex min-w-0 cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors', selected ? 'bg-p4g-select text-[color:var(--p4g-select-ink)]' : 'text-p4g-ink', archived && 'opacity-60')}
                  style={selected ? undefined : { background: 'var(--p4g-surface-grad)' }}>
                  <span className={cx('relative shrink-0 rounded-[4px] border-[3px] p-[2px]', selected ? 'border-[color:var(--p4g-select-ink)]' : 'border-p4g-orange bg-p4g-yellow-pale')}>
                    {showAvatar ? (
                      <span className="flex h-[54px] w-[34px] items-center justify-center rounded-[2px] bg-p4g-success font-display text-h3 font-bold text-p4g-success-ink">{(c.linkedProfile?.nickname || c.name)[0]}</span>
                    ) : <TarotCard arcanaId={c.arcanaId} orientation={c.orientation} width={34} labels={false} />}
                    <span className="absolute -bottom-1.5 -right-1.5 rounded-[2px] bg-p4g-black px-1 text-[9px] font-bold leading-[14px] text-p4g-yellow">{card?.roman ?? '✧'}</span>
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                      <span className={cx('shrink-0 font-display text-lead font-bold italic leading-none', selected ? '' : 'text-[color:var(--p4g-rank)]')}>{c.intimacy >= MAX_INTIMACY ? 'Max' : `Rank ${c.intimacy}`}</span>
                      <span className={cx('min-w-0 truncate rounded-xs px-2 py-[3px] font-display text-meta font-bold leading-none', selected ? 'bg-[color:var(--p4g-select-ink)] text-[color:var(--p4g-select)]' : 'bg-p4g-tag text-[color:var(--p4g-tag-ink)]')}>{ARCANA_SHORT[c.arcanaId]} · {card?.name}</span>
                      {isOnline && <StatusTag tone="online">ONLINE</StatusTag>}
                      {!archived && (() => {
                        const sh = c.source === 'online' && c.linkedCloudUserId
                          ? coopShadows.find((s) => s.status === 'active' && (s.userAId === c.linkedCloudUserId || s.userBId === c.linkedCloudUserId))
                          : undefined;
                        return sh ? <ShadowBadge identified={sh.identifiedByA && sh.identifiedByB} hpPct={Math.round((sh.hpCurrent / sh.hpMax) * 100)} onClick={() => onShadow(c)} /> : null;
                      })()}
                      {c.decayEnabled && <StatusTag tone="decay">逆流</StatusTag>}
                      {archived && <StatusTag tone="archived">归档</StatusTag>}
                      {pr?.waitingReciprocity && !pr.alreadyPrayed && <StatusTag tone="waiting">待回应</StatusTag>}
                    </span>
                    {/* S.Link 分段条 */}
                    <span className={cx('mt-0.5 flex h-[13px] w-full max-w-[360px] items-center gap-[3px] rounded-[2px] px-[4px]', selected ? 'bg-[color:var(--p4g-select-ink)]' : 'bg-p4g-orange')} role="progressbar" aria-valuenow={c.intimacy} aria-valuemax={10}>
                      {Array.from({ length: 10 }, (_, k) => <span key={k} className={cx('h-[6px] flex-1 rounded-[1px]', k < c.intimacy ? (selected ? 'bg-p4g-select' : 'bg-white') : (selected ? 'bg-p4g-select/25' : 'bg-p4g-orange-deep/60'))} />)}
                    </span>
                    <span className="flex min-w-0 items-baseline gap-2">
                      {isOnline && <Sparkle size={12} className={cx('shrink-0 self-center', pr?.waitingReciprocity ? 'pk3-twinkle text-p4g-orange' : selected ? '' : 'text-p4g-success')} />}
                      <NameFx waiting={!!pr?.waitingReciprocity && !pr.alreadyPrayed} maxBond={c.intimacy >= MAX_INTIMACY} className="block min-w-0 truncate font-display text-lead font-bold leading-tight">{c.name}</NameFx>
                    </span>
                    <span className={cx('truncate text-cap', selected ? 'opacity-80' : 'text-p4g-ink-soft')}>
                      《{card?.name}》{c.orientation === 'reversed' ? '逆位' : '正位'} · {INTIMACY_LABELS[c.intimacy]} · {prog.isMax ? '圆满' : `还差 ${prog.gap} 点到 Lv ${c.intimacy + 1}`}
                    </span>
                    {isOnline && !archived && <span className="flex flex-wrap gap-1"><PactTag text={c.id === 'c-chie' ? `${c.name} 催你了` : `与 ${c.name} · 已同步 ✓`} tone={c.id === 'c-chie' ? 'hot' : 'done'} /></span>}
                  </span>
                  {pr && <PrayQuickButton alreadyPrayed={pr.alreadyPrayed} waitingReciprocity={pr.waitingReciprocity} pending={pr.pending} onClick={pr.onPray} />}
                  {!selected && <span aria-hidden className="absolute inset-x-0 bottom-0 h-[2px]" style={{ background: i % 2 ? 'var(--p4g-separator-b)' : 'var(--p4g-separator-a)' }} />}
                </div>
              </CollageItem>
            );
          })}
        </CollageStagger>
        <div className="flex items-center justify-between gap-2 px-3 py-2" style={{ background: 'var(--p4g-surface-grad)' }}>
          <span className="min-w-0 truncate font-display text-meta font-bold text-p4g-ink">查看档案 →</span>
          <span className="flex shrink-0 gap-2 font-display text-2xs font-bold text-p4g-ink-soft"><span><b className="mr-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-p4g-black text-[9px] text-white">○</b>档案</span><span className="hidden sm:inline"><b className="mr-0.5 rounded-[2px] bg-p4g-black px-1 text-[9px] text-white">长按</b>条目封面</span></span>
        </div>
      </div>
      {/* 右侧主角立绘位（P4G S.Link 页右侧角色） */}
      <div className="pointer-events-none relative hidden items-start justify-center pt-10 lg:flex">
        <SlotImg slot="char-protagonist" fallback={p4gAsset('tv-mascot.webp')} alt="" className="pk3-bob sticky top-24 w-full max-w-[220px] object-contain" />
      </div>
      {/* 长按菜单：条目封面 */}
      <AnimatePresence>
        {menu && (
          <motion.div key="m" data-card-menu onPointerDown={(e) => e.stopPropagation()} initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="fixed w-48 overflow-hidden rounded-sm border-3 border-p4g-black bg-p4g-black text-white shadow-[4px_4px_0_var(--p4g-orange)]" style={{ top: menu.y, left: Math.max(8, menu.x - 192), zIndex: 'var(--p4g-z-sheet)' as unknown as number }}>
            <div className="px-3 pb-1 pt-2 font-display text-2xs font-bold tracking-widest text-p4g-yellow">条目封面</div>
            {[{ label: '对方头像', sub: '跟随云端', tarot: false }, { label: '塔罗', sub: '保持隐喻感', tarot: true }].map((it) => (
              <button key={it.label} type="button" onClick={() => { onPrefer(menu.c, it.tarot); setMenu(null); }} className="flex w-full items-center gap-2 border-t border-white/10 px-3 py-2.5 text-left hover:bg-p4g-orange hover:text-p4g-black">
                <span className="w-3 text-center font-bold text-p4g-success">{!!menu.c.preferTarotOverAvatar === it.tarot ? '✓' : ''}</span>
                <span className="min-w-0 flex-1"><span className="block font-display text-body font-bold">{it.label}</span><span className="block text-2xs opacity-70">{it.sub}</span></span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════ 专辑墙视图：3D cover flow ═══════════════════════════════
function AlbumWall({ confidants, friends, canCreate, prayerFor, friendPrayer, onOpenDetail, onCreate, onOpenFriend, onPropose, onCropFriend }: {
  confidants: Confidant[]; friends: FriendItem[]; canCreate: boolean; prayerFor: (c: Confidant) => PrayerState | undefined; friendPrayer: (f: FriendItem) => PrayerState;
  onOpenDetail: (c: Confidant) => void; onCreate: () => void; onOpenFriend: (f: FriendItem) => void; onPropose: (f: FriendItem) => void; onCropFriend: (f: FriendItem) => void;
}) {
  const low = useLowMotion();
  const back = useCardBack();
  const items: WallItem[] = useMemo(() => [...confidants, ...friends, ...(canCreate ? (['add'] as const) : [])], [confidants, friends, canCreate]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [slideX, setSlideX] = useState(0);
  const [dragDown, setDragDown] = useState(0);
  const [dragRot, setDragRot] = useState(0);
  // 手势状态：按下时就记下命中的卡下标（targetIdx）——容器 setPointerCapture 之后，
  // pointerup 的 e.target 会变成容器本身，松手时再 closest() 找卡永远找不到（旧版两侧卡点不动的根因）。
  const g = useRef<{ x: number; y: number; t: number; mode: 'flip' | 'slide'; targetIdx: number; startIdx: number; axis: 'x' | 'y' | null } | null>(null);
  const count = items.length;
  useEffect(() => { if (index > count - 1) setIndex(Math.max(0, count - 1)); }, [count, index]);
  const go = (i: number) => { const n = Math.max(0, Math.min(count - 1, i)); if (n !== index) { setIndex(n); setFlipped(false); } };
  const current = items[index];
  const cardW = 'clamp(150px, 44vw, 196px)';
  const STEP = 92; // 与真实 ConfidantAlbumWall STEP_X 一致：跟手一张张翻

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    const el = (e.target as HTMLElement).closest('[data-wall-idx]') as HTMLElement | null;
    const idx = el ? Number(el.dataset.wallIdx) : -1;
    g.current = { x: e.clientX, y: e.clientY, t: performance.now(), mode: idx === index ? 'flip' : 'slide', targetIdx: idx, startIdx: index, axis: null };
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* noop */ }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const s = g.current; if (!s) return;
    const dx = e.clientX - s.x; const dy = e.clientY - s.y;
    if (!s.axis && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) s.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    if (!s.axis) return;
    if (s.axis === 'x') {
      if (s.mode === 'flip' && flipped) { setDragRot(Math.max(-170, Math.min(170, dx * 0.42))); return; }
      const n = Math.round(-dx / STEP);
      const target = Math.max(0, Math.min(count - 1, s.startIdx + n));
      if (target !== index) { setIndex(target); setFlipped(false); }
      setSlideX(dx + (target - s.startIdx) * STEP);
    } else if (s.mode === 'flip' && dy > 0 && current !== 'add') setDragDown(Math.min(20, dy * 0.5));
  };
  const endGesture = (e: React.PointerEvent) => {
    const s = g.current; g.current = null;
    if (!s) return;
    const dx = e.clientX - s.x; const dy = e.clientY - s.y;
    const dt = Math.max(1, performance.now() - s.t);
    const isTap = Math.abs(dx) < 8 && Math.abs(dy) < 8;
    const wasDown = dragDown;
    setSlideX(0); setDragDown(0); setDragRot(0);
    if (e.type === 'pointercancel') return;
    if (s.mode === 'flip') {
      if (isTap) { if (current === 'add') onCreate(); else setFlipped((f) => !f); return; }
      if (s.axis === 'y') { if (wasDown >= 12 && current && current !== 'add') { if (isFriend(current)) onOpenFriend(current); else onOpenDetail(current); } return; }
      if (flipped) { if (Math.abs(dx) > 90) setFlipped(false); return; }
    } else if (isTap) {
      if (s.targetIdx >= 0) go(s.targetIdx); // 点两侧卡 = 跳到它
      return;
    }
    // 横拖已实时切卡；松手只做甩动补偿（快甩多切一张）
    const v = dx / dt;
    if (s.axis === 'x' && Math.abs(v) > 0.5) go(index + (v < 0 ? 1 : -1));
  };

  const nameplate = () => {
    if (current === 'add' || !current) return (<div className="text-center"><div className="font-display text-h2 font-bold text-[color:var(--p4g-on-stage)]">缔结新的羁绊</div><div className="mt-0.5 text-meta font-bold text-[color:var(--p4g-on-stage)] opacity-70">点一下这张空白牌开始</div></div>);
    if (isFriend(current)) {
      const p = friendPrayer(current);
      return (
        <div className="text-center">
          <div className="font-display text-cap font-bold tracking-[0.16em] text-[color:var(--p4g-rank)]">GUEST · 未缔结 COOP</div>
          <div className="mt-0.5 flex min-w-0 items-center justify-center gap-2">
            <Sparkle size={14} className={cx('shrink-0', p.waitingReciprocity ? 'pk3-twinkle text-p4g-orange' : 'text-p4g-success')} />
            <P4Outline size="clamp(28px, 8vw, 40px)" stroke={6} className="max-w-[70%] overflow-hidden text-ellipsis">{current.profile.nickname || current.profile.userId || '未命名客人'}</P4Outline>
            <span className="shrink-0 -skew-x-6 rounded-[4px] bg-p4g-tag px-2 py-1 font-display text-cap font-bold italic leading-none text-[color:var(--p4g-tag-ink)] shadow-hard-sm">LV {current.profile.totalLv ?? '—'}</span>
          </div>
          {p.waitingReciprocity && !p.alreadyPrayed && <p className="mx-auto mt-2 max-w-[21rem] font-display text-meta font-bold text-[color:var(--p4g-rank)]">✦ 今日未回应对方祈愿</p>}
        </div>
      );
    }
    const card = TAROT_BY_ID[current.arcanaId]; const pr = prayerFor(current);
    return (
      <div className="text-center">
        <div className="font-display text-meta font-bold tracking-[0.14em] text-[color:var(--p4g-rank)]">{card?.roman ? `${card.roman} · ` : ''}{card?.name}{current.orientation === 'reversed' ? ' · 逆位' : ' · 正位'}</div>
        <div className="mt-0.5 flex min-w-0 items-center justify-center gap-2.5">
          <NameFx waiting={!!pr?.waitingReciprocity && !pr.alreadyPrayed} maxBond={current.intimacy >= MAX_INTIMACY} className="max-w-[70%] overflow-hidden">
            <P4Outline size="clamp(30px, 9vw, 44px)" stroke={6} className="max-w-full overflow-hidden text-ellipsis">{current.name}</P4Outline>
          </NameFx>
          <span className="shrink-0 -skew-x-6 rounded-[6px] bg-p4g-tag px-2 py-1 font-display text-cap font-bold italic leading-none text-[color:var(--p4g-tag-ink)] shadow-hard-sm">RANK {current.intimacy}</span>
        </div>
        {current.description && <p className="mx-auto mt-2 max-w-[21rem] text-meta font-bold leading-relaxed text-[color:var(--p4g-on-stage)] opacity-80 p4g-clamp-2">{current.description}</p>}
      </div>
    );
  };

  return (
    <div className="relative" aria-label="羁绊专辑墙">
      <div data-qa-allow-clip className="pk3-3d relative mx-auto h-[clamp(270px,78vw,340px)] w-full touch-none select-none overflow-hidden outline-none" tabIndex={0}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endGesture} onPointerCancel={endGesture}
        onKeyDown={(e) => { if (e.key === 'ArrowLeft') go(index - 1); if (e.key === 'ArrowRight') go(index + 1); if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (current === 'add') onCreate(); else setFlipped((f) => !f); } if (e.key === 'ArrowDown' && current && current !== 'add') { if (isFriend(current)) onOpenFriend(current); else onOpenDetail(current); } }}>
        {items.map((it, i) => {
          const offset = i - index;
          if (Math.abs(offset) > 3) return null;
          const isCenter = offset === 0;
          const x = offset * 88 + (offset !== 0 ? Math.sign(offset) * 36 : 0);
          const rotY = isCenter ? (flipped ? 180 : 0) + dragRot : offset < 0 ? 38 : -38;
          return (
            <motion.div key={it === 'add' ? '__add__' : it.id} data-wall-idx={i} className="absolute left-1/2 top-3 cursor-pointer"
              style={{ width: cardW, marginLeft: `calc(${cardW} / -2)`, zIndex: 10 - Math.abs(offset), transformStyle: 'preserve-3d' }}
              animate={{ x: x + (low ? 0 : slideX * 0.55), y: isCenter ? dragDown : 0, rotateY: low && isCenter && flipped ? 0 : rotY, scale: isCenter ? 1 : 0.78, opacity: Math.abs(offset) === 3 ? 0 : isCenter ? 1 : 0.75 }}
              transition={low ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 28 }}>
              {/* 正面 */}
              <div className="pk3-face relative w-full" style={{ aspectRatio: '1 / 1.6', display: low && isCenter && flipped ? 'none' : undefined }}>
                {it === 'add' ? (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-3 rounded-[6%/4%] border-[3px] border-dashed border-p4g-line bg-p4g-surface-2/80 text-p4g-ink">
                    <span className="font-display text-mega font-bold leading-none">+</span><span className="font-display text-meta font-bold">缔结新的羁绊</span>
                  </div>
                ) : isFriend(it) ? (
                  <div className="relative h-full w-full overflow-hidden rounded-[6%/4%] border-[3px] border-p4g-black shadow-[3px_3px_0_var(--p4g-shadow-color)]">
                    {it.face ? <img src={it.face} alt="" className="h-full w-full object-cover" /> : (
                      <div className="flex h-full w-full flex-col items-center justify-center" style={{ background: 'repeating-linear-gradient(-45deg, var(--p4g-yellow) 0 10px, var(--p4g-yellow-pale) 10px 20px)' }}>
                        <span className="text-4xl text-p4g-black" aria-hidden>✦</span>
                        <span className="mt-1 font-display text-mega font-bold text-p4g-black">{((it.profile.nickname || '?')[0]).toUpperCase()}</span>
                      </div>
                    )}
                    <span className="absolute right-2 top-2 rounded-[2px] border-2 border-dashed border-p4g-black bg-p4g-cream px-1.5 text-2xs font-bold text-p4g-black">未缔结</span>
                  </div>
                ) : (
                  <TarotCard arcanaId={it.arcanaId} orientation={it.orientation} width="100%" faceUrl={it.avatarAsCardFace ? (it.cardFaceDataUrl || it.customAvatarDataUrl) : undefined} dim={!!it.archivedAt} />
                )}
              </div>
              {/* 背面 */}
              {it !== 'add' && (
                <div className={cx('absolute inset-0', !low && 'pk3-face')} style={{ transform: low ? undefined : 'rotateY(180deg)', display: low ? (isCenter && flipped ? 'block' : 'none') : undefined }}>
                  {isFriend(it) ? <FriendBack f={it} p={friendPrayer(it)} onProfile={() => onOpenFriend(it)} onPropose={() => onPropose(it)} onCrop={() => onCropFriend(it)} /> : <ConfidantBack c={it} p={prayerFor(it)} onOpen={() => onOpenDetail(it)} back={back} />}
                </div>
              )}
            </motion.div>
          );
        })}
        {/* 下滑提示 */}
        {current && current !== 'add' && dragDown > 0 && (
          <div className="pointer-events-none absolute bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-p4g-black px-3 py-1 font-display text-cap font-bold text-p4g-yellow">
            ↓ {dragDown >= 12 ? '松手打开档案' : '下滑查看档案'}
          </div>
        )}
      </div>

      {/* 铭牌 + 跳卡条 */}
      <div className="relative mx-auto mt-2 max-w-sm px-3">
        <motion.div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 -z-0 -translate-x-1/2 -translate-y-1/2 opacity-30" animate={{ rotate: index * 90 }} transition={{ duration: low ? 0 : 0.5 }}>
          <Sparkle size={180} className="text-p4g-yellow-pale night:text-p4g-yellow/30" />
        </motion.div>
        <div className="relative min-h-[96px]">{nameplate()}</div>
        {count > 1 && <WallScrubber items={items} index={index} onJump={go} />}
        <div className="mt-1 text-center text-2xs font-bold text-[color:var(--p4g-on-stage)] opacity-60">左右切换 · 单击翻面 · 下滑看档案</div>
      </div>
    </div>
  );
}

function ConfidantBack({ c, p, onOpen, back }: { c: Confidant; p?: PrayerState; onOpen: () => void; back: string }) {
  const card = TAROT_BY_ID[c.arcanaId]; const prog = levelProgress(c);
  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[6%/4%] border-[3px] border-p4g-black bg-[color:var(--p4g-msg)] px-3 py-3 text-[color:var(--p4g-msg-ink)] shadow-[3px_3px_0_var(--p4g-shadow-color)]">
      <img src={back} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[0.07]" />
      <div className="relative flex min-w-0 items-baseline justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1">{c.source === 'online' && <Sparkle size={11} className={p?.waitingReciprocity ? 'pk3-twinkle text-p4g-orange' : 'text-p4g-yellow'} />}<NameFx waiting={!!p?.waitingReciprocity && !p.alreadyPrayed} className="truncate font-display text-lead font-bold">{c.name}</NameFx></span>
        <span className="shrink-0 text-2xs font-bold text-p4g-yellow">{card?.roman} {c.orientation === 'reversed' ? '逆位' : '正位'}</span>
      </div>
      <div className="relative text-cap opacity-80">{card?.name}</div>
      <div className="relative mt-2">
        <div className="flex items-baseline justify-between text-2xs font-bold text-p4g-yellow"><span>RANK {c.intimacy}</span><span className="tabular-nums">{prog.isMax ? 'MAX' : `${prog.inLevel}/${prog.span}`}</span></div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/15"><div className="h-full origin-left bg-p4g-orange" style={{ transform: `scaleX(${prog.pct / 100})` }} /></div>
      </div>
      {c.source === 'online' && <div className="relative mt-1.5"><PactTag text={`与 ${c.name}`} /></div>}
      <div className="relative mt-2 min-h-0 flex-1 overflow-hidden" style={{ WebkitMaskImage: 'linear-gradient(180deg, #000 70%, transparent)', maskImage: 'linear-gradient(180deg, #000 70%, transparent)' }}>
        {c.description && <p className="text-2xs leading-relaxed opacity-85 p4g-clamp-3">{c.description}</p>}
        {c.aiAdvice && <p className="mt-1.5 text-2xs leading-relaxed text-p4g-yellow p4g-clamp-2">✦ {c.aiAdvice}</p>}
      </div>
      <div className="relative mt-auto flex gap-1.5 pt-1">
        {p && (
          <button type="button" onClick={(e) => { e.stopPropagation(); if (!p.alreadyPrayed && !p.pending) p.onPray(); }} disabled={p.alreadyPrayed || p.pending} aria-label={p.alreadyPrayed ? '今日已祈愿' : p.waitingReciprocity ? '回敬祈愿' : '为 Ta 祈愿'}
            className={cx('min-w-0 flex-1 truncate rounded-[8px] border-2 py-2 text-2xs font-bold', p.alreadyPrayed ? 'border-white/25 text-white/60' : p.waitingReciprocity ? 'border-p4g-orange bg-p4g-orange text-p4g-black' : 'border-p4g-yellow text-p4g-yellow')}>
            {p.pending ? '祈愿中…' : p.alreadyPrayed ? '今日已祈愿' : p.waitingReciprocity ? '✦ 回敬祈愿' : '✦ 祈愿'}
          </button>
        )}
        <button type="button" onClick={(e) => { e.stopPropagation(); onOpen(); }} className={cx('min-w-0 truncate rounded-[8px] bg-p4g-yellow py-2 text-cap font-bold text-p4g-black', p ? 'flex-1' : 'w-full')}>{p ? '档案 →' : '查看档案 →'}</button>
      </div>
    </div>
  );
}

function FriendBack({ f, p, onProfile, onPropose, onCrop }: { f: FriendItem; p: PrayerState; onProfile: () => void; onPropose: () => void; onCrop: () => void }) {
  const name = f.profile.nickname || f.profile.userId || '未命名客人';
  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-[6%/4%] border-[3px] border-p4g-black bg-[color:var(--p4g-msg)] px-3 py-3 text-[color:var(--p4g-msg-ink)] shadow-[3px_3px_0_var(--p4g-shadow-color)]">
      <div className="flex min-w-0 items-baseline justify-between gap-2"><span className="flex min-w-0 items-center gap-1"><Sparkle size={11} className="text-p4g-success" /><span className="truncate font-display text-lead font-bold">{name}</span></span><span className="shrink-0 text-2xs font-bold text-p4g-yellow">GUEST</span></div>
      <div className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5 text-cap font-bold opacity-85">
        <button type="button" onClick={(e) => { e.stopPropagation(); onProfile(); }} className="min-w-0 max-w-full break-all border-b border-dashed border-p4g-yellow text-left">@{f.profile.userId ?? '—'}</button>
        <span className="shrink-0 tabular-nums">LV {f.profile.totalLv ?? '—'}</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1"><PactTag text={`与 ${name}`} /></div>
      <p className="mt-3 text-2xs leading-relaxed opacity-80">还未缔结 COOP 契约——两张塔罗尚未互相照亮。递出契约，Ta 就会正式落座这面墙。</p>
      <div className="mt-auto space-y-1.5">
        <div className="flex gap-1.5">
          <button type="button" onClick={(e) => { e.stopPropagation(); if (!p.alreadyPrayed && !p.pending) p.onPray(); }} disabled={p.alreadyPrayed || p.pending} aria-label={p.alreadyPrayed ? '今日已祈愿' : p.waitingReciprocity ? '回敬祈愿' : '为 Ta 祈愿'}
            className={cx('min-w-0 flex-1 truncate rounded-[8px] border-2 py-2 text-2xs font-bold', p.alreadyPrayed ? 'border-white/25 text-white/60' : p.waitingReciprocity ? 'border-p4g-orange bg-p4g-orange text-p4g-black' : 'border-p4g-yellow text-p4g-yellow')}>
            {p.pending ? '祈愿中…' : p.alreadyPrayed ? '今日已祈愿' : p.waitingReciprocity ? '✦ 回敬祈愿' : '✦ 祈愿'}
          </button>
          <button type="button" onClick={(e) => { e.stopPropagation(); onPropose(); }} className="min-w-0 flex-1 truncate rounded-[8px] bg-p4g-yellow px-1 py-2 text-2xs font-bold text-p4g-black">缔结 COOP</button>
        </div>
        <button type="button" onClick={(e) => { e.stopPropagation(); onCrop(); }} className="w-full rounded-[8px] border border-dashed border-white/40 py-1.5 text-2xs font-bold text-p4g-yellow">✂️ 裁切卡面</button>
      </div>
    </div>
  );
}

function WallScrubber({ items, index, onJump }: { items: WallItem[]; index: number; onJump: (i: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef(false);
  const pick = (x: number) => { const r = ref.current?.getBoundingClientRect(); if (!r || !r.width) return index; return Math.round(Math.max(0, Math.min(1, (x - r.left) / r.width)) * (items.length - 1)); };
  return (
    <div ref={ref} aria-label="快速跳卡" role="slider" aria-valuemin={1} aria-valuemax={items.length} aria-valuenow={index + 1} tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'ArrowLeft') onJump(index - 1); if (e.key === 'ArrowRight') onJump(index + 1); }}
      onPointerDown={(e) => { drag.current = true; (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId); onJump(pick(e.clientX)); }}
      onPointerMove={(e) => { if (drag.current) onJump(pick(e.clientX)); }} onPointerUp={() => { drag.current = false; }} onPointerCancel={() => { drag.current = false; }}
      className="relative mt-2 flex h-8 cursor-pointer touch-none items-center justify-between rounded-full border-3 border-p4g-line bg-p4g-surface-2 px-3">
      {items.map((it, i) => (
        <span key={i} className={cx('relative rounded-full transition-all duration-fast', i === index ? 'h-4 w-6 bg-p4g-orange ring-2 ring-p4g-black' : it === 'add' ? 'h-2 w-2 border-2 border-p4g-ink-soft' : isFriend(it) ? 'h-3 w-[3px] bg-p4g-success' : 'h-3 w-[3px] bg-p4g-ink')} />
      ))}
    </div>
  );
}
