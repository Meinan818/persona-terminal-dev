/**
 * 设定本周目标（真实 src/components/weeklyGoal/GoalSetupForm.tsx，抽屉宿主）：
 * 「YYYY-MM-DD ~ YYYY-MM-DD · 至少选择 2 项」；四种目标类型（活动次数 / 任务完成 / 属性点数 / 全属性点数）点击添加 / 已选中；
 * 选中后展开：属性选择（活动次数、属性点数）+ 目标次数 Stepper；「完成奖励（选填）」；取消 / 确认（N 项）。
 */
import { useEffect, useState } from 'react';
import type { AttributeId } from '@/types';
import type { OverlayProps } from '@yellow/registry/types';
import { P4Button, P4Input, P4Sheet, P4Stepper, IconCheck, IconPlus, useToast } from '@yellow/kit';
import { ATTR_IDS, useActionsData } from '@yellow/adapters/pkg2';
import { cx } from '@yellow/lib/cx';

type GT = 'activity_count' | 'todo_count' | 'attr_points' | 'total_points';
export interface GoalItem { type: GT; attribute?: AttributeId; target: number; current: number }
const LABEL: Record<GT, string> = { activity_count: '活动次数', todo_count: '任务完成', attr_points: '属性点数', total_points: '全属性点数' };
const DESC: Record<GT, string> = { activity_count: '完成指定属性的记录次数', todo_count: '完成任务的次数', attr_points: '获得指定属性的点数', total_points: '所有属性的总获得点数' };
const DEF: Record<GT, number> = { activity_count: 6, todo_count: 10, attr_points: 15, total_points: 36 };
const ALL: GT[] = ['activity_count', 'todo_count', 'attr_points', 'total_points'];

export default function GoalSetupForm({ open, onClose, params, initial, initialReward, onSubmit }: OverlayProps & { initial?: GoalItem[]; initialReward?: string; onSubmit?: (items: GoalItem[], reward: string) => void }) {
  const { ATTR_NAMES, WEEKLY_GOAL } = useActionsData();
  const toast = useToast();
  const edit = params?.get('variant') === 'edit';
  const [items, setItems] = useState<Record<GT, GoalItem>>(() => Object.fromEntries(ALL.map((t) => [t, { type: t, attribute: t === 'activity_count' || t === 'attr_points' ? 'knowledge' : undefined, target: DEF[t], current: 0 }])) as Record<GT, GoalItem>);
  const [sel, setSel] = useState<Set<GT>>(new Set());
  const [reward, setReward] = useState('');
  useEffect(() => {
    if (!open) return;
    const init = initial ?? (edit ? (WEEKLY_GOAL.goals as GoalItem[]) : undefined);
    if (init) { setSel(new Set(init.map((g) => g.type))); setItems((p) => { const n = { ...p }; init.forEach((g) => { n[g.type] = { ...g }; }); return n; }); setReward(initialReward ?? (edit ? WEEKLY_GOAL.reward : '')); }
    else { setSel(new Set()); setReward(''); }
  }, [open]); // eslint-disable-line
  const toggle = (t: GT) => setSel((s) => { const n = new Set(s); if (n.has(t)) n.delete(t); else n.add(t); return n; });
  const ok = sel.size >= 2;
  const submit = () => { if (!ok) return; const list = ALL.filter((t) => sel.has(t)).map((t) => items[t]); onSubmit ? onSubmit(list, reward.trim()) : toast.success('本周目标已设定'); onClose(); };
  return (
    <P4Sheet open={open} onClose={onClose} title="设定本周目标" en="WEEKLY GOAL" size="tall"
      footer={<div className="flex gap-3"><P4Button variant="secondary" block onClick={onClose}>取消</P4Button><P4Button block disabled={!ok} onClick={submit}>确认（{sel.size} 项）</P4Button></div>}>
      <p className="mb-3 p4g-date-type text-meta text-p4g-ink-soft">{WEEKLY_GOAL.weekStart} ~ {WEEKLY_GOAL.weekEnd}　· 至少选择 2 项</p>
      <div className="grid grid-cols-1 gap-2.5">
        {ALL.map((t) => {
          const on = sel.has(t);
          const it = items[t];
          return (
            <div key={t} className={cx('min-w-0 overflow-hidden rounded-sm border-3 shadow-hard-sm', on ? 'border-p4g-black bg-p4g-yellow text-p4g-black' : 'border-p4g-line bg-p4g-surface text-p4g-ink')}>
              <button type="button" onClick={() => toggle(t)} aria-label={`${LABEL[t]}：${on ? '已选中' : '点击添加'}`} aria-pressed={on} className="flex w-full min-w-0 items-center gap-3 px-3 py-2.5 text-left">
                <span className={cx('flex h-7 w-7 shrink-0 items-center justify-center rounded-xs border-3', on ? 'border-p4g-black bg-p4g-black text-p4g-yellow' : 'border-current')}>{on ? <IconCheck size={14} /> : <IconPlus size={12} />}</span>
                <span className="min-w-0 flex-1"><span className="block truncate font-display text-body font-bold">{LABEL[t]}</span><span className="block truncate text-cap opacity-75">{DESC[t]}</span></span>
                {!on && <span className="shrink-0 text-cap font-bold opacity-70">点击添加</span>}
              </button>
              {on && (
                <div className="space-y-2.5 border-t-3 border-dashed border-p4g-black/40 bg-p4g-surface-2 px-3 py-2.5 text-p4g-ink">
                  {it.attribute && (
                    <div className="flex flex-wrap gap-1.5">
                      {ATTR_IDS.map((a) => <button key={a} type="button" onClick={() => setItems((p) => ({ ...p, [t]: { ...p[t], attribute: a } }))} aria-pressed={it.attribute === a}
                        className={cx('rounded-xs border-thin px-2 py-0.5 font-display text-meta font-bold', it.attribute === a ? 'border-p4g-black bg-p4g-tag text-[color:var(--p4g-tag-ink)]' : 'border-p4g-line text-p4g-ink')}>{ATTR_NAMES[a]}</button>)}
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-display text-meta font-bold">目标</span>
                    <P4Stepper value={it.target} min={1} max={99} onChange={(v) => setItems((p) => ({ ...p, [t]: { ...p[t], target: v } }))} label={`${LABEL[t]}目标`} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <P4Input wrapClassName="mt-4" label="完成奖励（选填）" placeholder="给自己一个奖励吧…" value={reward} onChange={(e) => setReward(e.target.value)} />
    </P4Sheet>
  );
}
