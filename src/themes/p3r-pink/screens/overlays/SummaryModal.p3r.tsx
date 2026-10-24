/**
 * 成长总结（真实 src/components/SummaryModal.tsx）四视图 + AI 状态机（全部走 kit useAIStream：思考约 2.4s → 逐字，可跳过 / 停止 / 接着写 / 重试）：
 *   ?view=generate（默认）生成页：「由 AI 分析你的成长记录…」、未读提醒「按你的设置在后台写好的，查看 ›」、年度卡、「选择时间范围」周 / 月（‹ › 翻期）、
 *                 「当前风格」chip（点击切换）、「自动撰写」开关、「统计口径」特殊条目 / 同伴、「🦋 生成总结」、「归档」入口
 *   ?view=preview 草稿 / 预览：统计（总加点 / 记录数 / 风格）+ 正文 +「接着写」（截断）+「✦ 重温开场」（年）+ 追问（「回答上面的问题，或者问点别的」/ 还可以追问 N 次）
 *                 + 「停止」「重新生成」「归档保存」（生成中… / 保存中…）
 *   ?view=archive 历史总结归档：周 / 月 / 年签、日期、「自动」「未读」、查看 / 删除 → 确认；空「暂无归档总结」；「生成新总结 / 回到草稿 / 回到进行中的总结」
 *   ?view=detail  总结详情：正文 + 追问区（?followup=nokey | legacy | used 三种不可追问提示）
 * 状态直达：?state=busy（整理简报 → 读记录 → 书写全流程）| thinking | streaming | error | truncated | nokey | none | empty；?fail=error|midError|truncate|offline|nokey 透传给 AI 引擎；
 *          ?view=preview&followup=streaming 追问逐字中。重新生成（草稿未归档）→ 重新生成？确认；年度「✦ 重温开场」→ 年度回顾舞台。
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { OverlayProps } from '@pink/registry/types';
import { P3Button, P3ConfigRow, P3Empty, P3Input, P3OnOff, P3Segment, P3Sheet, P3Tag, useToast, P3R, slantClip, tickClip, IconBack, IconChevron } from '@pink/kit';
import { AIThinking, type AIFail, type AIPhase, type AIState } from '@pink/fx';
import { useBoldness } from '@pink/lib/prefs';
import { SUMMARY_BODY, type MockSummary } from '@pink/adapters/pkg2';
import { useActionsData } from '@pink/adapters/pkg2';
import { Butterfly, MiniHead } from '@pink/screens/pkg2/common';
import SummaryModalRegenConfirm from './SummaryModalRegenConfirm.p3r';
import YearRecapStage from './YearRecapStage.p3r';
import { useAppStore, toLocalDateKey } from '@/store';
import {
  cancelSummaryJob, continueSummaryJob, discardSummaryJob, markSummaryJobSaved,
  startSummaryJob, useSummaryJobs,
} from '@/utils/summaryJobs';
import { useSummaryFollowUp } from '@/components/astrology/useSummaryFollowUp';

type View = 'generate' | 'result' | 'archive' | 'view';
interface Job { period: 'week' | 'month' | 'year'; label: string; saved?: boolean; continues: number; followUps: { q: string; a: string }[]; preparing?: boolean }

const fmtR = (s: Date, e: Date) => `${s.getFullYear()}年 ${s.getMonth() + 1}/${s.getDate()} ~ ${e.getMonth() + 1}/${e.getDate()}`;
const weekRange = (off: number) => ({ s: new Date(2026, 9, 19 + off * 7), e: new Date(2026, 9, 25 + off * 7) });
const monthRange = (off: number) => ({ s: new Date(2026, 9 + off, 1), e: new Date(2026, 10 + off, 0) });

function Stats({ items }: { items: { label: string; value: string }[] }) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {items.map((it, i) => (
        <div key={it.label} className="min-w-0 px-2 py-2 text-center" style={{ clipPath: slantClip(8), background: i === 0 ? P3R.blue : i === 1 ? P3R.cyanPale : P3R.ink, color: i === 0 ? P3R.onBlue : i === 1 ? P3R.ink : 'var(--p3r-on-ink)' }}>
          <div className="truncate font-cond text-[24px] leading-none">{it.value}</div>
          <div className="mt-1 truncate text-[10px] font-black opacity-80">{it.label}</div>
        </div>
      ))}
    </div>
  );
}

/** 正文：P3R 台词框式面板；**粗体** → 玫红底高亮；流式时末尾光标 + SKIP */
function Body({ text, ai, annual }: { text: string; ai?: AIState; annual?: number }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <div className="relative">
      <span aria-hidden className="absolute inset-0 translate-x-[6px] translate-y-[6px]" style={{ background: 'var(--p3r-slab-back)', clipPath: slantClip(14) }} />
      <div className="relative px-5 py-4" style={{ background: P3R.panel, clipPath: slantClip(14) }}>
        <span aria-hidden className="absolute left-0 top-0 h-full w-[4px]" style={{ background: P3R.blue }} />
        {annual && <div className="mb-3 text-center font-cond text-[12px] tracking-[0.3em]" style={{ color: P3R.roseInk }}>✦ {annual} · 年度的信 ✦</div>}
        <div className="whitespace-pre-wrap break-words text-[15px] leading-[1.9]" style={{ color: P3R.ink }} aria-live="polite">
          {parts.map((p, i) => (p.startsWith('**') && p.endsWith('**') ? <b key={i} className="px-0.5 font-black" style={{ background: 'rgb(var(--p3r-blue-rgb) / 0.18)', color: P3R.ink }}>{p.slice(2, -2)}</b> : <span key={i}>{p}</span>))}
          {ai && (ai.phase === 'streaming' || ai.phase === 'thinking') && <span aria-hidden className="pk-caret ml-0.5 inline-block h-[1.05em] w-[3px] translate-y-[3px]" style={{ background: P3R.blue }} />}
        </div>
      </div>
    </div>
  );
}

/** 系统提示条（SIGNAL LOST 式）：墨色斜条 + 珊瑚刀口 */
function SignalBar({ title, text, children, tone = 'coral' }: { title: ReactNode; text?: ReactNode; children?: ReactNode; tone?: 'coral' | 'lilac' }) {
  return (
    <div className="relative overflow-hidden px-5 py-3" style={{ background: P3R.ink, clipPath: slantClip(12) }}>
      <span aria-hidden className="absolute right-4 top-0 h-[8px] w-[22px]" style={{ background: tone === 'coral' ? P3R.magenta : P3R.cyan, clipPath: tickClip }} />
      <div className="flex items-center gap-2"><span className="font-cond text-[11px] tracking-[0.25em]" style={{ color: tone === 'coral' ? P3R.magenta : P3R.cyan }}>{tone === 'coral' ? 'SIGNAL LOST' : 'NOTICE'}</span></div>
      <div className="mt-0.5 text-[15px] font-black" style={{ color: 'var(--p3r-on-ink)' }}>{title}</div>
      {text && <div className="mt-1 whitespace-pre-line text-[12px] leading-relaxed" style={{ color: 'color-mix(in srgb, var(--p3r-on-ink) 72%, transparent)' }}>{text}</div>}
      {children && <div className="mt-2.5 flex gap-2">{children}</div>}
    </div>
  );
}

function FollowUps({ items, remaining, question, disabled, onSend, pending }: { items: { q: string; a: string }[]; remaining: number; question?: string; disabled?: 'nokey' | 'legacy' | 'used' | null; onSend: (q: string) => void; pending?: { q: string; ai: AIState } | null }) {
  const [q, setQ] = useState('');
  const bubble = (who: 'me' | 'ai', node: ReactNode, k: string) => (
    <div key={k} className={who === 'me' ? 'ml-8' : 'mr-8'}>
      <div className="px-4 py-2 text-[14px] leading-relaxed" style={{ clipPath: slantClip(8), background: who === 'me' ? P3R.ink : P3R.cyanFaint, color: who === 'me' ? 'var(--p3r-on-ink)' : P3R.ink }}>{node}</div>
    </div>
  );
  return (
    <div className="space-y-2">
      <MiniHead title="追问" en="FOLLOW-UP" />
      {items.map((f, i) => (
        <div key={i} className="space-y-1.5">
          {bubble('me', <><span className="mr-1.5 font-cond text-[11px] opacity-70">Q{i + 1}</span>{f.q}</>, `q${i}`)}
          {bubble('ai', f.a, `a${i}`)}
        </div>
      ))}
      {pending && (
        <div className="space-y-1.5">
          {bubble('me', <><span className="mr-1.5 font-cond text-[11px] opacity-70">Q{items.length + 1}</span>{pending.q}</>, 'pq')}
          {pending.ai.phase === 'thinking' ? <AIThinking label="正在想怎么回答你…" /> : bubble('ai', <>{pending.ai.text}{pending.ai.phase === 'streaming' && <><span aria-hidden className="pk-caret ml-0.5 inline-block h-[1em] w-[3px] translate-y-[2px]" style={{ background: P3R.blue }} /><button type="button" onClick={pending.ai.skip} className="ml-2 font-cond text-[11px]" style={{ color: P3R.roseInk }}>SKIP ›</button></>}</>, 'pa')}
        </div>
      )}
      {disabled === 'nokey' && <p className="px-1 text-[12px]" style={{ color: P3R.grey }}>当前没有这份总结所用平台的 API Key，无法在此追问。</p>}
      {disabled === 'legacy' && <p className="px-1 text-[12px]" style={{ color: P3R.grey }}>这条归档生成于较早版本，没有保留追问所需的上下文，无法在此追问。</p>}
      {(disabled === 'used' || (!disabled && remaining <= 0)) && <p className="px-1 text-[12px]" style={{ color: P3R.grey }}>追问机会已用完。</p>}
      {!disabled && remaining > 0 && !pending && (
        <div className="px-4 py-3" style={{ background: 'var(--p3r-row)', clipPath: slantClip(10) }}>
          <div className="mb-1.5 text-[13px] font-black" style={{ color: P3R.ink }}>{items.length === 0 ? '还有疑问？可以追问' : `还可以追问 ${remaining} 次`}</div>
          {question && items.length === 0 && <div className="mb-2 px-3 py-1 text-[12px] font-black" style={{ background: P3R.blue, color: P3R.onBlue, clipPath: slantClip(5) }}>回答对方的问题：{question}</div>}
          <div className="flex min-w-0 gap-2">
            <div className="min-w-0 flex-1"><P3Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={question && items.length === 0 ? '回答上面的问题，或者问点别的' : '例如：如何具体提升知识属性？'} aria-label="追问" /></div>
            <P3Button disabled={!q.trim()} onClick={() => { onSend(q.trim()); setQ(''); }}>发送</P3Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SummaryModal({ open, onClose, params }: OverlayProps) {
  const summaryData = useActionsData();
  const realSummaries = summaryData.SUMMARIES;
  const summaryPresets = summaryData.SUMMARY_PRESETS;
  const toast = useToast();
  const anim = useBoldness();
  const settings = useAppStore((state) => state.settings);
  const saveSummary = useAppStore((state) => state.saveSummary);
  const summaryJob = useSummaryJobs((state) => state.job);
  const pv = params?.get('view');
  const st = params?.get('state');
  const fuParam = params?.get('followup');
  const aiStates = ['busy', 'thinking', 'streaming', 'error', 'truncated', 'none'];
  const initialView: View = pv === 'preview' || (st && aiStates.includes(st)) ? 'result' : pv === 'archive' || st === 'empty' ? 'archive' : pv === 'detail' ? 'view' : 'generate';
  const [view, setView] = useState<View>(initialView);
  const noKey = st === 'nokey' || params?.get('fail') === 'nokey';
  const fail = (params?.get('fail') as AIFail) ?? (st === 'error' ? 'error' : st === 'truncated' ? 'truncate' : undefined);
  const initialPhase: AIPhase = st === 'thinking' ? 'thinking' : st === 'streaming' ? 'streaming' : st === 'error' ? 'error' : st === 'truncated' ? 'truncated' : pv === 'preview' ? 'done' : 'idle';
  const aiPhase: AIPhase = summaryJob?.status === 'preparing' ? 'thinking'
    : summaryJob?.status === 'thinking' ? 'thinking'
      : summaryJob?.status === 'streaming' ? 'streaming'
        : summaryJob?.status === 'done' ? 'done'
          : summaryJob?.status === 'error' ? (summaryJob.truncated ? 'truncated' : 'error') : 'idle';
  const ai: AIState = {
    phase: aiPhase,
    text: summaryJob?.text ?? '',
    full: summaryJob?.full ?? '',
    progress: summaryJob?.status === 'preparing' ? 0.15 : summaryJob?.status === 'thinking' ? 0.55 : summaryJob?.status === 'streaming' ? 0.85 : summaryJob?.status === 'done' ? 1 : 0,
    error: summaryJob?.error ? { code: summaryJob.truncated ? 'truncated' : 'network', message: summaryJob.error } : null,
    start: () => {},
    skip: () => {},
    abort: cancelSummaryJob,
    resume: () => continueSummaryJob(settings),
    retry: () => {
      const r = period === 'week' ? weekRange(off) : period === 'month' ? monthRange(off) : { s: new Date(2026, 0, 1), e: new Date(2026, 11, 31) };
      startSummaryJob({ settings, period, startDate: toLocalDateKey(r.s), endDate: toLocalDateKey(r.e) });
    },
    reset: discardSummaryJob,
  };
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('week');
  const [off, setOff] = useState(0);
  const [preset, setPreset] = useState(0);
  const [auto, setAuto] = useState(true);
  const [special, setSpecial] = useState(false);
  const [archive, setArchive] = useState<MockSummary[]>(st === 'empty' ? [] : realSummaries);
  const [selected, setSelected] = useState<MockSummary | null>(pv === 'detail' ? realSummaries[0] ?? null : null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [regen, setRegen] = useState(false);
  const [recap, setRecap] = useState(false);
  const [saving, setSaving] = useState(false);
  const [detailFU, setDetailFU] = useState<{ q: string; a: string }[]>([]);
  const [job, setJob] = useState<Job | null>(() => (summaryJob
    ? { period: summaryJob.period, label: summaryJob.draft?.label ?? '进行中的总结', continues: summaryJob.continues, followUps: [], preparing: summaryJob.status === 'preparing' }
    : st === 'none' || initialView !== 'result' ? null : { period: 'week', label: '10月第4周', continues: 0, followUps: [], preparing: st === 'busy' }));
  const draftFollow = useSummaryFollowUp({
    settings,
    job: summaryJob,
    archived: null,
    content: summaryJob?.draft?.content ?? '',
    followUps: job?.followUps ?? [],
  });
  const detailFollow = useSummaryFollowUp({
    settings,
    job: null,
    archived: selected,
    content: selected?.body ?? '',
    followUps: detailFU,
  });
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => { if (st !== 'empty') setArchive(realSummaries); }, [realSummaries, st]);

  const range = period === 'week' ? weekRange(off) : period === 'month' ? monthRange(off) : { s: new Date(2026, 0, 1), e: new Date(2026, 11, 31) };
  const label = period === 'year' ? '2026 年度总结' : period === 'week' ? `10月第${4 + off}周` : `${range.s.getMonth() + 1}月`;

  /** 真实三段：preparing（整理简报 ~0.9s）→ thinking（读记录 ~2.4s）→ streaming（书写） */
  const runJob = (base: Job) => {
    timers.current.forEach(clearTimeout); timers.current = [];
    setJob({ ...base, preparing: true });
    const r = base.period === 'week' ? weekRange(off) : base.period === 'month' ? monthRange(off) : { s: new Date(2026, 0, 1), e: new Date(2026, 11, 31) };
    startSummaryJob({ settings, period: base.period, startDate: toLocalDateKey(r.s), endDate: toLocalDateKey(r.e) });
  };
  useEffect(() => { if (open && st === 'busy') runJob({ period: 'week', label: '10月第4周', continues: 0, followUps: [] }); }, [open]); // eslint-disable-line

  const phase = summaryJob?.status ?? (job?.preparing ? 'preparing' : ai.phase);
  const running = !!job && (phase === 'preparing' || phase === 'thinking' || phase === 'streaming');
  const generate = () => {
    setView('result');
    runJob({ period, label, continues: 0, followUps: [] });
  };
  const stop = () => { timers.current.forEach(clearTimeout); if (job?.preparing) { setJob((j) => j && { ...j, preparing: false }); } cancelSummaryJob(); };
  const regenerate = () => { if (job && ai.phase === 'done' && !job.saved) setRegen(true); else generate(); };
  const save = async () => {
    if (!job || !summaryJob?.draft) return;
    setSaving(true);
    try {
      const toSave = { ...summaryJob.draft, viewedAt: summaryJob.draft.viewedAt ?? new Date() };
      await saveSummary(toSave);
      markSummaryJobSaved();
      setArchive((a) => [{ ...toSave, followUps: toSave.followUps?.length ?? 0, body: toSave.content } as MockSummary, ...a]);
      setJob(null);
      toast.success('已归档保存');
      setView('archive');
    } finally {
      setSaving(false);
    }
  };

  const headerTitle = useMemo(() => {
    if (view === 'generate') return '生成成长总结';
    if (view === 'archive') return '历史总结归档';
    if (view === 'view') return selected?.label ?? '总结详情';
    if (!job) return '总结预览';
    if (phase === 'preparing') return '正在整理简报…';
    if (phase === 'thinking') return '✦ 正在读你的记录…';
    if (phase === 'streaming') return '✦ AI 正在书写…';
    if (phase === 'error') return '生成失败';
    if (phase === 'nokey') return '未配置 AI API';
    return `${job.label} · 草稿`;
  }, [view, job, selected, phase]);

  const footer: ReactNode = view === 'generate' ? (
    <P3Button block size="lg" corner disabled={running} onClick={generate} leading={<Butterfly size={18} />}>生成总结</P3Button>
  ) : view === 'result' && job ? (
    <div className="flex gap-3">
      {running ? <P3Button tone="soft" block size="lg" onClick={stop}>停止</P3Button> : <P3Button tone="soft" block size="lg" onClick={regenerate}>重新生成</P3Button>}
      <P3Button block size="lg" corner disabled={running || !(ai.phase === 'done' || ai.phase === 'truncated' || ai.phase === 'aborted')} busy={saving} busyText="保存中…" onClick={save}>{running ? '生成中…' : '归档保存'}</P3Button>
    </div>
  ) : view === 'result' ? (
    <P3Button block size="lg" corner onClick={() => setView('generate')}>生成新总结</P3Button>
  ) : (
    <P3Button block size="lg" corner onClick={() => setView(job ? 'result' : 'generate')}>{job ? (running ? '回到进行中的总结' : '回到草稿') : '生成新总结'}</P3Button>
  );
  const rowBtn = (on: boolean) => ({ clipPath: slantClip(9), background: on ? P3R.ink : P3R.panelGlass, color: on ? 'var(--p3r-on-ink)' : P3R.ink });

  return (
    <>
      <P3Sheet open={open} onClose={onClose} size="full" title={headerTitle} en="GROWTH REPORT" footer={footer}
        headerExtra={view === 'generate' ? <P3Button size="sm" tone="ink" onClick={() => setView('archive')}>归档</P3Button> : (view === 'archive' || view === 'view') ? (
          <button type="button" onClick={() => setView(view === 'view' ? 'archive' : job ? 'result' : 'generate')} aria-label="返回" className="flex h-8 w-9 items-center justify-center" style={{ background: P3R.cyanFaint, color: P3R.ink, clipPath: slantClip(6) }}><IconBack size={14} /></button>
        ) : undefined}>
        {(view === 'generate' || (view === 'result' && running)) && (
          <p className="mb-3 text-[12px] font-bold" style={{ color: P3R.grey }}>{view === 'generate' ? '由 AI 分析你的成长记录，实时生成总结与建议' : '关掉也没关系，它会在后台写完，回来就能看。'}</p>
        )}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={view} initial={anim ? { opacity: 0, x: 24 } : { opacity: 0 }} animate={{ opacity: 1, x: 0 }} exit={anim ? { opacity: 0, x: -24 } : { opacity: 0 }} transition={{ duration: 0.16 }} className="min-w-0 space-y-4">
            {view === 'generate' && (
              <>
                {noKey && <SignalBar title="未配置 AI API" text="请前往「设置 → AI 服务」配置 API 密钥后再使用此功能"><P3Button size="sm" onClick={() => toast('前往「设置 → AI 服务」')}>去设置 ›</P3Button></SignalBar>}
                {archive.some((s) => !s.viewed) && (() => { const f = archive.find((s) => !s.viewed)!; return (
                  <button type="button" onClick={() => { setSelected(f); setArchive((a) => a.map((s) => (s.id === f.id ? { ...s, viewed: true } : s))); setView('view'); }}
                    className="flex w-full min-w-0 items-center gap-3 px-4 py-2.5 text-left" style={{ background: P3R.blue, color: P3R.onBlue, clipPath: slantClip(10) }}>
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: 'var(--p3r-cream)' }} aria-label="未读" />
                    <span className="min-w-0 flex-1"><span className="block truncate text-[14px] font-black">「{f.label}」写好了</span><span className="block truncate text-[11px] opacity-85">{f.autoWritten ? '按你的设置在后台写好的，' : ''}还没看过</span></span>
                    <span className="shrink-0 text-[13px] font-black">查看 ›</span>
                  </button>
                ); })()}
                <button type="button" onClick={() => setPeriod('year')} aria-pressed={period === 'year'} className="relative w-full min-w-0 overflow-hidden px-5 py-3 text-left" style={rowBtn(period === 'year')}>
                  <span aria-hidden className="pointer-events-none absolute -right-1 -top-3 font-cond text-[56px] leading-none" style={{ color: period === 'year' ? 'rgba(255,240,246,0.12)' : 'var(--p3r-ghost)' }}>2026</span>
                  <div className="relative flex items-center gap-2"><span className="font-heavy text-[17px]">2026年 年度总结</span>{period === 'year' && <P3Tag tone="rose">已选</P3Tag>}</div>
                  <div className="relative mt-1 text-[12px] opacity-85">成功的更生 — 回顾这一年全部成长历程</div>
                  <div className="relative mt-1.5 flex items-center justify-between gap-2 text-[11px] opacity-80"><span className="min-w-0 truncate">{realSummaries.find((summary) => summary.period === 'year') ? `${new Date(realSummaries.find((summary) => summary.period === 'year')!.createdAt).toLocaleDateString('zh-CN')} 写过一份，再生成会另存一份` : '还没有写过年度总结'}</span>
                    <span role="link" tabIndex={0} onClick={(e) => { e.stopPropagation(); setSelected(realSummaries[0] ?? null); setView('view'); }} className="shrink-0 font-black">查看 ›</span></div>
                </button>
                <section className="space-y-2">
                  <MiniHead title="选择时间范围" en="PERIOD" />
                  <P3Segment items={[{ id: 'week', label: '周总结' }, { id: 'month', label: '月总结' }, { id: 'year', label: period === 'year' ? '这一年' : '年' }]} value={period} onChange={(v) => { setPeriod(v as 'week'); setOff(0); }} />
                  {period !== 'year' && (
                    <div className="flex min-w-0 items-center gap-2 px-2 py-1" style={{ background: 'var(--p3r-row)', clipPath: slantClip(9) }}>
                      <button type="button" aria-label="上一期" onClick={() => setOff((o) => o - 1)} className="flex h-8 w-8 shrink-0 items-center justify-center" style={{ color: P3R.ink }}><IconBack size={14} /></button>
                      <div className="min-w-0 flex-1 truncate text-center font-cond text-[14px]" style={{ color: P3R.ink }}>{fmtR(range.s, range.e)}</div>
                      <button type="button" aria-label="下一期" disabled={off >= 0} onClick={() => setOff((o) => o + 1)} className="flex h-8 w-8 shrink-0 items-center justify-center disabled:opacity-30" style={{ color: P3R.ink }}><IconChevron size={14} /></button>
                    </div>
                  )}
                </section>
                <section className="space-y-1.5">
                  <MiniHead title="当前风格" en="STYLE" />
                  <div className="flex min-w-0 items-center gap-2">
                    <button type="button" onClick={() => setPreset((p) => (p + 1) % Math.max(1, summaryPresets.length))} className="min-w-0 truncate px-4 py-1.5 text-[13px] font-black" style={{ background: P3R.blue, color: P3R.onBlue, clipPath: slantClip(7) }}>‹ {summaryPresets[preset] ?? '默认'} ›</button>
                    <span className="min-w-0 truncate text-[11px]" style={{ color: P3R.grey }}>点击切换；在设置「AI 总结」里可新增 / 编辑</span>
                  </div>
                </section>
                <section className="space-y-1.5">
                  <MiniHead title="自动撰写" en="AUTO" />
                  <P3ConfigRow label="自动撰写上一期总结" hint="新的一周、一个月第一次打开时，上一期还没写就在后台写好，写完提醒你一次。用当前选的风格。"><P3OnOff value={auto} onChange={setAuto} ariaLabel="自动撰写上一期总结" /></P3ConfigRow>
                </section>
                <section className="space-y-1.5">
                  <MiniHead title="统计口径" en="SCOPE" />
                  <P3ConfigRow label='同时统计"特殊条目"' hint="逆影战场击破、本周目标、逆流、升级 / 成就 / 技能解锁等；同伴（带「同伴」标签的条目）始终会被统计。"><P3OnOff value={special} onChange={setSpecial} ariaLabel='同时统计"特殊条目"' /></P3ConfigRow>
                </section>
              </>
            )}

            {view === 'result' && job && (
              <>
                <Stats items={[{ label: '总加点', value: phase === 'preparing' ? '…' : '+13' }, { label: '记录数', value: phase === 'preparing' ? '…' : '9' }, { label: '风格', value: summaryPresets[preset] ?? '默认' }]} />
                {phase === 'preparing' && <AIThinking className="py-6" label="正在整理简报…" sub="把这一期的记录、加点和同伴互动排好" ring={false} />}
                {phase === 'thinking' && (
                  <div className="flex flex-col items-center gap-2 py-4">
                    <AIThinking label="✦ 正在读你的记录…" sub="深思熟虑中 · 关掉也没关系，它会在后台写完" />
                  </div>
                )}
                {job.period === 'year' && ai.phase === 'done' && <P3Button block tone="ink" onClick={() => setRecap(true)}>✦ 重温开场</P3Button>}
                {(ai.phase === 'streaming' || ai.phase === 'done' || ai.phase === 'truncated' || ai.phase === 'aborted' || (ai.phase === 'error' && ai.text)) && <Body text={ai.text} ai={ai} annual={job.period === 'year' ? 2026 : undefined} />}
                {ai.phase === 'error' && (
                  <SignalBar title="生成失败" text={ai.error?.code === 'offline' ? '当前离线：恢复网络后点「重试」，已写的部分会保留。' : ai.text ? `输出中断：连接被重置。已写的 ${ai.text.length} 字保留着，可以从断处重试。` : '网络请求失败：无法连接到 API 服务。\n若在浏览器中使用，部分 API 可能因跨域（CORS）限制无法直接访问。'}>
                    <P3Button size="sm" tone="soft" onClick={() => { setJob(null); ai.reset(); setView('generate'); }}>返回</P3Button>
                    <P3Button size="sm" onClick={ai.retry}>重试</P3Button>
                  </SignalBar>
                )}
                {ai.phase === 'nokey' && <SignalBar title="未配置 AI API" text="请前往「设置 → AI 服务」配置 API 密钥后再使用此功能" />}
                {(ai.phase === 'truncated' || ai.phase === 'aborted') && (
                  <SignalBar tone="lilac" title={ai.phase === 'aborted' ? '已停下' : '写到一半断了'} text={job.continues >= 3 ? '已经续写了三次，剩下的就这样吧；可以直接归档，或者重新生成。' : ai.phase === 'aborted' ? '停在这里也能归档；想看完就让它接着写。' : '这封信写到一半断了（输出被截断或连接中途断开）。可以让它从断处接着写。'}>
                    {job.continues < 3 && <P3Button size="sm" onClick={() => { setJob((j) => j && { ...j, continues: j.continues + 1 }); ai.resume(); }}>接着写</P3Button>}
                  </SignalBar>
                )}
                {ai.phase === 'done' && (
                  <FollowUps items={job.followUps} remaining={3 - job.followUps.length - (draftFollow.question ? 1 : 0)} question="这周哪一件事，是你原本以为自己做不到的？"
                    pending={draftFollow.question ? { q: draftFollow.question, ai: draftFollow.ai } : null}
                    onSend={(q) => { void draftFollow.ask(q, (followUp) => setJob((current) => current && { ...current, followUps: [...current.followUps, { q: followUp.question, a: followUp.answer }] })); }} />
                )}
              </>
            )}
            {view === 'result' && !job && <P3Empty ghost="IDLE" text="没有正在进行的总结。" sub="去生成页选一期，开始撰写" />}

            {view === 'archive' && (archive.length === 0 ? <P3Empty ghost="ARCHIVE" text="暂无归档总结" sub="生成的总结保存后将在此显示" /> : (
              <div className="grid grid-cols-1 gap-2">
                {archive.map((s, k) => (
                  <motion.div key={s.id} className="flex min-w-0 items-center gap-3 px-4 py-2.5" style={{ background: P3R.panel, clipPath: slantClip(11) }} initial={anim ? { opacity: 0, x: -16 } : false} animate={{ opacity: 1, x: 0 }} transition={{ delay: k * 0.04 }}>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center font-heavy text-[17px]" style={{ clipPath: slantClip(6), background: s.period === 'week' ? P3R.cyanPale : s.period === 'month' ? P3R.blue : P3R.ink, color: s.period === 'week' ? P3R.ink : s.period === 'month' ? P3R.onBlue : 'var(--p3r-on-ink)' }}>{s.period === 'week' ? '周' : s.period === 'year' ? '年' : '月'}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <span className="min-w-0 truncate text-[15px] font-black" style={{ color: P3R.ink }}>{s.label}</span>
                        {s.autoWritten && <P3Tag tone="lilac">自动</P3Tag>}
                        {!s.viewed && <P3Tag tone="coral">未读</P3Tag>}
                      </div>
                      <div className="truncate font-cond text-[12px]" style={{ color: P3R.grey }}>{s.startDate} ~ {s.endDate}</div>
                      <div className="flex flex-wrap gap-x-2 text-[11px]" style={{ color: P3R.grey }}><span>+{s.totalPoints} 点</span><span>{s.activityCount} 条记录</span>{s.followUps > 0 && <span>追问 {s.followUps}</span>}</div>
                    </div>
                    <div className="flex shrink-0 flex-col gap-1">
                      <P3Button size="sm" onClick={() => { setSelected(s); setArchive((a) => a.map((x) => (x.id === s.id ? { ...x, viewed: true } : x))); setView('view'); }}>查看</P3Button>
                      {confirmDel === s.id ? <P3Button size="sm" tone="danger" onClick={() => { setArchive((a) => a.filter((x) => x.id !== s.id)); setConfirmDel(null); }}>确认</P3Button>
                        : <P3Button size="sm" tone="ghost" onClick={() => setConfirmDel(s.id)}>删除</P3Button>}
                    </div>
                  </motion.div>
                ))}
              </div>
            ))}

            {view === 'view' && selected && (
              <>
                <Stats items={[{ label: '总加点', value: `+${selected.totalPoints}` }, { label: '记录数', value: `${selected.activityCount}` }, { label: '风格', value: selected.promptPresetName }]} />
                <p className="font-cond text-[12px]" style={{ color: P3R.grey }}>{selected.startDate} ~ {selected.endDate} · 生成于 {selected.createdAt.toLocaleDateString('zh-CN')}{selected.deliberate ? ' · 深思熟虑' : ''}</p>
                {selected.period === 'year' && <P3Button block tone="ink" onClick={() => setRecap(true)}>✦ 重温开场</P3Button>}
                <Body text={selected.body} annual={selected.period === 'year' ? 2025 : undefined} />
                <FollowUps items={detailFU} remaining={3 - detailFU.length}
                  disabled={(fuParam as 'nokey' | 'legacy' | 'used' | null) ?? (selected.id === 'sm2' ? 'legacy' : null)}
                  pending={detailFollow.question ? { q: detailFollow.question, ai: detailFollow.ai } : null}
                  onSend={(q) => { void detailFollow.ask(q, (followUp) => setDetailFU((items) => [...items, { q: followUp.question, a: followUp.answer }])); }} />
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </P3Sheet>
      <SummaryModalRegenConfirm open={regen} onClose={() => setRegen(false)} onConfirm={generate} />
      <YearRecapStage open={recap} onClose={() => setRecap(false)} />
    </>
  );
}
