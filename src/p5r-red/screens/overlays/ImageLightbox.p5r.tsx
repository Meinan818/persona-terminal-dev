/**
 * 看图大图 ImageLightbox（真实 src/components/ImageLightbox.tsx）：左右滑 / ←→ 切换，保存 / 删除（二段确认）。?index=
 * 内容：@/screens/pkg4（v3 命令式逐字迁移）；本文件只把它接成 OverlayProps 弹层（open 时打开，用户关掉 → onClose；卸载时撤层）。
 */
import { v3Overlay } from '@/p5r-red/screens/pkg4/bridge';
import { OA4 } from '@/p5r-red/screens/pkg4/a4';

export default v3Overlay((p) => OA4.openLightbox({ index: +(p.get('index') ?? 0) }));
