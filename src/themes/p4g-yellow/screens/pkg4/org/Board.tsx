/** 真实：src/components/org/BoardSection.tsx（公告板：筛选 / 动态卡 / 达成卡 / 团战战报 / 会议纪要 / 长按菜单） */
import { useMemo, useRef, useState } from 'react';
import type { OrgPost, OrgReactionTag, OrgView } from '@/types';
import { P4Button, P4Card, useToast } from '@yellow/kit';
import { CollageStagger, CollageItem } from '@yellow/fx';
import { cx } from '@yellow/lib/cx';
import { navigate } from '@yellow/shell/shellBus';
import { ATTR_COLOR } from '@yellow/adapters/pkg4-tarot';
import { MY_REACTIONS, REACTION_COUNTS, REACTIONS, RAID } from '@yellow/adapters/pkg4-org';
import { BoardMenus } from '@yellow/screens/overlays/BoardMenus.p4g';
import { MeChip, MemberThumb } from './common';

const WEEKDAY = ['日', '一', '二', '三', '四', '五', '六'];
const dayLabel = (d: Date) => { const n = new Date(); const a = new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime(); const b = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); const diff = Math.round((a - b) / 86400_000); if (diff === 0) return '今天'; if (diff === 1) return '昨天'; return `${d.getMonth() + 1}月${d.getDate()}日 周${WEEKDAY[d.getDay()]}`; };
const KIND_LABEL: Record<string, string> = { important: '重要', bigdeal: 'BIG DEAL 收官', wish: '愿望实现', card: '宣告卡达成', weekly: '周目标完成' };
type Filter = 'all' | 'moment' | 'operation' | 'minutes';

function useLongPress(fn: () => void, ms = 500) {
  const t = useRef<number>();
  const fired = useRef(false);
  return {
    onPointerDown: () => { fired.current = false; t.current = window.setTimeout(() => { fired.current = true; fn(); }, ms); },
    onPointerUp: () => clearTimeout(t.current), onPointerLeave: () => clearTimeout(t.current), onPointerCancel: () => clearTimeout(t.current),
    onContextMenu: (e: React.MouseEvent) => { e.preventDefault(); fn(); },
  };
}

export function BoardSection({ view, blocked, failed, empty, leader, onBlockToggle }: { view: OrgView; blocked: Set<string>; failed?: boolean; empty?: boolean; leader: boolean; onBlockToggle: (uid: string) => void }) {
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>('all');
  const [posts, setPosts] = useState<OrgPost[]>(empty ? [] : view.posts ?? []);
  const [mine, setMine] = useState<Record<string, OrgReactionTag[]>>(MY_REACTIONS);
  const [menuFor, setMenuFor] = useState<OrgPost | null>(null);
  const [step, setStep] = useState<'menu' | 'report' | 'delete' | null>(null);
  const visible = posts.filter((p) => !blocked.has(p.userId));
  const blockedCount = posts.length - visible.length;
  const counts = { all: visible.length + 1, moment: visible.filter((p) => p.kind === 'moment').length, operation: visible.filter((p) => p.kind === 'operation').length + 1, minutes: visible.filter((p) => p.kind === 'minutes').length };
  const list = visible.filter((p) => filter === 'all' || p.kind === filter);
  const groups = useMemo(() => { const g: Array<{ label: string; items: OrgPost[] }> = []; list.forEach((p) => { const l = dayLabel(new Date(p.createdAt)); const last = g[g.length - 1]; if (last && last.label === l) last.items.push(p); else g.push({ label: l, items: [p] }); }); return g; }, [list]);
  if (failed) return <P4Card tone="paper"><div className="text-body font-bold text-p4g-ink-soft">公告板还没拉到，稍后点右上角刷新。</div></P4Card>;
  const react = (pid: string, tag: OrgReactionTag) => setMine((m) => { const cur = m[pid] ?? []; return { ...m, [pid]: cur.includes(tag) ? cur.filter((x) => x !== tag) : [...cur, tag] }; });
  const filters: Array<[Filter, string]> = [['all', '全部'], ['moment', '动态'], ['operation', '作战'], ['minutes', '纪要']];
  return (
    <div className="space-y-3">
      <div role="tablist" aria-label="公告板筛选" className="flex flex-wrap gap-1.5">
        {filters.map(([id, l]) => (
          <button key={id} type="button" role="tab" aria-selected={filter === id} aria-label={`${l}，${counts[id]} 条`} onClick={() => setFilter(id)} className={cx('p4g-press -skew-x-12 border-3 px-3 py-1', filter === id ? 'border-p4g-black bg-p4g-black text-p4g-yellow night:border-p4g-yellow night:bg-p4g-yellow night:text-p4g-black' : 'border-p4g-line bg-p4g-surface text-p4g-ink')}>
            <span className="block skew-x-12 font-display text-body font-bold">{l}<span className="ml-1 p4g-num-upright text-2xs opacity-75">{counts[id]}</span></span>
          </button>
        ))}
      </div>
      {posts.length === 0 ? (
        <P4Card tone="paper" cut="br">
          <div className="font-display text-lead font-bold text-p4g-ink">还没有动态</div>
          <div className="mt-1 text-meta leading-relaxed text-p4g-ink-soft">在记录页长按一条记录，选「分享到据点」，就会出现在这里。分享出去的只有你写的那一句和加点，不带记录原文。</div>
          <div className="mt-3"><P4Button size="sm" variant="black" onClick={() => navigate('actions', 'activities')}>去记录页</P4Button></div>
        </P4Card>
      ) : (filter !== 'all' && !list.length && !(filter === 'operation')) ? (
        <div className="rounded-sm border-3 border-dashed border-p4g-line px-4 py-6 text-center font-display text-body font-bold text-[color:var(--p4g-on-stage)]">{filter === 'moment' ? '最近 30 天没有人分享动态' : '最近 30 天还没有会议纪要'}</div>
      ) : (
        <CollageStagger className="space-y-4">
          {(filter === 'all' || filter === 'operation') && <CollageItem><RaidCard view={view} /></CollageItem>}
          {groups.map((g) => (
            <CollageItem key={g.label}>
              <div className="mb-2 flex items-center gap-2"><span className="rounded-xs bg-p4g-black px-2 py-0.5 font-display text-meta font-bold text-p4g-yellow night:bg-p4g-yellow night:text-p4g-black">{g.label}</span><span aria-hidden className="h-[3px] flex-1 bg-[color:var(--p4g-on-stage)] opacity-50" /></div>
              <div className="space-y-2.5">
                {g.items.map((p) => p.kind === 'moment' ? <MomentCard key={p.id} view={view} post={p} mine={mine[p.id] ?? []} onReact={(t) => react(p.id, t)} onMore={() => { setMenuFor(p); setStep('menu'); }} />
                  : p.kind === 'operation' ? <OpCard key={p.id} post={p} onMore={() => { setMenuFor(p); setStep('menu'); }} />
                    : <MinutesCard key={p.id} post={p} />)}
              </div>
            </CollageItem>
          ))}
        </CollageStagger>
      )}
      {blockedCount > 0 && <div className="text-center font-display text-2xs font-bold text-[color:var(--p4g-on-stage)] opacity-80">已屏蔽 {blockedCount} 条（据点设置里可以解除）</div>}
      <div className="text-center font-display text-2xs font-bold text-[color:var(--p4g-on-stage)] opacity-80">公告板只显示最近 30 天 · 长按一条可以举报或屏蔽</div>
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
    <div {...lp} className="relative min-w-0 select-none border-3 border-p4g-line px-3 py-2.5 shadow-hard-sm" style={{ background: 'var(--p4g-surface-grad)' }}>
      <div className="flex min-w-0 items-center gap-2">
        {author ? <MemberThumb m={author} width={22} /> : <span className="h-9 w-[22px] shrink-0 rounded-[4px] bg-p4g-black/20" />}
        <span className="min-w-0 truncate font-display text-body font-bold text-p4g-ink">{author?.codename ?? s?.by.codename ?? '已退出的成员'}</span>
        {isMine && <MeChip />}
        {s?.kind && <span className="shrink-0 -rotate-3 rounded-xs bg-p4g-tag px-1 font-display text-2xs font-bold text-[color:var(--p4g-tag-ink)]">{KIND_LABEL[s.kind]}</span>}
        <span className="ml-auto shrink-0 text-2xs font-bold text-p4g-ink-soft">{new Date(post.createdAt).getHours()}:{String(new Date(post.createdAt).getMinutes()).padStart(2, '0')}</span>
        <button type="button" onClick={onMore} aria-label="更多操作" className="-mr-1 shrink-0 px-1.5 font-display text-h3 font-bold leading-none text-p4g-ink-soft">⋯</button>
      </div>
      <div className="mt-1.5 break-words font-display text-lead font-bold text-p4g-ink">{post.text}</div>
      {s && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {Object.entries(s.pts).map(([a, v]) => <span key={a} className="rounded-xs border-thin border-p4g-black px-1.5 font-display text-2xs font-bold text-white" style={{ background: ATTR_COLOR[a as 'guts'] }}>{s.names[a as 'guts']} +{v}</span>)}
          {s.backfilled && <span className="rounded-xs border-thin border-p4g-line px-1 text-2xs font-bold text-p4g-ink-soft">补记</span>}
        </div>
      )}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {REACTIONS.map((r) => {
          const on = mine.includes(r.id); const n = (counts[r.id] ?? 0) + (on && !(MY_REACTIONS[post.id] ?? []).includes(r.id) ? 1 : 0) - (!on && (MY_REACTIONS[post.id] ?? []).includes(r.id) ? 1 : 0);
          return (
            <button key={r.id} type="button" onClick={() => onReact(r.id)} aria-pressed={on} aria-label={`${r.label}${n ? `，${n} 人` : ''}`} className={cx('p4g-press inline-flex items-center gap-1 rounded-xs border-thin px-1.5 py-0.5 font-display text-2xs font-bold', on ? 'border-p4g-black bg-p4g-black text-p4g-yellow night:border-p4g-yellow' : n ? 'border-p4g-line bg-p4g-surface-2 text-p4g-ink' : 'border-dashed border-p4g-line/60 text-p4g-ink-soft')}>
              {r.label}{n > 0 && <span className="p4g-num-upright">{n}</span>}
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
    <div className="relative min-w-0 overflow-hidden rounded-sm border-3 border-p4g-black bg-p4g-yellow px-3 py-2.5 text-p4g-black shadow-[4px_4px_0_var(--p4g-orange)] night:border-p4g-yellow">
      <div aria-hidden className="absolute inset-y-0 right-0 w-10 p4g-hazard opacity-25" />
      <div className="relative flex items-center gap-2">
        <span className="shrink-0 whitespace-nowrap rounded-xs bg-p4g-black px-2 py-[3px] font-display text-2xs font-bold text-p4g-yellow">✦ {c.kind === 'big' ? '作战' : '目标'}达成</span>
        <span className="min-w-0 truncate text-2xs font-bold">{Number(c.day.slice(5, 7))}月{Number(c.day.slice(8, 10))}日</span>
        <button type="button" onClick={onMore} aria-label="更多操作" className="-mr-1 ml-auto shrink-0 px-1.5 font-display text-h3 font-bold leading-none">⋯</button>
      </div>
      <div className="relative mt-1 font-display text-lead font-bold">{c.title}</div>
      <div className="relative mt-1 flex flex-wrap gap-1">{c.participants.map((p) => <span key={p.userId} className="rounded-xs bg-white px-1.5 font-display text-2xs font-bold">{p.codename}</span>)}</div>
    </div>
  );
}

function RaidCard({ view }: { view: OrgView }) {
  const left = Math.round((RAID.left / RAID.hpMax) * 100);
  return (
    <div className="relative min-w-0 overflow-hidden rounded-sm border-3 border-p4g-black bg-[#151208] px-3 py-2.5 text-white shadow-[4px_4px_0_var(--p4g-orange)] night:border-p4g-yellow">
      <div className="flex min-w-0 items-center gap-2">
        <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-xs bg-p4g-yellow px-2 py-[3px] font-display text-2xs font-bold text-p4g-black">☾ 满月团战 · 还差 {left}%</span>
        <span className="min-w-0 truncate text-2xs font-bold text-white/70">{Number(RAID.nights[1].slice(5, 7))}月{Number(RAID.nights[1].slice(8, 10))}日 满月</span>
      </div>
      <div className="mt-1 text-meta font-bold">全队打掉 <span className="p4g-num text-p4g-yellow">{RAID.hpMax - RAID.left}</span> / {RAID.hpMax}</div>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {RAID.hitters.map((h) => { const m = view.members.find((x) => x.userId === h.userId); return <span key={h.userId} className="rounded-xs bg-white/10 px-1.5 py-0.5 text-2xs font-bold"><span className="font-display">{m?.userId === view.me.userId ? '我' : m?.codename ?? '已退出的成员'}</span> · 出手 {h.nights} 晚{h.allout ? ' · 总攻击' : ''}</span>; })}
      </div>
    </div>
  );
}

function MinutesCard({ post }: { post: OrgPost }) {
  const m = post.minutes!;
  const [open, setOpen] = useState(true);
  const label = (t: string) => <div className="mb-1 font-display text-2xs font-bold uppercase tracking-[0.18em] text-p4g-ink-soft">{t}</div>;
  return (
    <div className="min-w-0 rounded-sm border-3 border-p4g-line bg-p4g-surface-2 shadow-hard-sm">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full min-w-0 items-center gap-2 px-3 py-2.5 text-left">
        <span className="shrink-0 whitespace-nowrap rounded-xs bg-p4g-black px-2 py-[3px] font-display text-2xs font-bold text-p4g-yellow night:bg-p4g-yellow night:text-p4g-black">会议纪要</span>
        <span className="min-w-0 flex-1 truncate font-display text-body font-bold text-p4g-ink">第 12 周<span className="ml-1.5 text-2xs text-p4g-ink-soft">{Number(m.week.slice(5, 7))}/{Number(m.week.slice(8, 10))} 起</span></span>
        <span className="shrink-0 p4g-num-upright text-2xs font-bold text-p4g-ink-soft">出席 {m.goals.length} / {m.goals.length + m.absent.length}</span>
        <span aria-hidden className="shrink-0 font-display text-2xs font-bold text-p4g-ink-soft">{open ? '收起' : '展开'}</span>
      </button>
      {open && (
        <div className="space-y-3 border-t-2 border-dashed border-p4g-line/40 px-3 pb-3 pt-2.5">
          <div>{label('这周的目标')}<div className="flex items-baseline gap-1"><span className="p4g-num text-h1 leading-none text-p4g-tag night:text-p4g-yellow">{m.rate.done}</span><span className="p4g-num text-h3 text-p4g-ink">/ {m.rate.total}</span><span className="text-meta font-bold text-p4g-ink-soft">人做到了</span></div></div>
          <div>{label('本周称号')}<div className="flex flex-wrap gap-1.5">{m.titles.map((t) => <span key={t.userId + t.title} className="rounded-xs bg-p4g-black px-1.5 py-0.5 font-display text-2xs font-bold text-p4g-yellow night:bg-p4g-yellow night:text-p4g-black">{t.codename} · {t.title}</span>)}</div></div>
          <div>{label('下周目标')}<ul className="space-y-1">{m.goals.map((g) => <li key={g.userId} className="flex min-w-0 gap-2 text-meta"><span className="w-12 shrink-0 truncate font-display font-bold text-p4g-ink">{g.codename}</span><span className="min-w-0 text-p4g-ink">「{g.goal}」</span></li>)}</ul></div>
          {m.absent.length > 0 && <div className="text-2xs font-bold text-p4g-ink-soft">缺席：{m.absent.map((a) => a.codename).join('、')}</div>}
        </div>
      )}
    </div>
  );
}
