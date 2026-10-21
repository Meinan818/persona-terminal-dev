/**
 * NavigatorActionForm（真实 src/components/navigator/NavigatorActionForm.tsx 的 p5 渲染；视觉 = v3 chat/chat.js openForm）。
 * kind：activity 记录活动 / todo 添加待办 / editTodo 修改待办（P1-17 新补）/ ledger 记账 / bigdeal 拆一件大事。
 * 新建（快捷 chip）与确认卡「编辑」共用；「写好了」= 真实 canExecute 校验通过才可点（任务名 / 金额 / 小步必填）。
 * editTodo：表单显示「改后的样子」，与原任务相同的字段存 undefined —— 卡片只列真正改了的（真实 editTodoChanges）。
 * 独立预览：#/overlay/assistant-form?kind=activity|todo|editTodo|bigdeal|ledger（在助手窗里弹出）。
 */
import { useState } from 'react';
import type { OverlayProps } from '@/p5r-red/registry/types';
import { cx, ChatSheet, ATTR_CN, Toggle } from './NavigatorChatKit';
import NavigatorWindow from './NavigatorWindow.p5r';

export type DraftKind = 'activity' | 'todo' | 'editTodo' | 'ledger' | 'bigdeal' | 'completeTodo';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Draft = { kind: DraftKind; [k: string]: any };
export const KIND: Record<DraftKind, { label: string; icon: string; ghost: string }> = {
  activity: { label: '记录活动', icon: '✍️', ghost: 'LOG' }, todo: { label: '添加待办', icon: '📌', ghost: 'TODO' }, ledger: { label: '记账', icon: '💰', ghost: 'NOTE' },
  completeTodo: { label: '完成任务', icon: '✅', ghost: 'DONE' }, editTodo: { label: '修改待办', icon: '✏️', ghost: 'EDIT' }, bigdeal: { label: '拆一件大事', icon: '◆', ghost: 'DEAL' },
};
export const CATS: Record<string, [string, string]> = { food: ['🍜', '餐饮'], transport: ['🚇', '交通'], shopping: ['🛍️', '购物'], fun: ['🎮', '娱乐'], home: ['🏠', '居住'], study: ['📚', '提升'], other: ['📦', '其它'] };
/** 演示用「任务清单已有」的那条（editTodo 的 orig） */
export const EDIT_ORIG = { id: 't1', title: '晨跑 5 公里', attribute: 'guts', points: 2, repeatDaily: true, deadline: '' };

export const emptyDraft = (kind: DraftKind): Draft => ({
  activity: { kind, text: '', points: { knowledge: 0, guts: 0, dexterity: 0, kindness: 0, charm: 0 }, important: false },
  todo: { kind, title: '', attribute: 'guts', points: 2, repeatDaily: false, deadline: '' },
  editTodo: { kind, todoId: EDIT_ORIG.id, todoTitle: EDIT_ORIG.title },
  ledger: { kind, direction: 'expense', amount: '', type: 'food', incomeType: 'labor', channel: '', note: '' },
  bigdeal: { kind, title: '', steps: [''], attribute: 'guts', points: 2 },
  completeTodo: { kind, todoId: '', todoTitle: '' },
} as Record<DraftKind, Draft>)[kind];

const EDIT_KEYS = ['title', 'attribute', 'points', 'repeatDaily', 'deadline', 'archive'] as const;
export const editChanges = (d: Draft) => EDIT_KEYS.filter((k) => d[k] !== undefined);
export const canExecute = (d: Draft): boolean => {
  switch (d.kind) {
    case 'activity': return String(d.text).trim().length > 0;
    case 'todo': return String(d.title).trim().length > 0;
    case 'ledger': return Number(d.amount) > 0;
    case 'editTodo': return editChanges(d).length > 0 && (d.title === undefined || String(d.title).trim().length > 0);
    case 'bigdeal': return String(d.title).trim().length > 0 && d.steps.some((s: string) => s.trim());
    default: return true;
  }
};

/** 卡片预览行（真实 buildPreviewLines） */
export function previewLines(d: Draft): string[] {
  switch (d.kind) {
    case 'activity': {
      const g = Object.entries(d.points || {}).filter(([, v]) => (v as number) > 0).map(([k, v]) => `${ATTR_CN[k]} +${v}`).join(' · ');
      return [`「${d.text}」`, g ? `加点：${g}` : '加点：暂无（可编辑补上）', ...(d.important ? ['⭐ 标记为重要事件'] : [])];
    }
    case 'todo': return [`「${d.title}」`, `${ATTR_CN[d.attribute]} +${d.points} · ${d.repeatDaily ? '每日重复' : '单次完成'}`, ...(d.deadline ? [`截止 ${d.deadline}`] : [])];
    case 'ledger': return [d.direction === 'income' ? `收入 ¥${d.amount}（${d.incomeType === 'labor' ? '劳动所得' : '其它收入'}）` : `支出 ¥${d.amount}（${CATS[d.type][0]} ${CATS[d.type][1]}）`, ...(d.channel ? [`渠道：${d.channel}`] : []), ...(d.note ? [`备注：${d.note}`] : [])];
    case 'completeTodo': return [`「${d.todoTitle}」`, '标记为今天已完成'];
    case 'editTodo': {
      if (d.archive) return [`「${d.todoTitle}」不做了`, '移到归档：不算完成、不发点数，想重启可以在归档里恢复'];
      const t = EDIT_ORIG, lines = [`修改「${d.todoTitle}」`];
      if (d.title !== undefined) lines.push(`名字 → 「${d.title}」`);
      if (d.attribute !== undefined || d.points !== undefined) lines.push(`奖励 ${ATTR_CN[t.attribute]} +${t.points} → ${ATTR_CN[d.attribute ?? t.attribute]} +${d.points ?? t.points}`);
      if (d.repeatDaily !== undefined) lines.push(`频率 → ${d.repeatDaily ? '每日' : '单次'}`);
      if (d.deadline !== undefined) lines.push(d.deadline ? `截止 → ${d.deadline}` : '截止 → 取消');
      return lines;
    }
    case 'bigdeal': return [`「${d.title}」`, ...d.steps.slice(0, 3).map((s: string, i: number) => `${i + 1}. ${s}`), `${ATTR_CN[d.attribute]} · 每步 +${d.points}`];
    default: return [];
  }
}

const R = (i: number) => ({ ['--r' as string]: `${i % 2 ? 1 : -1.5}deg` });

export function ActionFormSheet({ kind, draft, onDone, onClose }: { kind: DraftKind; draft?: Draft; onDone: (d: Draft) => void; onClose: () => void }) {
  const [d, setD] = useState<Draft>(() => (draft ? structuredClone(draft) : emptyDraft(kind)));
  const patch = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }));
  const attrPicker = (cur: string, set: (k: string) => void) => (
    <div className={cx('chiprow')}>{Object.entries(ATTR_CN).map(([k, v], i) => <button key={k} type="button" className={cx('pick', cur === k && 'on')} style={R(i)} onClick={() => set(k)}>{v}</button>)}</div>
  );
  const stepper = (v: number, set: (n: number) => void, min = 0, max = 5) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <button type="button" className={cx('step dn')} aria-label="点数减一" disabled={v <= min} onClick={() => set(Math.max(min, v - 1))} />
      <span className={cx('v')} style={{ font: '900 italic 22px/1 Arial' }}>{v}</span>
      <button type="button" className={cx('step')} aria-label="点数加一" disabled={v >= max} onClick={() => set(Math.min(max, v + 1))} />
    </div>
  );
  let body: JSX.Element | null = null;
  if (kind === 'activity') body = (
    <div>
      <label className={cx('lbl')}>做了什么</label>
      <textarea className={cx('ta')} placeholder="用一句话描述你的行动…" value={d.text} onChange={(e) => patch({ text: e.target.value })} />
      <label className={cx('lbl')}>加点（0–5）</label>
      {Object.entries(ATTR_CN).map(([k, v]) => (
        <div key={k} className={cx('attr-row')}><span className={cx('n')}>{v}</span>
          <button type="button" className={cx('step dn')} aria-label={`${v} 减一`} onClick={() => patch({ points: { ...d.points, [k]: Math.max(0, d.points[k] - 1) } })} />
          <span className={cx('v')}>{d.points[k]}</span>
          <button type="button" className={cx('step')} aria-label={`${v} 加一`} onClick={() => patch({ points: { ...d.points, [k]: Math.min(5, d.points[k] + 1) } })} />
        </div>
      ))}
      <Toggle label="重要事件" on={d.important} onChange={(v) => patch({ important: v })} />
    </div>
  );
  else if (kind === 'todo') body = (
    <div>
      <label className={cx('lbl')}>任务名</label>
      <input className={cx('inp')} placeholder="要做的事…" value={d.title} onChange={(e) => patch({ title: e.target.value })} />
      <label className={cx('lbl')}>绑定属性</label>{attrPicker(d.attribute, (k) => patch({ attribute: k }))}
      <label className={cx('lbl')}>奖励点数</label>{stepper(d.points, (n) => patch({ points: n }), 1)}
      <label className={cx('lbl')}>频率</label>
      <div className={cx('chiprow')}><button type="button" className={cx('pick', !d.repeatDaily && 'on')} onClick={() => patch({ repeatDaily: false })}>单次</button><button type="button" className={cx('pick', d.repeatDaily && 'on')} onClick={() => patch({ repeatDaily: true, deadline: '' })}>每日</button></div>
      {!d.repeatDaily && <><label className={cx('lbl')}>截止日（可选）</label><input className={cx('inp')} type="date" value={d.deadline} onChange={(e) => patch({ deadline: e.target.value })} /></>}
    </div>
  );
  else if (kind === 'editTodo') {
    const o = EDIT_ORIG;
    const curTitle = d.title ?? o.title, curAttr = d.attribute ?? o.attribute, curPoints = d.points ?? o.points, curDaily = d.repeatDaily ?? o.repeatDaily, curDeadline = d.deadline ?? o.deadline;
    const setDaily = (v: boolean) => patch({ repeatDaily: v === o.repeatDaily ? undefined : v, ...(v && curDeadline ? { deadline: o.deadline ? '' : undefined } : {}) });
    const setDeadline = (v: string) => patch({ deadline: v === o.deadline ? undefined : v, ...(v && curDaily ? { repeatDaily: o.repeatDaily ? false : undefined } : {}) });
    body = (
      <div>
        <p style={{ margin: '4px 0 0', fontSize: 14, fontWeight: 900, overflowWrap: 'anywhere' }}>修改「{o.title}」</p>
        <label className={cx('lbl')}>这条任务</label>
        <div className={cx('chiprow')}><button type="button" className={cx('pick', !d.archive && 'on')} onClick={() => patch({ archive: undefined })}>继续做</button><button type="button" className={cx('pick', !!d.archive && 'on')} style={R(1)} onClick={() => patch({ archive: true })}>不做了（移到归档）</button></div>
        {!d.archive && (
          <>
            <label className={cx('lbl')}>任务名</label>
            <input className={cx('inp')} value={curTitle} onChange={(e) => patch({ title: e.target.value === o.title ? undefined : e.target.value })} />
            <label className={cx('lbl')}>绑定属性</label>{attrPicker(curAttr, (k) => patch({ attribute: k === o.attribute ? undefined : k }))}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0 24px' }}>
              <div><label className={cx('lbl')}>奖励点数</label>{stepper(curPoints, (n) => patch({ points: n === o.points ? undefined : n }), 1)}</div>
              <div><label className={cx('lbl')}>频率</label><div className={cx('chiprow')}><button type="button" className={cx('pick', !curDaily && 'on')} onClick={() => setDaily(false)}>单次</button><button type="button" className={cx('pick', curDaily && 'on')} onClick={() => setDaily(true)}>每日</button></div></div>
            </div>
            {!curDaily && (
              <><label className={cx('lbl')}>截止日（可空）</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input className={cx('inp')} type="date" value={curDeadline} onChange={(e) => setDeadline(e.target.value)} />{curDeadline && <button type="button" className={cx('pick')} onClick={() => setDeadline('')}>清除</button>}</div></>
            )}
          </>
        )}
      </div>
    );
  } else if (kind === 'ledger') body = (
    <div>
      <div className={cx('chiprow')}><button type="button" className={cx('pick', d.direction === 'expense' && 'on')} onClick={() => patch({ direction: 'expense' })}>支出</button><button type="button" className={cx('pick', d.direction === 'income' && 'on')} onClick={() => patch({ direction: 'income' })}>收入</button></div>
      <label className={cx('lbl')}>金额（¥）</label>
      <input className={cx('inp')} inputMode="decimal" placeholder="0.00" value={d.amount} onChange={(e) => patch({ amount: e.target.value.replace(/[^\d.]/g, '') })} />
      {d.direction === 'expense'
        ? <div><label className={cx('lbl')}>类目</label><div className={cx('chiprow')}>{Object.entries(CATS).map(([k, [ic, lb]]) => <button key={k} type="button" className={cx('pick', d.type === k && 'on')} onClick={() => patch({ type: k })}>{ic} {lb}</button>)}</div></div>
        : <div><label className={cx('lbl')}>来源</label><div className={cx('chiprow')}>{[['labor', '劳动所得'], ['other', '其它收入']].map(([k, lb]) => <button key={k} type="button" className={cx('pick', d.incomeType === k && 'on')} onClick={() => patch({ incomeType: k })}>{lb}</button>)}</div></div>}
      <label className={cx('lbl')}>渠道（可选）</label>
      <div className={cx('chiprow')}>{['支付宝', '微信', '现金', '银行卡', '信用卡'].map((ch) => <button key={ch} type="button" className={cx('pick', d.channel === ch && 'on')} onClick={() => patch({ channel: d.channel === ch ? '' : ch })}>{ch}</button>)}</div>
      <label className={cx('lbl')}>备注（可选）</label>
      <input className={cx('inp')} placeholder="星巴克咖啡…" value={d.note || ''} onChange={(e) => patch({ note: e.target.value })} />
    </div>
  );
  else if (kind === 'bigdeal') body = (
    <div>
      <label className={cx('lbl')}>这件大事</label>
      <input className={cx('inp')} placeholder="想搞定的一件大事…" value={d.title} onChange={(e) => patch({ title: e.target.value })} />
      <label className={cx('lbl')}>拆好的小步（可改可删）</label>
      {d.steps.map((s: string, i: number) => (
        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input className={cx('inp')} placeholder="一个够得着的小步…" value={s} onChange={(e) => patch({ steps: d.steps.map((x: string, j: number) => (j === i ? e.target.value : x)) })} />
          <button type="button" className={cx('p5btn ghost')} aria-label="删除这一步" onClick={() => patch({ steps: d.steps.filter((_: string, j: number) => j !== i) })}>✕</button>
        </div>
      ))}
      <button type="button" className={cx('p5btn ink')} onClick={() => patch({ steps: [...d.steps, ''] })}>＋ 再加一步</button>
      <label className={cx('lbl')}>绑定属性 · 每步 +{d.points}</label>{attrPicker(d.attribute, (k) => patch({ attribute: k }))}
    </div>
  );
  const ok = canExecute(d);
  return (
    <ChatSheet title={KIND[kind].label} ghost={KIND[kind].ghost} onClose={onClose}
      foot={<div className={cx('sheet-foot')}><button type="button" className={cx('p5btn ghost')} onClick={onClose}>取消</button><button type="button" className={cx('p5btn')} disabled={!ok} style={ok ? undefined : { opacity: 0.45 }} onClick={() => onDone(d)}>写好了</button></div>}>
      {body}
    </ChatSheet>
  );
}

/** 独立预览：在助手窗里直接弹出该表单 */
export default function NavigatorActionFormPreview({ open, onClose, params }: OverlayProps) {
  const q = new URLSearchParams(params); q.set('form', params?.get('kind') ?? 'activity');
  return <NavigatorWindow open={open} onClose={onClose} params={q} />;
}
