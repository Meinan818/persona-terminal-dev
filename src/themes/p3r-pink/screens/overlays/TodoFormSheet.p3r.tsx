/**
 * 添加 / 编辑任务抽屉（真实 src/pages/Todos.tsx showAdd SheetModal；p3 = 周几 / 模式钮玫红斜块，CONFIG 开关行）：
 * 「📷 拍一张课表 / 日程表，一次导入一批」（正在读取课表… → 课表导入 · 确认）；标题「今日要完成什么？」/「想搞定的一件大事…」；
 * 约定 / 作战待办的锁定说明；模式 单次（做完即归档）/ 计数（重复 N 次）/ 大事（大事拆小步）+「编辑中不可切换模式」；
 * 计数：「目标次数」Stepper +「长期任务」；大事：「现在到哪一步了？」、「截止日（可选）」+ 清除、子步列表 + 删除子步、「+ 手写一步」「✦ AI 帮我拆」；
 * 挂愿望；「奖励 · 主属性」+ 点数；「副奖励（可选，最多 2 条）」；
 * 「更多设置」：标记为重要、每日重置、截止日 DDL（可选）、每周几执行（可选）+「清除选择」、是否启用、指定启用日期（可选）；取消 / 添加（保存）。
 * 直达：?variant=edit | big | pact；?more=1 展开更多设置；?step=ai（AI 拆解中）。
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState, type ReactNode } from 'react';
import type { AttributeId, Todo, TodoStep } from '@/types';
import type { OverlayProps } from '@pink/registry/types';
import { P3Button, P3ConfigRow, P3Field, P3Input, P3OnOff, P3Sheet, P3Stepper, useToast, P3R, slantClip, SelectWedge, IconChevronDown, IconMinus, IconPlus, IconTrash, Glyph } from '@pink/kit';
import { AIThinking } from '@pink/fx';
import { useBoldness } from '@pink/lib/prefs';
import { ATTR_IDS, ATTR_NAMES, TODOS } from '@pink/adapters/pkg2';
import { WEEK_LABELS } from '@pink/screens/pkg2/common';
import { WishMountPicker } from './ActivityRecordSheet.p3r';
import TodosScheduleImport from './TodosScheduleImport.p3r';

type Mode = 'single' | 'count' | 'big';
export interface TodoForm { title: string; mode: Mode; targetCount: number; isLongTerm: boolean; attribute: AttributeId; points: number; extraBoosts: { attribute: AttributeId; points: number }[]; important: boolean; repeatDaily: boolean; deadline: string; weekdays: number[]; isActive: boolean; startDate: string; steps: TodoStep[]; currentState: string; wishId?: string }
const empty = (): TodoForm => ({ title: '', mode: 'single', targetCount: 3, isLongTerm: false, attribute: 'knowledge', points: 1, extraBoosts: [], important: false, repeatDaily: false, deadline: '', weekdays: [], isActive: true, startDate: '', steps: [], currentState: '' });
const fromTodo = (t: Todo): TodoForm => ({ ...empty(), title: t.title, mode: t.isBigDeal ? 'big' : (t.frequency as Mode), targetCount: t.targetCount ?? 3, isLongTerm: !!t.isLongTerm, attribute: t.attribute, points: t.points, extraBoosts: t.extraBoosts ?? [], important: !!t.important, repeatDaily: !!t.repeatDaily, deadline: t.deadline ?? '', weekdays: t.weekdays ?? [], isActive: t.isActive, startDate: t.startDate ?? '', steps: t.steps ?? [], currentState: t.currentState ?? '', wishId: t.wishId });

const AttrPick = ({ value, onChange, disabled }: { value: AttributeId; onChange: (a: AttributeId) => void; disabled?: (a: AttributeId) => boolean }) => (
  <div className="flex flex-wrap gap-1.5">
    {ATTR_IDS.map((a) => {
      const on = value === a;
      return <button key={a} type="button" disabled={disabled?.(a)} onClick={() => onChange(a)} aria-pressed={on} className="px-3 py-1.5 text-[12px] font-black disabled:opacity-30"
        style={{ clipPath: slantClip(6), background: on ? P3R.blue : P3R.cyanFaint, color: on ? P3R.onBlue : P3R.ink }}>{ATTR_NAMES[a]}</button>;
    })}
  </div>
);
const DateRow = ({ label, hint, value, onChange, id }: { label: ReactNode; hint?: ReactNode; value: string; onChange: (v: string) => void; id: string }) => (
  <P3Field label={label} hint={hint}>
    <span className="flex min-w-0 items-center gap-2">
      <span className="min-w-0 flex-1"><P3Input id={id} type="date" value={value} onChange={(e) => onChange(e.target.value)} aria-label={typeof label === 'string' ? label : id} /></span>
      {value && <button type="button" onClick={() => onChange('')} className="shrink-0 text-[12px] font-black underline" style={{ color: P3R.grey }}>清除</button>}
    </span>
  </P3Field>
);

export default function TodoFormSheet({ open, onClose, params, todo, onSave }: OverlayProps & { todo?: Todo | null; onSave?: (f: TodoForm, id?: string) => void }) {
  const toast = useToast();
  const anim = useBoldness();
  const v = params?.get('variant');
  const editing = todo ?? (v === 'edit' ? TODOS[0] : v === 'big' ? TODOS.find((t) => t.isBigDeal)! : v === 'pact' ? TODOS.find((t) => t.pact)! : null);
  const [f, setF] = useState<TodoForm>(empty());
  const [more, setMore] = useState(params?.get('more') === '1');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [stepDraft, setStepDraft] = useState('');
  const [scheduleBusy, setScheduleBusy] = useState(false);
  const [schedule, setSchedule] = useState(false);
  const set = (p: Partial<TodoForm>) => setF((cur) => ({ ...cur, ...p }));
  const aiSplit = (title = f.title) => {
    setAiBusy(true); setAiError(null);
    window.setTimeout(() => {
      setAiBusy(false);
      if (!title.trim()) { setAiError('这次没拆出能用的小步。换个说法，或手写一条吧'); return; }
      setF((cur) => ({ ...cur, steps: [...cur.steps, ...['列出要做的所有事', '先做最小的那一件', '给自己留一天缓冲'].map((t, i) => ({ id: `ai${Date.now()}${i}`, title: t, source: 'ai' as const }))] }));
    }, 2400);
  };
  useEffect(() => {
    if (!open) return;
    setF(editing ? fromTodo(editing) : empty()); setMore(params?.get('more') === '1'); setAiError(null);
    if (params?.get('step') === 'ai') { setF({ ...empty(), mode: 'big', title: '期末考试' }); aiSplit('期末考试'); }
  }, [open]); // eslint-disable-line
  const linked = !!(editing?.pact || editing?.orgOp);
  const used = new Set<string>([f.attribute, ...f.extraBoosts.map((b) => b.attribute)]);
  const firstUnused = (ATTR_IDS.find((a) => !used.has(a)) ?? 'knowledge') as AttributeId;
  const canAddBoost = f.extraBoosts.length < 2 && used.size < ATTR_IDS.length;
  const save = () => { if (!f.title.trim()) { toast.error('先写一个标题'); return; } if (onSave) onSave(f, editing?.id); else toast.success(editing ? '已保存' : '已添加'); onClose(); };

  return (
    <>
      <P3Sheet open={open} onClose={onClose} title={editing ? '编辑任务' : '添加任务'} en={editing ? 'EDIT' : 'NEW QUEST'} size="tall"
        footer={<div className="flex gap-3"><P3Button tone="soft" block onClick={onClose}>取消</P3Button><P3Button block corner onClick={save}>{editing ? '保存' : '添加'}</P3Button></div>}>
        <div className="space-y-4">
          {!editing && (
            <button type="button" disabled={scheduleBusy} onClick={() => { setScheduleBusy(true); window.setTimeout(() => { setScheduleBusy(false); setSchedule(true); }, 1400); }}
              className="flex w-full min-w-0 items-center gap-2 px-4 py-2.5 text-left text-[13px] font-black" style={{ background: P3R.cyanFaint, color: P3R.ink, clipPath: slantClip(9) }}>
              {scheduleBusy ? <span aria-hidden className="pk-spin h-4 w-4 shrink-0 rounded-full border-2 border-current border-t-transparent" /> : <span aria-hidden>▣</span>}
              <span className="min-w-0 truncate">{scheduleBusy ? '正在读取课表…' : '拍一张课表 / 日程表，一次导入一批'}</span>
            </button>
          )}
          <P3Input value={f.title} disabled={linked} onChange={(e) => set({ title: e.target.value })} placeholder={f.mode === 'big' ? '想搞定的一件大事…' : '今日要完成什么？'} aria-label="任务标题" className="text-[17px]" />
          {linked && editing && (
            <p className="px-4 py-2.5 text-[12px] leading-relaxed" style={{ background: P3R.ink, color: 'var(--p3r-on-ink)', clipPath: slantClip(9) }}>
              {editing.orgOp ? `这条待办是「${editing.orgOp.orgName}」${editing.orgOp.kind === 'big' ? '一场作战' : '一个目标'}里你的那一份：标题、截止日由它决定，这里只能改属性、分值和「重要」。`
                : `这条待办跟着和 ${editing.pact?.partnerName ?? 'Ta'} 的「一起进步」约定走：标题、每日重置、截止日和执行日期都由约定决定，这里只能改属性、分值和「重要」。要停下，到羁绊页结束这个约定。`}
            </p>
          )}
          {!linked && (
            <div>
              <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="模式">
                {([{ key: 'single', name: '单次', hint: '做完即归档', glyph: '✓' }, { key: 'count', name: '计数', hint: '重复 N 次', glyph: '∞' }, { key: 'big', name: '大事', hint: '大事拆小步', glyph: '◆' }] as const).map((m) => {
                  const on = f.mode === m.key;
                  return (
                    <button key={m.key} type="button" role="radio" aria-checked={on} disabled={!!editing && !on} onClick={() => set({ mode: m.key })} className="relative min-w-0 px-1 py-2 text-center disabled:opacity-35">
                      <span aria-hidden className="absolute inset-0" style={{ background: on ? P3R.blue : P3R.cyanFaint, clipPath: slantClip(9) }} />
                      <div className="relative font-cond text-[22px] leading-none" style={{ color: on ? P3R.onBlue : P3R.roseInk }}>{m.glyph}</div>
                      <div className="relative mt-1 truncate text-[14px] font-black" style={{ color: on ? P3R.onBlue : P3R.ink }}>{m.name}</div>
                      <div className="relative truncate text-[10px] font-bold" style={{ color: on ? P3R.onBlue : P3R.grey, opacity: on ? 0.85 : 1 }}>{m.hint}</div>
                    </button>
                  );
                })}
              </div>
              {editing && <p className="mt-1 text-[11px]" style={{ color: P3R.grey }}>编辑中不可切换模式</p>}
            </div>
          )}
          {f.mode === 'count' && !linked && (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3 px-1"><span className="text-[14px] font-black" style={{ color: P3R.ink }}>目标次数</span><P3Stepper value={f.targetCount} min={1} max={99} onChange={(n) => set({ targetCount: n })} /></div>
              <P3ConfigRow label="长期任务" hint="进度长期保留，不随时间刷新，直到完成为止"><P3OnOff value={f.isLongTerm} onChange={(b) => set({ isLongTerm: b, repeatDaily: b ? false : f.repeatDaily })} ariaLabel="长期任务" /></P3ConfigRow>
            </div>
          )}
          {f.mode === 'big' && !linked && (
            <div className="space-y-2.5 px-4 py-3" style={{ background: 'var(--p3r-row)', clipPath: slantClip(12) }}>
              <P3Input value={f.currentState} onChange={(e) => set({ currentState: e.target.value })} placeholder="现在到哪一步了？一句话（可选，AI 拆解会参考）" aria-label="现在到哪一步了" />
              <DateRow id="bd-deadline" label="截止日（可选）" value={f.deadline} onChange={(v2) => set({ deadline: v2 })} />
              {f.steps.length > 0 && (
                <ol className="space-y-1">
                  {f.steps.map((s, i) => (
                    <motion.li key={s.id} className="flex min-w-0 items-center gap-2 px-3 py-1.5" style={{ background: P3R.panel, clipPath: slantClip(6) }} initial={anim ? { opacity: 0, x: -10 } : false} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i, 6) * 0.04 }}>
                      <span className="w-5 shrink-0 font-cond text-[13px]" style={{ color: P3R.roseInk }}>{i + 1}</span>
                      <span className="min-w-0 flex-1 truncate text-[14px]" style={{ color: P3R.ink }}>{s.title}</span>
                      {s.source === 'ai' && <span className="shrink-0 font-cond text-[11px]" style={{ color: P3R.lilacInk }}>AI</span>}
                      <button type="button" aria-label="删除子步" onClick={() => set({ steps: f.steps.filter((_, j) => j !== i) })} className="shrink-0 p-1" style={{ color: P3R.grey }}><IconTrash size={13} /></button>
                    </motion.li>
                  ))}
                </ol>
              )}
              <P3Input placeholder="一个够得着的小步…" value={stepDraft} onChange={(e) => setStepDraft(e.target.value)} aria-label="子步" />
              <div className="grid grid-cols-2 gap-2">
                <P3Button tone="soft" disabled={!stepDraft.trim()} onClick={() => { set({ steps: [...f.steps, { id: `m${Date.now()}`, title: stepDraft.trim(), source: 'manual' }] }); setStepDraft(''); }}>+ 手写一步</P3Button>
                <P3Button tone="ink" busy={aiBusy} busyText="正在拆…" onClick={() => aiSplit()}>✦ AI 帮我拆</P3Button>
              </div>
              {aiBusy && <AIThinking label="正在拆这件大事…" sub="读标题和「现在到哪一步了」" />}
              {aiError && <p className="text-[12px] font-black" style={{ color: 'var(--p3r-coral-ink)' }}>{aiError}</p>}
              <p className="text-[11px]" style={{ color: P3R.grey }}>每完成一子步得主属性 +{f.points}；全部完成触发收官奖励（SP + 触及属性各 +1）</p>
            </div>
          )}
          <WishMountPicker value={f.wishId} onChange={(id) => set({ wishId: id })} />
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3"><span className="text-[14px] font-black" style={{ color: P3R.ink }}>奖励 · 主属性</span><P3Stepper value={f.points} min={1} max={5} onChange={(n) => set({ points: n })} /></div>
            <AttrPick value={f.attribute} onChange={(a) => set({ attribute: a, extraBoosts: f.extraBoosts.filter((b) => b.attribute !== a) })} />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between"><span className="text-[12px] font-black" style={{ color: P3R.grey }}>副奖励（可选，最多 2 条）</span>
              {canAddBoost && <button type="button" title="添加副奖励" aria-label="添加副奖励" onClick={() => set({ extraBoosts: [...f.extraBoosts, { attribute: firstUnused, points: 1 }] })} className="flex h-7 w-8 items-center justify-center" style={{ background: P3R.blue, color: P3R.onBlue, clipPath: slantClip(5) }}><IconPlus size={12} /></button>}
            </div>
            {f.extraBoosts.map((b, i) => (
              <div key={i} className="flex min-w-0 flex-wrap items-center gap-2 px-3 py-2" style={{ background: 'var(--p3r-row)', clipPath: slantClip(8) }}>
                <div className="min-w-0 flex-1"><AttrPick value={b.attribute} disabled={(a) => a !== b.attribute && used.has(a)} onChange={(a) => set({ extraBoosts: f.extraBoosts.map((x, j) => (j === i ? { ...x, attribute: a } : x)) })} /></div>
                <P3Stepper value={b.points} min={1} max={5} onChange={(n) => set({ extraBoosts: f.extraBoosts.map((x, j) => (j === i ? { ...x, points: n } : x)) })} />
                <button type="button" aria-label="删除副奖励" onClick={() => set({ extraBoosts: f.extraBoosts.filter((_, j) => j !== i) })} className="p-1" style={{ color: P3R.grey }}><IconMinus size={14} /></button>
              </div>
            ))}
          </div>
          <div>
            <button type="button" onClick={() => setMore((m) => !m)} aria-expanded={more} className="relative flex h-10 w-full items-center gap-2 px-4 text-[15px] font-black" style={{ color: more ? 'var(--p3r-mulberry)' : P3R.ink }}>
              <span aria-hidden className="absolute inset-0" style={{ background: more ? 'transparent' : P3R.cyanFaint, clipPath: slantClip(9) }} />
              {more && <SelectWedge className="-left-1 -right-2 inset-y-0" />}
              <span className="relative">更多设置</span><span className="flex-1" /><IconChevronDown size={14} className={`relative transition-transform ${more ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence initial={false}>
              {more && (
                <motion.div className="mt-3 space-y-2.5" initial={anim ? { opacity: 0, y: -8 } : { opacity: 0 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <P3ConfigRow label={<><Glyph name="star" /> 标记为重要</>} hint="重要任务将在首页置顶显示，并记录在历史中"><P3OnOff value={f.important} onChange={(b) => set({ important: b })} ariaLabel="标记为重要" /></P3ConfigRow>
                  {!linked && <P3ConfigRow label="每日重置" hint="每天刷新任务，包括进度"><P3OnOff value={f.repeatDaily} disabled={f.isLongTerm || !!f.deadline} onChange={(b) => set({ repeatDaily: b })} ariaLabel="每日重置" /></P3ConfigRow>}
                  {!linked && <DateRow id="todo-deadline" label="截止日 DDL（可选）" hint="首页和今日任务会显示「剩 N 天」；与「每日重置」只能二选一" value={f.deadline} onChange={(v2) => set({ deadline: v2, repeatDaily: v2 ? false : f.repeatDaily })} />}
                  {!linked && (
                    <div>
                      <span className="mb-1.5 block text-[13px] font-black" style={{ color: P3R.ink }}>每周几执行（可选）</span>
                      <div className="grid grid-cols-7 gap-1">
                        {WEEK_LABELS.map((w, d) => { const on = f.weekdays.includes(d); return <button key={d} type="button" onClick={() => set({ weekdays: on ? f.weekdays.filter((x) => x !== d) : [...f.weekdays, d].sort() })} aria-pressed={on} aria-label={w} className="min-w-0 py-1.5 text-[12px] font-black" style={{ clipPath: slantClip(5), background: on ? P3R.blue : P3R.cyanFaint, color: on ? P3R.onBlue : P3R.ink }}>{w.slice(1)}</button>; })}
                      </div>
                      {f.weekdays.length > 0 && <button type="button" onClick={() => set({ weekdays: [] })} className="mt-1 text-[11px] font-black underline" style={{ color: P3R.grey }}>清除选择</button>}
                    </div>
                  )}
                  {!linked && <P3ConfigRow label="是否启用"><P3OnOff value={f.isActive} onChange={(b) => set({ isActive: b })} ariaLabel="是否启用" /></P3ConfigRow>}
                  {!linked && <DateRow id="todo-start" label="指定启用日期（可选）" hint="设定后，该任务在指定日期前不会出现在今日任务中" value={f.startDate} onChange={(v2) => set({ startDate: v2 })} />}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </P3Sheet>
      <TodosScheduleImport open={schedule} onClose={() => setSchedule(false)} onImport={(n) => { toast.success(`已导入 ${n} 项`); onClose(); }} />
    </>
  );
}
