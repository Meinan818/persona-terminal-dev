/* 工作包 4 · 统计页假数据：按 Statistics.tsx 的口径从「记录」现算。 */
import type { AttributeId } from '@/types';
import { ATTR_IDS } from './pkg4-tarot';

export interface StatActivity { date: string; pts: Partial<Record<AttributeId, number>> }
const pad = (n: number) => String(n).padStart(2, '0');
const key = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** 过去 60 天的记录（确定性伪随机，截图稳定） */
export const ACTIVITIES: StatActivity[] = (() => {
  const out: StatActivity[] = [];
  let seed = 7;
  const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  for (let i = 59; i >= 0; i--) {
    if (rnd() < 0.18 && i > 3) continue;
    const d = new Date(); d.setDate(d.getDate() - i);
    const n = 1 + Math.floor(rnd() * 3);
    for (let k = 0; k < n; k++) {
      const pts: Partial<Record<AttributeId, number>> = {};
      const a = ATTR_IDS[Math.floor(rnd() * 5)]; pts[a] = 1 + Math.floor(rnd() * 3);
      if (rnd() < 0.3) { const b = ATTR_IDS[Math.floor(rnd() * 5)]; pts[b] = (pts[b] ?? 0) + 1; }
      out.push({ date: key(d), pts });
    }
  }
  return out;
})();

export const ATTR_LEVELS: Record<AttributeId, number> = { knowledge: 4, guts: 3, dexterity: 3, kindness: 5, charm: 2 };
export const ACHIEVEMENTS = { unlocked: 23, total: 64 };
export const SKILLS = { unlocked: 9, total: 30 };
