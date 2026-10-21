/**
 * 设定本周目标（真实 src/components/weeklyGoal/GoalSetupForm.tsx，抽屉宿主）：
 * 「YYYY-MM-DD ~ YYYY-MM-DD · 至少选择 2 项」；「目标」四种类型（活动次数 / 任务完成 / 属性点数 / 全属性点数）点击添加 / 已选中（可多选）；
 * 选中后展开：属性选择（活动次数、属性点数）+ 目标次数 Stepper（减少 / 增加）；「完成奖励（选填）」（给自己一个奖励吧…）；取消 / 确认（N 项）。
 * ?variant=edit 「修改选项」入口（带当前目标）。
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { AttributeId } from '@/types';
import type { OverlayProps } from '@blue/registry/types';
import { P3Button, P3Field, P3Input, P3Sheet, P3Stepper, useToast, P3R, slantClip, SelectWedge, IconCheck, IconPlus } from '@blue/kit';
import { useBoldness } from '@blue/lib/prefs';
import { ATTR_IDS, ATTR_NAMES, WEEKLY_GOAL } from '@blue/adapters/pkg2';

type GT = 'activity_count' | 'todo_count' | 'attr_points' | 'total_points';
export interface GoalItem { type: GT; attribute?: AttributeId; target: number; current: number }
const LABEL: Record<GT, string> = { activity_count: '活动次数', todo_count: '任务完成', attr_points: '属性点数', total_points: '全属性点数' };
const DESC: Record<GT, string> = { activity_count: '完成指定属性的记录次数', todo_count: '完成任务的次数', attr_points: '获得指定属性的点数', total_points: '所有属性的总获得点数' };
const DEF: Record<GT, number> = { activity_count: 6, todo_count: 10, attr_points: 15, total_points: 36 };
const ALL: GT[] = ['activity_count', 'todo_count', 'attr_points', 'total_points'];

export default function GoalSetupForm({ open, onClose, params, initial, initialReward, onSubmit }: OverlayProps & { initial?: GoalItem[]; initialReward?: string; onSubmit?: (items: GoalItem[], reward: string) => void }) {
  const toast = useToast();
  const anim = useBoldness();
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
  const submit = () => { if (!ok) return; const list = ALL.filter((t) => sel.has(t)).map((t) => items[t]); if (onSubmit) onSubmit(list, reward.trim()); else toast.success('本周目标已设定'); onClose(); };
  return (
    <P3Sheet open={open} onClose={onClose} title="设定本周目标" en="WEEKLY GOAL" size="tall"
      footer={<div className="flex gap-3"><P3Button tone="soft" block onClick={onClose}>取消</P3Button><P3Button block corner disabled={!ok} onClick={submit}>确认（{sel.size} 项）</P3Button></div>}>
      <p className="mb-3 font-cond text-[13px]" style={{ color: P3R.grey }}>{WEEKLY_GOAL.weekStart} ~ {WEEKLY_GOAL.weekEnd}　<span className="font-body font-bold" style={{ color: ok ? P3R.grey : 'var(--p3r-coral-ink)' }}>· 至少选择 2 项</span></p>
      <div className="mb-2 text-[13px] font-black" style={{ color: P3R.ink }}>目标</div>
      <div className="grid grid-cols-1 gap-2">
        {ALL.map((t) => {
          const on = sel.has(t);
          const it = items[t];
          return (
            <div key={t} className="min-w-0">
              <button type="button" onClick={() => toggle(t)} aria-label={`${LABEL[t]}：${on ? '已选中' : '点击添加'}`} aria-pressed={on} className="relative flex min-h-[54px] w-full min-w-0 items-center gap-3 px-5 py-2 text-left">
                <span aria-hidden className="absolute inset-0" style={{ background: on ? 'transparent' : 'var(--p3r-row)', clipPath: slantClip(10) }} />
                {on && <SelectWedge className="-left-1 -right-2 inset-y-0" />}
                <span className="relative flex h-7 w-8 shrink-0 items-center justify-center" style={{ background: on ? 'var(--p3r-mulberry)' : P3R.cyanPale, color: on ? 'var(--p3r-cream)' : P3R.ink, clipPath: slantClip(5) }}>{on ? <IconCheck size={14} /> : <IconPlus size={12} />}</span>
                <span className="relative min-w-0 flex-1">
                  <span className="block truncate font-heavy text-[17px] leading-tight" style={{ color: on ? 'var(--p3r-mulberry)' : P3R.ink }}>{LABEL[t]}</span>
                  <span className="block truncate text-[12px]" style={{ color: on ? 'var(--p3r-mulberry)' : P3R.grey }}>{DESC[t]}</span>
                </span>
                <span className="relative shrink-0 text-[12px] font-black" style={{ color: on ? 'var(--p3r-mulberry)' : P3R.grey }}>{on ? '已选中' : '点击添加'}</span>
              </button>
              <AnimatePresence initial={false}>
                {on && (
                  <motion.div initial={anim ? { opacity: 0, y: -6 } : { opacity: 0 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mx-2 mt-1 space-y-2.5 px-4 py-3" style={{ background: P3R.cyanFaint, clipPath: slantClip(8) }}>
                    {it.attribute && (
                      <div className="flex flex-wrap gap-1.5">
                        {ATTR_IDS.map((a) => {
                          const s = it.attribute === a;
                          return <button key={a} type="button" onClick={() => setItems((p) => ({ ...p, [t]: { ...p[t], attribute: a } }))} aria-pressed={s} className="px-3 py-1 text-[12px] font-black" style={{ clipPath: slantClip(5), background: s ? P3R.blue : P3R.panel, color: s ? P3R.onBlue : P3R.ink }}>{ATTR_NAMES[a]}</button>;
                        })}
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[13px] font-black" style={{ color: P3R.ink }}>目标次数</span>
                      <P3Stepper value={it.target} min={1} max={99} onChange={(v) => setItems((p) => ({ ...p, [t]: { ...p[t], target: v } }))} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
      <P3Field className="mt-4" label="完成奖励（选填）"><P3Input placeholder="给自己一个奖励吧…" value={reward} onChange={(e) => setReward(e.target.value)} /></P3Field>
    </P3Sheet>
  );
}
