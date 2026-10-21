/**
 * 工作包 1 假数据：首页（DashboardP3）/ 欢迎引导 / 成长庆祝 / 启动。
 * 口径改写自黄色版 src/mock/pkg1.ts（只读参考），数值规则同真实实现：
 *   · 等级阈值 = LEVEL_PRESETS.easy（src/constants/index.ts）；精通：满 10 级后每 500 点一颗星（utils/levels#masteryOf）
 *   · 称号 = DEFAULT_ATTRIBUTE_LEVEL_TITLES / MASTERY_TITLES（utils/attributeLevelTitles.ts）
 *   · 问候副题池 / 时段 = DashboardP3 SUBTEXTS / getSlot
 * 类型只 import type。
 */
import type { AttributeId } from '@/types';

export const ATTR_IDS: AttributeId[] = ['knowledge', 'guts', 'dexterity', 'kindness', 'charm'];
export const LEVEL_THRESHOLDS = [0, 40, 200, 350, 500, 750, 1000, 1300, 1650, 2100];
export const MAX_LEVEL = 10;
export const MASTERY_STEP = 500;

export const ATTR_NAMES: Record<AttributeId, string> = { knowledge: '知识', guts: '胆量', dexterity: '灵巧', kindness: '温柔', charm: '魅力' };

export const LEVEL_TITLES: Record<AttributeId, string[]> = {
  knowledge: ['蒙昧初开', '略有所知', '渐入学理', '博闻强识', '真知灼见', '洞察万象', '智识如海', '通晓万法', '星海智者', '全知之眼'],
  guts: ['畏首畏尾', '勉强应战', '临危不乱', '勇往直前', '无畏之心', '铁胆英魂', '逆境不折', '破局之勇', '王道胆魄', '无惧无畏'],
  dexterity: ['手忙脚乱', '稍具准头', '心手相应', '巧思灵动', '精准无误', '妙手天成', '神乎其技', '千变万化', '匠心巅峰', '天工之手'],
  kindness: ['冷眼旁观', '懂得体谅', '温言相待', '暖意渐深', '慈心如灯', '守护之心', '春风化雨', '万物可亲', '圣者慈悲', '普照群心'],
  charm: ['平平无奇', '略有好感', '引人注目', '风度初成', '光彩照人', '迷人气场', '众望所归', '万众倾心', '星辰魅影', '王者风华'],
};
export const MASTERY_TITLES: Record<AttributeId, string[]> = {
  knowledge: ['学海无涯', '穷理尽性', '博古通今', '智照寰宇', '万象归一'],
  guts: ['百战不殆', '虽千万人', '孤军亦进', '天不能拘', '无畏之极'],
  dexterity: ['游刃有余', '出神入化', '巧夺天工', '万物皆器', '心手合一'],
  kindness: ['润物无声', '海纳百川', '慈悲为怀', '光照四方', '万心归暖'],
  charm: ['光芒万丈', '倾城之姿', '众星拱月', '风华绝代', '万世流芳'],
};
export const levelTitle = (id: AttributeId, lv: number) => LEVEL_TITLES[id][Math.max(0, Math.min(9, lv - 1))];
export const masteryTitle = (id: AttributeId, stars: number) => {
  const l = MASTERY_TITLES[id];
  if (stars <= 0) return l[0];
  return stars <= l.length ? l[stars - 1] : `${l[l.length - 1]} ★${stars}`;
};
export const masteryOf = (points: number) => {
  const base = LEVEL_THRESHOLDS[MAX_LEVEL - 1];
  if (points < base) return null;
  const over = points - base;
  const stars = Math.floor(over / MASTERY_STEP);
  const into = over - stars * MASTERY_STEP;
  return { stars, step: MASTERY_STEP, toNext: MASTERY_STEP - into, progress: into / MASTERY_STEP };
};

export interface MockAttr { id: AttributeId; name: string; points: number; level: number }
export const MOCK_ATTRS: MockAttr[] = [
  { id: 'knowledge', name: '知识', points: 612, level: 5 },
  { id: 'guts', name: '胆量', points: 268, level: 3 },
  { id: 'dexterity', name: '灵巧', points: 1088, level: 7 },
  { id: 'kindness', name: '温柔', points: 152, level: 2 },
  { id: 'charm', name: '魅力', points: 3240, level: 10 }, // 精通 ★2
];

export interface MockAch { id: string; icon: string; title: string; description: string; attribute?: AttributeId; unlocked: boolean }
export const MOCK_ACHIEVEMENTS: MockAch[] = [
  { id: 'k1', icon: '✎', title: '初窥门径', description: '知识达到 Lv.3', attribute: 'knowledge', unlocked: true },
  { id: 'k2', icon: '❖', title: '学而不厌', description: '知识达到 Lv.5', attribute: 'knowledge', unlocked: true },
  { id: 'k3', icon: '✦', title: '博览群书', description: '知识达到 Lv.8', attribute: 'knowledge', unlocked: false },
  { id: 'g1', icon: '♠', title: '鼓起勇气', description: '胆量达到 Lv.3', attribute: 'guts', unlocked: true },
  { id: 'g2', icon: '♛', title: '狮子之心', description: '胆量达到 Lv.6', attribute: 'guts', unlocked: false },
  { id: 'd1', icon: '⚒', title: '熟能生巧', description: '灵巧达到 Lv.5', attribute: 'dexterity', unlocked: true },
  { id: 'd2', icon: '⚙', title: '巧夺天工', description: '灵巧达到 Lv.8', attribute: 'dexterity', unlocked: false },
  { id: 'c1', icon: '★', title: '众望所归', description: '魅力达到 Lv.10', attribute: 'charm', unlocked: true },
  { id: 'all', icon: '♕', title: '全知全能', description: '五项属性全部满级', unlocked: false },
];
// kindness 没有专属成就 → 详情里显示「这个方向还没有专属成就」（只剩全属性那条也算关联：真实 filter 含 all_attributes_max）
export const relatedAchievements = (id: AttributeId) => MOCK_ACHIEVEMENTS.filter((a) => a.attribute === id || a.id === 'all');

const now = new Date();
const keyOf = (dt: Date) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
export const todayKey = keyOf(now);
const addDays = (n: number) => { const x = new Date(now); x.setDate(x.getDate() + n); return keyOf(x); };
export const daysUntil = (key: string) => Math.round((new Date(key + 'T00:00:00').getTime() - new Date(todayKey + 'T00:00:00').getTime()) / 86400000);

export interface MockStep { id: string; title: string; done: boolean }
export interface MockTodo {
  id: string; title: string; attribute: AttributeId; points: number;
  important?: boolean; fateDrawn?: boolean; isBigDeal?: boolean; deadline?: string; steps?: MockStep[];
  frequency?: 'daily' | 'count'; target: number; count: number;
  extraBoosts?: { attribute: AttributeId; points: number }[];
  pact?: { partner: string }; orgOp?: { org: string; kind: 'goal' | 'raid' };
  unlocks?: boolean;
}
export const MOCK_TODOS: MockTodo[] = [
  { id: 'bd1', title: '期末作品集', attribute: 'dexterity', points: 20, isBigDeal: true, deadline: addDays(12), target: 1, count: 0, steps: [
    { id: 's1', title: '整理 12 张作品', done: true }, { id: 's2', title: '写项目说明', done: true }, { id: 's3', title: '排版封面与目录', done: false }, { id: 's4', title: '导出 PDF 投递', done: false },
  ] },
  { id: 't1', title: '晨跑 3 公里', attribute: 'guts', points: 3, important: true, target: 1, count: 0, extraBoosts: [{ attribute: 'charm', points: 1 }] },
  { id: 't2', title: '读完《月光下的图书馆》第 4 章', attribute: 'knowledge', points: 2, fateDrawn: true, deadline: addDays(2), target: 1, count: 0, unlocks: true },
  { id: 't3', title: '背 30 个单词', attribute: 'knowledge', points: 1, frequency: 'count', target: 3, count: 1 },
  { id: 't4', title: '和由香里一起练剑道', attribute: 'guts', points: 2, target: 1, count: 0, pact: { partner: '由香里' } },
  { id: 't5', title: '社团周会：深夜巡逻', attribute: 'kindness', points: 2, target: 1, count: 0, orgOp: { org: '特别课外活动部', kind: 'goal' } },
  { id: 't6', title: '给家里打电话', attribute: 'kindness', points: 1, target: 1, count: 1 },
];
export const BIG_DEAL_EMPTY: MockTodo = { id: 'bd0', title: '搬去新宿舍', attribute: 'kindness', points: 10, isBigDeal: true, target: 1, count: 0, steps: [] };
export const BIG_DEAL_DONE: MockTodo = { id: 'bd2', title: '期末作品集', attribute: 'dexterity', points: 20, isBigDeal: true, deadline: addDays(0), target: 1, count: 0, steps: [
  { id: 's1', title: '整理 12 张作品', done: true }, { id: 's2', title: '写项目说明', done: true }, { id: 's3', title: '排版封面与目录', done: true }, { id: 's4', title: '导出 PDF 投递', done: true },
] };

export interface MockCallingCard { id: string; title: string; subtitle?: string; targetDate?: string }
export const MOCK_CALLING_CARD: MockCallingCard = { id: 'cc1', title: '满月之夜 · 期末考试', subtitle: '全科 80 分以上，然后去看海', targetDate: addDays(3) };
export const MOCK_CALLING_CARD_FAR: MockCallingCard = { id: 'cc2', title: '六月 · 第一次个人展', subtitle: '把这一年画过的都挂出来', targetDate: addDays(42) };
export const MOCK_UNPINNED_COUNT = 2;

export interface MockDivination { name: string; orientation: 'upright' | 'reversed'; attribute: AttributeId; multiplier: number; advice?: string }
export const MOCK_DIVINATION: MockDivination = { name: '战车', orientation: 'upright', attribute: 'guts', multiplier: 1.5, advice: '把最想推进的事放在上午' };

export const MOCK_COUNTERCURRENT: AttributeId[] = ['kindness', 'guts'];
export const MOCK_DECAYED: AttributeId[] = ['kindness', 'guts'];

export const MOCK_ON_THIS_DAY = {
  date: (() => { const x = new Date(now); x.setFullYear(x.getFullYear() - 1); return x; })(),
  total: 3, daysSince: 412, streakThen: 9,
  tarot: { name: '星星', orientation: 'reversed' as const },
  items: [
    { id: 'a1', time: '08:12', text: '雨天也去晨跑了，跑完浑身是泥', important: true, pts: [{ attr: 'guts' as AttributeId, n: 3 }] },
    { id: 'a2', time: '14:40', text: '图书馆读完《侦探的规则》，最后一章猜中了凶手', pts: [{ attr: 'knowledge' as AttributeId, n: 2 }] },
    { id: 'a3', time: '21:05', text: '帮宿舍楼下的小孩修好了自行车链条', pts: [{ attr: 'dexterity' as AttributeId, n: 2 }, { attr: 'kindness' as AttributeId, n: 1 }] },
  ],
};
export const onThisDayLabel = (d: Date) => `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日 · 星期${'日一二三四五六'[d.getDay()]}`;
export const onThisDaySub = () => { const first = MOCK_ON_THIS_DAY.items[0].text; return `记了 ${MOCK_ON_THIS_DAY.total} 条 · ${first.length > 18 ? first.slice(0, 18) + '…' : first}`; };

/** 岁时（utils/calendar seasonMarkOf 口径：节气 + 小注）*/
export const MOCK_SEASON = { name: '霜降', note: '草木黄落，蛰虫咸俯——早晚添衣。', file: 'shuangjiang.webp' };

export const MOCK_STATS = { totalActivities: 486, uniqueDays: 203 };
export const MOCK_USER_NAME = '汐见';
export const MOCK_PERSONA_NAME = '奥菲斯';

/** DashboardP3 SUBTEXTS + getSlot（同源） */
export const SUBTEXTS: Record<string, string[]> = {
  dawn: ['新的一天，从现在开始', '破晓时分，充满希望', '清晨最是宝贵的时光', '早起的鸟儿有虫吃'],
  morning: ['上午阳光正好，继续加油', '来杯茶，开始高效的上午', '今天的努力从这里出发', '专注一件事，今天就够了'],
  noon: ['记得好好吃饭休息', '午休一会儿，下午更清醒', '日正当中，能量满格', '犒劳一下自己吧'],
  afternoon: ['喝杯水，起来活动一下', '下午适合深度学习', '放首歌，找回状态', '离目标又近了一步'],
  dusk: ['今天的努力都算数', '收获感悟的黄金时刻', '傍晚散个步，清空思绪', '夕阳下的你格外有魅力'],
  evening: ['享受宁静的夜晚时光', '记录今天的收获吧', '夜晚适合沉淀与反思', '适当放松，明天更精彩'],
  night: ['注意休息，明天继续', '夜深了，给自己点掌声', '深夜努力的人终会发光', '好好睡一觉，明天见'],
};
export const slotOf = (h: number) => (h >= 5 && h < 9 ? 'dawn' : h < 12 && h >= 9 ? 'morning' : h >= 12 && h < 14 ? 'noon' : h >= 14 && h < 17 ? 'afternoon' : h >= 17 && h < 19 ? 'dusk' : h >= 19 && h < 22 ? 'evening' : 'night');

/** 真实 utils/moonPhase：参考新月 2000-01-06 18:14 UTC，朔望月 29.530588 天 */
export const MOON_NAMES = ['新月', '娥眉月', '上弦月', '盈凸月', '满月', '亏凸月', '下弦月', '残月'];
export const moonPhaseOf = (date = new Date()) => {
  const ref = Date.UTC(2000, 0, 6, 18, 14);
  const P = 29.530588;
  const days = (date.getTime() - ref) / 86400000;
  const phase = (((days % P) + P) % P) / P;
  const idx = Math.round(phase * 8) % 8;
  const illum = (1 - Math.cos(2 * Math.PI * phase)) / 2;
  return { phase, name: MOON_NAMES[idx], illum, full: idx === 4 };
};
export const MOCK_WEATHER = { temp: 19, text: '多云', feelsLike: 17 };

/** 欢迎引导（WelcomeModal 同源文案） */
export const WELCOME_PRESETS = [
  { label: '学习成长', desc: '看重知识积累，也照顾综合成长 · 知识 胆量 灵巧 温柔 魅力', names: { knowledge: '知识', guts: '胆量', dexterity: '灵巧', kindness: '温柔', charm: '魅力' } as Record<AttributeId, string> },
  { label: '冒险勇士', desc: '喜欢挑战，认行动不认空想 · 智慧 勇气 敏捷 仁慈 威望', names: { knowledge: '智慧', guts: '勇气', dexterity: '敏捷', kindness: '仁慈', charm: '威望' } as Record<AttributeId, string> },
  { label: '自定义', desc: '从空白开始，五个名字都由你定', names: { knowledge: '', guts: '', dexterity: '', kindness: '', charm: '' } as Record<AttributeId, string> },
];
export const WELCOME_ATTR_PLACEHOLDERS: Record<AttributeId, string> = {
  knowledge: '如：知识、智慧、学识…', guts: '如：胆量、勇气、意志…', dexterity: '如：灵巧、敏捷、技艺…', kindness: '如：温柔、仁慈、共情…', charm: '如：魅力、威望、气质…',
};
export const SEVEN_THINGS = [
  { title: '记录今天', desc: '一句话就够。它会进你的时间线。' },
  { title: '任务', desc: '设目标、拆步骤，完成时给属性加点。' },
  { title: '记账', desc: '收支与人格指数同屏，钱和成长一起看。' },
  { title: '同伴', desc: '每张牌是一位同伴，亲密度随记录上涨。' },
  { title: '属性', desc: '五项指数由你的行为自然长出来。' },
  { title: '影时间', desc: '深夜的那一格，留给只有你能打的仗。' },
  { title: '主题', desc: '四套频道皮肤：红 / 黄 / 蓝 / 粉，随时换。' },
];

/** 诊断信息（collectBootDiagnostics 只含机型 / 系统 / 各表条数） */
export const MOCK_DIAG = { app: 'MASKARIA', version: '2.7.1', ua: 'Mobile Safari 18', tables: { activities: 486, todos: 21, attributes: 5, bonds: 8 }, bootFailures: 2 };
export const MOCK_CRASH = { message: "Cannot read properties of undefined (reading 'level')", stack: "TypeError: Cannot read properties of undefined (reading 'level')\n    at StarChartP3 (StarChartP3.tsx:142:31)\n    at renderWithHooks (react-dom.development.js:16305:18)\n    at DashboardP3 (DashboardP3.tsx:612:9)" };

/** 庆祝演出默认数据 */
export const MOCK_LEVELUP = { attr: '知识', level: 6 };
export const MOCK_ACH_UNLOCK = { title: '学而不厌', lines: ['恭喜你达成新成就！', '继续努力解锁更多内容'] as [string, string] };
export const MOCK_SKILL_UNLOCK = { name: '月光速读' };
export const MOCK_TODO_DONE = { title: '读完《月光下的图书馆》第 4 章' };
