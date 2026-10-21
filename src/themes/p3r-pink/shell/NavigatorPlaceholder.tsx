/**
 * 助手面板占位（真实 src/components/navigator/NavigatorWindow.tsx）。
 * 某工作包在 overlays.pkgN.ts 登记 'NavigatorWindow' 后，外壳自动改用登记的组件。
 */
import { P3Sheet } from '@pink/kit/overlays';
import { P3Button } from '@pink/kit/controls';
import { P3Speech } from '@pink/kit/surfaces';
import type { OverlayProps } from '@pink/registry/types';

export default function NavigatorPlaceholder({ open, onClose }: OverlayProps) {
  return (
    <P3Sheet open={open} onClose={onClose} title="助手" en="NAVIGATOR · 占位" size="tall">
      <P3Speech speaker="NAVIGATOR">NavigatorWindow 待实现：在 overlays.pkgN.ts 登记 <b>NavigatorWindow</b> 后，这里会换成真实助手面板。</P3Speech>
      <P3Button className="mt-6" block tone="ink" onClick={onClose}>关闭</P3Button>
    </P3Sheet>
  );
}
