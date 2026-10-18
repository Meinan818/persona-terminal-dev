import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeNegotiation,
  offlineNegotiation,
  requestNegotiation,
} from './negotiation-ai.js';
import { OPTION_ORDER } from './negotiation-rules.js';

const input = {
  enemy: { name: '聒噪的假面', attribute: '魅力' },
  persona: { name: '奥丁·全知', attribute: '知识' },
  player: { sp: 217 },
};

test('离线影子按属性给出人格、四种交涉台词、收服与奖励', () => {
  const result = offlineNegotiation(input);
  assert.equal(result.mode, 'offline');
  assert.equal(result.personality, 'greedy');
  assert.deepEqual(Object.keys(result.options), OPTION_ORDER);
  assert.ok(result.recruit.name);
  assert.ok(result.recruit.skillName);
  assert.ok(result.reward.sp > 0);
  assert.ok(result.reward.item);
});

test('坏 JSON / 缺字段会补齐为离线影子', () => {
  const result = normalizeNegotiation({
    personality: 'unknown',
    opening: '  你只看见了一半。 ',
    options: { threaten: '别动。' },
  }, input);
  assert.equal(result.personality, 'greedy');
  assert.equal(result.opening, '你只看见了一半。');
  assert.deepEqual(Object.keys(result.options), OPTION_ORDER);
  assert.ok(result.options.reason.length > 0);
  assert.ok(result.recruit.name);
});

test('没有 bridge 时 requestNegotiation 落到离线影子', async () => {
  const previous = globalThis.MASKARIA_NEGOTIATION_AI;
  delete globalThis.MASKARIA_NEGOTIATION_AI;
  const result = await requestNegotiation(input);
  assert.equal(result.mode, 'offline');
  if (previous) globalThis.MASKARIA_NEGOTIATION_AI = previous;
});
