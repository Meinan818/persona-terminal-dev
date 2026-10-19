import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createExplorationState,
  createFloorMap,
  disarmTrap,
  listen,
  move,
  openChest,
  resolveEncounter,
  restInSafeRoom,
  takeKey,
  visibleRooms,
} from './floor-map.js';

const roomAt = (state, x, y) => state.map.rooms[`${x},${y}`];

test('每层生成入口、出口、守卫、钥匙和侧房', () => {
  const map = createFloorMap({ floor: 1, seed: 7 });
  assert.equal(map.rooms[`${map.start.x},${map.start.y}`].type, 'start');
  assert.equal(map.rooms[`${map.exit.x},${map.exit.y}`].type, 'exit');
  assert.equal(map.rooms[map.guardianId].type, 'guardian');
  assert.ok(map.keyId);
  assert.equal(map.rooms[map.keyId].type, 'key');
  assert.ok(Object.values(map.rooms).some(room => room.type === 'chest'));
});

test('初始只揭示入口周围，移动会揭雾并推进回合', () => {
  const state = createExplorationState(createFloorMap({ floor: 1, seed: 7 }));
  assert.ok(visibleRooms(state).length >= 1);
  const beforeTurn = state.turn;
  const result = move(state, 'right');
  assert.equal(result.ok, true);
  assert.equal(state.turn, beforeTurn + 1);
  assert.ok(visibleRooms(state).length > 1);
});

test('守卫会拦住出口，击破后才解锁', () => {
  const map = createFloorMap({ floor: 1, seed: 7 });
  const state = createExplorationState(map);
  const guardian = map.rooms[map.guardianId];
  const neighbor = [
    { x: guardian.x - 1, y: guardian.y, direction: 'right' },
    { x: guardian.x + 1, y: guardian.y, direction: 'left' },
    { x: guardian.x, y: guardian.y - 1, direction: 'down' },
    { x: guardian.x, y: guardian.y + 1, direction: 'up' },
  ].find(point => point.x >= 0 && point.y >= 0 && point.x < map.width && point.y < map.height);
  state.player = { x: neighbor.x, y: neighbor.y };
  const encounter = move(state, neighbor.direction);
  assert.equal(encounter.ok, true);
  assert.equal(encounter.encounter?.guardian, true);
  assert.equal(resolveEncounter(state, { won: true }).guardianDefeated, true);
  assert.equal(state.exitUnlocked, true);
});

test('钥匙、宝箱、机关和安全屋各自结算一次', () => {
  const map = createFloorMap({ floor: 10, seed: 7 });
  const state = createExplorationState(map);
  const key = map.rooms[map.keyId];
  state.player = { x: key.x, y: key.y };
  assert.equal(takeKey(state), true);
  assert.equal(state.keys, 1);
  assert.equal(takeKey(state), false);

  const chest = Object.values(map.rooms).find(room => room.type === 'chest');
  state.player = { x: chest.x, y: chest.y };
  assert.equal(openChest(state).ok, true);
  assert.equal(openChest(state).ok, false);

  const trap = Object.values(map.rooms).find(room => room.type === 'trap');
  state.player = { x: trap.x, y: trap.y };
  const before = state.security;
  assert.equal(disarmTrap(state), true);
  assert.ok(state.security <= before);

  state.player = { x: map.rooms[map.guardianId].x, y: map.rooms[map.guardianId].y };
  assert.equal(resolveEncounter(state, { won: true }).ok, true);
  const safe = Object.values(map.rooms).find(room => room.type === 'safe');
  state.player = { x: safe.x, y: safe.y };
  state.security = 40;
  assert.equal(restInSafeRoom(state), true);
  assert.equal(state.security, 20);
  assert.equal(restInSafeRoom(state), false);
});

test('越界移动失败，警戒满会进入警报', () => {
  const state = createExplorationState(createFloorMap({ floor: 1, seed: 7 }));
  assert.equal(move(state, 'left').ok, false);
  state.security = 99;
  assert.equal(move(state, 'right').ok, true);
  assert.equal(state.alert, true);
});

test('钥匙可以在出口直接开锁，并消耗一把', () => {
  const map = createFloorMap({ floor: 1, seed: 7 });
  const state = createExplorationState(map);
  const exit = map.rooms[`${map.exit.x},${map.exit.y}`];
  state.player = { x: exit.x - 1, y: exit.y };
  state.keys = 1;
  const result = move(state, 'right');
  assert.equal(result.ok, true);
  assert.equal(state.exitUnlocked, true);
  assert.equal(state.keys, 0);
});

test('区段守层者未死时，钥匙不能打开出口', () => {
  const map = createFloorMap({ floor: 10, seed: 7 });
  const state = createExplorationState(map);
  assert.equal(map.rooms[map.guardianId].blockBoss, true);
  const exit = map.rooms[`${map.exit.x},${map.exit.y}`];
  state.player = { x: exit.x - 1, y: exit.y };
  state.keys = 1;
  const blocked = move(state, 'right');
  assert.equal(blocked.ok, false);
  assert.match(blocked.reason, /守层者/);
  assert.equal(state.keys, 1);
  state.guardianDefeated = true;
  const opened = move(state, 'right');
  assert.equal(opened.ok, true);
  assert.equal(state.exitUnlocked, true);
  assert.equal(state.keys, 0);
});

test('陷阱匣直接开会触发，先检查会花一步避开', () => {
  const map = createFloorMap({ floor: 30, seed: 7 });
  const state = createExplorationState(map);
  const chests = Object.values(map.rooms).filter(room => room.type === 'chest');
  assert.ok(chests.length >= 2);

  const direct = chests[0];
  direct.chestKind = 'trapped';
  state.player = { x: direct.x, y: direct.y };
  state.time = 10;
  const opened = openChest(state);
  assert.equal(opened.ok, true);
  assert.equal(opened.trapped, true);
  assert.equal(state.time, 10);

  const safe = chests[1];
  safe.chestKind = 'trapped';
  state.player = { x: safe.x, y: safe.y };
  state.time = 10;
  const inspected = openChest(state, { inspect: true });
  assert.equal(inspected.ok, true);
  assert.equal(inspected.trapped, false);
  assert.equal(state.time, 9);
});

test('倾听会揭示更远的房间，但消耗一步并提高警戒', () => {
  const state = createExplorationState(createFloorMap({ floor: 1, seed: 7 }));
  const beforeTime = state.time;
  const beforeSecurity = state.security;
  assert.equal(listen(state).ok, true);
  assert.equal(state.time, beforeTime - 1);
  assert.ok(state.security > beforeSecurity);
  assert.ok(visibleRooms(state).length >= 3);
});

test('步数用完后不能再移动', () => {
  const state = createExplorationState(createFloorMap({ floor: 1, seed: 7 }), { maxTime: 1 });
  assert.equal(move(state, 'right').ok, true);
  assert.equal(state.time, 0);
  const blocked = move(state, 'down');
  assert.equal(blocked.ok, false);
  assert.equal(state.ended, 'timeout');
});
