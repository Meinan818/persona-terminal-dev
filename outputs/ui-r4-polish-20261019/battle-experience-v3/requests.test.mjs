import test from 'node:test';
import assert from 'node:assert/strict';
import { REQUESTS, createRequest, recordRequest, requestForStratum } from './requests.js';

test('每座塔对应一个短请求', () => {
  assert.equal(requestForStratum('echo'), 'elite');
  assert.equal(requestForStratum('vanity'), 'keys');
  assert.equal(requestForStratum('escape'), 'safe');
});

test('请求只记录对应事件，并在达到目标时完成', () => {
  const keys = createRequest('keys');
  assert.equal(keys.target, 2);
  assert.equal(recordRequest(keys, 'elite').completed, false);
  const first = recordRequest(keys, 'key').request;
  assert.equal(first.progress, 1);
  const second = recordRequest(first, 'key');
  assert.equal(second.completed, true);
  assert.equal(second.request.progress, 2);
});

test('完成的请求不会继续累加', () => {
  const done = { ...createRequest('safe'), progress: 1, completed: true };
  const result = recordRequest(done, 'safe');
  assert.equal(result.completed, false);
  assert.equal(result.request.progress, 1);
});

test('请求奖励有独立的钱和物品', () => {
  assert.equal(REQUESTS.elite.money, 900);
  assert.equal(REQUESTS.boss.item, '心魔的残片');
});
