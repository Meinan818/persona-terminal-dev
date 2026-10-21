/**
 * 本月预算 / 新的一程 BudgetSheet（真实 src/pages/Ledger.tsx#BudgetSheet）。?variant=edit|first|locked
 * 内容：@/screens/pkg4（v3 命令式逐字迁移）；本文件只把它接成 OverlayProps 弹层（open 时打开，用户关掉 → onClose；卸载时撤层）。
 */
import { v3Overlay } from '@/p5r-red/screens/pkg4/bridge';
import { openBudgetSheet } from '@/p5r-red/screens/pkg4/ledger4';

export default v3Overlay((p) => { const v = p.get('variant') || 'edit'; openBudgetSheet({ mode: v === 'first' ? 'first' : 'edit', locked: v === 'locked' }); });
