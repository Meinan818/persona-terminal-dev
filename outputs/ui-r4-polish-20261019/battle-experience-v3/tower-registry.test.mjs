import test from 'node:test';
import assert from 'node:assert/strict';
import { TOWER_STRATA, adjustRoute, getStratum } from './tower-registry.js';

test('三座塔共用规则但压力不同', () => {
  assert.equal(TOWER_STRATA.length, 3);
  assert.equal(getStratum('vanity').riskBonus, 2);
  assert.equal(getStratum('escape').riskBonus, -1);
  assert.equal(getStratum('unknown').id, 'echo');
});

test('虚荣剧场把一条路线推向强敌，逃避回廊把一条路线推向机关', () => {
  assert.ok(adjustRoute(['mob', 'chest', 'event'], getStratum('vanity')).includes('elite'));
  const escape = adjustRoute(['mob', 'chest', 'event'], getStratum('escape'));
  assert.ok(escape.includes('trap') || escape.includes('key'));
});
