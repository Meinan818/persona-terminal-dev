import test from 'node:test';
import assert from 'node:assert/strict';
import { equipmentBonuses, equipmentEffects } from './equipment.js';
import {
  grantItem,
  grantLoot,
  inventoryEntries,
  sellInventoryItem,
  useInventoryItem,
  upgradeEquipment,
} from './inventory.js';

const makeState = () => ({
  money: 5000,
  battleItems: {},
  materials: {},
  ownedEquipment: ['training-blade'],
  equipment: { weapon: 'training-blade', armor: null, accessory: null },
  equipmentLevels: {},
});

test('道具、素材和装备会进入各自背包', () => {
  const state = makeState();
  grantItem(state, 'painkiller', 2);
  grantItem(state, 'enhanceStone', 3);
  grantItem(state, 'scout-knife', 1);
  assert.equal(state.battleItems.painkiller, 2);
  assert.equal(state.materials.enhanceStone, 3);
  assert.ok(state.ownedEquipment.includes('scout-knife'));
});

test('重复装备会折成金钱，不会无限加装备', () => {
  const state = makeState();
  const before = state.money;
  const result = grantItem(state, 'training-blade', 1);
  assert.equal(result.duplicate, true);
  assert.ok(state.money > before);
  assert.equal(state.ownedEquipment.filter(id => id === 'training-blade').length, 1);
});

test('战利品可以一次写入钱、消耗品、素材和装备', () => {
  const state = makeState();
  const result = grantLoot(state, {
    money: 300,
    items: [{ id: 'painkiller', qty: 2 }, { id: 'enhanceStone', qty: 1 }],
    equipment: ['kevlar-vest'],
  });
  assert.equal(state.money, 5300);
  assert.equal(state.battleItems.painkiller, 2);
  assert.equal(state.materials.enhanceStone, 1);
  assert.ok(state.ownedEquipment.includes('kevlar-vest'));
  assert.match(result.text, /止痛药/);
});

test('出售消耗品会加钱，装备中的装备不能直接卖', () => {
  const state = makeState();
  grantItem(state, 'painkiller', 1);
  grantItem(state, 'black-fang', 1);
  state.equipment.weapon = 'black-fang';
  assert.equal(sellInventoryItem(state, 'painkiller', 1).ok, true);
  assert.equal(sellInventoryItem(state, 'black-fang', 1).ok, false);
  state.equipment.weapon = null;
  assert.equal(sellInventoryItem(state, 'black-fang', 1).ok, true);
});

test('消耗品可以在据点直接使用', () => {
  const state = makeState();
  state.hp = 10;
  grantItem(state, 'painkiller', 1);
  const result = useInventoryItem(state, 'painkiller');
  assert.equal(result.ok, true);
  assert.equal(state.hp, 50);
  assert.equal(state.battleItems.painkiller, undefined);
});

test('强化消耗钱和强化石，并提高装备数值', () => {
  const state = makeState();
  state.money = 20000;
  state.materials.enhanceStone = 3;
  grantItem(state, 'black-fang', 1);
  state.equipment.weapon = 'black-fang';
  const before = equipmentBonuses(state.equipment, state.equipmentLevels).attack;
  const result = upgradeEquipment(state, 'black-fang');
  assert.equal(result.ok, true);
  assert.equal(state.equipmentLevels['black-fang'], 1);
  const after = equipmentBonuses(state.equipment, state.equipmentLevels).attack;
  assert.ok(after > before);
});

test('装备效果会汇总为战斗/探索加成', () => {
  const effects = equipmentEffects({
    weapon: 'vanity-edge',
    armor: 'void-cloak',
    accessory: 'compass-charm',
  });
  assert.ok(effects.crit >= 0.1);
  assert.equal(effects.steps, 1);
  assert.equal(effects.chest, 1);
  assert.equal(effects.ambushGuard, true);
});

test('背包按消耗品、素材和装备分组', () => {
  const state = makeState();
  grantItem(state, 'painkiller', 1);
  grantItem(state, 'enhanceStone', 1);
  grantItem(state, 'scout-knife', 1);
  const entries = inventoryEntries(state);
  assert.equal(entries.consumables.length, 1);
  assert.equal(entries.materials.length, 1);
  assert.ok(entries.equipment.some(entry => entry.item.id === 'scout-knife'));
});
