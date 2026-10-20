import assert from 'node:assert/strict';
import { test } from 'node:test';
import { adjacentRoomDirection } from './map-interaction.js';

test('相邻房间映射到正确的单步方向', () => {
  const origin = { x: 2, y: 2 };
  assert.equal(adjacentRoomDirection(origin, { x: 2, y: 1 }), 'up');
  assert.equal(adjacentRoomDirection(origin, { x: 3, y: 2 }), 'right');
  assert.equal(adjacentRoomDirection(origin, { x: 2, y: 3 }), 'down');
  assert.equal(adjacentRoomDirection(origin, { x: 1, y: 2 }), 'left');
});

test('当前位置、斜向、跨格和无效坐标不产生移动', () => {
  const origin = { x: 2, y: 2 };
  for (const target of [
    origin,
    { x: 3, y: 3 },
    { x: 0, y: 2 },
    { x: 2, y: 0 },
    null,
    {},
  ]) {
    assert.equal(adjacentRoomDirection(origin, target), null);
  }
  assert.equal(adjacentRoomDirection(null, { x: 2, y: 1 }), null);
});
