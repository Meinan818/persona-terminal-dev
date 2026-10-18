/**
 * 今夜请求：每座塔给一个短目标，完成后在据点结算。
 * 请求只读取本夜 run 的事件，不写入主 App 的任务或记账。
 */

export const REQUESTS = {
  elite: {
    id: 'elite',
    title: '折断守层者',
    desc: '击败 1 名强敌。',
    target: 1,
    money: 900,
    item: '守层者的碎片',
  },
  keys: {
    id: 'keys',
    title: '带回钥匙',
    desc: '收集 2 把旧钥匙。',
    target: 2,
    money: 600,
    item: '旧钥匙',
  },
  safe: {
    id: 'safe',
    title: '在黑暗里喘口气',
    desc: '在安全屋休息 1 次。',
    target: 1,
    money: 500,
    item: '安眠香',
  },
  boss: {
    id: 'boss',
    title: '走到塔顶',
    desc: '击破塔顶的心魔。',
    target: 1,
    money: 1500,
    item: '心魔的残片',
  },
};

export function requestForStratum(stratumId) {
  if (stratumId === 'vanity') return 'keys';
  if (stratumId === 'escape') return 'safe';
  return 'elite';
}

export function createRequest(id) {
  const definition = REQUESTS[id] ?? REQUESTS.elite;
  return {
    id: definition.id,
    title: definition.title,
    desc: definition.desc,
    target: definition.target,
    progress: 0,
    completed: false,
    money: definition.money,
    item: definition.item,
  };
}

export function recordRequest(request, event) {
  if (!request || request.completed) return { request, completed: false };
  const eventToRequest = { elite: 'elite', key: 'keys', safe: 'safe', boss: 'boss' };
  if (eventToRequest[event] !== request.id) return { request, completed: false };
  const next = { ...request, progress: Math.min(request.target, request.progress + 1) };
  next.completed = next.progress >= next.target;
  return { request: next, completed: next.completed };
}
