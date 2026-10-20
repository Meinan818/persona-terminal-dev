/**
 * 战斗顾问 iframe 侧桥接与离线建议。
 *
 * 父应用持有 BYOK 配置；这里只发送公开战场快照，收到建议后交给界面预填，
 * 不执行行动，也不接触 Key。
 */

const PARENT_AI_SOURCE = 'maskaria-umbra-ai';
const ADVISOR_REQUEST = 'advise-battle';
const ADVISOR_CANCEL = 'advise-battle-cancel';
const ADVISOR_RESULT = 'advise-battle-result';
const ADVISOR_STATUS = 'advise-battle-status';
const MAX_ACTIONS = 24;
const MAX_UNITS = 6;

const cleanText = (value, max = 120) => (
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, max) : ''
);
const finiteNumber = (value, min, max, fallback = 0) => {
  if (!Number.isFinite(Number(value))) return fallback;
  return Math.max(min, Math.min(max, Math.round(Number(value))));
};
const actionKey = action => (
  action ? `${action.type}:${action.id ?? action.targetId ?? ''}` : ''
);
const affinityList = value => (
  Array.isArray(value)
    ? value.slice(0, 12).flatMap(item => {
        const element = cleanText(item?.element, 24);
        const affinity = cleanText(item?.affinity, 16);
        return element && affinity ? [{ element, affinity }] : [];
      })
    : []
);

function normalizeUnit(value) {
  if (!value || typeof value !== 'object') return null;
  const id = cleanText(value.id, 48);
  const name = cleanText(value.name, 40);
  if (!id || !name) return null;
  return {
    id,
    name,
    hp: finiteNumber(value.hp, 0, 99999),
    maxHp: Math.max(1, finiteNumber(value.maxHp, 1, 99999, 1)),
    sp: finiteNumber(value.sp, 0, 99999),
    maxSp: Math.max(1, finiteNumber(value.maxSp, 1, 99999, 1)),
    down: value.down === true || finiteNumber(value.hp, 0, 99999) <= 0,
    persona: cleanText(value.persona, 40),
  };
}

export function buildBattleAdvisorSnapshot(view) {
  if (!view || !view.actorId) return null;
  const actor = {
    id: cleanText(view.actorId, 48),
    name: cleanText(view.actorName, 40),
    hp: finiteNumber(view.actorHp, 0, 99999),
    maxHp: Math.max(1, finiteNumber(view.actorMaxHp, 1, 99999, 1)),
    sp: finiteNumber(view.actorSp, 0, 99999),
    maxSp: Math.max(1, finiteNumber(view.actorMaxSp, 1, 99999, 1)),
    persona: cleanText(view.actorPersona, 40),
  };
  const party = Array.isArray(view.party)
    ? view.party.slice(0, MAX_UNITS).map(normalizeUnit).filter(Boolean)
    : [];
  const enemies = Array.isArray(view.enemies)
    ? view.enemies.slice(0, MAX_UNITS).flatMap(enemy => {
        const unit = normalizeUnit(enemy);
        if (!unit) return [];
        return [{
          ...unit,
          knownAffinities: affinityList(enemy.knownAffinities),
          status: cleanText(enemy.status, 24),
          enraged: enemy.enraged === true,
          intent: enemy.intent ? {
            label: cleanText(enemy.intent.label, 40),
            elementLabel: cleanText(enemy.intent.elementLabel, 24),
          } : null,
        }];
      })
    : [];
  const actions = Array.isArray(view.actions)
    ? view.actions
        .filter(action => action && !['items', 'advisor'].includes(action.type))
        .slice(0, MAX_ACTIONS)
        .map(action => ({
          actionKey: actionKey(action),
          type: cleanText(action.type, 24),
          label: cleanText(action.label, 40),
          detail: cleanText(action.detail, 100),
          cost: finiteNumber(action.cost, 0, 9999),
          disabled: action.disabled === true,
          element: cleanText(action.element, 24),
          targetSide: ['enemy', 'ally', 'self', 'none'].includes(action.targetSide)
            ? action.targetSide
            : 'none',
        }))
        .filter(action => action.actionKey && action.type && action.label)
    : [];
  return {
    round: finiteNumber(view.round, 1, 99, 1),
    actor,
    party,
    enemies,
    actions,
    targets: [
      ...party.filter(unit => !unit.down).map(unit => ({
        id: unit.id,
        name: unit.name,
        side: 'party',
        hp: unit.hp,
        maxHp: unit.maxHp,
      })),
      ...enemies.filter(unit => !unit.down).map(unit => ({
        id: unit.id,
        name: unit.name,
        side: 'enemy',
        hp: unit.hp,
        maxHp: unit.maxHp,
      })),
    ],
  };
}

export function offlineBattleAdvice(snapshot, mode = 'offline') {
  const actions = (snapshot?.actions ?? []).filter(action => !action.disabled);
  const enemies = (snapshot?.enemies ?? []).filter(enemy => !enemy.down);
  const party = (snapshot?.party ?? []).filter(member => !member.down);
  if (!actions.length || !enemies.length) return null;
  const weakElements = new Set(
    enemies.flatMap(enemy => (enemy.knownAffinities ?? [])
      .filter(item => item.affinity === 'weak')
      .map(item => item.element)),
  );
  const lowParty = party.slice().sort(
    (left, right) => left.hp / left.maxHp - right.hp / right.maxHp,
  )[0];
  const heal = actions.find(action => (
    action.element === 'healing'
    && lowParty
    && lowParty.hp / lowParty.maxHp <= 0.4
  ));
  const weakSkill = actions.find(action => (
    action.type === 'skill'
    && action.targetSide === 'enemy'
    && weakElements.has(action.element)
  ));
  const basic = actions.find(action => action.type === 'basic');
  const chosen = heal ?? weakSkill ?? basic ?? actions[0];
  if (heal) {
    return {
      mode,
      actionKey: heal.actionKey,
      targetId: lowParty?.id ?? '',
      reason: `${lowParty?.name ?? '队伍'}的 HP 已偏低，优先用${heal.label}稳住血线。`,
      confidence: 72,
    };
  }
  if (weakSkill) {
    const target = enemies.find(enemy => (enemy.knownAffinities ?? []).some(
      item => item.element === weakSkill.element && item.affinity === 'weak',
    )) ?? enemies[0];
    return {
      mode,
      actionKey: weakSkill.actionKey,
      targetId: target?.id ?? '',
      reason: `${target?.name ?? '目标'}已经暴露${weakSkill.detail || '弱点'}，先用对应属性试探。`,
      confidence: 78,
    };
  }
  return {
    mode,
    actionKey: chosen.actionKey,
    targetId: chosen.targetSide === 'enemy' ? enemies[0].id : '',
    reason: '目前没有已确认的弱点，先用低消耗行动保留 SP，再根据结果调整。',
    confidence: 58,
  };
}

export function normalizeBattleAdvice(raw, snapshot, mode = 'ai') {
  if (!raw || typeof raw !== 'object') throw new Error('战斗建议格式错误');
  const action = (snapshot?.actions ?? []).find(item => (
    item.actionKey === raw.actionKey && !item.disabled
  ));
  if (!action) throw new Error('战斗建议包含不存在的行动');
  const targetId = cleanText(raw.targetId, 48);
  if (targetId) {
    const target = (snapshot?.targets ?? []).find(item => item.id === targetId);
    if (!target) throw new Error('战斗建议包含不存在的目标');
    if (action.targetSide === 'enemy' && target.side !== 'enemy') {
      throw new Error('战斗建议把敌方技能指向了我方');
    }
    if (action.targetSide === 'ally' && target.side !== 'party') {
      throw new Error('战斗建议把支援技能指向了敌方');
    }
    if (action.targetSide === 'none') throw new Error('无目标行动不应指定目标');
  }
  const reason = cleanText(raw.reason, 140);
  if (!reason) throw new Error('战斗建议缺少理由');
  return {
    mode,
    actionKey: action.actionKey,
    targetId,
    reason,
    confidence: finiteNumber(raw.confidence, 0, 100),
  };
}

function namedError(name, message) {
  const error = new Error(message);
  error.name = name;
  return error;
}

function withTimeout(task, timeoutMs, signal) {
  if (signal?.aborted) return Promise.reject(namedError('AbortError', 'aborted'));
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      fn(value);
    };
    const onAbort = () => finish(reject, namedError('AbortError', 'aborted'));
    const timer = setTimeout(
      () => finish(reject, namedError('TimeoutError', '战斗顾问响应超时')),
      timeoutMs,
    );
    signal?.addEventListener('abort', onAbort, { once: true });
    Promise.resolve(task()).then(
      value => finish(resolve, value),
      error => finish(reject, error),
    );
  });
}

export async function requestBattleAdvice(
  snapshot,
  { signal, onStatus, timeoutMs = 7000 } = {},
) {
  const bridge = globalThis.MASKARIA_AI?.adviseBattle;
  if (typeof bridge !== 'function') return offlineBattleAdvice(snapshot);
  try {
    onStatus?.('导航员正在读取战场。');
    const raw = await withTimeout(
      () => bridge(snapshot, { signal, onStatus }),
      timeoutMs,
      signal,
    );
    return normalizeBattleAdvice(raw, snapshot);
  } catch (error) {
    if (error?.name === 'AbortError' && signal?.aborted) throw error;
    onStatus?.('模型没有回应，改用离线建议。');
    return offlineBattleAdvice(snapshot);
  }
}

export function installPreviewBattleAdvisorBridge() {
  if (typeof globalThis.MASKARIA_AI?.adviseBattle === 'function') return false;
  const previous = globalThis.MASKARIA_AI;
  globalThis.MASKARIA_AI = {
    ...(previous && typeof previous === 'object' ? previous : {}),
    adviseBattle: async input => offlineBattleAdvice(input, 'preview'),
  };
  return true;
}

export function installParentBattleAdvisorBridge({
  parent = globalThis.parent,
  origin = globalThis.location?.origin,
} = {}) {
  if (!parent || parent === globalThis || !origin) return false;
  if (typeof globalThis.MASKARIA_AI?.adviseBattle === 'function') return false;
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
    if (message.type === ADVISOR_STATUS) {
      const status = cleanText(message.status, 120);
      if (status) item.onStatus?.(status);
      return;
    }
    if (message.type !== ADVISOR_RESULT) return;
    cleanup(item);
    if (message.ok) {
      item.resolve(message.value);
      return;
    }
    item.reject(namedError(
      message.errorName === 'AbortError' ? 'AbortError' : 'Error',
      cleanText(message.error, 200) || 'AI 请求失败',
    ));
  };

  globalThis.addEventListener?.('message', onMessage);
  const previous = globalThis.MASKARIA_AI;
  globalThis.MASKARIA_AI = {
    ...(previous && typeof previous === 'object' ? previous : {}),
    adviseBattle(input, { signal, onStatus } = {}) {
      return new Promise((resolve, reject) => {
        if (signal?.aborted) {
          reject(namedError('AbortError', 'aborted'));
          return;
        }
        const id = `advisor-${Date.now().toString(36)}-${++sequence}`;
        const onAbort = () => {
          cleanup(pending.get(id));
          parent.postMessage({
            source: PARENT_AI_SOURCE,
            type: ADVISOR_CANCEL,
            id,
          }, origin);
          reject(namedError('AbortError', 'aborted'));
        };
        pending.set(id, { id, resolve, reject, signal, onAbort, onStatus });
        signal?.addEventListener('abort', onAbort, { once: true });
        parent.postMessage({
          source: PARENT_AI_SOURCE,
          type: ADVISOR_REQUEST,
          id,
          input,
        }, origin);
      });
    },
  };
  return true;
}
