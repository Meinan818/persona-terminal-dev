/**
 * 课表导入 · 确认（真实 src/pages/Todos.tsx 课表导入 SheetModal）：
 * 说明（带星期 → 按周重复；没有星期 → 每日；点数默认 +1）；「统一归入：」五维；条目逐条勾选（事项 / 星期 / 时间）；取消 / 导入 N 项。
 */
import { useEffect, useState } from 'react';
import type { AttributeId } from '@/types';
import type { OverlayProps } from '@pink/registry/types';
import { P3Button, P3Check, P3Segment, P3Sheet, P3Tag, useToast, P3R, slantClip } from '@pink/kit';
import { ATTR_IDS, ATTR_NAMES, SCHEDULE_ITEMS } from '@pink/adapters/pkg2';
import { WEEK_LABELS } from '@pink/screens/pkg2/common';

export default function TodosScheduleImport({ open, onClose, onImport }: OverlayProps & { onImport?: (n: number) => void }) {
  const toast = useToast();
  const [rows, setRows] = useState(SCHEDULE_ITEMS);
  const [attr, setAttr] = useState<AttributeId>('knowledge');
  useEffect(() => { if (open) setRows(SCHEDULE_ITEMS.map((r) => ({ ...r }))); }, [open]);
  const n = rows.filter((r) => r.on).length;
  return (
    <P3Sheet open={open} onClose={onClose} title="课表导入 · 确认" en="SCHEDULE" size="tall"
      footer={<div className="flex gap-3"><P3Button tone="soft" block onClick={onClose}>取消</P3Button><P3Button block corner disabled={!n} onClick={() => { if (onImport) onImport(n); else toast.success(`已导入 ${n} 项`); onClose(); }}>导入 {n} 项</P3Button></div>}>
      <p className="text-[13px] leading-relaxed" style={{ color: P3R.inkSoft }}>带星期的条目会建成<b style={{ color: P3R.ink }}>按周重复</b>的任务，没有星期信息的建成<b style={{ color: P3R.ink }}>每日</b>任务；点数默认 +1，导入后可逐条编辑。</p>
      <div className="mt-3 text-[13px] font-black" style={{ color: P3R.ink }}>统一归入：</div>
      <P3Segment className="mt-1.5" items={ATTR_IDS.map((a) => ({ id: a, label: ATTR_NAMES[a] }))} value={attr} onChange={(v) => setAttr(v as AttributeId)} />
      <div className="mt-3 space-y-1.5">
        {rows.map((it, i) => (
          <div key={i} className="flex min-w-0 items-center gap-3 px-4 py-2.5" style={{ background: it.on ? P3R.panel : 'var(--p3r-row-alt)', clipPath: slantClip(9), opacity: it.on ? 1 : 0.62 }}>
            <P3Check checked={it.on} onChange={() => setRows((r) => r.map((x, j) => (j === i ? { ...x, on: !x.on } : x)))} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-black" style={{ color: P3R.ink }}>{it.title}</span>
              <span className="block truncate text-[12px]" style={{ color: P3R.grey }}>{it.weekdays.length ? it.weekdays.map((d) => WEEK_LABELS[d]).join(' ') : '每日'}{it.time && ` · ${it.time}`}</span>
            </span>
            <P3Tag tone="ink">{ATTR_NAMES[attr]} +1</P3Tag>
          </div>
        ))}
      </div>
    </P3Sheet>
  );
}
