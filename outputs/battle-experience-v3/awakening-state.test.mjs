import test from 'node:test';
import assert from 'node:assert/strict';
import { awakeningSummary, buildAwakeningRecord, canEnterTower } from './awakening-state.js';

test('塔门需要影时间与觉醒契约同时成立', () => {
  assert.equal(canEnterTower({ shadowActive: false, personaCreated: false }), false);
  assert.equal(canEnterTower({ shadowActive: true, personaCreated: false }), false);
  assert.equal(canEnterTower({ shadowActive: false, personaCreated: true }), false);
  assert.equal(canEnterTower({ shadowActive: true, personaCreated: true }), true);
});

test('觉醒记录保留契约身份、回声和回答来源', () => {
  const record = buildAwakeningRecord({
    personaId: 'arsene',
    name: '亚森',
    memory: '影时间记住了你这次没有退。',
    diagnosis: '它先借用了旧契约。',
    mode: 'offline',
    traits: '还想再试一次。',
    sources: [0, 3, 9],
    now: 123456,
  });
  assert.equal(record.personaId, 'arsene');
  assert.equal(record.name, '亚森');
  assert.equal(record.mode, 'offline');
  assert.deepEqual(record.sources, [0, 3]);
  assert.equal(record.createdAt, 123456);
  assert.equal(awakeningSummary(record), '亚森 · 旧契约回应');
});

test('未立约时不伪造契约摘要', () => {
  assert.equal(awakeningSummary(null), '尚未立约');
});
