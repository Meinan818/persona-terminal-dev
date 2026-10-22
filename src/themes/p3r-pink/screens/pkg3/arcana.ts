/**
 * pkg3 · 塔罗 / 亲密度常量（逐字抄自真实 src/constants/tarot.ts 与 src/utils/confidantLevels.ts；demo 只能 import type，故复刻只读常量）。
 */
import type { AttributeId } from '@real/types';

export interface ArcanaDef { id: string; number: number; roman: string; name: string; nameEn: string; attr: AttributeId }

const A = (id: string, number: number, roman: string, name: string, nameEn: string, attr: AttributeId): ArcanaDef => ({ id, number, roman, name, nameEn, attr });

export const MAJOR_ARCANA: ArcanaDef[] = [
  A('fool', 0, '0', '愚者', 'The Fool', 'guts'),
  A('magician', 1, 'I', '魔术师', 'The Magician', 'dexterity'),
  A('high_priestess', 2, 'II', '女祭司', 'The High Priestess', 'knowledge'),
  A('empress', 3, 'III', '皇后', 'The Empress', 'kindness'),
  A('emperor', 4, 'IV', '皇帝', 'The Emperor', 'guts'),
  A('hierophant', 5, 'V', '教皇', 'The Hierophant', 'knowledge'),
  A('lovers', 6, 'VI', '恋人', 'The Lovers', 'charm'),
  A('chariot', 7, 'VII', '战车', 'The Chariot', 'guts'),
  A('strength', 8, 'VIII', '力量', 'Strength', 'guts'),
  A('hermit', 9, 'IX', '隐士', 'The Hermit', 'knowledge'),
  A('wheel_of_fortune', 10, 'X', '命运之轮', 'Wheel of Fortune', 'dexterity'),
  A('justice', 11, 'XI', '正义', 'Justice', 'knowledge'),
  A('hanged_man', 12, 'XII', '倒吊人', 'The Hanged Man', 'kindness'),
  A('death', 13, 'XIII', '死神', 'Death', 'guts'),
  A('temperance', 14, 'XIV', '节制', 'Temperance', 'kindness'),
  A('devil', 15, 'XV', '恶魔', 'The Devil', 'charm'),
  A('tower', 16, 'XVI', '塔', 'The Tower', 'guts'),
  A('star', 17, 'XVII', '星星', 'The Star', 'charm'),
  A('moon', 18, 'XVIII', '月亮', 'The Moon', 'kindness'),
  A('sun', 19, 'XIX', '太阳', 'The Sun', 'dexterity'),
  A('judgement', 20, 'XX', '审判', 'Judgement', 'knowledge'),
  A('world', 21, 'XXI', '世界', 'The World', 'charm'),
];
export const TAROT_BY_ID: Record<string, ArcanaDef> = Object.fromEntries(MAJOR_ARCANA.map((c) => [c.id, c]));
export const MAJOR_ARCANA_IDS = MAJOR_ARCANA.map((c) => c.id);

/** P4G S.Link 列表里的英文短名（Hiero. / Chariot / Moon …） */
export const ARCANA_SHORT: Record<string, string> = {
  fool: 'Fool', magician: 'Magician', high_priestess: 'Priestess', empress: 'Empress', emperor: 'Emperor', hierophant: 'Hiero.',
  lovers: 'Lovers', chariot: 'Chariot', strength: 'Strength', hermit: 'Hermit', wheel_of_fortune: 'Fortune', justice: 'Justice',
  hanged_man: 'Hanged', death: 'Death', temperance: 'Temper.', devil: 'Devil', tower: 'Tower', star: 'Star', moon: 'Moon',
  sun: 'Sun', judgement: 'Judge.', world: 'World',
};

export const ATTR_NAMES: Record<AttributeId, string> = { knowledge: '知识', guts: '胆量', dexterity: '灵巧', kindness: '温柔', charm: '魅力' };
export const ATTR_IDS: AttributeId[] = ['knowledge', 'guts', 'dexterity', 'kindness', 'charm'];

export const INTIMACY_THRESHOLDS = [0, 4, 9, 16, 25, 36, 50, 70, 95, 125, 160] as const;
export const ONLINE_INTIMACY_THRESHOLDS = [0, 4, 9, 16, 25, 36, 55, 80, 115, 160, 220] as const;
export const MAX_INTIMACY = 10;
export const INTIMACY_LABELS: Record<number, string> = {
  0: '初见', 1: '初识', 2: '熟面孔', 3: '伙伴', 4: '友人', 5: '挚友', 6: '知己', 7: '羁绊', 8: '共鸣', 9: '灵魂伙伴', 10: '圆满',
};
export const thresholdsFor = (c: { source?: string }) => (c.source === 'online' ? ONLINE_INTIMACY_THRESHOLDS : INTIMACY_THRESHOLDS);

/** 等级内进度 */
export function levelProgress(c: { intimacy: number; intimacyPoints: number; source?: string }) {
  const th = thresholdsFor(c);
  const isMax = c.intimacy >= MAX_INTIMACY;
  const base = th[Math.min(c.intimacy, MAX_INTIMACY)];
  const next = isMax ? base : th[c.intimacy + 1];
  const inLevel = Math.max(0, c.intimacyPoints - base);
  const span = Math.max(1, next - base);
  return { isMax, base, next, inLevel, span, gap: Math.max(0, next - c.intimacyPoints), pct: isMax ? 100 : Math.min(100, (inLevel / span) * 100) };
}

/** 真实 nextUnlockHint（ConfidantDetailModal） */
export function nextUnlockHint(level: number): string {
  if (level < 2) return '到 Lv.2 解锁「Ta 的指引」：该属性每次加点乘区外 +1';
  if (level < 4) return '到 Lv.4 解锁「Ta 的慰藉」：战斗中回复 5 点 HP（每 2 天一次）';
  if (level < 7) return '到 Lv.7 解锁「Ta 的共鸣」：该属性技能永久 +1 固定伤害';
  if (level < 10) return '到 Lv.10 达成圆满，所有能力增强并解锁 SP 回复';
  return '';
}

/** 真实 ConfidantDetailModal 历史类型标签 */
export const EVENT_LABEL: Record<string, string> = {
  created: '初识', intimacy_up: '增进', intimacy_down: '波折', level_up: '升级', buff_unlocked: '解锁能力', conversation: '互动',
  item_used: '战斗援助', archived: '归档', decay: '逆流', bound: '绑定', unbound: '解绑', star_shift: '星移',
};

/** 真实 TRAIT_QUESTIONS（ConfidantCreateModal / CoopAiMatchModal 共用） */
export const TRAIT_QUESTIONS: { question: string; short: string; options: string[] }[] = [
  { question: 'Ta 给你的整体印象更接近：', short: '性格基调', options: ['温和包容，让人安心', '直率有棱角，说话不绕圈', '慢热敏感，需要时间打开', '情绪丰富，起伏鲜明', '稳重克制，什么都先留一手'] },
  { question: '你们在一起时，你通常感觉：', short: '相处压力', options: ['完全放松，什么都能说', '大致轻松，偶有小心翼翼', '有些绷着，但依然珍贵', '常觉得累，但戒不掉', '像在博弈，时时权衡'] },
  { question: '这段关系里，你更多是：', short: '关系位置', options: ['我更多是给予的那一方', '我更多是被陪伴/照顾的一方', '相互依赖，彼此撑着', '保持距离，但彼此信任', '暧昧不定，角色在变'] },
  { question: '你们已经认识：', short: '认识时长', options: ['不到半年', '半年到两年', '两到五年', '五年以上', '很难说清，像是很久了'] },
];
