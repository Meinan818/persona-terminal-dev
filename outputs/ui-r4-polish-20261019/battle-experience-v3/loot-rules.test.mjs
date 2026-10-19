import test from 'node:test';
import assert from 'node:assert/strict';
import {
  chestTierForKind,
  chestTierForFloor,
  gearTierForFloor,
  rollBattleLoot,
  rollChestLoot,
  rollRequestLoot,
} from './loot-rules.js';

const low = () => 0.1;
const high = () => 0.9;

test('深层月匣会提升品质和装备掉落', () => {
  assert.equal(chestTierForFloor(1), 1);
  assert.equal(chestTierForFloor(100), 3);
  assert.equal(gearTierForFloor(100), 5);
  const loot = rollChestLoot({ floor: 100, tier: 3, rng: low });
  assert.ok(loot.money >= 1400);
  assert.ok(loot.items.length >= 1);
  assert.ok(loot.equipment.length >= 1);
});

test('月匣加成会把品质往上推，但不超过金箱', () => {
  assert.equal(chestTierForFloor(1, 1), 2);
  assert.equal(chestTierForFloor(100, 3), 3);
});

test('守卫和普通影子掉落真实背包 id', () => {
  const guardian = rollBattleLoot({ floor: 10, kind: 'guardian', rng: low });
  assert.ok(guardian.items.some(item => item.id === 'enhanceStone'));
  const shadow = rollBattleLoot({ floor: 10, kind: 'shadow', rng: low });
  assert.ok(shadow.items.length > 0);
});

test('区段守层者必掉装备，并多给一块强化石', () => {
  const loot = rollBattleLoot({ floor: 10, kind: 'guardian', blockBoss: true, rng: high });
  assert.equal(loot.items.find(item => item.id === 'enhanceStone')?.qty, 2);
  assert.equal(loot.equipment.length, 1);
  assert.equal(chestTierForKind('wood', 50), 1);
  assert.equal(chestTierForKind('silver', 50), 2);
  assert.equal(chestTierForKind('gold', 50), 3);
  assert.equal(chestTierForKind('trapped', 70), 3);
});

test('三座塔的 Boss 会给各自唯一装备', () => {
  assert.ok(rollBattleLoot({ kind: 'boss', stratum: 'echo', rng: low }).equipment.includes('echo-crown'));
  assert.ok(rollBattleLoot({ kind: 'boss', stratum: 'vanity', rng: low }).equipment.includes('vanity-edge'));
  assert.ok(rollBattleLoot({ kind: 'boss', stratum: 'escape', rng: low }).equipment.includes('escape-boots'));
});

test('请求奖励使用真实素材 id', () => {
  assert.equal(rollRequestLoot('keys').items[0].id, 'oldKey');
  assert.equal(rollRequestLoot('safe').items[0].id, 'sleepIncense');
});
