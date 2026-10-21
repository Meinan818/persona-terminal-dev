/**
 * P6 工作包假数据：设置 / 助手 / 同步 / 全局基座。类型只 import type 自真实仓库。
 */
import type { AttributeId, KeywordRule, NavigatorPreset, NotifContentType, NotifSlot, SummaryPromptPreset, ThemeType, LedgerExpenseType, LedgerIncomeType } from '@/types';

export const ATTRS: { id: AttributeId; icon: string; defaultLabel: string; en: string }[] = [
  { id: 'knowledge', icon: '📘', defaultLabel: '知识', en: 'KNOWLEDGE' },
  { id: 'guts', icon: '🔥', defaultLabel: '胆量', en: 'COURAGE' },
  { id: 'dexterity', icon: '🎯', defaultLabel: '灵巧', en: 'DILIGENCE' },
  { id: 'kindness', icon: '🌿', defaultLabel: '温柔', en: 'UNDERSTANDING' },
  { id: 'charm', icon: '✨', defaultLabel: '魅力', en: 'EXPRESSION' },
];
export const attrName = (id: AttributeId) => ATTRS.find((a) => a.id === id)?.defaultLabel ?? id;

/** 真实 Settings.tsx themes */
export const THEMES: { value: ThemeType; label: string; color: string }[] = [
  { value: 'blue', label: '蓝色', color: 'var(--p4g-cyan)' },
  { value: 'yellow', label: '黄色', color: 'var(--p4g-yellow)' },
  { value: 'red', label: '红色', color: 'var(--p4g-red)' },
  { value: 'pink', label: '粉色', color: 'var(--p4g-purple)' },
  { value: 'custom', label: '自定义', color: 'var(--p4g-black)' },
];

export const SPLASH_STYLES = [
  { value: 'velvet', label: 'MASKARIA', sub: 'MASKARIA', icon: '🌌' },
  { value: 'p5', label: '红黑剪报风', sub: 'Phantom Thief', icon: '🃏' },
  { value: 'p3', label: '深夜月光录', sub: 'Memento Mori', icon: '🕐' },
  { value: 'p4', label: '黄色警戒线', sub: 'Midnight Channel', icon: '📺' },
] as const;

export const BG_ANIMS = [
  { value: 'aurora', label: '极光', desc: '柔和色块漂移' },
  { value: 'particles', label: '粒子', desc: '浮尘缓慢上升' },
  { value: 'wave', label: '渐变波', desc: '流动色彩背景' },
  { value: 'pulse', label: '脉冲', desc: '网格线呼吸' },
];

export interface BgmTrack { id: string; name: string; size: number }
export const BGM_TRACKS: BgmTrack[] = [
  { id: 't1', name: 'Your Affection (Reincarnation)', size: 6_420_000 },
  { id: 't2', name: 'Heartbeat, Heartbreak', size: 5_180_000 },
  { id: 't3', name: 'Signs of Love', size: 4_870_000 },
];
export const BGM_MAX_TRACKS = 20;
export const BGM_THEME_LABEL: [ThemeType, string][] = [['blue', '蓝'], ['yellow', '黄'], ['red', '红'], ['pink', '粉'], ['custom', '自定义']];

/** AI 提供商（真实 utils/aiProviders.ts） */
export const PROVIDERS = [
  { id: 'openai', label: 'OpenAI', defaultModel: 'gpt-6-luna', keyUrl: 'https://platform.openai.com/api-keys' },
  { id: 'deepseek', label: 'DeepSeek', defaultModel: 'deepseek-flash', keyUrl: 'https://platform.deepseek.com/api_keys' },
  { id: 'kimi', label: 'Kimi', defaultModel: 'kimi-k3', keyUrl: 'https://platform.moonshot.cn/console/api-keys' },
  { id: 'qwen', label: '千问', defaultModel: 'qwen-plus', keyUrl: 'https://bailian.console.aliyun.com/' },
  { id: 'gemini', label: 'Gemini', defaultModel: 'gemini-3.5-flash-lite', keyUrl: 'https://aistudio.google.com/apikey' },
  { id: 'minimax', label: 'MiniMax', defaultModel: 'MiniMax-M3', keyUrl: 'https://platform.minimaxi.com/' },
  { id: 'custom', label: '自定义', defaultModel: '', keyUrl: '' },
] as const;
export type ProviderId = (typeof PROVIDERS)[number]['id'];
export const CUSTOM_PRESETS = [
  { id: 'siliconflow', name: '硅基流动', protocol: 'openai', hint: '国内可直连，开源模型多（DeepSeek / Qwen / GLM…）' },
  { id: 'ark', name: '火山方舟', protocol: 'openai', hint: '豆包等；模型名填方舟里的模型 ID 或接入点 ID' },
  { id: 'zhipu', name: '智谱', protocol: 'openai', hint: 'GLM 系列' },
  { id: 'openrouter', name: 'OpenRouter', protocol: 'openai', hint: '一个 Key 用各家模型（国内网络可能不稳）' },
  { id: 'anthropic', name: 'Anthropic', protocol: 'anthropic', hint: '官方 Claude（Anthropic 协议）' },
  { id: 'relay', name: '中转站', protocol: 'openai', hint: '填中转站给的地址（一般以 /v1 结尾）；它若只给 Anthropic 格式的地址，协议选 Anthropic' },
] as const;

export interface ModelEntry { id: string; family?: string; vision?: boolean; audio?: boolean; chat?: boolean }
export const MODEL_CATALOG: Record<string, ModelEntry[]> = {
  deepseek: [
    { id: 'deepseek-flash', chat: true, vision: true },
    { id: 'deepseek-reasoner-v4', chat: true },
    { id: 'deepseek-chat', chat: true },
  ],
  qwen: [
    { id: 'qwen-plus', family: 'Qwen 系', chat: true },
    { id: 'qwen-max-latest', family: 'Qwen 系', chat: true },
    { id: 'qwen-vl-plus', family: 'Qwen 系', chat: true, vision: true },
    { id: 'qwen3-asr-flash', family: 'Qwen 系', audio: true },
    { id: 'deepseek-r1', family: 'DeepSeek 系', chat: true },
    { id: 'kimi-k2-instruct', family: 'Kimi 系', chat: true },
    { id: 'text-embedding-v4', family: 'Qwen 系' },
  ],
  openai: [],
};
export const AGGREGATORS = new Set(['qwen']);

/** AI 总结：熟悉的人 + 风格 */
export const SUMMARY_PERSONAS = [
  { id: 'elizabeth', icon: '🦋', name: '蓝蝶', desc: '好奇探索，郑重记录' },
  { id: 'theodore', icon: '🌿', name: '青侍', desc: '恭谨诚挚，深情服侍' },
  { id: 'margaret', icon: '📖', name: '典藏', desc: '典雅沉思，潜能鉴证' },
  { id: 'caroline-justine', icon: '⚔️', name: '双子审官', desc: '急峻与冷静，双声问讯' },
];
export const SUMMARY_PRESETS: SummaryPromptPreset[] = [
  { id: 'warm', name: '温暖陪伴', systemPrompt: '你是一位温柔的记录者，用第二人称回顾这一期的成长……', isBuiltin: true },
  { id: 'coach', name: '严格教练', systemPrompt: '你是一位直率的教练，指出这一期最该改进的三件事……', isBuiltin: true },
  { id: 'c1', name: '自定义风格', systemPrompt: '' },
];

/** 等级 */
export const LEVEL_PRESETS = { easy: [0, 20, 60, 120, 200], hard: [0, 40, 120, 260, 450] };
export const DEFAULT_LEVEL_TITLES: Record<AttributeId, string[]> = {
  knowledge: ['初识门径', '博闻强记', '学贯东西', '通晓万物', '全知全能', '洞若观火', '无所不知', '天人之学', '大道至简', '万象归一'],
  guts: ['略有胆识', '临危不乱', '勇往直前', '胆大包天', '无畏之心', '狮子之心', '豪气干云', '英雄气概', '一往无前', '雄心万丈'],
  dexterity: ['手脚灵活', '心灵手巧', '游刃有余', '巧夺天工', '神乎其技', '出神入化', '炉火纯青', '妙手天成', '登峰造极', '鬼斧神工'],
  kindness: ['心存善意', '体贴入微', '温润如玉', '宽厚仁慈', '慈悲为怀', '春风化雨', '海纳百川', '润物无声', '大爱无疆', '菩萨心肠'],
  charm: ['小有魅力', '引人注目', '风度翩翩', '光彩照人', '倾国倾城', '万众瞩目', '风华绝代', '众星捧月', '魅力无边', '天下无双'],
};
export const SUGGESTED_LEVEL_TITLES: Record<AttributeId, string[]> = {
  knowledge: ['翻书少年', '图书馆常客', '小镇学霸', '八十稻羽智囊', '全知之眼'],
  guts: ['敢说一句', '雨夜不怕', '电视里也敢', '直面阴影', '真实之勇'],
  dexterity: ['手忙脚乱', '打工熟手', '钓鱼高手', '手作达人', '万能工匠'],
  kindness: ['懂得倾听', '照顾小菜菜', '镇上的好人', '众人依靠', '包容万物'],
  charm: ['有点帅气', '小有名气', '校园焦点', '舞台主角', '传说之人'],
};
export const NAME_MATCH = {
  achievements: [
    { id: 'a1', attr: 'knowledge' as AttributeId, title: '初次求知', description: '第一次为知识加点', suggest: '翻开第一页' },
    { id: 'a2', attr: 'guts' as AttributeId, title: '小小勇气', description: '胆量累计 10 点', suggest: '雨夜出门' },
    { id: 'a3', attr: 'charm' as AttributeId, title: '初露锋芒', description: '魅力累计 10 点', suggest: '镜子前的微笑' },
  ],
  skills: [
    { id: 's1', attr: 'knowledge' as AttributeId, name: '速读', requiredLevel: 2, description: '记录时自动识别书名', suggest: '一目十行' },
    { id: 's2', attr: 'guts' as AttributeId, name: '临场发挥', requiredLevel: 3, description: '演讲类任务额外 +1', suggest: '电视台出镜' },
  ],
};

export const KEYWORD_RULES: KeywordRule[] = [
  { attribute: 'knowledge', points: 1, keywords: ['读书', '学习', '课程'] },
  { attribute: 'guts', points: 1, keywords: ['演讲', '跑步'] },
  { attribute: 'dexterity', points: 1, keywords: ['做饭', '手工', '打工'] },
  { attribute: 'kindness', points: 1, keywords: ['照顾', '陪伴'] },
  { attribute: 'charm', points: 1, keywords: [] },
];

/** 助手人格 */
const d = new Date('2026-10-01T09:00:00');
export const PERSONAS: (NavigatorPreset & { modified?: boolean })[] = [
  { id: 'builtin-cat', name: '黑猫', avatar: 'cat', personaPrompt: '你是「黑猫」——自称吾辈的黑猫，嘴硬心软，嫌麻烦却总会帮你把事情记好。', isBuiltin: true, createdAt: d },
  { id: 'builtin-toaster', name: '烤面包机', avatar: 'toaster', personaPrompt: '你是「烤面包机」——一台认真执行陪伴与记录支援任务的家用机体，说话像系统播报。', isBuiltin: true, createdAt: d, modified: true },
  { id: 'builtin-bear', name: '熊', avatar: 'bear', personaPrompt: '你是「熊」——元气满满的帅熊，句尾爱加「熊」，最怕冷场和雾天。', isBuiltin: true, createdAt: d },
  { id: 'c-glove', name: '白手套', avatar: 'star', personaPrompt: '你是「白手套」——一丝不苟的管家，礼貌又带一点点腹黑，会提醒主人的每个约定。', isBuiltin: false, createdAt: d },
];
export const GLYPH_PATHS: Record<string, string> = {
  cat: 'M4.5 9.5 3 3.5l5 3.2a7.6 7.6 0 0 1 8 0l5-3.2-1.5 6a8.4 8.4 0 0 1 1.5 4.9c0 4.6-3.9 7.6-9 7.6s-9-3-9-7.6c0-1.8.55-3.5 1.5-4.9Z',
  toaster: 'M4 10a8 8 0 0 1 16 0v7a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-7Zm4-1.5h8a1 1 0 0 0 0-2H8a1 1 0 0 0 0 2ZM7.5 14a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm9 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z',
  bear: 'M6.5 3.5a3 3 0 0 1 2.9 2.2 8.4 8.4 0 0 1 5.2 0 3 3 0 1 1 4.1 3.6A8.3 8.3 0 0 1 20 13c0 4.4-3.6 7.5-8 7.5S4 17.4 4 13c0-1.3.3-2.6.9-3.7A3 3 0 0 1 6.5 3.5Z',
  butterfly: 'M12 6c1.5-3 5.5-4 7.5-2s1 6-2 7.5c3 1.5 4 5.5 2 7.5s-6 1-7.5-2c-1.5 3-5.5 4-7.5 2s-1-6 2-7.5C3.5 10 2.5 6 4.5 4s6-1 7.5 2Z',
  star: 'M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9L12 2.5Z',
};
export const TONE_WORDS = ['温柔', '毒舌', '元气', '冷淡', '正经', '幽默', '腹黑', '天然'];

/** 通知 */
export const NOTIF_CONTENTS: { id: NotifContentType; icon: string; label: string; hint: string }[] = [
  { id: 'tarot', icon: '🔮', label: '今日塔罗', hint: '今天还没抽塔罗时提醒' },
  { id: 'todos', icon: '✅', label: '今日待办', hint: '仍有未完成的每日待办时提醒' },
  { id: 'countercurrent', icon: '🌊', label: '逆流预警', hint: '有属性明日将逆流扣减时提醒' },
  { id: 'summary', icon: '✨', label: '成长总结', hint: '新的周报 / 月报写好时提醒一次' },
  { id: 'record', icon: '📝', label: '提醒记录', hint: '今天还没有任何记录时提醒' },
  { id: 'together', icon: '🤝', label: '一起进步', hint: '约好的事今天还没完成时提醒；好友催你、发来邀请也会尽快告诉你' },
  { id: 'quests', icon: '📜', label: '委托板', hint: '每周一委托刷新时提醒一次（委托板解锁后才会有）' },
  { id: 'meeting', icon: '🗓️', label: '据点会议', hint: '周日提醒给这周打分、写下周目标（加入组织后才会有；默认不开）' },
];
export const NOTIF_SLOTS: NotifSlot[] = [
  { id: 'n1', time: '08:30', enabled: true, label: '晨间序曲', contents: ['tarot', 'todos'] },
  { id: 'n2', time: '21:30', enabled: true, label: '夜间结算', contents: ['record', 'countercurrent', 'summary'] },
];

/** 助手对话 */
export type ChatRole = 'cat' | 'user' | 'card' | 'divider' | 'time' | 'image';
export interface ChatMsg { id: string; role: ChatRole; text?: string; draftKind?: DraftKind; lines?: string[]; status?: 'pending' | 'done' | 'cancelled' | 'failed'; receipt?: string; image?: string }
export type DraftKind = 'activity' | 'todo' | 'ledger' | 'completeTodo' | 'editTodo' | 'bigdeal';
export const ACTION_META: Record<DraftKind, { label: string; icon: string; en: string }> = {
  activity: { label: '记录活动', icon: '✍️', en: 'LOG' },
  todo: { label: '添加待办', icon: '📌', en: 'QUEST' },
  ledger: { label: '记账', icon: '💰', en: 'YEN' },
  completeTodo: { label: '完成任务', icon: '✅', en: 'CLEAR' },
  editTodo: { label: '修改待办', icon: '✏️', en: 'EDIT' },
  bigdeal: { label: '拆一件大事', icon: '◆', en: 'BIG DEAL' },
};
export const CHAT_SEED: ChatMsg[] = [
  { id: 'm0', role: 'divider' },
  { id: 'm1', role: 'time', text: '昨天 22:14' },
  { id: 'm2', role: 'cat', text: '吾辈记下了。今天的雾有点重，早点睡。' },
  { id: 'm3', role: 'time', text: '今天 19:02' },
  { id: 'm4', role: 'user', text: '下午在图书馆看了两小时书，还帮菜菜子做了手工' },
  { id: 'm5', role: 'cat', text: '哼，还算勤快。吾辈替你整理成一条记录，确认一下？' },
  { id: 'm6', role: 'card', draftKind: 'activity', status: 'pending', lines: ['「图书馆看书两小时 + 帮菜菜子做手工」', '加点：知识 +2 · 温柔 +1'] },
  { id: 'm7', role: 'user', text: '咖啡 18 块' },
  { id: 'm8', role: 'card', draftKind: 'ledger', status: 'done', lines: ['支出 ¥18（🍜 餐饮）', '备注：咖啡', '渠道：微信'], receipt: '记下了：餐饮 ¥18。本月还能花 ¥1,240。' },
  { id: 'm9', role: 'card', draftKind: 'todo', status: 'cancelled', lines: ['「周五前交读书报告」', '知识 +2 · 单次完成'] },
];
export const CHAT_CARD_DEMO: ChatMsg[] = [
  { id: 'c1', role: 'card', draftKind: 'completeTodo', status: 'pending', lines: ['把「晨跑 3 公里」标记为完成', '完成加点与反馈按任务设置发放'] },
  { id: 'c2', role: 'card', draftKind: 'editTodo', status: 'pending', lines: ['修改「背单词」', '奖励 知识 +1 → 知识 +2', '截止 → 2026-10-25'] },
  { id: 'c3', role: 'card', draftKind: 'bigdeal', status: 'pending', lines: ['「搬家」 · BIG DEAL', '1. 列出要带走的东西', '2. 订搬家公司', '3. 打包书和衣服', '…共 5 步', '胆量 每步 +2 · 截止 2026-11-01 · 全成有收官奖励'] },
  { id: 'c4', role: 'card', draftKind: 'todo', status: 'failed', lines: ['「给堂岛叔叔打电话」', '温柔 +1 · 单次完成'], receipt: '没记上：本地数据库正忙，稍后再试一次。' },
];
export const PICKER_TODOS = [
  { id: 'p1', title: '晨跑 3 公里', attribute: 'guts' as AttributeId, points: 2, repeatDaily: true },
  { id: 'p2', title: '背 30 个单词', attribute: 'knowledge' as AttributeId, points: 1, repeatDaily: true },
  { id: 'p3', title: '给菜菜子买生日礼物', attribute: 'kindness' as AttributeId, points: 3, repeatDaily: false },
];

/** 记账类目（真实 utils/ledgerFormat.ts） */
export const CATEGORY_META: Record<LedgerExpenseType, { icon: string; label: string }> = {
  food: { icon: '🍜', label: '餐饮' }, transport: { icon: '🚇', label: '交通' }, shopping: { icon: '🛍️', label: '购物' },
  fun: { icon: '🎮', label: '娱乐' }, home: { icon: '🏠', label: '居住' }, study: { icon: '📚', label: '提升' }, other: { icon: '📦', label: '其它' },
};
export const INCOME_META: Record<LedgerIncomeType, { label: string }> = { labor: { label: '劳动所得' }, other: { label: '其它收入' } };

/** 记事本 */
export const NOTEBOOK = {
  profile: '喜欢在雨天看书，最近在准备一场面试；嘴上说不在乎，其实很在意别人的评价。对小动物没有抵抗力。',
  promises: [
    { id: 'pr1', topic: '面试', dueDate: '2026-10-22', when: 'morning', state: 'waiting', phase: 'future' },
    { id: 'pr2', topic: '体检报告', dueDate: '2026-10-20', when: 'day', state: 'waiting', phase: 'today' },
    { id: 'pr3', topic: '期中考试', dueDate: '2026-10-12', when: 'day', state: 'resolved', phase: 'late' },
    { id: 'pr4', topic: '搬家看房', dueDate: '2026-10-16', when: 'evening', state: 'asked', phase: 'late' },
  ],
  memos: [
    { id: 'me1', text: '对猫毛不过敏，但对花粉过敏', importance: 5, pinned: true, createdAt: '2026/9/12', followUp: false },
    { id: 'me2', text: '最喜欢的饮料是热可可，不加奶油', importance: 3, pinned: false, createdAt: '2026/10/3', followUp: false },
    { id: 'me3', text: '说过想学吉他，但还没买', importance: 2, pinned: false, createdAt: '2026/10/15', followUp: true },
  ],
};

/** 同步 */
export const CONFLICT_ROWS = [
  { key: 'activities', label: '活动', local: 412, cloud: 398 },
  { key: 'todos', label: '任务', local: 37, cloud: 37 },
  { key: 'confidants', label: '同伴', local: 9, cloud: 8 },
  { key: 'summaries', label: '总结', local: 14, cloud: 12 },
  { key: 'dailyDivinations', label: '每日塔罗', local: 120, cloud: 118 },
  { key: 'longReadings', label: '中长期占卜', local: 4, cloud: 4 },
];
export const SYNC_TABLE_LABEL: Record<string, string> = {
  users: '用户档案', attributes: '五维属性', activities: '成长记录', achievements: '成就', skills: '技能', dailyEvents: '旧版每日事件',
  dailyDivinations: '每日塔罗', longReadings: '中长期塔罗', fateGlimpses: '窥探命运', stamps: '岁时印章', quests: '委托', settings: '设置',
  todos: '任务', todoCompletions: '任务完成', summaries: '周/月总结', weeklyGoals: '本周目标', battleStates: '战斗状态', confidants: '同伴', confidantEvents: '同伴事件',
};
export const SYNC_DIFF = [
  { table: 'users', localCount: 1, cloudCount: 1 }, { table: 'attributes', localCount: 5, cloudCount: 5 },
  { table: 'activities', localCount: 412, cloudCount: 398 }, { table: 'achievements', localCount: 23, cloudCount: 23 },
  { table: 'skills', localCount: 11, cloudCount: 10 }, { table: 'dailyEvents', localCount: 0, cloudCount: 0 },
  { table: 'dailyDivinations', localCount: 120, cloudCount: 118 }, { table: 'longReadings', localCount: 4, cloudCount: 4 },
  { table: 'fateGlimpses', localCount: 6, cloudCount: 6 }, { table: 'stamps', localCount: 31, cloudCount: 31 },
  { table: 'quests', localCount: 18, cloudCount: 18 }, { table: 'settings', localCount: 1, cloudCount: 1 },
  { table: 'todos', localCount: 37, cloudCount: 37 }, { table: 'todoCompletions', localCount: 205, cloudCount: 201 },
  { table: 'summaries', localCount: 14, cloudCount: 12 }, { table: 'weeklyGoals', localCount: 8, cloudCount: 8 },
  { table: 'battleStates', localCount: 1, cloudCount: 1 }, { table: 'confidants', localCount: 9, cloudCount: 8 },
  { table: 'confidantEvents', localCount: 64, cloudCount: 60 },
];
export const SYNC_MERGE = [
  { table: 'activities', local: 412, cloud: 398, onlyLocal: 16, onlyCloud: 2, conflict: 3, samples: { onlyLocal: ['10/19 图书馆看书', '10/18 晨跑'], onlyCloud: ['10/02 帮忙搬箱子'], conflict: ['10/15 打工'] } },
  { table: 'confidants', local: 9, cloud: 8, onlyLocal: 1, onlyCloud: 0, conflict: 0, samples: { onlyLocal: ['里中千枝'], onlyCloud: [], conflict: [] } },
  { table: 'todos', local: 37, cloud: 37, onlyLocal: 0, onlyCloud: 1, conflict: 1, samples: { onlyLocal: [], onlyCloud: ['旧：整理房间'], conflict: ['背 30 个单词'] } },
];

/** 回归 */
export const RETURN_PAYLOAD = { daysAway: 12, lastSeenKey: '2026-10-08', returnCount: 3, tier: 'recent' as 'recent' | 'long' };
