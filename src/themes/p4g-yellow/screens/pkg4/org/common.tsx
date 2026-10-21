/** 工作包 4 · 组织共用件（真实 orgUi.tsx / MemberCard.tsx 的 P4G 皮） */
import type { ReactNode } from 'react';
import type { OrgMember, OrgView } from '@/types';
import { cx } from '@yellow/lib/cx';
import { TAROT_BY_ID, tarotImg } from '@yellow/adapters/pkg4-tarot';
import { STATUS_PRESET, TITLE_BOOK } from '@yellow/adapters/pkg4-org';

export const seatNo = (n: number) => String(n).padStart(2, '0');
export const displayCodename = (m: OrgMember) => m.codename || '无名';
export const WEEK_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

export function memberFacts(view: OrgView, m: OrgMember) {
  const card = m.tarotId ? TAROT_BY_ID[m.tarotId] : undefined;
  const st = m.card.status ? STATUS_PRESET[m.card.status.id] : undefined;
  return {
    codename: displayCodename(m), card, mine: m.userId === view.me.userId, leader: m.userId === view.org.leaderId,
    streak: m.card.streak, status: st, personas: m.card.personas ?? [], lv: m.card.lv, attrs: m.card.attrs,
    weekDays: m.card.week?.days ?? 0, goal: m.goal ? { label: '本周目标', text: m.goal } : null,
    titles: m.userId === 'u3' ? ['全勤'] : m.userId === 'u1' ? ['言出必行'] : m.userId === 'u2' ? ['月下同行'] : [],
    absent: m.userId === 'u4',
  };
}

export function LeaderChip() { return <span className="shrink-0 rounded-xs bg-p4g-black px-1.5 py-[1px] font-display text-2xs font-bold text-p4g-yellow night:bg-p4g-yellow night:text-p4g-black">队长</span>; }
export function MeChip() { return <span className="shrink-0 rounded-xs bg-p4g-orange px-1 py-[1px] font-display text-2xs font-bold text-p4g-black">我</span>; }

/** 本周出勤 7 格（S.Link 分段条的语法） */
export function WeekDots({ days, inverted }: { days: number; inverted?: boolean }) {
  const n = WEEK_LABELS.filter((_, i) => days & (1 << i)).length;
  return (
    <span className={cx('flex h-[14px] w-full min-w-0 items-center gap-[3px] rounded-[2px] px-[4px]', inverted ? 'bg-[color:var(--p4g-select-ink)]' : 'bg-p4g-orange')} aria-label={`本周出勤 ${n} 天`} role="img">
      {WEEK_LABELS.map((_, i) => <span key={i} className={cx('h-[6px] flex-1 rounded-[1px]', days & (1 << i) ? (inverted ? 'bg-p4g-select' : 'bg-white') : (inverted ? 'bg-p4g-select/25' : 'bg-p4g-orange-deep/60'))} />)}
    </span>
  );
}

/** 代表牌 / 头像缩略（没选 = 待选代表牌） */
export function MemberThumb({ m, width = 44, avatar, className }: { m: OrgMember; width?: number; avatar?: boolean; className?: string }) {
  const h = Math.round(width * 1.6);
  return (
    <span className={cx('relative block shrink-0 overflow-hidden rounded-[4px] border-3 border-p4g-black bg-p4g-yellow-pale night:border-p4g-yellow', className)} style={{ width, height: h }}>
      {avatar ? (
        <span className="flex h-full w-full items-center justify-center bg-p4g-yellow font-display font-bold text-p4g-black" style={{ fontSize: width * 0.5 }}>{m.codename.slice(0, 1)}</span>
      ) : m.tarotId ? (
        <img src={tarotImg(m.tarotId)} alt="" draggable={false} className="h-full w-full object-cover" />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center p-0.5 text-center font-display text-[9px] font-bold leading-tight text-p4g-black/70">待选<br />代表牌</span>
      )}
    </span>
  );
}

export function HonorChip({ children, muted }: { children: ReactNode; muted?: boolean }) {
  return <span className={cx('inline-flex shrink-0 items-center whitespace-nowrap rounded-xs px-1.5 py-[2px] font-display text-2xs font-bold leading-none', muted ? 'border-thin border-dashed border-p4g-line text-p4g-ink-soft' : 'bg-p4g-black text-p4g-yellow night:bg-p4g-yellow night:text-p4g-black')}>{children}</span>;
}

export { TITLE_BOOK };
