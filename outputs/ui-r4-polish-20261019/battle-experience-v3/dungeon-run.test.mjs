import test from 'node:test';
import assert from 'node:assert/strict';
import { CALLING_FLOOR, DUNGEON_FLOORS, SAFE_FLOORS, createDungeonRun, routesForFloor } from './dungeon-run.js';

test('第一座塔是 40 层，普通层有三条路线', () => {
  assert.equal(DUNGEON_FLOORS, 40);
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
  model.journey.floor = 16;
  model.journey.selected = 'elite';
  const second = model.enter();
  assert.equal(second.encounter.name, '回声的看门人');
  assert.ok(second.encounter.maxHp > 0);
});

test('每十层守卫成为区段守层者，战斗结算带区段标记', () => {
  const model = createDungeonRun({ seed: 1 });
  model.start();
  model.beginFloor(10);
  const guardian = model.journey.map.rooms[model.journey.map.guardianId];
  assert.equal(guardian.blockBoss, true);
  const neighbor = [
    { x: guardian.x - 1, y: guardian.y, direction: 'right' },
    { x: guardian.x + 1, y: guardian.y, direction: 'left' },
    { x: guardian.x, y: guardian.y - 1, direction: 'down' },
    { x: guardian.x, y: guardian.y + 1, direction: 'up' },
  ].find(point => point.x >= 0 && point.y >= 0 && point.x < model.journey.map.width && point.y < model.journey.map.height);
  model.journey.explore.player = { x: neighbor.x, y: neighbor.y };
  const result = model.mapMove(neighbor.direction);
  assert.equal(result.pending?.blockBoss, true);
  assert.equal(result.pending?.encounter.name, '第1区段的守层者');
});

test('地图战斗被先制后会把警戒压回可继续区间', () => {
  const model = createDungeonRun({ seed: 1 });
  model.start();
  model.beginFloor(10);
  model.journey.explore.security = 100;
  model.journey.explore.alert = true;
  model.journey.security = 100;
  model.journey.alert = true;
  const guardian = model.journey.map.rooms[model.journey.map.guardianId];
  const neighbor = [
    { x: guardian.x - 1, y: guardian.y, direction: 'right' },
    { x: guardian.x + 1, y: guardian.y, direction: 'left' },
    { x: guardian.x, y: guardian.y - 1, direction: 'down' },
    { x: guardian.x, y: guardian.y + 1, direction: 'up' },
  ].find(point => point.x >= 0 && point.y >= 0 && point.x < model.journey.map.width && point.y < model.journey.map.height);
  model.journey.explore.player = { x: neighbor.x, y: neighbor.y };
  const encounter = model.mapMove(neighbor.direction);
  assert.equal(encounter.pending?.ambush, true);
  assert.equal(model.resolveMapBattle(true), true);
  assert.equal(model.journey.security, 65);
  assert.equal(model.journey.alert, false);
});

test('一条完整路线可以走完 40 层并进入 Boss 结算', () => {
  const model = createDungeonRun();
  model.start();
  let guard = 0;
  while (!model.journey.ended && guard < 220) {
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

function mapPathTo(state, target) {
  const start = `${state.player.x},${state.player.y}`;
  const goal = `${target.x},${target.y}`;
  if (start === goal) return [];
  const queue = [start];
  const prev = new Map([[start, null]]);
  while (queue.length) {
    const id = queue.shift();
    const [x, y] = id.split(',').map(Number);
    for (const [dir, dx, dy] of [['up', 0, -1], ['right', 1, 0], ['down', 0, 1], ['left', -1, 0]]) {
      const room = state.map.rooms[`${x + dx},${y + dy}`];
      if (!room || prev.has(room.id)) continue;
      prev.set(room.id, { from: id, dir });
      if (room.id === goal) {
        const path = [];
        let cursor = goal;
        while (cursor !== start) {
          const step = prev.get(cursor);
          path.unshift(step.dir);
          cursor = step.from;
        }
        return path;
      }
      queue.push(room.id);
    }
  }
  return null;
}

function walkMap(model, target) {
  const path = mapPathTo(model.journey.explore, target);
  assert.ok(path, `floor ${model.journey.floor} should have a path`);
  for (const dir of path) {
    const result = model.mapMove(dir);
    assert.equal(result.ok, true);
    if (model.journey.pending && ['guardian', 'shadow'].includes(model.journey.pending.kind)) {
      assert.equal(model.resolveMapBattle(true), true);
    }
  }
}

test('地图层可以从 1F 连续走到 38F，再送预告信并击破 Boss', () => {
  const model = createDungeonRun({ seed: 1000 });
  model.start();
  model.beginFloor(1);
  let guard = 0;
  while (!model.journey.ended && guard < 600) {
    guard += 1;
    const journey = model.journey;
    if (journey.pending?.kind === 'calling') {
      assert.equal(model.sendCallingCard(), true);
      assert.equal(model.resolve({ label: '预告信', detail: 'test' }), true);
      model.advance();
      continue;
    }
    if (journey.floor === journey.maxFloor - 1 && journey.callingCardSent) {
      assert.ok(model.enter());
      model.resolve({ label: 'Boss', detail: 'test' });
      model.advance();
      continue;
    }
    if (!journey.explore) {
      assert.ok(model.beginFloor(journey.floor < 1 ? 1 : journey.floor));
      continue;
    }
    const map = journey.map;
    const guardian = map.rooms[map.guardianId];
    if (guardian?.blockBoss) {
      walkMap(model, guardian);
    } else {
      walkMap(model, map.rooms[map.keyId]);
      assert.equal(model.mapAct('take-key').ok, true);
    }
    walkMap(model, map.rooms[`${map.exit.x},${map.exit.y}`]);
    assert.equal(journey.explore.exitUnlocked, true);
    assert.equal(model.mapAct('leave-floor').ok, true);
  }
  assert.equal(model.journey.ended, 'clear');
  assert.equal(guard < 600, true);
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
  while (!model.journey.ended && model.journey.cycle === 1 && guard < 220) {
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
  assert.equal(model.journey.timeLeft, 20);
  assert.equal(model.journey.timeMax, 20);
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
  assert.equal(model.journey.timeLeft, 20);
  assert.ok(model.journey.map);
});

test('第三十八层出口接预告信，送信后才能进入塔顶 Boss', () => {
  const model = createDungeonRun();
  model.start();
  const explore = model.beginFloor(38);
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

test('每次 run 使用独立层种子，固定种子可复现同一张图', () => {
  const first = createDungeonRun({ seed: 101 });
  first.start();
  const firstMap = first.beginFloor(1);
  const second = createDungeonRun({ seed: 202 });
  second.start();
  const secondMap = second.beginFloor(1);
  assert.notEqual(firstMap.map.seed, secondMap.map.seed);

  const repeat = createDungeonRun({ seed: 101 });
  repeat.start();
  const repeatMap = repeat.beginFloor(1);
  assert.equal(repeatMap.map.seed, firstMap.map.seed);
  assert.deepEqual(repeatMap.map.path, firstMap.map.path);
});

test('装备的额外步数和警戒减免会进入地图', () => {
  const model = createDungeonRun({ seed: 303 });
  model.start();
  model.setRunBonuses({ steps: 2, securityGuard: 1 });
  const explore = model.beginFloor(1);
  assert.equal(explore.maxTime, 22);
  assert.equal(explore.time, 22);
  const moved = model.mapMove('up');
  assert.equal(moved.ok, true);
  assert.equal(explore.security, 0);
});
