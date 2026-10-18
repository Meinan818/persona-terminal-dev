/**
 * 逆影战场装备：武器 / 防具 / 饰品。
 * 装备只加攻防与 HP/SP，不改变 Persona 耐性和技能规则。
 */

export const EQUIPMENT = {
  'training-blade': {
    id: 'training-blade', slot: 'weapon', name: '训练用短刀', price: 0,
    attack: 2, defense: 0, hp: 0, sp: 0, desc: '刃口很钝，但握起来像自己的手。',
  },
  'iron-knife': {
    id: 'iron-knife', slot: 'weapon', name: '铁制小刀', price: 1800,
    attack: 5, defense: 0, hp: 0, sp: 0, desc: '不漂亮，够用。',
  },
  'black-fang': {
    id: 'black-fang', slot: 'weapon', name: '黑牙', price: 4200,
    attack: 8, defense: 0, hp: 0, sp: 0, desc: '刀背有一道像牙印的缺口。',
  },
  'school-jacket': {
    id: 'school-jacket', slot: 'armor', name: '加固学生服', price: 0,
    attack: 0, defense: 2, hp: 0, sp: 0, desc: '缝过两次，线脚很密。',
  },
  'kevlar-vest': {
    id: 'kevlar-vest', slot: 'armor', name: '防刃背心', price: 2600,
    attack: 0, defense: 5, hp: 4, sp: 0, desc: '影子的爪子也会被它挡住一部分。',
  },
  'old-watch': {
    id: 'old-watch', slot: 'accessory', name: '旧怀表', price: 1200,
    attack: 0, defense: 0, hp: 4, sp: 6, desc: '停在 0:00。你从没修过它。',
  },
  'silver-ring': {
    id: 'silver-ring', slot: 'accessory', name: '银戒', price: 2400,
    attack: 1, defense: 1, hp: 0, sp: 8, desc: '内侧刻着一个看不清的名字。',
  },
};

export const SLOT_LABELS = { weapon: '武器', armor: '防具', accessory: '饰品' };

export function equipmentBonuses(equipment = {}) {
  const total = { attack: 0, defense: 0, hp: 0, sp: 0 };
  for (const itemId of Object.values(equipment)) {
    const item = EQUIPMENT[itemId];
    if (!item) continue;
    total.attack += item.attack;
    total.defense += item.defense;
    total.hp += item.hp;
    total.sp += item.sp;
  }
  return total;
}

export function equipItem(equipment, owned, itemId) {
  const item = EQUIPMENT[itemId];
  if (!item) return { ok: false, reason: '没有这件装备。' };
  if (!Array.isArray(owned) || !owned.includes(itemId)) return { ok: false, reason: '还没有买下这件装备。' };
  return { ok: true, equipment: { ...equipment, [item.slot]: itemId }, item };
}

export function unequipItem(equipment, slot) {
  if (!SLOT_LABELS[slot]) return { ok: false, reason: '没有这个装备位。' };
  return { ok: true, equipment: { ...equipment, [slot]: null } };
}

export function equipmentRows(equipment = {}) {
  return Object.keys(SLOT_LABELS).map(slot => ({
    slot,
    label: SLOT_LABELS[slot],
    item: equipment[slot] ? EQUIPMENT[equipment[slot]] ?? null : null,
  }));
}
