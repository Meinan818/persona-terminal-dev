/**
 * BIG DEAL 大事面板（真实 src/components/bigdeal/BigDealPanel.tsx）：
 *   头部目标弧（GoalArc）+「N / M 步」BIG DEAL / 已收官；「属性 · 每步 +N」+ 截止「截止还剩 N 天 / 今天截止 / 已过截止 N 天 · 完成都算数」；现状；
 *   子步「完成这一步 / 撤销这一步」、删除子步、空「还没有子步——先拆第一步」；「追加一个够得着的小步…」+「添加」；「✦ AI 续拆下一组」；
 *   全成后「收官 · 领取奖励（SP +N）」（结算中…）；「↻ 重建这件大事」→ 说明 +「确认重建」「算了」；「已收官」。
 *   勾一个子步 → BigDealStepCutIn（剩 1 步时变「只差最后一步」）；收官 → BigDealClearCutIn。
 * 直达：?state=empty | done（全成待收官）| cleared（已收官）| rebuild（重建确认）| overdue（已过截止）| ai（续拆中）
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { Todo } from '@/types';
import type { OverlayProps } from '@pink/registry/types';
import { P3Button, P3Input, P3Sheet, P3Tag, P3R, slantClip } from '@pink/kit';
import { AIThinking } from '@pink/fx';
import { useBoldness } from '@pink/lib/prefs';
import { ATTR_NAMES, TODAY_KEY, TODOS } from '@pink/adapters/pkg2';
import { daysBetween, MiniHead, Ring } from '@pink/screens/pkg2/common';
import { StepList } from '@pink/screens/pkg2/StepList';
import BigDealStepCutIn from './BigDealStepCutIn.p3r';
import BigDealClearCutIn from './BigDealClearCutIn.p3r';

const dlText = (deadline?: string) => {
  if (!deadline) return null;
  const days = daysBetween(TODAY_KEY, deadline);
  if (days > 0) return { text: `截止还剩 ${days} 天`, urgent: days <= 2 };
  if (days === 0) return { text: '今天截止', urgent: true };
  return { text: `已过截止 ${-days} 天 · 完成都算数`, urgent: false };
};

export default function BigDealPanel({ open, onClose, params, todo: t0, onChange }: OverlayProps & { todo?: Todo | null; onChange?: (t: Todo) => void }) {
  const anim = useBoldness();
  const st = params?.get('state');
  const base = t0 ?? TODOS.find((t) => t.isBigDeal)!;
  const [todo, setTodo] = useState<Todo>(base);
  const [cleared, setCleared] = useState(false);
  const [draft, setDraft] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [rebuild, setRebuild] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);
  const [collapsing, setCollapsing] = useState(false);
  const [stepCut, setStepCut] = useState<{ done: number; total: number; step: string; next?: string } | null>(null);
  const [clearCut, setClearCut] = useState(false);
  const upd = (p: Partial<Todo>) => setTodo((cur) => { const n = { ...cur, ...p }; onChange?.(n); return n; });
  const aiSplit = () => { setAiBusy(true); setNotice(null); window.setTimeout(() => { setAiBusy(false); setTodo((cur) => ({ ...cur, steps: [...(cur.steps ?? []), { id: `ai${Date.now()}`, title: '把错题本按章节重新整理', source: 'ai' }, { id: `ai2${Date.now()}`, title: '考前一晚早点睡', source: 'ai' }] })); setNotice('AI 续拆了 2 条——不合适的直接删'); }, 2400); };
  useEffect(() => {
    if (!open) return;
    let b = base;
    if (st === 'empty') b = { ...base, steps: [] };
    if (st === 'done' || st === 'cleared' || st === 'rebuild') b = { ...base, steps: (base.steps ?? []).map((s) => ({ ...s, done: true })) };
    if (st === 'overdue') b = { ...base, deadline: '2026-10-17' };
    setTodo(b); setCleared(st === 'cleared' || st === 'rebuild'); setNotice(null); setRebuild(st === 'rebuild');
    if (st === 'ai') aiSplit();
  }, [open]); // eslint-disable-line
  const steps = todo.steps ?? [];
  const done = steps.filter((s) => s.done).length;
  const allDone = steps.length > 0 && done === steps.length;
  const dl = dlText(todo.deadline);
  const sp = Math.min(20, steps.length * 3);
  const toggle = (i: number) => {
    const s = steps[i];
    const ns = steps.map((x, j) => (j === i ? { ...x, done: !x.done, doneAt: !x.done ? TODAY_KEY : undefined } : x));
    upd({ steps: ns });
    if (!s.done) setStepCut({ done: ns.filter((x) => x.done).length, total: ns.length, step: s.title, next: ns.find((x) => !x.done)?.title });
  };
  const collapse = () => { setCollapsing(true); window.setTimeout(() => { setCollapsing(false); setCleared(true); setClearCut(true); }, 800); };
  return (
    <>
      <P3Sheet open={open} onClose={onClose} title={todo.title} en="BIG DEAL" size="tall" busy={collapsing || rebuilding}>
        <div className="space-y-4">
          <div className="relative">
            <span aria-hidden className="absolute inset-0 translate-x-[6px] translate-y-[6px]" style={{ background: P3R.blue, opacity: 0.35, clipPath: slantClip(14) }} />
            <div className="relative flex min-w-0 items-center gap-4 px-5 py-3" style={{ background: P3R.ink, clipPath: slantClip(14) }}>
              <Ring pct={steps.length ? (done / steps.length) * 100 : 0} size={64} stroke={6} track="rgba(255,248,240,0.2)" ink="var(--p3r-on-ink)"
                label={<span className="font-cond text-[20px]">{done}<span className="text-[12px]">/{steps.length}</span></span>} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-cond text-[20px] leading-none" style={{ color: 'var(--p3r-on-ink)' }}>{done} / {steps.length} 步</span>
                  <P3Tag tone="rose">BIG DEAL</P3Tag>
                  {cleared && <P3Tag tone="gold">已收官</P3Tag>}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[12px]" style={{ color: 'rgba(255,240,246,0.72)' }}>
                  <span>{ATTR_NAMES[todo.attribute]} · 每步 +{todo.points}</span>
                  {dl && <span className="font-black" style={{ color: dl.urgent ? 'var(--p3r-magenta)' : 'rgba(255,240,246,0.72)' }}>{dl.text}</span>}
                </div>
                {todo.currentState && <p className="mt-0.5 truncate text-[11px]" style={{ color: 'rgba(255,240,246,0.6)' }}>现状：{todo.currentState}</p>}
              </div>
            </div>
          </div>
          <MiniHead title="子步" en="STEPS" />
          {steps.length === 0 ? <p className="py-3 text-center text-[14px] font-bold" style={{ color: P3R.grey }}>还没有子步——先拆第一步</p>
            : <StepList steps={steps} locked={cleared} onToggle={toggle} onDelete={(i) => upd({ steps: steps.filter((_, j) => j !== i) })} />}
          {!cleared && (
            <>
              <div className="flex min-w-0 gap-2">
                <div className="min-w-0 flex-1"><P3Input placeholder="追加一个够得着的小步…" value={draft} onChange={(e) => setDraft(e.target.value)} aria-label="追加子步" /></div>
                <P3Button disabled={!draft.trim()} onClick={() => { upd({ steps: [...steps, { id: `n${Date.now()}`, title: draft.trim(), source: 'manual' }] }); setDraft(''); }}>添加</P3Button>
              </div>
              <P3Button block tone="outline" busy={aiBusy} busyText="正在续拆…" onClick={aiSplit}>✦ AI 续拆下一组</P3Button>
              {aiBusy && <AIThinking label="正在看你已经走到哪了…" sub="按现状续拆两三条够得着的小步" />}
              {notice && <p className="text-center text-[12px] font-black" style={{ color: P3R.roseInk }}>{notice}</p>}
              <AnimatePresence>
                {allDone && (
                  <motion.div initial={anim ? { opacity: 0, y: 12 } : false} animate={{ opacity: 1, y: 0 }}>
                    <P3Button block size="lg" corner busy={collapsing} busyText="结算中…" onClick={collapse}>收官 · 领取奖励（SP +{sp}）</P3Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
          {cleared && (rebuild ? (
            <div className="px-5 py-4" style={{ background: P3R.cyanFaint, clipPath: slantClip(12) }}>
              <p className="text-[13px] leading-relaxed" style={{ color: P3R.ink }}>会新立一条同名同步骤的大事，子步全部重置为未完成；<b>当前这条原样归档</b>，已领的奖励和历史记录都不受影响。</p>
              <div className="mt-3 flex gap-2">
                <P3Button tone="ink" block busy={rebuilding} busyText="重建中…" onClick={() => { setRebuilding(true); window.setTimeout(() => { setRebuilding(false); setRebuild(false); setCleared(false); upd({ steps: steps.map((s) => ({ ...s, done: false, doneAt: undefined })) }); }, 700); }}>确认重建</P3Button>
                <P3Button tone="soft" block onClick={() => setRebuild(false)}>算了</P3Button>
              </div>
            </div>
          ) : <P3Button block tone="ghost" onClick={() => setRebuild(true)}>↻ 重建这件大事</P3Button>)}
        </div>
      </P3Sheet>
      <BigDealStepCutIn open={!!stepCut} onClose={() => setStepCut(null)} payload={stepCut ? { dealTitle: todo.title, ...stepCut } : undefined} />
      <BigDealClearCutIn open={clearCut} onClose={() => setClearCut(false)} data={{ title: todo.title, sp, attrs: [ATTR_NAMES[todo.attribute]], stepsCount: steps.length }} />
    </>
  );
}
