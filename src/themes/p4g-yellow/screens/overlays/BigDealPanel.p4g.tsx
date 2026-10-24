/**
 * BIG DEAL 大事面板（真实 src/components/bigdeal/BigDealPanel.tsx）：
 * 头部目标弧 + 「N / M 步」BIG DEAL / 已收官；「属性 · 每步 +N」+ 截止「截止还剩 N 天 / 今天截止 / 已过截止 N 天 · 完成都算数」；现状；
 * 子步「完成这一步 / 撤销这一步」、删除子步、空「还没有子步——先拆第一步」；「追加一个够得着的小步…」+「添加」；「✦ AI 续拆下一组」；
 * 全成后「收官 · 领取奖励（SP +N）」（结算中…）；「↻ 重建这件大事」→ 说明 +「确认重建」「算了」。
 * 完成子步 → BigDealStepCutIn；收官 → BigDealClearCutIn。?state=empty|done|cleared
 */
import { useEffect, useState } from 'react';
import type { Todo } from '@real/types';
import type { OverlayProps } from '@yellow/registry/types';
import { P4Button, P4Input, P4Sheet, IconCheck, IconTrash } from '@yellow/kit';
import { ATTR_NAMES, TODOS, TODAY_KEY } from '@yellow/mock/pkg2';
import { Ring, daysBetween } from '@yellow/screens/pkg2/common';
import { cx } from '@yellow/lib/cx';
import { actionsOps } from '@yellow/adapters/pkg2';
import { useAppStore } from '@/store';
import BigDealStepCutIn from './BigDealStepCutIn.p4g';
import BigDealClearCutIn from './BigDealClearCutIn.p4g';

const dlText = (deadline?: string) => {
  if (!deadline) return null;
  const days = daysBetween(TODAY_KEY, deadline);
  if (days > 0) return { text: `截止还剩 ${days} 天`, urgent: days <= 2 };
  if (days === 0) return { text: '今天截止', urgent: true };
  return { text: `已过截止 ${-days} 天 · 完成都算数`, urgent: false };
};

export default function BigDealPanel({ open, onClose, params, todo: t0, onChange }: OverlayProps & { todo?: Todo | null; onChange?: (t: Todo) => void }) {
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
  const [stepCut, setStepCut] = useState<{ done: number; total: number; step: string } | null>(null);
  const [clearCut, setClearCut] = useState(false);
  useEffect(() => {
    if (!open) return;
    let b = base;
    if (st === 'empty') b = { ...base, steps: [] };
    if (st === 'done' || st === 'cleared') b = { ...base, steps: (base.steps ?? []).map((s) => ({ ...s, done: true })) };
    setTodo(b); setCleared(st === 'cleared'); setNotice(null); setRebuild(false);
  }, [open]); // eslint-disable-line
  const upd = (p: Partial<Todo>) => { const n = { ...todo, ...p }; setTodo(n); onChange?.(n); };
  const syncReal = () => {
    const fresh = useAppStore.getState().todos.find((t) => t.id === todo.id);
    if (fresh) { setTodo(fresh); onChange?.(fresh); }
    return fresh;
  };
  const steps = todo.steps ?? [];
  const done = steps.filter((s) => s.done).length;
  const allDone = steps.length > 0 && done === steps.length;
  const dl = dlText(todo.deadline);
  const toggle = async (i: number) => {
    const s = steps[i];
    if (!useAppStore.getState().todos.some((t) => t.id === todo.id)) {
      const ns = steps.map((x, j) => (j === i ? { ...x, done: !x.done, doneAt: !x.done ? TODAY_KEY : undefined } : x));
      upd({ steps: ns });
      if (!s.done) setStepCut({ done: ns.filter((x) => x.done).length, total: ns.length, step: s.title });
      return;
    }
    try {
      const result = s.done
        ? (await actionsOps.undoTodoStep(todo.id, s.id), null)
        : await actionsOps.completeTodoStep(todo.id, s.id);
      const fresh = syncReal();
      if (result?.collapsed) { setCleared(true); onClose(); return; }
      const nextSteps = fresh?.steps ?? [];
      if (!s.done) setStepCut({ done: nextSteps.filter((x) => x.done).length, total: nextSteps.length, step: s.title });
    } catch {
      setNotice('子步没有写入，进度保持不变');
    }
  };
  const collapse = async () => {
    if (!useAppStore.getState().todos.some((t) => t.id === todo.id)) { setCleared(true); setClearCut(true); return; }
    setCollapsing(true);
    try {
      await actionsOps.collapseBigDeal(todo.id);
      const fresh = syncReal();
      if (fresh && !fresh.isActive) { setCleared(true); onClose(); }
    } catch {
      setNotice('收官失败，进度保持不变');
    } finally {
      setCollapsing(false);
    }
  };
  return (
    <>
      <P4Sheet open={open} onClose={onClose} title={todo.title} en="BIG DEAL" size="tall">
        <div className="space-y-4">
          <div className="flex min-w-0 items-center gap-3 rounded-sm border-3 border-p4g-black bg-p4g-surface p-3 shadow-hard night:border-p4g-yellow">
            <Ring pct={steps.length ? (done / steps.length) * 100 : 0} size={58} stroke={8} label={<span className="p4g-num text-lead">{done}<span className="text-cap">/{steps.length}</span></span>} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 font-display text-lead font-bold text-p4g-ink">
                <span className="p4g-num">{done} / {steps.length} 步</span>
                <span className="rounded-xs bg-p4g-black px-1.5 text-2xs text-p4g-yellow night:bg-p4g-yellow night:text-p4g-black">BIG DEAL</span>
                {cleared && <span className="rounded-xs bg-p4g-green px-1.5 text-2xs text-p4g-black">已收官</span>}
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-meta text-p4g-ink-soft">
                <span>{ATTR_NAMES[todo.attribute]} · 每步 +{todo.points}</span>
                {dl && <span className={cx(dl.urgent && 'font-bold text-p4g-danger')}>{dl.text}</span>}
              </div>
              {todo.currentState && <p className="mt-0.5 truncate text-cap text-p4g-ink-soft">现状：{todo.currentState}</p>}
            </div>
          </div>
          {steps.length === 0 ? <p className="py-2 text-center text-body text-p4g-ink-soft">还没有子步——先拆第一步</p> : (
            <ol className="overflow-hidden rounded-sm border-3 border-p4g-black night:border-p4g-yellow">
              {steps.map((s, i) => (
                <li key={s.id} className={cx('flex min-w-0 items-center gap-2.5 border-b-2 border-[color:var(--p4g-separator-a)] px-2.5 py-2', s.done ? 'bg-p4g-surface-2' : 'bg-p4g-surface')}>
                  <span className="w-6 shrink-0 p4g-num text-meta text-p4g-orange-deep night:text-p4g-orange">{String(i + 1).padStart(2, '0')}</span>
                  <button type="button" disabled={cleared} aria-label={s.done ? '撤销这一步' : '完成这一步'} onClick={() => toggle(i)} className={cx('flex h-7 w-7 shrink-0 items-center justify-center border-3 border-p4g-black disabled:opacity-60', s.done ? 'bg-p4g-orange text-p4g-black' : 'bg-white text-transparent')}><IconCheck size={13} /></button>
                  <span className={cx('min-w-0 flex-1 truncate text-body font-bold text-p4g-ink', s.done && 'line-through opacity-50')}>{s.title}</span>
                  {!cleared && <button type="button" aria-label="删除子步" onClick={() => {
                    if (!useAppStore.getState().todos.some((t) => t.id === todo.id)) { upd({ steps: steps.filter((_, j) => j !== i) }); return; }
                    void actionsOps.removeTodoStep(todo.id, s.id).then(syncReal).catch(() => setNotice('子步删除失败，进度保持不变'));
                  }} className="flex h-8 w-8 shrink-0 items-center justify-center text-p4g-ink-soft"><IconTrash size={14} /></button>}
                </li>
              ))}
            </ol>
          )}
          {!cleared && (
            <>
              <div className="flex min-w-0 gap-2">
                <P4Input wrapClassName="min-w-0 flex-1" placeholder="追加一个够得着的小步…" value={draft} onChange={(e) => setDraft(e.target.value)} aria-label="追加子步" />
                <P4Button disabled={!draft.trim()} onClick={() => {
                  const title = draft.trim();
                  if (!useAppStore.getState().todos.some((t) => t.id === todo.id)) { upd({ steps: [...steps, { id: `n${Date.now()}`, title, source: 'manual' }] }); setDraft(''); return; }
                  void actionsOps.addTodoStep(todo.id, title).then(() => { syncReal(); setDraft(''); }).catch(() => setNotice('子步添加失败，请重试'));
                }}>添加</P4Button>
              </div>
              <P4Button block variant="secondary" disabled={aiBusy} onClick={() => { setAiBusy(true); setTimeout(() => { setAiBusy(false); upd({ steps: [...steps, { id: `ai${Date.now()}`, title: '把错题本按章节重新整理', source: 'ai' }, { id: `ai2${Date.now()}`, title: '考前一晚早点睡', source: 'ai' }] }); setNotice('AI 续拆了 2 条——不合适的直接删'); }, 900); }}>{aiBusy ? '正在续拆…' : '✦ AI 续拆下一组'}</P4Button>
              {notice && <p className="text-center text-meta font-bold text-p4g-ink-soft">{notice}</p>}
              {allDone && <P4Button block size="lg" variant="black" disabled={collapsing} onClick={collapse}>{collapsing ? '结算中…' : `收官 · 领取奖励（SP +${Math.min(20, steps.length * 3)}）`}</P4Button>}
            </>
          )}
          {cleared && (
            rebuild ? (
              <div className="rounded-sm border-3 border-p4g-black bg-p4g-yellow p-3 text-p4g-black shadow-hard-sm">
                <p className="text-meta leading-relaxed">会新立一条同名同步骤的大事，子步全部重置为未完成；<b>当前这条原样归档</b>，已领的奖励和历史记录都不受影响。</p>
                <div className="mt-2 flex gap-2">
                  <P4Button variant="black" block disabled={rebuilding} onClick={() => {
                    if (!useAppStore.getState().todos.some((t) => t.id === todo.id)) { setRebuild(false); setCleared(false); upd({ steps: steps.map((s) => ({ ...s, done: false, doneAt: undefined })) }); return; }
                    setRebuilding(true);
                    void actionsOps.rebuildBigDeal(todo.id).then((newId) => {
                      const fresh = useAppStore.getState().todos.find((t) => t.id === newId);
                      if (fresh) { setTodo(fresh); onChange?.(fresh); }
                      setRebuild(false); setCleared(false);
                    }).catch(() => setNotice('重建失败，原大事未改变')).finally(() => setRebuilding(false));
                  }}>{rebuilding ? '重建中…' : '确认重建'}</P4Button>
                  <P4Button variant="secondary" block onClick={() => setRebuild(false)}>算了</P4Button>
                </div>
              </div>
            ) : <P4Button block variant="ghost" onClick={() => setRebuild(true)}>↻ 重建这件大事</P4Button>
          )}
        </div>
      </P4Sheet>
      <BigDealStepCutIn open={!!stepCut} onClose={() => setStepCut(null)} payload={stepCut ? { dealTitle: todo.title, ...stepCut } : undefined} />
      <BigDealClearCutIn open={clearCut} onClose={() => setClearCut(false)} data={{ title: todo.title, sp: Math.min(20, steps.length * 3), attrs: [ATTR_NAMES[todo.attribute]], stepsCount: steps.length }} />
    </>
  );
}
