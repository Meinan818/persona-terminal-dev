import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeJudgment,
  offlineJudgment,
  requestJudgment,
} from './judgment-ai.js';
import { STANCE_ORDER } from './judgment-rules.js';

const input = {
  persona: { name: '观测者', attribute: '知识' },
  evidence: [{ label: '最近 3 天', value: '「温柔」记录 4 次' }],
  round: 1,
  memory: [],
};

test('离线牌面始终给出三种回应，且顺序固定', () => {
  const result = offlineJudgment(input);
  assert.equal(result.mode, 'offline');
  assert.deepEqual(result.responses.map(item => item.stance), STANCE_ORDER);
  assert.ok(result.accusation.text.length > 0);
  assert.equal(result.accusation.weakTo, '知识');
});

test('坏 JSON / 缺字段会补齐为离线牌面', () => {
  const result = normalizeJudgment({
    accusation: { text: '  你只说了一半。 ', attribute: '不存在', weakTo: '勇气' },
    responses: [{ stance: 'accept', line: '是。' }],
  }, input);
  assert.equal(result.accusation.text, '你只说了一半。');
  assert.equal(result.accusation.attribute, '魅力');
  assert.equal(result.accusation.weakTo, '勇气');
  assert.deepEqual(result.responses.map(item => item.stance), STANCE_ORDER);
  assert.ok(result.responses[1].line.length > 0);
});

test('第二回合会引用上一句回应', () => {
  const accepted = offlineJudgment({ ...input, round: 2, memory: [{ stance: 'accept' }] });
  assert.match(accepted.accusation.text, /已经认了/);
  const refuted = offlineJudgment({ ...input, round: 2, memory: [{ stance: 'refute' }] });
  assert.match(refuted.accusation.text, /反叛得很快/);
});

test('没有 bridge 时 requestJudgment 明确落到离线', async () => {
  const previous = globalThis.MASKARIA_JUDGMENT_AI;
  delete globalThis.MASKARIA_JUDGMENT_AI;
  const result = await requestJudgment(input);
  assert.equal(result.mode, 'offline');
  if (previous) globalThis.MASKARIA_JUDGMENT_AI = previous;
});
