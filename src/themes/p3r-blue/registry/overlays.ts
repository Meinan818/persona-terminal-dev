/** 弹窗注册表：自动合并 ./overlays.pkg*.ts（各工作包只改自己那份）。不要直接改这里。 */
import type { OverlayRegistry } from './types';

const mods = import.meta.glob<{ overlays: OverlayRegistry }>('./overlays.pkg*.ts', { eager: true });
export const OVERLAYS: OverlayRegistry = {};
for (const path of Object.keys(mods).sort()) {
  for (const [k, v] of Object.entries(mods[path].overlays ?? {})) {
    if (OVERLAYS[k]) console.warn(`[registry] 弹窗 key 重复：${k}（${path}），以先登记的为准`);
    else OVERLAYS[k] = v;
  }
}
export type { OverlayEntry, OverlayProps } from './types';
