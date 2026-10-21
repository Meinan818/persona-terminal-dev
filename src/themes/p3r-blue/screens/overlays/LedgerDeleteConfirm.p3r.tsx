/** 删除这一笔？（真实 src/pages/Ledger.tsx · ConfirmDialog tone=danger；description = 备注/收入/支出 · ¥金额）→ P3R 系统框 */
import type { OverlayProps } from '@blue/registry/types';
import type { LedgerEntry } from '@/types';
import { P3Dialog } from '@blue/kit';
import { CNY, LEDGER_ENTRIES, fmtMoney } from '@blue/adapters/pkg5';

export function LedgerDeleteConfirmView({ target, open, onClose, onConfirm }: { target: LedgerEntry | null; open: boolean; onClose: () => void; onConfirm: () => void }) {
  return (
    <P3Dialog open={open} onClose={onClose} tone="danger" variant="system" title="删除这一笔？"
      description={target ? `${target.note || (target.direction === 'income' ? '收入' : '支出')} · ${CNY}${fmtMoney(target.amount)}` : undefined}
      confirmText="删除" cancelText="取消" onConfirm={() => { onConfirm(); onClose(); }} />
  );
}

export default function LedgerDeleteConfirm({ open, onClose }: OverlayProps) {
  return <LedgerDeleteConfirmView open={open} onClose={onClose} target={LEDGER_ENTRIES[2]} onConfirm={() => undefined} />;
}
