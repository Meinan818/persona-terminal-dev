/** 工作包分配（inventory-split.json 的类型化入口）。pkgOf(id) → 1..5。 */
import split from './inventory-split.json';
export interface PkgSplit { name: string; pkg: 1 | 2 | 3 | 4 | 5; ids: string[] }
export const INVENTORY_SPLIT = split as PkgSplit[];
const map = new Map<string, number>(INVENTORY_SPLIT.flatMap((p) => p.ids.map((id) => [id, p.pkg] as [string, number])));
export const pkgOf = (id: string) => map.get(id);
