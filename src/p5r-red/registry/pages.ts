/** 页面注册表（合并 5 个工作包）。不要直接改这里——改 pages.pkgN.ts。 */
import type { PageRegistry } from './types';
import { pages as p1 } from './pages.pkg1';
import { pages as p2 } from './pages.pkg2';
import { pages as p3 } from './pages.pkg3';
import { pages as p4 } from './pages.pkg4';
import { pages as p5 } from './pages.pkg5';

export const PAGES: PageRegistry = { ...p1, ...p2, ...p3, ...p4, ...p5 };
export type { PageEntry, PageProps } from './types';
