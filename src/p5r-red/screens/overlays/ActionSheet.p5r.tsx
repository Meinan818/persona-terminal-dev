/** ActionSheet 基座（真实 src/components/ActionSheet.tsx p5 渲染 = kit P5ActionSheet）：碑牌逐个甩入，末尾取消。 */
import type { OverlayProps } from '@/p5r-red/registry/types';
import { P5ActionSheet } from '@/p5r-red/kit/P5ActionSheet';
import { toast } from '@/p5r-red/kit/P5Toast';
export default function ActionSheetPreview({ open, onClose }: OverlayProps) {
  return <P5ActionSheet open={open} onClose={onClose} title="晨跑 5 公里" actions={[{ label: '分享到据点', onClick: () => toast('分享到据点') }, { label: '图片', onClick: () => toast('图片') }, { label: '删除', tone: 'danger', onClick: () => toast('删除') }]} />;
}
