import test from 'node:test';
import assert from 'node:assert/strict';
import { createSliceFlow } from './night-slice-flow.js';
import { createSliceRun, towerFloorSpec } from './night-slice.js';

const KEY = 'maskaria.p5r.slice.v1';

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

function harness(t, { saved = null, talk = '我想知道你为什么要守在这里。' } = {}) {
  const store = new Map();
  if (saved) store.set(KEY, JSON.stringify(saved));
  const globals = {
    location: { search: '?slice=1' },
    window: { scrollTo() {} },
    document: {
      addEventListener() {},
      querySelector(selector) {
        if (selector === '#slice-talk') return { value: talk };
        if (selector === '#slice-record') return { value: '' };
        return null;
      },
    },
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
    hp: 52,
    sp: 34,
    heroMaxHp: 52,
    heroMaxSp: 34,
    equipment: {},
    equipmentLevels: {},
  };
  const flow = createSliceFlow({
    state,
    icon: () => '',
    render() {},
    notify() {},
    persistP5State() {},
    startBattle() {},
  });
  return { flow, state, store };
}

function bridge(t, value) {
  const previous = globalThis.MASKARIA_AI;
  globalThis.MASKARIA_AI = value;
  t.after(() => {
    if (previous === undefined) delete globalThis.MASKARIA_AI;
    else globalThis.MASKARIA_AI = previous;
  });
}

test('AI LAB 规划中关闭后，晚到楼层不能重新创建行程', async t => {
  const reply = deferred();
  bridge(t, { planNightFloor: () => reply.promise });
  const { flow, store } = harness(t);

  flow.act('plan-tower');
  await flush();
  assert.equal(flow.page, 'planning');

  flow.dismiss();
  reply.resolve(towerFloorSpec({ date: '2026-10-19' }));
  await flush();

  assert.equal(flow.page, 'day');
  assert.equal(flow.snapshot.rooms, 0);
  assert.equal(JSON.parse(store.get(KEY)).run, null);
});

test('AI LAB 交涉等待中关闭后，晚到判定不能推进房间或改写存档', async t => {
  const reply = deferred();
  bridge(t, { judgeShadowTalk: () => reply.promise });
  const spec = towerFloorSpec({ date: '2026-10-19' });
  const run = createSliceRun(spec, { hp: 40, sp: 20, maxHp: 52, maxSp: 34 });
  run.index = spec.rooms.findIndex(room => room.kind === 'shadow');
  const beforeIndex = run.index;
  const { flow, store } = harness(t, {
    saved: { record: '', spec, run, lastNight: null, history: [] },
  });

  flow.act('talk');
  flow.act('talk-send');
  await flush();
  assert.equal(flow.page, 'judging');

  flow.dismiss();
  const settledSave = store.get(KEY);
  reply.resolve({ tone: 'reason', quality: 95, reply: '它听懂了一部分。' });
  await flush();

  assert.equal(flow.page, 'day');
  assert.equal(flow.snapshot.index, beforeIndex);
  assert.equal(store.get(KEY), settledSave);
});

test('重新打开 AI LAB 后，旧请求晚到不能覆盖新楼层', async t => {
  const replies = [];
  bridge(t, {
    planNightFloor: () => new Promise(resolve => replies.push(resolve)),
  });
  const { flow, store } = harness(t);
  const first = { ...towerFloorSpec({ date: '2026-10-19' }), title: '旧楼层' };
  const second = { ...towerFloorSpec({ date: '2026-10-19' }), title: '新楼层' };

  flow.act('plan-tower');
  await flush();
  flow.dismiss();
  flow.open();
  flow.act('plan-tower');
  await flush();
  assert.equal(replies.length, 2);

  replies[1](second);
  await flush();
  assert.equal(flow.page, 'night');
  assert.equal(JSON.parse(store.get(KEY)).spec.title, '新楼层');

  replies[0](first);
  await flush();
  assert.equal(flow.page, 'night');
  assert.equal(JSON.parse(store.get(KEY)).spec.title, '新楼层');
});
