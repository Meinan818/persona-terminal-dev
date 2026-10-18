import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_ROUNDS,
  applyStance,
  advanceRound,
  createTrial,
  stanceAvailability,
  trialEnding,
} from './judgment-rules.js';

const accusation = {
  text: '你总在别人需要时出现，却把自己的疲惫说成「还好」。',
  attribute: '体贴',
  weakTo: '知识',
};

test('认领会积累共鸣和把柄，但不直接拆判词', () => {
  const trial = createTrial();
  const result = applyStance(trial, 'accept', accusation, '是，我确实在躲。');
  assert.equal(result.ok, true);
  assert.equal(result.trial.verdict, 3);
  assert.equal(result.trial.doubt, 1);
  assert.equal(result.trial.resonance, 1);
  assert.equal(result.trial.leverage, 1);
  assert.equal(result.trial.sp, 229);
  assert.equal(result.trial.memory.length, 1);
  assert.equal(result.trial.status, 'judging');
});

test('命中弱点的反叛拆两点判词，普通反叛拆一点', () => {
  const weak = applyStance(createTrial(), 'refute', accusation, '不是所有付出都在讨好。');
  assert.equal(weak.trial.verdict, 1);
  assert.equal(weak.trial.hp, 333);
  assert.equal(weak.trial.sp, 205);

  const normal = applyStance(createTrial(), 'refute', { ...accusation, weakTo: '勇气' }, '不是。');
  assert.equal(normal.trial.verdict, 2);
  assert.equal(normal.trial.hp, 327);
});

test('夺取需要共鸣或把柄，消耗把柄时拆两点并降低动摇', () => {
  const locked = stanceAvailability(createTrial()).exploit;
  assert.equal(locked.enabled, false);
  assert.match(locked.reason, /共鸣/);
  assert.equal(stanceAvailability(createTrial()).refute.reason, '');

  const accepted = applyStance(createTrial(), 'accept', accusation, '是。');
  const exploited = applyStance(accepted.trial, 'exploit', accusation, '那就把「还好」变成一句真话。');
  assert.equal(exploited.ok, true);
  assert.equal(exploited.trial.verdict, 1);
  assert.equal(exploited.trial.doubt, 0);
  assert.equal(exploited.trial.leverage, 0);
  assert.equal(exploited.trial.sp, 221);
});

test('三次反叛可以赢，三次认领会输，混合回应会留下未完成', () => {
  let win = createTrial();
  for (let i = 0; i < MAX_ROUNDS; i++) {
    win = applyStance(win, 'refute', accusation, '不是。').trial;
    if (win.status === 'judging') win = advanceRound(win);
  }
  assert.equal(win.status, 'won');
  assert.equal(trialEnding(win).id, 'won');

  let lose = createTrial();
  for (let i = 0; i < MAX_ROUNDS; i++) {
    lose = applyStance(lose, 'accept', accusation, '是。').trial;
    if (lose.status === 'judging') lose = advanceRound(lose);
  }
  assert.equal(lose.status, 'lost');
  assert.equal(trialEnding(lose).id, 'lost');

  let mixed = createTrial();
  mixed = applyStance(mixed, 'accept', accusation, '是。').trial;
  mixed = advanceRound(mixed);
  mixed = applyStance(mixed, 'exploit', accusation, '那就用这句话。').trial;
  mixed = advanceRound(mixed);
  mixed = applyStance(mixed, 'accept', accusation, '……是。').trial;
  assert.equal(mixed.status, 'unresolved');
  assert.equal(trialEnding(mixed).id, 'unresolved');
});

test('把柄会让下一次反叛被反用', () => {
  const accepted = applyStance(createTrial(), 'accept', accusation, '是。').trial;
  const refuted = applyStance(accepted, 'refute', accusation, '不是。').trial;
  assert.equal(refuted.doubt, 2);
  assert.equal(refuted.leverage, 0);
});
