/**
 * 星移弹窗（真实 ConfidantStarShiftModal#StarShiftP3 + useStarShiftFlow）：输入 → 推演中 → 预览（新旧对比，逐字落墨）→ 落墨 → 完成（1.4s 自动关）/ 出错。
 *   #/overlay/bond-starshift?stage=input|thinking|preview|done|error
 *   ?fail=error|midError|truncate|offline|nokey（AI 失败分支）  ?charges=0（次数用完，按钮禁用）
 * 入口：恭喜整页「✧ 使用星移」· 同伴详情头部「✧ 星移」。
 */
import type { OverlayProps } from '@pink/registry/types';
import type { AIFail } from '@pink/fx';
import { StarShiftModal, type ShiftStage } from '@pink/screens/pkg3/rankup';
import { useCooperationData } from '@pink/adapters/pkg3';
import { P3Sheet, P3R } from '@pink/kit';

export default function ConfidantStarShiftModal({ open, onClose, params }: OverlayProps) {
  const { confidants } = useCooperationData();
  const c = confidants.find((x) => x.id === params?.get('id')) ?? confidants[0] ?? null;
  if (!open) return null;
  if (!c) return <P3Sheet open={open} onClose={onClose} title="星移" en="STAR SHIFT"><div className="py-8 text-center text-[13px] font-bold" style={{ color: P3R.grey }}>还没有可以进行星移的同伴。</div></P3Sheet>;
  const stage = (params?.get('stage') as ShiftStage) || 'input';
  const charges = Number(params?.get('charges') ?? (c.starShiftCharges || 1));
  return <StarShiftModal confidant={c} charges={charges} initialStage={stage} fail={params?.get('fail') as AIFail} onClose={onClose} />;
}
