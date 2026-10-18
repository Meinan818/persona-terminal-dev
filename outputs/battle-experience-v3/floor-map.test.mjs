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
  const map = createFloorMap({ floor: 4, seed: 7 });
  const state = createExplorationState(map);
  const key = map.rooms[map.keyId];
  state.player = { x: key.x, y: key.y };
  assert.equal(takeKey(state), true);
  assert.equal(state.keys, 1);
  assert.equal(takeKey(state), false);

  const chest = Object.values(map.rooms).find(room => room.type === 'chest');
  state.player = { x: chest.x, y: chest.y };
  assert.equal(openChest(state), true);
  assert.equal(openChest(state), false);

  const trap = Object.values(map.rooms).find(room => room.type === 'trap');
  state.player = { x: trap.x, y: trap.y };
  const before = state.security;
  assert.equal(disarmTrap(state), true);
  assert.ok(state.security <= before);

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
