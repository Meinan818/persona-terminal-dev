/**
 * 要更新这个愿望的进度吗？（真实 src/components/wish/WishProposalDialog.tsx，助手提议）：
 * 说明「听你刚才说的，「X」好像比记录里更靠前了。」、进度「58% → 70%」/「定为 N%」、更新 / 先不用、提示「不想被问可以在「设置 → 助手」里关掉主动提议。」
 */
import type { OverlayProps } from '@yellow/registry/types';
import { P4Dialog, useToast } from '@yellow/kit';
import { Ring } from '@yellow/screens/pkg2/common';

export default function WishProposalDialog({ open, onClose, params, wishTitle, fromPct, toPct, reason, onConfirm }: OverlayProps & { wishTitle?: string; fromPct?: number; toPct?: number; reason?: string; onConfirm?: () => void }) {
  const toast = useToast();
  const fresh = params?.get('variant') === 'new' || fromPct === undefined;
  const from = fresh ? undefined : (fromPct ?? 58); const to = toPct ?? 70;
  const name = wishTitle ?? '一年读完 24 本书';
  return (
    <P4Dialog open={open} onClose={onClose} speaker="助手" title="要更新这个愿望的进度吗？" message={`听你刚才说的，「${name}」好像比记录里更靠前了。${reason ? `\n${reason}` : ''}`}
      confirmText="更新" cancelText="先不用" onConfirm={() => { if (onConfirm) onConfirm(); else toast.success(`已更新为 ${to}%`); }}>
      <div className="flex items-center gap-3 rounded-sm bg-p4g-yellow px-3 py-2 text-p4g-black">
        <Ring pct={to} size={48} stroke={6} />
        <span className="p4g-num text-h2">{typeof from === 'number' ? `${from}% → ${to}%` : `定为 ${to}%`}</span>
      </div>
      <p className="mt-2 text-cap text-[color:var(--p4g-msg-ink)]/70">不想被问可以在「设置 → 助手」里关掉主动提议。</p>
    </P4Dialog>
  );
}
