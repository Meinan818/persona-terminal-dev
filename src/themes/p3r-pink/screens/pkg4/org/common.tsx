/** 工作包 4 · 组织共用件（真实 orgUi.tsx / MemberCard.tsx 的 p3 皮，粉白）+ 通用 Coverflow（真实 TarotCoverflow / RosterWall 手感） */
import { motion } from 'framer-motion';
import { useRef, type CSSProperties, type ReactNode } from 'react';
import type { OrgMember, OrgView } from '@/types';
import { P3R, slantClip, chamferClip } from '@pink/kit';
import { useLowMotion } from '@pink/lib/prefs';
import { cx } from '@pink/lib/cx';
import { TAROT_BY_ID } from '@pink/adapters/pkg4-tarot';
import { STATUS_PRESET, TITLE_BOOK } from '@pink/adapters/pkg4-org';
import { Arcana } from '../tarot';

export const seatNo = (n: number) => String(n).padStart(2, '0');
export const displayCodename = (m: OrgMember) => m.codename || '无名';
export const WEEK_LABELS = ['一', '二', '三', '四', '五', '六', '日'];
/** 面板斜卡样式（真实 p3：panel + slantClip(14) + 柔影） */
export const panel = (cut = 14, extra: CSSProperties = {}): CSSProperties => ({ background: P3R.panel, color: P3R.ink, clipPath: slantClip(cut), boxShadow: 'var(--p3r-shadow)', ...extra });

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

export const LeaderChip = () => <span className="shrink-0 px-1.5 py-[1px] text-[10px] font-black leading-[14px]" style={{ background: P3R.ink, color: 'var(--p3r-on-ink)', clipPath: slantClip(4) }}>♛ 队长</span>;
export const MeChip = () => <span className="shrink-0 px-1.5 py-[1px] text-[10px] font-black leading-[14px]" style={{ background: P3R.magenta, color: '#fff', clipPath: slantClip(4) }}>我</span>;
export const HonorChip = ({ children, muted }: { children: ReactNode; muted?: boolean }) => (
  <span className="inline-flex shrink-0 items-center whitespace-nowrap px-1.5 py-[2px] text-[10px] font-black leading-none" style={muted ? { color: P3R.grey, boxShadow: 'inset 0 0 0 1px var(--p3r-track)', clipPath: slantClip(3) } : { background: P3R.cyan, color: 'var(--p3r-mulberry)', clipPath: slantClip(3) }}>{children}</span>
);

/** 本周出勤 7 格（P3R 分段条） */
export function WeekDots({ days, onInk }: { days: number; onInk?: boolean }) {
  const n = WEEK_LABELS.filter((_, i) => days & (1 << i)).length;
  return (
    <span className="flex w-full min-w-0 max-w-[180px] gap-[3px]" role="img" aria-label={`本周出勤 ${n} 天`}>
      {WEEK_LABELS.map((_, i) => <span key={`wd${i}`} className="h-[6px] min-w-0 flex-1" style={{ clipPath: slantClip(2), background: days & (1 << i) ? P3R.blue : onInk ? 'rgba(255,255,255,0.18)' : 'var(--p3r-track)' }} />)}
    </span>
  );
}

/** 代表牌 / 头像缩略（没选 = 待选代表牌） */
export function MemberThumb({ m, width = 40, avatar, className }: { m: OrgMember; width?: number; avatar?: boolean; className?: string }) {
  const h = Math.round(width * 1.66);
  if (m.tarotId && !avatar) return <Arcana id={m.tarotId} width={width} tag={false} className={className} />;
  return (
    <span className={cx('relative inline-flex shrink-0 items-center justify-center text-center font-heavy leading-tight', className)} style={{ width, height: h, clipPath: chamferClip(8, 8), background: avatar ? P3R.blue : 'var(--p3r-cyan-pale)', color: avatar ? P3R.onBlue : P3R.grey, fontSize: avatar ? width * 0.46 : Math.max(9, width * 0.22) }}>
      {avatar ? displayCodename(m).slice(0, 1) : <span>待选<br />代表牌</span>}
    </span>
  );
}

/** Coverflow：左右滑 / ← → / 点两侧切换；中间放大；只动 transform/opacity */
export function Coverflow<T>({ items, index, onIndex, render, cardW, ariaLabel, itemLabel, onCenterClick, height }: {
  items: T[]; index: number; onIndex: (i: number) => void; render: (it: T, i: number, center: boolean) => ReactNode; cardW: number; ariaLabel: string;
  itemLabel: (it: T, i: number, center: boolean) => string; onCenterClick?: () => void; height: number;
}) {
  const low = useLowMotion();
  const start = useRef<{ x: number } | null>(null);
  const moved = useRef(false);
  const go = (d: number) => onIndex(Math.max(0, Math.min(items.length - 1, index + d)));
  return (
    <div role="listbox" aria-label={ariaLabel} tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); } if (e.key === 'ArrowRight') { e.preventDefault(); go(1); } if (e.key === 'Enter') onCenterClick?.(); }}
      onPointerDown={(e) => { start.current = { x: e.clientX }; moved.current = false; }}
      onPointerMove={(e) => { if (start.current && Math.abs(e.clientX - start.current.x) > 8) moved.current = true; }}
      onPointerUp={(e) => { if (!start.current) return; const dx = e.clientX - start.current.x; start.current = null; if (Math.abs(dx) > 36) go(dx < 0 ? Math.max(1, Math.round(-dx / (cardW * 0.6))) : -Math.max(1, Math.round(dx / (cardW * 0.6)))); }}
      data-qa-allow-clip className="relative w-full touch-pan-y select-none overflow-hidden outline-none" style={{ height }}>
      {items.map((it, i) => {
        const off = i - index;
        if (Math.abs(off) > 3) return null;
        const center = off === 0;
        const x = off * cardW * 0.62 + (off > 0 ? cardW * 0.12 : off < 0 ? -cardW * 0.12 : 0);
        return (
          <motion.div key={`cf-${i}`} role="option" aria-selected={center} aria-label={itemLabel(it, i, center)}
            onClick={() => { if (moved.current) return; if (center) onCenterClick?.(); else onIndex(i); }}
            className="absolute left-1/2 top-1/2 cursor-pointer" style={{ width: cardW, marginLeft: -cardW / 2, zIndex: 10 - Math.abs(off) }}
            initial={false} animate={{ x, y: '-50%', scale: center ? 1 : 0.78 - Math.abs(off) * 0.04, rotateZ: low ? 0 : off * 3, opacity: Math.abs(off) > 2 ? 0 : center ? 1 : 0.72 }}
            transition={{ duration: low ? 0 : 0.26, ease: [0.2, 0.9, 0.1, 1] }}>
            {render(it, i, center)}
          </motion.div>
        );
      })}
    </div>
  );
}

export { TITLE_BOOK };
