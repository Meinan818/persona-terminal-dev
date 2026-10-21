/**
 * 日历 · 年月跳转浮层（真实 Activities.tsx showPicker）：「YYYY年」「N月 · MONTH」下拉、「跳转」、开关「在日历上显示重要事件」。
 * 形制：P3R 子菜单抽屉（居中卡，斜切 + 大黑斜体标题）；开关用 CONFIG 行 ON·OFF。
 */
import { useEffect, useState } from 'react';
import type { OverlayProps } from '@pink/registry/types';
import { P3Button, P3ConfigRow, P3Field, P3OnOff, P3Select, P3Sheet, useToast } from '@pink/kit';

const MONTH_EN = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
export default function ActivitiesCalendarPicker({ open, onClose, year = 2026, month = 9, showImportant: si = true, onJump, onToggleImportant }: OverlayProps & { year?: number; month?: number; showImportant?: boolean; onJump?: (y: number, m: number) => void; onToggleImportant?: (v: boolean) => void }) {
  const toast = useToast();
  const [y, setY] = useState(year);
  const [m, setM] = useState(month);
  const [imp, setImp] = useState(si);
  useEffect(() => { if (open) { setY(year); setM(month); setImp(si); } }, [open, year, month, si]);
  return (
    <P3Sheet open={open} onClose={onClose} position="center" title={`${y} / ${String(m + 1).padStart(2, '0')}`} en="CALENDAR">
      <div className="grid grid-cols-2 gap-3">
        <P3Field label="年份"><P3Select aria-label="年份" value={String(y)} onChange={(e) => setY(Number(e.target.value))}>{[2024, 2025, 2026].map((v) => <option key={v} value={v}>{v}年</option>)}</P3Select></P3Field>
        <P3Field label="月份"><P3Select aria-label="月份" value={String(m)} onChange={(e) => setM(Number(e.target.value))}>{MONTH_EN.map((en, i) => <option key={en} value={i}>{i + 1}月 · {en}</option>)}</P3Select></P3Field>
      </div>
      <P3Button block corner className="mt-4" onClick={() => { if (onJump) onJump(y, m); else toast(`跳转到 ${y}年${m + 1}月`); onClose(); }}>跳转</P3Button>
      <P3ConfigRow className="mt-4" label="在日历上显示重要事件" hint="重要记录在日格右上挂一颗星">
        <P3OnOff value={imp} onChange={(v) => { setImp(v); onToggleImportant?.(v); }} ariaLabel="在日历上显示重要事件" />
      </P3ConfigRow>
    </P3Sheet>
  );
}
