/**
 * 红色审计回补（MASTER-GAP「红色独有项」，2026-10-21）的弹窗登记。
 */
import type { OverlayRegistry } from './types';

export const overlays: OverlayRegistry = {
  'actions-wish-mount': { title: '挂到愿望 WishMountPicker（记录 / 任务 / 黑猫卡 compact）', load: () => import('@yellow/screens/overlays/WishMountPicker.p4g'), backdrop: 'page:actions' },
  'bond-namefx': { title: '名字特效 ConfidantNameFx（P4 分支：待回祈流光 / 满级粒子）', load: () => import('@yellow/screens/overlays/ConfidantNameFx.p4g'), backdrop: 'page:cooperation' },
};
