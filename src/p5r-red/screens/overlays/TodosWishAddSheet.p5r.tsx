/**
 * 记下一个愿望（真实 src/pages/Todos.tsx wishAddOpen SheetModal）：空标题不收（红框抖动）。
 * 内容：@/screens/pkg4（v3 命令式逐字迁移）；本文件只把它接成 OverlayProps 弹层（open 时打开，用户关掉 → onClose；卸载时撤层）。
 */
import { v3Overlay } from '@/p5r-red/screens/pkg4/bridge';
import { wishSheet } from '@/p5r-red/screens/pkg4/todos4';

export default v3Overlay(() => (wishSheet as any)());
