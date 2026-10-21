/**
 * 记账完成 Cut-in —— 真实 src/components/LedgerSavedModal.tsx 的 p4 分支：复用「今日完成」贴纸演出 TodoCompleteP4，heading「记账完成」，
 * title = 摘要（单笔「−¥28 · 咖啡」/ 批量「共 3 笔已入账」），不带点数（所以没有跳音符）；autoClose 3.2s（TodoCompleteP4 的值，中性主题才是 2.6s）。
 * ?variant=batch 演示批量文案。
 */
import type { OverlayProps } from '@yellow/registry/types';
import { TodoCompleteP4G } from './TodoCompleteModal.p4g';

export function LedgerSavedModalView({ open, onClose, title }: { open: boolean; onClose: () => void; title: string }) {
  return <TodoCompleteP4G open={open} onClose={onClose} heading="记账完成" title={title} totalPoints={0} eyebrow="LEDGER SAVED" />;
}

export default function LedgerSavedModal({ open, onClose, params }: OverlayProps) {
  const batch = params?.get('variant') === 'batch';
  return <LedgerSavedModalView open={open} onClose={onClose} title={batch ? '共 3 笔已入账' : '−¥28 · 咖啡 + 可颂'} />;
}
