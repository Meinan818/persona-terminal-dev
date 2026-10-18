import test from 'node:test';
import assert from 'node:assert/strict';
import { PERSONALITIES } from './negotiation-rules.js';
import { SHADOW_ATTRIBUTES, shadowProfileFor } from './grid-negotiation.js';

test('影子资料在同一层保持一致', () => {
  const first = shadowProfileFor({ name: '诡辩之影', level: 6 }, 6);
  const again = shadowProfileFor({ name: '诡辩之影', level: 6 }, 6);
  assert.deepEqual(first, again);
});

test('影子资料给出白名单内的人格、属性和开场', () => {
  const profile = shadowProfileFor({ name: '档案室看守', level: 12 }, 12);
  assert.ok(SHADOW_ATTRIBUTES.includes(profile.attribute));
  assert.ok(PERSONALITIES[profile.personality]);
  assert.equal(profile.personalityLabel, PERSONALITIES[profile.personality].label);
  assert.ok(profile.opening.length > 0);
  assert.ok(profile.demand.length > 0);
});

test('没有名字的遭遇也能得到稳定资料', () => {
  const profile = shadowProfileFor({}, 1);
  assert.equal(profile.name, '诡辩之影');
  assert.ok(profile.opening.length > 0);
});
