import test from 'node:test';
import assert from 'node:assert/strict';
import {
  installPreviewSliceBridge,
  requestFloorSpec,
  requestShadowJudge,
} from './night-slice-ai.js';

const record = '今天没敢在会上说自己的想法';

function withBridge(bridge, run) {
  const previous = globalThis.MASKARIA_AI;
  globalThis.MASKARIA_AI = bridge;
  return Promise.resolve()
    .then(run)
    .finally(() => {
      if (previous === undefined) delete globalThis.MASKARIA_AI;
      else globalThis.MASKARIA_AI = previous;
    });
}

test('没有 bridge 时夜层落到离线规则', async () => {
  const previous = globalThis.MASKARIA_AI;
  delete globalThis.MASKARIA_AI;
  const spec = await requestFloorSpec({ record });
  assert.equal(spec.mode, 'offline');
  assert.ok(spec.rooms.length >= 3);
  if (previous) globalThis.MASKARIA_AI = previous;
});

test('模型桥的结果会被收口成 ai 夜层', async () => {
  await withBridge({
    planNightFloor: async () => ({
      title: '没说出口的那句话',
      theme: '会议室',
      mood: '发闷',
      memory: '你把它说完了。',
      rooms: [
        { kind: 'guard', title: '亮着的投影', danger: 'mid', line: '投影还亮着。' },
        {
          kind: 'shadow',
          title: '没说完的话',
          danger: 'high',
          shadow: { name: '没说完的话', personality: 'proud', opening: '你终于开口了。', demand: '说完。' },
        },
        { kind: 'exit', title: '门', line: '门外是白昼。' },
      ],
    }),
  }, async () => {
    const spec = await requestFloorSpec({ record });
    assert.equal(spec.mode, 'ai');
    assert.equal(spec.title, '没说出口的那句话');
    assert.equal(spec.rooms.at(-1).kind, 'exit');
  });
});

test('塔模式不会把记录发给模型', async () => {
  let received = null;
  await withBridge({
    planNightFloor: async input => {
      received = input;
      return {
        rooms: [
          { kind: 'guard', title: '门', line: '门开着。' },
          { kind: 'shadow', title: '影子', shadow: { name: '月台的影子', personality: 'calm' } },
          { kind: 'exit', title: '出口', line: '天亮。' },
        ],
      };
    },
  }, async () => {
    const spec = await requestFloorSpec({ mode: 'tower', record: '今天不太想说话' });
    assert.equal(spec.origin, 'tower');
    assert.equal(received.mode, 'tower');
    assert.equal(received.record, '');
  });
});

test('模型抛错或坏 JSON 不阻塞入夜', async () => {
  await withBridge({
    planNightFloor: async () => {
      throw new Error('network down');
    },
  }, async () => {
    const spec = await requestFloorSpec({ record });
    assert.equal(spec.mode, 'offline');
    assert.ok(spec.rooms.length >= 3);
  });
  await withBridge({
    planNightFloor: async () => ({ rooms: 'not-an-array' }),
  }, async () => {
    const spec = await requestFloorSpec({ record });
    assert.equal(spec.mode, 'offline');
  });
});

test('影子判定没有 bridge 时用离线语气识别', async () => {
  const previous = globalThis.MASKARIA_AI;
  delete globalThis.MASKARIA_AI;
  const judged = await requestShadowJudge({
    text: '别动，再动我就打你。',
    room: { shadow: { personality: 'cowardly', demand: '先保证不打我。' } },
  });
  assert.equal(judged.mode, 'offline');
  assert.equal(judged.tone, 'threaten');
  assert.ok(judged.quality > 0);
  if (previous) globalThis.MASKARIA_AI = previous;
});

test('预览桥明确标记 preview，且不覆盖真实桥', async () => {
  const previous = globalThis.MASKARIA_AI;
  delete globalThis.MASKARIA_AI;
  try {
    assert.equal(installPreviewSliceBridge(), true);
    const spec = await requestFloorSpec({ record });
    assert.equal(spec.mode, 'preview');
    const judged = await requestShadowJudge({
      text: '我想知道你为什么要守在这里。',
      room: { shadow: { personality: 'calm', demand: '告诉我为什么。' } },
    });
    assert.equal(judged.mode, 'preview');

    const real = { planNightFloor: async () => ({}) };
    globalThis.MASKARIA_AI = real;
    assert.equal(installPreviewSliceBridge(), false);
    assert.equal(globalThis.MASKARIA_AI, real);
  } finally {
    if (previous === undefined) delete globalThis.MASKARIA_AI;
    else globalThis.MASKARIA_AI = previous;
  }
});
