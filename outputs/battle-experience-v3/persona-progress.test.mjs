import test from 'node:test';
import assert from 'node:assert/strict';
import { grantPersonaXp, xpNeeded } from './persona-progress.js';

test('经验达到阈值后升级并保留余量', () => {
  assert.equal(xpNeeded(1), 90);
  const result = grantPersonaXp({ xp: 0, level: 1 }, 100);
  assert.equal(result.level, 2);
  assert.equal(result.xp, 10);
  assert.equal(result.leveled, 1);
  assert.equal(result.needed, xpNeeded(2));
});

test('一次战斗可以连续升多级，但不会越过 99', () => {
  const result = grantPersonaXp({ xp: 0, level: 1 }, 10000);
  assert.ok(result.level > 1);
  assert.ok(result.level <= 99);
  assert.ok(result.leveled >= 2);
});

test('负数和空输入不会产生负经验', () => {
  const result = grantPersonaXp({ xp: 0, level: 1 }, -50);
  assert.equal(result.xp, 0);
  assert.equal(result.level, 1);
  assert.equal(result.leveled, 0);
});
