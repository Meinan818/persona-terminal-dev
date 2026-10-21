/**
 * 课表导入 · 确认（真实 src/pages/Todos.tsx FS3.4-②）。?step=confirm（直达确认）|reading（从任务抽屉入口：正在读取课表… → 确认）；?sched=none|fail 报错
 * 内容：@/screens/pkg4（v3 命令式逐字迁移）；本文件只把它接成 OverlayProps 弹层（open 时打开，用户关掉 → onClose；卸载时撤层）。
 */
import { v3Overlay } from '@/p5r-red/screens/pkg4/bridge';
import { openScheduleImport, openTodoForm } from '@/p5r-red/screens/pkg4/todoform4';

export default v3Overlay((p) => p.get('step') === 'reading' || p.get('sched') ? openTodoForm({ sched: p.get('sched') || 'ok' }) : openScheduleImport(), (p) => p.get('step') === 'reading' || p.get('sched') ? [['.sheet-veil .sched', 500]] : []);
