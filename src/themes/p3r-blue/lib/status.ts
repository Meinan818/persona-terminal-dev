/**
 * 完成状态：合并 status/pkg*.json 的 done 数组（各工作包只改自己那份）。inventory.ts 的 status 恒为 todo。
 *   { "done": ["home-dashboard", …], "notes": { "home-dashboard": "备注" } }
 */
import { INVENTORY, type InvItem } from '@blue/inventory';

const mods = import.meta.glob<{ done?: string[]; notes?: Record<string, string> }>('/status/pkg*.json', { eager: true, import: 'default' });
const DONE = new Set<string>();
const NOTES: Record<string, string> = {};
for (const m of Object.values(mods)) {
  (m.done ?? []).forEach((id) => DONE.add(id));
  Object.assign(NOTES, m.notes ?? {});
}
export const isDone = (id: string) => DONE.has(id);
export const noteOf = (id: string) => NOTES[id];
export const withStatus = (it: InvItem): InvItem => ({ ...it, status: DONE.has(it.id) ? 'done' : 'todo' });
export const INVENTORY_LIVE: InvItem[] = INVENTORY.map(withStatus);
