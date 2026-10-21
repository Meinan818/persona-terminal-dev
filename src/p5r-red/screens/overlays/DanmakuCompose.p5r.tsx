/**
 * 写一句鼓励 DanmakuCompose（真实 src/components/danmaku/DanmakuCompose.tsx）：先审后发 20 字、剩余次数。
 * 内容：@/screens/pkg4（v3 命令式逐字迁移）；本文件只把它接成 OverlayProps 弹层（open 时打开，用户关掉 → onClose；卸载时撤层）。
 */
import { v3Overlay } from '@/p5r-red/screens/pkg4/bridge';
import { OA4 } from '@/p5r-red/screens/pkg4/a4';

export default v3Overlay(() => OA4.openCompose());
