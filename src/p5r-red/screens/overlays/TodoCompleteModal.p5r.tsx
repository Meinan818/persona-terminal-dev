/**
 * 今日完成 TodoCompleteModal → TodoCompleteP5（真实 src/components/TodoCompleteModal.tsx + p5r/cutins.tsx#TodoCompleteP5；p5-modal-06）。
 *   ?variant=default（晨跑 5 公里 +2，音符雨）| unlock（带「★ 你解锁了新成就 / 新技能！」）  ?title=&points=&heading=
 * 3s 自动关 / 点幕 / ✕；heading=记录成功 / 记账完成 由 SaveSuccessModal（pkg5）/ LedgerSavedModal（pkg4）复用同一函数 todoCompleteP5。
 */
import type { OverlayProps } from '@/p5r-red/registry/types';
import { todoCompleteP5, useCutIn } from './cutins.p5r';

export default function TodoCompleteModal({ open, onClose, params }: OverlayProps) {
  useCutIn(open, (done) => todoCompleteP5({ title: params?.get('title') ?? '晨跑 5 公里', points: Number(params?.get('points') ?? 2), unlock: params?.get('variant') === 'unlock', heading: params?.get('heading') ?? '今日完成', onClose: done }), onClose);
  return null;
}
