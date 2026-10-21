/** 真实：src/components/org/BoardSection.tsx（公告板：筛选 / 动态卡 / 达成卡 / 团战战报 / 会议纪要 / 长按菜单），粉白 p3 皮 */
import { motion } from 'framer-motion';
import { useMemo, useRef, useState } from 'react';
import type { OrgPost, OrgReactionTag, OrgView } from '@/types';
import { P3R, P3Button, P3Empty, P3Error, P3SlantTabs, slantClip, useToast } from '@pink/kit';
import { useLowMotion } from '@pink/lib/prefs';
import { navigate } from '@pink/shell/shellBus';
import { ATTR_COLOR } from '@pink/adapters/pkg4-tarot';
import { MY_REACTIONS, REACTION_COUNTS, REACTIONS, RAID } from '@pink/adapters/pkg4-org';
import { BoardMenus, type BoardStep } from '@pink/screens/overlays/BoardMenus.p3r';
import { MeChip, MemberThumb, panel } from './common';

const WEEKDAY = ['日', '一', '二', '三', '四', '五', '六'];
const dayLabel = (d: Date) => { const n = new Date(); const a = new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime(); const b = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); const diff = Math.round((a - b) / 86400_000); if (diff === 0) return '今天'; if (diff === 1) return '昨天'; return `${d.getMonth() + 1}月${d.getDate()}日 周${WEEKDAY[d.getDay()]}`; };
const KIND_LABEL: Record<string, string> = { important: '重要', bigdeal: 'BIG DEAL 收官', wish: '愿望实现', card: '宣告卡达成', weekly: '周目标完成' };
type Filter = 'all' | 'moment' | 'operation' | 'minutes';

function useLongPress(fn: () => void, ms = 500) {
  const t = useRef<number>();
  return {
    onPointerDown: () => { t.current = window.setTimeout(fn, ms); },
    onPointerUp: () => clearTimeout(t.current), onPointerLeave: () => clearTimeout(t.current), onPointerCancel: () => clearTimeout(t.current),
    onContextMenu: (e: React.MouseEvent) => { e.preventDefault(); fn(); },
  };
}

export function BoardSection({ view, blocked, failed, empty, leader, onBlockToggle }: { view: OrgView; blocked: Set<string>; failed?: boolean; empty?: boolean; leader: boolean; onBlockToggle: (uid: string) => void }) {
  const toast = useToast();
  const low = useLowMotion();
  const [filter, setFilter] = useState<Filter>('all');
  const [posts, setPosts] = useState<OrgPost[]>(empty ? [] : view.posts ?? []);
  const [mine, setMine] = useState<Record<string, OrgReactionTag[]>>(MY_REACTIONS);
  const [menuFor, setMenuFor] = useState<OrgPost | null>(null);
  const [step, setStep] = useState<BoardStep>(null);
  const visible = posts.filter((p) => !blocked.has(p.userId));
  const blockedCount = posts.length - visible.length;
  const counts = { all: visible.length + 1, moment: visible.filter((p) => p.kind === 'moment').length, operation: visible.filter((p) => p.kind === 'operation').length + 1, minutes: visible.filter((p) => p.kind === 'minutes').length };
  const list = visible.filter((p) => filter === 'all' || p.kind === filter);
  const groups = useMemo(() => { const g: Array<{ label: string; items: OrgPost[] }> = []; list.forEach((p) => { const l = dayLabel(new Date(p.createdAt)); const last = g[g.length - 1]; if (last && last.label === l) last.items.push(p); else g.push({ label: l, items: [p] }); }); return g; }, [list]);
  if (failed) return <P3Error title="公告板还没拉到" text="公告板还没拉到，稍后点右上角刷新。" />;
  const react = (pid: string, tag: OrgReactionTag) => setMine((m) => { const cur = m[pid] ?? []; return { ...m, [pid]: cur.includes(tag) ? cur.filter((x) => x !== tag) : [...cur, tag] }; });
  const filters: Array<[Filter, string]> = [['all', '全部'], ['moment', '动态'], ['operation', '作战'], ['minutes', '纪要']];
  const item = (i: number) => ({ initial: low ? { opacity: 0 } : { opacity: 0, x: -18 }, animate: { opacity: 1, x: 0 }, transition: { delay: low ? 0 : i * 0.05, duration: 0.24 } });
  return (
    <div className="space-y-3">
      <div aria-label="公告板筛选" role="group"><P3SlantTabs size="sm" items={filters.map(([id, l]) => ({ id, label: l, badge: counts[id] }))} value={filter} onChange={(v) => setFilter(v as Filter)} /></div>
      {posts.length === 0 ? (
        <P3Empty text="还没有动态" ghost="BOARD" sub="在记录页长按一条记录，选「分享到据点」，就会出现在这里。分享出去的只有你写的那一句和加点，不带记录原文。" action={<P3Button size="sm" onClick={() => navigate('actions', 'activities')}>去记录页</P3Button>} />
      ) : filter !== 'all' && !list.length && filter !== 'operation' ? (
        <P3Empty text={filter === 'moment' ? '最近 30 天没有人分享动态' : '最近 30 天还没有会议纪要'} ghost={false} />
      ) : (
        <div className="space-y-4">
          {(filter === 'all' || filter === 'operation') && <motion.div {...item(0)}><RaidCard view={view} /></motion.div>}
          {groups.map((g, gi) => (
            <motion.div key={g.label} {...item(gi + 1)}>
              <div className="mb-2 flex items-center gap-2"><span className="px-2.5 py-0.5 text-[12px] font-black" style={{ background: P3R.ink, color: 'var(--p3r-on-ink)', clipPath: slantClip(5) }}>{g.label}</span><span aria-hidden className="h-[2px] flex-1" style={{ background: 'var(--p3r-track)' }} /></div>
              <div className="space-y-2.5">
                {g.items.map((p) => p.kind === 'moment' ? <MomentCard key={p.id} view={view} post={p} mine={mine[p.id] ?? []} onReact={(t) => react(p.id, t)} onMore={() => { setMenuFor(p); setStep('menu'); }} />
                  : p.kind === 'operation' ? <OpCard key={p.id} post={p} onMore={() => { setMenuFor(p); setStep('menu'); }} />
                    : <MinutesCard key={p.id} post={p} />)}
              </div>
            </motion.div>
          ))}
        </div>
      )}
      {blockedCount > 0 && <div className="text-center text-[11px] font-bold" style={{ color: P3R.grey }}>已屏蔽 {blockedCount} 条（据点设置里可以解除）</div>}
      <div className="text-center text-[11px] font-bold" style={{ color: P3R.grey }}>公告板只显示最近 30 天 · 长按一条可以举报或屏蔽</div>
      <BoardMenus post={menuFor} step={step} onStep={setStep} mine={menuFor?.userId === view.me.userId} leader={leader} blocked={!!menuFor && blocked.has(menuFor.userId)} onClose={() => setStep(null)}
        onBlock={() => { if (!menuFor) return; const was = blocked.has(menuFor.userId); onBlockToggle(menuFor.userId); toast(was ? '已解除屏蔽' : '已屏蔽，不再显示 Ta 的动态和标签'); }}
        onReported={() => { if (menuFor) setPosts((l) => l.filter((x) => x.id !== menuFor.id)); setStep(null); toast.success('已举报，这条不再显示；会在 2 天内处理'); }}
        onDeleted={() => { if (menuFor) setPosts((l) => l.filter((x) => x.id !== menuFor.id)); toast('删掉了'); }} />
    </div>
  );
}

function MomentCard({ view, post, mine, onReact, onMore }: { view: OrgView; post: OrgPost; mine: OrgReactionTag[]; onReact: (t: OrgReactionTag) => void; onMore: () => void }) {
  const author = view.members.find((m) => m.userId === post.userId);
  const lp = useLongPress(onMore);
  const s = post.snapshot;
  const counts = REACTION_COUNTS[post.id] ?? {};
  const isMine = post.userId === view.me.userId;
  return (
    <div {...lp} className="relative min-w-0 select-none px-4 py-3" style={panel(12)}>
      <div className="flex min-w-0 items-center gap-2">
        {author ? <MemberThumb m={author} width={22} /> : <span className="h-9 w-[22px] shrink-0" style={{ background: 'var(--p3r-track)' }} />}
        <span className="min-w-0 truncate text-[14px] font-black" style={{ color: P3R.ink }}>{author?.codename ?? s?.by.codename ?? '已退出的成员'}</span>
        {isMine && <MeChip />}
        {s?.kind && <span className="shrink-0 px-1.5 text-[10px] font-black" style={{ background: P3R.cyan, color: 'var(--p3r-mulberry)', clipPath: slantClip(3) }}>{KIND_LABEL[s.kind]}</span>}
        <span className="ml-auto shrink-0 font-cond text-[12px]" style={{ color: P3R.grey }}>{new Date(post.createdAt).getHours()}:{String(new Date(post.createdAt).getMinutes()).padStart(2, '0')}</span>
        <button type="button" onClick={onMore} aria-label="更多操作" className="-mr-1 shrink-0 px-1.5 text-[18px] font-black leading-none" style={{ color: P3R.grey }}>⋯</button>
      </div>
      <div className="mt-1.5 break-words text-[15px] font-black" style={{ color: P3R.ink }}>{post.text}</div>
      {s && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {Object.entries(s.pts).map(([a, v]) => <span key={a} className="px-1.5 text-[11px] font-black" style={{ background: ATTR_COLOR[a as 'guts'], color: 'var(--p3r-mulberry)', clipPath: slantClip(3) }}>{s.names[a as 'guts']} +{v}</span>)}
          {s.backfilled && <span className="px-1 text-[10px] font-bold" style={{ color: P3R.grey }}>补记</span>}
        </div>
      )}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {REACTIONS.map((r) => {
          const on = mine.includes(r.id); const base = (MY_REACTIONS[post.id] ?? []).includes(r.id);
          const n = (counts[r.id] ?? 0) + (on && !base ? 1 : 0) - (!on && base ? 1 : 0);
          return (
            <button key={r.id} type="button" onClick={() => onReact(r.id)} aria-pressed={on} aria-label={`${r.label}${n ? `，${n} 人` : ''}`} className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-black"
              style={{ clipPath: slantClip(4), background: on ? P3R.blue : n ? 'var(--p3r-chip)' : 'transparent', color: on ? P3R.onBlue : n ? P3R.ink : P3R.grey, boxShadow: !on && !n ? 'inset 0 0 0 1px var(--p3r-track)' : undefined }}>
              {r.label}{n > 0 && <span className="font-cond">{n}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function OpCard({ post, onMore }: { post: OrgPost; onMore: () => void }) {
  const c = post.opCard!;
  return (
    <div className="relative min-w-0 overflow-hidden px-4 py-3" style={{ background: P3R.blue, color: P3R.onBlue, clipPath: slantClip(12) }}>
      <span aria-hidden className="absolute -right-4 top-0 h-full w-20" style={{ background: 'rgba(255,255,255,0.14)', clipPath: 'polygon(40% 0, 100% 0, 60% 100%, 0 100%)' }} />
      <div className="relative flex items-center gap-2">
        <span className="shrink-0 whitespace-nowrap px-2 py-[3px] text-[11px] font-black" style={{ background: 'var(--p3r-cream)', color: 'var(--p3r-blue-deep)', clipPath: slantClip(4) }}>✦ {c.kind === 'big' ? '作战' : '目标'}达成</span>
        <span className="min-w-0 truncate text-[11px] font-bold">{Number(c.day.slice(5, 7))}月{Number(c.day.slice(8, 10))}日</span>
        <button type="button" onClick={onMore} aria-label="更多操作" className="-mr-1 ml-auto shrink-0 px-1.5 text-[18px] font-black leading-none">⋯</button>
      </div>
      <div className="relative mt-1 font-heavy text-[16px]">{c.title}</div>
      <div className="relative mt-1 flex flex-wrap gap-1">{c.participants.map((p) => <span key={p.userId} className="px-1.5 text-[11px] font-black" style={{ background: 'rgba(255,255,255,0.22)', clipPath: slantClip(3) }}>{p.codename}</span>)}</div>
    </div>
  );
}

function RaidCard({ view }: { view: OrgView }) {
  const left = Math.round((RAID.left / RAID.hpMax) * 100);
  return (
    <div className="relative min-w-0 overflow-hidden px-4 py-3" style={{ background: '#2a0d22', color: '#ffeef5', clipPath: slantClip(12) }}>
      <div className="flex min-w-0 items-center gap-2">
        <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap px-2 py-[3px] text-[11px] font-black" style={{ background: '#ff6fa3', color: '#2a0d22', clipPath: slantClip(4) }}>☾ 满月团战 · 还差 {left}%</span>
        <span className="min-w-0 truncate text-[11px] font-bold" style={{ color: 'rgba(255,238,245,0.7)' }}>{Number(RAID.nights[1].slice(5, 7))}月{Number(RAID.nights[1].slice(8, 10))}日 满月</span>
      </div>
      <div className="mt-1 text-[13px] font-bold">全队打掉 <span className="font-cond text-[17px]" style={{ color: '#ff9cc4' }}>{RAID.hpMax - RAID.left}</span> / {RAID.hpMax}</div>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {RAID.hitters.map((h) => { const m = view.members.find((x) => x.userId === h.userId); return <span key={h.userId} className="px-1.5 py-0.5 text-[10.5px] font-bold" style={{ background: 'rgba(255,255,255,0.1)', clipPath: slantClip(3) }}>{m?.userId === view.me.userId ? '我' : m?.codename ?? '已退出的成员'} · 出手 {h.nights} 晚{h.allout ? ' · 总攻击' : ''}</span>; })}
      </div>
    </div>
  );
}

function MinutesCard({ post }: { post: OrgPost }) {
  const m = post.minutes!;
  const [open, setOpen] = useState(true);
  const label = (t: string) => <div className="mb-1 font-cond text-[11px] uppercase tracking-[0.18em]" style={{ color: P3R.grey }}>{t}</div>;
  return (
    <div className="min-w-0" style={panel(12, { background: 'var(--p3r-cyan-pale)', boxShadow: undefined })}>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full min-w-0 items-center gap-2 px-4 py-3 text-left">
        <span className="shrink-0 whitespace-nowrap px-2 py-[3px] text-[11px] font-black" style={{ background: P3R.ink, color: 'var(--p3r-on-ink)', clipPath: slantClip(4) }}>会议纪要</span>
        <span className="min-w-0 flex-1 truncate text-[14px] font-black" style={{ color: P3R.ink }}>第 12 周<span className="ml-1.5 text-[11px]" style={{ color: P3R.grey }}>{Number(m.week.slice(5, 7))}/{Number(m.week.slice(8, 10))} 起</span></span>
        <span className="shrink-0 text-[11px] font-bold" style={{ color: P3R.grey }}>出席 {m.goals.length} / {m.goals.length + m.absent.length}</span>
        <span aria-hidden className="shrink-0 text-[11px] font-black" style={{ color: P3R.roseInk }}>{open ? '收起' : '展开'}</span>
      </button>
      {open && (
        <div className="space-y-3 px-4 pb-3 pt-1" style={{ borderTop: '1.5px dashed var(--p3r-track)' }}>
          <div>{label('这周的目标')}<div className="flex items-baseline gap-1"><span className="font-cond text-[34px] leading-none" style={{ color: P3R.blue }}>{m.rate.done}</span><span className="font-cond text-[18px]" style={{ color: P3R.ink }}>/ {m.rate.total}</span><span className="text-[12px] font-bold" style={{ color: P3R.grey }}>人做到了</span></div></div>
          <div>{label('本周称号')}<div className="flex flex-wrap gap-1.5">{m.titles.map((t) => <span key={t.userId + t.title} className="px-1.5 py-0.5 text-[11px] font-black" style={{ background: P3R.cyan, color: 'var(--p3r-mulberry)', clipPath: slantClip(3) }}>{t.codename} · {t.title}</span>)}</div></div>
          <div>{label('下周目标')}<ul className="space-y-1">{m.goals.map((g) => <li key={g.userId} className="flex min-w-0 gap-2 text-[12.5px]"><span className="w-12 shrink-0 truncate font-black" style={{ color: P3R.ink }}>{g.codename}</span><span className="min-w-0" style={{ color: P3R.ink }}>「{g.goal}」</span></li>)}</ul></div>
          {m.absent.length > 0 && <div className="text-[11px] font-bold" style={{ color: P3R.grey }}>缺席：{m.absent.map((a) => a.codename).join('、')}</div>}
        </div>
      )}
    </div>
  );
}
