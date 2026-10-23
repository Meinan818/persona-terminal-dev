/**
 * 宣告卡总览页（用户追加：真实 app 暂无；参考红色 p5r-v3 #/callingcard，按粉白 P3R 重画）。入口：菜单「宣告卡」（占卜之后）。
 * 页头「宣告卡 · CALLING CARD」+「＋ 新建」→ 分组：钉选 / 进行中 / 已收 / 过期（P3R 斜条节标 + 计数）→ 宣告卡斜卡（纹理底 + 图标斜块 +
 * 标题 / 台词 + 「还剩 N 天」窄斜体巨数 + 模式签 + 进度条 + 行动作：钉到主页 / 取消钉选 · 编辑 · 收存 · 删除；已收 / 过期：恢复 · 删除）。
 * 入场：卡片自右斜飞入 + 逐张错帧（spring 200/20，对应红版预告信飞入的 P3R 版）。
 * 新建 / 编辑：优先打开 P2 登记的 overlay `actions-calling-card-editor`（只读 registry），未登记时用页内抽屉；保存后 CutInSweep「CALLING」横扫。
 * 删除：P3R 系统确认框。收存：卡片收起 → 打开 P6 `global-calling-card-cutin?reason=manual`（宣告卡结算 · 已收）。
 * 路由：?state=empty（空态）| loading ；?open=new|edit|delete|archive 直达。
 */
import { Suspense, useEffect, useMemo, useState, type ComponentType, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { PageProps } from '@pink/registry/types';
import type { CallingCard } from '@real/types';
import { OVERLAYS } from '@pink/registry/overlays';
import { lazyOf } from '@pink/shell/lazyRegistry';
import { P3PageHeader, P3Button, P3Dialog, P3Sheet, P3Input, P3Segment, P3OnOff, P3R, slantClip, tickClip, useToast, GhostWords } from '@pink/kit';
import { CutInSweep } from '@pink/fx';
import { navigate } from '@pink/shell/shellBus';
import { useBoldness } from '@pink/lib/prefs';
import { FLabel, LoadingBlock } from '@pink/screens/pkg5/ui';
import { CC_MODE_LABEL } from '@pink/mock/pkg5-callingcards';
import { callingCardOps, CC_TODAY, ccDaysLeft, ccProgress, useCallingCardData } from '@pink/adapters/callingCards';

type Group = 'pinned' | 'active' | 'kept' | 'expired';
const GROUPS: { id: Group; title: string; en: string }[] = [
  { id: 'pinned', title: '钉选', en: 'PINNED' }, { id: 'active', title: '进行中', en: 'ACTIVE' }, { id: 'kept', title: '已收', en: 'KEPT' }, { id: 'expired', title: '过期', en: 'EXPIRED' },
];
const groupOf = (c: CallingCard): Group => (c.archived ? (c.archiveReason === 'auto_date' ? 'expired' : 'kept') : (c.targetDate && (ccDaysLeft(c.targetDate) ?? 1) < 0 ? 'expired' : c.pinned ? 'pinned' : 'active'));

const texture = (tone: CallingCard['tone']) => tone === 'grid'
  ? 'repeating-linear-gradient(0deg, rgb(var(--p3r-blue-rgb) / 0.08) 0 1px, transparent 1px 14px), repeating-linear-gradient(90deg, rgb(var(--p3r-blue-rgb) / 0.08) 0 1px, transparent 1px 14px)'
  : tone === 'dots' ? 'radial-gradient(rgb(var(--p3r-blue-rgb) / 0.16) 1.4px, transparent 1.6px) 0 0 / 12px 12px'
    : tone === 'plain' ? 'none' : 'repeating-linear-gradient(-60deg, rgb(var(--p3r-blue-rgb) / 0.08) 0 6px, transparent 6px 16px)';

function CardSlab({ c, i, linked, onAct }: { c: CallingCard; i: number; linked?: { done: number; total: number }; onAct: (a: string) => void }) {
  const anim = useBoldness();
  const g = groupOf(c);
  const dead = g === 'kept' || g === 'expired';
  const left = ccDaysLeft(c.targetDate);
  const p = ccProgress(c);
  const l = linked;
  const Act = ({ id, children, tone = 'glass' }: { id: string; children: ReactNode; tone?: 'glass' | 'ink' | 'coral' | 'rose' }) => (
    <button type="button" onClick={() => onAct(id)} className="shrink-0 px-3.5 py-1.5 text-[12px] font-black active:scale-95"
      style={{ clipPath: slantClip(6), background: tone === 'ink' ? P3R.ink : tone === 'coral' ? 'rgb(var(--p3r-magenta-rgb) / 0.14)' : tone === 'rose' ? P3R.blue : 'var(--p3r-chip)', color: tone === 'ink' ? 'var(--p3r-on-ink)' : tone === 'coral' ? 'var(--p3r-coral-ink)' : tone === 'rose' ? P3R.onBlue : P3R.ink }}>{children}</button>
  );
  return (
    <motion.article layout={anim} className="relative min-w-0" style={{ filter: 'drop-shadow(0 12px 24px rgb(var(--p3r-ink-rgb) / 0.1))' }}
      initial={anim ? { opacity: 0, x: 80, rotate: 6 } : false} animate={{ opacity: 1, x: 0, rotate: 0 }} exit={anim ? { opacity: 0, y: 40, rotate: 10, scale: 0.85 } : { opacity: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20, delay: anim ? 0.08 + i * 0.08 : 0 }}>
      <div className="relative overflow-hidden" style={{ clipPath: slantClip(18), background: dead ? 'var(--p3r-row-alt)' : P3R.panel }}>
        <div aria-hidden className="absolute inset-0" style={{ background: texture(c.tone), opacity: dead ? 0.5 : 1 }} />
        {c.pinned && !dead && <span aria-hidden className="absolute left-0 top-0 h-full w-[10px]" style={{ background: P3R.blue, clipPath: 'polygon(0 0, 100% 0, 30% 100%, 0 100%)' }} />}
        <div className="relative flex min-w-0 items-start gap-3 px-6 pb-3 pt-4">
          <span aria-hidden className="flex h-12 w-12 shrink-0 items-center justify-center text-[22px]" style={{ clipPath: slantClip(7), background: dead ? P3R.grey : i % 2 ? P3R.cyan : P3R.blue, color: i % 2 && !dead ? 'var(--p3r-mulberry)' : P3R.onBlue }}>{c.icon ?? '✦'}</span>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="font-cond text-[11px] tracking-[0.18em]" style={{ color: P3R.roseInk }}>{c.pinned && !dead ? 'PINNED · 宣言' : 'CALLING CARD'}</span>
              <span className="shrink-0 px-1.5 text-[10px] font-black" style={{ background: 'var(--p3r-chip)', color: P3R.ink, clipPath: slantClip(3) }}>{CC_MODE_LABEL[c.mode]}</span>
            </div>
            <div className="truncate font-heavy text-[18px] leading-tight" style={{ color: dead ? P3R.inkSoft : P3R.ink }}>{c.title}</div>
            {c.subtitle && <div className="truncate text-[12px] font-bold" style={{ color: P3R.grey }}>「{c.subtitle}」</div>}
          </div>
          <div className="shrink-0 text-right">
            {g === 'kept' ? <span className="inline-block px-2.5 py-1 font-cond text-[13px]" style={{ background: P3R.blue, color: P3R.onBlue, clipPath: slantClip(5), transform: 'rotate(-6deg)' }}>{c.archiveReason === 'auto_todos' ? 'CLEARED' : 'KEPT'}</span>
              : g === 'expired' ? <span className="inline-block px-2.5 py-1 font-cond text-[13px]" style={{ background: P3R.magenta, color: '#fff', clipPath: slantClip(5), transform: 'rotate(-6deg)' }}>EXPIRED</span>
                : left != null ? (<><div className="text-[10px] font-black" style={{ color: P3R.grey }}>还剩</div><div className="font-cond text-[34px] leading-none" style={{ color: left <= 3 ? 'var(--p3r-coral-ink)' : P3R.blue }}>{left}</div><div className="text-[10px] font-black" style={{ color: P3R.grey }}>天 · {c.targetDate!.slice(5).replace('-', '.')}</div></>)
                  : l ? (<><div className="text-[10px] font-black" style={{ color: P3R.grey }}>已完成</div><div className="font-cond text-[30px] leading-none" style={{ color: P3R.blue }}>{l.done}<span className="text-[16px] opacity-60">/{l.total}</span></div></>) : null}
          </div>
        </div>
        {!dead && (
          <div className="relative flex items-center gap-2 px-6 pb-2">
            {c.mode === 'both' && l && <span className="shrink-0 text-[11px] font-black" style={{ color: P3R.inkSoft }}>任务 {l.done}/{l.total}</span>}
            <span className="relative h-[6px] min-w-0 flex-1 overflow-hidden" style={{ background: 'var(--p3r-track)', clipPath: slantClip(2) }}>
              <motion.span className="absolute inset-y-0 left-0 w-full origin-left" style={{ background: `linear-gradient(90deg, ${P3R.blue}, ${P3R.cyan})` }} initial={anim ? { scaleX: 0 } : false} animate={{ scaleX: p }} transition={{ duration: 0.7, delay: 0.2 + i * 0.08 }} />
            </span>
            <span className="shrink-0 font-cond text-[13px]" style={{ color: P3R.blue }}>{Math.round(p * 100)}%</span>
          </div>
        )}
        {dead && <div className="relative px-6 pb-2 text-[11px] font-bold" style={{ color: P3R.grey }}>{g === 'expired' ? '目标日已过 · 时之至' : c.archiveReason === 'auto_todos' ? '关联任务全部达成 · 自动收存' : '手动收存于档案'}{c.archivedAt ? ` · ${c.archivedAt.getMonth() + 1}月${c.archivedAt.getDate()}日` : ''}</div>}
        <div className="relative flex flex-wrap justify-end gap-1.5 px-5 pb-3.5">
          {dead ? (<><Act id="restore">恢复</Act><Act id="delete" tone="coral">删除</Act></>) : (<>
            <Act id="pin">{c.pinned ? '取消钉选' : '钉到主页'}</Act>
            <Act id="edit" tone="ink">编辑</Act>
            <Act id="archive" tone="rose">收存</Act>
            <Act id="delete" tone="coral">删除</Act>
          </>)}
        </div>
      </div>
    </motion.article>
  );
}

/** 页内回退编辑抽屉（P2 `actions-calling-card-editor` 未登记时用；字段同真实 CallingCardEditor 精简：模式 / 标题 / 台词 / 目标日 / 钉到首页） */
function FallbackEditor({ open, onClose, initial, onSave }: { open: boolean; onClose: () => void; initial: CallingCard | null; onSave: (c: CallingCard) => void }) {
  const [mode, setMode] = useState<CallingCard['mode']>('deadline');
  const [title, setTitle] = useState('');
  const [sub, setSub] = useState('');
  const [date, setDate] = useState('2026-12-31');
  const [pinned, setPinned] = useState(false);
  useEffect(() => { if (open) { setMode(initial?.mode ?? 'deadline'); setTitle(initial?.title ?? ''); setSub(initial?.subtitle ?? ''); setDate(initial?.targetDate ?? '2026-12-31'); setPinned(!!initial?.pinned); } }, [open, initial]);
  const bad = mode !== 'todos' && date < CC_TODAY;
  return (
    <P3Sheet open={open} onClose={onClose} title={initial ? '编辑倒计时' : '新建倒计时'} en="CALLING CARD"
      footer={<P3Button block size="lg" corner disabled={!title.trim() || bad} onClick={() => { onSave({ ...(initial ?? { id: `cc_${Date.now()}`, startDate: CC_TODAY, tone: 'lines', archived: false, createdAt: new Date() } as CallingCard), title: title.trim(), subtitle: sub.trim() || undefined, mode, targetDate: mode === 'todos' ? undefined : date, pinned }); onClose(); }}>{initial ? '保存修改' : '✦ 立此宣告'}</P3Button>}>
      <div className="flex min-w-0 flex-col gap-4 pt-1">
        <div className="flex flex-col gap-2"><FLabel>模式</FLabel><P3Segment value={mode} onChange={(v) => setMode(v as CallingCard['mode'])} items={[{ id: 'deadline', label: '日期' }, { id: 'todos', label: '任务清单' }, { id: 'both', label: '兼有' }]} /></div>
        <div className="flex flex-col gap-2"><FLabel>标题</FLabel><P3Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例如 高考 / 婚礼 / v3 上线" aria-label="标题" /></div>
        <div className="flex flex-col gap-2"><FLabel aside="可选">宣告台词</FLabel><P3Input value={sub} onChange={(e) => setSub(e.target.value)} placeholder="偷走拖延之心" aria-label="宣告台词" /></div>
        {mode !== 'todos' && (
          <div className="flex flex-col gap-2"><FLabel>目标日</FLabel>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="目标日" className="h-11 px-4 font-cond text-[16px] outline-none" style={{ background: 'var(--p3r-field)', color: P3R.ink, clipPath: slantClip(8) }} />
            {bad ? <span className="text-[12px] font-black" style={{ color: 'var(--p3r-coral-ink)' }}>目标日不能早于今天</span> : <span className="text-[12px] font-bold" style={{ color: P3R.grey }}>还剩 {ccDaysLeft(date)} 天</span>}
          </div>
        )}
        <div className="flex items-center justify-between gap-3 py-2 pl-5 pr-3" style={{ clipPath: slantClip(10), background: 'var(--p3r-row)' }}>
          <span className="min-w-0"><span className="block text-[14px] font-black" style={{ color: P3R.ink }}>钉到首页</span><span className="block text-[11px] font-bold" style={{ color: P3R.grey }}>首页顶部的「PINNED · 宣言」条，只能钉一张</span></span>
          <P3OnOff value={pinned} onChange={setPinned} ariaLabel="钉到首页" />
        </div>
      </div>
    </P3Sheet>
  );
}

export default function CallingCards({ params }: PageProps) {
  const toast = useToast();
  const state = params.get('state');
  const openQ = params.get('open');
  const { CC_CARDS, CC_LINKED } = useCallingCardData();
  const [cards, setCards] = useState<CallingCard[]>(state === 'empty' ? [] : CC_CARDS);
  const [editing, setEditing] = useState<{ open: boolean; card: CallingCard | null }>({ open: openQ === 'new' || openQ === 'edit', card: openQ === 'edit' ? CC_CARDS[1] : null });
  const [delTarget, setDelTarget] = useState<CallingCard | null>(openQ === 'delete' ? CC_CARDS[3] : null);
  const [cutin, setCutin] = useState(openQ === 'archive');
  const [sweep, setSweep] = useState(false);
  useEffect(() => { setCards(state === 'empty' ? [] : CC_CARDS); }, [CC_CARDS, state]);
  const grouped = useMemo(() => GROUPS.map((g) => ({ ...g, items: cards.filter((c) => groupOf(c) === g.id) })), [cards]);

  const editorEntry = OVERLAYS['actions-calling-card-editor'];
  const cutinEntry = OVERLAYS['global-calling-card-cutin'];
  const Editor = editorEntry ? (lazyOf(`overlay:actions-calling-card-editor`, editorEntry.load) as unknown as ComponentType<{ open: boolean; onClose: () => void; params?: URLSearchParams; initialCard?: CallingCard | null; onSave?: (c: CallingCard) => void }>) : null;
  const CutIn = cutinEntry ? lazyOf(`overlay:global-calling-card-cutin`, cutinEntry.load) : null;

  const save = (c: CallingCard) => {
    void callingCardOps.save(c);
    setCards((xs) => { const rest = xs.filter((x) => x.id !== c.id).map((x) => (c.pinned ? { ...x, pinned: false } : x)); return [c, ...rest]; });
    setSweep(true);
  };
  const act = (c: CallingCard) => (a: string) => {
    if (a === 'pin') { void callingCardOps.pin(c.pinned ? null : c.id); setCards((xs) => xs.map((x) => (x.id === c.id ? { ...x, pinned: !c.pinned } : c.pinned ? x : { ...x, pinned: false }))); toast(c.pinned ? '已取消钉选' : '已钉到主页'); }
    if (a === 'edit') setEditing({ open: true, card: c });
    if (a === 'delete') setDelTarget(c);
    if (a === 'restore') { void callingCardOps.restore(c.id); setCards((xs) => xs.map((x) => (x.id === c.id ? { ...x, archived: false, archiveReason: undefined, archivedAt: undefined } : x))); toast('已恢复到进行中'); }
    if (a === 'archive') {
      void callingCardOps.archive(c.id);
      setCards((xs) => xs.map((x) => (x.id === c.id ? { ...x, archived: true, pinned: false, archiveReason: 'manual', archivedAt: new Date() } : x)));
      if (cutinEntry) window.setTimeout(() => setCutin(true), 380); else toast.success('已收存');
    }
  };

  const header = (
    <P3PageHeader title="宣告卡" en="CALLING CARD" onBack={() => navigate('menu')} subtitle="为重要的事写一张宣告卡，倒计时随时在此映入眼帘"
      actions={<P3Button size="sm" corner onClick={() => setEditing({ open: true, card: null })}>＋ 新建</P3Button>} />
  );
  if (state === 'loading') return (<>{header}<LoadingBlock text="正在翻开宣告卡档案…" /></>);

  return (
    <div className="relative mx-auto min-w-0 max-w-2xl pb-8">
      {header}
      {cards.length === 0 ? (
        <div className="relative flex min-h-[240px] flex-col items-center justify-center gap-3 overflow-hidden px-6 py-8 text-center" style={{ clipPath: slantClip(26), background: 'rgb(var(--p3r-wash) / 0.72)' }}>
          <GhostWords words={['CALLING', 'CARD']} className="left-2 top-2 text-[56px]" />
          <span className="relative text-[17px] font-black" style={{ color: P3R.ink }}>还没有宣告卡</span>
          <span className="relative max-w-[30ch] text-[13px] font-bold" style={{ color: P3R.grey }}>给一件重要的事立个日子——考试、旅行、上线，倒计时会替你记着。</span>
          <P3Button corner className="relative mt-1" onClick={() => setEditing({ open: true, card: null })}>✦ 立下第一张宣告</P3Button>
        </div>
      ) : (
        <div className="flex min-w-0 flex-col gap-6">
          {grouped.filter((g) => g.items.length).map((g) => (
            <section key={g.id} className="min-w-0">
              <div className="mb-2.5 flex min-w-0 items-center gap-2">
                <span aria-hidden className="h-[17px] w-[12px] shrink-0" style={{ background: g.id === 'expired' ? P3R.magenta : P3R.blue, clipPath: 'polygon(32% 0, 100% 0, 68% 100%, 0 100%)' }} />
                <h2 className="font-heavy text-[20px] leading-none" style={{ color: P3R.ink }}>{g.title}</h2>
                <span className="font-cond text-[12px]" style={{ color: P3R.grey }}>{g.en}</span>
                <span aria-hidden className="h-[2px] min-w-[12px] flex-1" style={{ background: 'rgb(var(--p3r-cyan-rgb) / 0.5)' }} />
                <span className="font-cond text-[20px] leading-none" style={{ color: P3R.blue }}>{g.items.length}</span>
                <span aria-hidden className="h-2.5 w-2.5" style={{ background: P3R.cyan, clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }} />
              </div>
              <div className="grid min-w-0 grid-cols-1 gap-3 wide:grid-cols-2">
                <AnimatePresence mode="popLayout">
                  {g.items.map((c, i) => <CardSlab key={c.id} c={c} i={i} linked={CC_LINKED[c.id]} onAct={act(c)} />)}
                </AnimatePresence>
              </div>
            </section>
          ))}
          <button type="button" onClick={() => setEditing({ open: true, card: null })} className="relative flex h-14 w-full items-center justify-center gap-2 text-[15px] font-black active:scale-[0.99]" style={{ clipPath: slantClip(14), boxShadow: 'inset 0 0 0 2px rgb(var(--p3r-blue-rgb) / 0.5)', color: P3R.roseInk }}>
            <span aria-hidden className="h-[10px] w-[14px]" style={{ background: P3R.magenta, clipPath: tickClip }} />立下新的约定
          </button>
        </div>
      )}

      {Editor ? (
        <Suspense fallback={null}><Editor open={editing.open} onClose={() => setEditing((e) => ({ ...e, open: false }))} params={new URLSearchParams(editing.card ? 'variant=edit' : '')} initialCard={editing.card} onSave={save} /></Suspense>
      ) : <FallbackEditor open={editing.open} onClose={() => setEditing((e) => ({ ...e, open: false }))} initial={editing.card} onSave={save} />}
      <P3Dialog open={!!delTarget} onClose={() => setDelTarget(null)} tone="danger" variant="system" title="删除这张宣告卡？"
        description={delTarget ? `「${delTarget.title}」\n删除后不会出现在首页和档案里，此操作无法撤销。` : undefined} confirmText="删除" cancelText="取消"
        onConfirm={() => { const t = delTarget; setDelTarget(null); if (t) { void callingCardOps.remove(t.id); setCards((xs) => xs.filter((x) => x.id !== t.id)); toast('已删除'); } }} />
      {CutIn && <Suspense fallback={null}><CutIn open={cutin} onClose={() => setCutin(false)} params={new URLSearchParams('reason=manual')} /></Suspense>}
      <CutInSweep active={sweep} text="CALLING" sub="预告已发出" onDone={() => setSweep(false)} />
    </div>
  );
}
