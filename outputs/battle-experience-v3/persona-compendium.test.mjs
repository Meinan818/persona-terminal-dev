import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COMPENDIUM,
  fusionResult,
  getPersona,
  recruitCandidates,
  validateCompendium,
} from './persona-compendium.js';

test('图鉴定义完整且没有重复', () => {
  assert.deepEqual(validateCompendium(), []);
  assert.ok(COMPENDIUM.length >= 20);
});

test('融合只会产出图鉴里已有的 Persona', () => {
  assert.equal(fusionResult('observer', 'rebel')?.id, 'pleiades');
  assert.equal(fusionResult('weaver', 'echo')?.id, 'loki');
  const fallback = fusionResult('odin', 'loki');
  assert.ok(!fallback || getPersona(fallback.id));
});

test('收服候选只来自图鉴且排除融合限定', () => {
  const candidates = recruitCandidates('knowledge', 8);
  assert.ok(candidates.length > 0);
  assert.ok(candidates.every(persona => persona.recruitFrom === 'knowledge' && !persona.fusionOnly));
});
