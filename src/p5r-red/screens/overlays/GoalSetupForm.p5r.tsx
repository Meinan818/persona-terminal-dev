/**
 * 设定本周目标 GoalSetupForm（真实 src/components/weeklyGoal/GoalSetupForm.tsx）：至少选择 2 项。
 * 内容：@/screens/pkg4（v3 命令式逐字迁移）；本文件只把它接成 OverlayProps 弹层（open 时打开，用户关掉 → onClose；卸载时撤层）。
 */
import { v3Overlay } from '@/p5r-red/screens/pkg4/bridge';
import { OD } from '@/p5r-red/screens/pkg4/d4';

export default v3Overlay(() => OD.openGoalSetup());
