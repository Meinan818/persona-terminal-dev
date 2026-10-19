import test from 'node:test';
import assert from 'node:assert/strict';
import { createTowerFlow } from './tower-flow.js';
import { useInventoryItem } from './inventory.js';

const RUN_KEY = 'maskaria.p5r.run.v1';
function harness(t) {
  const saves = new Map();
  const globals = {
    location: { search: '?shadow=1&slice-ai=off' },
    document: { addEventListener() {}, querySelector() { return null; } },
    requestAnimationFrame: () => 0, cancelAnimationFrame() {}, scrollTo() {},
    localStorage: { getItem: key => saves.get(key) ?? null, setItem: (key, value) => saves.set(key, value), removeItem: key => saves.delete(key) },
  };
  for (const [key, value] of Object.entries(globals)) {
    const old = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
    t.after(() => old ? Object.defineProperty(globalThis, key, old) : delete globalThis[key]);
  }
  function create(state = {}) {
    state = { personaCreated: true, towerStratum: 'echo', hp: 52, sp: 34, heroMaxHp: 52, heroMaxSp: 34, equipment: {}, equipmentLevels: {}, partyVitals: {}, ...state };
    const flow = createTowerFlow({ state, icon: () => '', render() {}, reduced: { matches: true }, goRoom() {}, persistP5State() {} });
    return { state, flow };
  }
  return { create, saves };
}

test('刷新续档保留行程中的HP/SP、上限与倒下的队员，而不是免费回满', t => {
  const { create, saves } = harness(t);
  const first = create();
  first.flow.act('enter-tower');
  Object.assign(first.state, { hp: 8, sp: 3, heroMaxHp: 68, heroMaxSp: 42, partyVitals: { hero: { hp: 8, sp: 3 }, 'ally-cait-sith': { hp: 0, sp: 0 } } });
  first.flow.act('map-listen');
  const snapshot = JSON.parse(saves.get(RUN_KEY));
  const restored = create();
  restored.flow.act('continue-run');
  assert.equal(restored.state.hp, 8);
  assert.equal(restored.state.sp, 3);
  assert.equal(restored.state.heroMaxHp, 68);
  assert.equal(restored.state.heroMaxSp, 42);
  assert.deepEqual(restored.state.partyVitals, first.state.partyVitals);
  assert.equal(restored.flow.snapshot.floor, snapshot.journey.floor);
});

test('保存的行程包含当时的队员资源，不随后续状态变化', t => {
  const { create, saves } = harness(t);
  const { state, flow } = create({ partyVitals: { ally: { hp: 12, sp: 5 } } });
  flow.act('enter-tower');
  const saved = JSON.parse(saves.get(RUN_KEY));
  state.partyVitals.ally.hp = 1;
  assert.equal(saved.vitals?.partyVitals?.ally?.hp, 12);
});

test('旧行程没有资源快照时仍可续档，不清空现有资源', t => {
  const { create, saves } = harness(t);
  const first = create();first.flow.act('enter-tower');
  const saved = JSON.parse(saves.get(RUN_KEY));delete saved.vitals;
  saves.set(RUN_KEY, JSON.stringify(saved));
  const restored = create({ hp: 19, sp: 7 });restored.flow.act('continue-run');
  assert.equal(restored.state.hp, 19);assert.equal(restored.state.sp, 7);
  assert.equal(restored.flow.snapshot.floor, 1);
});

test('资源快照拒绝空值与非数值，有限资源按合法上限收敛', t => {
  const { create, saves } = harness(t);
  create().flow.act('enter-tower');
  const saved = JSON.parse(saves.get(RUN_KEY));
  saved.vitals = { hp: 999, sp: -8, heroMaxHp: 60, heroMaxSp: 40, partyVitals: { ally: { hp: null, sp: 'bad' } }, money: 999999 };
  saves.set(RUN_KEY, JSON.stringify(saved));
  const { state, flow } = create({ money: 100 });flow.act('continue-run');
  assert.equal(state.hp, 60);assert.equal(state.sp, 0);
  assert.deepEqual(state.partyVitals, {});assert.equal(state.money, 100);
});

test('HP/SP为零是有效状态，续档不会把倒下角色改成初始资源', t => {
  const { create } = harness(t);
  const first = create({ hp: 0, sp: 0, partyVitals: { hero: { hp: 0, sp: 0 } } });
  first.flow.act('enter-tower');
  const restored = create();restored.flow.act('continue-run');
  assert.equal(restored.state.hp, 0);assert.equal(restored.state.sp, 0);
  assert.deepEqual(restored.state.partyVitals.hero, { hp: 0, sp: 0 });
});

test('不合法的上限和空资源不覆盖当前合法值', t => {
  const { create, saves } = harness(t);
  create().flow.act('enter-tower');
  const saved = JSON.parse(saves.get(RUN_KEY));
  saved.vitals = { hp: null, sp: '4', heroMaxHp: -1, heroMaxSp: null, partyVitals: [] };
  saves.set(RUN_KEY, JSON.stringify(saved));
  const { state, flow } = create({ hp: 19, sp: 7, partyVitals: { ally: { hp: 4, sp: 2 } } });
  flow.act('continue-run');
  assert.equal(state.hp, 19);assert.equal(state.sp, 7);
  assert.equal(state.heroMaxHp, 52);assert.equal(state.heroMaxSp, 34);
  assert.deepEqual(state.partyVitals, { ally: { hp: 4, sp: 2 } });
});

test('行程中使用补给后即使不再移动，刷新也保留恢复和道具消耗', t => {
  const { create } = harness(t);
  const first = create({ hp: 8, sp: 3, battleItems: { painkiller: 1, energyDrink: 1 } });
  first.flow.act('enter-tower');first.flow.act('use-item:painkiller');first.flow.act('use-item:energyDrink');
  const restored = create({ battleItems: structuredClone(first.state.battleItems) });restored.flow.act('continue-run');
  assert.equal(restored.state.hp, 48);assert.equal(restored.state.sp, 23);
  assert.deepEqual(restored.state.battleItems, {});
});

test('武库等行程外入口修改资源后可同步检查点，不恢复到喝药前', t => {
  const { create } = harness(t);
  const first = create({ hp: 8, battleItems: { painkiller: 1 } });first.flow.act('enter-tower');
  assert.equal(useInventoryItem(first.state, 'painkiller').ok, true);
  first.flow.checkpoint();
  const restored = create();restored.flow.act('continue-run');
  assert.equal(restored.state.hp, 48);
});
