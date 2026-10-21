/**
 * 布局模式（对齐真实 src/ui/layoutMode.ts）：宽屏左侧栏 = 侧栏偏好开 且 innerWidth ≥ 768。
 *   390×844 / 360×800 → 底部导航；1440×900 / 844×390（横屏手机）→ 左侧栏。
 * 写 <html class="layout-wide">，tailwind 的 wide: / wide-lg: 变体只在该 class 下生效。
 */
import { useSyncExternalStore } from 'react';
import { getPrefs } from './prefs';

const compute = () => getPrefs().sidebar && window.innerWidth >= 768;
let wide = typeof window !== 'undefined' ? compute() : false;
const listeners = new Set<() => void>();

export function applyLayout(): void {
  wide = compute();
  document.documentElement.classList.toggle('layout-wide', wide);
  listeners.forEach((l) => l());
}

let inited = false;
export function initLayout(): void {
  if (inited) return;
  inited = true;
  applyLayout();
  let t = 0;
  const on = () => { window.clearTimeout(t); t = window.setTimeout(applyLayout, 80); };
  window.addEventListener('resize', on);
  window.addEventListener('orientationchange', on);
}

const sub = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
export const useWideLayout = (): boolean => useSyncExternalStore(sub, () => wide, () => false);
export const isPhoneLayout = () => !wide;

/** 视口宽度（PageHeader 360–390 自动 compact 用） */
const subW = (fn: () => void) => { window.addEventListener('resize', fn); return () => window.removeEventListener('resize', fn); };
export const useViewportWidth = (): number => useSyncExternalStore(subW, () => window.innerWidth, () => 390);
