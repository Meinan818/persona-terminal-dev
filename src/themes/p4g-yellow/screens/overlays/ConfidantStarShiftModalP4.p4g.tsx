/**
 * 星移 · 电视剪辑版（真实 ConfidantStarShiftModalP4，经 ConfidantStarShiftModal 分流）——升级链第三屏，
 * 也可从同伴详情「✧ 星移」直接进入。input → loading → preview → done / error。
 * #/overlay/bond-starshift-p4?stage=input|loading|preview|done|error
 */
import type { OverlayProps } from '@yellow/registry/types';
import { P4CinemaChain, type ShiftStage } from '@yellow/screens/pkg3/cinema';
import { demoNotice } from './ConfidantRankUpCutInP4.p4g';

export default function ConfidantStarShiftModalP4({ open, onClose, params }: OverlayProps) {
  const { c, notice } = demoNotice(params);
  return <P4CinemaChain open={open} onClose={onClose} confidant={c} notice={notice} start="page3" charges={c.starShiftCharges || 1} shiftStage={(params?.get('stage') as ShiftStage) || 'input'} />;
}
