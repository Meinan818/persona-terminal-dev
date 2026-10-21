/**
 * 确认 N 笔（真实 src/pages/Ledger.tsx batch SheetModal）：逐行确认 / 增删 → 全部保存（N）→ 记账完成「共 N 笔已入账」。
 * 内容：@/screens/pkg4（v3 命令式逐字迁移）；本文件只把它接成 OverlayProps 弹层（open 时打开，用户关掉 → onClose；卸载时撤层）。
 */
import { v3Overlay } from '@/p5r-red/screens/pkg4/bridge';
import { openBatchSheet } from '@/p5r-red/screens/pkg4/ledger4';

export default v3Overlay(() => openBatchSheet({ text: '午饭拉面32 地铁4 奶茶18' }));
