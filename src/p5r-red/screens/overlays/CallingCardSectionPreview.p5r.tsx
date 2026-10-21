/**
 * 倒计时（宣告卡）区块单独预览（inventory actions-calling-cards）：在默认舞台上摆一块 GoalDeck「倒计时」面宽度的容器，嵌 CallingCardSection。
 * 真实位置 = 行动·任务页 GoalDeck 倒计时面（pkg4 Todos.p5r.tsx 嵌入同一组件）。?state=empty | menu
 */
import type { OverlayProps } from '@/p5r-red/registry/types';
import { CallingCardSection } from '@/p5r-red/screens/pages/CallingCardSection.p5r';
export default function CallingCardSectionPreview({ open, params }: OverlayProps) {
  if (!open) return null;
  const st = params?.get('state');
  return <div className="ccs-preview"><CallingCardSection empty={st === 'empty'} initialMenu={st === 'menu'} /></div>;
}
