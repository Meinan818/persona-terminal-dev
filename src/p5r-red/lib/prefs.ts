/**
 * Demo 全局偏好（DevCapsule）：日/夜、低动效、侧栏布局、惊喜层、音效、胶囊隐藏。
 * 存 localStorage（键 p5r-demo:prefs.v1；index.html 首帧脚本读同一个键），
 * 同步到 <html data-p5r-mode="day|night" data-p5r-motion="full|low">。
 *
 *   const { mode } = usePrefs();
 *   const low = useLowMotion();   // = 低动效开关 || prefers-reduced-motion（原 P5.reduced()）
 *   isLowMotion()                 // 非 React 场景
 *
 * URL 覆盖（截图 / 分享）：?__mode=day|night&__motion=low|full&__dev=0&__fx=0&__snd=0
 */
import { useEffect, useSyncExternalStore } from 'react';

export type P5RMode = 'day' | 'night';
export interface Prefs { mode: P5RMode; motion: 'full' | 'low'; fx: boolean; sound: boolean; /** 横屏侧栏布局（真实设置项；关 = 横屏也用底栏） */ sidebar: boolean; devHidden: boolean }

const KEY = 'p5r-demo:prefs.v1';
const sysDark = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-color-scheme: dark)').matches;
const DEFAULTS = (): Prefs => ({ mode: sysDark() ? 'night' : 'day', motion: 'full', fx: true, sound: true, sidebar: true, devHidden: false });

const read = (): Prefs => { try { return { ...DEFAULTS(), ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return DEFAULTS(); } };

let state: Prefs = typeof window === 'undefined' ? DEFAULTS() : read();
/** 本次会话的临时覆盖（URL __ 参数），不写回 localStorage */
let session: Partial<Prefs> = {};
const listeners = new Set<() => void>();
const eff = (): Prefs => ({ ...state, ...session });
let snapshot = eff();

const apply = (p: Prefs) => {
  if (typeof document === 'undefined') return;
  const h = document.documentElement;
  h.setAttribute('data-p5r-mode', p.mode);
  h.setAttribute('data-p5r-motion', p.motion);
  h.classList.toggle('p5r-nosidebar', !p.sidebar);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', p.mode === 'night' ? '#6d0009' : '#D7000F');
};
const emit = () => { snapshot = eff(); apply(snapshot); listeners.forEach((l) => l()); };

export const getPrefs = () => snapshot;
export function setPrefs(patch: Partial<Prefs>): void {
  state = { ...state, ...patch };
  for (const k of Object.keys(patch) as (keyof Prefs)[]) delete session[k];
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
  emit();
}
export const toggleMode = () => setPrefs({ mode: snapshot.mode === 'day' ? 'night' : 'day' });
export const toggleLowMotion = () => setPrefs({ motion: snapshot.motion === 'low' ? 'full' : 'low' });

const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
export const usePrefs = (): Prefs => useSyncExternalStore(subscribe, getPrefs, getPrefs);

/** 读 URL 里 __ 前缀的外壳参数（hash 查询串优先）。 */
export function initPrefs(): void {
  try {
    const q = new URLSearchParams(window.location.hash.split('?')[1] || window.location.search);
    const m = q.get('__mode'); if (m === 'night' || m === 'day') session.mode = m;
    const mo = q.get('__motion'); if (mo === 'low' || mo === 'full') session.motion = mo;
    if (q.get('__dev') === '0') session.devHidden = true;
    if (q.get('__fx') === '0') session.fx = false;
    if (q.get('__snd') === '0') session.sound = false;
  } catch { /* ignore */ }
  emit();
}

const mq = typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
const subMq = (fn: () => void) => { mq?.addEventListener('change', fn); return () => mq?.removeEventListener('change', fn); };
const getMq = () => !!mq?.matches;

/** 低动效（= 原 P5.reduced() 的超集）：只保留终态 / 淡入。 */
export function useLowMotion(): boolean {
  const p = usePrefs();
  const sys = useSyncExternalStore(subMq, getMq, getMq);
  return p.motion === 'low' || sys;
}
export const isLowMotion = () => snapshot.motion === 'low' || getMq();
export const useMode = () => usePrefs().mode;
export const fxEnabled = () => snapshot.fx && !isLowMotion();
export const soundEnabled = () => snapshot.sound;

export function usePrefsEffect(): void {
  const p = usePrefs();
  useEffect(() => apply(p), [p]);
}
