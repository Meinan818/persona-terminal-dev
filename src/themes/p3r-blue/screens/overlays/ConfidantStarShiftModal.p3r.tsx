/**
 * 星移弹窗（真实 ConfidantStarShiftModal#StarShiftP3 + useStarShiftFlow）：输入 → 推演中 → 预览（新旧对比，逐字落墨）→ 落墨 → 完成（1.4s 自动关）/ 出错。
 *   #/overlay/bond-starshift?stage=input|thinking|preview|done|error
 *   ?fail=error|midError|truncate|offline|nokey（AI 失败分支）  ?charges=0（次数用完，按钮禁用）
 * 入口：恭喜整页「✧ 使用星移」· 同伴详情头部「✧ 星移」。
 */
import type { OverlayProps } from '@blue/registry/types';
import type { AIFail } from '@blue/fx';
import { StarShiftModal, type ShiftStage } from '@blue/screens/pkg3/rankup';
import { PK3_CONFIDANTS } from '@blue/mock/pkg3';

export default function ConfidantStarShiftModal({ open, onClose, params }: OverlayProps) {
  if (!open) return null;
  const c = PK3_CONFIDANTS.find((x) => x.id === params?.get('id')) ?? PK3_CONFIDANTS[0];
  const stage = (params?.get('stage') as ShiftStage) || 'input';
  const charges = Number(params?.get('charges') ?? (c.starShiftCharges || 1));
  return <StarShiftModal confidant={c} charges={charges} initialStage={stage} fail={params?.get('fail') as AIFail} onClose={onClose} />;
}
