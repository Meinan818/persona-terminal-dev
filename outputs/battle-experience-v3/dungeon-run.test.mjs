import test from 'node:test';
import assert from 'node:assert/strict';
import { CALLING_FLOOR, DUNGEON_FLOORS, SAFE_FLOORS, createDungeonRun, routesForFloor } from './dungeon-run.js';

test('第一座塔是 12 层，普通层有三条路线', () => {
  assert.equal(DUNGEON_FLOORS, 12);
  assert.deepEqual(routesForFloor(1), ['mob', 'chest', 'event']);
  assert.equal(routesForFloor(3).length, 3);
  assert.deepEqual(routesForFloor(SAFE_FLOORS[0]), ['safe']);
  assert.deepEqual(routesForFloor(CALLING_FLOOR), ['calling']);
  assert.deepEqual(routesForFloor(DUNGEON_FLOORS), ['boss']);
});

test('进层会推高警戒，安全屋可以压回警戒并留一次休息', () => {
  const model = createDungeonRun();
  model.start();
  model.enter();
  assert.equal(model.journey.floor, 1);
  assert.equal(model.journey.pending.kind, 'mob');
  assert.equal(model.journey.security, 8);
  model.resolve({ label: '战斗胜利' });
  model.advance();

  model.journey.floor = SAFE_FLOORS[0] - 1;
  model.journey.security = 60;
  model.journey.selected = 'safe';
  model.enter();
  assert.equal(model.journey.pending.kind, 'safe');
  assert.equal(model.rest(), true);
  assert.equal(model.journey.security, 40);
  assert.equal(model.rest(), false);
});

test('警戒满时下一场战斗带先制标记，并把警戒压回可继续区间', () => {
  const model = createDungeonRun();
  model.start();
  model.journey.security = 96;
  model.enter();
  assert.equal(model.journey.pending.ambush, true);
  assert.equal(model.journey.alert, true);
  assert.ok(model.journey.security < 100);
});

test('预告信是 Boss 前置，钥匙与机关各有结算', () => {
  const model = createDungeonRun();
  model.start();
  model.journey.floor = CALLING_FLOOR - 1;
  model.journey.selected = 'calling';
  model.enter();
  assert.equal(model.journey.pending.kind, 'calling');
  assert.equal(model.sendCallingCard(), true);

  model.journey.pending = null;
  model.journey.floor = DUNGEON_FLOORS - 1;
  model.journey.selected = 'boss';
  assert.equal(model.enter()?.kind, 'boss');

  model.journey.pending = { kind: 'key', resolved: false };
  assert.equal(model.takeKey(), true);
  assert.equal(model.journey.keys, 1);

  model.journey.pending = { kind: 'trap', resolved: false };
  const before = model.journey.security;
  assert.equal(model.disarmTrap(), true);
  assert.ok(model.journey.security <= before);
  assert.equal(model.forceTrap(), true);
  assert.ok(model.journey.security >= before);
});

test('Boss 未送预告信时不能直接进入', () => {
  const model = createDungeonRun();
  model.start();
  model.journey.floor = DUNGEON_FLOORS - 1;
  model.journey.selected = 'boss';
  assert.equal(model.enter(), null);
});

test('两个强敌层有独立的守层者名字与更高数值', () => {
  const model = createDungeonRun();
  model.start();
  model.journey.floor = 6;
  model.journey.selected = 'elite';
  const first = model.enter();
  assert.equal(first.encounter.name, '失衡的守层者');
  assert.equal(first.encounter.level, 7);

  model.journey.pending = null;
  model.journey.floor = 9;
  model.journey.selected = 'elite';
  const second = model.enter();
  assert.equal(second.encounter.name, '回声的看门人');
  assert.ok(second.encounter.maxHp > 0);
});

test('一条完整路线可以走完 12 层并进入 Boss 结算', () => {
  const model = createDungeonRun();
  model.start();
  let guard = 0;
  while (!model.journey.ended && guard < 20) {
    guard += 1;
    const choices = model.choices();
    assert.ok(choices.length > 0);
    const kind = choices[0];
    assert.equal(model.select(kind), true);
    const pending = model.enter();
    assert.ok(pending, `floor ${model.journey.floor} should enter`);
    if (pending.kind === 'safe') model.rest();
    if (pending.kind === 'calling') model.sendCallingCard();
    if (pending.kind === 'trap') model.disarmTrap();
    if (pending.kind === 'key') model.takeKey();
    model.resolve({ label: '节点完成' });
    model.advance();
  }
  assert.equal(model.journey.ended, 'clear');
  assert.equal(model.journey.floor, DUNGEON_FLOORS);
  assert.equal(model.journey.history.length, DUNGEON_FLOORS);
  assert.equal(model.journey.callingCardSent, true);
});

test('不同塔层会改变路线与警戒压力', () => {
  assert.ok(routesForFloor(1, DUNGEON_FLOORS, 'vanity').includes('elite'));
  assert.ok(routesForFloor(1, DUNGEON_FLOORS, 'escape').includes('trap'));

  const model = createDungeonRun({ stratum: 'vanity' });
  model.start();
  model.enter();
  assert.equal(model.journey.stratum, 'vanity');
  assert.equal(model.journey.security, 10);
  assert.equal(model.setStratum('escape'), false);
});
