/**
 * 记录图片管理抽屉（真实 src/components/ActivityImagesSheet.tsx；v3 overlays/a.js 逐字迁移）：最多 3 张、删除二段、点图进灯箱、可真实选本地图片。?count=0..3
 * 内容：@/screens/pkg4（v3 命令式逐字迁移）；本文件只把它接成 OverlayProps 弹层（open 时打开，用户关掉 → onClose；卸载时撤层）。
 */
import { v3Overlay } from '@/p5r-red/screens/pkg4/bridge';
import { OA4 } from '@/p5r-red/screens/pkg4/a4';

export default v3Overlay((p) => OA4.openActivityImages({ count: +(p.get('count') ?? 2) }));
