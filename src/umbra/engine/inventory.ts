/**
 * 背包与装备实例：把战斗掉落、月匣、商店和强化真正写进同一份状态。
 *
 * state 使用现有字段，避免破坏旧存档：
 * - battleItems：消耗品
 * - materials：素材
 * - ownedEquipment：已获得装备 id
 * - equipmentLevels：装备强化等级 { id: 0..5 }
 */

import {
  EQUIPMENT,
  MAX_EQUIP_LEVEL,
  SLOT_LABELS,
  equipmentSellPrice,
  upgradeCost,
} from './equipment.js';
import { ITEM_DEFS } from './economy-rules.js';

type AnyRecord = Record<string, any>;

export interface InventoryEntries {
  consumables: AnyRecord[];
  materials: AnyRecord[];
  equipment: AnyRecord[];
}

export function ensureInventory(state: AnyRecord): AnyRecord {
  if (!state.battleItems || typeof state.battleItems !== 'object') state.battleItems = {};
  if (!state.materials || typeof state.materials !== 'object') state.materials = {};
  if (!Array.isArray(state.ownedEquipment)) state.ownedEquipment = [];
  if (!state.equipmentLevels || typeof state.equipmentLevels !== 'object') state.equipmentLevels = {};
  return state;
}

export function itemLabel(id: string): string {
  return EQUIPMENT[id]?.name ?? ITEM_DEFS[id]?.name ?? id;
}

export function itemKind(id: string): string {
  if (EQUIPMENT[id]) return 'equipment';
  return ITEM_DEFS[id]?.kind ?? 'unknown';
}

export function grantItem(state: AnyRecord, id: string, qty = 1): AnyRecord {
  ensureInventory(state);
  const count = Math.max(1, Math.floor(Number(qty) || 1));
  if (EQUIPMENT[id]) {
    if (state.ownedEquipment.includes(id)) {
      const value = Math.max(1, Math.round(equipmentSellPrice(EQUIPMENT[id]) * 0.5));
      state.money = (Number(state.money) || 0) + value;
      return { ok: true, kind: 'equipment', id, label: EQUIPMENT[id].name, duplicate: true, money: value };
    }
    state.ownedEquipment.push(id);
    return { ok: true, kind: 'equipment', id, label: EQUIPMENT[id].name, duplicate: false };
  }
  const item = ITEM_DEFS[id];
  if (!item) return { ok: false, kind: 'unknown', id, label: id };
  if (item.kind === 'material') {
    state.materials[id] = (Number(state.materials[id]) || 0) + count;
  } else {
    state.battleItems[id] = (Number(state.battleItems[id]) || 0) + count;
  }
  return { ok: true, kind: item.kind, id, label: item.name, qty: count };
}

export function grantLoot(state: AnyRecord, loot: AnyRecord = {}): AnyRecord {
  ensureInventory(state);
  const lines = [];
  if (Number(loot.money) > 0) {
    state.money = (Number(state.money) || 0) + Number(loot.money);
    lines.push(`¥${Number(loot.money)}`);
  }
  for (const entry of loot.items ?? []) {
    const result = grantItem(state, entry.id, entry.qty ?? 1);
    if (result.ok) lines.push(`${result.label}${result.qty && result.qty > 1 ? ` ×${result.qty}` : ''}`);
  }
  for (const id of loot.equipment ?? []) {
    const result = grantItem(state, id, 1);
    if (result.ok) lines.push(`${result.label}${result.duplicate ? `（重复，折 ¥${result.money}）` : ''}`);
  }
  return { lines, text: lines.join(' · ') };
}

export function sellInventoryItem(state: AnyRecord, id: string, qty = 1): AnyRecord {
  ensureInventory(state);
  const count = Math.max(1, Math.floor(Number(qty) || 1));
  if (EQUIPMENT[id]) {
    const item = EQUIPMENT[id];
    if (!state.ownedEquipment.includes(id)) return { ok: false, reason: '还没有这件装备。' };
    if (state.equipment?.[item.slot] === id) return { ok: false, reason: '装备中的东西不能直接卖掉，先卸下。' };
    if (equipmentSellPrice(item) <= 0) return { ok: false, reason: '这件东西不能卖。' };
    state.ownedEquipment = state.ownedEquipment.filter((owned: string) => owned !== id);
    delete state.equipmentLevels[id];
    const gain = equipmentSellPrice(item);
    state.money = (Number(state.money) || 0) + gain;
    return { ok: true, gain, label: item.name };
  }
  const item = ITEM_DEFS[id];
  if (!item) return { ok: false, reason: '没有这个道具。' };
  const bucket = item.kind === 'material' ? state.materials : state.battleItems;
  const held = Number(bucket[id]) || 0;
  if (held < count) return { ok: false, reason: '数量不够。' };
  bucket[id] = held - count;
  if (bucket[id] <= 0) delete bucket[id];
  const gain = (Number(item.sell) || 0) * count;
  state.money = (Number(state.money) || 0) + gain;
  return { ok: true, gain, label: item.name };
}

export function useInventoryItem(
  state: AnyRecord,
  id: string,
): { ok: boolean; reason?: string; kind?: string; amount?: number; label?: string } {
  ensureInventory(state);
  const item = ITEM_DEFS[id];
  const held = Number(state.battleItems[id]) || 0;
  if (!item || held <= 0) return { ok: false, reason: '背包里没有这个道具。' };
  if (item.kind === 'heal') {
    const max = Number(state.heroMaxHp) || 52;
    const before = Number(state.hp) || 0;
    state.hp = Math.min(max, before + (Number(item.hp) || 0));
    state.battleItems[id] = held - 1;
    if (state.battleItems[id] <= 0) delete state.battleItems[id];
    return { ok: true, kind: 'heal', amount: state.hp - before, label: item.name };
  }
  if (item.kind === 'sp') {
    const max = Number(state.heroMaxSp) || 34;
    const before = Number(state.sp) || 0;
    state.sp = Math.min(max, before + (Number(item.sp) || 0));
    state.battleItems[id] = held - 1;
    if (state.battleItems[id] <= 0) delete state.battleItems[id];
    return { ok: true, kind: 'sp', amount: state.sp - before, label: item.name };
  }
  return { ok: false, reason: '这个道具只能在战斗中使用。' };
}

export function upgradeEquipment(state: AnyRecord, id: string): AnyRecord {
  ensureInventory(state);
  const item = EQUIPMENT[id];
  if (!item) return { ok: false, reason: '没有这件装备。' };
  if (!state.ownedEquipment.includes(id)) return { ok: false, reason: '还没有获得这件装备。' };
  const level = Math.max(0, Math.min(MAX_EQUIP_LEVEL, Number(state.equipmentLevels[id]) || 0));
  if (level >= MAX_EQUIP_LEVEL) return { ok: false, reason: '已经强化到上限。' };
  const cost = upgradeCost(item, level);
  if ((Number(state.money) || 0) < cost.money) return { ok: false, reason: `钱不够（需要 ¥${cost.money}）。` };
  if ((Number(state.materials.enhanceStone) || 0) < cost.stones) {
    return { ok: false, reason: `强化石不够（需要 ${cost.stones} 块）。` };
  }
  state.money -= cost.money;
  state.materials.enhanceStone -= cost.stones;
  if (state.materials.enhanceStone <= 0) delete state.materials.enhanceStone;
  state.equipmentLevels[id] = level + 1;
  return { ok: true, level: level + 1, cost, label: item.name };
}

export function inventoryEntries(state: AnyRecord): InventoryEntries {
  ensureInventory(state);
  const consumables = Object.entries(state.battleItems)
    .map(([id, qty]) => ({ id, qty: Number(qty) || 0, item: ITEM_DEFS[id] }))
    .filter(entry => entry.qty > 0 && entry.item && entry.item.kind !== 'material');
  const materials = Object.entries(state.materials)
    .map(([id, qty]) => ({ id, qty: Number(qty) || 0, item: ITEM_DEFS[id] }))
    .filter(entry => entry.qty > 0);
  const equipment = state.ownedEquipment
    .map((id: string) => EQUIPMENT[id])
    .filter(Boolean)
    .map((item: AnyRecord) => ({
      item,
      level: Math.max(0, Math.min(MAX_EQUIP_LEVEL, Number(state.equipmentLevels[item.id]) || 0)),
      equipped: state.equipment?.[item.slot] === item.id,
      sell: equipmentSellPrice(item as any),
      upgrade: upgradeCost(item as any, Number(state.equipmentLevels[item.id]) || 0),
    }));
  return { consumables, materials, equipment };
}

export function equipmentSummary(item: AnyRecord | null | undefined, level = 0): string {
  if (!item) return '';
  const parts = [];
  if (item.attack) parts.push(`攻 +${Math.round(item.attack * (1 + level * 0.15))}`);
  if (item.defense) parts.push(`防 +${Math.round(item.defense * (1 + level * 0.15))}`);
  if (item.hp) parts.push(`HP +${Math.round(item.hp * (1 + level * 0.15))}`);
  if (item.sp) parts.push(`SP +${Math.round(item.sp * (1 + level * 0.15))}`);
  const effects = item.effects ?? {};
  if (effects.crit) parts.push(`暴击 +${Math.round(effects.crit * 100)}%`);
  if (effects.steps) parts.push(`每层 +${effects.steps} 步`);
  if (effects.securityGuard) parts.push(`移动警戒 -${effects.securityGuard}`);
  if (effects.money) parts.push(`金钱 +${Math.round(effects.money * 100)}%`);
  if (effects.chest) parts.push(`月匣品质 +${effects.chest}`);
  if (effects.drop) parts.push(`掉落 +${Math.round(effects.drop * 100)}%`);
  if (effects.heal) parts.push(`治疗 +${Math.round(effects.heal * 100)}%`);
  if (effects.ambushGuard) parts.push('免疫先制');
  return parts.join(' · ');
}

export function slotLabel(slot: string): string {
  return SLOT_LABELS[slot] ?? slot;
}
