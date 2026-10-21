/**
 * 亲密度升级恭喜页（真实 ConfidantCelebrateScreenP4，经 ConfidantCelebrateScreen 分流）——升级链第二屏。
 * 有星移次数：稍后再说 / ✦ 使用星移；没有：欣然接受。
 * #/overlay/bond-celebrate-p4?id=c-chie&to=8&charges=0
 */
import type { OverlayProps } from '@yellow/registry/types';
import { P4CinemaChain } from '@yellow/screens/pkg3/cinema';
import { demoNotice } from './ConfidantRankUpCutInP4.p4g';

export default function ConfidantCelebrateScreenP4({ open, onClose, params }: OverlayProps) {
  const { c, notice } = demoNotice(params);
  const charges = params?.get('charges') != null ? Number(params.get('charges')) : (c.starShiftCharges ?? 0) + 1;
  return <P4CinemaChain open={open} onClose={onClose} confidant={c} notice={notice} start="page2" charges={charges} />;
}
