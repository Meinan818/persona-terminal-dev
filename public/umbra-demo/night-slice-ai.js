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

function namedError(name, message) {
  const error = new Error(message);
  error.name = name;
  return error;
}

function withTimeout(run, timeoutMs, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(namedError('AbortError', 'aborted'));
      return;
    }
    const controller = new AbortController();
    let settled = false;
    const onAbort = () => {
      controller.abort();
      finish(reject, namedError('AbortError', 'aborted'));
    };
    const timer = setTimeout(() => {
      controller.abort();
      finish(reject, namedError('TimeoutError', 'timed out'));
    }, timeoutMs);
    const cleanup = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    };
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      cleanup();
      callback(value);
    };
    signal?.addEventListener('abort', onAbort, { once: true });
    Promise.resolve()
      .then(() => run(controller.signal))
      .then(value => finish(resolve, value), error => finish(reject, error));
  });
}

const copyText = (value, max) => (
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, max) : ''
);

function snapshotShadow(shadow) {
  if (!shadow || typeof shadow !== 'object') return undefined;
  return {
    name: copyText(shadow.name, 24),
    personality: copyText(shadow.personality, 24),
    opening: copyText(shadow.opening, 80),
    demand: copyText(shadow.demand, 50),
  };
}

function snapshotRoom(room) {
  if (!room || typeof room !== 'object') return null;
  const snapshot = {
    id: copyText(room.id, 24),
    kind: copyText(room.kind, 12),
    title: copyText(room.title, 28),
    line: copyText(room.line, 110),
    danger: copyText(room.danger, 12),
  };
  const shadow = snapshotShadow(room.shadow);
  if (shadow) snapshot.shadow = shadow;
  return snapshot;
}

function snapshotHistory(history) {
  if (!Array.isArray(history)) return [];
  return history.slice(-12).map(entry => {
    if (!entry || typeof entry !== 'object') return null;
    const item = {
      role: copyText(entry.role, 20),
      text: copyText(entry.text, 160),
      tone: copyText(entry.tone, 20),
      reply: copyText(entry.reply, 110),
    };
    const quality = Number(entry.quality);
    if (Number.isFinite(quality)) item.quality = Math.max(0, Math.min(100, Math.round(quality)));
    return item;
  }).filter(Boolean);
}

function snapshotRoster(roster) {
  if (!Array.isArray(roster)) return [];
  return roster.slice(0, 12).map(item => {
    if (typeof item === 'string') return copyText(item, 40);
    if (!item || typeof item !== 'object') return null;
    return {
      id: copyText(item.id, 24),
      name: copyText(item.name, 40),
      arcana: copyText(item.arcana, 24),
      level: Number.isFinite(Number(item.level)) ? Number(item.level) : undefined,
    };
  }).filter(Boolean);
}

/**
 * 一条记录 → 夜层规格。
 * 模型超时、抛错、坏 JSON 或缺房间，都退回同一份离线夜层，不阻塞入夜。
 */
export async function requestFloorSpec(input = {}, { signal, onStatus, timeoutMs = 8000 } = {}) {
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
      timeoutSignal => bridge({ mode, record, date: input.date, roster: snapshotRoster(input.roster) }, {
        signal: timeoutSignal,
        onStatus,
      }),
      timeoutMs,
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
export async function requestShadowJudge(input = {}, { signal, onStatus, timeoutMs = 7000 } = {}) {
  const safeInput = {
    text: cleanRecord(input.text) || '',
    room: snapshotRoom(input.room),
    history: snapshotHistory(input.history),
    dayRecord: cleanRecord(input.dayRecord),
  };
  const bridge = globalThis.MASKARIA_AI?.judgeShadowTalk;
  if (typeof bridge !== 'function') {
    onStatus?.('影子没有接上模型，只能用离线方式听你说话。');
    return offlineJudge(safeInput);
  }
  try {
    onStatus?.('它在听。');
    const bridgeInput = {
      text: safeInput.text,
      room: snapshotRoom(safeInput.room),
      history: snapshotHistory(safeInput.history),
      dayRecord: safeInput.dayRecord,
    };
    const raw = await withTimeout(
      timeoutSignal => bridge(bridgeInput, { signal: timeoutSignal, onStatus }),
      timeoutMs,
      signal,
    );
    return normalizeJudge(raw, safeInput);
  } catch (error) {
    if (error?.name === 'AbortError' && signal?.aborted) throw error;
    onStatus?.('它没有接上模型，换离线方式听完了。');
    return offlineJudge(safeInput);
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

const PARENT_AI_SOURCE = 'maskaria-umbra-ai';
const PARENT_AI_REQUEST = 'judge-shadow-talk';
const PARENT_AI_CANCEL = 'judge-shadow-talk-cancel';
const PARENT_AI_RESULT = 'judge-shadow-talk-result';
const PARENT_AI_STATUS = 'judge-shadow-talk-status';
const PARENT_FLOOR_REQUEST = 'plan-night-floor';
const PARENT_FLOOR_CANCEL = 'plan-night-floor-cancel';
const PARENT_FLOOR_RESULT = 'plan-night-floor-result';
const PARENT_FLOOR_STATUS = 'plan-night-floor-status';

/**
 * 父应用持有真实 BYOK 配置与网络请求；iframe 只发送受限交涉快照。
 * 本桥不读取密钥，父应用未配置或调用失败时由 requestShadowJudge 回落离线。
 */
export function installParentSliceBridge({
  parent = globalThis.parent,
  origin = globalThis.location?.origin,
} = {}) {
  if (!parent || parent === globalThis || !origin) return false;
  const previous = globalThis.MASKARIA_AI;
  const hasShadow = typeof previous?.judgeShadowTalk === 'function';
  const hasFloor = typeof previous?.planNightFloor === 'function';
  if (hasShadow && hasFloor) return false;
  const pending = new Map();
  let sequence = 0;

  const cleanup = item => {
    if (!item) return;
    item.signal?.removeEventListener('abort', item.onAbort);
    pending.delete(item.id);
  };

  const onMessage = event => {
    if (event.origin !== origin || event.source !== parent) return;
    const message = event.data;
    if (!message || typeof message !== 'object' || message.source !== PARENT_AI_SOURCE) return;
    const item = typeof message.id === 'string' ? pending.get(message.id) : null;
    if (!item) return;
    if (message.type !== item.statusType && message.type !== item.resultType) return;
    if (message.type === item.statusType) {
      const status = copyText(message.status, 120);
      if (status) item.onStatus?.(status);
      return;
    }
    cleanup(item);
    if (message.ok) {
      item.resolve(message.value);
      return;
    }
    item.reject(namedError(
      message.errorName === 'AbortError' ? 'AbortError' : 'Error',
      copyText(message.error, 200) || 'AI 请求失败',
    ));
  };

  globalThis.addEventListener?.('message', onMessage);

  const requestParent = (route, input = {}, { signal, onStatus } = {}) => (
    new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(namedError('AbortError', 'aborted'));
        return;
      }
      const id = `${route.prefix}-${Date.now().toString(36)}-${++sequence}`;
      const onAbort = () => {
        cleanup(pending.get(id));
        parent.postMessage({ source: PARENT_AI_SOURCE, type: route.cancelType, id }, origin);
        reject(namedError('AbortError', 'aborted'));
      };
      pending.set(id, {
        id,
        resolve,
        reject,
        signal,
        onAbort,
        onStatus,
        resultType: route.resultType,
        statusType: route.statusType,
      });
      signal?.addEventListener('abort', onAbort, { once: true });
      parent.postMessage({
        source: PARENT_AI_SOURCE,
        type: route.requestType,
        id,
        input,
      }, origin);
    })
  );

  const next = {
    ...(previous && typeof previous === 'object' ? previous : {}),
  };
  if (!hasShadow) {
    next.judgeShadowTalk = (input, hooks = {}) => requestParent({
      prefix: 'shadow',
      requestType: PARENT_AI_REQUEST,
      cancelType: PARENT_AI_CANCEL,
      resultType: PARENT_AI_RESULT,
      statusType: PARENT_AI_STATUS,
    }, input, hooks);
  }
  if (!hasFloor) {
    next.planNightFloor = (input, hooks = {}) => requestParent({
      prefix: 'floor',
      requestType: PARENT_FLOOR_REQUEST,
      cancelType: PARENT_FLOOR_CANCEL,
      resultType: PARENT_FLOOR_RESULT,
      statusType: PARENT_FLOOR_STATUS,
    }, input, hooks);
  }
  globalThis.MASKARIA_AI = next;
  return true;
}
