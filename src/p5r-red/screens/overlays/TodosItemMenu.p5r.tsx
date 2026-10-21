/**
 * 任务长按菜单（真实 src/pages/Todos.tsx ActionSheet：编辑 / 归档 / 删除）。
 * 内容：@/screens/pkg4（v3 命令式逐字迁移）；本文件只把它接成 OverlayProps 弹层（open 时打开，用户关掉 → onClose；卸载时撤层）。
 */
import { v3Overlay } from '@/p5r-red/screens/pkg4/bridge';
import { P5 } from '@/p5r-red/screens/pkg4/p5';
import { openTodoForm } from '@/p5r-red/screens/pkg4/todoform4';
import { confirmDel } from '@/p5r-red/screens/pkg4/todos4';

export default v3Overlay(() => { const t = P5.D.todos[0]; P5.actionSheet(t.title, [{ label: '编辑', onClick: () => (openTodoForm as any)({ todo: t }) }, { label: '归档', onClick: () => P5.toast('已归档（不启用）') }, { label: '删除', tone: 'danger', onClick: () => (confirmDel as any)(t.title) }]); });
