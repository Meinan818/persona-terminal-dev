/**
 * 添加 / 编辑任务抽屉（真实 src/pages/Todos.tsx showAdd SheetModal）：
 * 「📷 拍一张课表 / 日程表，一次导入一批（走视觉档）」（📷 正在读取课表… → 课表导入 · 确认）；标题「今日要完成什么？」/「想搞定的一件大事…」；
 * 约定 / 作战待办的锁定说明；模式 单次（做完即归档）/ 计数（重复 N 次）/ BIG DEAL（大事拆小步）+「编辑中不可切换模式」；
 * 计数：「目标次数」Stepper + 「长期任务」开关；大事：「现在到哪一步了？」、截止日（可选）+ 清除、子步列表 + 删除子步、「+ 手写一步」「✦ AI 帮我拆」、说明；
 * 「奖励 · 主属性」+ 点数 Stepper；「副奖励（可选，最多 2 条）」+ 添加 / 删除；
 * 「更多设置」折叠：标记为重要、每日重置、截止日 DDL（可选）+ 清除、每周几执行（可选）+ 清除选择、是否启用、指定启用日期（可选）+ 清除；取消 / 添加（保存）。
 * ?variant=edit 编辑；?variant=big 大事；?variant=pact 约定待办。
 */
import { useEffect, useState } from 'react';
import type { AttributeId, Todo, TodoStep } from '@real/types';
import type { OverlayProps } from '@yellow/registry/types';
import { P4Button, P4Input, P4Sheet, P4Stepper, P4Switch, IconChevronDown, IconMinus, IconPlus, IconTrash, useToast } from '@yellow/kit';
import { ATTR_IDS, ATTR_NAMES, TODOS } from '@yellow/mock/pkg2';
import { WEEK_LABELS } from '@yellow/screens/pkg2/common';
import { cx } from '@yellow/lib/cx';
import { WishMountPicker } from './ActivityRecordSheet.p4g';
import TodosScheduleImport from './TodosScheduleImport.p4g';

type Mode = 'single' | 'count' | 'big';
interface Form { title: string; mode: Mode; targetCount: number; isLongTerm: boolean; attribute: AttributeId; points: number; extraBoosts: { attribute: AttributeId; points: number }[]; important: boolean; repeatDaily: boolean; deadline: string; weekdays: number[]; isActive: boolean; startDate: string; steps: TodoStep[]; currentState: string; wishId?: string }
const empty = (): Form => ({ title: '', mode: 'single', targetCount: 3, isLongTerm: false, attribute: 'knowledge', points: 1, extraBoosts: [], important: false, repeatDaily: false, deadline: '', weekdays: [], isActive: true, startDate: '', steps: [], currentState: '' });
const fromTodo = (t: Todo): Form => ({ ...empty(), title: t.title, mode: t.isBigDeal ? 'big' : t.frequency, targetCount: t.targetCount ?? 3, isLongTerm: !!t.isLongTerm, attribute: t.attribute, points: t.points, extraBoosts: t.extraBoosts ?? [], important: !!t.important, repeatDaily: !!t.repeatDaily, deadline: t.deadline ?? '', weekdays: t.weekdays ?? [], isActive: t.isActive, startDate: t.startDate ?? '', steps: t.steps ?? [], currentState: t.currentState ?? '', wishId: t.wishId });

const Row = ({ title, desc, children, tone }: { title: string; desc?: string; children: React.ReactNode; tone?: 'yellow' }) => (
  <div className={cx('flex min-w-0 items-start gap-3 rounded-sm border-3 p-3', tone === 'yellow' ? 'border-p4g-black bg-p4g-yellow text-p4g-black' : 'border-p4g-line bg-p4g-surface text-p4g-ink')}>
    <div className="min-w-0 flex-1"><div className="font-display text-body font-bold">{title}</div>{desc && <p className="mt-0.5 text-cap opacity-75">{desc}</p>}</div>
    <div className="shrink-0">{children}</div>
  </div>
);
const AttrPick = ({ value, onChange, disabled }: { value: AttributeId; onChange: (a: AttributeId) => void; disabled?: (a: AttributeId) => boolean }) => (
  <div className="flex flex-wrap gap-1.5">
    {ATTR_IDS.map((a) => <button key={a} type="button" disabled={disabled?.(a)} onClick={() => onChange(a)} aria-pressed={value === a}
      className={cx('rounded-xs border-thin px-2.5 py-1 font-display text-meta font-bold disabled:opacity-30', value === a ? 'border-p4g-black bg-p4g-tag text-[color:var(--p4g-tag-ink)] shadow-hard-sm' : 'border-p4g-line bg-p4g-surface text-p4g-ink')}>{ATTR_NAMES[a]}</button>)}
  </div>
);

export default function TodoFormSheet({ open, onClose, params, todo, onSave }: OverlayProps & { todo?: Todo | null; onSave?: (f: Form, id?: string) => void }) {
  const toast = useToast();
  const v = params?.get('variant');
  const editing = todo ?? (v === 'edit' ? TODOS[0] : v === 'big' ? TODOS.find((t) => t.isBigDeal)! : v === 'pact' ? TODOS.find((t) => t.pact)! : null);
  const [f, setF] = useState<Form>(empty());
  const [more, setMore] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [stepDraft, setStepDraft] = useState('');
  const [scheduleBusy, setScheduleBusy] = useState(false);
  const [schedule, setSchedule] = useState(false);
  useEffect(() => { if (open) { setF(editing ? fromTodo(editing) : empty()); setMore(false); setAiError(null); } }, [open]); // eslint-disable-line
  const set = (p: Partial<Form>) => setF((cur) => ({ ...cur, ...p }));
  const linked = !!(editing?.pact || editing?.orgOp);
  const used = new Set<string>([f.attribute, ...f.extraBoosts.map((b) => b.attribute)]);
  const firstUnused = (ATTR_IDS.find((a) => !used.has(a)) ?? 'knowledge') as AttributeId;
  const canAddBoost = f.extraBoosts.length < 2 && used.size < ATTR_IDS.length;
  const save = () => { if (!f.title.trim()) { toast.error('先写一个标题'); return; } onSave ? onSave(f, editing?.id) : toast.success(editing ? '已保存' : '已添加'); onClose(); };
  const aiSplit = () => { setAiBusy(true); setAiError(null); setTimeout(() => { setAiBusy(false); if (!f.title.trim()) { setAiError('这次没拆出能用的小步。换个说法，或手写一条吧'); return; } set({ steps: [...f.steps, ...['列出要做的所有事', '先做最小的那一件', '给自己留一天缓冲'].map((t, i) => ({ id: `ai${Date.now()}${i}`, title: t, source: 'ai' as const }))] }); }, 900); };

  return (
    <>
      <P4Sheet open={open} onClose={onClose} title={editing ? '编辑任务' : '添加任务'} en={editing ? 'EDIT QUEST' : 'NEW QUEST'} size="tall"
        footer={<div className="flex gap-3"><P4Button variant="secondary" block onClick={onClose}>取消</P4Button><P4Button block onClick={save}>{editing ? '保存' : '添加'}</P4Button></div>}>
        <div className="space-y-4">
          {!editing && (
            <button type="button" disabled={scheduleBusy} onClick={() => { setScheduleBusy(true); setTimeout(() => { setScheduleBusy(false); setSchedule(true); }, 900); }}
              className="w-full rounded-sm border-3 border-dashed border-p4g-line bg-p4g-surface px-3 py-2.5 text-left font-display text-meta font-bold text-p4g-ink">
              {scheduleBusy ? '📷 正在读取课表…' : '📷 拍一张课表 / 日程表，一次导入一批（走视觉档）'}
            </button>
          )}
          <P4Input value={f.title} disabled={linked} onChange={(e) => set({ title: e.target.value })} placeholder={f.mode === 'big' ? '想搞定的一件大事…' : '今日要完成什么？'} aria-label="任务标题" className="text-lead" />
          {linked && editing && (
            <p className="rounded-sm bg-p4g-msg px-3 py-2 text-meta leading-relaxed text-[color:var(--p4g-msg-ink)]">
              {editing.orgOp ? `这条待办是「${editing.orgOp.orgName}」${editing.orgOp.kind === 'big' ? '一场作战' : '一个目标'}里你的那一份：标题、截止日由它决定，这里只能改属性、分值和「重要」。`
                : `这条待办跟着和 ${editing.pact?.partnerName ?? 'Ta'} 的「一起进步」约定走：标题、每日重置、截止日和执行日期都由约定决定，这里只能改属性、分值和「重要」。要停下，到羁绊页结束这个约定。`}
            </p>
          )}
          {!linked && (
            <div>
              <div className="grid grid-cols-3 gap-2">
                {([{ key: 'single', name: '单次', hint: '做完即归档', glyph: '✓' }, { key: 'count', name: '计数', hint: '重复 N 次', glyph: '∞' }, { key: 'big', name: 'BIG DEAL', hint: '大事拆小步', glyph: '◆' }] as const).map((m) => {
                  const on = f.mode === m.key;
                  return (
                    <button key={m.key} type="button" disabled={!!editing && !on} onClick={() => set({ mode: m.key })} aria-pressed={on}
                      className={cx('min-w-0 rounded-sm border-3 px-1 py-2 text-center disabled:opacity-40', on ? 'border-p4g-black bg-p4g-select text-[color:var(--p4g-select-ink)] shadow-hard-sm' : 'border-p4g-line bg-p4g-surface text-p4g-ink')}>
                      <div className="font-display text-h3 font-black leading-none">{m.glyph}</div>
                      <div className="mt-1 truncate font-display text-body font-bold">{m.name}</div>
                      <div className="truncate text-2xs opacity-75">{m.hint}</div>
                    </button>
                  );
                })}
              </div>
              {editing && <p className="mt-1 text-cap text-p4g-ink-soft">编辑中不可切换模式</p>}
            </div>
          )}
          {f.mode === 'count' && !linked && (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3"><span className="font-display text-body font-bold text-p4g-ink">目标次数</span><P4Stepper value={f.targetCount} min={1} max={99} onChange={(n) => set({ targetCount: n })} label="目标次数" /></div>
              <Row title="长期任务" desc="进度长期保留，不随时间刷新，直到完成为止"><P4Switch checked={f.isLongTerm} onChange={(b) => set({ isLongTerm: b, repeatDaily: b ? false : f.repeatDaily })} aria-label="长期任务" /></Row>
            </div>
          )}
          {f.mode === 'big' && !linked && (
            <div className="space-y-2.5 rounded-sm border-3 border-p4g-black bg-p4g-surface p-3 night:border-p4g-yellow">
              <P4Input value={f.currentState} onChange={(e) => set({ currentState: e.target.value })} placeholder="现在到哪一步了？一句话（可选，AI 拆解会参考）" aria-label="现在到哪一步了" />
              <div className="flex min-w-0 items-center gap-2">
                <span className="shrink-0 text-meta font-bold text-p4g-ink-soft">截止日（可选）</span>
                <P4Input type="date" wrapClassName="min-w-0 flex-1" value={f.deadline} onChange={(e) => set({ deadline: e.target.value })} aria-label="截止日" />
                {f.deadline && <button type="button" onClick={() => set({ deadline: '' })} className="shrink-0 text-meta text-p4g-ink-soft underline">清除</button>}
              </div>
              {f.steps.length > 0 && (
                <ol className="space-y-1">
                  {f.steps.map((s, i) => (
                    <li key={s.id} className="flex min-w-0 items-center gap-2 rounded-xs bg-p4g-surface-2 px-2 py-1.5">
                      <span className="w-5 shrink-0 p4g-num text-meta text-p4g-orange-deep night:text-p4g-orange">{i + 1}</span>
                      <span className="min-w-0 flex-1 truncate text-body text-p4g-ink">{s.title}</span>
                      <button type="button" aria-label="删除子步" onClick={() => set({ steps: f.steps.filter((_, j) => j !== i) })} className="shrink-0 p-1 text-p4g-ink-soft"><IconTrash size={13} /></button>
                    </li>
                  ))}
                </ol>
              )}
              <div className="flex min-w-0 gap-2">
                <P4Input wrapClassName="min-w-0 flex-1" placeholder="一个够得着的小步…" value={stepDraft} onChange={(e) => setStepDraft(e.target.value)} aria-label="子步" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <P4Button variant="secondary" disabled={!stepDraft.trim()} onClick={() => { set({ steps: [...f.steps, { id: `m${Date.now()}`, title: stepDraft.trim(), source: 'manual' }] }); setStepDraft(''); }}>+ 手写一步</P4Button>
                <P4Button variant="black" disabled={aiBusy} onClick={aiSplit}>{aiBusy ? '正在拆…' : '✦ AI 帮我拆'}</P4Button>
              </div>
              {aiError && <p className="text-cap font-bold text-p4g-danger">{aiError}</p>}
              <p className="text-cap text-p4g-ink-soft">每完成一子步得主属性 +{f.points}；全部完成触发收官奖励（SP + 触及属性各 +1）</p>
            </div>
          )}
          <WishMountPicker value={f.wishId} onChange={(id) => set({ wishId: id })} />
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3"><label className="font-display text-body font-bold text-p4g-ink">奖励 · 主属性</label><P4Stepper value={f.points} min={1} max={5} onChange={(n) => set({ points: n })} label="主属性点数" /></div>
            <AttrPick value={f.attribute} onChange={(a) => set({ attribute: a, extraBoosts: f.extraBoosts.filter((b) => b.attribute !== a) })} />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between"><span className="text-meta font-bold text-p4g-ink-soft">副奖励（可选，最多 2 条）</span>
              {canAddBoost && <button type="button" title="添加副奖励" aria-label="添加副奖励" onClick={() => set({ extraBoosts: [...f.extraBoosts, { attribute: firstUnused, points: 1 }] })} className="flex h-7 w-7 items-center justify-center rounded-xs border-thin border-p4g-black bg-p4g-yellow text-p4g-black"><IconPlus size={12} /></button>}
            </div>
            {f.extraBoosts.map((b, i) => (
              <div key={i} className="flex min-w-0 flex-wrap items-center gap-2 rounded-sm border-thin border-p4g-line bg-p4g-surface p-2">
                <div className="min-w-0 flex-1"><AttrPick value={b.attribute} disabled={(a) => a !== b.attribute && used.has(a)} onChange={(a) => set({ extraBoosts: f.extraBoosts.map((x, j) => (j === i ? { ...x, attribute: a } : x)) })} /></div>
                <P4Stepper value={b.points} min={1} max={5} onChange={(n) => set({ extraBoosts: f.extraBoosts.map((x, j) => (j === i ? { ...x, points: n } : x)) })} label="副奖励点数" />
                <button type="button" aria-label="删除副奖励" onClick={() => set({ extraBoosts: f.extraBoosts.filter((_, j) => j !== i) })} className="p-1 text-p4g-ink-soft"><IconMinus size={14} /></button>
              </div>
            ))}
          </div>
          <div>
            <button type="button" onClick={() => setMore((m) => !m)} aria-expanded={more} className="flex w-full items-center gap-2 border-b-3 border-p4g-line pb-1 font-display text-body font-bold text-p4g-ink">
              <span>更多设置</span><span className="flex-1" /><IconChevronDown size={14} className={cx('transition-transform', more && 'rotate-180')} />
            </button>
            {more && (
              <div className="mt-3 space-y-2.5">
                <Row tone="yellow" title="⭐ 标记为重要" desc="重要任务将在首页置顶显示，并记录在历史中"><P4Switch checked={f.important} onChange={(b) => set({ important: b })} aria-label="标记为重要" /></Row>
                {!linked && <Row title="每日重置" desc="每天刷新任务，包括进度"><P4Switch checked={f.repeatDaily} disabled={f.isLongTerm || !!f.deadline} onChange={(b) => set({ repeatDaily: b })} aria-label="每日重置" /></Row>}
                {!linked && (
                  <div>
                    <label htmlFor="todo-deadline" className="mb-1.5 block font-display text-body font-bold text-p4g-ink">截止日 DDL（可选）</label>
                    <div className="flex min-w-0 items-center gap-2"><P4Input id="todo-deadline" type="date" wrapClassName="min-w-0 flex-1" value={f.deadline} onChange={(e) => set({ deadline: e.target.value, repeatDaily: e.target.value ? false : f.repeatDaily })} />{f.deadline && <button type="button" onClick={() => set({ deadline: '' })} className="shrink-0 text-meta text-p4g-ink-soft underline">清除</button>}</div>
                    <p className="mt-1 text-cap text-p4g-ink-soft">首页和今日任务会显示「剩 N 天」；与「每日重置」只能二选一</p>
                  </div>
                )}
                {!linked && (
                  <div>
                    <span className="mb-1.5 block text-meta font-bold text-p4g-ink-soft">每周几执行（可选）</span>
                    <div className="grid grid-cols-7 gap-1">
                      {WEEK_LABELS.map((w, d) => { const on = f.weekdays.includes(d); return <button key={d} type="button" onClick={() => set({ weekdays: on ? f.weekdays.filter((x) => x !== d) : [...f.weekdays, d].sort() })} aria-pressed={on} className={cx('min-w-0 rounded-xs border-thin py-1.5 font-display text-cap font-bold', on ? 'border-p4g-black bg-p4g-select text-[color:var(--p4g-select-ink)]' : 'border-p4g-line bg-p4g-surface text-p4g-ink')}>{w.slice(1)}</button>; })}
                    </div>
                    {f.weekdays.length > 0 && <button type="button" onClick={() => set({ weekdays: [] })} className="mt-1 text-cap text-p4g-ink-soft underline">清除选择</button>}
                  </div>
                )}
                {!linked && <Row title="是否启用"><P4Switch checked={f.isActive} onChange={(b) => set({ isActive: b })} aria-label="是否启用" /></Row>}
                {!linked && (
                  <div>
                    <label className="mb-1.5 block font-display text-body font-bold text-p4g-ink">指定启用日期（可选）</label>
                    <div className="flex min-w-0 items-center gap-2"><P4Input type="date" wrapClassName="min-w-0 flex-1" value={f.startDate} onChange={(e) => set({ startDate: e.target.value })} aria-label="指定启用日期" />{f.startDate && <button type="button" onClick={() => set({ startDate: '' })} className="shrink-0 text-meta text-p4g-ink-soft underline">清除</button>}</div>
                    <p className="mt-1 text-cap text-p4g-ink-soft">设定后，该任务在指定日期前不会出现在今日任务中</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </P4Sheet>
      <TodosScheduleImport open={schedule} onClose={() => setSchedule(false)} onImport={(n) => { toast.success(`已导入 ${n} 项`); onClose(); }} />
    </>
  );
}
