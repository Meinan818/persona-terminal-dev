export type ShopKind = 'weapon' | 'item' | 'clinic' | 'velvet';
export type ShopCurrency = 'yen' | 'material' | 'heartPower';

export interface ShopItem {
  id: string;
  shop: ShopKind;
  currency: ShopCurrency;
  cost: number;
  stock: number;
  tier: number;
}

export interface ShopState {
  money: number;
  materials: Record<string, number>;
  heartPower: number;
  inventory: Record<string, number>;
}

export const SHOP_KINDS: ShopKind[] = ['weapon', 'item', 'clinic', 'velvet'];

export const SHOP_ITEMS: Record<string, ShopItem> = {
  'scout-knife': { id: 'scout-knife', shop: 'weapon', currency: 'yen', cost: 1200, stock: 1, tier: 1 },
  'painkiller': { id: 'painkiller', shop: 'item', currency: 'yen', cost: 300, stock: 5, tier: 1 },
  'strongPainkiller': { id: 'strongPainkiller', shop: 'clinic', currency: 'yen', cost: 900, stock: 2, tier: 2 },
  'fusion-pass': { id: 'fusion-pass', shop: 'velvet', currency: 'heartPower', cost: 3, stock: 1, tier: 1 },
  'emberShard': { id: 'emberShard', shop: 'velvet', currency: 'material', cost: 1, stock: 3, tier: 1 },
};

export function createShopState(
  money = 8000,
  materials: Record<string, number> = {},
  heartPower = 0,
): ShopState {
  return { money, materials, heartPower, inventory: {} };
}

export function listShopItems(shop: ShopKind): ShopItem[] {
  return Object.values(SHOP_ITEMS).filter(item => item.shop === shop);
}

export function buyShopItem(
  state: ShopState,
  itemId: string,
  qty = 1,
): { ok: boolean; reason?: string; state: ShopState; item?: ShopItem } {
  const item = SHOP_ITEMS[itemId];
  if (!item) return { ok: false, reason: '没有这个商品。', state };
  const count = Math.max(1, Math.floor(qty));
  if (item.stock < count) return { ok: false, reason: '库存不足。', state };

  if (item.currency === 'yen') {
    const total = item.cost * count;
    if (state.money < total) return { ok: false, reason: `钱不够（需要 ¥${total}）。`, state };
    state.money -= total;
  } else if (item.currency === 'material') {
    const held = Number(state.materials[item.id]) || 0;
    if (held < count) return { ok: false, reason: '素材不足。', state };
    state.materials[item.id] = held - count;
  } else {
    const total = item.cost * count;
    if (state.heartPower < total) return { ok: false, reason: '心之力不足。', state };
    state.heartPower -= total;
  }

  state.inventory[itemId] = (state.inventory[itemId] ?? 0) + count;
  item.stock -= count;
  return { ok: true, state, item };
}
