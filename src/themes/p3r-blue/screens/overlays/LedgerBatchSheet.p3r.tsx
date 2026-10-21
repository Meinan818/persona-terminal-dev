/**
 * 确认 N 笔（真实 src/pages/Ledger.tsx · batch SheetModal）：识别到多笔，逐行确认 / 增删后一次保存。
 * 每行：支出/收入切换 + 金额 + 删除此行；支出 = 类目 + 渠道…；收入 = 来源… + 到账账户…；备注。「＋ 添加一行」「日期（应用到全部）」「全部保存」。
 * 状态机改写自黄色版（只读参考）。路由：?variant=saving（保存中…）
 */
import { useEffect, useState } from 'react';
import type { OverlayProps } from '@blue/registry/types';
import type { LedgerExpenseType } from '@/types';
import { P3Sheet, P3Button, P3Select, P3R, slantClip, IconClose, useToast } from '@blue/kit';
import { FLabel, DateQuickPicker } from '@blue/screens/pkg5/ui';
import { CATEGORY_KEYS, CNY, DEFAULT_CHANNELS, DEFAULT_INCOME_SOURCES, P5_TODAY, catMeta, moneyFromInput, sanitizeMoneyInput } from '@blue/adapters/pkg5';

export interface BatchRow { direction: 'expense' | 'income'; amount: string; type: LedgerExpenseType; channel: string; incomeSource: string; note: string }
export const emptyRow = (): BatchRow => ({ direction: 'expense', amount: '', type: 'food', channel: '微信', incomeSource: '', note: '' });
export const SAMPLE_BATCH: BatchRow[] = [
  { direction: 'expense', amount: '18', type: 'food', channel: '微信', incomeSource: '', note: '早饭' },
  { direction: 'expense', amount: '45', type: 'fun', channel: '支付宝', incomeSource: '', note: '电影' },
  { direction: 'income', amount: '200', type: 'other', channel: '微信', incomeSource: '红包', note: '奶奶的红包' },
];

export function LedgerBatchSheetView({ open, onClose, initial, onSaved, forceSaving }: { open: boolean; onClose: () => void; initial?: BatchRow[]; onSaved?: (summary: string) => void; forceSaving?: boolean }) {
  const toast = useToast();
  const [rows, setRows] = useState<BatchRow[]>(initial ?? SAMPLE_BATCH);
  const [date, setDate] = useState(P5_TODAY);
  const [saving, setSaving] = useState(!!forceSaving);
  useEffect(() => { if (open) { setRows(initial ?? SAMPLE_BATCH); setDate(P5_TODAY); setSaving(!!forceSaving); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const up = (i: number, p: Partial<BatchRow>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...p } : r)));
  const n = rows.filter((r) => moneyFromInput(r.amount) > 0).length;
  const save = () => {
    if (!n || saving) return;
    setSaving(true);
    window.setTimeout(() => { onClose(); if (onSaved) onSaved(`共 ${n} 笔已入账`); else toast.success(`共 ${n} 笔已入账`); }, 520);
  };
  return (
    <P3Sheet open={open} onClose={onClose} title={`确认 ${rows.length} 笔`} en="BATCH CHECK" size="tall" busy={saving}
      footer={<P3Button block size="lg" corner onClick={save} busy={saving} busyText="保存中…" disabled={!n}>全部保存</P3Button>}>
      <div className="flex min-w-0 flex-col gap-3 pt-1">
        <p className="text-[13px] font-bold" style={{ color: P3R.grey }}>识别到多笔，逐行确认 / 增删后一次保存</p>
        {rows.map((row, i) => (
          <div key={`row-${i}`} className="relative min-w-0 px-4 pb-3 pt-3" style={{ clipPath: slantClip(12), background: i % 2 ? 'var(--p3r-row-alt)' : 'var(--p3r-row)' }}>
            <div className="flex min-w-0 items-center gap-2">
              <span aria-hidden className="shrink-0 font-cond text-[18px] leading-none" style={{ color: P3R.cyan }}>{String(i + 1).padStart(2, '0')}</span>
              <button type="button" onClick={() => up(i, { direction: row.direction === 'expense' ? 'income' : 'expense' })} className="h-9 shrink-0 px-3 text-[13px] font-black active:scale-95"
                style={{ clipPath: slantClip(6), background: row.direction === 'income' ? 'var(--p3r-mint)' : P3R.ink, color: row.direction === 'income' ? 'var(--p3r-mulberry)' : 'var(--p3r-on-ink)' }}>
                {row.direction === 'income' ? '收入' : '支出'}
              </button>
              <label className="flex h-9 min-w-0 flex-1 items-center gap-1 px-3" style={{ background: 'var(--p3r-field)', clipPath: slantClip(6), borderBottom: `2px solid ${P3R.cyan}` }}>
                <span className="font-cond text-[14px]" style={{ color: P3R.grey }}>{CNY}</span>
                <input type="text" inputMode="decimal" value={row.amount} placeholder="0" aria-label="金额" onChange={(e) => up(i, { amount: sanitizeMoneyInput(e.target.value) })} className="min-w-0 flex-1 bg-transparent font-cond text-[18px] outline-none" style={{ color: P3R.blue }} />
              </label>
              <button type="button" aria-label="删除此行" onClick={() => setRows((rs) => (rs.length > 1 ? rs.filter((_, j) => j !== i) : rs))} className="flex h-9 w-9 shrink-0 items-center justify-center active:scale-90" style={{ clipPath: slantClip(6), background: 'var(--p3r-chip)', color: 'var(--p3r-coral-ink)' }}><IconClose size={14} /></button>
            </div>
            <div className="mt-2 grid min-w-0 grid-cols-2 gap-2">
              {row.direction === 'expense' ? (
                <>
                  <P3Select aria-label="类目" value={row.type} onChange={(e) => up(i, { type: e.target.value as LedgerExpenseType })}>{CATEGORY_KEYS.map((t) => <option key={t} value={t}>{catMeta(t).label}</option>)}</P3Select>
                  <P3Select aria-label="渠道" value={row.channel} onChange={(e) => up(i, { channel: e.target.value })}><option value="">渠道…</option>{DEFAULT_CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}</P3Select>
                </>
              ) : (
                <>
                  <P3Select aria-label="来源" value={row.incomeSource} onChange={(e) => up(i, { incomeSource: e.target.value })}><option value="">来源…</option>{DEFAULT_INCOME_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}</P3Select>
                  <P3Select aria-label="到账账户" value={row.channel} onChange={(e) => up(i, { channel: e.target.value })}><option value="">到账账户…</option>{DEFAULT_CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}</P3Select>
                </>
              )}
            </div>
            <input value={row.note} placeholder="备注" aria-label="备注" onChange={(e) => up(i, { note: e.target.value })} className="mt-2 h-9 w-full min-w-0 px-3 text-[14px] font-bold outline-none" style={{ background: 'var(--p3r-field)', color: P3R.ink, clipPath: slantClip(6) }} />
          </div>
        ))}
        <button type="button" onClick={() => setRows((rs) => [...rs, emptyRow()])} className="h-11 w-full text-[14px] font-black active:scale-[0.99]" style={{ clipPath: slantClip(10), boxShadow: 'inset 0 0 0 2px rgb(var(--p3r-blue-rgb) / 0.5)', color: P3R.roseInk }}>＋ 添加一行</button>
        <div className="flex min-w-0 flex-col gap-2 pt-1">
          <FLabel>日期（应用到全部）</FLabel>
          <DateQuickPicker value={date} onChange={setDate} />
        </div>
      </div>
    </P3Sheet>
  );
}

export default function LedgerBatchSheet({ open, onClose, params }: OverlayProps) {
  return <LedgerBatchSheetView open={open} onClose={onClose} forceSaving={params?.get('variant') === 'saving'} />;
}
