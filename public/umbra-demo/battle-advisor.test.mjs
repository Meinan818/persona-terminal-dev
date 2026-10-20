import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildBattleAdvisorSnapshot,
  normalizeBattleAdvice,
  offlineBattleAdvice,
  requestBattleAdvice,
} from './battle-advisor.js';

const view = {
  round: 2,
  actorId: 'hero',
  actorName: '主角',
  actorHp: 36,
  actorMaxHp: 52,
  actorSp: 18,
  actorMaxSp: 34,
  actorPersona: '皮克希',
  party: [
    { id: 'hero', name: '主角', hp: 36, maxHp: 52, sp: 18, maxSp: 34, persona: '皮克希' },
    { id: 'ally:cat', name: '猫妖精', hp: 9, maxHp: 40, sp: 8, maxSp: 20, persona: '猫妖精' },
  ],
  enemies: [
    {
      id: 'primary',
      name: '镜面守卫',
      hp: 42,
      maxHp: 80,
      weakness: 'hidden-curse',
      knownAffinities: [{ element: 'electric', affinity: 'weak' }],
      intent: { label: '重击', elementLabel: '物理' },
      enraged: false,
      down: false,
    },
  ],
  actions: [
    {
      type: 'skill',
      id: 'agi',
      label: '吉欧',
      detail: '电击 · 敌方',
      cost: 4,
      element: 'electric',
      targetSide: 'enemy',
      disabled: false,
    },
    {
      type: 'skill',
      id: 'dia',
      label: '迪亚',
      detail: '治疗 · 我方',
      cost: 3,
      element: 'healing',
      targetSide: 'ally',
      disabled: false,
    },
    { type: 'items', label: '道具', detail: '3 件可用', disabled: false },
  ],
};

test('战斗快照只带公开弱点和合法行动', () => {
  const snapshot = buildBattleAdvisorSnapshot(view);
  const text = JSON.stringify(snapshot);
  assert.equal(snapshot.enemies[0].knownAffinities[0].element, 'electric');
  assert.equal(text.includes('hidden-curse'), false);
  assert.deepEqual(snapshot.actions.map(action => action.actionKey), ['skill:agi', 'skill:dia']);
});

test('离线建议优先治疗低血量同伴', () => {
  const snapshot = buildBattleAdvisorSnapshot(view);
  const advice = offlineBattleAdvice(snapshot);
  assert.equal(advice.actionKey, 'skill:dia');
  assert.equal(advice.targetId, 'ally:cat');
  assert.equal(advice.mode, 'offline');
});

test('合法建议可预填，发明行动会被拒绝', () => {
  const snapshot = buildBattleAdvisorSnapshot(view);
  assert.equal(normalizeBattleAdvice({
    actionKey: 'skill:agi',
    targetId: 'primary',
    reason: '电击已确认。',
    confidence: 90,
  }, snapshot).actionKey, 'skill:agi');
  assert.throws(() => normalizeBattleAdvice({
    actionKey: 'skill:megidolaon',
    targetId: 'primary',
    reason: '不存在',
    confidence: 90,
  }, snapshot), /不存在/);
});

test('请求桥异常时回落离线建议', async () => {
  globalThis.MASKARIA_AI = {
    adviseBattle: async () => {
      throw new Error('network down');
    },
  };
  const snapshot = buildBattleAdvisorSnapshot(view);
  const advice = await requestBattleAdvice(snapshot);
  assert.equal(advice.mode, 'offline');
  assert.equal(advice.actionKey, 'skill:dia');
  delete globalThis.MASKARIA_AI;
});

test('取消会立即结束等待，不接收晚到建议', async () => {
  globalThis.MASKARIA_AI = {
    adviseBattle: () => new Promise(() => {}),
  };
  const snapshot = buildBattleAdvisorSnapshot(view);
  const controller = new AbortController();
  const pending = requestBattleAdvice(snapshot, {
    signal: controller.signal,
    timeoutMs: 5_000,
  });
  controller.abort();
  await assert.rejects(pending, error => error.name === 'AbortError');
  delete globalThis.MASKARIA_AI;
});
