/**
 * 确认 N 笔（真实 src/pages/Ledger.tsx · batch SheetModal）：识别到多笔，逐行确认 / 增删后一次保存。
 * 每行：支出/收入切换 + 金额 + 删除此行；支出 = 类目 + 渠道…；收入 = 来源… + 到账账户…；备注。「＋ 添加一行」「日期（应用到全部）」「全部保存（N）」。
 */
import { useEffect, useState } from 'react';
import type { OverlayProps } from '@yellow/registry/types';
import type { LedgerExpenseType } from '@real/types';
import { P4Sheet, P4Button, IconClose, useToast } from '@yellow/kit';
import { cx } from '@yellow/lib/cx';
import { P5Label, DateQuickPicker } from '@yellow/screens/pkg5/ui';
import { CATEGORY_KEYS, CNY, DEFAULT_CHANNELS, DEFAULT_INCOME_SOURCES, P5_TODAY, catMeta, incomeTypeFromSource, moneyFromInput, sanitizeMoneyInput } from '@yellow/mock/pkg5';
import { ledgerOps } from '@/themes/ledgerOperations';
import { useAppStore } from '@/store';

export interface BatchRow { direction: 'expense' | 'income'; amount: string; type: LedgerExpenseType; channel: string; incomeSource: string; note: string }
export const emptyRow = (): BatchRow => ({ direction: 'expense', amount: '', type: 'food', channel: '微信', incomeSource: '', note: '' });

const sel = 'h-9 min-w-0 flex-1 appearance-none truncate rounded-xs border-thin border-p4g-line bg-p4g-surface-2 px-2 font-display text-meta font-bold text-p4g-ink outline-none';

export function LedgerBatchSheetView({ open, onClose, initial, initialDate, onSaved }: { open: boolean; onClose: () => void; initial?: BatchRow[]; initialDate?: string; onSaved?: (summary: string) => void }) {
  const toast = useToast();
  const settings = useAppStore((s) => s.settings);
  const channels = settings.ledgerChannels ?? DEFAULT_CHANNELS;
  const sources = settings.ledgerIncomeSources ?? DEFAULT_INCOME_SOURCES;
  const [rows, setRows] = useState<BatchRow[]>(initial ?? [emptyRow()]);
  const [date, setDate] = useState(P5_TODAY);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) { setRows(initial ?? [emptyRow()]); setDate(initialDate ?? P5_TODAY); setSaving(false); } }, [open]); // eslint-disable-line
  const up = (i: number, p: Partial<BatchRow>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...p } : r)));
  const n = rows.filter((r) => moneyFromInput(r.amount) > 0).length;
  const save = async () => {
    if (!n || saving) return;
    setSaving(true);
    try {
      const requests = rows.flatMap((row) => {
        const amount = moneyFromInput(row.amount);
        if (!amount) return [];
        return [{
          input: {
            direction: row.direction,
            amount,
            date,
            source: 'manual' as const,
            type: row.direction === 'expense' ? row.type : undefined,
            category: row.direction === 'income' ? row.incomeSource.trim() || undefined : undefined,
            channel: row.channel.trim() || undefined,
            incomeType: row.direction === 'income' ? incomeTypeFromSource(row.incomeSource) : undefined,
            note: row.note.trim() || undefined,
          },
        }];
      });
      await ledgerOps.saveBatch(requests);
      onClose();
      onSaved ? onSaved(`共 ${n} 笔已入账`) : toast.success(`共 ${n} 笔已入账`);
    } catch (e) {
      setSaving(false);
      toast.error(`批量记账失败：${(e as Error)?.message ?? '请重试'}`);
    }
  };
  return (
    <P4Sheet open={open} onClose={onClose} title={`确认 ${rows.length} 笔`} en="BATCH CHECK" size="tall"
      footer={<P4Button block size="lg" onClick={save} disabled={saving || !n}>{saving ? '保存中…' : `全部保存（${n}）`}</P4Button>}>
      <div className="flex min-w-0 flex-col gap-3 pt-1">
        <p className="text-meta font-bold text-p4g-ink-soft">识别到多笔，逐行确认 / 增删后一次保存</p>
        {rows.map((row, i) => (
          <div key={i} className="relative min-w-0 rounded-sm border-3 border-p4g-line bg-p4g-surface p-2.5 shadow-hard-sm" style={{ background: 'var(--p4g-surface-grad)' }}>
            <span aria-hidden className="absolute -left-[3px] -top-[3px] rounded-br-sm bg-p4g-black px-1.5 p4g-num text-2xs text-p4g-yellow night:bg-p4g-yellow night:text-p4g-black">{String(i + 1).padStart(2, '0')}</span>
            <div className="flex min-w-0 items-center gap-2 pl-6">
              <button type="button" onClick={() => up(i, { direction: row.direction === 'expense' ? 'income' : 'expense' })}
                className={cx('p4g-press h-9 shrink-0 rounded-xs border-thin px-2.5 font-display text-meta font-bold', row.direction === 'income' ? 'border-p4g-black bg-p4g-green text-p4g-black' : 'border-p4g-black bg-p4g-black text-p4g-yellow night:border-p4g-yellow')}>
                {row.direction === 'income' ? '收入' : '支出'}
              </button>
              <label className="flex h-9 min-w-0 flex-1 items-center gap-1 rounded-xs border-thin border-p4g-line bg-p4g-surface-2 px-2">
                <span className="p4g-num text-meta text-p4g-ink-soft">{CNY}</span>
                <input type="text" inputMode="decimal" value={row.amount} placeholder="0" aria-label="金额" onChange={(e) => up(i, { amount: sanitizeMoneyInput(e.target.value) })} className="min-w-0 flex-1 bg-transparent p4g-num text-lead text-p4g-ink outline-none focus-visible:outline-none" />
              </label>
              <button type="button" aria-label="删除此行" onClick={() => setRows((rs) => (rs.length > 1 ? rs.filter((_, j) => j !== i) : rs))} className="p4g-press flex h-9 w-9 shrink-0 items-center justify-center rounded-xs border-thin border-p4g-line bg-p4g-surface-2 text-p4g-danger"><IconClose size={14} /></button>
            </div>
            <div className="mt-2 flex min-w-0 gap-2">
              {row.direction === 'expense' ? (
                <>
                  <select aria-label="类目" value={row.type} onChange={(e) => up(i, { type: e.target.value as LedgerExpenseType })} className={sel}>
                    {CATEGORY_KEYS.map((t) => <option key={t} value={t}>{catMeta(t).icon} {catMeta(t).label}</option>)}
                  </select>
                  <select aria-label="渠道" value={row.channel} onChange={(e) => up(i, { channel: e.target.value })} className={sel}>
                    <option value="">渠道…</option>
                    {channels.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </>
              ) : (
                <>
                  <select aria-label="来源" value={row.incomeSource} onChange={(e) => up(i, { incomeSource: e.target.value })} className={sel}>
                    <option value="">来源…</option>
                    {sources.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <select aria-label="到账账户" value={row.channel} onChange={(e) => up(i, { channel: e.target.value })} className={sel}>
                    <option value="">到账账户…</option>
                    {channels.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </>
              )}
            </div>
            <input value={row.note} placeholder="备注" aria-label="备注" onChange={(e) => up(i, { note: e.target.value })} className="mt-2 h-9 w-full min-w-0 rounded-xs border-thin border-p4g-line bg-p4g-surface-2 px-2 text-body text-p4g-ink outline-none focus-visible:outline-none placeholder:text-p4g-muted" />
          </div>
        ))}
        <button type="button" onClick={() => setRows((rs) => [...rs, emptyRow()])} className="p4g-press h-11 w-full rounded-sm border-3 border-dashed border-p4g-line font-display text-body font-bold text-p4g-ink">＋ 添加一行</button>
        <div className="flex min-w-0 flex-col gap-2 pt-1">
          <P5Label>日期（应用到全部）</P5Label>
          <DateQuickPicker value={date} onChange={setDate} />
        </div>
      </div>
    </P4Sheet>
  );
}

export default function LedgerBatchSheet({ open, onClose }: OverlayProps) {
  return <LedgerBatchSheetView open={open} onClose={onClose} />;
}
