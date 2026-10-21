/**
 * 添加 / 编辑任务抽屉 TodoFormSheet（真实 src/pages/Todos.tsx showAdd）。
 * ?step=add|edit|big|invalid  ?ai=ok|fail|offline  ?sched=ok|none|fail  ?vision=0
 * 内容：@/screens/pkg4（v3 命令式逐字迁移）；本文件只把它接成 OverlayProps 弹层（open 时打开，用户关掉 → onClose；卸载时撤层）。
 */
import { v3Overlay } from '@/p5r-red/screens/pkg4/bridge';
import { openTodoForm } from '@/p5r-red/screens/pkg4/todoform4';
import { P5 } from '@/p5r-red/screens/pkg4/p5';

export default v3Overlay((p) => { const s = p.get('step') || 'add'; (openTodoForm as any)({ todo: s === 'edit' ? P5.D.todos[3] : null, mode: s === 'big' ? 'big' : undefined, ai: p.get('ai') || 'ok', sched: p.get('sched') || 'ok', vision: p.get('vision') !== '0', invalid: s === 'invalid' }); });
