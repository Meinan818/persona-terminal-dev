import test from 'node:test';
import assert from 'node:assert/strict';
import { CALLING_FLOOR, DUNGEON_FLOORS, SAFE_FLOORS, createDungeonRun, routesForFloor } from './dungeon-run.js';

test('第一座塔是 12 层，普通层有三条路线', () => {
  assert.equal(DUNGEON_FLOORS, 12);
  assert.deepEqual(routesForFloor(1), ['mob', 'chest', 'event']);
  assert.equal(routesForFloor(3).length, 3);
  assert.deepEqual(routesForFloor(SAFE_FLOORS[0]), ['mob']);
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
  model.journey.selected = 'mob';
  model.enter();
  assert.equal(model.journey.pending.kind, 'mob');
  model.resolve({ label: '守卫击破' });
  model.advance();
  assert.equal(model.journey.safeRoomPending, true);
  model.enter();
  assert.equal(model.journey.pending.kind, 'safe');
  assert.equal(model.rest(), true);
  assert.equal(model.journey.security, 48);
  assert.equal(model.rest(), false);
});

test('警戒满时下一场战斗带先制标记，并把警戒压回可继续区间', () => {
  const model = createDungeonRun();
  model.start();
  model.journey.security = 96;
  model.enter();
  assert.equal(model.journey.pending.ambush, true);
  assert.equal(model.journey.pending.encounter.ambush, true);
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
  assert.ok(model.journey.history.length >= DUNGEON_FLOORS);
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

test('无尽模式击败 Boss 后回到下一轮，而不是结束', () => {
  const model = createDungeonRun();
  model.startEndless();
  let guard = 0;
  while (!model.journey.ended && model.journey.cycle === 1 && guard < 20) {
    guard += 1;
    const kind = model.choices()[0];
    model.select(kind);
    const pending = model.enter();
    assert.ok(pending);
    if (pending.kind === 'safe') model.rest();
    if (pending.kind === 'calling') model.sendCallingCard();
    if (pending.kind === 'trap') model.disarmTrap();
    if (pending.kind === 'key') model.takeKey();
    model.resolve({ label: '节点完成' });
    model.advance();
  }
  assert.equal(model.journey.ended, null);
  assert.equal(model.journey.cycle, 2);
  assert.equal(model.journey.floor, 0);
  assert.ok(model.journey.security >= 20);
});

test('房间地图从第一层开始，步数与警戒进入 run', () => {
  const model = createDungeonRun();
  model.start();
  const explore = model.beginFloor(1);
  assert.ok(explore);
  assert.equal(model.journey.floor, 1);
  assert.equal(model.journey.timeLeft, 16);
  assert.equal(model.journey.timeMax, 16);
  assert.equal(model.journey.map.width, 5);
});

test('地图遭遇守卫后必须结算战斗，击破才解锁出口', () => {
  const model = createDungeonRun();
  model.start();
  const explore = model.beginFloor(1);
  const map = model.journey.map;
  const guardian = map.rooms[map.guardianId];
  const neighbor = [
    { x: guardian.x - 1, y: guardian.y, direction: 'right' },
    { x: guardian.x + 1, y: guardian.y, direction: 'left' },
    { x: guardian.x, y: guardian.y - 1, direction: 'down' },
    { x: guardian.x, y: guardian.y + 1, direction: 'up' },
  ].find(point => point.x >= 0 && point.y >= 0 && point.x < map.width && point.y < map.height);
  explore.player = { x: neighbor.x, y: neighbor.y };
  const moved = model.mapMove(neighbor.direction);
  assert.equal(moved.pending.kind, 'guardian');
  assert.equal(explore.exitUnlocked, false);
  assert.equal(model.resolveMapBattle(true), true);
  assert.equal(explore.exitUnlocked, true);
  assert.equal(model.journey.pending, null);
});

test('走到出口会进入下一层，并重置本层步数', () => {
  const model = createDungeonRun();
  model.start();
  const explore = model.beginFloor(1);
  const map = model.journey.map;
  const exit = map.rooms[`${map.exit.x},${map.exit.y}`];
  explore.player = { x: exit.x, y: exit.y };
  explore.exitUnlocked = true;
  explore.time = 3;
  assert.equal(model.mapAct('leave-floor').ok, true);
  assert.equal(model.journey.floor, 2);
  assert.equal(model.journey.timeLeft, 16);
  assert.ok(model.journey.map);
});

test('第十层出口接预告信，送信后才能进入塔顶 Boss', () => {
  const model = createDungeonRun();
  model.start();
  const explore = model.beginFloor(10);
  const map = model.journey.map;
  const exit = map.rooms[`${map.exit.x},${map.exit.y}`];
  explore.player = { x: exit.x, y: exit.y };
  explore.exitUnlocked = true;
  assert.equal(model.mapAct('leave-floor').ok, true);
  assert.equal(model.journey.floor, CALLING_FLOOR);
  assert.equal(model.journey.pending.kind, 'calling');
  assert.equal(model.sendCallingCard(), true);
  assert.equal(model.resolve({ label: '预告信已送出' }), true);
  assert.equal(model.advance(), true);
  assert.equal(model.journey.selected, 'boss');
  const boss = model.enter();
  assert.equal(boss.kind, 'boss');
  assert.equal(model.journey.floor, DUNGEON_FLOORS);
});
