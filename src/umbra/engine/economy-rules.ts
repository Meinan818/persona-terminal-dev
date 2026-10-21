/**
 * P5 经济 / 商店 / 装备 / 宝箱规则切片（纯逻辑，无 UI）
 *
 * 目标：先验证“钱—商店—装备—宝箱—战斗消耗”的闭环。
 * 商店名字与文案走 P5 语域，但不复刻原作店铺/商品名。
 */

import { EQUIPMENT } from './equipment.js';

type Rng = () => number;
type AnyRecord = Record<string, any>;

export const ITEM_DEFS: Record<string, AnyRecord> = {
  painkiller: { id: 'painkiller', name: '小瓶止痛药', kind: 'heal', hp: 40, price: 300, sell: 120, desc: '回响诊所的常备药。回复 40 HP。' },
  strongPainkiller: { id: 'strongPainkiller', name: '强效止痛药', kind: 'heal', hp: 100, price: 900, sell: 360, desc: '苦得让人清醒。回复 100 HP。' },
  revive: { id: 'revive', name: '复苏针', kind: 'revive', pct: 0.5, price: 1500, sell: 600, desc: '让倒下的同伴以 50% HP 回来。' },
  coolPatch: { id: 'coolPatch', name: '退热贴', kind: 'cure', status: 'burn', price: 200, sell: 80, desc: '撕开时有一声很轻的响。解除燃烧。' },
  calmPill: { id: 'calmPill', name: '镇定剂', kind: 'cure', status: 'confuse', price: 220, sell: 88, desc: '把脑子里那台坏掉的电视关掉。解除混乱。' },
  energyDrink: { id: 'energyDrink', name: '月见坂能量饮', kind: 'sp', sp: 20, price: 500, sell: 200, desc: '自动贩卖机里最贵的一罐。回复 20 SP。' },
  sportsDrink: { id: 'sportsDrink', name: '运动饮料', kind: 'sp', sp: 10, price: 280, sell: 110, desc: '普通的补给。回复 10 SP。' },
  smokeBomb: { id: 'smokeBomb', name: '烟雾弹', kind: 'escape', price: 400, sell: 160, desc: '不保证体面，但保证能跑。' },
  emberShard: { id: 'emberShard', name: '火之碎片', kind: 'material', element: 'charm', price: 220, sell: 90, desc: '还带着温度。Persona 合成材料。' },
  frostShard: { id: 'frostShard', name: '冰之碎片', kind: 'material', element: 'kindness', price: 220, sell: 90, desc: '放进掌心会粘住。Persona 合成材料。' },
  windShard: { id: 'windShard', name: '风之碎片', kind: 'material', element: 'dexterity', price: 220, sell: 90, desc: '轻得像一句没说完的话。Persona 合成材料。' },
  psyShard: { id: 'psyShard', name: '念之碎片', kind: 'material', element: 'knowledge', price: 220, sell: 90, desc: '看久了会听见自己的声音。Persona 合成材料。' },
  physShard: { id: 'physShard', name: '力之碎片', kind: 'material', element: 'guts', price: 220, sell: 90, desc: '握紧时指节会发白。Persona 合成材料。' },
  enhanceStone: { id: 'enhanceStone', name: '强化石', kind: 'material', price: 600, sell: 240, desc: '能把装备再往前推一点。强化装备时消耗。' },
  echoShard: { id: 'echoShard', name: '回声碎片', kind: 'material', price: 160, sell: 64, desc: '影子散开后留下的薄片。' },
  wanderShard: { id: 'wanderShard', name: '游荡碎片', kind: 'material', price: 180, sell: 72, desc: '还在轻轻震动，像没走完的脚步。' },
  obsessionShard: { id: 'obsessionShard', name: '执念残片', kind: 'material', price: 900, sell: 360, desc: '塔顶的心魔留下的东西。' },
  oldKey: { id: 'oldKey', name: '旧钥匙', kind: 'material', price: 0, sell: 120, desc: '从塔层带回来的旧钥匙。' },
  sleepIncense: { id: 'sleepIncense', name: '安眠香', kind: 'material', price: 0, sell: 160, desc: '安全屋里剩下的安眠香。' },
};

// 装备只认 equipment.js 一份目录，避免商店/宝箱/UI 三套 ID 漂移。
export const EQUIPMENT_DEFS = EQUIPMENT;

export const SHOP_DEFS: Record<string, AnyRecord> = {
  clinic: {
    id: 'clinic',
    name: '回响诊所',
    npc: '白衣的医生',
    tagline: '先治伤，再谈命。',
    stock: ['painkiller', 'strongPainkiller', 'revive', 'coolPatch', 'calmPill'],
  },
  arms: {
    id: 'arms',
    name: '黑鸦军品',
    npc: '戴墨镜的店主',
    tagline: '刀、枪、护具。别问来路。',
    stock: ['scout-knife', 'iron-knife', 'black-fang', 'kevlar-vest', 'old-watch', 'silver-ring', 'smokeBomb', 'enhanceStone'],
  },
  vending: {
    id: 'vending',
    name: '月见坂自动贩卖机',
    npc: '发光的机器',
    tagline: '深夜也亮着。',
    stock: ['energyDrink', 'sportsDrink'],
  },
};

export const CHEST_DEFS: Record<string, AnyRecord> = {
  wood: { id: 'wood', name: '木箱', tier: 1, desc: '普通补给。钉子有点松。' },
  silver: { id: 'silver', name: '银箱', tier: 2, desc: '更稀有的补给。锁扣是银的。' },
  gold: { id: 'gold', name: '金箱', tier: 3, desc: '稀有装备。打开前先听一听。' },
  sealed: { id: 'sealed', name: '元素封印箱', tier: 3, seal: 'charm', desc: '需要对应属性的力量才能打开。' },
  trapped: { id: 'trapped', name: '陷阱箱', tier: 2, trap: true, desc: '打开前最好先检查。' },
};

export const ELEMENT_LABELS: Record<string, string> = {
  knowledge: '知识',
  guts: '勇气',
  dexterity: '灵巧',
  kindness: '体贴',
  charm: '魅力',
};

const randomInt = (rng: Rng, min: number, max: number): number => (
  min + Math.floor(rng() * (max - min + 1))
);

export function createWallet(money = 8000): AnyRecord {
  return {
    money,
    heroHp: 120,
    heroMaxHp: 120,
    inventory: { painkiller: 2, sportsDrink: 1 },
    ownedEquipment: ['training-blade', 'school-jacket'],
    equipment: { weapon: 'training-blade', armor: 'school-jacket', accessory: null },
    log: ['钱包里还剩 ¥8,000。'],
  };
}

export function definitionOf(id: string): AnyRecord | null {
  return ITEM_DEFS[id] ?? EQUIPMENT_DEFS[id] ?? null;
}

export function buy(
  wallet: AnyRecord,
  shopId: string,
  id: string,
  qty = 1,
): AnyRecord {
  const shop = SHOP_DEFS[shopId];
  if (!shop) return { ok: false, reason: '没有这家店。' };
  if (!shop.stock.includes(id)) return { ok: false, reason: '这家店不卖这个。' };
  const def = definitionOf(id);
  if (!def) return { ok: false, reason: '没有这个商品。' };
  const total = def.price * qty;
  if (wallet.money < total) return { ok: false, reason: `钱不够（需要 ¥${total}）。` };
  wallet.money -= total;
  if (EQUIPMENT_DEFS[id]) {
    for (let i = 0; i < qty; i++) if (!wallet.ownedEquipment.includes(id)) wallet.ownedEquipment.push(id);
  } else {
    wallet.inventory[id] = (wallet.inventory[id] ?? 0) + qty;
  }
  wallet.log.push(`买下 ${def.name} ×${qty}（¥${total}）。`);
  return { ok: true, spent: total };
}

export function sell(wallet: AnyRecord, id: string, qty = 1): AnyRecord {
  const def = definitionOf(id);
  if (!def) return { ok: false, reason: '没有这个商品。' };
  if (EQUIPMENT_DEFS[id]) {
    if (!wallet.ownedEquipment.includes(id)) return { ok: false, reason: '还没有这件装备。' };
    wallet.ownedEquipment = wallet.ownedEquipment.filter((owned: string) => owned !== id);
    for (const [slot, equipped] of Object.entries(wallet.equipment)) {
      if (equipped === id) wallet.equipment[slot] = null;
    }
    const gain = def.sell * qty;
    wallet.money += gain;
    wallet.log.push(`卖出 ${def.name}（+¥${gain}）。`);
    return { ok: true, gain };
  }
  const count = wallet.inventory[id] ?? 0;
  if (count < qty) return { ok: false, reason: '数量不够。' };
  wallet.inventory[id] = count - qty;
  if (wallet.inventory[id] <= 0) delete wallet.inventory[id];
  const gain = def.sell * qty;
  wallet.money += gain;
  wallet.log.push(`卖出 ${def.name} ×${qty}（+¥${gain}）。`);
  return { ok: true, gain };
}

export function equip(wallet: AnyRecord, slot: string, id: string): AnyRecord {
  const def = EQUIPMENT_DEFS[id];
  if (!def || def.slot !== slot) return { ok: false, reason: '这件装备不对应这个栏位。' };
  if (!wallet.ownedEquipment.includes(id)) return { ok: false, reason: '还没有这件装备。' };
  wallet.equipment[slot] = id;
  wallet.log.push(`装备 ${def.name}。`);
  return { ok: true };
}

export function statsOf(wallet: AnyRecord): { attack: number; defense: number } {
  const weapon = EQUIPMENT_DEFS[wallet.equipment.weapon];
  const armor = EQUIPMENT_DEFS[wallet.equipment.armor];
  const accessory = EQUIPMENT_DEFS[wallet.equipment.accessory];
  return {
    attack: weapon?.attack ?? 0,
    defense: (armor?.defense ?? 0) + (accessory?.defense ?? 0),
  };
}

function chestLoot(chest: AnyRecord, rng: Rng): AnyRecord[] {
  const loot: AnyRecord[] = [];
  if (chest.tier === 1) {
    loot.push({ type: 'money', amount: randomInt(rng, 300, 700) });
    loot.push(rng() < 0.5
      ? { type: 'item', id: 'painkiller', qty: 1 }
      : { type: 'item', id: 'sportsDrink', qty: 1 });
  } else if (chest.tier === 2) {
    loot.push({ type: 'money', amount: randomInt(rng, 700, 1400) });
    loot.push(rng() < 0.5
      ? { type: 'item', id: 'strongPainkiller', qty: 1 }
      : { type: 'item', id: 'energyDrink', qty: 1 });
    if (rng() < 0.35) loot.push({ type: 'equipment', id: 'silver-ring' });
  } else {
    loot.push({ type: 'money', amount: randomInt(rng, 1400, 2600) });
    loot.push(rng() < 0.5
      ? { type: 'equipment', id: 'black-fang' }
      : { type: 'equipment', id: 'moonlight-coat' });
    if (rng() < 0.6) loot.push({ type: 'item', id: 'revive', qty: 1 });
  }
  if (rng() < 0.45) {
    const shards = ['emberShard', 'frostShard', 'windShard', 'psyShard', 'physShard'];
    loot.push({ type: 'item', id: shards[Math.floor(rng() * shards.length)], qty: 1 });
  }
  return loot;
}

function grantLoot(wallet: AnyRecord, loot: AnyRecord[]): void {
  for (const entry of loot) {
    if (entry.type === 'money') wallet.money += entry.amount;
    else if (entry.type === 'equipment') {
      if (!wallet.ownedEquipment.includes(entry.id)) wallet.ownedEquipment.push(entry.id);
    } else if (entry.type === 'item') {
      wallet.inventory[entry.id] = (wallet.inventory[entry.id] ?? 0) + (entry.qty ?? 1);
    }
  }
}

export function openChest(
  wallet: AnyRecord,
  chestId: string,
  {
    element,
    inspect = false,
    rng = Math.random,
  }: { element?: string; inspect?: boolean; rng?: Rng } = {},
): AnyRecord {
  const chest = CHEST_DEFS[chestId];
  if (!chest) return { ok: false, reason: '没有这个宝箱。' };
  let damage = 0;
  if (chest.seal && element !== chest.seal) {
    damage = 20;
    wallet.heroHp = Math.max(1, wallet.heroHp - damage);
    const label = ELEMENT_LABELS[chest.seal] ?? chest.seal;
    wallet.log.push(`封印反弹：需要「${label}」属性，受到 ${damage} 伤害。`);
    return { ok: false, reason: `封印没有解开。需要「${label}」属性。`, damage, loot: [] };
  }
  if (chest.trap && !inspect) {
    damage = 15;
    wallet.heroHp = Math.max(1, wallet.heroHp - damage);
    wallet.log.push(`陷阱触发，受到 ${damage} 伤害。`);
  }
  const loot = chestLoot(chest, rng);
  grantLoot(wallet, loot);
  const summary = loot.map(entry => {
    if (entry.type === 'money') return `¥${entry.amount}`;
    const def = definitionOf(entry.id);
    return `${def?.name ?? entry.id}${entry.qty ? ` ×${entry.qty}` : ''}`;
  }).join(' · ');
  wallet.log.push(`${chest.name}：${summary}`);
  return { ok: true, damage, loot, summary };
}
