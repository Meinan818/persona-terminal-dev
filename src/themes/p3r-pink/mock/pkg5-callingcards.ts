/** 工作包 5 · 宣告卡总览页假数据（用户追加页，真实 app 暂无）。类型 import type 自真实 CallingCard。「今天」= 2026-10-20。 */
import type { CallingCard } from '@/types';

const C = (p: Partial<CallingCard> & Pick<CallingCard, 'id' | 'title' | 'mode' | 'startDate'>): CallingCard => ({ tone: 'lines', pinned: false, archived: false, createdAt: new Date(2026, 8, 1), ...p } as CallingCard);

export const CC_TODAY = '2026-10-20';
export const CC_LINKED: Record<string, { done: number; total: number }> = { cc_p2: { done: 4, total: 6 }, cc_p3: { done: 1, total: 5 }, cc_a2: { done: 6, total: 6 } };

export const CC_CARDS: CallingCard[] = [
  C({ id: 'cc_p1', title: '年底前完成插画集', subtitle: '偷走拖延之心', mode: 'deadline', startDate: '2026-09-01', targetDate: '2026-12-31', icon: '✦', pinned: true, tone: 'lines' }),
  C({ id: 'cc_p2', title: '期末周通关', subtitle: '五门考试，一门不落', mode: 'both', startDate: '2026-10-01', targetDate: '2026-11-08', icon: '★', tone: 'grid', linkedTodoIds: ['t1', 't2', 't3', 't4', 't5', 't6'] }),
  C({ id: 'cc_p3', title: '跑完人生第一个半马', subtitle: '每一步都算数', mode: 'todos', startDate: '2026-09-20', icon: '◆', tone: 'dots', linkedTodoIds: ['t7', 't8', 't9', 't10', 't11'] }),
  C({ id: 'cc_p4', title: '樱花祭', subtitle: '和大家一起去看夜樱', mode: 'deadline', startDate: '2026-10-01', targetDate: '2026-10-24', icon: '☾', tone: 'plain' }),
  C({ id: 'cc_a1', title: '学会游泳', subtitle: '先收进档案，夏天再来', mode: 'deadline', startDate: '2026-05-01', targetDate: '2026-08-31', icon: '◈', archived: true, archivedAt: new Date(2026, 7, 20), archiveReason: 'manual' }),
  C({ id: 'cc_a2', title: '四级考试', subtitle: '一次过！', mode: 'todos', startDate: '2026-03-01', icon: '❖', archived: true, archivedAt: new Date(2026, 5, 14), archiveReason: 'auto_todos' }),
  C({ id: 'cc_e1', title: '国庆旅行攒钱', subtitle: '目标 ¥3000', mode: 'deadline', startDate: '2026-08-01', targetDate: '2026-09-30', icon: '♥', archived: true, archivedAt: new Date(2026, 8, 30), archiveReason: 'auto_date' }),
];

export const ccDaysLeft = (target?: string) => { if (!target) return null; const [y, m, d] = target.split('-').map(Number); const [ty, tm, td] = CC_TODAY.split('-').map(Number); return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(ty, tm - 1, td)) / 86400000); };
export const ccDaysTotal = (c: CallingCard) => { if (!c.targetDate) return null; const [y, m, d] = c.targetDate.split('-').map(Number); const [sy, sm, sd] = c.startDate.split('-').map(Number); return Math.max(1, Math.round((Date.UTC(y, m - 1, d) - Date.UTC(sy, sm - 1, sd)) / 86400000)); };
export const ccProgress = (c: CallingCard) => {
  if (c.mode === 'todos') { const l = CC_LINKED[c.id]; return l ? l.done / l.total : 0; }
  const tot = ccDaysTotal(c); const left = ccDaysLeft(c.targetDate);
  const dateP = tot && left != null ? Math.min(1, Math.max(0, 1 - left / tot)) : 0;
  if (c.mode === 'both') { const l = CC_LINKED[c.id]; return Math.max(dateP, l ? l.done / l.total : 0); }
  return dateP;
};
export const CC_MODE_LABEL: Record<CallingCard['mode'], string> = { deadline: '日期', todos: '任务清单', both: '兼有' };
