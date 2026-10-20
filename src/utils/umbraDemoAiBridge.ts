import { useAppStore } from '@/store';
import {
  createShadowTalkBridge,
  type ShadowTalkAIBridge,
  type ShadowTalkInput,
} from '@/utils/shadowTalkAI';
import {
  createBattleAdvisorBridge,
  type BattleAdvisorBridge,
  type BattleAdvisorInput,
} from '@/utils/battleAdvisorAI';
import {
  createNightFloorBridge,
  type NightFloorAIBridge,
  type NightFloorInput,
} from '@/utils/nightFloorAI';

export const UMBRA_AI_SOURCE = 'maskaria-umbra-ai';
const SHADOW_REQUEST = 'judge-shadow-talk';
const SHADOW_CANCEL = 'judge-shadow-talk-cancel';
const SHADOW_RESULT = 'judge-shadow-talk-result';
const SHADOW_STATUS = 'judge-shadow-talk-status';
const ADVISOR_REQUEST = 'advise-battle';
const ADVISOR_CANCEL = 'advise-battle-cancel';
const ADVISOR_RESULT = 'advise-battle-result';
const ADVISOR_STATUS = 'advise-battle-status';
const FLOOR_REQUEST = 'plan-night-floor';
const FLOOR_CANCEL = 'plan-night-floor-cancel';
const FLOOR_RESULT = 'plan-night-floor-result';
const FLOOR_STATUS = 'plan-night-floor-status';

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
  advisorBridgeFactory?: () => BattleAdvisorBridge | null;
  floorBridgeFactory?: () => NightFloorAIBridge | null;
}

const validId = (value: unknown): value is string => (
  typeof value === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(value)
);

const payloadFits = (
  value: unknown,
): value is ShadowTalkInput | BattleAdvisorInput | NightFloorInput => {
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
  advisorBridgeFactory = () => createBattleAdvisorBridge(() => useAppStore.getState().settings),
  floorBridgeFactory = () => createNightFloorBridge(() => useAppStore.getState().settings),
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
    if (
      message.type === SHADOW_CANCEL
      || message.type === ADVISOR_CANCEL
      || message.type === FLOOR_CANCEL
    ) {
      pending.get(id)?.abort();
      pending.delete(id);
      return;
    }
    const input = message.input;
    const isAdvisor = message.type === ADVISOR_REQUEST;
    const isFloor = message.type === FLOOR_REQUEST;
    if (
      (message.type !== SHADOW_REQUEST && !isAdvisor && !isFloor)
      || !payloadFits(input)
    ) return;
    pending.get(id)?.abort();
    const controller = new AbortController();
    pending.set(id, controller);
    const resultType = isAdvisor
      ? ADVISOR_RESULT
      : isFloor
        ? FLOOR_RESULT
        : SHADOW_RESULT;
    const statusType = isAdvisor
      ? ADVISOR_STATUS
      : isFloor
        ? FLOOR_STATUS
        : SHADOW_STATUS;
    void (async () => {
      if (isAdvisor) {
        const bridge = advisorBridgeFactory();
        if (!bridge) throw new Error('AI 尚未配置');
        const value = await bridge.adviseBattle(input as BattleAdvisorInput, {
          signal: controller.signal,
          onStatus: status => {
            if (!controller.signal.aborted) post({ type: statusType, id, status });
          },
        });
        if (!controller.signal.aborted) post({ type: resultType, id, ok: true, value });
        return;
      }
      if (isFloor) {
        const bridge = floorBridgeFactory();
        if (!bridge) throw new Error('AI 尚未配置');
        const value = await bridge.planNightFloor(input as NightFloorInput, {
          signal: controller.signal,
          onStatus: status => {
            if (!controller.signal.aborted) post({ type: statusType, id, status });
          },
        });
        if (!controller.signal.aborted) post({ type: resultType, id, ok: true, value });
        return;
      }
      const bridge = bridgeFactory();
      if (!bridge) throw new Error('AI 尚未配置');
      const value = await bridge.judgeShadowTalk(input as ShadowTalkInput, {
        signal: controller.signal,
        onStatus: status => {
          if (!controller.signal.aborted) post({ type: statusType, id, status });
        },
      });
      if (!controller.signal.aborted) post({ type: resultType, id, ok: true, value });
    })().catch(error => {
      if (!controller.signal.aborted) {
        post({
          type: resultType,
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
