/**
 * 回归面板 ReturnPanel（真实 src/components/return/ReturnPanel.tsx）+ 一句话概括 + 补记日历 ReturnBackfillCalendar。
 * ?state=short|long  ?step=summary|backfill
 * 内容：@/screens/pkg4（v3 命令式逐字迁移）；本文件只把它接成 OverlayProps 弹层（open 时打开，用户关掉 → onClose；卸载时撤层）。
 */
import { v3Overlay } from '@/p5r-red/screens/pkg4/bridge';
import { OD } from '@/p5r-red/screens/pkg4/d4';

export default v3Overlay((p) => p.get('step') === 'backfill' ? OD.openBackfill() : OD.openReturn(p.get('step') === 'summary' ? 'long' : p.get('state') || 'short'), (p) => p.get('step') === 'summary' ? [['.od-ret [data-act="sum"]', 500]] : []);
