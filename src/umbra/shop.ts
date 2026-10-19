import { buy, EQUIPMENT_DEFS, ITEM_DEFS } from '@/umbra/engine/economy-rules';
import type { UmbraProfile } from '@/umbra/state';

export interface UmbraShopResult {
  ok: boolean;
  reason?: string;
  label?: string;
  spent?: number;
  profile: UmbraProfile;
}

const splitInventory = (inventory: Record<string, number>): {
  battleItems: Record<string, number>;
  materials: Record<string, number>;
} => {
  const battleItems: Record<string, number> = {};
  const materials: Record<string, number> = {};
  for (const [id, qty] of Object.entries(inventory)) {
    if (!(qty > 0)) continue;
    const def: any = (ITEM_DEFS as any)[id];
    if (def?.kind === 'material') materials[id] = qty;
    else battleItems[id] = qty;
  }
  return { battleItems, materials };
};

export function buyUmbraShopItem(
  profile: UmbraProfile,
  shopId: string,
  itemId: string,
  qty = 1,
): UmbraShopResult {
  const def: any = (ITEM_DEFS as any)[itemId] ?? (EQUIPMENT_DEFS as any)[itemId] ?? null;
  if ((EQUIPMENT_DEFS as any)[itemId] && profile.combat.ownedEquipment.includes(itemId)) {
    return { ok: false, reason: `已经拥有「${def?.name ?? itemId}」。`, profile };
  }
  const wallet = {
    money: profile.economy.money,
    inventory: { ...profile.combat.battleItems, ...profile.combat.materials },
    ownedEquipment: [...profile.combat.ownedEquipment],
    equipment: { ...profile.combat.equipment },
    log: [],
  };
  const result = buy(wallet, shopId, itemId, Math.max(1, Math.floor(Number(qty) || 1)));
  if (!result.ok) return { ...result, profile };
  const split = splitInventory(wallet.inventory);
  const label = def?.name ?? itemId;
  return {
    ...result,
    label,
    profile: {
      ...profile,
      updatedAt: new Date(),
      economy: { ...profile.economy, money: wallet.money },
      combat: {
        ...profile.combat,
        ownedEquipment: [...wallet.ownedEquipment],
        battleItems: split.battleItems,
        materials: split.materials,
      },
    },
  };
}
