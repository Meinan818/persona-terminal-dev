/**
 * 工作包 3 假数据：羁绊（同伴 / COOP / 谏言 / 通知 / 羁绊之影 / 升级链）。
 * 类型全部来自真实仓库（只 import type）。数值与文案贴近真实 App 口径；人物换成 P3R 语境（月光馆 / SEES）。
 * 改写自黄色版 src/mock/pkg3.ts（复制改写，未 import）。
 */
import type { AttributeId, CloudProfile, Confidant, ConfidantBuff, ConfidantEvent, CoopMemorialStamp, CounselArchive } from '@/types';

const d = (s: string) => new Date(s);
export const PK3_TODAY = '2026-10-21';

export const buffsFor = (level: number, attr: AttributeId, name: string): ConfidantBuff[] => {
  const all: ConfidantBuff[] = [
    { id: 'b2', kind: 'daily_plus', attribute: attr, value: 1, unlockAtLevel: 2, title: `${name}的指引`, description: '每天首次为该属性加点时，额外 +1 点（乘区外，每日一次）' },
    { id: 'b4', kind: 'battle_heal', attribute: attr, value: 20, unlockAtLevel: 4, title: `${name}的慰藉`, description: '战斗中回复 20% 最大 HP（使用后冷却 2 天）' },
    { id: 'b7', kind: 'damage_plus', attribute: attr, value: 1, unlockAtLevel: 7, title: `${name}的共鸣`, description: '该属性技能永久 +1 固定伤害' },
    { id: 'b10', kind: 'battle_sp', attribute: attr, value: 15, unlockAtLevel: 10, title: `${name}的圆满`, description: '战斗中回复 15 点 SP（使用后冷却 2 天）' },
  ] as ConfidantBuff[];
  return all.filter((b) => b.unlockAtLevel <= level);
};

const profile = (id: string, userId: string, nickname: string, totalLv: number, levels: Partial<Record<AttributeId, number>>, extra: Partial<CloudProfile> = {}): CloudProfile => ({
  id, userId, nickname, totalLv, attributeLevels: levels, lastSyncedAt: d('2026-10-20T18:40:00+08:00'), ...extra,
} as CloudProfile);

type Mk = Partial<Confidant> & Pick<Confidant, 'id' | 'name' | 'arcanaId' | 'intimacy' | 'intimacyPoints'>;
const mk = (c: Mk): Confidant => ({
  userId: 'local-user', source: 'offline', orientation: 'upright', description: '', aiInterpretation: '', aiAdvice: '',
  buffs: buffsFor(c.intimacy, c.skillAttribute ?? 'guts', 'Ta'), decayEnabled: false, starShiftCharges: 0, createdAt: d('2026-03-01'), ...c,
} as Confidant);

export const PK3_PROFILES = {
  yukari: profile('pb_yukari', 'yukari.t', '由加莉', 48, { knowledge: 8, guts: 9, dexterity: 12, kindness: 10, charm: 9 }, { goal: '这个月射箭比赛进前三' } as unknown as Partial<CloudProfile>),
  junpei: profile('pb_junpei', 'junpei_i', '顺平', 39, { knowledge: 5, guts: 12, dexterity: 8, kindness: 7, charm: 7 }),
  fuuka: profile('pb_fuuka', 'fuuka.y', '风花', 51, { knowledge: 15, guts: 6, dexterity: 10, kindness: 12, charm: 8 }),
  ken: profile('pb_ken', 'amada.ken', '天田', 33, { knowledge: 7, guts: 8, dexterity: 6, kindness: 7, charm: 5 }),
  kazushi: profile('pb_kazushi', 'kazushi_m', '友近', 28, { knowledge: 4, guts: 9, dexterity: 6, kindness: 5, charm: 4 }),
};

export const PK3_CONFIDANTS: Confidant[] = [
  mk({
    id: 'c-yukari', name: '由加莉', arcanaId: 'lovers', intimacy: 8, intimacyPoints: 98, source: 'online', linkedCloudUserId: 'pb_yukari', linkedProfile: PK3_PROFILES.yukari,
    skillAttribute: 'charm', buffs: buffsFor(8, 'charm', '由加莉'), starShiftCharges: 1,
    description: '同班也同住月光馆。嘴上说「别误会」，却总在影时间结束后第一个确认我有没有受伤。',
    aiInterpretation: '恋人正位不只关乎爱情：它说的是「选择」——她在一次次犹豫里，选择了把真实的自己交给你看。',
    aiAdvice: '下次别只聊作战——问问她父亲的事，她其实一直在等一个能听完的人。',
    coopMemorials: [{ shadowId: 'coop:mirror', shadowName: '镜中之影', weaknessAttribute: 'charm', defeatedAt: '2026-10-02T21:10:00+08:00', winners: [{ userId: 'me', nickname: '我' }, { userId: 'pb_yukari', nickname: '由加莉' }], myDamage: 412, totalDamage: 760, streak: 2, finisherId: 'me', reward: { attr: 2, intimacy: 2, sp: 18, streak: 2, finisher: true } } as unknown as CoopMemorialStamp],
    prayerStreak: 3, lastPrayerDate: '2026-10-20', createdAt: d('2026-02-12'),
  }),
  mk({
    id: 'c-fuuka', name: '风花', arcanaId: 'high_priestess', intimacy: 9, intimacyPoints: 172, source: 'online', linkedCloudUserId: 'pb_fuuka', linkedProfile: PK3_PROFILES.fuuka,
    skillAttribute: 'knowledge', buffs: buffsFor(9, 'knowledge', '风花'),
    description: '后勤与导航。凌晨还在调试 Juno 的信号，问我第二层的回声是不是又偏了半拍。',
    aiInterpretation: '女祭司正位：她听得见别人听不见的声音——包括你没说出口的那一半。',
    aiAdvice: '认真吃完她做的下一份便当，然后说一句具体的好吃，而不是「还行」。', createdAt: d('2026-04-02'),
  }),
  mk({
    id: 'c-mitsuru', name: '美鹤学姐', arcanaId: 'empress', intimacy: 6, intimacyPoints: 44, skillAttribute: 'knowledge', buffs: buffsFor(6, 'knowledge', '美鹤'), decayEnabled: true, starShiftCharges: 2,
    description: '学生会长，也是 SEES 的指挥。话不多，开完会会把一杯红茶推到我面前。',
    aiInterpretation: '皇后：她用秩序守护所有人。不是疏远，是她只会用这种方式照顾人。',
    aiAdvice: '周末陪她去一次拉面店，让她第一次自己点单。', createdAt: d('2026-01-20'),
  }),
  mk({
    id: 'c-akihiko', name: '真田学长', arcanaId: 'star', intimacy: 10, intimacyPoints: 160, skillAttribute: 'guts', buffs: buffsFor(10, 'guts', '真田'),
    description: '拳击部主将，每天早上叫我一起跑长堤，跑完请吃牛肉饭。',
    aiInterpretation: '星星：他一直朝着一颗很远的星奔跑，也提醒你别停下。',
    aiAdvice: '答应他的晨跑，哪怕下雨也要去。', createdAt: d('2025-12-24'),
  }),
  mk({
    id: 'c-aigis', name: '埃癸斯', arcanaId: 'moon', orientation: 'reversed', intimacy: 3, intimacyPoints: 11, skillAttribute: 'kindness', buffs: buffsFor(3, 'kindness', '埃癸斯'),
    description: '总在屋顶看海，问我「人类为什么会想念一个已经离开的人」。',
    aiInterpretation: '月亮逆位：雾正在慢慢散开，她还不确定自己的心要不要被你看清。',
    aiAdvice: '把她的问题当成真正的问题来回答一次。', createdAt: d('2026-09-01'),
  }),
  mk({
    id: 'c-bebe', name: '贝贝', arcanaId: 'temperance', intimacy: 1, intimacyPoints: 2, skillAttribute: 'dexterity', buffs: [], createdAt: d('2026-10-15'),
    description: '手艺部的留学生，刚开始熟起来。', aiInterpretation: '节制正位：一段温和、没有负担的开始。', aiAdvice: '下次社团活动帮他把和服的线头剪掉。',
  }),
  mk({
    id: 'c-old', name: '小田桐', arcanaId: 'emperor', intimacy: 5, intimacyPoints: 27, archivedAt: d('2026-08-30'), skillAttribute: 'charm',
    description: '学生会的风纪委员，毕业去了远方，偶尔还会发一句「规矩还在吗」。', aiInterpretation: '皇帝：远处仍有秩序。', aiAdvice: '想他的时候，发一句问候就好。', createdAt: d('2025-11-02'),
  }),
];

/** 已 linked 但未建 COOP 的在线好友 */
export const PK3_FRIENDS = [
  { id: 'fr-junpei', profile: PK3_PROFILES.junpei, prayed: false, beenPrayedBy: true },
  { id: 'fr-ken', profile: PK3_PROFILES.ken, prayed: true, beenPrayedBy: false },
];
export const PK3_MATERIALIZE_BLOCKERS = [{ otherName: 'kazushi_m' }];

export const pk3Events = (cid: string): ConfidantEvent[] => [
  { id: `${cid}-e1`, confidantId: cid, date: '2026-10-20', type: 'conversation', delta: 3, userInput: '放学后一起去了长鸣神社，她说下周想去看射箭比赛的场地，让我陪她。', narrative: '你们在神社的台阶上坐到天黑——这次是她先开口。', advice: '比赛那天早点到，帮她拿着护具。', createdAt: d('2026-10-20') },
  { id: `${cid}-e2`, confidantId: cid, date: '2026-10-12', type: 'level_up', toLevel: 8, narrative: '亲密度提升到 Lv.8 · 共鸣', createdAt: d('2026-10-12') },
  { id: `${cid}-e3`, confidantId: cid, date: '2026-10-12', type: 'buff_unlocked', narrative: '解锁能力「Ta 的共鸣」', createdAt: d('2026-10-12') },
  { id: `${cid}-e7`, confidantId: cid, date: '2026-10-08', type: 'star_shift', narrative: '星移：关系描述与解读已重新落墨', createdAt: d('2026-10-08') },
  { id: `${cid}-e4`, confidantId: cid, date: '2026-10-03', type: 'item_used', delta: 0, narrative: '战斗中使用了「Ta 的慰藉」，回复 20% HP', createdAt: d('2026-10-03') },
  { id: `${cid}-e5`, confidantId: cid, date: '2026-09-28', type: 'intimacy_down', delta: -1, narrative: '逆流：连续 3 天没有互动', createdAt: d('2026-09-28') },
  { id: `${cid}-e6`, confidantId: cid, date: '2026-02-12', type: 'created', narrative: '在星象的指引下结识', createdAt: d('2026-02-12') },
] as ConfidantEvent[];

export const PK3_COUNSEL_ARCHIVES: CounselArchive[] = [
  { id: 'ca1', summary: '聊到和由加莉因为比赛的事闹别扭——其实是担心她受伤，却说成了「你又逞强」。残响建议先道歉，再把担心讲清楚。', mentionedConfidantIds: ['c-yukari'], messageCount: 18, sessionStartedAt: d('2026-10-14T21:00:00'), sessionEndedAt: d('2026-10-14T21:48:00'), createdAt: d('2026-10-14T21:48:00') },
  { id: 'ca2', summary: '学姐又开会到深夜。你不知道该不该等她。残响说：留一盏灯，比等更好。', mentionedConfidantIds: ['c-mitsuru'], messageCount: 9, sessionStartedAt: d('2026-10-05T23:10:00'), sessionEndedAt: d('2026-10-05T23:40:00'), createdAt: d('2026-10-05T23:40:00') },
  { id: 'ca3', summary: '关于「朋友是不是越来越少了」的一场长谈。结论：不是少了，是留下的更重了。', mentionedConfidantIds: [], messageCount: 24, sessionStartedAt: d('2026-09-21T22:00:00'), sessionEndedAt: d('2026-09-21T22:58:00'), createdAt: d('2026-09-21T22:58:00') },
] as CounselArchive[];

export type Pk3NotifType =
  | 'friend_request' | 'friend_accepted' | 'prayer_received' | 'prayer_reciprocal' | 'coop_proposal' | 'coop_accepted'
  | 'coop_shadow_spawned' | 'coop_shadow_attacked' | 'coop_shadow_defeated' | 'pact_invite' | 'pact_nudge' | 'system';
export interface Pk3Notif { id: string; type: Pk3NotifType; from: string; body: string; read: boolean; ago: string; battle?: boolean; actions?: 'friend' | 'coop' | 'pact' }

/** 文案按真实 NotificationsPanel 的 TITLE_BY_TYPE / bodyOf 拼出 */
export const PK3_NOTIFS: Pk3Notif[] = [
  { id: 'n1', type: 'friend_request', from: 'kazushi_m', body: '想加你为好友：「上次剑道部比赛见过，我是友近。」', read: false, ago: '5 分钟前', actions: 'friend' },
  { id: 'n2', type: 'coop_proposal', from: '顺平', body: '想与你缔结 COOP：「搭档，一起把那只影干掉吧！」', read: false, ago: '32 分钟前', actions: 'coop' },
  { id: 'n3', type: 'pact_invite', from: '由加莉', body: '想和你一起：「晨跑 3 公里」（每天打卡 · 14 天 · 共同目标） 「这次一起坚持下来」', read: false, ago: '1 小时前', actions: 'pact' },
  { id: 'n4', type: 'prayer_received', from: '天田', body: '送来了 2 点 SP，待入账。', read: false, ago: '2 小时前' },
  { id: 'n5', type: 'coop_shadow_attacked', from: '由加莉', body: '使用 Io · 疾风斩 · 造成 86 伤害 · Boss 剩余 HP 334', read: true, ago: '3 小时前', battle: true },
  { id: 'n6', type: 'coop_shadow_spawned', from: '系统', body: '一只羁绊之影降临了。10 天之内，每晚 18:00 到次日 07:00 可以挑战它。', read: true, ago: '1 天前', battle: true },
  { id: 'n7', type: 'prayer_reciprocal', from: '风花', body: '今天你们互相祈愿了 ——愿望之光反射回你。', read: true, ago: '1 天前' },
  { id: 'n8', type: 'friend_accepted', from: 'amada.ken', body: '通过了好友申请，可以在同伴列表里看到对方了。', read: true, ago: '3 天前' },
];
export const PK3_NOTIF_TITLE: Record<Pk3NotifType, string> = {
  friend_request: '好友申请', friend_accepted: '接受了你的申请', prayer_received: '为你祈愿', prayer_reciprocal: '愿望之光交汇',
  coop_proposal: 'COOP 关系提议', coop_accepted: '接受了 COOP 提议', coop_shadow_spawned: '羁绊之影降临', coop_shadow_attacked: '对羁绊之影出手了',
  coop_shadow_defeated: '共同封印了羁绊之影', pact_invite: '邀请你一起进步', pact_nudge: '催你了', system: '系统消息',
};

/** 羁绊之影（与由加莉共战） */
export const PK3_SHADOW = {
  id: 'sh1', name: '镜中之影「不肯示弱的弓」', line: '"你们终于看清我了。"', description: '一只躲在阴影里的羁绊之影。它把「我没事」说了太多次，于是长出了坚硬的外壳。',
  hpMax: 420, hpCurrent: 334, weakness: 'charm' as AttributeId, comboCount: 3, identifiedByMe: true, identifiedByPartner: true,
  resonance: { by: 'partner' as 'partner' | 'me', left: '还剩 2h 14m' }, attackUp: 2, vulnerability: 1, expiresLeft: '还剩 6 天',
};
export const PK3_PERSONAS = [
  { id: 'p1', name: 'Orpheus', attr: 'charm' as AttributeId, skills: [
    { id: 's1', name: '火炎', kind: 'damage', power: 42, sp: 6, desc: '对敌人造成中等火炎属性伤害。' },
    { id: 's2', name: '猛攻', kind: 'crit', power: 60, sp: 12, desc: '高暴击率的物理攻击。' },
    { id: 's3', name: '蓄力', kind: 'charge', power: 0, sp: 8, desc: '下一次物理攻击伤害 ×2.5。' },
    { id: 's4', name: '激昂', kind: 'buff', power: 0, sp: 10, desc: '双方伤害 ×1.2，持续 3 回合。', turns: 3 },
  ] },
  { id: 'p2', name: 'Pixie', attr: 'kindness' as AttributeId, skills: [
    { id: 's5', name: '电击', kind: 'damage', power: 38, sp: 5, desc: '对敌人造成电击属性伤害。' },
    { id: 's6', name: '易伤', kind: 'debuff', power: 0, sp: 9, desc: 'Boss 受到的伤害 ×1.15，持续 2 回合。', turns: 2 },
  ] },
];
export interface Pk3BattleLog { id: string; who: 'me' | 'partner'; persona: string; skill: string; dmg?: number; weakness?: boolean; resonance?: boolean; crit?: boolean; buff?: 'attack_up' | 'vulnerability'; ago: string }
export const PK3_BATTLE_LOG: Pk3BattleLog[] = [
  { id: 'l1', who: 'partner', persona: 'Io', skill: '疾风斩', dmg: 86, weakness: true, resonance: false, crit: true, ago: '3 小时前' },
  { id: 'l2', who: 'me', persona: 'Orpheus', skill: '激昂', buff: 'attack_up', ago: '昨天 22:14' },
  { id: 'l3', who: 'partner', persona: 'Io', skill: '疾风', dmg: 0, buff: 'vulnerability', ago: '前天 19:40' },
];

/** 一起进步（Pact） */
export const PK3_PACTS = [
  { id: 'pa1', title: '晨跑 3 公里', cadence: '每天打卡', days: 14, dayNo: 6, mode: '共同目标', meToday: true, partnerToday: false, streak: 5, note: '这次一起坚持下来' },
  { id: 'pa2', title: '背 30 个单词', cadence: '每天打卡', days: 21, dayNo: 12, mode: '各自目标', meToday: false, partnerToday: true, streak: 11, note: '' },
];

/** 星移 AI 结果（预览用） */
export const PK3_STARSHIFT = {
  summary: '从「并肩作战的同伴」走到了「愿意说出软弱的朋友」。',
  description: '同班也同住月光馆。以前她只在影时间后确认我有没有受伤；现在她会在白天也问一句「今天还好吗」。',
  interpretation: '恋人正位的「选择」更深了一层：她不再只选择信任你，也开始选择让你看见她的不安。',
  advice: '把她的那份不安当成你们共同的事。下一次，你先说出你的。',
};

/** 今日互动 AI 解读（逐字输出） */
export const PK3_INTERACTION_AI = {
  interpretation: '你们之间的默契正在从「一起战斗」变成「一起生活」。她把最后一个章鱼烧推给你，是她不擅长说出口的那句「谢谢你一直在」。',
  advice: '比赛那天早点到，带一瓶她喜欢的柚子汽水。',
  delta: 3,
};
