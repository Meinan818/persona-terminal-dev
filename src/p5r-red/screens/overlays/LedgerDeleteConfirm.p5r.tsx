/**
 * 删除这一笔？（真实 src/pages/Ledger.tsx ConfirmDialog）
 * 内容：@/screens/pkg4（v3 命令式逐字迁移）；本文件只把它接成 OverlayProps 弹层（open 时打开，用户关掉 → onClose；卸载时撤层）。
 */
import { v3Overlay } from '@/p5r-red/screens/pkg4/bridge';
import { P5 } from '@/p5r-red/screens/pkg4/p5';

export default v3Overlay(() => P5.confirmDlg({ title: '删除这一笔？', description: '午饭 · 拉面 · ¥32', tone: 'danger', confirmText: '删除', cancelText: '取消' }));
