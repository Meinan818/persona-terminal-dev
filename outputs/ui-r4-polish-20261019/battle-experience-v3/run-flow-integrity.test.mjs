import test from 'node:test';
import assert from 'node:assert/strict';
import { createDungeonRun } from './dungeon-run.js';
import { createTowerFlow } from './tower-flow.js';

function harness(t, mismatch = false) {
  const model = createDungeonRun({ seed: 7 });
  model.start();
  const e = model.beginFloor(10), j = model.journey;
  const room = j.map.rooms[j.map.guardianId];
  e.player = mismatch ? { ...j.map.start } : { x: room.x, y: room.y };
  j.pending = { kind: 'guardian', floor: 10, roomId: room.id, resolved: false, blockBoss: true };
  const store = new Map([['maskaria.p5r.run.v1', JSON.stringify({ version: 1, journey: { ...j, map: null, explore: null }, map: j.map, explore: { ...e, map: null, listened: [] } })]]);
  for (const [key, value] of Object.entries({ location: { search: '' }, document: { addEventListener() {} }, requestAnimationFrame: () => 0, cancelAnimationFrame() {}, localStorage: { getItem: key => store.get(key) ?? null, setItem: (key, value) => store.set(key, value), removeItem: key => store.delete(key) } })) {
    const old = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
    t.after(() => old ? Object.defineProperty(globalThis, key, old) : delete globalThis[key]);
  }
  const state = { towerStratum: 'echo', hp: 52, sp: 34, heroMaxHp: 52, heroMaxSp: 34, money: 1000, equipment: {}, equipmentLevels: {}, battleLoot: [], battleItems: {}, materials: {}, ownedEquipment: [], activePersonaId: 'arsene', personaRoster: ['arsene'] };
  const flow = createTowerFlow({ state, icon: () => '', render() {}, reduced: { matches: true }, goRoom() {}, persistP5State() {} });
  flow.act('continue-run');
  assert.equal(flow.pendingBattle, true);
  return { flow, state, store };
}

test('异常旧存档的遭遇与房间不一致时，战后入口不得发钱掉落或经验', t => {
  const { flow, state } = harness(t, true);
  const before = JSON.stringify(state);
  flow.battleReturn(true, 1, { drops: [], reward: { sp: 12 } });
  assert.equal(JSON.stringify(state), before);
  assert.equal(flow.pendingBattle, true);
});

test('合法守层者战后只结算一次，刷新快照已清除 pending', t => {
  const { flow, state, store } = harness(t);
  flow.battleReturn(true, 1, { drops: [], reward: { sp: 12 } });
  assert.ok(state.money > 1000);
  assert.equal(flow.pendingBattle, false);
  assert.equal(JSON.parse(store.get('maskaria.p5r.run.v1')).journey.pending, null);
  const once = JSON.stringify(state);
  flow.battleReturn(true, 1, { drops: [], reward: { sp: 12 } });
  assert.equal(JSON.stringify(state), once);
});

test('默认新行程使用新的随机种子，而显式 seed=0 仍可复现', t => {
  let random = 0;
  t.mock.method(Math, 'random', () => (random += 0.1));
  const model = createDungeonRun();
  model.start();
  const first = model.journey.runSeed;
  model.start();
  assert.notEqual(model.journey.runSeed, first);
  const fixed = createDungeonRun({ seed: 0 });
  fixed.start();
  assert.equal(fixed.journey.runSeed, 0);
  fixed.start();
  assert.equal(fixed.journey.runSeed, 0);
});


test('最终Boss结算后移除可继续行程，刷新不能复活同一Boss重复领奖', t => {
  const { state, store } = harness(t);
  const model = createDungeonRun({ seed: 7 });model.start();model.beginFloor(39);
  store.set('maskaria.p5r.run.v1', JSON.stringify({ version: 1, journey: model.journey, map: null, explore: null }));
  const flow = createTowerFlow({ state, icon: () => '', render() {}, reduced: { matches: true }, goRoom() {}, startFight() {}, persistP5State() {} });
  flow.act('continue-run');flow.act('send-calling');flow.act('enter');
  assert.equal(flow.pendingBattle, true);
  flow.battleReturn(true, 2, { drops: [], summary: '两阶段战斗胜利' });
  assert.equal(flow.snapshot.ended, 'clear');
  assert.equal(store.has('maskaria.p5r.run.v1'), false);
});
