/**
 * 删除任务确认（真实 src/pages/Todos.tsx 页面级 ConfirmDialog「删除任务 / 任务「X」将被永久删除，无法撤销。」）。
 * 内容：@/screens/pkg4（v3 命令式逐字迁移）；本文件只把它接成 OverlayProps 弹层（open 时打开，用户关掉 → onClose；卸载时撤层）。
 */
import { v3Overlay } from '@/p5r-red/screens/pkg4/bridge';
import { confirmDel } from '@/p5r-red/screens/pkg4/todos4';

export default v3Overlay(() => (confirmDel as any)('晨跑 5 公里'));
