/**
 * 塔罗翻面卡 TarotFlipView（真实 src/components/codex/TarotFlipView.tsx + FlipCardView）：点一下或左右拖动翻面，背面是牌意。?auto=1 自动翻面
 * 内容：@/screens/pkg4（v3 命令式逐字迁移）；本文件只把它接成 OverlayProps 弹层（open 时打开，用户关掉 → onClose；卸载时撤层）。
 */
import { v3Overlay } from '@/p5r-red/screens/pkg4/bridge';
import { OD } from '@/p5r-red/screens/pkg4/d4';

export default v3Overlay((p) => OD.openTarotFlip(OD.MAJ[+(p.get('card') ?? 17)]), (p) => p.get('auto') === '1' ? [['.od-fcv-card', 900, 'tap']] : []);
