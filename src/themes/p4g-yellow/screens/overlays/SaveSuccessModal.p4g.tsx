/**
 * 记录成功 Cut-in —— 真实 SaveSuccessModal 的 p4 分支：直接复用「今日完成」贴纸演出 TodoCompleteP4，heading 换「记录成功」
 * （真实 src/components/SaveSuccessModal.tsx：`if (channel === 'p4') return <TodoCompleteP4 … heading="记录成功" />`）。
 * 所以与 global-todo-complete 同一套时序：星形对勾徽 .14 旋入 → 黑题板 .34 → 奶油旗标（摘要 · +点数）.5 → 星花迸开 → 跳音符（随点数）→ 3.2s 自动收场。
 * tone=important 在真实 p4 分支里不改外观（只有中性主题换金色），demo 同口径。
 * ?variant=unlock 显示「✦ 你解锁了新成就 / 新技能！」；?variant=important 重要记录（外观同默认）。
 */
import type { OverlayProps } from '@yellow/registry/types';
import { TodoCompleteP4G } from './TodoCompleteModal.p4g';

export default function SaveSuccessModal({ open, onClose, params, description, totalPoints, unlock }: OverlayProps & { description?: string; totalPoints?: number; unlock?: boolean; important?: boolean }) {
  const v = params?.get('variant');
  const showUnlock = unlock ?? v === 'unlock';
  return (
    <TodoCompleteP4G open={open} onClose={onClose} heading="记录成功"
      title={description ?? '在图书馆把《雾中小镇》读完了第 4 章'} totalPoints={totalPoints ?? 3}
      unlockHint={showUnlock ? { achievements: 1, skills: 0 } : undefined} />
  );
}
