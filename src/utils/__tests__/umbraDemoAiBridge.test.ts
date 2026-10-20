import { afterEach, describe, expect, it, vi } from 'vitest';
import { attachUmbraDemoAiBridge, UMBRA_AI_SOURCE } from '@/utils/umbraDemoAiBridge';
import type { ShadowTalkAIBridge } from '@/utils/shadowTalkAI';
import type { BattleAdvisorBridge } from '@/utils/battleAdvisorAI';

type Listener = (event: MessageEvent) => void;

function harness(
  bridgeFactory: () => ShadowTalkAIBridge | null,
  advisorBridgeFactory?: () => BattleAdvisorBridge | null,
) {
  const listeners = new Set<Listener>();
  const posted: Array<Record<string, unknown>> = [];
  const frame = {
    postMessage: vi.fn((value: Record<string, unknown>) => {
      posted.push(value);
    }),
  };
  const win = {
    addEventListener: (_type: string, listener: Listener) => listeners.add(listener),
    removeEventListener: (_type: string, listener: Listener) => listeners.delete(listener),
  };
  const dispatch = (data: Record<string, unknown>, patch: { origin?: string; source?: unknown } = {}) => {
    const event = {
      origin: patch.origin ?? 'https://maskaria.test',
      source: patch.source ?? frame,
      data,
    } as unknown as MessageEvent;
    for (const listener of listeners) listener(event);
  };
  const cleanup = attachUmbraDemoAiBridge({
    win: win as Pick<Window, 'addEventListener' | 'removeEventListener'>,
    origin: 'https://maskaria.test',
    target: () => frame as unknown as Window,
    bridgeFactory,
    advisorBridgeFactory,
  });
  return { frame, posted, dispatch, cleanup, listeners };
}

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

afterEach(() => {
  vi.restoreAllMocks();
});

describe('UMBRA iframe AI bridge', () => {
  it('把父应用 AI 判定回传给同源 iframe', async () => {
    const bridge = {
      judgeShadowTalk: vi.fn(async (_input, hooks) => {
        hooks?.onStatus?.('影子正在判断。');
        return {
          mode: 'ai' as const,
          tone: 'reason' as const,
          quality: 88,
          reply: '它听懂了一部分。',
        };
      }),
    };
    const h = harness(() => bridge);
    h.dispatch({
      source: UMBRA_AI_SOURCE,
      type: 'judge-shadow-talk',
      id: 'request-1',
      input: { text: '我想知道你为什么要守在这里。' },
    });
    await flush();
    expect(bridge.judgeShadowTalk).toHaveBeenCalledOnce();
    expect(h.posted.some(message => message.type === 'judge-shadow-talk-status')).toBe(true);
    expect(h.posted[h.posted.length - 1]).toMatchObject({
      source: UMBRA_AI_SOURCE,
      type: 'judge-shadow-talk-result',
      id: 'request-1',
      ok: true,
      value: { mode: 'ai', tone: 'reason', quality: 88 },
    });
    h.cleanup();
  });

  it('未配置 AI 时明确失败，由 Demo 回落离线', async () => {
    const h = harness(() => null);
    h.dispatch({
      source: UMBRA_AI_SOURCE,
      type: 'judge-shadow-talk',
      id: 'request-2',
      input: { text: '讲理。' },
    });
    await flush();
    expect(h.posted[h.posted.length - 1]).toMatchObject({
      type: 'judge-shadow-talk-result',
      id: 'request-2',
      ok: false,
      error: 'AI 尚未配置',
    });
    h.cleanup();
  });

  it('取消会中止父应用请求且不再回传结果', async () => {
    let aborted = false;
    const bridge: ShadowTalkAIBridge = {
      judgeShadowTalk: vi.fn((_input, hooks) => new Promise((_resolve, reject) => {
        hooks?.signal?.addEventListener('abort', () => {
          aborted = true;
          reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
        }, { once: true });
      })),
    };
    const h = harness(() => bridge);
    h.dispatch({
      source: UMBRA_AI_SOURCE,
      type: 'judge-shadow-talk',
      id: 'request-3',
      input: { text: '先等一下。' },
    });
    h.dispatch({
      source: UMBRA_AI_SOURCE,
      type: 'judge-shadow-talk-cancel',
      id: 'request-3',
    });
    await flush();
    expect(aborted).toBe(true);
    expect(h.posted.some(message => message.type === 'judge-shadow-talk-result')).toBe(false);
    h.cleanup();
  });

  it('拒绝异源、异窗口和超长 payload', async () => {
    const bridge = { judgeShadowTalk: vi.fn() };
    const h = harness(() => bridge);
    h.dispatch({
      source: UMBRA_AI_SOURCE,
      type: 'judge-shadow-talk',
      id: 'bad-origin',
      input: { text: 'x' },
    }, { origin: 'https://evil.test' });
    h.dispatch({
      source: UMBRA_AI_SOURCE,
      type: 'judge-shadow-talk',
      id: 'bad-source',
      input: { text: 'x' },
    }, { source: {} });
    h.dispatch({
      source: UMBRA_AI_SOURCE,
      type: 'judge-shadow-talk',
      id: 'too-large',
      input: { text: 'x'.repeat(20_000) },
    });
    await flush();
    expect(bridge.judgeShadowTalk).not.toHaveBeenCalled();
    h.cleanup();
  });

  it('战斗顾问使用独立消息并只回传合法建议', async () => {
    const advisor = {
      adviseBattle: vi.fn(async (_input, hooks) => {
        hooks?.onStatus?.('导航员正在读取战场。');
        return {
          mode: 'ai' as const,
          actionKey: 'skill:agi',
          targetId: 'primary',
          reason: '电击是已确认弱点。',
          confidence: 84,
        };
      }),
    };
    const shadow = { judgeShadowTalk: vi.fn() };
    const h = harness(() => shadow, () => advisor);
    h.dispatch({
      source: UMBRA_AI_SOURCE,
      type: 'advise-battle',
      id: 'advisor-1',
      input: {
        round: 1,
        actor: { id: 'hero', name: '主角' },
        actions: [{ actionKey: 'skill:agi', type: 'skill', label: '吉欧' }],
      },
    });
    await flush();
    expect(shadow.judgeShadowTalk).not.toHaveBeenCalled();
    expect(advisor.adviseBattle).toHaveBeenCalledOnce();
    expect(h.posted.some(message => message.type === 'advise-battle-status')).toBe(true);
    expect(h.posted[h.posted.length - 1]).toMatchObject({
      type: 'advise-battle-result',
      id: 'advisor-1',
      ok: true,
      value: { actionKey: 'skill:agi', targetId: 'primary' },
    });
    h.cleanup();
  });
});
