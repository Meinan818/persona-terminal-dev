/**
 * pkg3 假数据：羁绊（同伴 / COOP / 谏言 / 通知 / 羁绊之影）。
 * 类型全部来自真实仓库（只 import type）。数值与文案贴近真实 App 的口径。
 */
import type {
  AttributeId, CloudProfile, Confidant, ConfidantBuff, ConfidantEvent, CoopMemorialStamp, CounselArchive,
} from '@/types';

const d = (s: string) => new Date(s);
const today = '2026-10-20';

const buffsFor = (level: number, attr: AttributeId, name: string): ConfidantBuff[] => {
  const all: ConfidantBuff[] = [
    { id: 'b2', kind: 'daily_plus', attribute: attr, value: 1, unlockAtLevel: 2, title: `${name}的指引`, description: '每天首次为该属性加点时，额外 +1 点（乘区外，每日一次）' },
    { id: 'b4', kind: 'battle_heal', attribute: attr, value: 20, unlockAtLevel: 4, title: `${name}的慰藉`, description: '战斗中回复 20% 最大 HP（使用后冷却 2 天）' },
    { id: 'b7', kind: 'damage_plus', attribute: attr, value: 1, unlockAtLevel: 7, title: `${name}的共鸣`, description: '该属性技能永久 +1 固定伤害' },
    { id: 'b10', kind: 'battle_sp', attribute: attr, value: 15, unlockAtLevel: 10, title: `${name}的圆满`, description: '战斗中回复 15 点 SP（使用后冷却 2 天）' },
  ];
  return all.filter((b) => b.unlockAtLevel <= level);
};

const profile = (id: string, userId: string, nickname: string, totalLv: number, levels: Partial<Record<AttributeId, number>>): CloudProfile => ({
  id, userId, nickname, totalLv, attributeLevels: levels, lastSyncedAt: d('2026-10-20T18:40:00+08:00'),
});

type Mk = Partial<Confidant> & Pick<Confidant, 'id' | 'name' | 'arcanaId' | 'intimacy' | 'intimacyPoints'>;
const mk = (c: Mk): Confidant => ({
  userId: 'local-user', source: 'offline', orientation: 'upright', description: '', aiInterpretation: '', aiAdvice: '',
  buffs: buffsFor(c.intimacy, c.skillAttribute ?? 'guts', 'Ta'), decayEnabled: false, starShiftCharges: 0, createdAt: d('2026-03-01'), ...c,
});

export const PK3_PROFILES = {
  chie: profile('pb_chie', 'chie.s', '千枝', 46, { knowledge: 6, guts: 14, dexterity: 11, kindness: 9, charm: 6 }),
  yosuke: profile('pb_yosuke', 'yosuke_h', '阿介', 38, { knowledge: 7, guts: 9, dexterity: 8, kindness: 6, charm: 8 }),
  rise: profile('pb_rise', 'risette', '久慈川', 52, { knowledge: 9, guts: 8, dexterity: 10, kindness: 11, charm: 14 }),
  naoto: profile('pb_naoto', 'naoto.s', '直斗', 41, { knowledge: 15, guts: 7, dexterity: 9, kindness: 5, charm: 5 }),
};

export const PK3_CONFIDANTS: Confidant[] = [
  mk({
    id: 'c-chie', name: '千枝', arcanaId: 'chariot', intimacy: 8, intimacyPoints: 128, source: 'online', linkedCloudUserId: 'pb_chie', linkedProfile: PK3_PROFILES.chie,
    skillAttribute: 'guts', buffs: buffsFor(8, 'guts', '千枝'), starShiftCharges: 1,
    description: '高中就坐在我后桌，一起练过拳也一起吃过无数碗肉丼。嘴上嫌我慢，下雨天会默默把伞塞给我。',
    aiInterpretation: '战车正位：她是推着你往前冲的那股力。你们的关系建立在并肩奔跑上，而不是坐下来细谈。',
    aiAdvice: '下次别只约训练——找个安静的下午，问问她最近真正担心的事。',
    coopMemorials: [{ shadowId: 'coop:mirror', shadowName: '镜中之影', weaknessAttribute: 'guts', defeatedAt: '2026-10-02T21:10:00+08:00', winners: [{ userId: 'me', nickname: '我' }, { userId: 'pb_chie', nickname: '千枝' }], myDamage: 412, totalDamage: 760, streak: 2, finisherId: 'me', reward: { attr: 2, intimacy: 2, sp: 18, streak: 2, finisher: true } } as CoopMemorialStamp],
    prayerStreak: 3, lastPrayerDate: '2026-10-19', createdAt: d('2026-02-12'),
  }),
  mk({
    id: 'c-rise', name: '久慈川', arcanaId: 'lovers', intimacy: 9, intimacyPoints: 172, source: 'online', linkedCloudUserId: 'pb_rise', linkedProfile: PK3_PROFILES.rise,
    skillAttribute: 'charm', buffs: buffsFor(9, 'charm', '久慈川'),
    description: '网上认识的朋友，总在凌晨发来练歌的录音，问我第二句是不是又抢拍了。',
    aiInterpretation: '恋人正位不只关乎爱情：它说的是「选择」——她选择把真实的自己交给你看。',
    aiAdvice: '认真听完她的下一首歌，然后说一句具体的喜欢，而不是「好听」。', createdAt: d('2026-04-02'),
  }),
  mk({
    id: 'c-dojima', name: '堂岛叔叔', arcanaId: 'hermit', intimacy: 6, intimacyPoints: 44, skillAttribute: 'knowledge', buffs: buffsFor(6, 'knowledge', '叔叔'), decayEnabled: true, starShiftCharges: 2,
    description: '暂住时的监护人。话不多，加班回来会在桌上留一盒便利店的炸鸡。',
    aiInterpretation: '隐士：他提着灯独自走在前面。不是疏远，是他只会用这种方式照路。',
    aiAdvice: '周末早起一次，陪他吃顿早饭，什么都不用说。', createdAt: d('2026-01-20'),
  }),
  mk({
    id: 'c-nanako', name: '菜菜子', arcanaId: 'justice', intimacy: 10, intimacyPoints: 160, skillAttribute: 'kindness', buffs: buffsFor(10, 'kindness', '菜菜子'),
    description: '表妹，每天在玄关等我回家，问我今天学校有没有好玩的事。',
    aiInterpretation: '正义：她用最纯粹的标准看待世界，也提醒你守住自己的承诺。',
    aiAdvice: '答应她的事，哪怕再小，也要做到。', createdAt: d('2025-12-24'),
  }),
  mk({
    id: 'c-marie', name: '玛丽', arcanaId: 'moon', orientation: 'reversed', intimacy: 3, intimacyPoints: 11, skillAttribute: 'kindness', buffs: buffsFor(3, 'kindness', '玛丽'),
    description: '总在写奇怪的诗，写完又生气地说「不许看」。',
    aiInterpretation: '月亮逆位：雾正在慢慢散开，她还不确定要不要让你看清。',
    aiAdvice: '把她的诗当成真正的作品来读一次。', createdAt: d('2026-09-01'),
  }),
  mk({
    id: 'c-kou', name: '一条', arcanaId: 'sun', intimacy: 1, intimacyPoints: 2, skillAttribute: 'dexterity', buffs: [], createdAt: d('2026-10-15'),
    description: '篮球社的队友，刚开始熟起来。', aiInterpretation: '太阳正位：一段明亮、没有负担的开始。', aiAdvice: '下次练完球一起去吃个东西吧。',
  }),
  mk({
    id: 'c-old', name: '小西学长', arcanaId: 'star', intimacy: 5, intimacyPoints: 27, archivedAt: d('2026-08-30'), skillAttribute: 'charm',
    description: '毕业去了远方，偶尔还会在朋友圈点个赞。', aiInterpretation: '星星：远处仍有光。', aiAdvice: '想他的时候，发一句问候就好。', createdAt: d('2025-11-02'),
  }),
];

/** 已 linked 但未建 COOP 的在线好友 */
export const PK3_FRIENDS = [
  { id: 'fr-yosuke', profile: PK3_PROFILES.yosuke, prayed: false, beenPrayedBy: true },
  { id: 'fr-naoto', profile: PK3_PROFILES.naoto, prayed: true, beenPrayedBy: false },
];

export const PK3_MATERIALIZE_BLOCKERS = [{ otherName: 'kanji_t' }];

export const pk3Events = (cid: string): ConfidantEvent[] => [
  { id: `${cid}-e1`, confidantId: cid, date: '2026-10-19', type: 'conversation', delta: 3, userInput: '一起去河堤跑步，她说下周想去参加市里的比赛，让我陪练。', narrative: '你们把同一段路跑了两遍——这次是她放慢脚步等你。', advice: '比赛那天早点到，帮她拿着外套。', createdAt: d('2026-10-19') },
  { id: `${cid}-e2`, confidantId: cid, date: '2026-10-12', type: 'level_up', toLevel: 8, narrative: '亲密度提升到 Lv.8 · 共鸣', createdAt: d('2026-10-12') },
  { id: `${cid}-e3`, confidantId: cid, date: '2026-10-12', type: 'buff_unlocked', narrative: '解锁能力「Ta 的共鸣」', createdAt: d('2026-10-12') },
  { id: `${cid}-e4`, confidantId: cid, date: '2026-10-03', type: 'item_used', delta: 0, narrative: '战斗中使用了「Ta 的慰藉」，回复 20% HP', createdAt: d('2026-10-03') },
  { id: `${cid}-e5`, confidantId: cid, date: '2026-09-28', type: 'intimacy_down', delta: -1, narrative: '逆流：连续 3 天没有互动', createdAt: d('2026-09-28') },
  { id: `${cid}-e6`, confidantId: cid, date: '2026-02-12', type: 'created', narrative: '在星象的指引下结识', createdAt: d('2026-02-12') },
];

export const PK3_COUNSEL_ARCHIVES: CounselArchive[] = [
  { id: 'ca1', summary: '聊到和千枝因为比赛的事闹别扭——其实是担心她受伤，却说成了「你又逞强」。残响建议先道歉，再把担心讲清楚。', mentionedConfidantIds: ['c-chie'], messageCount: 18, sessionStartedAt: d('2026-10-14T21:00:00'), sessionEndedAt: d('2026-10-14T21:48:00'), createdAt: d('2026-10-14T21:48:00') },
  { id: 'ca2', summary: '叔叔又加班到深夜。你不知道该不该等他。残响说：留一盏灯，比等更好。', mentionedConfidantIds: ['c-dojima'], messageCount: 9, sessionStartedAt: d('2026-10-05T23:10:00'), sessionEndedAt: d('2026-10-05T23:40:00'), createdAt: d('2026-10-05T23:40:00') },
  { id: 'ca3', summary: '关于「朋友是不是越来越少了」的一场长谈。结论：不是少了，是留下的更重了。', mentionedConfidantIds: [], messageCount: 24, sessionStartedAt: d('2026-09-21T22:00:00'), sessionEndedAt: d('2026-09-21T22:58:00'), createdAt: d('2026-09-21T22:58:00') },
];

export type Pk3NotifType =
  | 'friend_request' | 'friend_accepted' | 'prayer_received' | 'prayer_reciprocal' | 'coop_proposal' | 'coop_accepted'
  | 'coop_shadow_spawned' | 'coop_shadow_attacked' | 'coop_shadow_defeated' | 'pact_invite' | 'pact_nudge' | 'system';
export interface Pk3Notif { id: string; type: Pk3NotifType; from: string; body: string; read: boolean; ago: string; battle?: boolean; actions?: 'friend' | 'coop' | 'pact' }

/** 文案按真实 NotificationsPanel 的 TITLE_BY_TYPE / bodyOf 拼出 */
export const PK3_NOTIFS: Pk3Notif[] = [
  { id: 'n1', type: 'friend_request', from: 'kanji_t', body: '想加你为好友：「上次社团活动见过，我是巽完二。」', read: false, ago: '5 分钟前', actions: 'friend' },
  { id: 'n2', type: 'coop_proposal', from: '阿介', body: '想与你缔结 COOP：「搭档，一起把那只影干掉吧！」', read: false, ago: '32 分钟前', actions: 'coop' },
  { id: 'n3', type: 'pact_invite', from: '千枝', body: '想和你一起：「晨跑 3 公里」（每天打卡 · 14 天 · 共同目标） 「这次一起坚持下来」', read: false, ago: '1 小时前', actions: 'pact' },
  { id: 'n4', type: 'prayer_received', from: '直斗', body: '送来了 2 点 SP，待入账。', read: false, ago: '2 小时前' },
  { id: 'n5', type: 'coop_shadow_attacked', from: '千枝', body: '使用 Tomoe · 黑天踵落 · 造成 86 伤害 · Boss 剩余 HP 334', read: true, ago: '3 小时前', battle: true },
  { id: 'n6', type: 'coop_shadow_spawned', from: '系统', body: '一只羁绊之影降临了。10 天之内，每晚 18:00 到次日 07:00 可以挑战它。', read: true, ago: '1 天前', battle: true },
  { id: 'n7', type: 'prayer_reciprocal', from: '久慈川', body: '今天你们互相祈愿了 ——愿望之光反射回你。', read: true, ago: '1 天前' },
  { id: 'n8', type: 'friend_accepted', from: 'naoto.s', body: '通过了好友申请，可以在同伴列表里看到对方了。', read: true, ago: '3 天前' },
];
export const PK3_NOTIF_TITLE: Record<Pk3NotifType, string> = {
  friend_request: '好友申请', friend_accepted: '接受了你的申请', prayer_received: '为你祈愿', prayer_reciprocal: '愿望之光交汇',
  coop_proposal: 'COOP 关系提议', coop_accepted: '接受了 COOP 提议', coop_shadow_spawned: '羁绊之影降临', coop_shadow_attacked: '对羁绊之影出手了',
  coop_shadow_defeated: '共同封印了羁绊之影', pact_invite: '邀请你一起进步', pact_nudge: '催你了', system: '系统消息',
};

/** 羁绊之影（与千枝共战） */
export const PK3_SHADOW = {
  id: 'sh1', name: '镜中之影「不肯示弱的拳」', line: '"你们终于看清我了。"', description: '一只躲在阴影里的羁绊之影。它把「我没事」说了太多次，于是长出了坚硬的外壳。',
  hpMax: 420, hpCurrent: 334, weakness: 'guts' as AttributeId, comboCount: 3, identifiedByMe: true, identifiedByPartner: true,
  resonance: { by: 'partner' as 'partner' | 'me', left: '还剩 2h 14m' }, attackUp: 2, vulnerability: 1, expiresLeft: '还剩 6 天',
};
export const PK3_PERSONAS = [
  { id: 'p1', name: 'Izanagi', attr: 'guts' as AttributeId, skills: [
    { id: 's1', name: '雷击', kind: 'damage', power: 42, sp: 6, desc: '对敌人造成中等雷属性伤害。' },
    { id: 's2', name: '猛攻', kind: 'crit', power: 60, sp: 12, desc: '高暴击率的物理攻击。' },
    { id: 's3', name: '蓄力', kind: 'charge', power: 0, sp: 8, desc: '下一次物理攻击伤害 ×2.5。' },
    { id: 's4', name: '激昂', kind: 'buff', power: 0, sp: 10, desc: '双方伤害 ×1.2，持续 3 回合。', turns: 3 },
  ] },
  { id: 'p2', name: 'Jack Frost', attr: 'kindness' as AttributeId, skills: [
    { id: 's5', name: '冰结', kind: 'damage', power: 38, sp: 5, desc: '对敌人造成冰属性伤害。' },
    { id: 's6', name: '易伤', kind: 'debuff', power: 0, sp: 9, desc: 'Boss 受到的伤害 ×1.15，持续 2 回合。', turns: 2 },
  ] },
];
export interface Pk3BattleLog { id: string; who: 'me' | 'partner'; persona: string; skill: string; dmg?: number; weakness?: boolean; resonance?: boolean; crit?: boolean; buff?: 'attack_up' | 'vulnerability'; ago: string }
export const PK3_BATTLE_LOG: Pk3BattleLog[] = [
  { id: 'l1', who: 'partner', persona: 'Tomoe', skill: '黑天踵落', dmg: 86, weakness: true, resonance: false, crit: true, ago: '3 小时前' },
  { id: 'l2', who: 'me', persona: 'Izanagi', skill: '激昂', buff: 'attack_up', ago: '昨天 22:14' },
  { id: 'l3', who: 'partner', persona: 'Tomoe', skill: '疾风斩', dmg: 0, buff: 'vulnerability', ago: '前天 19:40' },
];

export const PK3_TODAY = today;
