/**
 * 逆影战场装备唯一目录：武器 / 防具 / 饰品。
 *
 * 这里同时是商店、宝箱、守卫掉落和强化 UI 的唯一来源。
 * 基础数值之外，装备还可以带探索或战斗效果：
 * - crit：暴击率加成
 * - steps：每层额外月光步数
 * - securityGuard：每次移动少涨的警戒
 * - money：战斗金钱加成
 * - chest：月匣品质加成
 * - drop：战斗掉落率加成
 * - heal：治疗道具效果加成
 * - ambushGuard：免疫警戒先制
 */

type EquipmentEffects = {
  crit: number;
  steps: number;
  securityGuard: number;
  money: number;
  chest: number;
  drop: number;
  heal: number;
  ambushGuard: boolean;
};

type EquipmentItem = {
  id: string;
  slot: 'weapon' | 'armor' | 'accessory';
  tier: number;
  name: string;
  price: number;
  sell: number;
  attack: number;
  defense: number;
  hp: number;
  sp: number;
  desc: string;
  effects: EquipmentEffects;
  unique?: string;
};

const fx = (overrides: Partial<EquipmentEffects> = {}): EquipmentEffects => ({
  crit: 0,
  steps: 0,
  securityGuard: 0,
  money: 0,
  chest: 0,
  drop: 0,
  heal: 0,
  ambushGuard: false,
  ...overrides,
});

export const EQUIPMENT: Record<string, EquipmentItem> = {
  'training-blade': {
    id: 'training-blade', slot: 'weapon', tier: 0, name: '训练用短刀', price: 0, sell: 0,
    attack: 2, defense: 0, hp: 0, sp: 0,
    desc: '刃口很钝，但握起来像自己的手。', effects: fx(),
  },
  'scout-knife': {
    id: 'scout-knife', slot: 'weapon', tier: 1, name: '侦察短刀', price: 1200, sell: 480,
    attack: 3, defense: 0, hp: 0, sp: 0,
    desc: '刀身很窄，出手比影子快半拍。', effects: fx({ crit: 0.03 }),
  },
  'iron-knife': {
    id: 'iron-knife', slot: 'weapon', tier: 2, name: '铁制小刀', price: 1800, sell: 720,
    attack: 5, defense: 0, hp: 0, sp: 0,
    desc: '不漂亮，够用。', effects: fx(),
  },
  'black-fang': {
    id: 'black-fang', slot: 'weapon', tier: 3, name: '黑牙', price: 4200, sell: 1680,
    attack: 8, defense: 0, hp: 0, sp: 0,
    desc: '刀背有一道像牙印的缺口。', effects: fx({ crit: 0.04 }),
  },
  'razor-fang': {
    id: 'razor-fang', slot: 'weapon', tier: 4, name: '剃齿', price: 6800, sell: 2720,
    attack: 11, defense: 0, hp: 0, sp: 0,
    desc: '切开的不是皮肉，是影子维持形状的那层边。', effects: fx({ crit: 0.05 }),
  },
  'eclipse-blade': {
    id: 'eclipse-blade', slot: 'weapon', tier: 5, name: '蚀月', price: 9800, sell: 3920,
    attack: 14, defense: 0, hp: 0, sp: 0,
    desc: '刀光暗得像月食，命中时才会亮一下。', effects: fx({ crit: 0.07 }),
  },
  'vanity-edge': {
    id: 'vanity-edge', slot: 'weapon', tier: 4, name: '虚荣之刃', price: 0, sell: 3000,
    attack: 12, defense: 0, hp: 0, sp: 0, unique: 'vanity',
    desc: '舞台灯照不到的地方，它替你补上那一下。', effects: fx({ crit: 0.1 }),
  },
  'school-jacket': {
    id: 'school-jacket', slot: 'armor', tier: 0, name: '加固学生服', price: 0, sell: 0,
    attack: 0, defense: 2, hp: 0, sp: 0,
    desc: '缝过两次，线脚很密。', effects: fx(),
  },
  'kevlar-vest': {
    id: 'kevlar-vest', slot: 'armor', tier: 2, name: '防刃背心', price: 2600, sell: 1040,
    attack: 0, defense: 5, hp: 4, sp: 0,
    desc: '影子的爪子也会被它挡住一部分。', effects: fx(),
  },
  'moonlight-coat': {
    id: 'moonlight-coat', slot: 'armor', tier: 3, name: '月光外套', price: 5200, sell: 2080,
    attack: 0, defense: 7, hp: 8, sp: 0,
    desc: '布料吸光，站在暗处时像一团没有形状的月光。', effects: fx({ heal: 0.1 }),
  },
  'night-vest': {
    id: 'night-vest', slot: 'armor', tier: 4, name: '夜行护甲', price: 7200, sell: 2880,
    attack: 0, defense: 9, hp: 10, sp: 0,
    desc: '每一块甲片都磨掉了反光，穿着它走路几乎没有声音。', effects: fx({ securityGuard: 1 }),
  },
  'void-cloak': {
    id: 'void-cloak', slot: 'armor', tier: 5, name: '空无斗篷', price: 10000, sell: 4000,
    attack: 0, defense: 11, hp: 14, sp: 0,
    desc: '披上之后，连“被看见”这件事都变得模糊。', effects: fx({ ambushGuard: true }),
  },
  'escape-boots': {
    id: 'escape-boots', slot: 'armor', tier: 4, name: '逃逸长靴', price: 0, sell: 2800,
    attack: 0, defense: 4, hp: 0, sp: 0, unique: 'escape',
    desc: '鞋底缝着回廊的灰。每层多走一步，警戒也涨得更慢。', effects: fx({ steps: 1, securityGuard: 1 }),
  },
  'old-watch': {
    id: 'old-watch', slot: 'accessory', tier: 1, name: '旧怀表', price: 1200, sell: 480,
    attack: 0, defense: 0, hp: 4, sp: 6,
    desc: '停在 0:00。你从没修过它。', effects: fx({ steps: 1 }),
  },
  'silver-ring': {
    id: 'silver-ring', slot: 'accessory', tier: 2, name: '银戒', price: 2400, sell: 960,
    attack: 1, defense: 1, hp: 0, sp: 8,
    desc: '内侧刻着一个看不清的名字。', effects: fx({ money: 0.1 }),
  },
  'compass-charm': {
    id: 'compass-charm', slot: 'accessory', tier: 4, name: '回声罗盘', price: 6200, sell: 2480,
    attack: 0, defense: 0, hp: 0, sp: 6,
    desc: '指针不指北，只指向还没被打开的东西。', effects: fx({ steps: 1, chest: 1 }),
  },
  'heart-locket': {
    id: 'heart-locket', slot: 'accessory', tier: 5, name: '心之吊坠', price: 9200, sell: 3680,
    attack: 0, defense: 0, hp: 0, sp: 10,
    desc: '贴近胸口时，药的味道会变得没那么苦。', effects: fx({ heal: 0.25 }),
  },
  'echo-crown': {
    id: 'echo-crown', slot: 'accessory', tier: 5, name: '回声之冠', price: 0, sell: 3200,
    attack: 0, defense: 0, hp: 0, sp: 8, unique: 'echo',
    desc: '戴上它，影子掉下的东西会多停留一会儿。', effects: fx({ drop: 0.2 }),
  },
};

export const SLOT_LABELS: Record<string, string> = { weapon: '武器', armor: '防具', accessory: '饰品' };
export const MAX_EQUIP_LEVEL = 5;

const levelOf = (levels: Record<string, any>, id: string): number => (
  Math.max(0, Math.min(MAX_EQUIP_LEVEL, Number(levels?.[id]) || 0))
);

export function equipmentBonuses(
  equipment: Record<string, any> = {},
  levels: Record<string, any> = {},
): { attack: number; defense: number; hp: number; sp: number } {
  const total = { attack: 0, defense: 0, hp: 0, sp: 0 };
  for (const itemId of Object.values(equipment)) {
    const item = EQUIPMENT[itemId];
    if (!item) continue;
    const scale = 1 + levelOf(levels, itemId) * 0.15;
    total.attack += Math.round(item.attack * scale);
    total.defense += Math.round(item.defense * scale);
    total.hp += Math.round(item.hp * scale);
    total.sp += Math.round(item.sp * scale);
  }
  return total;
}

export function equipmentEffects(
  equipment: Record<string, any> = {},
  levels: Record<string, any> = {},
): EquipmentEffects {
  const total = {
    crit: 0, steps: 0, securityGuard: 0, money: 0, chest: 0, drop: 0, heal: 0, ambushGuard: false,
  };
  for (const itemId of Object.values(equipment)) {
    const item = EQUIPMENT[itemId];
    if (!item) continue;
    const effects = item.effects ?? {};
    for (const key of ['crit', 'steps', 'securityGuard', 'money', 'chest', 'drop', 'heal'] as const) {
      total[key] += Number(effects[key]) || 0;
    }
    total.ambushGuard = total.ambushGuard || Boolean(effects.ambushGuard);
  }
  return total;
}

export function equipItem(
  equipment: Record<string, any>,
  owned: string[],
  itemId: string,
): {
  ok: boolean;
  reason?: string;
  equipment?: { weapon: string | null; armor: string | null; accessory: string | null };
  item?: EquipmentItem;
} {
  const item = EQUIPMENT[itemId];
  if (!item) return { ok: false, reason: '没有这件装备。' };
  if (!Array.isArray(owned) || !owned.includes(itemId)) return { ok: false, reason: '还没有获得这件装备。' };
  return {
    ok: true,
    equipment: {
      ...equipment,
      [item.slot]: itemId,
    } as { weapon: string | null; armor: string | null; accessory: string | null },
    item,
  };
}

export function unequipItem(
  equipment: Record<string, any>,
  slot: string,
): { ok: boolean; reason?: string; equipment?: Record<string, any> } {
  if (!SLOT_LABELS[slot]) return { ok: false, reason: '没有这个装备位。' };
  return { ok: true, equipment: { ...equipment, [slot]: null } };
}

export function equipmentRows(
  equipment: Record<string, any> = {},
  levels: Record<string, any> = {},
): any[] {
  return Object.keys(SLOT_LABELS).map(slot => {
    const item = equipment[slot] ? EQUIPMENT[equipment[slot]] ?? null : null;
    return { slot, label: SLOT_LABELS[slot], item, level: item ? levelOf(levels, item.id) : 0 };
  });
}

export function upgradeCost(
  item: EquipmentItem | null | undefined,
  level = 0,
): { money: number; stones: number } {
  const base = Math.max(1200, Number(item?.price) || 1800);
  return {
    money: Math.round(base * 0.28 * (level + 1)),
    stones: level + 1,
  };
}

export function equipmentSellPrice(item: EquipmentItem | null | undefined): number {
  return Math.max(0, Number(item?.sell) || Math.round((Number(item?.price) || 0) * 0.4));
}
