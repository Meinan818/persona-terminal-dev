import test from 'node:test';
import assert from 'node:assert/strict';
import { NPCS, createNpcTrust, trustLabel } from './npcs.js';

test('四个据点 NPC 各有身份和短句', () => {
  assert.equal(NPCS.length, 4);
  assert.ok(NPCS.every(npc => npc.id && npc.name && npc.role && npc.line));
});

test('NPC 关系温度限制在 0–5', () => {
  assert.equal(trustLabel(-2), '陌生');
  assert.equal(trustLabel(3), '愿意多說一句');
  assert.equal(trustLabel(9), '等你回来');
  assert.deepEqual(createNpcTrust(), { velvet: 0, gunsmith: 0, doctor: 0, shopkeeper: 0 });
});
