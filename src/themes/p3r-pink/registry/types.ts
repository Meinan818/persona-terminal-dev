/**
 * 注册表类型。页面 / 弹窗代理只在自己工作包的文件里登记（pages.pkgN.ts / overlays.pkgN.ts），
 * pages.ts / overlays.ts 用 import.meta.glob 自动合并全部 pkg 文件 → 6 包并行写入互不冲突（不需要改任何公共文件）。
 *
 *   // src/registry/pages.pkg5.ts
 *   import type { PageRegistry } from './types';
 *   export const pages: PageRegistry = {
 *     ledger: { title: '记账', load: () => import('@pink/screens/pages/Ledger.p3r') },
 *   };
 *
 * 组件 `export default`；页面收到 PageProps（tab 来自 ?tab=，params 是完整查询串），弹窗收到 OverlayProps。
 * key 冲突（两个包登记同一个 key）会在控制台报警并以包号小的为准——key 一律用 INVENTORY 的路由 id，天然不撞。
 */
import type { ComponentType } from 'react';

export interface PageProps { pageId: string; tab?: string; params: URLSearchParams }
export interface OverlayProps { open: boolean; onClose: () => void; /** Harness 传入的演示参数（?step=… 等） */ params?: URLSearchParams }

type Loader<P> = () => Promise<{ default: ComponentType<P> }>;

export interface PageEntry { title: string; load: Loader<PageProps>; /** 隐藏外壳导航（开屏 / 登录等全屏页） */ chromeless?: boolean }
export interface OverlayEntry {
  title: string;
  load: Loader<OverlayProps>;
  /** Harness 背景：stage（默认粉舞台）| page:<pageId>（在某页面上弹出） */
  backdrop?: string;
  /** 全屏演出：Harness 不画背景页、不挂舞台装饰 */
  fullscreen?: boolean;
}

export type PageRegistry = Record<string, PageEntry>;
export type OverlayRegistry = Record<string, OverlayEntry>;
