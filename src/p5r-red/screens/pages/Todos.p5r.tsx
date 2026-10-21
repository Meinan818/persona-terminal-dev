/**
 * 行动 · 任务子视图 TodosView（真实 src/pages/Todos.tsx p5 渲染；视觉 = v3 pages/todos.js + legacy/css/todos.css）。
 * 内容由 @/screens/pkg4/todos4（v3 逐字迁移 + FIXLIST 改动，见该文件头注释）命令式渲染；切换头由行动页壳传入，portal 进日历挂件下方。
 * 路由参数：?deck=weekly|countdown  ?goal=empty|progress|done|claimed  ?cc=empty|archived  ?pane=wish  ?state=empty
 *   sessionStorage velvet:todos-goal-panel=countdown（首页宣告卡提示条）→ 打开倒计时面并滚到 #calling-card-section。
 */
import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { ActionsSubViewProps } from './Actions.p5r';
import { V3Host } from '@/p5r-red/screens/pkg4/bridge';
import { applyTodosParams, todosEnter, todosMount, todosRender } from '@/p5r-red/screens/pkg4/todos4';
import { DevStateBar } from '@/p5r-red/kit/DevStateBar';

export default function TodosView({ params, wide, tabs }: ActionsSubViewProps) {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const q = params.toString();
  return (
    <>
      <V3Host dep={`${q}|${wide}`}
        render={() => { applyTodosParams(params); return todosRender(wide); }}
        mount={(root) => { setSlot(root.querySelector<HTMLElement>('[data-tabs-slot]')); return todosMount(root, wide); }}
        enter={todosEnter} />
      {slot && createPortal(tabs, slot)}
      <DevStateBar page="actions" items={[
        { label: '默认', q: 'tab=todos' }, { label: '倒计时面', q: 'tab=todos&deck=countdown' }, { label: '倒计时 · 空', q: 'tab=todos&deck=countdown&cc=empty' },
        { label: '倒计时 · 归档展开', q: 'tab=todos&deck=countdown&cc=archived' }, { label: '本周目标未设', q: 'tab=todos&goal=empty' }, { label: '本周目标达成', q: 'tab=todos&goal=done' },
        { label: '已领取', q: 'tab=todos&goal=claimed' }, { label: '愿望面', q: 'tab=todos&pane=wish' }, { label: '空 / 归档区空', q: 'tab=todos&state=empty' },
      ]} />
    </>
  );
}
