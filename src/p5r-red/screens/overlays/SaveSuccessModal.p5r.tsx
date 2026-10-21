/**
 * 记录成功 SaveSuccessModal（真实 src/components/SaveSuccessModal.tsx：p5 → TodoCompleteP5 heading="记录成功"，autoCloseMs 3000）。
 * 复用 pkg1 的 todoCompleteP5（cutins.p5r.ts，v3 a.js todoDone 原样迁移），只换标题。
 *   ?variant=unlock   → 带解锁提示「★ 你解锁了新成就 / 新技能！」（fx-save-success-unlock）
 *   ?title= &points=  → 自定文案 / 点数（点数 = 音符数）
 * playSaveSuccess()：记录页保存后命令式调用。
 */
import type { OverlayProps } from '@/p5r-red/registry/types';
import { todoCompleteP5, useCutIn } from './cutins.p5r';

export const playSaveSuccess = ({ title, points = 0, unlock = false, onClose }: { title: string; points?: number; unlock?: boolean; onClose?: () => void }) =>
  todoCompleteP5({ title, points, unlock, heading: '记录成功', onClose });

export default function SaveSuccessModal({ open, onClose, params }: OverlayProps) {
  useCutIn(open, (done) => playSaveSuccess({ title: params?.get('title') ?? '图书馆自习三小时', points: Number(params?.get('points') ?? 3), unlock: params?.get('variant') === 'unlock', onClose: done }), onClose);
  return null;
}
