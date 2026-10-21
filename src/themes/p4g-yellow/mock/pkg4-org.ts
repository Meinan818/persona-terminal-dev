/* 工作包 4 · 组织据点假数据。组织 / 成员 / 动态 / 作战 用真实类型；团战、称号册等展示用的派生数据给成形值。 */
import type { AttributeId, Org, OrgMember, OrgOperation, OrgPersonaSnapshot, OrgPost, OrgReactionTag, OrgView } from '@/types';
import { shiftKey, TODAY } from './pkg4-astro';

export const ORG_NAME_MAX = 12, ORG_MOTTO_MAX = 30, ORG_CODENAME_MAX = 8, ORG_MAX_SHOWN_MASKS = 3, ORG_OP_TITLE_MAX = 20, ORG_OP_MIN_PEOPLE = 2;
export const ORG_TITLE_NAME_MAX = 6, ORG_CUSTOM_TITLES_MAX = 8, BORROW_BATTLES_PER_WEEK = 3;
export const RAID_WEAK_MULT = 1.5, RAID_FULL_MOON_MULT = 1.2, RAID_XP_PER_HITTER = 3;
export const ORG_XP_MEETING = 2, ORG_XP_OP_SMALL = 5, ORG_XP_OP_BIG = 8, ORG_XP_OPS_PER_WEEK = 3;
export const OP_KIND_LABEL = { small: '目标', big: '作战' } as const;
export const RESULT_LABEL = { done: '做到了', partial: '差一点', missed: '没做到' } as const;
export const ORG_LEVEL_NAMES = ['据点', '秘密基地', '特别活动部', '作战本部', '要塞', '不夜城'];
export const ORG_RULES = [
  '这里是一小群人互相打气的地方。不发广告、不留联系方式和链接。',
  '不骚扰、不攻击任何人，不发色情、暴力、违法或让人不适的内容。',
  '违反守则的内容会被删除；队长可以请离成员，严重的账号会被限制使用。',
  '看到不合适的内容，长按就能举报或屏蔽；举报会在 2 天内处理。',
];
export const ORG_PRIVACY_NOTE = '组织里的其他成员能看到：你的代号、头像、代表牌、名片状态、连续天数、本周哪几天有记录、你写的目标、你选择展示的面具，以及你主动分享的动态。看不到你的属性数值、记录原文和记录列表。';
export const ORG_EMBLEMS = [
  { id: 'star', label: '星', glyph: '★' }, { id: 'moon', label: '月', glyph: '☾' }, { id: 'sun', label: '日', glyph: '☀' }, { id: 'key', label: '钥匙', glyph: '⚿' },
  { id: 'mask', label: '面具', glyph: '◐' }, { id: 'crow', label: '鸦', glyph: '♆' }, { id: 'butterfly', label: '蝶', glyph: '❦' }, { id: 'fox', label: '狐', glyph: '♢' },
  { id: 'cat', label: '猫', glyph: '♧' }, { id: 'flame', label: '火', glyph: '♨' }, { id: 'wave', label: '浪', glyph: '≋' }, { id: 'crown', label: '冠', glyph: '♛' },
];
export const REPORT_REASONS = [{ id: 'harass', label: '骚扰 / 攻击' }, { id: 'inappropriate', label: '不当内容' }, { id: 'ads', label: '广告 / 引流' }, { id: 'other', label: '其他' }];
export const REACTIONS: Array<{ id: OrgReactionTag; label: string }> = [
  { id: 'strong', label: '太强了' }, { id: 'same', label: '🤣👉' }, { id: 'steady', label: '稳' }, { id: 'envy', label: '羡慕' }, { id: 'metoo', label: '带我一个' }, { id: 'hug', label: '别似' },
];
export const ORG_BUILTIN_TITLES = [
  { id: 'attend', name: '本周出勤王', how: '这周记录的天数全队最多（至少 5 天，并列都给）' },
  { id: 'full', name: '全勤', how: '这周 7 天都有记录' },
  { id: 'weekend', name: '周末不打烊', how: '周六、周日都有记录（全勤、出勤王的不再给这个）' },
  { id: 'streak7', name: '连续 7 天', how: '连续记录 7 天以上（那周周末有记录才算数）' },
  { id: 'streak14', name: '连续 14 天', how: '连续记录 14 天以上（换掉 7 天那个，同上）' },
  { id: 'streak30', name: '连续 30 天', how: '连续记录 30 天以上（换掉 14 天那个，同上）' },
  { id: 'promise', name: '言出必行', how: '做到了会上写的目标；连续几周做到会写「· N 周」' },
  { id: 'ops', name: '作战完成者', how: '这周有目标或作战达成，而且你在名单里' },
  { id: 'moon', name: '月下同行', how: '这周的满月团战出过手' },
];
export const ORG_TITLE_CONDS = [
  { type: 'week_days', label: '这周记录天数', unit: '天', min: 1, max: 7, def: 5 },
  { type: 'weekend', label: '周六周日都记', unit: '', min: 0, max: 0, def: 0, noValue: true },
  { type: 'streak', label: '连续记录天数', unit: '天', min: 2, max: 365, def: 21 },
  { type: 'goal_weeks', label: '连续做到会上的目标', unit: '周', min: 1, max: 52, def: 3 },
  { type: 'ops', label: '这周完成的作战', unit: '场', min: 1, max: 9, def: 2 },
  { type: 'raid', label: '这周团战出手', unit: '次', min: 1, max: 3, def: 3 },
  { type: 'lv', label: '总等级', unit: '级', min: 2, max: 999, def: 20 },
] as const;
export type CondType = typeof ORG_TITLE_CONDS[number]['type'];
export const condText = (c: { type: CondType; value: number }) => { const d = ORG_TITLE_CONDS.find((x) => x.type === c.type)!; return 'noValue' in d ? d.label : `${d.label} ≥ ${c.value} ${d.unit}`; };
export const STATUS_PRESET: Record<string, { emoji: string; label: string }> = { study: { emoji: '📚', label: '复习中' }, run: { emoji: '🏃', label: '刚跑完步' }, sleep: { emoji: '😴', label: '早睡计划' } };

const now = new Date();
const persona = (name: string, attribute: AttributeId, level: number, skills: OrgPersonaSnapshot['skills']): OrgPersonaSnapshot => ({ name, attribute, level, skills });
const attrs = (lv: number[]) => (['knowledge', 'guts', 'dexterity', 'kindness', 'charm'] as AttributeId[]).map((id, i) => ({ id, name: ['知识', '胆量', '灵巧', '温柔', '魅力'][i], level: lv[i], points: lv[i] * 23 + 7, max: 6 }));
const weekKey = (() => { const d = new Date(); const w = (d.getDay() + 6) % 7; d.setDate(d.getDate() - w); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();

const member = (o: Partial<OrgMember> & Pick<OrgMember, 'id' | 'userId' | 'seat' | 'codename'>): OrgMember => ({
  orgId: 'org-1', slot: 'joined', codenameKind: 'custom', card: { streak: 0 }, createdAt: new Date(2026, 6, 2), updatedAt: now, ...o,
});

export const ORG: Org = { id: 'org-1', name: '夜读小队', motto: '雾再大，也一起把书翻完', emblem: 'moon', leaderId: 'u1', inviteCode: 'K7MPXQ4R', tz: 'Asia/Shanghai', createdAt: new Date(2026, 6, 2), updatedAt: now };

export const MEMBERS: OrgMember[] = [
  member({ id: 'm1', userId: 'u1', seat: 1, slot: 'own', codename: '夜读人', tarotId: 'fool', goal: '每天背 30 个单词', goalWeek: weekKey, result: 'done', resultWeek: weekKey,
    card: { streak: 12, week: { key: weekKey, days: 0b0011111 }, lv: 17, attrs: attrs([4, 3, 3, 5, 2]), personas: [persona('伊邪那岐', 'guts', 3, [{ name: '雷光斩', type: 'damage', power: 14, level: 1 }, { name: '蓄力', type: 'charge', power: 0, level: 2 }])], status: { id: 'study', at: now.toISOString() } } }),
  member({ id: 'm2', userId: 'u2', seat: 2, codename: '千枝', tarotId: 'chariot', goal: '这周跑三次 5 公里', goalWeek: weekKey,
    card: { streak: 5, week: { key: weekKey, days: 0b0010101 }, lv: 15, attrs: attrs([2, 5, 4, 2, 2]), personas: [persona('巴御前', 'guts', 4, [{ name: '疾风踢', type: 'damage', power: 16, level: 1 }, { name: '暴击架势', type: 'crit', power: 12, level: 3 }]), persona('铃鹿御前', 'dexterity', 2, [{ name: '燕返', type: 'damage', power: 10, level: 1 }])], status: { id: 'run', at: now.toISOString() } } }),
  member({ id: 'm3', userId: 'u3', seat: 3, codename: '雪子', tarotId: 'empress', goal: '读完《雪国》', goalWeek: weekKey,
    card: { streak: 21, week: { key: weekKey, days: 0b0111111 }, lv: 19, attrs: attrs([4, 2, 3, 5, 5]), personas: [persona('木花开耶姬', 'charm', 5, [{ name: '火炎', type: 'damage', power: 18, level: 1 }, { name: '治愈之风', type: 'heal', power: 10, level: 2 }, { name: '集中', type: 'buff', power: 0, level: 4 }])] } }),
  member({ id: 'm4', userId: 'u4', seat: 4, codename: '阿完', tarotId: 'magician',
    card: { streak: 0, week: { key: weekKey, days: 0b0000001 }, lv: 9, attrs: attrs([2, 2, 2, 1, 2]) } }),
  member({ id: 'm5', userId: 'u5', seat: 5, codename: '小狐', card: { streak: 2 } }),
];
export const ME = MEMBERS[0];

const post = (o: Partial<OrgPost> & Pick<OrgPost, 'id' | 'userId' | 'kind'>): OrgPost => ({ orgId: 'org-1', text: '', snapshot: null, minutes: null, createdAt: now, ...o });
export const POSTS: OrgPost[] = [
  post({ id: 'p1', userId: 'u2', kind: 'moment', text: '雨里跑完了 5 公里！', snapshot: { v: 1, date: TODAY, pts: { guts: 3, dexterity: 1 }, names: { guts: '胆量', dexterity: '灵巧' }, kind: 'important', by: { codename: '千枝', tarotId: 'chariot' } }, createdAt: new Date(Date.now() - 2 * 3600_000) }),
  post({ id: 'p2', userId: 'u1', kind: 'moment', text: '第三章笔记整理完', snapshot: { v: 1, date: TODAY, pts: { knowledge: 2 }, names: { knowledge: '知识' }, by: { codename: '夜读人', tarotId: 'fool' } }, createdAt: new Date(Date.now() - 5 * 3600_000) }),
  post({ id: 'p3', userId: 'u3', kind: 'moment', text: '许下的愿望实现了', snapshot: { v: 1, date: shiftKey(-1), pts: { charm: 2, kindness: 2 }, names: { charm: '魅力', kindness: '温柔' }, kind: 'wish', by: { codename: '雪子', tarotId: 'empress' } }, createdAt: new Date(Date.now() - 26 * 3600_000) }),
  post({ id: 'p4', userId: 'u1', kind: 'operation', opCard: { v: 1, opId: 'op-h1', kind: 'small', title: '每人早起一次看日出', day: shiftKey(-2), week: weekKey, participants: [{ userId: 'u1', codename: '夜读人', tarotId: 'fool' }, { userId: 'u2', codename: '千枝', tarotId: 'chariot' }, { userId: 'u3', codename: '雪子', tarotId: 'empress' }] }, createdAt: new Date(Date.now() - 50 * 3600_000) }),
  post({ id: 'p5', userId: 'u1', kind: 'minutes', minutes: { v: 1, week: shiftKey(-7), rate: { done: 3, total: 4 }, done: [{ userId: 'u1', codename: '夜读人' }, { userId: 'u2', codename: '千枝' }, { userId: 'u3', codename: '雪子' }], goals: [{ userId: 'u1', codename: '夜读人', goal: '每天背 30 个单词' }, { userId: 'u2', codename: '千枝', goal: '这周跑三次 5 公里' }, { userId: 'u3', codename: '雪子', goal: '读完《雪国》' }], titles: [{ userId: 'u3', codename: '雪子', title: '全勤', tid: 'full' }, { userId: 'u1', codename: '夜读人', title: '言出必行', tid: 'promise' }, { userId: 'u2', codename: '千枝', title: '月下同行', tid: 'moon' }], absent: [{ userId: 'u4', codename: '阿完' }] }, createdAt: new Date(Date.now() - 4 * 86400_000) }),
];
export const REACTION_COUNTS: Record<string, Partial<Record<OrgReactionTag, number>>> = { p1: { strong: 2, same: 1 }, p2: { steady: 1 }, p3: { envy: 2, hug: 1 } };
export const MY_REACTIONS: Record<string, OrgReactionTag[]> = { p1: ['strong'] };

export const OPS: OrgOperation[] = [
  { id: 'op1', orgId: 'org-1', initiatorId: 'u2', kind: 'small', attr: 'guts', title: '这周每人跑一次 5 公里', deadline: shiftKey(3), participants: ['u1', 'u2', 'u3'], assignments: {}, status: 'active', createdAt: now, updatedAt: now },
  { id: 'op2', orgId: 'org-1', initiatorId: 'u1', kind: 'big', attr: 'knowledge', title: '一起做完期末复习', deadline: shiftKey(1), participants: ['u1', 'u2', 'u3', 'u4'], assignments: { u1: '整理第三章的笔记', u3: '做两套模拟卷' }, status: 'active', createdAt: now, updatedAt: now },
];
/** 作战成员状态（done / out / gone / todo）+ 自己写的一份 */
export const OP_STATE: Record<string, Record<string, { state: 'done' | 'out' | 'gone' | 'todo'; plan?: string }>> = {
  op1: { u1: { state: 'todo' }, u2: { state: 'done' }, u3: { state: 'done' } },
  op2: { u1: { state: 'todo' }, u2: { state: 'todo', plan: '背完公式表' }, u3: { state: 'done' }, u4: { state: 'out' } },
};
export const OP_HISTORY = [
  { id: 'op-h1', kind: 'small' as const, title: '每人早起一次看日出', status: 'achieved' as const, done: 3, counted: 3, day: shiftKey(-2) },
  { id: 'op-h2', kind: 'big' as const, title: '整理宿舍大扫除', status: 'failed' as const, done: 2, counted: 4, day: shiftKey(-9) },
  { id: 'op-h3', kind: 'small' as const, title: '一周不喝奶茶', status: 'cancelled' as const, done: 1, counted: 3, day: shiftKey(-15) },
];

export const LEVEL = { level: 3, xp: 236, floor: 180, next: 380, mult: 1.2 };

export const RAID = {
  boss: { name: '嘲笑之月', weak: 'charm' as AttributeId, lv: 3 }, hpMax: 420, left: 158, nights: [shiftKey(-1), TODAY, shiftKey(1)], nightIndex: 1,
  myNights: [true, false, false], sp: 34, allOutNeed: 2,
  hitters: [{ userId: 'u2', nights: 2, allout: false }, { userId: 'u3', nights: 1, allout: false }, { userId: 'u1', nights: 1, allout: false }],
};
export const RAID_MASKS = [
  { attr: 'guts' as AttributeId, name: '伊邪那岐', skills: [{ skill: '普攻', type: 'basic' as const, power: 8, plus: 0, sp: 0 }, { skill: '雷光斩', type: 'damage' as const, power: 14, plus: 2, sp: 8 }, { skill: '暴雷', type: 'crit' as const, power: 22, plus: 2, sp: 18 }] },
  { attr: 'charm' as AttributeId, name: '魅惑之镜', skills: [{ skill: '普攻', type: 'basic' as const, power: 8, plus: 0, sp: 0 }, { skill: '迷魂', type: 'debuff' as const, power: 12, plus: 0, sp: 10 }, { skill: '绯色疾风', type: 'damage' as const, power: 26, plus: 1, sp: 40 }] },
  { attr: 'knowledge' as AttributeId, name: '智慧之书', skills: [{ skill: '普攻', type: 'basic' as const, power: 8, plus: 0, sp: 0 }, { skill: '解析', type: 'buff' as const, power: 10, plus: 0, sp: 6 }] },
];

export const TITLE_BOOK = [
  { name: '言出必行', count: 4, last: shiftKey(-7), bestWeeks: 3 },
  { name: '本周出勤王', count: 2, last: shiftKey(-14), bestWeeks: 1 },
  { name: '月下同行', count: 1, last: shiftKey(-21), bestWeeks: 1, retired: false },
];

export const buildView = (): OrgView => ({ org: ORG, members: MEMBERS, me: ME, posts: POSTS, reactions: [], ops: OPS, checkins: [] });
export const SECOND_ORG = { id: 'org-2', name: '周末徒步团', members: 4, slot: 'joined' as const };
