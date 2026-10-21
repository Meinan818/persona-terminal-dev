/**
 * 新建 / 编辑倒计时（宣告卡编辑器，真实 src/components/callingCard/CallingCardEditor.tsx）：
 * 模式 日期 / 任务清单 / 兼有（三句说明）；标题；宣告台词（可选）；日期 起算日 / 目标日（校验 + 共 N 天 · 还剩 · 已征途）；
 * 关联任务（已选 N / 7，每页 5 条，‹ 上一组 / 下一组 ›）；纹理 / 图标；📌 钉到首页；✦ 立此宣告 / 保存修改。?variant=edit 编辑态。
 */
import { useEffect, useState, type ReactNode } from 'react';
import type { CallingCard, CallingCardTone } from '@/types';
import type { OverlayProps } from '@yellow/registry/types';
import { P4Button, P4Input, P4Sheet, P4Switch, IconCheck, useToast } from '@yellow/kit';
import { TODAY_KEY, useCallingCardData, futureDate } from '@yellow/adapters/callingCards';
import { daysBetween } from '@yellow/screens/pkg2/common';
import { toneBg } from '@yellow/screens/pkg2/tones';
import { cx } from '@yellow/lib/cx';

const ICONS = ['✦', '⚔️', '🦋', '🔥', '◈', '✧', '🎯', '🏔️'];
const TONES: { id: CallingCardTone; label: string }[] = [{ id: 'lines', label: '斜纹' }, { id: 'grid', label: '网格' }, { id: 'dots', label: '点阵' }, { id: 'plain', label: '纯色' }];
const PER = 5; const MAX = 7;
const Section = ({ label, children }: { label: ReactNode; children: ReactNode }) => (
  <section className="min-w-0"><div className="mb-1.5 inline-block bg-p4g-black px-2 py-0.5 font-display text-meta font-bold text-p4g-yellow night:bg-p4g-yellow night:text-p4g-black" style={{ clipPath: 'polygon(0 0,100% 0,calc(100% - 8px) 100%,0 100%)' }}><span className="pr-2">{label}</span></div>{children}</section>
);

export default function CallingCardEditor({ open, onClose, params, initialCard, onSave }: OverlayProps & { initialCard?: CallingCard | null; onSave?: (c: CallingCard) => void }) {
  const { CALLING_CARDS, TODOS } = useCallingCardData();
  const toast = useToast();
  const init = initialCard ?? (params?.get('variant') === 'edit' ? CALLING_CARDS[0] : null);
  const [mode, setMode] = useState<CallingCard['mode']>('deadline');
  const [title, setTitle] = useState('');
  const [sub, setSub] = useState('');
  const [start, setStart] = useState(TODAY_KEY);
  const [target, setTarget] = useState(futureDate());
  const [linked, setLinked] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [tone, setTone] = useState<CallingCardTone>('lines');
  const [icon, setIcon] = useState('✦');
  const [pinned, setPinned] = useState(false);
  useEffect(() => {
    if (!open) return;
    setMode(init?.mode ?? 'deadline'); setTitle(init?.title ?? ''); setSub(init?.subtitle ?? ''); setStart(init?.startDate ?? TODAY_KEY);
    setTarget(init?.targetDate ?? futureDate()); setLinked(init?.linkedTodoIds ?? []); setTone(init?.tone ?? 'lines'); setIcon(init?.icon ?? '✦'); setPinned(init?.pinned ?? false); setPage(0);
  }, [open, initialCard]); // eslint-disable-line
  const active = TODOS.filter((t) => t.isActive && !t.completedAt && !t.archivedAt);
  const pages = Math.max(1, Math.ceil(active.length / PER));
  const pageTodos = active.slice(page * PER, (page + 1) * PER);
  const needDate = mode !== 'todos';
  const needTodos = mode !== 'deadline';
  const errStart = needDate && start > target;
  const errPast = needDate && target < TODAY_KEY;
  const otherPinned = CALLING_CARDS.some((c) => c.pinned && c.id !== init?.id);
  const preview = needDate && !errStart && !errPast ? { total: daysBetween(start, target), left: daysBetween(TODAY_KEY, target), elapsed: Math.max(0, daysBetween(start, TODAY_KEY)) } : null;
  const valid = title.trim() && (!needDate || (!errStart && !errPast)) && (!needTodos || linked.length > 0);
  const save = () => {
    if (!valid) return;
    const c = { id: init?.id ?? `cc${Date.now()}`, title: title.trim(), subtitle: sub.trim() || undefined, mode, startDate: start, targetDate: needDate ? target : undefined, linkedTodoIds: needTodos ? linked : undefined, tone, icon, pinned, archived: false } as CallingCard;
    onSave ? onSave(c) : toast.success(init ? '已保存修改' : '宣告已立下');
    onClose();
  };
  return (
    <P4Sheet open={open} onClose={onClose} title={init ? '编辑倒计时' : '新建倒计时'} en="CALLING CARD" size="tall"
      footer={<P4Button block size="lg" disabled={!valid} onClick={save}>{init ? '保存修改' : '✦ 立此宣告'}</P4Button>}>
      <div className="space-y-4">
        <Section label="模式">
          <div className="grid grid-cols-3 gap-2">
            {(['deadline', 'todos', 'both'] as const).map((m) => (
              <button key={m} type="button" onClick={() => setMode(m)} aria-pressed={mode === m} className={cx('p4g-press rounded-sm border-3 py-2 font-display text-body font-bold', mode === m ? 'border-p4g-black bg-p4g-select text-[color:var(--p4g-select-ink)] shadow-hard-sm' : 'border-p4g-line bg-p4g-surface text-p4g-ink')}>
                {m === 'deadline' ? '日期' : m === 'todos' ? '任务清单' : '兼有'}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-cap text-p4g-ink-soft">
            {mode === 'deadline' && '只看日期：到那天自动归档（"时之至"）'}
            {mode === 'todos' && '只看任务：选定项全部完成时自动归档（"达成"）'}
            {mode === 'both' && '两条都设：先到的为准（先做完所有任务 / 先到日子）'}
          </p>
        </Section>
        <Section label="标题"><P4Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例如 高考 / 婚礼 / v3 上线" maxLength={24} aria-label="标题" /></Section>
        <Section label="宣告台词（可选）"><P4Input value={sub} onChange={(e) => setSub(e.target.value)} placeholder="命运在此倾覆 / 我宣告 …" maxLength={40} aria-label="宣告台词" /></Section>
        {needDate && (
          <Section label="日期">
            <div className="grid grid-cols-2 gap-2">
              <label className="min-w-0"><div className="mb-1 text-2xs font-bold text-p4g-ink-soft">起算日</div><P4Input type="date" value={start} onChange={(e) => setStart(e.target.value)} aria-label="起算日" /></label>
              <label className="min-w-0"><div className="mb-1 text-2xs font-bold text-p4g-ink-soft">目标日</div><P4Input type="date" value={target} onChange={(e) => setTarget(e.target.value)} aria-label="目标日" /></label>
            </div>
            {errStart && <p className="mt-1 text-cap font-bold text-p4g-danger">起算日不能晚于目标日</p>}
            {errPast && <p className="mt-1 text-cap font-bold text-p4g-danger">目标日不能早于今天</p>}
            {preview && <p className="mt-1.5 text-meta text-p4g-ink-soft">共 <b className="p4g-num text-p4g-ink">{preview.total}</b> 天 · 还剩 <b className="p4g-num text-p4g-orange-deep night:text-p4g-orange">{preview.left}</b> 天 · 已征途 <b className="p4g-num text-p4g-ink">{preview.elapsed}</b> 天</p>}
          </Section>
        )}
        {needTodos && (
          <Section label={`关联任务（已选 ${linked.length} / ${MAX}）`}>
            {active.length === 0 ? <p className="text-meta text-p4g-ink-soft">还没有活跃任务。先到上方"任务"区添加，再回来选。</p> : (
              <>
                <div className="grid grid-cols-1 gap-1.5">
                  {pageTodos.map((t) => {
                    const on = linked.includes(t.id);
                    return (
                      <button key={t.id} type="button" disabled={!on && linked.length >= MAX} onClick={() => setLinked((l) => (on ? l.filter((x) => x !== t.id) : [...l, t.id]))} aria-pressed={on}
                        className={cx('flex min-w-0 items-center gap-2 rounded-sm border-thin px-2.5 py-2 text-left disabled:opacity-40', on ? 'border-p4g-black bg-p4g-yellow text-p4g-black' : 'border-p4g-line bg-p4g-surface text-p4g-ink')}>
                        <span className={cx('flex h-5 w-5 shrink-0 items-center justify-center border-3', on ? 'border-p4g-black bg-p4g-black text-p4g-yellow' : 'border-current')}>{on && <IconCheck size={11} />}</span>
                        <span className="min-w-0 flex-1 truncate text-body font-bold">{t.title}</span>
                        <span className="shrink-0 text-2xs font-bold opacity-70">{t.repeatDaily ? '每日' : t.isLongTerm ? '长期' : '单次'}</span>
                      </button>
                    );
                  })}
                </div>
                {pages > 1 && (
                  <div className="mt-2 flex items-center justify-between font-display text-meta font-bold text-p4g-ink">
                    <button type="button" disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="disabled:opacity-30">‹ 上一组</button>
                    <span className="p4g-num">{page + 1}/{pages}</span>
                    <button type="button" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)} className="disabled:opacity-30">下一组 ›</button>
                  </div>
                )}
              </>
            )}
          </Section>
        )}
        <Section label="纹理 / 图标">
          <div className="grid grid-cols-4 gap-2">
            {TONES.map((o) => (
              <button key={o.id} type="button" onClick={() => setTone(o.id)} aria-pressed={tone === o.id} className={cx('min-w-0 overflow-hidden rounded-sm border-3 text-center', tone === o.id ? 'border-p4g-black shadow-hard-sm' : 'border-p4g-line/40')}>
                <div className="h-9 bg-p4g-yellow" style={{ background: `${toneBg(o.id)}, var(--p4g-yellow)` }} />
                <div className={cx('py-0.5 font-display text-cap font-bold', tone === o.id ? 'bg-p4g-black text-p4g-yellow' : 'bg-p4g-surface text-p4g-ink')}>{o.label}</div>
              </button>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {ICONS.map((em) => <button key={em} type="button" onClick={() => setIcon(em)} aria-pressed={icon === em} aria-label={`图标 ${em}`} className={cx('flex h-10 w-10 items-center justify-center rounded-sm border-3 text-[18px]', icon === em ? 'border-p4g-black bg-p4g-yellow text-p4g-black shadow-hard-sm' : 'border-p4g-line/40 bg-p4g-surface text-p4g-ink')}>{em}</button>)}
          </div>
        </Section>
        <div className="flex items-start gap-3 rounded-sm border-3 border-p4g-line bg-p4g-surface p-3">
          <div className="min-w-0 flex-1"><div className="font-display text-body font-bold text-p4g-ink">📌 钉到首页</div><div className="text-cap text-p4g-ink-soft">{otherPinned ? '会替换当前已钉选的另一张卡' : '在 HERO 卡片上常驻显示这张卡'}</div></div>
          <P4Switch checked={pinned} onChange={setPinned} aria-label="钉到首页" />
        </div>
      </div>
    </P4Sheet>
  );
}
