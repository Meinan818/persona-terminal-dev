import test from 'node:test';
import assert from 'node:assert/strict';
import { createDungeonRun } from './dungeon-run.js';

function enterRoom(kind = 'shadow') {
  const model = createDungeonRun({ seed: 1 });
  model.start();
  model.beginFloor(1);
  const room = Object.values(model.journey.map.rooms).find(room => room.type === kind);
  const from = [
    { x: room.x - 1, y: room.y, direction: 'right', back: 'left' },
    { x: room.x + 1, y: room.y, direction: 'left', back: 'right' },
    { x: room.x, y: room.y - 1, direction: 'down', back: 'up' },
    { x: room.x, y: room.y + 1, direction: 'up', back: 'down' },
  ].find(point => point.x >= 0 && point.y >= 0 && point.x < 5 && point.y < 5);
  model.journey.explore.player = { x: from.x, y: from.y };
  assert.equal(model.mapMove(from.direction).ok, true);
  return { model, room, from };
}

test('影子尚未解决时，移动不能改变位置、步数或待解决遭遇', () => {
  const { model, from } = enterRoom();
  const before = structuredClone(model.journey);
  const result = model.mapMove(from.back);
  assert.equal(result.ok, false);
  assert.match(result.reason, /遭遇/);
  assert.deepEqual(model.journey, before);
});

test('守卫尚未解决时，倾听不能消耗资源或揭示新房间', () => {
  const { model } = enterRoom('guardian');
  const before = structuredClone(model.journey);
  assert.equal(model.mapAct('listen').ok, false);
  assert.deepEqual(model.journey, before);
});

test('待解决遭遇不能用出口动作或直接完成楼层绕过', () => {
  const { model } = enterRoom();
  const { exit } = model.journey.map;
  model.journey.explore.player = { ...exit };
  model.journey.explore.exitUnlocked = true;
  const before = structuredClone(model.journey);
  assert.equal(model.mapAct('leave-floor').ok, false);
  assert.equal(model.completeFloor(), false);
  assert.deepEqual(model.journey, before);
});

test('胜利解锁移动，同一遭遇不能重复结算', () => {
  const { model, room, from } = enterRoom();
  assert.equal(model.resolveMapBattle(true), true);
  assert.equal(room.cleared, true);
  const history = model.journey.history.length;
  assert.equal(model.resolveMapBattle(true), false);
  assert.equal(model.journey.history.length, history);
  assert.equal(model.mapMove(from.back).ok, true);
});

test('可选宝箱仍可略过，不把所有房间锁成强制交互', () => {
  const { model, from } = enterRoom('chest');
  assert.equal(model.mapMove(from.back).ok, true);
});

test('非战斗节点不能冒充战斗完成并清除待办', () => {
  const { model } = enterRoom('chest');
  const before = structuredClone(model.journey);
  assert.equal(model.resolveMapBattle(true), false);
  assert.deepEqual(model.journey, before);
});

test('位置与遭遇房间不一致时不能清错房间或记入胜利', () => {
  const { model } = enterRoom();
  model.journey.explore.player = { ...model.journey.map.entry };
  const before = structuredClone(model.journey);
  assert.equal(model.resolveMapBattle(true), false);
  assert.deepEqual(model.journey, before);
});

test('败退后迟到的胜利回调不能再次结算', () => {
  const { model } = enterRoom();
  assert.equal(model.resolveMapBattle(false), false);
  const before = structuredClone(model.journey);
  assert.equal(model.resolveMapBattle(true), false);
  assert.deepEqual(model.journey, before);
});
