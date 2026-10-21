/**
 * 思索环 ThinkingCircle（真实 src/components/astrology/ThinkingCircle.tsx：AI 解读 / 推演等待中）。迁移自 v3 overlays/d.js thinking()：
 * 红描边星环 + 墨星芯 + 三点轨道（.od-think，legacy/css/d.css），标题后接「…」逐点闪。低动效：旋转静止（d.css）。
 *   <ThinkingCircleP5 label="推演中" sub="三张牌正在被放在一起推演" />（可复用）
 * 预览 #/overlay/red-thinking：底部抽屉里演示；?label=&sub= 覆盖文案。
 */
import type { OverlayProps } from '@/p5r-red/registry/types';
import { P5Sheet } from '@/p5r-red/kit/P5Sheet';
import { shape } from '@/p5r-red/lib/shape';

export function ThinkingCircleP5({ label = '推演中', sub = '' }: { label?: string; sub?: string }) {
  return (
    <div className="od-think" role="status" aria-live="polite">
      <span className="od-think-c" aria-hidden="true"><svg viewBox="0 0 100 100"><polygon points={shape.starPts(50, 52, 46)} fill="none" stroke="var(--red)" strokeWidth="3" /><polygon points={shape.starPts(50, 52, 30, -54)} fill="var(--ink)" /></svg><i /><i /><i /></span>
      <b>{label}<span className="od-dots"><i>.</i><i>.</i><i>.</i></span></b>{sub && <small>{sub}</small>}
    </div>
  );
}

export default function ThinkingCircle({ open, onClose, params }: OverlayProps) {
  return (
    <P5Sheet open={open} onClose={onClose} title="思索环 ThinkingCircle" seed={63}>
      <div className="od-c"><ThinkingCircleP5 label={params?.get('label') ?? '推演中'} sub={params?.get('sub') ?? '三张牌正在被放在一起推演'} /></div>
    </P5Sheet>
  );
}
