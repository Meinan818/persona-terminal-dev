// M5 商店规则（D-007）：零 DOM。买/卖/装备/对比都在这里结算，写进 Save（金钱、背包、装备），再由画面层演出。
import SHOP from './data/shop.json';
import type { Save } from './run';

export type Slot = 'melee' | 'gun' | 'armor' | 'acc';
export interface EquipDef { slot: Slot; who: string[]; price: number; atk?: number; def?: number; hp?: number; sp?: number; mag?: number; start?: boolean }
export interface ConsDef { price: number; hp?: number; sp?: number; revive?: number; all?: boolean }
export const EQUIP = SHOP.equip as unknown as Record<string, EquipDef>;
export const CONS = SHOP.consumable as Record<string, ConsDef>;
export const TREASURE = SHOP.treasure as Record<string, number>;
export const SHOPS = SHOP.shops as unknown as Record<string, { kind: string; keeper: string; theme: string; name: string; menu: { id: string; items?: string[] }[] }>;
export const SLOTS: Slot[] = ['melee', 'gun', 'armor', 'acc'];
export type Kind = 'equip' | 'cons' | 'treasure';
export const kindOf = (id: string): Kind => (EQUIP[id] ? 'equip' : CONS[id] ? 'cons' : 'treasure');
export const priceOf = (id: string) => EQUIP[id]?.price ?? CONS[id]?.price ?? 0;
export const sellPriceOf = (id: string) => (TREASURE[id] != null ? TREASURE[id] : Math.floor(priceOf(id) * SHOP.sellRate));

/** 初始装备（每人 4 槽：近战/远程/防具/饰品），按数据表 start 标记 */
export function startEquip(id: string): Record<Slot, string | null> {
  const pick = (s: Slot) => Object.entries(EQUIP).find(([, e]) => e.start && e.slot === s && e.who.includes(id))?.[0] ?? null;
  return { melee: pick('melee'), gun: pick('gun'), armor: pick('armor'), acc: null };
}
/** 一件装备给某人的五项数值（装备栏/对比用） */
export function statOf(eqId: string | null): { atk: number; def: number; hp: number; sp: number; mag: number } {
  const e = eqId ? EQUIP[eqId] : null; return { atk: e?.atk ?? 0, def: e?.def ?? 0, hp: e?.hp ?? 0, sp: e?.sp ?? 0, mag: e?.mag ?? 0 };
}
/** 对比：买下 item 后某人的主数值变化（P5R 列表右侧 ↑↓ 箭头）。不能装备 → null */
export function compare(save: Save, member: string, item: string): { cur: number; next: number; d: number; key: string } | null {
  const e = EQUIP[item]; if (!e || !e.who.includes(member)) return null;
  const cur = save.equip[member]?.[e.slot] ?? null;
  const key = e.slot === 'armor' ? 'def' : e.slot === 'acc' ? (e.mag ? 'mag' : e.hp ? 'hp' : 'sp') : 'atk';
  const v = (id: string | null) => { const s = statOf(id) as any; return key === 'mag' ? Math.round(s.mag * 100) : s[key]; };
  const a = v(cur), b = v(item); return { cur: a, next: b, d: b - a, key };
}
/** 战斗用装备修正（Carry.eq）：近战/远程/魔法伤害倍率增量、受伤减免、HP/SP 上限加值 */
export function battleEq(save: Save, member: string) {
  const q = save.equip[member]; if (!q) return { phys: 0, gun: 0, mag: 0, def: 0, hp: 0, sp: 0 };
  const sc = SHOP.eqScale as unknown as Record<string, [number, number]>;
  const m = statOf(q.melee), g = statOf(q.gun), a = statOf(q.armor), x = statOf(q.acc);
  return { phys: (m.atk - sc.melee[0]) / sc.melee[1], gun: (g.atk - sc.gun[0]) / sc.gun[1], mag: x.mag, def: Math.max(0, (a.def - sc.def[0]) / sc.def[1]), hp: x.hp, sp: x.sp };
}

export interface TxResult { ok: boolean; reason?: 'money' | 'stack' | 'none' | 'equipped'; money: number; have: number }
/** 买：扣钱、进背包；装备买来放背包（装上由 equip 决定）。数量上限 maxStack */
export function buy(save: Save, item: string, qty: number): TxResult {
  const cost = priceOf(item) * qty; const have = save.items[item] ?? 0;
  if (qty < 1) return { ok: false, reason: 'none', money: save.money, have };
  if (cost > save.money) return { ok: false, reason: 'money', money: save.money, have };
  if (have + qty > SHOP.maxStack) return { ok: false, reason: 'stack', money: save.money, have };
  save.money -= cost; save.items[item] = have + qty; save.persist();
  return { ok: true, money: save.money, have: save.items[item] };
}
/** 卖：只卖背包里的（身上装着的不算） */
export function sell(save: Save, item: string, qty: number): TxResult {
  const have = save.items[item] ?? 0;
  if (qty < 1 || qty > have) return { ok: false, reason: 'none', money: save.money, have };
  save.items[item] = have - qty; if (!save.items[item]) delete save.items[item];
  save.money += sellPriceOf(item) * qty; save.persist();
  return { ok: true, money: save.money, have: save.items[item] ?? 0 };
}
/** 装备：背包里的一件换到身上，旧的回背包 */
export function equip(save: Save, member: string, item: string): boolean {
  const e = EQUIP[item]; if (!e || !e.who.includes(member) || !(save.items[item] > 0)) return false;
  const q = save.equip[member] ?? (save.equip[member] = startEquip(member)); const old = q[e.slot];
  q[e.slot] = item; save.items[item]--; if (!save.items[item]) delete save.items[item];
  if (old && !EQUIP[old].start) save.items[old] = (save.items[old] ?? 0) + 1;
  save.persist(); return true;
}
/** 可卖清单：背包里的消耗品/装备/宝物（数量>0） */
export function sellable(save: Save) { return Object.entries(save.items).filter(([k, n]) => n > 0 && (EQUIP[k] || CONS[k] || TREASURE[k] != null)).map(([k]) => k); }
