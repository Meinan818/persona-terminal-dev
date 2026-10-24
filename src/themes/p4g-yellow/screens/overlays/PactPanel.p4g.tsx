/**
 * 一起进步面板（真实 PactPanel + PactPanelModal + PactQuickEntry）。
 * 状态：none（发起）/ mine（已邀请，可撤回）/ theirs（对方邀请，查看并回应）/ active（打卡进度 + 催一下 + 结束约定）/ guest（未登录）
 * #/overlay/bond-pact-panel?state=none|mine|theirs|active|guest
 */
import type { OverlayProps } from '@yellow/registry/types';
import { P4Sheet } from '@yellow/kit';
import { cx } from '@yellow/lib/cx';
import { Sparkle } from '@yellow/screens/pkg3/ui';
import { PactPanel as RealPactPanel } from '@/components/cooperation/PactPanel';

export type PactState = 'none' | 'mine' | 'theirs' | 'active' | 'guest';

export function PactPanelBody({ partnerId, partnerName, isConfidant = true, proposeLabel = '发起一起进步', bare = false }: { partnerId: string; partnerName: string; isConfidant?: boolean; initialState?: PactState; proposeLabel?: string; bare?: boolean }) {
  return (
    <div className={cx('min-w-0', !bare && 'rounded-sm border-3 border-p4g-line bg-p4g-surface p-3')}>
      {!bare && <div className="mb-1.5 flex items-center gap-1.5"><Sparkle size={12} className="text-p4g-orange" /><span className="font-display text-meta font-bold">一起进步</span></div>}
      <RealPactPanel partnerId={partnerId} partnerName={partnerName} isConfidant={isConfidant} bare={bare} proposeLabel={proposeLabel} />
    </div>
  );
}

export function PactPanelModal({ open, onClose, partnerId, partnerName, initialState }: { open: boolean; onClose: () => void; partnerId: string; partnerName: string; initialState?: PactState }) {
  return (
    <P4Sheet open={open} onClose={onClose} title={`和 ${partnerName} 一起进步`} en="TOGETHER · 一起进步">
      <PactPanelBody partnerId={partnerId} partnerName={partnerName} initialState={initialState} bare />
    </P4Sheet>
  );
}

export default function PactPanel({ open, onClose, params }: OverlayProps) {
  return <PactPanelModal open={open} onClose={onClose} partnerId={params?.get('partnerId') ?? ''} partnerName="千枝" initialState={(params?.get('state') as PactState) || 'active'} />;
}
