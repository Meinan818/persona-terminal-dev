/**
 * 星移 · 电视剪辑版（真实 ConfidantStarShiftModalP4，经 ConfidantStarShiftModal 分流）——升级链第三屏，
 * 也可从同伴详情「✧ 星移」直接进入。input → loading → preview → done / error。
 * #/overlay/bond-starshift-p4?stage=input|loading|preview|done|error
 */
import type { OverlayProps } from '@yellow/registry/types';
import { P4CinemaChain, type ShiftStage } from '@yellow/screens/pkg3/cinema';
import { useCooperationData } from '@yellow/adapters/pkg3';
import { P4Sheet } from '@yellow/kit';

export default function ConfidantStarShiftModalP4({ open, onClose, params }: OverlayProps) {
  const { confidants } = useCooperationData();
  const c = confidants.find((item) => item.id === params?.get('id')) ?? confidants[0] ?? null;
  if (!open) return null;
  if (!c) return <P4Sheet open={open} onClose={onClose} title="星移" en="STAR SHIFT"><div className="py-8 text-center text-meta text-p4g-ink-soft">还没有可以进行星移的同伴。</div></P4Sheet>;
  return <P4CinemaChain open={open} onClose={onClose} confidant={c} notice={{ oldLevel: c.intimacy, newLevel: c.intimacy, starShiftGained: false }} start="page3" charges={c.starShiftCharges ?? 0} shiftStage={(params?.get('stage') as ShiftStage) || 'input'} />;
}
