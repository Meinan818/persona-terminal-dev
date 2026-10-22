/**
 * 课表导入 · 确认（真实 src/pages/Todos.tsx 课表导入 SheetModal）：
 * 说明（带星期 → 按周重复；没有星期 → 每日；点数默认 +1）；「统一归入：」五维；条目逐条勾选（事项 / 星期 / 时间）；取消 / 导入 N 项。
 */
import { useEffect, useState } from 'react';
import type { AttributeId } from '@real/types';
import type { OverlayProps } from '@yellow/registry/types';
import { P4Button, P4Sheet, IconCheck, useToast } from '@yellow/kit';
import { ATTR_IDS, ATTR_NAMES, SCHEDULE_ITEMS } from '@yellow/mock/pkg2';
import { WEEK_LABELS } from '@yellow/screens/pkg2/common';
import { cx } from '@yellow/lib/cx';

export default function TodosScheduleImport({ open, onClose, onImport }: OverlayProps & { onImport?: (n: number) => void }) {
  const toast = useToast();
  const [rows, setRows] = useState(SCHEDULE_ITEMS);
  const [attr, setAttr] = useState<AttributeId>('knowledge');
  useEffect(() => { if (open) setRows(SCHEDULE_ITEMS.map((r) => ({ ...r }))); }, [open]);
  const n = rows.filter((r) => r.on).length;
  return (
    <P4Sheet open={open} onClose={onClose} title="课表导入 · 确认" en="SCHEDULE IMPORT"
      footer={<div className="flex gap-3"><P4Button variant="secondary" block onClick={onClose}>取消</P4Button><P4Button block disabled={!n} onClick={() => { onImport ? onImport(n) : toast.success(`已导入 ${n} 项`); onClose(); }}>导入 {n} 项</P4Button></div>}>
      <p className="text-meta leading-relaxed text-p4g-ink-soft">带星期的条目会建成<b className="text-p4g-ink">按周重复</b>的任务，没有星期信息的建成<b className="text-p4g-ink">每日</b>任务；点数默认 +1，导入后可逐条编辑。</p>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="text-meta font-bold text-p4g-ink-soft">统一归入：</span>
        {ATTR_IDS.map((a) => <button key={a} type="button" onClick={() => setAttr(a)} aria-pressed={attr === a} className={cx('rounded-xs border-thin px-2 py-0.5 font-display text-meta font-bold', attr === a ? 'border-p4g-black bg-p4g-tag text-[color:var(--p4g-tag-ink)]' : 'border-p4g-line text-p4g-ink')}>{ATTR_NAMES[a]}</button>)}
      </div>
      <div className="mt-3 overflow-hidden rounded-sm border-3 border-p4g-black night:border-p4g-yellow">
        {rows.map((it, i) => (
          <button key={i} type="button" onClick={() => setRows((r) => r.map((x, j) => (j === i ? { ...x, on: !x.on } : x)))} aria-pressed={it.on}
            className={cx('flex w-full min-w-0 items-center gap-3 border-b-2 border-[color:var(--p4g-separator-a)] px-3 py-2.5 text-left', it.on ? 'bg-p4g-surface text-p4g-ink' : 'bg-p4g-surface-2 text-p4g-ink opacity-60')}>
            <span className={cx('flex h-6 w-6 shrink-0 items-center justify-center border-3 border-p4g-black', it.on ? 'bg-p4g-orange text-p4g-black' : 'bg-white text-transparent')}><IconCheck size={12} /></span>
            <span className="min-w-0 flex-1"><span className="block truncate font-display text-body font-bold">{it.title}</span><span className="block truncate text-cap opacity-75">{it.weekdays.length ? it.weekdays.map((d) => WEEK_LABELS[d]).join(' ') : '每日'}{it.time && ` · ${it.time}`}</span></span>
            <span className="shrink-0 rounded-xs bg-p4g-black px-1.5 font-display text-2xs font-bold text-p4g-yellow">{ATTR_NAMES[attr]} +1</span>
          </button>
        ))}
      </div>
    </P4Sheet>
  );
}
