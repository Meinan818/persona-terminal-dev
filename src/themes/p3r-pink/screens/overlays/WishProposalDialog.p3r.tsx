/**
 * 要更新这个愿望的进度吗？（真实 src/components/wish/WishProposalDialog.tsx，App 顶层，助手提议）：
 * icon ✧、说明「听你刚才说的，「X」好像比记录里更靠前了。」、环 + 「58% → 70% +12」/「定为 N%」+ 理由、提示「不想被问可以在「设置 → 助手」里关掉主动提议。」、更新 / 先不用。
 * ?variant=new → 无旧进度（定为 N%）。
 */
import type { OverlayProps } from '@pink/registry/types';
import { P3Dialog, useToast, P3R, slantClip } from '@pink/kit';
import { Ring } from '@pink/screens/pkg2/common';

export default function WishProposalDialog({ open, onClose, params }: OverlayProps) {
  const toast = useToast();
  const fresh = params?.get('variant') === 'new';
  const from = fresh ? undefined : 58; const to = 70; const delta = to - (from ?? 0);
  return (
    <P3Dialog open={open} onClose={onClose} title="要更新这个愿望的进度吗？" description="听你刚才说的，「一年读完 24 本书」好像比记录里更靠前了。"
      icon={<span className="font-heavy text-[30px] leading-none" style={{ color: P3R.blue }}>✧</span>}
      confirmText="更新" cancelText="先不用" onConfirm={() => { onClose(); toast.success(`已更新为 ${to}%`); }}>
      <div className="flex items-center gap-3 px-3 py-3" style={{ background: P3R.cyanFaint, clipPath: slantClip(10) }}>
        <Ring pct={to} size={48} stroke={4} />
        <div className="min-w-0 flex-1 text-left">
          <div className="font-cond text-[18px] tabular" style={{ color: P3R.ink }}>{typeof from === 'number' ? `${from}% → ${to}%` : `定为 ${to}%`}<span className="ml-1.5 text-[13px]" style={{ color: P3R.roseInk }}>+{delta}</span></div>
          <p className="mt-0.5 text-[11px] leading-relaxed" style={{ color: P3R.inkSoft }}>你说这周又读完了两本，比记录里多。</p>
          <p className="mt-1 text-[10px]" style={{ color: P3R.grey }}>不想被问可以在「设置 → 助手」里关掉主动提议。</p>
        </div>
      </div>
    </P3Dialog>
  );
}
