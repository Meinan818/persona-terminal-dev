/**
 * 暗影交涉 · 纯规则
 *
 * P5 式循环：打弱点/失衡 → HOLD UP → 选交涉方式 → 收服 / 奖励 / 激怒。
 * AI 决定影子的人格、台词、条件和收服提案；这里只算成功率与结果。
 */

export const PERSONALITIES = {
  proud: {
    id: 'proud',
    label: '傲慢',
    en: 'PROUD',
    blurb: '它不肯先低头。',
    mods: { threaten: -20, flatter: 20, reason: 5, bribe: -5 },
  },
  cowardly: {
    id: 'cowardly',
    label: '怯懦',
    en: 'COWARDLY',
    blurb: '它的声音在发抖。',
    mods: { threaten: 25, flatter: 0, reason: 10, bribe: 10 },
  },
  greedy: {
    id: 'greedy',
    label: '贪婪',
    en: 'GREEDY',
    blurb: '它盯着你手里的东西。',
    mods: { threaten: -5, flatter: 5, reason: 0, bribe: 30 },
  },
  wrathful: {
    id: 'wrathful',
    label: '暴怒',
    en: 'WRATHFUL',
    blurb: '它还没打够。',
    mods: { threaten: 10, flatter: -15, reason: -10, bribe: 0 },
  },
  calm: {
    id: 'calm',
    label: '冷静',
    en: 'CALM',
    blurb: '它在等你先开价。',
    mods: { threaten: -10, flatter: 5, reason: 25, bribe: 5 },
  },
};

export const NEGOTIATION_OPTIONS = {
  threaten: {
    id: 'threaten',
    label: '威胁',
    en: 'THREATEN',
    risk: '高',
    tone: 'red',
    blurb: '逼它认输。对怯懦者最有效，对傲慢者最危险。',
  },
  flatter: {
    id: 'flatter',
    label: '讨好',
    en: 'FLATTER',
    risk: '低',
    tone: 'cyan',
    blurb: '给它台阶。对傲慢者最有效。',
  },
  reason: {
    id: 'reason',
    label: '讲理',
    en: 'REASON',
    risk: '中',
    tone: 'blue',
    blurb: '问它为什么守在这里。对冷静者最有效。',
  },
  bribe: {
    id: 'bribe',
    label: '给 SP',
    en: 'BRIBE',
    risk: '中',
    tone: 'yellow',
    blurb: '20 SP 换一个机会。对贪婪者最有效。',
    cost: 20,
  },
};

export const OPTION_ORDER = ['threaten', 'flatter', 'reason', 'bribe'];
export const BRIBE_COST = 20;

export function createNegotiation() {
  return {
    active: false,
    phase: null,
    used: false,
    data: null,
    aiMode: 'preview',
    statusText: '',
    option: null,
    chance: 0,
    roll: 0,
    success: null,
    result: null,
  };
}

export function negotiationChance({ personality, option, staggered, lowHp, weaknessMatch, sp }) {
  if (option === 'bribe' && sp < BRIBE_COST) return 0;
  const mod = PERSONALITIES[personality]?.mods?.[option] ?? 0;
  const chance = 50 + mod
    + (staggered ? 10 : 0)
    + (lowHp ? 5 : 0)
    + (weaknessMatch ? 10 : 0);
  return Math.max(10, Math.min(90, chance));
}

export function chanceLabel(chance) {
  if (chance >= 70) return '较稳';
  if (chance >= 45) return '五五';
  return '冒险';
}

export function resolveNegotiation(input, roll) {
  const chance = negotiationChance(input);
  return {
    chance,
    roll,
    success: chance > 0 && roll * 100 < chance,
  };
}
