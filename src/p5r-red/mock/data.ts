/**
 * 假数据（逐字迁移自 /workspace/work/p5r/shared/data.js；字段名对齐 ptd/src/types）。
 * 人物：羁绊示例用 P5R 原作角色名与人设，不使用官方立绘 / logo。
 * 原生里页面会直接改 P5.D（如首页打勾）；React 版请把可变部分放进组件 state（useState(() => structuredClone(D.todos))），
 * 不要改这里的导出对象。各包新增假数据：建 src/mock/pkgN-xxx.ts，不要改本文件结构。
 */
const today = new Date();
const key = (d: Date) => d.toISOString().slice(0, 10);
const add = (n: number) => new Date(today.getTime() + n * 864e5);

export type AttrId = 'knowledge' | 'guts' | 'dexterity' | 'kindness' | 'charm';
export const ATTR: Record<AttrId, { name: string; en: string; glyph: string }> = {
  knowledge: { name: '知识', en: 'KNOWLEDGE', glyph: '📖' }, guts: { name: '胆量', en: 'GUTS', glyph: '🔥' },
  dexterity: { name: '灵巧', en: 'PROFICIENCY', glyph: '✋' }, kindness: { name: '温柔', en: 'KINDNESS', glyph: '❤' }, charm: { name: '魅力', en: 'CHARM', glyph: '✦' },
};
export const ATTR_ORDER: AttrId[] = ['knowledge', 'guts', 'dexterity', 'kindness', 'charm'];
/** P5R 五维称号阶梯（原作社会属性等级名） */
export const RANKS: Record<AttrId, string[]> = {
  knowledge: ['平凡', '略有学识', '有教养', '博学', '百科全书', '真理探求者'],
  guts: ['普通', '可靠', '有骨气', '无畏', '勇猛', '狮子之心'],
  dexterity: ['笨拙', '还算熟练', '灵巧', '心灵手巧', '能工巧匠', '神乎其技'],
  kindness: ['还行', '体贴', '慈悲', '温柔', '天使般', '慈母之心'],
  charm: ['普通', '有趣', '有吸引力', '引人注目', '光彩照人', '无法抗拒'],
};

export interface MockTodo { id: string; title: string; attribute: AttrId; points: number; frequency: 'single' | 'count'; targetCount?: number; repeatDaily: boolean; important?: boolean; fate?: boolean; deadlineDays?: number; count: number; target: number; extra?: { attribute: AttrId; points: number }[] }
export interface MockCallingCard { id: string; title: string; subtitle: string; mode: 'deadline' | 'both' | 'todos'; target: string; start: string; pinned?: boolean; todosDone?: number; todosTotal?: number }
export interface MockConfidant {
  name: string; arcana: string; arcanaCn: string; no: string; rank: number; desc: string;
  /** 真实同伴 id（页面按 id 取真实亲密点 / 解读 / 建议，不再按 arcana 查演示常量） */
  id?: string;
  /** 当前等级内的亲密点进度（真实） */
  intimacyPoints?: number;
  /** AI 解读（真实；没有就是空串，不填演示解读） */
  aiInterpretation?: string;
  /** AI 相处建议（真实；没有就是空串） */
  aiAdvice?: string;
  /** 能力 buff 指向的属性（真实） */
  skillAttribute?: string;
  /** 星移可用次数（真实） */
  starShiftCharges?: number;
  /** 在线绑定的对方云端档案（真实） */
  linkedProfile?: {
    userId?: string; nickname?: string; lv?: number;
    /** 对方五维等级（真实） */
    attributeLevels?: Record<string, number>;
    /** 对方五维点数之和（真实） */
    totalPoints?: number;
    /** 对方已解锁成就 + 技能数（真实） */
    unlockedCount?: number;
    /** 对方难度档（真实） */
    levelDifficulty?: string;
    /** 名片目标快照（真实） */
    goal?: { title?: string; subtitle?: string };
    /** 最近一次拉到这份档案的时间（真实） */
    lastSyncedAt?: string;
  } | null;
  /** 来源：离线自建 / 在线绑定（真实） */
  source?: string;
  /** 逆流开关（真实） */
  decayEnabled?: boolean;
}

export interface MockFriend {
  id: string;
  name: string;
  uid: string;
  lv: number;
  status?: string | null;
  goal: string;
  pact: boolean;
  waiting: boolean;
  coop: 'none' | 'pending_out' | 'pending_in' | 'cooldown_rejected' | 'cooldown_severed' | 'linked';
  profile: Record<string, unknown>;
}

export const D = {
  user: { name: '野鸡', title: '面具庭园的主人', status: '专注中', joined: '2026.09.13' },
  streak: 7,
  attrs: { knowledge: { level: 3, pts: 46, next: 60 }, guts: { level: 2, pts: 18, next: 40 }, dexterity: { level: 2, pts: 30, next: 40 }, kindness: { level: 4, pts: 72, next: 90 }, charm: { level: 1, pts: 8, next: 20 } } as Record<AttrId, { level: number; pts: number; next: number }>,
  maxLevel: 5,
  todos: [
    { id: 't1', title: '晨跑 5 公里', attribute: 'guts', points: 2, frequency: 'single', repeatDaily: true, important: true, count: 0, target: 1 },
    { id: 't2', title: '读完《人间失格》第三章', attribute: 'knowledge', points: 2, frequency: 'single', repeatDaily: true, count: 1, target: 1 },
    { id: 't3', title: '给妈妈打电话', attribute: 'kindness', points: 2, frequency: 'single', repeatDaily: true, fate: true, count: 0, target: 1 },
    { id: 't4', title: '练习吉他 30 分钟', attribute: 'dexterity', points: 2, frequency: 'count', targetCount: 3, repeatDaily: true, count: 1, target: 3 },
    { id: 't5', title: '整理房间', attribute: 'charm', points: 2, frequency: 'single', repeatDaily: false, deadlineDays: 5, count: 0, target: 1, extra: [{ attribute: 'kindness', points: 1 }] },
  ] as MockTodo[],
  archived: [
    { id: 'a1', title: '周末去美术馆', attribute: 'charm', points: 3, state: 'pending', weekdays: [6] },
    { id: 'a2', title: '背 50 个单词', attribute: 'knowledge', points: 2, state: 'done' },
    { id: 'a3', title: '学做咖喱', attribute: 'dexterity', points: 2, state: 'inactive' },
  ] as { id: string; title: string; attribute: AttrId; points: number; state: 'pending' | 'done' | 'inactive'; weekdays?: number[] }[],
  wishes: [{ title: '去一次京都', status: 'active' }, { title: '学会冲浪', status: 'active' }],
  callingCards: [
    { id: 'cc1', title: '期末考试全科通过', subtitle: '偷走懒惰之心', mode: 'deadline', target: key(add(12)), start: key(add(-5)), pinned: true },
    { id: 'cc2', title: '完成半程马拉松', subtitle: '让胆量发出预告', mode: 'both', target: key(add(40)), start: key(add(-20)), todosDone: 6, todosTotal: 14 },
  ] as MockCallingCard[],
  weeklyGoal: null as null | Record<string, unknown>,
  quests: { claimable: 2 },
  activities: [
    { d: key(today), desc: '图书馆自习三小时', pts: { knowledge: 3 } }, { d: key(today), desc: '健身房力量训练', pts: { guts: 2 } },
    { d: key(add(-1)), desc: '帮室友搬家', pts: { kindness: 2 } }, { d: key(add(-1)), desc: '做了一道新菜', pts: { dexterity: 2 } }, { d: key(add(-2)), desc: '参加社团面试', pts: { charm: 3, guts: 1 } },
  ] as { d: string; desc: string; pts: Partial<Record<AttrId, number>> }[],
  confidants: [
    { name: '坂本龙司', arcana: 'CHARIOT', arcanaCn: '战车', no: 'VII', rank: 6, desc: '秀尽学园二年级，前田径部王牌，直来直去、讲义气的行动派。' },
    { name: '高卷杏', arcana: 'LOVERS', arcanaCn: '恋爱', no: 'VI', rank: 5, desc: '混血模特同学，外表张扬、内心重情，为朋友挺身而出。' },
    { name: '摩尔加纳', arcana: 'MAGICIAN', arcanaCn: '魔术师', no: 'I', rank: 7, desc: '自称「不是猫」的神秘生物，怪盗团的军师与向导。' },
    { name: '新岛真', arcana: 'PRIESTESS', arcanaCn: '女教皇', no: 'II', rank: 4, desc: '学生会长，成绩优异、一丝不苟，合气道高手。' },
    { name: '佐仓双叶', arcana: 'HERMIT', arcanaCn: '隐者', no: 'IX', rank: 8, desc: '天才黑客，长期闭门不出，正一点点走向外面的世界。' },
    { name: '奥村春', arcana: 'EMPRESS', arcanaCn: '女帝', no: 'III', rank: 3, desc: '温柔的三年级学姐，喜欢在屋顶种菜，奥村集团千金。' },
  ] as MockConfidant[],
  friends: [
    { id: 'f1', name: '喜多川祐介', uid: 'yusuke_k', lv: 18, status: '🎨 写生中', goal: '这周画完一幅油画', pact: false, waiting: false, coop: 'none', profile: { id: 'f1', userId: 'yusuke_k', nickname: '喜多川祐介', totalLv: 18 } },
    { id: 'f2', name: '明智吾郎', uid: 'goro_a', lv: 26, status: null, goal: '每天读 30 页推理小说', pact: true, waiting: true, coop: 'pending_in', profile: { id: 'f2', userId: 'goro_a', nickname: '明智吾郎', totalLv: 26 } },
  ] as MockFriend[],
};
export type MockData = typeof D;

/** 影时间（默认 周五六日 20:00–7:00）——菜单 / 首页入口 / 战斗占位共用口径 */
export const shadowNow = (d = new Date()) => { const h = d.getHours(), w = d.getDay(), days = [5, 6, 0]; return h >= 20 ? days.includes(w) : h < 7 ? days.includes((w + 6) % 7) : false; };
