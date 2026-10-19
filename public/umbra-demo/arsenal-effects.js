/**
 * 武库被动词条：遗物与共鸣链的唯一效果来源。
 * 这里的数值会同时进入战斗与爬塔经济，避免只改界面不改结算。
 */

export const RELICS = {
  moon: {
    id: 'moon',
    name: '月光碎片',
    desc: '战斗开始 SP +8，技能伤害 +6%。',
    sp: 8,
    skillBonus: 0.06,
  },
  thread: {
    id: 'thread',
    name: '回响之线',
    desc: '战斗与月匣金钱 +15%，掉落率 +5%。',
    money: 0.15,
    drop: 0.05,
  },
};

export const CHAINS = [
  {
    id: 'scholar',
    name: '无畏考据',
    pair: '知识 + 勇气',
    desc: '弱点命中伤害 +10%。',
    weakBonus: 0.1,
  },
  {
    id: 'crit',
    name: '精算连击',
    pair: '知识 + 灵巧',
    desc: '暴击率 +6%。',
    crit: 0.06,
  },
  {
    id: 'moon',
    name: '月下共鸣',
    pair: '体贴 + 魅力',
    desc: '治疗量 +30%。',
    heal: 0.3,
  },
];

export function arsenalEffects(state = {}) {
  const equipped = state.equipped instanceof Set ? [...state.equipped] : (state.relics ?? []);
  const total = {
    sp: 0,
    hp: 0,
    skillBonus: 0,
    crit: 0,
    heal: 0,
    weakBonus: 0,
    money: 0,
    drop: 0,
  };
  for (const id of equipped) {
    const relic = RELICS[id];
    if (!relic) continue;
    for (const key of ['sp', 'hp', 'skillBonus', 'crit', 'heal', 'weakBonus', 'money', 'drop']) {
      total[key] += Number(relic[key]) || 0;
    }
  }
  const chain = CHAINS[Number(state.chain)];
  if (chain) {
    for (const key of ['skillBonus', 'crit', 'heal', 'weakBonus', 'money', 'drop']) {
      total[key] += Number(chain[key]) || 0;
    }
  }
  return total;
}

export function relicList(state = {}) {
  const equipped = state.equipped instanceof Set ? [...state.equipped] : (state.relics ?? []);
  const disposed = new Set(state.relicDisposed ?? []);
  return Object.values(RELICS)
    .filter(relic => !disposed.has(relic.id))
    .map(relic => ({ ...relic, equipped: equipped.includes(relic.id) }));
}
