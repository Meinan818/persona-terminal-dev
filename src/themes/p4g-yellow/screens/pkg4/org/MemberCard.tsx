/**
 * 真实：src/components/org/MemberCard.tsx（MemberTile / MemberCardFront / MemberCardBack）
 * P4G：名册行 = S.Link 行（方框牌 + 橙「No.01」+ 橙签牌名 + 代号 + 本周出勤分段条）；
 *      成员牌正面 = 代表牌大图 + 名牌；背面 = 黑黄 Status 面（五维 / 面具 / 称号）
 */
import { useState } from 'react';
import type { OrgMember, OrgView } from '@/types';
import { cx } from '@yellow/lib/cx';
import { tarotImg } from '@yellow/adapters/pkg4-tarot';
import { TITLE_BOOK } from '@yellow/adapters/pkg4-org';
import { HonorChip, LeaderChip, MeChip, MemberThumb, WeekDots, memberFacts, seatNo } from './common';

const TYPE_LABEL: Record<string, string> = { damage: '伤害', crit: '暴击', buff: '增伤', debuff: '易伤', charge: '蓄力', heal: '回复', attack_boost: '攻击增益' };
const ymd = (d: Date) => `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`;

export function MemberTile({ view, member, blocked, onOpen, onMore, selected }: { view: OrgView; member: OrgMember; blocked: boolean; onOpen: () => void; onMore: () => void; selected?: boolean }) {
  const f = memberFacts(view, member);
  return (
    <div className={cx('group relative min-w-0 border-3 border-p4g-line shadow-hard-sm', selected ? 'bg-p4g-select text-[color:var(--p4g-select-ink)]' : 'text-p4g-ink')} style={selected ? undefined : { background: 'var(--p4g-surface-grad)' }}>
      <button type="button" onClick={onOpen} aria-label={`${seatNo(member.seat)} 号 ${f.codename}`} className={cx('flex w-full min-w-0 items-stretch gap-2.5 py-2 pl-2 pr-9 text-left', blocked && 'opacity-55')}>
        <span className={cx('flex shrink-0 items-center justify-center rounded-sm border-3 p-[3px]', selected ? 'border-[color:var(--p4g-select-ink)]' : 'border-p4g-orange')}>
          <MemberThumb m={member} width={34} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col justify-center gap-1">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className={cx('shrink-0 font-display text-lead font-bold italic leading-none', selected ? '' : 'text-p4g-tag night:text-p4g-orange')}>No.{seatNo(member.seat)}</span>
            <span className={cx('min-w-0 truncate rounded-xs px-1.5 py-[1px] font-display text-2xs font-bold', selected ? 'bg-[color:var(--p4g-select-ink)] text-p4g-select' : 'bg-p4g-tag text-[color:var(--p4g-tag-ink)]')}>{f.card ? `${f.card.roman ?? ''} ${f.card.name}`.trim() : '还没选代表牌'}</span>
          </span>
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="min-w-0 truncate font-display text-lead font-bold">{f.codename}</span>
            {f.mine && <MeChip />}
            {f.leader && <span aria-label="队长" className="shrink-0 text-meta leading-none">👑</span>}
            {blocked && <span className="shrink-0 font-display text-2xs font-bold opacity-75">已屏蔽</span>}
          </span>
          <WeekDots days={f.weekDays} inverted={selected} />
          <span className="flex min-w-0 flex-wrap items-center gap-1">
            <span className="shrink-0 font-display text-2xs font-bold"><span className="p4g-num text-meta">{f.streak}</span> 天连续</span>
            {f.titles.map((t) => <HonorChip key={t}>{t}</HonorChip>)}
            {f.absent && <HonorChip muted>本周缺席</HonorChip>}
          </span>
          {f.goal && <span className="truncate text-2xs font-bold opacity-80">{f.goal.label}：「{f.goal.text}」</span>}
        </span>
      </button>
      <button type="button" onClick={(e) => { e.stopPropagation(); onMore(); }} aria-label={`${f.codename} 的更多操作`} className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center font-display text-h3 font-bold leading-none opacity-80">⋯</button>
    </div>
  );
}

export function MemberCardFront({ view, member, width, avatar }: { view: OrgView; member: OrgMember; width: number; avatar?: boolean }) {
  const f = memberFacts(view, member);
  const h = Math.round(width * 1.6);
  return (
    <div className="relative overflow-hidden rounded-[8px] border-[4px] border-p4g-black bg-p4g-black shadow-[6px_6px_0_var(--p4g-orange)]" style={{ width, height: h }}>
      {member.tarotId && !avatar ? <img src={tarotImg(member.tarotId)} alt="" draggable={false} className="absolute inset-0 h-full w-full object-cover" />
        : avatar ? <div className="absolute inset-0 flex items-center justify-center bg-p4g-yellow font-display font-bold text-p4g-black" style={{ fontSize: width * 0.4 }}>{f.codename.slice(0, 1)}</div>
          : <div className="absolute inset-0 flex items-center justify-center bg-p4g-yellow-pale text-center font-display text-body font-bold text-p4g-black/70">还没选代表牌</div>}
      <div className="absolute left-2 top-2 flex items-center gap-1">
        <span className="rounded-xs bg-p4g-black px-1.5 py-0.5 p4g-num text-meta text-p4g-yellow">No.{seatNo(member.seat)}</span>
        {f.leader && <span aria-label="队长" className="text-body">👑</span>}
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-p4g-black/85 px-2.5 pb-2 pt-1.5">
        <div className="flex min-w-0 items-center gap-1.5"><span className="min-w-0 truncate font-display text-h3 font-bold text-white">{f.codename}</span>{f.mine && <MeChip />}</div>
        <div className="truncate text-2xs font-bold text-p4g-yellow">{f.status ? `${f.status.emoji} ${f.status.label}` : f.card ? `${f.card.roman ?? ''} ${f.card.name}`.trim() : '还没选代表牌'}</div>
        <div className="mt-1 flex items-center gap-1.5">
          <span className="p4g-num text-h2 leading-none text-white">{f.streak}</span><span className="whitespace-nowrap text-2xs font-bold text-white/70">连续天数</span>
          <span className="ml-auto flex min-w-0 gap-1 overflow-hidden">{f.titles.map((t) => <HonorChip key={t}>{t}</HonorChip>)}{f.absent && <span className="rounded-xs border border-white/50 px-1 text-2xs font-bold text-white/75">本周缺席</span>}</span>
        </div>
      </div>
    </div>
  );
}

export function MemberCardBack({ view, member, width }: { view: OrgView; member: OrgMember; width: number }) {
  const f = memberFacts(view, member);
  const [tab, setTab] = useState<'stats' | 'masks' | 'titles'>('stats');
  const h = Math.round(width * 1.6);
  const total = (f.attrs ?? []).reduce((s, a) => s + (a.points ?? 0), 0);
  const heading = (t: string, en: string) => <div className="flex items-baseline gap-2"><span className="font-display text-body font-bold text-p4g-yellow">{t}</span><span className="font-display text-2xs font-bold italic tracking-[0.2em] text-white/50">{en}</span></div>;
  return (
    <div className="relative flex flex-col overflow-hidden rounded-[8px] border-[4px] border-p4g-yellow bg-[#151208] p-3 text-white shadow-[6px_6px_0_var(--p4g-orange)]" style={{ width, height: h }}>
      <div aria-hidden className="absolute inset-x-0 top-0 h-1.5 p4g-candy-h" />
      <div className="mt-1 flex items-center gap-1.5"><span className="truncate font-display text-lead font-bold">{f.codename}</span>{f.leader && <LeaderChip />}<span className="ml-auto p4g-num text-meta text-p4g-yellow">LV {f.lv ?? '—'}</span></div>
      <div role="tablist" aria-label="成员牌背面" className="mt-2 flex shrink-0 gap-1.5" onClick={(e) => e.stopPropagation()}>
        {([['stats', '五维'], ['masks', '面具'], ['titles', '称号']] as const).map(([id, l]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={cx('-skew-x-12 px-2.5 py-1', tab === id ? 'bg-p4g-yellow text-p4g-black' : 'bg-white/10 text-white')}><span className="block skew-x-12 font-display text-meta font-bold">{l}</span></button>
        ))}
      </div>
      <div className="mt-2 min-h-0 flex-1 overflow-y-auto pr-0.5" onClick={(e) => e.stopPropagation()}>
        {tab === 'stats' && (f.attrs ? (
          <div>
            <div className="flex items-end gap-2"><span className="p4g-num text-[clamp(28px,8vw,40px)] leading-none text-p4g-orange">{total}</span><span className="pb-1 font-display text-2xs font-bold tracking-[0.2em] text-white/60">总点数</span></div>
            <ul className="mt-2 space-y-1.5">
              {f.attrs.map((a) => (
                <li key={a.id} className="flex items-center gap-2">
                  <span className="w-10 shrink-0 truncate font-display text-meta font-bold">{a.name}</span>
                  <span className="w-9 shrink-0 font-display text-2xs font-bold text-p4g-yellow">Lv.{a.level}</span>
                  <span className="h-[8px] min-w-0 flex-1 overflow-hidden rounded-[2px] bg-black"><span className="block h-full origin-left bg-p4g-hp" style={{ transform: `scaleX(${a.level / (a.max ?? 6)})` }} /></span>
                </li>
              ))}
            </ul>
          </div>
        ) : <div className="text-meta font-bold leading-relaxed text-white/70">{f.mine ? '五维会在下次同步时推上来。' : 'Ta 的 App 还没更新，五维要等 Ta 更新后才看得到。'}</div>)}
        {tab === 'masks' && (
          <div>
            {heading('展示的面具', 'PERSONA')}
            {f.personas.length ? f.personas.map((p) => (
              <div key={p.name} className="mt-2 rounded-sm border-thin border-white/25 p-2">
                <div className="flex items-center gap-2"><span className="truncate font-display text-body font-bold">{p.name}</span><span className="ml-auto shrink-0 font-display text-2xs font-bold text-p4g-yellow">Lv.{p.level}</span></div>
                <ul className="mt-1 space-y-0.5">
                  {p.skills.map((s) => <li key={s.name} className="flex gap-2 text-2xs font-bold"><span className="truncate">{s.name}</span><span className="ml-auto shrink-0 text-white/60">{TYPE_LABEL[s.type]}{s.power ? ` · ${s.power}` : ''}</span></li>)}
                  {!p.skills.length && <li className="text-meta font-bold text-white/60">还没有解锁的技能</li>}
                </ul>
              </div>
            )) : <div className="mt-2 text-meta font-bold leading-relaxed text-white/70">{f.mine ? '还没展示面具。在据点设置里可以打开。' : 'Ta 没有展示面具。'}</div>}
          </div>
        )}
        {tab === 'titles' && (
          <div>
            {heading('称号册', 'TITLES')}
            {f.titles.length || f.mine ? (
              <ul className="mt-2 space-y-1.5">
                {TITLE_BOOK.map((t) => (
                  <li key={t.name}>
                    <div className="flex items-center gap-2"><HonorChip>{t.name}</HonorChip><span className="p4g-num text-meta text-p4g-orange">×{t.count}</span></div>
                    <div className="mt-0.5 text-2xs font-bold text-white/60">最近：{Number(t.last.slice(5, 7))}月{Number(t.last.slice(8, 10))}日那周{t.bestWeeks > 1 ? ` · 最长连续 ${t.bestWeeks} 周` : ''}</div>
                  </li>
                ))}
              </ul>
            ) : <div className="mt-2 text-meta font-bold leading-relaxed text-white/70">还没拿过称号。每周一的会议纪要里发，挂一周，这里记着拿过几次。</div>}
          </div>
        )}
      </div>
      <div className="mt-2 shrink-0 rounded-sm bg-white/10 p-2">
        {heading(f.goal?.label ?? '本周目标', 'GOAL')}
        <div className="mt-0.5 p4g-clamp-2 text-meta font-bold">{f.goal ? `「${f.goal.text}」` : <span className="text-white/60">{f.mine ? '周日会议上写一句下周目标，会出现在这里' : 'Ta 这周还没写目标'}</span>}</div>
      </div>
      <div className="mt-1.5 shrink-0 text-2xs font-bold text-white/55">加入于 {ymd(member.createdAt)}</div>
    </div>
  );
}
