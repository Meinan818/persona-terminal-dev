/**
 * 重新生成？（丢弃草稿确认，真实 SummaryModal 内 ConfirmDialog「重新生成？/ 这份草稿还没归档，重新生成会把它丢掉。」）——在草稿上自动点「重新生成」。
 * 内容：@/screens/pkg4（v3 命令式逐字迁移）；本文件只把它接成 OverlayProps 弹层（open 时打开，用户关掉 → onClose；卸载时撤层）。
 */
import { v3Overlay } from '@/p5r-red/screens/pkg4/bridge';
import { OA4 } from '@/p5r-red/screens/pkg4/a4';

export default v3Overlay(() => OA4.openSummary({ view: 'preview', state: 'regen' }));
