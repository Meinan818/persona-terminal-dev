/**
 * 布局档位（与原生 demo 完全一致，不是 tailwind md/lg）：
 *   phone  竖屏 / <700：底栏 5 键
 *   land   700–1023 且横屏（如 844×390）：窄侧栏 168px + 竖屏单列内容（render(wide=false)）
 *   wide   ≥1024 且横屏（如 1440×900）：宽侧栏 248px + 单独构图（原 P5.isWide()）
 * CSS 侧用 shell.css 里的同名媒体查询；JS 侧用 useWide()/useLand()。tailwind 变体 land: / wide:。
 */
import { useSyncExternalStore } from 'react';

const WIDE_Q = '(min-width: 1024px) and (orientation: landscape)';
const LAND_Q = '(min-width: 700px) and (max-width: 1023px) and (orientation: landscape)';
const mqW = typeof window !== 'undefined' ? window.matchMedia(WIDE_Q) : null;
const mqL = typeof window !== 'undefined' ? window.matchMedia(LAND_Q) : null;
const sub = (m: MediaQueryList | null) => (fn: () => void) => { m?.addEventListener('change', fn); return () => m?.removeEventListener('change', fn); };
const subW = sub(mqW), subL = sub(mqL);

/** 原 P5.isWide()：电脑横屏单独构图 */
export const isWide = () => !!mqW?.matches;
export const useWide = (): boolean => useSyncExternalStore(subW, isWide, () => false);
/** 手机横屏（窄侧栏、内容仍竖屏构图） */
export const isLand = () => !!mqL?.matches;
export const useLand = (): boolean => useSyncExternalStore(subL, isLand, () => false);
/** 是否显示侧栏（land 或 wide） */
export const useSidebar = (): boolean => { const w = useWide(); const l = useLand(); return w || l; };
