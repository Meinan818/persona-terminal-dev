import { describe, expect, it } from 'vitest';
import {
  buyShopItem,
  createShopState,
  listShopItems,
} from '@/umbra/rules/shop';

describe('UMBRA shop rules', () => {
  it('四类商店都有数据表商品', () => {
    expect(listShopItems('weapon').length).toBeGreaterThan(0);
    expect(listShopItems('item').length).toBeGreaterThan(0);
    expect(listShopItems('clinic').length).toBeGreaterThan(0);
    expect(listShopItems('velvet').length).toBeGreaterThan(0);
  });

  it('用 ¥ 购买并扣库存', () => {
    const state = createShopState(5000);
    const result = buyShopItem(state, 'scout-knife');
    expect(result.ok).toBe(true);
    expect(result.state.money).toBe(3800);
    expect(result.state.inventory['scout-knife']).toBe(1);
  });

  it('心之力不足会拒绝天鹅绒购买', () => {
    const state = createShopState(5000, {}, 1);
    const result = buyShopItem(state, 'fusion-pass');
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('心之力不足。');
  });
});
