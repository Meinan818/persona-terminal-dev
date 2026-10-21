/**
 * 倒计时（宣告卡）区块 CallingCardSection + CallingCardCard（真实 src/components/callingCard/CallingCardSection.tsx / CallingCardCard.tsx）。
 * 挂在行动·任务页 GoalDeck 的「倒计时」面（pkg4 的 Todos.p5r.tsx 里 `<CallingCardSection />` 直接嵌入；id="calling-card-section"）。
 * 结构照真实：区块标题「倒计时」（纸色 + 墨影）+ 红「CALLING CARD」+「+ 新建」→ 空态「✦ 还没有倒计时 — 立下约定」
 *   → 卡列表（单行：图标 + 标题 + PINNED 小签 + 状态文字〔还剩 N 天 / 就是今天 / 已完成 x/y 项〕+ 百分比 + ⋯，下方 4px 进度条；点卡 = 编辑）
 *   → ⋯ 菜单（📌 钉到主页 / 取消钉选、编辑、手动归档、删除）→ 删除走 ConfirmDialog；手动归档 → CallingCardCutIn（已收）
 *   → 「› 归档 · N」折叠区（已达成 / 已至期 / 已收存 + 取消归档 / 删除）。
 * 新建 / 编辑 = CallingCardEditor 抽屉（P0-07）。视觉：v3 黑长条 + 纸白字 + 红进度（.ccs-*）。
 * props：empty（演示空态）、initialMenu（演示 ⋯ 菜单打开）。
 */
import { useEffect, useRef, useState } from 'react';
import { Portal } from '@/p5r-red/kit/Portal';
import { P5Sparkle } from '@/p5r-red/kit/p5r';
import { toast } from '@/p5r-red/kit/P5Toast';
import { sfx } from '@/p5r-red/fx/sfx';
import { isLowMotion } from '@/p5r-red/lib/prefs';
import { CALLING_CARDS, CALLING_ARCHIVED, ccDaysLeft, ccPct, type MockCC } from '@/p5r-red/mock/pkg5-data';
import { CallingCardEditor } from '@/p5r-red/screens/overlays/CallingCardEditor.p5r';
import { CallingCardDeleteConfirm } from '@/p5r-red/screens/overlays/CallingCardSectionDeleteConfirm.p5r';
import { CallingCardCutIn, type CCCutInCard } from '@/p5r-red/screens/overlays/CallingCardCutIn.p5r';
import '../pkg5.p5r.css';

const summaryOf = (c: MockCC) => {
  if (c.archived) return c.archiveReason === 'auto_todos' ? '已达成' : c.archiveReason === 'auto_date' ? '已至期' : '已收存';
  if (c.mode === 'todos') return `已完成 ${c.todosDone ?? 0}/${c.todosTotal ?? 0} 项`;
  const d = ccDaysLeft(c.targetDate); return d === 0 ? '就是今天' : `还剩 ${d} 天`;
};

function CardMenu({ c, onPin, onEdit, onArchive, onUnarchive, onDelete, initialOpen }: { c: MockCC; onPin?: () => void; onEdit?: () => void; onArchive?: () => void; onUnarchive?: () => void; onDelete: () => void; initialOpen?: boolean }) {
  const [open, setOpen] = useState(!!initialOpen), [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const btn = useRef<HTMLButtonElement>(null), pop = useRef<HTMLDivElement>(null);
  const place = () => { const r = btn.current!.getBoundingClientRect(); setPos({ left: Math.max(8, Math.min(innerWidth - 168, r.right - 160)), top: r.bottom + 4 }); };
  useEffect(() => { if (open) place(); }, [open]);
  useEffect(() => {
    if (!open) return;
    const d = (e: PointerEvent) => { if (!pop.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', d); return () => document.removeEventListener('pointerdown', d);
  }, [open]);
  const run = (fn?: () => void) => () => { setOpen(false); fn?.(); };
  return (
    <>
      <button ref={btn} type="button" className="ccs-more" aria-label="菜单" aria-expanded={open} onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}>⋯</button>
      {open && pos && (
        <Portal>
          <div ref={pop} className="ccs-pop" style={{ left: pos.left, top: pos.top }} role="menu" onClick={(e) => e.stopPropagation()}>
            {onPin && <button type="button" role="menuitem" onClick={run(onPin)}>{c.pinned ? '取消钉选' : '钉到主页'}</button>}
            {onEdit && <button type="button" role="menuitem" onClick={run(onEdit)}>编辑</button>}
            {onArchive && <button type="button" role="menuitem" onClick={run(onArchive)}>手动归档</button>}
            {onUnarchive && <button type="button" role="menuitem" onClick={run(onUnarchive)}>取消归档</button>}
            <button type="button" role="menuitem" className="danger" onClick={run(onDelete)}>删除</button>
          </div>
        </Portal>
      )}
    </>
  );
}

function CCRow({ c, onClick, menu, i }: { c: MockCC; onClick?: () => void; menu: React.ReactNode; i: number }) {
  const pct = c.archived ? 100 : ccPct(c), s = summaryOf(c);
  return (
    <div className={`ccs-card${c.archived ? ' arc' : ''}`} style={{ ['--r' as string]: `${i % 2 ? 0.5 : -0.5}deg` }} role="button" tabIndex={0} aria-label={`倒计时：${c.title}，${s}，${pct}%`} onClick={onClick} onKeyDown={(e) => { if (e.key === 'Enter') onClick?.(); }}>
      <div className="ccs-line">
        <span className="ccs-ic" aria-hidden="true">{c.icon || '✦'}</span>
        <b className="ccs-t">{c.title}</b>
        {c.pinned && !c.archived && <span className="ccs-pin">PINNED</span>}
        {s && <span className="ccs-s">{s}</span>}
        <span className="ccs-pct">{pct}%</span>
        {menu}
      </div>
      <span className="ccs-bar"><i style={{ transform: `scaleX(${pct / 100})` }} /></span>
    </div>
  );
}

export function CallingCardSection({ empty = false, initialMenu = false, sectionId = 'calling-card-section' }: { empty?: boolean; initialMenu?: boolean; sectionId?: string }) {
  const [cards, setCards] = useState<MockCC[]>(() => (empty ? [] : CALLING_CARDS.map((c) => ({ ...c }))));
  const [archived, setArchived] = useState<MockCC[]>(() => (empty ? [] : CALLING_ARCHIVED.map((c) => ({ ...c }))));
  const [arcOpen, setArcOpen] = useState(false);
  const [editor, setEditor] = useState<{ open: boolean; card: MockCC | null }>({ open: false, card: null });
  const [del, setDel] = useState<MockCC | null>(null);
  const [cut, setCut] = useState<CCCutInCard | null>(null);
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    if (isLowMotion() || !root.current) return;
    const a = [...root.current.querySelectorAll('.ccs-card')].map((el, i) => el.animate([{ opacity: 0, transform: 'translateX(46px) skewX(-8deg)' }, { opacity: 1, transform: 'none' }], { duration: 260, delay: i * 45, easing: 'cubic-bezier(.2,.9,.3,1)', fill: 'backwards' }));
    return () => a.forEach((x) => x.cancel());
  }, []);
  const active = [...cards].sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned));
  const openCreate = () => { sfx('nav', 0.4); setEditor({ open: true, card: null }); };
  const archive = (c: MockCC) => { setCards((p) => p.filter((x) => x.id !== c.id)); setArchived((p) => [{ ...c, archived: true, archiveReason: 'manual', pinned: false }, ...p]); setCut({ id: c.id, title: c.title, subtitle: c.subtitle, icon: c.icon, texture: c.texture, archiveReason: 'manual' }); };
  return (
    <section id={sectionId} className="ccs" ref={root}>
      <div className="ccs-hd">
        <div className="ccs-ttl"><h3>倒计时</h3><span>Calling Card</span></div>
        <button type="button" className="ccs-new" onClick={openCreate}>+ 新建</button>
      </div>
      <div className="ccs-list">
        {active.length === 0 && archived.length === 0 && (
          <button type="button" className="ccs-empty" onClick={openCreate}><P5Sparkle size={14} color="var(--red)" /><span>还没有倒计时 — 立下约定</span></button>
        )}
        {active.map((c, i) => (
          <CCRow key={c.id} c={c} i={i} onClick={() => setEditor({ open: true, card: c })} menu={
            <CardMenu c={c} initialOpen={initialMenu && i === 0}
              onPin={() => { setCards((p) => p.map((x) => ({ ...x, pinned: x.id === c.id ? !c.pinned : false }))); toast(c.pinned ? '已取消钉选' : '已钉到主页'); }}
              onEdit={() => setEditor({ open: true, card: c })} onArchive={() => archive(c)} onDelete={() => setDel(c)} />
          } />
        ))}
        {archived.length > 0 && (
          <div className="ccs-arc">
            <button type="button" className="ccs-arc-h" aria-expanded={arcOpen} onClick={() => setArcOpen((v) => !v)}><i className={arcOpen ? 'on' : ''}>›</i><span>归档</span><small>· {archived.length}</small></button>
            {arcOpen && archived.map((c, i) => (
              <CCRow key={c.id} c={c} i={i} menu={<CardMenu c={c} onUnarchive={() => { setArchived((p) => p.filter((x) => x.id !== c.id)); setCards((p) => [...p, { ...c, archived: false, archiveReason: undefined }]); }} onDelete={() => setDel(c)} />} />
            ))}
          </div>
        )}
      </div>
      <CallingCardEditor open={editor.open} initial={editor.card} onClose={() => setEditor((e) => ({ ...e, open: false }))}
        onSaved={(patch, isNew) => { if (isNew) toast('预告已发出'); setCards((p) => isNew ? [...(patch.pinned ? p.map((x) => ({ ...x, pinned: false })) : p), { id: `cc${Date.now()}`, icon: '✦', texture: 'lines', mode: 'deadline', startDate: '', targetDate: '', title: '', ...patch } as MockCC] : p.map((x) => (x.id === editor.card?.id ? { ...x, ...patch } : patch.pinned ? { ...x, pinned: false } : x))); }} />
      <CallingCardDeleteConfirm open={!!del} title={del?.title ?? ''} onClose={() => setDel(null)} onConfirm={() => { const id = del?.id; setCards((p) => p.filter((x) => x.id !== id)); setArchived((p) => p.filter((x) => x.id !== id)); }} />
      <CallingCardCutIn card={cut} onClose={() => setCut(null)} />
    </section>
  );
}
export default CallingCardSection;
