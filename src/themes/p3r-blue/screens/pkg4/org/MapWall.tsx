/**
 * 真实：src/components/org/HideoutMap.tsx（p3 = 校园地图：水面网格 + 教学楼块 + 白色道路 + 泳池；随等级长树 / 跑道 / 钟楼 / 楼顶旗）
 *      src/components/org/RosterWall.tsx（名册牌墙 Coverflow）+ MemberCard.tsx（MemberTile / 正面 / 背面）
 * 蓝白：底图用 --p3r-cyan-faint / -pale（= 浅青面）、--p3r-blue（= P3R 蓝）同名变量 → 自动粉化；地标 = 斜切白签（选中蓝 + 臂章红角）。
 */
import { motion } from 'framer-motion';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { OrgMember, OrgView } from '@real/types';
import { P3R, P3Button, slantClip, chamferClip } from '@blue/kit';
import { useLowMotion } from '@blue/lib/prefs';
import { useViewportWidth } from '@blue/lib/layout';
import { cx } from '@blue/lib/cx';
import { ORG_EMBLEMS, TITLE_BOOK } from '@blue/mock/pkg4-org';
import { Arcana } from '../tarot';
import { Coverflow, HonorChip, LeaderChip, MeChip, MemberThumb, WeekDots, memberFacts, seatNo, panel } from './common';

export type HideoutSection = 'roster' | 'board' | 'meeting' | 'ops';
export const SECTION_TITLE: Record<HideoutSection, { t: string; en: string }> = { roster: { t: '名册', en: 'MEMBERS' }, board: { t: '公告板', en: 'BOARD' }, meeting: { t: '会议', en: 'MEETING' }, ops: { t: '作战', en: 'OPERATIONS' } };

const W = 360, H = 220, HQ = { x: 180, y: 110 }, MOON = { x: 180, y: 26 };
const SEATS = Array.from({ length: 7 }, (_, i) => { const a = ((-90 + (i * 360) / 7) * Math.PI) / 180; return { x: HQ.x + 70 * Math.cos(a), y: HQ.y + 42 * Math.sin(a) }; });
const LANDMARKS: Array<{ id: HideoutSection; label: string; en: string; x: number; y: number }> = [
  { id: 'roster', label: '名册', en: 'MEMBERS', x: 62, y: 46 }, { id: 'board', label: '公告板', en: 'BOARD', x: 298, y: 46 },
  { id: 'meeting', label: '会议', en: 'MEETING', x: 62, y: 176 }, { id: 'ops', label: '作战', en: 'OPS', x: 298, y: 176 },
];
const ROADS = [`M${HQ.x} ${HQ.y} L118 78 L62 46`, `M${HQ.x} ${HQ.y} L242 78 L298 46`, `M${HQ.x} ${HQ.y} L118 146 L62 176`, `M${HQ.x} ${HQ.y} L242 146 L298 176`];
const pct = (x: number, y: number): CSSProperties => ({ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%` });
const Dot = () => <span aria-hidden className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full" style={{ background: P3R.magenta, boxShadow: '0 0 0 2px var(--p3r-panel)' }} />;

export interface MapRaid { boss: string; left: number; defeated: boolean; dot: boolean }

export function HideoutMap({ view, section, onSection, dots, blocked, level = 3, onSeat, raid, onRaid }: {
  view: OrgView; section: HideoutSection; onSection: (s: HideoutSection) => void; dots?: Partial<Record<HideoutSection, boolean>>; blocked?: Set<string>; level?: number; onSeat?: (m: OrgMember) => void; raid?: MapRaid | null; onRaid?: () => void;
}) {
  const low = useLowMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const measure = () => setScale(Math.max(0.72, Math.min(1.15, el.clientWidth / W)));
    measure();
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    ro?.observe(el); return () => ro?.disconnect();
  }, []);
  const at = (x: number, y: number, rot = ''): CSSProperties => ({ ...pct(x, y), transform: `translate(-50%, -50%) scale(${scale.toFixed(3)})${rot}` });
  const lv = Math.max(1, Math.min(6, level));
  const emb = ORG_EMBLEMS.find((e) => e.id === view.org.emblem);
  return (
    <div ref={ref} className="relative w-full select-none overflow-hidden" style={{ aspectRatio: `${W} / ${H}`, clipPath: slantClip(16), boxShadow: 'var(--p3r-shadow)' }}>
      <svg aria-hidden viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" data-level={lv}>
        <defs><pattern id="pk4-org-grid" width="12" height="12" patternUnits="userSpaceOnUse"><path d="M12 0H0V12" fill="none" style={{ stroke: 'var(--p3r-blue)' }} strokeOpacity="0.07" strokeWidth="1" /></pattern></defs>
        <rect width={W} height={H} style={{ fill: 'var(--p3r-cyan-faint)' }} />
        <rect width={W} height={H} fill="url(#pk4-org-grid)" />
        {[[14, 96, 72, 40], [276, 94, 70, 44], [100, 10, 48, 26], [214, 12, 50, 24], [26, 160, 60, 36], [262, 150, 70, 40], [118, 170, 30, 30], [214, 172, 34, 28]].map(([x, y, w, h], i) => <rect key={`b${i}`} x={x} y={y} width={w} height={h} rx="3" style={{ fill: 'var(--p3r-cyan-pale)' }} />)}
        <ellipse cx="316" cy="206" rx="34" ry="12" style={{ fill: 'var(--p3r-cyan)' }} fillOpacity="0.22" />
        {ROADS.map((d, i) => (
          <g key={`r${i}`}>
            <path d={d} fill="none" style={{ stroke: 'var(--p3r-panel)' }} strokeWidth="11" strokeLinejoin="round" strokeLinecap="round" />
            <path d={d} fill="none" style={{ stroke: 'var(--p3r-blue)' }} strokeOpacity="0.28" strokeWidth="1.4" strokeDasharray="4 5" strokeLinecap="round" />
          </g>
        ))}
        <text x="10" y="212" fontSize="30" fontStyle="italic" fontWeight="900" style={{ fill: 'var(--p3r-blue)' }} fillOpacity="0.07" fontFamily="Arial, sans-serif">CAMPUS</text>
        {lv >= 2 && [[338, 64], [348, 77], [338, 90], [126, 208], [234, 208]].map(([x, y], i) => <g key={`t${i}`}><circle cx={x} cy={y} r="5" style={{ fill: 'var(--p3r-cyan)' }} fillOpacity="0.5" /><circle cx={x} cy={y} r="1.6" style={{ fill: 'var(--p3r-blue)' }} fillOpacity="0.5" /></g>)}
        {lv >= 3 && (
          <g>
            <ellipse cx="180" cy="206" rx="28" ry="10" style={{ fill: 'var(--p3r-magenta)' }} fillOpacity="0.2" />
            <ellipse cx="180" cy="206" rx="19" ry="5.5" style={{ fill: 'var(--p3r-cyan-pale)' }} />
            <ellipse cx="180" cy="206" rx="23.5" ry="7.8" fill="none" style={{ stroke: 'var(--p3r-panel)' }} strokeOpacity="0.9" strokeWidth="0.8" />
          </g>
        )}
        {lv >= 4 && <g><path d="M18 98V74L25 66L32 74V98Z" style={{ fill: 'var(--p3r-panel)', stroke: 'var(--p3r-blue)' }} strokeOpacity="0.55" strokeWidth="1.2" /><circle cx="25" cy="78" r="4.2" style={{ fill: 'var(--p3r-cyan-faint)', stroke: 'var(--p3r-blue)' }} strokeWidth="1.2" /></g>}
        {lv >= 5 && [[146, 10], [216, 12]].map(([x, y], i) => <g key={`f${i}`}><path d={`M${x} ${y}V${y - 9}`} style={{ stroke: 'var(--p3r-blue)' }} strokeOpacity="0.6" strokeWidth="1.2" /><path d={`M${x} ${y - 9}L${x + 9} ${y - 6.5}L${x} ${y - 4}Z`} style={{ fill: 'var(--p3r-magenta)' }} fillOpacity="0.85" /></g>)}
      </svg>

      {raid && (
        <span aria-hidden className="pointer-events-none absolute" style={at(MOON.x, MOON.y)}>
          <span className="relative block h-[26px] w-[26px]">
            {!low && <motion.span className="absolute inset-0 rounded-full" style={{ border: '2px solid var(--p3r-cyan)' }} animate={{ scale: [1, 1.9], opacity: [0.8, 0] }} transition={{ repeat: Infinity, duration: 2.4, ease: 'easeOut' }} />}
            <span className="absolute inset-0 rounded-full" style={{ background: 'radial-gradient(circle at 38% 35%, #ffffff, #f1f9ff 60%, #cfdbf7)' }}>
              <span className="absolute h-[6px] w-[6px] rounded-full" style={{ left: 6, top: 8, background: 'rgba(0,0,0,0.09)' }} />
            </span>
          </span>
        </span>
      )}
      {/* 中心：组织徽记 + 脉冲方框（p3 旋转 45°）；团战三晚换首领标记 + 血条 */}
      <span aria-hidden className="pointer-events-none absolute h-14 w-14" style={at(HQ.x, HQ.y, ' rotate(45deg)')}>
        {!low && <motion.span className="absolute inset-0" style={{ border: `2px solid ${raid ? 'var(--p3r-cyan)' : P3R.blue}` }} animate={{ scale: [0.9, 1.35], opacity: [0.7, 0] }} transition={{ repeat: Infinity, duration: 2.2, ease: 'easeOut' }} />}
      </span>
      {raid ? (
        <button type="button" onClick={onRaid} aria-label={`满月团战：「${raid.boss}」${raid.defeated ? '已击退' : `还剩 ${Math.round(raid.left * 100)}%`}${raid.dot ? '，今晚你还没出手' : ''}。点了打开团战面板`} className="absolute z-[2]" style={at(HQ.x, HQ.y)}>
          <span className="relative flex flex-col items-center">
            <span className="relative block">
              <span className="relative flex h-11 w-11 items-center justify-center text-[22px]" style={{ background: '#0d162a', color: '#fff', clipPath: slantClip(8) }}>☾</span>
              {raid.defeated && <span className="absolute left-1/2 top-1/2 whitespace-nowrap px-1.5 py-[1px] text-[10px] font-black" style={{ transform: 'translate(-50%,-50%) rotate(-12deg)', background: P3R.magenta, color: '#fff' }}>击退</span>}
              {raid.dot && !raid.defeated && <Dot />}
            </span>
            {!raid.defeated && <span className="mt-1 block h-[5px] w-[54px] overflow-hidden" style={{ background: 'rgba(0,0,0,0.3)' }}><span className="block h-full" style={{ width: `${Math.max(3, Math.round(raid.left * 100))}%`, background: P3R.magenta }} /></span>}
          </span>
        </button>
      ) : (
        <span className="absolute flex h-11 w-11 items-center justify-center text-[22px] font-black" style={{ ...at(HQ.x, HQ.y), background: P3R.blue, color: P3R.onBlue, clipPath: chamferClip(8, 8) }} aria-hidden>{emb?.glyph}</span>
      )}
      {view.members.map((m) => {
        const p = SEATS[(m.seat - 1 + 7) % 7];
        const f = memberFacts(view, m);
        return (
          <button key={m.id} type="button" onClick={() => onSeat?.(m)} aria-label={`${seatNo(m.seat)} 号 ${f.codename}${f.mine ? '（我）' : ''}${f.leader ? '（队长）' : ''}：打开成员牌`} className="absolute" style={{ ...at(p.x, p.y), opacity: blocked?.has(m.userId) ? 0.4 : 1 }}>
            <span className="relative flex h-7 min-w-[28px] items-center justify-center px-1.5 text-[11px] font-black text-white" style={{ background: f.mine ? P3R.magenta : P3R.blueDeep, clipPath: slantClip(5) }}>{[...f.codename][0] ?? '?'}</span>
          </button>
        );
      })}
      <div role="tablist" aria-label="据点分区" className="pointer-events-none absolute inset-0">
        {LANDMARKS.map((l) => {
          const on = l.id === section;
          return (
            <button key={l.id} type="button" role="tab" aria-selected={on} onClick={() => onSection(l.id)} className="pointer-events-auto absolute whitespace-nowrap" style={at(l.x, l.y)}>
              <motion.span className="relative block" animate={on && !low ? { y: [0, -3, 0] } : { y: 0 }} transition={on && !low ? { repeat: Infinity, duration: 2.4, ease: 'easeInOut' } : { duration: 0.2 }}>
                <span className="relative flex flex-col items-center px-3 py-1" style={{ background: on ? P3R.blue : P3R.panel, color: on ? P3R.onBlue : P3R.blueDeep, clipPath: slantClip(8) }}>
                  <span className="text-[13px] font-black leading-none">{l.label}</span>
                  <span className="mt-0.5 font-cond text-[8px] tracking-[0.18em] opacity-80">{l.en}</span>
                  {on && <span aria-hidden className="absolute bottom-0 right-2 h-[5px] w-[12px]" style={{ background: P3R.magenta, clipPath: 'polygon(30% 0, 100% 0, 70% 100%, 0 100%)' }} />}
                </span>
                {dots?.[l.id] && <Dot />}
              </motion.span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ───────────── 名册行 ───────────── */
export function MemberTile({ view, member, blocked, onOpen, onMore }: { view: OrgView; member: OrgMember; blocked: boolean; onOpen: () => void; onMore: () => void }) {
  const f = memberFacts(view, member);
  return (
    <div className="relative min-w-0">
      <span aria-hidden className="absolute inset-0" style={{ background: 'var(--p3r-row)', clipPath: slantClip(12) }} />
      <span aria-hidden className="absolute bottom-0 left-0 top-0 w-[9px]" style={{ background: f.mine ? P3R.magenta : P3R.blue, clipPath: 'polygon(0 0, 100% 0, 30% 100%, 0 100%)' }} />
      <button type="button" onClick={onOpen} aria-label={`${seatNo(member.seat)} 号 ${f.codename}`} className={cx('relative flex w-full min-w-0 items-stretch gap-3 py-2.5 pl-5 pr-10 text-left', blocked && 'opacity-55')}>
        <MemberThumb m={member} width={36} />
        <span className="flex min-w-0 flex-1 flex-col justify-center gap-1">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="shrink-0 font-cond text-[15px] leading-none" style={{ color: P3R.blue }}>No.{seatNo(member.seat)}</span>
            <span className="min-w-0 truncate text-[11px] font-bold" style={{ color: P3R.grey }}>{f.card ? `${f.card.roman ?? ''} ${f.card.name}`.trim() : '还没选代表牌'}</span>
          </span>
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="min-w-0 truncate text-[15px] font-black" style={{ color: P3R.ink }}>{f.codename}</span>
            {f.mine && <MeChip />}{f.leader && <LeaderChip />}
            {blocked && <span className="shrink-0 text-[10px] font-black" style={{ color: P3R.grey }}>已屏蔽</span>}
          </span>
          <WeekDots days={f.weekDays} />
          <span className="flex min-w-0 flex-wrap items-center gap-1">
            <span className="shrink-0 text-[11px] font-bold" style={{ color: P3R.inkSoft }}><span className="font-cond text-[14px]" style={{ color: P3R.blue }}>{f.streak}</span> 天连续</span>
            {f.titles.map((t) => <HonorChip key={t}>{t}</HonorChip>)}
            {f.absent && <HonorChip muted>本周缺席</HonorChip>}
          </span>
          {f.goal && <span className="truncate text-[11px] font-bold" style={{ color: P3R.grey }}>{f.goal.label}：「{f.goal.text}」</span>}
        </span>
      </button>
      <button type="button" onClick={onMore} aria-label={`${f.codename} 的更多操作`} className="absolute right-1 top-1 flex h-9 w-9 items-center justify-center text-[18px] font-black" style={{ color: P3R.grey }}>⋯</button>
    </div>
  );
}

/* ───────────── 成员牌：正面 / 背面 ───────────── */
const TYPE_LABEL: Record<string, string> = { damage: '伤害', crit: '暴击', buff: '增伤', debuff: '易伤', charge: '蓄力', heal: '回复', attack_boost: '攻击增益' };
const ymd = (d: Date) => `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`;

export function MemberCardFront({ view, member, width, avatar }: { view: OrgView; member: OrgMember; width: number; avatar?: boolean }) {
  const f = memberFacts(view, member);
  const h = Math.round(width * 1.6);
  return (
    <div className="relative" style={{ width, height: h }}>
      <span className="absolute inset-0" style={{ background: P3R.blue, clipPath: chamferClip(14, 18) }} />
      <div className="absolute inset-[3px] overflow-hidden" style={{ clipPath: chamferClip(12, 16), background: 'var(--bk-holo)' }}>
        {member.tarotId && !avatar ? (
          <div className="absolute inset-x-0 top-0 flex justify-center pt-3"><Arcana id={member.tarotId} width={Math.round(width * 0.62)} tag={false} /></div>
        ) : (
          <div className="absolute inset-x-0 top-[12%] flex justify-center"><MemberThumb m={member} width={Math.round(width * 0.56)} avatar={avatar} /></div>
        )}
        <div className="absolute left-2 top-2 flex items-center gap-1">
          <span className="px-1.5 py-0.5 font-cond text-[13px]" style={{ background: P3R.ink, color: 'var(--p3r-on-ink)', clipPath: slantClip(4) }}>No.{seatNo(member.seat)}</span>
          {f.leader && <span aria-label="队长" className="text-[13px] font-black" style={{ color: P3R.blueDeep }}>♛</span>}
        </div>
        <div className="absolute inset-x-0 bottom-0 px-2.5 pb-2 pt-1.5" style={{ background: 'color-mix(in srgb, var(--p3r-mulberry) 88%, transparent)' }}>
          <div className="flex min-w-0 items-center gap-1.5"><span className="min-w-0 truncate font-heavy text-[17px]" style={{ color: '#fff' }}>{f.codename}</span>{f.mine && <MeChip />}</div>
          <div className="truncate text-[10.5px] font-bold" style={{ color: '#c4d6ff' }}>{f.status ? `${f.status.emoji} ${f.status.label}` : f.card ? `${f.card.roman ?? ''} ${f.card.name}`.trim() : '还没选代表牌'}</div>
          <div className="mt-1 flex items-center gap-1.5">
            <span className="font-cond text-[24px] leading-none" style={{ color: '#fff' }}>{f.streak}</span><span className="whitespace-nowrap text-[10px] font-bold" style={{ color: 'rgba(255,255,255,0.7)' }}>连续天数</span>
            <span className="ml-auto flex min-w-0 gap-1 overflow-hidden">{f.titles.map((t) => <HonorChip key={t}>{t}</HonorChip>)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MemberCardBack({ view, member, width, initialTab = 'stats' }: { view: OrgView; member: OrgMember; width: number; initialTab?: 'stats' | 'masks' | 'titles' }) {
  const f = memberFacts(view, member);
  const [tab, setTab] = useState(initialTab);
  const h = Math.round(width * 1.6);
  const total = (f.attrs ?? []).reduce((s, a) => s + (a.points ?? 0), 0);
  const ink = '#eef8ff', soft = 'rgba(238,248,255,0.62)';
  const heading = (t: string, en: string) => <div className="flex items-baseline gap-2"><span className="font-heavy text-[14px]" style={{ color: '#9cbaff' }}>{t}</span><span className="font-cond text-[10px] tracking-[0.2em]" style={{ color: soft }}>{en}</span></div>;
  return (
    <div className="relative" style={{ width, height: h }}>
      <span className="absolute inset-0" style={{ background: P3R.blue, clipPath: chamferClip(14, 18) }} />
      <div className="absolute inset-[3px] flex flex-col overflow-hidden p-3" style={{ clipPath: chamferClip(12, 16), background: '#0d162a', color: ink }}>
        <div className="mt-1 flex min-w-0 items-center gap-1.5"><span className="min-w-0 truncate font-heavy text-[16px]">{f.codename}</span>{f.leader && <span className="shrink-0 text-[11px] font-black" style={{ color: '#9cbaff' }}>♛</span>}<span className="ml-auto shrink-0 font-cond text-[13px]" style={{ color: '#9cbaff' }}>LV {f.lv ?? '—'}</span></div>
        <div role="tablist" aria-label="成员牌背面" className="mt-2 flex shrink-0 gap-1" onClick={(e) => e.stopPropagation()}>
          {([['stats', '五维'], ['masks', '面具'], ['titles', '称号']] as const).map(([id, l]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className="px-2.5 py-1 text-[12px] font-black" style={{ clipPath: slantClip(5), background: tab === id ? '#6f9aff' : 'rgba(255,255,255,0.1)', color: tab === id ? '#0d162a' : ink }}>{l}</button>
          ))}
        </div>
        <div className="mt-2 min-h-0 flex-1 overflow-y-auto pr-0.5" onClick={(e) => e.stopPropagation()}>
          {tab === 'stats' && (f.attrs ? (
            <div>
              <div className="flex items-end gap-2"><span className="font-cond text-[clamp(28px,8vw,38px)] leading-none" style={{ color: '#6f9aff' }}>{total}</span><span className="pb-1 text-[10px] font-bold tracking-[0.2em]" style={{ color: soft }}>总点数</span></div>
              <ul className="mt-2 space-y-1.5">
                {f.attrs.map((a) => (
                  <li key={a.id} className="flex items-center gap-2">
                    <span className="w-9 shrink-0 truncate text-[12px] font-black">{a.name}</span>
                    <span className="w-8 shrink-0 font-cond text-[11px]" style={{ color: '#9cbaff' }}>Lv.{a.level}</span>
                    <span className="h-[7px] min-w-0 flex-1 overflow-hidden" style={{ background: 'rgba(255,255,255,0.12)', clipPath: slantClip(3) }}><span className="block h-full origin-left" style={{ background: '#a6edff', transform: `scaleX(${a.level / (a.max ?? 6)})` }} /></span>
                  </li>
                ))}
              </ul>
            </div>
          ) : <div className="text-[12px] font-bold leading-relaxed" style={{ color: soft }}>{f.mine ? '五维会在下次同步时推上来。' : 'Ta 的 App 还没更新，五维要等 Ta 更新后才看得到。'}</div>)}
          {tab === 'masks' && (
            <div>
              {heading('展示的面具', 'PERSONA')}
              {f.personas.length ? f.personas.map((p) => (
                <div key={p.name} className="mt-2 p-2" style={{ background: 'rgba(255,255,255,0.06)', clipPath: slantClip(6) }}>
                  <div className="flex items-center gap-2"><span className="min-w-0 truncate text-[13px] font-black">{p.name}</span><span className="ml-auto shrink-0 font-cond text-[11px]" style={{ color: '#9cbaff' }}>Lv.{p.level}</span></div>
                  <ul className="mt-1 space-y-0.5">{p.skills.map((s) => <li key={s.name} className="flex gap-2 text-[10.5px] font-bold"><span className="truncate">{s.name}</span><span className="ml-auto shrink-0" style={{ color: soft }}>{TYPE_LABEL[s.type]}{s.power ? ` · ${s.power}` : ''}</span></li>)}</ul>
                </div>
              )) : <div className="mt-2 text-[12px] font-bold leading-relaxed" style={{ color: soft }}>{f.mine ? '还没展示面具。在据点设置里可以打开。' : 'Ta 没有展示面具。'}</div>}
            </div>
          )}
          {tab === 'titles' && (
            <div>
              {heading('称号册', 'TITLES')}
              {f.titles.length || f.mine ? (
                <ul className="mt-2 space-y-1.5">
                  {TITLE_BOOK.map((t) => (
                    <li key={t.name}>
                      <div className="flex items-center gap-2"><HonorChip>{t.name}</HonorChip><span className="font-cond text-[13px]" style={{ color: '#6f9aff' }}>×{t.count}</span></div>
                      <div className="mt-0.5 text-[10.5px] font-bold" style={{ color: soft }}>最近：{Number(t.last.slice(5, 7))}月{Number(t.last.slice(8, 10))}日那周{t.bestWeeks > 1 ? ` · 最长连续 ${t.bestWeeks} 周` : ''}</div>
                    </li>
                  ))}
                </ul>
              ) : <div className="mt-2 text-[12px] font-bold leading-relaxed" style={{ color: soft }}>还没拿过称号。每周一的会议纪要里发，挂一周，这里记着拿过几次。</div>}
            </div>
          )}
        </div>
        <div className="mt-2 shrink-0 p-2" style={{ background: 'rgba(255,255,255,0.08)', clipPath: slantClip(6) }}>
          {heading(f.goal?.label ?? '本周目标', 'GOAL')}
          <div className="mt-0.5 p3r-clamp-2 text-[12px] font-bold">{f.goal ? `「${f.goal.text}」` : <span style={{ color: soft }}>{f.mine ? '周日会议上写一句下周目标，会出现在这里' : 'Ta 这周还没写目标'}</span>}</div>
        </div>
        <div className="mt-1.5 shrink-0 text-[10px] font-bold" style={{ color: soft }}>加入于 {ymd(member.createdAt)}</div>
      </div>
    </div>
  );
}

/* ───────────── 名册 · 牌墙 ───────────── */
export function RosterWall({ view, blocked, onMore, onSync, onInvite }: { view: OrgView; blocked: Set<string>; onMore: (m: OrgMember) => void; onSync: (m: OrgMember) => void; onInvite: () => void }) {
  const low = useLowMotion();
  const vw = useViewportWidth();
  const empty = Math.max(0, 7 - view.members.length);
  const items: Array<OrgMember | 'invite'> = [...view.members, ...(empty ? ['invite' as const] : [])];
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [avatar, setAvatar] = useState<Record<string, boolean>>({});
  const cw = Math.min(196, Math.max(140, Math.floor(Math.min(vw, 672) * 0.42)));
  const ch = Math.round(cw * 1.6);
  const cur = items[idx];
  const change = (i: number) => { setIdx(i); setFlipped(false); };
  return (
    <div className="space-y-2">
      <Coverflow items={items} index={idx} onIndex={change} cardW={cw} height={ch + 26} ariaLabel="名册"
        onCenterClick={() => (cur === 'invite' ? onInvite() : setFlipped((f) => !f))}
        itemLabel={(it, _i, c) => (it === 'invite' ? `还有 ${empty} 个空座位，点一下发邀请码` : `${seatNo(it.seat)} 号 ${memberFacts(view, it).codename}${c ? (flipped ? '（背面）' : '（点一下翻面）') : ''}`)}
        render={(it, _i, center) => it === 'invite' ? (
          <span className="flex flex-col items-center justify-center gap-1" style={{ height: ch, background: 'rgb(var(--p3r-wash) / 0.8)', clipPath: chamferClip(14, 18), color: P3R.ink }}>
            <span className="font-cond text-[46px] leading-none" style={{ color: P3R.blue }}>＋</span><span className="text-[13px] font-black">{empty} 个空座位</span>
          </span>
        ) : (
          <span className={cx('relative block', blocked.has(it.userId) && 'opacity-60')} style={{ height: ch, perspective: 1000 }}>
            {low || !center ? (center && flipped ? <MemberCardBack view={view} member={it} width={cw} /> : <MemberCardFront view={view} member={it} width={cw} avatar={avatar[it.id]} />) : (
              <motion.span className="absolute inset-0 block" style={{ transformStyle: 'preserve-3d' }} animate={{ rotateY: flipped ? 180 : 0 }} transition={{ duration: 0.45 }}>
                <span className="absolute inset-0 block" style={{ backfaceVisibility: 'hidden' }}><MemberCardFront view={view} member={it} width={cw} avatar={avatar[it.id]} /></span>
                <span className="absolute inset-0 block" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}><MemberCardBack view={view} member={it} width={cw} /></span>
              </motion.span>
            )}
            {blocked.has(it.userId) && <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 py-1 text-center text-[12px] font-black" style={{ background: 'color-mix(in srgb, var(--p3r-mulberry) 85%, transparent)', color: '#fff' }}>已屏蔽</span>}
          </span>
        )} />
      <div className="mx-auto flex h-7 max-w-[260px] items-center justify-center gap-[6px]" role="group" aria-label="快速跳到某个人">
        {items.map((it, i) => (
          <button key={`jd${i}`} type="button" onClick={() => change(i)} aria-label={it === 'invite' ? '空座位' : `${seatNo(it.seat)} 号 ${memberFacts(view, it).codename}`} className="h-3" style={{ width: i === idx ? 24 : 12, clipPath: slantClip(3), background: i === idx ? P3R.blue : it === 'invite' ? 'var(--p3r-track)' : 'var(--p3r-cyan)' }} />
        ))}
      </div>
      <div className="text-center text-[11px] font-bold" style={{ color: P3R.grey }}>左右切换 · 点中间那张翻面</div>
      {cur === 'invite' ? (
        <div className="px-4 py-4 text-center" style={panel(14, { background: 'rgb(var(--p3r-wash) / 0.8)', boxShadow: undefined })}>
          <div className="font-heavy text-[22px]" style={{ color: P3R.ink }}>还有 {empty} 个空座位</div>
          <div className="mt-1 text-[12px] font-bold" style={{ color: P3R.grey }}>点空白牌或下面的按钮，把邀请码发给朋友</div>
          <div className="mt-3 flex justify-center"><P3Button size="sm" onClick={onInvite}>发邀请码</P3Button></div>
        </div>
      ) : cur && (() => {
        const f = memberFacts(view, cur);
        const canSync = !f.mine && f.personas.length > 0;
        return (
          <div className="flex min-w-0 items-center gap-3 px-4 py-3" style={panel(12)}>
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-1.5"><span className="truncate font-heavy text-[17px]" style={{ color: P3R.ink }}>{f.codename}</span>{f.leader && <LeaderChip />}</div>
              <div className="truncate text-[11px] font-bold" style={{ color: P3R.grey }}>{f.card ? `${f.card.roman ?? ''} · ${f.card.name}` : '还没选代表牌'}{f.mine && ' · 我'}{blocked.has(cur.userId) && ' · 已屏蔽'}</div>
              <div className="mt-1 flex flex-wrap gap-1">{f.titles.map((t) => <HonorChip key={t}>{t}</HonorChip>)}{f.absent && <HonorChip muted>本周缺席</HonorChip>}</div>
            </div>
            <div className="shrink-0 text-center"><div className="font-cond text-[26px] leading-none" style={{ color: P3R.blue }}>{f.streak}</div><div className="mt-0.5 text-[9px] font-bold" style={{ color: P3R.grey }}>连续天数</div></div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <button type="button" onClick={() => setAvatar((a) => ({ ...a, [cur.id]: !a[cur.id] }))} aria-label={avatar[cur.id] ? '牌面换回代表牌' : '牌面换成头像'} className="px-2 py-0.5 text-[10.5px] font-black" style={{ background: 'var(--p3r-chip)', color: P3R.ink, clipPath: slantClip(4) }}>{avatar[cur.id] ? '换回代表牌' : '换成头像'}</button>
              <div className="flex gap-1.5">
                {canSync && <P3Button size="sm" onClick={() => onSync(cur)}>同调</P3Button>}
                <P3Button size="sm" tone="soft" ariaLabel={`${f.codename} 的更多操作`} onClick={() => onMore(cur)}>⋯ 更多</P3Button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
