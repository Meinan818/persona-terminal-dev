/** 弹层注册表（合并 5 个工作包）。不要直接改这里——改 overlays.pkgN.ts。 */
import type { OverlayRegistry } from './types';
import { overlays as o1 } from './overlays.pkg1';
import { overlays as o2 } from './overlays.pkg2';
import { overlays as o3 } from './overlays.pkg3';
import { overlays as o4 } from './overlays.pkg4';
import { overlays as o5 } from './overlays.pkg5';

export const OVERLAYS: OverlayRegistry = { ...o1, ...o2, ...o3, ...o4, ...o5 };
export type { OverlayEntry, OverlayProps } from './types';
