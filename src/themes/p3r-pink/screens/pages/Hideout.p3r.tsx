/**
 * 组织据点页（真实 src/pages/Hideout.tsx p3 分支 + components/org/HideoutMap.tsx / BondTitle.tsx），粉白重画
 * 页头：BondTitle（同伴 ⇄ 组织，斜切双页签）+ 刷新 / 据点设置；GhostWords HIDEOUT；组织名黑斜大字 + 口号 + 人数 / 队长 / 会议日 + 据点等级线
 * 地图 = 校园地图（p3 底图同名变量 → 粉化）：四地标 = 分区页签；中心徽记 / 满月团战首领
 * 路由：#/p/hideout?tab=roster|board|ops|meeting（&view=wall）
 *   ?state=signed-out|loading|empty|error；?role=member；?orgs=2；?notice=1；?card=none；?meeting=open|submitted|closed|tomorrow|empty
 *   弹层直达：?open=flip|menu|borrow|raid|settings|titles|create|join|card
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { OrgMember, OrgView } from '@/types';
import type { PageProps } from '@pink/registry/types';
import { P3R, P3Button, P3Empty, P3Loading, GhostWords, SectionMark, slantClip, chamferClip, useToast } from '@pink/kit';
import { PageEnter, CutInSweep } from '@pink/fx';
import { useLowMotion } from '@pink/lib/prefs';
import { navigate } from '@pink/shell/shellBus';
import { buildView, LEVEL, ORG_LEVEL_NAMES, ORG_EMBLEMS, SECOND_ORG, ORG_XP_MEETING, ORG_XP_OP_SMALL, ORG_XP_OP_BIG, ORG_XP_OPS_PER_WEEK, RAID_XP_PER_HITTER, RAID } from '@pink/adapters/pkg4-org';
import { DevStrip, StateFade } from '@pink/screens/pkg4/ui';
import { HideoutMap, RosterWall, MemberTile, SECTION_TITLE, type HideoutSection } from '@pink/screens/pkg4/org/MapWall';
import { BoardSection } from '@pink/screens/pkg4/org/Board';
import { MeetingSection, OpsSection, type MeetMode } from '@pink/screens/pkg4/org/OpsMeeting';
import { LeaderChip, seatNo, panel } from '@pink/screens/pkg4/org/common';
import { MemberFlipView } from '@pink/screens/overlays/MemberCardFlip.p3r';
import { MemberMenu } from '@pink/screens/overlays/HideoutMemberMenu.p3r';
import { BorrowMask } from '@pink/screens/overlays/BorrowMaskSheet.p3r';
import { RaidPanel, RaidBanner } from '@pink/screens/overlays/RaidSheet.p3r';
import { OrgTitles } from '@pink/screens/overlays/OrgTitlesSheet.p3r';
import { OrgSettings } from '@pink/screens/overlays/OrgSettingsSheet.p3r';
import { OrgOnboarding, type OnbMode } from '@pink/screens/overlays/OrgOnboardingSheet.p3r';
import { OpCreate } from '@pink/screens/overlays/OpCreateSheet.p3r';

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
  const [meeting, setMeeting] = useState<MeetMode>((['open', 'submitted', 'closed', 'tomorrow', 'empty'].includes(params.get('meeting') ?? '') ? params.get('meeting') : 'open') as MeetMode);
  const [section, setSection] = useState<HideoutSection>(SECTIONS.includes(tab as HideoutSection) ? (tab as HideoutSection) : 'roster');
  const [wall, setWall] = useState(params.get('view') === 'wall');
  const [blocked, setBlocked] = useState<Set<string>>(new Set());
  const base = useMemo(buildView, []);
  const op = params.get('open');
  const [flip, setFlip] = useState<OrgMember | null>(op === 'flip' ? base.members[1] : null);
  const [menuFor, setMenuFor] = useState<OrgMember | null>(op === 'menu' ? base.members[1] : null);
  const [borrowFor, setBorrowFor] = useState<OrgMember | null>(op === 'borrow' ? base.members[2] : null);
  const [settingsOpen, setSettingsOpen] = useState(op === 'settings');
  const [titlesOpen, setTitlesOpen] = useState(op === 'titles');
  const [raidOpen, setRaidOpen] = useState(op === 'raid');
  const [createOpen, setCreateOpen] = useState(op === 'create');
  const [onb, setOnb] = useState<OnbMode | null>(op === 'join' ? 'join' : op === 'card' ? 'card' : op === 'onboard' ? 'create' : null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sweep, setSweep] = useState(false);
  const [seen, setSeen] = useState<Partial<Record<HideoutSection, boolean>>>({});

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
  const pickSection = (s: HideoutSection) => { if (s === section) return; setSection(s); };
  const refresh = () => { if (refreshing) return; setRefreshing(true); window.setTimeout(() => setRefreshing(false), 1100); };
  const invite = () => { void navigator.clipboard?.writeText?.(`来「${view.org.name}」一起吧：打开面具庭园 → 羁绊 → 点标题切到「组织」→ 输入邀请码 ${view.org.inviteCode}`).catch(() => {}); toast('邀请语已复制，发给朋友吧'); };
  const toggleBlock = (uid: string) => setBlocked((b) => { const n = new Set(b); if (n.has(uid)) n.delete(uid); else n.add(uid); return n; });
  const stag = (i: number) => ({ initial: low ? { opacity: 0 } : { opacity: 0, x: -18 }, animate: { opacity: 1, x: 0 }, transition: { delay: low ? 0 : i * 0.05, duration: 0.24 } });

  const body = (() => {
    if (pstate === 'signed-out') return (
      <div className="relative px-5 py-5" style={panel(18)}>
        <div className="font-heavy text-[19px]" style={{ color: P3R.ink }}>登录之后才能用组织</div>
        <div className="mt-1 text-[12.5px] font-bold leading-relaxed" style={{ color: P3R.inkSoft }}>和几个朋友建一个据点：名册、公告板、周日会议，最多 7 人。组织放在云端，要先登录账号。</div>
        <div className="mt-3"><P3Button size="sm" corner onClick={() => navigate('account')}>去登录</P3Button></div>
      </div>
    );
    if (pstate === 'loading') return <P3Loading text="正在找你的组织…" />;
    if (pstate === 'empty') return (
      <P3Empty text="还没有组织" ghost="HIDEOUT" sub="和几个朋友建一个据点：名册上挂着大家的代表牌，公告板上互相打气，每周日开个小会写下周目标。最多 7 人；每人最多自建一个、加入一个。"
        action={<div className="flex flex-wrap justify-center gap-2"><P3Button corner onClick={() => setOnb('create')}>建立组织</P3Button><P3Button tone="soft" onClick={() => setOnb('join')}>输入邀请码</P3Button></div>} />
    );
    return (
      <div className="space-y-5">
        <motion.div {...stag(0)}><TitleBlock view={view} leader={leader} meetingDay={meeting === 'open' || meeting === 'submitted'} meetingDone={meeting === 'submitted'} /></motion.div>
        {!view.me.tarotId && (
          <motion.div {...stag(1)} className="flex items-center gap-3 px-5 py-3" style={{ background: P3R.ink, color: 'var(--p3r-on-ink)', clipPath: slantClip(12) }}>
            <div className="min-w-0 flex-1 text-[12.5px] font-bold leading-relaxed">还没选代表牌：选一张，名册上才有你的牌面。</div>
            <P3Button size="sm" onClick={() => setOnb('card')}>去选</P3Button>
          </motion.div>
        )}
        <motion.div {...stag(2)}>
          <HideoutMap view={view} section={section} onSection={pickSection} blocked={blocked} onSeat={setFlip} level={LEVEL.level}
            dots={{ board: section !== 'board' && !seen.board, meeting: meeting === 'open', ops: section !== 'ops' && !seen.ops }}
            raid={{ boss: RAID.boss.name, left: RAID.left / RAID.hpMax, defeated: false, dot: true }} onRaid={() => setRaidOpen(true)} />
          <div className="mt-3"><RaidBanner onOpen={() => setRaidOpen(true)} /></div>
        </motion.div>
        <motion.div {...stag(3)}>
          <div className="mb-3">
            <SectionMark tone={section === 'roster' && wall ? 'rose' : 'ink'} en={SECTION_TITLE[section].en}
              title={section === 'roster' ? <button type="button" onClick={() => setWall((w) => !w)} aria-pressed={wall} aria-label={`${SECTION_TITLE.roster.t}：现在是${wall ? '专辑墙' : '格子'}样式，点一下换成${wall ? '格子' : '专辑墙'}`} className="text-left">{SECTION_TITLE.roster.t}<span className="ml-1.5 text-[11px] font-black opacity-75">{wall ? '▦ 牌墙' : '☰ 格子'}</span></button> : SECTION_TITLE[section].t}
              meta={section === 'roster' ? <span className="font-cond text-[15px]" style={{ color: P3R.blue }}>{members.length} / 7</span> : section === 'meeting' && !(meeting === 'open' || meeting === 'submitted') ? <span className="text-[12px] font-black" style={{ color: P3R.blue }}>每周日</span> : undefined} />
          </div>
          <StateFade k={section + (wall ? 'w' : '') + pstate}>
            {section === 'roster' && wall ? (
              <RosterWall view={view} blocked={blocked} onMore={setMenuFor} onSync={setBorrowFor} onInvite={invite} />
            ) : section === 'roster' ? (
              <div className="grid grid-cols-1 gap-2.5 min-[560px]:grid-cols-2">
                {members.map((m) => <MemberTile key={m.id} view={view} member={m} blocked={blocked.has(m.userId)} onOpen={() => setFlip(m)} onMore={() => setMenuFor(m)} />)}
                {empty > 0 && (
                  <button type="button" onClick={invite} className="flex min-h-[104px] flex-col items-center justify-center gap-1 text-center active:scale-[0.99]" style={{ background: 'rgb(var(--p3r-wash) / 0.8)', clipPath: slantClip(12), color: P3R.ink }}>
                    <span className="font-cond text-[34px] leading-none" style={{ color: P3R.blue }}>＋</span>
                    <span className="text-[13px] font-black">还有 {empty} 个空座位</span>
                    <span className="text-[10.5px] font-bold" style={{ color: P3R.grey }}>点这里把邀请码发给朋友</span>
                  </button>
                )}
              </div>
            ) : section === 'board' ? (
              <BoardSection view={view} blocked={blocked} failed={pstate === 'error'} leader={leader} onBlockToggle={toggleBlock} />
            ) : section === 'ops' ? (
              <OpsSection view={view} blocked={blocked} leader={leader} state={pstate === 'error' ? 'failed' : undefined} onBlockToggle={toggleBlock} />
            ) : (
              <MeetingSection key={meeting} view={view} mode={meeting} />
            )}
          </StateFade>
        </motion.div>
        <motion.div {...stag(4)}><InvitePanel view={view} open={inviteOpen} onToggle={() => setInviteOpen((o) => !o)} onFlash={(s) => toast(s)} onShare={invite} /></motion.div>
      </div>
    );
  })();

  return (
    <PageEnter k="hideout">
      <div className="relative mx-auto max-w-2xl space-y-5 pb-8">
        <header className="relative pt-2">
          <div className="relative flex min-w-0 items-end gap-2">
            <div role="tablist" aria-label="同伴 / 组织切换" className="flex min-w-0 items-end gap-2">
              <button type="button" role="tab" aria-selected={false} aria-label="点一下切换到同伴" onClick={() => navigate('cooperation', undefined, { transition: 'wipe' })} className="shrink-0 px-2.5 py-1 font-heavy text-[17px]" style={{ background: P3R.panel, color: P3R.grey, clipPath: slantClip(6) }}>同伴</button>
              <button type="button" role="tab" aria-selected aria-label="组织（现在这页）" className="relative flex min-w-0 items-end gap-2">
                <span aria-hidden className="mb-1 h-[32px] w-[20px] shrink-0" style={{ background: P3R.blue, clipPath: 'polygon(36% 0, 100% 0, 64% 100%, 0 100%)' }} />
                <span className="min-w-0 text-left">
                  <span className="block font-cond text-[13px] uppercase tracking-wider" style={{ color: P3R.blue }}>HIDEOUT</span>
                  <h1 className="font-heavy text-[clamp(30px,9vw,40px)] leading-[1.02]" style={{ color: P3R.ink }}>组织</h1>
                </span>
              </button>
            </div>
            {pstate === 'ok' && (
              <div className="mb-1 ml-auto flex shrink-0 items-center gap-1.5">
                <HeaderIcon label={refreshing ? '刷新中' : '刷新'} onClick={refresh}>
                  <motion.span className="flex" animate={refreshing && !low ? { rotate: 360 } : { rotate: 0 }} transition={refreshing ? { repeat: Infinity, duration: 0.9, ease: 'linear' } : { duration: 0 }}>
                    <svg viewBox="0 0 24 24" width={17} height={17} fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M20 11a8 8 0 0 0-14.3-4.9" /><path d="M5.2 2.8v3.6h3.6" /><path d="M4 13a8 8 0 0 0 14.3 4.9" /><path d="M18.8 21.2v-3.6h-3.6" /></svg>
                  </motion.span>
                </HeaderIcon>
                <HeaderIcon label="据点设置" onClick={() => setSettingsOpen(true)}>
                  <svg viewBox="0 0 24 24" width={17} height={17} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="12" cy="12" r="3.2" /><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" /></svg>
                </HeaderIcon>
              </div>
            )}
          </div>
          <div aria-hidden className="relative h-6"><GhostWords words={['HIDEOUT']} className="left-[6px] top-[-30px] text-[78px]" /></div>
        </header>

        <AnimatePresence>
          {notice && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex min-w-0 items-center gap-3 px-5 py-2.5" role="status" style={{ background: P3R.magenta, color: '#fff', clipPath: slantClip(10) }}>
              <span className="min-w-0 flex-1 text-[12.5px] font-bold leading-relaxed">你已不在「{SECOND_ORG.name}」：队长解散了这个组织。</span>
              <button type="button" onClick={() => setNotice(false)} className="shrink-0 text-[13px] font-black underline">知道了</button>
            </motion.div>
          )}
        </AnimatePresence>

        {pstate === 'ok' && twoOrgs && (
          <div role="tablist" aria-label="我的组织" className="grid grid-cols-2 gap-2">
            {[{ name: base.org.name, slot: 'own', n: base.members.length, dot: false, meet: true }, { name: SECOND_ORG.name, slot: SECOND_ORG.slot, n: SECOND_ORG.members, dot: true, meet: false }].map((o, i) => (
              <button key={o.name} type="button" role="tab" aria-selected={orgIdx === i} onClick={() => { if (orgIdx !== i) { setOrgIdx(i); setSweep(!low); } }} className="relative min-w-0 px-4 py-2 text-left" style={{ clipPath: slantClip(10), background: orgIdx === i ? P3R.blue : P3R.panel, color: orgIdx === i ? P3R.onBlue : P3R.ink }}>
                <span className="block truncate text-[14px] font-black">{o.name}</span>
                <span className="block truncate text-[10.5px] font-bold opacity-80">{o.slot === 'own' ? '我建的' : '我加入的'} · {o.n} / 7{o.meet ? ' · 会议日' : ''}</span>
                {o.dot && <span aria-hidden className="absolute right-3 top-2 h-2.5 w-2.5 rounded-full" style={{ background: P3R.magenta, boxShadow: '0 0 0 2px var(--p3r-panel)' }} />}
              </button>
            ))}
          </div>
        )}
        <CutInSweep active={sweep} text="HIDEOUT" sub={view.org.name} onDone={() => setSweep(false)} />

        <StateFade k={pstate}>{body}</StateFade>

        {pstate === 'ok' && !twoOrgs && (
          <div className="flex flex-wrap items-center justify-center gap-x-2 text-[12.5px] font-bold" style={{ color: P3R.grey }}>
            <span>还可以</span><button type="button" onClick={() => setOnb('join')} className="font-black underline" style={{ color: P3R.roseInk }}>加入一个组织</button>
          </div>
        )}

        <DevStrip value={pstate} onChange={(v) => setPstate(v as PageState)} items={[{ id: 'ok', label: '正常' }, { id: 'signed-out', label: '未登录' }, { id: 'loading', label: '加载中' }, { id: 'empty', label: '还没有组织' }, { id: 'error', label: '分区拉取失败' }]} />
        {pstate === 'ok' && (
          <>
            <DevStrip title="DEV · 身份 / 附加" value={role} onChange={(v) => { if (v === 'leader' || v === 'member') setRole(v); if (v === 'two') setTwoOrgs((x) => !x); if (v === 'notice') setNotice((x) => !x); if (v === 'nocard') setNoCard((x) => !x); }}
              items={[{ id: 'leader', label: '我是队长' }, { id: 'member', label: '我是成员' }, { id: 'two', label: `两个组织${twoOrgs ? '✓' : ''}` }, { id: 'notice', label: `公告条${notice ? '✓' : ''}` }, { id: 'nocard', label: `没选代表牌${noCard ? '✓' : ''}` }]} />
            {section === 'meeting' && <DevStrip title="DEV · 会议" value={meeting} onChange={(v) => setMeeting(v as MeetMode)} items={[{ id: 'open', label: '开会中' }, { id: 'submitted', label: '已交' }, { id: 'closed', label: 'N 天后' }, { id: 'tomorrow', label: '明天就开' }, { id: 'empty', label: '没人立目标' }]} />}
          </>
        )}

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
        <OpCreate view={view} open={createOpen} onClose={() => setCreateOpen(false)} leader={leader} onDone={(m) => toast.success(m)} />
        <OrgSettings view={view} open={settingsOpen} onClose={() => setSettingsOpen(false)} leader={leader} blocked={[...blocked]} onUnblock={toggleBlock}
          onEditCard={() => { setSettingsOpen(false); setOnb('card'); }} onEditTitles={() => { setSettingsOpen(false); setTitlesOpen(true); }} onFlash={(s) => toast(s)} onGone={() => { setSettingsOpen(false); setPstate('empty'); }} />
        <OrgOnboarding mode={onb} open={!!onb} onClose={() => setOnb(null)} onDone={(n) => { if (onb !== 'card') { setPstate('ok'); toast.success(`已加入「${n}」`); } else { setNoCard(false); toast.success('成员牌改好了'); } }} />
      </div>
    </PageEnter>
  );
}

function HeaderIcon({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return <button type="button" aria-label={label} title={label} onClick={onClick} className="flex h-10 w-10 items-center justify-center active:scale-95" style={{ background: P3R.panel, color: P3R.blueDeep, clipPath: slantClip(6), boxShadow: 'var(--p3r-shadow)' }}>{children}</button>;
}

function TitleBlock({ view, leader, meetingDay, meetingDone }: { view: OrgView; leader: boolean; meetingDay: boolean; meetingDone: boolean }) {
  const [open, setOpen] = useState(false);
  const emb = ORG_EMBLEMS.find((e) => e.id === view.org.emblem);
  const name = ORG_LEVEL_NAMES[LEVEL.level - 1];
  const pct = (LEVEL.xp - LEVEL.floor) / (LEVEL.next - LEVEL.floor);
  return (
    <div className="relative min-w-0">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center text-[26px] font-black" style={{ background: P3R.blue, color: P3R.onBlue, clipPath: chamferClip(10, 10) }}>{emb?.glyph}</span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-heavy text-[clamp(24px,7.5vw,30px)] leading-tight" style={{ color: P3R.ink }}>{view.org.name}</h2>
          {view.org.motto && <div className="truncate text-[13px] font-bold" style={{ color: P3R.inkSoft }}>{view.org.motto}</div>}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-black" style={{ color: P3R.inkSoft }}>
        <span>{view.members.length} / 7 人</span><span aria-hidden>·</span>
        {leader ? <LeaderChip /> : <span>你是 {seatNo(view.me.seat)} 号成员</span>}
        {meetingDay && <span className="shrink-0 px-1.5 py-[1px] text-[10px] font-black" style={{ background: P3R.magenta, color: '#fff', clipPath: slantClip(3) }}>{meetingDone ? '会议日 ✓' : '会议日'}</span>}
      </div>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label={`据点 Lv.${LEVEL.level} ${name}，离 Lv.${LEVEL.level + 1} 还差 ${LEVEL.next - LEVEL.xp}，同调威力 ×${LEVEL.mult.toFixed(1)}`} className="mt-2.5 block w-full min-w-0 text-left">
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex shrink-0 items-center whitespace-nowrap px-2 py-[3px] text-[12px] font-black leading-none" style={{ background: P3R.ink, color: 'var(--p3r-on-ink)', clipPath: slantClip(4) }}>据点 Lv.{LEVEL.level}<span className="ml-1 opacity-85">· {name}</span></span>
          <span className="h-[8px] min-w-0 flex-1 overflow-hidden" style={{ background: 'var(--p3r-track)', clipPath: slantClip(3) }}><span className="block h-full origin-left" style={{ background: P3R.blue, transform: `scaleX(${pct})` }} /></span>
        </div>
        <div className="mt-1 text-[10.5px] font-bold" style={{ color: P3R.grey }}>同调威力 ×{LEVEL.mult.toFixed(1)} · 离 Lv.{LEVEL.level + 1} 还差 {LEVEL.next - LEVEL.xp} <span aria-hidden>{open ? '▴' : '▾'}</span></div>
      </button>
      {open && <p className="mt-1.5 px-4 py-2 text-[11px] font-bold leading-relaxed" style={{ background: 'var(--p3r-cyan-pale)', color: P3R.ink, clipPath: slantClip(8) }}>经验怎么来：周日会议上每个写了下周目标的人 +{ORG_XP_MEETING}；每个达成的目标或作战，每个参与者 +{ORG_XP_OP_SMALL}（作战 +{ORG_XP_OP_BIG}），每周最多算 {ORG_XP_OPS_PER_WEEK} 个；满月团战击退暗影，每个出过手的人 +{RAID_XP_PER_HITTER}。等级越高，队友同调走的面具在战场上越强（Lv.6 ×1.5），地图上的据点也会一点点长起来。</p>}
    </div>
  );
}

function InvitePanel({ view, open, onToggle, onFlash, onShare }: { view: OrgView; open: boolean; onToggle: () => void; onFlash: (s: string) => void; onShare: () => void }) {
  const full = view.members.length >= 7;
  const code = view.org.inviteCode;
  return (
    <div className="overflow-hidden" style={panel(14)}>
      <button type="button" onClick={onToggle} aria-expanded={open} aria-controls="org-invite-body" className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left">
        <span className="font-cond text-[13px] tracking-[0.2em]" style={{ color: P3R.ink }}>INVITE · 邀请码</span>
        <span className="flex shrink-0 items-center gap-1 text-[12px] font-black" style={{ color: P3R.roseInk }}>{open ? '收起' : full ? '已满 7 人' : '展开'}<span aria-hidden className={open ? 'inline-block rotate-180' : 'inline-block'}>▾</span></span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div id="org-invite-body" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
            <div className="flex items-center justify-between gap-3 px-5 pb-4 pt-3" style={{ borderTop: '1.5px dashed var(--p3r-track)' }}>
              <div className="min-w-0">
                <div className="whitespace-nowrap font-cond text-[clamp(24px,7vw,32px)] tracking-[0.18em]" style={{ color: P3R.blue }}>{code.slice(0, 4)} {code.slice(4)}</div>
                <div className="mt-0.5 text-[10.5px] font-bold" style={{ color: P3R.grey }}>{full ? '已经满 7 人了' : '羁绊页点标题切到「组织」输入'}</div>
              </div>
              <div className="flex shrink-0 flex-col gap-2">
                <P3Button size="sm" onClick={onShare}>分享</P3Button>
                <P3Button size="sm" tone="soft" onClick={() => { void navigator.clipboard?.writeText?.(code).catch(() => {}); onFlash('邀请码已复制'); }}>复制</P3Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
