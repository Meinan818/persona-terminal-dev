/**
 * 觉醒契约的纯状态转换。
 *
 * 塔门有两个条件：影时间已开启，且玩家已经与一张 Persona 立约。
 * 觉醒记录只保存契约身份和这次的“回声”，不写入主 App 的私人正文。
 */

export function canEnterTower({ shadowActive = false, personaCreated = false } = {}) {
  return Boolean(shadowActive && personaCreated);
}

export function buildAwakeningRecord({
  personaId,
  name,
  memory = '',
  diagnosis = '',
  mode = 'offline',
  traits = '',
  sources = [],
  now = Date.now(),
} = {}) {
  return {
    personaId: String(personaId ?? ''),
    name: String(name ?? '').trim().slice(0, 32),
    memory: String(memory ?? '').trim().slice(0, 240),
    diagnosis: String(diagnosis ?? '').trim().slice(0, 240),
    mode: mode === 'ai' ? 'ai' : 'offline',
    traits: String(traits ?? '').trim().slice(0, 240),
    sources: Array.isArray(sources) ? sources.slice(0, 2).map(Number) : [],
    createdAt: Number(now) || Date.now(),
  };
}

export function awakeningSummary(record) {
  if (!record?.personaId) return '尚未立约';
  return `${record.name || record.personaId} · ${record.mode === 'ai' ? '面具回应' : '旧契约回应'}`;
}
