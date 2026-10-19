import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BRIBE_COST,
  chanceLabel,
  createNegotiation,
  negotiationChance,
  resolveNegotiation,
} from './negotiation-rules.js';

test('交涉初始状态是关闭且未使用', () => {
  const state = createNegotiation();
  assert.equal(state.active, false);
  assert.equal(state.used, false);
  assert.equal(state.phase, null);
});

test('傲慢的影子吃讨好，不吃威胁', () => {
  const base = { personality: 'proud', staggered: true, lowHp: false, weaknessMatch: false, sp: 40 };
  assert.equal(negotiationChance({ ...base, option: 'flatter' }), 80);
  assert.equal(negotiationChance({ ...base, option: 'threaten' }), 40);
});

test('贪婪的影子吃 SP，怯懦的影子怕威胁', () => {
  const base = { staggered: true, lowHp: false, weaknessMatch: false, sp: 40 };
  assert.equal(negotiationChance({ ...base, personality: 'greedy', option: 'bribe' }), 90);
  assert.equal(negotiationChance({ ...base, personality: 'cowardly', option: 'threaten' }), 85);
});

test('SP 不足时不能给 SP，成功率归零', () => {
  const input = { personality: 'greedy', option: 'bribe', staggered: true, lowHp: false, weaknessMatch: false, sp: BRIBE_COST - 1 };
  assert.equal(negotiationChance(input), 0);
  assert.equal(resolveNegotiation(input, 0).success, false);
});

test('成功率被夹在 10–90，并给出风险档位', () => {
  const high = { personality: 'greedy', option: 'bribe', staggered: true, lowHp: true, weaknessMatch: true, sp: 99 };
  assert.equal(negotiationChance(high), 90);
  assert.equal(chanceLabel(90), '较稳');
  assert.equal(chanceLabel(50), '五五');
  assert.equal(chanceLabel(20), '冒险');
});

test('一次判定只返回成功或失败', () => {
  const input = { personality: 'calm', option: 'reason', staggered: true, lowHp: false, weaknessMatch: false, sp: 20 };
  assert.equal(resolveNegotiation(input, 0).success, true);
  assert.equal(resolveNegotiation(input, 0.99).success, false);
});
