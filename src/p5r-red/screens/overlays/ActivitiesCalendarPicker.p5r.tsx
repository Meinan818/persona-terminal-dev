/**
 * 日历 · 年月跳转浮层（真实 src/pages/Activities.tsx showPicker；记录页日历顶部年月 → 浮层）：年份左右 + 12 个月格 + 回到今天。
 * 内容：@/screens/pkg4（v3 命令式逐字迁移）；本文件只把它接成 OverlayProps 弹层（open 时打开，用户关掉 → onClose；卸载时撤层）。
 */
import { v3Overlay } from '@/p5r-red/screens/pkg4/bridge';
import { openCalendarPicker } from '@/p5r-red/screens/pkg4/extra4';

export default v3Overlay(() => openCalendarPicker());
