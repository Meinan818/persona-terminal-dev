/**
 * 命运抽签 FateDrawSheet（真实 src/components/fate/FateDrawSheet.tsx）。?state=gate|empty|reveal；?auto=1 闸门 → 洗牌 → 揭示
 * 内容：@/screens/pkg4（v3 命令式逐字迁移）；本文件只把它接成 OverlayProps 弹层（open 时打开，用户关掉 → onClose；卸载时撤层）。
 */
import { v3Overlay } from '@/p5r-red/screens/pkg4/bridge';
import { OD } from '@/p5r-red/screens/pkg4/d4';

export default v3Overlay((p) => OD.openFateDraw(p.get('state') || 'gate'), (p) => p.get('auto') === '1' ? [['.od-fate [data-act="draw"]', 900]] : []);
