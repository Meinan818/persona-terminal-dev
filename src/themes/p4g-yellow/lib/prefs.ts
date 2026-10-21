/**
 * Demo 全局偏好（Dev 胶囊）：日/夜、低动效、扫描线、侧栏布局、胶囊是否隐藏。
 * 存 localStorage（键 p4g-demo:prefs.v1，index.html 的首帧脚本读同一个键），
 * 同步写到 <html> 的 data-p4g-mode / data-p4g-motion / data-p4g-scanlines。
 *
 * 页面代理读取：
 *   const { mode, lowMotion } = usePrefs();
 *   const low = useLowMotion();   // 已合并 prefers-reduced-motion
 */
import { useEffect, useSyncExternalStore } from 'react';

export type P4GMode = 'day' | 'night';
export interface Prefs {
  mode: P4GMode;
  motion: 'full' | 'low';
  scanlines: boolean;
  sidebar: boolean;      // 宽屏时是否用左侧栏（真实 App 里是设置项；demo 默认开）
  devHidden: boolean;
}

const KEY = 'p4g-demo:prefs.v1';
const DEFAULTS: Prefs = { mode: 'day', motion: 'full', scanlines: true, sidebar: true, devHidden: false };

const read = (): Prefs => {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return DEFAULTS; }
};

let state: Prefs = typeof window === 'undefined' ? DEFAULTS : read();
const listeners = new Set<() => void>();

const apply = (p: Prefs) => {
  if (typeof document === 'undefined') return;
  const h = document.documentElement;
  h.setAttribute('data-p4g-mode', p.mode);
  h.setAttribute('data-p4g-motion', p.motion);
  h.setAttribute('data-p4g-scanlines', p.scanlines ? 'on' : 'off');
  const meta = document.querySelector('meta[name="theme-color"]');
  meta?.setAttribute('content', p.mode === 'night' ? '#100e0a' : '#FFE500');
};

export const getPrefs = () => state;
export function setPrefs(patch: Partial<Prefs>): void {
  state = { ...state, ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
  apply(state);
  listeners.forEach((l) => l());
}
export const toggleMode = () => setPrefs({ mode: state.mode === 'day' ? 'night' : 'day' });
export const toggleLowMotion = () => setPrefs({ motion: state.motion === 'low' ? 'full' : 'low' });
export const toggleScanlines = () => setPrefs({ scanlines: !state.scanlines });

const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
export const usePrefs = (): Prefs => useSyncExternalStore(subscribe, getPrefs, getPrefs);

export function initPrefs(): void {
  apply(state);
  // 支持 URL 覆盖（截图脚本 / 分享链接用）：?__mode=night&__motion=low&__scan=0&__dev=0
  // 外壳参数统一带 __ 前缀，避免和页面自己的 ?mode=password|manual|ai… 冲突。
  // 兼容旧链接：没有 __mode 时，?mode=day|night 仍然生效（页面的 mode 取值不会是 day/night）。
  try {
    const q = new URLSearchParams(window.location.hash.split('?')[1] || window.location.search);
    const g = (k: string) => q.get(`__${k}`) ?? q.get(k);
    const patch: Partial<Prefs> = {};
    const m = g('mode');
    if (m === 'night' || m === 'day') patch.mode = m;
    const mo = g('motion');
    if (mo === 'low' || mo === 'full') patch.motion = mo;
    if (g('scan') === '0') patch.scanlines = false;
    if (g('dev') === '0') patch.devHidden = true;
    if (Object.keys(patch).length) setPrefs(patch);
  } catch { /* ignore */ }
}

const mq = typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
const subscribeMq = (fn: () => void) => { mq?.addEventListener('change', fn); return () => mq?.removeEventListener('change', fn); };
const getMq = () => !!mq?.matches;

/** 低动效：App 内开关 或 系统 prefers-reduced-motion。fx 组件据此改成纯淡入/瞬切。 */
export function useLowMotion(): boolean {
  const p = usePrefs();
  const sys = useSyncExternalStore(subscribeMq, getMq, getMq);
  return p.motion === 'low' || sys;
}

/** 非 React 场景读取低动效 */
export const isLowMotion = () => state.motion === 'low' || getMq();

/** 当前日/夜 */
export const useMode = () => usePrefs().mode;

/** 同步 effect：组件挂载时确保 html 属性已就位（App 根调用一次即可） */
export function usePrefsEffect(): void {
  const p = usePrefs();
  useEffect(() => apply(p), [p]);
}
