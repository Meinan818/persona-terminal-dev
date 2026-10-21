/** 页面注册表：自动合并 ./pages.pkg*.ts（各工作包只改自己那份）。不要直接改这里。 */
import type { PageRegistry } from './types';

const mods = import.meta.glob<{ pages: PageRegistry }>('./pages.pkg*.ts', { eager: true });
export const PAGES: PageRegistry = {};
for (const path of Object.keys(mods).sort()) {
  for (const [k, v] of Object.entries(mods[path].pages ?? {})) {
    if (PAGES[k]) console.warn(`[registry] 页面 key 重复：${k}（${path}），以先登记的为准`);
    else PAGES[k] = v;
  }
}
export type { PageEntry, PageProps } from './types';
