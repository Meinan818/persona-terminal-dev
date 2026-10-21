/**
 * 升级链电影层（真实 confidantP4Cinema / ConfidantP4FxLayer）：
 * 负责三屏之间的 CRT 切台（Relay：黑幕收束 → 雪花 + 巨字 ON AIR / INTIMACY UP / STAR SHIFT + 胶片条 → 白闪冲击）
 * 与「监视器」卡在三屏之间的接力（framer layoutId）。本预览从头跑完整条链：舞台 → 恭喜页 → 星移剪辑。
 * #/overlay/bond-p4-cinema?id=c-dojima&from=5&to=6
 */
import type { OverlayProps } from '@yellow/registry/types';
import { P4CinemaChain } from '@yellow/screens/pkg3/cinema';
import { ATTR_NAMES } from '@yellow/screens/pkg3/arcana';
import { demoNotice } from './ConfidantRankUpCutInP4.p4g';

export default function ConfidantP4FxLayer({ open, onClose, params }: OverlayProps) {
  const { c, notice } = demoNotice(params?.get('id') ? params : new URLSearchParams('id=c-dojima&from=5&to=6'));
  return <P4CinemaChain open={open} onClose={onClose} confidant={c} notice={notice} start="stage" charges={(c.starShiftCharges ?? 0) + 1} attrName={c.skillAttribute ? ATTR_NAMES[c.skillAttribute] : undefined} />;
}
