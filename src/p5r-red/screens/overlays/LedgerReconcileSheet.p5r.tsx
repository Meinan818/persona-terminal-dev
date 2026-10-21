/**
 * 余额对账 / 设置当前余额 ReconcileSheet（真实 src/pages/Ledger.tsx#ReconcileSheet）。?state=normal|initial|used|fail
 * 内容：@/screens/pkg4（v3 命令式逐字迁移）；本文件只把它接成 OverlayProps 弹层（open 时打开，用户关掉 → onClose；卸载时撤层）。
 */
import { v3Overlay } from '@/p5r-red/screens/pkg4/bridge';
import { openReconcileSheet } from '@/p5r-red/screens/pkg4/ledger4';

export default v3Overlay((p) => { const s = p.get('state') || 'normal'; openReconcileSheet({ initial: s === 'initial', remaining: s === 'used' ? 0 : 2, fail: s === 'fail' }); });
