/**
 * 演出总览连播（索引页「▶ 一键播放全部演出」）：队列存 sessionStorage，ReelBar 按每项 fxMs 自动跳下一条路由。
 *   startReel(items)  stopReel()  useReel()
 */
import { useSyncExternalStore } from 'react';

export interface ReelState { ids: string[]; routes: string[]; titles: string[]; ms: number[]; i: number; paused: boolean }
const KEY = 'p3r-demo:reel.v1';
const read = (): ReelState | null => { try { return JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch { return null; } };
let state: ReelState | null = typeof window === 'undefined' ? null : read();
const ls = new Set<() => void>();
const emit = () => { try { if (state) sessionStorage.setItem(KEY, JSON.stringify(state)); else sessionStorage.removeItem(KEY); } catch { /* */ } ls.forEach((l) => l()); };
const withReel = (route: string) => route + (route.includes('?') ? '&' : '?') + '__reel=1';

export function startReel(items: { id: string; route: string; title: string; fxMs?: number }[], from = 0) {
  if (!items.length) return;
  state = { ids: items.map((x) => x.id), routes: items.map((x) => x.route), titles: items.map((x) => x.title), ms: items.map((x) => x.fxMs ?? 4000), i: from, paused: false };
  emit();
  window.location.hash = withReel(state.routes[from]);
}
export function stepReel(d = 1) {
  if (!state) return;
  const i = state.i + d;
  if (i >= state.routes.length || i < 0) { stopReel(true); return; }
  state = { ...state, i, paused: false };
  emit();
  window.location.hash = withReel(state.routes[i]);
}
export function pauseReel(p: boolean) { if (state) { state = { ...state, paused: p }; emit(); } }
export function stopReel(backToIndex = false) { state = null; emit(); if (backToIndex) window.location.hash = '#/__index?g=fx'; }
export const useReel = () => useSyncExternalStore((f) => { ls.add(f); return () => { ls.delete(f); }; }, () => state, () => null);
