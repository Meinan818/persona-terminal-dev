/**
 * 组织据点页（真实 src/pages/Hideout.tsx + components/org/HideoutMap.tsx / OrgHome.tsx / BondTitle.tsx）
 * 路由：#/p/hideout?tab=roster|board|ops|meeting（&view=wall）
 *   ?state=signed-out|loading|empty|error；?role=member；?orgs=2；?notice=1；?card=none；?meeting=open|submitted|closed|tomorrow|empty
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { OrgMember, OrgView } from '@real/types';
import type { PageProps } from '@yellow/registry/types';
import { P4Button, P4Card, P4Badge, P4Loading, P4EmptyState, P4Outline, useToast } from '@yellow/kit';
import { ChannelNoise, CollageStagger, CollageItem } from '@yellow/fx';
import { cx } from '@yellow/lib/cx';
import { useLowMotion } from '@yellow/lib/prefs';
import { navigate } from '@yellow/shell/shellBus';
import { buildView, LEVEL, ORG_LEVEL_NAMES, ORG_EMBLEMS, SECOND_ORG, ORG_XP_MEETING, ORG_XP_OP_SMALL, ORG_XP_OP_BIG, ORG_XP_OPS_PER_WEEK, RAID_XP_PER_HITTER, RAID } from '@yellow/mock/pkg4-org';
import { DevStrip, StateFade } from '@yellow/screens/pkg4/ui';
import { HideoutMap, RosterWall, SECTION_TITLE, type HideoutSection } from '@yellow/screens/pkg4/org/MapWall';
import { MemberTile } from '@yellow/screens/pkg4/org/MemberCard';
import { BoardSection } from '@yellow/screens/pkg4/org/Board';
import { MeetingSection, OpsSection } from '@yellow/screens/pkg4/org/OpsMeeting';
import { LeaderChip, displayCodename, seatNo } from '@yellow/screens/pkg4/org/common';
import { MemberFlipView } from '@yellow/screens/overlays/MemberCardFlip.p4g';
import { MemberMenu } from '@yellow/screens/overlays/HideoutMemberMenu.p4g';
import { BorrowMask } from '@yellow/screens/overlays/BorrowMaskSheet.p4g';
import { RaidPanel, RaidBanner } from '@yellow/screens/overlays/RaidSheet.p4g';
import { OrgTitles } from '@yellow/screens/overlays/OrgTitlesSheet.p4g';
import { OrgSettings } from '@yellow/screens/overlays/OrgSettingsSheet.p4g';
import { OrgOnboarding, type OnbMode } from '@yellow/screens/overlays/OrgOnboardingSheet.p4g';

type PageState = 'ok' | 'signed-out' | 'loading' | 'empty' | 'error';
const SECTIONS: HideoutSection[] = ['roster', 'board', 'meeting', 'ops'];

export default function Hideout({ tab, params }: PageProps) {
  const toast = useToast();
  const low = useLowMotion();
  const [pstate, setPstate] = useState<PageState>(((): PageState => { const s = params.get('state'); return s === 'signed-out' || s === 'loading' || s === 'empty' || s === 'error' ? s : 'ok'; })());
  const [role, setRole] = useState<'leader' | 'member'>(params.get('role') === 'member' ? 'member' : 'leader');
  const [twoOrgs, setTwoOrgs] = useState(params.get('orgs') === '2');
  const [orgIdx, setOrgIdx] = useState(0);
  const [notice, setNotice] = useState(params.get('notice') === '1');
  const [noCard, setNoCard] = useState(params.get('card') === 'none');
  const [meeting, setMeeting] = useState(params.get('meeting') ?? 'open');
  const [section, setSection] = useState<HideoutSection>(SECTIONS.includes(tab as HideoutSection) ? (tab as HideoutSection) : 'roster');
  const [wall, setWall] = useState(params.get('view') === 'wall');
  const [blocked, setBlocked] = useState<Set<string>>(new Set());
  const [flip, setFlip] = useState<OrgMember | null>(null);
  const [menuFor, setMenuFor] = useState<OrgMember | null>(null);
  const [borrowFor, setBorrowFor] = useState<OrgMember | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [titlesOpen, setTitlesOpen] = useState(false);
  const [raidOpen, setRaidOpen] = useState(false);
  const [onb, setOnb] = useState<OnbMode | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [noise, setNoise] = useState(false);
  const [seen, setSeen] = useState<Partial<Record<HideoutSection, boolean>>>({});

  const base = useMemo(buildView, []);
  const view: OrgView = useMemo(() => {
    const leaderId = role === 'leader' ? base.me.userId : 'u2';
    const me = noCard ? { ...base.me, tarotId: undefined } : base.me;
    const members = base.members.map((m) => (m.id === me.id ? me : m));
    return { ...base, org: { ...base.org, leaderId, ...(orgIdx === 1 ? { id: SECOND_ORG.id, name: SECOND_ORG.name, motto: '周末走远一点' } : {}) }, me, members };
  }, [base, role, noCard, orgIdx]);
  const leader = view.org.leaderId === view.me.userId;
  const members = view.members;
  const empty = Math.max(0, 7 - members.length);

  useEffect(() => { if (section !== 'roster') setSeen((s) => ({ ...s, [section]: true })); }, [section]);
  const pickSection = (s: HideoutSection) => { if (s === section) return; if (!low) setNoise(true); setSection(s); };
  const refresh = () => { if (refreshing) return; setRefreshing(true); setTimeout(() => setRefreshing(false), 1100); };
  const invite = () => { void navigator.clipboard?.writeText?.(`来「${view.org.name}」一起吧：打开面具庭园 → 羁绊 → 点标题切到「组织」→ 输入邀请码 ${view.org.inviteCode}`).catch(() => {}); toast('邀请语已复制，发给朋友吧'); };
  const toggleBlock = (uid: string) => setBlocked((b) => { const n = new Set(b); n.has(uid) ? n.delete(uid) : n.add(uid); return n; });

  const body = (() => {
    if (pstate === 'signed-out') return (
      <P4Card tone="paper" cut="br">
        <div className="font-display text-lead font-bold text-p4g-ink">登录之后才能用组织</div>
        <div className="mt-1 text-meta font-bold leading-relaxed text-p4g-ink-soft">和几个朋友建一个据点：名册、公告板、周日会议，最多 7 人。组织放在云端，要先登录账号。</div>
        <div className="mt-3"><P4Button size="sm" variant="black" onClick={() => navigate('account')}>去登录</P4Button></div>
      </P4Card>
    );
    if (pstate === 'loading') return <P4Card tone="paper"><div className="flex flex-col items-center gap-2 py-4"><P4Loading size="sm" label="信号接收中" /><div className="font-display text-body font-bold text-p4g-ink-soft">正在找你的组织…</div></div></P4Card>;
    if (pstate === 'empty') return (
      <div>
        <P4EmptyState title="还没有组织" hint="和几个朋友建一个据点：名册上挂着大家的代表牌，公告板上互相打气，每周日开个小会写下周目标。最多 7 人；每人最多自建一个、加入一个。"
          action={<div className="flex gap-2"><P4Button variant="black" onClick={() => setOnb('create')}>建立组织</P4Button><P4Button variant="secondary" onClick={() => setOnb('join')}>输入邀请码</P4Button></div>} />
      </div>
    );
    const conflict = false;
    return (
      <CollageStagger className="space-y-5">
        <CollageItem><TitleBlock view={view} leader={leader} meetingDay={meeting === 'open' || meeting === 'submitted'} meetingDone={meeting === 'submitted'} /></CollageItem>
        {(conflict || !view.me.tarotId) && (
          <CollageItem>
            <P4Card tone="black" padding="sm" cut="br"><div className="flex items-center gap-3"><div className="min-w-0 flex-1 text-meta font-bold leading-relaxed text-white">{conflict ? '你的代表牌和别人同时选中了同一张，先选的人留下了。重新选一张吧。' : '还没选代表牌：选一张，名册上才有你的牌面。'}</div><P4Button size="sm" onClick={() => setOnb('card')}>去选</P4Button></div></P4Card>
          </CollageItem>
        )}
        <CollageItem>
          <HideoutMap view={view} section={section} onSection={pickSection} blocked={blocked} onSeat={setFlip}
            dots={{ board: section !== 'board' && !seen.board, meeting: meeting === 'open', ops: section !== 'ops' && !seen.ops }}
            raid={{ boss: RAID.boss.name, left: RAID.left / RAID.hpMax, defeated: false, dot: true }} onRaid={() => setRaidOpen(true)} />
          <div className="mt-3"><RaidBanner onOpen={() => setRaidOpen(true)} /></div>
        </CollageItem>
        <CollageItem>
          <SectionTitle section={section} alt={section === 'roster' && wall} onTitle={section === 'roster' ? () => setWall((w) => !w) : undefined}
            meta={section === 'roster' ? `${members.length} / 7` : section === 'meeting' && !(meeting === 'open' || meeting === 'submitted') ? '每周日' : undefined} />
          <ChannelNoise active={noise} duration={160} onDone={() => setNoise(false)} />
          <StateFade k={section + (wall ? 'w' : '') + pstate}>
            {section === 'roster' && wall ? (
              <RosterWall view={view} blocked={blocked} onMore={setMenuFor} onSync={setBorrowFor} onInvite={invite} />
            ) : section === 'roster' ? (
              <div className="grid grid-cols-1 gap-2.5 min-[560px]:grid-cols-2">
                {members.map((m) => <MemberTile key={m.id} view={view} member={m} blocked={blocked.has(m.userId)} onOpen={() => setFlip(m)} onMore={() => setMenuFor(m)} />)}
                {empty > 0 && (
                  <button type="button" onClick={invite} className="p4g-press flex min-h-[104px] flex-col items-center justify-center gap-1 rounded-sm border-3 border-dashed border-p4g-line bg-p4g-surface-2/60 text-center text-p4g-ink">
                    <span className="font-display text-h2 font-bold leading-none">＋</span>
                    <span className="font-display text-meta font-bold">还有 {empty} 个空座位</span>
                    <span className="text-2xs font-bold text-p4g-ink-soft">点这里把邀请码发给朋友</span>
                  </button>
                )}
              </div>
            ) : section === 'board' ? (
              <BoardSection view={view} blocked={blocked} failed={pstate === 'error'} leader={leader} onBlockToggle={toggleBlock} />
            ) : section === 'ops' ? (
              <OpsSection view={view} blocked={blocked} leader={leader} state={pstate === 'error' ? 'failed' : undefined} onBlockToggle={toggleBlock} />
            ) : (
              <MeetingSection key={meeting} view={view} mode={meeting as 'open'} />
            )}
          </StateFade>
        </CollageItem>
        <CollageItem><InvitePanel view={view} open={inviteOpen} onToggle={() => setInviteOpen((o) => !o)} onFlash={(s) => toast(s)} onShare={invite} /></CollageItem>
      </CollageStagger>
    );
  })();

  return (
    <div className="relative mx-auto max-w-2xl space-y-5 pb-8">
      {/* 页头：BondTitle（同伴 ⇄ 组织）+ 刷新 / 据点设置 */}
      <header className="relative -mx-4 px-4 pt-1 wide:-mx-8 wide:px-8">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-4 h-[18px] p4g-candy-h wide:-top-8" />
        <div className="relative flex min-w-0 items-end gap-2 pt-4">
          <div role="tablist" aria-label="同伴 / 组织切换" className="flex min-w-0 items-end gap-3">
            <button type="button" role="tab" aria-selected={false} aria-label="点一下切换到同伴" onClick={() => navigate('cooperation', undefined, { transition: 'noise' })} data-bond-toggle className="p4g-press shrink-0 pb-1 opacity-60"><P4Outline size="clamp(20px,6vw,26px)" stroke={4}>同伴</P4Outline></button>
            <button type="button" role="tab" aria-selected aria-label="组织（现在这页）" className="relative flex min-w-0 flex-col items-start">
              <span className="rounded-xs bg-p4g-black px-1.5 font-display text-2xs font-bold italic tracking-[0.2em] text-p4g-yellow night:bg-p4g-yellow night:text-p4g-black">HIDEOUT</span>
              <P4Outline as="h1" size="clamp(32px,10vw,48px)" stroke={5} className="block">组织</P4Outline>
            </button>
          </div>
          {pstate === 'ok' && (
            <div className="mb-1 ml-auto flex shrink-0 items-center gap-1.5">
              <HeaderIcon label={refreshing ? '刷新中' : '刷新'} onClick={refresh}>
                <motion.span className="flex" animate={refreshing && !low ? { rotate: 360 } : { rotate: 0 }} transition={refreshing ? { repeat: Infinity, duration: 0.9, ease: 'linear' } : { duration: 0 }}>
                  <svg viewBox="0 0 24 24" width={17} height={17} fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M20 11a8 8 0 0 0-14.3-4.9" /><path d="M5.2 2.8v3.6h3.6" /><path d="M4 13a8 8 0 0 0 14.3 4.9" /><path d="M18.8 21.2v-3.6h-3.6" /></svg>
                </motion.span>
              </HeaderIcon>
              <HeaderIcon label="据点设置" onClick={() => setSettingsOpen(true)}><span className="font-display text-h3 leading-none">⚙</span></HeaderIcon>
            </div>
          )}
        </div>
      </header>

      <AnimatePresence>
        {notice && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex min-w-0 items-center gap-3 rounded-sm border-3 border-p4g-black bg-p4g-orange px-3 py-2 text-p4g-black shadow-hard night:border-p4g-yellow" role="status">
            <span className="min-w-0 flex-1 text-meta font-bold leading-relaxed">你已不在「{SECOND_ORG.name}」：队长解散了这个组织。</span>
            <button type="button" onClick={() => setNotice(false)} className="shrink-0 font-display text-body font-bold underline">知道了</button>
          </motion.div>
        )}
      </AnimatePresence>

      {pstate === 'ok' && twoOrgs && (
        <div role="tablist" aria-label="我的组织" className="grid grid-cols-2 gap-2.5">
          {[{ name: base.org.name, slot: 'own', n: base.members.length, dot: false, meet: true }, { name: SECOND_ORG.name, slot: SECOND_ORG.slot, n: SECOND_ORG.members, dot: true, meet: false }].map((o, i) => (
            <button key={o.name} type="button" role="tab" aria-selected={orgIdx === i} onClick={() => setOrgIdx(i)} className={cx('p4g-press relative min-w-0 rounded-sm border-3 px-3 py-2 text-left', orgIdx === i ? 'border-p4g-select bg-p4g-select text-[color:var(--p4g-select-ink)] shadow-[3px_3px_0_var(--p4g-orange)]' : 'border-p4g-line bg-p4g-surface text-p4g-ink')}>
              <span className="block truncate font-display text-body font-bold">{o.name}</span>
              <span className="block truncate text-2xs font-bold opacity-75">{o.slot === 'own' ? '我建的' : '我加入的'} · {o.n} / 7{o.meet ? ' · 会议日' : ''}</span>
              {o.dot && <P4Badge dot className="absolute -right-1 -top-1" />}
            </button>
          ))}
        </div>
      )}

      <StateFade k={pstate}>{body}</StateFade>

      {pstate === 'ok' && !twoOrgs && (
        <div className="flex flex-wrap items-center justify-center gap-x-2 font-display text-meta font-bold text-[color:var(--p4g-on-stage)]">
          <span>还可以</span><button type="button" onClick={() => setOnb('join')} className="underline decoration-2 underline-offset-2">加入一个组织</button>
        </div>
      )}

      <DevStrip value={pstate} onChange={(v) => setPstate(v as PageState)} items={[{ id: 'ok', label: '正常' }, { id: 'signed-out', label: '未登录' }, { id: 'loading', label: '加载中' }, { id: 'empty', label: '还没有组织' }, { id: 'error', label: '分区拉取失败' }]} />
      {pstate === 'ok' && (
        <>
          <DevStrip title="DEV · 身份 / 附加" value={`${role}`} onChange={(v) => { if (v === 'leader' || v === 'member') setRole(v); if (v === 'two') setTwoOrgs((x) => !x); if (v === 'notice') setNotice((x) => !x); if (v === 'nocard') setNoCard((x) => !x); }}
            items={[{ id: 'leader', label: '我是队长' }, { id: 'member', label: '我是成员' }, { id: 'two', label: `两个组织${twoOrgs ? '✓' : ''}` }, { id: 'notice', label: `公告条${notice ? '✓' : ''}` }, { id: 'nocard', label: `没选代表牌${noCard ? '✓' : ''}` }]} />
          {section === 'meeting' && <DevStrip title="DEV · 会议" value={meeting} onChange={setMeeting} items={[{ id: 'open', label: '开会中' }, { id: 'submitted', label: '已交' }, { id: 'closed', label: 'N 天后' }, { id: 'tomorrow', label: '明天就开' }, { id: 'empty', label: '没人立目标' }]} />}
        </>
      )}

      {/* 弹层 */}
      <MemberFlipView view={view} member={flip} open={!!flip} onClose={() => setFlip(null)} onSync={(m) => { setFlip(null); setBorrowFor(m); }} />
      <MemberMenu member={menuFor} open={!!menuFor} onClose={() => setMenuFor(null)} isMe={menuFor?.userId === view.me.userId} leader={leader} blocked={!!menuFor && blocked.has(menuFor.userId)}
        onAction={(a) => {
          const m = menuFor; if (!m) return;
          if (a === 'view') setFlip(m); else if (a === 'edit-card') setOnb('card'); else if (a === 'sync') setBorrowFor(m); else if (a === 'leader') setSettingsOpen(true);
          else { const was = blocked.has(m.userId); toggleBlock(m.userId); toast(was ? '已解除屏蔽' : '已屏蔽，之后不再显示 Ta 的动态'); }
        }} />
      <BorrowMask member={borrowFor} open={!!borrowFor} onClose={() => setBorrowFor(null)} onBorrowed={(s) => toast.success(s)} />
      <RaidPanel view={view} open={raidOpen} onClose={() => setRaidOpen(false)} onFlash={(s) => toast(s)} />
      <OrgTitles open={titlesOpen} onClose={() => setTitlesOpen(false)} leader={leader} onFlash={(s) => toast.success(s)} />
      <OrgSettings view={view} open={settingsOpen} onClose={() => setSettingsOpen(false)} leader={leader} blocked={[...blocked]} onUnblock={toggleBlock}
        onEditCard={() => { setSettingsOpen(false); setOnb('card'); }} onEditTitles={() => { setSettingsOpen(false); setTitlesOpen(true); }} onFlash={(s) => toast(s)} onGone={() => { setSettingsOpen(false); setPstate('empty'); }} />
      <OrgOnboarding mode={onb} open={!!onb} onClose={() => setOnb(null)} onDone={(n) => { if (onb !== 'card') { setPstate('ok'); toast.success(`已加入「${n}」`); } else { setNoCard(false); toast.success('成员牌改好了'); } }} />
    </div>
  );
}

function HeaderIcon({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return <button type="button" aria-label={label} title={label} onClick={onClick} className="p4g-press flex h-10 w-10 items-center justify-center rounded-sm border-3 border-p4g-black bg-p4g-yellow text-p4g-black shadow-hard-sm night:border-p4g-yellow">{children}</button>;
}

function TitleBlock({ view, leader, meetingDay, meetingDone }: { view: OrgView; leader: boolean; meetingDay: boolean; meetingDone: boolean }) {
  const [open, setOpen] = useState(false);
  const emb = ORG_EMBLEMS.find((e) => e.id === view.org.emblem);
  const name = ORG_LEVEL_NAMES[LEVEL.level - 1];
  return (
    <div className="relative min-w-0">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-14 w-14 shrink-0 -rotate-3 items-center justify-center rounded-sm border-3 border-p4g-black bg-p4g-black font-display text-h1 text-p4g-yellow shadow-[4px_4px_0_var(--p4g-orange)] night:border-p4g-yellow">{emb?.glyph}</span>
        <div className="min-w-0 flex-1">
          <div className="min-w-0 overflow-hidden"><P4Outline as="h2" size="clamp(26px,8vw,38px)" stroke={5} className="max-w-full">{view.org.name}</P4Outline></div>
          {view.org.motto && <div className="mt-0.5 truncate font-display text-meta font-bold text-[color:var(--p4g-on-stage)] opacity-85">「{view.org.motto}」</div>}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 font-display text-meta font-bold text-[color:var(--p4g-on-stage)]">
        <span className="p4g-num-upright">{view.members.length} / 7 人</span><span aria-hidden>·</span>
        {leader ? <LeaderChip /> : <span>你是 {seatNo(view.me.seat)} 号成员</span>}
        {meetingDay && <span className="shrink-0 rounded-xs bg-p4g-red px-1.5 py-[1px] font-display text-2xs font-bold text-white">{meetingDone ? '会议日 ✓' : '会议日'}</span>}
      </div>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label={`据点 Lv.${LEVEL.level} ${name}，离 Lv.${LEVEL.level + 1} 还差 ${LEVEL.next - LEVEL.xp}，同调威力 ×${LEVEL.mult.toFixed(1)}`} className="mt-2.5 block w-full min-w-0 text-left">
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-xs bg-p4g-black px-2 py-[3px] font-display text-meta font-bold leading-none text-p4g-yellow night:bg-p4g-yellow night:text-p4g-black">据点 Lv.{LEVEL.level}<span className="ml-1 opacity-90">· {name}</span></span>
          <span className="h-[12px] min-w-0 flex-1 overflow-hidden rounded-[2px] border-thin border-p4g-black bg-p4g-black"><span className="block h-full origin-left bg-p4g-orange" style={{ transform: `scaleX(${(LEVEL.xp - LEVEL.floor) / (LEVEL.next - LEVEL.floor)})` }} /></span>
        </div>
        <div className="mt-1 text-2xs font-bold text-[color:var(--p4g-on-stage)] opacity-85">同调威力 ×{LEVEL.mult.toFixed(1)} · 离 Lv.{LEVEL.level + 1} 还差 {LEVEL.next - LEVEL.xp} <span aria-hidden>{open ? '▴' : '▾'}</span></div>
      </button>
      {open && <p className="mt-1.5 rounded-sm border-thin border-dashed border-p4g-line bg-p4g-surface-2/70 px-2.5 py-2 text-2xs font-bold leading-relaxed text-p4g-ink">经验怎么来：周日会议上每个写了下周目标的人 +{ORG_XP_MEETING}；每个达成的目标或作战，每个参与者 +{ORG_XP_OP_SMALL}（作战 +{ORG_XP_OP_BIG}），每周最多算 {ORG_XP_OPS_PER_WEEK} 个；满月团战击退暗影，每个出过手的人 +{RAID_XP_PER_HITTER}。等级越高，队友同调走的面具在战场上越强（Lv.6 ×1.5），地图上的据点也会一点点长起来。</p>}
    </div>
  );
}

function SectionTitle({ section, meta, onTitle, alt }: { section: HideoutSection; meta?: string; onTitle?: () => void; alt?: boolean }) {
  const s = SECTION_TITLE[section];
  const label = onTitle ? `${s.t}：现在是${alt ? '专辑墙' : '格子'}样式，点一下换成${alt ? '格子' : '专辑墙'}` : undefined;
  const chip = (
    <span className="relative inline-block">
      <span aria-hidden className={cx('absolute inset-0 -skew-x-12 shadow-[3px_3px_0_var(--p4g-orange)]', alt ? 'bg-p4g-orange' : 'bg-p4g-black night:bg-p4g-yellow')} />
      <span className={cx('relative block px-3 py-1 font-display text-lead font-bold', alt ? 'text-p4g-black' : 'text-p4g-yellow night:text-p4g-black')}>{s.t}{onTitle && <span className="ml-1.5 text-2xs opacity-80">{alt ? '▦ 牌墙' : '☰ 格子'}</span>}</span>
    </span>
  );
  return (
    <div className="mb-3 flex min-w-0 items-end gap-2">
      {onTitle ? <button type="button" onClick={onTitle} aria-label={label} aria-pressed={alt} className="p4g-press shrink-0">{chip}</button> : <span className="shrink-0">{chip}</span>}
      <span className="min-w-0 truncate pb-0.5 font-display text-2xs font-bold italic uppercase tracking-[0.2em] text-[color:var(--p4g-on-stage)] opacity-80">{s.en}</span>
      <span aria-hidden className="mb-1 h-[3px] min-w-[12px] flex-1 bg-[color:var(--p4g-on-stage)] opacity-80" />
      {meta && <span className="shrink-0 p4g-num-upright font-display text-body font-bold text-[color:var(--p4g-on-stage)]">{meta}</span>}
    </div>
  );
}

function InvitePanel({ view, open, onToggle, onFlash, onShare }: { view: OrgView; open: boolean; onToggle: () => void; onFlash: (s: string) => void; onShare: () => void }) {
  const full = view.members.length >= 7;
  const code = view.org.inviteCode;
  return (
    <div className="overflow-hidden rounded-sm border-3 border-p4g-line shadow-hard-sm" style={{ background: 'var(--p4g-surface-grad)' }}>
      <button type="button" onClick={onToggle} aria-expanded={open} aria-controls="org-invite-body" className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
        <span className="font-display text-meta font-bold tracking-[0.2em] text-p4g-ink">INVITE · 邀请码</span>
        <span className="flex shrink-0 items-center gap-1 font-display text-meta font-bold text-p4g-ink-soft">{open ? '收起' : full ? '已满 7 人' : '展开'}<span aria-hidden className={cx('inline-block transition-transform', open && 'rotate-180')}>▾</span></span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div id="org-invite-body" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
            <div className="flex items-center justify-between gap-3 border-t-2 border-dashed border-p4g-line/40 px-4 pb-4 pt-3">
              <div className="min-w-0">
                <div className="p4g-num-upright text-[clamp(24px,7vw,32px)] font-bold tracking-[0.18em] text-p4g-ink">{code.slice(0, 4)} {code.slice(4)}</div>
                <div className="mt-0.5 text-2xs font-bold text-p4g-ink-soft">{full ? '已经满 7 人了' : '羁绊页点标题切到「组织」输入'}</div>
              </div>
              <div className="flex shrink-0 flex-col gap-2">
                <P4Button size="sm" variant="black" onClick={onShare}>分享</P4Button>
                <P4Button size="sm" variant="secondary" onClick={() => { void navigator.clipboard?.writeText?.(code).catch(() => {}); onFlash('邀请码已复制'); }}>复制</P4Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
