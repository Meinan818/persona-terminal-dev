import {
  UMBRA_SCHEMA_VERSION,
  type UmbraRunRecord,
} from '@/umbra/state';

const cleanId = (value: unknown): string => (
  typeof value === 'string' ? value.trim().slice(0, 80) : ''
);

/**
 * 建立一条可被正式存档保存的 UMBRA 行程。
 * payload 由 UMBRA 规则层提供，这里只负责身份、版本和时间边界。
 */
export function createUmbraRunRecord(
  id: unknown,
  payload: Record<string, unknown>,
  now = new Date(),
): UmbraRunRecord {
  const runId = cleanId(id);
  if (!runId) throw new Error('UMBRA 行程缺少 id');
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('UMBRA 行程 payload 必须是对象');
  }
  const snapshot = typeof structuredClone === 'function'
    ? structuredClone(payload)
    : JSON.parse(JSON.stringify(payload)) as Record<string, unknown>;
  return {
    id: runId,
    schemaVersion: UMBRA_SCHEMA_VERSION,
    active: true,
    updatedAt: new Date(now),
    payload: snapshot,
  };
}

export function isUmbraRunCompatible(run: UmbraRunRecord | null | undefined): boolean {
  return run?.schemaVersion === UMBRA_SCHEMA_VERSION
    && typeof run.id === 'string'
    && Boolean(run.id.trim())
    && Boolean(run.payload && typeof run.payload === 'object' && !Array.isArray(run.payload));
}
