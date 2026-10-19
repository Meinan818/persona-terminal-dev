import test from 'node:test';
import assert from 'node:assert/strict';
import { DUNGEON_FLOORS, SAFE_FLOORS, createDungeonRun } from './dungeon-run.js';
import { REGIONS, regionForFloor } from './region-rules.js';
import { createFloorMap } from './floor-map.js';
import { chestTierForFloor, gearTierForFloor, rollChestLoot } from './loot-rules.js';

function exitFloor(model, floor) {
  const explore = model.beginFloor(floor);
  assert.ok(explore);
  explore.player = { ...model.journey.map.exit };
  explore.exitUnlocked = true;
  assert.equal(model.completeFloor(), true);
}

test('新行程为四区 40 层，只有 10/20/30 安全屋', () => {
  assert.equal(DUNGEON_FLOORS, 40);
  assert.deepEqual(SAFE_FLOORS, [10, 20, 30]);
  assert.deepEqual(REGIONS.map(r => [r.from, r.to]), [[1,10],[11,20],[21,30],[31,40]]);
  for (const [floor, id] of [[10,'outer'],[11,'corrode'],[20,'corrode'],[21,'spotlight'],[30,'spotlight'],[31,'elite'],[40,'elite']]) {
    assert.equal(regionForFloor(floor).id, id);
  }
});

test('第 38 层出口接 39 预告信，再到 40 Boss，仅结算一次', () => {
  const model = createDungeonRun({ seed: 12 });
  model.start();
  exitFloor(model, 38);
  assert.equal(model.journey.floor, 39);
  assert.equal(model.journey.pending.kind, 'calling');
  assert.equal(model.sendCallingCard(), true);
  assert.equal(model.resolve({ label: '送信' }), true);
  assert.equal(model.advance(), true);
  assert.equal(model.enter().kind, 'boss');
  assert.equal(model.journey.floor, 40);
  assert.equal(model.resolve({ label: 'Boss 击败' }), true);
  assert.equal(model.advance(), true);
  assert.equal(model.journey.ended, 'clear');
  assert.equal(model.advance(), false);
});

test('39 层直达也有预告信待办，40 层不生成普通守卫地图', () => {
  const model = createDungeonRun();
  model.start();
  assert.equal(model.beginFloor(39), null);
  assert.equal(model.journey.pending?.kind, 'calling');
  assert.equal(model.beginFloor(40), null);
  assert.equal(model.journey.map, null);
  assert.equal(model.journey.explore, null);
});

test('安全屋按当前塔长度生成，40 层不再生成安全屋', () => {
  for (const floor of [10,20,30]) {
    const map = createFloorMap({ floor, seed: 1 });
    assert.ok(Object.values(map.rooms).some(r => r.type === 'safe'));
    assert.equal(map.rooms[map.guardianId].blockBoss, true);
  }
  assert.equal(Object.values(createFloorMap({ floor: 40 }).rooms).some(r => r.type === 'safe'), false);
});

test('40 层内可获得五阶装备和金匣，不再要求爬到 60/80 层', () => {
  assert.deepEqual([1,9,17,25,33].map(f => gearTierForFloor(f)), [1,2,3,4,5]);
  assert.equal(chestTierForFloor(38), 3);
  const chests = Object.values(createFloorMap({ floor: 38, seed: 7 }).rooms).filter(r => r.type === 'chest');
  assert.ok(chests.every(r => r.chestTier === 3));
  assert.ok(chests.every(r => ['gold','trapped'].includes(r.chestKind)));
  const loot = rollChestLoot({ floor: 38, tier: 3, rng: () => 0.1 });
  assert.ok(loot.equipment.includes('eclipse-blade'));
});

test('旧 100 层行程保留区段与 99/100 结尾，新开才切为 40 层', () => {
  const model = createDungeonRun({ seed: 7 });
  model.start();
  model.journey.maxFloor = 100;
  const old = model.beginFloor(65);
  assert.ok(old);
  assert.equal(model.journey.region, 'clock');
  assert.equal(regionForFloor(65, 100).id, 'clock');
  assert.equal(gearTierForFloor(33, 100), 2);
  assert.equal(chestTierForFloor(38, 0, 100), 2);
  exitFloor(model, 98);
  assert.equal(model.journey.pending.floor, 99);
  assert.equal(model.sendCallingCard(), true);
  assert.equal(model.resolve({}), true);
  assert.equal(model.advance(), true);
  assert.equal(model.enter().floor, 100);
  model.start();
  assert.equal(model.journey.maxFloor, 40);
});

test('自定义塔长的预告信也按当前行程计算，不写死 39 或 99', () => {
  const model = createDungeonRun({ floors: 12 });
  model.start();
  exitFloor(model, 10);
  assert.equal(model.journey.pending.floor, 11);
});

test('区段安全屋必须先击破守层者，休息不提前消耗且只结算一次', () => {
  const model = createDungeonRun({ seed: 7 });
  model.start();
  const explore = model.beginFloor(10);
  const safe = Object.values(model.journey.map.rooms).find(r => r.type === 'safe');
  explore.player = { x: safe.x, y: safe.y };
  explore.security = 40;
  assert.equal(model.mapAct('rest').ok, false);
  assert.equal(Boolean(safe.rested), false);
  assert.equal(explore.security, 40);
  const guardian = model.journey.map.rooms[model.journey.map.guardianId];
  explore.player = { x: guardian.x, y: guardian.y };
  model.journey.pending = { kind: 'guardian', roomId: guardian.id, resolved: false, blockBoss: true };
  assert.equal(model.resolveMapBattle(true), true);
  explore.player = { x: safe.x, y: safe.y };
  const security = explore.security;
  assert.equal(model.mapAct('rest').ok, true);
  assert.equal(explore.security, Math.max(0, security - 20));
  assert.equal(model.mapAct('rest').ok, false);
});
