import { useAppStore } from '@/store';
import {
  createShadowTalkBridge,
  type ShadowTalkAIBridge,
  type ShadowTalkInput,
} from '@/utils/shadowTalkAI';

export const UMBRA_AI_SOURCE = 'maskaria-umbra-ai';
const REQUEST = 'judge-shadow-talk';
const CANCEL = 'judge-shadow-talk-cancel';
const RESULT = 'judge-shadow-talk-result';
const STATUS = 'judge-shadow-talk-status';

interface BridgeMessage {
  source?: unknown;
  type?: unknown;
  id?: unknown;
  input?: unknown;
  ok?: unknown;
  value?: unknown;
  error?: unknown;
  errorName?: unknown;
  status?: unknown;
}

interface AttachOptions {
  win: Pick<Window, 'addEventListener' | 'removeEventListener'>;
  origin: string;
  target: () => Window | null;
  bridgeFactory?: () => ShadowTalkAIBridge | null;
}

const validId = (value: unknown): value is string => (
  typeof value === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(value)
);

const payloadFits = (value: unknown): value is ShadowTalkInput => {
  try {
    return Boolean(value && typeof value === 'object' && JSON.stringify(value).length <= 12_000);
  } catch {
    return false;
  }
};

const errorNameOf = (error: unknown): string => (
  error instanceof Error && error.name === 'AbortError' ? 'AbortError' : 'Error'
);

const errorTextOf = (error: unknown): string => (
  error instanceof Error && error.message ? error.message.slice(0, 200) : 'AI 请求失败'
);

export function attachUmbraDemoAiBridge({
  win,
  origin,
  target,
  bridgeFactory = () => createShadowTalkBridge(() => useAppStore.getState().settings),
}: AttachOptions): () => void {
  const pending = new Map<string, AbortController>();

  const post = (message: BridgeMessage): void => {
    const frame = target();
    if (!frame) return;
    frame.postMessage({ source: UMBRA_AI_SOURCE, ...message }, origin);
  };

  const onMessage = (event: MessageEvent) => {
    if (event.origin !== origin || event.source !== target()) return;
    const message = event.data as BridgeMessage | null;
    if (!message || message.source !== UMBRA_AI_SOURCE || !validId(message.id)) return;
    const id = message.id;
    if (message.type === CANCEL) {
      pending.get(id)?.abort();
      pending.delete(id);
      return;
    }
    const input = message.input;
    if (message.type !== REQUEST || !payloadFits(input)) return;
    pending.get(id)?.abort();
    const controller = new AbortController();
    pending.set(id, controller);
    void (async () => {
      const bridge = bridgeFactory();
      if (!bridge) throw new Error('AI 尚未配置');
      const value = await bridge.judgeShadowTalk(input, {
        signal: controller.signal,
        onStatus: status => {
          if (!controller.signal.aborted) post({ type: STATUS, id, status });
        },
      });
      if (!controller.signal.aborted) post({ type: RESULT, id, ok: true, value });
    })().catch(error => {
      if (!controller.signal.aborted) {
        post({
          type: RESULT,
          id,
          ok: false,
          error: errorTextOf(error),
          errorName: errorNameOf(error),
        });
      }
    }).finally(() => {
      if (pending.get(id) === controller) pending.delete(id);
    });
  };

  win.addEventListener('message', onMessage);
  return () => {
    win.removeEventListener('message', onMessage);
    for (const controller of pending.values()) controller.abort();
    pending.clear();
  };
}
