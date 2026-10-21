/** #/overlay/shell-radial-wheel 预览（真实 RadialQuickNav.tsx + RadialWheelP5.tsx）：点选模式，原点 = 底栏助手键位置。
 *  ?state=reduced → 低动效 D0 纵向菜单（WheelD0Menu）。 */
import type { OverlayProps } from '@/p5r-red/registry/types';
import { RadialWheelP5 } from '@/p5r-red/shell/RadialWheelP5.p5r';
export default function RadialQuickNavPreview({ open, onClose, params }: OverlayProps) {
  return <RadialWheelP5 open={open} origin={{ x: innerWidth / 2, y: innerHeight - 50 }} hold={false} reduced={params?.get('state') === 'reduced'} onClose={onClose} />;
}
