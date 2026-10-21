/**
 * 注册表类型。页面 / 弹窗代理在自己的 pkgN 文件里登记：
 *
 *   // src/registry/pages.pkg3.ts
 *   import type { PageRegistry } from './types';
 *   export const pages: PageRegistry = {
 *     ledger: { title: '记账', load: () => import('@yellow/screens/pages/Ledger.p4g') },
 *   };
 *
 * 组件文件需 `export default`；页面收到 PageProps（tab 来自 ?tab=，params 是完整查询串），
 * 弹窗收到 OverlayProps（open/onClose，由 Harness 或调用方控制）。
 */
import type { ComponentType } from 'react';

export interface PageProps { pageId: string; tab?: string; params: URLSearchParams }
export interface OverlayProps { open: boolean; onClose: () => void; /** Harness 传入的演示参数（?variant=… 等）*/ params?: URLSearchParams }

type Loader<P> = () => Promise<{ default: ComponentType<P> }>;

export interface PageEntry { title: string; load: Loader<PageProps>; /** 是否隐藏外壳导航（开屏 / 登录等全屏页）*/ chromeless?: boolean }
export interface OverlayEntry { title: string; load: Loader<OverlayProps>; /** Harness 背景：stage（默认黄舞台）| page:<pageId>（在某页面上弹出）*/ backdrop?: string }

export type PageRegistry = Record<string, PageEntry>;
export type OverlayRegistry = Record<string, OverlayEntry>;
