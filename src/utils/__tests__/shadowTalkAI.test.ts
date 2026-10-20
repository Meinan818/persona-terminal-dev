import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Settings } from '@/types';
import type { AIConfig, AIMessage, ChatOptions } from '@/utils/aiClient';
import {
  buildShadowTalkMessages,
  createShadowTalkBridge,
  installShadowTalkBridge,
  parseShadowTalkJudgement,
} from '@/utils/shadowTalkAI';

const settings = {} as Settings;
const config: AIConfig = {
  apiKey: '***',
  baseUrl: 'https://example.test/v1',
  model: 'test-model',
  provider: 'openai',
};

afterEach(() => {
  delete (globalThis as typeof globalThis & { MASKARIA_AI?: unknown }).MASKARIA_AI;
});

describe('shadowTalkAI', () => {
  it('未配置 AI 时不安装桥', () => {
    expect(createShadowTalkBridge(settings, { resolveConfig: () => null })).toBeNull();
    expect(installShadowTalkBridge(settings, { resolveConfig: () => null })).toBe(false);
  });

  it('只把白名单交涉资料送给模型', () => {
    const messages = buildShadowTalkMessages({
      text: '  我想知道  你为什么守在这里。 ',
      room: {
        title: '影子房',
        shadow: {
          name: '回声',
          personality: 'calm',
          opening: '停下。',
          demand: '说清楚。',
        },
      },
      history: [{ role: 'player', text: '旧话', secret: 'hidden' }],
      dayRecord: '白天记录',
      hp: 1,
      reward: { money: 99999 },
    } as never);

    const payload = messages[1].content as string;
    expect(payload).toContain('我想知道 你为什么守在这里。');
    expect(payload).toContain('"demand":"说清楚。"');
    expect(payload).not.toContain('hidden');
    expect(payload).not.toContain('99999');
    expect(payload).not.toContain('"hp"');
  });

  it('通过统一 chatComplete 发起请求并收口为 ai 判定', async () => {
    let gotMessages: AIMessage[] = [];
    let gotOptions: ChatOptions | undefined;
    const controller = new AbortController();
    const bridge = createShadowTalkBridge(settings, {
      resolveConfig: () => config,
      complete: vi.fn(async (_cfg, messages, options) => {
        gotMessages = messages;
        gotOptions = options;
        return '```json\n{"tone":"reason","quality":101,"reply":"它沉默了一会儿，没有后退。"}\n```';
      }),
    });

    const result = await bridge!.judgeShadowTalk({
      text: '我想知道你为什么要守在这里。',
      room: { shadow: { personality: 'calm', demand: '说清楚。' } },
    }, { signal: controller.signal });

    expect(result).toEqual({
      mode: 'ai',
      tone: 'reason',
      quality: 100,
      reply: '它沉默了一会儿，没有后退。',
    });
    expect(gotMessages[0].role).toBe('system');
    expect(gotOptions).toMatchObject({
      temperature: 0.35,
      maxTokens: 280,
      timeoutMs: 7_000,
      signal: controller.signal,
      jsonMode: true,
      instant: true,
    });
  });

  it('坏 JSON、未知语气或空回复都不能冒充 ai', () => {
    expect(() => parseShadowTalkJudgement('不是 JSON')).toThrow();
    expect(() => parseShadowTalkJudgement('{"tone":"nonsense","quality":80,"reply":"嗯。"}')).toThrow();
    expect(() => parseShadowTalkJudgement('{"tone":"reason","quality":80,"reply":" "}')).toThrow();
  });

  it('已有真实桥时安装器不覆盖它', () => {
    const existing = { judgeShadowTalk: vi.fn() };
    (globalThis as typeof globalThis & { MASKARIA_AI?: unknown }).MASKARIA_AI = {
      awakenPersona: vi.fn(),
      ...existing,
    };
    const installed = installShadowTalkBridge(settings, { resolveConfig: () => config });
    expect(installed).toBe(false);
    expect((globalThis as typeof globalThis & { MASKARIA_AI: typeof existing }).MASKARIA_AI.judgeShadowTalk)
      .toBe(existing.judgeShadowTalk);
  });

  it('安装器保留其他已有 AI 能力', () => {
    const awakenPersona = vi.fn();
    (globalThis as typeof globalThis & { MASKARIA_AI?: unknown }).MASKARIA_AI = { awakenPersona };
    expect(installShadowTalkBridge(settings, {
      resolveConfig: () => config,
      complete: vi.fn(async () => '{"tone":"reason","quality":60,"reply":"它听懂了。 "}'),
    })).toBe(true);
    const installed = (globalThis as typeof globalThis & {
      MASKARIA_AI: { awakenPersona: unknown; judgeShadowTalk: unknown };
    }).MASKARIA_AI;
    expect(installed.awakenPersona).toBe(awakenPersona);
    expect(typeof installed.judgeShadowTalk).toBe('function');
  });
});
