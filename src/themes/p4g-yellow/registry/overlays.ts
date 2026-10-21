/** 弹窗注册表（合并 6 个工作包 + FX 审计（pkg7）+ 红色审计回补（pkg8））。不要直接改这里——改 overlays.pkgN.ts。 */
import type { OverlayRegistry } from './types';
import { overlays as o1 } from './overlays.pkg1';
import { overlays as o2 } from './overlays.pkg2';
import { overlays as o3 } from './overlays.pkg3';
import { overlays as o4 } from './overlays.pkg4';
import { overlays as o5 } from './overlays.pkg5';
import { overlays as o6 } from './overlays.pkg6';
import { overlays as o7 } from './overlays.pkg7';
import { overlays as o8 } from './overlays.pkg8';

export const OVERLAYS: OverlayRegistry = { ...o1, ...o2, ...o3, ...o4, ...o5, ...o6, ...o7, ...o8 };
export type { OverlayEntry, OverlayProps } from './types';
