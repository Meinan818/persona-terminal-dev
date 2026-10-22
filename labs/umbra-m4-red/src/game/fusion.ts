// M5 天鹅绒 · 断头台二体合成（P5R 规则）：零 DOM。数据 = data/compendium.json（P5R 232 面具 + 阿尔卡纳合成表 + 继承类型）。
// SYSTEMS-AUDIT V1：素材面具消耗、合成免费；V3：技能继承（格数按素材技能总数，数据规则见 inheritCount）；V10：普通合成不出事故。
import COMP from './data/compendium.json';
import type { Save } from './run';

export interface PDef { id: string; en: string; arc: string; lv: number; inh: string; sk: [string, number][]; st: number[]; res: string; ex: string; src: string }
export interface Owned { id: string; lv: number; skills: string[] }
export const PERSONAS = COMP.personas as unknown as PDef[];
export const BY_ID: Record<string, PDef> = Object.fromEntries(PERSONAS.map((p) => [p.id, p]));
export const ARCANA = COMP.arcana as string[];
export const SKILL_EL = COMP.skills as Record<string, string>;
const CHART = COMP.chart as Record<string, string>;
const INH = COMP.inherit as { elems: string[]; types: string[]; ratios: string[] };
/** P5R 原作阿尔卡纳缩写（列表左侧色块文字，同原作 Fool / Hiero. / Temper. / Judge.） */
export const ARC_ABBR: Record<string, string> = { fool: 'Fool', magician: 'Magician', priestess: 'Priestess', empress: 'Empress', emperor: 'Emperor', hierophant: 'Hiero.',
  lovers: 'Lovers', chariot: 'Chariot', justice: 'Justice', hermit: 'Hermit', fortune: 'Fortune', strength: 'Strength', hanged: 'Hanged', death: 'Death',
  temperance: 'Temper.', devil: 'Devil', tower: 'Tower', star: 'Star', moon: 'Moon', sun: 'Sun', judgement: 'Judge.', faith: 'Faith', councillor: 'Councillor', world: 'World' };

/** 普通合成能出的面具：排除特殊合成（含宝魔）与 DLC/Picaro */
const NORMAL = PERSONAS.filter((p) => !p.ex);
export const STOCK_MAX = 12;
/** 面具当前等级应会的技能（原作：先天 + 已到等级习得），最多 8 格 */
export function natural(p: PDef, lv = p.lv) { return p.sk.filter(([, l]) => l <= lv).map(([s]) => s).slice(0, 8); }
export function newOwned(id: string, lv?: number): Owned { const p = BY_ID[id]; return { id, lv: lv ?? p.lv, skills: natural(p, lv ?? p.lv) }; }

export type FuseFail = 'none' | 'level' | 'same' | 'owned';
export interface Preview { ok: boolean; reason?: FuseFail; result?: PDef; lv?: number; base?: string[]; cands?: string[]; k?: number; inherit?: string[] }
/** 结果面具（P5R 二体规则）：不同阿尔卡纳 → 查表，等级 = ⌊(L1+L2)/2⌋+1，取该阿尔卡纳中 ≥ 此等级的最低者（没有则取最高）；
 *  同阿尔卡纳 → 等级 = ⌊(L1+L2)/2⌋，取该阿尔卡纳中 ≤ 此等级的最高者（排除两张素材）。结果高于主角等级 → 不可合成。 */
export function result(a: Owned, b: Owned): { p?: PDef; reason?: FuseFail } {
  const pa = BY_ID[a.id], pb = BY_ID[b.id];
  if (pa.arc === pb.arc) {
    const lv = Math.floor((a.lv + b.lv) / 2);   // 原作按素材「当前等级」
    const list = NORMAL.filter((p) => p.arc === pa.arc && p.id !== a.id && p.id !== b.id && p.lv <= lv).sort((x, y) => y.lv - x.lv);
    return list[0] ? { p: list[0] } : { reason: 'none' };
  }
  const arc = CHART[pa.arc + '|' + pb.arc]; if (!arc) return { reason: 'none' };
  const lv = Math.floor((a.lv + b.lv) / 2) + 1;
  const list = NORMAL.filter((p) => p.arc === arc).sort((x, y) => x.lv - y.lv);
  if (!list.length) return { reason: 'none' };
  return { p: list.find((p) => p.lv >= lv) ?? list[list.length - 1] };
}
const ELCODE: Record<string, string> = { phys: 'phy', gun: 'gun', fire: 'fir', ice: 'ice', elec: 'ele', wind: 'win', psy: 'psy', nuke: 'nuk', bless: 'ble', curse: 'cur', ailment: 'ail', heal: 'rec' };
/** 继承限制（P5R 继承类型表 inheritance-types）：support/almighty/passive 不受限 */
export function canInherit(p: PDef, skill: string) {
  const code = ELCODE[SKILL_EL[skill] ?? 'passive']; if (!code) return true;
  const row = INH.ratios[INH.types.indexOf(p.inh)]; if (!row) return true;
  return row[INH.elems.indexOf(code)] === 'o';
}
/** 继承格数（UMBRA 数据规则，近似 P5 原作「素材技能越多可继承越多」）：总数 1–3→1、4–7→2、8–11→3、12–15→4、≥16→5，且不超过 8 格空位 */
export function inheritCount(total: number, free: number) { return Math.max(0, Math.min(free, 1 + Math.floor(total / 4), 5)); }
export function preview(save: Save, a: Owned, b: Owned, pick?: string[]): Preview {
  const r = result(a, b); if (!r.p) return { ok: false, reason: r.reason };
  const p = r.p; const jlv = save.members.joker?.lv ?? 1;
  const base = natural(p);
  const cands = [...new Set([...a.skills, ...b.skills])].filter((s) => !base.includes(s) && canInherit(p, s));
  const k = Math.min(cands.length, inheritCount(a.skills.length + b.skills.length, 8 - base.length));
  const inherit = (pick ?? cands.slice(0, k)).filter((s) => cands.includes(s)).slice(0, k);
  if (p.lv > jlv) return { ok: false, reason: 'level', result: p, lv: p.lv, base, cands, k, inherit };
  if (save.stock.some((o: Owned) => o !== a && o !== b && o.id === p.id)) return { ok: false, reason: 'owned', result: p, lv: p.lv, base, cands, k, inherit };   // 原作：已持有同名面具不能再合出
  return { ok: true, result: p, lv: p.lv, base, cands, k, inherit };
}
/** 执行合成：两张素材消耗（合成免费），结果入库存 + 登记图鉴；装备中的面具被吃掉则换装结果 */
export function fuse(save: Save, ia: number, ib: number, pick?: string[]): Owned | null {
  const a = save.stock[ia], b = save.stock[ib]; if (!a || !b || ia === ib) return null;
  const pv = preview(save, a, b, pick); if (!pv.ok || !pv.result) return null;
  const o: Owned = { id: pv.result.id, lv: pv.result.lv, skills: [...pv.base!, ...pv.inherit!].slice(0, 8) };
  const wasActive = save.activePersona === ia || save.activePersona === ib; const act = save.stock[save.activePersona];
  save.stock = save.stock.filter((_, i) => i !== ia && i !== ib); save.stock.push(o);
  if (!save.compendium.includes(o.id)) save.compendium.push(o.id);
  save.activePersona = wasActive ? save.stock.length - 1 : Math.max(0, save.stock.indexOf(act));
  save.persist(); return o;
}
/** 主角当前面具 → 战斗技能（本作战斗规则只有 16 个样板技能：按属性映射，最多 3 个） */
const BATTLE_BY_EL: Record<string, string> = { fire: 'agi', ice: 'bufu', elec: 'zio', wind: 'garu', psy: 'psi', nuke: 'frei', bless: 'kouha', curse: 'eiha', heal: 'dia' };
const BATTLE_BY_NAME: Record<string, string> = { Tarukaja: 'tarukaja', Rakukaja: 'rakukaja', Sukunda: 'sukunda', Tarunda: 'tarunda', Rakunda: 'rakunda', Lunge: 'lunge', Cleave: 'cleave' };
export function battleSkills(o: Owned): string[] {
  const out: string[] = [];
  for (const s of o.skills) {
    const id = BATTLE_BY_NAME[s] ?? (SKILL_EL[s] === 'phys' ? 'cleave' : BATTLE_BY_EL[SKILL_EL[s]]);
    if (id && !out.includes(id)) out.push(id);
    if (out.length >= 3) break;
  }
  return out.length ? out : ['cleave'];
}
/** 初始库存（P5R 序章~第一殿堂常见面具；与原作同名同表） */
export const START_STOCK = ['arsene', 'jack-o-lantern', 'pixie', 'agathion', 'mandrake', 'silky', 'kelpie', 'succubus', 'bicorn'];
