import test from 'node:test';
import assert from 'node:assert/strict';
import { CALLING_FLOOR, DUNGEON_FLOORS, SAFE_FLOORS, createDungeonRun, routesForFloor } from './dungeon-run.js';

test('第一座塔是 12 层，普通层有三条路线', () => {
  assert.equal(DUNGEON_FLOORS, 12);
  assert.deepEqual(routesForFloor(1), ['mob', 'chest', 'event']);
  assert.equal(routesForFloor(3).length, 3);
  assert.deepEqual(routesForFloor(SAFE_FLOORS[0]), ['safe']);
  assert.deepEqual(routesForFloor(CALLING_FLOOR), ['calling']);
  assert.deepEqual(routesForFloor(DUNGEON_FLOORS), ['boss']);
});

test('进层会推高警戒，安全屋可以压回警戒并留一次休息', () => {
  const model = createDungeonRun();
  model.start();
  model.enter();
  assert.equal(model.journey.floor, 1);
  assert.equal(model.journey.pending.kind, 'mob');
  assert.equal(model.journey.security, 8);
  model.resolve({ label: '战斗胜利' });
  model.advance();

  model.journey.floor = SAFE_FLOORS[0] - 1;
  model.journey.security = 60;
  model.journey.selected = 'safe';
  model.enter();
  assert.equal(model.journey.pending.kind, 'safe');
  assert.equal(model.rest(), true);
  assert.equal(model.journey.security, 40);
  assert.equal(model.rest(), false);
});

test('警戒满时下一场战斗带先制标记，并把警戒压回可继续区间', () => {
  const model = createDungeonRun();
  model.start();
  model.journey.security = 96;
  model.enter();
  assert.equal(model.journey.pending.ambush, true);
  assert.equal(model.journey.alert, true);
  assert.ok(model.journey.security < 100);
});

test('预告信是 Boss 前置，钥匙与机关各有结算', () => {
  const model = createDungeonRun();
  model.start();
  model.journey.floor = CALLING_FLOOR - 1;
  model.journey.selected = 'calling';
  model.enter();
  assert.equal(model.journey.pending.kind, 'calling');
  assert.equal(model.sendCallingCard(), true);

  model.journey.pending = null;
  model.journey.floor = DUNGEON_FLOORS - 1;
  model.journey.selected = 'boss';
  assert.equal(model.enter()?.kind, 'boss');

  model.journey.pending = { kind: 'key', resolved: false };
  assert.equal(model.takeKey(), true);
  assert.equal(model.journey.keys, 1);

  model.journey.pending = { kind: 'trap', resolved: false };
  const before = model.journey.security;
  assert.equal(model.disarmTrap(), true);
  assert.ok(model.journey.security <= before);
  assert.equal(model.forceTrap(), true);
  assert.ok(model.journey.security >= before);
});

test('Boss 未送预告信时不能直接进入', () => {
  const model = createDungeonRun();
  model.start();
  model.journey.floor = DUNGEON_FLOORS - 1;
  model.journey.selected = 'boss';
  assert.equal(model.enter(), null);
});
