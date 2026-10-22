/**
 * 助手统一迷你表单（真实 src/components/navigator/NavigatorActionForm.tsx）。?kind=activity|todo|editTodo|bigdeal|ledger
 *   activity：做了什么 + 加点（0–5）五维 −/＋ + ★ 重要事件
 *   todo：任务名 + 绑定属性 + 奖励点数 ± + 频率 单次/每日 + 副奖励（可选）
 *   editTodo：这条任务 继续做 / 不做了（移到归档）+ 任务名 / 属性 / 点数 / 频率 + 截止日（可空）+ 清除；失效态
 *   bigdeal：这件大事 + 拆好的小步（可改可删）+ 再加一步 + 绑定属性 · 每步 + 截止日（可选）
 *   ledger：支出 / 收入 + 金额（¥）+ 类目 / 来源 + 备注 + 渠道
 * 「写好了」「取消」、关闭。外观：P3R 菜单式竖排幽灵字 + 黄色属性块。
 */
import { useEffect, useState } from 'react';
import type { AttributeId, LedgerExpenseType, LedgerIncomeType } from '@real/types';
import type { OverlayProps } from '@pink/registry/types';
import { P6Sheet } from '@pink/screens/pkg6/sheet';
import { CfgInput } from '@pink/screens/pkg6/cfg';
import { ACTION_META, ATTRS, CATEGORY_META, INCOME_META, type DraftKind } from '@pink/mock/pkg6';
import { attrLabel, useSettings } from '@pink/screens/pkg6/settingsStore';
import { P3Button, useToast } from '@pink/kit';
import { cx } from '@pink/lib/cx';

type FormKind = Exclude<DraftKind, 'completeTodo'>;
export interface FormState {
  text: string; points: Record<AttributeId, number>; important: boolean;
  title: string; attribute: AttributeId; tpoints: number; repeatDaily: boolean; extraAttribute: AttributeId | null; extraPoints: number;
  archive: boolean; deadline: string; steps: string[];
  direction: 'expense' | 'income'; amount: string; type: LedgerExpenseType; incomeType: LedgerIncomeType; note: string; channel: string;
}
export const emptyForm = (): FormState => ({
  text: '', points: { knowledge: 0, guts: 0, dexterity: 0, kindness: 0, charm: 0 }, important: false,
  title: '', attribute: 'guts', tpoints: 2, repeatDaily: false, extraAttribute: null, extraPoints: 1,
  archive: false, deadline: '', steps: ['列出要做的第一件小事', ''],
  direction: 'expense', amount: '', type: 'food', incomeType: 'labor', note: '', channel: '',
});

/** 把表单转成确认卡预览行（同真实 buildPreviewLines） */
export function previewLines(kind: FormKind, f: FormState, label: (a: AttributeId) => string): string[] {
  switch (kind) {
    case 'activity': { const g = ATTRS.filter((a) => f.points[a.id] > 0).map((a) => `${label(a.id)} +${f.points[a.id]}`).join(' · '); return [`「${f.text}」`, g ? `加点：${g}` : '加点：暂无（可编辑补上）', ...(f.important ? ['★ 标记为重要事件'] : [])]; }
    case 'todo': return [`「${f.title}」`, `${label(f.attribute)} +${f.tpoints}${f.extraAttribute ? ` · ${label(f.extraAttribute)} +${f.extraPoints}` : ''} · ${f.repeatDaily ? '每日重复' : '单次完成'}`];
    case 'editTodo': return f.archive ? ['「背 30 个单词」不做了', '移到归档：不算完成、不发点数，想重启可以在归档里恢复'] : ['修改「背 30 个单词」', `奖励 知识 +1 → ${label(f.attribute)} +${f.tpoints}`, `频率 → ${f.repeatDaily ? '每日' : '单次'}`, f.deadline ? `截止 → ${f.deadline}` : '截止 → 取消'];
    case 'bigdeal': { const st = f.steps.filter((s) => s.trim()); return [`「${f.title}」 · BIG DEAL`, ...st.slice(0, 3).map((s, i) => `${i + 1}. ${s}`), ...(st.length > 3 ? [`…共 ${st.length} 步`] : []), `${label(f.attribute)} 每步 +${f.tpoints}${f.deadline ? ` · 截止 ${f.deadline}` : ''} · 全成有收官奖励`]; }
    case 'ledger': return [f.direction === 'expense' ? `支出 ¥${f.amount}（${CATEGORY_META[f.type].icon} ${CATEGORY_META[f.type].label}）` : `收入 ¥${f.amount}（${INCOME_META[f.incomeType].label}）`, ...(f.note ? [`备注：${f.note}`] : []), ...(f.channel && f.direction === 'expense' ? [`渠道：${f.channel}`] : [])];
  }
}
const ready = (kind: FormKind, f: FormState) => kind === 'activity' ? !!f.text.trim() : kind === 'todo' ? !!f.title.trim() : kind === 'ledger' ? Number(f.amount) > 0 : kind === 'bigdeal' ? !!f.title.trim() && f.steps.some((s) => s.trim()) : true;

const Label = ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => <label htmlFor={htmlFor} className="mb-1.5 block font-heavy text-meta font-bold tracking-wide text-p3r-ink-soft">{children}</label>;
const chip = (on: boolean) => cx('p6-press min-w-0 rounded-none border-2 px-3 py-1.5 font-heavy text-body font-bold', on ? 'border-p3r-lilac/50 bg-p3r-ink text-p3r-rose' : 'border-p3r-lilac/40 bg-p3r-panel text-p3r-ink');
function Tri({ dir, label, disabled, onClick }: { dir: 'l' | 'r'; label: string; disabled?: boolean; onClick: () => void }) {
  return <button type="button" aria-label={label} disabled={disabled} onClick={onClick} className="p6-press flex h-9 w-9 shrink-0 items-center justify-center rounded-none border-2 border-p3r-lilac/50 bg-p3r-rose text-p3r-on-rose disabled:opacity-30">
    <span aria-hidden className={cx('h-0 w-0 border-y-[7px] border-y-transparent', dir === 'l' ? 'border-r-[10px] border-r-current' : 'border-l-[10px] border-l-current')} /></button>;
}
function Stepper({ value, min, max, onChange, minusLabel, plusLabel }: { value: number; min: number; max: number; onChange: (v: number) => void; minusLabel: string; plusLabel: string }) {
  return <div className="flex shrink-0 items-center gap-1.5"><Tri dir="l" label={minusLabel} disabled={value <= min} onClick={() => onChange(value - 1)} /><span className="font-cond tabular w-7 text-center text-h2">{value}</span><Tri dir="r" label={plusLabel} disabled={value >= max} onClick={() => onChange(value + 1)} /></div>;
}

export function ActionForm({ kind, open, onClose, initial, onSubmit, stale }: { kind: FormKind; open: boolean; onClose: () => void; initial?: Partial<FormState>; onSubmit: (lines: string[]) => void; stale?: boolean }) {
  const s = useSettings();
  const L = (a: AttributeId) => attrLabel(s, a);
  const [f, setF] = useState<FormState>(emptyForm());
  useEffect(() => { if (open) setF({ ...emptyForm(), ...(kind === 'editTodo' ? { title: '背 30 个单词', attribute: 'knowledge', tpoints: 1, repeatDaily: true } : {}), ...initial }); }, [open, kind]); // eslint-disable-line
  const p = (patch: Partial<FormState>) => setF((x) => ({ ...x, ...patch }));
  const AttrPick = ({ value, onPick }: { value: AttributeId; onPick: (a: AttributeId) => void }) => (
    <div className="grid grid-cols-5 gap-1">{ATTRS.map((a) => <button key={a.id} type="button" aria-pressed={value === a.id} onClick={() => onPick(a.id)} className={cx(chip(value === a.id), 'flex flex-col items-center px-1 py-1')}><span aria-hidden>{a.icon}</span><span className="w-full truncate text-center text-cap">{L(a.id)}</span></button>)}</div>
  );
  const meta = ACTION_META[kind];
  return (
    <P6Sheet open={open} onClose={onClose} title={meta.label} en={`${meta.icon}  ${meta.en} · ASSISTANT FORM`} size="tall"
      footer={<div className="flex gap-3"><P3Button tone="soft" block onClick={onClose}>取消</P3Button><P3Button block disabled={stale || !ready(kind, f)} onClick={() => { onSubmit(previewLines(kind, f, L)); onClose(); }}>写好了</P3Button></div>}>
      <div className="relative min-w-0 space-y-4 pt-1">
        <span aria-hidden className="pointer-events-none absolute -right-2 -top-3 select-none font-heavy text-[64px] font-bold italic leading-none" style={{ color: "var(--p3r-ghost)" }}>{meta.en}</span>
        {kind === 'activity' && (
          <>
            <div><Label htmlFor="nav-form-text">做了什么</Label><CfgInput id="nav-form-text" autoFocus placeholder="用一句话描述你的行动…" value={f.text} onChange={(e) => p({ text: e.target.value })} /></div>
            <div>
              <Label>加点（0–5）</Label>
              <ul className="grid grid-cols-1 gap-1">
                {ATTRS.map((a) => (
                  <li key={a.id} className={cx('flex min-w-0 items-center gap-2 rounded-none px-2 py-1', f.points[a.id] > 0 ? 'bg-p3r-rose text-p3r-on-rose' : 'bg-p3r-panel')}>
                    <span aria-hidden className="text-h3">{a.icon}</span><span className="min-w-0 flex-1 truncate font-heavy text-body font-bold">{L(a.id)}</span>
                    <Stepper value={f.points[a.id]} min={0} max={5} onChange={(v) => p({ points: { ...f.points, [a.id]: v } })} minusLabel={`${L(a.id)} 减一`} plusLabel={`${L(a.id)} 加一`} />
                  </li>
                ))}
              </ul>
            </div>
            <button type="button" aria-pressed={f.important} onClick={() => p({ important: !f.important })} className={chip(f.important)}>★ 重要事件{f.important ? '（已标记）' : ''}</button>
          </>
        )}
        {(kind === 'todo' || kind === 'editTodo') && (
          <>
            {kind === 'editTodo' && stale && <p className="rounded-none bg-p3r-panel px-3 py-3 font-heavy text-body font-bold">这条任务已经不在清单里了。</p>}
            {kind === 'editTodo' && !stale && (
              <div><Label>这条任务</Label><div className="flex flex-wrap gap-1.5"><button type="button" className={chip(!f.archive)} onClick={() => p({ archive: false })}>继续做</button><button type="button" className={chip(f.archive)} onClick={() => p({ archive: true })}>不做了（移到归档）</button></div></div>
            )}
            {!(kind === 'editTodo' && (f.archive || stale)) && (
              <>
                <div><Label htmlFor="nav-form-title">任务名</Label><CfgInput id="nav-form-title" placeholder="要做的事…" value={f.title} onChange={(e) => p({ title: e.target.value })} /></div>
                <div><Label>绑定属性</Label><AttrPick value={f.attribute} onPick={(a) => p({ attribute: a })} /></div>
                <div className="flex min-w-0 items-center justify-between gap-3"><Label>奖励点数</Label><Stepper value={f.tpoints} min={1} max={5} onChange={(v) => p({ tpoints: v })} minusLabel="点数减一" plusLabel="点数加一" /></div>
                <div><Label>频率</Label><div className="flex gap-1.5"><button type="button" className={chip(!f.repeatDaily)} onClick={() => p({ repeatDaily: false })}>单次</button><button type="button" className={chip(f.repeatDaily)} onClick={() => p({ repeatDaily: true })}>每日</button></div></div>
                {kind === 'todo' && (
                  <div>
                    <Label>副奖励（可选）</Label>
                    <div className="flex flex-wrap gap-1"><button type="button" className={chip(f.extraAttribute === null)} onClick={() => p({ extraAttribute: null })}>无</button>
                      {ATTRS.filter((a) => a.id !== f.attribute).map((a) => <button key={a.id} type="button" className={chip(f.extraAttribute === a.id)} onClick={() => p({ extraAttribute: a.id })}>{a.icon} {L(a.id)}</button>)}</div>
                    {f.extraAttribute && <div className="mt-2 flex items-center justify-between gap-3"><span className="font-heavy text-meta font-bold">{L(f.extraAttribute)} 点数</span><Stepper value={f.extraPoints} min={1} max={5} onChange={(v) => p({ extraPoints: v })} minusLabel="副奖励点数减一" plusLabel="副奖励点数加一" /></div>}
                  </div>
                )}
                {kind === 'editTodo' && (
                  <div><Label htmlFor="nav-form-edit-deadline">截止日（可空）</Label><div className="flex gap-2"><CfgInput id="nav-form-edit-deadline" type="date" value={f.deadline} onChange={(e) => p({ deadline: e.target.value })} /><button type="button" className={chip(false)} onClick={() => p({ deadline: '' })}>清除</button></div></div>
                )}
              </>
            )}
          </>
        )}
        {kind === 'bigdeal' && (
          <>
            <div><Label htmlFor="nav-form-deal-title">这件大事</Label><CfgInput id="nav-form-deal-title" placeholder="想搞定的一件大事…" value={f.title} onChange={(e) => p({ title: e.target.value })} /></div>
            <div>
              <Label>拆好的小步（可改可删）</Label>
              <ol className="grid grid-cols-1 gap-1.5">
                {f.steps.map((st, i) => (
                  <li key={i} className="flex min-w-0 items-center gap-2">
                    <span className="font-cond tabular flex h-9 w-9 shrink-0 items-center justify-center rounded-none bg-p3r-ink text-body text-p3r-rose">{i + 1}</span>
                    <CfgInput placeholder="一个够得着的小步…" value={st} onChange={(e) => p({ steps: f.steps.map((x, j) => (j === i ? e.target.value : x)) })} aria-label={`第 ${i + 1} 步`} />
                    <button type="button" aria-label="删除这一步" onClick={() => p({ steps: f.steps.filter((_, j) => j !== i) })} className="h-9 w-9 shrink-0 rounded-none font-bold text-p3r-coral">✕</button>
                  </li>
                ))}
              </ol>
              <button type="button" onClick={() => p({ steps: [...f.steps, ''] })} className="mt-1.5 w-full rounded-none border-2 border-dashed border-p3r-lilac/50 py-2 font-heavy text-meta font-bold">+ 再加一步</button>
            </div>
            <div><Label>绑定属性 · 每步 +{f.tpoints}</Label><AttrPick value={f.attribute} onPick={(a) => p({ attribute: a })} /></div>
            <div><Label htmlFor="nav-form-deal-deadline">截止日（可选）</Label><CfgInput id="nav-form-deal-deadline" type="date" value={f.deadline} onChange={(e) => p({ deadline: e.target.value })} /></div>
          </>
        )}
        {kind === 'ledger' && (
          <>
            <div className="grid grid-cols-2 gap-1.5"><button type="button" className={chip(f.direction === 'expense')} onClick={() => p({ direction: 'expense' })}>支出</button><button type="button" className={chip(f.direction === 'income')} onClick={() => p({ direction: 'income' })}>收入</button></div>
            <div><Label htmlFor="nav-form-amount">金额（¥）</Label>
              <div className="flex items-center gap-2 rounded-none border-2 border-p3r-lilac/50 bg-p3r-rose px-3 text-p3r-on-rose"><span className="font-cond tabular text-h2">¥</span><input id="nav-form-amount" inputMode="decimal" value={f.amount} onChange={(e) => p({ amount: e.target.value.replace(/[^\d.]/g, '') })} placeholder="0" className="font-cond tabular h-14 min-w-0 flex-1 bg-transparent text-mega leading-none placeholder:text-p3r-ink/30 focus:outline-none" /></div></div>
            {f.direction === 'expense' ? (
              <div><Label>类目</Label><div className="grid grid-cols-4 gap-1">{(Object.keys(CATEGORY_META) as LedgerExpenseType[]).map((k) => <button key={k} type="button" onClick={() => p({ type: k })} className={cx(chip(f.type === k), 'px-1 text-meta')}>{CATEGORY_META[k].icon} {CATEGORY_META[k].label}</button>)}</div></div>
            ) : (
              <div><Label>来源</Label><div className="flex gap-1.5">{(Object.keys(INCOME_META) as LedgerIncomeType[]).map((k) => <button key={k} type="button" onClick={() => p({ incomeType: k })} className={chip(f.incomeType === k)}>{INCOME_META[k].label}</button>)}</div></div>
            )}
            <div><Label htmlFor="nav-form-note">备注（可选）</Label><CfgInput id="nav-form-note" placeholder="星巴克咖啡…" value={f.note} onChange={(e) => p({ note: e.target.value })} /></div>
            {f.direction === 'expense' && <div><Label htmlFor="nav-form-channel">渠道（可选）</Label><CfgInput id="nav-form-channel" placeholder="支付宝 / 微信 / 卡…" value={f.channel} onChange={(e) => p({ channel: e.target.value })} /></div>}
          </>
        )}
      </div>
    </P6Sheet>
  );
}

export default function NavigatorActionForm({ open, onClose, params }: OverlayProps) {
  const toast = useToast();
  const kind = ((params?.get('kind') as FormKind) || 'activity');
  return <ActionForm kind={kind} open={open} onClose={onClose} stale={params?.get('state') === 'stale'} onSubmit={(l) => toast.success(`已生成确认卡：${l[0]}`)} />;
}
