/** SheetModal 基座（真实 src/components/SheetModal.tsx p5 渲染）：?variant=bottom（默认，底部抽屉 = kit P5Sheet）| center（居中弹窗 = kit P5Dialog）。 */
import type { OverlayProps } from '@/p5r-red/registry/types';
import { P5Sheet } from '@/p5r-red/kit/P5Sheet';
import { P5Dialog } from '@/p5r-red/kit/P5Dialog';
export default function SheetModalPreview({ open, onClose, params }: OverlayProps) {
  if (params?.get('variant') === 'center') return (
    <P5Dialog open={open} onClose={onClose} title="居中弹窗" icon="✦" description="SheetModal position=center：纸面粗糙壳 + 红巨星，spring 360/22 入场。"
      footer={<button className="oa-cf-b red" style={{ ['--r' as string]: '0.6deg' }} onClick={onClose}>知道了</button>} />
  );
  return (
    <P5Sheet open={open} onClose={onClose} title="底部抽屉" seed={31}>
      <p style={{ margin: 0, font: '800 14px/1.6 var(--f-sans)' }}>SheetModal position=bottom：红闸门擦过 560ms + 纸面 spring 300/26 升起；宽屏居中。点遮罩或 ✕ 关闭。</p>
    </P5Sheet>
  );
}
