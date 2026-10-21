/**
 * 年度回顾分幕舞台 YearRecapStage（真实 src/components/annual/YearRecapStage.tsx）：12 页 + 伊戈尔的信。?page=0..11；?auto=1 自动翻页（连播）
 * 内容：@/screens/pkg4（v3 命令式逐字迁移）；本文件只把它接成 OverlayProps 弹层（open 时打开，用户关掉 → onClose；卸载时撤层）。
 */
import { v3Overlay } from '@/p5r-red/screens/pkg4/bridge';
import { OD, YR } from '@/p5r-red/screens/pkg4/d4';

export default v3Overlay((p) => { OD.openYearRecap(); const pg = +(p.get('page') ?? 0); if (pg) YR.show?.(pg); if (p.get('auto') === '1') [1, 2, 3, 4].forEach((k) => setTimeout(() => YR.show?.(k), k * 1100)); });
