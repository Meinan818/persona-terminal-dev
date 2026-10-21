/**
 * 同伴（羁绊）页 —— 真实 src/pages/Cooperation.tsx 的 p3 分支（粉白 P3R）。
 *   #/p/cooperation                 默认（卡墙，真实 p3 默认 viewMode=wall）
 *   #/p/cooperation?view=list       列表 · ?view=wall 卡墙 · ?filter=online|offline|archived
 *   #/p/cooperation?state=empty|loading|error
 *   #/p/cooperation?tab=org         「组织」= 重定向到隐世之地（hideout）
 * 页头：同伴 / 组织 切换标题 + N/22 计数 + ✧ 菜单（关于 · 谏言 · 归档库 · 通知，未读红点）；
 * 中段：关于同伴系统（菜单可开合）· 待实体化提示 · 全部 / 在线 / 离线 / 归档 筛选 + 列表 / 卡墙 切换；
 * 主体：卡墙（3D cover flow，单击翻面 / 横拖切卡 / 下滑看档案 / 跳卡条 / 换卡水波）或 列表（塔罗缩略 + 名字 + 标签 + LV 进度 + ✦ 祈愿）；
 * 右下 + FAB 结识同伴；所有弹窗 / 演出从这里接线（详情 → 互动 → RANK UP 链 · 祈愿特效 · 羁绊之影 · 共战结算 · 名片 · COOP …）。
 */
import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Confidant } from '@/types';
import { useAppStore, toLocalDateKey } from '@/store';
import { useShallow } from 'zustand/react/shallow';
import { useCloudSocialStore } from '@/store/cloudSocial';
import { sendPrayer, hasPrayedToday, hasBeenPrayedByToday } from '@/services/prayers';
import { grantOnlineSp } from '@/services/onlineResources';
import { loadSocial } from '@/services/social';
import type { PageProps } from '@pink/registry/types';
import { P3Empty, P3Error, P3Loading, P3PageHeader, P3R, showToast, slantClip, tickClip } from '@pink/kit';
import { useBoldness } from '@pink/lib/prefs';
import { navigate } from '@pink/shell/shellBus';
import { INTIMACY_LABELS, MAJOR_ARCANA_IDS, MAX_INTIMACY, TAROT_BY_ID, levelProgress } from '@pink/screens/pkg3/arcana';
import { NameFx, OnlineStar, PactTag, PrayQuickButton, ShadowBadge, Sparkle, StatusTag, Tarot } from '@pink/screens/pkg3/ui';
import { AlbumWall, type FriendItem, type PrayerState } from '@pink/screens/pkg3/wall';
import { RankUpChain, type RankUpNotice } from '@pink/screens/pkg3/rankup';
import { shadowForConfidant, useCooperationData } from '@pink/adapters/pkg3';
import { CooperationMenuPanel } from '../overlays/CooperationMenu.p3r';
import { ConfidantCreateSheet } from '../overlays/ConfidantCreateModal.p3r';
import { ConfidantDetailSheet } from '../overlays/ConfidantDetailModal.p3r';
import { InteractionSheet } from '../overlays/ConfidantInteractionModal.p3r';
import { MemorialSheet } from '../overlays/CoopMemorialPanel.p3r';
import { PactPanelModal } from '../overlays/PactPanel.p3r';
import { CounselChat } from '../overlays/CounselChatModal.p3r';
import { CounselArchiveSheet } from '../overlays/CounselArchiveModal.p3r';
import { NotificationsSheet } from '../overlays/NotificationsPanel.p3r';
import { AddOnlineSheet } from '../overlays/AddOnlineConfidantModal.p3r';
import { OnlineProfileSheet } from '../overlays/OnlineConfidantProfileCard.p3r';
import { CoopProposeSheet } from '../overlays/CoopProposeModal.p3r';
import { CoopAcceptSheet } from '../overlays/CoopAcceptModal.p3r';
import { PrayerEffect, type PrayerEffectKind } from '../overlays/PrayerEffectOverlay.p3r';
import { ShadowBattle } from '../overlays/CoopShadowBattleModal.p3r';
import { VictoryScreen } from '../overlays/CoopVictoryScreen.p3r';
import { StarShiftModal } from '@pink/screens/pkg3/rankup';
import { PactRespondSheet } from '../overlays/PactModals.p3r';
import '@pink/screens/pkg3/pkg3.css';

type Filter = 'all' | 'online' | 'offline' | 'archived';
type Ov = null | 'create' | 'detail' | 'interaction' | 'memorial' | 'pact' | 'counsel' | 'archive' | 'notif' | 'addOnline' | 'profile' | 'propose' | 'accept' | 'shadow' | 'victory' | 'starshift' | 'pactRespond';

const FilterTabs = ({ value, onChange, counts }: { value: Filter; onChange: (f: Filter) => void; counts: Record<Filter, number> }) => {
  const items: { id: Filter; label: string }[] = [{ id: 'all', label: '全部' }, { id: 'online', label: '在线' }, { id: 'offline', label: '离线' }, { id: 'archived', label: '归档' }];
  return (
    <div role="tablist" aria-label="筛选" className="flex min-w-0 flex-1 items-center gap-1">
      {items.map((it) => {
        const on = value === it.id;
        return (
          <button key={it.id} type="button" role="tab" aria-selected={on} onClick={() => onChange(it.id)} className="relative min-w-0 px-2.5 py-1.5 text-[14px] font-black leading-none sm:px-3.5" style={{ color: on ? 'var(--p3r-on-ink)' : P3R.inkSoft }}>
            {on && <motion.span layoutId="pk3-filter" aria-hidden className="absolute inset-0" style={{ background: P3R.ink, clipPath: slantClip(7) }} transition={{ type: 'spring', stiffness: 520, damping: 34 }} />}
            {on && <span aria-hidden className="absolute -bottom-1 right-1 h-[5px] w-[12px]" style={{ background: P3R.blue, clipPath: slantClip(3) }} />}
            <span className="relative whitespace-nowrap">{it.label}<span className="ml-0.5 font-cond text-[11px] opacity-70">{counts[it.id]}</span></span>
          </button>
        );
      })}
    </div>
  );
};

const ViewToggle = ({ view, onChange }: { view: 'list' | 'wall'; onChange: (v: 'list' | 'wall') => void }) => (
  <div className="flex shrink-0 items-center gap-0.5 p-0.5" role="group" aria-label="视图" style={{ background: P3R.cyanFaint, clipPath: slantClip(7) }}>
    {(['list', 'wall'] as const).map((v) => (
      <button key={v} type="button" aria-pressed={view === v} aria-label={v === 'list' ? '列表视图' : '卡墙视图'} onClick={() => onChange(v)} className="flex h-8 w-9 items-center justify-center" style={{ background: view === v ? P3R.blue : 'transparent', clipPath: slantClip(5) }}>
        {v === 'list' ? (
          <span aria-hidden className="flex flex-col gap-[3px]">{[0, 1, 2].map((i) => <i key={i} className="block h-[2.5px] w-[14px]" style={{ background: view === v ? P3R.onBlue : P3R.inkSoft, transform: 'skewX(-14deg)' }} />)}</span>
        ) : (
          <span aria-hidden className="relative block h-[16px] w-[18px]">
            <i className="absolute left-0 top-[2px] h-[12px] w-[8px]" style={{ background: view === v ? P3R.onBlue : P3R.inkSoft, opacity: 0.55, transform: 'rotate(-10deg)' }} />
            <i className="absolute left-[5px] top-0 h-[16px] w-[9px]" style={{ background: view === v ? P3R.onBlue : P3R.inkSoft }} />
            <i className="absolute right-0 top-[2px] h-[12px] w-[7px]" style={{ background: view === v ? P3R.onBlue : P3R.inkSoft, opacity: 0.55, transform: 'rotate(10deg)' }} />
          </span>
        )}
      </button>
    ))}
  </div>
);

function ConfidantRow({ c, index, prayer, shadow, onOpen, onShadow }: {
  c: Confidant;
  index: number;
  prayer?: PrayerState;
  shadow: ReturnType<typeof shadowForConfidant>;
  onOpen: () => void;
  onShadow: () => void;
}) {
  const bold = useBoldness();
  const card = TAROT_BY_ID[c.arcanaId]; const prog = levelProgress(c);
  const isOnline = c.source === 'online'; const archived = !!c.archivedAt; const isMax = c.intimacy >= MAX_INTIMACY;
  const waiting = !!prayer?.waitingReciprocity && !prayer.alreadyPrayed;
  return (
    <motion.div initial={bold ? { opacity: 0, x: -18 } : false} animate={{ opacity: 1, x: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 30, delay: index * 0.04 }}
      role="button" tabIndex={0} onClick={onOpen} onKeyDown={(e) => { if (e.key === 'Enter') onOpen(); }} aria-label={`${c.name}，${card?.name}，RANK ${c.intimacy}`}
      className="group relative flex min-w-0 cursor-pointer items-center gap-3 px-4 py-3 outline-none" style={{ background: P3R.panel, clipPath: slantClip(14), boxShadow: 'var(--p3r-shadow)', opacity: archived ? 0.72 : 1 }}>
      <span aria-hidden className="absolute left-0 top-0 h-full w-[5px]" style={{ background: isOnline ? P3R.blue : P3R.cyan }} />
      <span aria-hidden className="pointer-events-none absolute -right-1 -top-3 select-none font-cond text-[56px] leading-none" style={{ color: 'var(--p3r-ghost)' }}>{card?.roman}</span>
      <div className="relative shrink-0 pl-1"><Tarot arcanaId={c.arcanaId} reversed={c.orientation === 'reversed'} width={52} faceUrl={c.avatarAsCardFace ? (c.cardFaceDataUrl || c.customAvatarDataUrl) : undefined} dim={archived} /></div>
      <div className="relative min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          {isOnline && <OnlineStar glow={waiting} />}
          <NameFx waiting={waiting} maxBond={isMax} className="min-w-0 max-w-full"><span className="block truncate font-heavy text-[18px] leading-tight" style={{ color: P3R.ink }}>{c.name}</span></NameFx>
          {isOnline && <StatusTag tone="online">ONLINE</StatusTag>}
          {!!shadow.id && <ShadowBadge identified={shadow.identifiedByMe && shadow.identifiedByPartner} hpPct={Math.round((shadow.hpCurrent / Math.max(1, shadow.hpMax)) * 100)} onClick={onShadow} />}
          {c.decayEnabled && <StatusTag tone="decay">逆流</StatusTag>}
          {archived && <StatusTag tone="archived">归档</StatusTag>}
          {waiting && <StatusTag tone="waiting">待回应</StatusTag>}
        </div>
        <div className="mt-0.5 truncate text-[12px] font-bold" style={{ color: P3R.inkSoft }}>《{card?.name}》{c.orientation === 'reversed' ? '逆位' : '正位'} · {INTIMACY_LABELS[c.intimacy]}</div>
        {isOnline && !archived && <div className="mt-1.5 flex flex-wrap items-center gap-1.5"><PactTag text={c.id === 'c-yukari' ? `${c.name} 今天还没打卡` : '一起进步 · 已同步 ✓'} tone={c.id === 'c-yukari' ? 'warm' : 'done'} /></div>}
        {isOnline && (c.linkedProfile as { goal?: string } | undefined)?.goal && <div className="mt-1 truncate text-[11px] font-bold" style={{ color: P3R.grey }}>◎ {(c.linkedProfile as { goal?: string }).goal}</div>}
        <div className="mt-2">
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="font-cond text-[12px]" style={{ color: P3R.roseInk }}>RANK {c.intimacy}</span>
            <span className="truncate text-[11px]" style={{ color: P3R.grey }}>{isMax ? '圆满' : `还差 ${prog.gap} 点到 Lv ${c.intimacy + 1}`}</span>
          </div>
          <div className="h-[6px] overflow-hidden" style={{ background: 'var(--p3r-track)', clipPath: slantClip(3) }}>
            <motion.div className="h-full w-full origin-left" style={{ background: `linear-gradient(90deg, ${P3R.cyan}, ${P3R.blue})` }} initial={bold ? { scaleX: 0 } : false} animate={{ scaleX: prog.pct / 100 }} transition={{ type: 'spring', stiffness: 200, damping: 28 }} />
          </div>
        </div>
      </div>
      {prayer && !archived && <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}><PrayQuickButton alreadyPrayed={prayer.alreadyPrayed} waitingReciprocity={prayer.waitingReciprocity} pending={prayer.pending} onClick={prayer.onPray} /></div>}
    </motion.div>
  );
}

export default function Cooperation({ params }: PageProps) {
  const bold = useBoldness();
  const state = params?.get('state');
  const data = useCooperationData();
  const {
    updateConfidant, archiveConfidant, deleteConfidant, bumpConfidantIntimacy,
  } = useAppStore(useShallow((store) => ({
    updateConfidant: store.updateConfidant,
    archiveConfidant: store.archiveConfidant,
    deleteConfidant: store.deleteConfidant,
    bumpConfidantIntimacy: store.bumpConfidantIntimacy,
  })));
  const addTodayPrayer = useCloudSocialStore((store) => store.addTodayPrayer);
  const [view, setView] = useState<'list' | 'wall'>((params?.get('view') as 'list' | 'wall') || 'wall');
  const [filter, setFilter] = useState<Filter>((params?.get('filter') as Filter) || 'all');
  const list = state === 'empty' ? [] : data.confidants;
  const [loading, setLoading] = useState(state === 'loading');
  const [failed, setFailed] = useState(state === 'error');
  const [menuOpen, setMenuOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [ov, setOv] = useState<Ov>(null);
  const [selected, setSelected] = useState<Confidant | null>(null);
  const [friend, setFriend] = useState<FriendItem | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [fx, setFx] = useState<{ kind: PrayerEffectKind; name: string } | null>(null);
  const [chain, setChain] = useState<{ c: Confidant; notice: RankUpNotice } | null>(null);
  const unread = data.importantUnreadCount;
  useEffect(() => { if (params?.get('tab') === 'org') navigate('hideout', undefined, { replace: true }); }, [params]);
  useEffect(() => { if (!loading) return; const t = window.setTimeout(() => setLoading(false), 1600); return () => clearTimeout(t); }, [loading]);

  const friends: FriendItem[] = useMemo(() => (state === 'empty' ? [] : data.friends), [state, data.friends]);
  const active = list.filter((c) => !c.archivedAt);
  const counts: Record<Filter, number> = { all: active.length, online: active.filter((c) => c.source === 'online').length, offline: active.filter((c) => c.source !== 'online').length, archived: list.filter((c) => !!c.archivedAt).length };
  const shown = filter === 'all' ? active : filter === 'online' ? active.filter((c) => c.source === 'online') : filter === 'offline' ? active.filter((c) => c.source !== 'online') : list.filter((c) => !!c.archivedAt);
  const remaining = MAJOR_ARCANA_IDS.length - active.length;
  const doPray = async (id: string, name: string, waiting: boolean) => {
    if (pending) return;
    setPending(id);
    try {
      const { prayer, reciprocal } = await sendPrayer(id, data.todayPrayers);
      addTodayPrayer(prayer);
      const localOnline = data.confidants.find((c) => c.source === 'online' && !c.archivedAt && c.linkedCloudUserId === id);
      if (localOnline) {
        await bumpConfidantIntimacy(localOnline.id, 1, 'conversation', `每日祈愿：${name}`);
        await updateConfidant(localOnline.id, { lastPrayerDate: toLocalDateKey() });
      }
      await grantOnlineSp(2 + (reciprocal ? 1 : 0));
      void loadSocial({ force: true });
      setFx({ kind: reciprocal ? 'reciprocal' : 'sent', name });
    } catch (error) {
      showToast(error instanceof Error ? error.message : '祈愿失败，稍后再试');
    } finally {
      setPending(null);
    }
  };
  const prayerFor = (c: Confidant): PrayerState | undefined => c.source === 'online' && c.linkedCloudUserId && !c.archivedAt
    ? {
      alreadyPrayed: hasPrayedToday(c.linkedCloudUserId, data.todayPrayers),
      waitingReciprocity: hasBeenPrayedByToday(c.linkedCloudUserId, data.todayPrayers) && !hasPrayedToday(c.linkedCloudUserId, data.todayPrayers),
      pending: pending === c.linkedCloudUserId,
      onPray: () => { void doPray(c.linkedCloudUserId!, c.name, hasBeenPrayedByToday(c.linkedCloudUserId!, data.todayPrayers)); },
    } : undefined;
  const friendPrayer = (f: FriendItem): PrayerState => ({
    alreadyPrayed: f.prayed,
    waitingReciprocity: f.beenPrayedBy && !f.prayed,
    pending: pending === f.profile.id,
    onPray: () => { void doPray(f.profile.id, f.profile.nickname ?? '', f.beenPrayedBy); },
  });
  const openDetail = (c: Confidant) => { setSelected(c); setOv('detail'); };
  const openFriend = (f: FriendItem) => { setFriend(f); setOv('profile'); };
  const close = () => setOv(null);
  const sel = selected ?? list[0] ?? null;
  const selectedShadow = shadowForConfidant(
    data.activeShadows.find((shadow) => {
      if (!sel?.linkedCloudUserId || !data.cloudUser) return false;
      const otherId = shadow.userAId === data.cloudUser.id ? shadow.userBId : shadow.userAId;
      return otherId === sel.linkedCloudUserId;
    }),
    data.cloudUser?.id,
  );

  return (
    <div className="relative min-h-full min-w-0 overflow-x-clip pb-28">
      {/* 竖排 ARCANA 幽灵字（p3） */}
      <span aria-hidden className="pointer-events-none absolute right-1 top-40 hidden select-none font-cond text-[13px] tracking-[0.6em] wide:block" style={{ writingMode: 'vertical-rl', color: 'var(--p3r-ghost)', fontSize: 64 }}>ARCANA</span>
      <div className="relative mx-auto w-full max-w-[960px] px-4 pt-4 wide:px-8 wide:pt-8">
        <P3PageHeader en="SOCIAL LINK" ghost="LINK"
          title={
            <span className="inline-flex items-baseline gap-2">
              <span>同伴</span>
              <button type="button" onClick={() => navigate('hideout')} className="font-heavy text-[0.55em] underline decoration-2 underline-offset-4" style={{ color: P3R.grey, textDecorationColor: 'rgb(var(--p3r-cyan-rgb) / 0.7)' }} aria-label="切换到组织（隐世之地）">组织</button>
            </span>
          }
          subtitle={`${active.length} / ${MAJOR_ARCANA_IDS.length} 张大阿卡纳已结缘 · 剩余 ${remaining} 张`}
          actions={
            <div className="relative">
              <button type="button" data-coop-menu-trigger aria-label="同伴系统菜单" aria-expanded={menuOpen} onClick={() => setMenuOpen((v) => !v)} className="relative flex h-10 w-11 items-center justify-center text-[18px]" style={{ clipPath: slantClip(8), background: menuOpen ? P3R.blue : P3R.panel, color: menuOpen ? P3R.onBlue : P3R.roseInk, boxShadow: 'var(--p3r-shadow)' }}>
                ✧{unread > 0 && <span aria-label={`${unread} 条未读`} className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full" style={{ background: P3R.magenta }} />}
              </button>
              <CooperationMenuPanel open={menuOpen} onClose={() => setMenuOpen(false)} counselState={data.counselState} archiveCount={data.counselArchives.length} loggedIn unreadCount={unread}
                onAbout={() => setInfoOpen((v) => !v)} onCounsel={() => setOv('counsel')} onArchive={() => setOv('archive')} onNotifications={() => setOv('notif')} />
            </div>
          } />

        <AnimatePresence initial={false}>
          {infoOpen && (
            <motion.section initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="relative mb-4 px-5 py-4" style={{ background: 'var(--p3r-mulberry)', color: 'var(--p3r-cream)', clipPath: slantClip(14) }} aria-label="关于同伴系统">
              <span aria-hidden className="absolute bottom-0 right-5 h-[7px] w-[16px]" style={{ background: P3R.magenta, clipPath: tickClip }} />
              <div className="mb-1 flex items-center gap-2"><Sparkle size={14} style={{ color: 'var(--pk-petal-a)' }} /><b className="font-heavy text-[15px]">关于同伴系统</b><button type="button" onClick={() => setInfoOpen(false)} className="ml-auto text-[12px] font-black" style={{ color: 'var(--pk-petal-a)' }}>收起</button></div>
              <p className="text-[13px] leading-relaxed opacity-90">把生命中重要的人登记为同伴，每人对应一张大阿卡纳。每天记录一次和 Ta 的互动，AI 会解读并为羁绊加点；亲密度提升会解锁日常加成与战斗能力，升级时还能获得「星移」重写这段关系。在线同伴可以互相祈愿、约定一起进步、共斗羁绊之影。</p>
            </motion.section>
          )}
        </AnimatePresence>

        {data.materializeBlockers.length > 0 && state !== 'empty' && (
          <div className="mb-4 flex min-w-0 items-center gap-2 px-4 py-2 text-[12px] font-bold" style={{ background: P3R.cyanPale, color: P3R.ink, clipPath: slantClip(8) }}>
            <span aria-hidden className="h-[10px] w-[8px] shrink-0" style={{ background: P3R.magenta, clipPath: tickClip }} />
            <span className="min-w-0 flex-1">@{data.materializeBlockers[0].otherName} 已接受 COOP，但大阿卡纳已满：归档一位同伴后才能落座。</span>
            <button type="button" onClick={() => setFilter('archived')} className="shrink-0 font-black underline" style={{ color: P3R.roseInk }}>去归档</button>
          </div>
        )}

        <div className="mb-4 flex min-w-0 items-center gap-2">
          <FilterTabs value={filter} onChange={setFilter} counts={counts} />
          <ViewToggle view={view} onChange={setView} />
        </div>

        {loading ? <P3Loading text="同伴档案读取中…" rows={4} block />
          : failed ? <P3Error title="同伴档案没能载入" text="本地数据库暂时打不开。数据都还在，重试一下。" onRetry={() => { setFailed(false); setLoading(true); }} />
          : list.length === 0 ? (
            <P3Empty ghost="ARCANA" text="还没有登记任何同伴" sub="22 张大阿卡纳正等着与生命中重要的人结缘。先从身边的一个人开始吧。"
              action={<button type="button" onClick={() => setOv('create')} className="relative mt-1 px-6 py-3 font-heavy text-[16px]" style={{ clipPath: slantClip(12), background: P3R.blue, color: P3R.onBlue }}>✧ 邀请第一位同伴<span aria-hidden className="absolute bottom-0 right-4 h-[6px] w-[14px]" style={{ background: P3R.magenta, clipPath: tickClip }} /></button>} />
          ) : view === 'wall' ? (
            <AlbumWall confidants={shown} friends={filter === 'all' || filter === 'online' ? friends : []} canCreate={filter !== 'archived' && remaining > 0} prayerFor={prayerFor} friendPrayer={friendPrayer}
              onOpenDetail={openDetail} onCreate={() => setOv('create')} onOpenFriend={openFriend} onPropose={(f) => { setFriend(f); setOv('propose'); }} onCropFriend={(f) => showToast(`裁切 ${f.profile.nickname} 的卡面`)} />
          ) : shown.length === 0 ? (
            <P3Empty ghost={filter.toUpperCase()} text={filter === 'archived' ? '没有归档的同伴' : filter === 'online' ? '还没有在线同伴' : '没有离线同伴'} sub={filter === 'online' ? '用 UserID 邀请朋友，缔结双向羁绊。' : undefined}
              action={filter === 'online' ? <button type="button" onClick={() => setOv('addOnline')} className="px-5 py-2.5 text-[14px] font-black" style={{ clipPath: slantClip(10), background: P3R.blue, color: P3R.onBlue }}>邀请在线同伴</button> : undefined} />
          ) : (
            <div className="grid grid-cols-1 gap-3 wide:grid-cols-2">
              {shown.map((c, i) => <ConfidantRow key={c.id} c={c} index={i} prayer={prayerFor(c)} shadow={shadowForConfidant(
                data.activeShadows.find((shadow) => {
                  if (!c.linkedCloudUserId || !data.cloudUser) return false;
                  return (shadow.userAId === data.cloudUser.id ? shadow.userBId : shadow.userAId) === c.linkedCloudUserId;
                }),
                data.cloudUser?.id,
              )} onOpen={() => openDetail(c)} onShadow={() => { setSelected(c); setOv('shadow'); }} />)}
              {(filter === 'all' || filter === 'online') && friends.map((f) => (
                <button key={f.id} type="button" onClick={() => openFriend(f)} className="relative flex min-w-0 items-center gap-3 px-4 py-3 text-left" style={{ background: P3R.cyanFaint, clipPath: slantClip(14) }}>
                  <span className="flex h-[60px] w-[38px] shrink-0 items-center justify-center font-cond text-[24px]" style={{ background: 'repeating-linear-gradient(-45deg, var(--p3r-cyan-pale) 0 6px, var(--p3r-panel) 6px 12px)', color: P3R.roseInk, clipPath: slantClip(5) }}>{(f.profile.nickname ?? '?')[0]}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5"><OnlineStar glow={f.beenPrayedBy && !f.prayed} /><b className="truncate font-heavy text-[16px]" style={{ color: P3R.ink }}>{f.profile.nickname}</b><StatusTag tone="guest">未缔结</StatusTag></span>
                    <span className="block truncate text-[12px]" style={{ color: P3R.grey }}>@{f.profile.userId} · LV {f.profile.totalLv} · 点击查看名片</span>
                  </span>
                </button>
              ))}
            </div>
          )}
      </div>

      {/* + FAB（结识同伴） */}
      {list.length > 0 && !loading && !failed && (
        <motion.button type="button" aria-label="结识一位同伴" onClick={() => setOv('create')} className="fixed bottom-[calc(88px+env(safe-area-inset-bottom))] right-4 z-20 flex h-14 w-14 items-center justify-center wide:bottom-8 wide:right-8"
          style={{ clipPath: 'polygon(14% 0, 100% 0, 86% 100%, 0 100%)', background: P3R.blue, color: P3R.onBlue, filter: 'drop-shadow(0 8px 14px rgb(var(--p3r-blue-rgb) / 0.35))' }}
          initial={bold ? { scale: 0, rotate: -30 } : false} animate={{ scale: 1, rotate: 0 }} whileTap={{ scale: 0.92 }} transition={{ type: 'spring', stiffness: 420, damping: 22 }}>
          <span aria-hidden className="text-[30px] font-thin leading-none">+</span>
        </motion.button>
      )}

      {/* ── 弹窗接线 ── */}
      <ConfidantCreateSheet isOpen={ov === 'create'} onClose={close} remaining={remaining} onPickOnline={() => setOv('addOnline')}
        onCreated={(id) => {
          const created = useAppStore.getState().confidants.find((c) => c.id === id) ?? null;
          setSelected(created);
          setOv(created ? 'detail' : null);
          if (created) showToast(`${created.name} 已落座《${TAROT_BY_ID[created.arcanaId]?.name}》`);
        }} />
      <ConfidantDetailSheet isOpen={ov === 'detail' && !!sel} onClose={close} confidant={sel} hasShadow={!!selectedShadow.id}
        onUpdate={(patch) => { if (sel) void updateConfidant(sel.id, patch); }}
        onDelete={() => { if (sel) { void deleteConfidant(sel.id); setOv(null); } }}
        onOpenCounsel={() => setOv('counsel')} onOpenInteraction={() => setOv('interaction')} onOpenStarShift={() => sel && setOv('starshift')} onOpenPact={() => sel && setOv('pact')}
        onOpenMemorial={() => setOv('memorial')} onViewOnlineProfile={() => { if (sel?.linkedProfile) { setFriend({ kind: 'friend', id: sel.linkedProfile.id, profile: sel.linkedProfile, prayed: hasPrayedToday(sel.linkedProfile.id, data.todayPrayers), beenPrayedBy: hasBeenPrayedByToday(sel.linkedProfile.id, data.todayPrayers) }); setOv('profile'); } }} onOpenCoopShadow={() => setOv('shadow')} />
      <InteractionSheet isOpen={ov === 'interaction' && !!sel} onClose={close} confidant={sel}
        onSaved={() => {
          if (!sel) return;
          const latest = useAppStore.getState().confidants.find((c) => c.id === sel.id);
          if (latest && latest.intimacy > sel.intimacy) {
            setChain({ c: latest, notice: { oldLevel: sel.intimacy, newLevel: latest.intimacy, starShiftGained: Math.max(0, (latest.starShiftCharges ?? 0) - (sel.starShiftCharges ?? 0)) } });
          }
          setOv(null);
        }} />
      <MemorialSheet isOpen={ov === 'memorial'} onClose={() => setOv('detail')} confidant={sel} />
      <PactPanelModal open={ov === 'pact'} onClose={() => setOv('detail')} partnerName={sel?.name ?? ''} />
      <CounselChat isOpen={ov === 'counsel'} onClose={close} />
      <CounselArchiveSheet isOpen={ov === 'archive'} onClose={close} />
      <NotificationsSheet isOpen={ov === 'notif'} onClose={close} onOpenCoopAccept={() => setOv('accept')} onOpenPactRespond={() => setOv('pactRespond')} />
      <PactRespondSheet isOpen={ov === 'pactRespond'} onClose={close} name="由加莉" />
      <AddOnlineSheet isOpen={ov === 'addOnline'} onClose={close} />
      {friend && <OnlineProfileSheet isOpen={ov === 'profile'} onClose={close} profile={friend.profile} initialCoop={friend.id.startsWith('c-') ? 'linked' : 'none'} initialPrayed={friend.prayed} onProposeCoop={() => setOv('propose')} onAcceptCoop={() => setOv('accept')} />}
      <CoopProposeSheet isOpen={ov === 'propose'} onClose={close} targetName={friend?.profile.nickname ?? '顺平'} />
      <CoopAcceptSheet isOpen={ov === 'accept'} onClose={close} proposerName="顺平" />
      <ShadowBattle isOpen={ov === 'shadow' && !!sel} onClose={close} partnerName={sel?.name ?? ''} onVictory={() => window.setTimeout(() => setOv('victory'), 300)} />
      <VictoryScreen isOpen={ov === 'victory'} onClose={close} partnerName={sel?.name ?? ''} shadowName={selectedShadow.name || '羁绊之影'} />
      {ov === 'starshift' && sel && <StarShiftModal confidant={sel} charges={sel.starShiftCharges ?? 1} onClose={() => setOv('detail')} />}
      <PrayerEffect isOpen={!!fx} kind={fx?.kind ?? 'sent'} targetName={fx?.name ?? ''} onDismiss={() => setFx(null)} />
      {chain && <RankUpChain open onClose={() => setChain(null)} confidant={chain.c} notice={chain.notice} charges={(chain.c.starShiftCharges ?? 0) + 1} />}
    </div>
  );
}
