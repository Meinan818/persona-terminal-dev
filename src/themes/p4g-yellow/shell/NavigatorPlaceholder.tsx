/**
 * 助手面板占位（真实 src/components/navigator/NavigatorWindow.tsx）。
 * 一旦某工作包在 overlays.pkgN.ts 登记了 'NavigatorWindow'，外壳自动改用登记的组件，本占位不再出现。
 */
import { P4Sheet } from '@yellow/kit/P4Sheet';
import { P4Button } from '@yellow/kit/P4Button';
import { SlotImg } from '@yellow/kit/SlotImg';
import { p4gAsset } from '@yellow/lib/asset';
import type { OverlayProps } from '@yellow/registry/types';

export default function NavigatorPlaceholder({ open, onClose }: OverlayProps) {
  return (
    <P4Sheet open={open} onClose={onClose} title="助手" en="NAVIGATOR · 占位" size="tall">
      <div className="flex min-w-0 items-end gap-3 pt-2">
        <SlotImg slot="char-navigator" fallback={p4gAsset('tv-mascot.webp')} alt="" className="h-24 w-24 shrink-0 object-contain" />
        <div className="relative min-w-0 flex-1 rounded-sm border-3 border-p4g-black bg-[color:var(--p4g-msg)] p-3 text-[color:var(--p4g-msg-ink)] shadow-[5px_5px_0_var(--p4g-msg-plate)]">
          <span className="text-p4g-yellow">&gt; </span>NavigatorWindow 待实现：在 overlays.pkgN.ts 登记 <b>NavigatorWindow</b> 后，这里会换成真实助手面板。
        </div>
      </div>
      <P4Button className="mt-5" block variant="black" onClick={onClose}>关闭</P4Button>
    </P4Sheet>
  );
}
