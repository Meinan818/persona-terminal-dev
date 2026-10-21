/** 删除这一笔？（真实 src/pages/Ledger.tsx · ConfirmDialog tone=danger）description = 备注/收入/支出 · ¥金额 */
import type { OverlayProps } from '@yellow/registry/types';
import type { LedgerEntry } from '@/types';
import { P4Dialog } from '@yellow/kit';
import { CNY, LEDGER_ENTRIES, fmtMoney } from '@yellow/adapters/pkg5';

export function LedgerDeleteConfirmView({ target, open, onClose, onConfirm }: { target: LedgerEntry | null; open: boolean; onClose: () => void; onConfirm: () => void }) {
  return (
    <P4Dialog open={open} onClose={onClose} danger speaker="心相记账" title="删除这一笔？"
      message={target ? `${target.note || (target.direction === 'income' ? '收入' : '支出')} · ${CNY}${fmtMoney(target.amount)}` : undefined}
      confirmText="删除" cancelText="取消" onConfirm={onConfirm} />
  );
}

export default function LedgerDeleteConfirm({ open, onClose }: OverlayProps) {
  return <LedgerDeleteConfirmView open={open} onClose={onClose} target={LEDGER_ENTRIES[2]} onConfirm={() => undefined} />;
}
