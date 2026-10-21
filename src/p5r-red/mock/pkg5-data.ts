/**
 * pkg5 假数据（记录 / 宣告卡 / 统计 / 成就 / 技能）。字段名对齐真实 types（Activity / CallingCard / Achievement / Skill）。
 * 只给 pkg5 页面与弹层用；可变部分请在组件里 useState(() => structuredClone(...))。
 */
import type { AttrId } from './data';
import { D } from './data';

const now = new Date();
const at = (dayOff: number, h: number, m: number) => { const d = new Date(now); d.setDate(d.getDate() + dayOff); d.setHours(h, m, 0, 0); return d.toISOString(); };
const key = (dayOff: number) => { const d = new Date(now); d.setDate(d.getDate() + dayOff); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
export const localKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Activity：method = local（手动记录）| todo（任务完成）| battle（战斗奖励）；category 见 Activities.tsx accentKey */
export interface MockActivity {
  id: string; date: string; description: string; pointsAwarded: Partial<Record<AttrId, number>>;
  method: 'local' | 'todo' | 'battle'; category?: 'achievement_unlock' | 'skill_unlock' | 'calling_card_clear' | 'weekly_goal' | 'confidant' | 'shadow_defeat';
  important?: boolean; backfilled?: boolean; levelUps?: { attribute: AttrId; fromLevel: number; toLevel: number }[]; images?: number; weather?: string;
}
export const ACTIVITIES: MockActivity[] = [
  { id: 'r1', date: at(0, 21, 12), description: '图书馆自习三小时，把线代第四章刷完', pointsAwarded: { knowledge: 3 }, method: 'local', important: true, images: 2, weather: '☁' },
  { id: 'r2', date: at(0, 18, 40), description: '晨跑 5 公里', pointsAwarded: { guts: 2 }, method: 'todo' },
  { id: 'r3', date: at(0, 18, 41), description: '成就解锁：七日不辍', pointsAwarded: {}, method: 'local', category: 'achievement_unlock' },
  { id: 'r4', date: at(-1, 20, 5), description: '帮室友搬家', pointsAwarded: { kindness: 2 }, method: 'local', levelUps: [{ attribute: 'kindness', fromLevel: 3, toLevel: 4 }] },
  { id: 'r5', date: at(-1, 12, 30), description: '做了一道新菜：番茄牛腩', pointsAwarded: { dexterity: 2 }, method: 'local', images: 1 },
  { id: 'r6', date: at(-2, 22, 10), description: '击破第 12 层 · 守门之影', pointsAwarded: { guts: 3 }, method: 'battle', category: 'shadow_defeat', important: true },
  { id: 'r7', date: at(-2, 15, 0), description: '参加社团面试', pointsAwarded: { charm: 3, guts: 1 }, method: 'local', backfilled: true },
  { id: 'r8', date: at(-4, 9, 20), description: '技能解锁：博闻强识', pointsAwarded: {}, method: 'local', category: 'skill_unlock' },
  { id: 'r9', date: at(-6, 23, 0), description: '倒计时达成：四级考试', pointsAwarded: { knowledge: 5 }, method: 'local', category: 'calling_card_clear' },
];

export const METHOD_FILTER_OPTIONS = [
  { key: 'all', label: '全部' }, { key: 'local', label: '手动记录' }, { key: 'todo', label: '任务完成' }, { key: 'battle', label: '战斗奖励' },
  { key: 'achievement', label: '成就解锁' }, { key: 'skill', label: '技能解锁' },
] as const;
export type MethodFilter = typeof METHOD_FILTER_OPTIONS[number]['key'];

/** 宣告卡（CallingCard）：archiveReason = auto_todos（达成）| auto_date（时之至）| manual（已收） */
export interface MockCC { id: string; title: string; subtitle?: string; icon: string; texture: 'lines' | 'grid' | 'dots' | 'plain'; mode: 'deadline' | 'todos' | 'both'; startDate: string; targetDate: string; pinned?: boolean; todosDone?: number; todosTotal?: number; archived?: boolean; archiveReason?: 'auto_todos' | 'auto_date' | 'manual' }
export const CALLING_CARDS: MockCC[] = [
  { id: 'cc1', title: D.callingCards[0].title, subtitle: '偷走懒惰之心', icon: '🔥', texture: 'lines', mode: 'deadline', startDate: key(-5), targetDate: key(12), pinned: true },
  { id: 'cc2', title: D.callingCards[1].title, subtitle: '让胆量发出预告', icon: '⚔️', texture: 'dots', mode: 'both', startDate: key(-20), targetDate: key(40), todosDone: 6, todosTotal: 14 },
  { id: 'cc3', title: '雅思 7 分', icon: '🎯', texture: 'grid', mode: 'todos', startDate: key(-30), targetDate: key(60), todosDone: 2, todosTotal: 5 },
];
export const CALLING_ARCHIVED: MockCC[] = [
  { id: 'cc9', title: '四级考试', subtitle: '命运在此倾覆', icon: '✦', texture: 'lines', mode: 'deadline', startDate: key(-40), targetDate: key(-6), archived: true, archiveReason: 'auto_date' },
];
export const ccDaysLeft = (k: string) => Math.max(0, Math.round((+new Date(k + 'T00:00:00') - +new Date(new Date().toDateString())) / 864e5));
export const ccTotal = (c: MockCC) => Math.max(1, Math.round((+new Date(c.targetDate) - +new Date(c.startDate)) / 864e5));
export const ccPct = (c: MockCC) => c.mode === 'todos' || (c.mode === 'both' && c.todosTotal)
  ? Math.round(((c.todosDone ?? 0) / (c.todosTotal || 1)) * 100)
  : Math.round(Math.min(1, (ccTotal(c) - ccDaysLeft(c.targetDate)) / ccTotal(c)) * 100);

/** 关联任务候选（CallingCardEditor 每页 4 个，上限 TODOS_MAX=7） */
export const CC_TODOS: { id: string; title: string; kind: '每日' | '长期' | '单次' }[] = [
  { id: 't1', title: '晨跑 5 公里', kind: '每日' }, { id: 't2', title: '读完《人间失格》第三章', kind: '每日' }, { id: 't3', title: '给妈妈打电话', kind: '每日' },
  { id: 't4', title: '练习吉他 30 分钟', kind: '长期' }, { id: 't5', title: '整理房间', kind: '单次' }, { id: 't6', title: '背 50 个单词', kind: '每日' }, { id: 't7', title: '准备雅思 7 分', kind: '长期' },
];

/** 成就（Achievement）：condition.type = total_points | consecutive_days | attribute_level | keyword_match | todo_completions */
export type CondType = 'total_points' | 'consecutive_days' | 'attribute_level' | 'keyword_match' | 'todo_completions';
export const COND_LABEL: Record<CondType, string> = { total_points: '总点数', consecutive_days: '连续天数', attribute_level: '属性等级', keyword_match: '关键字匹配', todo_completions: '完成任务次数' };
export interface MockAch { id: string; icon: string; letter: string; title: string; description: string; condition: { type: CondType; value: number; attribute?: AttrId; keywords?: string[] }; progress: number; unlocked: boolean; unlockedDate?: string; hidden?: boolean }
export const ACHIEVEMENTS: MockAch[] = [
  { id: 'a_k3', icon: '📖', letter: 'K', title: '知识的门槛', description: '知识达到 Lv.3', condition: { type: 'attribute_level', value: 3, attribute: 'knowledge' }, progress: 3, unlocked: true, unlockedDate: key(-12) },
  { id: 'a_7d', icon: '🔥', letter: 'S', title: '七日不辍', description: '连续 7 天记录', condition: { type: 'consecutive_days', value: 7 }, progress: 7, unlocked: true, unlockedDate: key(0) },
  { id: 'a_50', icon: '✅', letter: 'A', title: '行动派', description: '完成任务 50 次', condition: { type: 'todo_completions', value: 50 }, progress: 50, unlocked: true, unlockedDate: key(-3) },
  { id: 'a_t4', icon: '❤️', letter: 'T', title: '温柔的人', description: '温柔达到 Lv.4', condition: { type: 'attribute_level', value: 4, attribute: 'kindness' }, progress: 4, unlocked: true, unlockedDate: key(-1) },
  { id: 'a_100', icon: '💯', letter: 'C', title: '百点俱乐部', description: '总点数达到 100', condition: { type: 'total_points', value: 100 }, progress: 174, unlocked: false },
  { id: 'a_g5', icon: '🦁', letter: 'G', title: '狮子之心', description: '胆量达到 Lv.5', condition: { type: 'attribute_level', value: 5, attribute: 'guts' }, progress: 2, unlocked: false },
  { id: 'custom_book', icon: '📚', letter: 'R', title: '书虫', description: '和书有关的记录 10 次', condition: { type: 'keyword_match', value: 10, keywords: ['阅读', '看书'] }, progress: 4, unlocked: false },
  { id: 'a_hidden', icon: '❔', letter: 'M', title: '万人迷', description: '魅力达到 Lv.5', condition: { type: 'attribute_level', value: 5, attribute: 'charm' }, progress: 1, unlocked: false, hidden: true },
];

/** 技能（Skill）：custom_ 前缀 = 自定义（可编辑 / 删除）；blessing_ = 赐福 */
export interface MockSkill { id: string; name: string; description: string; requiredAttribute: AttrId; requiredLevel: number; bonusMultiplier: number; unlocked: boolean }
export const skillEffect = (a: AttrId, mult: number, names: Record<AttrId, { name: string }>) => `${names[a].name}积累额外提升 ${Math.round((mult - 1) * 100)}%`;
export const SKILLS: MockSkill[] = [
  { id: 's_k2', name: '博闻强识', description: '知识积累额外提升 20%', requiredAttribute: 'knowledge', requiredLevel: 2, bonusMultiplier: 1.2, unlocked: true },
  { id: 's_k3', name: '专注之力', description: '知识积累额外提升 50%', requiredAttribute: 'knowledge', requiredLevel: 3, bonusMultiplier: 1.5, unlocked: false },
  { id: 'custom_k5', name: '真理之眼', description: '知识积累额外提升 80%', requiredAttribute: 'knowledge', requiredLevel: 5, bonusMultiplier: 1.8, unlocked: false },
  { id: 's_g2', name: '铁胆', description: '胆量积累额外提升 20%', requiredAttribute: 'guts', requiredLevel: 2, bonusMultiplier: 1.2, unlocked: true },
  { id: 's_d2', name: '巧手', description: '灵巧积累额外提升 20%', requiredAttribute: 'dexterity', requiredLevel: 2, bonusMultiplier: 1.2, unlocked: true },
  { id: 'custom_t3', name: '春风化雨', description: '温柔积累额外提升 30%', requiredAttribute: 'kindness', requiredLevel: 3, bonusMultiplier: 1.3, unlocked: false },
];
export const SKILL_BONUS_MULT_CAP = 3;
