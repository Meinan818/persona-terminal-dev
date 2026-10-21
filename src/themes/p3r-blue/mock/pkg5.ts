/**
 * 工作包 5 假数据：记账 / 菜单 / 成就图鉴 / 账号。
 * 类型全部 `import type` 自真实仓库；常量（类目、渠道、来源、资产类目、状态预设、成就/技能）逐字抄自真实
 * src/utils/ledgerFormat.ts、src/constants/index.ts、src/constants/profileStatus.ts。
 * 「今天」固定为 2026-10-20（改写自黄色版 mock/pkg5.ts，粉版：类目改单字形，禁彩色 emoji）（与项目简报一致），截图稳定。
 */
import type { LedgerEntry, LedgerExpenseType, LedgerAsset, Achievement, Skill, Attribute, AttributeId, User, ThemeType } from '@/types';

export const P5_TODAY = '2026-10-20';
export const CNY = '¥';

// ── 记账常量（ledgerFormat.ts）──────────────────────────────
export const CATEGORY_META: Record<LedgerExpenseType, { icon: string; label: string; color: string }> = {
  food: { icon: '食', label: '餐饮', color: 'var(--p3r-blue)' },
  transport: { icon: '行', label: '交通', color: 'var(--p3r-cyan)' },
  shopping: { icon: '购', label: '购物', color: 'var(--p3r-magenta)' },
  fun: { icon: '娱', label: '娱乐', color: 'var(--p3r-blue-deep)' },
  home: { icon: '住', label: '居住', color: 'var(--p3r-gold)' },
  study: { icon: '学', label: '提升', color: 'var(--p3r-mint)' },
  other: { icon: '他', label: '其它', color: 'var(--p3r-grey)' },
};
export const CATEGORY_KEYS: LedgerExpenseType[] = ['food', 'transport', 'shopping', 'fun', 'home', 'study', 'other'];
export const catMeta = (t?: LedgerExpenseType) => CATEGORY_META[t ?? 'other'] ?? CATEGORY_META.other;
export const isGrowthCategory = (t?: LedgerExpenseType) => t === 'study';
export const INCOME_META = { labor: { label: '劳动所得' }, other: { label: '其它收入' } } as const;
export const DEFAULT_CHANNELS = ['支付宝', '微信', '现金', '银行卡', '信用卡'];
export const DEFAULT_INCOME_SOURCES = ['工资', '兼职', '投资理财', '红包', '报销', '退款'];
const LABOR_SOURCE_RE = /工资|薪|兼职|劳务|奖金|提成|外快|加班/;
export const incomeTypeFromSource = (src?: string): 'labor' | 'other' => (src && LABOR_SOURCE_RE.test(src) ? 'labor' : 'other');
export const isDebtAccount = (name: string): boolean => /信用|花呗|白条|借呗|分期|贷/.test(name);

export const ASSET_CATEGORIES: { key: string; icon: string; label: string }[] = [
  { key: 'digital', icon: '机', label: '数码' }, { key: 'computer', icon: '电', label: '电脑' }, { key: 'camera', icon: '影', label: '影像' },
  { key: 'instrument', icon: '琴', label: '乐器' }, { key: 'audio', icon: '音', label: '音频' }, { key: 'game', icon: '游', label: '游戏' },
  { key: 'transport', icon: '行', label: '出行' }, { key: 'home', icon: '家', label: '家居' }, { key: 'wearable', icon: '表', label: '穿戴' },
  { key: 'book', icon: '书', label: '书籍' }, { key: 'sport', icon: '动', label: '运动' }, { key: 'other', icon: '他', label: '其它' },
];
export const ASSET_STATUS: Record<'inuse' | 'idle' | 'soldout', { label: string }> = { inuse: { label: '在用' }, idle: { label: '闲置' }, soldout: { label: '已出' } };
export const assetCat = (k: string) => ASSET_CATEGORIES.find((c) => c.key === k) ?? ASSET_CATEGORIES[ASSET_CATEGORIES.length - 1];
export const assetTotal = (a: LedgerAsset) => a.price + (a.addOns ?? []).reduce((s, o) => s + o.amount, 0);

// ── 金额格式（ledgerFormat.ts 同口径）────────────────────────
export function fmtMoney(n: number): string {
  const v = Math.abs(n);
  return Number.isInteger(v) ? v.toLocaleString('en-US') : v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
export const fmtSigned = (n: number, $ = CNY) => `${n < 0 ? '−' : ''}${$}${fmtMoney(n)}`;
export const fmtPlain = (n: number) => String(Math.round(n * 100) / 100);
export const roundMoney = (n: number) => Math.round(n * 100) / 100;
export const sanitizeMoneyInput = (v: string, opts?: { allowNegative?: boolean }) => {
  let s = v.replace(opts?.allowNegative ? /[^\d.-]/g : /[^\d.]/g, '');
  const neg = opts?.allowNegative && s.startsWith('-');
  s = s.replace(/-/g, '');
  const [a, ...b] = s.split('.');
  s = b.length ? `${a}.${b.join('').slice(0, 2)}` : a;
  return (neg ? '-' : '') + s;
};
export const moneyFromInput = (v: string) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? roundMoney(n) : 0; };
export const monthLabel = (ym: string) => `${ym.slice(0, 4)}年${Number(ym.slice(5, 7))}月`;
export const shiftMonth = (ym: string, d: number) => { const [y, m] = ym.split('-').map(Number); const t = new Date(y, m - 1 + d, 1); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}`; };
const WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
export const weekdayCN = (dk: string) => { const [y, m, d] = dk.split('-').map(Number); return WEEK[new Date(y, m - 1, d).getDay()]; };
export const ledgerDateLabel = (dk: string) => (dk === P5_TODAY ? '今天' : dk === '2026-10-19' ? '昨天' : `${Number(dk.slice(5, 7))}月${Number(dk.slice(8, 10))}日`);
export const daysAgoKey = (n: number) => { const d = new Date(2026, 9, 20 - n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

// ── 流水 ──────────────────────────────────────────────────
let seq = 0;
const E = (p: Partial<LedgerEntry> & Pick<LedgerEntry, 'direction' | 'amount' | 'date'>): LedgerEntry => ({
  id: `le_${++seq}`, currency: 'CNY', source: 'manual', createdAt: new Date(2026, 9, 1, 8, seq), ...p,
});
export const LEDGER_ENTRIES: LedgerEntry[] = [
  E({ direction: 'expense', amount: 28, date: '2026-10-20', type: 'food', note: '咖啡 + 可颂', channel: '微信', category: '早餐' }),
  E({ direction: 'expense', amount: 6, date: '2026-10-20', type: 'transport', channel: '支付宝', note: '地铁' }),
  E({ direction: 'expense', amount: 68.5, date: '2026-10-19', type: 'food', note: '和朋友吃铁板烧', channel: '信用卡', evalWorth: 'worth' }),
  E({ direction: 'expense', amount: 129, date: '2026-10-19', type: 'study', note: '《设计中的设计》', channel: '支付宝', attribute: 'knowledge' }),
  E({ direction: 'income', amount: 800, date: '2026-10-18', incomeType: 'labor', category: '兼职', channel: '银行卡', note: '周末插画稿费' }),
  E({ direction: 'expense', amount: 45, date: '2026-10-18', type: 'fun', note: '电影票', channel: '微信' }),
  E({ direction: 'expense', amount: 2399, date: '2026-10-15', type: 'shopping', note: '降噪耳机', channel: '信用卡', assetId: 'as_2' }),
  E({ direction: 'expense', amount: 1800, date: '2026-10-10', type: 'home', note: '房租（半月）', channel: '银行卡' }),
  E({ direction: 'income', amount: 6500, date: '2026-10-08', incomeType: 'labor', category: '工资', channel: '银行卡' }),
  E({ direction: 'adjust', amount: -32.4, date: '2026-10-05', channel: '支付宝', note: '余额对账' }),
  E({ direction: 'expense', amount: 36, date: '2026-10-03', type: 'food', note: '外卖', channel: '支付宝' }),
  E({ direction: 'expense', amount: 88, date: '2026-09-28', type: 'fun', note: 'Live House', channel: '微信' }),
  E({ direction: 'expense', amount: 230, date: '2026-09-20', type: 'shopping', note: '秋装外套', channel: '支付宝' }),
  E({ direction: 'income', amount: 6500, date: '2026-09-08', incomeType: 'labor', category: '工资', channel: '银行卡' }),
];

export const LEDGER_ASSETS: LedgerAsset[] = [
  { id: 'as_1', name: '索尼相机 A7C', category: 'camera', price: 9800, purchaseDate: '2025-04-12', status: 'inuse', addOns: [{ name: '35mm 定焦镜头', amount: 1599 }, { name: '相机包', amount: 189 }], createdAt: new Date(2025, 3, 12) },
  { id: 'as_2', name: '降噪耳机', category: 'audio', price: 2399, purchaseDate: '2026-10-15', status: 'inuse', linkedEntryId: 'le_7', createdAt: new Date(2026, 9, 15) },
  { id: 'as_3', name: '电钢琴', category: 'instrument', price: 3200, purchaseDate: '2024-11-02', status: 'idle', createdAt: new Date(2024, 10, 2) },
  { id: 'as_4', name: '旧款平板', category: 'digital', price: 2600, purchaseDate: '2022-06-18', status: 'soldout', addOns: [{ name: '手机壳', amount: 59 }], createdAt: new Date(2022, 5, 18) },
];

export interface P5Account { name: string; balance: number; isDebt: boolean; unassigned: boolean }
export const LEDGER_ACCOUNTS: P5Account[] = [
  { name: '支付宝', balance: 2316.6, isDebt: false, unassigned: false },
  { name: '微信', balance: 488, isDebt: false, unassigned: false },
  { name: '银行卡', balance: 9820, isDebt: false, unassigned: false },
  { name: '信用卡', balance: -2467.5, isDebt: true, unassigned: false },
  { name: '未分配', balance: 120, isDebt: false, unassigned: true },
];

export const LEDGER_BUDGET = { monthlyLimit: 6000, savingsGoal: 500, savingsGoalEdits: 1, carriedFrom: '2026-09' as string | undefined };
export const LEDGER_SAVINGS = 1260;
export const LEDGER_RESET_DAY = 1;

// ── 用户 / 属性 ────────────────────────────────────────────
export const ATTR_IDS: AttributeId[] = ['knowledge', 'guts', 'dexterity', 'kindness', 'charm'];
export const ATTR_NAMES: Record<AttributeId, string> = { knowledge: '知识', guts: '胆量', dexterity: '灵巧', kindness: '温柔', charm: '魅力' };
const th = [0, 16, 40, 80, 140, 220, 320];
export const ATTRIBUTES: Attribute[] = [
  { id: 'knowledge', displayName: '知识', points: 168, level: 4, levelThresholds: th, unlocked: true },
  { id: 'guts', displayName: '胆量', points: 92, level: 3, levelThresholds: th, unlocked: true },
  { id: 'dexterity', displayName: '灵巧', points: 236, level: 5, levelThresholds: th, unlocked: true },
  { id: 'kindness', displayName: '温柔', points: 54, level: 2, levelThresholds: th, unlocked: true },
  { id: 'charm', displayName: '魅力', points: 120, level: 3, levelThresholds: th, unlocked: true },
];
export const TOTAL_LEVEL = ATTRIBUTES.reduce((s, a) => s + a.level, 0);
export const TOTAL_POINTS = ATTRIBUTES.reduce((s, a) => s + a.points, 0);
export const USER: User = { id: 'u_1', name: '结城理', createdAt: new Date(2025, 3, 11), theme: 'blue' as ThemeType };
export const CURRENT_STREAK = 12;
export const CLOUD_USER = { email: 'minato.yuki@gekkoukan.jp', username: 'minato_velvet' };

export const THEME_SWATCHES: { value: ThemeType; label: string; color?: string }[] = [
  { value: 'blue', label: '蓝', color: '#3B82F6' },
  { value: 'yellow', label: '黄', color: '#F59E0B' },
  { value: 'red', label: '红', color: '#EF3043' },
  // 蓝主题色板：蓝主题禁粉 → 用墨色 + 「粉」字示意（演示不渲染粉色像素）
  { value: 'pink', label: '粉', color: 'var(--p3r-ink-soft)' },
  { value: 'custom', label: '自定义' },
];

export const STATUS_PRESETS = [
  { id: 'focus', emoji: '◎', label: '专注中' }, { id: 'study', emoji: '学', label: '在学习' }, { id: 'work', emoji: '工', label: '加班中' },
  { id: 'sprint', emoji: '冲', label: '冲刺冲' }, { id: 'create', emoji: '创', label: '在创作' }, { id: 'read', emoji: '读', label: '在读书' },
  { id: 'run', emoji: '缓', label: '别急' }, { id: 'travel', emoji: '途', label: '在路上' }, { id: 'cook', emoji: '厨', label: '在做饭' },
  { id: 'music', emoji: '♪', label: '听歌中' }, { id: 'game', emoji: '游', label: '打游戏' }, { id: 'movie', emoji: '番', label: '看番' },
  { id: 'coffee', emoji: '摸', label: '摸鱼中' }, { id: 'happy', emoji: '✦', label: '元气满满' }, { id: 'calm', emoji: '☾', label: '想静静' },
  { id: 'heal', emoji: '慢', label: '慢慢来' }, { id: 'lowbat', emoji: '电', label: '电量不足' }, { id: 'rest', emoji: '休', label: '休息中' },
  { id: 'sleepy', emoji: '眠', label: '似了' },
];
export const CALLING_CARDS = [
  { id: 'cc_1', icon: '画', title: '年底前完成插画集', pct: 62 },
  { id: 'cc_2', icon: '跑', title: '跑完人生第一个半马', pct: 35 },
  { id: 'cc_3', icon: '书', title: '读完 24 本书', pct: 80 },
];

// ── 成就 / 技能（constants/index.ts 节选 + 自定义）──────────────
const A = (id: string, title: string, description: string, icon: string, condition: Achievement['condition'], unlocked = false, unlockedDate?: Date): Achievement => ({ id, title, description, icon, condition, unlocked, unlockedDate });
export const ACHIEVEMENTS: Achievement[] = [
  A('streak_7', '坚持不懈', '连续7天记录行为', '炎', { type: 'consecutive_days', value: 7 }, true, new Date(2026, 4, 2)),
  A('todo_10', '任务达人', '完成10次任务', '✓', { type: 'todo_completions', value: 10 }),
  A('points_100', '百分成长', '累计获得100点', '百', { type: 'total_points', value: 100 }, true, new Date(2026, 5, 18)),
  A('knowledge_3', '知识学者', '知识达到3级', '知', { type: 'attribute_level', value: 3, attribute: 'knowledge' }, true, new Date(2026, 6, 9)),
  A('knowledge_5', '知识大师', '知识达到5级', '博', { type: 'attribute_level', value: 5, attribute: 'knowledge' }),
  A('guts_3', '勇敢之心', '胆量达到3级', '勇', { type: 'attribute_level', value: 3, attribute: 'guts' }),
  A('guts_5', '无畏战士', '胆量达到5级', '狮', { type: 'attribute_level', value: 5, attribute: 'guts' }),
  A('dexterity_3', '灵巧之手', '灵巧达到3级', '巧', { type: 'attribute_level', value: 3, attribute: 'dexterity' }, true, new Date(2026, 7, 1)),
  A('dexterity_5', '巧夺天工', '灵巧达到5级', '匠', { type: 'attribute_level', value: 5, attribute: 'dexterity' }),
  A('kindness_3', '温柔之心', '温柔达到3级', '柔', { type: 'attribute_level', value: 3, attribute: 'kindness' }),
  A('charm_3', '魅力四射', '魅力达到3级', '魅', { type: 'attribute_level', value: 3, attribute: 'charm' }),
  A('weekly_planner', '计划通', '完成8次每周目标', '计', { type: 'weekly_goal_completions', value: 8 }),
  A('hidden_moon', '月下无瑕', '隐藏成就', '月', { type: 'battle_feat', value: 1 }),
  A('custom_read', '书虫', '记录里出现「阅读」30 次', '虫', { type: 'keyword_match', value: 30, keywords: ['阅读', '读书'], currentProgress: 18 }),
];
/** 隐藏成就（未解锁时卡面只露问号） */
export const HIDDEN_IDS = new Set(['hidden_moon']);
/** 终极 / 隐藏成就不给编辑 */
export const SEALED_IDS = new Set(['hidden_moon']);
export const achievementProgress: Record<string, number> = {
  streak_7: 7, todo_10: 6, points_100: 100, knowledge_3: 3, knowledge_5: 4, guts_3: 3, guts_5: 3, dexterity_3: 3, dexterity_5: 5,
  kindness_3: 2, charm_3: 3, weekly_planner: 3, hidden_moon: 0, custom_read: 18,
};

const S = (id: string, name: string, attr: AttributeId, lv: number, mult: number, unlocked = false): Skill => ({ id, name, description: `${ATTR_NAMES[attr]}积累额外提升 ${Math.round((mult - 1) * 100)}%`, requiredAttribute: attr, requiredLevel: lv, bonusMultiplier: mult, unlocked });
export const SKILLS: Skill[] = [
  S('sk_k3', '速读', 'knowledge', 3, 1.2, true), S('sk_k5', '深度学习', 'knowledge', 5, 1.3),
  S('sk_g3', '钢铁意志', 'guts', 3, 1.2), S('sk_g5', '无所畏惧', 'guts', 5, 1.1),
  S('sk_d3', '灵巧手指', 'dexterity', 3, 1.2, true), S('sk_d5', '工匠大师', 'dexterity', 5, 1.1),
  S('sk_i3', '同理心', 'kindness', 3, 1.2), S('sk_c3', '超凡魅力', 'charm', 3, 1.2, true), S('sk_c5', '明星气质', 'charm', 5, 1.1),
  { id: 'blessing_igor', name: '馆长的赐福', description: '魅力积累额外提升 10%', requiredAttribute: 'charm', requiredLevel: 1, bonusMultiplier: 1.1, unlocked: true },
  S('custom_sk_sketch', '速写本能', 'dexterity', 4, 1.5, true),
];
export const SKILL_BONUS_MULT_CAP = 3;
export const LEVEL_MAX = 10;

// ── 图鉴：塔罗收录 ────────────────────────────────────────────
export interface P5TarotSide { count: number; first?: string }
export const TAROT_COLLECTED: Record<string, { upright: P5TarotSide; reversed: P5TarotSide }> = {
  fool: { upright: { count: 3, first: '2026-03-02' }, reversed: { count: 1, first: '2026-05-11' } },
  magician: { upright: { count: 2, first: '2026-04-01' }, reversed: { count: 0 } },
  high_priestess: { upright: { count: 0 }, reversed: { count: 2, first: '2026-06-20' } },
  empress: { upright: { count: 1, first: '2026-07-14' }, reversed: { count: 0 } },
  chariot: { upright: { count: 4, first: '2026-02-18' }, reversed: { count: 1, first: '2026-08-03' } },
  strength: { upright: { count: 1, first: '2026-09-09' }, reversed: { count: 0 } },
  hermit: { upright: { count: 0 }, reversed: { count: 1, first: '2026-10-02' } },
  star: { upright: { count: 2, first: '2026-08-28' }, reversed: { count: 0 } },
  moon: { upright: { count: 1, first: '2026-09-25' }, reversed: { count: 1, first: '2026-10-11' } },
  sun: { upright: { count: 2, first: '2026-06-01' }, reversed: { count: 0 } },
  world: { upright: { count: 1, first: '2026-10-19' }, reversed: { count: 0 } },
  wands_1: { upright: { count: 1, first: '2026-05-05' }, reversed: { count: 0 } },
  wands_8: { upright: { count: 0 }, reversed: { count: 1, first: '2026-07-07' } },
  cups_2: { upright: { count: 2, first: '2026-02-14' }, reversed: { count: 0 } },
  cups_10: { upright: { count: 1, first: '2026-09-25' }, reversed: { count: 0 } },
  swords_3: { upright: { count: 0 }, reversed: { count: 1, first: '2026-04-19' } },
  swords_14: { upright: { count: 1, first: '2026-08-12' }, reversed: { count: 0 } },
  pentacles_9: { upright: { count: 1, first: '2026-10-08' }, reversed: { count: 1, first: '2026-10-15' } },
};
/** 已收录的岁时印（mark.key 的日期部分） */
export const SEASON_COLLECTED: Record<string, string> = {
  '2026-01-01': '2026-01-01', '2026-02-04': '2026-02-04', '2026-02-14': '2026-02-14', '2026-02-17': '2026-02-17', '2026-03-20': '2026-03-20',
  '2026-04-05': '2026-04-05', '2026-05-01': '2026-05-01', '2026-06-21': '2026-06-21', '2026-08-07': '2026-08-07', '2026-09-23': '2026-09-23',
  '2026-09-25': '2026-09-25', '2026-10-01': '2026-10-01', '2026-10-08': '2026-10-08', '2026-10-18': '2026-10-18',
  '2025-12-22': '2025-12-22', '2025-12-25': '2025-12-25',
};
export const SEASON_EXTRAS = [
  { id: 'st_m1', kind: 'moon', name: '秋分满月', date: '2026-09-26' },
  { id: 'st_q1', kind: 'quest', name: '雨夜委托', date: '2026-10-12' },
  { id: 'st_r1', kind: 'raid', name: '满月团战 · 第一层', date: '2026-10-25' },
];

// ── 心相结算假数据 ─────────────────────────────────────────────
export const SETTLE_REFLECTION = '这个月你把钱花在了**让自己变得更好**的地方：一本书、一副耳机、一场和朋友的晚饭。餐饮依旧是最大的一块，但比上月收敛了不少。';
export const SETTLE_ADVICE = ['耳机这种大件已经登记为资产，下个月记得给它加上「附加费用」。', '周末的外卖是日均超标的主因，试试周六自己做一顿。', '省钱挑战还差 ¥120，月底前少喝两杯咖啡就够了。'];
