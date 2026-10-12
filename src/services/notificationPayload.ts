/**
 * 通知 payload 的清洗（从 notifications.ts 抽出，供 PB 侧与自研后端侧共用）。
 *
 * 通知是别人写来的：字段类型、长度都不能信。这里按键把类型对齐、把长度截掉，
 * 面板那边就可以放心当字符串用。认不出的键原样保留（限 2KB），嵌套对象只留小的。
 *
 * 独立成模块的原因：notifications.ts（分流层）与 notificationsApi.ts（自研侧）
 * 都要用它；留在 notifications.ts 会让两边互相 import 形成运行时循环依赖。
 */

/** payload 里各字段的上限：字符串键超长就截，其余键 200 字；不是字符串的一律丢（面板直接 .trim/.slice，类型错了会整页崩） */
const PAYLOAD_STRING_MAX: Record<string, number> = {
  title: 60, message: 200, narrative: 400, persona_name: 40, skill_name: 40, archetype_id: 40, event: 20,
  pact_kind: 10, mode: 10, deadline: 10, shadow_id: 20, pact_id: 20, friendship_id: 20, coop_bond_id: 20,
  prayer_id: 20, coop_link_id: 20, kind: 40,
};
const PAYLOAD_NUMBER_KEYS = new Set(['days', 'damage', 'hp_remaining', 'delta', 'sp']);
const PAYLOAD_BOOL_KEYS = new Set(['resonance_bonus', 'weakness_bonus', 'all_out']);

export function sanitizeNotificationPayload(raw: unknown): Record<string, unknown> | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
    if (k in PAYLOAD_STRING_MAX) {
      if (typeof v !== 'string') continue;
      const max = PAYLOAD_STRING_MAX[k];
      out[k] = [...v].length > max ? [...v].slice(0, max).join('') : v;
    } else if (PAYLOAD_NUMBER_KEYS.has(k)) {
      if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
    } else if (PAYLOAD_BOOL_KEYS.has(k)) {
      out[k] = v === true;
    } else if (typeof v === 'string') {
      out[k] = [...v].length > 200 ? [...v].slice(0, 200).join('') : v;
    } else if (typeof v === 'number') {
      if (Number.isFinite(v)) out[k] = v;
    } else if (typeof v === 'boolean') {
      out[k] = v;
    } else if (v && typeof v === 'object') {
      try {
        const text = JSON.stringify(v);
        if (text.length <= 2048) out[k] = JSON.parse(text);
      } catch { /* 循环引用之类：丢掉 */ }
    }
  }
  return out;
}
