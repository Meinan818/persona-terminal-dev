/**
 * 日历 · 年月跳转浮层（真实 Activities.tsx showPicker）：「YYYY年」「N月 · MONTH」下拉、「跳转」、开关「在日历上显示重要事件」。
 */
import { useEffect, useState } from 'react';
import type { OverlayProps } from '@yellow/registry/types';
import { P4Button, P4Dialog, P4Select, P4Switch, useToast } from '@yellow/kit';

const MONTH_EN = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
export default function ActivitiesCalendarPicker({ open, onClose, year = 2026, month = 9, showImportant: si = true, onJump, onToggleImportant }: OverlayProps & { year?: number; month?: number; showImportant?: boolean; onJump?: (y: number, m: number) => void; onToggleImportant?: (v: boolean) => void }) {
  const toast = useToast();
  const [y, setY] = useState(year);
  const [m, setM] = useState(month);
  const [imp, setImp] = useState(si);
  useEffect(() => { if (open) { setY(year); setM(month); setImp(si); } }, [open, year, month, si]);
  return (
    <P4Dialog open={open} onClose={onClose} title={<span className="p4g-date-type">{y}/{String(m + 1).padStart(2, '0')}</span>} speaker="CALENDAR" actions="none" role="dialog">
      <div className="grid grid-cols-2 gap-2">
        <P4Select aria-label="年份" value={String(y)} onChange={(e) => setY(Number(e.target.value))} options={[2024, 2025, 2026].map((v) => ({ value: String(v), label: `${v}年` }))} />
        <P4Select aria-label="月份" value={String(m)} onChange={(e) => setM(Number(e.target.value))} options={MONTH_EN.map((en, i) => ({ value: String(i), label: `${i + 1}月 · ${en}` }))} />
      </div>
      <P4Button block className="mt-3" onClick={() => { onJump ? onJump(y, m) : toast(`跳转到 ${y}年${m + 1}月`); onClose(); }}>跳转</P4Button>
      <div className="mt-4 flex items-center justify-between gap-3 border-t-2 border-dashed border-white/15 pt-3">
        <span className="min-w-0 text-body font-bold text-[color:var(--p4g-msg-ink)]">在日历上显示重要事件</span>
        <P4Switch checked={imp} onChange={(v) => { setImp(v); onToggleImportant?.(v); }} aria-label="在日历上显示重要事件" />
      </div>
    </P4Dialog>
  );
}
