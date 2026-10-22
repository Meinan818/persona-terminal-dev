/**
 * 真实：src/components/org/HideoutMap.tsx（据点地图：四个地标 = 分区页签；中心圆桌 7 座；满月团战标记）
 *      src/components/org/RosterWall.tsx（名册牌墙 Coverflow）
 * P4G：地图 = 黄方块底纹 + 黑粗框「电视里的据点」；地标 = 斜切黑签（选中橙底），中心圆桌 = 座位头像圈。
 */
import { motion } from 'framer-motion';
import { useState } from 'react';
import type { OrgMember, OrgView } from '@real/types';
import { cx } from '@yellow/lib/cx';
import { p4gAsset } from '@yellow/lib/asset';
import { useLowMotion } from '@yellow/lib/prefs';
import { P4Badge, P4Button } from '@yellow/kit';
import { tarotImg } from '@yellow/mock/pkg4-tarot';
import { LEVEL, ORG_LEVEL_NAMES } from '@yellow/mock/pkg4-org';
import { HonorChip, MemberThumb, memberFacts, seatNo } from './common';
import { MemberCardBack, MemberCardFront } from './MemberCard';
import { Coverflow } from './Coverflow';

export type HideoutSection = 'roster' | 'board' | 'meeting' | 'ops';
export const SECTION_TITLE: Record<HideoutSection, { t: string; en: string }> = { roster: { t: '名册', en: 'MEMBERS' }, board: { t: '公告板', en: 'BOARD' }, meeting: { t: '会议', en: 'MEETING' }, ops: { t: '作战', en: 'OPERATIONS' } };
const MARKS: Array<{ id: HideoutSection; en: string; pos: string }> = [
  { id: 'roster', en: 'MEMBERS', pos: 'left-2 top-2' }, { id: 'board', en: 'BOARD', pos: 'right-2 top-2' },
  { id: 'meeting', en: 'MEETING', pos: 'left-2 bottom-2' }, { id: 'ops', en: 'OPS', pos: 'right-2 bottom-2' },
];

export function HideoutMap({ view, section, onSection, blocked, dots, onSeat, raid, onRaid }: {
  view: OrgView; section: HideoutSection; onSection: (s: HideoutSection) => void; blocked: Set<string>; dots: Partial<Record<HideoutSection, boolean>>;
  onSeat: (m: OrgMember) => void; raid: { boss: string; left: number; defeated: boolean; dot: boolean } | null; onRaid: () => void;
}) {
  const low = useLowMotion();
  const seats = Array.from({ length: 7 }, (_, i) => view.members.find((m) => m.seat === i + 1) ?? null);
  return (
    <div className="relative h-[clamp(270px,72vw,330px)] overflow-hidden rounded-sm border-[4px] border-p4g-black shadow-hard-lg night:border-p4g-yellow" style={{ backgroundImage: `url(${p4gAsset('paper-collage.webp')})`, backgroundSize: '256px', backgroundColor: 'var(--p4g-yellow)' }}>
      <div aria-hidden className="absolute inset-0 night:bg-black/55" />
      <div aria-hidden className="absolute inset-x-0 top-0 h-2 p4g-candy-h" />
      {/* 斜向道路 */}
      <div aria-hidden className="absolute left-1/2 top-1/2 h-[140%] w-12 -translate-x-1/2 -translate-y-1/2 rotate-[28deg] bg-p4g-black/15" />
      <div aria-hidden className="absolute left-1/2 top-1/2 h-12 w-[140%] -translate-x-1/2 -translate-y-1/2 -rotate-[14deg] bg-p4g-black/10" />
      {/* 等级招牌 */}
      <div className="absolute left-1/2 top-3 -translate-x-1/2 rotate-[-2deg] whitespace-nowrap rounded-xs border-thin border-p4g-black bg-white px-2 py-0.5 font-display text-2xs font-bold text-p4g-black shadow-hard-sm">Lv.{LEVEL.level} · {ORG_LEVEL_NAMES[LEVEL.level - 1]}</div>
      {/* 满月团战标记 */}
      {raid && (
        <motion.button type="button" onClick={onRaid} aria-label={`满月团战：「${raid.boss}」${raid.defeated ? '已击退' : `还剩 ${Math.round(raid.left * 100)}%`}${raid.dot ? '，今晚你还没出手' : ''}。点了打开团战面板`}
          className="absolute right-4 top-[40%] z-10" animate={low ? undefined : { y: [0, -4, 0] }} transition={{ duration: 2.4, repeat: Infinity }}>
          <span className="relative flex h-11 w-11 items-center justify-center rounded-pill border-3 border-p4g-black bg-[#fff6b0] shadow-[0_0_0_4px_rgba(255,229,0,.5)]">
            <span className="font-display text-h3 text-p4g-black">☾</span>
            {raid.dot && <P4Badge dot className="absolute -right-0.5 -top-0.5" />}
          </span>
          <span className="mt-0.5 block whitespace-nowrap rounded-xs bg-p4g-black px-1 font-display text-[9px] font-bold text-p4g-yellow">{raid.defeated ? '击退' : `${Math.round(raid.left * 100)}%`}</span>
        </motion.button>
      )}
      {/* 中心圆桌 + 7 座 */}
      <div className="absolute left-1/2 top-[56%] h-[46%] -translate-x-1/2 -translate-y-1/2" style={{ aspectRatio: '1' }}>
        <div aria-hidden className="absolute inset-[22%] rounded-pill border-[4px] border-p4g-black bg-p4g-orange shadow-hard">
          <div className="absolute inset-[18%] rounded-pill border-thin border-dashed border-p4g-black/60" />
        </div>
        {seats.map((m, i) => {
          const a = (i / 7) * Math.PI * 2 - Math.PI / 2;
          const x = 50 + Math.cos(a) * 44, y = 50 + Math.sin(a) * 44;
          const style = { left: `${x}%`, top: `${y}%` };
          if (!m) return <span key={i} aria-hidden className="absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-sm border-thin border-dashed border-p4g-black bg-white/50 font-display text-[9px] font-bold text-p4g-black/60" style={style}>{seatNo(i + 1)}</span>;
          const f = memberFacts(view, m);
          return (
            <button key={i} type="button" onClick={() => onSeat(m)} aria-label={`${seatNo(m.seat)} 号 ${f.codename}${f.mine ? '（我）' : ''}${f.leader ? '（队长）' : ''}：打开成员牌`} className={cx('p4g-press absolute -translate-x-1/2 -translate-y-1/2', blocked.has(m.userId) && 'opacity-50')} style={style}>
              <span className={cx('block h-9 w-9 overflow-hidden rounded-sm border-3 bg-p4g-yellow-pale', f.mine ? 'border-p4g-orange' : 'border-p4g-black')}>
                {m.tarotId ? <img src={tarotImg(m.tarotId)} alt="" className="h-full w-full object-cover object-top" draggable={false} /> : <span className="flex h-full w-full items-center justify-center font-display text-body font-bold text-p4g-black">{f.codename.slice(0, 1)}</span>}
              </span>
              <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 rounded-xs bg-p4g-black px-0.5 p4g-num-upright text-[8px] leading-tight text-p4g-yellow">{seatNo(m.seat)}</span>
              {f.leader && <span aria-hidden className="absolute -right-1.5 -top-2 text-[11px]">👑</span>}
            </button>
          );
        })}
      </div>
      {/* 地标 = 页签 */}
      <div role="tablist" aria-label="据点分区" className="pointer-events-none absolute inset-0">
        {MARKS.map((mk) => {
          const on = section === mk.id;
          return (
            <button key={mk.id} type="button" role="tab" aria-selected={on} onClick={() => onSection(mk.id)} className={cx('p4g-press pointer-events-auto absolute', mk.pos)}>
              <span className={cx('relative block -skew-x-12 border-3 border-p4g-black px-3 py-1.5 shadow-[3px_3px_0_#000]', on ? 'bg-p4g-orange' : 'bg-p4g-black')}>
                <span className={cx('block skew-x-12 text-left font-display leading-tight', on ? 'text-p4g-black' : 'text-p4g-yellow')}>
                  <span className="block text-lead font-bold">{SECTION_TITLE[mk.id].t}</span>
                  <span className="block text-[9px] font-bold italic tracking-[0.2em] opacity-80">{mk.en}</span>
                </span>
              </span>
              {dots[mk.id] && <P4Badge dot className="absolute -right-1 -top-1" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** 名册 · 牌墙 */
export function RosterWall({ view, blocked, onMore, onSync, onInvite }: { view: OrgView; blocked: Set<string>; onMore: (m: OrgMember) => void; onSync: (m: OrgMember) => void; onInvite: () => void }) {
  const empty = Math.max(0, 7 - view.members.length);
  const items: Array<OrgMember | 'invite'> = [...view.members, ...(empty ? ['invite' as const] : [])];
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [avatar, setAvatar] = useState<Record<string, boolean>>({});
  const vw = typeof window === 'undefined' ? 390 : window.innerWidth;
  const cw = Math.min(190, Math.max(130, Math.floor(vw * 0.42)));
  const cur = items[idx];
  const low = useLowMotion();
  const change = (i: number) => { setIdx(i); setFlipped(false); };
  return (
    <div className="space-y-2">
      <Coverflow items={items} index={idx} onIndex={change} cardW={cw} height={Math.round(cw * 1.6) + 26} ariaLabel="名册"
        onCenterClick={() => (cur === 'invite' ? onInvite() : setFlipped((f) => !f))}
        itemLabel={(it, i, c) => (it === 'invite' ? `还有 ${empty} 个空座位，点一下发邀请码` : `${seatNo(it.seat)} 号 ${memberFacts(view, it).codename}${c ? (flipped ? '（背面）' : '（点一下翻面）') : ''}`)}
        render={(it, i, center) => it === 'invite' ? (
          <span className="flex flex-col items-center justify-center gap-1 rounded-[8px] border-[4px] border-dashed border-p4g-line bg-p4g-surface-2/70 text-p4g-ink" style={{ height: Math.round(cw * 1.6) }}>
            <span className="font-display text-h1 font-bold leading-none">＋</span><span className="font-display text-meta font-bold">{empty} 个空座位</span>
          </span>
        ) : (
          <span className={cx('relative block', blocked.has(it.userId) && 'opacity-60')} style={{ height: Math.round(cw * 1.6), perspective: 1000 }}>
            {low || !center ? (center && flipped ? <MemberCardBack view={view} member={it} width={cw} /> : <MemberCardFront view={view} member={it} width={cw} avatar={avatar[it.id]} />) : (
              <motion.span className="absolute inset-0 block" style={{ transformStyle: 'preserve-3d' }} animate={{ rotateY: flipped ? 180 : 0 }} transition={{ duration: 0.45 }}>
                <span className="absolute inset-0 block" style={{ backfaceVisibility: 'hidden' }}><MemberCardFront view={view} member={it} width={cw} avatar={avatar[it.id]} /></span>
                <span className="absolute inset-0 block" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}><MemberCardBack view={view} member={it} width={cw} /></span>
              </motion.span>
            )}
            {blocked.has(it.userId) && <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 bg-p4g-black/80 text-center font-display text-meta font-bold text-white">已屏蔽</span>}
          </span>
        )} />
      <div className="mx-auto flex h-7 max-w-[260px] items-center justify-center gap-[6px]" role="group" aria-label="快速跳到某个人">
        {items.map((it, i) => (
          <button key={i} type="button" onClick={() => change(i)} aria-label={it === 'invite' ? '空座位' : `${seatNo(it.seat)} 号 ${memberFacts(view, it).codename}`} className={cx('h-3 rounded-pill border-thin border-p4g-black transition-transform', i === idx ? 'w-6 bg-p4g-orange' : it === 'invite' ? 'w-3 border-dashed bg-transparent' : 'w-3 bg-p4g-surface')} />
        ))}
      </div>
      <div className="text-center font-display text-2xs font-bold text-[color:var(--p4g-on-stage)] opacity-80">左右切换 · 点中间那张翻面</div>
      {cur === 'invite' ? (
        <div className="rounded-sm border-3 border-dashed border-p4g-line bg-p4g-surface-2/70 p-4 text-center">
          <div className="font-display text-h2 font-bold text-p4g-ink">还有 {empty} 个空座位</div>
          <div className="mt-1 text-meta font-bold text-p4g-ink-soft">点空白牌或下面的按钮，把邀请码发给朋友</div>
          <div className="mt-3 flex justify-center"><P4Button size="sm" variant="black" onClick={onInvite}>发邀请码</P4Button></div>
        </div>
      ) : cur && (() => {
        const f = memberFacts(view, cur);
        const canSync = !f.mine && f.personas.length > 0;
        return (
          <div className="flex min-w-0 items-center gap-3 border-3 border-p4g-line px-3 py-2.5 shadow-hard-sm" style={{ background: 'var(--p4g-surface-grad)' }}>
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-1.5"><span className="truncate font-display text-lead font-bold text-p4g-ink">{f.codename}</span>{f.leader && <span aria-label="队长">👑</span>}</div>
              <div className="truncate text-2xs font-bold text-p4g-ink-soft">{f.card ? `${f.card.roman ?? ''} · ${f.card.name}` : '还没选代表牌'}{f.mine && ' · 我'}{blocked.has(cur.userId) && ' · 已屏蔽'}</div>
              <div className="mt-1 flex flex-wrap gap-1">{f.titles.map((t) => <HonorChip key={t}>{t}</HonorChip>)}{f.absent && <HonorChip muted>本周缺席</HonorChip>}</div>
            </div>
            <div className="shrink-0 text-center"><div className="p4g-num text-h2 leading-none text-p4g-ink">{f.streak}</div><div className="mt-0.5 text-[9px] font-bold text-p4g-ink-soft">连续天数</div></div>
            <div className="flex shrink-0 flex-col gap-1.5">
              <button type="button" onClick={() => setAvatar((a) => ({ ...a, [cur.id]: !a[cur.id] }))} aria-label={avatar[cur.id] ? '牌面换回代表牌' : '牌面换成头像'} className="p4g-press rounded-xs border-thin border-p4g-line bg-p4g-surface-2 px-1.5 py-0.5 font-display text-2xs font-bold text-p4g-ink">{avatar[cur.id] ? '换回代表牌' : '换成头像'}</button>
              <div className="flex gap-1.5">
                {canSync && <P4Button size="sm" variant="black" onClick={() => onSync(cur)}>同调</P4Button>}
                <P4Button size="sm" variant="secondary" aria-label={`${f.codename} 的更多操作`} onClick={() => onMore(cur)}>⋯ 更多</P4Button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
