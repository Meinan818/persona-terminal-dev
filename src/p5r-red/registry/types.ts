/**
 * 注册表类型。页面 / 弹层工作者只在自己的 pkgN 文件里登记（避免并行冲突）：
 *
 *   // src/registry/pages.pkg4.ts
 *   import type { PageRegistry } from './types';
 *   import { defaultStage } from '@/p5r-red/fx/bg';
 *   export const pages: PageRegistry = {
 *     ledger: { title: '记账', nav: 'ledger', load: () => import('@/p5r-red/screens/pages/Ledger.p5r'),
 *               stage: (wide) => defaultStage(wide, { seed: 41, sil: 'cat' }) },
 *   };
 *
 * 字段与原生 P5.page(id, { nav, title, flush, stage(wide), render(wide), mount, enter }) 一一对应：
 *   nav    底栏/侧栏高亮哪一键（dashboard | actions | cooperation | ledger | menu）
 *   flush  页面容器 .page.flush（无内边距，整页自排版）
 *   stage  #stage-bg 舞台（默认 defaultStage(wide)）
 *   render/mount/enter → 组件本身（enter 动效写在 useEffect 里，低动效跳过）
 * 组件需 `export default`；页面收到 PageProps，弹层收到 OverlayProps。
 */
import type { ComponentType } from 'react';
import type { StageSpec } from '@/p5r-red/fx/bg';

export type NavKey = 'dashboard' | 'actions' | 'cooperation' | 'ledger' | 'menu' | '';
export interface PageProps {
  pageId: string;
  /** 子视图 ?tab=（如 actions?tab=todos|activities、achievements?tab=codex） */
  tab?: string;
  /** 完整查询串（?tab=&view=&state=…）；外壳参数带 __ 前缀，已被外壳消费 */
  params: URLSearchParams;
  /** 电脑横屏单独构图（原 render(wide) 的 wide = P5.isWide()）。切换时页面会重挂载（同原生 rerender + enter） */
  wide: boolean;
}
export interface OverlayProps {
  open: boolean;
  onClose: () => void;
  /** 演示参数（#/overlay/X?step=&state=&variant= / openOverlay(id, params)） */
  params?: URLSearchParams;
}

type Loader<P> = () => Promise<{ default: ComponentType<P> }>;

export interface PageEntry { title: string; load: Loader<PageProps>; nav?: NavKey; flush?: boolean; stage?: (wide: boolean, q?: URLSearchParams) => StageSpec; /** 隐藏底栏 / 侧栏（开屏等全屏页） */ chromeless?: boolean }
export interface OverlayEntry {
  title: string; load: Loader<OverlayProps>;
  /** 预览背景：'page:<pageId>' 在该页上弹出（页面不可交互）；缺省 = 默认舞台 */ backdrop?: string;
  /** 预置演示参数（与 URL 查询合并，URL 优先）——同一组件的多个 inventory / fx 条目用它区分 ?variant= / ?step= / ?state= */ params?: Record<string, string>;
  /** 演出类：播放时长（ms，连播每段时长；缺省读 fxCatalog） */ ms?: number;
}

export type PageRegistry = Record<string, PageEntry>;
export type OverlayRegistry = Record<string, OverlayEntry>;
