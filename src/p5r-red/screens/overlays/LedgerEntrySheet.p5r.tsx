/**
 * 确认这一笔（真实 src/pages/Ledger.tsx draft SheetModal）。?state=parsing|draft|income|ocr
 * 内容：@/screens/pkg4（v3 命令式逐字迁移）；本文件只把它接成 OverlayProps 弹层（open 时打开，用户关掉 → onClose；卸载时撤层）。
 */
import { v3Overlay } from '@/p5r-red/screens/pkg4/bridge';
import { openEntrySheet } from '@/p5r-red/screens/pkg4/ledger4';

export default v3Overlay((p) => { const s = p.get('state') || 'parsing'; openEntrySheet({ text: '咖啡 28', parsing: s === 'parsing', dir: s === 'income' ? 'income' : 'expense', hint: s === 'ocr' ? '看图读的，核对一下金额' : '' }); });
