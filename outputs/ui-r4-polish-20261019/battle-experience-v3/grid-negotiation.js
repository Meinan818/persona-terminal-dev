/**
 * 格子高塔 · 影子房交涉资料
 *
 * 只负责把地图遭遇变成一份稳定的人格/开场/索求；判定与代价仍由 night-slice.js。
 */

import { offlineNegotiation } from './negotiation-ai.js';
import { PERSONALITIES } from './negotiation-rules.js';

export const SHADOW_ATTRIBUTES = ['知识', '勇气', '灵巧', '体贴', '魅力'];

function hashString(value) {
  let hash = 2166136261;
  const text = String(value ?? '');
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function shadowProfileFor(encounter = {}, floor = 1) {
  const rawName = typeof encounter?.name === 'string' ? encounter.name.trim() : '';
  const name = rawName || '诡辩之影';
  const attribute = SHADOW_ATTRIBUTES[hashString(`${name}|${floor}`) % SHADOW_ATTRIBUTES.length];
  const base = offlineNegotiation({
    enemy: { name, attribute, level: Number(encounter?.level) || floor },
  });
  const personality = PERSONALITIES[base.personality] ? base.personality : 'calm';
  return {
    name,
    attribute,
    personality,
    personalityLabel: PERSONALITIES[personality].label,
    opening: base.opening,
    demand: base.demand,
  };
}
