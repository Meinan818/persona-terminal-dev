/**
 * 成长总结（真实 src/components/SummaryModal.tsx）四视图 + 状态：
 *   ?view=generate（默认）生成页 · ?view=preview 草稿/预览 + 追问 · ?view=archive 历史总结归档 · ?view=detail 总结详情
 *   ?state=busy  生成中（整理简报 → 读记录 → 书写，流式）  ?state=nokey 未配置 AI API  ?state=error 生成失败
 *   ?state=none  没有正在进行的总结  ?state=truncated 截断「接着写」  ?state=empty 归档为空
 *   ?followup=nokey|legacy|used  详情页三种不可追问提示
 * 视图切换：同页横推 + 跳台噪点 1 帧。重新生成（草稿未归档）→ SummaryModalRegenConfirm。年度总结「✦ 重温开场」→ YearRecapStage。
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { OverlayProps } from '@yellow/registry/types';
import { P4Button, P4Sheet, P4Switch, P4Input, P4EmptyState, useToast, IconBack, IconChevron } from '@yellow/kit';
import { ChannelNoise } from '@yellow/fx';
import { useLowMotion } from '@yellow/lib/prefs';
import { cx } from '@yellow/lib/cx';
import { SUMMARIES, SUMMARY_BODY, SUMMARY_PRESETS, type MockSummary } from '@yellow/mock/pkg2';
import SummaryModalRegenConfirm from './SummaryModalRegenConfirm.p4g';
import YearRecapStage from './YearRecapStage.p4g';

type View = 'generate' | 'result' | 'archive' | 'view';
type JobStatus = 'preparing' | 'thinking' | 'streaming' | 'done' | 'error';
interface Job { status: JobStatus; text: string; period: 'week' | 'month' | 'year'; label: string; truncated?: boolean; continues: number; saved?: boolean; followUps: { q: string; a: string }[] }

const fmtR = (s: Date, e: Date) => `${s.getFullYear()}年 ${s.getMonth() + 1}/${s.getDate()} ~ ${e.getMonth() + 1}/${e.getDate()}`;
const weekRange = (off: number) => { const s = new Date(2026, 9, 19 + off * 7); const e = new Date(2026, 9, 25 + off * 7); return { s, e }; };
const monthRange = (off: number) => { const s = new Date(2026, 9 + off, 1); const e = new Date(2026, 10 + off, 0); return { s, e }; };

function Stats({ items }: { items: { label: string; value: string }[] }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map((it, i) => (
        <div key={it.label} className={cx('min-w-0 rounded-sm border-3 border-p4g-black px-2 py-2 text-center shadow-hard-sm', i === 0 ? 'bg-p4g-orange text-p4g-black' : i === 1 ? 'bg-p4g-yellow text-p4g-black' : 'bg-p4g-black text-p4g-yellow night:border-p4g-yellow')}>
          <div className="truncate p4g-num text-h2 leading-none">{it.value}</div>
          <div className="mt-1 truncate font-display text-2xs font-bold opacity-80">{it.label}</div>
        </div>
      ))}
    </div>
  );
}

/** 正文：消息框纸面；**粗体** 转黄底高亮；流式时末尾光标 */
function Body({ text, streaming, annual }: { text: string; streaming?: boolean; annual?: number }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <div className="relative overflow-hidden rounded-sm border-3 border-p4g-black bg-p4g-surface px-4 py-4 shadow-hard night:border-p4g-yellow">
      <div aria-hidden className="absolute inset-x-0 top-0 h-1.5 p4g-candy-h" />
      {annual && <div className="mb-3 text-center font-display text-cap font-bold tracking-[0.3em] text-p4g-orange">✦ {annual} · 年度的信 ✦</div>}
      <div className="whitespace-pre-wrap break-words text-body leading-[1.85] text-p4g-ink">
        {parts.map((p, i) => (p.startsWith('**') ? <b key={i} className="bg-p4g-yellow px-0.5 font-bold text-p4g-black">{p.slice(2, -2)}</b> : <span key={i}>{p}</span>))}
        {streaming && <span className="ml-0.5 inline-block h-4 w-2 translate-y-0.5 animate-pulse bg-p4g-orange" />}
      </div>
    </div>
  );
}

function FollowUps({ items, remaining, question, disabled, onSend }: { items: { q: string; a: string }[]; remaining: number; question?: string; disabled?: 'nokey' | 'legacy' | 'used' | null; onSend: (q: string) => void }) {
  const [q, setQ] = useState('');
  return (
    <div className="space-y-2">
      {items.map((f, i) => (
        <div key={i} className="space-y-1.5">
          <div className="ml-8 rounded-sm bg-p4g-black px-3 py-2 text-body text-white night:bg-p4g-yellow night:text-p4g-black"><span className="mr-1.5 font-display text-2xs font-bold uppercase tracking-wider opacity-70">追问 {i + 1}</span>{f.q}</div>
          <div className="mr-8 rounded-sm bg-p4g-msg px-3 py-2 text-body leading-relaxed text-[color:var(--p4g-msg-ink)]">{f.a}</div>
        </div>
      ))}
      {disabled === 'nokey' && <p className="px-1 text-cap text-p4g-ink-soft">当前没有这份总结所用平台的 API Key，无法在此追问。</p>}
      {disabled === 'legacy' && <p className="px-1 text-cap text-p4g-ink-soft">这条归档生成于较早版本，没有保留追问所需的上下文，无法在此追问。</p>}
      {(disabled === 'used' || (!disabled && remaining <= 0)) && <p className="px-1 text-cap text-p4g-ink-soft">追问机会已用完。</p>}
      {!disabled && remaining > 0 && (
        <div className="rounded-sm border-3 border-dashed border-p4g-line p-2.5">
          <div className="mb-1.5 font-display text-meta font-bold text-p4g-ink">{items.length === 0 ? '还有疑问？可以追问' : `还可以追问 ${remaining} 次`}</div>
          {question && items.length === 0 && <div className="mb-2 rounded-xs bg-p4g-yellow px-2 py-1 text-meta font-bold text-p4g-black">回答对方的问题：{question}</div>}
          <div className="flex min-w-0 gap-2">
            <P4Input wrapClassName="min-w-0 flex-1" value={q} onChange={(e) => setQ(e.target.value)} placeholder={question && items.length === 0 ? '回答上面的问题，或者问点别的' : '例如：如何具体提升知识属性？'} aria-label="追问" />
            <P4Button disabled={!q.trim()} onClick={() => { onSend(q.trim()); setQ(''); }}>发送</P4Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ThinkingDial({ label }: { label: string }) {
  const low = useLowMotion();
  return (
    <div className="flex flex-col items-center gap-3 py-6">
      <div className="relative h-32 w-32">
        <div className="absolute inset-0 rounded-full border-[6px] border-p4g-black bg-p4g-yellow night:border-p4g-yellow night:bg-p4g-black" />
        <motion.div className="absolute inset-3 rounded-full" style={{ background: 'repeating-conic-gradient(var(--p4g-black) 0 8deg, transparent 8deg 30deg)' }} animate={low ? undefined : { rotate: 360 }} transition={{ repeat: Infinity, duration: 3, ease: 'linear' }} />
        <div className="absolute inset-9 flex items-center justify-center rounded-full border-3 border-p4g-black bg-p4g-orange text-[28px]">🦋</div>
      </div>
      <span className="rounded-pill bg-p4g-black px-3 py-1 font-display text-meta font-bold text-p4g-yellow">{label}</span>
    </div>
  );
}

export default function SummaryModal({ open, onClose, params }: OverlayProps) {
  const toast = useToast();
  const low = useLowMotion();
  const pv = params?.get('view');
  const st = params?.get('state');
  const initialView: View = pv === 'preview' || st === 'busy' || st === 'error' || st === 'none' || st === 'truncated' ? 'result' : pv === 'archive' || st === 'empty' ? 'archive' : pv === 'detail' ? 'view' : 'generate';
  const [view, setViewRaw] = useState<View>(initialView);
  const [noise, setNoise] = useState(false);
  const setView = (v: View) => { setViewRaw(v); if (!low) setNoise(true); };
  const noKey = st === 'nokey';
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('week');
  const [off, setOff] = useState(0);
  const [preset, setPreset] = useState(0);
  const [auto, setAuto] = useState(true);
  const [special, setSpecial] = useState(false);
  const [archive, setArchive] = useState<MockSummary[]>(st === 'empty' ? [] : SUMMARIES);
  const [selected, setSelected] = useState<MockSummary | null>(pv === 'detail' ? SUMMARIES[0] : null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [regen, setRegen] = useState(false);
  const [recap, setRecap] = useState(false);
  const [saving, setSaving] = useState(false);
  const [detailFU, setDetailFU] = useState<{ q: string; a: string }[]>([{ q: '下周具体可以怎么提升魅力？', a: '挑一个你本来就会去的场合，比如社团例会，主动先开口一次。记下来，就是一条魅力。' }]);
  const timers = useRef<number[]>([]);
  const clearT = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  const [job, setJob] = useState<Job | null>(() => {
    if (st === 'none') return null;
    if (st === 'busy') return { status: 'preparing', text: '', period: 'week', label: '10月第4周', continues: 0, followUps: [] };
    if (st === 'error') return { status: 'error', text: '', period: 'week', label: '10月第4周', continues: 0, followUps: [] };
    if (pv === 'preview' || st === 'truncated') return { status: 'done', text: st === 'truncated' ? SUMMARY_BODY.slice(0, 140) : SUMMARY_BODY, period: 'week', label: '10月第4周', truncated: st === 'truncated', continues: 0, followUps: [] };
    return null;
  });
  useEffect(() => () => clearT(), []);

  const range = period === 'week' ? weekRange(off) : period === 'month' ? monthRange(off) : { s: new Date(2026, 0, 1), e: new Date(2026, 11, 31) };
  const label = period === 'year' ? '2026 年度总结' : period === 'week' ? `10月第${4 + off}周` : `${range.s.getMonth() + 1}月`;

  const stream = (base: Job) => {
    clearT();
    setJob({ ...base, status: 'preparing', text: '' });
    timers.current.push(window.setTimeout(() => setJob((j) => j && { ...j, status: 'thinking' }), 900));
    timers.current.push(window.setTimeout(() => setJob((j) => j && { ...j, status: 'streaming' }), 2400));
    const step = 14;
    for (let k = 1; k * step <= SUMMARY_BODY.length + step; k++) {
      timers.current.push(window.setTimeout(() => setJob((j) => j && { ...j, text: SUMMARY_BODY.slice(0, k * step) }), 2400 + k * 70));
    }
    timers.current.push(window.setTimeout(() => setJob((j) => j && { ...j, status: 'done', text: SUMMARY_BODY }), 2400 + (SUMMARY_BODY.length / step + 2) * 70));
  };
  // ?state=busy：进来就开始跑
  useEffect(() => { if (open && st === 'busy') stream({ status: 'preparing', text: '', period: 'week', label: '10月第4周', continues: 0, followUps: [] }); }, [open]); // eslint-disable-line

  const running = !!job && job.status !== 'done' && job.status !== 'error';
  const generate = () => { setView('result'); stream({ status: 'preparing', text: '', period, label, continues: 0, followUps: [] }); };
  const stop = () => { clearT(); setJob((j) => j && { ...j, status: 'done', truncated: true }); };
  const regenerate = () => { if (job && job.status === 'done' && !job.saved) setRegen(true); else generate(); };
  const save = () => {
    if (!job) return;
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setArchive((a) => [{ id: `sm${Date.now()}`, period: job.period, label: job.label, startDate: '2026-10-19', endDate: '2026-10-25', totalPoints: 13, activityCount: 9, promptPresetName: SUMMARY_PRESETS[preset], viewed: true, createdAt: new Date(), followUps: job.followUps.length, body: job.text }, ...a]);
      setJob(null); toast.success('已归档保存'); setView('archive');
    }, 600);
  };

  const headerTitle = useMemo(() => {
    if (view === 'generate') return '生成成长总结';
    if (view === 'archive') return '历史总结归档';
    if (view === 'view') return selected?.label ?? '总结详情';
    if (!job) return '总结预览';
    if (job.status === 'preparing') return '正在整理简报…';
    if (job.status === 'thinking') return '✨ 正在读你的记录…';
    if (job.status === 'streaming') return '✨ AI 正在书写…';
    if (job.status === 'error') return '生成失败';
    return `${job.label} · 草稿`;
  }, [view, job, selected]);

  const footer: ReactNode = view === 'generate' ? (
    <P4Button block size="lg" disabled={noKey || running} onClick={generate}>🦋 生成总结</P4Button>
  ) : view === 'result' && job ? (
    <div className="flex gap-3">
      {running ? <P4Button variant="secondary" block size="lg" onClick={stop}>停止</P4Button> : <P4Button variant="secondary" block size="lg" onClick={regenerate}>重新生成</P4Button>}
      <P4Button block size="lg" disabled={running || job.status !== 'done' || saving} onClick={save}>{running ? '生成中…' : saving ? '保存中…' : '归档保存'}</P4Button>
    </div>
  ) : view === 'result' ? (
    <P4Button block size="lg" onClick={() => setView('generate')}>生成新总结</P4Button>
  ) : (
    <P4Button block size="lg" onClick={() => setView(job ? 'result' : 'generate')}>{job ? (running ? '回到进行中的总结' : '回到草稿') : '生成新总结'}</P4Button>
  );

  return (
    <>
      <P4Sheet open={open} onClose={onClose} size="full" title={headerTitle} en="GROWTH REPORT" footer={footer} className="max-w-[720px]">
        <div className="mb-3 flex min-w-0 items-center gap-2">
          {(view === 'archive' || view === 'view') && (
            <button type="button" onClick={() => setView(view === 'view' ? 'archive' : job ? 'result' : 'generate')} aria-label="返回" className="p4g-press flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border-3 border-p4g-line bg-p4g-yellow text-p4g-black shadow-hard-sm"><IconBack size={14} /></button>
          )}
          <p className="min-w-0 flex-1 text-meta font-bold text-p4g-ink-soft">
            {view === 'generate' && '由 AI 分析你的成长记录，实时生成总结与建议'}
            {view === 'result' && running && '关掉也没关系，它会在后台写完，回来就能看。'}
          </p>
          {view === 'generate' && <P4Button size="sm" variant="black" onClick={() => setView('archive')}>归档</P4Button>}
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={view} initial={low ? { opacity: 0 } : { opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={low ? { opacity: 0 } : { opacity: 0, x: -24 }} transition={{ duration: 0.18 }} className="min-w-0 space-y-4">
            {view === 'generate' && (
              <>
                {noKey && (
                  <div className="rounded-sm border-3 border-p4g-black bg-p4g-orange p-3 text-p4g-black shadow-hard-sm">
                    <div className="font-display text-body font-bold">未配置 AI API</div>
                    <div className="mt-1 text-meta">请前往「设置 → AI 服务」配置 API 密钥后再使用此功能</div>
                  </div>
                )}
                {archive.some((s) => !s.viewed) && (() => { const f = archive.find((s) => !s.viewed)!; return (
                  <button type="button" onClick={() => { setSelected(f); setArchive((a) => a.map((s) => (s.id === f.id ? { ...s, viewed: true } : s))); setView('view'); }}
                    className="flex w-full min-w-0 items-center gap-3 rounded-sm border-3 border-p4g-black bg-p4g-yellow px-3 py-2.5 text-left text-p4g-black shadow-hard">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-p4g-red" aria-label="未读" />
                    <span className="min-w-0 flex-1"><span className="block truncate font-display text-body font-bold">「{f.label}」写好了</span><span className="block truncate text-cap">{f.autoWritten ? '按你的设置在后台写好的，' : ''}还没看过</span></span>
                    <span className="shrink-0 font-display text-meta font-bold">查看 ›</span>
                  </button>
                ); })()}
                <button type="button" onClick={() => setPeriod('year')} aria-pressed={period === 'year'}
                  className={cx('relative w-full min-w-0 overflow-hidden rounded-sm border-3 p-3 text-left shadow-hard', period === 'year' ? 'border-p4g-black bg-p4g-black text-p4g-yellow night:border-p4g-yellow' : 'border-p4g-line bg-p4g-surface text-p4g-ink')}>
                  <div aria-hidden className="absolute -right-6 -top-6 h-20 w-20 rotate-12 opacity-60 p4g-candy" />
                  <div className="relative flex items-center gap-2"><span className="font-display text-lead font-bold">2026年 年度总结</span>{period === 'year' && <span className="rounded-xs bg-p4g-orange px-1.5 font-display text-2xs font-bold text-p4g-black">已选</span>}</div>
                  <div className="relative mt-1 text-meta opacity-85">成功的更生 — 回顾这一年全部成长历程</div>
                  <div className="relative mt-1.5 flex items-center justify-between gap-2 text-cap opacity-80"><span className="min-w-0 truncate">2026/1/2 写过一份，再生成会另存一份</span><span role="link" tabIndex={0} onClick={(e) => { e.stopPropagation(); setSelected(SUMMARIES[2]); setView('view'); }} className="shrink-0 font-bold">查看 ›</span></div>
                </button>
                <section>
                  <div className="mb-2 font-display text-cap font-bold uppercase tracking-[0.2em] text-p4g-ink-soft">选择时间范围</div>
                  <div className="grid grid-cols-2 gap-2">
                    {(['week', 'month'] as const).map((p) => (
                      <button key={p} type="button" onClick={() => { setPeriod(p); setOff(0); }} className={cx('p4g-press rounded-sm border-3 py-2 font-display text-body font-bold', period === p ? 'border-p4g-black bg-p4g-select text-[color:var(--p4g-select-ink)] shadow-hard-sm' : 'border-p4g-line bg-p4g-surface text-p4g-ink')}>{p === 'week' ? '周总结' : '月总结'}</button>
                    ))}
                  </div>
                  {period !== 'year' && (
                    <div className="mt-2 flex min-w-0 items-center gap-2 rounded-pill border-3 border-p4g-line bg-p4g-surface px-2 py-1">
                      <button type="button" aria-label="上一期" onClick={() => setOff((o) => o - 1)} className="flex h-8 w-8 shrink-0 items-center justify-center text-p4g-ink"><IconBack size={14} /></button>
                      <div className="min-w-0 flex-1 truncate text-center p4g-date-type text-meta text-p4g-ink">{fmtR(range.s, range.e)}</div>
                      <button type="button" aria-label="下一期" disabled={off >= 0} onClick={() => setOff((o) => o + 1)} className="flex h-8 w-8 shrink-0 items-center justify-center text-p4g-ink disabled:opacity-30"><IconChevron size={14} /></button>
                    </div>
                  )}
                </section>
                <section className="rounded-sm border-3 border-p4g-line bg-p4g-surface p-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="shrink-0 font-display text-meta font-bold text-p4g-ink">当前风格</span>
                    <button type="button" onClick={() => setPreset((p) => (p + 1) % SUMMARY_PRESETS.length)} className="p4g-press min-w-0 truncate rounded-xs border-thin border-p4g-black bg-p4g-tag px-2 py-0.5 font-display text-meta font-bold text-[color:var(--p4g-tag-ink)]">{SUMMARY_PRESETS[preset]}</button>
                  </div>
                  <p className="mt-1.5 text-cap text-p4g-ink-soft">点击切换；在设置「AI 总结」里可新增 / 编辑自定义风格</p>
                </section>
                <section className="rounded-sm border-3 border-p4g-line bg-p4g-surface p-3">
                  <div className="mb-1 font-display text-cap font-bold uppercase tracking-[0.2em] text-p4g-ink-soft">自动撰写</div>
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1"><div className="font-display text-meta font-bold text-p4g-ink">自动撰写上一期总结</div><p className="mt-0.5 text-cap text-p4g-ink-soft">新的一周、一个月第一次打开时，上一期还没写就在后台写好，写完提醒你一次。用当前选的风格。</p></div>
                    <P4Switch checked={auto} onChange={setAuto} aria-label="自动撰写上一期总结" size="sm" />
                  </div>
                </section>
                <section className="rounded-sm border-3 border-p4g-line bg-p4g-surface p-3">
                  <div className="mb-1 font-display text-cap font-bold uppercase tracking-[0.2em] text-p4g-ink-soft">统计口径</div>
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1"><div className="font-display text-meta font-bold text-p4g-ink">同时统计"特殊条目"</div><p className="mt-0.5 text-cap text-p4g-ink-soft">包括：逆影战场击破、本周目标、逆流、升级 / 成就 / 技能解锁 等。<br />同伴（带"同伴"标签的条目）始终会被统计。</p></div>
                    <P4Switch checked={special} onChange={setSpecial} aria-label='同时统计"特殊条目"' size="sm" />
                  </div>
                </section>
              </>
            )}

            {view === 'result' && job && (
              <>
                <Stats items={[{ label: '总加点', value: job.status === 'preparing' ? '…' : '+13' }, { label: '记录数', value: job.status === 'preparing' ? '…' : '9' }, { label: '风格', value: SUMMARY_PRESETS[preset] }]} />
                {job.status === 'preparing' && <div className="flex items-center justify-center gap-2 py-8 font-display text-body font-bold text-p4g-ink"><motion.span animate={low ? undefined : { rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="inline-block">◌</motion.span>正在整理这一期的简报…</div>}
                {job.status === 'thinking' && <ThinkingDial label="正在读你的记录" />}
                {job.period === 'year' && job.status === 'done' && <P4Button block variant="black" onClick={() => setRecap(true)}>✦ 重温开场</P4Button>}
                {(job.status === 'streaming' || job.status === 'done') && <Body text={job.text} streaming={job.status === 'streaming'} annual={job.period === 'year' ? 2026 : undefined} />}
                {job.status === 'error' && (
                  <div className="space-y-2 rounded-sm border-3 border-p4g-black bg-p4g-danger p-3 text-[color:var(--p4g-danger-ink)] shadow-hard-sm">
                    <div className="whitespace-pre-line text-body font-bold">{'网络请求失败：无法连接到 API 服务。\n若在浏览器中使用，部分 API 可能因跨域（CORS）限制无法直接访问，建议在 Android 客户端或支持 CORS 的接口下使用此功能。'}</div>
                    <div className="flex gap-2"><P4Button variant="secondary" block onClick={() => { setJob(null); setView('generate'); }}>返回</P4Button><P4Button block onClick={generate}>重试</P4Button></div>
                  </div>
                )}
                {job.status === 'done' && job.truncated && (
                  <div className="flex items-center gap-3 rounded-sm border-3 border-p4g-black bg-p4g-yellow p-3 text-p4g-black shadow-hard-sm">
                    <div className="min-w-0 flex-1 text-meta leading-relaxed">{job.continues >= 3 ? '已经续写了三次，剩下的就这样吧；可以直接归档，或者重新生成。' : '这封信写到一半断了（输出被截断或连接中途断开）。可以让它从断处接着写。'}</div>
                    {job.continues < 3 && <P4Button size="sm" variant="black" onClick={() => setJob((j) => j && { ...j, text: SUMMARY_BODY, truncated: false, continues: j.continues + 1 })}>接着写</P4Button>}
                  </div>
                )}
                {job.status === 'done' && !job.truncated && (
                  <FollowUps items={job.followUps} remaining={3 - job.followUps.length} question="这周哪一件事，是你原本以为自己做不到的？"
                    onSend={(q) => setJob((j) => j && { ...j, followUps: [...j.followUps, { q, a: '听起来那一刻你比自己想的更有胆量。把它记成一条，下周的总结会接着它往下写。' }] })} />
                )}
              </>
            )}
            {view === 'result' && !job && <div className="py-10 text-center font-display text-body font-bold text-p4g-ink-soft">没有正在进行的总结。</div>}

            {view === 'archive' && (
              archive.length === 0 ? <P4EmptyState title="暂无归档总结" hint="生成的总结保存后将在此显示" /> : (
                <div className="grid grid-cols-1 gap-2.5">
                  {archive.map((s) => (
                    <div key={s.id} className="flex min-w-0 items-center gap-3 rounded-sm border-3 border-p4g-black bg-p4g-surface px-3 py-2.5 shadow-hard-sm night:border-p4g-yellow">
                      <span className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-xs border-3 border-p4g-black font-display text-lead font-bold', s.period === 'week' ? 'bg-p4g-yellow text-p4g-black' : s.period === 'month' ? 'bg-p4g-orange text-p4g-black' : 'bg-p4g-black text-p4g-yellow night:border-p4g-yellow')}>{s.period === 'week' ? '周' : s.period === 'year' ? '年' : '月'}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <span className="min-w-0 truncate font-display text-body font-bold text-p4g-ink">{s.label}</span>
                          {s.autoWritten && <span className="shrink-0 rounded-xs bg-p4g-ink/10 px-1 text-2xs font-bold text-p4g-ink-soft">自动</span>}
                          {!s.viewed && <span className="h-2 w-2 shrink-0 rounded-full bg-p4g-red" aria-label="未读" />}
                        </div>
                        <div className="truncate p4g-date-type text-2xs text-p4g-ink-soft">{s.startDate} ~ {s.endDate}</div>
                        <div className="flex flex-wrap gap-x-2 text-2xs text-p4g-ink-soft"><span>+{s.totalPoints} 点</span><span>{s.activityCount} 条记录</span>{s.followUps > 0 && <span>追问 {s.followUps}</span>}</div>
                      </div>
                      <div className="flex shrink-0 flex-col gap-1">
                        <P4Button size="sm" onClick={() => { setSelected(s); setArchive((a) => a.map((x) => (x.id === s.id ? { ...x, viewed: true } : x))); setView('view'); }}>查看</P4Button>
                        {confirmDel === s.id
                          ? <P4Button size="sm" variant="danger" onClick={() => { setArchive((a) => a.filter((x) => x.id !== s.id)); setConfirmDel(null); }}>确认</P4Button>
                          : <P4Button size="sm" variant="ghost" onClick={() => setConfirmDel(s.id)}>删除</P4Button>}
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {view === 'view' && selected && (
              <>
                <Stats items={[{ label: '总加点', value: `+${selected.totalPoints}` }, { label: '记录数', value: `${selected.activityCount}` }, { label: '风格', value: selected.promptPresetName }]} />
                <p className="p4g-date-type text-cap text-[color:var(--p4g-on-stage)]">{selected.startDate} ~ {selected.endDate} · 生成于 {selected.createdAt.toLocaleDateString('zh-CN')}{selected.deliberate ? ' · 深思熟虑' : ''}</p>
                {selected.period === 'year' && <P4Button block variant="black" onClick={() => setRecap(true)}>✦ 重温开场</P4Button>}
                <Body text={selected.body} annual={selected.period === 'year' ? 2025 : undefined} />
                <FollowUps items={detailFU} remaining={3 - detailFU.length}
                  disabled={(params?.get('followup') as 'nokey' | 'legacy' | 'used' | null) ?? (selected.id === 'sm2' ? 'legacy' : null)}
                  onSend={(q) => setDetailFU((f) => [...f, { q, a: '把这个问题拆成一件今天就能做的小事——比如十分钟。做完了记一条。' }])} />
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </P4Sheet>
      <ChannelNoise active={noise} onDone={() => setNoise(false)} duration={140} />
      <SummaryModalRegenConfirm open={regen} onClose={() => setRegen(false)} onConfirm={generate} />
      <YearRecapStage open={recap} onClose={() => setRecap(false)} />
    </>
  );
}
