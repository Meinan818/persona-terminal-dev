/**
 * Demo 全局偏好（Dev 胶囊）：日/夜、低动效、侧栏布局、胶囊是否隐藏。
 * 存 localStorage（键 p3r-demo:prefs.v1，index.html 首帧脚本读同一个键），同步写到 <html>：
 *   日/夜  → class "dark"（与真实 settings.darkMode → <html class="dark"> 同口径）+ data-p3r-mode
 *   低动效 → data-boldness="0"（与真实 useBoldness()===false 同口径）+ data-p3r-motion
 *
 *   const { mode } = usePrefs();
 *   const low = useLowMotion();   // 已合并 prefers-reduced-motion
 */
import { useEffect, useSyncExternalStore } from 'react';

export type P3RMode = 'day' | 'night';
export interface Prefs {
  mode: P3RMode;
  motion: 'full' | 'low';
  sidebar: boolean;   // 宽屏时是否用左侧栏（真实是设置项；demo 默认开）
  devHidden: boolean;
}

const KEY = 'p3r-demo:prefs.v1';
const DEFAULTS: Prefs = { mode: 'day', motion: 'full', sidebar: true, devHidden: false };

const read = (): Prefs => {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return DEFAULTS; }
};

let state: Prefs = typeof window === 'undefined' ? DEFAULTS : read();
const listeners = new Set<() => void>();

const apply = (p: Prefs) => {
  if (typeof document === 'undefined') return;
  const h = document.documentElement;
  h.setAttribute('data-theme', 'pink');
  h.setAttribute('data-ui-channel', 'p3');
  h.classList.toggle('dark', p.mode === 'night');
  h.setAttribute('data-p3r-mode', p.mode);
  h.setAttribute('data-p3r-motion', p.motion);
  if (p.motion === 'low') h.setAttribute('data-boldness', '0'); else h.removeAttribute('data-boldness');
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', p.mode === 'night' ? '#1b0a17' : '#fff5f7');
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

const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
export const usePrefs = (): Prefs => useSyncExternalStore(subscribe, getPrefs, getPrefs);

/** 读 URL 覆盖：?__mode=night&__motion=low&__dev=0（外壳参数统一 __ 前缀，不占页面自己的 ?mode=） */
export function initPrefs(): void {
  apply(state);
  try {
    const q = new URLSearchParams(window.location.hash.split('?')[1] || window.location.search);
    const patch: Partial<Prefs> = {};
    const m = q.get('__mode');
    if (m === 'night' || m === 'day') patch.mode = m;
    const mo = q.get('__motion');
    if (mo === 'low' || mo === 'full') patch.motion = mo;
    if (q.get('__dev') === '0') patch.devHidden = true;
    if (Object.keys(patch).length) setPrefs(patch);
  } catch { /* ignore */ }
}

const mq = typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
const subscribeMq = (fn: () => void) => { mq?.addEventListener('change', fn); return () => mq?.removeEventListener('change', fn); };
const getMq = () => !!mq?.matches;

/** 低动效：App 内开关 或 系统 prefers-reduced-motion。接入时换成 !useBoldness()。 */
export function useLowMotion(): boolean {
  const p = usePrefs();
  const sys = useSyncExternalStore(subscribeMq, getMq, getMq);
  return p.motion === 'low' || sys;
}
/** 与真实 kit 同名的便捷钩子：true = 允许完整动效（= 真实 useBoldness()） */
export const useBoldness = () => !useLowMotion();
export const isLowMotion = () => state.motion === 'low' || getMq();
export const useMode = () => usePrefs().mode;
export const useNight = () => usePrefs().mode === 'night';

export function usePrefsEffect(): void {
  const p = usePrefs();
  useEffect(() => apply(p), [p]);
}
