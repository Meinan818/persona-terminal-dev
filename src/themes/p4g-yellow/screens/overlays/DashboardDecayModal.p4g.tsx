/**
 * DashboardDecayModal.p4g —— 真实 Dashboard.tsx 的逆流侵蚀通知（decayedAttrs ModalPortal）。
 * 文案：「逆流侵蚀」「以下属性连续3日无增长，已各扣减 1 点」、属性列表（−1）、「知道了」；点遮罩也关闭。
 * 转场：电视画面弹出（P4Dialog 的 tvPower），关闭收成光点。
 */
import type { OverlayProps } from '@yellow/registry/types';
import type { AttributeId } from '@/types';
import { P4Dialog } from '@yellow/kit';
import { ATTR_NAMES } from '@yellow/adapters/pkg1';

export function DecayModalP4G({ open, onClose, attrs = ['guts', 'kindness'] }: OverlayProps & { attrs?: AttributeId[] }) {
  return (
    <P4Dialog open={open} onClose={onClose} role="dialog" speaker="COUNTERCURRENT" title="逆流侵蚀"
      message={`以下属性连续3日无增长，已${attrs.length > 1 ? '各' : ''}扣减 1 点`} actions="buttons" confirmText="知道了" cancelText={null}>
      <div className="flex flex-col gap-1.5">
        {attrs.map((id) => (
          <div key={id} className="flex min-w-0 items-center justify-between gap-3 border-2 border-p4g-black bg-p4g-surface-2 px-3 py-2 text-p4g-ink" style={{ clipPath: 'polygon(0 0,100% 0,calc(100% - 8px) 100%,0 100%)' }}>
            <span className="min-w-0 truncate font-display text-body font-bold">{ATTR_NAMES[id]}</span>
            <span className="p4g-num text-h3 text-p4g-danger">−1</span>
          </div>
        ))}
      </div>
    </P4Dialog>
  );
}

export default function DashboardDecayModal({ open, onClose, params }: OverlayProps) {
  const one = params?.get('variant') === 'one';
  return <DecayModalP4G open={open} onClose={onClose} attrs={one ? ['guts'] : ['guts', 'kindness']} />;
}
