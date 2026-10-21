/**
 * FX 审计补齐（演出总览）的弹窗登记。见 FX-AUDIT.md / src/fxCatalog.ts。
 */
import type { OverlayRegistry } from './types';

export const overlays: OverlayRegistry = {
  'fx-showreel': { title: '演出总览 · 一键连播全部演出（?from=<fx id>|?only=<fx id>）', load: () => import('@yellow/screens/overlays/FxShowreel.p4g'), backdrop: 'page:dashboard' },
  'fx-brand-title-reveal': { title: '品牌标题揭示 BrandTitleReveal（P4G 版）', load: () => import('@yellow/screens/overlays/BrandTitleReveal.p4g'), backdrop: 'page:dashboard' },
};
