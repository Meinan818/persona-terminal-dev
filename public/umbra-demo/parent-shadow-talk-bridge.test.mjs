import test from 'node:test';
import assert from 'node:assert/strict';
import { installParentSliceBridge } from './night-slice-ai.js';

const SOURCE = 'maskaria-umbra-ai';

function harness(t) {
  const posted = [];
  const listeners = new Set();
  const parent = {
    postMessage(message) {
      posted.push(message);
    },
  };
  const oldAdd = globalThis.addEventListener;
  const oldRemove = globalThis.removeEventListener;
  const oldBridge = globalThis.MASKARIA_AI;
  globalThis.addEventListener = (type, listener) => {
    if (type === 'message') listeners.add(listener);
  };
  globalThis.removeEventListener = (type, listener) => {
    if (type === 'message') listeners.delete(listener);
  };
  delete globalThis.MASKARIA_AI;
  t.after(() => {
    globalThis.addEventListener = oldAdd;
    globalThis.removeEventListener = oldRemove;
    if (oldBridge === undefined) delete globalThis.MASKARIA_AI;
    else globalThis.MASKARIA_AI = oldBridge;
  });
  assert.equal(installParentSliceBridge({ parent, origin: 'https://maskaria.test' }), true);
  const receive = data => {
    for (const listener of listeners) {
      listener({
        origin: 'https://maskaria.test',
        source: parent,
        data: { source: SOURCE, ...data },
      });
    }
  };
  return { posted, receive, parent };
}

test('父应用桥只回传受限请求并接收结果', async t => {
  const h = harness(t);
  const pending = globalThis.MASKARIA_AI.judgeShadowTalk(
    { text: '我想知道你为什么要守在这里。' },
    { onStatus: () => {} },
  );
  assert.deepEqual(h.posted[0], {
    source: SOURCE,
    type: 'judge-shadow-talk',
    id: h.posted[0].id,
    input: { text: '我想知道你为什么要守在这里。' },
  });
  h.receive({
    type: 'judge-shadow-talk-status',
    id: h.posted[0].id,
    status: '影子正在判断。',
  });
  h.receive({
    type: 'judge-shadow-talk-result',
    id: h.posted[0].id,
    ok: true,
    value: { mode: 'ai', tone: 'reason', quality: 88, reply: '它听懂了。' },
  });
  assert.deepEqual(await pending, {
    mode: 'ai',
    tone: 'reason',
    quality: 88,
    reply: '它听懂了。',
  });
});

test('取消会向父应用发送 cancel 并立即结束等待', async t => {
  const h = harness(t);
  const controller = new AbortController();
  const pending = globalThis.MASKARIA_AI.judgeShadowTalk(
    { text: '先停一下。' },
    { signal: controller.signal },
  );
  controller.abort();
  await assert.rejects(pending, error => error?.name === 'AbortError');
  assert.equal(h.posted.at(-1)?.type, 'judge-shadow-talk-cancel');
  assert.equal(h.posted.at(-1)?.id, h.posted[0].id);
});
