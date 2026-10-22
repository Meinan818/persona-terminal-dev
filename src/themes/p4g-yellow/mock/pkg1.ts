/**
 * 工作包 1 假数据：首页 / 欢迎引导 / 庆祝演出。
 * 类型全部来自真实仓库（只 import type），字段口径与 store 一致。
 * 数值规则沿用真实实现：
 *   · 等级阈值 = LEVEL_PRESETS.easy.base + ext（src/constants/index.ts）
 *   · 精通：满 10 级后每 500 点一颗星（src/utils/levels.ts#masteryOf，easy）
 *   · 称号 = DEFAULT_ATTRIBUTE_LEVEL_TITLES / MASTERY_TITLES（src/utils/attributeLevelTitles.ts）
 */
import type { Achievement, Attribute, AttributeId, CallingCard, Todo } from '@real/types';

export const ATTR_IDS: AttributeId[] = ['knowledge', 'guts', 'dexterity', 'kindness', 'charm'];

/** LEVEL_PRESETS.easy（base + ext）*/
export const LEVEL_THRESHOLDS = [0, 40, 200, 350, 500, 750, 1000, 1300, 1650, 2100];
export const MASTERY_MAX_LEVEL = 10;
export const MASTERY_STEP = 500;

export const ATTR_NAMES: Record<AttributeId, string> = { knowledge: '知识', guts: '胆量', dexterity: '灵巧', kindness: '温柔', charm: '魅力' };
export const ATTR_EN: Record<AttributeId, string> = { knowledge: 'KNOWLEDGE', guts: 'COURAGE', dexterity: 'DILIGENCE', kindness: 'UNDERSTANDING', charm: 'EXPRESSION' };

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
  const base = LEVEL_THRESHOLDS[MASTERY_MAX_LEVEL - 1];
  if (points < base) return null;
  const over = points - base;
  const stars = Math.floor(over / MASTERY_STEP);
  const into = over - stars * MASTERY_STEP;
  return { stars, step: MASTERY_STEP, toNext: MASTERY_STEP - into, progress: into / MASTERY_STEP };
};

const attr = (id: AttributeId, points: number, level: number): Attribute => ({ id, displayName: ATTR_NAMES[id], points, level, levelThresholds: LEVEL_THRESHOLDS, unlocked: true });
export const MOCK_ATTRIBUTES: Attribute[] = [
  attr('knowledge', 612, 5),
  attr('guts', 268, 3),
  attr('dexterity', 1088, 7),
  attr('kindness', 152, 2),
  attr('charm', 3240, 10), // 精通 ★2
];

const ach = (id: string, icon: string, title: string, description: string, attribute: AttributeId | undefined, unlocked: boolean, type: Achievement['condition']['type'] = 'attribute_level'): Achievement =>
  ({ id, icon, title, description, unlocked, condition: { type, value: 5, attribute } });
export const MOCK_ACHIEVEMENTS: Achievement[] = [
  ach('k1', '📚', '初窥门径', '知识达到 Lv.3', 'knowledge', true),
  ach('k2', '🎓', '学而不厌', '知识达到 Lv.5', 'knowledge', true),
  ach('k3', '🔭', '博览群书', '知识达到 Lv.8', 'knowledge', false),
  ach('g1', '🔥', '鼓起勇气', '胆量达到 Lv.3', 'guts', true),
  ach('g2', '🦁', '狮子之心', '胆量达到 Lv.6', 'guts', false),
  ach('d1', '🛠️', '熟能生巧', '灵巧达到 Lv.5', 'dexterity', true),
  ach('d2', '⚙️', '巧夺天工', '灵巧达到 Lv.8', 'dexterity', false),
  ach('c1', '✨', '众望所归', '魅力达到 Lv.10', 'charm', true),
];

const d = new Date();
const key = (dt: Date) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
export const todayKey = key(d);
const addDays = (n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return key(x); };

/** 今日任务：BIG DEAL 恒在最上，其次重要，其余按原序 */
export interface MockTodo extends Todo { _count: number; }
const todo = (p: Partial<Todo> & Pick<Todo, 'id' | 'title' | 'attribute' | 'points'>, count = 0): MockTodo =>
  ({ frequency: 'daily', isActive: true, createdAt: d, ...p, _count: count } as MockTodo);
export const MOCK_TODOS: MockTodo[] = [
  todo({ id: 'bd1', title: '期末作品集', attribute: 'dexterity', points: 20, isBigDeal: true, deadline: addDays(12), steps: [
    { id: 's1', title: '整理 12 张作品', done: true }, { id: 's2', title: '写项目说明', done: true }, { id: 's3', title: '排版封面与目录', done: false }, { id: 's4', title: '导出 PDF 投递', done: false },
  ] as unknown as Todo['steps'] }),
  todo({ id: 't1', title: '晨跑 3 公里', attribute: 'guts', points: 3, important: true, extraBoosts: [{ attribute: 'charm', points: 1 }] }),
  todo({ id: 't2', title: '读完《雾中小镇》第 4 章', attribute: 'knowledge', points: 2, fateDrawnDate: todayKey, deadline: addDays(2) }),
  todo({ id: 't3', title: '背 30 个单词', attribute: 'knowledge', points: 1, frequency: 'count', targetCount: 3 }, 1),
  todo({ id: 't4', title: '和千枝一起练拳', attribute: 'guts', points: 2, pact: { id: 'p1', partnerId: 'u2', partnerName: '千枝', kind: 'daily' } as unknown as Todo['pact'] }),
  todo({ id: 't5', title: '组织周会：雨夜调查', attribute: 'kindness', points: 2, orgOp: { orgId: 'o1', opId: 'op1', orgName: '调查队', kind: 'goal' } as unknown as Todo['orgOp'] }),
  todo({ id: 't6', title: '给家里打电话', attribute: 'kindness', points: 1 }, 1),
];
export const BIG_DEAL_STEPS = [
  { id: 's1', title: '整理 12 张作品', done: true }, { id: 's2', title: '写项目说明', done: true }, { id: 's3', title: '排版封面与目录', done: false }, { id: 's4', title: '导出 PDF 投递', done: false },
];

export const MOCK_CALLING_CARD: CallingCard = {
  id: 'cc1', title: '雾散之日 · 期末考试', targetDate: addDays(3), pinned: true, archived: false,
} as unknown as CallingCard;
export const callingCardProgress = { todosDone: 4, todosTotal: 7, overall: 57 };

/** 今日塔罗（星象入口已抽态）*/
export const MOCK_DIVINATION = { cardName: '战车', orientation: 'upright' as const, attribute: 'guts' as AttributeId, multiplier: 1.5, advice: '把今天最想推进的一件事放在上午做完，阻力会比你想象的小。' };

/** 当年今日 */
export const MOCK_ON_THIS_DAY = {
  total: 3, daysSince: 412, streakThen: 9, tarot: { name: '星星', orientation: 'reversed' as const },
  items: [
    { id: 'a1', time: '08:12', text: '雨天也去晨跑了，跑完浑身是泥', attr: 'guts' as AttributeId, pts: 3 },
    { id: 'a2', time: '14:40', text: '图书馆读完《侦探的规则》', attr: 'knowledge' as AttributeId, pts: 2 },
    { id: 'a3', time: '21:05', text: '帮邻居家的小孩修好了自行车', attr: 'dexterity' as AttributeId, pts: 2 },
  ],
};

/** 岁时：节气 + 小注（src/utils/calendar.ts 文案）*/
export const MOCK_SEASON = { name: '霜降', en: "Frost's Descent", note: '早晚添衣，霜要来了。' };

/** 首页四格统计口径 */
export const MOCK_STATS = { totalActivities: 486, uniqueDays: 203 };

export const MOCK_USER_NAME = '鸣上';
export const MOCK_PERSONA_NAME = '伊邪那岐';

/** 欢迎引导：成长风格预设（WelcomeModal PRESETS）*/
export const WELCOME_PRESETS = [
  { label: '学习成长', desc: '看重知识积累，也照顾综合成长 · 知识 胆量 灵巧 温柔 魅力', names: { knowledge: '知识', guts: '胆量', dexterity: '灵巧', kindness: '温柔', charm: '魅力' } as Record<AttributeId, string> },
  { label: '冒险勇士', desc: '喜欢挑战，认行动不认空想 · 智慧 勇气 敏捷 仁慈 威望', names: { knowledge: '智慧', guts: '勇气', dexterity: '敏捷', kindness: '仁慈', charm: '威望' } as Record<AttributeId, string> },
  { label: '自定义', desc: '从空白开始，五个名字都由你定', names: null },
];
export const WELCOME_ATTR_PLACEHOLDERS: Record<AttributeId, string> = {
  knowledge: '如：知识、智慧、学识…', guts: '如：胆量、勇气、意志…', dexterity: '如：灵巧、敏捷、技艺…', kindness: '如：温柔、仁慈、共情…', charm: '如：魅力、威望、气质…',
};
export const WELCOME_GUIDE = [
  { title: '记录今天', desc: '一句话就够。它会进你的时间线。' },
  { title: '任务', desc: '设目标、拆步骤，完成时给属性加点。' },
  { title: '记账', desc: '收支与人格指数同屏，钱和成长一起看。' },
  { title: '同伴', desc: '每张牌是一位同伴，亲密度随记录上涨。' },
  { title: '属性', desc: '五项指数由你的行为自然长出来。' },
  { title: '影时间', desc: '深夜的那一格，留给只有你能打的仗。' },
  { title: '主题', desc: '四套频道皮肤：红 / 黄 / 蓝 / 粉，随时换。' },
];
export const MOON_NAMES = ['新月', '娥眉月', '上弦月', '盈凸月', '满月', '亏凸月', '下弦月', '残月'];
/** 真实 utils/moonPhase：参考新月 2000-01-06 18:14 UTC，朔望月 29.530588 天 */
export const moonPhaseOf = (date = new Date()) => {
  const ref = Date.UTC(2000, 0, 6, 18, 14);
  const P = 29.530588;
  const days = (date.getTime() - ref) / 86400000;
  const phase = (((days % P) + P) % P) / P;
  const idx = Math.round(phase * 8) % 8;
  return { phase, name: MOON_NAMES[idx], illum: (1 - Math.cos(2 * Math.PI * phase)) / 2 };
};

/** 诊断信息（复制按钮的内容示例：只有机型/系统/各表条数）*/
export const MOCK_DIAG = 'MASKARIA diag · v2.7.1 · UA=Mobile Safari 18 · activities=486 todos=21 attributes=5 bonds=8 · bootFailures=2';
