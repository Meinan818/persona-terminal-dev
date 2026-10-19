/**
 * 单层 AI 切片 · 模型契约
 *
 * 正式应用注入 window.MASKARIA_AI.planNightFloor / judgeShadowTalk 即可复用现有 provider。
 * 原型不读取密钥，也不伪造网络请求；没有 bridge 时明确落到离线规则。
 */

import {
  cleanRecord,
  normalizeFloorSpec,
  normalizeJudge,
  offlineFloorSpec,
  offlineJudge,
  towerFloorSpec,
} from './night-slice.js';

function withTimeout(run, timeoutMs, signal) {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const onAbort = () => controller.abort();
    signal?.addEventListener('abort', onAbort, { once: true });
    run(controller.signal).then(
      value => {
        clearTimeout(timer);
        signal?.removeEventListener('abort', onAbort);
        resolve(value);
      },
      error => {
        clearTimeout(timer);
        signal?.removeEventListener('abort', onAbort);
        reject(error);
      },
    );
  });
}

/**
 * 一条记录 → 夜层规格。
 * 模型超时、抛错、坏 JSON 或缺房间，都退回同一份离线夜层，不阻塞入夜。
 */
export async function requestFloorSpec(input = {}, { signal, onStatus } = {}) {
  const mode = input.mode === 'tower' ? 'tower' : 'record';
  const record = mode === 'tower' ? '' : cleanRecord(input.record);
  const seedInput = { record, date: input.date, seed: input.seed, mode };
  const bridge = globalThis.MASKARIA_AI?.planNightFloor;
  if (typeof bridge !== 'function') {
    onStatus?.('没有可用的模型连接，夜层按离线规则显形。');
    return mode === 'tower' ? towerFloorSpec(seedInput) : offlineFloorSpec(record, seedInput);
  }
  try {
    onStatus?.('它正在读你白天留下的那句话……');
    const raw = await withTimeout(
      timeoutSignal => bridge({ mode, record, date: input.date, roster: input.roster ?? [] }, {
        signal: timeoutSignal,
        onStatus,
      }),
      8000,
      signal,
    );
    onStatus?.('楼层正在合拢。');
    return normalizeFloorSpec(raw, seedInput);
  } catch (error) {
    if (error?.name === 'AbortError' && signal?.aborted) throw error;
    onStatus?.('模型没有回应，改用离线夜层。');
    return mode === 'tower' ? towerFloorSpec(seedInput) : offlineFloorSpec(record, seedInput);
  }
}

/**
 * 玩家自由输入 → 影子对语气和质量的判断。
 * 模型只给 tone / quality / reply；成功率由 night-slice.js 计算。
 */
export async function requestShadowJudge(input = {}, { signal, onStatus } = {}) {
  const text = cleanRecord(input.text) || '';
  const bridge = globalThis.MASKARIA_AI?.judgeShadowTalk;
  if (typeof bridge !== 'function') {
    onStatus?.('影子没有接上模型，只能用离线方式听你说话。');
    return offlineJudge(input);
  }
  try {
    onStatus?.('它在听。');
    const raw = await withTimeout(
      timeoutSignal => bridge({
        text,
        room: input.room,
        history: input.history ?? [],
        dayRecord: input.dayRecord,
      }, { signal: timeoutSignal, onStatus }),
      7000,
      signal,
    );
    return normalizeJudge(raw, input);
  } catch (error) {
    if (error?.name === 'AbortError' && signal?.aborted) throw error;
    onStatus?.('它没有接上模型，换离线方式听完了。');
    return offlineJudge(input);
  }
}

/**
 * 静态预览用的确定性 bridge。它不调用真实模型，返回结果会标记 preview，
 * 界面必须显示「预览桥」，不能冒充真实 AI。
 */
export function installPreviewSliceBridge() {
  if (typeof globalThis.MASKARIA_AI?.planNightFloor === 'function'
    || typeof globalThis.MASKARIA_AI?.judgeShadowTalk === 'function') return false;
  const previous = globalThis.MASKARIA_AI;
  globalThis.MASKARIA_AI = {
    ...(previous && typeof previous === 'object' ? previous : {}),
    planNightFloor: async (input, { signal } = {}) => {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, 420);
        signal?.addEventListener('abort', () => {
          clearTimeout(timer);
          const error = new Error('aborted');
          error.name = 'AbortError';
          reject(error);
        }, { once: true });
      });
      const spec = input.mode === 'tower'
        ? towerFloorSpec({ date: input.date })
        : offlineFloorSpec(input.record, { date: input.date });
      return { ...spec, mode: 'preview' };
    },
    judgeShadowTalk: async (input, { signal } = {}) => {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, 260);
        signal?.addEventListener('abort', () => {
          clearTimeout(timer);
          const error = new Error('aborted');
          error.name = 'AbortError';
          reject(error);
        }, { once: true });
      });
      return { ...offlineJudge(input), mode: 'preview' };
    },
  };
  return true;
}
