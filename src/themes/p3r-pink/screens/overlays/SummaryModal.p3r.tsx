/**
 * 成长总结（真实 src/components/SummaryModal.tsx）四视图 + 后台 summaryJobs 状态机（整理 → 思考 → 流式 → 可停止 / 接着写 / 重试）：
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
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { OverlayProps } from '@pink/registry/types';
import type { PeriodSummary } from '@/types';
import { P3Button, P3ConfigRow, P3Empty, P3Input, P3OnOff, P3Segment, P3Sheet, P3Tag, useToast, P3R, slantClip, tickClip, IconBack, IconChevron } from '@pink/kit';
import { AIThinking } from '@pink/fx';
import { useBoldness } from '@pink/lib/prefs';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore, toLocalDateKey, DEFAULT_SUMMARY_PROMPT_PRESETS } from '@/store';
import { aiConfigured, chatStream } from '@/utils/aiClient';
import { followUpsOf, parseSummaryResult, SUMMARY_FOLLOWUP_LIMIT, SUMMARY_FOLLOWUP_MAX_TOKENS } from '@/utils/summaryAI';
import {
  attachDraftFollowUp, cancelSummaryJob, continueSummaryJob, isSummaryJobRunning,
  markSummaryJobSaved, resolveKeyFor, restoreSummaryDraft, startSummaryJob, useSummaryJobs,
} from '@/utils/summaryJobs';
import { useActionsData, type MockSummary } from '@pink/adapters/pkg2';
import { Butterfly, MiniHead } from '@pink/screens/pkg2/common';
import SummaryModalRegenConfirm from './SummaryModalRegenConfirm.p3r';
import YearRecapStage from './YearRecapStage.p3r';

type View = 'generate' | 'result' | 'archive' | 'view';
type JobStatus = 'preparing' | 'thinking' | 'streaming' | 'done' | 'error';
interface Job {
  status: JobStatus;
  text: string;
  period: 'week' | 'month' | 'year';
  label: string;
  truncated?: boolean;
  continues: number;
  saved?: boolean;
  error?: string;
  followUps: { q: string; a: string }[];
  totalPoints: number;
  activityCount: number;
}

const fmtR = (s: Date, e: Date) => `${s.getFullYear()}年 ${s.getMonth() + 1}/${s.getDate()} ~ ${e.getMonth() + 1}/${e.getDate()}`;
const weekRange = (off: number) => {
  const s = new Date();
  s.setDate(s.getDate() - ((s.getDay() + 6) % 7) + off * 7);
  const e = new Date(s);
  e.setDate(s.getDate() + 6);
  return { s, e };
};
const monthRange = (off: number) => {
  const now = new Date();
  return {
    s: new Date(now.getFullYear(), now.getMonth() + off, 1),
    e: new Date(now.getFullYear(), now.getMonth() + off + 1, 0),
  };
};

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
function Body({ text, streaming, annual }: { text: string; streaming?: boolean; annual?: number }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <div className="relative">
      <span aria-hidden className="absolute inset-0 translate-x-[6px] translate-y-[6px]" style={{ background: 'var(--p3r-slab-back)', clipPath: slantClip(14) }} />
      <div className="relative px-5 py-4" style={{ background: P3R.panel, clipPath: slantClip(14) }}>
        <span aria-hidden className="absolute left-0 top-0 h-full w-[4px]" style={{ background: P3R.blue }} />
        {annual && <div className="mb-3 text-center font-cond text-[12px] tracking-[0.3em]" style={{ color: P3R.roseInk }}>✦ {annual} · 年度的信 ✦</div>}
        <div className="whitespace-pre-wrap break-words text-[15px] leading-[1.9]" style={{ color: P3R.ink }} aria-live="polite">
          {parts.map((p, i) => (p.startsWith('**') && p.endsWith('**') ? <b key={i} className="px-0.5 font-black" style={{ background: 'rgb(var(--p3r-blue-rgb) / 0.18)', color: P3R.ink }}>{p.slice(2, -2)}</b> : <span key={i}>{p}</span>))}
          {streaming && <span aria-hidden className="pk-caret ml-0.5 inline-block h-[1.05em] w-[3px] translate-y-[3px]" style={{ background: P3R.blue }} />}
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

function FollowUps({ items, remaining, question, disabled, onSend }: { items: { q: string; a: string }[]; remaining: number; question?: string; disabled?: 'nokey' | 'legacy' | 'used' | null; onSend: (q: string) => void }) {
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
      {disabled === 'nokey' && <p className="px-1 text-[12px]" style={{ color: P3R.grey }}>当前没有这份总结所用平台的 API Key，无法在此追问。</p>}
      {disabled === 'legacy' && <p className="px-1 text-[12px]" style={{ color: P3R.grey }}>这条归档生成于较早版本，没有保留追问所需的上下文，无法在此追问。</p>}
      {(disabled === 'used' || (!disabled && remaining <= 0)) && <p className="px-1 text-[12px]" style={{ color: P3R.grey }}>追问机会已用完。</p>}
      {!disabled && remaining > 0 && (
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
  const { SUMMARIES, SUMMARY_PRESETS } = useActionsData();
  const {
    settings, summaries, saveSummary, deleteSummary, loadSummaries, updateSettings, markSummaryViewed, getSummaryLabel,
  } = useAppStore(useShallow((s) => ({
    settings: s.settings,
    summaries: s.summaries,
    saveSummary: s.saveSummary,
    deleteSummary: s.deleteSummary,
    loadSummaries: s.loadSummaries,
    updateSettings: s.updateSettings,
    markSummaryViewed: s.markSummaryViewed,
    getSummaryLabel: s.getSummaryLabel,
  })));
  const rootJob = useSummaryJobs((s) => s.job);
  const toast = useToast();
  const anim = useBoldness();
  const pv = params?.get('view');
  const st = params?.get('state');
  const fuParam = params?.get('followup');
  const aiStates = ['busy', 'thinking', 'streaming', 'error', 'truncated', 'none'];
  const initialView: View = pv === 'preview' || (st && aiStates.includes(st)) ? 'result' : pv === 'archive' || st === 'empty' ? 'archive' : pv === 'detail' ? 'view' : 'generate';
  const [view, setView] = useState<View>(initialView);
  const noKey = st === 'nokey' || !aiConfigured(settings);
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('week');
  const [off, setOff] = useState(0);
  const [preset, setPreset] = useState(0);
  const [auto, setAuto] = useState(settings.summaryAutoWrite !== false);
  const [special, setSpecial] = useState(settings.summaryIncludeSpecial === true);
  const [archive, setArchive] = useState<MockSummary[]>(st === 'empty' ? [] : SUMMARIES);
  const [selected, setSelected] = useState<MockSummary | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [regen, setRegen] = useState(false);
  const [recap, setRecap] = useState(false);
  const [saving, setSaving] = useState(false);
  const [detailFU, setDetailFU] = useState<{ q: string; a: string }[]>([]);
  const [job, setJob] = useState<Job | null>(null);
  const presets = settings.summaryPromptPresets ?? DEFAULT_SUMMARY_PROMPT_PRESETS;
  const now = new Date();
  const range = period === 'week' ? weekRange(off) : period === 'month' ? monthRange(off) : { s: new Date(now.getFullYear(), 0, 1), e: new Date(now.getFullYear(), 11, 31) };
  const label = getSummaryLabel(period, toLocalDateKey(range.s));

  useEffect(() => { setArchive(st === 'empty' ? [] : SUMMARIES); }, [SUMMARIES, st]);
  useEffect(() => {
    const idx = presets.findIndex((p) => p.id === settings.summaryActivePresetId);
    setPreset(idx >= 0 ? idx : 0);
  }, [presets, settings.summaryActivePresetId]);
  useEffect(() => {
    setAuto(settings.summaryAutoWrite !== false);
    setSpecial(settings.summaryIncludeSpecial === true);
  }, [settings.summaryAutoWrite, settings.summaryIncludeSpecial]);
  useEffect(() => {
    if (!rootJob) { setJob(null); return; }
    setJob({
      status: rootJob.status,
      text: rootJob.text,
      period: rootJob.period,
      label: rootJob.req?.periodLabel ?? rootJob.draft?.label ?? getSummaryLabel(rootJob.period, rootJob.startDate),
      truncated: rootJob.truncated,
      continues: rootJob.continues,
      saved: false,
      error: rootJob.error,
      followUps: rootJob.draft ? followUpsOf(rootJob.draft).map((f) => ({ q: f.question, a: f.answer })) : [],
      totalPoints: rootJob.draft?.totalPoints ?? rootJob.req?.totalPoints ?? 0,
      activityCount: rootJob.draft?.activityCount ?? rootJob.req?.activityCount ?? 0,
    });
  }, [rootJob, getSummaryLabel]);
  useEffect(() => {
    if (!open) return;
    void loadSummaries();
    if (!rootJob && restoreSummaryDraft()) setView('result');
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (open && pv === 'detail' && !selected && archive[0]) {
      const source = summaries.find((s) => s.id === archive[0].id);
      setSelected(archive[0]);
      setDetailFU(source ? followUpsOf(source).map((f) => ({ q: f.question, a: f.answer })) : []);
    }
  }, [open, pv, archive, selected, summaries]);

  const phase = job?.status ?? 'idle';
  const running = isSummaryJobRunning(rootJob);
  const generate = async () => {
    if (noKey) { toast.error('未配置 AI API'); return; }
    setView('result');
    await updateSettings({ summaryActivePresetId: presets[preset]?.id ?? presets[0]?.id });
    startSummaryJob({
      settings: useAppStore.getState().settings,
      period,
      startDate: toLocalDateKey(range.s),
      endDate: toLocalDateKey(range.e),
    });
  };
  const stop = () => { cancelSummaryJob(); setJob(null); };
  const regenerate = () => { if (job && job.status === 'done' && !job.saved) setRegen(true); else void generate(); };
  const save = async () => {
    if (!job || !rootJob?.draft) return;
    setSaving(true);
    try {
      await saveSummary(rootJob.draft);
      markSummaryJobSaved();
      setJob(null);
      toast.success('已归档保存');
      setView('archive');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };
  const persistedSelected = selected ? summaries.find((s) => s.id === selected.id) ?? null : null;
  const annualSummary = archive.find((s) => s.period === 'year' && s.startDate.startsWith(String(now.getFullYear())));
  const openArchived = (summary: MockSummary) => {
    const source = summaries.find((s) => s.id === summary.id);
    setSelected(summary.viewed ? summary : { ...summary, viewed: true });
    setDetailFU(source ? followUpsOf(source).map((f) => ({ q: f.question, a: f.answer })) : []);
    void markSummaryViewed(summary.id);
    setView('view');
  };
  const appendFollowUp = async (question: string, archived?: PeriodSummary | null) => {
    const draftContext = rootJob?.draft?.reqContext;
    const base = archived
      ? archived.reqContext
        ? { ...archived.reqContext, apiKey: resolveKeyFor(settings, archived.reqContext.provider) }
        : null
      : rootJob?.req ?? (draftContext ? { ...draftContext, apiKey: resolveKeyFor(settings, draftContext.provider) } : null);
    const apiKey = base?.apiKey;
    if (!base || !apiKey) throw new Error('当前没有可用的 API Key，无法追问');
    const previous = archived ? followUpsOf(archived) : rootJob?.draft ? followUpsOf(rootJob.draft) : [];
    const messages = [
      ...base.messages,
      { role: 'assistant' as const, content: archived?.content ?? rootJob?.text ?? '' },
      ...previous.flatMap((f) => [
        { role: 'user' as const, content: f.question },
        { role: 'assistant' as const, content: f.answer },
      ]),
      { role: 'user' as const, content: question },
    ];
    let answer = '';
    for await (const chunk of chatStream({ ...base, apiKey }, messages, {
      temperature: 0.7,
      maxTokens: SUMMARY_FOLLOWUP_MAX_TOKENS,
    })) answer += chunk;
    const content = parseSummaryResult(answer).content.trim();
    if (!content) throw new Error('这次没有拿到有效回答');
    const followUp = { question, answer: content, createdAt: new Date() };
    if (archived) {
      await saveSummary({ ...archived, followUp: undefined, followUps: [...previous, followUp] });
      setDetailFU((rows) => [...rows, { q: question, a: content }]);
    } else {
      attachDraftFollowUp(followUp);
      setJob((current) => current && { ...current, followUps: [...current.followUps, { q: question, a: content }] });
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
    return `${job.label} · 草稿`;
  }, [view, job, selected, phase]);

  const footer: ReactNode = view === 'generate' ? (
    <P3Button block size="lg" corner disabled={running} onClick={() => void generate()} leading={<Butterfly size={18} />}>生成总结</P3Button>
  ) : view === 'result' && job ? (
    <div className="flex gap-3">
      {running ? <P3Button tone="soft" block size="lg" onClick={stop}>停止</P3Button> : <P3Button tone="soft" block size="lg" onClick={regenerate}>重新生成</P3Button>}
      <P3Button block size="lg" corner disabled={running || job.status !== 'done' || saving || !rootJob?.draft} busy={saving} busyText="保存中…" onClick={() => void save()}>{running ? '生成中…' : '归档保存'}</P3Button>
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
                  <button type="button" onClick={() => openArchived(f)}
                    className="flex w-full min-w-0 items-center gap-3 px-4 py-2.5 text-left" style={{ background: P3R.blue, color: P3R.onBlue, clipPath: slantClip(10) }}>
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: 'var(--p3r-cream)' }} aria-label="未读" />
                    <span className="min-w-0 flex-1"><span className="block truncate text-[14px] font-black">「{f.label}」写好了</span><span className="block truncate text-[11px] opacity-85">{f.autoWritten ? '按你的设置在后台写好的，' : ''}还没看过</span></span>
                    <span className="shrink-0 text-[13px] font-black">查看 ›</span>
                  </button>
                ); })()}
                <button type="button" onClick={() => setPeriod('year')} aria-pressed={period === 'year'} className="relative w-full min-w-0 overflow-hidden px-5 py-3 text-left" style={rowBtn(period === 'year')}>
                  <span aria-hidden className="pointer-events-none absolute -right-1 -top-3 font-cond text-[56px] leading-none" style={{ color: period === 'year' ? 'rgba(255,240,246,0.12)' : 'var(--p3r-ghost)' }}>{now.getFullYear()}</span>
                  <div className="relative flex items-center gap-2"><span className="font-heavy text-[17px]">{now.getFullYear()}年 年度总结</span>{period === 'year' && <P3Tag tone="rose">已选</P3Tag>}</div>
                  <div className="relative mt-1 text-[12px] opacity-85">成功的更生 — 回顾这一年全部成长历程</div>
                  <div className="relative mt-1.5 flex items-center justify-between gap-2 text-[11px] opacity-80"><span className="min-w-0 truncate">{annualSummary ? `${annualSummary.startDate} ~ ${annualSummary.endDate} 已有归档，再生成会另存一份` : '今年还没有年度总结'}</span>
                    {annualSummary && <span role="link" tabIndex={0} onClick={(e) => { e.stopPropagation(); openArchived(annualSummary); }} className="shrink-0 font-black">查看 ›</span>}</div>
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
                    <button type="button" onClick={() => setPreset((p) => (p + 1) % SUMMARY_PRESETS.length)} className="min-w-0 truncate px-4 py-1.5 text-[13px] font-black" style={{ background: P3R.blue, color: P3R.onBlue, clipPath: slantClip(7) }}>‹ {SUMMARY_PRESETS[preset]} ›</button>
                    <span className="min-w-0 truncate text-[11px]" style={{ color: P3R.grey }}>点击切换；在设置「AI 总结」里可新增 / 编辑</span>
                  </div>
                </section>
                <section className="space-y-1.5">
                  <MiniHead title="自动撰写" en="AUTO" />
                  <P3ConfigRow label="自动撰写上一期总结" hint="新的一周、一个月第一次打开时，上一期还没写就在后台写好，写完提醒你一次。用当前选的风格。"><P3OnOff value={auto} onChange={(value) => { setAuto(value); void updateSettings({ summaryAutoWrite: value }); }} ariaLabel="自动撰写上一期总结" /></P3ConfigRow>
                </section>
                <section className="space-y-1.5">
                  <MiniHead title="统计口径" en="SCOPE" />
                  <P3ConfigRow label='同时统计"特殊条目"' hint="逆影战场击破、本周目标、逆流、升级 / 成就 / 技能解锁等；同伴（带「同伴」标签的条目）始终会被统计。"><P3OnOff value={special} onChange={(value) => { setSpecial(value); void updateSettings({ summaryIncludeSpecial: value }); }} ariaLabel='同时统计"特殊条目"' /></P3ConfigRow>
                </section>
              </>
            )}

            {view === 'result' && job && (
              <>
                <Stats items={[{ label: '总加点', value: job.status === 'preparing' ? '…' : `+${job.totalPoints}` }, { label: '记录数', value: job.status === 'preparing' ? '…' : String(job.activityCount) }, { label: '风格', value: SUMMARY_PRESETS[preset] }]} />
                {phase === 'preparing' && <AIThinking className="py-6" label="正在整理简报…" sub="把这一期的记录、加点和同伴互动排好" ring={false} />}
                {phase === 'thinking' && (
                  <div className="flex flex-col items-center gap-2 py-4">
                    <AIThinking label="✦ 正在读你的记录…" sub="深思熟虑中 · 关掉也没关系，它会在后台写完" />
                  </div>
                )}
                {job.period === 'year' && job.status === 'done' && !job.truncated && <P3Button block tone="ink" onClick={() => setRecap(true)}>✦ 重温开场</P3Button>}
                {(job.status === 'streaming' || job.status === 'done') && <Body text={job.text} streaming={job.status === 'streaming'} annual={job.period === 'year' ? now.getFullYear() : undefined} />}
                {job.status === 'error' && (
                  <SignalBar title="生成失败" text={job.error || '网络请求失败：无法连接到 API 服务。'}>
                    <P3Button size="sm" tone="soft" onClick={() => { cancelSummaryJob(); setJob(null); setView('generate'); }}>返回</P3Button>
                    <P3Button size="sm" onClick={() => void generate()}>重试</P3Button>
                  </SignalBar>
                )}
                {job.truncated && (
                  <SignalBar tone="lilac" title="写到一半断了" text={job.continues >= 3 ? '已经续写了三次，剩下的就这样吧；可以直接归档，或者重新生成。' : '这封信写到一半断了（输出被截断或连接中途断开）。可以让它从断处接着写。'}>
                    {job.continues < 3 && <P3Button size="sm" onClick={() => continueSummaryJob(settings)}>接着写</P3Button>}
                  </SignalBar>
                )}
                {job.status === 'done' && !job.truncated && (
                  <FollowUps items={job.followUps} remaining={SUMMARY_FOLLOWUP_LIMIT - job.followUps.length} question={rootJob?.draft?.question}
                    onSend={(q) => { void appendFollowUp(q).catch((error) => toast.error(error instanceof Error ? error.message : '追问失败')); }} />
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
                      <P3Button size="sm" onClick={() => openArchived(s)}>查看</P3Button>
                      {confirmDel === s.id ? <P3Button size="sm" tone="danger" onClick={() => { void deleteSummary(s.id); setConfirmDel(null); }}>确认</P3Button>
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
                <Body text={selected.body} annual={selected.period === 'year' ? Number(selected.startDate.slice(0, 4)) : undefined} />
                <FollowUps items={detailFU} remaining={SUMMARY_FOLLOWUP_LIMIT - detailFU.length}
                  disabled={(fuParam as 'nokey' | 'legacy' | 'used' | null) ?? (!aiConfigured(settings) ? 'nokey' : !persistedSelected?.reqContext ? 'legacy' : detailFU.length >= SUMMARY_FOLLOWUP_LIMIT ? 'used' : null)}
                  onSend={(q) => { void appendFollowUp(q, persistedSelected).catch((error) => toast.error(error instanceof Error ? error.message : '追问失败')); }} />
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </P3Sheet>
      <SummaryModalRegenConfirm open={regen} onClose={() => setRegen(false)} onConfirm={() => void generate()} />
      <YearRecapStage open={recap} onClose={() => setRecap(false)} />
    </>
  );
}
