/**
 * 成长总结 SummaryModal（真实 src/components/SummaryModal.tsx；v3 overlays/a.js 逐字迁移）。
 * ?view=generate|preview|archive|detail|result  ?state=busy（生成中 → 流式）|noai（未配置 AI）|none（无进行中）
 * 内容：@/screens/pkg4（v3 命令式逐字迁移）；本文件只把它接成 OverlayProps 弹层（open 时打开，用户关掉 → onClose；卸载时撤层）。
 */
import { v3Overlay } from '@/p5r-red/screens/pkg4/bridge';
import { OA4 } from '@/p5r-red/screens/pkg4/a4';

export default v3Overlay((p) => OA4.openSummary({ view: p.get('view') || 'generate', state: p.get('state') || '' }));
