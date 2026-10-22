/**
 * 工作包 2（行动：记录 / 任务 / 愿望 / 大事 / 总结）假数据——改写自黄色版 src/mock/pkg2.ts（复制，不 import）。
 * 类型全部来自真实仓库（只 import type）。日期以 demo「今天」= 2026-10-20 为基准。
 */
import type { Activity, AttributeId, CallingCard, Quest, Todo, WeeklyGoal, Wish } from '@real/types';

export const TODAY = new Date(2026, 9, 20, 20, 42);
export const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const TODAY_KEY = dayKey(TODAY);
const at = (m: number, d: number, h = 9, min = 0, y = 2026) => new Date(y, m - 1, d, h, min);

/** 默认五维名（真实 store 默认 attributeNames） */
export const ATTR_IDS: AttributeId[] = ['knowledge', 'guts', 'dexterity', 'kindness', 'charm'];
export const ATTR_NAMES: Record<AttributeId, string> = { knowledge: '知识', guts: '胆量', dexterity: '灵巧', kindness: '温柔', charm: '魅力' };
/** 英文小签（P3R 风：窄斜体大写） */
export const ATTR_EN: Record<AttributeId, string> = { knowledge: 'KNOWLEDGE', guts: 'COURAGE', dexterity: 'DILIGENCE', kindness: 'UNDERSTANDING', charm: 'EXPRESSION' };

const pts = (p: Partial<Record<AttributeId, number>>) => ({ knowledge: 0, guts: 0, dexterity: 0, kindness: 0, charm: 0, ...p });
const A = (id: string, date: Date, description: string, p: Partial<Record<AttributeId, number>>, extra: Partial<Activity> = {}): Activity => ({
  id, userId: 'u1', date, description, pointsAwarded: pts(p), method: 'local', ...extra,
});

export const ACTIVITIES: Activity[] = [
  A('a1', at(10, 20, 19, 12), '在图书馆把《雾中小镇》读完了第 4 章，顺手做了笔记', { knowledge: 2 }, { weather: { icon: 'rain', text: '小雨' } }),
  A('a2', at(10, 20, 7, 40), '晨跑 3 公里，雨停了的河堤空气很好', { guts: 1, dexterity: 1 }, { method: 'todo', weather: { icon: 'cloudy', text: '阴' } }),
  A('a3', at(10, 20, 12, 30), '本周目标达成：选择「温柔」+3', { kindness: 3 }, { category: 'weekly_goal' }),
  A('a4', at(10, 19, 22, 5), '给家里打了很久的电话，听妈妈讲菜园的事', { kindness: 2 }, { important: true, weather: { icon: 'sunny', text: '晴' } }),
  A('a5', at(10, 19, 16, 20), '技能解锁：「速读」', {}, { category: 'skill_unlock' }),
  A('a6', at(10, 18, 21, 0), '和由加莉一起去吃了车站前的拉面，聊到很晚', { charm: 1, kindness: 1 }, { category: 'confidant', confidantId: 'c1' }),
  A('a7', at(10, 18, 10, 0), '完成小步：整理期中复习提纲（大事「期中考试」第 3/5 步）', { knowledge: 1 }, { category: 'bigdeal_step', bigDealId: 'bd1', method: 'todo' }),
  A('a8', at(10, 17, 23, 40), 'BIG DEAL 收官：搬家', { dexterity: 2, guts: 1 }, { category: 'bigdeal_clear', bigDealId: 'bd0' }),
  A('a9', at(10, 15, 9, 0), '补上周的：去社区帮忙发了传单', { kindness: 1 }, { backfilled: true }),
  A('a10', at(10, 14, 20, 0), '倒计时达成：「驾照科目二」', { guts: 2 }, { category: 'calling_card_clear' }),
  A('a11', at(10, 12, 18, 0), '成就解锁：「连续记录 7 天」', {}, { category: 'achievement_unlock' }),
  A('a12', at(9, 28, 15, 0), '逆影战场击破「怠惰之影」', { guts: 3 }, { category: 'shadow_defeat', method: 'battle', important: true }),
  A('a13', at(9, 3, 21, 0), '第一次自己做了番茄炖牛腩', { dexterity: 2 }),
  A('a14', at(12, 30, 22, 0, 2025), '把今年的照片整理成了一本小相册', { charm: 2 }),
];
/** 记录配图（demo 用蓝主题岁时图代替本机图片；经 seasonAsset() 取路径） */
export const ACTIVITY_IMAGES: Record<string, string[]> = {
  a1: ['bailu.webp', 'chunfen.webp'],
  a6: ['dongzhi.webp'],
  a13: ['chushu.webp', 'dashu.webp', 'daxue.webp'],
};
/** 图片抽屉「添加」时轮流取的候选图 */
export const SPARE_IMAGES = ['dahan.webp', 'festival_chunjie.webp', 'bailu.webp', 'chushu.webp'];
/** 收束卡的子步记录（隐藏的 bigdeal_step） */
export const BIGDEAL_STEP_LOG: Record<string, { title: string; date: Date }[]> = {
  bd0: [
    { title: '列出要带走的东西清单', date: at(10, 10, 20) },
    { title: '联系搬家公司比价', date: at(10, 12, 19) },
    { title: '打包书和衣服', date: at(10, 15, 22) },
    { title: '搬进去，铺好床', date: at(10, 17, 23) },
  ],
};
export const MAX_IMAGES_PER_ACTIVITY = 6;

const T = (id: string, title: string, attribute: AttributeId, points: number, extra: Partial<Todo> = {}): Todo => ({
  id, title, attribute, points, frequency: 'single', isActive: true, createdAt: at(10, 1), ...extra,
});

export const TODOS: Todo[] = [
  T('t1', '晨跑 3 公里', 'guts', 1, { frequency: 'count', targetCount: 1, repeatDaily: true, important: true, extraBoosts: [{ attribute: 'dexterity', points: 1 }] }),
  T('t2', '读完《雾中小镇》第 5 章', 'knowledge', 2, { fateDrawnDate: '2026-10-20', deadline: '2026-10-23', wishId: 'w1' }),
  T('t3', '背 30 个单词', 'knowledge', 1, { frequency: 'count', targetCount: 3, isLongTerm: false, repeatDaily: true, weekdays: [1, 3, 5] }),
  T('t4', '期中考试', 'knowledge', 1, {
    isBigDeal: true, deadline: '2026-10-24', currentState: '提纲整理好了，还差真题', steps: [
      { id: 's1', title: '把每科考纲抄一遍', done: true, doneAt: '2026-10-14', source: 'manual' },
      { id: 's2', title: '列出薄弱章节', done: true, doneAt: '2026-10-16', source: 'ai' },
      { id: 's3', title: '整理期中复习提纲', done: true, doneAt: '2026-10-18', source: 'ai' },
      { id: 's4', title: '做两套往年真题', source: 'ai' },
      { id: 's5', title: '错题过一遍', source: 'ai' },
    ],
  }),
  T('t5', '和顺平约好一起练习投篮', 'dexterity', 1, { frequency: 'count', targetCount: 1, repeatDaily: true, pact: { id: 'p1', partnerId: 'c2', partnerName: '顺平', kind: 'together' as never } }),
  T('t6', '练字 20 分钟', 'dexterity', 1, { frequency: 'count', targetCount: 10, isLongTerm: true }),
  // 未到日期 / 未启用 / 已完成
  T('t7', '去市立医院复诊', 'guts', 1, { startDate: '2026-10-28' }),
  T('t8', '周末大扫除', 'kindness', 2, { weekdays: [6], frequency: 'single' }),
  T('t9', '学吉他和弦', 'charm', 1, { isActive: false, archivedAt: at(10, 2) }),
  T('t10', '交社团报名表', 'charm', 1, { completedAt: at(10, 20, 11), archivedAt: at(10, 20, 11) }),
  T('t11', '修好自行车链条', 'dexterity', 2, { completedAt: at(10, 16, 17), archivedAt: at(10, 16, 17) }),
  T('t12', '写完读书报告', 'knowledge', 2, { completedAt: at(10, 12, 21), archivedAt: at(10, 12, 21) }),
  T('t13', '给妹妹买生日礼物', 'kindness', 1, { completedAt: at(10, 9, 15), archivedAt: at(10, 9, 15) }),
];
/** 今日进度（count / target） */
export const TODO_PROGRESS: Record<string, number> = { t1: 1, t2: 0, t3: 1, t5: 0, t6: 4 };
/** 今日已完成（可「撤销今日完成」）的 id */
export const TODAY_DONE = new Set(['t10']);

export const WISHES: Wish[] = [
  { id: 'w1', title: '一年读完 24 本书', status: 'active', source: 'manual', createdAt: at(3, 1), progressPct: 58, progressSource: 'ai', currentState: '读到第 14 本，最近慢了一点', steps: [
    { id: 'ws1', title: '这个月读完两本小说', done: true, source: 'ai' },
    { id: 'ws2', title: '办一张市立图书馆的借书证', done: true, source: 'manual' },
    { id: 'ws3', title: '每晚睡前读 20 分钟', source: 'ai' },
  ] },
  { id: 'w2', title: '考上第一志愿的大学', status: 'active', source: 'manual', createdAt: at(5, 4), progressPct: 23, progressSource: 'local', steps: [{ id: 'ws4', title: '确定目标院校和分数线', source: 'manual' }] },
  { id: 'w3', title: '学会自己做一桌年夜饭', status: 'active', source: 'manual', createdAt: at(9, 1) },
  { id: 'w4', title: '跑完一次半程马拉松', status: 'done', source: 'manual', createdAt: at(1, 4), fulfilledAt: at(9, 22), archivedAt: at(9, 22) },
  { id: 'w5', title: '把房间改成想要的样子', status: 'archived', source: 'manual', createdAt: at(2, 4), archivedAt: at(8, 2) },
];
export const WISH_TIMES: Record<string, number> = { w1: 17, w2: 4, w3: 0 };

export const WEEKLY_GOAL: WeeklyGoal = {
  id: 'wg1', weekStart: '2026-10-19', weekEnd: '2026-10-25', reward: '周六去吃车站前那家特制拉面', completed: false, createdAt: at(10, 19),
  goals: [
    { type: 'activity_count', attribute: 'knowledge', target: 6, current: 4 },
    { type: 'todo_count', target: 8, current: 8 },
    { type: 'total_points', target: 20, current: 13 },
  ] as WeeklyGoal['goals'],
};

export const CALLING_CARDS: CallingCard[] = [
  { id: 'cc1', title: '期中考试', subtitle: '命运在此倾覆', mode: 'both', targetDate: '2026-10-24', startDate: '2026-10-01', linkedTodoIds: ['t4', 't3'], tone: 'lines', icon: '✦', pinned: true, archived: false } as CallingCard,
  { id: 'cc2', title: '文化祭', mode: 'deadline', targetDate: '2026-11-15', startDate: '2026-10-10', tone: 'grid', icon: '◆', pinned: false, archived: false } as CallingCard,
  { id: 'cc3', title: '修学旅行准备', mode: 'todos', startDate: '2026-10-05', linkedTodoIds: ['t2', 't6', 't8'], tone: 'dots', icon: '❖', pinned: false, archived: false } as CallingCard,
  { id: 'cc4', title: '驾照科目二', mode: 'deadline', targetDate: '2026-10-14', startDate: '2026-09-01', tone: 'plain', icon: '★', pinned: false, archived: true, archivedAt: at(10, 14), archiveReason: 'auto_todos' } as CallingCard,
];

export const QUESTS: Quest[] = [
  { id: '2026-10-19-0', weekKey: '2026-10-19', slot: 0, templateId: 'attr_least', params: { attribute: 'charm' }, target: 3, rewardSp: 10, createdAt: '2026-10-19' },
  { id: '2026-10-19-1', weekKey: '2026-10-19', slot: 1, templateId: 'bigdeal_steps', target: 3, rewardSp: 15, createdAt: '2026-10-19', claimedAt: '2026-10-20' },
  { id: '2026-10-19-2', weekKey: '2026-10-19', slot: 2, templateId: 'record_7days', target: 7, rewardSp: 5, createdAt: '2026-10-19', autoClaimed: true },
];
export const QUEST_TITLES: Record<string, { title: string; desc: string; progress: number }> = {
  '2026-10-19-0': { title: '记 3 条「魅力」', desc: '这周最少的一维，补一补', progress: 1 },
  '2026-10-19-1': { title: '大事推进 3 步', desc: '任何一件大事都算', progress: 3 },
  '2026-10-19-2': { title: '连续记录 7 天', desc: '每天至少一条', progress: 7 },
};
export const LIFE_QUESTS = [
  { id: 'lq1', title: '去河堤散步 20 分钟', desc: '雨停了，空气是湿的', attr: 'guts' as AttributeId, ai: false },
  { id: 'lq2', title: '给很久没联系的朋友发条消息', desc: '一句「最近怎么样」就够', attr: 'kindness' as AttributeId, ai: false },
  { id: 'lq3', title: '整理一次书桌抽屉', desc: '扔掉三样用不上的东西', attr: 'dexterity' as AttributeId, ai: false },
  { id: 'lq4', title: '用十分钟写下今天最想记住的一幕', desc: 'AI 根据你这周的记录写的', attr: 'charm' as AttributeId, ai: true },
];

export const ORGS = [
  { id: 'o1', name: '月光馆探索部', left: 2 },
  { id: 'o2', name: '晨跑互助会', left: 0 },
];

export interface MockSummary { id: string; period: 'week' | 'month' | 'year'; label: string; startDate: string; endDate: string; totalPoints: number; activityCount: number; promptPresetName: string; autoWritten?: boolean; viewed?: boolean; createdAt: Date; followUps: number; body: string; deliberate?: boolean }
export const SUMMARY_BODY = `这一周，你像在雾里走路的人——看不清远处，却一步也没停。

**知识**是这周长得最快的一维：图书馆的那几个晚上，你把《雾中小镇》从第 2 章读到了第 4 章，还做了笔记。这不是突击，是习惯在成形。

**温柔**的加点几乎都来自同一件事：给家里打电话。你写「听妈妈讲菜园的事」——能把别人的日常听进去，本身就是一种力量。

需要留意的是**魅力**：这周只有一条相关记录。下周不妨主动约一次人，哪怕只是一起吃顿饭。

最后想问你：这周哪一件事，是你原本以为自己做不到的？`;
export const SUMMARIES: MockSummary[] = [
  { id: 'sm1', period: 'week', label: '10月第3周', startDate: '2026-10-12', endDate: '2026-10-18', totalPoints: 24, activityCount: 11, promptPresetName: '温柔馆长', autoWritten: true, viewed: false, createdAt: at(10, 19, 8), followUps: 1, body: SUMMARY_BODY },
  { id: 'sm2', period: 'month', label: '9月', startDate: '2026-09-01', endDate: '2026-09-30', totalPoints: 86, activityCount: 42, promptPresetName: '严格教练', viewed: true, createdAt: at(10, 1, 9), followUps: 0, body: SUMMARY_BODY, deliberate: true },
  { id: 'sm3', period: 'year', label: '2025 年度总结', startDate: '2025-01-01', endDate: '2025-12-31', totalPoints: 612, activityCount: 388, promptPresetName: '温柔馆长', viewed: true, createdAt: at(1, 2, 10), followUps: 3, body: SUMMARY_BODY },
];
export const SUMMARY_PRESETS = ['温柔馆长', '严格教练', '老友闲谈', '诗意日记'];

export const DANMAKU = [
  '我也熬过来了，你可以的', '今天也辛苦了', '慢慢来，比较快', '雾总会散的', '一步一步，已经很棒了',
  '加油！同样在路上', '别忘了吃饭', '你比昨天更近了', '明天也一起努力吧', '真相就在前面',
];

export const SCHEDULE_ITEMS = [
  { title: '高数', weekdays: [1, 3], time: '08:00-09:40', on: true },
  { title: '大学英语', weekdays: [2, 4], time: '10:00-11:40', on: true },
  { title: '体育（篮球）', weekdays: [5], time: '14:00-15:40', on: true },
  { title: '社团例会', weekdays: [], time: '', on: false },
];

export const KEYWORD_RESULT: Record<AttributeId, number> = { knowledge: 2, guts: 0, dexterity: 0, kindness: 1, charm: 0 };
