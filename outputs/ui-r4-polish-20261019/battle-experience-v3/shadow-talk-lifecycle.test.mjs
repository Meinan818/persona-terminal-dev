import test from 'node:test';
import assert from 'node:assert/strict';
import { createTowerFlow } from './tower-flow.js';

const RUN_KEY = 'maskaria.p5r.run.v1';

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const flush = () => new Promise(resolve => setImmediate(resolve));

function harness(t) {
  const store = new Map();
  const globals = {
    location: { search: '?p5r-debug=1&shadow=1' },
    document: {
      addEventListener() {},
      querySelector(selector) {
        if (selector === '#grid-talk-input') return { value: '我想知道你为什么要守在这里。' };
        return null;
      },
    },
    requestAnimationFrame: () => 0,
    cancelAnimationFrame() {},
    scrollTo() {},
    localStorage: {
      getItem: key => store.get(key) ?? null,
      setItem: (key, value) => store.set(key, value),
      removeItem: key => store.delete(key),
    },
  };
  for (const [key, value] of Object.entries(globals)) {
    const old = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
    t.after(() => old ? Object.defineProperty(globalThis, key, old) : delete globalThis[key]);
  }
  const state = {
    personaCreated: true,
    towerStratum: 'echo',
    hp: 52,
    sp: 34,
    heroMaxHp: 52,
    heroMaxSp: 34,
    money: 1000,
    equipment: {},
    equipmentLevels: {},
    battleLoot: [],
    battleItems: {},
    materials: {},
    ownedEquipment: [],
    activePersonaId: 'arsene',
    personaRoster: ['arsene'],
  };
  let fights = 0;
  const flow = createTowerFlow({
    state,
    icon: () => '',
    render() {},
    reduced: { matches: true },
    goRoom() {},
    startFight() { fights += 1; },
    persistP5State() {},
  });
  return { flow, state, store, fights: () => fights };
}

function bridge(t, value) {
  const previous = globalThis.MASKARIA_AI;
  globalThis.MASKARIA_AI = value;
  t.after(() => {
    if (previous === undefined) delete globalThis.MASKARIA_AI;
    else globalThis.MASKARIA_AI = previous;
  });
}

async function openPendingTalk(t, leave) {
  const reply = deferred();
  bridge(t, { judgeShadowTalk: () => reply.promise });
  const env = harness(t);
  env.flow.act('enter-tower');
  env.flow.act('route');
  assert.equal(env.flow.debugShadowTalk(), true);
  env.flow.act('shadow-talk');
  assert.equal(env.flow.page, 'shadow-talk');
  env.flow.act('shadow-talk-send');
  await flush();
  assert.equal(env.flow.page, 'shadow-talk');
  const before = {
    state: JSON.stringify(env.state),
    run: env.store.get(RUN_KEY),
    snapshot: env.flow.snapshot,
  };
  leave(env.flow);
  const settledRun = env.store.get(RUN_KEY);
  reply.resolve({ tone: 'reason', quality: 95, reply: '它听懂了一部分。' });
  await flush();
  return { ...env, before, settledRun };
}

test('交涉退开后的晚到回复不能扣资源、推进房间或改写存档', async t => {
  const env = await openPendingTalk(t, flow => flow.act('shadow-talk-back'));
  assert.equal(env.flow.page, null);
  assert.equal(JSON.stringify(env.state), env.before.state);
  assert.equal(env.store.get(RUN_KEY), env.settledRun);
  assert.equal(env.flow.pendingBattle, true);
});

test('交涉拔刀后的晚到回复不能抢回页面或再次结算', async t => {
  const env = await openPendingTalk(t, flow => flow.act('shadow-talk-fight'));
  assert.equal(env.fights(), 1);
  assert.equal(env.flow.page, null);
  assert.equal(JSON.stringify(env.state), env.before.state);
  assert.equal(env.store.get(RUN_KEY), env.settledRun);
  assert.equal(env.flow.pendingBattle, true);
});

test('交涉中离开塔页后的晚到回复不能改写行程', async t => {
  const env = await openPendingTalk(t, flow => flow.hide());
  assert.equal(env.flow.page, null);
  assert.equal(JSON.stringify(env.state), env.before.state);
  assert.equal(env.store.get(RUN_KEY), env.settledRun);
});
