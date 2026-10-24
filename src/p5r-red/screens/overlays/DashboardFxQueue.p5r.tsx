/**
 * 首页真实演出队列（FIXLIST 四「需特别处理」末条 / 黄色 FX-AUDIT 第 12 条）单播：首页勾完成任务后按真实顺序接
 * 今日完成 TodoCompleteP5（带解锁提示）→ 属性升级 LevelUpP5（或精通 ★）→ 成就 / 技能解锁 UnlockCutInP5；前一段关闭后 260ms 接下一段。
 *   ?variant=default（晨跑 → 胆量 Lv.3 → 成就「野生之心」）| mastery（给妈妈打电话 → 温柔 ★2 → 技能「博闻强识」）| plain（只有今日完成）
 * 首页内真实触发：#/p/dashboard 任意打勾（或 ?fxq=1|mastery|plain 自动勾第一项）。
 */
import type { OverlayProps } from '@/p5r-red/registry/types';
import { D } from '@/p5r-red/mock/data';
import { homeQueue } from '@/p5r-red/screens/pages/DashboardP5.p5r';
import { playQueue, useCutIn } from './cutins.p5r';

export default function DashboardFxQueue({ open, onClose, params }: OverlayProps) {
  const v = params?.get('variant') ?? 'default';
  const fallback = { id: 'demo-todo', title: '示例任务', attribute: 'guts' as const, points: 2, frequency: 'single' as const, repeatDaily: false, important: false, count: 0, target: 1 };
  const t = (v === 'mastery' ? D.todos.find((x) => x.id === 't3') : v === 'plain' ? D.todos.find((x) => x.id === 't5') : D.todos[0]) ?? fallback;
  useCutIn(open, (done) => playQueue(homeQueue(t, v === 'default' ? '1' : v), done), onClose);
  return null;
}
